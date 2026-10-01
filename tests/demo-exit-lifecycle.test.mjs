import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoExitLifecycle, DEMO_EXIT_STATES } from '../app/services/demoExitLifecycle.js';

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
}

test('close request and cancel preserve the running experience', () => {
    const transitions = [];
    let cleanupCount = 0;
    let navigationCount = 0;
    const lifecycle = createDemoExitLifecycle({
        cleanup: () => { cleanupCount += 1; },
        navigate: () => { navigationCount += 1; },
        onStateChange: (next, previous) => transitions.push(`${previous}->${next}`)
    });

    assert.equal(lifecycle.state, DEMO_EXIT_STATES.IDLE);
    assert.equal(lifecycle.request(), true);
    assert.equal(lifecycle.request(), false, 'a second request does not create another confirmation');
    assert.equal(lifecycle.state, DEMO_EXIT_STATES.CONFIRMING);
    assert.equal(lifecycle.cancel(), true);
    assert.equal(lifecycle.cancel(), false);
    assert.equal(lifecycle.state, DEMO_EXIT_STATES.IDLE);
    assert.equal(cleanupCount, 0);
    assert.equal(navigationCount, 0);
    assert.deepEqual(transitions, ['idle->confirming', 'confirming->idle']);
});

test('confirmed close is single-flight and waits for the owned XR session to end', async () => {
    const ending = deferred();
    const order = [];
    const session = { end: () => { order.push('end'); return ending.promise; } };
    let currentSession = session;
    const lifecycle = createDemoExitLifecycle({
        getSession: () => currentSession,
        detachSession: owned => {
            order.push('detach');
            if (currentSession === owned) currentSession = null;
        },
        cleanup: () => { order.push('cleanup'); },
        navigate: () => { order.push('navigate'); }
    });

    lifecycle.request();
    const first = lifecycle.confirm();
    const second = lifecycle.confirm();
    assert.equal(first, second, 'repeat confirmation returns the same in-flight promise');
    assert.equal(lifecycle.state, DEMO_EXIT_STATES.ENDING);
    assert.equal(lifecycle.ownedSession, session);
    assert.equal(lifecycle.reset(), false, 'an in-flight session end cannot be reset');
    assert.deepEqual(order, ['detach', 'end']);
    assert.equal(lifecycle.handleSessionEnd(session) instanceof Promise, true);
    assert.equal(await lifecycle.handleSessionEnd(session), false, 'the detached session end event is stale');
    assert.deepEqual(order, ['detach', 'end']);

    ending.resolve();
    assert.equal(await first, true);
    assert.deepEqual(order, ['detach', 'end', 'cleanup', 'navigate']);
    assert.equal(lifecycle.finished, true);
});

test('session end rejection still cleans and navigates exactly once', async () => {
    const failure = new Error('XR session already ended');
    const errors = [];
    let cleanupCount = 0;
    let navigationCount = 0;
    const session = { end: () => Promise.reject(failure) };
    let currentSession = session;
    const lifecycle = createDemoExitLifecycle({
        getSession: () => currentSession,
        detachSession: owned => { if (currentSession === owned) currentSession = null; },
        cleanup: () => { cleanupCount += 1; },
        navigate: () => { navigationCount += 1; },
        onError: (error, phase) => errors.push({ error, phase })
    });

    lifecycle.request();
    assert.equal(await lifecycle.confirm(), true);
    assert.equal(cleanupCount, 1);
    assert.equal(navigationCount, 1);
    assert.deepEqual(errors, [{ error: failure, phase: 'session-end' }]);
    assert.equal(await lifecycle.confirm(), true, 'settled confirmation remains the same operation');
    assert.equal(cleanupCount, 1);
    assert.equal(navigationCount, 1);
});

test('natural session end accepts only the currently owned session', async () => {
    const oldSession = { id: 'old' };
    const activeSession = { id: 'active' };
    let currentSession = activeSession;
    const order = [];
    const lifecycle = createDemoExitLifecycle({
        getSession: () => currentSession,
        detachSession: owned => {
            order.push(`detach:${owned.id}`);
            if (currentSession === owned) currentSession = null;
        },
        cleanup: () => { order.push('cleanup'); },
        navigate: () => { order.push('navigate'); }
    });

    assert.equal(lifecycle.ownsSession(oldSession), false);
    assert.equal(await lifecycle.handleSessionEnd(oldSession), false);
    assert.deepEqual(order, []);
    assert.equal(lifecycle.ownsSession(activeSession), true);
    assert.equal(await lifecycle.handleSessionEnd(activeSession), true);
    assert.equal(lifecycle.state, DEMO_EXIT_STATES.ENDING);
    assert.deepEqual(order, ['detach:active', 'cleanup', 'navigate']);
    assert.equal(await lifecycle.handleSessionEnd(activeSession), false);
    assert.deepEqual(order, ['detach:active', 'cleanup', 'navigate']);
});

test('cleanup failure is reported but cannot prevent the one navigation', async () => {
    const failure = new Error('cleanup failed');
    const errors = [];
    let navigationCount = 0;
    const lifecycle = createDemoExitLifecycle({
        cleanup: () => { throw failure; },
        navigate: () => { navigationCount += 1; },
        onError: (error, phase) => errors.push({ error, phase })
    });

    lifecycle.request();
    assert.equal(await lifecycle.confirm(), true);
    assert.equal(navigationCount, 1);
    assert.deepEqual(errors, [{ error: failure, phase: 'cleanup' }]);
    assert.equal(lifecycle.reset(), true);
    assert.equal(lifecycle.state, DEMO_EXIT_STATES.IDLE);
    assert.equal(lifecycle.finished, false);
});
