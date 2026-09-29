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
    const expanded = state.pimExpanded ? bookNodePath(document.nodes, selected.id).map(node => node.path) : [];
    return `<div class="nxr-guide-pim-field" style="width:${size.width}px;height:${size.height}px">${plantInformationMeshMarkup(knowledge[state.plant], expanded, {
        layoutWidth: size.width, layoutHeight: size.height,
        viewportWidth: size.width, viewportHeight: size.height,
        cellWidthPixels: 116, gapPixels: 12,
        selectedNodeId: selected.path, softSurface: true
    })}</div>`;
}

function guidePlaceCanvas() {
    return `<div class="nxr-guide-place-map" aria-label="How a NourishlandXR Project is organised">
        <article class="nxr-guide-place-project"><small>ONE WHOLE PLACE</small><strong>Project</strong><span>Everything that belongs to this garden, school or landscape.</span></article>
        <div class="nxr-guide-place-link" aria-hidden="true">organised into</div>
        <div class="nxr-guide-place-areas"><article><small>AREA 01</small><strong>Food garden</strong></article><article><small>AREA 02</small><strong>Learning grove</strong></article></div>
        <div class="nxr-guide-place-link" aria-hidden="true">find your direction</div>
        <article class="nxr-guide-place-totem"><small>DIRECTIONAL TOTEM</small><div><span>← Food garden</span><span>Learning grove →</span><span>Plants · Notes · place information</span></div></article>
    </div>`;
}

function guideReading(state, documents) {
    if (state.step === 0) return `<p class="nxr-guide-kicker">START WITH A PLACE</p><h2>One Project, organised into Areas</h2><p>A Project represents the whole place. Areas divide it into useful locations, such as a food garden and a learning grove.</p><p>Directional Totems help people find their way. Their signs point toward Areas, Plants, Notes and other information, so content stays connected to where it belongs.</p>`;
    if (state.step === 3) return `<p class="nxr-guide-kicker">YOU’RE READY TO EXPLORE</p><h2>Bring knowledge into a real place</h2><p>Search connected plant databases for dynamic reference information. Check its source, then add reviewed knowledge to a Project.</p><p>Create field guides from saved Plants and Areas, and add Notes as you observe how the place changes.</p><p>On a compatible phone or headset, the optional AR introduction lets you place and select Plant Orbs, follow Totem signs, open learning cells and add Notes in the landscape.</p><div class="nxr-guide-reading-next"><strong>Choose what to do next</strong><button type="button" data-guide-place>Explore a place <span aria-hidden="true">→</span></button><button type="button" data-guide-create>Create &amp; manage a Project <span aria-hidden="true">→</span></button><button type="button" data-guide-ar>Open the optional AR introduction <span aria-hidden="true">→</span></button><button type="button" data-guide-restart>Run the introduction again <span aria-hidden="true">↻</span></button></div>`;
    if (state.mode === 'limo') {
        const cell = LIM_CELL_BY_ID[state.limId];
        if (!cell) return `<p class="nxr-guide-kicker">LEARNING IDEAS · LIMO</p><h2>Choose a learning theme</h2><p>Select a cell on the canvas. Its explanation will open here.</p><img class="nxr-guide-reading-art" src="${ART.learning}" alt="An explorer looking closely at a plant" />`;
        const path = bookLearningPath(cell.id, guideLimFace(cell.id).id);
        const children = bookLearningChildren(cell.id);
        return `${state.step===2?'<p class="nxr-guide-link-context">Connected example · Pigeon Pea → Food Forest → Function</p>':''}<p class="nxr-guide-kicker">LEARNING IDEAS · LIMO</p><p class="nxr-guide-reading-path">${escapeHtml(path.map(item => item.title).join(' / '))}</p><h2>${escapeHtml(cell.title)}</h2><p>${escapeHtml(cell.content || limLearningContent(cell.id).body || '')}</p><div class="nxr-guide-reading-next"><strong>${children.length ? 'Follow this idea' : 'End of this branch'}</strong>${children.map(child => `<button type="button" data-guide-lim="${escapeHtml(child.id)}">${escapeHtml(child.title)} <span aria-hidden="true">→</span></button>`).join('') || '<p>Choose another learning theme to explore.</p>'}</div>`;
    }
    const document = documents[state.plant];
    const node = document.nodes.find(item => item.id === state.pimId) || document.nodes[0];
    const children = bookChildren(document.nodes, node.id);
    const path = bookNodePath(document.nodes, node.id);
    const image = state.plant === 'moringa' ? ART.moringa : ART.pigeon;
    return `<p class="nxr-guide-kicker">PLANT INFORMATION · PIMO</p><div class="nxr-guide-reading-plant"><img src="${image}" alt="" /><span>${escapeHtml(document.identity?.commonName || '')}<small>${escapeHtml(document.identity?.scientificName || '')}</small></span></div><p class="nxr-guide-reading-path">${escapeHtml(path.map(item => item.title).join(' / '))}</p><h2>${escapeHtml(node.title)}</h2>${node.preview ? `<p class="nxr-guide-reading-preview">${escapeHtml(node.preview)}</p>` : ''}<p>${escapeHtml(node.body || document.identity?.identityStatement || '')}</p>${node.safetyNote ? `<p class="nxr-guide-reading-safety"><strong>Take care</strong><br>${escapeHtml(node.safetyNote)}</p>` : ''}<div class="nxr-guide-reading-next"><strong>${children.length ? 'Open a child cell' : 'End of this branch'}</strong>${children.map(child => `<button type="button" data-guide-pim="${escapeHtml(child.id)}">${escapeHtml(child.title)} <span aria-hidden="true">→</span></button>`).join('') || '<p>Choose another hexagon on the canvas.</p>'}</div>`;
}

