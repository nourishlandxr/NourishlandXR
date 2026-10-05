import * as THREE from '../vendor/three.module.min.js';
import {knowledgeDiceFaceFrames} from './heroDiceGeometry.js';
export const KNOWLEDGE_DICE_RADIUS=.12,KNOWLEDGE_OBJECT_LIMIT=18;
const indexes=new WeakMap(),vector=v=>({x:v.x,y:v.y,z:v.z});
const FACE_COLOURS=['#42c99a','#e5ae45','#62bcec','#d782c5','#a999ef','#e67b60'];
// Use authored concepts directly; these are featured examples, not a popularity ranking.
function featuredUses(index,node){
 const candidates=[];
 function visit(n){const children=(n.children || []).map(c=>index.nodes.get(String(c.id))).filter(Boolean);if(n!==node && !['category','traditional_knowledge'].includes(n.informationType) && n.value?.trim())candidates.push(n);children.forEach(visit);}
 visit(node);
 const priority=['fresh-peas','dried-pulse','animal-fodder','garden-stakes','young-pods','fuelwood'];
 candidates.sort((a,b)=>{const rank=n=>{const i=priority.indexOf(n.id);return i<0?priority.length:i;};return rank(a)-rank(b);});
 return candidates.length?candidates:(node.children || []).map(n=>index.nodes.get(String(n.id))).filter(Boolean);
}
export function knowledgeObjectIndex(knowledge){
 if(indexes.has(knowledge))return indexes.get(knowledge);
 const nodes=new Map(),roots=[...(knowledge.categories || []),...(knowledge.customCategories || [])];
 function visit(n,parent=null){if(!n || nodes.has(String(n.id)))return;const node={...n,id:String(n.id || n.path),parentId:parent?.id || null,parentPath:parent?.path || 'core'};nodes.set(node.id,node);(n.children || []).forEach(child=>visit(child,node));}
 roots.forEach(n=>visit(n));const index={nodes,roots:roots.map(n=>nodes.get(String(n.id))).filter(Boolean)};indexes.set(knowledge,index);return index;
}
function facesFor(index,object){
 const concept=index.nodes.get(object.conceptId),uses=concept && (concept.id==='uses' || concept.label?.toLowerCase()==='uses');
 const nodes=object.conceptId==='core'?index.roots:uses?featuredUses(index,concept):(concept?.children || []).map(n=>index.nodes.get(String(n.id))).filter(Boolean),frames=knowledgeDiceFaceFrames(KNOWLEDGE_DICE_RADIUS);
 object.featuredUses=!!uses;
 object.facePages=Math.max(1,Math.ceil(nodes.length/6));object.facePage=((object.facePage || 0)%object.facePages+object.facePages)%object.facePages;
 return nodes.slice(object.facePage*6,object.facePage*6+6).map((n,i)=>({faceId:'face:'+n.id,conceptId:n.id,path:n.path,title:n.label,summary:n.description || '',accent:FACE_COLOURS[(object.facePage*6+i)%FACE_COLOURS.length],role:n.children?.length?(n.value?.trim()?'hybrid':'branch'):'information',localAnchor:vector(frames[i].centre.clone().addScaledVector(frames[i].normal,.001)),localNormal:vector(frames[i].normal),faceRadius:frames[i].inradius}));
}
export function ensureKnowledgeObjects(record,knowledge){
 const state=record.knowledgeExplorer,index=knowledgeObjectIndex(knowledge),w=state.objects ||= {version:1,items:[],connectors:[],selectedObjectId:'object:core',selectedFaceId:'',interaction:'rotate',scale:1,collapsed:[]};
 w.scale=Math.max(.65,Math.min(1.35,Number(w.scale)||1));w.collapsed ||= [];
 if(!w.items.length)w.items.push({id:'object:core',conceptId:'core',title:knowledge.title || record.name || 'Plant',position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0,w:1},userPositioned:false});
 for(const o of w.items){o.radius=KNOWLEDGE_DICE_RADIUS;o.scale=w.scale;o.faces=facesFor(index,o);const frame=knowledgeDiceFaceFrames(KNOWLEDGE_DICE_RADIUS)[6];o.contextFace={faceId:'context',conceptId:o.conceptId,role:'contextual',localAnchor:vector(frame.centre.clone().addScaledVector(frame.normal,.001)),localNormal:vector(frame.normal),faceRadius:frame.inradius};}
 for(const link of w.connectors){const source=w.items.find(o=>o.id===link.sourceObjectId),target=w.items.find(o=>o.id===link.targetObjectId),face=source?.faces.find(f=>f.faceId===link.sourceFaceId);if(face){link.sourceAnchor={...face.localAnchor};link.sourceNormal={...face.localNormal};}link.accent ||= face?.accent || '#42c99a';if(target)target.accent ||= link.accent;}
 return w;
}
export function visibleKnowledgeObjects(w){
 const ids=new Set([w.items[0]?.id]),queue=[...ids],collapsed=new Set(w.collapsed || []);
 for(let i=0;i<queue.length;i++){const id=queue[i];if(collapsed.has(id))continue;for(const c of w.connectors)if(c.sourceObjectId===id && !ids.has(c.targetObjectId)){ids.add(c.targetObjectId);queue.push(c.targetObjectId);}}
 return w.items.filter(o=>ids.has(o.id));
}
export function selectedKnowledgeObject(record){const w=record?.knowledgeExplorer?.objects;return w?.items.find(o=>o.id===w.selectedObjectId) || w?.items[0];}
export function selectKnowledgeObjectFace(record,knowledge,node){
 const w=ensureKnowledgeObjects(record,knowledge),o=w.items.find(o=>o.id===node.knowledgeObjectId);if(!o)return false;w.selectedObjectId=o.id;
 if(node.pimKnowledgeContext){w.selectedFaceId='';record.knowledgeExplorer.selectedConceptId=o.conceptId;record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=knowledgeObjectIndex(knowledge).nodes.get(o.conceptId)?.path || '';return true;}
 const f=o.faces.find(f=>f.faceId===(node.knowledgeFaceId || 'face:'+String(node.id || node.nodeId)));if(!f)return false;
 w.selectedFaceId=f.faceId;record.knowledgeExplorer.selectedConceptId=f.conceptId;record.knowledgeExplorer.saved=false;record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=f.path;
 const history=record.knowledgeExplorer.history || [];if(history.at(-1)!==f.path)record.knowledgeExplorer.history=[...history,f.path].slice(-32);
 const index=knowledgeObjectIndex(knowledge),opened=new Set(record.demoExpandedNodeIds || record.pimExpandedNodeIds || []);for(let current=index.nodes.get(f.conceptId);current;current=index.nodes.get(current.parentId))if(current.children?.length)opened.add(current.path);record[record.demoType?'demoExpandedNodeIds':'pimExpandedNodeIds']=[...opened];
 if(f.role==='branch' || f.role==='hybrid')spawnKnowledgeObject(record,knowledge,f.conceptId);return true;
}
export function spawnKnowledgeObject(record,knowledge,conceptId){
 const w=ensureKnowledgeObjects(record,knowledge),index=knowledgeObjectIndex(knowledge),node=index.nodes.get(String(conceptId)),source=selectedKnowledgeObject(record);if(!node?.children?.length || !source)return null;
 const face=source.faces.find(f=>f.conceptId===node.id) || source.faces.find(f=>f.faceId===w.selectedFaceId);if(!face)return null;
 const chain=[];let cursor=node;while(cursor && cursor.id!==face.conceptId){chain.unshift(cursor.id);cursor=index.nodes.get(cursor.parentId);}if(!cursor)return null;chain.unshift(cursor.id);
 let target=w.items.find(o=>o.conceptId===node.id);
 if(!target){
  if(w.items.length>=KNOWLEDGE_OBJECT_LIMIT){w.limitReached=true;return null;}
  const normal=new THREE.Vector3(face.localNormal.x,face.localNormal.y,face.localNormal.z).applyQuaternion(new THREE.Quaternion(source.rotation.x,source.rotation.y,source.rotation.z,source.rotation.w)),tangent=new THREE.Vector3(0,1,0).cross(normal);if(tangent.length()<.01)tangent.set(1,0,0);tangent.normalize();const up=normal.clone().cross(tangent).normalize(),radius=KNOWLEDGE_DICE_RADIUS*w.scale;
  let position;
  for(let ring=0;!position && ring<12;ring++)for(let turn=0;turn<(ring?12:1);turn++){
   const p=new THREE.Vector3(source.position.x,source.position.y,source.position.z).addScaledVector(normal,radius+.08+ring*.025).addScaledVector(tangent,Math.cos(turn*Math.PI/6)*(radius*2+.09+ring*.085)).addScaledVector(up,Math.sin(turn*Math.PI/6)*(radius*2+.09+ring*.085));
   if(record.knowledgeObjectPose && Number.isFinite(record.knowledgeFloor) && p.clone().applyMatrix4(knowledgePoseMatrix(record.knowledgeObjectPose)).y<record.knowledgeFloor+radius+.02)continue;
   if(w.items.every(o=>p.distanceTo(new THREE.Vector3(o.position.x,o.position.y,o.position.z))>radius*2+.055))position=vector(p);if(position)break;
  }
  if(!position)return null;target={id:'object:'+node.id,conceptId:node.id,title:node.label,accent:face.accent,position,rotation:{...source.rotation},radius:KNOWLEDGE_DICE_RADIUS,scale:w.scale,userPositioned:false};w.items.push(target);ensureKnowledgeObjects(record,knowledge);
 }
 const id=source.id+'|'+face.faceId+'|'+target.id;
 if(!w.connectors.some(c=>c.id===id))w.connectors.push({id,accent:face.accent,sourceObjectId:source.id,sourceFaceId:face.faceId,sourceAnchor:{...face.localAnchor},sourceNormal:{...face.localNormal},targetObjectId:target.id,targetFaceId:'context',relationshipPath:chain,relationshipId:chain.join('>')});
 w.collapsed=w.collapsed.filter(id=>id!==source.id);w.selectedObjectId=target.id;w.selectedFaceId='';w.limitReached=false;record.knowledgeExplorer.revision++;record.knowledgeExplorer.saved=false;return target;
}
export function rotateKnowledgeObject(o,dx,dy){const q=new THREE.Quaternion(o.rotation.x,o.rotation.y,o.rotation.z,o.rotation.w);q.premultiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(dy,dx,0,'YXZ'))).normalize();o.rotation={x:q.x,y:q.y,z:q.z,w:q.w};}
export function localObjectMatrix(o){return new THREE.Matrix4().compose(new THREE.Vector3(o.position.x,o.position.y,o.position.z),new THREE.Quaternion(o.rotation.x,o.rotation.y,o.rotation.z,o.rotation.w),new THREE.Vector3().setScalar(o.scale || 1));}
export function knowledgePoseMatrix(p){return new THREE.Matrix4().set(p.right.x,p.up.x,p.normal.x,p.position.x,p.right.y,p.up.y,p.normal.y,p.position.y,p.right.z,p.up.z,p.normal.z,p.position.z,0,0,0,1);}
export function knowledgeConnectorAnchors(w,c){
 const source=w.items.find(o=>o.id===c.sourceObjectId),target=w.items.find(o=>o.id===c.targetObjectId),face=source?.faces.find(f=>f.faceId===c.sourceFaceId),a=c.sourceAnchor || face?.localAnchor,n=c.sourceNormal || face?.localNormal;if(!source || !target || !a || !n)return null;
 const f=target.contextFace;
 return {start:vector(new THREE.Vector3(a.x,a.y,a.z).applyMatrix4(localObjectMatrix(source))),end:vector(new THREE.Vector3(f.localAnchor.x,f.localAnchor.y,f.localAnchor.z).applyMatrix4(localObjectMatrix(target))),startNormal:vector(new THREE.Vector3(n.x,n.y,n.z).transformDirection(localObjectMatrix(source))),endNormal:vector(new THREE.Vector3(f.localNormal.x,f.localNormal.y,f.localNormal.z).transformDirection(localObjectMatrix(target)))};
}
export function knowledgeObjectAction(record,action){
 const s=record.knowledgeExplorer,w=s.objects,o=selectedKnowledgeObject(record);if(!o)return false;
 if(action==='KnowledgeObjectCollapse')w.collapsed=w.collapsed.includes(o.id)?w.collapsed.filter(id=>id!==o.id):[...w.collapsed,o.id];
 else if(action==='KnowledgeObjectFaces'){o.facePage=(o.facePage || 0)+1;w.selectedFaceId='';}
 else if(action.startsWith('KnowledgeObjectSize:')){const previous=w.scale || 1;w.scale=Math.max(.65,Math.min(1.35,Number(action.split(':')[1])||1));w.items.forEach(o=>{o.scale=w.scale;for(const axis of ['x','y','z'])o.position[axis]*=w.scale/previous;});}
 else if(action.startsWith('KnowledgeObjectFocus:')){const id=action.slice(21);if(!visibleKnowledgeObjects(w).some(o=>o.id===id))return false;w.selectedObjectId=id;w.focusObjectId=id;w.selectedFaceId='';}
 else if(action==='KnowledgeObjectMove')w.interaction=w.interaction==='move'?'rotate':'move';
 else if(action.startsWith('KnowledgeObjectTurn:')){const d=action.split(':')[1];rotateKnowledgeObject(o,d==='left'?-.32:d==='right'?.32:0,d==='up'?-.25:d==='down'?.25:0);}
 else if(action.startsWith('KnowledgeObjectShift:')){const d=action.split(':')[1];o.position.x+=d==='left'?-.12:d==='right'?.12:0;o.position.y+=d==='up'?.12:d==='down'?-.12:0;o.position.z+=d==='near'?.12:d==='far'?-.12:0;o.userPositioned=true;}
 else return false;s.revision++;s.saved=false;return true;
}
