import path from 'node:path';
import {validateTour,checkTour,visitorTour,tourRefKey} from '../app/services/tourModel.js';
import {projectRole} from './projectAccess.mjs';

export function handleProjectTours(req,res,pathname,{visitor,access,sendJson,readRequestJson,readJson,writeJson,getProjectPath,publicSnapshot}){
    const match=pathname.match(/^\/api\/projects\/([^/]+)\/tours(?:\/([^/]+)(?:\/(publish|unpublish))?)?$/);if(!match)return false;
    const projectId=decodeURIComponent(match[1]),id=match[2]&&decodeURIComponent(match[2]),action=match[3];
    if(!/^[A-Za-z0-9_-]{1,160}$/.test(projectId)||id&&!/^[A-Za-z0-9_-]{1,160}$/.test(id)){sendJson(res,400,{error:'Invalid tour identity.'});return true;}
    const file=path.join(getProjectPath(projectId),'tours.json'),identity=access.identity(req),role=projectRole(identity,projectId);
    if(!visitor&&!role){sendJson(res,identity?403:401,{error:'Project membership required.'});return true;}
    if(!readJson(path.join(getProjectPath(projectId),'project.json'),null)){sendJson(res,404,{error:'Project not found.'});return true;}
    const read=()=>{const store=readJson(file,{schemaVersion:1,entries:[]});if(store.schemaVersion!==1||!Array.isArray(store.entries))throw Error('Invalid tour library.');const seen=new Set();for(const entry of store.entries){validateTour(entry.draft);if(entry.draft.projectId!==projectId||seen.has(entry.draft.id)||!Number.isSafeInteger(entry.version)||entry.version<1)throw Error('Invalid saved tour.');seen.add(entry.draft.id);if(entry.published){validateTour(entry.published);if(entry.published.projectId!==projectId||entry.published.id!==entry.draft.id)throw Error('Invalid published tour.');}}return store;};
    const visible=(tour,snapshot)=>snapshot&&snapshot.sites.some(site=>site.id===tour.siteId)&&tour.stops.every(stop=>stop.targets.every(ref=>ref.kind==='area'?snapshot.areas.some(area=>area.siteId===ref.siteId&&area.id===ref.areaId):snapshot.records.some(record=>record.siteId===ref.siteId&&record.areaId===ref.areaId&&(record.markerId||record.recordId)===ref.recordId)));
    const publicRecords=(tour,snapshot)=>{
        const refs=new Set(tour.stops.flatMap(stop=>stop.targets.map(tourRefKey)));
        return [...snapshot.records.filter(record=>refs.has(tourRefKey({siteId:record.siteId,areaId:record.areaId,recordId:record.markerId||record.recordId}))).map(record=>({ref:{siteId:record.siteId,areaId:record.areaId,recordId:record.markerId||record.recordId},specimenId:record.recordId,title:record.title,description:record.description,areaName:snapshot.areas.find(area=>area.siteId===record.siteId&&area.id===record.areaId)?.name||'',type:record.kind,archived:false})),...snapshot.areas.filter(area=>refs.has(tourRefKey({siteId:area.siteId,areaId:area.id,recordId:area.id,kind:'area'}))).map(area=>({ref:{siteId:area.siteId,areaId:area.id,recordId:area.id,kind:'area'},title:area.name,description:area.description,areaName:area.name,type:'area',archived:false}))];
    };
    try{
        if(req.method==='GET'&&!action){
            const store=read();if(!visitor){sendJson(res,200,{entries:store.entries,role});return true;}
            const snapshot=publicSnapshot(projectId);if(!snapshot){sendJson(res,404,{error:'Public project not found.'});return true;}
            const entries=store.entries.filter(entry=>entry.published&&visible(entry.published,snapshot));
            if(!id){sendJson(res,200,{tours:entries.map(entry=>({id:entry.published.id,title:entry.published.title,description:entry.published.description,stopCount:entry.published.stops.length}))});return true;}
            const entry=entries.find(entry=>entry.published.id===id);sendJson(res,entry?200:404,entry?{tour:visitorTour(entry.published),revision:entry.publishedRevision,records:publicRecords(entry.published,snapshot)}:{error:'Published tour not found.'});return true;
        }
        if(!id||(action?req.method!=='POST':req.method!=='PUT')){sendJson(res,405,{error:'Unsupported tour action.'});return true;}
        if(visitor||role!=='admin'){sendJson(res,403,{error:'Project administrator required.'});return true;}
        readRequestJson(req,(error,data)=>{
            if(error)return sendJson(res,error.statusCode||400,{error:error.message});
            try{
                if(projectRole(access.identity(req),projectId)!=='admin')return sendJson(res,403,{error:'Project permission changed.'});
                const store=read(),old=store.entries.find(entry=>entry.draft.id===id);
                if(!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion!==(old?.version||0))return sendJson(res,409,{error:'This tour changed elsewhere. Reload it before saving.',version:old?.version||0});
                if(action&&!old)return sendJson(res,404,{error:'Tour not found.'});
                const entry=old?{...old}:{version:0,published:null};
                if(!action){validateTour(data.tour);if(data.tour.projectId!==projectId||data.tour.id!==id)throw Error('Tour identity does not match its route.');if(!old&&store.entries.length>=100)throw Error('Tour library is full.');entry.draft=data.tour;}
                else if(action==='publish'){
                    const snapshot=publicSnapshot(projectId);if(!visible(entry.draft,snapshot))throw Error('Publish the Site, Areas and referenced features before publishing this tour.');
                    const issues=checkTour(entry.draft,publicRecords(entry.draft,snapshot));if(issues.length)throw Error(issues[0].message);
                    entry.published=structuredClone(entry.draft);entry.publishedRevision=entry.version+1;
                }else entry.published=null;
                entry.version++;entry.updatedAt=new Date().toISOString();
                writeJson(file,{schemaVersion:1,entries:[...store.entries.filter(item=>item.draft.id!==id),entry]});return sendJson(res,200,entry);
            }catch(failure){sendJson(res,400,{error:failure.message});}
        });return true;
    }catch(error){sendJson(res,400,{error:error.message});return true;}
}
