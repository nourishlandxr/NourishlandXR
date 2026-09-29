import { LIM_ALL_CELLS, LIM_CELL_BY_ID, LIM_FACES, limLearningContent } from '../services/limLearning.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { pimToArKnowledge } from '../services/pimModel.js';
import { plantInformationMeshMarkup, syncPimConnectionLayer } from '../services/plantInformationMeshView.js';

const ART = Object.freeze({
    learning: new URL('../assets/demo-tutorial-art/01-plant-curiosity.png', import.meta.url).href,
    pigeon: new URL('../assets/pigeon-pea-cajanus-cajan.png', import.meta.url).href,
    moringa: new URL('../assets/moringa-oleifera.jpg', import.meta.url).href
});
let activeBookCleanup = () => {};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function bookChildren(nodes, parentId) {
    return (nodes || []).filter(node => node.parentId === parentId);
}

export function bookLearningChildren(id) {
    const direct = bookChildren(LIM_ALL_CELLS, id);
    const face = LIM_FACES.find(item => item.id === id);
    if (!face) return direct;
    const seen = new Set(direct.map(item => item.id));
    const shown = [...direct];
    for (const branch of face.showcase || []) {
        const cell = LIM_CELL_BY_ID[branch.id];
        if (cell && !seen.has(cell.id)) { shown.push(cell); seen.add(cell.id); }
    }
    return shown;
}

export function bookNodePath(nodes, id) {
    const byId = new Map((nodes || []).map(node => [node.id, node]));
    const path = [];
    const seen = new Set();
    let node = byId.get(id);
    while (node && !seen.has(node.id)) {
        path.unshift(node);
        seen.add(node.id);
        node = byId.get(node.parentId);
    }
    return path;
}

export function bookLearningPath(id, faceId) {
    const path = bookNodePath(LIM_ALL_CELLS, id);
    const face = LIM_CELL_BY_ID[faceId];
    if (!face || path[0]?.id === faceId) return path;
    return [face, ...path.slice(1)];
}

// The desktop guide uses the same PIM data and renderer as AR, laid flat on an
// open canvas. LIMO remains a separate authored learning mesh.
const GUIDE_FACE_POSITIONS = [[50,13],[75,23],[85,50],[75,77],[50,87],[25,77],[15,50],[25,23]];

function guideLimFace(id) {
    return LIM_FACES.find(face => face.id === id || bookNodePath(LIM_ALL_CELLS, id)[0]?.id === face.id) || LIM_FACES[0];
}

function guideLimCell(cell, x, y, active = false, center = false) {
    return `<button type="button" class="nxr-guide-lim-cell${active ? ' is-active' : ''}${center ? ' is-center' : ''}" data-guide-lim="${escapeHtml(cell.id)}" aria-pressed="${active}" style="--cell-x:${x}%;--cell-y:${y}%;--cell-accent:${guideLimFace(cell.id).accent}"><span>${escapeHtml(cell.title)}</span></button>`;
}

function guideLimCanvas(state) {
    const selected = LIM_CELL_BY_ID[state.limId];
    if (!selected) return `<div class="nxr-guide-lim-field" aria-label="Learning themes"><div class="nxr-guide-lim-hub" aria-hidden="true">LIMO<small>Learning Information Mesh</small></div>${LIM_FACES.map((face, index) => guideLimCell(face, ...GUIDE_FACE_POSITIONS[index])).join('')}</div>`;
    const face = guideLimFace(selected.id);
    const children = bookLearningChildren(selected.id);
    const ring = children.map((cell, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / children.length;
        return guideLimCell(cell, 50 + Math.cos(angle) * 34, 50 + Math.sin(angle) * 34);
    }).join('');
    const ancestors = bookLearningPath(selected.id, face.id).slice(0, -1);
    return `<div class="nxr-guide-lim-field" aria-label="Learning cells">${guideLimCell(selected, 50, 50, true, true)}${ring}<div class="nxr-guide-lim-breadcrumb"><button type="button" data-guide-lim-overview>All themes</button>${ancestors.map(cell => `<span aria-hidden="true">/</span><button type="button" data-guide-lim="${escapeHtml(cell.id)}">${escapeHtml(cell.title)}</button>`).join('')}</div></div>`;
}

