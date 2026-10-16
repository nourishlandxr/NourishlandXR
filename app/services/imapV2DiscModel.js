import {validateSharedProject} from './sharedProjectContract.js';
import {normalizeImapV2TerrainEdits} from './imapV2Terrain.js';
import {normalizeImapV2Elements} from './imapV2Elements.js';
import {createContourTerrainGrid} from './imapElevationSource.js';
import {projectGeographicMapContext} from './creatorProjectGeography.js';

export const IMAP_V2_DISC_RADIUS=6.3;
export const IMAP_V2_AREAS_PER_DISC=5;
export const IMAP_V2_SIZE_RANGE=Object.freeze({min:.75,max:1.3});
const ORBS_PER_AREA=4;
const NOTES_PER_AREA=1;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const finite=value=>typeof value==='number' && Number.isFinite(value);
const terrainStyles=new Set(['clean','contour-sketch','slope-sketch','water-sketch']);
const sourcedTerrainCache=new Map();
const areaKey=area=>JSON.stringify(['area',area.projectId,area.siteId,area.id]);
const markerPosition=(center,index,total)=>{
    const angle=-Math.PI*.7+index*Math.PI*1.4/Math.max(1,total-1);
    return {x:center.x+Math.cos(angle)*.62,z:center.z+Math.sin(angle)*.62};
};
const recordPosition=(record,center,index,total,overrides)=>{
    const saved=overrides.positions?.[record.id];
    if(!finite(saved?.dx)||!finite(saved?.dz))return markerPosition(center,index,total);
    const length=Math.hypot(saved.dx,saved.dz),scale=length>.9?.9/length:1;
    return {x:Number((center.x+saved.dx*scale).toFixed(3)),z:Number((center.z+saved.dz*scale).toFixed(3))};
};

// Fixed disc slots preserve the shape and scale of the existing grippable
// circular miniature. Additional Areas open on another disc page for the Site.
const slots={
    1:[[0,0]],
    2:[[-2.4,0],[2.4,0]],
    3:[[0,2.45],[-2.55,-1.35],[2.55,-1.35]],
    4:[[-2.65,2.1],[2.65,2.1],[-2.65,-2.1],[2.65,-2.1]],
    5:[[0,0],[-2.8,2.1],[2.8,2.1],[-2.8,-2.1],[2.8,-2.1]]
};

function areaPosition(area,slot,overrides){
    const saved=overrides.positions?.[areaKey(area)];
    if(!finite(saved?.x)||!finite(saved?.z))return {x:slot[0],z:slot[1],source:'generated'};
    const length=Math.hypot(saved.x,saved.z);
    const scale=length>4.5?4.5/length:1;
    return {x:Number((saved.x*scale).toFixed(3)),z:Number((saved.z*scale).toFixed(3)),source:'layout override'};
}

function sourcedTerrainFor(mapData){
    if(mapData?.status!=='sourced'||!Array.isArray(mapData.features)||!mapData.features.length)return null;
    const key=[mapData.originKey,mapData.retrievedAt,mapData.source].join('|');
    if(sourcedTerrainCache.has(key))return sourcedTerrainCache.get(key);
    const terrain=createContourTerrainGrid(mapData.features,mapData.bounds,{radius:IMAP_V2_DISC_RADIUS});
    sourcedTerrainCache.set(key,terrain);
    while(sourcedTerrainCache.size>8)sourcedTerrainCache.delete(sourcedTerrainCache.keys().next().value);
    return terrain;
}

