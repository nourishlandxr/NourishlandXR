import test from 'node:test';
import assert from 'node:assert/strict';
import { searchSpecimens, specimenKey, arReadiness, safeImage, html } from '../app/services/productExperience.js';
import { readingPositions, hitReadingPlant, visitorTrackingCopy } from '../app/services/visitorSpatialState.js';
import { plantInformationWebMarkup,createPlantInformationWebState } from '../app/components/plantInformationWeb.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';

test('catalogue search preserves same-species specimens and compound location identity',()=>{
 const plants=[{siteId:'a',placeId:'bed',instanceId:'1',commonName:'Café plum',scientificName:'Testus alpha',layer:'Shrub'},{siteId:'b',placeId:'bed',instanceId:'1',commonName:'Café plum',scientificName:'Testus alpha',layer:'Tree'}];
 const before=JSON.stringify(plants);
 assert.equal(searchSpecimens(plants,'cafe').length,2);
 assert.notEqual(specimenKey(plants[0]),specimenKey(plants[1]));
 assert.deepEqual(searchSpecimens(plants,'testus alpha',JSON.stringify(['b','bed'])),[plants[1]]);
 assert.deepEqual(searchSpecimens(plants,'','', 'Shrub'),[plants[0]]);
 assert.equal(searchSpecimens(plants,'nonexistent').length,0);
 assert.equal(JSON.stringify(plants),before);
});
test('external imagery rejects executable URLs and escapes displayed source text',()=>{
 assert.equal(safeImage('javascript:alert(1)'), '');
 assert.equal(safeImage('data:text/html,<script>'), '');
 assert.equal(safeImage('https://example.org/plant.jpg'),'https://example.org/plant.jpg');
 assert.equal(html('<img onerror="run()">'),'&lt;img onerror=&quot;run()&quot;&gt;');
});
test('AR entry distinguishes insecure, unsupported and supported devices without asking permissions',()=>{
 assert.equal(arReadiness({secure:false,xr:true}).ready,false);
 assert.equal(arReadiness({secure:true,xr:false}).ready,false);
 assert.equal(arReadiness({secure:true,xr:true,supported:false}).ready,false);
 assert.equal(arReadiness({secure:true,xr:true,supported:true}).ready,true);
});
test('reading positions are session-relative, bounded and do not alter the pose',()=>{
 const pose={transform:{position:{x:10,y:1.7,z:20},matrix:[1,0,0,0,0,1,0,0,0,0,1,0,10,1.7,20,1]}};
 const before=JSON.stringify(pose);const positions=readingPositions(pose,20);
 assert.equal(positions.length,7);
 positions.forEach(p=>assert.ok(Math.abs(Math.hypot(p.x-10,p.z-20)-1.65)<1e-10));
 assert.equal(JSON.stringify(pose),before);
});
test('spatial selection chooses the nearest forward hit and excludes behind-camera targets',()=>{
 const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
 assert.equal(hitReadingPlant(matrix,[{x:0,y:0,z:1},{x:0,y:0,z:-3},{x:0,y:0,z:-1}]),2);
 assert.equal(hitReadingPlant(matrix,[{x:1,y:0,z:-1}]),-1);
 assert.match(visitorTrackingCopy(false,5),/paused/);
 assert.match(visitorTrackingCopy(true,5),/not aligned/);
});
test('embedded visitor PIM retains search and six categories without creator review actions',()=>{
 const markup=plantInformationWebMarkup(PIGEON_PEA_PIM,createPlantInformationWebState(PIGEON_PEA_PIM),{embedded:true,editable:false});
 assert.match(markup,/<h2>Plant knowledge<\/h2>/);
 assert.match(markup,/data-pim-search-form/);
 assert.doesNotMatch(markup,/data-pim-add-observation/);
 for(const id of ['food-forest','cultivation','propagation','uses','historical-data','scientific-information'])assert.ok(markup.includes(`data-pim-node-id="${id}"`));
 const creator=plantInformationWebMarkup(PIGEON_PEA_PIM,{}, {editable:true});
 assert.match(creator,/data-pim-add-observation/);
 assert.match(creator,/publication|publish when ready/);
});
test('creator dashboard reports partial reads without losing healthy area identities',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
 globalThis.window={location:{pathname:'/app/'}};
 globalThis.fetch=async url=>{
   let data={};let status=200;
   if(url.endsWith('/projects/demo'))data={id:'demo',name:'Demo'};
   else if(url.endsWith('/sites'))data=[{id:'main'}];
   else if(url.endsWith('/places'))data=[{id:'good',name:'Orchard'},{id:'missing',name:'Unfinished area'}];
   else if(url.endsWith('/good/markers'))data=[{id:'old-id',name:'Existing plant',type:'plant'}];
   else if(url.endsWith('/missing/markers')){data={error:'Place not found'};status=404;}
   return new Response(JSON.stringify(data),{status});
 };
 try{
  const {loadProjectDashboardV2Model}=await import('../app/services/projectDashboardV2Model.js');
  const model=await loadProjectDashboardV2Model('demo');
  assert.equal(model.totalPlants,1);assert.equal(model.plantEntries[0].marker.id,'old-id');
  assert.deepEqual(model.loadWarnings.map(w=>w.areaId),['missing']);
 }finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
