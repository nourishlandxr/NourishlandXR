import test from 'node:test';
import assert from 'node:assert/strict';
import { createPimoTemplate } from '../app/services/pimoGraphTemplates.js';
import { pimoPlacement, pimoPointInCell, createPimoGrabOwnership } from '../app/services/pimoXRInteraction.js';
import { PIMO_XR_FEEDBACK, createPimoXRFeedback } from '../app/services/pimoXRFeedback.js';

test('classic placement gently snaps to a free honeycomb slot', () => {
    const graph = createPimoTemplate('empty', { design: 'classic' }), anchor = graph.nodes[0].id;
    graph.layout.nodes.moving = { ...graph.layout.nodes[anchor], x: 500, y: 0 };
    const point = { x: 165 + 8, y: Math.sqrt(3) * 55 + 4 };
    const before = structuredClone(graph), landing = pimoPlacement(graph, 'moving', point);
    assert.equal(landing.snapped, true); assert.equal(landing.x, 165); assert.equal(landing.y, Math.sqrt(3) * 55); assert.deepEqual(graph, before);
    graph.layout.nodes.occupied = { ...graph.layout.nodes[anchor], x: landing.x, y: landing.y };
    assert.equal(pimoPlacement(graph, 'moving', point).snapped, false);
});
test('notes and organic placement aligns nearby rows without moving distant/free placements', () => {
    for (const design of ['notes', 'organic']) {
        const graph = createPimoTemplate('empty', { design }), anchor = graph.nodes[0].id;
        graph.layout.nodes.moving = { ...graph.layout.nodes[anchor], x: 500, y: 500 };
        assert.deepEqual(pimoPlacement(graph, 'moving', { x: 320, y: 8 }), { x: 320, y: 0, snapped: true, snapKey: 'align:*,0' });
        assert.equal(pimoPlacement(graph, 'moving', { x: 380, y: 8 }).snapKey, pimoPlacement(graph, 'moving', { x: 320, y: 8 }).snapKey, 'Moving along a row must not retrigger a snap cue every frame');
        assert.deepEqual(pimoPlacement(graph, 'moving', { x: 500, y: 500 }), { x: 500, y: 500, snapped: false });
        assert.deepEqual(pimoPlacement(graph, 'moving', { x: 320, y: 8 }, { enabled: false }), { x: 320, y: 8, snapped: false });
        assert.equal(pimoPlacement(graph, 'moving', { x: 5, y: 5 }).snapped, false);
    }
});
test('direct grab uses the actual cell silhouette, including custom outlines', () => {
    const hex = { x: 100, y: 100, width: 200, height: 173, shape: 'hexagon', hexOrientation: 'flat' };
    assert.equal(pimoPointInCell(hex, { x: 100, y: 100 }), true); assert.equal(pimoPointInCell(hex, { x: 195, y: 180 }), false);
    const triangle = { x: 0, y: 0, width: 100, height: 100, shape: 'drawn', outline: [{ x: 0, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }] };
    assert.equal(pimoPointInCell(triangle, { x: 0, y: 0 }), true); assert.equal(pimoPointInCell(triangle, { x: 49, y: -49 }), false);
});
test('cell ownership prevents trigger, grip, or another hand from stealing a held cell', () => {
    const lock = createPimoGrabOwnership(), left = {}, right = {};
    assert.equal(lock.acquire('a', left), true); assert.equal(lock.acquire('a', right), false); assert.equal(lock.acquire('b', right), true);
    lock.release(right); assert.equal(lock.owner('a'), left); assert.equal(lock.owner('b'), undefined); lock.clear(); assert.equal(lock.acquire('a', right), true);
});
test('every step has haptics and creation/connection moments use stronger patterns', () => {
    for (const [name, pattern] of Object.entries(PIMO_XR_FEEDBACK)) { assert.ok(pattern.strength > 0 && pattern.strength <= 1, name); assert.ok(pattern.duration >= 18); assert.ok(pattern.notes.length); }
    assert.ok(PIMO_XR_FEEDBACK.grow.strength > PIMO_XR_FEEDBACK.grab.strength); assert.ok(PIMO_XR_FEEDBACK.connect.strength > PIMO_XR_FEEDBACK.tap.strength);
});
test('muting audio leaves haptics active; absent motors and rejected actuator promises are safe', async () => {
    const pulses = [], audioCalls = []; const cues = createPimoXRFeedback({ createAudio() { audioCalls.push(true); throw Error('No audio in this test'); } });
    cues.play('grab', { gamepad: { hapticActuators: [{ pulse: (strength, duration) => { pulses.push({ strength, duration }); return Promise.reject(Error('Device gone')); } }] } });
    cues.setEnabled(false); cues.play('place', { gamepad: { hapticActuators: [{ pulse: (strength, duration) => { pulses.push({ strength, duration }); return Promise.resolve(true); } }] } });
    cues.play('grow', { hand: {} }); await new Promise(resolve => setImmediate(resolve));
    assert.equal(audioCalls.length, 1); assert.equal(pulses.length, 2); assert.equal(cues.counts.grab, 1); assert.equal(cues.counts.place, 1); assert.equal(cues.counts.grow, 1);
    cues.destroy(); cues.play('tap'); assert.equal(cues.counts.tap, undefined);
});
test('each sound has an attack/release envelope and needs no media downloads', () => {
    const notes = [], gains = [], scheduled = [];
    const parameter = log => ({ setValueAtTime: (...args) => log.push(args), exponentialRampToValueAtTime: (...args) => log.push(args) });
    const context = { state: 'running', currentTime: 2, destination: {}, createOscillator() { return { frequency: parameter(notes), connect: target => target, start: t => scheduled.push(t), stop() {} }; }, createGain() { return { gain: parameter(gains), connect() {} }; }, close() {} };
    const cues = createPimoXRFeedback({ createAudio: () => context }); cues.play('grow'); assert.equal(notes.length, 3); assert.equal(scheduled.length, 3); assert.ok(scheduled[1] > scheduled[0]); assert.equal(gains.length, 9); cues.destroy();
});
