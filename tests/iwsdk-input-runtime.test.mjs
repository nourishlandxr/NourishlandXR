import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createNlxrInputBridge } from '../app/services/xrInputBridge.js';
import { attachXRInputRuntime, xrInputRuntime, prepareXRInputRuntime } from '../app/services/xrInputRuntime.js';
import { beginHandTrackingFrame, handTrackingState, xrInputRay } from '../app/services/xrPointer.js';
import { handJointPointer } from '../app/services/xrControllerHandPose.js';
import { createXRHandOutline } from '../app/services/xrHandOutline.js';
import { parseGlb, accessorData } from '../app/services/demoBeeModel.js';
import { VIRTUAL_HAND_FIST_POSE } from '../app/services/virtualHandFistPose.js';
import * as GrabSDK from '../iwsdk/grabSdk.js';
import { createTutorialInteractionOwner } from '../app/services/iwsdkTutorialInteraction.js';
import {createDemoSDKSession} from '../app/services/iwsdkDemoSession.js';
import {bindExplorerMoleculeInteraction} from '../app/services/explorerMoleculeInteraction.js';
import {createNoteSDKGrip} from '../app/services/noteSDKGrip.js';
import {createButterflySDKGrip} from '../app/services/butterflySDKGrip.js';
import {createWelcomeButterflyBucket} from '../app/services/welcomeButterflyBucket.js';
import {knowledgeExplorer} from '../app/services/knowledgeExplorer.js';
import {ensureExplorerMolecule,chooseExplorerWing,alignExplorerPuzzle} from '../app/services/explorerMoleculeModel.js';
import {PIGEON_PEA_AR_KNOWLEDGE as knowledge} from '../app/services/pigeonPeaExample.js';

// Exercise the installed SDK, with native XRFrame/session doubles. The canvas
// stub is only for the SDK's unused cursor texture; it never supplies input.
const require = createRequire(new URL('../iwsdk/package.json', import.meta.url));
const installedSdk = await import(pathToFileURL(require.resolve('@iwsdk/xr-input')));
const THREE = await import(new URL('../iwsdk/node_modules/three/build/three.module.js', import.meta.url));
const { GLTFLoader } = await import(new URL('../iwsdk/node_modules/three/examples/jsm/loaders/GLTFLoader.js', import.meta.url));
const sdk = { ...THREE, ...installedSdk, freeHandPose: VIRTUAL_HAND_FIST_POSE, async loadHandGLTF(url) {
    const bytes = await readFile(new URL(url));
    return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
} };
const context = new Proxy({ createRadialGradient: () => ({ addColorStop() {} }),
    createLinearGradient: () => ({ addColorStop() {} }) }, { get: (target, key) => target[key] || (() => {}) });
const createDocument = () => ({ createElement: () => ({ width: 64, height: 64, getContext: () => context }) });

function fixture({ hand = true } = {}) {
    const session = new EventTarget();
    session.inputSources = []; session.visibilityState = 'visible';
    const source = { handedness: 'right', targetRayMode: 'tracked-pointer', profiles: ['generic-hand-select'],
        targetRaySpace: { position: [0, 1.2, -.2] }, gripSpace: { position: [0, 1.1, -.15] } };
    if (hand) source.hand = new Map([
        ['wrist', { jointName: 'wrist', position: [0, 1.1, -.15] }],
        ['index-finger-tip', { jointName: 'index-finger-tip', position: [.02, 1.15, -.2] }],
        ['thumb-tip', { jointName: 'thumb-tip', position: [.025, 1.15, -.2] }]
    ]);
    session.inputSources = [source];
    const space = {}, missing = new Set();
    const pose = value => ({ transform: { matrix: new THREE.Matrix4().makeTranslation(...value).elements,
        position: new THREE.Vector3(...value), orientation: new THREE.Quaternion() }, emulatedPosition: false, radius: .008 });
    const frame = { session,
        getViewerPose: () => pose([0, 1.6, 0]),
        getPose: (a, b) => !a || missing.has(a) ? null : pose(a.position.map((value, i) => value - (b.position?.[i] || 0))),
        getJointPose: a => missing.has(a) ? null : pose(a.position),
        fillPoses: (joints, base, output) => {
            let index = 0;
            for (const joint of joints) {
                if (missing.has(joint)) return false;
                output.set(frame.getPose(joint, base).transform.matrix, index++ * 16);
            }
            return true;
        }
    };
    const emit = (type, inputSource = source) => {
        const event = new Event(type); Object.assign(event, { inputSource, frame }); session.dispatchEvent(event);
    };
    return { session, source, space, frame, missing, emit };
}

