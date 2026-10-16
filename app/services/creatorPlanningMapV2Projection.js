// Flat planning-map projection experiment; spatial IMAP uses imapV2DiscModel.
import {validateSharedProject} from './sharedProjectContract.js';

const areaSlots=[{x:300,y:310},{x:700,y:310},{x:500,y:115},{x:500,y:505},{x:145,y:115},{x:855,y:505}];
const recordSlots=[{dx:-70,dy:-16},{dx:18,dy:28},{dx:75,dy:-27},{dx:-25,dy:59},{dx:80,dy:57},{dx:-78,dy:61}];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const areaKey=area=>JSON.stringify(['area',area.projectId,area.siteId,area.id]);

// This is a conceptual projection over a validated public snapshot. The
// caller's input boundary owns publication filtering and creator permissions.
export function createCreatorPlanningMapV2Projection(snapshot,overrides={}){
    validateSharedProject(snapshot,snapshot?.project?.id);
    const positions=overrides.positions && typeof overrides.positions==='object'?overrides.positions:{};
    const sites=snapshot.sites.map(site=>({...site,key:JSON.stringify(['site',site.projectId,site.id])}));
    const areas=snapshot.areas.map((area,index)=>{
        const key=areaKey(area),slot=areaSlots[index] || {x:185+(index%3)*315,y:165+(Math.floor(index/3)%2)*290};
        const saved=positions[key] || {};
        return {...area,key,x:clamp(finite(saved.x,slot.x),140,860),y:clamp(finite(saved.y,slot.y),125,505),positionSource:saved.x!==undefined && saved.y!==undefined?'custom':'generated'};
    });
    const byArea=new Map(areas.map(area=>[JSON.stringify([area.siteId,area.id]),area]));
    const areaCounts=new Map();
    const records=snapshot.records.map(record=>{
        const parent=byArea.get(JSON.stringify([record.siteId,record.areaId]));
        const count=areaCounts.get(parent.key) || 0;areaCounts.set(parent.key,count+1);
        const slot=recordSlots[count%recordSlots.length],ring=Math.floor(count/recordSlots.length);
        const saved=positions[record.id] || {};
        return {...record,key:record.id,areaKey:parent.key,dx:clamp(finite(saved.dx,slot.dx+ring*10),-100,100),dy:clamp(finite(saved.dy,slot.dy+ring*10),-65,70),positionSource:saved.dx!==undefined && saved.dy!==undefined?'custom':'generated'};
    });
    const byKind=kind=>records.filter(record=>record.kind===kind).length;
    return {project:snapshot.project,revision:snapshot.revision,sites,areas,records,summary:{sites:sites.length,areas:areas.length,totems:byKind('area_checkpoint'),orbs:byKind('plant'),notes:byKind('note'),records:records.length}};
}
