import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../app/vendor/three.module.min.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';
import {PIGEON_PEA_PIM} from '../app/services/pigeonPeaPim.js';
import {pimVisibleNodes} from '../app/services/plantInformationMesh.js';
import {pimInfoContent} from '../app/services/pimInfoPanel.js';
import {knowledgeExplorer,knowledgeExplorerAction,restoreKnowledgeDiscovery} from '../app/services/knowledgeExplorer.js';
import {setPimoDeveloperOverride} from '../app/services/pimoSpatialCapabilities.js';
import {ensureExplorerMolecule,explorerMoleculeIndex,selectExplorerNode,explorerMoleculeAction,explorerMoleculeView,explorerDetailDocument,explorerMoleculeSnapshot,restoreExplorerMolecule,explorerPuzzleSlot,explorerPuzzleFit,alignExplorerPuzzle,commitExplorerPuzzle,prepareExplorerConnection,chooseExplorerWing,createExplorerWing,removeExplorerWing,customizeExplorerOrganism,explorerNodePosition,EXPLORER_RECIPES,EXPLORER_RECIPE,EXPLORER_LIMIT,EXPLORER_BOND_RADIUS} from '../app/services/explorerMoleculeModel.js';
import {hitExplorerMolecule,hitExplorerConnector,createExplorerMoleculeGeometry} from '../app/services/explorerMoleculeRenderer.js';
import {bindExplorerMoleculeInteraction} from '../app/services/explorerMoleculeInteraction.js';
import {knowledgePoseMatrix,localObjectMatrix} from '../app/services/knowledgeObjectModel.js';

function fixture(assembled=true){
    const record={id:'molecule-test',demoType:'plant',name:'Pigeon Pea',demoSelectedNodeId:'uses.culinary',demoExpandedNodeIds:['uses']};
    knowledgeExplorer(record);record.knowledgeExplorer.mode='explore';ensureExplorerMolecule(record,knowledge);
    if(assembled){for(const wing of knowledge.categories){assert.ok(chooseExplorerWing(record,knowledge,wing.id));connectPrepared(record);}record.explorerMolecule.selectedId='core';record.explorerMolecule.discovered=[];}
    return record;
}
const select=(record,id,time=100)=>selectExplorerNode(record,knowledge,{explorerNodeId:id},time);
const view=(record,distance=1,time=10000)=>explorerMoleculeView(record,knowledge,distance,time,true);
const pose={position:{x:.4,y:1.3,z:-.6},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
function connectPrepared(record,time=200){
    assert.ok(alignExplorerPuzzle(record,knowledge));assert.ok(commitExplorerPuzzle(record,knowledge,time));
    assert.ok(alignExplorerPuzzle(record,knowledge));assert.ok(commitExplorerPuzzle(record,knowledge,time+1));
}

test('rendered molecular bodies are closed solids with volume on every axis',()=>{
    const solids=createExplorerMoleculeGeometry();
    function volume(g){
        const mesh=g.toNonIndexed(),p=mesh.attributes.position;let sum=0;
        for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);sum+=a.dot(b.cross(c))/6;}
        mesh.dispose();return Math.abs(sum);
    }
    try{
        for(const solid of Object.values(solids)){solid.computeBoundingBox();const size=solid.boundingBox.getSize(new THREE.Vector3());assert.ok(Math.min(size.x,size.y,size.z)>=1);}
        assert.ok(volume(solids.node)>3.8);assert.ok(volume(solids.bond)>2.7);
    }finally{Object.values(solids).forEach(g=>g.dispose());}
});

test('each local expansion occupies a volume rather than a tilted flat fan',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');
    const state=record.explorerMolecule,index=explorerMoleculeIndex(knowledge);
    for(const id of ['uses','culinary']){
        const parent=new THREE.Vector3(...Object.values(state.positions[id]));
        const ports=index.nodes.get(id).children.slice(0,3).map(child=>new THREE.Vector3(...Object.values(state.positions[child])).sub(parent));
        assert.ok(Math.abs(ports[0].dot(ports[1].clone().cross(ports[2])))>.005,`${id} must have independent depth`);
    }
});

