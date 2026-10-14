import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createChecklist, parseChecklist } from '../app/services/checklistContract.js';
import { validatePublishedChecklists } from '../app/services/publishedChecklistContract.js';
import { checklistProgress, setChecklistStep } from '../app/services/checklistStore.js';
import { hashProjectPassword } from '../tools/projectAccess.mjs';

test('project roles, reviewed publication, conflicts and revocation are enforced by the production API', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(),'nl-publishing-'));
    const workspace = path.join(directory,'workspace'), registryFile = path.join(directory,'private','users.json');
    const write = (file,value) => { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,JSON.stringify(value)); };
    const fixture = (file,value) => write(path.join(workspace,file),value);
    fixture('p/project.json',{id:'p',name:'Public project',visibility:'public'});
    fixture('other/project.json',{id:'other',name:'Other project',visibility:'draft'});
    fixture('p/sites/s/site.json',{id:'s',visibility:'public'});
    fixture('p/sites/s/places/a/place.json',{id:'a',visibility:'public'});
    fixture('p/sites/s/places/a/markers/checkpoint/marker.json',{id:'checkpoint',type:'area_checkpoint',visibility:'public'});
    const password = 'test-only-long-password';
    const passwordHash = await hashProjectPassword(password);
    const registry = { schemaVersion:1,users:[
        {id:'editor',passwordHash,sessionVersion:1,disabled:false,projects:{p:'editor'}},
        {id:'admin',passwordHash,sessionVersion:1,disabled:false,projects:{p:'admin'}},
        {id:'outsider',passwordHash,sessionVersion:1,disabled:false,projects:{other:'admin'}}
    ]};
    write(registryFile,registry);
    const child=spawn(process.execPath,['tools/persistence-server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,NODE_ENV:'production',PORT:'0',HOST:'127.0.0.1',NOURISHLAND_WORKSPACE_DIR:workspace,NOURISHLAND_ACCESS_FILE:registryFile,NOURISHLAND_SESSION_SECRET:'test-only-secret-at-least-32-characters',NOURISHLAND_CREATOR_PASSWORD:'test-only-bootstrap',NOURISHLAND_CREATOR_AUTH_DISABLED:'false',NOURISHLAND_PUBLIC_ORIGIN:'https://test.nourishland.invalid'},stdio:['ignore','pipe','pipe']});
    let logs='';child.stderr.on('data',chunk=>logs+=chunk);
    try {
        const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs||'Server timeout')),15000);child.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error(logs));});});
        const request=async(route,{cookie='',method='GET',body,origin='https://test.nourishland.invalid'}={})=>{
            const response=await fetch(base+'/xr-api'+route,{method,headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},...(body!==undefined?{body:JSON.stringify(body)}:{})});
            return { status:response.status, value:await response.json(), cookie:response.headers.get('set-cookie')?.split(';')[0] };
        };
        const login=async(username,pass=password)=>{const result=await request('/auth/login',{method:'POST',body:{username,password:pass}});assert.equal(result.status,200);assert.ok(result.cookie);assert.doesNotMatch(JSON.stringify(result.value),/passwordHash|sessionVersion/);return result.cookie;};
        const editor=await login('editor'),admin=await login('admin'),outsider=await login('outsider');
        const endpoint='/projects/p/checklists',experience=createChecklist({projectId:'p',title:'Observe the area',activities:['Look at the checkpoint'],scope:{siteId:'s',areaId:'a'}});
        experience.steps[0].contentRefs=[{type:'checkpoint',id:'checkpoint'}];
        const item=endpoint+'/'+experience.id;
        await t.test('anonymous public reads need no login; private reads and writes do',async()=>{
            assert.equal((await request('/projects/p/shared?view=visitor')).status,200);
            assert.equal((await request(endpoint)).status,401);
            assert.equal((await request(item,{method:'PUT',body:{expectedVersion:0,experience}})).status,401);
            assert.deepEqual((await request(endpoint+'?view=visitor')).value.experiences,[]);
            assert.equal((await request('/projects/p/export?view=visitor')).status,403);
        });
        await t.test('members cannot cross project boundaries or use legacy publication bypasses',async()=>{
            assert.equal((await request('/projects/other',{cookie:editor})).status,403);
            assert.equal((await request(endpoint,{cookie:outsider})).status,403);
            assert.equal((await request(item,{cookie:outsider,method:'PUT',body:{expectedVersion:0,experience}})).status,403);
            assert.equal((await request('/projects/p',{cookie:editor,method:'PUT',body:{visibility:'public',name:'Bypass'}})).status,403);
            assert.equal((await request('/demo-markers',{cookie:editor,method:'POST',body:{}})).status,403);
            assert.equal((await request('/plant-library',{cookie:admin})).status,403);
            assert.deepEqual((await request('/projects',{cookie:editor})).value.map(project=>project.id),['p']);
            assert.equal((await request(item,{cookie:editor,method:'PUT',body:{expectedVersion:0,experience},origin:'https://evil.invalid'})).status,403);
        });
        let entry;
        await t.test('editors save drafts; only administrators approve; forged approval is rejected',async()=>{
            assert.equal((await request(item,{cookie:editor,method:'PUT',body:{expectedVersion:0,experience:{...experience,publication:'published'}}})).status,400);
            const saved=await request(item,{cookie:editor,method:'PUT',body:{expectedVersion:0,experience}});assert.equal(saved.status,201);entry=saved.value;
            assert.deepEqual((await request(endpoint+'?view=visitor')).value.experiences,[]);
            assert.equal((await request(item+'/publish',{cookie:editor,method:'POST',body:{expectedVersion:entry.version}})).status,403);
            const approved=await request(item+'/publish',{cookie:admin,method:'POST',body:{expectedVersion:entry.version}});assert.equal(approved.status,200);entry=approved.value;
            const payload=(await request(endpoint+'?view=visitor')).value;validatePublishedChecklists(payload,'p');assert.equal(payload.experiences[0].publication,'published');
            assert.doesNotMatch(JSON.stringify(payload),/publishedBy|updatedBy|passwordHash|draft/);
        });
        await t.test('draft edits preserve the approved snapshot and stale writes cannot replace it',async()=>{
            assert.equal((await request(item,{cookie:editor,method:'PUT',body:{expectedVersion:1,experience}})).status,409);
            const changed=await request(item,{cookie:editor,method:'PUT',body:{expectedVersion:entry.version,experience:{...experience,title:'Next revision',revision:999}}});assert.equal(changed.status,200);entry=changed.value;
            assert.equal(entry.draft.revision,2);
            assert.equal((await request(item+'?view=visitor')).value.title,'Observe the area');
            assert.equal((await request(item+'/publish',{cookie:admin,method:'POST',body:{expectedVersion:entry.version-1}})).status,409);
        });
        await t.test('hidden scope or references revoke visibility immediately and block approval',async()=>{
            fixture('p/sites/s/places/a/markers/checkpoint/marker.json',{id:'checkpoint',type:'area_checkpoint',visibility:'hidden'});
            assert.deepEqual((await request(endpoint+'?view=visitor')).value.experiences,[]);
            assert.equal((await request(item+'?view=visitor')).status,404);
            assert.equal((await request(item+'/publish',{cookie:admin,method:'POST',body:{expectedVersion:entry.version}})).status,400);
            fixture('p/sites/s/places/a/markers/checkpoint/marker.json',{id:'checkpoint',type:'area_checkpoint',visibility:'public'});
            fixture('p/project.json',{id:'p',visibility:'hidden'});
            assert.equal((await request(endpoint+'?view=visitor')).status,404);
            fixture('p/project.json',{id:'p',visibility:'public'});
        });
        await t.test('withdrawal removes publication while retaining the editable draft',async()=>{
            const result=await request(item+'/unpublish',{cookie:admin,method:'POST',body:{expectedVersion:entry.version}});assert.equal(result.status,200);entry=result.value;
            assert.equal(entry.published,null);assert.equal(entry.draft.title,'Next revision');
            assert.deepEqual((await request(endpoint+'?view=visitor')).value.experiences,[]);
        });
        await t.test('role changes and disabled accounts take effect on existing signed sessions',async()=>{
            registry.users[1].projects.p='editor';write(registryFile,registry);
            assert.equal((await request(item+'/publish',{cookie:admin,method:'POST',body:{expectedVersion:entry.version}})).status,403);
            registry.users[0].projects={};write(registryFile,registry);
            assert.equal((await request(item,{cookie:editor})).status,403);
            registry.users[0].disabled=true;write(registryFile,registry);
            assert.equal((await request('/auth/session',{cookie:editor})).value.authenticated,false);
            registry.users[2].sessionVersion++;write(registryFile,registry);
            assert.equal((await request('/auth/session',{cookie:outsider})).value.authenticated,false);
            fs.writeFileSync(registryFile,'broken JSON');
            assert.equal((await request('/auth/session',{cookie:admin})).value.authenticated,false);
            write(registryFile,registry);
        });
        await t.test('bootstrap administrator login remains available and logout clears the cookie',async()=>{
            const bootstrap=await login('', 'test-only-bootstrap');
            assert.equal((await request('/auth/session',{cookie:bootstrap})).value.identity.platformAdmin,true);
            assert.equal((await request('/projects/other',{cookie:bootstrap})).status,200);
            assert.equal((await request('/auth/logout',{cookie:bootstrap,method:'POST',body:{}})).cookie,'nourishland_creator=');
            assert.equal((await request('/auth/session',{cookie:'nourishland_creator=bad.token'})).value.authenticated,false);
        });
    } finally { if(child.exitCode===null)await new Promise(resolve=>{child.once('exit',resolve);child.kill();});fs.rmSync(directory,{recursive:true,force:true}); }
});

test('published progress is separate from personal drafts and imported files cannot claim approval',()=>{
    const personal=createChecklist({projectId:'p',title:'Checklist',activities:['Observe']}),published={...personal,publication:'published'};
    const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
    setChecklistStep(personal,personal.steps[0].id,true,storage);
    assert.deepEqual(checklistProgress(published,storage),[]);
    setChecklistStep(published,published.steps[0].id,true,storage);
    assert.equal(checklistProgress(published,storage).length,1);
    assert.deepEqual(checklistProgress({...published,revision:2},storage),[]);
    assert.throws(()=>parseChecklist(JSON.stringify(published)),/publication/);
    assert.throws(()=>validatePublishedChecklists({schemaVersion:1,contract:'nourishland.published-checklists',projectId:'p',experiences:[published,published]},'p'),/Duplicate/);
});
