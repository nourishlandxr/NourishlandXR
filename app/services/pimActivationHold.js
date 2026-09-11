export const PIM_ACTIVATION_MS = 500;

export function createPimHold({ activate, progress = () => {}, duration = PIM_ACTIVATION_MS }) {
    let active = null;
    const key = target => target && String(target.record?.marker?.id || target.record?.id) + ':' + String(target.target?.path || target.target?.node?.path || target.target?.pimBack);
    return {
        start(target, time) { if (!target) return false; active = { target, key: key(target), time, done: false, step: -1 }; return true; },
        tick(target, time) {
            if (!active) return;
            if (key(target) !== active.key) { this.cancel(); return; }
            if (active.done) return;
            const amount = Math.min(1, Math.max(0, (time - active.time) / duration));
            const step = Math.floor(amount * 20);
            if (step !== active.step) { active.step = step; progress(active.target, step / 20); }
            if (amount >= 1) { active.done = true; progress(active.target, 0); activate(active.target); }
        },
        cancel() { if (active) progress(active.target, 0); active = null; },
        get active() { return Boolean(active); }
    };
}

// XR frames keep running when normal window timers are suspended by a headset.
export function bindSpatialPimHold({ session, getTarget, enabled, activate, progress }) {
    const hold = createPimHold({ activate, progress });
    let source = null, suppressUntil = 0;
    const start = event => {
        hold.cancel(); source = null; suppressUntil = 0;
        if (event.inputSource?.targetRayMode !== 'tracked-pointer' || !enabled()) return;
        const target = getTarget(); if (!target) return;
        source = event.inputSource; hold.start(target, performance.now()); event.stopImmediatePropagation();
    };
    const end = event => {
        if (event.inputSource !== source) return;
        hold.cancel(); suppressUntil = performance.now() + 300; event.stopImmediatePropagation();
    };
    const select = event => {
        if (event.inputSource === source && (hold.active || performance.now() < suppressUntil)) event.stopImmediatePropagation();
    };
    const visibility = () => { if (session.visibilityState !== 'visible') hold.cancel(); };
    session.addEventListener('selectstart', start, true); session.addEventListener('selectend', end, true); session.addEventListener('select', select, true);
    session.addEventListener('visibilitychange', visibility);
    return {
        tick(time) { if (!enabled()) hold.cancel(); else hold.tick(getTarget(), time); },
        destroy() { hold.cancel(); session.removeEventListener('selectstart', start, true); session.removeEventListener('selectend', end, true); session.removeEventListener('select', select, true); session.removeEventListener('visibilitychange', visibility); }
    };
}