test('Explorer begins with one core and a wing library; no structure is preselected',()=>{
    const record=fixture(false),field=view(record);
    assert.deepEqual(field.nodes.map(n=>n.id),['core']);assert.equal(field.bonds.length,0);
    assert.deepEqual(record.explorerMolecule.wings,[]);assert.deepEqual(Object.keys(record.explorerMolecule.positions),['core']);
    assert.ok(field.index.roots.includes('uses'));assert.ok(field.index.roots.includes('historical-data'));assert.ok(field.index.roots.includes('explorer-wildlife'));
    assert.equal(select(record,'uses'),false);assert.equal(explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeBuild'),false);
});

test('local exploration preserves every existing position, source data and Curiosity state',()=>{
    const record=fixture(),state=record.knowledgeExplorer;state.pages={'children:uses':1};state.positions={curiosity:{x:3,y:2}};state.history=['uses'];state.readingPage=2;state.selectedConceptId='culinary';
    const source=JSON.stringify(PIGEON_PEA_PIM),projection=JSON.stringify(knowledge),before=JSON.stringify({selected:record.demoSelectedNodeId,expanded:record.demoExpandedNodeIds,pages:state.pages,positions:state.positions,history:state.history,page:state.readingPage,concept:state.selectedConceptId});
    const initial=structuredClone(record.explorerMolecule.positions);select(record,'uses');const uses=structuredClone(record.explorerMolecule.positions);select(record,'culinary');select(record,'fresh-peas');
    for(const [id,p] of Object.entries(initial))assert.deepEqual(record.explorerMolecule.positions[id],p);
    for(const [id,p] of Object.entries(uses))assert.deepEqual(record.explorerMolecule.positions[id],p);
    assert.equal(JSON.stringify(PIGEON_PEA_PIM),source);assert.equal(JSON.stringify(knowledge),projection);
    assert.equal(JSON.stringify({selected:record.demoSelectedNodeId,expanded:record.demoExpandedNodeIds,pages:state.pages,positions:state.positions,history:state.history,page:state.readingPage,concept:state.selectedConceptId}),before);
});

test('mode round-trip preserves the exact Curiosity layout after molecule growth',()=>{
    globalThis.location={hostname:'localhost',pathname:'/tools/preview-explorer-molecule.html'};setPimoDeveloperOverride(true);
    try{
        const record=fixture();record.knowledgeExplorer.mode='curiosity';const state=record.knowledgeExplorer,options={explorer:state,selectedNodeId:record.demoSelectedNodeId,includeAllChildren:true};
        const baseline=pimVisibleNodes(knowledge,record.demoExpandedNodeIds,options).map(n=>[n.id,n.path,n.layoutGrid,n.fixedPosition]);
        knowledgeExplorerAction(record,'KnowledgeMode:explore');select(record,'uses');select(record,'culinary');select(record,EXPLORER_RECIPES);explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe');connectPrepared(record);knowledgeExplorerAction(record,'KnowledgeMode:curiosity');
        assert.deepEqual(pimVisibleNodes(knowledge,record.demoExpandedNodeIds,options).map(n=>[n.id,n.path,n.layoutGrid,n.fixedPosition]),baseline);
        assert.equal(record.explorerMolecule.contributionAdded,true);
    }finally{setPimoDeveloperOverride(false);}
});

test('recipe attaches once to Recipes, animates from the sample position and reads as a draft',()=>{
    const record=fixture();assert.equal(explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe'),false);
    select(record,'uses');select(record,'culinary');select(record,EXPLORER_RECIPES);
    assert.ok(!view(record).nodes.some(n=>n.id===EXPLORER_RECIPE));
    explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe');
    assert.equal(selectExplorerNode(record,knowledge,{explorerAttachment:true},190),false);
    alignExplorerPuzzle(record,knowledge);assert.equal(commitExplorerPuzzle(record,knowledge,191),true);
    assert.equal(record.explorerMolecule.contributionAdded,false);
    alignExplorerPuzzle(record,knowledge);record.explorerMolecule.pending.position.x+=.03;const origin={...record.explorerMolecule.pending.position};
    assert.equal(selectExplorerNode(record,knowledge,{explorerAttachment:true},200),true);
    assert.equal(selectExplorerNode(record,knowledge,{explorerAttachment:true},201),false);
    const early=explorerMoleculeView(record,knowledge,1,200,false),late=view(record,1,1000);
    assert.deepEqual(early.nodes.find(n=>n.id===EXPLORER_RECIPE).position,origin);
    assert.equal(late.bonds.filter(b=>b.to===EXPLORER_RECIPE).length,1);assert.equal(late.bonds.find(b=>b.to===EXPLORER_RECIPE).from,EXPLORER_RECIPES);
    const detail=explorerDetailDocument(PIGEON_PEA_PIM,record),content=pimInfoContent(detail,EXPLORER_RECIPE);
    assert.equal(content.editable,false);assert.equal(content.status,'draft');assert.match(content.body,/not been submitted or published/);assert.match(content.breadcrumb,/Uses.*Culinary.*Recipes/);
    assert.ok(!PIGEON_PEA_PIM.nodes.some(n=>n.id===EXPLORER_RECIPE));
});

test('Food promotion represents density without adding 32 balls or moving relationships',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const before=view(record),positions=structuredClone(record.explorerMolecule.positions);
    assert.equal(explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeHub'),true);const after=view(record);
    assert.equal(after.nodes.length,before.nodes.length);assert.deepEqual(after.bonds,before.bonds);assert.deepEqual(record.explorerMolecule.positions,positions);
    assert.equal(after.nodes.find(n=>n.id==='culinary').count,32);assert.ok(after.nodes.find(n=>n.id==='culinary').radius>before.nodes.find(n=>n.id==='culinary').radius);
    const distant=view(record,3.5);assert.ok(distant.nodes.some(n=>n.id==='culinary'&&n.count===32));assert.ok(!distant.nodes.some(n=>n.id==='fresh-peas'));assert.equal(distant.nodes.length,8);
});

test('distance aggregation uses hysteresis and restores the same explored positions',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const close=view(record),positions=structuredClone(record.explorerMolecule.positions),expanded=[...record.explorerMolecule.expanded];
    assert.ok(close.nodes.length>7);assert.equal(view(record,3.1).nodes.length,7);assert.equal(view(record,2.7).lod,'far');assert.equal(view(record,2.4).lod,'medium');assert.equal(view(record,1.7).lod,'medium');
    assert.deepEqual(view(record,1.5).nodes.map(n=>[n.id,n.position]),close.nodes.map(n=>[n.id,n.position]));assert.deepEqual(record.explorerMolecule.expanded,expanded);assert.deepEqual(record.explorerMolecule.positions,positions);
});

test('large datasets keep detailed geometry bounded and do not drop authored children',()=>{
    const many={title:'Plant',categories:[{id:'uses',label:'Uses',path:'uses',children:Array.from({length:60},(_,i)=>({id:'n'+i,path:'uses.n'+i,label:'Topic '+i,children:[]}))}]};
    const record={knowledgeExplorer:{mode:'explore',revision:0}};ensureExplorerMolecule(record,many);chooseExplorerWing(record,many,'uses');alignExplorerPuzzle(record,many);commitExplorerPuzzle(record,many);alignExplorerPuzzle(record,many);commitExplorerPuzzle(record,many);selectExplorerNode(record,many,{id:'uses'});const seen=new Set();
    for(let page=0;page<20;page++){const field=explorerMoleculeView(record,many,1,10000,true);assert.ok(field.nodes.length<=EXPLORER_LIMIT);field.nodes.filter(n=>n.id.startsWith('n')).forEach(n=>seen.add(n.id));explorerMoleculeAction(record,many,'KnowledgeMoleculeMore');}
    assert.equal(seen.size,60);
});

test('saved Explorer state restores topology and discoveries without session animation clocks',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');select(record,EXPLORER_RECIPES);explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe');connectPrepared(record);
    const snapshot=explorerMoleculeSnapshot(record),next=fixture();assert.equal(snapshot.births,undefined);assert.equal(snapshot.pending,null);assert.equal(restoreExplorerMolecule(next,snapshot),true);
    assert.deepEqual(view(next).nodes.map(n=>[n.id,n.position]),view(record).nodes.map(n=>[n.id,n.position]));
    const saved={mode:'curiosity',pages:{},positions:{},expandedNodeIds:['uses'],activeNodeId:'uses',explorerMolecule:snapshot};restoreKnowledgeDiscovery(next,saved);assert.equal(next.explorerMolecule.contributionAdded,true);assert.equal(next.demoSelectedNodeId,'uses');
});

