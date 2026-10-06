import {regionalLayers,validRegionalPoint} from '@/lib/piacenza';
import {cached} from '@/lib/upstream';
export async function GET(request:Request){
const p=new URL(request.url).searchParams;const lat=Number(p.get('lat')),lng=Number(p.get('lng'));
const layer=regionalLayers.find(l=>l.id===p.get('layer')&&l.queryable);
if(!p.has('lat')||!p.has('lng')||!layer||!validRegionalPoint(lat,lng))return Response.json({error:'Choose a supported layer and a point in the Piacenza study area.'},{status:400});
const bbox=[lng-.0005,lat-.0005,lng+.0005,lat+.0005].join(',');
const url=new URL(`https://servizigis.regione.emilia-romagna.it/wms/${layer.service}`);
Object.entries({service:'WMS',version:'1.1.1',request:'GetFeatureInfo',layers:layer.layers,query_layers:layer.layers,styles:'',srs:'EPSG:4326',bbox,width:'101',height:'101',x:'50',y:'50',info_format:'application/geojson',feature_count:'15'}).forEach(([k,v])=>url.searchParams.set(k,v));
try{const r=await cached(`piacenza:${layer.id}:${lat.toFixed(5)}:${lng.toFixed(5)}`,layer.id,url.toString(),86400);return Response.json({layer:layer.name,features:r.raw.features||[],retrievedAt:r.retrievedAt,url:url.toString(),licence:'CC BY 4.0',provider:'Regione Emilia-Romagna'});}catch{return Response.json({error:`${layer.name}: the regional inspection service is temporarily unavailable.`},{status:503});}
}
