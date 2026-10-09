import {limoIsPlant} from './limoProjectLearning.js';
async function concurrent(items,worker){
 const values=new Array(items.length);let cursor=0;
 await Promise.all(Array.from({length:Math.min(6,items.length)},async()=>{while(cursor<items.length){const index=cursor++;values[index]=await worker(items[index]);}}));return values;
}
// Whole Project means every returned Site, not merely the first Site.
export async function loadLimoProjectContext(projectId,{visitor=false,api}={}){
 api ||= await import('./persistence.js');
 const project=await api.loadProject(projectId,visitor);
 if(!project)throw new Error('This Project could not be loaded.');
 const sites=await api.loadProjectSites(projectId,visitor),warnings=[];
 const areaGroups=await concurrent(sites,async site=>{
  try{return (await api.loadSitePlaces(projectId,site.id,visitor)).map(area=>({...area,siteId:site.id,siteName:site.name || site.id}));}
  catch(error){warnings.push(`Site ${site.name || site.id}: ${error.message}`);return [];}
 });
 const areas=areaGroups.flat();
 const groups=await concurrent(areas,async area=>{
  try{return (await api.loadPlaceMarkers(projectId,area.siteId,area.id,visitor)).map(marker=>({projectId,siteId:area.siteId,areaId:area.id,areaName:area.name || area.id,marker,profile:marker.plant_profile || {}}));}
  catch(error){warnings.push(`Area ${area.name || area.id}: ${error.message}`);return [];}
 });
 const entries=groups.flat();
 await concurrent(entries.filter(limoIsPlant),async entry=>{
  try{entry.profile=await api.loadPlantProfile(projectId,entry.siteId,entry.areaId,entry.marker.id,visitor) || entry.profile;}
  catch(error){warnings.push(`Profile ${entry.marker.name || entry.marker.id}: ${error.message}`);}
 });
 return {projectId,name:project.name || projectId,sites,areas,entries,warnings,loadedAt:new Date().toISOString(),illustrative:false};
}
export function limoProjectNote(record){
 return {name:`LIMO · ${record.title}`,type:'note',status:'draft',visibility:'draft',
  description:[`${record.kind.toUpperCase()} · ${record.state}`,`Question: ${record.question}`,`Recorded: ${record.createdAt}`,`Target: ${record.targetName || record.areaName}`,`Answer: ${record.answer || 'Not assessed'}`,record.plan && `Plan: ${record.plan}`,record.care && `Care: ${record.care}`,`Review: ${record.reviewAt}`,record.history?.length && `Review history: ${record.history.map(item=>`${item.at}: ${item.answer}`).join('; ')}`].filter(Boolean).join('\n'),
  appearance:{limo:{version:1,...record}}};
}
export async function publishLimoRecord(record,{api}={}){
 if(!record.projectId || !record.siteId || !record.areaId)throw new Error('Choose a specific Area before saving a Project Note.');
 api ||= await import('./persistence.js');
 return api.createPlaceMarker(record.projectId,record.siteId,record.areaId,limoProjectNote(record));
}