test('ray selection matches node positions after root rotation, translation and scale',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const state=record.explorerMolecule;state.root.position={x:.2,y:.1,z:.1};state.root.scale=1.2;state.root.rotation={x:0,y:Math.sin(.35),z:0,w:Math.cos(.35)};
    const field=view(record),matrix=knowledgePoseMatrix(pose).multiply(localObjectMatrix(state.root)),nodes=field.nodes.map(n=>({...n,world:new THREE.Vector3(n.position.x,n.position.y,n.position.z).applyMatrix4(matrix),worldRadius:n.radius*state.root.scale}));
    const entry={record,knowledge,...field,nodes,surfaces:[],pose};const node=nodes.find(n=>n.id==='fresh-peas'),normal=new THREE.Vector3(0,0,1).transformDirection(matrix);
    const hit=hitExplorerMolecule({origin:node.world.clone().addScaledVector(normal,node.worldRadius+.02),direction:normal.clone().negate()},[entry]);assert.equal(hit.node.explorerNodeId,'fresh-peas');
    record.knowledgeExplorer.mode='curiosity';assert.equal(hitExplorerMolecule({origin:node.world,direction:normal},[entry]),null);
});

test('Explorer hold activates once, cancels off-node and consumes trailing XR selects',()=>{
    const original=globalThis.performance;let time=0;globalThis.performance={now:()=>time};
    try{
        class Session extends EventTarget{inputSources=[];visibilityState='visible';}
        const record=fixture(),s=new Session(),source={targetRayMode:'tracked-pointer',targetRaySpace:{},gripSpace:{}};s.inputSources=[source];let activation=0,current='uses';
        const target=()=>({record,knowledge,object:record.explorerMolecule.root,pose,face:{faceId:current},node:{explorerNodeId:current}}),input=bindExplorerMoleculeInteraction(s,{}, {hit:target,near:()=>null,onActivate:()=>activation++}),frame={getPose:()=>({transform:{matrix:new THREE.Matrix4().elements}})};
        const event=type=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'inputSource',{value:source});s.dispatchEvent(e);};
        input.update(frame);event('selectstart');time=300;input.update(frame);current='cultivation';time=600;input.update(frame);event('selectend');event('select');assert.equal(activation,0);
        time=1000;event('selectstart');time=1499;input.update(frame);assert.equal(activation,0);time=1500;input.update(frame);assert.equal(activation,1);time=1700;input.update(frame);event('selectend');event('select');assert.equal(activation,1);input.destroy();
    }finally{globalThis.performance=original;}
});

