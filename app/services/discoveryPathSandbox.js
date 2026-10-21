import {validateTour} from './tourModel.js';
const KEY='nlxr.discovery-path-sandbox.v1';
export function discoverySandboxModel(){
    const place={id:'garden',name:'Practice garden',siteId:'sample-site'},site={id:'sample-site',name:'Sample site'};
    return {project:{id:'discovery-sandbox',name:'Practice garden'},sites:[site],areas:[place],entries:[['ginger','Ginger clump','plant'],['apple','Apple tree','plant'],['welcome','Entrance Totem','area_checkpoint'],['observation','Observation Note','note']].map(([id,name,type])=>({siteId:site.id,place,marker:{id,name,type,description:'Sample feature for testing the guide editor.'}})),offline:false};
}
export function createSandboxTourRequest(storage=globalThis.localStorage){
    return async(projectId,{id='',action='',body}={})=>{
        let entries=JSON.parse(storage.getItem(KEY)||'[]');
        if(!Array.isArray(entries))throw Error('Practice storage is unavailable.');
        if(!body)return {entries,role:'editor'};
        if(action)throw Error('Practice paths cannot be published.');
        validateTour(body.tour);if(body.tour.projectId!==projectId || projectId!=='discovery-sandbox' || body.tour.id!==id)throw Error('Practice path identity changed.');
        const previous=entries.find(entry=>entry.draft.id===id);if((previous?.version||0)!==body.expectedVersion)throw Error('This practice path changed in another tab. Reopen it before saving.');
        const entry={draft:structuredClone(body.tour),version:(previous?.version||0)+1,published:null};entries=[...entries.filter(item=>item.draft.id!==id),entry];storage.setItem(KEY,JSON.stringify(entries));return entry;
    };
}