function buildImapV2DiscModel(snapshot,{siteId='',page=0,overrides={},geographicMap=null}={}){
    const sites=snapshot.sites.map(site=>({id:site.id,name:site.name,projectId:site.projectId}));
    const site=sites.find(item=>item.id===siteId)||sites[0]||null;
    const siteAreas=snapshot.areas.filter(area=>area.siteId===site?.id).sort((a,b)=>a.id.localeCompare(b.id));
    const pageCount=Math.max(1,Math.ceil(siteAreas.length/IMAP_V2_AREAS_PER_DISC));
    const selectedPage=clamp(Number.isInteger(page)?page:0,0,pageCount-1);
    const pageAreas=siteAreas.slice(selectedPage*IMAP_V2_AREAS_PER_DISC,(selectedPage+1)*IMAP_V2_AREAS_PER_DISC);
    const positions=slots[pageAreas.length]||[];
    const areas=pageAreas.map((area,index)=>{
        const center=areaPosition(area,positions[index],overrides);
        const records=snapshot.records.filter(record=>record.siteId===area.siteId&&record.areaId===area.id)
            .sort((a,b)=>a.id.localeCompare(b.id));
        const totemRecord=records.find(record=>record.kind==='area_checkpoint')||null;
        const orbs=records.filter(record=>record.kind==='plant');
        const notes=records.filter(record=>record.kind==='note');
        const other=records.filter(record=>!['area_checkpoint','plant','note'].includes(record.kind));
        const visible=[...orbs.slice(0,ORBS_PER_AREA),...notes.slice(0,NOTES_PER_AREA)];
        const nodes=visible.map((record,i)=>({key:record.id,recordId:record.recordId,areaKey:areaKey(area),type:record.kind==='plant'?'orb':'note',name:record.title,...recordPosition(record,center,i,visible.length,overrides)}));
        return {key:areaKey(area),id:area.id,siteId:area.siteId,name:area.name,
            center:{x:center.x,z:center.z},positionSource:center.source,radius:1.28,
            totem:totemRecord?{key:totemRecord.id,recordId:totemRecord.recordId,type:'totem',name:totemRecord.title,x:center.x,z:center.z}:null,
            nodes,counts:{totems:records.filter(record=>record.kind==='area_checkpoint').length,orbs:orbs.length,notes:notes.length,other:other.length},
            hiddenCount:Math.max(0,orbs.length-ORBS_PER_AREA)+Math.max(0,notes.length-NOTES_PER_AREA)+other.length};
    });
    const shape=overrides.shape==='square'?'square':'circular';
    const sizeScale=clamp(finite(overrides.sizeScale)?overrides.sizeScale:1,IMAP_V2_SIZE_RANGE.min,IMAP_V2_SIZE_RANGE.max);
    // Decorative Creator placements are a presentation layer. Real Sites,
    // Areas, Totems, Orbs and Notes remain generated from the shared snapshot.
    // Keep coordinates square-bounded so a feature hidden by round clipping
    // returns to the same place if the author switches back to square.
    const elements=normalizeImapV2Elements(overrides.elements,{shape:'square',radius:IMAP_V2_DISC_RADIUS});
    const mapData=geographicMap?.mapData;
    const sourcedTerrain=sourcedTerrainFor(mapData);
    return {kind:'imap-v2-disc',project:{id:snapshot.project.id,name:snapshot.project.name},revision:snapshot.revision,
        sites,site,page:selectedPage,pageCount,areas,elements,geographicMap,
        // The same persisted project map package feeds flat and disc layouts.
        // Only its contour features become IMAP's local terrain; layout and
        // terrain-edit overrides remain an independent presentation layer.
        elevationGrid:sourcedTerrain?.grid||null,terrainFeatures:sourcedTerrain?.contourLines||[],
        disc:{radius:IMAP_V2_DISC_RADIUS,shape,sizeScale,sizeRange:IMAP_V2_SIZE_RANGE,
            terrain:{mode:sourcedTerrain?'contour-interpolated':'illustrative-sculpt',style:terrainStyles.has(overrides.terrainStyle)?overrides.terrainStyle:'clean',
                source:sourcedTerrain?mapData.source:'',bounds:sourcedTerrain?mapData.bounds:null,
                elevation:sourcedTerrain?sourcedTerrain.elevation:null,quality:sourcedTerrain?mapData.quality:'schematic',
                edits:normalizeImapV2TerrainEdits(overrides.terrainEdits,{radius:IMAP_V2_DISC_RADIUS,shape:'square'}),verified:false,gridSegments:64},
            grip:shape==='square'?'opposite edge handles':'opposite rim handles'},
        // A shared-project snapshot currently has no validated Area-route field.
        // The renderer must not draw paths or imply walkable routes from proximity.
        links:[],
        summary:{sites:sites.length,areas:siteAreas.length,totems:snapshot.records.filter(record=>record.siteId===site?.id&&record.kind==='area_checkpoint').length,
            orbs:snapshot.records.filter(record=>record.siteId===site?.id&&record.kind==='plant').length,records:snapshot.records.filter(record=>record.siteId===site?.id).length}};
}

