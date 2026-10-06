import { verifyAdmin, validConfig, sameOriginMutation, json, secure, ADMIN } from './security.mjs';
import { revision } from './revision.mjs';
export const sites = [
 {id:'mitchometro',name:'Mitchometro',host:'mitchometro.third-ai.com',binding:'MITCH_DB',storage:true},
 {id:'tabi',name:'TABI',host:'japan-planner.third-ai.com',binding:'TABI_DB',storage:false},
 {id:'strata',name:'Strata',host:'strata.third-ai.com',binding:'STRATA_DB',storage:false}
];
export function dateRange(url, now=Date.now()) {
 const endText=url.searchParams.get('end'), startText=url.searchParams.get('start');
 const end=endText ? Date.parse(endText) : now;
 const start=startText ? Date.parse(startText) : end-30*86400000;
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>end||end-start>366*86400000||end>now+86400000)throw new Error('Invalid date range (maximum 366 days)');
 return {start,end};
}
function dbFor(env,id){const site=sites.find(s=>s.id===id);if(!site||!env[site.binding])throw new Error('Unknown application');return {site,db:env[site.binding]};}
async function rows(db,sql,args=[]){const result=await db.prepare(sql).bind(...args).all();if(!result.success)throw new Error('Database query unavailable');return result.results;}
async function overview(env,url) {
 const {start,end}=dateRange(url);
 const result=await Promise.all(sites.map(async site=>{
  const db=env[site.binding];
  try{
   const [total,trend,activity,storage]=await Promise.all([
    db.prepare('SELECT COUNT(*) AS users, SUM(CASE WHEN created_at>=? AND created_at<? THEN 1 ELSE 0 END) AS registrations FROM app_users').bind(start,end).first(),
    rows(db,"SELECT date(created_at/1000,'unixepoch') AS day,COUNT(*) AS value FROM app_users WHERE created_at>=? AND created_at<? GROUP BY day ORDER BY day",[start,end]),
    rows(db,'SELECT occurred_at,user_id,action,bytes FROM third_admin_activity WHERE occurred_at>=? AND occurred_at<? ORDER BY occurred_at DESC LIMIT 100',[start,end]),
    site.storage ? db.prepare('SELECT COALESCE(SUM(bytes_used),0) AS bytes,COALESCE(SUM(object_count),0) AS objects FROM third_admin_storage').first() : Promise.resolve(null)
   ]);
   return {...site,total:{users:total.users,registrations:total.registrations||0},trend,activity,storage,status:'connected'};
  }catch{return {...site,status:'unavailable',error:'Database or administration migration unavailable',total:null,trend:[],activity:[],storage:null};}
 }));
 // Sum of accounts is labelled explicitly, since identities across applications are independent.
 return {sites:result,range:{start,end},commit:revision,generatedAt:Date.now()};
}
async function users(env,url){
 const selected=url.searchParams.get('site');
 const query=(url.searchParams.get('q')||'').trim().slice(0,254);
 const status=url.searchParams.get('status');
 const after=url.searchParams.get('after')||'';
 const min=Number(url.searchParams.get('minBytes')||0);
 if(!Number.isSafeInteger(min)||min<0)throw new Error('Invalid storage filter');
 const chosen=selected?sites.filter(s=>s.id===selected):sites;
 if(!chosen.length)throw new Error('Unknown application');
 return Promise.all(chosen.map(async site=>{
  try{
   const db=env[site.binding];
   const storage=site.storage?'s.bytes_used,s.object_count,s.upload_count,s.last_upload,s.historical_uploads_unknown':'NULL AS bytes_used,NULL AS object_count,NULL AS upload_count,NULL AS last_upload,NULL AS historical_uploads_unknown';
   const join=site.storage?'LEFT JOIN third_admin_storage s ON s.user_id=u.id':'';
   const exactId=url.searchParams.get('id');
   const args=[exactId||after];let where=exactId?'u.id=?':'u.id>?';
   if(query){where+=' AND u.email LIKE ? ESCAPE CHAR(92)';args.push('%'+query.replace(/[\\%_]/g,'\\$&')+'%');}
   if(status==='active'||status==='blocked'){where+=" AND COALESCE(c.status,'active')=?";args.push(status);}
   if(min>0){where+=site.storage?' AND COALESCE(s.bytes_used,0)>=?':' AND 0>=?';args.push(min);}
   if(url.searchParams.get('registeredAfter')){const t=Date.parse(url.searchParams.get('registeredAfter'));if(!Number.isFinite(t))throw new Error('Invalid registration filter');where+=' AND u.created_at>=?';args.push(t);}
   const found=await rows(db,`SELECT u.id,u.email,u.display_name,u.created_at,COALESCE(c.status,'active') AS status,c.blocked_at,c.block_reason,c.max_bytes,c.max_object_bytes,COALESCE(c.uploads_enabled,1) AS uploads_enabled,a.last_login,a.last_activity,${storage} FROM app_users u LEFT JOIN third_admin_controls c ON c.user_id=u.id LEFT JOIN third_admin_user_activity a ON a.user_id=u.id ${join} WHERE ${where} ORDER BY u.id LIMIT 251`,args);
   return {site:site.id,status:'connected',users:found.slice(0,250),next:found.length>250?found[249].id:null};
  }catch{return {site:site.id,status:'unavailable',users:[],next:null};}
 }));
}
export async function mutateUser(request,env,actor,siteId,userId){
 if(!sameOriginMutation(request))return json({error:'Invalid request origin'},403);
 if(!userId || userId.length>200)return json({error:'Invalid user ID'},400);
 let text=await request.text();if(text.length>4096)return json({error:'Request too large'},413);
 let body;try{body=JSON.parse(text);}catch{return json({error:'Invalid JSON'},400);}
 const {site,db}=dbFor(env,siteId);
 const target=await db.prepare('SELECT id,email FROM app_users WHERE id=?').bind(userId).first();
 if(!target)return json({error:'User not found'},404);
 if(!['block','unblock','quota','uploads','delete_profiles'].includes(body.action))return json({error:'Unsupported action'},400);
 const reason=typeof body.reason==='string'?body.reason.trim().slice(0,1000):'';
 if(!reason)return json({error:'An administrative reason is required'},400);
 if(body.confirm!==userId)return json({error:'Confirm the exact internal user ID'},400);
 if(target.email===ADMIN&&['block','delete_profiles'].includes(body.action))return json({error:'The administrator account is protected'},403);
 if(['quota','uploads','delete_profiles'].includes(body.action)&&!site.storage)return json({error:'Storage controls are not integrated for this application'},409);
 const now=Date.now(),statements=[];
 statements.push(db.prepare('INSERT INTO third_admin_controls(user_id,updated_at) VALUES(?,?) ON CONFLICT(user_id) DO NOTHING').bind(userId,now));
 if(body.action==='block'){
  statements.push(db.prepare("UPDATE third_admin_controls SET status='blocked',blocked_at=?,block_reason=?,updated_at=? WHERE user_id=?").bind(now,reason,now,userId));
  statements.push(db.prepare('DELETE FROM app_sessions WHERE user_id=?').bind(userId));
 }else if(body.action==='unblock')statements.push(db.prepare("UPDATE third_admin_controls SET status='active',blocked_at=NULL,block_reason=NULL,updated_at=? WHERE user_id=?").bind(now,userId));
 else if(body.action==='quota'){
  for(const k of ['max_bytes','max_object_bytes'])if(body[k]!==null&&(!Number.isSafeInteger(body[k])||body[k]<0))return json({error:'Quotas must be nonnegative integer bytes or null (unlimited)'},400);
  statements.push(db.prepare('UPDATE third_admin_controls SET max_bytes=?,max_object_bytes=?,updated_at=? WHERE user_id=?').bind(body.max_bytes,body.max_object_bytes,now,userId));
 }else if(body.action==='uploads'){
  if(typeof body.enabled!=='boolean')return json({error:'Enabled must be boolean'},400);
  statements.push(db.prepare('UPDATE third_admin_controls SET uploads_enabled=?,updated_at=? WHERE user_id=?').bind(body.enabled?1:0,now,userId));
 }else{
  if(body.deleteConfirmation!=='DELETE STORED PROFILES')return json({error:'Explicit destructive confirmation required'},400);
  statements.push(db.prepare('DELETE FROM listening_profiles WHERE owner_id=?').bind(userId));
 }
 const details={reason,...(body.action==='quota'?{max_bytes:body.max_bytes,max_object_bytes:body.max_object_bytes}:{}),...(body.action==='uploads'?{enabled:body.enabled}:{})};
 statements.push(db.prepare('INSERT INTO third_admin_audit(id,occurred_at,actor,action,target_user,details) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),now,actor.email,body.action,userId,JSON.stringify(details)));
 // D1 batch is atomic: mutation, revocation, accounting triggers, and audit succeed together.
 const result=await db.batch(statements);if(result.some(r=>!r.success))throw new Error('Administrative action failed');
 return json({ok:true});
}
async function audit(env,url){const {start,end}=dateRange(url);return Promise.all(sites.map(async s=>{try{return {site:s.id,records:await rows(env[s.binding],'SELECT id,occurred_at,actor,action,target_user,details FROM third_admin_audit WHERE occurred_at>=? AND occurred_at<? ORDER BY occurred_at DESC LIMIT 250',[start,end]),status:'connected'};}catch{return {site:s.id,records:[],status:'unavailable'};}}));}
export async function handle(request,env,ctx,auth=verifyAdmin){
 const url=new URL(request.url);
 if(url.hostname!=='admin.third-ai.com')return json({error:'Unknown hostname'},421);
 if(!validConfig(env))return json({error:'Administration is locked pending Access and MFA configuration'},503);
 let actor;try{actor=await auth(request,env);}catch{return json({error:'Administrator authentication required'},403);}
 try{
  if(request.method==='POST'){
   const match=url.pathname.match(/^\/api\/users\/([^/]+)\/([^/]+)$/);
   if(!match)return json({error:'Not found'},404);
   return await mutateUser(request,env,actor,decodeURIComponent(match[1]),decodeURIComponent(match[2]));
  }
  if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
  if(url.pathname==='/api/overview')return json(await overview(env,url));
  if(url.pathname==='/api/users')return json({applications:await users(env,url)});
  if(url.pathname==='/api/user'){
   if(!url.searchParams.get('site')||!url.searchParams.get('id'))return json({error:'Application and user ID required'},400);
   const found=await users(env,url);const user=found[0]?.users[0];if(!user)return json({error:'User not found or unavailable'},404);
   const applications=await Promise.all(sites.map(async s=>{try{const row=await env[s.binding].prepare('SELECT id FROM app_users WHERE email=?').bind(user.email).first();return row?{site:s.id,userId:row.id}:null;}catch{return null;}}));
   return json({user:{...user,site:found[0].site,applications:applications.filter(Boolean)}});
  }
  if(url.pathname==='/api/audit')return json({applications:await audit(env,url)});
  if(url.pathname==='/api/system')return json({commit:revision,version:env.VERSION?.id||null,admin:actor.email,access:true,siteBindings:sites.map(s=>({site:s.id,configured:!!env[s.binding]})),cost:'Cloudflare Workers Free and existing D1; no paid services added',mfa:'Required by Cloudflare Access policy; deployment must verify TOTP policy before ADMIN_ENABLED=true'});
  if(url.pathname==='/api/analytics'){
   const {readAnalytics}=await import('./analytics.mjs');return json(await readAnalytics(env,url));
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  if(!['/','/index.html','/app.js','/style.css'].includes(url.pathname))return json({error:'Not found'},404);
  return secure(await env.ASSETS.fetch(request));
 }catch{return json({error:'Operation unavailable. Check bindings, migrations, and configuration.'},503);}
}
export default {fetch:handle};
