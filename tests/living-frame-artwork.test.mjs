import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLivingLeafAtlas,prepareLivingFrameArtwork,drawLivingLeafArtwork,LIVING_LEAF_COLOURS} from '../app/services/livingFrameArtwork.js';
import {livingAerialRootPoints} from '../app/services/arWelcomeRoots.js';
import {GRAPHICS_PRESETS,setSpatialVisualSettings,getSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {prepareArAssets} from '../app/services/arAssetPreparation.js';
function canvasFactory(){let gradients=0,clips=0;const ctx={createLinearGradient(){gradients++;return {addColorStop(){}};},createRadialGradient(){gradients++;return {addColorStop(){}};},clip(){clips++;}};
 for(const method of ['save','restore','translate','scale','beginPath','moveTo','bezierCurveTo','quadraticCurveTo','closePath','fill','fillRect','stroke'])ctx[method]=()=>{};
 const canvas={getContext:()=>ctx};return {canvas,makeCanvas:()=>canvas,stats:()=>({gradients,clips})};}
test('HIGH atlas has bounded transparent tiles with reusable shaded leaf variations',()=>{
 const mock=canvasFactory(),atlas=createLivingLeafAtlas(mock.makeCanvas,GRAPHICS_PRESETS.high.frameLeafPixels);
 assert.equal(atlas.leafCount,LIVING_LEAF_COLOURS.length*2);assert.equal(atlas.bytes,4194304);assert.ok(mock.stats().gradients>=atlas.leafCount*3);assert.equal(mock.stats().clips,atlas.leafCount);
 for(const tile of atlas.tiles.values()){assert.ok(tile.x>=0 && tile.y>=0 && tile.x+tile.pixels<=atlas.canvas.width && tile.y+tile.pixels<=atlas.canvas.height);}
 assert.equal(prepareLivingFrameArtwork('low'),null);assert.equal(prepareLivingFrameArtwork('medium'),null);
});
test('hanging root samples have exact attached ends and finite smooth intermediate points',()=>{
 const start={x:400,y:950},end={x:418,y:1200},points=livingAerialRootPoints(start,end,250);
 assert.equal(points.length,37);assert.deepEqual(points[0],start);assert.deepEqual(points.at(-1),end);assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
 assert.ok(points.every((p,i)=>i===0 || p.y>points[i-1].y));assert.notEqual(points[8].x,start.x+(end.x-start.x)*8/36,'rootlets follow the actual cubic rather than a straight approximation');
});
test('HIGH preparation accounts for its artwork and does not reuse another quality readiness state',async()=>{
 const previous=getSpatialVisualSettings();try{setSpatialVisualSettings({graphicsQuality:'medium'});const medium=await prepareArAssets({experience:'creator'});setSpatialVisualSettings({graphicsQuality:'high'});const high=await prepareArAssets({experience:'creator'});assert.equal(medium.total,3);assert.equal(high.total,4);assert.equal(high.loaded,4);}finally{setSpatialVisualSettings(previous);}
 const controls=readFileSync(new URL('../app/services/arPreparationControls.js',import.meta.url),'utf8');assert.doesNotMatch(controls,/data-ar-graphics/);assert.match(controls,/token!==preparationToken/);
 const roots=readFileSync(new URL('../app/services/arWelcomeRoots.js',import.meta.url),'utf8');assert.match(roots,/detail>1 && drawLivingLeafArtwork/);assert.match(roots,/WELCOME_ROOT_REFRESH_MS/);
});


test('prepared HIGH atlas is shared by leaf draws and never allocates again on a repeat',t=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document'),mock=canvasFactory();let created=0,drawn=0;
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){created++;return mock.makeCanvas();}}});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'document',descriptor);else delete globalThis.document;});
 const first=prepareLivingFrameArtwork('high');assert.ok(first);assert.equal(first,prepareLivingFrameArtwork('high'));assert.equal(created,1);
 const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){drawn++;}};
 assert.equal(drawLivingLeafArtwork(ctx,100,110,.2,20,'#345638'),true);assert.equal(drawLivingLeafArtwork(ctx,110,120,.3,18,'#7e9281'),true);assert.equal(drawn,2);assert.equal(created,1);
});