function guidePimCanvas(state, documents, knowledge, size) {
    const document = documents[state.plant];
    const selected = document.nodes.find(node => node.id === state.pimId) || document.nodes[0];
    const expanded = bookNodePath(document.nodes, selected.id).map(node => node.path);
    return `<div class="nxr-guide-pim-field" style="width:${size.width}px;height:${size.height}px">${plantInformationMeshMarkup(knowledge[state.plant], expanded, {
        layoutWidth: size.width, layoutHeight: size.height,
        viewportWidth: size.width, viewportHeight: size.height,
        cellWidthPixels: 116, gapPixels: 12,
        selectedNodeId: selected.path, softSurface: true
    })}</div>`;
}

function guideReading(state, documents) {
    if (state.mode === 'limo') {
        const cell = LIM_CELL_BY_ID[state.limId];
        if (!cell) return `<p class="nxr-guide-kicker">LIMO · LEARNING INFORMATION MESH</p><h2>Choose a learning theme</h2><p>Select a cell on the canvas. Its explanation will open here.</p><img class="nxr-guide-reading-art" src="${ART.learning}" alt="An explorer looking closely at a plant" />`;
        const path = bookLearningPath(cell.id, guideLimFace(cell.id).id);
        const children = bookLearningChildren(cell.id);
        return `<p class="nxr-guide-kicker">LIMO · LEARNING CELL</p><p class="nxr-guide-reading-path">${escapeHtml(path.map(item => item.title).join(' / '))}</p><h2>${escapeHtml(cell.title)}</h2><p>${escapeHtml(cell.content || limLearningContent(cell.id).body || '')}</p><div class="nxr-guide-reading-next"><strong>${children.length ? 'Follow this idea' : 'End of this branch'}</strong>${children.map(child => `<button type="button" data-guide-lim="${escapeHtml(child.id)}">${escapeHtml(child.title)} <span aria-hidden="true">→</span></button>`).join('') || '<p>Choose another learning theme to explore.</p>'}</div>`;
    }
    const document = documents[state.plant];
    const node = document.nodes.find(item => item.id === state.pimId) || document.nodes[0];
    const children = bookChildren(document.nodes, node.id);
    const path = bookNodePath(document.nodes, node.id);
    const image = state.plant === 'moringa' ? ART.moringa : ART.pigeon;
    return `<p class="nxr-guide-kicker">PIMO · PLANT INFORMATION MESH</p><div class="nxr-guide-reading-plant"><img src="${image}" alt="" /><span>${escapeHtml(document.identity?.commonName || '')}<small>${escapeHtml(document.identity?.scientificName || '')}</small></span></div><p class="nxr-guide-reading-path">${escapeHtml(path.map(item => item.title).join(' / '))}</p><h2>${escapeHtml(node.title)}</h2>${node.preview ? `<p class="nxr-guide-reading-preview">${escapeHtml(node.preview)}</p>` : ''}<p>${escapeHtml(node.body || document.identity?.identityStatement || '')}</p>${node.safetyNote ? `<p class="nxr-guide-reading-safety"><strong>Take care</strong><br>${escapeHtml(node.safetyNote)}</p>` : ''}<div class="nxr-guide-reading-next"><strong>${children.length ? 'Follow a child cell' : 'End of this branch'}</strong>${children.map(child => `<button type="button" data-guide-pim="${escapeHtml(child.id)}">${escapeHtml(child.title)} <span aria-hidden="true">→</span></button>`).join('') || '<p>Choose another hexagon on the canvas.</p>'}</div>`;
}

