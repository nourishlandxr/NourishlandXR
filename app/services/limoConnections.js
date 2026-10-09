import {LIMO_CELL_BY_ID,limoRouteId} from './limoProjectLearning.js';
import {LIMO_CONNECTION_RULES,connectionToken,connectionRuleFor,createLimoConnectionGenerator} from './limoConnectionRules.js';
import {createMeshRepository} from './meshRepository.js';
import {createMeshSourceResolver,limMeshRef,derivedMeshRef} from './meshReferences.js';
import {createMeshRelationshipService} from './meshRelationships.js';

const key=projectId=>'nlxr.limo.connections.v1:'+encodeURIComponent(projectId);
const scopeKey=scope=>JSON.stringify([scope.projectId,scope.siteId || '',scope.areaId || '']);
export function createLimoConnections({storage=globalThis.localStorage,now}={}){
 let scope={projectId:'',siteId:'',areaId:''},entries=[],sourceId='',revision=0,operation=0,projectId='';
 let repository,resolver,service;
 function hydrate(){
  repository=createMeshRepository();resolver=createMeshSourceResolver({repository});
  service=createMeshRelationshipService({repository,resolver,generator:createLimoConnectionGenerator(),...(now?{now}:{})});
  for(const entry of entries){repository.putRelationship(entry.relationship);repository.putVariant(entry.variant);repository.putDerivedNode(entry.derivedNode);}
 }
 function save(next){
  if(!storage)throw new Error('Connection storage is unavailable on this device.');
  storage.setItem(key(scope.projectId),JSON.stringify({version:1,entries:next}));entries=next;revision++;
 }
 function setScope(value){
  const next={projectId:String(value.projectId || ''),siteId:String(value.siteId || ''),areaId:String(value.areaId || '')};
  if(scopeKey(next)!==scopeKey(scope)){sourceId='';revision++;operation++;}
  scope=next;
  if(projectId!==scope.projectId){
   projectId=scope.projectId;
   try{const saved=JSON.parse(storage?.getItem(key(projectId)) || 'null');entries=saved?.version===1 && Array.isArray(saved.entries)?saved.entries.filter(item=>item.scope?.projectId===projectId && item.derivedNode?.learning && item.relationship?.id && item.variant?.id):[];}catch{entries=[];}
   hydrate();
  }
 }
 const scoped=(includeArchived=false)=>entries.filter(item=>scopeKey(item.scope)===scopeKey(scope) && (includeArchived || !item.archived));
 function cell(id){
  const base=LIMO_CELL_BY_ID[limoRouteId(id)];if(base)return base;
  const entry=scoped(true).find(item=>item.derivedNode.id===id);if(!entry)return null;
  const node=entry.derivedNode;
  return {id:node.id,title:node.title,displayLabel:node.title,parentId:null,ruleId:node.ruleId,derived:true,archived:Boolean(entry.archived),
   sourceIds:node.provenance.sourceRefs.map(ref=>ref.nodeId),depth:node.provenance.depth,slot:entry.slot,createdAt:node.provenance.generatedAt,
   content:node.summary,cue:'DISCOVERY',...node.learning,targetKeys:[...(entry.targetKeys || [])]};
 }
 const cells=()=>scoped().map(item=>cell(item.derivedNode.id));
 const availableCells=()=>[...Object.values(LIMO_CELL_BY_ID),...cells()];
 function recipeSources(rule){return rule.sources.map(token=>availableCells().find(item=>connectionToken(item)===token)).filter(Boolean);}
 function compatible(id){const start=cell(id);if(!start)return [];return availableCells().filter(item=>item.id!==start.id && connectionRuleFor([start,item]));}
 function begin(id){if(!cell(id))throw new Error('This connection cell is unavailable.');sourceId=id;revision++;operation++;return compatible(id);}
 function cancel(){sourceId='';revision++;operation++;}
 async function connect(a,b){
  const start=cell(a),end=cell(b),rule=start && end && connectionRuleFor([start,end]);
  if(!rule)throw new Error('This combination is not authored yet. Choose a highlighted cell.');
  const capturedScope={...scope},capturedKey=scopeKey(scope),capturedOperation=operation,refs=[start,end].map(item=>item.derived?derivedMeshRef(item.id):limMeshRef(item.id));
  const result=await service.resolve(refs,{context:{mode:'contextual',scope:{projectId:scope.projectId,siteId:scope.siteId,areaId:scope.areaId || '@whole-project'}}});
  if(capturedKey!==scopeKey(scope) || capturedOperation!==operation)throw new Error('The connection was cancelled or the place changed. Choose the cells again.');
  const prior=entries.find(item=>item.derivedNode.id===result.derivedNode.id),slot=prior?.slot ?? scoped(true).length;
  const entry={...result,scope:capturedScope,slot,targetKeys:prior?.targetKeys || [...new Set([...start.targetKeys || [],...end.targetKeys || []])],archived:false};
  save([...entries.filter(item=>item.derivedNode.id!==result.derivedNode.id),entry]);cancel();return cell(result.derivedNode.id);
 }
 function remove(id){
  const removed=new Set([id]);let grew=true;
  while(grew){grew=false;for(const item of scoped()){if(!removed.has(item.derivedNode.id) && item.derivedNode.provenance.sourceRefs.some(ref=>removed.has(ref.nodeId))){removed.add(item.derivedNode.id);grew=true;}}}
  save(entries.map(item=>removed.has(item.derivedNode.id)?{...item,archived:true}:item));cancel();return [...removed];
 }
 function attach(id,targetKey){
  const entry=scoped().find(item=>item.derivedNode.id===id);if(!entry)throw new Error('Choose an active discovery first.');
  const targets=new Set(entry.targetKeys);if(targets.has(targetKey))targets.delete(targetKey);else targets.add(targetKey);
  save(entries.map(item=>item===entry?{...item,targetKeys:[...targets]}:item));
 }
 function snapshot(){return {scope:{...scope},sourceId,revision,cells:cells(),layoutCells:scoped(true).map(item=>cell(item.derivedNode.id)),compatibleIds:compatible(sourceId).map(item=>item.id)};}
 hydrate();
 return {setScope,cell,cells,begin,cancel,connect,remove,attach,compatible,recipeSources,snapshot,rules:LIMO_CONNECTION_RULES};
}
