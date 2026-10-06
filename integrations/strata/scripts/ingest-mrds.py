"""Extract only European MRDS records from the official, public-domain CSV archive.
Usage: python3 scripts/ingest-mrds.py /path/to/mrds-csv.zip
No generated, repaired, or guessed geological values are introduced.
"""
import csv,io,json,zipfile,hashlib,sys,datetime,pathlib
archive=pathlib.Path(sys.argv[1]); output=pathlib.Path(__file__).resolve().parents[1]/'data'
with zipfile.ZipFile(archive) as z:
 rows=[]
 for r in csv.DictReader(io.TextIOWrapper(z.open('mrds.csv'),encoding='utf-8-sig',errors='strict')):
  try:lat=float(r['latitude']);lng=float(r['longitude'])
  except ValueError:continue
  if -25<=lng<=45 and 34<=lat<=72:rows.append(r)
 metadata={'provider':'US Geological Survey','dataset':'Mineral Resources Data System','version':'Official CSV archive, member timestamp '+str(z.getinfo('mrds.csv').date_time),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'downloadUrl':'https://mrdata.usgs.gov/mrds/mrds-csv.zip','licence':'US public domain; use constraints none','licenceEvidence':'https://mrdata.usgs.gov/metadata/mrds.txt','sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'coverage':[-25,34,45,72],'recordCount':len(rows),'systematicUpdatesCeased':2011,'note':'A bounded European extract. Every source field is retained. Ore/gangue strings are historical identifications, not a modern verification or access grant.'}
 output.mkdir(exist_ok=True)
 (output/'mrds-europe.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':')))
 (output/'mrds-manifest.json').write_text(json.dumps(metadata,indent=2))
 print(json.dumps({'records':len(rows),'bytes':(output/'mrds-europe.json').stat().st_size,'Italy':sum(r['country']=='Italy' for r in rows),'Netherlands':sum(r['country']=='Netherlands' for r in rows),'withOreOrGangue':sum(bool(r['ore'] or r['gangue']) for r in rows)}))
 print([(r['site_name'],r['ore'],r['gangue']) for r in rows if r['country']=='Italy' and r['ore']][:5])
