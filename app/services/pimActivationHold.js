export const PIM_ACTIVATION_MS = 500;

const pimHoldTargetKey = target => target && String(target.record?.marker?.id || target.record?.id) + ':' + String(target.target?.path || target.target?.node?.path || target.target?.pimBack);

export function createPimHold({ activate, progress = () => {}, duration = PIM_ACTIVATION_MS }) {
    let active = null;
    return {
        start(target, time) { if (!target) return false; active = { target, key: pimHoldTargetKey(target), time, done: false, step: -1 }; return true; },
        tick(target, time) {
            if (!active) return;
            if (pimHoldTargetKey(target) !== active.key) { this.cancel(); return; }
            if (active.done) return;
            const amount = Math.min(1, Math.max(0, (time - active.time) / duration));
            const step = Math.floor(amount * 20);
            if (step !== active.step) { active.step = step; progress(active.target, step / 20); }
            if (amount >= 1) { active.done = true; progress(active.target, 0); activate(active.target); }
        },
        activateNow(target=active?.target) { if(!active || active.done || pimHoldTargetKey(target)!==active.key)return false;active.done=true;progress(active.target,0);activate(active.target);return true; },
        cancel() { if (active) progress(active.target, 0); active = null; },
        get active() { return Boolean(active); }
    };
}

// XR frames keep running when normal window timers are suspended by a headset.
export function bindSpatialPimHold({ session, getTarget, enabled, activate, progress, captureEvent = () => {} }) {
    let source = null, pressedTarget = null, gestureComplete = false, selectObserved = false;
    let suppressSource = null, suppressUntil = 0;
    const hold = createPimHold({ activate: target => { gestureComplete = true; activate(target); }, progress });
    const activatePressedCell = () => {
        if (gestureComplete || !pressedTarget || !enabled()
            || pimHoldTargetKey(getTarget()) !== pimHoldTargetKey(pressedTarget)) return false;
        // A missed XR frame can cancel the dwell without changing the cell
        // under the controller at release. A short trigger press must still
        // open that exact cell, once, without waiting for another 500 ms hold.
        if (hold.activateNow(pressedTarget)) return true;
        gestureComplete = true;
        activate(pressedTarget);
        return true;
    };
    const start = event => {
        if (source) return;
        hold.cancel(); source = null; pressedTarget = null; gestureComplete = false; selectObserved = false;
        suppressSource = null; suppressUntil = 0;
        if (event.inputSource?.targetRayMode !== 'tracked-pointer' || !enabled()) return;
        captureEvent(event);
        const target = getTarget(); if (!target) return;
        source = event.inputSource; pressedTarget = target; hold.start(target, performance.now()); event.stopImmediatePropagation();
    };
    const end = event => {
        if (event.inputSource !== source) return;
        captureEvent(event);
        // Some WebXR runtimes emit selectend before select. Complete the
        // same-cell short press here, then consume the trailing select below.
        if (!selectObserved) activatePressedCell();
        hold.cancel(); suppressSource = source; source = null; pressedTarget = null;
        suppressUntil = performance.now() + 300; event.stopImmediatePropagation();
    };
    const select = event => {
        if (event.inputSource === source) {
            captureEvent(event);
            selectObserved = true;
            activatePressedCell();
            hold.cancel();
            suppressSource = source; suppressUntil = performance.now() + 300;
            event.stopImmediatePropagation();
        } else if (event.inputSource === suppressSource && performance.now() < suppressUntil) {
            event.stopImmediatePropagation();
        }
    };
    const cancel=()=>{hold.cancel();source=null;pressedTarget=null;gestureComplete=false;selectObserved=false;suppressSource=null;suppressUntil=0;};
    // Quest may report visible-blurred (or omit visibilityState) while input
    // still arrives. Only an explicitly hidden session invalidates the hold.
    const visibility = () => { if (session.visibilityState === 'hidden') cancel(); };
    session.addEventListener('selectstart', start, true); session.addEventListener('selectend', end, true); session.addEventListener('select', select, true);
    session.addEventListener('visibilitychange', visibility);
    return {
        tick(time) { if (!enabled()) hold.cancel(); else hold.tick(getTarget(), time); },
        cancel,
        destroy() { cancel(); session.removeEventListener('selectstart', start, true); session.removeEventListener('selectend', end, true); session.removeEventListener('select', select, true); session.removeEventListener('visibilitychange', visibility); }
    };
}
