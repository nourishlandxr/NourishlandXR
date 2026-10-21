import assert from 'node:assert/strict';
import test from 'node:test';
import { PIMO_DESIGNS, applyPimoDesign, pimoCellAppearance } from '../app/services/pimoGraphDesigns.js';
import { addPimoCell, connectPimoCells, pimoGraphFromDocument, arrangePimoGraph, validatePimoGraph } from '../app/services/pimoGraph.js';
import { createPimoTemplate } from '../app/services/pimoGraphTemplates.js';
import { pimoCellOutline, pimoConnectionPoints, pimoConnectionPath } from '../app/services/pimoGraphGeometry.js';

test('Classic defaults to a regular hexagon flower with six compass petals', () => {
    const graph = createPimoTemplate('classic'), root = graph.nodes[0].id, petals = graph.edges.filter(edge => edge.from === root);
    assert.equal(graph.layout.design, 'classic'); assert.equal(petals.length, 6);
    for (const node of graph.nodes) { const l = graph.layout.nodes[node.id]; assert.equal(l.shape, 'hexagon'); assert.equal(pimoCellOutline(l).length, 6); assert.ok(Math.abs(l.height / l.width - Math.sqrt(3) / 2) < 1e-9); }
    const positions = Object.fromEntries(graph.nodes.map(node => [node.title, graph.layout.nodes[node.id]]));
    assert.equal(positions['Food Forest'].x, 0); assert.ok(positions['Food Forest'].y < 0);
    assert.ok(positions.Uses.x < 0 && positions.Uses.y < 0); assert.ok(positions.Propagation.x < 0 && positions.Propagation.y > 0);
    assert.ok(positions['Scientific Information'].x > 0 && positions['Scientific Information'].y < 0);
    assert.ok(positions['Historical Data'].x > 0 && positions['Historical Data'].y > 0); assert.equal(positions.Cultivation.x, 0); assert.ok(positions.Cultivation.y > 0);
    assert.equal(validatePimoGraph(graph).valid, true);
});

test('all content templates support every design while preserving their exact knowledge', () => {
    for (const template of ['classic', 'utility', 'bio', 'food-forest', 'growing', 'empty']) {
        const initial = createPimoTemplate(template), content = structuredClone(initial.nodes), semantics = initial.edges.map(({ waypoints, ...edge }) => edge);
        for (const design of PIMO_DESIGNS) {
            const next = applyPimoDesign(initial, design.id); assert.deepEqual(next.nodes, content); assert.deepEqual(next.edges.map(({ waypoints, ...edge }) => edge), semantics);
            assert.equal(validatePimoGraph(next).valid, true);
            assert.ok(Object.values(next.layout.nodes).every(layout => layout.shape === design.shape));
        }
    }
});

test('switching designs restores manual cell arrangements, drawn outlines and connector routes', () => {
    let graph = createPimoTemplate('utility'); const id = graph.nodes[0].id, from = graph.nodes[2].id, to = graph.nodes[3].id;
    graph.layout.nodes[id].x = 172; graph.layout.nodes[id].shape = 'drawn'; graph.layout.nodes[id].outline = [{ x: -1, y: -1 }, { x: 1, y: -.8 }, { x: .5, y: 1 }];
    graph = connectPimoCells(graph, from, to, { label: 'Feeds wildlife', waypoints: [{ x: 200, y: 80 }] }).graph;
    const layouts = structuredClone(graph.layout.nodes), routes = graph.edges.map(edge => edge.waypoints);
    let next = applyPimoDesign(graph, 'notes'); next.layout.nodes[id].x = -123;
    next = applyPimoDesign(next, 'classic'); next = applyPimoDesign(next, 'organic');
    assert.deepEqual(next.layout.nodes, layouts); assert.deepEqual(next.edges.map(edge => edge.waypoints), routes);
    next = applyPimoDesign(next, 'notes'); assert.equal(next.layout.nodes[id].x, -123);
    next.layout.nodes[id].color = '#648f9b'; next = applyPimoDesign(next, 'classic'); assert.equal(next.layout.nodes[id].color, '#648f9b');
    assert.deepEqual(pimoGraphFromDocument(JSON.parse(JSON.stringify(next))), next);
});

test('new cells inherit the active design and can switch back to existing saved designs', () => {
    let graph = applyPimoDesign(createPimoTemplate('utility'), 'notes'); const result = addPimoCell(graph, { title: 'A new connection', parentId: graph.nodes[0].id }); graph = result.graph;
    assert.equal(graph.layout.nodes[result.id].shape, 'square'); assert.equal(graph.layout.nodes[result.id].width, graph.layout.nodes[result.id].height);
    for (const design of ['classic', 'organic', 'notes']) { graph = applyPimoDesign(graph, design); assert.equal(validatePimoGraph(graph).valid, true); assert.equal(graph.nodes.find(node => node.id === result.id).title, 'A new connection'); }
    assert.equal(graph.layout.nodes[result.id].shape, 'square');
});

test('square boundaries meet their actual edges and notes connectors use right angles', () => {
    let graph = createPimoTemplate('empty', { design: 'notes' }), a = graph.nodes[0].id;
    const result = addPimoCell(graph, { title: 'Next', x: 400, y: 250 }); graph = result.graph;
    graph = connectPimoCells(graph, a, result.id).graph;
    const points = pimoConnectionPoints(graph, graph.edges[0]); assert.equal(points.length, 4);
    assert.equal(points[0].x, graph.layout.nodes[a].x + graph.layout.nodes[a].width / 2);
    assert.equal(points[0].y, points[1].y); assert.equal(points[1].x, points[2].x); assert.equal(points[2].y, points[3].y);
    assert.doesNotMatch(pimoConnectionPath(points, 'notes'), /C/); assert.equal(pimoCellOutline(graph.layout.nodes[a]).length, 4);
    const appearance = pimoCellAppearance(graph, graph.layout.nodes[a]); assert.equal(appearance.text, '#294439'); assert.notEqual(appearance.fill, graph.layout.nodes[a].color);
});

test('flower layouts grow beyond six cells and auto-arrange retains the chosen design', () => {
    let graph = createPimoTemplate('classic'), parent = graph.nodes[0].id;
    for (let i = 0; i < 32; i++) graph = addPimoCell(graph, { title: `Extra ${i}`, parentId: parent }).graph;
    graph = arrangePimoGraph(graph);
    assert.equal(graph.nodes.length, 39); assert.equal(new Set(Object.values(graph.layout.nodes).map(p => `${p.x}:${p.y}`)).size, graph.nodes.length);
    assert.ok(Object.values(graph.layout.nodes).every(layout => layout.shape === 'hexagon')); assert.equal(validatePimoGraph(graph).valid, true);
    graph = arrangePimoGraph(applyPimoDesign(graph, 'notes')); assert.ok(Object.values(graph.layout.nodes).every(layout => layout.shape === 'square'));
});
