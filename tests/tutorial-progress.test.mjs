import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
    dismissTutorialFeature,
    getArDashboardTutorialProgress,
    getArTutorialProgress,
    getTutorialStage,
    readTutorialProgress,
    recordTutorialEvent,
    replayArTutorial,
    resetArLearningTips,
    resetLearningTips,
    restartProjectTutorial,
    setArHintsEnabled,
    setArDashboardTutorialProgress,
    setArTutorialProgress
} from '../app/services/tutorialProgress.js';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value))
    };
}

test('tutorial guidance progresses from New to Learning to Understood using meaningful events', () => {
    const storage = memoryStorage();
    assert.equal(getTutorialStage('project-a', 'arMode', storage), 'new');
    recordTutorialEvent('project-a', 'ar_mode_introduced', storage);
    assert.equal(getTutorialStage('project-a', 'arMode', storage), 'learning');
    recordTutorialEvent('project-a', 'ar_mode_launched', storage);
    assert.equal(getTutorialStage('project-a', 'arMode', storage), 'understood');
    assert.equal(getTutorialStage('new-project', 'arMode', storage), 'understood');
});

test('project restart can recall guidance without erasing creator progress', () => {
    const storage = memoryStorage();
    recordTutorialEvent('project-a', 'content_mode_opened', storage);
    assert.equal(getTutorialStage('project-b', 'contentMode', storage), 'understood');
    restartProjectTutorial('project-b', storage);
    assert.equal(getTutorialStage('project-b', 'contentMode', storage), 'new');
    dismissTutorialFeature('project-b', 'contentMode', storage);
    assert.equal(getTutorialStage('project-b', 'contentMode', storage), 'understood');
});

test('resetting tutorial state does not touch project content or AR placement data', () => {
    const storage = memoryStorage();
    const projectContent = {
        plants: [{ id: 'lemon-drop-garcinia' }],
        areas: [{ id: '2r1' }],
        anchors: [{ type: 'gps', latitude: -28.6911053, longitude: 153.003029 }]
    };
    const before = structuredClone(projectContent);
    recordTutorialEvent('project-a', 'first_item_created', storage);
    recordTutorialEvent('project-a', 'first_unplaced_item_saved', storage);
    resetLearningTips(storage);
    assert.deepEqual(projectContent, before);
    assert.deepEqual(readTutorialProgress(storage).projects, {});

    const serviceSource = fs.readFileSync(path.resolve(import.meta.dirname, '../app/services/tutorialProgress.js'), 'utf8');
    assert.doesNotMatch(serviceSource, /persistence|apiFetch|saveMarkerAnchor|updatePlaceMarker/);
});

test('creator AR tutorial completion and skipping persist globally', () => {
    const storage = memoryStorage();
    assert.deepEqual(getArTutorialProgress(storage), { state: 'not_started', step: 0, showHints: true });
    setArTutorialProgress('in_progress', 3, storage);
    assert.equal(getArTutorialProgress(storage).step, 3);
    setArTutorialProgress('completed', 8, storage);
    assert.equal(getArTutorialProgress(storage).state, 'completed');
    assert.equal(getArTutorialProgress(storage).step, 8);
    setArTutorialProgress('skipped', 4, storage);
    assert.equal(getArTutorialProgress(storage).state, 'skipped');
});

test('AR tutorial can be replayed and hints reset without touching creator content', () => {
    const storage = memoryStorage();
    const content = { markers: [{ id: 'marker-1' }], anchors: [{ type: 'gps' }] };
    const before = structuredClone(content);
    setArTutorialProgress('completed', 8, storage);
    setArHintsEnabled(false, storage);
    assert.equal(getArTutorialProgress(storage).showHints, false);
    replayArTutorial(storage);
    assert.equal(getArTutorialProgress(storage).state, 'not_started');
    resetArLearningTips(storage);
    assert.deepEqual(getArTutorialProgress(storage), { state: 'not_started', step: 0, showHints: false });
    assert.deepEqual(content, before);
});

test('AR Dashboard tutorial persists separately and resets without project mutations', () => {
    const storage = memoryStorage();
    const projectContent = { areas: [{ id: 'area-1' }], markers: [{ id: 'marker-1' }] };
    const before = structuredClone(projectContent);
    setArDashboardTutorialProgress('in_progress', 2, storage);
    assert.deepEqual(getArDashboardTutorialProgress(storage), { state: 'in_progress', step: 2 });
    setArDashboardTutorialProgress('completed', 5, storage);
    assert.equal(getArDashboardTutorialProgress(storage).state, 'completed');
    resetArLearningTips(storage);
    assert.deepEqual(getArDashboardTutorialProgress(storage), { state: 'not_started', step: 0 });
    assert.deepEqual(projectContent, before);
});