export function renderDesktopLearningBook(app, { moringaDocument, onExit = () => globalThis.renderLaunchScreen?.() } = {}) {
    if (!moringaDocument?.nodes?.length) throw new Error('The Moringa PIM document is required for the desktop guide.');
    activeBookCleanup();
    const controller = new AbortController();
    const documents = { pigeon: PIGEON_PEA_PIM, moringa: moringaDocument };
    const knowledge = { pigeon: pimToArKnowledge(documents.pigeon), moringa: pimToArKnowledge(documents.moringa) };
    const state = { mode: 'pimo', plant: 'pigeon', pimId: 'food-forest', limId: '' };
    const canvasSize = () => ({
        width: Math.max(650, Math.min(1030, (globalThis.innerWidth || 1440) - 410)),
        height: Math.max(570, Math.min(740, (globalThis.innerHeight || 850) - 170))
    });
    const render = (focus = '') => {
        const size = canvasSize();
        app.innerHTML = `<div class="nxr-guide"><header class="nxr-guide-header"><div><p class="nxr-guide-kicker">NOURISHLANDXR · DESKTOP TUTORIAL</p><h1>Explore the interface</h1><p>Choose a mesh, select a cell, and read its information on the right.</p></div><button type="button" class="nxr-guide-exit" data-guide-exit>Close tutorial ×</button></header><div class="nxr-guide-toolbar"><div class="nxr-guide-tabs" role="group" aria-label="Choose a mesh"><button type="button" data-guide-mode="pimo" aria-pressed="${state.mode === 'pimo'}">PIMO <small>Plant information</small></button><button type="button" data-guide-mode="limo" aria-pressed="${state.mode === 'limo'}">LIMO <small>Learning information</small></button></div><p>${state.mode === 'pimo' ? 'Select a hexagon to open plant information. Select a branch to go deeper.' : 'Select a learning cell to open its topic. Select a child to follow the idea.'}</p></div><main class="nxr-guide-workspace"><section class="nxr-guide-canvas" aria-label="${state.mode === 'pimo' ? 'Flat Plant Information Mesh' : 'Flat Learning Information Mesh'}"><div class="nxr-guide-canvas-top"><span>${state.mode === 'pimo' ? 'PLANT INFORMATION MESH' : 'LEARNING INFORMATION MESH'}</span>${state.mode === 'pimo' ? `<div class="nxr-guide-plant-switch" role="group" aria-label="Choose a plant"><button type="button" data-guide-plant="pigeon" aria-pressed="${state.plant === 'pigeon'}">Pigeon Pea</button><button type="button" data-guide-plant="moringa" aria-pressed="${state.plant === 'moringa'}">Moringa</button></div>` : '<button type="button" class="nxr-guide-overview" data-guide-lim-overview>All themes</button>'}</div><div class="nxr-guide-canvas-scroll">${state.mode === 'pimo' ? guidePimCanvas(state, documents, knowledge, size) : guideLimCanvas(state)}</div></section><aside class="nxr-guide-reading" aria-label="Information side panel"><div class="nxr-guide-reading-head">INFORMATION PANEL</div><div class="nxr-guide-reading-body" aria-live="polite">${guideReading(state, documents)}</div></aside></main><footer class="nxr-guide-footer"><span>1 · Choose a mesh</span><span>2 · Select a cell</span><span>3 · Follow a branch</span></footer></div>`;
        if (state.mode === 'pimo') syncPimConnectionLayer(app.querySelector('[data-pim-renderer="canonical"]'));
        if (focus) app.querySelector(focus)?.focus({ preventScroll: true });
    };
    const exit = () => { controller.abort(); activeBookCleanup = () => {}; onExit(); };
    app.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || !app.contains(button)) return;
        if (button.hasAttribute('data-guide-exit')) { exit(); return; }
        if (button.dataset.guideMode) { state.mode = button.dataset.guideMode; render(`[data-guide-mode="${state.mode}"]`); return; }
        if (button.dataset.guidePlant && documents[button.dataset.guidePlant]) { state.plant = button.dataset.guidePlant; state.pimId = 'food-forest'; render(`[data-guide-plant="${state.plant}"]`); return; }
        if (button.hasAttribute('data-guide-lim-overview')) { state.limId = ''; render('[data-guide-lim-overview]'); return; }
        if (button.dataset.guideLim && LIM_CELL_BY_ID[button.dataset.guideLim]) { state.mode = 'limo'; state.limId = button.dataset.guideLim; render(`[data-guide-lim="${state.limId}"]`); return; }
        const pimId = button.dataset.guidePim || button.dataset.pimNodeId;
        if (pimId && documents[state.plant].nodes.some(node => node.id === pimId)) { state.mode = 'pimo'; state.pimId = pimId; render(`[data-pim-node-id="${state.pimId}"]`); }
    }, { signal: controller.signal });
    globalThis.addEventListener?.('resize', () => { if (state.mode === 'pimo') render(); }, { signal: controller.signal });
    activeBookCleanup = () => controller.abort();
    render();
    return exit;
}
