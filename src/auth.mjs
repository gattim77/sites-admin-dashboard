import QRCode from 'qrcode/lib/core/qrcode.js';
import SVG from 'qrcode/lib/renderer/svg-tag.js';
import { ADMIN,sameOriginMutation,json } from './security.mjs';
const enc=new TextEncoder(),COOKIE='__Host-third-admin',SETUP='__Host-third-admin-setup';
export const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export const random=()=>encode(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async s=>encode(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
export function equal(a,b){let n=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)n|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return n===0;}
export async function passwordHash(password,salt){
 let bytes=enc.encode(password);const raw=decode(salt);
 for(let stage=0;stage<3;stage++){
  const saltBytes=new Uint8Array(raw.length+1);saltBytes.set(raw);saltBytes[raw.length]=stage;
  const key=await crypto.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveBits']);
  bytes=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:100000,hash:'SHA-256'},key,256));
 }
 return encode(bytes);
}
async function cryptKey(env){return crypto.subtle.importKey('raw',decode(env.ADMIN_AUTH_KEY),'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(value,env){const iv=crypto.getRandomValues(new Uint8Array(12));const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('third-ai-admin-totp-v1')},await cryptKey(env),enc.encode(value)));return encode(iv)+'.'+encode(data);}
export async function unseal(value,env){const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:enc.encode('third-ai-admin-totp-v1')},await cryptKey(env),decode(data)));}
export function base32(bytes){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,value=0,result='';for(const byte of bytes){value=(value<<8)|byte;bits+=8;while(bits>=5){result+=alphabet[(value>>>(bits-5))&31];bits-=5;}}if(bits)result+=alphabet[(value<<(5-bits))&31];return result;}
export async function totp(secret,step){let bits=0,value=0,bytes=[];for(const c of secret){value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(c);bits+=5;if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}}const counter=new Uint8Array(8);new DataView(counter.buffer).setUint32(4,step);const key=await crypto.subtle.importKey('raw',new Uint8Array(bytes),{name:'HMAC',hash:'SHA-1'},false,['sign']);const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,counter));const offset=hash[19]&15;const code=(((hash[offset]&127)<<24)|(hash[offset+1]<<16)|(hash[offset+2]<<8)|hash[offset+3])%1000000;return String(code).padStart(6,'0');}
export async function matchCode(secret,code,lastStep=-1,now=Date.now()){if(typeof code!=='string'||!/^\d{6}$/.test(code))return null;const step=Math.floor(now/30000);for(const candidate of [step,step-1,step+1])if(candidate>lastStep&&equal(await totp(secret,candidate),code))return candidate;return null;}
function cookieValue(request,name){const m=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));const token=m?.slice(name.length+1);return token&&/^[A-Za-z0-9_-]{43}$/.test(token)?token:null;}
function cookie(name,token,seconds){return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;}
function withCookie(response,value){response.headers.append('Set-Cookie',value);return response;}
async function session(env){const token=random(),now=Date.now();await env.MITCH_DB.batch([env.MITCH_DB.prepare('DELETE FROM third_admin_auth_sessions WHERE expires_at<=?').bind(now),env.MITCH_DB.prepare('INSERT INTO third_admin_auth_sessions(token_hash,email,expires_at) VALUES(?,?,?)').bind(await digest(token),ADMIN,now+3600000)]);return withCookie(json({ok:true}),cookie(COOKIE,token,3600));}
export async function authenticate(request,env){const token=cookieValue(request,COOKIE);if(!token)throw new Error('Authentication required');const row=await env.MITCH_DB.prepare('SELECT email,expires_at FROM third_admin_auth_sessions WHERE token_hash=?').bind(await digest(token)).first();if(!row||row.email!==ADMIN||row.expires_at<=Date.now())throw new Error('Authentication required');return {email:ADMIN,sub:ADMIN};}
async function limited(db,bucket){const now=Date.now();const row=await db.prepare('INSERT INTO third_admin_auth_limits(bucket,attempts,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires_at<=? THEN 1 ELSE attempts+1 END,expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END RETURNING attempts').bind(bucket,now+900000,now,now).first();return row.attempts>10;}
export async function authRoute(request,env){
 const path=new URL(request.url).pathname,db=env.MITCH_DB;
 if(path==='/auth/status'&&request.method==='GET')return json({configured:!!await db.prepare('SELECT id FROM third_admin_auth_credentials WHERE id=1').first(),email:ADMIN});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!sameOriginMutation(request))return json({error:'Invalid request origin'},403);
 if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Request too large'},413);
 const text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);
 let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
 if(!body||typeof body!=='object')return json({error:'Invalid request'},400);
 if(path==='/auth/logout'){const token=cookieValue(request,COOKIE);if(token)await db.prepare('DELETE FROM third_admin_auth_sessions WHERE token_hash=?').bind(await digest(token)).run();return withCookie(json({ok:true}),cookie(COOKIE,'',0));}
 if(!['/auth/login','/auth/setup','/auth/confirm'].includes(path))return json({error:'Not found'},404);
 if(await limited(db,path))return json({error:'Too many attempts. Try again in 15 minutes.'},429);
 const credentials=await db.prepare('SELECT * FROM third_admin_auth_credentials WHERE id=1').first();
 if(path==='/auth/setup'){
  if(credentials)return json({error:'Administrator setup is already complete'},409);
  const bootstrap=await db.prepare('SELECT token_hash,expires_at FROM third_admin_auth_bootstrap WHERE id=1').first();
  if(typeof body.token!=='string'||!bootstrap||bootstrap.expires_at<=Date.now()||!equal(await digest(body.token),bootstrap.token_hash)||body.email!==ADMIN)return json({error:'Valid private setup link required'},403);
  if(typeof body.password!=='string'||body.password.length<12||body.password.length>128)return json({error:'Choose a password between 12 and 128 characters'},400);
  const secret=base32(crypto.getRandomValues(new Uint8Array(20))),salt=random(),pending=random(),now=Date.now();
  await db.batch([db.prepare('DELETE FROM third_admin_auth_pending WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO third_admin_auth_pending(token_hash,salt,password_hash,totp_secret,expires_at) VALUES(?,?,?,?,?)').bind(await digest(pending),salt,await passwordHash(body.password,salt),await seal(secret,env),now+600000)]);
  const uri=`otpauth://totp/Third-AI%20Admin:${encodeURIComponent(ADMIN)}?secret=${secret}&issuer=Third-AI%20Admin&algorithm=SHA1&digits=6&period=30`;
  const svg=SVG.render(QRCode.create(uri,{errorCorrectionLevel:'M'}),{margin:2,width:256});
  return withCookie(json({secret,qr:'data:image/svg+xml;base64,'+btoa(svg)}),cookie(SETUP,pending,600));
 }
 if(path==='/auth/confirm'){
  if(credentials)return json({error:'Administrator setup is already complete'},409);
  const token=cookieValue(request,SETUP),hash=token?await digest(token):'';
  const pending=await db.prepare('UPDATE third_admin_auth_pending SET attempts=attempts+1 WHERE token_hash=? AND expires_at>? AND attempts<5 RETURNING *').bind(hash,Date.now()).first();
  if(!pending)return json({error:'Setup expired. Open your private setup link again.'},401);
  const step=await matchCode(await unseal(pending.totp_secret,env),body.code);
  if(step===null)return json({error:'Invalid authenticator code'},401);
  const saved=await db.prepare('INSERT OR IGNORE INTO third_admin_auth_credentials(id,email,salt,password_hash,totp_secret,last_step,created_at) VALUES(1,?,?,?,?,?,?)').bind(ADMIN,pending.salt,pending.password_hash,pending.totp_secret,step,Date.now()).run();
  if(saved.meta.changes!==1)return json({error:'Administrator setup is already complete'},409);
  await db.batch([db.prepare('DELETE FROM third_admin_auth_pending'),db.prepare('DELETE FROM third_admin_auth_bootstrap'),db.prepare('DELETE FROM third_admin_auth_limits')]);
  return withCookie(await session(env),cookie(SETUP,'',0));
 }
 if(body.email!==ADMIN||typeof body.password!=='string'||body.password.length>128||!credentials)return json({error:'Invalid email, password or authenticator code'},401);
 if(!equal(await passwordHash(body.password,credentials.salt),credentials.password_hash))return json({error:'Invalid email, password or authenticator code'},401);
 const step=await matchCode(await unseal(credentials.totp_secret,env),body.code,credentials.last_step);
 if(step===null)return json({error:'Invalid email, password or authenticator code'},401);
 const claimed=await db.prepare('UPDATE third_admin_auth_credentials SET last_step=? WHERE id=1 AND last_step<?').bind(step,step).run();
 if(claimed.meta.changes!==1)return json({error:'Authenticator code already used. Wait for the next code.'},401);
 await db.prepare('DELETE FROM third_admin_auth_limits WHERE bucket=?').bind(path).run();
 return session(env);
}