for(const distance of [false,true])test(`real SDK GrabSystem acquires, moves and releases ${distance?'a remote demo Orb':'a tutorial fruit'} from native grip input`, () => {
    const original=globalThis.document;globalThis.document=createDocument();
    const f=fixture({hand:false});f.source.profiles=['oculus-touch-v3'];
    f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};
    const runtime=createNlxrInputBridge(f.session,sdk),owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:distance?'demo':'tutorial',distance});
    const body={id:'orange',position:{x:0,y:distance?1.2:1.1,z:distance?-1.2:-.15},rotation:{x:0,y:0,z:0,w:1},halfSize:{x:.055,y:.055,z:.055},visible:true};
    let time=0,sequence=0;
    const step=()=>{
        runtime.update(f.frame,f.space,time+=20,++sequence);
        const state=runtime.controllerState(f.source);
        owner.step([{source:f.source,...state,rayMatrix:runtime.input.xrOrigin.raySpaces.right.matrixWorld.elements}], [body], {rootMatrix:new THREE.Matrix4().elements,dt:.02,time:time/1000});
    };
    try{
        step();step();assert.equal(owner.held(f.source),null);
        if(distance){const hit=owner.pointers.right.ray.pointer.getIntersection();assert.ok(hit && !hit.object?.isVoidObject,'demo SDK ray must reach target: '+JSON.stringify({hit:hit?.object?.name,point:hit?.point,ray:owner.pointers.right.ray.pointer.intersector.raycaster?.ray,targets:owner.world.scene.rayDescendants.map(m=>({name:m.name,visible:m.visible,world:m.matrixWorld.elements,pointerEvents:m.pointerEvents})),registered:owner.pointers.right.ray.registered}));}
        Object.assign(f.source.gamepad.buttons[1],{pressed:true,value:1});step();
        assert.equal(owner.held(f.source)?.id,'orange');
        const entity=[...owner.grab.queries.handles.entities][0];
        assert.ok(entity.hasComponent(GrabSDK.Grabbed),'official Grabbed component proves acquisition');
        f.source.gripSpace.position=[.25,1.4,-.4];if(distance)f.source.targetRaySpace.position=[.25,1.4,-.2];step();
        const moved=owner.held(f.source);assert.ok(Math.abs(moved.matrix[12]-.25)<1e-5);assert.ok(Math.abs(moved.matrix[13]-1.4)<1e-5);
        Object.assign(f.source.gamepad.buttons[1],{pressed:false,value:0});step();
        assert.equal(owner.held(f.source),null);assert.equal(entity.hasComponent(GrabSDK.Grabbed),false);
        assert.ok(Math.abs(entity.object3D.position.x-.25)<1e-5);
        owner.dispose();owner.dispose();
    }finally{owner.dispose();runtime.dispose();globalThis.document=original;}
});

async function loaded(predicate) {
    const deadline = Date.now() + 2000;
    while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
    assert.ok(predicate(), 'official local hand asset must load and connect');
}

for(const hand of [false,true])test(`tutorial cup uses actual SDK ${hand?'pinch':'controller'} grip and releases sparkle once without stealing input`,async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture({hand});let owner,bucket,time=0,blocked=false,down=false,bursts=0;
    if(!hand){f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};}
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'tutorial-butterfly-cup'});
    const root=new THREE.Group(),position=new THREE.Vector3();
    const setPosition=()=>{f.source.gripSpace.position=position.toArray();if(hand){for(const joint of f.source.hand.values())joint.position=position.toArray();}};setPosition();
    bucket=createWelcomeButterflyBucket(root,{load:async()=>Array.from({length:8},()=>new THREE.Mesh(new THREE.SphereGeometry(1,4,3),new THREE.MeshBasicMaterial())),getContext:()=>({interactionOwner:owner,ready:false,onSparkle:()=>bursts++})});await bucket.loading;position.copy(bucket.bucket.position).add(new THREE.Vector3(0,.073,0));setPosition();
    const tick=()=>{runtime.update(f.frame,f.space,time+=20,time);bucket.update(.02,[{source:f.source,matrix:new THREE.Matrix4().setPosition(position).elements,pinchPoint:hand?position:null,trigger:down,down,uiBlocked:blocked}]);};
    try{
        tick();tick();down=true;tick();assert.equal(owner.held(f.source)?.id,'butterfly-cup');assert.equal(bucket.snapshot().backend,'iwsdk');assert.ok(bucket.isHolding(f.source));
        const before=bucket.bucket.position.clone();position.y+=.2;setPosition();tick();assert.ok(Math.abs(bucket.bucket.position.y-before.y-.2)<1e-5);assert.equal(bursts,1);assert.ok(bucket.snapshot().sparkles.active>0);
        tick();assert.equal(bursts,1,'holding the cup never retriggers its chime');
        blocked=true;tick();assert.equal(bucket.isHolding(f.source),false);assert.equal(owner.held(f.source),null);blocked=false;tick();assert.equal(bucket.isHolding(f.source),false,'held input cannot recapture after a menu');
        down=false;tick();bucket.releaseAll();assert.equal(bucket.snapshot().sparkles.active,0);assert.deepEqual(owner.snapshot().held,[]);
        bucket.reset();position.copy(bucket.bucket.position).add(new THREE.Vector3(0,.073,0));setPosition();tick();down=true;tick();position.y+=.2;setPosition();tick();down=false;tick();bucket.releaseAll();position.fromArray(bucket.snapshot().insects[0].position);setPosition();tick();down=true;tick();
        const insectId=owner.held(f.source)?.id;assert.ok(insectId?.startsWith('trial-butterfly-'),'individual butterflies also use SDK ownership');
        const index=Number(insectId.replace('trial-butterfly-','')),start=bucket.snapshot().insects[index].position[0];position.x+=.12;setPosition();tick();
        assert.ok(Math.abs(bucket.snapshot().insects[index].position[0]-start-.12)<1e-5);
        down=false;tick();assert.equal(bucket.snapshot().insects[index].state,'flying');assert.equal(bucket.snapshot().released,1);
        bucket.destroy();assert.deepEqual(owner.snapshot().held,[]);
    }finally{bucket?.destroy();owner.dispose();runtime.dispose();globalThis.document=saved;}
});

