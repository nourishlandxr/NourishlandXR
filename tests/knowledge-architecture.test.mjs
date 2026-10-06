import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';
import {createKnowledgeArchitectureGeometry,architectureRegionAmount} from '../app/services/knowledgeArchitectureGeometry.js';
import {ensureKnowledgeObjects,selectKnowledgeObjectFace,setKnowledgeArchitectureGeometry,knowledgeObjectAction,localObjectMatrix,knowledgePoseMatrix} from '../app/services/knowledgeObjectModel.js';
import {hitKnowledgeObject} from '../app/services/knowledgeObjectRenderer.js';
import {knowledgeExplorer,restoreKnowledgeDiscovery} from '../app/services/knowledgeExplorer.js';

const pose={position:{x:.4,y:1.3,z:-.6},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
function fixture(){const record={demoType:'plant',name:'Pigeon Pea',demoExpandedNodeIds:[]};knowledgeExplorer(record);ensureKnowledgeObjects(record,knowledge);return record;}
function select(record,id){const object=ensureKnowledgeObjects(record,knowledge).items[0],face=object.faces.find(face=>face?.conceptId===id);assert.ok(face,id+' must be visible');assert.equal(selectKnowledgeObjectFace(record,knowledge,{id,knowledgeFaceId:face.faceId}),true);}
function geometryFor(record){const object=ensureKnowledgeObjects(record,knowledge).items[0],geometry=createKnowledgeArchitectureGeometry(object.seedRadius,object.regions,Infinity,true);setKnowledgeArchitectureGeometry(object,geometry);ensureKnowledgeObjects(record,knowledge);return geometry;}

test('unchanged frames reuse face records while an edited region accent invalidates them',()=>{
    const record=fixture(),workspace=ensureKnowledgeObjects(record,knowledge),object=workspace.items[0],faces=object.faces;
    for(let frame=0;frame<100;frame++)assert.equal(ensureKnowledgeObjects(record,knowledge).items[0].faces,faces);
    object.regions[0].accent='#abcdef';ensureKnowledgeObjects(record,knowledge);
    assert.notEqual(object.faces,faces);assert.equal(object.faces[0].accent,'#abcdef');
});

test('a seed opens into a six-direction star with finite shared geometry and contained atlas coordinates',()=>{
    const seed=createKnowledgeArchitectureGeometry(.16),star=createKnowledgeArchitectureGeometry(.16,Array.from({length:6},()=>({opened:true,level:3})),Infinity,true);
    for(const geometry of [seed,star]){
        assert.ok([...geometry.attributes.position.array,...geometry.attributes.normal.array,...geometry.attributes.uv.array].every(Number.isFinite));
        assert.ok([...geometry.attributes.uv.array].every(value=>value>=0 && value<=1));
        assert.equal(geometry.userData.knowledgeRegions.length,geometry.attributes.position.count/3);
        assert.ok(geometry.attributes.position.count<2000,'one low polygon mesh');
    }
    assert.ok(star.boundingSphere.radius>seed.boundingSphere.radius*2);
    for(let slot=0;slot<6;slot++){
        const frame=star.userData.knowledgeFrames[slot],angle=Math.PI/2-slot*Math.PI/3;
        assert.ok(frame.centre.x*Math.cos(angle)+frame.centre.y*Math.sin(angle)>.25);
        assert.ok(star.userData.knowledgeFrames[6+slot*3]);
    }
    seed.dispose();star.dispose();
});
test('learning develops one fixed wing from activation to cluster to hub, preserving identity and bounded bays',()=>{
    const record=fixture(),before=JSON.stringify(knowledge);select(record,'uses');
    let workspace=ensureKnowledgeObjects(record,knowledge),region=workspace.regions.find(region=>region.rootId==='uses');assert.equal(region.level,1);
    select(record,'culinary');select(record,'fresh-peas');assert.equal(region.level,2);
    knowledgeObjectAction(record,'KnowledgeObjectBack');
    assert.equal(region.focusId,'culinary','Back from a leaf retains its parent branch');
    knowledgeObjectAction(record,'KnowledgeObjectFaces');select(record,'young-pods');
    knowledgeObjectAction(record,'KnowledgeObjectBack');select(record,'dried-pulse');assert.equal(region.level,3);
    workspace=ensureKnowledgeObjects(record,knowledge);assert.equal(workspace.items.length,1);assert.equal(workspace.regions.length,6);
    assert.ok(workspace.items[0].faces.filter(Boolean).length<=9);
    assert.ok(workspace.items[0].faces.filter(face=>face?.domainId==='uses').every(face=>face.accent===region.accent));
    assert.equal(JSON.stringify(knowledge),before);assert.equal(region.visited.length,5);
    const events=workspace.growthEvents.length;select(record,'uses');assert.equal(workspace.growthEvents.length,events,'revisiting does not manufacture growth');
});
test('ray targets follow the actual opened geometry after rotation and scale',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const object=ensureKnowledgeObjects(record,knowledge).items[0];
    object.rotation={x:0,y:Math.sin(.18),z:0,w:Math.cos(.18)};object.scale=1.2;record.knowledgeExplorer.objects.scale=1.2;
    const geometry=geometryFor(record),matrix=knowledgePoseMatrix(pose).multiply(localObjectMatrix(object));
    for(const slot of [24,21,22]){
        const frame=geometry.userData.knowledgeFrames[slot],centre=frame.centre.clone().applyMatrix4(matrix),normal=frame.normal.clone().transformDirection(matrix);
        const hit=hitKnowledgeObject({origin:centre.clone().addScaledVector(normal,.025),direction:normal.clone().negate()},record,knowledge,pose,geometry);
        assert.ok(hit,'region '+slot+' is reachable');
        assert.equal(hit.node.pimKnowledgeContext,slot===24?true:undefined);
        if(slot!==24)assert.equal(hit.face.conceptId,object.faces[slot].conceptId);
    }
    geometry.dispose();
});
test('folding preserves discoveries and saved architecture restores without stale session animation clocks',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const workspace=record.knowledgeExplorer.objects,region=workspace.regions.find(region=>region.rootId==='uses');
    const visited=[...region.visited];knowledgeObjectAction(record,'KnowledgeObjectCollapse');assert.equal(region.opened,false);assert.deepEqual(region.visited,visited);
    const restored=fixture();restoreKnowledgeDiscovery(restored,{objects:JSON.parse(JSON.stringify(workspace)),pages:{},positions:{},history:[],mode:'curiosity'});
    const next=ensureKnowledgeObjects(restored,knowledge);assert.equal(next.version,2);assert.deepEqual(next.regions.find(region=>region.rootId==='uses').visited,visited);assert.equal(next.regions.find(region=>region.rootId==='uses').transition,undefined);
});
test('reduced motion immediately settles the same architectural state',()=>{
    const region={opened:true,level:3,transition:{from:0,startedAt:1000}};
    assert.equal(architectureRegionAmount(region,1000),0);assert.equal(architectureRegionAmount(region,1360),1.5);assert.equal(architectureRegionAmount(region,1000,true),3);
    const early=createKnowledgeArchitectureGeometry(.16,[region],1000,true),late=createKnowledgeArchitectureGeometry(.16,[region],5000,true);
    assert.deepEqual(early.attributes.position.array,late.attributes.position.array);early.dispose();late.dispose();
});
