import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedPortalRoute} from '../app/services/portalRoutes.js';
import {createSandboxTourRequest,discoverySandboxModel} from '../app/services/discoveryPathSandbox.js';
import {createTour,createTourStop} from '../app/services/tourModel.js';
test('access pages have explicit routes and leave legacy experience links alone',()=>{
    for(const route of ['creator','demos','account','admin'])assert.equal(requestedPortalRoute({pathname:'/xr/'+route+'/',search:''}),route);
    assert.equal(requestedPortalRoute({pathname:'/xr/',search:''}),'home');assert.equal(requestedPortalRoute({pathname:'/xr/',search:'?creator=1'}),'creator');
    for(const search of ['?editor=pimo','?experience=webxr-demo','?chapters=1','?workspace=desktop&project=garden'])assert.equal(requestedPortalRoute({pathname:'/xr/',search}),'');
});
test('Discovery Path practice uses shared validation, isolated storage and conflicts without server writes',async()=>{
    const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},request=createSandboxTourRequest(storage),model=discoverySandboxModel();
    assert.equal((await request(model.project.id)).entries.length,0);const tour=createTour(model.project.id,model.sites[0].id);tour.stops.push(createTourStop({siteId:tour.siteId,areaId:'garden',recordId:'ginger'}));
    const saved=await request(model.project.id,{id:tour.id,body:{tour,expectedVersion:0}});assert.equal(saved.version,1);assert.equal((await request(model.project.id)).entries[0].draft.stops.length,1);
    await assert.rejects(request(model.project.id,{id:tour.id,body:{tour,expectedVersion:0}}),/another tab/);await assert.rejects(request(model.project.id,{id:tour.id,action:'publish',body:{}}),/cannot be published/);
    await assert.rejects(request('real-project',{id:tour.id,body:{tour,expectedVersion:1}}),/identity changed/);
});
