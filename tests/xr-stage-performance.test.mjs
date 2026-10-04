import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBeeXRRenderer} from '../app/services/demoBeeXR.js';
import {cellGroundcoverGrowth} from '../app/services/arWelcomeRoots.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('four native bees and both eyes share static mesh storage and one small rig upload',()=>{
 const calls=[];
 const gl=new Proxy({getExtension:()=>({}),getParameter:()=>4,getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_program,name)=>name},{get(target,key){return key in target?target[key]:key.startsWith('create')?()=>({}):key===key.toUpperCase()?key:(...args)=>calls.push([key,...args]);}});
 const matrix={elements:new Float32Array(16),clone(){return {...this};},copy(){return this;},multiply(){return this;}};
 const attribute=size=>({array:new Float32Array(size*3),itemSize:size});
 let updates=0;
 const model={mixer:{update(){updates++;}},wrapper:{updateMatrixWorld(){}},mesh:{matrixWorld:matrix,bindMatrix:matrix,bindMatrixInverse:matrix,geometry:{attributes:{position:attribute(3),normal:attribute(3),uv:attribute(2),skinIndex:attribute(4),skinWeight:attribute(4)},index:{array:new Uint16Array([0,1,2,0,2,1])},groups:[{start:0,count:3,materialIndex:0},{start:3,count:3,materialIndex:1}]},skeleton:{bones:new Array(108),boneMatrices:new Float32Array(108*16),update(){}}}};
 const renderer=createBeeXRRenderer(gl,model,{}),view={projectionMatrix:matrix.elements,transform:{matrix:matrix.elements,inverse:{matrix:matrix.elements}}};
 for(let eye=0;eye<2;eye++)for(let bee=0;bee<4;bee++)renderer.draw(view,{x:0,y:0,z:-1},1000,{opacity:1,flyby:0});
 assert.equal(updates,1);
 const draws=calls.filter(c=>c[0]==='drawElements');
 assert.equal(draws.length,16,'each bee and eye draws its solid body and transparent wings');
 assert.deepEqual(draws.map(call=>call.slice(1)),Array.from({length:8},()=>[['TRIANGLES',3,'UNSIGNED_SHORT',0],['TRIANGLES',3,'UNSIGNED_SHORT',6]]).flat());
 assert.deepEqual(calls.filter(c=>c[0]==='uniform1f' && c[1]==='solid').map(c=>c[2]),Array.from({length:8},()=>[1,0]).flat());
 assert.deepEqual(calls.filter(c=>c[0]==='depthMask').map(c=>c[1]),Array.from({length:8},()=>[true,false,true]).flat());
 assert.equal(calls.filter(c=>c[0]==='bufferData').length,6,'geometry is uploaded once');
 const upload=calls.filter(c=>c[0]==='texSubImage2D');assert.equal(upload.length,1);assert.equal(upload[0].at(-1).byteLength,6912);
 renderer.destroy();assert.equal(calls.filter(c=>c[0]==='deleteTexture').length,2);
});

test('unsupported vertex float textures choose a lightweight fallback',()=>{
 assert.equal(createBeeXRRenderer({getExtension:()=>null},null,null),null);
 assert.equal(createBeeXRRenderer({getExtension:()=>({}),getParameter:()=>0},null,null),null);
});

test('arrival does not repeatedly upload the full welcome surface merely because time is passing',()=>{
 const screen=read('app/screens/temporaryArDemo.js');
 const draw=screen.slice(screen.indexOf('function drawIntroSpatial'),screen.indexOf('function drawSpatialAmbientLife'));
 assert.doesNotMatch(draw,/arWelcomeClock.elapsed<AR_WELCOME_SETTLED_MS/);
 const ambient=screen.slice(screen.indexOf('function drawSpatialAmbientLife'),screen.indexOf('function ambientBeeWorldPosition'));
 assert.doesNotMatch(ambient,/tex(?:Sub)?Image2D|renderSprite/);
 assert.match(ambient,/drawXR/);
 const mount=read('app/services/demoBeeModel.js');assert.match(mount,/renderer=gl\?null:new THREE.WebGLRenderer/);
});

test('Settings moves to the free dock while the image retains its own dock',()=>{
 const panel=read('app/services/pimInfoPanel.js');
 assert.match(panel,/settingsPose=spatialMediaDockPose\(mediaCard && mediaDockSide==='left'\?'top':'left'\)/);
 assert.doesNotMatch(panel,/dockSide=settingsOpen/);
 assert.match(panel,/mediaSurface=mediaDetached\?mediaPose:spatialMediaDockPose\(mediaDockSide\)/);
});

test('cell foliage is absent until opening, then grows slowly rather than appearing fully formed',()=>{
 assert.equal(cellGroundcoverGrowth(300000,undefined),0);
 assert.equal(cellGroundcoverGrowth(20000,20000),0);
 assert.equal(cellGroundcoverGrowth(21000,20000),0);
 assert.ok(cellGroundcoverGrowth(40000,20000)>0 && cellGroundcoverGrowth(40000,20000)<.3);
 assert.equal(cellGroundcoverGrowth(81500,20000),1);
 const roots=read('app/services/arWelcomeRoots.js');
 const carpet=roots.slice(roots.indexOf('function drawLowCellGroundcover'),roots.indexOf('export const LIVING_RIM'));
 assert.doesNotMatch(carpet,/reducedMotion\?1|Math\.sqrt\(hash/);
 assert.match(carpet,/ctx\.moveTo\(cell\.x\+Math\.cos\(angle\)\*edge/);
 assert.match(read('app/services/arWelcomeShowcase.js'),/cellOpenedAt:options.drawCells===false\?\{\}:options.progression\?\.expandedAt/);
});