test('connector and topic require two intentional XR grabs and releases',()=>{
    class Session extends EventTarget{inputSources=[];visibilityState='visible';}
    const record=fixture();select(record,'uses');select(record,'culinary');select(record,EXPLORER_RECIPES);explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe');
    const s=new Session(),source={targetRayMode:'tracked-pointer',targetRaySpace:{},gripSpace:{}};s.inputSources=[source];const state=record.explorerMolecule;
    const basis={position:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}},slot=explorerPuzzleSlot(record,knowledge);let matrix=localObjectMatrix(state.pendingConnector).elements;
    const hit=()=>({record,knowledge,object:state.pendingConnector || state.pending,pose:basis,face:{faceId:'loose-piece'},node:{pending:true}}),input=bindExplorerMoleculeInteraction(s,{}, {hit,near:()=>null,onActivate:target=>selectExplorerNode(record,knowledge,target.node)}),frame={getPose:()=>({transform:{matrix}})};
    const event=type=>{const e=new Event(type,{cancelable:true});Object.defineProperty(e,'inputSource',{value:source});s.dispatchEvent(e);};
    input.update(frame);event('selectstart');assert.ok(input.active);matrix=new THREE.Matrix4().compose(new THREE.Vector3(slot.position.x,slot.position.y,slot.position.z),slot.rotation,new THREE.Vector3(1,1,1)).elements;input.update(frame);event('selectend');assert.equal(state.puzzle.phase,'piece');assert.equal(state.contributionAdded,false);
    matrix=localObjectMatrix(state.pending).elements;input.update(frame);event('selectstart');matrix=new THREE.Matrix4().makeTranslation(slot.childPosition.x,slot.childPosition.y,slot.childPosition.z).elements;input.update(frame);event('selectend');assert.equal(state.contributionAdded,true);assert.equal(state.pending,null);assert.equal(view(record).bonds.filter(b=>b.to===EXPLORER_RECIPE).length,1);input.destroy();

    const cancelled=fixture();select(cancelled,'uses');select(cancelled,'culinary');select(cancelled,EXPLORER_RECIPES);explorerMoleculeAction(cancelled,knowledge,'KnowledgeMoleculeRecipe');const next=cancelled.explorerMolecule;alignExplorerPuzzle(cancelled,knowledge);matrix=localObjectMatrix(next.pendingConnector).elements;
    const cancelInput=bindExplorerMoleculeInteraction(s,{}, {hit:()=>({record:cancelled,knowledge,object:next.pendingConnector,pose:basis,face:{faceId:'loose-connector'},node:{pending:true}}),near:()=>null});cancelInput.update(frame);event('squeezestart');cancelled.knowledgeExplorer.mode='curiosity';cancelInput.update(frame);assert.equal(next.contributionAdded,false);assert.equal(next.puzzle.phase,'connector');assert.ok(next.pendingConnector);cancelInput.destroy();
});