for(const hand of [false,true])test(`butterfly SDK ${hand?'pinch':'controller'} capture preserves flight position and cancels once on lost input`,async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture({hand});let owner,grip,time=0;
    if(!hand){f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};}
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    runtime.createDemoInteractions=()=>owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'butterfly-test',distance:!hand});
    const insect={seed:9,position:hand?{x:.0225,y:1.15,z:-.2}:{x:.03,y:1.2,z:-1.2}},cancelled=[];
    grip=createButterflySDKGrip(f.session,f.space,{onCancel:item=>cancelled.push(item.seed)});
    const tick=()=>beginHandTrackingFrame(f.frame,time+=20,f.space);
    try{
        tick();if(hand){assert.equal(grip.begin(insect,f.source,f.frame),false);f.emit('selectstart');tick();}
        assert.equal(grip.begin(insect,f.source,f.frame),true);
        assert.ok([...owner.grab.queries.handles.entities].some(entity=>entity.hasComponent(GrabSDK.Grabbed)));
        let point=grip.update(insect,f.frame);assert.ok(Math.hypot(point.x-insect.position.x,point.y-insect.position.y,point.z-insect.position.z)<1e-5,'catch never teleports');
        assert.equal(grip.begin({...insect,seed:10},f.source,f.frame),false,'one source cannot capture two insects');
        if(hand)for(const joint of f.source.hand.values())joint.position[0]+=.2;
        else{f.source.gripSpace.position[0]+=.2;f.source.targetRaySpace.position[0]+=.2;}
        tick();point=grip.update(insect,f.frame);assert.ok(Math.abs(point.x-insect.position.x-.2)<1e-5);
        if(hand)f.missing.add(f.source.hand.get('index-finger-tip'));else f.missing.add(f.source.gripSpace);
        tick();assert.equal(grip.update(insect,f.frame),null);assert.deepEqual(cancelled,[9]);assert.equal(grip.owns(insect),false);grip.update(insect,f.frame);assert.deepEqual(cancelled,[9]);
        f.missing.clear();if(hand){f.emit('selectend');tick();f.emit('selectstart');}tick();
        insect.position.x+=.2;assert.equal(grip.begin(insect,f.source,f.frame),true);
        f.session.visibilityState='visible-blurred';f.emit('visibilitychange');assert.deepEqual(cancelled,[9,9]);assert.equal(grip.owns(insect),false);
        f.emit('end');assert.equal(grip.begin(insect,f.source,f.frame),false);grip.dispose();grip.dispose();
    }finally{grip?.dispose();runtime.dispose();globalThis.document=saved;}
});

test('placed Note SDK controller grips preserve pickup and release on tracking loss, blur, removal and end',async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture({hand:false});let owner,note;
    f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    runtime.createDemoInteractions=()=>owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'note-test',distance:true});
    const surface={card:{id:'main'},center:{x:.08,y:1.2,z:-1.2},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},width:.8,height:.3};
    note=createNoteSDKGrip(f.session,f.space);
    runtime.update(f.frame,f.space,20,1);
    const begin=()=>{assert.equal(note.begin(surface,f.source,f.frame),true);assert.equal(note.active,true);assert.ok(owner.snapshot().held.length===1);};
    try{
        begin();let world=note.update(f.frame);assert.ok(Math.abs(world.elements[12]-.08)<1e-5,'offset pickup never snaps card to ray');
        f.source.gripSpace.position[0]=.2;f.source.targetRaySpace.position[0]=.2;world=note.update(f.frame);assert.ok(Math.abs(world.elements[12]-.28)<1e-5);
        note.reset();assert.equal(note.active,false);assert.deepEqual(owner.snapshot().held,[]);
        begin();f.missing.add(f.source.gripSpace);assert.equal(note.update(f.frame),null);assert.equal(note.active,false);f.missing.clear();
        begin();f.session.visibilityState='visible-blurred';f.emit('visibilitychange');assert.equal(note.active,false);assert.deepEqual(owner.snapshot().held,[]);assert.equal(note.begin(surface,f.source,f.frame),false);
        f.session.visibilityState='visible';begin();
        const removal=new Event('inputsourceschange');removal.removed=[f.source];f.session.dispatchEvent(removal);assert.equal(note.active,false);
        begin();f.emit('end');assert.equal(note.active,false);assert.equal(owner.snapshot().targets,0);assert.equal(note.begin(surface,f.source,f.frame),false);
        note.dispose();note.dispose();
    }finally{note?.dispose();runtime.dispose();globalThis.document=saved;}
});

test('placed Notes use actual SDK near-hand pinch ownership without a distant ray fallback',async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture();let owner,note,time=0;
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    runtime.createDemoInteractions=()=>owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'note-pinch-test'});
    note=createNoteSDKGrip(f.session,f.space);
    const surface={card:{id:'timer-widget'},center:{x:.0225,y:1.15,z:-.2},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},width:.3,height:.2};
    const tick=()=>beginHandTrackingFrame(f.frame,time+=20,f.space);
    try{
        tick();assert.equal(note.begin(surface,f.source,f.frame),false,'open hand cannot acquire');
        f.emit('selectstart');tick();assert.equal(note.begin(surface,f.source,f.frame),true);
        assert.ok([...owner.grab.queries.handles.entities].some(entity=>entity.hasComponent(GrabSDK.Grabbed)));
        for(const joint of f.source.hand.values())joint.position[0]+=.2;
        tick();const moved=note.update(f.frame);assert.ok(Math.abs(moved.elements[12]-.2225)<1e-5);
        f.emit('selectend');tick();assert.equal(note.update(f.frame),null);assert.equal(note.active,false);
        f.emit('selectstart');tick();assert.equal(note.begin({...surface,center:{x:0,y:1.15,z:-1.5}},f.source,f.frame),false,'pinch never distance-grabs a Note');
        surface.center.x+=.2;assert.equal(note.begin(surface,f.source,f.frame),true);
        f.missing.add(f.source.hand.get('index-finger-tip'));tick();assert.equal(note.update(f.frame),null);assert.equal(note.active,false);
    }finally{note?.dispose();runtime.dispose();globalThis.document=saved;}
});

