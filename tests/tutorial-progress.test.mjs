import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
    dismissTutorialFeature,
    getTutorialStage,
    readTutorialProgress,
    recordTutorialEvent,
    resetLearningTips,
    restartProjectTutorial
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
