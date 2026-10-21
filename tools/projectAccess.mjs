import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const ID = /^[A-Za-z0-9_-]{1,160}$/;
const HASH = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/;
const options = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const dummyHash = `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
const equal = (left, right) => left.length === right.length && crypto.timingSafeEqual(left, right);

export async function hashProjectPassword(password) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 1024) throw new Error('Use a password of 12–1024 characters.');
    const salt = crypto.randomBytes(16).toString('hex');
    return `scrypt:${salt}:${(await scrypt(password, salt, 64, options)).toString('hex')}`;
}

export function validateAccessRegistry(value) {
    if (value?.schemaVersion !== 1 || !Array.isArray(value.users)) throw new Error('Invalid project access registry.');
    const ids = new Set();
    for (const user of value.users) {
        if (!ID.test(user?.id) || ids.has(user.id) || !HASH.test(user.passwordHash)
            || !Number.isSafeInteger(user.sessionVersion) || user.sessionVersion < 1
            || typeof user.disabled !== 'boolean' || !user.projects || Array.isArray(user.projects) || typeof user.projects !== 'object'
            || user.status !== undefined && !['pending','approved'].includes(user.status)
            || user.platformAdmin !== undefined && typeof user.platformAdmin !== 'boolean'
            || user.creatorEnabled !== undefined && typeof user.creatorEnabled !== 'boolean'
            || Object.entries(user.projects).some(([id, role]) => !ID.test(id) || !['editor', 'admin'].includes(role))) throw new Error('Invalid project access user.');
        ids.add(user.id);
    }
    return value;
}

export const projectRole = (identity, projectId) => identity?.platformAdmin ? 'admin' : identity?.projects?.[projectId] || null;

export function createProjectAccess({ registryFile, secret, bootstrapPassword, developmentOpen }) {
    const readUsers = () => registryFile ? validateAccessRegistry(JSON.parse(fs.readFileSync(registryFile, 'utf8'))).users : [];
    const writeUsers=users=>{
        if(!registryFile)throw Error('Account storage has not been configured.');
        const value=validateAccessRegistry({schemaVersion:1,users}),temp=registryFile+'.'+crypto.randomUUID()+'.tmp';
        fs.mkdirSync(path.dirname(registryFile),{recursive:true});
        try{fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,registryFile);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
    };
    if(registryFile && !fs.existsSync(registryFile) && bootstrapPassword && secret.length>=32)writeUsers([]);
    // Validate configuration before accepting requests. A missing/corrupt registry must never open access.
    readUsers();
    const bootstrapVersion = crypto.createHash('sha256').update(bootstrapPassword).digest('hex');
    const bootstrap = () => ({ id: 'bootstrap', platformAdmin: true, projects: {}, sessionVersion: bootstrapVersion });
    const identify=user=>({id:user.id,name:user.name || user.id,platformAdmin:user.platformAdmin===true,status:user.status || 'approved',creatorEnabled:user.creatorEnabled===true,projects:user.status==='pending'?{}:user.projects,sessionVersion:user.sessionVersion});
    const publicUser=user=>({id:user.id,name:user.name||user.id,email:user.email||'',status:user.status||'approved',disabled:user.disabled,platformAdmin:user.platformAdmin===true,projects:user.projects,created:user.created||''});
    const sign = body => crypto.createHmac('sha256', secret).update(body).digest('hex');
    return {
        registrationAvailable:Boolean(registryFile && secret.length>=32),
        accounts:()=>readUsers().map(publicUser),
        async register(data){
            if(!registryFile || secret.length<32)throw Error('Account registration is not configured. An administrator must connect private account storage.');
            if(!data || Object.keys(data).some(key=>!['username','name','email','password'].includes(key)))throw Error('Invalid account fields.');
            const id=String(data.username||'').trim().toLowerCase(),name=String(data.name||'').trim(),email=String(data.email||'').trim();
            if(!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(id)||['bootstrap','development','admin','administrator'].includes(id))throw Error('Use 3–48 letters, numbers, underscores or hyphens for your username.');
            if(!name || name.length>120 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter your name and a valid contact email.');
            const passwordHash=await hashProjectPassword(data.password),users=readUsers();
            if(users.some(user=>user.id===id))throw Error('That username is unavailable. Choose another.');
            const user={id,name,email,passwordHash,sessionVersion:1,disabled:false,status:'pending',creatorEnabled:false,platformAdmin:false,projects:{},created:new Date().toISOString()};
            writeUsers([...users,user]);return identify(user);
        },
        reviewAccount(id,data){
            if(!data || Object.keys(data).some(key=>!['action','projects'].includes(key)) || !['approve','disable','enable','access'].includes(data.action))throw Error('Choose an account action.');
            const users=readUsers(),user=users.find(user=>user.id===id);if(!user)throw Error('Account not found.');
            if(data.action==='approve'){user.status='approved';user.creatorEnabled=true;}
            if(data.action==='disable')user.disabled=true;
            if(data.action==='enable')user.disabled=false;
            if(data.action==='access'){
                if(!data.projects || Array.isArray(data.projects) || Object.entries(data.projects).some(([id,role])=>!ID.test(id)||!['editor','admin'].includes(role)))throw Error('Invalid project permissions.');
                user.projects={...data.projects};
            }
            user.sessionVersion++;writeUsers(users);return publicUser(user);
        },
        grantProject(userId,projectId){const users=readUsers(),user=users.find(user=>user.id===userId);if(!user || user.disabled || user.status==='pending' || !ID.test(projectId))throw Error('Creator access is unavailable.');user.projects[projectId]='admin';writeUsers(users);},
        async login(data) {
            const password = typeof data.password === 'string' && data.password.length <= 1024 ? data.password : '';
            if (!data.username && bootstrapPassword && equal(Buffer.from(password), Buffer.from(bootstrapPassword))) return bootstrap();
            const username=typeof data.username==='string'?data.username.trim():'';
            const user = readUsers().find(item => item.id === username || item.id===username.toLowerCase());
            const [, salt, expected] = (user?.passwordHash || dummyHash).match(HASH);
            const actual = await scrypt(password, salt, 64, options);
            if (!equal(actual, Buffer.from(expected, 'hex')) || !user || user.disabled) return null;
            return identify(user);
        },
        token(identity, expires) {
            const body = Buffer.from(JSON.stringify({ id: identity.id, bootstrap: identity.id==='bootstrap', version: identity.sessionVersion, expires })).toString('base64url');
            return `${body}.${sign(body)}`;
        },
        identity(req) {
            if (developmentOpen) return { ...bootstrap(), id: 'development' };
            try {
                const cookie = String(req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith('nourishland_creator='));
                const token = decodeURIComponent(cookie?.slice('nourishland_creator='.length) || '');
                const [body, signature, extra] = token.split('.');
                if (!body || !/^[a-f0-9]{64}$/.test(signature) || extra || !equal(Buffer.from(signature, 'hex'), Buffer.from(sign(body), 'hex'))) return null;
                const value = JSON.parse(Buffer.from(body, 'base64url').toString());
                if (!Number.isSafeInteger(value.expires) || value.expires <= Date.now()) return null;
                if (value.bootstrap === true) return bootstrapPassword && value.id === 'bootstrap' && value.version === bootstrapVersion ? bootstrap() : null;
                const user = readUsers().find(item => item.id === value.id);
                return user && !user.disabled && user.sessionVersion === value.version
                    ? identify(user) : null;
            } catch { return null; }
        }
    };
}
