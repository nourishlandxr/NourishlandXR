import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {showcasePose,findGroundRoute} from '../app/v2/biome-discovery-model.js';

test('the showcase reveals a path before orbs, opens briefly, then returns to quiet',()=>{
  assert.equal(showcasePose(0).alpha,0);assert.equal(showcasePose(8).orbs,0);assert(showcasePose(8).path>0);
  assert.equal(showcasePose(15).open,0);assert(showcasePose(15).orbs>0);
  assert.equal(showcasePose(21).open,1);assert.equal(showcasePose(30).alpha,0);
  assert.deepEqual(showcasePose(32),showcasePose(0));
});
test('ground routes bend around gaps, respect biome boundaries and reject cliff jumps',()=>{
  const route=findGroundRoute([0,0,0],[.5,0,0],{height:(x,z)=>x>.2&&x<.3&&Math.abs(z)<.08?NaN:.1,step:.025});
  assert(route.length>10);assert(route.some(p=>Math.abs(p[2])>=.08));assert(route.every(p=>Number.isFinite(p[1])));
  assert.equal(findGroundRoute([0,0,0],[.5,0,0],{height:(x,z)=>x>.2&&x<.3?NaN:0}).length,0);
  assert.equal(findGroundRoute([0,0,0],[.5,0,0],{height:x=>x<.25?0:1}).length,0);
  assert.equal(findGroundRoute([0,0,0],[.5,0,0],{height:()=>0,allowed:x=>x<.2||x>.3}).length,0);
});
test('the standalone world contains the maintained discovery modules',()=>{
  const html=fs.readFileSync(new URL('../app/v2/full-3d/Nourishland-Hero-Living-v17.html',import.meta.url),'utf8');
  const payload=JSON.parse(html.match(/<script id="hero-puzzle-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(payload.modules['nl-discovery-model'],fs.readFileSync(new URL('../app/v2/biome-discovery-model.js',import.meta.url),'utf8'));
  assert.equal(payload.modules['nl-discovery'],fs.readFileSync(new URL('../app/v2/biome-discovery.js',import.meta.url),'utf8').replace("'./nlxr/vendor/three.module.min.js'","'nl-three'").replace("'./biome-discovery-model.js'","'nl-discovery-model'").replace("'./biome-route-surface.js'","'nl-route-surface'"));
  assert.match(payload.modules['nl-puzzle'],/installBiomeDiscovery\(\{scene,camera/);
  assert.match(payload.modules['nl-puzzle'],/finishInnerLandscape\(\{/);
  const source=JSON.parse(fs.readFileSync(new URL('../app/v2/full-3d/world-source.json',import.meta.url),'utf8'));
  assert.equal(source.revision,'knowledge-mesh-03');
  for(const [key,hash]of Object.entries(source.modelDigests))assert.equal(crypto.createHash('sha256').update(JSON.stringify(payload[key])).digest('hex'),hash,'Current master data changed: '+key);
  assert.doesNotMatch(payload.modules['nl-discovery'],/nd-marker|nd-card|data-choose|data-next|data-kind/);
});
