import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {statements} from './free-schema.js';
export const FREE_LIMIT=5;
let sql,connection,schemaReady,keySet,keyURL;
export function authBaseURL(){return process.env.NEON_AUTH_BASE_URL||process.env.POSTGRES_NEON_AUTH_BASE_URL}
export function freeConfigured(){return Boolean((process.env.DATABASE_URL||process.env.POSTGRES_DATABASE_URL||process.env.POSTGRES_URL)&&authBaseURL())}
function database(){const url=process.env.DATABASE_URL||process.env.POSTGRES_DATABASE_URL||process.env.POSTGRES_URL;if(!url)throw Object.assign(new Error('Free accounts are not configured yet.'),{status:503});if(connection!==url){connection=url;sql=neon(url);schemaReady=null}return sql}
async function ready(){const db=database();if(!schemaReady)schemaReady=db.transaction(statements.map(s=>db.query(s))).catch(e=>{schemaReady=null;throw e});await schemaReady;return db}
export async function verifyToken(token,keys,issuer){const {payload}=await jwtVerify(token,keys,{issuer,requiredClaims:['sub','exp','iss'],algorithms:['EdDSA','RS256','ES256']});if(!payload.sub)throw new Error('Missing user identity.');return payload}
export function identityKey(email){let value=String(email).trim().toLowerCase();let [local,domain]=value.split('@');if(domain==='googlemail.com')domain='gmail.com';if(domain==='gmail.com')local=local.split('+')[0].replaceAll('.','');return createHash('sha256').update('treasure-free-v1:'+local+'@'+domain).digest('hex')}
export async function identify(req){
 if(!freeConfigured())throw Object.assign(new Error('Free accounts are not configured yet. You can still explore sample looks.'),{status:503});
 const auth=String(req.headers.authorization||'');if(!auth.startsWith('Bearer '))throw Object.assign(new Error('Sign in to use your five free creations.'),{status:401});
 const base=new URL(authBaseURL());const jwks=process.env.NEON_AUTH_JWKS_URL||authBaseURL().replace(/\/$/,'')+'/.well-known/jwks.json';
 if(keyURL!==jwks){keyURL=jwks;keySet=createRemoteJWKSet(new URL(jwks),{timeoutDuration:10000})}
 let payload;try{payload=await verifyToken(auth.slice(7),keySet,base.origin)}catch{throw Object.assign(new Error('Your session expired. Please sign in again.'),{status:401})}
 const db=database();const users=await db.query('SELECT id,email,"emailVerified" FROM neon_auth."user" WHERE id=$1 LIMIT 1',[payload.sub]);const user=users[0];
 if(!user?.emailVerified||!user.email)throw Object.assign(new Error('Verify your email before using free creations.'),{status:403});
 return {userId:String(user.id),key:identityKey(user.email)};
}
export async function allowance(identity){const db=await ready();const rows=await db.query('SELECT used FROM public.treasure_allowances WHERE identity_key=$1',[identity.key]);const used=Number(rows[0]?.used||0);return {limit:FREE_LIMIT,used,remaining:Math.max(0,FREE_LIMIT-used)}}
export async function reserve(identity,requestId,path){if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId||''))throw Object.assign(new Error('A valid creation request ID is required.'),{status:400});const db=await ready();const rows=await db.query('SELECT public.treasure_reserve($1,$2::uuid,$3,$4) AS result',[identity.key,requestId,identity.userId,path]);return {limit:FREE_LIMIT,...rows[0].result}}
export async function finish(identity,requestId,state,providerId=null){const db=await ready();const rows=await db.query('SELECT public.treasure_finish($1,$2::uuid,$3,$4) AS result',[identity.key,requestId,state,providerId]);return {limit:FREE_LIMIT,...rows[0].result}}
export async function permitUpload(identity){const db=await ready();const rows=await db.query('SELECT public.treasure_upload_check($1) AS allowed',[identity.key]);return rows[0]?.allowed===true}

export async function initializeFreeAccess(){const db=await ready();const rows=await db.query(`SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='neon_auth' AND table_name='user' AND column_name='emailVerified') AS ready`);return rows[0]?.ready===true}
