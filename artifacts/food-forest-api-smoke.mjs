import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {normalizeFoodForestStudy} from '../app/services/foodForestV3Model.js';
import {foodForestBoundary} from '../app/services/foodForestBoardModel.js';
const workspace=fs.mkdtempSync(path.resolve('artifacts/forest-api-')),project=path.join(workspace,'garden');fs.mkdirSync(project);fs.writeFileSync(path.join(project,'project.json'),JSON.stringify({id:'garden',name:'Classroom fixture',visibility:'private'}));
const child=spawn(process.execPath,['dist/xr-api/server.mjs'],{env:{...process.env,PORT:'0',HOST:'127.0.0.1',NODE_ENV:'development',NOURISHLAND_WORKSPACE_DIR:workspace,NOURISHLAND_ACCESS_FILE:'',NOURISHLAND_CREATOR_PASSWORD:'',NOURISHLAND_SESSION_SECRET:''},stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);
try{
    const origin=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{clearInterval(check);reject(Error(output||'API startup timed out'));},20000),check=setInterval(()=>{const match=output.match(/listening on (http:\/\/127\.0\.0\.1:\d+)/);if(match){clearTimeout(timer);clearInterval(check);resolve(match[1]);}},100);child.once('exit',code=>{if(code){clearTimeout(timer);clearInterval(check);reject(Error(output));}});});
    const board=normalizeFoodForestStudy({widthM:20,depthM:12,boundary:foodForestBoundary(),pieces:[],wishlist:['private-collection']}),url=origin+'/api/projects/garden/forest-boards/classroom';
    const put=expectedVersion=>fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Nourishland-Creator':'1'},body:JSON.stringify({board,expectedVersion})});
    let response=await put(0);assert.equal(response.status,201,await response.text());response=await fetch(url);const saved=await response.json();assert.equal(saved.version,1);assert.deepEqual(saved.board.wishlist,[]);
    response=await put(0);assert.equal(response.status,409);response=await put(1);assert.equal(response.status,200);assert.equal((await response.json()).version,2);
    response=await fetch(url+'?view=visitor');assert.ok([401,403].includes(response.status));console.log('Built API: startup, shared save/load, private collections, stale revision rejection and visitor denial passed.');
}finally{child.kill();}
