import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const workerSource = fs.readFileSync(path.join(root,'app/field/worker.js'),'utf8');
function worker({ fetcher = async () => { throw Error('Offline'); }, failInstall = false } = {}) {
    const handlers = new Map(), added = [], deleted = [], matched = [];
    const response = { ok:true, body:'cached shell' };
    const self = { location:{href:'https://nourishland.org/xr/field/worker.js?v=0.9594'},
        registration:{scope:'https://nourishland.org/xr/field/'}, clients:{claim:async()=>{}},
        addEventListener:(type, handler)=>handlers.set(type,handler) };
    const cache = { addAll: async urls => { if(failInstall)throw Error('Partial download'); added.push(...urls); },
        match: async (key,options) => {matched.push({key,options});return response;} };
    const caches = { open:async()=>cache, keys:async()=>['nourishland-public-field-shell-old','nlxr-field-app-creator','other'],delete:async name=>deleted.push(name) };
    vm.runInNewContext(workerSource,{self,URL,caches,fetch:fetcher});
    return {handlers,added,deleted,matched,response};
}
function request(harness, url, mode = 'navigate', method = 'GET') {
    let pending;
    harness.handlers.get('fetch')({request:{url,mode,method},respondWith:promise=>{pending=promise;}});
    return pending;
}

test('Field has its own scoped identity, entry and install icons', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root,'app/field/manifest.json'),'utf8'));
    const base = new URL('https://nourishland.org/xr/field/manifest.json');
    assert.equal(new URL(manifest.start_url,base).pathname,'/xr/field/index.html');
    assert.equal(new URL(manifest.scope,base).pathname,'/xr/field/');
    assert.equal(new URL(manifest.id,base).pathname,'/xr/field/');
    assert.equal(manifest.name,'Nourishland Field');
    assert.equal(manifest.display,'standalone');
    assert.equal(new URL(manifest.shortcuts[0].url,base).searchParams.get('view'),'journal');
    for(const icon of manifest.icons) {
        const bytes=fs.readFileSync(path.join(root,'app/field',icon.src));
        assert.equal(bytes.subarray(1,4).toString(),'PNG');
        assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,icon.sizes);
    }
    const main=fs.readFileSync(path.join(root,'app/field/main.js'),'utf8');
    assert.match(main,/renderPlatformApplication\(\{ mode: 'field' \}\)/);
    assert.match(main,/scope: '\.\/'/);
    assert.doesNotMatch(main,/location\.reload|requestPermission|requestSession/);
});

test('Field module graph and shell contain all dependencies and exclude the tutorial', async () => {
    const h=worker();let installed;
    h.handlers.get('install')({waitUntil:promise=>{installed=promise;}});await installed;
    const paths=new Set(h.added.map(url=>new URL(url).pathname.replace('/xr/','app/')));
    const seen=new Set();
    function visit(file) {
        if(seen.has(file))return;seen.add(file);
        assert.ok(paths.has(path.relative(root,file).replaceAll('\\','/')),`Shell missing ${file}`);
        const source=fs.readFileSync(file,'utf8');
        for(const match of source.matchAll(/from\s*(['"])(\.\.?\/[^'"]+)\1/g))visit(path.resolve(path.dirname(file),match[2]));
    }
    visit(path.join(root,'app/field/main.js'));
    assert.ok([...seen].every(file=>!/main\.js$/.test(file)||file.endsWith(path.join('field','main.js'))));
    assert.ok([...seen].every(file=>!/temporaryArDemo|welcomePractice|webxrSession|persistence\.js/.test(file)));
    for(const url of h.added) assert.ok(fs.existsSync(path.join(root,new URL(url).pathname.replace('/xr/','app/'))));
});

test('offline shell returns Field HTML for journal deep links and cached shared modules', async () => {
    const h=worker();
    assert.equal(await request(h,'https://nourishland.org/xr/field/index.html?view=journal&project=p'),h.response);
    assert.equal(h.matched[0].key,'https://nourishland.org/xr/field/index.html');
    assert.equal(await request(h,'https://nourishland.org/xr/services/fieldJournal.js?v=0.9594','cors'),h.response);
    assert.equal(h.matched[1].options.ignoreSearch,true);
});

test('Field worker never intercepts API, creator, desktop, tutorial, foreign or mutation requests', () => {
    const h=worker();
    for(const url of [
        'https://nourishland.org/xr-api/projects?view=visitor',
        'https://nourishland.org/xr-api/auth/session',
        'https://nourishland.org/xr/index.html?workspace=field&project=p',
        'https://nourishland.org/xr/platform.html',
        'https://nourishland.org/xr/screens/temporaryArDemo.js',
        'https://other.test/xr/field/index.html',
        'https://nourishland.org/xr/field/unknown.html'
    ]) assert.equal(request(h,url),undefined,url);
    assert.equal(request(h,'https://nourishland.org/xr/field/index.html','navigate','POST'),undefined);
});

test('HTTP denials remain denials even with an available shell cache', async () => {
    const denied={ok:false,status:403};
    const h=worker({fetcher:async()=>denied});
    assert.equal(await request(h,'https://nourishland.org/xr/field/index.html'),denied);
    assert.equal(h.matched.length,0);
});

test('failed shell preparation rejects installation and does not delete old caches', async () => {
    const h=worker({failInstall:true});let installed;
    h.handlers.get('install')({waitUntil:promise=>{installed=promise;}});
    await assert.rejects(installed,/Partial download/);
    assert.equal(h.deleted.length,0);
});

test('activating a new Field shell leaves Creator and unrelated caches alone', async () => {
    const h=worker();let activated;
    h.handlers.get('activate')({waitUntil:promise=>{activated=promise;}});await activated;
    assert.deepEqual(h.deleted,['nourishland-public-field-shell-old']);
});

test('an already-downloaded waiting update is identified without claiming the old offline shell is current', async () => {
    const source=fs.readFileSync(path.join(root,'app/field/main.js'),'utf8').replace(/^import .*;\r?\n/gm,'');
    const output={textContent:''};let rendered=0;
    const context={renderPlatformApplication:async()=>{rendered++;},BUILD_INFO:{version:'test'},
        document:{querySelector:()=>output},navigator:{serviceWorker:{register:async()=>({waiting:{},active:{}})}},isSecureContext:true};
    await vm.runInNewContext(`(async()=>{${source}})()`,context);
    assert.equal(rendered,1);
    assert.match(output.textContent,/update downloaded/);
    assert.match(output.textContent,/Close existing Field tabs/);
    assert.doesNotMatch(output.textContent,/ready for offline/);
});
