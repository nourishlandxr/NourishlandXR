import * as THREE from '../vendor/three.module.min.js';
import {diceRegionDirections} from './heroDiceGeometry.js';

const indexes=new WeakMap();
export function knowledgeObjectIndex(knowledge){
    if(indexes.has(knowledge))return indexes.get(knowledge);
    const nodes=new Map(),roots=knowledge.categories || [];
    function visit(node,parent=null){if(!node || nodes.has(String(node.id)))return;const value={...node,id:String(node.id || node.path),parentId:parent?.id || null,parentPath:parent?.path || 'core'};nodes.set(value.id,value);(node.children || []).forEach(child=>visit(child,value));}
    roots.forEach(node=>visit(node));const index={nodes,roots:roots.map(node=>nodes.get(String(node.id))).filter(Boolean)};indexes.set(knowledge,index);return index;
}
const serialVector=v=>({x:v.x,y:v.y,z:v.z});
const serialQuaternion=q=>({x:q.x,y:q.y,z:q.z,w:q.w});
function facesFor(index,conceptId){
    const nodes=conceptId==='core'?index.roots:[...(index.nodes.get(conceptId)?.children || [])].map(n=>index.nodes.get(String(n.id))).filter(Boolean);
    const directions=diceRegionDirections(Math.max(6,Math.min(8,nodes.length+1)));
    return nodes.slice(0,7).map((node,i)=>({faceId:'face:'+node.id,conceptId:node.id,path:node.path,title:node.label,summary:node.description || '',role:node.children?.length?(node.value?.trim()?'hybrid':'branch'):'information',localAnchor:serialVector(directions[i].clone().multiplyScalar(.245)),localNormal:serialVector(directions[i])}));
}
export function ensureKnowledgeObjects(record,knowledge){
    const state=record.knowledgeExplorer,index=knowledgeObjectIndex(knowledge);
    const workspace=state.objects ||= {version:1,items:[],connectors:[],selectedObjectId:'object:core',selectedFaceId:'',interaction:'rotate'};
    if(!workspace.items.length)workspace.items.push({id:'object:core',conceptId:'core',title:knowledge.title || record.name || 'Plant',position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},radius:.24,userPositioned:false,faces:facesFor(index,'core')});
    for(const object of workspace.items){object.faces=facesFor(index,object.conceptId);object.radius ||= .24;const direction=diceRegionDirections(Math.max(6,object.faces.length+1))[object.faces.length];object.contextFace={faceId:'context',conceptId:object.conceptId,role:'contextual',localAnchor:serialVector(direction.clone().multiplyScalar(.245)),localNormal:serialVector(direction)};}
    return workspace;
}
export function selectedKnowledgeObject(record){const workspace=record?.knowledgeExplorer?.objects;return workspace?.items.find(item=>item.id===workspace.selectedObjectId) || workspace?.items[0];}
export function selectKnowledgeObjectFace(record,knowledge,node){
    const workspace=ensureKnowledgeObjects(record,knowledge),object=workspace.items.find(item=>item.id===node.knowledgeObjectId) || selectedKnowledgeObject(record);
    workspace.selectedObjectId=object.id;workspace.selectedFaceId='face:'+String(node.id || node.nodeId);
    const selected=object.faces.find(face=>face.faceId===workspace.selectedFaceId);if(!selected)return false;
    record.knowledgeExplorer.selectedConceptId=selected.conceptId;record.knowledgeExplorer.saved=false;
    record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=selected.path;
    if(selected.role==='branch')spawnKnowledgeObject(record,knowledge,selected.conceptId);
    return true;
}
export function spawnKnowledgeObject(record,knowledge,conceptId){
    const workspace=ensureKnowledgeObjects(record,knowledge),index=knowledgeObjectIndex(knowledge),node=index.nodes.get(String(conceptId));
    if(!node?.children?.length)return null;
    const source=selectedKnowledgeObject(record),sourceFace=source.faces.find(face=>face.faceId===workspace.selectedFaceId) || source.faces.find(face=>face.conceptId===conceptId);
    if(!sourceFace)return null;
    // Only traverse authored descendants of the pressed face.
    const chain=[];let cursor=node;while(cursor && cursor.id!==sourceFace.conceptId){chain.unshift(cursor.id);cursor=index.nodes.get(cursor.parentId);}if(!cursor)return null;chain.unshift(cursor.id);
    let target=workspace.items.find(item=>item.conceptId===node.id);
    if(!target){
        let position;for(let ring=0;!position && ring<12;ring++)for(let turn=0;turn<12;turn++){
            const angle=turn*Math.PI/6,distance=.78+ring*.18,candidate={x:source.position.x+Math.cos(angle)*distance,y:source.position.y+Math.sin(angle)*distance,z:source.position.z};
            if(workspace.items.every(item=>Math.hypot(item.position.x-candidate.x,item.position.y-candidate.y,item.position.z-candidate.z)>.60)){position=candidate;break;}
        }
        if(!position)return null;
        target={id:'object:'+node.id,conceptId:node.id,title:node.label,position,rotation:{x:0,y:0,z:0,w:1},radius:.24,userPositioned:false,faces:facesFor(index,node.id)};workspace.items.push(target);
    }
    const id=source.id+'|'+sourceFace.faceId+'|'+target.id;
    if(!workspace.connectors.some(item=>item.id===id))workspace.connectors.push({id,sourceObjectId:source.id,sourceFaceId:sourceFace.faceId,targetObjectId:target.id,targetFaceId:'context',relationshipPath:chain,relationshipId:chain.join('>')});
    workspace.selectedObjectId=target.id;workspace.selectedFaceId='';record.knowledgeExplorer.revision++;record.knowledgeExplorer.saved=false;return target;
}
export function rotateKnowledgeObject(object,dx,dy){
    const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(dy,dx,0,'YXZ'));
    const q=new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w);q.premultiply(delta).normalize();object.rotation=serialQuaternion(q);
}
export function localObjectMatrix(object){return new THREE.Matrix4().compose(new THREE.Vector3(object.position.x,object.position.y,object.position.z),new THREE.Quaternion(object.rotation.x,object.rotation.y,object.rotation.z,object.rotation.w),new THREE.Vector3(1,1,1));}
export function knowledgePoseMatrix(pose){return new THREE.Matrix4().set(pose.right.x,pose.up.x,pose.normal.x,pose.position.x,pose.right.y,pose.up.y,pose.normal.y,pose.position.y,pose.right.z,pose.up.z,pose.normal.z,pose.position.z,0,0,0,1);}
export function knowledgeConnectorAnchors(workspace,connector){
    const source=workspace.items.find(item=>item.id===connector.sourceObjectId),target=workspace.items.find(item=>item.id===connector.targetObjectId),face=source?.faces.find(item=>item.faceId===connector.sourceFaceId);
    if(!source || !target || !face)return null;
    const a=new THREE.Vector3(face.localAnchor.x,face.localAnchor.y,face.localAnchor.z).applyMatrix4(localObjectMatrix(source));
    const targetFace=connector.targetFaceId==='context'?target.contextFace:target.faces.find(item=>item.faceId===connector.targetFaceId);
    // A stable context region on the back of each cluster, separate from its concepts.
    const b=new THREE.Vector3(...(targetFace?[targetFace.localAnchor.x,targetFace.localAnchor.y,targetFace.localAnchor.z]:[0,0,-.245])).applyMatrix4(localObjectMatrix(target));
    const sourceNormal=new THREE.Vector3(face.localNormal.x,face.localNormal.y,face.localNormal.z).transformDirection(localObjectMatrix(source)),normal=targetFace?.localNormal || {x:0,y:0,z:-1},targetNormal=new THREE.Vector3(normal.x,normal.y,normal.z).transformDirection(localObjectMatrix(target));
    return {start:serialVector(a),end:serialVector(b),startNormal:serialVector(sourceNormal),endNormal:serialVector(targetNormal)};
}
export function knowledgeObjectAction(record,action){
    const state=record.knowledgeExplorer,object=selectedKnowledgeObject(record);if(!object)return false;
    if(action.startsWith('KnowledgeObjectFocus:')){const id=action.slice(21);if(!state.objects.items.some(item=>item.id===id))return false;state.objects.selectedObjectId=id;state.objects.focusObjectId=id;state.objects.selectedFaceId='';}
    else if(action==='KnowledgeObjectMove')state.objects.interaction=state.objects.interaction==='move'?'rotate':'move';
    else if(action.startsWith('KnowledgeObjectTurn:')){const direction=action.split(':')[1];rotateKnowledgeObject(object,direction==='left'?-.32:direction==='right'?.32:0,direction==='up'?-.25:direction==='down'?.25:0);}
    else if(action.startsWith('KnowledgeObjectShift:')){const direction=action.split(':')[1];object.position.x+=direction==='left'?-.12:direction==='right'?.12:0;object.position.y+=direction==='up'?.12:direction==='down'?-.12:0;object.position.z+=direction==='near'?.12:direction==='far'?-.12:0;object.userPositioned=true;}
    else return false;state.revision++;state.saved=false;return true;
}
