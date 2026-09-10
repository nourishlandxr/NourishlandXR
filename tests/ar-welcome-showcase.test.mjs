import test from 'node:test';
import assert from 'node:assert/strict';
import {drawArWelcomeShowcase,AR_WELCOME_CLUSTERS} from '../app/services/arWelcomeShowcase.js';
function paint(time,reduced=false){const text=[];const ctx=new Proxy({globalAlpha:1,fillText(value){if(this.globalAlpha>.01)text.push(value);}},{get:(target,key)=>key in target?target[key]:()=>{}});drawArWelcomeShowcase(ctx,time,reduced);return text;}
test('welcome rectangle and title precede corner cells; reduced motion is complete immediately',()=>{
 assert.deepEqual(paint(0),[]);assert.ok(paint(6000).includes('NourishlandXR'));assert.ok(!paint(6000).includes('Climate'));
 assert.ok(paint(20000).includes('Climate'));assert.ok(paint(20000).includes('Mango'));assert.ok(paint(0,true).includes('Citrus'));
});
test('corner cells stay inside the texture and do not overlap each other',()=>{
 const points=AR_WELCOME_CLUSTERS.flatMap(c=>c.points);
 points.forEach(([x,y],i)=>{assert.ok(x>=72 && x<=1328 && y>=54 && y<=1026);points.slice(i+1).forEach(([a,b])=>assert.ok(Math.hypot(x-a,y-b)>144));});
});
