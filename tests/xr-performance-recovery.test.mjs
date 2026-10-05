import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {configureXRFrameRate,safeXRFrameRate} from '../app/services/webxrSession.js';
import {createXRPerformanceSettings} from '../app/services/xrPerformanceSettings.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from '../app/services/spatialVisualSettings.js';
import {panelSettingsControls} from '../app/services/pimInfoPanel.js';
import {createSpatialTotemCards,spatialCardTextureContent} from '../app/services/spatialTotemCards.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('a stalled headset rate request times out and allows a lower request',async()=>{
 const calls=[],session={frameRate:90,supportedFrameRates:[72,90,120],updateTargetFrameRate(rate){calls.push(rate);if(rate===120)return new Promise(()=>{});this.frameRate=rate;return Promise.resolve();}};
 assert.equal((await configureXRFrameRate(session,120,{timeoutMs:10})).timedOut,true);
 assert.equal((await configureXRFrameRate(session,90,{timeoutMs:10})).requested,90);
 assert.deepEqual(calls,[120,90]);assert.equal(safeXRFrameRate({supportedFrameRates:[]}),90);assert.equal(safeXRFrameRate({supportedFrameRates:[60,72]}),72);
});

test('90 Hz recovery supersedes an unresolved 120 Hz request',async()=>{
 const prefs=getSpatialVisualSettings(),snapshots=[],calls=[];let release;
 const session={frameRate:90,supportedFrameRates:[72,90,120],updateTargetFrameRate(){}};
 const controller=createXRPerformanceSettings({getSession:()=>session,publish:value=>snapshots.push(value),configure:async(_session,rate)=>{calls.push(rate);if(rate===120)await new Promise(resolve=>{release=resolve;});return {requested:rate};}});
 try{
  controller.tick(0);const high=controller.action('RefreshRate:120');
  const controls=panelSettingsControls({graphicsOpen:true,headset:true,performanceSettings:snapshots.at(-1)});
  assert.equal(controls.find(item=>item.action==='RefreshRate').disabled,false);
  assert.equal(controls.find(item=>item.action==='RefreshRate:120').disabled,true);
  await controller.action('RefreshRate');release();await high;
  assert.deepEqual(calls,[120,90]);assert.equal(getSpatialVisualSettings().refreshRate,90);assert.equal(snapshots.at(-1).pending,false);
 }finally{setSpatialVisualSettings(prefs);}
});

test('sustained missed 120 Hz callbacks recover even with Show FPS off',async()=>{
 const prefs=getSpatialVisualSettings(),calls=[],snapshots=[];
 const session={frameRate:90,supportedFrameRates:[72,90,120],updateTargetFrameRate(){}};
 const controller=createXRPerformanceSettings({getSession:()=>session,publish:value=>snapshots.push(value),configure:async(_session,rate)=>{calls.push(rate);session.frameRate=rate;return {requested:rate};}});
 try{
  setSpatialVisualSettings({showFps:false});controller.tick(0);await controller.action('RefreshRate:120');
  for(let time=20;time<=6000;time+=20)controller.tick(time);
  await Promise.resolve();assert.deepEqual(calls,[120,90]);assert.equal(session.frameRate,90);assert.equal(getSpatialVisualSettings().refreshRate,90);
  assert.match(snapshots.at(-1).message,/Returned to 90/);
 }finally{setSpatialVisualSettings(prefs);}
});

test('supported 60 Hz is selectable and graphics follows the main settings',()=>{
 const items=panelSettingsControls({headset:true,performanceSettings:{actual:120,pending:true,supported:[60,72,90,120]}});
 const graphics=panelSettingsControls({graphicsOpen:true,headset:true,performanceSettings:{actual:120,pending:true,supported:[60,72,90,120]}});
 assert.ok(graphics.find(item=>item.action==='RefreshRate:60'));assert.equal(graphics.find(item=>item.action==='RefreshRate').disabled,false);
 assert.equal(items.some(item=>item.action.startsWith('RefreshRate') || item.action==='ShowFps'),false);
 assert.ok(items.find(item=>item.action==='GraphicsMenu').y>items.find(item=>item.action==='FloorOffset').y);
 for(const controls of [items,graphics])for(const a of controls)for(const b of controls)if(a!==b)assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
});

test('image fades reuse one texture across both eyes and update existing storage',()=>{
 const calls=[];
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getExtension:()=>null,getAttribLocation:()=>0},{get(target,key){return key in target?target[key]:key.startsWith('create')?()=>({}):typeof key==='string' && key===key.toUpperCase()?key:(...args)=>calls.push([key,...args]);}});
 const renderer=createSpatialTotemCards(gl,{canvas:()=>({width:1000,height:760}),surfaces:(_p,_r,cards)=>cards.map(card=>({card,center:{x:0,y:0,z:-1},right:{x:1,y:0,z:0},width:1,height:1}))});
 const matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),view={projectionMatrix:matrix,transform:{inverse:{matrix}}};
 const draw=imageFade=>{renderer.begin();renderer.draw(view,{id:'panel'},{x:0,y:0,z:-1},[{id:'media',media:true,imageFade}],'');renderer.end();};
 draw(.1);draw(.10001);draw(.2);
 assert.equal(calls.filter(call=>call[0]==='texImage2D').length,1);
 assert.equal(calls.filter(call=>call[0]==='texSubImage2D').length,1);
 assert.equal(calls.filter(call=>call[0]==='deleteTexture').length,0);
 assert.equal(spatialCardTextureContent({media:true,imageFade:.1}),spatialCardTextureContent({media:true,imageFade:.10001}));renderer.destroy();
});

test('welcome is warmed before XR and readiness changes after both eyes',()=>{
 const source=read('app/screens/temporaryArDemo.js'),start=source.slice(source.indexOf('async function startImmersive()'));
 assert.ok(start.indexOf('introNoteTexture=createIntroNoteTexture')<start.indexOf('const draw ='));
 assert.match(start,/gl\.disable\(gl\.SCISSOR_TEST\);\s*if\(renderedContent\)markXrFirstContentRendered\(\)/);
 const bee=read('app/services/demoBeeModel.js'),sprite=bee.slice(bee.indexOf('renderSprite('),bee.indexOf('draw(elapsed'));
 assert.doesNotMatch(sprite,/computeBoundingBox|new THREE\.Box3/);assert.match(bee,/BEE_ANIMATION_SPEED=1\.35/);assert.match(bee,/BEE_SPRITE_INTERVAL_MS=1000\/60/);
});