test('puzzle rejects wrong position, orientation and semantic ends before either lock',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');select(record,EXPLORER_RECIPES);explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeRecipe');
    const state=record.explorerMolecule,slot=explorerPuzzleSlot(record,knowledge);
    assert.equal(commitExplorerPuzzle(record,knowledge),false);assert.equal(state.contributionAdded,false);
    alignExplorerPuzzle(record,knowledge);const perpendicular=slot.rotation.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));state.pendingConnector.rotation={x:perpendicular.x,y:perpendicular.y,z:perpendicular.z,w:perpendicular.w};assert.equal(explorerPuzzleFit(record,knowledge).valid,false);assert.equal(commitExplorerPuzzle(record,knowledge),false);
    alignExplorerPuzzle(record,knowledge);state.pendingConnector.childId='fresh-peas';assert.equal(commitExplorerPuzzle(record,knowledge),false);state.pendingConnector.childId=EXPLORER_RECIPE;
    assert.equal(commitExplorerPuzzle(record,knowledge),true);assert.equal(state.puzzle.phase,'piece');assert.equal(commitExplorerPuzzle(record,knowledge),false);assert.equal(state.contributionAdded,false);
    alignExplorerPuzzle(record,knowledge);assert.equal(commitExplorerPuzzle(record,knowledge),true);assert.ok(state.assembled.includes(EXPLORER_RECIPES+'>'+EXPLORER_RECIPE));
});

test('topic connections use the same construction puzzle and preserve surrounding positions',()=>{
    const record=fixture();select(record,'uses');select(record,'culinary');const before=structuredClone(record.explorerMolecule.positions);
    assert.ok(prepareExplorerConnection(record,knowledge,'culinary','fresh-peas'));
    assert.ok(!view(record).nodes.some(n=>n.id==='fresh-peas'));assert.ok(view(record).nodes.some(n=>n.connector&&n.pending));
    assert.equal(prepareExplorerConnection(record,knowledge,'cultivation','fresh-peas'),false);connectPrepared(record);
    assert.ok(view(record).bonds.some(b=>b.from==='culinary'&&b.to==='fresh-peas'));assert.equal(record.explorerMolecule.contributionAdded,false);assert.deepEqual(record.explorerMolecule.positions,before);
});

test('root domain connections can be assembled and only completed assemblies restore',()=>{
    const record=fixture(false);
    assert.ok(chooseExplorerWing(record,knowledge,'uses'));const child=record.explorerMolecule.puzzle.childId,initial=structuredClone(record.explorerMolecule.positions);
    const unfinished=explorerMoleculeSnapshot(record);assert.equal(unfinished.puzzle,null);assert.equal(unfinished.pendingConnector,null);assert.deepEqual(unfinished.assembled,[]);
    connectPrepared(record);assert.ok(record.explorerMolecule.assembled.includes('core>'+child));assert.deepEqual(record.explorerMolecule.positions,initial);
    const next=fixture();restoreExplorerMolecule(next,explorerMoleculeSnapshot(record));assert.deepEqual(next.explorerMolecule.assembled,record.explorerMolecule.assembled);assert.equal(next.explorerMolecule.puzzle,null);
});

