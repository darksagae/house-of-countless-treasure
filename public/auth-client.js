import {createAuthClient} from '@neondatabase/auth';
import {verifiedSession,sessionToken} from './session.js';
const $=s=>document.querySelector(s);
let client,session=null,config=null,quota=null,configured=false;
let pendingEmail='';
function notice(text){$('#account-status').textContent=text}
function dispatch(){window.dispatchEvent(new CustomEvent('treasure-account-change',{detail:{signedIn:!!session,quota}}))}
export function signedIn(){return !!session}
export function accountReady(){return configured}
export async function accessToken(){if(!session||!client)return null;const result=await client.getSession();session=verifiedSession(result);if(!session){quota=null;render();dispatch();throw new Error('Please sign in to continue. Your free balance is saved.')}return sessionToken(session)}
export function setAllowance(value){if(value){quota=value;render();dispatch()}}
export function openAccount(){render();$('#account-dialog').showModal()}
function render(){const owner=$('#owner-access-open');if(owner)owner.hidden=!!session;$('#account-signin').hidden=!!session;$('#account-signed-in').hidden=!session;$('#account-email-display').textContent=session?.user?.email||'';
 const remaining=quota?.remaining;
 $('#account-button').textContent=session?(Number.isInteger(remaining)?`${remaining} / 5 free left`:'My account'):'Start free · 5 creations';
 $('#free-balance-text').textContent=session?(Number.isInteger(remaining)?`${remaining} of 5 free creations remaining`:'Loading your free allowance…'):(configured?'Sign in to start your five free creations.':'Free sign-in is being set up. Samples are available now.');
 $('#free-meter').value=Number.isInteger(remaining)?5-remaining:0;$('#free-meter').setAttribute('aria-label',Number.isInteger(remaining)?`${5-remaining} of 5 creations used`:'Five free creations available after sign-in');
 $('#quota-description').textContent=Number.isInteger(remaining)&&remaining===0?'You have used your five free creations. You can still explore tools and keep viewing saved treasures.':'Five total, not five per day. Your balance follows your verified email across devices.';
 $('#account-remaining').textContent=Number.isInteger(remaining)?`${remaining} creations left`:'Checking balance…';
 $('#account-send-code').disabled=!configured;
}
export async function refreshAccount(){if(!client)return;const result=await client.getSession();if(result.error)throw new Error('Your sign-in session could not be loaded.');session=verifiedSession(result);quota=null;render();if(session){const token=sessionToken(session);const response=await fetch('/api/studio',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action:'allowance'})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Your allowance could not be loaded.');quota=data.allowance}render();dispatch()}
async function begin(){try{const response=await fetch('/api/studio');config=await response.json();configured=!!config.freeAccess&&!!config.authUrl;if(configured){client=createAuthClient(config.authUrl);await refreshAccount()}else{render();notice('Free account activation is pending. You can explore the sample looks now.')}}catch(e){render();notice(e.message||'Free sign-in is currently unavailable. Try again later.')}}
let accountMode='create';
function mode(value){accountMode=value;$('#account-create-mode').setAttribute('aria-pressed',String(value==='create'));$('#account-login-mode').setAttribute('aria-pressed',String(value==='login'));$('#account-send-code').textContent=value==='create'?'Create my free account ↗':'Email my sign-in code ↗';$('#account-code-block').hidden=true;notice(value==='create'?'Verify your email once to create your account. We keep you signed in on this browser.':'Welcome back. Your saved free balance follows your account.')}
$('#account-create-mode').onclick=()=>mode('create');$('#account-login-mode').onclick=()=>mode('login');
$('#account-button').onclick=openAccount;$('#free-signin').onclick=openAccount;
$('#owner-access-open').onclick=()=>{$('#account-dialog').close();$('#access-dialog').showModal()};
$('#account-send-code').onclick=async()=>{const input=$('#account-email');if(!input.reportValidity())return;pendingEmail=input.value.trim();$('#account-send-code').disabled=true;notice('Sending your sign-in code…');try{const result=await client.emailOtp.sendVerificationOtp({email:pendingEmail,type:'sign-in'});if(result.error)throw new Error(result.error.message||'Could not send a code.');$('#account-code-block').hidden=false;notice(accountMode==='create'?'Check your email to verify and create your account.':'Check your email for your sign-in code.');$('#account-otp').focus()}catch(e){notice(e.message)}finally{$('#account-send-code').disabled=!configured}};
$('#account-verify-code').onclick=async()=>{const input=$('#account-otp');if(!input.reportValidity())return;$('#account-verify-code').disabled=true;notice('Verifying your email…');try{const result=await client.signIn.emailOtp({email:pendingEmail,otp:input.value.trim()});if(result.error)throw new Error(result.error.message||'The code could not be verified.');input.value='';await refreshAccount();notice('You are signed in. Your free balance is ready.');$('#account-dialog').close()}catch(e){notice(e.message)}finally{$('#account-verify-code').disabled=false}};
$('#account-signout').onclick=async()=>{if(!client)return;const result=await client.signOut();if(result.error){notice('Could not sign out. Please try again.');return}session=null;quota=null;$('#account-code-block').hidden=true;$('#account-otp').value='';render();dispatch();notice('Signed out. Your lifetime allowance remains recorded securely.')};
window.addEventListener('focus',()=>{if(client)refreshAccount().catch(e=>notice(e.message))});
begin();
