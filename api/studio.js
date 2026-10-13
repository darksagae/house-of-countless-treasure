import {NeonDbError} from '@neondatabase/serverless';
import {readFileSync} from 'node:fs';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {freeConfigured,initializeFreeAccess,identify,allowance,reserve,finish,permitUpload} from '../lib/free-access.js';
import {validate} from '../lib/validation.js';
const catalog=JSON.parse(readFileSync(new URL('../lib/catalog.json',import.meta.url)));
const BASE='https://yce-api-01.makeupar.com';
function same(a,b){const x=Buffer.from(a||''),y=Buffer.from(b||'');return x.length===y.length&&timingSafeEqual(x,y)}
function signature(data){return createHmac('sha256',process.env.YOUCAM_API_KEY).update(data).digest('base64url')}
export function receipt(path,id,owner){const data=Buffer.from(JSON.stringify({path,id,owner,expires:Date.now()+3600000})).toString('base64url');return data+'.'+signature(data)}
export function readReceipt(token){const [data,sig]=String(token||'').split('.');if(!data||!same(sig,signature(data)))throw new Error('Invalid task receipt.');const x=JSON.parse(Buffer.from(data,'base64url'));if(x.expires<Date.now())throw new Error('Task receipt expired.');return x}
async function provider(path,method='GET',body){const r=await fetch(BASE+path,{method,redirect:'error',headers:{Authorization:`Bearer ${process.env.YOUCAM_API_KEY}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok){const error=new Error(`YouCam request failed (${r.status}): ${data.error_code||data.error||'Please check input requirements.'}`);error.definite=true;error.status=r.status===401?502:r.status;throw error}return data}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>res.status(status).json(data);
 if(req.method==='GET'){let enabled=false;if(freeConfigured()){try{enabled=await initializeFreeAccess()}catch{enabled=false}}return send(200,{configured:Boolean(process.env.YOUCAM_API_KEY&&process.env.STUDIO_ACCESS_CODE),features:catalog.length,freeAccess:enabled,freeLimit:5,authUrl:enabled?process.env.NEON_AUTH_BASE_URL:null});}
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return send(405,{error:'Method not allowed.'})}
 if(!process.env.YOUCAM_API_KEY||!process.env.STUDIO_ACCESS_CODE)return send(503,{error:'Studio connection is not configured yet.'});
 const admin=same(req.headers['x-studio-code'],process.env.STUDIO_ACCESS_CODE);
 if(!admin&&!req.headers.authorization)return send(401,{error:'Sign in for five free creations, or enter a valid owner studio code.'});
 if(req.headers.origin&&req.headers.origin!==`https://${req.headers.host}`&&!(process.env.LOCAL_PREVIEW==='1'&&req.headers.origin===`http://${req.headers.host}`))return send(403,{error:'Request origin is not allowed.'});
 let input=req.body;if(typeof input==='string'){try{input=JSON.parse(input)}catch{return send(400,{error:'Invalid JSON.'})}}
 if(!input||typeof input!=='object'||Array.isArray(input))return send(400,{error:'Request body must be an object.'});
 if(Buffer.byteLength(JSON.stringify(input))>3000000)return send(413,{error:'Upload is too large. Use a photo under 2 MB.'});
 try{
  const identity=admin?null:await identify(req);
  if(input.action==='allowance')return send(200,{allowance:identity?await allowance(identity):{limit:null,used:0,remaining:null,owner:true}});
  if(input.action==='authorize')return send(200,{authorized:true});
  if(input.action==='upload'){
   const f=input.file;if(!f||!['image/jpeg','image/png','video/mp4'].includes(f.type)||typeof f.base64!=='string'||!f.base64.match(/^[A-Za-z0-9+/]*={0,2}$/))return send(400,{error:'Please choose a JPG, PNG or MP4 file.'});
   const bytes=Buffer.from(f.base64,'base64');if(!bytes.length||bytes.length>2000000)return send(413,{error:'File must be smaller than 2 MB.'});
   const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const mp4=bytes.subarray(4,8).toString()==='ftyp';
   if((f.type==='image/png'&&!png)||(f.type==='image/jpeg'&&!jpg)||(f.type==='video/mp4'&&!mp4))return send(400,{error:'The file content does not match its image type.'});
   if(identity&&!await permitUpload(identity))return send(429,{error:'Your free allowance is exhausted, or too many uploads were sent. Please check your balance and try again later.'});
   const upload=await provider('/s2s/v2.0/file','POST',{files:[{content_type:f.type,file_name:f.type==='image/png'?'studio.png':f.type==='video/mp4'?'studio.mp4':'studio.jpg',file_size:bytes.length}]});
   const file=upload.data?.files?.[0];const request=file?.requests?.[0];if(!request||!file.file_id)throw new Error('YouCam did not provide an upload destination.');
   const url=new URL(request.url);if(url.protocol!=='https:'||!url.hostname.endsWith('.amazonaws.com')||request.method!=='PUT')throw new Error('Unexpected provider upload destination.');
   const headers={};for(const [k,v]of Object.entries(request.headers||{}))if(['content-type','content-length','x-amz-acl','x-amz-server-side-encryption'].includes(k.toLowerCase()))headers[k]=String(v);
   const r=await fetch(url,{method:'PUT',headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error('Photo transfer failed; please try again.');
   return send(200,{file_id:file.file_id});
  }
  if(input.action==='create'){
   const tool=catalog.find(x=>x.id===input.tool);const op=tool?.operations.find(x=>x.path===input.path);if(!op)return send(400,{error:'Unknown tool or version.'});
   const errors=validate(op.schema,input.parameters);if(errors.length)return send(422,{error:errors.slice(0,8).join(' ')});
   let quota;if(identity){quota=await reserve(identity,input.requestId,op.path);if(quota.outcome==='exhausted')return send(429,{error:'You have used all five free creations. Your saved treasures are still available.',allowance:quota});if(quota.outcome==='existing'){if(quota.provider_id)return send(200,{receipt:receipt(op.path,quota.provider_id,{...identity,requestId:input.requestId}),allowance:quota});return send(409,{error:quota.state==='failed'?'This request already failed. Start a new creation.':'This creation is already being started. Please wait before trying again.',allowance:quota})}}
   let data;try{data=await provider(op.path,'POST',input.parameters)}catch(e){if(identity&&e.definite)await finish(identity,input.requestId,'failed');throw e}
   const id=data.data?.task_id;if(!id)throw new Error('YouCam did not return a task ID.');
   if(identity)quota=await finish(identity,input.requestId,'active',id);
   return send(200,{receipt:receipt(op.path,id,identity?{...identity,requestId:input.requestId}:undefined),...(quota?{allowance:quota}:{})});
  }
  if(input.action==='poll'){
   const task=readReceipt(input.receipt);if(!catalog.some(t=>t.operations.some(o=>o.path===task.path)))return send(400,{error:'Unknown task.'});
   if(identity&&(!task.owner||task.owner.userId!==identity.userId||task.owner.key!==identity.key))return send(403,{error:'This result belongs to another session.'});
   const response=await provider(task.path+'/'+encodeURIComponent(task.id));let quota;
   if(task.owner&&['success','error'].includes(response.data?.task_status))quota=await finish(task.owner,task.owner.requestId,response.data.task_status==='success'?'complete':'failed');
   return send(200,{...response,...(quota?{allowance:quota}:{})});
  }
  return send(400,{error:'Unknown action.'});
 }catch(error){if(error instanceof NeonDbError)return send(503,{error:'Your account balance could not be loaded. Please try again later.'});return send(error.status||502,{error:error.name==='TimeoutError'?'YouCam took too long to respond. Please try again.':error.message||'The studio request failed.'})}
}
