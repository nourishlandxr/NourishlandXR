export const HOLD_TO_CONFIRM_DURATION_MS = 2000;

/**
 * Timer-free state machine used by the DOM binding and by automated tests.
 * Rendering and event policy stay in one place, while callers can advance it
 * with a supplied timestamp for deterministic verification.
 */
export function createHoldToConfirmController(options = {}) {
    const duration = Math.max(1, Number(options.duration) || HOLD_TO_CONFIRM_DURATION_MS);
    const now = options.now || (() => performance.now());
    let startedAt = 0;
    let active = false;
    let completed = false;
    let progress = 0;

    const notifyProgress = value => {
        progress = Math.max(0, Math.min(1, Number(value) || 0));
        options.onProgress?.(progress);
    };

    return {
        get active() { return active; },
        get completed() { return completed; },
        get progress() { return progress; },
        start(timestamp = now()) {
            if (active) return false;
            active = true;
            completed = false;
            startedAt = Number(timestamp) || 0;
            notifyProgress(0);
            return true;
        },
        tick(timestamp = now()) {
            if (!active) return completed;
            const elapsed = Math.max(0, (Number(timestamp) || 0) - startedAt);
            const next = Math.min(1, elapsed / duration);
            notifyProgress(next);
            if (next < 1) return false;
            active = false;
            completed = true;
            options.onComplete?.();
            return true;
        },
        cancel() {
            if (!active && !completed && progress === 0) return false;
            active = false;
            completed = false;
            startedAt = 0;
            notifyProgress(0);
            return true;
        },
        reset() {
            active = false;
            completed = false;
            startedAt = 0;
            notifyProgress(0);
        }
    };
}

function animationFrame(callback) {
    if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(callback);
    return setTimeout(() => callback(performance.now()), 16);
}

function cancelAnimationFrameSafe(handle) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle);
    else clearTimeout(handle);
}

/** Bind the shared hold behavior to a button and return a cleanup function. */
export function bindHoldToConfirmButton(button, options = {}) {
    if (!button) return () => {};
    const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let frame = null;
    let pointerId = null;
    let suppressClick = false;
    let keyboardActive = false;
    let resetTimer = null;
    const setVisualState = progress => {
        button.style.setProperty('--hold-progress', `${Math.round(progress * 100)}%`);
        button.classList.toggle('is-holding', progress > 0 && progress < 1);
        button.classList.toggle('is-hold-complete', progress >= 1);
        button.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    };
    const controller = createHoldToConfirmController({
        ...options,
        onProgress: progress => {
            setVisualState(progress);
            options.onProgress?.(progress);
        },
        onComplete: () => {
            suppressClick = true;
            button.classList.add('is-hold-complete');
            options.onComplete?.();
        }
    });
    const stopFrame = () => {
        if (frame !== null) cancelAnimationFrameSafe(frame);
        frame = null;
    };
    const reset = () => {
        stopFrame();
        controller.reset();
        setVisualState(0);
        pointerId = null;
        keyboardActive = false;
    };
    const cancel = () => {
        if (!controller.active) return;
        stopFrame();
        controller.cancel();
        setVisualState(0);
        pointerId = null;
        keyboardActive = false;
        button.classList.remove('is-hold-cancelled');
        // A class transition gives cancellation feedback without requiring a
        // motion-heavy animation and is harmless under reduced motion.
        void button.offsetWidth;
        button.classList.add('is-hold-cancelled');
    };
    const loop = timestamp => {
        frame = null;
        if (!controller.active) return;
        if (controller.tick(timestamp)) {
            if (reducedMotion) return;
            return;
        }
        frame = animationFrame(loop);
    };
    const start = event => {
        if (controller.active || controller.completed) return;
        event?.preventDefault?.();
        if (!controller.start(performance.now())) return;
        button.classList.add('is-holding');
        frame = animationFrame(loop);
    };
    const pointerDown = event => {
        pointerId = event.pointerId;
        button.setPointerCapture?.(pointerId);
        start(event);
    };
    const pointerMove = event => {
        if (!controller.active || pointerId !== event.pointerId) return;
        const rect = button.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cancel();
    };
    const pointerUp = event => {
        if (pointerId !== null && event.pointerId !== pointerId) return;
        if (controller.active) cancel();
        pointerId = null;
        if (controller.completed) {
            resetTimer = setTimeout(reset, 240);
        }
    };
    const keyDown = event => {
        if (![' ', 'Enter'].includes(event.key) || event.repeat) return;
        event.preventDefault();
        if (keyboardActive) return;
        keyboardActive = true;
        start(event);
    };
    const keyUp = event => {
        if (![' ', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        keyboardActive = false;
        if (controller.active) cancel();
        else if (controller.completed) resetTimer = setTimeout(reset, 240);
    };
    const click = event => {
        event.preventDefault();
        event.stopPropagation();
        if (suppressClick) suppressClick = false;
    };
    const visibility = () => {
        if (document.visibilityState !== 'visible') cancel();
    };
    const lostCapture = () => cancel();
    const contextMenu = event => {
        if (controller.active) event.preventDefault();
    };

    button.setAttribute('role', 'progressbar');
    button.setAttribute('aria-valuemin', '0');
    button.setAttribute('aria-valuemax', '100');
    button.setAttribute('aria-valuenow', '0');
    setVisualState(0);
    button.addEventListener('pointerdown', pointerDown);
    button.addEventListener('pointermove', pointerMove);
    button.addEventListener('pointerup', pointerUp);
    button.addEventListener('pointercancel', cancel);
    button.addEventListener('pointerleave', cancel);
    button.addEventListener('lostpointercapture', lostCapture);
    button.addEventListener('keydown', keyDown);
    button.addEventListener('keyup', keyUp);
    button.addEventListener('blur', cancel);
    button.addEventListener('click', click);
    button.addEventListener('contextmenu', contextMenu);
    document.addEventListener('visibilitychange', visibility);

    return () => {
        stopFrame();
        if (resetTimer) clearTimeout(resetTimer);
        reset();
        button.removeEventListener('pointerdown', pointerDown);
        button.removeEventListener('pointermove', pointerMove);
        button.removeEventListener('pointerup', pointerUp);
        button.removeEventListener('pointercancel', cancel);
        button.removeEventListener('pointerleave', cancel);
        button.removeEventListener('lostpointercapture', lostCapture);
        button.removeEventListener('keydown', keyDown);
        button.removeEventListener('keyup', keyUp);
        button.removeEventListener('blur', cancel);
        button.removeEventListener('click', click);
        button.removeEventListener('contextmenu', contextMenu);
        document.removeEventListener('visibilitychange', visibility);
    };
}
