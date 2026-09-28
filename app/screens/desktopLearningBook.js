import { LIM_ALL_CELLS, LIM_CELL_BY_ID, LIM_FACES, LIM_INTRO_BRANCHES, LIM_INTRO_CELL_BY_ID, LIM_INTRO_CELLS, limLearningContent } from '../services/limLearning.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { DEMO_CONNECTION_CHOICES, DEMO_DEEPER_CONNECTION } from '../services/demoKnowledgeConnections.js';

const ART = Object.freeze({
    opening: new URL('../assets/demo-tutorial-art/04b-one-place-clear-structure.png', import.meta.url).href,
    learning: new URL('../assets/demo-tutorial-art/01-plant-curiosity.png', import.meta.url).href,
    connections: new URL('../assets/demo-tutorial-art/08-connect-pimo-to-limo.png', import.meta.url).href,
    pigeon: new URL('../assets/pigeon-pea-cajanus-cajan.png', import.meta.url).href,
    moringa: new URL('../assets/moringa-oleifera.jpg', import.meta.url).href
});
const CHAPTERS = Object.freeze([
    { id: 'opening', number: '01', title: 'Begin' },
    { id: 'learning', number: '02', title: 'Learning cells' },
    { id: 'plants', number: '03', title: 'Plant stories' },
    { id: 'connections', number: '04', title: 'Connections' }
]);
let activeBookCleanup = () => {};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function proseParagraphs(value) {
    return String(value ?? '').split(/\n\s*\n/).filter(Boolean).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
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

function cellButton(kind, node, active, detail = '') {
    const children = kind === 'lim' ? bookLearningChildren(node.id) : kind === 'intro' ? bookChildren(LIM_INTRO_CELLS, node.id) : [];
    return `<button type="button" class="nlxr-book-cell${active ? ' is-active' : ''}" data-book-${kind}="${escapeHtml(node.id)}" aria-pressed="${active ? 'true' : 'false'}"><span class="nlxr-book-cell-mark" aria-hidden="true">✳</span><span><strong>${escapeHtml(node.title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}</span><span class="nlxr-book-cell-tail" aria-hidden="true">${children.length ? `${children.length} ›` : '›'}</span></button>`;
}

function chapterNav(chapter) {
    return CHAPTERS.map(item => `<button type="button" data-book-chapter="${item.id}" class="${chapter === item.id ? 'is-active' : ''}" ${chapter === item.id ? 'aria-current="page"' : ''}><span>${item.number}</span>${item.title}</button>`).join('');
}

function openingPage(state) {
    const selected = LIM_INTRO_CELL_BY_ID[state.introId];
    const children = selected ? bookChildren(LIM_INTRO_CELLS, selected.id) : [];
    return `<div class="nlxr-book-page-scroll"><div class="nlxr-book-opening"><p class="nlxr-book-kicker">NOURISHLANDXR · FIELD BOOK</p><h1>Read a living place.</h1><p class="nlxr-book-lede">Plants, places and knowledge do not sit in separate boxes. Open a cell, follow its children, and see how one idea can lead to another.</p><figure class="nlxr-book-plate"><img src="${ART.opening}" alt="Hand-drawn garden paths and signs among trees" /><figcaption>Plate 01 · One place can hold many stories.</figcaption></figure><div class="nlxr-book-opening-actions"><button type="button" data-book-chapter="learning">Explore learning cells <span aria-hidden="true">→</span></button><button type="button" data-book-chapter="plants">Open plant stories <span aria-hidden="true">→</span></button></div><section class="nlxr-book-teachings"><p class="nlxr-book-kicker">FOUR WAYS TO LEARN</p><h2>Start with a question.</h2><p>These introductory learning cells form a path from reading a place to shaping a thoughtful response.</p><div class="nlxr-book-teaching-grid">${LIM_INTRO_BRANCHES.map(branch => cellButton('intro', LIM_INTRO_CELL_BY_ID[branch.id], selected?.id === branch.id, '')).join('')}</div>${selected ? `<div class="nlxr-book-teaching-open"><div class="nlxr-book-path">${bookNodePath(LIM_INTRO_CELLS, selected.id).map((item, index, path) => `<button type="button" data-book-intro="${escapeHtml(item.id)}" ${item.id === selected.id ? 'aria-current="location"' : ''}>${escapeHtml(item.title)}</button>${index < path.length - 1 ? '<span aria-hidden="true">/</span>' : ''}`).join('')}</div><h3>${escapeHtml(selected.title)}</h3><p>${escapeHtml(selected.content)}</p>${children.length ? `<div class="nlxr-book-thread-list">${children.map(node => cellButton('intro', node, false, '')).join('')}</div>` : ''}</div>` : ''}</section></div></div><aside class="nlxr-book-margin" aria-label="How to use this book"><p class="nlxr-book-margin-label">IN THE MARGIN</p><h2>Follow the thread</h2><p>A learning cell opens a subject. A plant cell brings that subject back to a living organism. The reading panel keeps the explanation in view.</p><div class="nlxr-book-margin-steps"><span>01 · Choose a chapter</span><span>02 · Open a cell</span><span>03 · Follow a child</span></div></aside>`;
}

function learningPage(state) {
    const selected = LIM_CELL_BY_ID[state.limId] || LIM_CELL_BY_ID['lim-food-forest'];
    const faceId = state.limFaceId || selected.primaryFaceId || selected.id;
    const face = LIM_CELL_BY_ID[faceId] || selected;
    const path = bookLearningPath(selected.id, faceId);
    const children = bookLearningChildren(selected.id);
    return `<div class="nlxr-book-page-scroll"><div class="nlxr-book-page-head"><p class="nlxr-book-kicker">CHAPTER 02 · LEARNING INFORMATION MESH</p><h1>Ideas to explore</h1><p>Begin with a broad theme. Each cell can open into more specific questions.</p></div><div class="nlxr-book-face-grid" aria-label="Learning themes">${LIM_FACES.map(item => `<button type="button" class="nlxr-book-face${faceId === item.id ? ' is-active' : ''}" data-book-lim="${escapeHtml(item.id)}" aria-pressed="${faceId === item.id ? 'true' : 'false'}"><span class="nlxr-book-face-symbol" aria-hidden="true">✳</span><span>${escapeHtml(item.title)}</span></button>`).join('')}</div><section class="nlxr-book-thread"><p class="nlxr-book-kicker">OPEN THREAD</p><div class="nlxr-book-path">${path.map((item, index) => `<button type="button" data-book-lim="${escapeHtml(item.id)}" ${item.id === selected.id ? 'aria-current="location"' : ''}>${escapeHtml(item.title)}</button>${index < path.length - 1 ? '<span aria-hidden="true">/</span>' : ''}`).join('')}</div><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.content || limLearningContent(selected.id).body || face.content || '')}</p>${children.length ? `<h3>Follow this idea</h3><div class="nlxr-book-thread-list">${children.map(child => cellButton('lim', child, false, child.preview || '')).join('')}</div>` : '<p class="nlxr-book-endnote">A close observation can become the beginning of another question.</p>'}</section></div><aside class="nlxr-book-margin nlxr-book-illustration-margin" aria-label="Illustration and reading note"><figure><img src="${ART.learning}" alt="Hand-drawn explorer examining a plant" /><figcaption>Plate 02 · Curiosity begins with noticing.</figcaption></figure><p>Selected theme</p><strong>${escapeHtml(face.title)}</strong><span>${escapeHtml(path.map(item => item.title).join(' / '))}</span></aside>`;
}

function plantPage(state, documents) {
    const document = documents[state.plant];
    const nodes = document.nodes || [];
    const selected = nodes.find(node => node.id === state.pimId) || nodes.find(node => !node.parentId) || nodes[0];
    const identity = document.identity || {};
    const image = state.plant === 'moringa' ? ART.moringa : ART.pigeon;
    const path = bookNodePath(nodes, selected?.id);
    const roots = bookChildren(nodes, null);
    const children = bookChildren(nodes, selected?.id);
    return `<div class="nlxr-book-page-scroll"><div class="nlxr-book-page-head"><p class="nlxr-book-kicker">CHAPTER 03 · PLANT INFORMATION MESH</p><h1>One plant, many stories.</h1><p>Choose a plant, then open the subjects beside this page. The reading panel explains each cell.</p></div><div class="nlxr-book-plant-switch" role="group" aria-label="Choose a plant"><button type="button" data-book-plant="pigeon" class="${state.plant === 'pigeon' ? 'is-active' : ''}" aria-pressed="${state.plant === 'pigeon'}">Pigeon Pea</button><button type="button" data-book-plant="moringa" class="${state.plant === 'moringa' ? 'is-active' : ''}" aria-pressed="${state.plant === 'moringa'}">Moringa</button></div><figure class="nlxr-book-plant-plate"><img src="${image}" alt="${escapeHtml(identity.commonName || 'Plant')}" /><figcaption>Plant study · ${escapeHtml(identity.commonName || '')}<em>${escapeHtml(identity.scientificName || '')}</em></figcaption></figure><section class="nlxr-book-plant-intro"><p class="nlxr-book-kicker">CURRENT SUBJECT</p><h2>${escapeHtml(selected?.title || identity.commonName || '')}</h2><p>${escapeHtml(selected?.preview || identity.identityStatement || '')}</p><div class="nlxr-book-path">${path.map((item, index) => `<button type="button" data-book-pim="${escapeHtml(item.id)}" ${item.id === selected?.id ? 'aria-current="location"' : ''}>${escapeHtml(item.title)}</button>${index < path.length - 1 ? '<span aria-hidden="true">/</span>' : ''}`).join('')}</div></section></div><aside class="nlxr-book-margin nlxr-book-pim-margin" aria-label="Plant information cells"><p class="nlxr-book-margin-label">PIMO · PLANT CELLS</p><h2>${escapeHtml(identity.commonName || 'Plant')}</h2><p class="nlxr-book-pim-intro">Open a subject; follow its child cells as far as your curiosity takes you.</p><div class="nlxr-book-pim-list" aria-label="Plant subjects">${roots.map(node => cellButton('pim', node, node.id === selected?.id, node.preview || '')).join('')}</div>${selected?.parentId ? `<button type="button" class="nlxr-book-parent" data-book-pim="${escapeHtml(selected.parentId)}">← Parent cell</button>` : ''}${children.length ? `<h3>Within ${escapeHtml(selected.title)}</h3><div class="nlxr-book-pim-list">${children.map(node => cellButton('pim', node, false, node.preview || '')).join('')}</div>` : '<p class="nlxr-book-pim-end">End of this branch. Follow another subject above.</p>'}</aside>`;
}

function connectionsPage(state) {
    const choice = DEMO_CONNECTION_CHOICES.find(item => item.id === state.connectionId) || null;
    return `<div class="nlxr-book-page-scroll"><div class="nlxr-book-page-head"><p class="nlxr-book-kicker">CHAPTER 04 · CONNECTIONS</p><h1>What changes when ideas meet?</h1><p>Read a plant characteristic alongside a learning theme. The resulting note is an authored example, not an AI answer.</p></div><figure class="nlxr-book-connection-plate"><img src="${ART.connections}" alt="Hand-drawn example of plant and learning information connected" /><figcaption>Plate 04 · Knowledge can be read across cells.</figcaption></figure><div class="nlxr-book-connection-choices">${DEMO_CONNECTION_CHOICES.map(item => `<button type="button" data-book-connection="${escapeHtml(item.id)}" class="${state.connectionId === item.id ? 'is-active' : ''}" aria-pressed="${state.connectionId === item.id}"><span>${escapeHtml(item.sourceTitle)} <i aria-hidden="true">＋</i> ${escapeHtml(item.targetTitle)}</span><small>Open this example <span aria-hidden="true">→</span></small></button>`).join('')}</div>${choice ? `<section class="nlxr-book-connection-result"><p class="nlxr-book-kicker">A NEW READING</p><h2>${escapeHtml(choice.resultTitle)}</h2><p>${escapeHtml(choice.resultSummary)}</p><button type="button" data-book-deeper="true" aria-expanded="${state.deeper}">${state.deeper ? 'Close the next question' : `Go deeper · ${DEMO_DEEPER_CONNECTION.targetTitle}`}</button>${state.deeper ? `<div class="nlxr-book-deeper"><h3>${escapeHtml(choice.deeperTitle)}</h3><p>${escapeHtml(choice.deeperSummary)}</p></div>` : ''}</section>` : ''}</div><aside class="nlxr-book-margin" aria-label="Connection notes"><p class="nlxr-book-margin-label">HOW TO READ A CONNECTION</p><h2>Keep both sources visible.</h2><p>A new idea does not erase the plant cell or the learning cell. You can return to either source and follow its children.</p>${choice ? `<button type="button" data-book-source="${escapeHtml(choice.sourceId)}">Read ${escapeHtml(choice.sourceTitle)} in PIMO →</button><button type="button" data-book-lim="${escapeHtml(choice.targetId)}">Read ${escapeHtml(choice.targetTitle)} in LIMO →</button>` : ''}</aside>`;
}

function inspector(state, documents) {
    if (state.chapter === 'opening') {
        const cell = LIM_INTRO_CELL_BY_ID[state.introId];
        if (cell) return `<p class="nlxr-book-kicker">INTRODUCTORY LEARNING CELL</p><h2>${escapeHtml(cell.title)}</h2>${proseParagraphs(limLearningContent(cell.id).body)}<div class="nlxr-book-inspector-rule"></div><p class="nlxr-book-inspector-note">Follow a child cell on the page, or choose another way to learn.</p>`;
        return `<p class="nlxr-book-kicker">READING PANEL</p><h2>Begin anywhere.</h2><p>Open a learning cell or a plant cell. Its explanation stays here while you explore the page.</p><div class="nlxr-book-inspector-rule"></div><p class="nlxr-book-inspector-note">This desktop book uses the same authored knowledge as the spatial experience, in a layout made for reading.</p>`;
    }
    if (state.chapter === 'connections') {
        const choice = DEMO_CONNECTION_CHOICES.find(item => item.id === state.connectionId);
        return `<p class="nlxr-book-kicker">CONNECTION NOTE</p><h2>${escapeHtml(choice?.resultTitle || 'Choose a pair')}</h2><p>${escapeHtml(choice?.resultSummary || 'Select one of the two examples to read how the source cells meet.')}</p>${choice ? `<div class="nlxr-book-inspector-rule"></div><dl><dt>Plant cell</dt><dd>${escapeHtml(choice.sourceTitle)}</dd><dt>Learning cell</dt><dd>${escapeHtml(choice.targetTitle)}</dd></dl>` : ''}`;
    }
    if (state.chapter === 'learning') {
        const cell = LIM_CELL_BY_ID[state.limId] || LIM_CELL_BY_ID['lim-food-forest'];
        const path = bookLearningPath(cell.id, state.limFaceId);
        const parent = path.at(-2);
        const children = bookLearningChildren(cell.id);
        return `<p class="nlxr-book-kicker">LIMO · LEARNING CELL</p><h2>${escapeHtml(cell.title)}</h2><p>${escapeHtml(cell.content || limLearningContent(cell.id).body || '')}</p><div class="nlxr-book-inspector-rule"></div>${parent ? `<button type="button" data-book-lim="${escapeHtml(parent.id)}">← ${escapeHtml(parent.title)}</button>` : ''}<p class="nlxr-book-inspector-note">${children.length ? `${children.length} child ${children.length === 1 ? 'cell' : 'cells'} open from this idea.` : 'This branch has no further child cells yet.'}</p>`;
    }
    const document = documents[state.plant];
    const node = document.nodes.find(item => item.id === state.pimId) || document.nodes[0];
    const parent = document.nodes.find(item => item.id === node.parentId);
    const children = bookChildren(document.nodes, node.id);
    return `<p class="nlxr-book-kicker">PIMO · PLANT CELL</p><p class="nlxr-book-inspector-plant">${escapeHtml(document.identity?.commonName || '')} · ${escapeHtml(document.identity?.scientificName || '')}</p><h2>${escapeHtml(node.title)}</h2>${node.preview ? `<p class="nlxr-book-inspector-preview">${escapeHtml(node.preview)}</p>` : ''}<p>${escapeHtml(node.body || 'This parent cell gathers the subjects shown in the margin.')}</p>${node.safetyNote ? `<div class="nlxr-book-safety"><strong>Take care</strong><p>${escapeHtml(node.safetyNote)}</p></div>` : ''}<div class="nlxr-book-inspector-rule"></div><dl><dt>Record</dt><dd>${escapeHtml(node.informationType?.replaceAll('_', ' ') || 'Plant knowledge')}</dd><dt>Evidence</dt><dd>${escapeHtml(node.evidenceStatus?.replaceAll('_', ' ') || 'Not specified')}</dd></dl>${parent ? `<button type="button" data-book-pim="${escapeHtml(parent.id)}">← ${escapeHtml(parent.title)}</button>` : ''}<p class="nlxr-book-inspector-note">${children.length ? `${children.length} child ${children.length === 1 ? 'cell' : 'cells'} in this branch.` : 'Select another subject in the page margin to keep exploring.'}</p>`;
}

export function renderDesktopLearningBook(app, { moringaDocument, onExit = () => globalThis.renderLaunchScreen?.() } = {}) {
    if (!moringaDocument?.nodes?.length) throw new Error('The Moringa PIM document is required for the desktop book.');
    activeBookCleanup();
    const controller = new AbortController();
    const documents = { pigeon: PIGEON_PEA_PIM, moringa: moringaDocument };
    const state = { chapter: 'opening', plant: 'pigeon', introId: '', limId: 'lim-food-forest', limFaceId: 'lim-food-forest', pimId: 'food-forest', connectionId: '', deeper: false };
    const render = ({ keepScroll = false, focus = '' } = {}) => {
        const previousPageScroll = keepScroll ? app.querySelector('.nlxr-book-page-scroll')?.scrollTop || 0 : 0;
        const previousMarginScroll = keepScroll ? app.querySelector('.nlxr-book-margin')?.scrollTop || 0 : 0;
        const page = state.chapter === 'opening' ? openingPage(state) : state.chapter === 'learning' ? learningPage(state) : state.chapter === 'plants' ? plantPage(state, documents) : connectionsPage(state);
        app.innerHTML = `<div class="nlxr-book"><nav class="nlxr-book-contents" aria-label="Book chapters"><div class="nlxr-book-brand"><span>NOURISHLAND<span>XR</span></span><small>THE FIELD BOOK</small></div><p class="nlxr-book-contents-label">CONTENTS</p>${chapterNav(state.chapter)}<button type="button" class="nlxr-book-close" data-book-exit>Close book <span aria-hidden="true">×</span></button></nav><main class="nlxr-book-spread" id="nlxr-book-main">${page}</main><aside class="nlxr-book-inspector" aria-label="Cell reading panel"><div class="nlxr-book-inspector-top"><span class="nlxr-book-inspector-symbol" aria-hidden="true">✳</span><span>READING PANEL</span></div><div class="nlxr-book-inspector-body" aria-live="polite">${inspector(state, documents)}</div><div class="nlxr-book-inspector-foot">NOURISHLANDXR · ${CHAPTERS.find(item => item.id === state.chapter)?.number || '01'} / 04</div></aside></div>`;
        app.querySelector('.nlxr-book-page-scroll').scrollTop = previousPageScroll;
        app.querySelector('.nlxr-book-margin').scrollTop = previousMarginScroll;
        if (focus) app.querySelector(focus)?.focus({ preventScroll: true });
    };
    const exit = () => { controller.abort(); activeBookCleanup = () => {}; onExit(); };
    app.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || !app.contains(button)) return;
        if (button.hasAttribute('data-book-exit')) { exit(); return; }
        const chapter = button.dataset.bookChapter;
        if (chapter && CHAPTERS.some(item => item.id === chapter)) {
            state.chapter = chapter;
            render({ focus: `[data-book-chapter="${chapter}"]` });
            return;
        }
        if (button.dataset.bookIntro && LIM_INTRO_CELL_BY_ID[button.dataset.bookIntro]) {
            state.introId = button.dataset.bookIntro;
            state.chapter = 'opening';
            render({ keepScroll: true, focus: `[data-book-intro="${state.introId}"]` });
            return;
        }
        if (button.dataset.bookPlant) {
            state.plant = button.dataset.bookPlant;
            state.pimId = 'food-forest';
            state.chapter = 'plants';
            render({ focus: `[data-book-plant="${state.plant}"]` });
            return;
        }
        if (button.dataset.bookLim && LIM_CELL_BY_ID[button.dataset.bookLim]) {
            state.limId = button.dataset.bookLim;
            if (LIM_FACES.some(face => face.id === state.limId) || state.chapter !== 'learning') state.limFaceId = LIM_CELL_BY_ID[state.limId].primaryFaceId || state.limId;
            state.chapter = 'learning';
            render({ keepScroll: true, focus: `[data-book-lim="${state.limId}"]` });
            return;
        }
        if (button.dataset.bookPim && documents[state.plant].nodes.some(node => node.id === button.dataset.bookPim)) {
            state.pimId = button.dataset.bookPim;
            state.chapter = 'plants';
            render({ keepScroll: true, focus: `[data-book-pim="${state.pimId}"]` });
            return;
        }
        if (button.dataset.bookSource) {
            state.plant = 'pigeon';
            state.pimId = button.dataset.bookSource;
            state.chapter = 'plants';
            render();
            return;
        }
        if (button.dataset.bookConnection && DEMO_CONNECTION_CHOICES.some(item => item.id === button.dataset.bookConnection)) {
            state.connectionId = button.dataset.bookConnection;
            state.deeper = false;
            render({ keepScroll: true, focus: `[data-book-connection="${state.connectionId}"]` });
            return;
        }
        if (button.hasAttribute('data-book-deeper')) {
            state.deeper = !state.deeper;
            render({ keepScroll: true, focus: '[data-book-deeper]' });
        }
    }, { signal: controller.signal });
    activeBookCleanup = () => controller.abort();
    render();
    return exit;
}
