// Post-build smoke: exercise the exact bundle served to Quest, not only sources.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const url=new URL('../app/vendor/iwsdk-input/index.js',import.meta.url);
// Follow only static entry imports. Optional UI/font/physics chunks have their
// own cost; measuring the tiny re-export shim alone would hide the real entry.
const entryFiles=new Set(),visit=async file=>{
    if(entryFiles.has(file))return;entryFiles.add(file);const source=await readFile(new URL(file,url),'utf8');
    const imports=[...source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.\/[^'"]+\.js)['"]/gu)].map(match=>match[1]);
    for(const dependency of imports)await visit(dependency);
};await visit('index.js');
const bytes=Buffer.concat(await Promise.all([...entryFiles].map(name=>readFile(new URL(name,url)))));
assert.ok(bytes.length<2_500_000,'input/shared-renderer raw-size budget');
assert.ok(gzipSync(bytes).length<550_000,'input/shared-renderer gzip-size budget');
const saved={document:globalThis.document,fetch:globalThis.fetch};
const context=new Proxy({createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})},
    {get:(target,key)=>target[key] || (()=>{})});
globalThis.document={createElement:()=>({getContext:()=>context})};
globalThis.fetch=async request=>String(request).startsWith('data:')?saved.fetch(request):Promise.reject(new Error('remote visuals deliberately unavailable in SDK smoke'));
let runtime,owner,physics;
const matrix=(x,y,z)=>[1,0,0,0,0,1,0,0,0,0,1,0,x,y,z,1];
const pose=value=>({transform:{matrix:matrix(...value),position:{x:value[0],y:value[1],z:value[2]},orientation:{x:0,y:0,z:0,w:1}}});
try{
    const {createNlxrInput}=await import(url.href);
    const session=new EventTarget();session.visibilityState='visible';
    const source={handedness:'right',profiles:['oculus-touch-v3'],targetRayMode:'tracked-pointer',
        gripSpace:{position:[0,1,-.3]},targetRaySpace:{position:[0,1,-.3]},
        gamepad:{mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:7},()=>({pressed:false,touched:false,value:0}))}};
    session.inputSources=[source];
    runtime=createNlxrInput(session,{assetUrls:{left:'https://local.invalid/left.glb',right:'https://local.invalid/right.glb'}});
    owner=runtime.createTutorialInteractions();
    const frame={session,getViewerPose:()=>pose([0,1.6,0]),getPose:space=>pose(space.position)};
    const fruit={id:'peach',position:{x:0,y:1,z:-.3},rotation:{x:0,y:0,z:0,w:1},halfSize:{x:.05,y:.05,z:.05},visible:true};
    const refSpace={};let time=0,sequence=0;
    const step=()=>{
        runtime.update(frame,refSpace,time+=20,++sequence);
        owner.step([{source,...runtime.controllerState(source)}],[fruit],{rootMatrix:matrix(0,0,0),dt:.02,time:time/1000});
    };
    step();assert.equal(owner.held(source),null);
    Object.assign(source.gamepad.buttons[1],{pressed:true,value:1});step();
    assert.equal(owner.held(source)?.id,'peach');
    source.gripSpace.position=[.25,1.25,-.5];step();
    assert.ok(Math.abs(owner.held(source).matrix[12]-.25)<1e-5);
    Object.assign(source.gamepad.buttons[1],{pressed:false,value:0});step();
    assert.equal(owner.held(source),null);
    physics=runtime.createTutorialPhysics({useWorker:false});
    const falling={id:'physics-peach',position:{x:0,y:.45,z:0},rotation:{x:0,y:0,z:0,w:1},halfSize:{x:.05,y:.05,z:.05},visible:true,
        velocity:{x:0,y:0,z:0},angular:{x:0,y:0,z:0},home:{x:0,z:0},floorTime:0};
    for(let i=0;i<100;i++){
        physics.physics.prepareDebugFrame(1/60);physics.step([falling],1/60,{floor:-1,tableVisible:true});await physics.physics.flushDebugFrame();
    }
    assert.ok(falling.position.y>.045 && falling.position.y<.065,'emitted Havok/WASM runtime settles on table');
    // Disposing the shared input owner also releases every tutorial interaction.
    runtime.dispose();assert.equal(owner.snapshot().targets,0);
    runtime.dispose();
    assert.equal(physics.snapshot().bodies,0,'input session teardown also disposes Havok');
    console.log(`Built SDK bundle verified: capture/move/release/Havok collision/teardown; ${gzipSync(bytes).length} bytes input gzip.`);
}finally{runtime?.dispose();owner?.dispose();physics?.dispose();globalThis.document=saved.document;globalThis.fetch=saved.fetch;}