test('cylindrical pieces can be selected along their sides and capped ends',()=>{
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.6),node={world:new THREE.Vector3(.2,.3,-.4),worldRotation:q,worldRadius:EXPLORER_BOND_RADIUS,worldLength:.35},axis=new THREE.Vector3(0,1,0).applyQuaternion(q),normal=new THREE.Vector3(1,0,0).applyQuaternion(q);
    const origin=node.world.clone().addScaledVector(axis,.12).addScaledVector(normal,.1),point=hitExplorerConnector({origin,direction:normal.clone().negate()},node);assert.ok(point);assert.ok(Math.abs(point.distanceTo(origin)-(.1-EXPLORER_BOND_RADIUS))<1e-6);
    assert.ok(hitExplorerConnector({origin:node.world.clone().addScaledVector(axis,.3),direction:axis.clone().negate()},node));
    assert.equal(hitExplorerConnector({origin:node.world.clone().addScaledVector(axis,.3).addScaledVector(normal,.1),direction:normal.clone().negate()},node),null);
});

test('ranger chooses only Wildlife and Historical Facts through two-stage assemblies',()=>{
    const record=fixture(false),source=JSON.stringify(knowledge),curiosity=JSON.stringify(record.demoExpandedNodeIds);
    for(const id of ['explorer-wildlife','historical-data']){
        assert.ok(chooseExplorerWing(record,knowledge,id));assert.ok(!view(record).nodes.some(n=>n.id===id));
        assert.equal(commitExplorerPuzzle(record,knowledge),false);alignExplorerPuzzle(record,knowledge);commitExplorerPuzzle(record,knowledge);
        assert.ok(!view(record).nodes.some(n=>n.id===id));alignExplorerPuzzle(record,knowledge);commitExplorerPuzzle(record,knowledge);
    }
    const field=view(record);assert.deepEqual(field.nodes.filter(n=>n.depth===1).map(n=>n.id),['explorer-wildlife','historical-data']);
    assert.ok(!field.nodes.some(n=>n.domainId==='uses'||n.domainId==='food-forest'));
    select(record,'explorer-wildlife');const index=explorerMoleculeIndex(knowledge,record);assert.ok(index.nodes.get('explorer-wildlife').children.every(id=>index.nodes.get(id).sourceId));
    const topic=index.nodes.get('explorer-wildlife').children[0];select(record,topic);const original=PIGEON_PEA_PIM.nodes.find(n=>n.id===index.nodes.get(topic).sourceId);
    assert.equal(pimInfoContent(explorerDetailDocument(PIGEON_PEA_PIM,record),index.nodes.get(topic).path).body,original.body);
    assert.equal(JSON.stringify(knowledge),source);assert.equal(JSON.stringify(record.demoExpandedNodeIds),curiosity);
});

test('custom wing groups existing records, supports personal style and survives save/resume',()=>{
    const record=fixture(false),source=JSON.stringify(PIGEON_PEA_PIM);
    assert.equal(createExplorerWing(record,knowledge,{label:'Empty',sourceIds:[]}),false);
    const id=createExplorerWing(record,knowledge,{label:'Rainforest heritage',sourceIds:['attributed-traditional-knowledge','leaf-identification','basket-materials'],colour:'#78aa98'});
    assert.ok(id);assert.ok(customizeExplorerOrganism(record,knowledge,{name:'Rainforest stories',purpose:'Traditional knowledge and organism parts'}));
    chooseExplorerWing(record,knowledge,id);connectPrepared(record);select(record,id);
    const action='KnowledgeMoleculeWingStyle:'+encodeURIComponent(JSON.stringify({label:'Ancient uses',colour:'#ba946b',scale:1.25}));assert.ok(explorerMoleculeAction(record,knowledge,action));
    const index=explorerMoleculeIndex(knowledge,record);assert.equal(index.title,'Rainforest stories');assert.equal(index.nodes.get(id).label,'Ancient uses');assert.equal(index.nodes.get(id).children.length,3);
    const field=view(record);assert.equal(field.nodes.find(n=>n.id===id).colour,'#ba946b');
    assert.equal(pimInfoContent(explorerDetailDocument(PIGEON_PEA_PIM,record),id).editable,false);
    const next=fixture(false);restoreExplorerMolecule(next,explorerMoleculeSnapshot(record));
    assert.deepEqual(view(next).nodes.map(n=>[n.id,n.position,n.colour,n.radius]),field.nodes.map(n=>[n.id,n.position,n.colour,n.radius]));assert.equal(next.explorerMolecule.purpose,record.explorerMolecule.purpose);
    assert.equal(JSON.stringify(PIGEON_PEA_PIM),source);
});

