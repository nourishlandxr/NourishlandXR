import * as THREE from '../vendor/three.module.min.js';
import {PIM_COMPASS_BY_ID} from './pimCompass.js';

// Explorer owns presentation state. Canonical documents and Curiosity state
// are read-only inputs; sample content is never saved into a plant profile.
export const EXPLORER_LIMIT=24, EXPLORER_CHILDREN=3, EXPLORER_TRANSITION_MS=650;
export const EXPLORER_RECIPES='explorer-recipes', EXPLORER_RECIPE='explorer-community-recipe';
export const EXPLORER_BOND_RADIUS=.014;
export const EXPLORER_CONNECTOR_COLOUR='#e6eef2';
const indexes=new WeakMap();
const projections=new WeakMap();
const directions=['top','upper-right','lower-right','bottom','lower-left','upper-left'];
// Explorer has its own spatial ports, independent of Curiosity's compass.
const domainPorts=[{x:.04,y:.46,z:-.12},{x:.43,y:.12,z:.20},{x:.22,y:-.18,z:-.40},{x:-.06,y:-.46,z:.14},{x:-.40,y:-.14,z:-.22},{x:-.24,y:.16,z:.40}];
const colours=['#739b76','#7894ac','#a58baf','#bd9065','#6b9e9b','#b58c59'];
const v=p=>new THREE.Vector3(p.x,p.y,p.z), point=p=>({x:p.x,y:p.y,z:p.z});
const now=()=>globalThis.performance?.now?.() || 0;
function sourceIndex(knowledge){
    if(indexes.has(knowledge))return indexes.get(knowledge);
    const nodes=new Map(),roots=[];
    function visit(source,parent=null,domain=null){
        if(!source?.id || nodes.has(source.id))return;
        const node={...source,parentId:parent?.id || 'core',domainId:domain || source.id,depth:parent?parent.depth+1:1,children:[]};
        nodes.set(node.id,node);(source.children || []).forEach(child=>{visit(child,node,node.domainId);if(nodes.has(child.id))node.children.push(child.id);});
        return node;
    }
    for(const source of knowledge.categories || []){const node=visit(source);if(node)roots.push(node.id);}
    for(const source of knowledge.customCategories || []){const node=visit(source);if(node)roots.push(node.id);}
    const pigeon=/pigeon[ -]?pea/i.test(knowledge.title || knowledge.identity?.commonName || knowledge.plantId || '');
    if(pigeon && nodes.has('culinary')){
        const uses=nodes.get('uses');if(uses)uses.children=[...['culinary','medicinal','craft'].filter(id=>uses.children.includes(id)),...uses.children.filter(id=>!['culinary','medicinal','craft'].includes(id))];
        const food=nodes.get('culinary');food.label='Food';
        const recipes={id:EXPLORER_RECIPES,path:food.path+'.'+EXPLORER_RECIPES,label:'Recipes',parentId:food.id,domainId:food.domainId,depth:food.depth+1,children:[EXPLORER_RECIPE],sample:true,value:'Example recipe collection for testing Explorer. Fit a connector into the Recipes socket, then connect a sample recipe to its free end. This does not publish knowledge.'};
        const recipe={id:EXPLORER_RECIPE,path:recipes.path+'.'+EXPLORER_RECIPE,label:'Community Recipe',parentId:recipes.id,domainId:food.domainId,depth:recipes.depth+1,children:[],sample:true,contribution:true,value:'Sample contribution for interaction testing. A real recipe would retain the contributor, preparation method, harvest stage and source. This example has not been submitted or published.'};
        nodes.set(recipes.id,recipes);nodes.set(recipe.id,recipe);
        food.children=[recipes.id,...food.children.filter(id=>id==='fresh-peas' || id==='dried-pulse'),...food.children.filter(id=>id!=='fresh-peas' && id!=='dried-pulse')];
    }
    const rootSlots=new Map();roots.forEach((id,i)=>{const n=nodes.get(id),slot=directions.indexOf(n.direction || PIM_COMPASS_BY_ID[id]?.direction);rootSlots.set(id,slot<0?i%6:slot);});
    const index={nodes,roots,rootSlots,pigeon,title:knowledge.identity?.commonName || knowledge.title || 'Plant'};
    nodes.set('core',{id:'core',label:index.title,parentId:null,domainId:'core',depth:0,children:roots,path:''});indexes.set(knowledge,index);return index;
}
// Wings are personal groupings of sourced knowledge, not edits to the source.
// A projection may put the same topic in two wings; reading keeps its source path.
export function explorerMoleculeIndex(knowledge,record=null){
    const base=sourceIndex(knowledge),state=record?.explorerMolecule;
    const cached=state&&projections.get(state);if(cached?.knowledge===knowledge&&cached.revision===state.revision)return cached.index;
    const nodes=new Map([...base.nodes].map(([id,n])=>[id,{...n,children:[...n.children]}])),roots=[...base.roots],rootSlots=new Map(base.rootSlots);
    const copy=(sourceId,parent,wing,prefix)=>{
        const source=base.nodes.get(sourceId);if(!source || source.sample)return null;
        const id=prefix+sourceId,node={...source,id,parentId:parent.id,domainId:wing.id,depth:parent.depth+1,sourceId:source.sourceId || source.id,children:[]};
        nodes.set(id,node);for(const child of source.children){const copied=copy(child,node,wing,prefix);if(copied)node.children.push(copied.id);}return node;
    };
    const addWing=wing=>{
        const node={id:wing.id,label:wing.label,path:wing.id,parentId:'core',domainId:wing.id,depth:1,children:[],virtualWing:true,colour:wing.colour,informationType:'category',value:wing.description || 'A personal wing of existing knowledge. Open a topic to read its original record and attribution.'};
        nodes.set(node.id,node);roots.push(node.id);rootSlots.set(node.id,roots.length%colours.length);
        for(const sourceId of wing.sourceIds || []){const child=copy(sourceId,node,node,wing.id+':');if(child)node.children.push(child.id);}
    };
    const wildlife=['pollinator-resource','habitat-structure'].filter(id=>base.nodes.has(id));
    if(wildlife.length)addWing({id:'explorer-wildlife',label:'Wildlife',sourceIds:wildlife,colour:'#79ab91',description:'Wildlife focus: recorded flower visitors and habitat structure. These topics retain their original evidence and attribution.'});
    if(nodes.has('historical-data'))nodes.get('historical-data').label='Historical Facts';
    for(const wing of state?.customWings || [])addWing(wing);
    for(const [id,label] of Object.entries(state?.labels || {})){if(nodes.has(id))nodes.get(id).label=label;}
    for(const [id,colour] of Object.entries(state?.colours || {})){if(nodes.has(id))nodes.get(id).colour=colour;}
    const title=state?.name || base.title,index={...base,nodes,roots,rootSlots,title};
    nodes.set('core',{...nodes.get('core'),label:title,children:roots});
    if(state)projections.set(state,{knowledge,revision:state.revision,index});return index;
}
export function ensureExplorerMolecule(record,knowledge){
    const index=explorerMoleculeIndex(knowledge,record);
    if(record.explorerMolecule?.version!==1){
        record.explorerMolecule={version:1,subjectId:knowledge.plantId || record.marker?.plantId || record.demoPlantPreset || record.id,expanded:[],discovered:[],positions:{core:{x:0,y:0,z:0}},births:{},pages:{},selectedId:'core',promoted:[],sampleCounts:{},contributionAdded:false,root:{id:'explorer:root',position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:.52},interaction:'rotate',revision:0};
    }
    const state=record.explorerMolecule;state.assembled ||= [];state.root.scale=Math.max(.65,Math.min(1.35,Number(state.root.scale)||1));
    // Old prototypes drew all six domains. Only deliberate completed root
    // assemblies migrate into a personal organism.
    state.wings ||= index.roots.filter(id=>state.assembled.includes('core>'+id));
    state.customWings ||= [];state.labels ||= {};state.colours ||= {};state.wingObjects ||= {};state.libraryPage ||= 0;
    for(const id of state.wings){if(!state.positions[id])continue;state.wingObjects[id] ||= {id:'explorer:wing:'+id,position:{...state.positions[id]},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:.078};}
    state.nodeObjects ||= {};
    for(const [id,position] of Object.entries(state.positions)){
        const node=index.nodes.get(id);if(!node || node.depth<2)continue;
        state.nodeObjects[id] ||= {id:'explorer:node:'+id,position:{...position},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:explorerNodeRadius(node,state)};
    }
    return state;
}
export function explorerAttachedWings(state,index){return state.wings.filter(id=>index.nodes.has(id)&&state.assembled.includes('core>'+id));}
export function initializeExplorerPreview(record,knowledge,time=now()){
    const state=ensureExplorerMolecule(record,knowledge);
    if(state.readerPreview || state.wings.length || state.puzzle)return state;
    state.readerPreview=true;
    // A mode-only reader starts with three useful branches. Personal organisms
    // and specialised creator assembly remain untouched.
    const index=explorerMoleculeIndex(knowledge,record);
    for(const [i,id] of index.roots.slice(0,3).entries()){
        state.wings.push(id);state.assembled.push('core>'+id);state.positions[id]={...domainPorts[i*2]};state.births[id]=time;
        state.wingObjects[id]={id:'explorer:wing:'+id,position:{...state.positions[id]},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:.078};
    }
    touch(record,time);return state;
}
export function explorerNodePosition(state,index,id){
    const p=state.positions[id];if(!p)return p;
    const node=index.nodes.get(id);if(node?.depth>1)return point(v(state.nodeObjects?.[id]?.position || p).applyMatrix4(explorerChildFrame(state,index,id)));
    return state.wingObjects[node?.domainId]?.position || p;
}
// Moving a child carries its connected subtree, not unrelated branches.
export function explorerChildFrame(state,index,id){
    const node=index.nodes.get(id),wing=state.wingObjects[node?.domainId],origin=state.positions[node?.domainId],matrix=new THREE.Matrix4();
    if(!wing || !origin)return matrix;
    matrix.compose(v(wing.position),new THREE.Quaternion(wing.rotation.x,wing.rotation.y,wing.rotation.z,wing.rotation.w),new THREE.Vector3().setScalar(wing.scale)).multiply(new THREE.Matrix4().makeTranslation(-origin.x,-origin.y,-origin.z));
    const offset=new THREE.Vector3();
    for(let parent=index.nodes.get(node.parentId);parent?.depth>1;parent=index.nodes.get(parent.parentId)){
        const object=state.nodeObjects?.[parent.id],start=state.positions[parent.id];if(object && start)offset.add(v(object.position).sub(v(start)));
    }
    return matrix.multiply(new THREE.Matrix4().makeTranslation(offset.x,offset.y,offset.z));
}
export function explorerOutputs(node,index,state){
    const page=state?.pages?.[node.id] || 0,children=childIds(index,node,state || {contributionAdded:true}).slice(page*EXPLORER_CHILDREN,page*EXPLORER_CHILDREN+EXPLORER_CHILDREN).map(id=>({id,label:index.nodes.get(id)?.label || 'Topic'}));
    return [...children,{id:node.id,label:'Read'},{id:node.parentId || 'core',label:'Parent'}].slice(0,4);
}
function explorerTone(colour,depth){
    if(depth<=1)return colour;
    const base=new THREE.Color(colour),hsl=base.getHSL({h:0,s:0,l:0}),step=Math.floor((depth-2)/2);
    hsl.l=depth%2?Math.max(.12,hsl.l*(.68-step*.14)):Math.min(.9,hsl.l+(1-hsl.l)*(.30+step*.13));
    return base.setHSL(hsl.h,hsl.s,hsl.l).getStyle();
}
function nodeScale(state,node){return state.wingObjects[node.domainId]?.scale || 1;}
export function customizeExplorerOrganism(record,knowledge,values){
    if(record.knowledgeExplorer?.mode!=='explore')return false;const state=ensureExplorerMolecule(record,knowledge);
    if(typeof values.name==='string')state.name=values.name.trim().slice(0,80);
    if(typeof values.purpose==='string')state.purpose=values.purpose.trim().slice(0,280);
    touch(record);return true;
}
export function createExplorerWing(record,knowledge,values){
    if(record.knowledgeExplorer?.mode!=='explore')return false;
    const state=ensureExplorerMolecule(record,knowledge),base=sourceIndex(knowledge),label=String(values.label || '').trim().slice(0,72),sourceIds=[...new Set(Array.isArray(values.sourceIds)?values.sourceIds:[])].filter(id=>base.nodes.has(id)&&id!=='core'&&!base.nodes.get(id).sample).slice(0,12);
    if(!label || !sourceIds.length || state.customWings.length>=12)return false;
    const references=sourceIds.filter(id=>{for(let parent=base.nodes.get(id)?.parentId;parent&&parent!=='core';parent=base.nodes.get(parent)?.parentId)if(sourceIds.includes(parent))return false;return true;});
    let number=1;while(state.customWings.some(w=>w.id==='explorer-custom-'+number))number++;
    const id='explorer-custom-'+number,colour=/^#[\da-f]{6}$/i.test(values.colour)?values.colour:'#8ca7b4';
    state.customWings.push({id,label,sourceIds:references,colour});state.libraryOpen=true;state.libraryPage=Math.floor((explorerMoleculeIndex(knowledge,record).roots.length)/3);touch(record);return id;
}
export function chooseExplorerWing(record,knowledge,id,time=now()){
    const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record);
    if(record.knowledgeExplorer?.mode!=='explore' || state.puzzle || !index.roots.includes(id) || state.assembled.includes('core>'+id) || explorerAttachedWings(state,index).length>=12)return false;
    if(!state.wings.includes(id))state.wings.push(id);
    if(!state.positions[id]){
        const used=state.wings.filter(key=>key!==id).map(key=>state.positions[key]).filter(Boolean);
        let position;for(let port=0;port<24;port++){const ring=Math.floor(port/6),candidate=v(domainPorts[port%6]).multiplyScalar(1+ring*.65);if(!used.some(p=>candidate.distanceTo(v(p))<.2)){position=point(candidate);break;}}
        state.positions[id]=position || {...domainPorts[0]};
    }
    state.wingObjects[id] ||= {id:'explorer:wing:'+id,position:{...state.positions[id]},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:.078};
    state.libraryOpen=false;return prepareExplorerConnection(record,knowledge,'core',id,time);
}
export function removeExplorerWing(record,knowledge,id){
    if(record.knowledgeExplorer?.mode!=='explore')return false;const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record);
    if(state.puzzle || !state.wings.includes(id))return false;
    const ids=new Set([...index.nodes.values()].filter(n=>n.domainId===id).map(n=>n.id));
    state.wings=state.wings.filter(key=>key!==id);state.expanded=state.expanded.filter(key=>!ids.has(key));state.discovered=state.discovered.filter(key=>!ids.has(key));state.promoted=state.promoted.filter(key=>!ids.has(key));state.assembled=state.assembled.filter(key=>!key.split('>').some(part=>ids.has(part)));
    for(const key of ids){delete state.positions[key];delete state.nodeObjects?.[key];delete state.births[key];delete state.pages[key];delete state.sampleCounts[key];}delete state.wingObjects[id];
    if(ids.has(state.selectedId))state.selectedId='core';if(ids.has(EXPLORER_RECIPE))state.contributionAdded=false;touch(record);return true;
}
export function explorerNodeCount(index,id,state){
    if(state.sampleCounts[id])return state.sampleCounts[id];
    const n=index.nodes.get(id);if(!n)return 0;
    return n.children.reduce((sum,key)=>sum+(key===EXPLORER_RECIPE&&!state.contributionAdded?0:1+explorerNodeCount(index,key,state)),0);
}
export function explorerNodeRadius(node,state){
    if(node.id==='core')return .10;
    return (node.depth===1?.078:node.contribution?.045:node.informationType==='category'||node.sample&&!node.contribution?.063:.052)*(state.promoted.includes(node.id)?1.35:1);
}
function childIds(index,node,state){return node.children.filter(id=>id!==EXPLORER_RECIPE || state.contributionAdded);}
function reserveChildren(index,node,state,time,available=childIds(index,node,state)){
    const ids=available,page=state.pages[node.id] || 0;
    const root=state.positions[node.domainId],out=new THREE.Vector3(root?.x || .38,root?.y || 0,0).normalize(),tangent=new THREE.Vector3(-out.y,out.x,0),parent=v(state.positions[node.id]);
    ids.slice(page*EXPLORER_CHILDREN,page*EXPLORER_CHILDREN+EXPLORER_CHILDREN).forEach((id,slot)=>{
        if(state.positions[id])return;
        const child=index.nodes.get(id),side=[0,1,-1][slot];
        for(let attempt=0;attempt<12;attempt++){
            // The centre port projects forward/backward independently of the
            // lateral pair, so each developing group has volume of its own.
            const portDepth=side===0?(node.depth%2?.20:-.20):side*.18;
            const candidate=parent.clone().addScaledVector(out,.27+Math.floor(attempt/3)*.10).addScaledVector(tangent,side*.20+(attempt%3-1)*.05).add(new THREE.Vector3(0,0,portDepth));
            if(Object.entries(state.positions).some(([key,p])=>{
                // Deliberate pages reuse attachment directions. Their entries
                // cannot be visible together, so they need not consume new
                // permanent geometry or force the existing region outward.
                if(index.nodes.get(key)?.parentId===node.id && Math.floor(ids.indexOf(key)/EXPLORER_CHILDREN)!==page)return false;
                return candidate.distanceTo(v(p))<explorerNodeRadius(child,state)+(key==='core'?.10:explorerNodeRadius(index.nodes.get(key) || {id:key,depth:2,children:[]},state))+.045;
            }))continue;
            state.positions[id]=point(candidate);state.births[id]=time;break;
        }
    });
}
export function selectExplorerNode(record,knowledge,target,time=now()){
    const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record);let id=target.explorerNodeId || target.id || target.nodeId || 'core';
    if(target.explorerOutput){const source=index.nodes.get(id);if(!source)return false;if(source.children.includes(target.explorerOutput)){if(!state.expanded.includes(id))state.expanded.push(id);reserveChildren(index,source,state,time);}id=target.explorerOutput;}
    // A completed grab already selected/discovered its semantic endpoint.
    // The host callback refreshes reading surfaces without expanding it again.
    if(target.explorerAssembly)return true;
    if(target.explorerAttachment){return commitExplorerPuzzle(record,knowledge,time);}
    if(id==='core'){state.selectedId='core';touch(record,time);return true;}
    const node=index.nodes.get(id);if(!node || !state.positions[id] || !explorerAttachedWings(state,index).includes(node.domainId) || id===EXPLORER_RECIPE&&!state.contributionAdded)return false;
    state.selectedId=id;if(!state.discovered.includes(id))state.discovered.push(id);
    if(node.children.length && !state.expanded.includes(id)){state.expanded.push(id);reserveChildren(index,node,state,time);}
    if(!node.sample && explorerNodeCount(index,id,state)>=12 && node.depth>1 && !state.promoted.includes(id))state.promoted.push(id);
    touch(record,time);return true;
}
function touch(record,time=now()){record.explorerMolecule.revision++;if(record.knowledgeExplorer){record.knowledgeExplorer.saved=false;record.knowledgeExplorer.changedAt=time;record.knowledgeExplorer.revision++;}}
export function explorerPuzzleSlot(record,knowledge){
    const state=record.explorerMolecule,puzzle=state?.puzzle,index=explorerMoleculeIndex(knowledge,record);if(!puzzle)return null;
    const parent=index.nodes.get(puzzle.parentId),child=index.nodes.get(puzzle.childId);if(!parent?.children.includes(child?.id))return null;
    const a=explorerNodePosition(state,index,parent.id),b=explorerNodePosition(state,index,child.id);if(!a || !b)return null;
    const direction=v(b).sub(v(a)).normalize(),from=v(a).addScaledVector(direction,explorerNodeRadius(parent,state)*nodeScale(state,parent)),to=v(b).addScaledVector(direction,-explorerNodeRadius(child,state)*nodeScale(state,child));
    return {from:point(from),to:point(to),position:point(from.clone().lerp(to,.5)),childPosition:{...b},rotation:new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction),length:from.distanceTo(to)};
}
export function prepareExplorerConnection(record,knowledge,parentId,childId,time=now()){
    if(record.knowledgeExplorer?.mode!=='explore')return false;
    const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record),parent=index.nodes.get(parentId),child=index.nodes.get(childId);
    if(parentId==='core'&&!state.wings.includes(childId))return chooseExplorerWing(record,knowledge,childId,time);
    if(parentId!=='core'&&!explorerAttachedWings(state,index).includes(parent?.domainId))return false;
    if(state.puzzle || !parent?.children.includes(childId) || !state.positions[parentId] || childId===EXPLORER_RECIPE&&state.contributionAdded)return false;
    if(!state.positions[childId])reserveChildren(index,parent,{...state,pages:{...state.pages,[parentId]:0}},time,[childId]);if(!state.positions[childId])return false;
    if(!state.expanded.includes(parentId))state.expanded.push(parentId);
    state.puzzle={parentId,childId,phase:'connector'};
    const slot=explorerPuzzleSlot(record,knowledge);
    state.pendingConnector={id:'explorer:connector',parentId,childId,position:{x:-.16,y:-.08,z:.40},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:EXPLORER_BOND_RADIUS,length:slot.length};
    state.pending={id:'explorer:piece',parentId,childId,position:{x:.16,y:-.08,z:.40},rotation:{x:0,y:0,z:0,w:1},scale:1,radius:explorerNodeRadius(child,state)*nodeScale(state,child)};
    state.selectedId=parentId;touch(record,time);return true;
}
export function explorerPuzzleFit(record,knowledge){
    const state=record.explorerMolecule,puzzle=state?.puzzle,slot=explorerPuzzleSlot(record,knowledge),object=puzzle?.phase==='connector'?state.pendingConnector:state?.pending;
    if(record.knowledgeExplorer?.mode!=='explore' || !slot || !object || object.parentId!==puzzle.parentId || object.childId!==puzzle.childId)return {valid:false,distance:Infinity,angle:Math.PI};
    const distance=v(object.position).distanceTo(v(puzzle.phase==='connector'?slot.position:slot.childPosition));
    const axis=new THREE.Vector3(0,1,0).applyQuaternion(new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w));
    const direction=new THREE.Vector3(0,1,0).applyQuaternion(slot.rotation),angle=puzzle.phase==='connector'?Math.acos(Math.min(1,Math.abs(axis.dot(direction)))):0;
    return {valid:distance<.075 && angle<Math.PI/9,distance,angle};
}
export function alignExplorerPuzzle(record,knowledge,time=now()){
    const state=record.explorerMolecule,slot=explorerPuzzleSlot(record,knowledge);if(record.knowledgeExplorer?.mode!=='explore' || !slot)return false;
    const connector=state.puzzle.phase==='connector',object=connector?state.pendingConnector:state.pending;if(!object)return false;
    object.position={...(connector?slot.position:slot.childPosition)};if(connector)object.rotation={x:slot.rotation.x,y:slot.rotation.y,z:slot.rotation.z,w:slot.rotation.w};touch(record,time);return true;
}
export function magnetExplorerPuzzle(record,knowledge,object){
    const state=record.explorerMolecule,puzzle=state?.puzzle,slot=explorerPuzzleSlot(record,knowledge);if(record.knowledgeExplorer?.mode!=='explore' || !slot || object!==(puzzle.phase==='connector'?state.pendingConnector:state.pending))return false;
    const fit=explorerPuzzleFit(record,knowledge);if(fit.distance>.18 || fit.angle>Math.PI/3)return false;
    const amount=(1-fit.distance/.18)*.6;object.position=point(v(object.position).lerp(v(puzzle.phase==='connector'?slot.position:slot.childPosition),amount));
    if(puzzle.phase==='connector'){const q=new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w);const desired=slot.rotation.clone();if(new THREE.Vector3(0,1,0).applyQuaternion(q).dot(new THREE.Vector3(0,1,0).applyQuaternion(desired))<0)desired.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI));q.slerp(desired,amount);object.rotation={x:q.x,y:q.y,z:q.z,w:q.w};}return true;
}
export function commitExplorerPuzzle(record,knowledge,time=now()){
    const state=record.explorerMolecule;if(!explorerPuzzleFit(record,knowledge).valid)return false;
    if(state.puzzle.phase==='connector'){state.puzzle.phase='piece';state.pendingConnector=null;touch(record,time);return true;}
    const {parentId,childId}=state.puzzle,origin={...state.pending.position};
    if(childId===EXPLORER_RECIPE){state.contributionAdded=true;state.attachmentOrigin=origin;}
    const key=parentId+'>'+childId;if(!state.assembled.includes(key))state.assembled.push(key);
    state.pending=null;state.pendingConnector=null;state.puzzle=null;state.births[childId]=time;state.selectedId=childId;if(!state.discovered.includes(childId))state.discovered.push(childId);touch(record,time);return true;
}
export function attachExplorerRecipe(record,knowledge,time=now()){
    if(record.explorerMolecule?.puzzle?.childId!==EXPLORER_RECIPE || record.explorerMolecule.puzzle.phase!=='piece')return false;
    return commitExplorerPuzzle(record,knowledge,time);
}
export function explorerMoleculeAction(record,knowledge,action,time=now()){
    if(record.knowledgeExplorer?.mode!=='explore')return false;
    const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record),node=index.nodes.get(state.selectedId);
    if(action.startsWith('KnowledgeMoleculeWing:'))return chooseExplorerWing(record,knowledge,action.slice('KnowledgeMoleculeWing:'.length),time);
    if(action==='KnowledgeMoleculeLibrary'){state.libraryPage=((state.libraryPage || 0)+1)%Math.max(1,Math.ceil(index.roots.length/3));touch(record,time);return true;}
    if(action==='KnowledgeMoleculeRemove')return removeExplorerWing(record,knowledge,node?.domainId);
    if(action.startsWith('KnowledgeMoleculePersonalize:')){try{return customizeExplorerOrganism(record,knowledge,JSON.parse(decodeURIComponent(action.slice('KnowledgeMoleculePersonalize:'.length))));}catch{return false;}}
    if(action.startsWith('KnowledgeMoleculeCustom:')){try{return Boolean(createExplorerWing(record,knowledge,JSON.parse(decodeURIComponent(action.slice('KnowledgeMoleculeCustom:'.length)))));}catch{return false;}}
    if(action==='KnowledgeMoleculeLibraryToggle'){state.libraryOpen=!(state.libraryOpen ?? !state.wings.length);touch(record,time);return true;}
    if(action.startsWith('KnowledgeMoleculeWingStyle:')){
        try{const values=JSON.parse(decodeURIComponent(action.slice('KnowledgeMoleculeWingStyle:'.length))),id=node?.domainId;if(!state.wings.includes(id))return false;
            if(typeof values.label==='string'&&values.label.trim())state.labels[id]=values.label.trim().slice(0,72);if(/^#[\da-f]{6}$/i.test(values.colour))state.colours[id]=values.colour;
            if(Number.isFinite(values.scale))state.wingObjects[id].scale=Math.max(.65,Math.min(1.6,values.scale));touch(record,time);return true;
        }catch{return false;}
    }
    if(action==='KnowledgeMoleculeWingSize'){const wing=state.wingObjects[node?.domainId];if(!wing)return false;wing.scale=wing.scale>=1.5?.75:Math.round((wing.scale+.25)*100)/100;touch(record,time);return true;}
    if(action==='KnowledgeMoleculeRecipe'){
        if(!index.nodes.has(EXPLORER_RECIPES) || !state.positions[EXPLORER_RECIPES] || state.contributionAdded)return false;
        return prepareExplorerConnection(record,knowledge,EXPLORER_RECIPES,EXPLORER_RECIPE,time);
    }else if(action==='KnowledgeMoleculeBuild'){
        if(!node || node.id==='core')return false;const page=state.pages[node.id] || 0,child=childIds(index,node,state).slice(page*EXPLORER_CHILDREN,page*EXPLORER_CHILDREN+EXPLORER_CHILDREN).find(id=>!state.assembled.includes(node.id+'>'+id));return child?prepareExplorerConnection(record,knowledge,node.id,child,time):false;
    }else if(action==='KnowledgeMoleculeAlign')return alignExplorerPuzzle(record,knowledge,time);
    else if(action==='KnowledgeMoleculeAttach')return commitExplorerPuzzle(record,knowledge,time);
    else if(action==='KnowledgeMoleculeCancel'){if(!state.puzzle)return false;const {parentId,childId}=state.puzzle;state.puzzle=null;state.pending=null;state.pendingConnector=null;if(parentId==='core'){state.wings=state.wings.filter(id=>id!==childId);delete state.positions[childId];delete state.wingObjects[childId];}}
    else if(action==='KnowledgeMoleculeHub'){
        if(!index.pigeon || !state.positions.culinary)return false;state.sampleCounts.culinary=32;if(!state.promoted.includes('culinary'))state.promoted.push('culinary');
    }else if(action==='KnowledgeMoleculeCollapse'){
        if(!node?.children.length || node.id==='core')return false;
        if(state.expanded.includes(node.id))state.expanded=state.expanded.filter(id=>id!==node.id);
        else{state.expanded.push(node.id);reserveChildren(index,node,state,time);}
    }else if(action==='KnowledgeMoleculeMore'){
        if(!node || node.id==='core')return false;state.pages[node.id]=((state.pages[node.id] || 0)+1)%Math.max(1,Math.ceil(childIds(index,node,state).length/EXPLORER_CHILDREN));reserveChildren(index,node,state,time);
    }else if(action==='KnowledgeMoleculeBack'){
        if(!node || node.id==='core')return false;state.selectedId=node.parentId;
    }else if(action==='KnowledgeMoleculeMove')state.interaction=state.interaction==='move'?'rotate':'move';
    else if(action.startsWith('KnowledgeMoleculeSize:'))state.root.scale=Math.max(.65,Math.min(1.35,Number(action.split(':')[1]) || 1));
    else return false;
    touch(record,time);return true;
}
export function explorerMoleculeView(record,knowledge,distance,time=now(),reducedMotion=false){
    const state=ensureExplorerMolecule(record,knowledge),index=explorerMoleculeIndex(knowledge,record),wings=explorerAttachedWings(state,index);
    // Hysteresis prevents headset translation near a boundary from flickering.
    const previous=state.lod || 'close';
    state.lod=distance>(previous==='far'?2.5:2.9)?'far':distance>(previous==='close'?1.9:1.65)?'medium':'close';
    const hubPaths=new Set();for(const id of state.promoted){for(let node=index.nodes.get(id);node;node=index.nodes.get(node.parentId))hubPaths.add(node.id);}
    const nodes=[{id:'core',label:index.title,depth:0,children:wings,domainId:'core',position:state.positions.core,radius:.10,colour:'#a8b79a',progress:1}],bonds=[];
    const visit=(id,parentId,expand=true)=>{
        if(nodes.length>=EXPLORER_LIMIT-(state.puzzle?3:0) || !state.positions[id] || id===state.puzzle?.childId)return;
        const source=index.nodes.get(id);if(!source || state.lod==='far'&&source.depth>1&&!hubPaths.has(id) || state.lod==='medium'&&source.depth>2&&!hubPaths.has(id))return;
        const birth=state.births[id],progress=reducedMotion || !Number.isFinite(birth)?1:Math.min(1,Math.max(0,(time-birth)/EXPLORER_TRANSITION_MS)),ease=progress*progress*(3-2*progress);
        const parent=explorerNodePosition(state,index,parentId),from=id===EXPLORER_RECIPE?state.attachmentOrigin || parent:parent,p=point(v(from).lerp(v(explorerNodePosition(state,index,id)),ease));
        const baseColour=index.nodes.get(source.domainId)?.colour || colours[index.roots.indexOf(source.domainId)%colours.length];
        const node={...source,outputs:explorerOutputs(source,index,state),position:p,radius:explorerNodeRadius(source,state)*nodeScale(state,source)*(.2+.8*ease),colour:explorerTone(baseColour,source.depth),count:explorerNodeCount(index,id,state),progress:ease};nodes.push(node);bonds.push({id:parentId+'>'+id,from:parentId,to:id,type:source.contribution?'contribution':'contains',progress:ease});
        if(expand && state.expanded.includes(id)){const children=childIds(index,source,state),page=state.pages[id] || 0;for(const child of children.slice(page*EXPLORER_CHILDREN,page*EXPLORER_CHILDREN+EXPLORER_CHILDREN))visit(child,id);}
    };
    // Only wings assembled by this user spend the detail budget.
    wings.forEach(id=>visit(id,'core',false));
    const activeDomain=index.nodes.get(state.selectedId)?.domainId;
    const domains=[...wings].sort((a,b)=>Number(b===activeDomain)-Number(a===activeDomain));
    for(const id of domains){const root=index.nodes.get(id);if(!state.expanded.includes(id))continue;const page=state.pages[id] || 0;for(const child of childIds(index,root,state).slice(page*EXPLORER_CHILDREN,page*EXPLORER_CHILDREN+EXPLORER_CHILDREN))visit(child,id);}
    if(state.puzzle && state.lod==='close' && nodes.some(n=>n.id===state.puzzle.parentId)){
        const puzzle=state.puzzle,slot=explorerPuzzleSlot(record,knowledge),source=index.nodes.get(puzzle.childId),colour=colours[index.rootSlots.get(source.domainId) ?? 0],connector=puzzle.phase==='connector';
        const body=connector?state.pendingConnector:{position:slot.position,rotation:slot.rotation,length:slot.length};
        nodes.push({...source,id:'pending-connector',label:'Connector',position:body.position,rotation:body.rotation,length:slot.length,radius:EXPLORER_BOND_RADIUS,colour:EXPLORER_CONNECTOR_COLOUR,connector:true,pending:connector,progress:1});
        if(!connector)nodes.push({...source,id:'pending-piece',label:source.label,position:state.pending.position,radius:state.pending.radius,colour,pending:true,progress:1});
        nodes.push({id:'connection-socket',label:connector?'Connector socket':'Topic socket',depth:4,children:[],position:connector?slot.from:slot.to,rotation:slot.rotation,radius:.022,colour:'#d5d8ae',attachment:true,progress:1});
    }
    state.root.radius=Math.max(.52,...nodes.filter(n=>!n.pending).map(n=>v(n.position).length()+n.radius));
    return {nodes,bonds,lod:state.lod,state,index};
}
export function explorerDetailDocument(document,record){
    document=document?.explorerSourceDocument || document;
    if(record?.knowledgeExplorer?.mode!=='explore' || !document?.nodes)return document;
    const virtual=[];
    const wildlife=['pollinator-resource','habitat-structure'].filter(id=>document.nodes.some(n=>n.id===id));
    const wings=[...(wildlife.length?[{id:'explorer-wildlife',label:'Wildlife',sourceIds:wildlife}]:[]),...(record.explorerMolecule?.customWings || [])];
    for(const wing of wings){const titles=wing.sourceIds.map(id=>document.nodes.find(n=>n.id===id)?.title).filter(Boolean);virtual.push({id:wing.id,path:wing.id,parentId:null,title:record.explorerMolecule?.labels?.[wing.id] || wing.label,plantId:document.plantId,informationType:'category',explorerWing:true,knowledgeMode:'agency',status:'draft',evidenceStatus:'reference',sourceIds:[],body:'Your personal wing groups these existing records: '+titles.join(', ')+'. Open a topic to read its original source, evidence and attribution. Grouping does not create or publish new facts.'});}
    const projection={...document,explorerSourceDocument:document,nodes:[...document.nodes,...virtual]};
    if(!document.nodes.some(n=>n.id==='culinary') || !/pigeon[ -]?pea/i.test(document.identity?.commonName || document.plantId || ''))return projection;
    const food=document.nodes.find(n=>n.id==='culinary'),base={plantId:document.plantId,primaryCategory:'uses',knowledgeMode:'agency',status:'draft',evidenceStatus:'draft',sourceIds:[],media:[],attribution:'Explorer prototype sample; not published.'};
    const recipes={...base,explorerSample:true,id:EXPLORER_RECIPES,parentId:food.id,path:food.path+'.'+EXPLORER_RECIPES,title:'Recipes',informationType:'category',body:'Build a sample recipe connection: fit the cylindrical connector into this socket, then fit the recipe onto its free end. This does not submit or publish a recipe.'};
    const recipe={...base,explorerSample:true,id:EXPLORER_RECIPE,parentId:recipes.id,path:recipes.path+'.'+EXPLORER_RECIPE,title:'Community Recipe — sample',informationType:'practice',body:'Sample contribution for interaction testing. A real recipe would retain the contributor, preparation method, harvest stage and source. This example has not been submitted or published.'};
    return {...projection,nodes:[...projection.nodes.filter(n=>n.id!==EXPLORER_RECIPES&&n.id!==EXPLORER_RECIPE),recipes,...(record.explorerMolecule?.contributionAdded?[recipe]:[])]};
}
export function explorerSelectedPath(record,knowledge){return explorerMoleculeIndex(knowledge,record).nodes.get(record.explorerMolecule?.selectedId)?.path || '';}
export function explorerMoleculeSnapshot(record){
    if(!record.explorerMolecule)return null;
    const state=JSON.parse(JSON.stringify(record.explorerMolecule));delete state.births;delete state.lod;delete state.attachmentOrigin;delete state.renderedCount;delete state.renderedBonds;state.wings=state.wings?.filter(id=>state.assembled.includes('core>'+id));state.pending=null;state.pendingConnector=null;state.puzzle=null;return state;
}
export function restoreExplorerMolecule(record,snapshot){
    if(snapshot?.version!==1 || !snapshot.root || !snapshot.positions)return false;
    const state=JSON.parse(JSON.stringify(snapshot));state.births={};state.pending=null;state.pendingConnector=null;state.puzzle=null;delete state.lod;delete state.attachmentOrigin;record.explorerMolecule=state;return true;
}
