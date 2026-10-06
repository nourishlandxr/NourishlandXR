import * as THREE from '../vendor/three.module.min.js';
import {PIM_COMPASS_BY_ID} from './pimCompass.js';
import {createKnowledgeArchitectureGeometry,architectureRegionAmount,KNOWLEDGE_REGION_DIRECTIONS} from './knowledgeArchitectureGeometry.js';

export const KNOWLEDGE_DICE_RADIUS=.16, KNOWLEDGE_OBJECT_LIMIT=1;
const indexes=new WeakMap(),framesByObject=new WeakMap(),faceCaches=new WeakMap(),vector=v=>({x:v.x,y:v.y,z:v.z});
const REGION_COLOURS=['#47dcb2','#c9e44b','#ffb34e','#49c5f0','#ef75b6','#ab8cff'];

export function knowledgeObjectIndex(knowledge){
    if(indexes.has(knowledge))return indexes.get(knowledge);
    const nodes=new Map(),roots=[...(knowledge.categories || []),...(knowledge.customCategories || [])];
    function visit(n,parent=null){
        if(!n || nodes.has(String(n.id)))return;
        const node={...n,id:String(n.id || n.path),parentId:parent?.id || null,parentPath:parent?.path || 'core'};
        nodes.set(node.id,node);(n.children || []).forEach(child=>visit(child,node));
    }
    roots.forEach(n=>visit(n));
    const index={nodes,roots:roots.map(n=>nodes.get(String(n.id))).filter(Boolean)};indexes.set(knowledge,index);return index;
}
function domainFor(index,node){while(node?.parentId)node=index.nodes.get(node.parentId);return node;}
function childrenFor(index,node){return (node?.children || []).map(child=>index.nodes.get(String(child.id))).filter(Boolean);}
function knowledgeDensity(index,node){
    return childrenFor(index,node).reduce((sum,child)=>sum+(child.value?.trim()?1:0)+knowledgeDensity(index,child),0);
}
export function setKnowledgeArchitectureGeometry(object,geometry){
    framesByObject.set(object,geometry.userData.knowledgeFrames);
    object.radius=geometry.boundingSphere?geometry.boundingSphere.radius+geometry.boundingSphere.center.length():KNOWLEDGE_DICE_RADIUS;
}
function frameFields(frame){
    return frame?{localAnchor:vector(frame.centre.clone().addScaledVector(frame.normal,.001)),localNormal:vector(frame.normal),faceRadius:frame.inradius,faceWidth:frame.width,faceHeight:frame.height}:{};
}
function buildFaces(index,workspace,object){
    let frames=framesByObject.get(object);
    if(!frames){const geometry=createKnowledgeArchitectureGeometry(object.seedRadius,object.regions);setKnowledgeArchitectureGeometry(object,geometry);frames=geometry.userData.knowledgeFrames;geometry.dispose();}
    const key=JSON.stringify([workspace.selectedFaceId,workspace.activeRegionId,object.title,object.regions.map(region=>[region.rootId,region.focusId,region.opened,region.level,region.page,region.accent])]);
    const cached=faceCaches.get(object);
    if(cached?.frames===frames && cached.key===key)return;
    faceCaches.set(object,{frames,key});
    const faces=Array(24).fill(null);
    object.regions.forEach((region,slot)=>{
        const root=index.nodes.get(region.rootId);if(!root)return;
        const make=(node,regionIndex)=>({faceId:'face:'+node.id,conceptId:node.id,path:node.path,title:node.label,accent:region.accent,domainId:root.id,regionSlot:slot,
            role:node.children?.length?(node.value?.trim()?'hybrid':'branch'):'information',selected:workspace.selectedFaceId==='face:'+node.id,...frameFields(frames[regionIndex])});
        faces[slot]=make(root,slot);
        if(region.opened){
            const focus=index.nodes.get(region.focusId) || root,children=childrenFor(index,focus);
            region.parentFocusId=focus.parentId || root.id;
            region.pages=Math.max(1,Math.ceil(children.length/3));region.page=((region.page || 0)%region.pages+region.pages)%region.pages;
            children.slice(region.page*3,region.page*3+3).forEach((node,bay)=>faces[6+slot*3+bay]=make(node,6+slot*3+bay));
        }
    });
    object.faces=faces;object.featuredUses=false;
    const selectedRegion=object.regions.find(region=>region.rootId===workspace.activeRegionId);
    object.facePages=selectedRegion?.pages || 1;
    object.contextFace={faceId:'context',conceptId:'core',title:object.title,accent:'#d8deca',role:'contextual',...frameFields(frames[24])};
}
export function ensureKnowledgeObjects(record,knowledge){
    const state=record.knowledgeExplorer,index=knowledgeObjectIndex(knowledge);
    let workspace=state.objects,legacyConcepts=[];
    if(workspace?.version!==2){
        const legacy=workspace,oldCore=legacy?.items?.find(item=>item.conceptId==='core');
        legacyConcepts=[...(legacy?.items || []).map(item=>item.conceptId),state.selectedConceptId].filter(id=>index.nodes.has(id));
        workspace={version:2,items:[{id:'object:core',conceptId:'core',title:knowledge.identity?.commonName || knowledge.title || record.name || 'Plant',
            position:{...(oldCore?.position || {x:0,y:0,z:0})},rotation:{...(oldCore?.rotation || {x:0,y:0,z:0,w:1})},userPositioned:Boolean(oldCore?.userPositioned)}],
            selectedObjectId:'object:core',selectedFaceId:'',interaction:legacy?.interaction || 'rotate',scale:legacy?.scale || 1,regions:[],growthEvents:[],connectors:[],collapsed:[]};
        state.objects=workspace;
    }
    workspace.scale=Math.max(.65,Math.min(1.35,Number(workspace.scale)||1));
    const object=workspace.items[0];object.seedRadius=KNOWLEDGE_DICE_RADIUS;object.scale=workspace.scale;
    if(!workspace.regions.length){
        workspace.regions=KNOWLEDGE_REGION_DIRECTIONS.map((direction,slot)=>{
            const root=index.roots.find(node=>(node.direction || node.rootDirection || PIM_COMPASS_BY_ID[node.id]?.direction)===direction) || (!index.roots.some(node=>node.direction || PIM_COMPASS_BY_ID[node.id])?index.roots[slot]:null);
            return {rootId:root?.id || '',focusId:root?.id || '',direction,accent:REGION_COLOURS[slot],opened:false,level:0,visited:[],page:0};
        });
    }
    for(const id of legacyConcepts){
        const node=index.nodes.get(id),root=domainFor(index,node),region=workspace.regions.find(region=>region.rootId===root?.id);
        if(!region)continue;
        for(let current=node;current;current=index.nodes.get(current.parentId))developRegion(workspace,index,region,current,0);
        region.focusId=node.children?.length?node.id:node.parentId || root.id;delete region.transition;
    }
    object.regions=workspace.regions;buildFaces(index,workspace,object);return workspace;
}
export function visibleKnowledgeObjects(workspace){return workspace.items.slice(0,1);}
export function selectedKnowledgeObject(record){return record?.knowledgeExplorer?.objects?.items?.[0];}
function developRegion(workspace,index,region,node,time){
    const before=region.level || 0,from=architectureRegionAmount(region,time);
    if(!region.visited.includes(node.id)){
        region.visited.push(node.id);workspace.growthEvents.push({type:'discovered',conceptId:node.id,domainId:region.rootId,at:new Date().toISOString()});
    }
    region.opened=true;
    const explored=region.visited.length,density=knowledgeDensity(index,index.nodes.get(region.rootId));
    region.level=explored>=5 && density>=6?3:explored>=3?2:1;
    if(before!==region.level || from===0){
        region.transition={from,startedAt:time};
        workspace.growthEvents.push({type:'region-developed',domainId:region.rootId,level:region.level,at:new Date().toISOString()});
    }
}
export function selectKnowledgeObjectFace(record,knowledge,node){
    const workspace=ensureKnowledgeObjects(record,knowledge),object=workspace.items[0],index=knowledgeObjectIndex(knowledge);
    if(node.pimKnowledgeContext){
        workspace.selectedFaceId='';record.knowledgeExplorer.selectedConceptId='core';record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']='';return true;
    }
    const face=object.faces.find(face=>face && face.faceId===(node.knowledgeFaceId || 'face:'+String(node.id || node.nodeId)));if(!face)return false;
    const concept=index.nodes.get(face.conceptId),region=workspace.regions[face.regionSlot];
    workspace.selectedFaceId=face.faceId;workspace.activeRegionId=region.rootId;
    developRegion(workspace,index,region,concept,globalThis.performance?.now?.() || 0);
    if(concept.children?.length){region.focusId=concept.id;region.parentFocusId=concept.parentId || region.rootId;region.page=0;}
    record.knowledgeExplorer.selectedConceptId=concept.id;record.knowledgeExplorer.saved=false;
    record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=face.path;
    const opened=new Set(record.demoExpandedNodeIds || record.pimExpandedNodeIds || []);
    for(let current=concept;current;current=index.nodes.get(current.parentId))if(current.children?.length)opened.add(current.path);
    record[record.demoType?'demoExpandedNodeIds':'pimExpandedNodeIds']=[...opened];
    const history=record.knowledgeExplorer.history || [];if(history.at(-1)!==face.path)record.knowledgeExplorer.history=[...history,face.path].slice(-32);
    record.knowledgeExplorer.changedAt=globalThis.performance?.now?.() || 0;record.knowledgeExplorer.revision++;return true;
}
// Host compatibility: exploring a branch develops its existing wing.
export function spawnKnowledgeObject(record,knowledge,conceptId){
    const workspace=ensureKnowledgeObjects(record,knowledge),index=knowledgeObjectIndex(knowledge),node=index.nodes.get(String(conceptId));
    if(!node?.children?.length)return null;
    const root=domainFor(index,node),region=workspace.regions.find(region=>region.rootId===root?.id);if(!region)return null;
    developRegion(workspace,index,region,node,globalThis.performance?.now?.() || 0);
    region.focusId=node.id;region.parentFocusId=node.parentId || region.rootId;region.page=0;workspace.activeRegionId=root.id;workspace.selectedFaceId='face:'+node.id;
    record.knowledgeExplorer.changedAt=globalThis.performance?.now?.() || 0;record.knowledgeExplorer.revision++;record.knowledgeExplorer.saved=false;return workspace.items[0];
}
export function rotateKnowledgeObject(object,dx,dy){
    const rotation=new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w);
    rotation.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(dy,dx,0,'YXZ'))).normalize();object.rotation={x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w};
}
export function localObjectMatrix(object){return new THREE.Matrix4().compose(new THREE.Vector3(object.position.x,object.position.y,object.position.z),new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w),new THREE.Vector3().setScalar(object.scale || 1));}
export function knowledgePoseMatrix(pose){return new THREE.Matrix4().set(pose.right.x,pose.up.x,pose.normal.x,pose.position.x,pose.right.y,pose.up.y,pose.normal.y,pose.position.y,pose.right.z,pose.up.z,pose.normal.z,pose.position.z,0,0,0,1);}
export function knowledgeConnectorAnchors(){return null;}
export function knowledgeObjectAction(record,action){
    const state=record.knowledgeExplorer,workspace=state.objects,object=selectedKnowledgeObject(record);if(!object)return false;
    const region=workspace.regions.find(region=>region.rootId===workspace.activeRegionId);
    if(action==='KnowledgeObjectCollapse'){
        if(!region)return false;const from=architectureRegionAmount(region);region.opened=!region.opened;region.transition={from,startedAt:performance.now()};
    }else if(action==='KnowledgeObjectFaces'){if(!region)return false;region.page=(region.page || 0)+1;workspace.selectedFaceId='';}
    else if(action==='KnowledgeObjectBack'){
        if(!region)return false;
        // A leaf is read within its parent's bays. Back first returns to that
        // parent; only a second Back leaves the branch and hides its siblings.
        const readingChild=workspace.selectedFaceId && workspace.selectedFaceId!=='face:'+region.focusId;
        if(!readingChild)region.focusId=region.parentFocusId || region.rootId;
        region.page=0;workspace.selectedFaceId='face:'+region.focusId;
    }else if(action.startsWith('KnowledgeObjectSize:'))workspace.scale=Math.max(.65,Math.min(1.35,Number(action.split(':')[1])||1));
    else if(action.startsWith('KnowledgeObjectFocus:')){workspace.focusObjectId=object.id;workspace.selectedFaceId='';}
    else if(action==='KnowledgeObjectMove')workspace.interaction=workspace.interaction==='move'?'rotate':'move';
    else if(action.startsWith('KnowledgeObjectTurn:')){const direction=action.split(':')[1];rotateKnowledgeObject(object,direction==='left'?-.32:direction==='right'?.32:0,direction==='up'?-.25:direction==='down'?.25:0);}
    else if(action.startsWith('KnowledgeObjectShift:')){const direction=action.split(':')[1];object.position.x+=direction==='left'?-.12:direction==='right'?.12:0;object.position.y+=direction==='up'?.12:direction==='down'?-.12:0;object.position.z+=direction==='near'?.12:direction==='far'?-.12:0;object.userPositioned=true;}
    else return false;state.revision++;state.saved=false;return true;
}
