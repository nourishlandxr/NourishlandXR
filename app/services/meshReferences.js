import { LIM_CELL_BY_ID } from './limLearning.js';
import { pimAncestors, pimKnowledgeScope, pimNodeById } from './pimModel.js';

const clean=(value,name)=>{const result=String(value ?? '').trim();if(!result)throw new Error(`${name} is required.`);return result;};
const freeze=value=>Object.freeze(value);

export function limMeshRef(nodeId){return canonicalMeshRef({version:1,kind:'lim',nodeId});}
export function derivedMeshRef(nodeId){return canonicalMeshRef({version:1,kind:'derived',nodeId});}

export function pimMeshRef(document,nodeId,{scope,ownerId,specimenId}={}){
    const node=pimNodeById(document,nodeId);
    if(!node)throw new Error(`Unresolved PIM node: ${nodeId}.`);
    const explicit=pimKnowledgeScope(node),resolvedScope=scope || (explicit==='unspecified'?'document':explicit);
    const base={version:1,kind:'pim',scope:resolvedScope,plantId:document.plantId,nodeId:node.id};
    if(resolvedScope==='document')return canonicalMeshRef({...base,documentId:document.id,ownerId});
    if(resolvedScope==='specimen')return canonicalMeshRef({...base,specimenId});
    return canonicalMeshRef(base);
}

export function canonicalMeshRef(input={}){
    if(Number(input.version)!==1)throw new Error('Mesh reference version must be 1.');
    const kind=clean(input.kind,'Mesh reference kind');
    if(kind==='lim')return freeze({version:1,kind,nodeId:clean(input.nodeId,'LIM nodeId')});
    if(kind==='derived')return freeze({version:1,kind,nodeId:clean(input.nodeId,'Derived nodeId')});
    if(kind!=='pim')throw new Error(`Unsupported mesh reference kind: ${kind}.`);
    const scope=clean(input.scope,'PIM scope');
    const base={version:1,kind,scope,plantId:clean(input.plantId,'PIM plantId'),nodeId:clean(input.nodeId,'PIM nodeId')};
    if(scope==='species')return freeze(base);
    if(scope==='specimen')return freeze({...base,specimenId:clean(input.specimenId,'PIM specimenId')});
    if(scope==='document')return freeze({...base,documentId:clean(input.documentId,'PIM documentId'),ownerId:clean(input.ownerId,'PIM ownerId')});
    throw new Error(`Unsupported PIM scope: ${scope}.`);
}

const token=value=>encodeURIComponent(value);
export function meshRefKey(ref){
    const value=canonicalMeshRef(ref);
    if(value.kind==='lim' || value.kind==='derived')return `mesh:v1:${value.kind}:${token(value.nodeId)}`;
    if(value.scope==='species')return `mesh:v1:pim:species:${token(value.plantId)}:${token(value.nodeId)}`;
    if(value.scope==='specimen')return `mesh:v1:pim:specimen:${token(value.specimenId)}:${token(value.plantId)}:${token(value.nodeId)}`;
    return `mesh:v1:pim:document:${token(value.documentId)}:${token(value.ownerId)}:${token(value.plantId)}:${token(value.nodeId)}`;
}

export function createMeshSourceResolver({repository}={}){
    const documents=new Map();
    const documentKey=(document,ownerId)=>`${document.id}\u0000${ownerId}\u0000${document.plantId}`;
    const registerPimDocument=(document,{ownerId=document?.metadata?.ownerId || document?.plantId}={})=>{
        if(!document?.id || !document?.plantId)throw new Error('A canonical PIM document is required.');
        const entry={document,ownerId:clean(ownerId,'PIM ownerId')};
        documents.set(documentKey(document,entry.ownerId),entry);
        return entry;
    };
    function pimEntry(ref){
        if(ref.scope==='document')return documents.get(`${ref.documentId}\u0000${ref.ownerId}\u0000${ref.plantId}`) || null;
        return [...documents.values()].find(entry=>entry.document.plantId===ref.plantId) || null;
    }
    function resolve(input){
        const ref=canonicalMeshRef(input),key=meshRefKey(ref);
        if(ref.kind==='lim'){
            const node=LIM_CELL_BY_ID[ref.nodeId];
            if(!node)throw new Error(`Unresolved LIM reference: ${key}.`);
            return freeze({ref,key,title:node.title,content:node.content || '',scope:'learning',fingerprint:`${key}:${node.content || ''}`,provenance:freeze({system:'lim',nodeId:node.id})});
        }
        if(ref.kind==='derived'){
            const node=repository?.getDerivedNode(ref.nodeId);
            if(!node)throw new Error(`Unresolved derived reference: ${key}.`);
            return freeze({ref,key,title:node.title,content:node.summary,scope:'derived',fingerprint:`${key}:${node.revision}:${node.summary}`,provenance:node.provenance,derivedNode:node});
        }
        const entry=pimEntry(ref);
        const node=entry && pimNodeById(entry.document,ref.nodeId);
        if(!entry || !node || entry.document.plantId!==ref.plantId)throw new Error(`Unresolved PIM reference: ${key}.`);
        if(ref.scope==='document' && (entry.document.id!==ref.documentId || entry.ownerId!==ref.ownerId))throw new Error(`Unresolved PIM reference: ${key}.`);
        const plant=entry.document.identity?.commonName || entry.document.identity?.scientificName || ref.plantId;
        return freeze({ref,key,title:`${plant} — ${node.title}`,content:node.body || node.preview || '',scope:ref.scope,
            fingerprint:`${key}:${node.updatedAt || entry.document.updatedAt || ''}:${node.body || node.preview || ''}`,
            provenance:freeze({system:'pim',documentId:entry.document.id,ownerId:entry.ownerId,plantId:entry.document.plantId,nodeId:node.id,
                ancestors:freeze(pimAncestors(entry.document,node.id).map(item=>item.id))})});
    }
    return {registerPimDocument,resolve};
}