export function createImapV2DiscModel(snapshot,options={}){
    validateSharedProject(snapshot,snapshot?.project?.id);
    return buildImapV2DiscModel(snapshot,options);
}

// Draft Creator projects are not part of the visitor-only shared snapshot.
// Project their authoring workspace through the same disc layout without
// copying or publishing it into the public read contract.
export function createCreatorImapV2DiscModel(workspace,{siteId='',page=0,overrides={}}={}){
    const project=workspace?.project;
    if(!project?.id)throw new Error('Creator project data is required to build its IMAP.');
    const sites=(workspace.sites||[]).map(site=>({id:site.id,name:String(site.name||site.id),description:String(site.description||''),projectId:project.id}));
    const areas=(workspace.areas||[]).filter(area=>area.systemKey!=='home'&&!['home','unassigned'].includes(String(area.name||'').trim().toLowerCase()))
        .map(area=>({id:area.id,name:String(area.name||area.id),description:String(area.description||''),projectId:project.id,siteId:area.siteId}));
    const areaIds=new Set(areas.map(area=>JSON.stringify([area.siteId,area.id])));
    const records=(workspace.entries||[]).filter(entry=>areaIds.has(JSON.stringify([entry.siteId,entry.place.id]))).map(entry=>{
        const marker=entry.marker,kind=marker.semantic_type==='area_checkpoint'||marker.type==='area_checkpoint'?'area_checkpoint'
            :marker.type==='plant'?'plant':marker.type==='note'?'note':String(marker.semantic_type||marker.type||'record');
        return {id:JSON.stringify([project.id,entry.siteId,entry.place.id,marker.id]),recordId:marker.id,markerId:marker.id,
            title:String(marker.name||marker.commonName||marker.id),kind,knowledgeId:String(marker.plantId||marker.plant_id||''),
            description:String(marker.description||''),scientificName:String(marker.scientificName||''),profile:{},
            projectId:project.id,siteId:entry.siteId,areaId:entry.place.id};
    });
    const snapshot={schemaVersion:1,contract:'nourishland.creator-map-source',revision:`local:${project.modified||'draft'}`,
        project:{id:project.id,name:String(project.name||project.id),description:String(project.description||'')},sites,areas,records};
    return buildImapV2DiscModel(snapshot,{siteId,page,overrides,geographicMap:projectGeographicMapContext(project)});
}

// Adapter for createImapV2Landscape3D.setData(); use the same saved mapData
// that the flat Creator view receives, while leaving hand-authored elements
// and terrain edits layered over the generated base.
export function toImapV2LandscapeInput(model){
    const generated=[];
    for(const area of model.areas){
        const points=Array.from({length:13},(_,index)=>{const angle=index/12*Math.PI*2;return {x:Number((area.center.x+Math.cos(angle)*area.radius).toFixed(3)),z:Number((area.center.z+Math.sin(angle)*area.radius).toFixed(3))};});
        generated.push({id:`area-outline:${area.id}`,type:'area-boundary',name:area.name,points,size:.55});
        if(area.totem)generated.push({id:area.totem.key,type:'totem',name:area.totem.name,x:area.totem.x,z:area.totem.z,size:.9});
        for(const node of area.nodes)generated.push({id:node.key,type:node.type==='orb'?'orb':node.type==='note'?'note':'sub-checkpoint',name:node.name,x:node.x,z:node.z,size:.62});
    }
    return {shape:model.disc.shape,sizeScale:model.disc.sizeScale,terrainEdits:model.disc.terrain.edits,
        ...(model.elevationGrid?{elevationGrid:model.elevationGrid}:{}),
        elements:[...generated,...model.elements,...model.terrainFeatures]};
}
