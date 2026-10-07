import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoLivingMapConcept} from '../app/services/demoLivingMapModel.js';
import {livingMapRoutes,livingMapObstacles,routeSegmentClear,sampleLivingMapRoute} from '../app/services/demoLivingMapRoute.js';
import {createLivingMapVisitors} from '../app/services/demoLivingMapVisitors.js';

test('visible Totem routes use the gap between trees and every segment clears the canopy',()=>{
    for(const interactive of [false,true]){
        const model=createDemoLivingMapConcept({interactive}),obstacles=livingMapObstacles(model),routes=livingMapRoutes(model);
        for(const route of routes)for(let i=1;i<route.length;i++)assert.ok(routeSegmentClear(route[i-1],route[i],obstacles));
        if(interactive)assert.ok(routes[0].some(p=>p.x===2.65 && p.z===1.4));
        for(const route of routes){assert.deepEqual(sampleLivingMapRoute(route,0),{x:route[0].x,z:route[0].z});const end=sampleLivingMapRoute(route,1);assert.ok(Math.hypot(end.x-route.at(-1).x,end.z-route.at(-1).z)<1e-8);}
    }
});
test('rapid Totem placement queues welcome and Orb exploration before the final Area',()=>{
 const model=createDemoLivingMapConcept({interactive:true}),visitors=createLivingMapVisitors(model,livingMapRoutes(model));
 const placed=model.areas.map((area,i)=>({id:area.id,at:[0,250,2500][i]})),seen=Array.from({length:5},()=>new Set()),orbs=Array.from({length:5},()=>new Set());
 for(let t=0;t<180000;t+=16){const states=visitors.update(t,placed.filter(p=>p.at<=t));for(const s of states){if(s.scale && s.focus){seen[s.index].add(s.interaction);if(s.interaction==='orb')orbs[s.index].add(s.focus);}if(t===4000)assert.ok(s.stage<3,'rapid clicks cannot skip visitors ahead');}}
 for(let i=0;i<5;i++){assert.ok(seen[i].has('welcome'));assert.equal(orbs[i].size,3);assert.ok(seen[i].has('note'));}
 assert.ok(new Set(visitors.states.map(s=>s.dwell)).size>1);assert.ok(new Set(visitors.states.map(s=>s.speed)).size>1);
});

test('five peg visitors progress through welcome, Orb discovery and ongoing third-Totem Notes without tree collisions',()=>{
    const model=createDemoLivingMapConcept({interactive:true}),routes=livingMapRoutes(model),visitors=createLivingMapVisitors(model,routes),obstacles=livingMapObstacles(model);
    const interactions=[new Set(),new Set(),new Set()],orbIds=new Set();let previous=[];
    for(let t=0;t<210000;t+=16){
        const count=t<1000?0:t<20000?1:t<120000?2:3;
        const placed=model.areas.slice(0,count).map((area,i)=>({id:area.id,at:[1000,20000,120000][i]}));
        const states=visitors.update(t,placed);assert.equal(states.length,5);
        for(const s of states){
            if(!count){assert.equal(s.scale,0);continue;}
            if(!s.scale)continue;
            assert.ok(routeSegmentClear(s,s,obstacles),'visitor stays outside trees');
            assert.ok((s.x/6.3)**2+(s.z/4.2)**2<=1,'visitor stays on plate');
            if(previous[s.index])assert.ok(Math.hypot(s.x-previous[s.index].x,s.z-previous[s.index].z)<=.011,'no stage-change teleport');
            interactions[count-1].add(s.interaction);if(s.interaction==='orb')orbIds.add(s.focus);
            if(s.stage===3 && s.interaction!=='walk' && s.pause<=0)assert.equal(s.focus,model.areas[2].id);
        }
        previous=states.map(s=>({x:s.x,z:s.z}));
    }
    assert.ok(interactions[0].has('welcome'));assert.ok(interactions[1].has('totem'));assert.ok(interactions[1].has('orb'));
    assert.equal(orbIds.size,3);assert.ok(interactions[2].has('note'));assert.ok(interactions[2].has('totem'));
    assert.ok(visitors.states.some(s=>s.goal>1),'third stage keeps looping');
    visitors.update(210000,[]);assert.ok(visitors.states.every(s=>s.scale===0));
    visitors.update(211000,[{id:model.areas[0].id,at:210000}],true);
    assert.ok(visitors.states.every(s=>s.interaction==='welcome' && !s.walking && s.bob===0));
});
