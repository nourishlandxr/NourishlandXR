import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    renderArIntroductionPreparation,
    shouldSkipArIntroductionPreparation,
    skipArIntroductionPreparation
} from '../app/services/arOnboarding.js';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

test('AR introduction preparation can be dismissed on a device', () => {
    const storage = memoryStorage();
    assert.equal(shouldSkipArIntroductionPreparation(storage), false);
    skipArIntroductionPreparation(storage);
    assert.equal(shouldSkipArIntroductionPreparation(storage), true);
});

test('AR introduction preparation distinguishes the desktop book and spatial mode', () => {
    const app = { innerHTML: '', querySelector: () => null };
    renderArIntroductionPreparation(app);
    assert.match(app.innerHTML, /we recommend the plain NLXR introduction/);
    assert.match(app.innerHTML, /compatible Android phone or spatial device/);
    assert.match(app.innerHTML, /iPhone and iPad cannot currently launch this WebXR AR mode/);
    assert.match(app.innerHTML, /plain desktop introduction needs no camera/);
    assert.match(app.innerHTML, /Camera and tracking/);
    assert.match(app.innerHTML, /Start AR/);
    assert.doesNotMatch(app.innerHTML, /global-ar-action|data-ar-eye-height|Floor and natural scale/);
    assert.match(app.innerHTML, /<details class="ar-device-support">/);
    assert.match(app.innerHTML, /XREAL Aura, VITURE Luma Ultra, Meta Quest 3 and Steam Frame/);
    assert.match(app.innerHTML, /not confirmed compatible devices/);
    assert.match(app.innerHTML, /Preparation is remembered on this browser/);
    assert.doesNotMatch(app.innerHTML, /data-ar-graphics|data-ar-introduction-remember/);
    assert.match(app.innerHTML, /data-ar-introduction-continue/);
});

test('desktop preparation keeps its own entry label and AR entry exposes retry feedback', async () => {
    const desktop={innerHTML:'',querySelector:()=>null};
    renderArIntroductionPreparation(desktop,{simpleDesktop:true});
    assert.match(desktop.innerHTML,/Begin introduction/);
    assert.doesNotMatch(desktop.innerHTML,/>Start AR</);
    const handlers=new Map(),attributes=new Map();
    const button={textContent:'Start AR',disabled:false,setAttribute:(key,value)=>attributes.set(key,value),addEventListener:(name,fn)=>handlers.set(name,fn)};
    const status={hidden:true,textContent:''};
    const app={innerHTML:'',querySelector:selector=>selector==='[data-ar-introduction-continue]'?button:selector==='[data-ar-entry-status]'?status:null};
    let starts=0;
    renderArIntroductionPreparation(app,{onContinue:()=>{starts++;throw Error('Session unavailable');}});
    await handlers.get('click')({currentTarget:button});
    assert.equal(starts,1);assert.equal(button.disabled,false);
    assert.equal(button.textContent,'Start AR');assert.equal(attributes.get('aria-busy'),'false');
    assert.equal(status.hidden,false);assert.match(status.textContent,/try again/);
});

test('homepage AR introduction checks the remembered preference before starting WebXR', () => {
    const source = fs.readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    const entry = source.slice(source.indexOf('export function openTemporaryArDemoWindow'), source.indexOf('export async function startTemporaryArDemo'));
    assert.match(entry, /shouldSkipArIntroductionPreparation\(\)/);
    assert.doesNotMatch(entry, /shouldSkipArIntroductionPreparation\(\) && arAssetsReady/);
    assert.match(entry, /renderArIntroductionPreparation/);
    assert.ok(entry.indexOf('isDesktopLearningBookTarget()') < entry.indexOf('shouldSkipArIntroductionPreparation()'));
    assert.ok(entry.indexOf('shouldSkipArIntroductionPreparation()') < entry.indexOf('startTemporaryArDemo(app)'));
});
