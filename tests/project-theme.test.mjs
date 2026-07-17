import assert from 'node:assert/strict';
import test from 'node:test';

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

globalThis.window = { location: { pathname: '/' } };
globalThis.document = { body: { dataset: {}, style: {} } };

const { applyProjectTheme } = await import('../app/screens/projectDashboard.js');

test.after(() => {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
});

test('project themes remain interchangeable in every direction', () => {
    const sequence = ['light', 'dark', 'forest-dark', 'forest-light', 'cyber', 'light', 'forest-dark', 'dark', 'forest-light'];

    for (const theme of sequence) {
        assert.equal(applyProjectTheme(theme), theme);
        assert.equal(document.body.dataset.projectTheme, theme);
        assert.equal(document.body.style.colorScheme, ['dark', 'forest-dark', 'cyber'].includes(theme) ? 'dark' : 'light');
    }
});

test('unsupported project themes return to forest light safely', () => {
    assert.equal(applyProjectTheme('unsupported'), 'forest-light');
    assert.equal(document.body.dataset.projectTheme, 'forest-light');
    assert.equal(document.body.style.colorScheme, 'light');
});