test('moving and rotating one wing carries its descendants and sockets, preserving other wings',()=>{
    const record=fixture(false);for(const id of ['explorer-wildlife','historical-data']){chooseExplorerWing(record,knowledge,id);connectPrepared(record);}
    select(record,'explorer-wildlife');const state=record.explorerMolecule,index=explorerMoleculeIndex(knowledge,record),child=index.nodes.get('explorer-wildlife').children[0],origin={...state.positions[child]},other=view(record).nodes.find(n=>n.id==='historical-data').position;
    const wing=state.wingObjects['explorer-wildlife'];wing.position={x:.5,y:.2,z:.15};wing.rotation={x:0,y:Math.sin(.4),z:0,w:Math.cos(.4)};wing.scale=1.2;
    const transformed=explorerNodePosition(state,index,child);assert.notDeepEqual(transformed,origin);assert.deepEqual(view(record).nodes.find(n=>n.id==='historical-data').position,other);
    assert.ok(prepareExplorerConnection(record,knowledge,'explorer-wildlife',child));assert.deepEqual(explorerPuzzleSlot(record,knowledge).childPosition,transformed);connectPrepared(record);
    assert.deepEqual(view(record).nodes.find(n=>n.id===child).position,transformed);assert.deepEqual(state.positions[child],origin);
    assert.ok(removeExplorerWing(record,knowledge,'explorer-wildlife'));assert.deepEqual(view(record).nodes.map(n=>n.id),['core','historical-data']);assert.ok(explorerMoleculeIndex(knowledge,record).roots.includes('explorer-wildlife'));
});

test('cancelled and unfinished wings stay out of resumed organisms; old presets migrate only deliberate assemblies',()=>{
    const record=fixture(false);chooseExplorerWing(record,knowledge,'uses');const saved=explorerMoleculeSnapshot(record);assert.deepEqual(saved.wings,[]);
    assert.ok(explorerMoleculeAction(record,knowledge,'KnowledgeMoleculeCancel'));assert.deepEqual(view(record).nodes.map(n=>n.id),['core']);
    const old=fixture();delete old.explorerMolecule.wings;delete old.explorerMolecule.wingObjects;old.explorerMolecule.assembled=['core>historical-data'];
    assert.deepEqual(view(old).nodes.map(n=>n.id),['core','historical-data']);
});

test('custom topic selection preserves one semantic parent when a branch and its descendant are both chosen',()=>{
    const record=fixture(false),id=createExplorerWing(record,knowledge,{label:'Seed records',sourceIds:['seed','direct-sowing','seed']});
    assert.deepEqual(record.explorerMolecule.customWings[0].sourceIds,['seed']);const index=explorerMoleculeIndex(knowledge,record);
    assert.equal(index.nodes.get(id).children.length,1);assert.equal(index.nodes.get(id+':direct-sowing').parentId,id+':seed');
});

test('XR grips move only the chosen wing and cancel safely when the wing is removed',()=>{
    class Session extends EventTarget{inputSources=[];visibilityState='visible';}
    const record=fixture(false);chooseExplorerWing(record,knowledge,'explorer-wildlife');connectPrepared(record);
    const state=record.explorerMolecule,wing=state.wingObjects['explorer-wildlife'],root=structuredClone(state.root),s=new Session(),source={targetRaySpace:{},gripSpace:{}};s.inputSources=[source];
    const basis={position:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
    let matrix=new THREE.Matrix4(),activations=0;
    const input=bindExplorerMoleculeInteraction(s,{}, {hit:()=>({record,knowledge,object:wing,pose:basis,node:{explorerNodeId:'explorer-wildlife'},face:{faceId:'explorer-wildlife'}}),near:()=>null,onActivate:()=>activations++});
    const frame={getPose:()=>({transform:{matrix:matrix.elements}})},event=type=>{const e=new Event(type);Object.defineProperty(e,'inputSource',{value:source});s.dispatchEvent(e);};
    input.update(frame);event('squeezestart');assert.equal(input.active.target.object,wing);
    const previous={...wing.position};matrix.makeTranslation(.2,.1,-.08);input.update(frame);assert.ok(Math.abs(wing.position.x-previous.x-.2)<1e-6);assert.deepEqual(state.root,root);assert.equal(activations,0);
    removeExplorerWing(record,knowledge,'explorer-wildlife');input.update(frame);assert.equal(input.active,null);event('squeezeend');assert.equal(activations,0);input.destroy();
});
