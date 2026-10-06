import { dateRange, sites } from './worker.mjs';
// Only aggregate dimensions are queried. No visitor identifiers, IP addresses, query strings, or user joins.
const cache=new Map();
export async function readAnalytics(env,url){
 const range=dateRange(url);
 if(!env.CF_ANALYTICS_TOKEN||!env.CF_ACCOUNT_ID||!env.RUM_SITE_TAGS)return readD1Analytics(env,range);
 let tags;try{tags=JSON.parse(env.RUM_SITE_TAGS);}catch{return {status:'unavailable',reason:'Invalid Web Analytics configuration',sites:[],range};}
 const key=JSON.stringify([range,tags]);const old=cache.get(key);if(old&&old.expires>Date.now())return old.value;
 const result=await Promise.all(sites.map(async site=>{
  if(!/^[a-f0-9]{32}$/.test(tags[site.id]||''))return {site:site.id,status:'unavailable',reason:'No Web Analytics site identifier configured'};
  const filter=`filter:{siteTag:${JSON.stringify(tags[site.id])},datetime_geq:${JSON.stringify(new Date(range.start).toISOString())},datetime_lt:${JSON.stringify(new Date(range.end).toISOString())}}`;
  const groups={trend:'date',countries:'countryName',devices:'deviceType',browsers:'browserName',operatingSystems:'operatingSystemName',referrers:'refererHost',pages:'requestPath'};
  // Validate the optional RUM schema during integration before configuring this adapter; failures remain unavailable.
  const fields=Object.entries(groups).map(([alias,dimension])=>`${alias}:rumPageloadEventsAdaptiveGroups(limit:500,${filter}){count sum{visits} dimensions{${dimension}}}`).join('\n');
  const response=await fetch('https://api.cloudflare.com/client/v4/graphql',{method:'POST',headers:{Authorization:`Bearer ${env.CF_ANALYTICS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query:`{viewer{accounts(filter:{accountTag:${JSON.stringify(env.CF_ACCOUNT_ID)}}){${fields}}}}`}),signal:AbortSignal.timeout(15000)});
  const body=await response.json();if(!response.ok||body.errors)return {site:site.id,status:'unavailable',reason:'Cloudflare analytics query unavailable; verify token permissions, retention and schema'};
  const data=body.data?.viewer?.accounts?.[0];if(!data)return {site:site.id,status:'unavailable',reason:'No analytics account data'};
  return {site:site.id,status:'connected',uniqueVisitors:null,uniqueVisitorsReason:'Cloudflare Web Analytics does not identify unique individuals',...data};
 }));
 const value={status:result.some(s=>s.status==='connected')?'connected':'unavailable',sites:result,range,source:'Cloudflare Web Analytics (aggregate RUM; sampled where Cloudflare applies sampling)'};
 if(cache.size>8)cache.clear();cache.set(key,{expires:Date.now()+60000,value});return value;
}

async function readD1Analytics(env,range){
 const dimensions={countries:['country','countryName'],devices:['device','deviceType'],browsers:['browser','browserName'],operatingSystems:['os','operatingSystemName'],referrers:['referrer','refererHost'],pages:['route','requestPath']};
 const result=await Promise.all(sites.map(async site=>{
  const db=env[site.binding];
  try{
   const query=async(sql)=>{const r=await db.prepare(sql).bind(range.start,range.end).all();if(!r.success)throw new Error('Unavailable');return r.results;};
   const trend=await query("SELECT date(hour/1000,'unixepoch') AS day,SUM(page_views) AS value FROM third_admin_traffic WHERE hour>=? AND hour<? GROUP BY day ORDER BY day");
   const groups=await Promise.all(Object.entries(dimensions).map(async([alias,[column,key]])=>[alias,(await query(`SELECT ${column} AS label,SUM(page_views) AS value FROM third_admin_traffic WHERE hour>=? AND hour<? GROUP BY ${column} ORDER BY value DESC LIMIT 50`)).map(r=>({count:r.value,dimensions:{[key]:r.label}}))]));
   const errors=await db.prepare('SELECT COALESCE(SUM(errors),0) AS errors FROM third_admin_traffic WHERE hour>=? AND hour<?').bind(range.start,range.end).first();
   return {site:site.id,status:'connected',uniqueVisitors:null,errors:errors.errors,trend:trend.map(r=>({count:r.value,sum:{pageViews:r.value},dimensions:{date:r.day}})),...Object.fromEntries(groups)};
  }catch{return {site:site.id,status:'unavailable',reason:'Anonymous aggregation migration not yet available'};}
 }));
 return {status:result.some(r=>r.status==='connected')?'connected':'unavailable',metric:'pageViews',sites:result,range,source:'Cloudflare D1 anonymous hourly aggregates. Counts server HTML responses, including bots; client-only navigation is not counted. No unique visitor or session tracking. Collection begins at deployment; retention is 90 days.'};
}
