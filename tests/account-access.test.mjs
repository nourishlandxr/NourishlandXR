import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createProjectAccess} from '../tools/projectAccess.mjs';

test('account registration is pending, hashed, explicit and cannot promote itself',async()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nl-account-unit-')),registryFile=path.join(directory,'private','accounts.json');
    try{
        const access=createProjectAccess({registryFile,secret:'unit-test-private-secret-32-characters',bootstrapPassword:'owner-unit-only',developmentOpen:false});
        const data={username:'new-creator',name:'New Creator',email:'creator@example.invalid',password:'sample-test-password-long'};
        await assert.rejects(access.register({...data,platformAdmin:true}),/Invalid account fields/);
        const registered=await access.register(data);assert.equal(registered.status,'pending');assert.equal(registered.platformAdmin,false);assert.deepEqual(registered.projects,{});
        const disk=fs.readFileSync(registryFile,'utf8');assert(!disk.includes(data.password));assert.match(disk,/scrypt:/);assert(!JSON.stringify(access.accounts()).includes('passwordHash'));
        const cookie=identity=>({headers:{cookie:'nourishland_creator='+access.token(identity,Date.now()+10000)}});
        const request=cookie(registered);assert.equal(access.identity(request).status,'pending');access.reviewAccount(registered.id,{action:'approve'});assert.equal(access.identity(request),null,'Approval revokes the pending session');
        const approved=await access.login(data);assert.equal(approved.creatorEnabled,true);access.grantProject(approved.id,'own-project');assert.equal(access.identity(cookie(approved)).projects['own-project'],'admin');
        access.reviewAccount(approved.id,{action:'disable'});assert.equal(access.identity(cookie(approved)),null);assert.equal(await access.login(data),null);
        await assert.rejects(access.register(data),/unavailable/);fs.writeFileSync(registryFile,'broken');assert.equal(access.identity(request),null);assert.throws(()=>createProjectAccess({registryFile,secret:'x',bootstrapPassword:'',developmentOpen:false}));
    }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('production account flow enforces approval, owner-only review, private projects and isolation',async()=>{
    const directory=fs.mkdtempSync(path.join(os.tmpdir(),'nl-account-api-')),workspace=path.join(directory,'workspace'),registryFile=path.join(directory,'private','users.json');
    const child=spawn(process.execPath,['tools/persistence-server.mjs'],{cwd:path.resolve(import.meta.dirname,'..'),env:{...process.env,PORT:'0',HOST:'127.0.0.1',NODE_ENV:'production',NOURISHLAND_WORKSPACE_DIR:workspace,NOURISHLAND_ACCESS_FILE:registryFile,NOURISHLAND_CREATOR_PASSWORD:'owner-test-password',NOURISHLAND_SESSION_SECRET:'test-only-secret-at-least-32-characters',NOURISHLAND_PUBLIC_ORIGIN:'https://pilot.example.invalid',NOURISHLAND_CREATOR_AUTH_DISABLED:'false'},stdio:['ignore','pipe','pipe']});
    let logs='';child.stderr.on('data',chunk=>logs+=chunk);
    try{
        const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(logs||'API timeout')),20000);child.stdout.on('data',chunk=>{logs+=chunk;const match=logs.match(/http:\/\/127\.0\.0\.1:(\d+)/);if(match){clearTimeout(timer);resolve(match[0]);}});child.once('exit',()=>{clearTimeout(timer);reject(Error(logs));});});
        const request=async(route,{body,cookie='',method=body?'POST':'GET',origin='https://pilot.example.invalid'}={})=>{const res=await fetch(base+'/xr-api'+route,{method,headers:{'Content-Type':'application/json',Origin:origin,Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});return {status:res.status,value:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};};
        assert.equal((await request('/auth/session')).value.registrationAvailable,true);
        const data={username:'teacher',name:'Pilot Teacher',email:'teacher@example.invalid',password:'a-long-test-only-password'};
        assert.equal((await request('/auth/register',{body:data,origin:'https://wrong.invalid'})).status,403);
        const pending=await request('/auth/register',{body:data});assert.equal(pending.status,201);assert.equal(pending.value.identity.status,'pending');
        assert.equal((await request('/projects',{cookie:pending.cookie})).status,403);assert.equal((await request('/projects',{cookie:pending.cookie,body:{name:'Forbidden'}})).status,403);
        assert.equal((await request('/admin/accounts',{cookie:pending.cookie})).status,403);
        const owner=await request('/auth/login',{body:{username:'',password:'owner-test-password'}});assert.equal(owner.status,200);assert.equal(owner.value.identity.platformAdmin,true);
        const accounts=await request('/admin/accounts',{cookie:owner.cookie});assert.equal(accounts.value.accounts.length,1);assert.doesNotMatch(JSON.stringify(accounts.value),/passwordHash|sessionVersion/);
        assert.equal((await request('/admin/accounts/teacher',{cookie:owner.cookie,method:'PUT',body:{action:'approve',platformAdmin:true}})).status,400);
        assert.equal((await request('/admin/accounts/teacher',{cookie:owner.cookie,method:'PUT',body:{action:'approve'}})).status,200);
        assert.equal((await request('/auth/session',{cookie:pending.cookie})).value.authenticated,false);
        const creator=await request('/auth/login',{body:{username:data.username,password:data.password}});assert.equal(creator.value.identity.status,'approved');
        const project=await request('/projects',{cookie:creator.cookie,body:{name:'Teacher garden',visibility:'public'}});assert.equal(project.status,201);assert.equal(project.value.visibility,'draft');
        const own='/projects/'+project.value.id;assert.equal((await request(own,{cookie:creator.cookie})).status,200);assert.equal((await request(own+'?view=visitor')).status,404);
        const other=await request('/projects',{cookie:owner.cookie,body:{name:'Other garden'}});assert.equal(other.status,201);assert.equal((await request('/projects/'+other.value.id,{cookie:creator.cookie})).status,403);
        assert.equal((await request('/admin/accounts',{cookie:creator.cookie})).status,403);assert.equal((await request('/plant-library',{cookie:creator.cookie})).status,403);
        assert.equal((await request('/admin/accounts/teacher',{cookie:owner.cookie,method:'PUT',body:{action:'disable'}})).status,200);assert.equal((await request(own,{cookie:creator.cookie})).status,401);
    }finally{child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(directory,{recursive:true,force:true});}
});
