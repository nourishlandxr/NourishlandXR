import test from 'node:test';
import assert from 'node:assert/strict';
import {createTour,createTourStop,validateTour,checkTour,recordsForTour,visitorTour} from '../app/services/tourModel.js';
import {siteFeature,featureMatches,validateSiteFeature} from '../app/services/siteFeature.js';
import {handleProjectTours} from '../tools/projectTours.mjs';

const ref={siteId:'s',areaId:'a',recordId:'ginger'};
const tour=()=>{const value=createTour('garden','s');value.stops=[createTourStop(ref)];value.stops[0].directions='Start at the ginger bed.';return value;};
test('site features preserve unknown classifications and combine uses with alternative layers',()=>{
    const marker={type:'plant',site_feature:{kind:'clump',uses:['edible'],layers:['4','6'],source:'Garden record'}};
    assert.equal(siteFeature(marker).kind,'clump');assert.equal(featureMatches(marker,{use:'edible',layers:['1','4']}),true);
    assert.equal(featureMatches(marker,{use:'medicinal',layers:['4']}),false);assert.equal(featureMatches({type:'plant'},{use:'edible'}),false);
    assert.deepEqual(siteFeature({type:'plant'}).uses,[]);assert.throws(()=>validateSiteFeature({...marker.site_feature,layers:['9']}));
});
test('two tours reference one site record and resolve its current name without copying it',()=>{
    const model={entries:[{siteId:'s',place:{id:'a',name:'Bed'},marker:{id:'ginger',type:'plant',name:'Old label'}}]};
    const a=tour(),b=tour();model.entries[0].marker.name='Ginger clump';
    assert.equal(recordsForTour(model)[0].title,'Ginger clump');assert.equal(checkTour(a,recordsForTour(model)).length,0);assert.equal(checkTour(b,recordsForTour(model)).length,0);
    assert.equal(a.stops[0].targets[0].recordId,'ginger');assert.equal(a.stops[0].title,'');
});
test('Areas and paths can be tour stops without fabricating plant records or losing scoped identity',()=>{
    const model={entries:[],areas:[{siteId:'s',id:'a',name:'Orchard',type:'Orchard Block'},{siteId:'s',id:'path',name:'Main path',type:'Path or Route'}]};
    const records=recordsForTour(model);assert.equal(records[0].type,'area');assert.equal(records[1].type,'path');
    const value=tour();value.stops[0].targets=[records[0].ref];assert.equal(checkTour(value,records).length,0);assert.equal(model.entries.length,0);
});
test('tour checks catch missing, moved and archived targets, comparison pairs and incomplete directions',()=>{
    const value=tour();assert.match(checkTour(value,[])[0].message,/missing/);
    value.stops[0].template='compare';assert.ok(checkTour(value,[{ref}]).some(issue=>/two/.test(issue.message)));
    value.stops[0].template='investigate';value.stops[0].directions='';assert.ok(checkTour(value,[{ref,archived:true}]).length>=3);
    assert.equal(checkTour({...value,stops:[]},[]).length,1);
});
test('portable tour data rejects duplicate stops, cross-site references, unknown fields and unsafe audio',()=>{
    const value=tour();assert.equal(validateTour(value),value);
    const copy=()=>structuredClone(value);
    let broken=copy();broken.stops.push(broken.stops[0]);assert.throws(()=>validateTour(broken),/duplicate/);
    broken=copy();broken.stops[0].targets[0].siteId='other';assert.throws(()=>validateTour(broken),/Site/);
    broken=copy();broken.stops[0].audioUrl='javascript:alert(1)';assert.throws(()=>validateTour(broken),/HTTPS/);
    broken=copy();broken.privateMetadata='secret';assert.throws(()=>validateTour(broken),/fields/);
    value.stops[0].facilitatorNotes='PRIVATE EDUCATOR NOTE';assert.doesNotMatch(JSON.stringify(visitorTour(value)),/PRIVATE|facilitatorNotes/);
});

test('tour persistence isolates drafts, detects conflicts, resolves marker versus specimen IDs and retracts unavailable content',()=>{
    const files=new Map(),project='/projects/garden',snapshot={sites:[{id:'s'}],areas:[{id:'a',siteId:'s',name:'Bed'}],records:[{siteId:'s',areaId:'a',recordId:'instance-ginger',markerId:'ginger',kind:'plant',title:'Ginger clump',description:'Current public content'}]};
    files.set(project+'/project.json',{id:'garden'});let identity={platformAdmin:true};let publicSnapshot=snapshot;
    function request(method,suffix='',body=null,visitor=false){let response;const context={visitor,access:{identity:()=>identity},getProjectPath:()=>project,publicSnapshot:()=>publicSnapshot,
        readJson:(file,fallback)=>structuredClone(files.get(file.replaceAll('\\','/'))??fallback),writeJson:(file,value)=>files.set(file.replaceAll('\\','/'),structuredClone(value)),
        readRequestJson:(_req,callback)=>callback(null,body),sendJson:(_res,status,payload)=>{response={status,payload};}};
        assert.equal(handleProjectTours({method},{},'/api/projects/garden/tours'+suffix,context),true);return response;
    }
    const draft=tour();draft.stops[0].facilitatorNotes='PRIVATE';let saved=request('PUT','/'+draft.id,{expectedVersion:0,tour:draft});assert.equal(saved.status,200);
    assert.equal(request('GET','',null,true).payload.tours.length,0);assert.equal(request('GET','/'+draft.id,null,true).status,404);
    assert.equal(request('PUT','/'+draft.id,{expectedVersion:0,tour:draft}).status,409);
    assert.equal(request('POST','/'+draft.id+'/publish',{expectedVersion:1}).status,200);
    let published=request('GET','/'+draft.id,null,true);assert.equal(published.payload.records[0].ref.recordId,'ginger');assert.equal(published.payload.records[0].specimenId,'instance-ginger');assert.doesNotMatch(JSON.stringify(published),/PRIVATE|facilitatorNotes/);
    draft.title='Unpublished changes';request('PUT','/'+draft.id,{expectedVersion:2,tour:draft});assert.equal(request('GET','/'+draft.id,null,true).payload.tour.title,'New tour');
    snapshot.records[0].title='Renamed ginger';assert.equal(request('GET','/'+draft.id,null,true).payload.records[0].title,'Renamed ginger');
    publicSnapshot={...snapshot,records:[]};assert.equal(request('GET','/'+draft.id,null,true).status,404);
    publicSnapshot=snapshot;identity={projects:{garden:'student'}};assert.equal(request('POST','/'+draft.id+'/publish',{expectedVersion:3}).status,403);
    identity=null;assert.equal(request('GET').status,401);identity={platformAdmin:true};assert.equal(request('POST','/'+draft.id+'/unpublish',{expectedVersion:3}).status,200);assert.equal(request('GET','',null,true).payload.tours.length,0);
});
