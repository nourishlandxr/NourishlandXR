// Shared deliberate activation state for Learning Information Mesh cells.
// Plant PIM continues to use pimActivationHold.js and its own interaction state.
export const LIM_ACTIVATION_MS = 500;

export function createLimActivationController({
    duration = LIM_ACTIVATION_MS,
    now = () => performance.now(),
    onProgress = () => {},
    onStart = () => {},
    onCancel = () => {},
    onComplete = () => {}
} = {}) {
    const holdDuration = Math.max(1, Number(duration) || LIM_ACTIVATION_MS);
    let activeKey = '';
    let startedAt = 0;
    let progress = 0;
    let completedKey = '';
    let suppressUntil = 0;

    const emitProgress = (key, value) => {
        progress = Math.max(0, Math.min(1, Number(value) || 0));
        onProgress(key, progress);
    };
    const cancel = (reason = 'cancelled') => {
        if (!activeKey) return false;
        const key = activeKey;
        activeKey = '';
        startedAt = 0;
        completedKey = '';
        emitProgress(key, 0);
        onCancel(key, reason);
        return true;
    };
    const complete = (key, timestamp) => {
        activeKey = '';
        startedAt = 0;
        completedKey = key;
        suppressUntil = (Number(timestamp) || now()) + 450;
        emitProgress(key, 1);
        onComplete(key);
        return true;
    };

    return {
        get activeKey() { return activeKey; },
        get completedKey() { return completedKey; },
        get progress() { return progress; },
        get active() { return Boolean(activeKey); },
        start(key, timestamp = now(), source = 'pointer') {
            if (!key) return false;
            if (activeKey === key) return false;
            if (activeKey) cancel('replaced');
            completedKey = '';
            activeKey = String(key);
            startedAt = Number(timestamp) || 0;
            emitProgress(activeKey, 0);
            onStart(activeKey, source);
            return true;
        },
        tick(key = activeKey, timestamp = now()) {
            if (!activeKey) return false;
            if (String(key || '') !== activeKey) {
                cancel('pointer-left');
                return false;
            }
            const elapsed = Math.max(0, (Number(timestamp) || 0) - startedAt);
            const amount = Math.min(1, elapsed / holdDuration);
            emitProgress(activeKey, amount);
            if (amount < 1) return false;
            return complete(activeKey, timestamp);
        },
        end(key, timestamp = now()) {
            if (!activeKey || String(key || '') !== activeKey) return false;
            if (this.tick(key, timestamp)) return true;
            cancel('released-early');
            return false;
        },
        activateNow(key, timestamp = now(), source = 'keyboard') {
            if (!key) return false;
            if (activeKey) cancel('replaced');
            completedKey = '';
            activeKey = String(key);
            onStart(activeKey, source);
            return complete(activeKey, timestamp);
        },
        cancel,
        consumeSyntheticClick(key, timestamp = now()) {
            const current = Number(timestamp) || now();
            const suppressed = String(key || '') === completedKey || current < suppressUntil;
            if (suppressed) {
                completedKey = '';
                return true;
            }
            return false;
        },
        reset() {
            if (activeKey) cancel('reset');
            activeKey = '';
            startedAt = 0;
            progress = 0;
            completedKey = '';
            suppressUntil = 0;
        }
    };
}
