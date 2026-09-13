import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { infoPanelPose, panelPoseOutsideSafeBounds } from '../app/services/pimInfoPanel.js';
import { WELCOME_PANEL_DRAW_OFFSET, welcomeExperienceFrames, welcomeCellAtPoint } from '../app/services/arWelcomeShowcase.js';

const demoSource = fs.readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
const panelSource = fs.readFileSync(new URL('../app/services/pimInfoPanel.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');

test('Phase 6 welcome copy is bounded to the compact note and scrolls only in the DOM copy', () => {
    assert.match(demoSource, /const contentWidth = 760/);
    assert.match(demoSource, /ctx\.rect\(contentLeft, bodyTop - 4, contentWidth, bodyBottom - bodyTop \+ 8\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-welcome-board \.tryit-board-text-window[\s\S]*overflow-y:auto/);
});

test('LIM hit targets use cell coordinates while the welcome panel keeps its own inset', () => {
    assert.deepEqual(WELCOME_PANEL_DRAW_OFFSET, { x: 550, y: 510 });
    assert.match(demoSource, /left:\$\{node\.x\/25\}%/);
    assert.match(demoSource, /welcomeCellAtPoint\(welcomeFrames\(\),hit\.pixelX,hit\.pixelY\)/);
    assert.doesNotMatch(demoSource, /hit\.pixelX-WELCOME/);
    const node = welcomeExperienceFrames(64000, true)[0].nodes[0];
    assert.equal(welcomeCellAtPoint(welcomeExperienceFrames(64000, true), node.x, node.y).key, node.key);
});

test('Phase 6 panel recovery keeps the southwest pose until it leaves the safe forward envelope', () => {
    const matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,1.6,0,1];
    const pose = infoPanelPose(matrix);
    assert.equal(panelPoseOutsideSafeBounds(matrix, pose), false);
    const turned = [0,0,1,0, 0,1,0,0, -1,0,0,0, 0,1.6,0,1];
    assert.equal(panelPoseOutsideSafeBounds(turned, pose), true);
    assert.match(panelSource, /panelPoseOutsideSafeBounds\(matrix,pose\)/);
});

test('Phase 6 typing coalesces expensive welcome texture uploads', () => {
    assert.match(demoSource, /const DEMO_TEXT_TEXTURE_INTERVAL_MS = 48/);
    assert.match(demoSource, /introTextureUploadedAt >= DEMO_TEXT_TEXTURE_INTERVAL_MS/);
});
