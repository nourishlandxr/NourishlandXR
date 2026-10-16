import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeImapV2Elements } from '../app/services/imapV2Elements.js';
import { normalizeImapV2TerrainEdits } from '../app/services/imapV2Terrain.js';

const source = new URL('../artifacts/imap-v2-border-ranges-mock.json', import.meta.url);
const seed = JSON.parse(readFileSync(source, 'utf8'));

test('Border Ranges IMAP seed retains source, area totems, and ordered authoring stages', () => {
    assert.equal(seed.schema, 'nourishland.imap-sketch');
    assert.equal(seed.verified, false);
    assert.match(seed.mapInfo.source, /^https:\/\//);
    assert.match(seed.mapInfo.method, /schematic, not georeferenced/);

    const terrain = normalizeImapV2TerrainEdits(seed.terrainEdits, { shape: 'square' });
    const elements = normalizeImapV2Elements(seed.elements, { shape: 'square' });
    const elementById = new Map(elements.map(element => [element.id, element]));
    const terrainIds = new Set(seed.terrainEdits.map(edit => edit.id));

    assert.equal(terrain.length, 5);
    assert.equal(elements.length, 22);
    assert.equal(elements.filter(element => element.type === 'path').length, 10);
    assert.equal(elements.filter(element => element.type === 'totem').length, 4);
    assert.equal(elements.filter(element => element.type.includes('checkpoint')).length, 4);
    assert.equal(elements.some(element => element.type.startsWith('tree-') || element.type === 'shrub'), false);

    for (const area of seed.mapInfo.areas) {
        assert.equal(elementById.get(area.boundaryId)?.type, 'area-boundary');
        assert.equal(elementById.get(area.totemId)?.type, 'totem');
    }

    assert.deepEqual(seed.buildSequence.map(stage => stage.id), ['terrain', 'tracks', 'areas', 'checkpoints']);
    for (const stage of seed.buildSequence) {
        assert.ok(stage.terrainEditIds.every(id => terrainIds.has(id)), `${stage.id} references known terrain edits`);
        assert.ok(stage.elementIds.every(id => elementById.has(id)), `${stage.id} references known elements`);
    }
});
