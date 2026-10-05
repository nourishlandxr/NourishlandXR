import {knowledgeObjectAction} from './knowledgeObjectModel.js';
import {supportsSpatialPIMO,availablePimoModes} from './pimoSpatialCapabilities.js';
export {availablePimoModes} from './pimoSpatialCapabilities.js';
// Presentation state over the existing knowledge document, never a second graph.
export const KNOWLEDGE_MODES=Object.freeze({tag:{label:'Tag',question:'What is this?',hint:'See the essentials at a glance.'},curiosity:{label:'Curiosity',question:'Why is this interesting?',hint:'Follow what makes it interesting.'},explore:{label:'Explore',question:'How does this connect?',hint:'Grab to turn or move. Touch a face and hold briefly to explore.'}});
export const KNOWLEDGE_VISUALS=Object.freeze({primaryBonds:6,secondaryBonds:3,maxCuriosityChildren:3,curiosityAttention:24,exploreAttention:18,groupGap:1.65,transitionMs:620,nodeWidth:.24,nodeHeight:.208,planarPitch:.20,shellRadius:.40,shellStep:.24,bondWidth:.0026,labelResolution:512,labelFont:64,ink:'#edf3e4',border:'#adc6bc',selectedBorder:'#dceabd',branchColours:Object.freeze({top:'#a8d4c7','upper-right':'#bfd49e','lower-right':'#d6c09b',bottom:'#9ec6d4','lower-left':'#d1afc8','upper-left':'#c0b7d7'})});
const discoveryKey = 'nxr-saved-discoveries';
let savedDiscoveries=null;
const sessionDiscoveries=new Map();
globalThis.addEventListener?.('storage',event=>{if(event.key===discoveryKey)savedDiscoveries=null;});
const subjectId = record => String(record.knowledgeExplorer?.subjectId || record.marker?.plantId || record.marker?.id || record.demoPlantPreset || record.name || record.id);
export function savedKnowledgeDiscovery(record) {
    try { savedDiscoveries ||= JSON.parse(globalThis.localStorage?.getItem(discoveryKey) || '[]');return savedDiscoveries.find(value=>value.subjectId===subjectId(record)) || null; } catch { return null; }
}
export function knowledgeExplorer(record){
    if(!record)return null;
    if(!record.knowledgeExplorer){
        record.knowledgeExplorer={mode:'curiosity',subjectId:subjectId(record),connections:true,context:true,pages:{},positions:{},changedAt:0,revision:0};
        const context=sessionDiscoveries.get(subjectId(record));if(context)restoreKnowledgeDiscovery(record,context);
    }
    const state=record.knowledgeExplorer;
    if(state.mode==='explore' && !supportsSpatialPIMO()){state.previousMode='explore';state.mode='curiosity';state.revision++;}
    return state;
}
function discoverySnapshot(record){
    const state=record.knowledgeExplorer;
    return {subjectId:subjectId(record),title:record.name || record.marker?.name || record.marker?.label || '',activeNodeId:record.demoSelectedNodeId || record.pimSelectedNodeId || '',expandedNodeIds:[...(record.demoExpandedNodeIds || record.pimExpandedNodeIds || [])],mode:state.mode,pages:{...state.pages},positions:{...state.positions},connections:state.connections,context:state.context,history:[...(state.history || [])],readingPage:state.readingPage || 0,selectedConceptId:state.selectedConceptId || '',objects:state.objects?JSON.parse(JSON.stringify(state.objects)):null,curiositySnapshot:state.curiositySnapshot?JSON.parse(JSON.stringify(state.curiositySnapshot)):null};
}
export function preserveKnowledgeContext(record){
    if(!record?.knowledgeExplorer)return;
    const value=discoverySnapshot(record);if(value.mode==='explore')value.mode='curiosity';sessionDiscoveries.set(value.subjectId,value);
    if(sessionDiscoveries.size>100)sessionDiscoveries.delete(sessionDiscoveries.keys().next().value);
}
export function knowledgeExplorerOptions(record){return {explorer:knowledgeExplorer(record),selectedNodeId:record?.demoSelectedNodeId || record?.pimSelectedNodeId || '',connectedPath:record?.knowledgeConnectedPath || '',includeAllChildren:true};}
export function knowledgeExplorerAction(record,action,time=globalThis.performance?.now?.() || 0){
    const state=knowledgeExplorer(record);if(!state)return false;
    if(action!=='KnowledgeSave')state.saved=false;
    if(action.startsWith('KnowledgeMode:')){const mode=action.split(':')[1];if(!availablePimoModes().includes(mode) || state.mode===mode)return false;if(state.mode==='curiosity' && mode==='explore')state.curiositySnapshot={positions:JSON.parse(JSON.stringify(state.positions)),pages:{...state.pages}};
        if(mode==='curiosity' && state.curiositySnapshot){const snapshot=state.curiositySnapshot;state.positions={...snapshot.positions,...state.positions};state.pages={...snapshot.pages,...state.pages};}
        state.previousMode=state.mode;state.mode=mode;}
    else if(action.startsWith('KnowledgeObject')){return state.mode==='explore' && knowledgeObjectAction(record,action);}
    else if(action==='KnowledgeConnections')state.connections=!state.connections;
    else if(action==='KnowledgeContext')state.context=!state.context;
    else if(action==='KnowledgeMore'){const key=state.morePath || 'core';state.pages[key]=(state.pages[key] || 0)+1;}
    else if(action==='KnowledgeResume'){return restoreKnowledgeDiscovery(record,savedKnowledgeDiscovery(record));}
    else if(action==='KnowledgeSave'){
        try{
            const saved=JSON.parse(globalThis.localStorage?.getItem(discoveryKey) || '[]');
            const value={...discoverySnapshot(record),savedAt:new Date().toISOString()};
            const next=[value,...saved.filter(item=>item.subjectId!==value.subjectId)].slice(0,100);globalThis.localStorage?.setItem(discoveryKey,JSON.stringify(next));savedDiscoveries=next;state.saved=true;state.saveFailed=false;
        }catch{state.saveFailed=true;return false;}
    }else return false;
    state.changedAt=time;state.revision++;return true;
}
export function restoreKnowledgeDiscovery(record,value){
    if(!record || !value)return false;
    const demo=Boolean(record.demoType),state=knowledgeExplorer(record);
    record[demo?'demoSelectedNodeId':'pimSelectedNodeId']=value.activeNodeId || '';
    record[demo?'demoExpandedNodeIds':'pimExpandedNodeIds']=[...(value.expandedNodeIds || [])];
    state.objects=value.objects?.version===1?JSON.parse(JSON.stringify(value.objects)):undefined;state.curiositySnapshot=value.curiositySnapshot?JSON.parse(JSON.stringify(value.curiositySnapshot)):undefined;state.mode=availablePimoModes().includes(value.mode)?value.mode:'curiosity';state.pages={...value.pages};state.positions={...value.positions};state.history=[...(value.history || [])];state.readingPage=value.readingPage || 0;state.selectedConceptId=value.selectedConceptId || '';state.connections=value.connections!==false;state.context=value.context!==false;state.changedAt=globalThis.performance?.now?.() || 0;state.revision++;return true;
}
export function rememberKnowledgeSelection(record,path){const state=knowledgeExplorer(record);if(!state || state.history?.at(-1)===path)return;state.history=[...(state.history || []),path].slice(-32);state.saved=false;}
