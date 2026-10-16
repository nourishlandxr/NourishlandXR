// Flat Creator planning-map experiment retained separately from the circular
// spatial IMAP. It is not mounted in the current dashboard.
import { projectGeographicMapContext } from './creatorProjectGeography.js';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const point=(value,fallback)=>value!==null && value!==undefined && value!=='' && Number.isFinite(Number(value))?Number(value):fallback;
export const planningMapAreaKey=(projectId,siteId,areaId)=>JSON.stringify(['area',projectId,siteId,areaId]);
export const planningMapRecordKey=(projectId,siteId,areaId,recordId)=>JSON.stringify(['record',projectId,siteId,areaId,recordId]);

// Creator input is already loaded behind the authoring API. Generate map
// content from it on every open; saved planning data contains presentation only.
export function createCreatorPlanningMapV2Model(workspace,siteId,positions={}){
    const project=workspace.project;
    const sites=workspace.sites.map(site=>({id:site.id,name:site.name || site.id}));
    const selectedSite=sites.find(site=>site.id===siteId) || sites[0] || null;
    const sourceAreas=workspace.areas.filter(area=>area.siteId===selectedSite?.id && area.systemKey!=='home' && !['home','unassigned'].includes(String(area.name || '').trim().toLowerCase()));
    const height=Math.max(620,210+Math.ceil(sourceAreas.length/4)*205);
    const areas=sourceAreas.map((area,index)=>{
        const key=planningMapAreaKey(project.id,area.siteId,area.id);
        const saved=positions[key];
        const prior=project.siteMap?.areaPoints?.[area.siteId+'/'+area.id] || project.siteMap?.areaPoints?.[area.id];
        const row=Math.floor(index/4),column=index%4,rowCount=Math.min(4,sourceAreas.length-row*4);
        const fallback={x:500+(column-(rowCount-1)/2)*225,y:195+row*205};
        const priorPoint=prior?{x:point(prior.x,50)*10,y:point(prior.y,50)*height/100}:null;
        const basis=priorPoint || fallback;
        return {key,id:area.id,siteId:area.siteId,name:area.name || 'Unnamed Area',x:clamp(point(saved?.x,basis.x),115,885),y:clamp(point(saved?.y,basis.y),130,height-115),positionSource:saved?'planning layout':priorPoint?'site plan':'automatic'};
    });
    const areaById=new Map(areas.map(area=>[area.id,area]));
    const entries=workspace.entries.filter(entry=>entry.siteId===selectedSite?.id && areaById.has(entry.place.id));
    const counts=new Map();
    const records=entries.map(entry=>{
        const area=areaById.get(entry.place.id),marker=entry.marker;
        const key=planningMapRecordKey(project.id,entry.siteId,entry.place.id,marker.id);
        const order=counts.get(area.key)||0;counts.set(area.key,order+1);
        const row=Math.floor(order/4),column=order%4;
        const saved=positions[key];
        const anchor=workspace.anchors?.[entry.key];
        const geographicAnchor=anchor?.type==='gps'&&Number.isFinite(Number(anchor.latitude))&&Number.isFinite(Number(anchor.longitude))
            ?{type:'gps',latitude:Number(anchor.latitude),longitude:Number(anchor.longitude)}:null;
        return {key,id:marker.id,areaKey:area.key,areaId:area.id,siteId:entry.siteId,name:marker.name || 'Untitled record',kind:marker.semantic_type==='area_checkpoint'?'area_checkpoint':marker.type || 'record',
            dx:clamp(point(saved?.dx,-68+column*44),-78,78),dy:clamp(point(saved?.dy,5+row*33),-43,60),positionSource:saved?'planning layout':'automatic',geographicAnchor};
    });
    const summary={sites:sites.length,areas:workspace.areas.filter(area=>area.systemKey!=='home' && !['home','unassigned'].includes(String(area.name || '').trim().toLowerCase())).length,
        totems:workspace.entries.filter(entry=>entry.marker.semantic_type==='area_checkpoint'||entry.marker.type==='area_checkpoint').length,
        orbs:workspace.entries.filter(entry=>entry.marker.type==='plant').length,records:workspace.entries.length};
    return {project,sites,selectedSite,areas,records,height,summary,offline:workspace.offline,
        // Terrain/provenance is shared project data; area positions above stay
        // in their separate authoring layer and survive map refreshes.
        geographicMap:projectGeographicMapContext(project)};
}
