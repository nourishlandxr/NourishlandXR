import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import * as THREE from '../app/vendor/three.module.min.js';
import {createTotemSculptureGeometry} from '../app/services/spatialTotemSculpture.js';
import {createCraftedSignGeometry} from '../app/services/craftedTotemGeometry.js';
import {craftedTotemSignStyle,paintCraftedTotemSign} from '../app/services/craftedTotemSigns.js';
import {totemSignMount} from '../app/services/totemSignMounts.js';
const world=fs.readFileSync(new URL('../app/v2/full-3d/Nourishland-Hero-Living-v17.html',import.meta.url),'utf8');
const payload=JSON.parse(world.match(/<script id="hero-puzzle-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);

test('world uses the shared crafted models without altering any terrain, planting or presentation payload',()=>{
 const previous=fs.readFileSync(new URL('../root-site/releases/0.9775/payload/xr/v2/full-3d/Nourishland-Hero-Living-v17.html',import.meta.url),'utf8');
 const base=JSON.parse(previous.match(/<script id="hero-puzzle-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
 const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
 for(const key of Object.keys(base).filter(k=>k!=='modules'))assert.equal(hash(payload[key]),hash(base[key]),key);
 assert.match(payload.modules['nl-layer-totem'],/appendCraftedTotemDetails/);
 assert.match(payload.modules['nl-craft-signs'],/engraved|stone/);
 const manifest=JSON.parse(fs.readFileSync(new URL('../app/v2/full-3d/world-manifest.json',import.meta.url)));
 assert.equal(manifest.bytes,Buffer.byteLength(world));assert.equal(manifest.sha256,hashBytes(world));
});
const hashBytes=value=>crypto.createHash('sha256').update(value).digest('hex');

test('world creates eight complete Totem families with matching mounted signs and a bounded label atlas',()=>{
 const styles=['basic','carved','botanical','organic','sun','leaf','rock','moon'];
 const report={styles,stations:styles.map((style,i)=>({id:String(i),name:'Area '+i,position:[i*.2,0,0],start:.1,style})),network:styles.map((_,i)=>({from:String(i),to:String((i+1)%8)}))};
 const root=new THREE.Group(),camera=new THREE.PerspectiveCamera(),geometries=[],textures=[];camera.position.set(0,3,4);
 const canvas={width:0,height:0,getContext:()=>new Proxy({measureText:text=>({width:text.length*36})},{get:(o,k)=>o[k]||(()=>{})})};
 const original=globalThis.document;globalThis.document={createElement:()=>canvas};
 try{
  const source=payload.modules['nl-puzzle'],a=source.indexOf(' function buildTotems(){'),b=source.indexOf(' const pulseGLSL',a);
  assert.ok(a>0&&b>a);
  const build=new Function('T','report','root','camera','ownGeometry','ownTexture','growthMaterial','renderer','createTotemSculptureGeometry','createCraftedSignGeometry','craftedTotemSignStyle','paintCraftedTotemSign','totemSignMount',source.slice(a,b)+';return buildTotems;')(THREE,report,root,camera,g=>(geometries.push(g),g),t=>(textures.push(t),t),m=>m,{capabilities:{maxTextureSize:2048}},createTotemSculptureGeometry,createCraftedSignGeometry,craftedTotemSignStyle,paintCraftedTotemSign,totemSignMount);
  build();assert.equal(report.totemCraftVersion,'0.9780');assert.equal(report.directionSigns,24);assert.ok(canvas.width<=2048&&canvas.height<=2048);
  assert.equal(root.children.filter(o=>o.userData.role==='nl_totem').length,8);
  for(const style of styles){const objects=root.children.filter(o=>o.userData.style===style);assert.ok(objects.length>=4);assert.ok(objects.every(o=>Array.from(o.instanceMatrix.array).every(Number.isFinite)));}
  const stoneSign=root.children.find(o=>o.userData.role==='nl_direction_sign'&&o.userData.style==='rock');assert.equal(stoneSign.material.color.getHexString(),'a9afa5');
 }finally{globalThis.document=original;geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());root.traverse(o=>o.material?.dispose());}
});
