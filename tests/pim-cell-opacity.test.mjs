import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { drawPlantInformationHoneycomb } from '../app/services/plantInformationMeshCanvas.js';
import { plantInformationMeshMarkup } from '../app/services/plantInformationMeshView.js';
import { PIGEON_PEA_AR_KNOWLEDGE } from '../app/services/pigeonPeaExample.js';

function capturePimCanvas(cellOpacity) {
    const events = [];
    const saved = [];
    const context = {
        globalAlpha: 1,
        fillStyle: '',
        strokeStyle: '',
        save() { saved.push({ globalAlpha: this.globalAlpha, fillStyle: this.fillStyle, strokeStyle: this.strokeStyle }); },
        restore() { Object.assign(this, saved.pop()); },
        beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, stroke() {}, clearRect() {}, fillRect() {},
        setLineDash() {}, strokeText() {},
        createRadialGradient() { return { addColorStop() {} }; },
        measureText(value) { return { width: String(value).length * 8 }; },
        fill() { events.push({ type: 'fill', style: this.fillStyle, alpha: this.globalAlpha }); },
        fillText(value) { events.push({ type: 'text', value, alpha: this.globalAlpha }); }
    };
    drawPlantInformationHoneycomb(context, { width: 1440, height: 1080 }, PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity });
    assert.equal(saved.length, 0, 'canvas state remains balanced');
    return events;
}

test('Quest PIMO opacity changes dark glass while labels remain fully readable', () => {
    for (const level of [0, .25, .5, 1]) {
        const events = capturePimCanvas(level);
        const hex = events.find(event => event.type === 'fill' && String(event.style).includes('31%, 12%, 0.7'));
        const core = events.find(event => event.type === 'fill' && event.style === 'rgba(22,35,55,.82)');
        const labels = events.filter(event => event.type === 'text');
        assert.ok(hex, 'primary cell has an actual filled body');
        assert.ok(core, 'centre cell has an actual filled body');
        assert.ok(labels.length > 6, 'PIMO labels are drawn');
        assert.equal(hex.alpha, level);
        assert.equal(core.alpha, level);
        assert.ok(labels.every(event => event.alpha === 1), 'text stays readable at every glass opacity');
    }
});

test('simulated PIMO receives the same opacity without changing cell identity or hit markup', () => {
    const full = plantInformationMeshMarkup(PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity: 1 });
    const quarter = plantInformationMeshMarkup(PIGEON_PEA_AR_KNOWLEDGE, [], { cellOpacity: .25 });
    assert.match(full, /--pim-cell-opacity:1/);
    assert.match(quarter, /--pim-cell-opacity:0\.25/);
    assert.deepEqual([...full.matchAll(/data-pim-node-id="([^"]+)"/g)].map(match => match[1]),
        [...quarter.matchAll(/data-pim-node-id="([^"]+)"/g)].map(match => match[1]));
    const styles = readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');
    assert.match(styles, /\.plant-knowledge-cell::after \{[\s\S]*?background: hsl\(var\(--pim-hue,112\) 31% 12% \/ \.82\);[\s\S]*?opacity: var\(--pim-cell-opacity, 1\)/);
    assert.match(styles, /\.plant-knowledge-cell \{[\s\S]*?opacity: 1;[\s\S]*?isolation: isolate/);
    assert.match(styles, /@keyframes pim-cell-fade-in \{[\s\S]*?to \{ opacity: 1;/);
    const demo = readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
    assert.match(demo, /function demoPlantKnowledgeMarkup[\s\S]*?cellOpacity: demoCellOpacity/);
});
