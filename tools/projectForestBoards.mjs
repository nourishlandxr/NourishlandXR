import path from 'node:path';
import {projectRole} from './projectAccess.mjs';
import {normalizeFoodForestStudy} from '../app/services/foodForestV3Model.js';
export function handleProjectForestBoards(req,res,pathname,{visitor,access,sendJson,readRequestJson,readJson,writeJson,getProjectPath}){
    const match=pathname.match(/^\/api\/projects\/([A-Za-z0-9_-]{1,160})\/forest-boards\/([A-Za-z0-9_-]{1,100})$/);if(!match)return false;
    const [,projectId,id]=match,file=path.join(getProjectPath(projectId),'forest-boards.json');
    const permitted=()=>!visitor&&projectRole(access.identity(req),projectId);
    if(!permitted())return sendJson(res,access.identity(req)?403:401,{error:'Project membership required.'});
    if(!readJson(path.join(getProjectPath(projectId),'project.json'),null))return sendJson(res,404,{error:'Project not found.'});
    const store=()=>{const data=readJson(file,{schemaVersion:1,entries:[]});if(data.schemaVersion!==1||!Array.isArray(data.entries))throw Error('Invalid saved forest boards.');return data;};
    if(req.method==='GET'){const entry=store().entries.find(e=>e.id===id);return sendJson(res,entry?200:404,entry||{error:'Shared board not found. Save a new board first.'});}
    if(req.method!=='PUT')return sendJson(res,405,{error:'Unsupported forest board action.'});
    readRequestJson(req,(error,data)=>{
        if(error)return sendJson(res,error.statusCode||400,{error:error.message});
        try{
            if(!permitted())return sendJson(res,403,{error:'Project permission changed.'});
            if(!readJson(path.join(getProjectPath(projectId),'project.json'),null))return sendJson(res,404,{error:'Project not found.'});
            const current=store(),previous=current.entries.find(e=>e.id===id);
            if(!Number.isSafeInteger(data.expectedVersion)||data.expectedVersion!==(previous?.version||0))return sendJson(res,409,{error:'Shared forest changed. Load the latest revision before saving.',version:previous?.version||0});
            if(!previous&&current.entries.length>=50)throw Error('Project forest board library is full.');
            const board=normalizeFoodForestStudy(data.board);board.wishlist=[];
            const entry={id,projectId,version:(previous?.version||0)+1,board,updatedBy:access.identity(req).id,updatedAt:new Date().toISOString()};
            writeJson(file,{schemaVersion:1,entries:[...current.entries.filter(e=>e.id!==id),entry]});return sendJson(res,previous?200:201,entry);
        }catch(failure){return sendJson(res,400,{error:failure.message});}
    });return true;
}
