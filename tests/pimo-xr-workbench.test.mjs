import test from 'node:test';
import assert from 'node:assert/strict';
import { createPimoXRWorkbench, createPimoXRButtonLatch } from '../app/services/pimoXRWorkbench.js';
import { createPimoTemplate } from '../app/services/pimoGraphTemplates.js';
import { validatePimoGraph } from '../app/services/pimoGraph.js';

function fixture() {
    let graph = createPimoTemplate('classic'), selected = graph.nodes[0].id, selectedEdge = '';
    const undo = [], redo = [], maps = new Map([[graph.id, graph]]);
    const api = {
        getGraph: () => graph, getSelected: () => selected, getSelectedEdge: () => selectedEdge,
        onCommit(next, selection) { undo.push(structuredClone(graph)); redo.length = 0; graph = structuredClone(next); if (selection) { selected = selection.cell || ''; selectedEdge = selection.edge || ''; } return true; },
        onReplace(next) { maps.set(graph.id, graph); graph = next; selected = next.nodes[0]?.id || ''; selectedEdge = ''; maps.set(graph.id, graph); },
        onHistory(direction) { const from = direction === 'undo' ? undo : redo, to = direction === 'undo' ? redo : undo; if (from.length) { to.push(graph); graph = from.pop(); } }
    };
    return { api, work: createPimoXRWorkbench(api), maps, select(id, edge = '') { selected = id; selectedEdge = edge; } };
}

