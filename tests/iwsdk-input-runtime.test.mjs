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
