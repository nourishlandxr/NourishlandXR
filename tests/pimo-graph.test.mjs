import assert from 'node:assert/strict';
import test from 'node:test';
import { createPimoGraph, addPimoCell, connectPimoCells, removePimoCell, validatePimoGraph, pimoGraphFromDocument, arrangePimoGraph, pimoSuggestions } from '../app/services/pimoGraph.js';
import { createPimoTemplate, PIMO_TEMPLATES } from '../app/services/pimoGraphTemplates.js';
import { pimoCellPath, pimoConnectionPoints } from '../app/services/pimoGraphGeometry.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';

test('all six requested templates contain only their chosen knowledge families', () => {
    assert.deepEqual(PIMO_TEMPLATES.map(item => item.id), ['classic', 'utility', 'bio', 'food-forest', 'growing', 'empty']);
    const expected = { classic: ['Food Forest', 'Uses', 'Propagation', 'Scientific Information', 'Historical Data', 'Cultivation'], utility: ['Uses'], bio: ['Scientific Information', 'Historical Data'], 'food-forest': ['Layers', 'Relationships'], growing: ['Propagation', 'Cultivation'], empty: [] };
    for (const item of PIMO_TEMPLATES) {
        const graph = createPimoTemplate(item.id), root = graph.nodes[0].id;
        assert.deepEqual(graph.edges.filter(edge => edge.kind === 'branch' && edge.from === root).map(edge => graph.nodes.find(node => node.id === edge.to).title), expected[item.id]);
        assert.equal(validatePimoGraph(graph).valid, true);
        assert.equal(graph.nodes.some(node => node.title === 'Scientific Information'), ['classic', 'bio'].includes(item.id));
    }
});

test('a graph supports arbitrary roots, related loops and deep branches without compass categories', () => {
    let graph = createPimoGraph('Wildlife'); const ids = [];
    for (let i = 0; i < 12; i++) { const added = addPimoCell(graph, { title: `Idea ${i}`, x: i * 100, y: 0 }); graph = added.graph; ids.push(added.id); }
    graph = connectPimoCells(graph, ids[0], ids[1], { kind: 'branch' }).graph;
    graph = connectPimoCells(graph, ids[1], ids[2], { kind: 'branch' }).graph;
    assert.throws(() => connectPimoCells(graph, ids[2], ids[0], { kind: 'branch' }), /loop/);
    assert.throws(() => connectPimoCells(graph, ids[3], ids[1], { kind: 'branch' }), /one parent/);
    graph = connectPimoCells(graph, ids[2], ids[0], { kind: 'relationship', label: 'supports' }).graph;
    assert.equal(validatePimoGraph(graph).valid, true);
    assert.throws(() => connectPimoCells(graph, ids[0], ids[0]), /itself/);
    assert.equal(graph.nodes.length, 12);
});

test('legacy PIMO import keeps stable identities, knowledge, evidence and sources', () => {
    const graph = pimoGraphFromDocument(PIGEON_PEA_PIM);
    assert.deepEqual(graph.nodes.map(node => node.id), PIGEON_PEA_PIM.nodes.map(node => node.id));
    for (const original of PIGEON_PEA_PIM.nodes) { const node = graph.nodes.find(node => node.id === original.id); assert.deepEqual(node, original); }
    assert.deepEqual(graph.sources, PIGEON_PEA_PIM.sources || []);
    assert.equal(graph.edges.length, PIGEON_PEA_PIM.nodes.filter(node => node.parentId).length);
    assert.equal(validatePimoGraph(graph).valid, true);
    assert.deepEqual(pimoGraphFromDocument(JSON.parse(JSON.stringify(graph))), graph);
});

test('drawing geometry and semantic links survive portable export and remain independent', () => {
    let graph = createPimoTemplate('empty'), first = graph.nodes[0].id;
    const added = addPimoCell(graph, { title: 'Wetland', x: 300, y: 100, shape: 'drawn', outline: [{ x: -1, y: -1 }, { x: 1, y: -.7 }, { x: .8, y: 1 }, { x: -.9, y: .8 }] }); graph = added.graph;
    graph = connectPimoCells(graph, first, added.id, { label: 'flows into', waypoints: [{ x: 100, y: 90 }, { x: 240, y: 180 }] }).graph;
    assert.doesNotMatch(pimoCellPath(graph.layout.nodes[added.id]), /NaN/);
    const before = JSON.stringify(graph.nodes), arranged = arrangePimoGraph(graph);
    assert.equal(JSON.stringify(arranged.nodes), before); assert.equal(arranged.edges[0].label, 'flows into'); assert.deepEqual(arranged.edges[0].waypoints, []);
    assert.equal(pimoConnectionPoints(graph, graph.edges[0]).length, 4);
    assert.deepEqual(pimoGraphFromDocument(JSON.parse(JSON.stringify(graph))), graph);
});

test('removing a cell keeps its connected children, while undo can restore the whole graph', () => {
    const graph = createPimoTemplate('utility'), uses = graph.nodes.find(node => node.title === 'Uses'), before = structuredClone(graph), next = removePimoCell(graph, uses.id);
    assert.equal(next.nodes.length, graph.nodes.length - 1);
    assert.equal(next.nodes.some(node => node.title === 'Medicinal knowledge'), true);
    assert.equal(next.edges.some(edge => edge.from === uses.id || edge.to === uses.id), false);
    assert.equal(validatePimoGraph(next).valid, true); assert.deepEqual(graph, before);
});

test('invalid imported references, ancestry, colors and outline points are rejected', () => {
    const graph = createPimoTemplate('empty'), id = graph.nodes[0].id;
    assert.throws(() => pimoGraphFromDocument({ nodes: [{ id: 'a', title: 'A', parentId: 'b' }, { id: 'b', title: 'B', parentId: 'a' }] }), /loop/);
    const invalid = structuredClone(graph); invalid.layout.nodes[id].outline = [{ x: Infinity, y: 0 }]; assert.equal(validatePimoGraph(invalid).valid, false);
    const badColor = structuredClone(graph); badColor.layout.nodes[id].color = 'url(javascript:bad)'; assert.throws(() => pimoGraphFromDocument(badColor), /color/);
    assert.throws(() => pimoGraphFromDocument({ nodes: [{ id: '__proto__', title: 'Bad' }] }), /reserved/);
    assert.throws(() => connectPimoCells(graph, id, 'missing'), /missing/);
});

test('suggestions follow the selected topic and omit existing children', () => {
    let graph = createPimoTemplate('food-forest'), node = graph.nodes.find(node => node.title === 'Wildlife');
    assert.ok(pimoSuggestions(graph, node.id).includes('Bird visitors'));
    graph = addPimoCell(graph, { title: 'Bird visitors', parentId: node.id }).graph;
    assert.ok(!pimoSuggestions(graph, node.id).includes('Bird visitors'));
});