for(const hand of [false,true])test(`native knowledge objects move through SDK ${hand?'tracked pinch':'controller grip'} ownership and cancel safely`,async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();
    const f=fixture({hand});let owner,input,allowed=true,time=0;
    if(!hand){f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};}
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    runtime.createDemoInteractions=()=>owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'knowledge-test',distance:!hand});
    const record={id:'pigeon-pea-knowledge'};knowledgeExplorer(record);record.knowledgeExplorer.mode='explore';ensureExplorerMolecule(record,knowledge);
    const object=record.explorerMolecule.root,pose={position:hand?{x:.0225,y:1.15,z:-.2}:{x:0,y:1.2,z:-1.2},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
    const target={record,knowledge,object,pose,node:{explorerNodeId:'core'},face:{faceId:'core'}};
    input=bindExplorerMoleculeInteraction(f.session,f.space,{hit:()=>target,near:()=>target,canGrab:()=>allowed});
    const tick=()=>{beginHandTrackingFrame(f.frame,time+=20,f.space);input.update(f.frame);};
    const start=()=>{f.emit(hand?'selectstart':'squeezestart');tick();};
    const end=()=>{f.emit(hand?'selectend':'squeezeend');tick();};
    try{
        tick();tick();start();assert.equal(input.backend,'iwsdk');assert.ok(input.active?.sdk);
        assert.ok([...owner.grab.queries.handles.entities].some(entity=>entity.hasComponent(GrabSDK.Grabbed)),'native event acquired official SDK handle');
        assert.ok(Math.hypot(object.position.x,object.position.y,object.position.z)<1e-5,'pickup retains the original object pose');
        if(hand)for(const joint of f.source.hand.values())joint.position[0]+=.2;
        else{f.source.gripSpace.position[0]+=.2;f.source.targetRaySpace.position[0]+=.2;}
        tick();assert.ok(Math.abs(object.position.x-.2)<1e-5,'existing native object follows SDK transform');
        if(!hand){
            f.source.gamepad.axes[2]=1;f.source.gamepad.axes[3]=-1;tick();
            const adjusted={...object.position},rotation={...object.rotation};
            assert.ok(Math.abs(rotation.y)>.000001,'thumbstick turns the SDK-held object');
            f.source.gamepad.axes[2]=0;f.source.gamepad.axes[3]=0;tick();
            assert.ok(Math.hypot(object.position.x-adjusted.x,object.position.y-adjusted.y,object.position.z-adjusted.z)<1e-5,'centering the stick preserves its depth adjustment');
            assert.ok(Math.abs(object.rotation.y-rotation.y)<1e-5,'centering preserves SDK rotation adjustment');
        }
        end();assert.equal(input.active,null);assert.deepEqual(owner.snapshot().held,[]);
        // No release-only activation: a modal must cancel without committing.
        // Restore the proxy's authored pose to the fixture ray/contact location.
        object.position.x=0;
        if(hand)for(const joint of f.source.hand.values())joint.position[0]-=.2;
        else{f.source.gripSpace.position[0]-=.2;f.source.targetRaySpace.position[0]-=.2;}
        // The native suppression window intentionally rejects immediate repeats.
        await new Promise(resolve=>setTimeout(resolve,460));tick();start();assert.ok(input.active);
        allowed=false;tick();assert.equal(input.active,null);assert.deepEqual(owner.snapshot().held,[]);
        end();allowed=true;
        f.emit('end');tick();assert.equal(owner.snapshot().targets,0);assert.equal(input.active,null);
        input.destroy();input.destroy();
    }finally{input?.destroy();runtime.dispose();globalThis.document=saved;}
});

test('SDK knowledge trigger grabs retain the two-release connector assembly contract',async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture({hand:false});let owner,input,time=0,target;
    f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};
    const runtime=await attachXRInputRuntime(f.session,{factory:()=>createNlxrInputBridge(f.session,sdk)});
    runtime.createDemoInteractions=()=>owner=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'knowledge-puzzle-test',distance:true});
    const record={id:'pigeon-pea-puzzle'};knowledgeExplorer(record);record.knowledgeExplorer.mode='explore';ensureExplorerMolecule(record,knowledge);assert.ok(chooseExplorerWing(record,knowledge,'uses'));
    const pose={position:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
    input=bindExplorerMoleculeInteraction(f.session,f.space,{hit:()=>target,near:()=>null});
    const tick=()=>{beginHandTrackingFrame(f.frame,time+=20,f.space);input.update(f.frame);};
    try{
        for(const phase of ['connector','piece']){
            assert.equal(record.explorerMolecule.puzzle.phase,phase);assert.ok(alignExplorerPuzzle(record,knowledge));
            const object=phase==='connector'?record.explorerMolecule.pendingConnector:record.explorerMolecule.pending;
            target={record,knowledge,object,pose,node:{pending:true},face:{faceId:'pending-'+phase}};
            const p=object.position;f.source.targetRaySpace.position=[p.x,p.y,p.z+.5];f.source.gripSpace.position=[p.x,p.y,p.z+.3];
            tick();f.emit('selectstart');tick();assert.ok(input.active?.sdk);
            assert.ok(owner.snapshot().held.length===1);
            assert.equal(record.explorerMolecule.puzzle.phase,phase,'SDK capture alone never commits');
            f.emit('selectend');tick();assert.equal(input.active,null);assert.deepEqual(owner.snapshot().held,[]);
        }
        assert.equal(record.explorerMolecule.puzzle,null);assert.ok(record.explorerMolecule.assembled.length>0);
    }finally{input?.destroy();runtime.dispose();globalThis.document=saved;}
});

