"""Reproducible bounded import. WFS 2 EPSG:4326 BBOX uses latitude/longitude order.
GeoJSON output is longitude/latitude. No inferred coordinates or mineral species.
Usage: python3 scripts/ingest-piacenza.py [--cache /path/to/download-cache]
"""
import argparse,hashlib,json,pathlib,urllib.request,urllib.parse,datetime,concurrent.futures
parser=argparse.ArgumentParser();parser.add_argument('--cache',type=pathlib.Path);args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1];out=root/'public/data/piacenza';out.mkdir(parents=True,exist_ok=True)
bbox=[9.15,44.45,10.15,45.2];records=[];manifest=[]
jobs=[('geositi','Geositi_catasto_punti','geosite'),('geositi','Geositi_catasto_aree','area'),('geositi','Itinerari_geoambientali','geotrail'),('geologia10k','Risorse_prospezioni_10k','resource'),('geologia50k','Risorse_prospezioni_50k','resource'),('geologia10k','Affioramenti_punti_10k','outcrop')]+[('rete_escursionistica',n,k) for n,k in [('Parcheggio','parking'),('Museo','museum'),('Sorgente_o_fontana','spring'),('Punto_panoramico_a_360_gradi','viewpoint'),('Emergenza_antropico_ambientale','heritage'),('Percorso_escursionistico','trail'),('Rifugio_gestito','shelter'),('Bivacco','shelter'),('Centro_visita_di_Parco_o_Riserva_naturale','visitor')]]
def retrieve(key,url):
 path=args.cache/(key+'.json') if args.cache else None
 if path and path.exists():data=path.read_bytes();stamp=datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat()
 else:data=urllib.request.urlopen(url,timeout=60).read();stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
 return json.loads(data),stamp,hashlib.sha256(data).hexdigest()
def clean(v):
 if v is None or str(v).strip().lower() in ['null','none','nd','n.d.','']:return ''
 return str(v).strip()
def import_job(job):
 service,name,kind=job
 params={'service':'WFS','version':'2.0.0','request':'GetFeature','typeNames':f'portale_{service}:{name}','outputFormat':'GEOJSON','srsName':'EPSG:4326','bbox':'44.45,9.15,45.2,10.15,EPSG:4326','count':'10000'}
 url='https://servizigis.regione.emilia-romagna.it/wfs/'+service+'?'+urllib.parse.urlencode(params)
 data,stamp,sha=retrieve(name,url);fs=data['features'];assert len(fs)<10000,'Possible truncated response'
 items=[]
 for f in fs:
  p=f['properties'];geometry=f.get('geometry')
  if not geometry:continue
  if kind in ['geosite','area'] and 'Piacenza' not in p.get('PROVINCE',''):continue
  k='mine' if kind=='geosite' and 'Ex miniera' in p.get('GEOTIPI','') else kind
  title=next((clean(p.get(key)) for key in ['NOME','NOME_NUMERO','ITINERARIO','LEGENDA','DESCRIZIONE'] if clean(p.get(key))),name.replace('_',' '))
  detail=clean(p.get('DIDASCALIA') or p.get('DESCRIZIONE'));detail='' if detail=='Pubblicabile' else detail
  props={'id':name+':'+str(p['OBJECTID']),'name':title,'kind':k,'source':'Regione Emilia-Romagna','sourceId':'rer-geosites' if service=='geositi' else 'rer-reer' if service=='rete_escursionistica' else 'rer-geology','sourceLayer':name,'licence':'CC BY 4.0','retrievedAt':stamp,'sourceUrl':url,'recordUrl':clean(p.get('SCHEDA') or p.get('DOWNLOAD_GEOJSON')) or url,'description':detail,'municipality':clean(p.get('COMUNI')),'minerals':clean(p.get('GEOTIPI')) if k=='mine' else '', 'period':'','historicalStatus':'Historical mine / ex miniera' if k=='mine' else '', 'positionNote':'Regional geosite representative point; not an entrance survey.' if kind=='geosite' else 'Original source geometry; positional accuracy not supplied.','raw':json.dumps(p,ensure_ascii=False),'updated':clean(p.get('DATA_AGG') or p.get('VIGENTE')),'gpx':clean(p.get('DOWNLOAD_GPX')),'geositeId':clean(p.get('GISID'))}
  items.append({'type':'Feature','id':props['id'],'geometry':geometry,'properties':props})
 return items,{'layer':name,'sourceUrl':url,'retrievedAt':stamp,'sha256':sha,'returned':len(fs),'included':len(items),'licence':'CC BY 4.0'}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for fs,m in pool.map(import_job,jobs):records.extend(fs);manifest.append(m)
url="https://sgi2.isprambiente.it/arcgis/rest/services/servizi/siti_dismessi/MapServer/0/query?where=UPPER(Provincia)%3D%27PIACENZA%27&outFields=*&outSR=4326&f=pjson"
# The source supplies WGS84 geometry; retain original latitude/longitude strings as evidence too.
if args.cache:
 path=args.cache/'ispra.txt';data=json.loads(path.read_bytes());stamp=datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat();sha=hashlib.sha256(path.read_bytes()).hexdigest()
else:data,stamp,sha=retrieve('ispra',url)
assert not data.get('exceededTransferLimit')
for f in data['features']:
 p=f['attributes'];g=f['geometry'];assert p['Provincia'].lower()=='piacenza'
 props={'id':'ispra:'+str(p['OBJECTID']),'name':p['Nome'],'kind':'mine','source':'ISPRA / APAT','sourceId':'ispra-mines','sourceLayer':'Siti minerari dismessi','licence':'CC BY 4.0 (ISPRA default data policy; no layer override stated)','retrievedAt':stamp,'sourceUrl':url,'recordUrl':'https://sgi2.isprambiente.it/arcgis/rest/services/servizi/siti_dismessi/MapServer/0/'+str(p['OBJECTID']),'description':'Historical mining census, updated to 2006. Current operating status and public access are not established.','municipality':clean(p.get('Comune')),'minerals':clean(p.get('Minerali')),'period':clean(p.get('Periodo_di')),'historicalStatus':{'A':'Abandoned','I':'Inactive','P':'Productive','R':'Exploration permit'}.get(p.get('Situazione'),clean(p.get('Situazione'))),'positionNote':'Historical census point; not a verified mine entrance.','raw':json.dumps(p,ensure_ascii=False),'updated':'Census updated to 2006','gpx':''}
 records.append({'type':'Feature','id':props['id'],'geometry':{'type':'Point','coordinates':[g['x'],g['y']]},'properties':props})
manifest.append({'layer':'ISPRA mining census','sourceUrl':url,'retrievedAt':stamp,'sha256':sha,'returned':len(data['features']),'included':len(data['features']),'licence':'ISPRA default CC BY 4.0; https://www.isprambiente.gov.it/it/note-legali'})
for label,fs in [('points',[f for f in records if f['geometry']['type']=='Point']),('trails',[f for f in records if 'LineString' in f['geometry']['type']]),('areas',[f for f in records if 'Polygon' in f['geometry']['type']])]:
 (out/(label+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','features':fs},ensure_ascii=False,separators=(',',':')));print(label,len(fs))
counts={k:sum(f['properties']['kind']==k for f in records) for k in sorted(set(f['properties']['kind'] for f in records))}
(root/'data/piacenza-manifest.json').write_text(json.dumps({'retrievedAt':stamp,'extent':bbox,'scope':'Piacenza province for ISPRA mines and regional geosites; bounding-box surroundings for other regional features.','counts':counts,'sources':manifest},indent=2))
