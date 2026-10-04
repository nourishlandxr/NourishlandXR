import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { isQuestHeadsetBrowser, selectWebXRSessionMode, requestImmersiveArSession } from '../app/services/webxrSession.js';
import { controllerRayEnd, controllerRayFromPose, controllerYButtonPressed, createControllerYSkipTracker, handTrackingState, XR_CONTROLLER_Y_BUTTON_INDEX, XR_HAND_JOINT_CONNECTIONS, XR_LASER_POINTER_CONFIG } from '../app/services/xrPointer.js';

test('WebXR prefers passthrough AR and falls back to native 6DoF immersive mode', () => {
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': true, 'immersive-vr': true }), 'immersive-ar');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': true }), 'immersive-vr');
    assert.equal(selectWebXRSessionMode({ 'immersive-ar': false, 'immersive-vr': false }), '');
});

test('XR startup returns while refresh-rate negotiation is still pending', async () => {
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    let requested = null;
    const session = { supportedFrameRates: [72,90,120], frameRate: 72, environmentBlendMode: 'alpha-blend',
        updateTargetFrameRate(rate) { requested = rate; return new Promise(() => {}); } };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { xr: {
        isSessionSupported: async mode => mode === 'immersive-ar', requestSession: async () => session
    } } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
    let timer;
    try {
        const result = await Promise.race([requestImmersiveArSession(null),new Promise((_,reject) => {
            timer = setTimeout(() => reject(new Error('XR startup waited for refresh negotiation')), 500);
        })]);
        assert.equal(result.session, session);
        assert.equal(requested, 90);
        assert.equal(result.passthrough, true);
    } finally {
        clearTimeout(timer);
        if(previousNavigator)Object.defineProperty(globalThis,'navigator',previousNavigator);else delete globalThis.navigator;
        if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else delete globalThis.window;
    }
});

test('Quest detection is headset-specific and does not classify phone AR as Quest', () => {
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 OculusBrowser/37.0.0.9.57'), true);
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 (Linux; Android 12; Meta Quest 3) AppleWebKit/537.36'), true);
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 (Linux; Android 12; Quest 3) AppleWebKit/537.36'), true);
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36', { model: 'Quest 3' }), true);
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126 Mobile Safari/537.36'), false);
    assert.equal(isQuestHeadsetBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), false);
});