for(const distance of [false,true])test(`SDK ${distance?'distance':'near'} grabs require a fresh action after hidden targets or blocked input`,()=>{
    const saved=globalThis.document;globalThis.document=createDocument();
    const f=fixture({hand:false});f.source.profiles=['oculus-touch-v3'];
    f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};
    const runtime=createNlxrInputBridge(f.session,sdk),owner=createTutorialInteractionOwner(runtime,GrabSDK,{distance});
    const body={id:'authored-object',position:{x:0,y:distance?1.2:1.1,z:distance?-1.2:-.15},rotation:{x:0,y:0,z:0,w:1},halfSize:{x:.055,y:.055,z:.055},visible:true};
    let time=0,enabled=true,uiBlocked=false;
    const press=down=>Object.assign(f.source.gamepad.buttons[1],{pressed:down,value:Number(down)});
    const step=()=>{
        runtime.update(f.frame,f.space,time+=20,time);
        owner.step([{source:f.source,...runtime.controllerState(f.source),uiBlocked,rayMatrix:runtime.input.xrOrigin.raySpaces.right.matrixWorld.elements}],[body],{rootMatrix:new THREE.Matrix4().elements,dt:.02,time:time/1000,enabled});
    };
    const acquire=()=>{press(false);step();press(true);step();assert.equal(owner.held(f.source)?.id,body.id);};
    try{
        step();step();acquire();body.visible=false;step();
        assert.equal(owner.held(f.source),null,'hidden target releases the actual SDK handle');
        assert.ok([...owner.grab.queries.handles.entities].every(entity=>!entity.hasComponent(GrabSDK.Grabbed)));
        body.visible=true;step();assert.equal(owner.held(f.source),null,'restoring does not recapture a held grip');
        acquire();press(false);step();
        for(const block of ['modal','disabled']){
            uiBlocked=block==='modal';enabled=block!=='disabled';press(true);step();step();
            assert.equal(owner.held(f.source),null);
            uiBlocked=false;enabled=true;step();step();
            assert.equal(owner.held(f.source),null,'press begun behind '+block+' requires release');
            acquire();press(false);step();
        }
    }finally{owner.dispose();runtime.dispose();globalThis.document=saved;}
});

test('native demo session bridges real SDK hold poses by stable ID, and hiding cancels once',async()=>{
    const saved=globalThis.document;globalThis.document=createDocument();const f=fixture({hand:false});
    f.source.profiles=['oculus-touch-v3'];f.source.gamepad={mapping:'xr-standard',axes:[0,0,0,0],buttons:Array.from({length:6},()=>({pressed:false,touched:false,value:0}))};
    const runtime=createNlxrInputBridge(f.session,sdk);let interaction;runtime.createDemoInteractions=()=>interaction=createTutorialInteractionOwner(runtime,GrabSDK,{scope:'demo',distance:true});runtime.createDemoAudio=async()=>null;
    const events=[],record={id:'authored-pigeon-pea',position:{x:0,y:1.2,z:-1.2}};
    const demo=createDemoSDKSession(runtime,{onGrab:record=>events.push('grab:'+record.id),onRelease:record=>events.push('release:'+record.id)});let time=0,enabled=true;
    const step=()=>{runtime.update(f.frame,f.space,time+=20,time);demo.update(f.frame,time,{enabled,records:[{record,halfSize:{x:.068,y:.068,z:.068}}],inputs:[{source:f.source,...runtime.controllerState(f.source),rayMatrix:runtime.input.xrOrigin.raySpaces.right.matrixWorld.elements}]});};
    try{
        step();step();Object.assign(f.source.gamepad.buttons[1],{pressed:true,value:1});step();
        assert.deepEqual(events,['grab:authored-pigeon-pea']);assert.ok(demo.owns(f.source));
        f.source.targetRaySpace.position=[.22,1.4,-.2];step();assert.ok(Math.abs(record.position.x-.22)<.001);
        enabled=false;step();step();assert.deepEqual(events,['grab:authored-pigeon-pea','release:authored-pigeon-pea']);
        enabled=true;step();assert.equal(demo.owns(f.source),false,'held grip cannot reactivate after hiding');
        Object.assign(f.source.gamepad.buttons[1],{pressed:false,value:0});step();demo.dispose();demo.dispose();await demo.ready;
        assert.equal(interaction.snapshot().targets,0);assert.equal(demo.owns(f.source),false);
    }finally{demo.dispose();runtime.dispose();globalThis.document=saved;}
});

