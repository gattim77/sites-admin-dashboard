import {dateRange} from './worker.mjs';
const formats=['Google Timeline','Apple Health','GPX','FIT','TCX','KML/KMZ','CSV','unknown'];
const events=['page_view','processed','conversion_success','conversion_failed','gpx_export','application_error'];
const buckets=['none','under_1mb','1_to_10mb','10_to_50mb','50_to_128mb'];
export function validateAggregate(body){
 if(!body||Object.keys(body).sort().join(',')!=='country,durationMs,event,format,sizeBucket')return null;
 if(!events.includes(body.event)||!formats.includes(body.format)||!buckets.includes(body.sizeBucket)||!Number.isInteger(body.durationMs)||body.durationMs<0||body.durationMs>600000||!(/^([A-Z]{2}|Unknown)$/.test(body.country)))return null;
 return {event:body.event,format:body.format,sizeBucket:body.sizeBucket,country:body.country,durationMs:body.durationMs};
}
let lastPrune=-1;
export async function ingest(request,env){
 if(request.method!=='POST'||request.headers.get('Content-Type')!=='application/json')return new Response(null,{status:405});
 const text=await request.text();if(text.length>512)return new Response(null,{status:413});let b;try{b=validateAggregate(JSON.parse(text));}catch{}if(!b)return new Response(null,{status:400});
 const hour=Math.floor(Date.now()/3600000)*3600000;
 try{await env.STRATA_DB.prepare('INSERT INTO geoconversion_operational(hour,event,format,size_bucket,country,count,duration_ms) VALUES(?,?,?,?,?,1,?) ON CONFLICT(hour,event,format,size_bucket,country) DO UPDATE SET count=count+1,duration_ms=duration_ms+excluded.duration_ms').bind(hour,b.event,b.format,b.sizeBucket,b.country,b.durationMs).run();
 const today=Math.floor(hour/86400000);if(lastPrune!==today){await env.STRATA_DB.prepare('DELETE FROM geoconversion_operational WHERE hour<?').bind(hour-90*86400000).run();lastPrune=today;}return Response.json({accepted:true});}catch{return new Response(null,{status:503});}
}
export async function readGeo(env,url){
 const {start,end}=dateRange(url);const r=await env.STRATA_DB.prepare('SELECT hour,event,format,size_bucket,country,count,duration_ms FROM geoconversion_operational WHERE hour>=? AND hour<? ORDER BY hour').bind(start,end).all();if(!r.success)throw new Error('Aggregate telemetry unavailable');
 const totals=Object.fromEntries(events.map(e=>[e,0])),trend=new Map(),countries=new Map(),sourceFormats=new Map(),sizes=new Map();let duration=0;
 for(const row of r.results){totals[row.event]+=row.count;const day=new Date(row.hour).toISOString().slice(0,10);const t=trend.get(day)||{day,views:0,conversions:0,exports:0,errors:0};if(row.event==='page_view'){t.views+=row.count;countries.set(row.country,(countries.get(row.country)||0)+row.count);}if(row.event==='conversion_success')t.conversions+=row.count;if(row.event==='gpx_export')t.exports+=row.count;if(['conversion_failed','application_error'].includes(row.event))t.errors+=row.count;if(row.event==='processed'){duration+=row.duration_ms;sourceFormats.set(row.format,(sourceFormats.get(row.format)||0)+row.count);sizes.set(row.size_bucket,(sizes.get(row.size_bucket)||0)+row.count);}trend.set(day,t);}
 const distribution=m=>[...m].map(([label,value])=>({label,value}));
 return {site:'geoconversion',status:'connected',totals,trend:[...trend.values()],sourceFormats:formats.filter(f=>f!=='unknown').map(label=>({label,value:sourceFormats.get(label)||0})),inputSizes:distribution(sizes),countries:distribution(countries),averageProcessingMs:totals.processed?duration/totals.processed:null,sessions:null,users:null,identityReason:'No accounts, visitor identifiers or session tracking. Anonymous hourly aggregates only.',range:{start,end}};
}
export function geoTraffic(data){return {site:'geoconversion',status:'connected',uniqueVisitors:null,errors:data.totals.application_error+data.totals.conversion_failed,trend:data.trend.map(t=>({count:t.views,sum:{pageViews:t.views},dimensions:{date:t.day}})),countries:data.countries.map(c=>({count:c.value,dimensions:{countryName:c.label}})),pages:[{count:data.totals.page_view,dimensions:{requestPath:'/'}}]};}
