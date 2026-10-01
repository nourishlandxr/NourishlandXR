export const DEMO_EXIT_STATES = Object.freeze({
    IDLE: 'idle',
    CONFIRMING: 'confirming',
    ENDING: 'ending'
});

/**
 * Coordinate a demo exit without tying the lifecycle to either the DOM or an
 * XR renderer. The caller owns the session variable and should detach only
 * the supplied session in `detachSession`, for example:
 *
 *     detachSession: owned => { if (session === owned) session = null; }
 *
 * The same identity rule lets an XR `end` listener call `handleSessionEnd`
 * safely: late events from an older session are ignored, while a natural end
 * of the current session is cleaned up and navigated exactly once.
 */
export function createDemoExitLifecycle({
    getSession = () => null,
    detachSession = () => {},
    cleanup = () => {},
    navigate = () => {},
    onStateChange = () => {},
    onError = () => {}
} = {}) {
    let state = DEMO_EXIT_STATES.IDLE;
    let ownedSession = null;
    let confirmPromise = null;
    let finalizePromise = null;
    let finalizing = false;
    let finished = false;

    const report = (error, phase) => {
        try { onError(error, phase); } catch { /* error reporting must not break exit */ }
    };
    const changeState = next => {
        if (state === next) return;
        const previous = state;
        state = next;
        try { onStateChange(next, previous); }
        catch (error) { report(error, 'state-change'); }
    };
    const currentSession = () => {
        try { return getSession() || null; }
        catch (error) { report(error, 'get-session'); return null; }
    };
    const detach = candidate => {
        if (!candidate) return;
        try { detachSession(candidate); }
        catch (error) { report(error, 'detach-session'); }
    };
    const finalizeOnce = () => {
        if (finalizePromise) return finalizePromise;
        finalizing = true;
        finalizePromise = (async () => {
            try { await cleanup(); }
            catch (error) { report(error, 'cleanup'); }
            try { await navigate(); }
            catch (error) { report(error, 'navigate'); }
            finished = true;
            finalizing = false;
            return true;
        })();
        return finalizePromise;
    };

    const api = {
        get state() { return state; },
        get ownedSession() { return ownedSession; },
        get finished() { return finished; },

        request() {
            if (state !== DEMO_EXIT_STATES.IDLE || finalizing || finished) return false;
            changeState(DEMO_EXIT_STATES.CONFIRMING);
            return true;
        },

        cancel() {
            if (state !== DEMO_EXIT_STATES.CONFIRMING || finalizing || finished) return false;
            changeState(DEMO_EXIT_STATES.IDLE);
            return true;
        },

        confirm() {
            if (confirmPromise) return confirmPromise;
            if (state !== DEMO_EXIT_STATES.CONFIRMING || finalizing || finished) return Promise.resolve(false);
            changeState(DEMO_EXIT_STATES.ENDING);
            ownedSession = currentSession();
            detach(ownedSession);
            confirmPromise = (async () => {
                if (ownedSession?.end) {
                    try { await ownedSession.end(); }
                    catch (error) { report(error, 'session-end'); }
                }
                await finalizeOnce();
                return true;
            })();
            return confirmPromise;
        },

        ownsSession(candidate) {
            return Boolean(candidate && currentSession() === candidate);
        },

        handleSessionEnd(candidate) {
            if (!candidate || currentSession() !== candidate || finished) return Promise.resolve(false);
            if (state !== DEMO_EXIT_STATES.ENDING) changeState(DEMO_EXIT_STATES.ENDING);
            ownedSession = candidate;
            detach(candidate);
            return finalizeOnce();
        },

        reset() {
            if (finalizing || state === DEMO_EXIT_STATES.ENDING && !finished) return false;
            changeState(DEMO_EXIT_STATES.IDLE);
            ownedSession = null;
            confirmPromise = null;
            finalizePromise = null;
            finished = false;
            return true;
        }
    };

    return api;
}
