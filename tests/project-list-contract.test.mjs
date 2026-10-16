import test from 'node:test';
import assert from 'node:assert/strict';
import { isListableProjectDirectory } from '../app/services/projectListContract.js';

test('project chooser accepts only valid metadata whose ID matches its project directory', () => {
    assert.equal(isListableProjectDirectory('garden', { id: 'garden', name: 'Garden', visibility: 'draft' }), true);
    assert.equal(isListableProjectDirectory('hillyards', { id: 'hillyards', name: 'Hillyards', visibility: 'public' }), true);
    assert.equal(isListableProjectDirectory('.terrain-cache', { id: '.terrain-cache', name: 'Cache', visibility: 'public' }), false);
    assert.equal(isListableProjectDirectory('malformed', { id: 'malformed', visibility: 'public' }), false);
    assert.equal(isListableProjectDirectory('garden', { id: 'different-project', name: 'Alias' }), false);
    assert.equal(isListableProjectDirectory('garden', null), false);
});
