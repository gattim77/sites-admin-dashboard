import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {regionalLayers,validRegionalPoint,wmsTile} from '../lib/piacenza';
const points=JSON.parse(readFileSync('public/data/piacenza/points.geojson','utf8')).features;
const paths=JSON.parse(readFileSync('public/data/piacenza/trails.geojson','utf8')).features;
test('Piacenza import preserves government mine evidence and WGS84 coordinates',()=>{
 const mines=points.filter((f:any)=>f.properties.sourceId==='ispra-mines');assert.equal(mines.length,36);
 for(const f of mines){assert(validRegionalPoint(f.geometry.coordinates[1],f.geometry.coordinates[0]));const raw=JSON.parse(f.properties.raw);assert.equal(raw.Provincia.toLowerCase(),'piacenza');assert.equal(raw.Minerali?.trim()||'',f.properties.minerals);assert.equal(raw.Periodo_di?.trim()||'',f.properties.period);assert(f.properties.updated.includes('2006'));}
 const vig=points.find((f:any)=>f.properties.name==='Miniera di Vigonzano');assert(vig);assert(Math.abs(vig.geometry.coordinates[0]-9.5407367)<.00001);assert(Math.abs(vig.geometry.coordinates[1]-44.70601992)<.00001);assert(vig.properties.description.includes('1948'));assert(vig.properties.recordUrl.includes('id=2019'));
});
test('No fabricated merged sites or trails; IDs, source attributes and GPX survive',()=>{
 assert.equal(new Set(points.map((f:any)=>f.properties.id)).size,points.length);
 assert.equal(points.filter((f:any)=>f.properties.sourceId==='rer-geosites').length,38);
 assert.equal(points.filter((f:any)=>f.properties.kind==='mine').length,40);
 assert.equal(paths.length,437);assert(paths.some((f:any)=>f.properties.gpx.startsWith('https://mappegis.regione.emilia-romagna.it/')));
 for(const f of [...points,...paths]){assert(f.properties.sourceUrl.startsWith('https://'));assert(Object.keys(JSON.parse(f.properties.raw)).length>0);assert(f.geometry);}
});
test('WMS sources are allowlisted and unqueryable terrain remains display-only',()=>{
 assert.equal(regionalLayers.length,9);assert.equal(regionalLayers.find(l=>l.id==='rer-dtm')?.queryable,false);
 for(const l of regionalLayers){assert(wmsTile(l).includes('bbox={bbox-epsg-3857}'));assert(l.licenceUrl.startsWith('https://geoportale.regione.emilia-romagna.it/'));}
 assert(!validRegionalPoint(9.5,44.7));assert(!validRegionalPoint(NaN,9.5));assert(!validRegionalPoint(52,5));
});
