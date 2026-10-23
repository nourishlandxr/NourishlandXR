import { pimoDesignCellDefaults, arrangePimoDesign } from "./pimoGraphDesigns.js?v=0.9795";
// Portable knowledge graph. Semantic links and drawing coordinates are independent.
export const PIMO_GRAPH_VERSION = 2;
const clone = value => structuredClone(value);
const text = value => String(value ?? '').trim();
const point = value => ({ x: Number(value?.x) || 0, y: Number(value?.y) || 0 });
const finite = value => Number.isFinite(Number(value));
export const pimoId = (prefix = 'cell') => `${prefix}-${globalThis.crypto.randomUUID()}`;
export const PIMO_COLORS = ['#6f825a', '#bc7959', '#648f9b', '#b19a64', '#7b769b', '#507869'];
export const PIMO_SHAPES = ['organic', 'hexagon', 'square', 'round', 'drawn'];

export function createPimoGraph(title = 'My knowledge garden') {
    return { kind: 'nourishland-pimo', schemaVersion: PIMO_GRAPH_VERSION, id: pimoId('pimo'),
        identity: { title: text(title), subjectType: 'place' }, nodes: [], edges: [], sources: [], layout: { nodes: {} }, updatedAt: new Date().toISOString() };
}

export function validatePimoGraph(graph) {
    const errors = [];
    if (graph?.kind !== 'nourishland-pimo' || graph?.schemaVersion !== 2) errors.push('Choose a PIMO graph file (version 2).');
    if (!Array.isArray(graph?.nodes) || !Array.isArray(graph?.edges)) return { valid: false, errors: [...errors, 'Cells and connections must be arrays.'] };
    if (!text(graph.id) || ['__proto__', 'prototype', 'constructor'].includes(graph.id) || !text(graph.identity?.title)) errors.push('A map needs a valid ID and title.');
    if (graph.layout?.design && !['classic', 'notes', 'organic'].includes(graph.layout.design)) errors.push('Choose a supported map design.');
    if (graph.nodes.length > 1000 || graph.edges.length > 4000) errors.push('This editor supports up to 1,000 cells and 4,000 connections per map.');
    const ids = new Set();
    for (const node of graph.nodes) {
        if (!text(node.id) || ids.has(node.id) || ['__proto__', 'prototype', 'constructor'].includes(node.id)) errors.push('Every cell needs a unique ID.');
        ids.add(node.id);
        if (!text(node.title)) errors.push('Every cell needs a title.');
        const position = graph.layout?.nodes?.[node.id];
        if (!position || !finite(position.x) || !finite(position.y)) errors.push(`Cell ${node.title} needs a position.`);
        if (position && (!finite(position.width) || !finite(position.height) || position.width < 30 || position.height < 30 || !/^#[0-9a-f]{6}$/i.test(position.color))) errors.push(`Cell ${node.title} has an invalid size or color.`);
        if (position?.outline && (!Array.isArray(position.outline) || position.outline.length > 256 || position.outline.some(p => !finite(p?.x) || !finite(p?.y) || Math.abs(p.x) > 2 || Math.abs(p.y) > 2))) errors.push('A custom cell outline contains invalid points.');
    }
    const edgeIds = new Set(), parents = new Map();
    for (const edge of graph.edges) {
        if (!edge.id || edgeIds.has(edge.id)) errors.push('Every connection needs a unique ID.');
        edgeIds.add(edge.id);
        if (!ids.has(edge.from) || !ids.has(edge.to)) errors.push('A connection references a missing cell.');
        if (edge.from === edge.to) errors.push('A cell cannot connect to itself.');
        if (!['branch', 'relationship'].includes(edge.kind)) errors.push('Choose Branch or Relationship for each connection.');
        if (edge.kind === 'branch') {
            if (parents.has(edge.to)) errors.push('A branch can have one parent. Use a relationship for additional links.');
            parents.set(edge.to, edge.from);
        }
        if (edge.waypoints && (!Array.isArray(edge.waypoints) || edge.waypoints.length > 256 || edge.waypoints.some(p => !finite(p?.x) || !finite(p?.y)))) errors.push('A drawn connector contains invalid points.');
    }
    for (const id of ids) {
        const seen = new Set([id]); let current = parents.get(id);
        while (current) { if (seen.has(current)) { errors.push('Branches cannot form a loop. Use relationship connections for loops.'); break; } seen.add(current); current = parents.get(current); }
    }
    return { valid: !errors.length, errors: [...new Set(errors)] };
}

export function addPimoCell(graph, { title = 'New idea', x = 0, y = 0, parentId = '', color, shape, outline, body = '', ...fields } = {}) {
    const next = clone(graph), id = pimoId();
    next.nodes.push({ id, title: text(title) || 'New idea', body: text(body), informationType: 'topic', evidenceStatus: 'draft', status: 'draft', sourceIds: [], provenance: [], ...fields });
    next.layout.nodes[id] = { x, y, ...pimoDesignCellDefaults(graph), ...(shape ? { shape } : {}), color: color || PIMO_COLORS[next.nodes.length % PIMO_COLORS.length], ...(outline ? { outline } : {}) };
    if (parentId) next.edges.push({ id: pimoId('link'), from: parentId, to: id, kind: 'branch', label: '', waypoints: [] });
    return { graph: next, id };
}

export function connectPimoCells(graph, from, to, { kind = 'relationship', label = '', waypoints = [] } = {}) {
    if (graph.edges.some(edge => edge.from === from && edge.to === to && edge.kind === kind)) throw Error('These cells are already connected.');
    const next = clone(graph), edge = { id: pimoId('link'), from, to, kind, label: text(label), waypoints: waypoints.map(point) };
    next.edges.push(edge); const result = validatePimoGraph(next);
    if (!result.valid) throw Error(result.errors[0]);
    return { graph: next, id: edge.id };
}

export function removePimoCell(graph, id) {
    const next = clone(graph); next.nodes = next.nodes.filter(node => node.id !== id); next.edges = next.edges.filter(edge => edge.from !== id && edge.to !== id); delete next.layout.nodes[id]; return next;
}

export function pimoGraphFromDocument(document) {
    if (document?.kind === 'nourishland-pimo' && document.schemaVersion === 2) {
        const result = validatePimoGraph(document); if (!result.valid) throw Error(result.errors[0]); return clone(document);
    }
    if (!Array.isArray(document?.nodes)) throw Error('This file does not contain a PIMO document.');
    const graph = createPimoGraph(document.identity?.commonName || document.identity?.title || 'Imported PIMO');
    graph.id = text(document.id) || graph.id; graph.identity = { ...clone(document.identity || {}), title: graph.identity.title };
    graph.sources = clone(document.sources || []); graph.legacy = { plantId: document.plantId, schemaVersion: document.schemaVersion };
    graph.nodes = document.nodes.map(node => ({ ...clone(node), id: text(node.id), title: text(node.title) }));
    const roots = document.nodes.filter(node => !node.parentId); let index = 0;
    function place(node, x, y, depth) {
        graph.layout.nodes[node.id] = { x, y, width: 176, height: 126, shape: 'organic', color: PIMO_COLORS[index++ % PIMO_COLORS.length] };
        const children = document.nodes.filter(child => child.parentId === node.id);
        children.forEach((child, i) => { graph.edges.push({ id: pimoId('link'), from: node.id, to: child.id, kind: 'branch', label: '', waypoints: [] }); place(child, x + 250, y + (i - (children.length - 1) / 2) * 170, depth + 1); });
    }
    // Validate ancestry before walking imported legacy data.
    const byId = new Map(document.nodes.map(node => [node.id, node]));
    if (byId.size !== document.nodes.length || document.nodes.length > 1000 || document.nodes.some(node => ['__proto__', 'prototype', 'constructor'].includes(node.id))) throw Error('The imported map has duplicate or reserved cell IDs, or exceeds 1,000 cells.');
    for (const node of document.nodes) { const seen = new Set([node.id]); let parent = node.parentId; while (parent) { if (seen.has(parent) || !byId.has(parent)) throw Error('The imported map contains a loop or missing parent.'); seen.add(parent); parent = byId.get(parent).parentId; } }
    roots.forEach((root, i) => place(root, -340, (i - (roots.length - 1) / 2) * 260, 0));
    const result = validatePimoGraph(graph); if (!result.valid) throw Error(result.errors[0]); return graph;
}

export function arrangePimoGraph(graph) {
    if (['classic', 'notes'].includes(graph.layout.design)) return arrangePimoDesign(graph);
    const next = clone(graph), parented = new Set(next.edges.filter(edge => edge.kind === 'branch').map(edge => edge.to));
    const roots = next.nodes.filter(node => !parented.has(node.id)); let row = 0;
    function place(id, depth) { const children = next.edges.filter(edge => edge.kind === 'branch' && edge.from === id); const start = row; children.forEach(edge => place(edge.to, depth + 1)); if (!children.length) row++; next.layout.nodes[id] = { ...next.layout.nodes[id], x: depth * 270, y: ((start + row - 1) / 2) * 170 }; }
    roots.forEach(root => { place(root.id, 0); row += .5; });
    next.edges.forEach(edge => { edge.waypoints = []; }); return next;
}

export function pimoSuggestions(graph, id) {
    const selected = graph.nodes.find(node => node.id === id), name = (selected?.title || '').toLowerCase();
    let titles = /wildlife|animal|bird/.test(name) ? ['Bird visitors', 'Pollinators', 'Signs & sightings']
        : /medicin/.test(name) ? ['Attributed knowledge', 'Evidence & safety', 'Local stories']
        : /edible|food|kitchen/.test(name) ? ['Edible leaves', 'Flowers & fruit', 'Preparation notes']
        : /habitat|layer/.test(name) ? ['Canopy', 'Understory', 'Forest floor']
        : /water|season/.test(name) ? ['Seasonal observations', 'Waterways', 'Rainfall notes']
        : /harvest/.test(name) ? ['Harvest calendar', 'What is ready?', 'Sharing the harvest']
        : ['Observation', 'A useful connection', 'Story from this place'];
    const existing = new Set(graph.edges.filter(edge => edge.from === id).map(edge => graph.nodes.find(node => node.id === edge.to)?.title));
    return titles.filter(title => !existing.has(title));
}
