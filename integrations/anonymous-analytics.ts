// Anonymous hourly totals only: never persist IPs, cookies, account IDs, query strings, or visitor IDs.
export async function recordAnonymous(request: Request, response: Response, db: D1Database | undefined) {
 if(!db || request.method!=='GET')return;
 const url=new URL(request.url);
 const routes=['/','/planner','/events','/destinations','/transport','/trips','/account','/privacy'];
 const route=routes.includes(url.pathname)?url.pathname:url.pathname.startsWith('/api/')?'/api/*':'/other';
 const view=response.status===200&&!!response.headers.get('content-type')?.includes('text/html')&&!request.headers.has('rsc')&&!url.searchParams.has('_rsc');
 const error=response.status>=500;
 if(!view&&!error)return;
 const agent=request.headers.get('user-agent')||'';
 const device=/bot|crawler|spider/i.test(agent)?'Bot':/iPad|Tablet/i.test(agent)?'Tablet':/Mobile|Android/i.test(agent)?'Mobile':'Desktop';
 const browser=/Edg\//.test(agent)?'Edge':/Firefox\//.test(agent)?'Firefox':/Chrome\//.test(agent)?'Chrome':/Safari\//.test(agent)?'Safari':'Other';
 const os=/Windows/.test(agent)?'Windows':/Android/.test(agent)?'Android':/iPhone|iPad/.test(agent)?'iOS':/Macintosh/.test(agent)?'macOS':/Linux/.test(agent)?'Linux':'Other';
 let referrer='Direct';try{const host=new URL(request.headers.get('referer')||'').hostname;if(host!==url.hostname)referrer=host.slice(0,255);}catch{}
 const country=(request as Request & {cf?:{country?:string}}).cf?.country||'Unknown';
 const hour=Math.floor(Date.now()/3600000)*3600000;
 try{
  await db.prepare(`INSERT INTO third_admin_traffic(hour,route,country,device,browser,os,referrer,page_views,errors) VALUES(?,?,?,?,?,?,?,?,?)
   ON CONFLICT(hour,route,country,device,browser,os,referrer) DO UPDATE SET page_views=page_views+excluded.page_views,errors=errors+excluded.errors`)
   .bind(hour,route,country,device,browser,os,referrer,view?1:0,error?1:0).run();
  // Expired buckets are indexed by the leading primary key; prune only once per isolate each day.
  if(lastPrune!==Math.floor(hour/86400000)){
   lastPrune=Math.floor(hour/86400000);
   await db.prepare('DELETE FROM third_admin_traffic WHERE hour<?').bind(hour-90*86400000).run();
  }
 }catch{/* Analytics failure must not break public applications. Do not log request contents. */}
}
let lastPrune=-1;
