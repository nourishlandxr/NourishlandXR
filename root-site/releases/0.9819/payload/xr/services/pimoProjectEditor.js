import {loadCreatorWorkspace,entryProfile,saveWorkspaceRecord} from "./creatorWorkspaceData.js?v=0.9819";
import {resolvePlantPim} from "./pimLegacyAdapter.js?v=0.9819";
import {pimoGraphForPlant,pimoGraphDocument} from "./pimoGraphDocument.js?v=0.9819";
import {renderPimoEditor} from "../screens/pimoEditor.js?v=0.9819";
export async function renderProjectPimoEditor(host,options){
 host.textContent='Loading plant knowledge…';
 try{
  const model=await loadCreatorWorkspace(options.projectId),entry=model.entries.find(e=>e.key===options.recordKey&&(!options.siteId||e.siteId===options.siteId));
  if(!entry||entry.marker.type!=='plant')throw Error('Choose a plant from Project knowledge to open its honeycomb.');
  const profile=await entryProfile(model,entry);let original=resolvePlantPim(profile,{id:entry.marker.plantId||entry.marker.id,commonName:profile.common_name||entry.marker.name,scientificName:profile.scientific_name||''});
  return renderPimoEditor(host,{...options,document:pimoGraphForPlant(original),linkedPlantName:entry.marker.name,onSave:async graph=>{
   if(model.offline)throw Error('Reconnect before saving to the plant. Export your draft before leaving.');
   const document=pimoGraphDocument(graph),previous=new Map(original.nodes.map(n=>[n.id,n]));
   for(const node of document.nodes){const old=previous.get(node.id);if(!old||['title','body','preview','attribution','safetyNote','parentId'].some(key=>(old[key]||'')!==(node[key]||''))||JSON.stringify(old.sourceIds||[])!==JSON.stringify(node.sourceIds||[]))node.status='draft';}
   await saveWorkspaceRecord(model,entry,{profileChanges:{pim_document:document,profile_enabled:true,spm_enabled:true}});original=document;
  }});
 }catch(error){host.replaceChildren();const message=document.createElement('p');message.setAttribute('role','alert');message.textContent=error.message;host.append(message);return {destroy(){host.replaceChildren();}};}
}
