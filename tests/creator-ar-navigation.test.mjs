import test from 'node:test';
import assert from 'node:assert/strict';
import { launchCreatorArFromPage } from '../app/services/creatorArNavigation.js';

function page(t) {
    const descriptors = Object.fromEntries(['document','window','navigator'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
    const control = { disabled:false, attributes:{}, setAttribute(key,value) { this.attributes[key]=value; }, removeAttribute(key) { delete this.attributes[key]; } };
    const notice = { isConnected:true, hidden:false, dataset:{}, setAttribute() {} };
    const origin = { querySelector(selector) { return selector === '[data-workspace-ar-notice]' ? notice : null; }, querySelectorAll() { return [control]; } };
    const root = { querySelector() { return origin; } };
    for (const [key,value] of Object.entries({ document:{createElement:()=>notice}, window:{}, navigator:{xr:{}} })) Object.defineProperty(globalThis,key,{value,configurable:true});
    t.after(() => { for (const key of Object.keys(descriptors)) { if(descriptors[key]) Object.defineProperty(globalThis,key,descriptors[key]); else delete globalThis[key]; } });
    return {root,control,notice};
}

test('AR launch preserves the click gesture and deduplicates repeated input', async t => {
    const {root,control,notice}=page(t);
    let resolve, calls=0;
    const pending=new Promise(done=>{resolve=done;});
    const first=launchCreatorArFromPage(root,()=>{calls++;return pending;},true);
    assert.equal(calls,1,'launch must be called synchronously, before capability/data awaits');
    assert.equal(control.disabled,true);
    assert.equal(control.attributes['aria-busy'],'true');
    assert.equal(launchCreatorArFromPage(root,()=>{calls++;return true;},true),first);
    resolve(true);
    assert.equal(await first,true);
    assert.equal(calls,1);
    assert.equal(control.disabled,false);
    assert.equal(notice.hidden,true);
});

test('failed and rejected AR launches show a readable failure and remain retryable', async t => {
    const {root,control,notice}=page(t);
    window.__nxrArStartError=new Error('Immersive AR is unavailable on this device.');
    assert.equal(await launchCreatorArFromPage(root,()=>false,true),false);
    assert.match(notice.textContent,/Immersive AR is unavailable.*project stays open/);
    assert.equal(control.disabled,false);
    assert.equal(await launchCreatorArFromPage(root,()=>{throw new Error('Camera access denied');},true),false);
    assert.match(notice.textContent,/Camera access denied/);
    assert.equal(await launchCreatorArFromPage(root,()=>true,true),true);
});

test('launch cleanup preserves a control that was already disabled', async t => {
    const {root,control,notice}=page(t);
    control.disabled=true;
    navigator.xr=null;
    assert.equal(await launchCreatorArFromPage(root,()=>false,true),false);
    assert.match(notice.textContent,/Meta Quest Browser.*HTTPS/);
    assert.equal(control.disabled,true);
});