test('XR creates arbitrary branches in the shared portable map', () => {
    const { api, work } = fixture(), seed = api.getSelected(), id = work.grow('Bird visitors');
    assert.equal(api.getSelected(), id); assert.equal(work.selected().title, 'Bird visitors');
    assert.ok(api.getGraph().edges.some(edge => edge.from === seed && edge.to === id && edge.kind === 'branch'));
    assert.ok(validatePimoGraph(api.getGraph()).valid);
    work.history('undo'); assert.ok(!api.getGraph().nodes.some(node => node.id === id));
    work.history('redo'); assert.ok(api.getGraph().nodes.some(node => node.id === id));
});
test('XR text drafts do not commit until Apply and cancel restores the document', () => {
    const { api, work } = fixture(), before = structuredClone(api.getGraph());
    work.beginEdit('title'); work.key('clear'); for (const char of 'Wildlife') work.key(char);
    assert.deepEqual(api.getGraph(), before); work.cancelEdit(); assert.deepEqual(api.getGraph(), before);
    work.beginEdit('body'); work.key('clear'); work.key('A local observation'); work.key('newline'); work.key('Another line');
    assert.equal(work.saveEdit(), true); assert.equal(work.selected().body, 'A local observation\nAnother line');
});
test('keyboard caret, symbols, shift, backspace and limits work without DOM inputs', () => {
    const { work } = fixture(); work.beginEdit('title'); work.key('clear'); work.key('shift'); work.key('a'); work.key('shift'); work.key('c'); work.key('left'); work.key('b');
    assert.equal(work.state.edit.value, 'Abc'); work.key('home'); work.key('delete'); work.key('end'); work.key('backspace'); assert.equal(work.state.edit.value, 'b');
    work.key('clear'); work.key('😀'); work.key('backspace'); assert.equal(work.state.edit.value, '');
    work.key('x'.repeat(300)); assert.equal(work.state.edit.value.length, 160);
    work.key('symbols'); assert.equal(work.state.symbols, true);
});
test('empty titles are rejected while a draft stays editable', () => {
    const { work } = fixture(); work.beginEdit('title'); work.key('clear'); work.key('space'); assert.equal(work.saveEdit(), false); assert.ok(work.state.edit); assert.match(work.state.status, /title/);
});
test('text edits keep the original cell owner when selection changes', () => {
    const { api, work, select } = fixture(), id = api.getSelected(); work.beginEdit('title'); work.key('clear'); work.key('Saved on the original'); select(api.getGraph().nodes[1].id); work.saveEdit();
    assert.equal(api.getGraph().nodes.find(node => node.id === id).title, 'Saved on the original'); assert.notEqual(work.selected().title, 'Saved on the original');
});
test('XR sources, attribution and imported provenance survive design changes and duplicates', () => {
    const { api, work } = fixture(); api.getGraph().nodes[0].sourceIds = ['source-a']; api.getGraph().nodes[0].provenance = [{ author: 'Author A' }]; api.getGraph().sources = [{ id: 'source-a', title: 'Original reference' }];
    work.update('sourceUrl', 'https://example.org/reference'); work.update('attribution', 'Author A'); work.update('informationType', 'local_observation');
    const content = structuredClone(api.getGraph().nodes); work.design('notes'); assert.deepEqual(api.getGraph().nodes, content); work.duplicate();
    assert.deepEqual(work.selected().sourceIds, ['source-a']); assert.deepEqual(work.selected().provenance, [{ author: 'Author A' }]); assert.equal(work.selected().attribution, 'Author A'); assert.equal(api.getGraph().sources.length, 1);
});
test('relationships can be named, selected, retyped and removed without removing cells', () => {
    const { api, work, select } = fixture(), nodes = api.getGraph().nodes, count = nodes.length;
    const id = work.connect(nodes[1].id, nodes[2].id, [{ x: 180, y: -90 }]); assert.equal(api.getSelectedEdge(), id);
    work.beginEdit('label'); work.key('visited by'); work.saveEdit(); assert.equal(work.edge().label, 'visited by');
    const before = api.getGraph(); assert.equal(work.update('kind', 'branch'), false); assert.deepEqual(api.getGraph(), before); assert.match(work.state.status, /one parent/);
    work.remove(); assert.equal(api.getGraph().nodes.length, count); assert.ok(!api.getGraph().edges.some(edge => edge.id === id));
    work.history('undo'); select('', id); assert.equal(work.edge().label, 'visited by');
});
test('the original families remain connected; removing added content keeps its children and supports undo', () => {
    const { api, work,select } = fixture(), original = structuredClone(api.getGraph());
    assert.equal(work.remove(),false);assert.deepEqual(api.getGraph(),original);
    const parent=work.grow('Local knowledge');work.grow('Observation');const graph=structuredClone(api.getGraph());select(parent);
    work.remove();assert.equal(api.getGraph().nodes.length,graph.nodes.length-1);assert(api.getGraph().nodes.some(n=>n.title==='Observation'));
    work.history('undo'); assert.deepEqual(api.getGraph(), graph);
});
test('all templates and designs stay available in XR without replacing saved maps', () => {
    const { api, work, maps } = fixture(), first = api.getGraph().id; work.design('notes'); work.template('empty'); assert.equal(api.getGraph().nodes.length, 1); assert.equal(api.getGraph().layout.design, 'notes'); assert.ok(maps.has(first));
    work.template('bio'); assert.equal(api.getGraph().nodes.some(node => node.title === 'Scientific Information'), true); assert.equal(maps.size, 3);
});
test('connection errors are recoverable and never change the document', () => {
    const { api, work } = fixture(), before = structuredClone(api.getGraph()); assert.equal(work.connect(api.getSelected(), api.getSelected()), ''); assert.deepEqual(api.getGraph(), before); assert.match(work.state.status, /itself/);
});
test('right-stick menu toggle requires a fresh press after release including reconnect', () => {
    const latch = createPimoXRButtonLatch(); assert.equal(latch.poll('right', true), false); assert.equal(latch.poll('right', true), false); assert.equal(latch.poll('right', false), false); assert.equal(latch.poll('right', true), true); assert.equal(latch.poll('right', true), false);
    latch.reset(); assert.equal(latch.poll('right', true), false); latch.poll('right', false); assert.equal(latch.poll('right', true), true);
});
