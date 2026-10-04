import {knowledgeObjectAction} from './knowledgeObjectModel.js';
// Presentation state over the existing knowledge document, never a second graph.
export const KNOWLEDGE_MODES=Object.freeze({tag:{label:'Tag',question:'What is this?',hint:'See the essentials at a glance.'},curiosity:{label:'Curiosity',question:'Why is this interesting?',hint:'Follow what makes it interesting.'},explore:{label:'Explore',question:'How does this connect?',hint:'Turn to inspect. Press a face to explore. Move objects to organise connections.'}});
export const KNOWLEDGE_VISUALS=Object.freeze({primaryBonds:6,secondaryBonds:3,maxCuriosityChildren:3,curiosityAttention:24,exploreAttention:18,groupGap:1.65,transitionMs:620,nodeWidth:.24,nodeHeight:.208,planarPitch:.20,shellRadius:.40,shellStep:.24,bondWidth:.0026,labelResolution:512,labelFont:64,ink:'#edf3e4',border:'#adc6bc',selectedBorder:'#dceabd',branchColours:Object.freeze({top:'#a8d4c7','upper-right':'#bfd49e','lower-right':'#d6c09b',bottom:'#9ec6d4','lower-left':'#d1afc8','upper-left':'#c0b7d7'})});
const discoveryKey = 'nxr-saved-discoveries';
let savedDiscoveries=null;
globalThis.addEventListener?.('storage',event=>{if(event.key===discoveryKey)savedDiscoveries=null;});
const subjectId = record => String(record.knowledgeExplorer?.subjectId || record.marker?.plantId || record.marker?.id || record.demoPlantPreset || record.name || record.id);
export function savedKnowledgeDiscovery(record) {
    try { savedDiscoveries ||= JSON.parse(globalThis.localStorage?.getItem(discoveryKey) || '[]');return savedDiscoveries.find(value=>value.subjectId===subjectId(record)) || null; } catch { return null; }
}
export function knowledgeExplorer(record){
    if(!record)return null;
    return record.knowledgeExplorer ||= {mode:'tag',connections:true,context:true,pages:{},positions:{},changedAt:0,revision:0};
}
export function knowledgeExplorerOptions(record){return {explorer:knowledgeExplorer(record),selectedNodeId:record?.demoSelectedNodeId || record?.pimSelectedNodeId || '',connectedPath:record?.knowledgeConnectedPath || '',includeAllChildren:true};}
export function knowledgeExplorerAction(record,action,time=globalThis.performance?.now?.() || 0){
    const state=knowledgeExplorer(record);if(!state)return false;
    if(action!=='KnowledgeSave')state.saved=false;
    if(action.startsWith('KnowledgeMode:')){const mode=action.split(':')[1];if(!KNOWLEDGE_MODES[mode] || state.mode===mode)return false;if(state.mode==='curiosity' && mode==='explore')state.curiositySnapshot={positions:JSON.parse(JSON.stringify(state.positions)),pages:{...state.pages},selectedNodeId:record.demoSelectedNodeId || record.pimSelectedNodeId || '',expandedNodeIds:[...(record.demoExpandedNodeIds || record.pimExpandedNodeIds || [])],readingPage:state.readingPage || 0};
        if(mode==='curiosity' && state.curiositySnapshot){const snapshot=state.curiositySnapshot;state.positions=JSON.parse(JSON.stringify(snapshot.positions));state.pages={...snapshot.pages};state.readingPage=snapshot.readingPage;record[record.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=snapshot.selectedNodeId;record[record.demoType?'demoExpandedNodeIds':'pimExpandedNodeIds']=[...snapshot.expandedNodeIds];}
        state.previousMode=state.mode;state.mode=mode;}
    else if(action.startsWith('KnowledgeObject')){return knowledgeObjectAction(record,action);}
    else if(action==='KnowledgeConnections')state.connections=!state.connections;
    else if(action==='KnowledgeContext')state.context=!state.context;
    else if(action==='KnowledgeMore'){const key=state.morePath || 'core';state.pages[key]=(state.pages[key] || 0)+1;}
    else if(action==='KnowledgeResume'){return restoreKnowledgeDiscovery(record,savedKnowledgeDiscovery(record));}
    else if(action==='KnowledgeSave'){
        try{
            const saved=JSON.parse(globalThis.localStorage?.getItem(discoveryKey) || '[]');
            const activeNodeId=record.demoSelectedNodeId || record.pimSelectedNodeId || '';
            const value={subjectId:subjectId(record),title:record.name || record.marker?.name || record.marker?.label || '',activeNodeId,expandedNodeIds:[...(record.demoExpandedNodeIds || record.pimExpandedNodeIds || [])],mode:state.mode,pages:{...state.pages},positions:{...state.positions},connections:state.connections,context:state.context,history:[...(state.history || [])],readingPage:state.readingPage || 0,objects:state.objects?JSON.parse(JSON.stringify(state.objects)):null,curiositySnapshot:state.curiositySnapshot?JSON.parse(JSON.stringify(state.curiositySnapshot)):null,savedAt:new Date().toISOString()};
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
    state.objects=value.objects?.version===1?JSON.parse(JSON.stringify(value.objects)):undefined;state.curiositySnapshot=value.curiositySnapshot?JSON.parse(JSON.stringify(value.curiositySnapshot)):undefined;state.mode=KNOWLEDGE_MODES[value.mode]?value.mode:'curiosity';state.pages={...value.pages};state.positions={...value.positions};state.history=[...(value.history || [])];state.readingPage=value.readingPage || 0;state.connections=value.connections!==false;state.context=value.context!==false;state.changedAt=globalThis.performance?.now?.() || 0;state.revision++;return true;
}
export function rememberKnowledgeSelection(record,path){const state=knowledgeExplorer(record);if(!state || state.history?.at(-1)===path)return;state.history=[...(state.history || []),path].slice(-32);state.saved=false;}

// Rank only with authored data. No invented relationships or random motion.
export function molecularKnowledgeNodes(records,metrics,options={}){
    const state=options.explorer;if(!state || state.mode==='tag')return [];
    const byPath=new Map(records.map(node=>[node.path,node])),selected=byPath.get(options.selectedNodeId),rootOf=node=>{let current=node;while(byPath.has(current?.parentPath))current=byPath.get(current.parentPath);return current;};
    const roots=records.filter(node=>node.depth===0),activeRoot=rootOf(selected);
    const chosen=new Set(roots.map(node=>node.path));
    const childCap=Math.max(1,Math.min(3,Number(state.maxCuriosityChildren)||KNOWLEDGE_VISUALS.maxCuriosityChildren));
    const ranked=records.filter(node=>node._visible && node.depth===1);
    const localRoot=activeRoot?.path;
    state.morePath=localRoot || 'core';
    state.hasMore=ranked.filter(node=>node.parentPath===localRoot).length>childCap;
    for(const root of roots){
        const children=ranked.filter(node=>node.parentPath===root.path).sort((a,b)=>(Number(b.importance)||0)-(Number(a.importance)||0) || a._pimOrder-b._pimOrder);
        const offset=((state.pages[root.path] || 0)*childCap)%Math.max(1,children.length);
        const page=children.slice(offset,offset+childCap);
        if(selected?.depth===1 && selected.parentPath===root.path && !page.includes(selected)){if(page.length>=childCap)page.pop();page.push(selected);}
        page.forEach(node=>chosen.add(node.path));
    }
    // Authored connection demonstrations may explicitly protect a deeper source.
    const protect=byPath.get(options.connectedPath);for(let node=protect;node;node=byPath.get(node.parentPath))chosen.add(node.path);
    const width=metrics.layoutWidth,height=metrics.layoutHeight,cell=metrics.cellWidthPixels;
    state.positions ||= {};
    const angles={top:-Math.PI/2,'upper-right':-Math.PI/6,'lower-right':Math.PI/6,bottom:Math.PI/2,'lower-left':Math.PI*5/6,'upper-left':Math.PI*7/6};
    for(const root of roots){const angle=angles[root.rootDirection] ?? -.5;state.positions[root.path]={x:Math.cos(angle)*KNOWLEDGE_VISUALS.groupGap,y:Math.sin(angle)*KNOWLEDGE_VISUALS.groupGap};}
    const previousVisible=new Set(state.visiblePaths || []);
    const occupied=[{x:0,y:0,path:'core'},...records.filter(node=>chosen.has(node.path) && (node.depth===0 || previousVisible.has(node.path)) && state.positions[node.path]).map(node=>({...state.positions[node.path],path:node.path}))];
    const placed=new Map(),out=[];
    const point=p=>({x:50+p.x/width*100,y:50+p.y/height*100});
    const overlaps=(a,b)=>Math.abs(a.x-b.x)<1.12 && Math.abs(a.y-b.y)<metrics.cellHeightPixels/cell+.16;
    // Positions are stored in cell units, independent of growing texture bounds.
    for(const node of records.filter(node=>chosen.has(node.path)).sort((a,b)=>a.depth-b.depth || a._pimOrder-b._pimOrder)){
        const parent=placed.get(node.parentPath) || {x:0,y:0},angle=angles[node.rootDirection] ?? -.5;
        let position=state.positions[node.path];
        if(!position || occupied.some(p=>p.path!==node.path && overlaps(position,p))){
            const previous=occupied.findIndex(p=>p.path===node.path);if(previous>=0)occupied.splice(previous,1);
            const siblings=records.filter(item=>chosen.has(item.path) && item.parentPath===node.parentPath && item.depth===node.depth),index=siblings.indexOf(node),fan=node.depth===0?0:(index-(siblings.length-1)/2)*.55;
            let best=null,bestCost=Infinity;
            for(let ring=0;ring<32;ring++)for(let turn=0;turn<13;turn++){
                const direction=angle+fan+(turn%2?1:-1)*Math.ceil(turn/2)*.13,distance=KNOWLEDGE_VISUALS.groupGap+ring*.28;
                const candidate={x:parent.x+Math.cos(direction)*distance,y:parent.y+Math.sin(direction)*distance};
                if(occupied.some(p=>overlaps(candidate,p)))continue;
                const cost=ring*4+turn*.15+Math.hypot(candidate.x,candidate.y)*.08;
                if(cost<bestCost){best=candidate;bestCost=cost;}
            }
            position=best || {x:parent.x+Math.cos(angle)*3.2,y:parent.y+Math.sin(angle)*3.2};state.positions[node.path]=position;
        }
        placed.set(node.path,position);if(!occupied.some(p=>p.path===node.path))occupied.push({...position,path:node.path});
        const pixel={x:position.x*cell,y:position.y*cell},parentPixel={x:parent.x*cell,y:parent.y*cell},visual=point(pixel);
        out.push({...node,position:visual,fixedPosition:visual,parentPosition:point(parentPixel),layoutCenterPosition:{x:50,y:50},layoutScale:1,layoutCellWidthPercent:cell/width*100,layoutCellHeightPercent:metrics.cellHeightPixels/height*100,layoutCellWidthPixels:cell,layoutCellHeightPixels:metrics.cellHeightPixels,knowledgeLocal:position,contextual:state.context && activeRoot && rootOf(node)!==activeRoot && node.depth===0});
    }
    state.visiblePaths=out.map(node=>node.path);return out;
}
