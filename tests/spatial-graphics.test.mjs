import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GRAPHICS_PRESETS,RAIN_QUALITIES,setSpatialVisualSettings,getSpatialVisualSettings,resolveGraphicsQuality} from '../app/services/spatialVisualSettings.js';
import {createPlantOrbGeometry} from '../app/services/spatialSphereRenderer.js';
import {createTotemSculptureGeometry} from '../app/services/spatialTotemSculpture.js';
import {RAIN_RENDER_BUDGETS,rainDropSample,createSpatialRainRenderer,drawSpatialRainField,destroySpatialRainRenderer} from '../app/services/spatialRainRenderer.js';

test('presets control budgets and default rain without changing styles or glass',()=>{
 const original=getSpatialVisualSettings();
 try{for(const quality of ['low','medium','high']){
  setSpatialVisualSettings({graphicsQuality:quality});const state=getSpatialVisualSettings();
  assert.equal(state.rainQuality,GRAPHICS_PRESETS[quality].rain);assert.equal(state.orbModel,original.orbModel);assert.equal(state.totemModel,original.totemModel);assert.equal(state.infoOpacity,original.infoOpacity);
 }setSpatialVisualSettings({rainQuality:'off'});assert.equal(getSpatialVisualSettings().graphicsQuality,'high');assert.equal(getSpatialVisualSettings().rainQuality,'off');}
 finally{setSpatialVisualSettings(original);}
 assert.equal(resolveGraphicsQuality('auto',{deviceMemory:2,hardwareConcurrency:4}),'low');
 assert.equal(resolveGraphicsQuality('auto',{userAgent:'OculusBrowser',hardwareConcurrency:4}),'medium');
 assert.equal(resolveGraphicsQuality('high',{deviceMemory:2}),'high');
 assert.equal(resolveGraphicsQuality('auto',{}),'medium');
 assert.deepEqual(Object.keys(RAIN_QUALITIES),['off','low','high','hq']);
});
test('Orb and Totem geometry grows with quality and stays Uint16-safe',()=>{
 for(const model of ['basic','improved','advanced']){
  let previous=0;for(const tier of ['low','medium','high']){const mesh=createPlantOrbGeometry(model,tier);assert.ok(mesh.vertices.length>previous);assert.ok(mesh.vertices.every(Number.isFinite));assert.ok(Math.max(...mesh.indices)<65536);previous=mesh.vertices.length;}
 }
 let previous=0;for(const tier of ['low','medium','high']){const p=GRAPHICS_PRESETS[tier],mesh=createTotemSculptureGeometry(p.totemRadial,p.totemVertical);assert.ok(mesh.vertices.length>previous);assert.ok(mesh.vertices.every(Number.isFinite));previous=mesh.vertices.length;}
});
test('rain HQ is distinct, deterministic and frame-time based',()=>{
 assert.ok(RAIN_RENDER_BUDGETS.hq>RAIN_RENDER_BUDGETS.high);assert.equal(RAIN_RENDER_BUDGETS.off,0);
 assert.deepEqual(rainDropSample(9,1000),rainDropSample(9,1000));assert.notEqual(rainDropSample(9,1000).y,rainDropSample(9,1100).y);
 assert.ok(rainDropSample(5,1000,'hq').width>rainDropSample(5,1000,'low').width);
 const source=readFileSync(new URL('../app/services/spatialRainRenderer.js',import.meta.url),'utf8');
 assert.match(source,/gl.drawArrays\(gl.TRIANGLES/);assert.match(source,/bufferSubData/);assert.match(source,/quality==='hq'.*Number.isFinite\(groundY\)/);
});
test('shared rain renderer reuses buffers between eyes, Off draws nothing, cleanup works',()=>{
 const calls=[];let id=0;
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:()=>0,createBuffer:()=>++id,createProgram:()=>++id,createShader:()=>++id}, {get:(target,key)=>target[key] || ((...args)=>{calls.push([key,...args]);})});
 const renderer=createSpatialRainRenderer(gl),data=renderer.data,matrix=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1]),view={projectionMatrix:matrix,transform:{matrix,inverse:{matrix}}};
 drawSpatialRainField(gl,renderer,view,1000,{quality:'off'});assert.equal(calls.filter(c=>c[0]==='drawArrays').length,0);
 drawSpatialRainField(gl,renderer,view,1000,{quality:'hq',groundY:0});drawSpatialRainField(gl,renderer,view,1000,{quality:'hq',groundY:0});
 assert.equal(renderer.data,data);assert.equal(calls.filter(c=>c[0]==='bufferSubData').length,1);assert.equal(calls.filter(c=>c[0]==='drawArrays').length,2);assert.ok(renderer.count<=data.length/6);
 destroySpatialRainRenderer(gl,renderer);assert.ok(calls.some(c=>c[0]==='deleteBuffer'));
});