export function renderDesktopLearningBook(app, { moringaDocument, onExit = () => globalThis.renderLaunchScreen?.() } = {}) {
    if (!moringaDocument?.nodes?.length) throw new Error('The Moringa PIM document is required for the desktop guide.');
    activeBookCleanup();
    const controller = new AbortController();
    const documents = { pigeon: PIGEON_PEA_PIM, moringa: moringaDocument };
    const knowledge = { pigeon: pimToArKnowledge(documents.pigeon), moringa: pimToArKnowledge(documents.moringa) };
    const state = { step: 0, mode: 'overview', plant: 'pigeon', pimId: 'food-forest', pimExpanded: false, limId: 'lim-food-forest' };
    const canvasSize = () => ({
        width: Math.max(650, Math.min(1030, (globalThis.innerWidth || 1440) - 410)),
        height: Math.max(570, Math.min(740, (globalThis.innerHeight || 850) - 170))
    });
    const render = (focus = '') => {
        const size = canvasSize();
        state.mode = state.step===0?'overview':state.step===1?'pimo':'limo';
        const steps=['Map a place','Open plant information','Apply a learning idea','Use NLXR in the field'];
        const guidance=[
            'A Project contains Areas. Directional Totems help people find Plants, Notes and other place information.',
            'This is the real Plant Information Mesh. Select Food Forest; it opens and grows its child cells around it. Choose any other hexagon to open that branch.',
            'Now connect the plant’s Food Forest role to a learning idea. Select Function; its explanation opens beside the canvas.',
            'The pattern is simple: map a place, connect trusted information, then use it to guide observation and action.'
        ];
        const canvasTitle=state.mode==='overview'?'PROJECT · AREAS · DIRECTIONAL TOTEMS':state.mode==='pimo'?'PLANT INFORMATION · PIMO':'LEARNING IDEAS · LIMO';
        const canvasLabel=state.mode==='overview'?'Project, Areas and Totem map':state.mode==='pimo'?'Flat interactive Plant Information Mesh':'Flat interactive Learning Information Mesh';
        const canvasContent=state.mode==='overview'?guidePlaceCanvas():state.mode==='pimo'?guidePimCanvas(state,documents,knowledge,size):guideLimCanvas(state);
        const progress=state.step<3?`<span>STEP ${state.step+1} OF 4 · ${steps[state.step]}</span><span>${steps.slice(0,4).map((step,index)=>`<i class="${index===state.step?'is-current':index<state.step?'is-done':''}" aria-label="${escapeHtml(step)}"></i>`).join('')}</span>`:'<span>INTRODUCTION COMPLETE</span>';
        const navigation=state.step===0?'<button type="button" data-guide-next>Next: open plant information →</button>':state.step===1?'<button type="button" data-guide-back>← Back</button><button type="button" data-guide-next>Next: connect learning →</button>':state.step===2?'<button type="button" data-guide-back>← Back</button><button type="button" data-guide-next>Finish introduction →</button>':'';
        app.innerHTML = `<div class="nxr-guide"><header class="nxr-guide-header"><div><p class="nxr-guide-kicker">NOURISHLANDXR · INTERACTIVE INTRODUCTION</p><h1>One place. Connected knowledge.</h1><p>See how NLXR links real places, plant information and practical learning.</p></div><button type="button" class="nxr-guide-exit" data-guide-exit>Close introduction ×</button></header><div class="nxr-guide-toolbar"><strong>${steps[state.step].toUpperCase()}</strong><p>${guidance[state.step]}</p></div><main class="nxr-guide-workspace"><section class="nxr-guide-canvas" aria-label="${canvasLabel}"><div class="nxr-guide-canvas-top"><span>${canvasTitle}</span>${state.mode==='pimo'?'<span>PIGEON PEA · CLICK A CELL TO OPEN IT</span>':state.mode==='limo'?'<span>CLICK A CELL TO READ AND FOLLOW IT</span>':''}</div><div class="nxr-guide-canvas-scroll">${canvasContent}</div></section><aside class="nxr-guide-reading" aria-label="Information side panel"><div class="nxr-guide-reading-head">${state.step===0?'HOW A PLACE IS ORGANISED':state.step===3?'WHAT YOU CAN DO NEXT':'INFORMATION OPENS HERE'}</div><div class="nxr-guide-reading-body" aria-live="polite">${guideReading(state, documents)}</div></aside></main><footer class="nxr-guide-footer"><div class="nxr-guide-progress">${progress}</div><div class="nxr-guide-navigation">${navigation}</div></footer></div>`;
        if (state.mode === 'pimo') syncPimConnectionLayer(app.querySelector('[data-pim-renderer="canonical"]'));
        if (focus) app.querySelector(focus)?.focus({ preventScroll: true });
    };
    const exit = () => { controller.abort(); activeBookCleanup = () => {}; onExit(); };
    app.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || !app.contains(button)) return;
        if (button.hasAttribute('data-guide-exit')) { exit(); return; }
        if (button.hasAttribute('data-guide-next')) { state.step=Math.min(3,state.step+1);render('[data-guide-next]');return; }
        if (button.hasAttribute('data-guide-back')) { state.step=Math.max(0,state.step-1);render('[data-guide-next]');return; }
        if (button.hasAttribute('data-guide-place')) { exit();globalThis.renderV1Explorer?.();return; }
        if (button.hasAttribute('data-guide-create')) { exit();globalThis.renderDemoProjects?.();return; }
        if (button.hasAttribute('data-guide-ar')) { exit();globalThis.openTemporaryArDemoWindow?.();return; }
        if (button.hasAttribute('data-guide-restart')) { state.step=0;state.mode='overview';state.limId='lim-food-forest-function';render();return; }
        if (button.dataset.guideLim && LIM_CELL_BY_ID[button.dataset.guideLim]) { state.limId = button.dataset.guideLim; render(`[data-guide-lim="${state.limId}"]`); return; }
        const pimId = button.dataset.guidePim || button.dataset.pimNodeId;
        if (pimId && documents[state.plant].nodes.some(node => node.id === pimId)) { state.mode = 'pimo';state.pimExpanded=state.pimId===pimId?!state.pimExpanded:true;state.pimId = pimId; render(`[data-pim-node-id="${state.pimId}"]`); }
    }, { signal: controller.signal });
    globalThis.addEventListener?.('resize', () => { if (state.mode === 'pimo') render(); }, { signal: controller.signal });
    activeBookCleanup = () => controller.abort();
    render();
    return exit;
}