test('SDK blends grip pointing and grip/trigger fist independently for both native hand skins', async () => {
    const originalDocument = globalThis.document, originalFetch = globalThis.fetch;
    globalThis.document = createDocument();
    globalThis.fetch = async url => ({ ok: true, arrayBuffer: async () => {
        const bytes = await readFile(new URL(url));
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } });
    let skin, attributes = 0; const draws = [];
    const gl = new Proxy({ getShaderParameter: () => true, getProgramParameter: () => true, getAttribLocation: () => attributes++,
        getUniformLocation: (program, name) => name, isEnabled: () => false,
        getParameter: () => false, createShader: () => ({}), createProgram: () => ({}), createBuffer: () => ({}),
        uniformMatrix4fv: (name, transpose, data) => { if (name === 'bones[0]') skin = Float32Array.from(data); },
        drawElements: () => draws.push(skin) }, { get: (target, key) => target[key] || (() => {}) });
    const renderer = createXRHandOutline(gl); const runtimes = [];
    try {
        await loaded(() => renderer.ready);
        for (const side of ['left', 'right']) {
            const f = fixture({ hand: false }); f.source.handedness = side;
            f.source.profiles = ['oculus-touch-v3'];
            f.source.gamepad = { mapping: 'xr-standard', axes: [0, 0, 0, 0],
                buttons: Array.from({ length: 6 }, () => ({ pressed: false, touched: false, value: 0 })) };
            const runtime = createNlxrInputBridge(f.session, sdk); runtimes.push(runtime);
            let time = 100, sequence = 0;
            const update = () => runtime.update(f.frame, f.space, time += 20, ++sequence);
            update(); await loaded(() => runtime.input.visualAdapters.controller[side].visual);
            update();
            const visual = runtime.input.visualAdapters.controller[side].visual;
            assert.ok(visual instanceof installedSdk.AnimatedControllerHand);
            const posed = [], targetRay = structuredClone(runtime.ray(f.source));
            for (const values of [[0, 0, 0], [0, .5, 0], [0, 1, 0], [1, 1, 0], [0, 1, 0], [0, 0, 0]]) {
                [0, 1, 3].forEach((button, i) => Object.assign(f.source.gamepad.buttons[button], { value: values[i], pressed: values[i] > 0 }));
                for (let i = 0; i < 32; i++) update();
                const state = runtime.controllerState(f.source); posed.push(state.handPose);
                assert.equal(state.handPose.size, 25);
                assert.equal(runtime.controllerState(f.source).handPose, state.handPose, 'one pose shared by both eyes and contact');
                assert.deepEqual(runtime.ray(f.source), targetRay, 'finger articulation never changes the menu target ray');
                assert.equal(state.trigger, values[0] > 0, 'native trigger action remains independent');
                assert.equal(state.down, values[1] > 0, 'native grab action remains on grip');
                for (const bone of visual.bones) {
                    const { defaultTransform, pressedTransform, buttonIndex } = bone.userData;
                    const expected = new THREE.Vector3().lerpVectors(defaultTransform.position, pressedTransform.position, visual.gamepad.buttons[buttonIndex].value);
                    assert.ok(bone.position.distanceTo(expected) < 1e-6, `${side} ${bone.name} uses SDK blending`);
                    if(values[1]===1){
                        const endpoint=buttonIndex===0 && values[0]===0?defaultTransform:pressedTransform;
                        assert.ok(bone.position.distanceTo(endpoint.position)<1e-6,'grip points until trigger curls the index');
                    }
                }
                const input = { source: f.source, ...state };
                const pointer = renderer.controllerPointer(input);
                assert.deepEqual(pointer, handJointPointer(state.handPose));
                const tip = state.handPose.get('index-finger-tip').matrix;
                assert.deepEqual(pointer.origin, { x: tip[12], y: tip[13], z: tip[14] });
                const identity = new THREE.Matrix4().elements;
                renderer.draw({ projectionMatrix: identity, transform: { matrix: identity, inverse: { matrix: identity } } }, [], { controllers: [input], filled: true, controllerReveal: { [side]: .5 } });
                assert.equal(draws.at(-1).length, 400);
                const bytes = await readFile(new URL(`../app/assets/meta-hand-${side}.glb`, import.meta.url));
                const asset = parseGlb(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
                const inverse = accessorData(asset, asset.json.skins[0].inverseBindMatrices).data;
                asset.json.skins[0].joints.forEach((id, i) => {
                    const expected = new THREE.Matrix4().fromArray(state.handPose.get(asset.json.nodes[id].name).matrix).multiply(new THREE.Matrix4().fromArray(inverse, i * 16)).elements;
                    expected.forEach((value, j) => assert.ok(Math.abs(value - skin[i * 16 + j]) < 1e-5, 'native shader skins exactly the SDK world pose'));
                });
            }
            for(const name of Object.keys(VIRTUAL_HAND_FIST_POSE).filter(name=>name.startsWith('index-finger'))){
                posed[0].get(name).matrix.forEach((value,i)=>assert.ok(Math.abs(value-posed[2].get(name).matrix[i])<1e-5,'grip leaves every index joint extended'));
                posed[2].get(name).matrix.forEach((value,i)=>assert.ok(Math.abs(value-posed[4].get(name).matrix[i])<1e-5,'releasing trigger restores pointing while grip stays held'));
            }
            assert.notDeepEqual(posed[2].get('index-finger-tip').matrix, posed[3].get('index-finger-tip').matrix,'grip plus trigger closes the index into the fist');
            for(const finger of ['middle-finger','ring-finger','pinky-finger','thumb']){
                const name=finger+'-tip';
                assert.notDeepEqual(posed[0].get(name).matrix,posed[2].get(name).matrix,'grip curls the non-index digits');
                posed[2].get(name).matrix.forEach((value,i)=>assert.ok(Math.abs(value-posed[3].get(name).matrix[i])<1e-5,'trigger does not change the other gripped fingers'));
            }
            assert.notDeepEqual(posed[0].get('thumb-tip').matrix, posed[2].get('thumb-tip').matrix, 'squeeze closes thumb without another button');
            assert.equal(f.source.gamepad.buttons[4].value,0,'A remains unpressed');
            for(const [name,joint] of posed[0])joint.matrix.forEach((value,i)=>assert.ok(Math.abs(value-posed[5].get(name).matrix[i])<1e-5,'releasing both controls restores the open hand'));
            f.source.gamepad.buttons[0].value=1;
            for(let i=0;i<32;i++)update();
            const triggerOnly=runtime.controllerState(f.source).handPose;
            assert.notDeepEqual(triggerOnly.get('index-finger-tip').matrix,posed[0].get('index-finger-tip').matrix);
            for(const finger of ['middle-finger','ring-finger','pinky-finger','thumb']){
                const name=finger+'-tip';
                triggerOnly.get(name).matrix.forEach((value,i)=>assert.ok(Math.abs(value-posed[0].get(name).matrix[i])<1e-5,'trigger does not close other digits'));
            }
            // A long resumed frame must not overshoot the SDK interpolation.
            f.source.gamepad.buttons[0].value = 1; time += 1000; update();
            assert.ok(visual.bones.every(bone => bone.userData.alpha >= 0 && bone.userData.alpha <= 1));
            f.session.inputSources = []; update();
            assert.equal(runtime.controllerState(f.source), null);
            f.source.gamepad.buttons[0].value = 0; f.session.inputSources = [f.source]; update();
            await loaded(() => runtime.input.visualAdapters.controller[side].visual); update();
            assert.ok(runtime.input.visualAdapters.controller[side].visual.bones.every(bone => bone.userData.alpha === 0));
            runtime.dispose();
            assert.equal([...installedSdk.XRInputVisualAdapter.visualCache.values()].includes(visual), false, 'session cache is released');
        }
    } finally { runtimes.forEach(runtime => runtime.dispose()); renderer.destroy(); globalThis.document = originalDocument; globalThis.fetch = originalFetch; }
});

test('authored fist preserves Meta palm anchors, physical segment lengths and stock SDK pose data', () => {
    const open=installedSdk.AnimatedControllerHand.defaultPose,closed=VIRTUAL_HAND_FIST_POSE;
    assert.equal(Object.keys(closed).length,25);
    assert.deepEqual(closed.wrist,open.wrist);
    for(const finger of ['thumb','index-finger','middle-finger','ring-finger','pinky-finger']){
        const chain=finger==='thumb'?['metacarpal','phalanx-proximal','phalanx-distal','tip']:['metacarpal','phalanx-proximal','phalanx-intermediate','phalanx-distal','tip'];
        let parent='wrist';
        for(const segment of chain){
            const name=finger+'-'+segment;
            assert.equal(closed[name].length,16);assert.ok(closed[name].every(Number.isFinite));
            const distance=pose=>new THREE.Vector3().fromArray(pose[name],12).distanceTo(new THREE.Vector3().fromArray(pose[parent],12));
            assert.ok(Math.abs(distance(open)-distance(closed))<1e-6,`${name} retains template bone length`);
            assert.ok(Math.abs(new THREE.Matrix4().fromArray(closed[name]).determinant()-1)<1e-5);
            parent=name;
        }
    }
    assert.notDeepEqual(closed['index-finger-tip'],installedSdk.AnimatedControllerHand.pressedPose['index-finger-tip'],'stock SDK is not globally mutated');
});

test('official tracked hand follows all 25 real joints and retains tracking-loss safeguards', async () => {
    const originalDocument = globalThis.document; globalThis.document = createDocument();
    const f = fixture();
    f.source.hand = new Map(Object.keys(installedSdk.AnimatedControllerHand.defaultPose).map((name, i) => [name, { jointName: name, position: [.02 + i * .001, 1.1 + i * .002, -.2] }]));
    const runtime = createNlxrInputBridge(f.session, sdk);
    try {
        runtime.update(f.frame, f.space, 100, 1);
        await loaded(() => runtime.input.visualAdapters.hand.right.visual);
        runtime.update(f.frame, f.space, 120, 2);
        const visual = runtime.input.visualAdapters.hand.right.visual;
        assert.ok(visual instanceof installedSdk.AnimatedHand);
        const state = runtime.handState(f.source, []);
        assert.equal(state.visualJoints.size, 25);
        for (const [name, joint] of state.visualJoints) {
            const bone = visual.model.getObjectByName(name);
            assert.deepEqual([...joint.matrix], [...Float32Array.from(bone.matrixWorld.elements)]);
        }
        f.source.hand.get('index-finger-tip').position[0] += .1;
        runtime.update(f.frame, f.space, 140, 3);
        assert.ok(runtime.handState(f.source, []).visualJoints.get('index-finger-tip').matrix[12] - state.visualJoints.get('index-finger-tip').matrix[12] > .09);
        f.missing.add(f.source.hand.get('wrist')); runtime.update(f.frame, f.space, 160, 4);
        assert.equal(runtime.handState(f.source, []).visualJoints, null);
        f.session.visibilityState = 'hidden'; runtime.update(f.frame, f.space, 180, 5);
        assert.equal(runtime.handState(f.source, []).visualJoints, null);
    } finally { runtime.dispose(); globalThis.document = originalDocument; }
});

test('installed IWSDK drives shared tutorial poses and native pinch/release without geometric false grabs', async () => {
    const original = globalThis.document; globalThis.document = createDocument();
    const f = fixture(); let runtime;
    try {
        runtime = await attachXRInputRuntime(f.session, { factory: session => createNlxrInputBridge(session, sdk) });
        beginHandTrackingFrame(f.frame, 100, f.space);
        const open = handTrackingState(f.frame, f.source, f.space);
        assert.equal(open.backend, 'iwsdk'); assert.equal(open.tracked, true);
        assert.equal(open.pinch, false, 'close fingertips alone do not synthesize a native pinch');
        assert.equal(handTrackingState(f.frame, f.source, f.space), open, 'one joint sample is shared by consumers');
        f.emit('selectstart');
        const held = handTrackingState(f.frame, f.source, f.space);
        assert.equal(held.pinch, true); assert.equal(held.pinchSequence, 1);
        f.source.hand.get('index-finger-tip').position[0] = .3;
        beginHandTrackingFrame(f.frame, 116, f.space);
        assert.equal(handTrackingState(f.frame, f.source, f.space).rawJoints.get('index-finger-tip').x, .3,
            'a reused XRFrame updates immediately without an additional position filter');
        f.emit('selectend');
        assert.equal(handTrackingState(f.frame, f.source, f.space).pinch, false);
        const ray = xrInputRay(f.frame, f.source, f.space);
        assert.deepEqual(ray.origin, { x: 0, y: 1.2, z: -.2 });
        assert.equal(ray.direction.z, -1);
    } finally { runtime?.dispose(); globalThis.document = original; }
});

test('tracking loss, blur and reconnection cannot retain a tutorial grab or stale ray', () => {
    const original = globalThis.document; globalThis.document = createDocument();
    const f = fixture(); const runtime = createNlxrInputBridge(f.session, sdk);
    try {
        runtime.update(f.frame, f.space, 100, 1); f.emit('selectstart'); runtime.update(f.frame, f.space, 116, 2);
        assert.equal(runtime.handState(f.source, []).pinch, true);
        f.missing.add(f.source.hand.get('index-finger-tip'));
        runtime.update(f.frame, f.space, 132, 3);
        assert.equal(runtime.handState(f.source, []).tracked, false);
        assert.equal(runtime.handState(f.source, []).pinch, false);
        f.missing.add(f.source.targetRaySpace); runtime.update(f.frame, f.space, 148, 4);
        assert.equal(runtime.ray(f.source), null);
        f.missing.clear(); f.session.visibilityState = 'visible-blurred'; f.emit('visibilitychange');
        runtime.update(f.frame, f.space, 164, 5);
        assert.equal(runtime.handState(f.source, []).pinch, false); assert.equal(runtime.ray(f.source), null);
        f.session.visibilityState = 'visible'; runtime.update(f.frame, f.space, 180, 6);
        assert.equal(runtime.handState(f.source, []).pinch, false);
        f.session.inputSources = []; runtime.update(f.frame, f.space, 196, 7);
        assert.equal(runtime.handState(f.source, []), null); assert.equal(runtime.ray(f.source), null);
        f.session.inputSources = [f.source]; runtime.update(f.frame, f.space, 212, 8);
        assert.equal(runtime.handState(f.source, []).pinch, false);
        f.emit('selectend'); f.emit('selectstart'); runtime.update(f.frame, f.space, 228, 9);
        assert.equal(runtime.handState(f.source, []).pinch, true);
    } finally { runtime.dispose(); globalThis.document = original; }
});

test('session input owner attaches once, ends once and supports fresh sessions', async () => {
    const session = new EventTarget(); let created = 0, disposed = 0;
    const factory = () => ({ backend: 'iwsdk', dispose() { disposed++; } });
    const create = () => { created++; return factory(); };
    const [a, b] = await Promise.all([attachXRInputRuntime(session, { factory: create }), attachXRInputRuntime(session, { factory: create })]);
    assert.equal(a, b); assert.equal(created, 1);
    session.dispatchEvent(new Event('end')); session.dispatchEvent(new Event('end'));
    assert.equal(disposed, 1); assert.equal(xrInputRuntime(session), undefined);
    const next = new EventTarget(); await attachXRInputRuntime(next, { factory: create });
    assert.equal(created, 2); next.dispatchEvent(new Event('end')); assert.equal(disposed, 2);
});

test('tutorial controller grip and trigger use SDK profile mapping and release after reconnect', () => {
    const original = globalThis.document; globalThis.document = createDocument();
    const f = fixture({ hand: false });
    f.source.profiles = ['oculus-touch-v3'];
    f.source.gamepad = { mapping: 'xr-standard', axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 6 }, () => ({ pressed: false, touched: false, value: 0 })) };
    const runtime = createNlxrInputBridge(f.session, sdk);
    try {
        runtime.update(f.frame, f.space, 100, 1);
        assert.equal(runtime.controllerState(f.source).down, false);
        Object.assign(f.source.gamepad.buttons[1], { pressed: true, value: .8 });
        runtime.update(f.frame, f.space, 116, 2);
        assert.equal(runtime.controllerState(f.source).down, true);
        assert.ok(Math.abs(runtime.controllerState(f.source).grip - .8) < 1e-6);
        assert.equal(runtime.controllerState(f.source).trigger, false);
        Object.assign(f.source.gamepad.buttons[1], { pressed: false, value: 0 });
        Object.assign(f.source.gamepad.buttons[0], { pressed: true, value: 1 });
        runtime.update(f.frame, f.space, 132, 3);
        assert.equal(runtime.controllerState(f.source).down, false);
        assert.equal(runtime.controllerState(f.source).trigger, true);
        f.session.inputSources = []; runtime.update(f.frame, f.space, 148, 4);
        assert.equal(runtime.controllerState(f.source), null);
        Object.assign(f.source.gamepad.buttons[0], { pressed: false, value: 0 });
        f.session.inputSources = [f.source]; runtime.update(f.frame, f.space, 164, 5);
        assert.equal(runtime.controllerState(f.source).trigger, false);
        f.missing.add(f.source.gripSpace); runtime.update(f.frame, f.space, 180, 6);
        assert.equal(runtime.controllerState(f.source), null);
    } finally { runtime.dispose(); globalThis.document = original; }
});

test('failed SDK imports can retry rather than poisoning later tutorial starts', async () => {
    await assert.rejects(prepareXRInputRuntime(async () => { throw new Error('offline'); }), /offline/);
    const factory = () => ({});
    assert.equal(await prepareXRInputRuntime(async () => ({ createNlxrInput: factory })), factory);
});