test('shared WebXR session service retains both Quest and phone modes', async () => {
    const source = readFileSync(new URL('../app/services/webxrSession.js', import.meta.url), 'utf8');
    assert.match(source, /isSessionSupported\('immersive-ar'\)/);
    assert.match(source, /isSessionSupported\('immersive-vr'\)/);
    assert.match(source, /requestSession\('immersive-ar'/);
    assert.match(source, /requestSession\('immersive-vr'/);
    assert.match(source, /requiredFeatures: \['hit-test'\], optionalFeatures: \['dom-overlay', 'local-floor'\]/);
    assert.match(source, /requiredFeatures: \[\], optionalFeatures: \[\]/);
    assert.match(source, /requireDomOverlay = false/);
    assert.match(source, /preferDomOverlay = false/);
    assert.match(source, /preferDomOverlay\) return \[\.\.\.requiredDomOverlayAttempts\(mode\), \.\.\.SESSION_ATTEMPTS\[mode\]\]/);
    assert.match(source, /requiredFeatures: \[\], optionalFeatures: \[\]/);
    assert.match(source, /session\.domOverlayState/);
    assert.match(source, /passthrough: mode === 'immersive-ar' && blendMode !== 'opaque'/);
});

test('Quest laser pointer configuration is shared by immersive modes', () => {
    const arSource = readFileSync(new URL('../app/screens/arMode.js', import.meta.url), 'utf8');
    const demoSource = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(arSource, /from '\.\.\/services\/xrPointer\.js'/);
    assert.match(demoSource, /from '\.\.\/services\/xrPointer\.js'/);
    const ray = controllerRayFromPose({ transform: { matrix: [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        1, 2, 3, 1
    ] } }, 'right');
    assert.deepEqual(ray.origin, { x: 1, y: 2, z: 3 });
    assert.deepEqual(ray.direction, { x: -0, y: -0, z: -1 });
    assert.equal(ray.handedness, 'right');
    assert.equal(XR_LASER_POINTER_CONFIG.length, 1000);
    const subjectEnd = controllerRayEnd(ray, [{ position: { x: 1, y: 2, z: 1 }, radius: .25 }]);
    assert.equal(subjectEnd.distance, 1.75);
    assert.equal(subjectEnd.z, 1.25);
    assert.equal(controllerRayEnd(ray, []).distance, 1000);
});

test('demo skip input reads only the left controller Y button', () => {
    const buttons = index => Array.from({ length: index + 1 }, (_, current) => ({ pressed: current === index }));
    const leftY = { handedness: 'left', targetRayMode: 'tracked-pointer', gamepad: { buttons: buttons(5) } };
    const rightB = { handedness: 'right', targetRayMode: 'tracked-pointer', gamepad: { buttons: buttons(5) } };
    const leftHand = { handedness: 'left', hand: {}, gamepad: { buttons: buttons(5) } };
    assert.equal(XR_CONTROLLER_Y_BUTTON_INDEX, 5);
    assert.equal(controllerYButtonPressed([leftY]), true);
    assert.equal(controllerYButtonPressed([rightB]), false);
    assert.equal(controllerYButtonPressed([leftHand]), false);
    assert.equal(controllerYButtonPressed([]), false);
});

test('controller Y skip tracker advances once per press and can be reset', () => {
    const buttons = index => Array.from({ length: index + 1 }, (_, current) => ({ pressed: current === index }));
    const leftY = { handedness: 'left', gamepad: { buttons: buttons(5) } };
    let skips = 0;
    const tracker = createControllerYSkipTracker(() => { skips += 1; });
    assert.equal(tracker.poll([leftY]), true);
    assert.equal(tracker.poll([leftY]), false);
    assert.equal(skips, 1);
    assert.equal(tracker.poll([]), false);
    assert.equal(tracker.poll([leftY]), true);
    assert.equal(skips, 2);
    tracker.reset();
    assert.equal(tracker.poll([leftY]), true);
    assert.equal(skips, 3);
});

test('WebXR hand tracking uses standard joint names and produces a visible hand pointer', () => {
    const names = [...new Set(XR_HAND_JOINT_CONNECTIONS.flat())];
    assert.ok(names.every(name => !name.includes(' ')));
    assert.ok(names.includes('index-finger-phalanx-proximal'));
    const source = { handedness:'right', hand:{ get:name => names.includes(name) ? name : null } };
    const frame = { getJointPose(name){
        const point = name === 'wrist' ? [0,0,0] : name === 'index-finger-tip' ? [0,0,-.2] : name === 'thumb-tip' ? [.08,0,-.2] : [0,0,-.1];
        return { radius:.01, transform:{ matrix:[1,0,0,0,0,1,0,0,0,0,1,0,...point,1] } };
    } };
    const state = handTrackingState(frame, source, {});
    assert.equal(state.joints.size, names.length);
    const {x,y,z,radius}=state.pointer.origin;
    assert.deepEqual({x,y,z,radius}, { x:0, y:0, z:-.2, radius:.01 });
    assert.ok(Number.isFinite(state.pointer.origin.lastSeenAt));
    assert.equal(state.pointer.origin.matrix.length,16);
    assert.equal(state.tracked,true);
    assert.deepEqual(state.rawJoints.get('index-finger-tip').matrix.slice(12,15),new Float32Array([0,0,-.2]));
    assert.deepEqual(state.pointer.direction, { x:0, y:0, z:-1 });
    assert.equal(state.pinch, false);
});
