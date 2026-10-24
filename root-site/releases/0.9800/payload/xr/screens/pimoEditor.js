import { ensureCreatorInterfaceStyles } from "../services/creatorInterface.js?v=0.9800";
import { creatorLogoMarkup } from "../services/creatorIdentity.js?v=0.9800";
import { workspaceToolNavigation } from "../services/creatorWorkspaceFrame.js?v=0.9800";
import { dashboardIcon } from "../services/workspaceIcons.js?v=0.9800";
import { BUILD_INFO } from "../services/buildInfo.js?v=0.9800";
import { addPimoCell, connectPimoCells, removePimoCell, pimoGraphFromDocument, validatePimoGraph, arrangePimoGraph, pimoSuggestions, PIMO_COLORS, pimoCoreCell,pimoVisibleCells } from "../services/pimoGraph.js?v=0.9800";
import { PIMO_TEMPLATES, createPimoTemplate } from "../services/pimoGraphTemplates.js?v=0.9800";
import { pimoCellPath, pimoConnectionPoints, pimoConnectionPath } from "../services/pimoGraphGeometry.js?v=0.9800";
import { PIMO_DESIGNS, applyPimoDesign, pimoCellAppearance } from "../services/pimoGraphDesigns.js?v=0.9800";
import { pimoIcon as icon, pimoIconButton as iconButton } from "../services/pimoEditorIcons.js?v=0.9800";
import { creatorAccessCapabilities } from "../services/creatorHub.js?v=0.9800";
import { workspaceUrl } from "../services/creatorWorkspaceMode.js?v=0.9800";

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const copy = value => structuredClone(value);
const STORAGE = 'nourishland.pimo-editor.v2';
const modeHints = { select: 'Drag cells to arrange · scroll to zoom · double-click to grow', add: 'Touch the canvas to plant a new idea', connect: 'Draw from one cell to another, or choose two cells', draw: 'Draw a closed shape anywhere to create your own cell' };

export function renderPimoEditor(host, options = {}) {
    const storageKey=options.onSave?STORAGE+'.'+encodeURIComponent(options.projectId||'')+'.'+encodeURIComponent(options.recordKey||''):STORAGE;
    const spatialAllowed = creatorAccessCapabilities().pimoSpatial && options.allowSpatial !== false;
    if (!document.querySelector('[data-pimo-editor-style]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('../pimo-editor.css?v='+BUILD_INFO.version, import.meta.url).href; link.dataset.pimoEditorStyle = ''; document.head.append(link);
    }
    ensureCreatorInterfaceStyles();
    if(!document.querySelector('[data-pimo-preview-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('../pimo-reader-preview.css?v='+BUILD_INFO.version,import.meta.url).href;link.dataset.pimoPreviewStyle='';document.head.append(link);}
    let library = {}, graph, storageAvailable = true;
    try { library = JSON.parse(localStorage.getItem(storageKey) || '{}'); graph = library.maps?.[library.active] && pimoGraphFromDocument(library.maps[library.active]); } catch { storageAvailable = false; }
    library.maps ||= {};
    if (options.document) graph = pimoGraphFromDocument(options.document);
    graph ||= createPimoTemplate('classic');
    let selected = graph.nodes[0]?.id || '', selectedEdge = '', mode = 'select', linkStart = '', undo = [], redo = [], gesture = null, search = '', soundOn = false, audio, spatial, speech, timer, resizeObserver, readerPreview;
    let projectDirty=false,projectSaving=false,editorRevision=0;
    let view = { x: -840, y: -490, width: 1680, height: 980 };
    const abort = new AbortController(), signal = abort.signal;
    host.innerHTML = `<main class="pimo-editor" data-pimo-editor>
        <header class="pimo-topbar"><div class="pimo-wordmark">${creatorLogoMarkup()}<div><strong>PIMO</strong><small>PLANT KNOWLEDGE</small></div></div><span class="pimo-topbar-separator"></span><select class="pimo-map-select" aria-label="Your saved knowledge maps" data-map-select></select><div class="pimo-save-state" data-save-state><span></span>Saved on this device</div><div class="pimo-top-actions"><button type="button" class="pimo-primary" data-action="preview" title="Preview your PIMO">${icon('preview')}<span>Preview</span></button>${options.onSave?'<button type="button" class="pimo-primary" data-action="save-project" disabled>Save to plant</button>':''}${iconButton('import', 'upload', 'Import PIMO JSON')}${iconButton('export', 'download', 'Export PIMO JSON')}${iconButton('sound', 'mute', 'Enable creation sounds', 'aria-pressed="false"')}${iconButton('voice', 'mic', 'Speak a new idea', 'aria-pressed="false"')}<button type="button" class="pimo-primary" data-action="spatial" title="Open XR editor">${icon('xr')}<span>XR editor</span></button></div></header>
        <div class="pimo-workspace"><aside class="pimo-library"><p class="pimo-eyebrow">A little inspiration</p><h2>Plant<br>knowledge.</h2><p>Start with the original six families.<br>Add information inside each cell.</p><div data-templates>${PIMO_TEMPLATES.map(item => `<button type="button" class="pimo-template" data-template="${item.id}" style="--color:${item.color}"><span class="template-icon">${icon(item.icon)}</span><span><strong>${item.title}</strong><small>${item.subtitle}</small></span></button>`).join('')}</div><div class="pimo-line"></div><div class="pimo-library-tip"><strong>Make room for your ideas.</strong>Every cell can grow a branch. Every connection can tell a different story.</div><p class="pimo-library-foot">PIMO EDITOR · V${escape(BUILD_INFO.version)}<br>${options.onSave?'Linked plant · explicit project saving':'Local canvas · export JSON to transfer'}</p></aside>
        <section class="pimo-stage" data-stage data-mode="select" aria-label="Knowledge map editor"><svg class="pimo-canvas" data-canvas role="group" aria-label="Interactive knowledge map. Select cells to edit. Use arrow keys to move a selected cell." tabindex="0"><defs><filter id="pimo-relief" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#44543c" flood-opacity=".16"/></filter><marker id="pimo-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 2 8 5 2 8" fill="none" stroke="#9aa98b" stroke-width="1.5"/></marker></defs><g data-edges></g><g data-cells></g><path data-live-stroke class="pimo-live-stroke"/></svg><div class="pimo-stage-head"><div><h1 data-map-title></h1><p data-map-count></p></div><label class="pimo-search">${icon('search')}<input data-search aria-label="Find a cell" placeholder="Find a cell…" type="search"></label></div><div class="pimo-status" data-status role="status" aria-live="polite"></div>
        <nav class="pimo-tools" aria-label="Map tools">${iconButton('library', 'library', 'Choose a starter template', 'class="pimo-icon pimo-mobilesheet"')}${iconButton('mode-select', 'select', 'Select and move cells (V)', 'aria-pressed="true"')}${iconButton('mode-add', 'plus', 'Add a cell (N)', 'aria-pressed="false"')}${iconButton('mode-connect', 'link', 'Draw a connection (L)', 'aria-pressed="false"')}${iconButton('mode-draw', 'draw', 'Draw a cell (D)', 'aria-pressed="false"')}<span class="pimo-tool-divider"></span>${iconButton('undo', 'undo', 'Undo (Ctrl+Z)')}${iconButton('redo', 'redo', 'Redo (Ctrl+Shift+Z)')}${iconButton('arrange', 'arrange', 'Arrange branches automatically')}${iconButton('fit', 'fit', 'Fit map to view')}${iconButton('inspector', 'panel', 'Open cell details', 'class="pimo-icon pimo-mobilesheet"')}</nav><p class="pimo-stage-hint" data-hint>${modeHints.select}</p><div class="pimo-zoom">${iconButton('zoom-out', 'minus', 'Zoom out')}<span data-zoom>100%</span>${iconButton('zoom-in', 'plus', 'Zoom in')}</div></section>
        <aside class="pimo-inspector" aria-label="Selected cell details" data-inspector></aside></div><input type="file" accept=".json,application/json" class="pimo-import" data-import aria-label="Import a knowledge map"></main>`;
    const root = host.querySelector('[data-pimo-editor]'), stage = root.querySelector('[data-stage]'), svg = root.querySelector('[data-canvas]'), inspector = root.querySelector('[data-inspector]');
    if (!spatialAllowed) root.querySelector('[data-action="spatial"]').remove();
    if(options.onSave){root.querySelector('[data-map-select]').disabled=true;root.querySelector('[data-action=import]').disabled=true;root.querySelector('[data-action=import]').hidden=true;root.querySelectorAll('[data-template]').forEach(button=>button.disabled=true);}
    if (options.projectId) {
        const contextBar = document.createElement('div'); contextBar.className = 'pimo-project-context';
        const back = document.createElement('a'); back.href = workspaceUrl(options.projectId, { mode:options.workspace || 'desktop', siteId:options.siteId || '', recordKey:options.recordKey || '', view:'content' }).href;
        back.innerHTML = dashboardIcon('back');
        back.setAttribute('aria-label', 'Back to PIMOs & content'); back.title = 'PIMOs & content';
        const note = document.createElement('span'); note.textContent = options.onSave?'Editing '+options.linkedPlantName+' · Preview before saving to the plant.':'Local canvas · export JSON to transfer · not attached to a plant record';
        const line = document.createElement('div'); line.className = 'pimo-context-line'; line.append(back, note);
        contextBar.append(line);
        contextBar.insertAdjacentHTML('beforeend', workspaceToolNavigation(options.projectId, options.workspace || 'desktop', {siteId:options.siteId || '',recordKey:options.recordKey || '',view:'content'}));
        root.querySelector('.pimo-topbar').after(contextBar);
    }
    const designBar = document.createElement('nav'); designBar.className = 'pimo-designs'; designBar.setAttribute('aria-label', 'Map design');
    designBar.innerHTML = `<span class="pimo-design-label">DESIGN</span>${PIMO_DESIGNS.map(design => `<button type="button" data-design="${design.id}" title="${design.detail}" aria-label="${design.title} design" aria-pressed="false">${icon(design.icon)}<span>${design.title}</span><span class="pimo-design-check" aria-hidden="true">✓</span></button>`).join('')}`;
    stage.append(designBar);
    const activePointers = new Map();
    const mapTitle = root.querySelector('[data-map-title]'); mapTitle.contentEditable = 'plaintext-only'; mapTitle.setAttribute('role', 'textbox'); mapTitle.setAttribute('aria-label', 'Knowledge map name'); mapTitle.tabIndex = 0;
    mapTitle.addEventListener('blur', () => { const title = mapTitle.textContent.trim().slice(0, 160); if (title && title !== graph.identity.title) { const next = copy(graph); next.identity.title = title; commit(next, { details: false }); } else mapTitle.textContent = graph.identity.title; }, { signal });
    mapTitle.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); mapTitle.blur(); } }, { signal });
    function message(value) { root.querySelector('[data-status]').textContent = value; clearTimeout(timer); if (value) timer = setTimeout(() => root.querySelector('[data-status]').textContent = '', 5000); }
    function save() {
        graph.updatedAt = new Date().toISOString(); library.maps[graph.id] = copy(graph); library.active = graph.id;
        try { localStorage.setItem(storageKey, JSON.stringify(library)); storageAvailable = true; } catch { storageAvailable = false; }
        root.querySelector('[data-save-state]').innerHTML = `<span></span>${options.onSave?(projectDirty?'Draft on this device':'Plant loaded'):storageAvailable?'Saved on this device':'Export to keep this map'}`;
        root.querySelector('[data-map-select]').innerHTML = Object.values(library.maps).map(item => `<option value="${escape(item.id)}" ${item.id === graph.id ? 'selected' : ''}>${escape(item.identity.title)}</option>`).join('');
    }
    function feedback(special = false) {
        if (!soundOn) return;
        try { const Context = window.AudioContext || window.webkitAudioContext; audio ||= new Context(); void audio.resume(); const oscillator = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime; oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(special ? 440 : 520, now); oscillator.frequency.exponentialRampToValueAtTime(special ? 880 : 650, now + .1); gain.gain.setValueAtTime(.045, now); gain.gain.exponentialRampToValueAtTime(.001, now + .22); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(now + .24); } catch { /* Editing is independent of audio support. */ }
    }
    function commit(next, { before, details = true, history = true } = {}) {
        const valid = validatePimoGraph(next); if (!valid.valid) { message(valid.errors[0]); return false; }
        if (history) { undo.push(copy(before || graph)); if (undo.length > 60) undo.shift(); redo = []; }
        graph = copy(next); editorRevision++;projectDirty=true;save(); renderMap(); if (details) renderInspector(); updateTools(); spatial?.refresh(); return true;
    }
    function setMode(value) { mode = value; linkStart = ''; stage.dataset.mode = mode; root.querySelector('[data-hint]').textContent = modeHints[mode]; updateTools(); }
    function updateTools() { const saveButton=root.querySelector('[data-action=save-project]');if(saveButton)saveButton.disabled=projectSaving||!projectDirty; root.querySelectorAll('[data-action^="mode-"]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.action === `mode-${mode}`))); root.querySelector('[data-action=undo]').disabled = !undo.length; root.querySelector('[data-action=redo]').disabled = !redo.length; }
    function setView() { svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`); root.querySelector('[data-zoom]').textContent = `${Math.round(1500 / view.width * 100)}%`; }
    function fit(all = false) {
        const visible=pimoVisibleCells(graph,selected,search),positions = Object.entries(graph.layout.nodes).filter(([id])=>visible.has(id)).map(([,position])=>position); if (!positions.length) { view = { x: -500, y: -300, width: 1000, height: 600 }; setView(); return; }
        const minX = Math.min(...positions.map(p => p.x - p.width / 2)), maxX = Math.max(...positions.map(p => p.x + p.width / 2)), minY = Math.min(...positions.map(p => p.y - p.height / 2)), maxY = Math.max(...positions.map(p => p.y + p.height / 2));
        const ratio = stage.clientWidth / Math.max(1, stage.clientHeight); let width = Math.max(maxX - minX + 210, (maxY - minY + 260) * ratio);
        if (!all && stage.clientWidth < 600) width = Math.min(width, 820);
        const height = width / ratio, centre = !all && stage.clientWidth < 600 && selected ? graph.layout.nodes[selected] : { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        view = { x: centre.x - width / 2, y: centre.y - height / 2 - 20, width, height }; renderMap();
    }
    function graphPoint(event) { const p = new DOMPoint(event.clientX, event.clientY); return p.matrixTransform(svg.getScreenCTM().inverse()); }
    function cellAt(p) { const visible=pimoVisibleCells(graph,selected,search);return [...graph.nodes].reverse().find(node => { if(!visible.has(node.id))return false;const l = graph.layout.nodes[node.id]; return Math.abs(p.x - l.x) < l.width * .56 && Math.abs(p.y - l.y) < l.height * .56; }); }
    function lines(title, limit = 19) { const words = title.split(/\s+/), result = ['']; for (const word of words) { const i = result.length - 1; if ((result[i] + ' ' + word).length > limit && result[i]) result.push(word); else result[i] += (result[i] ? ' ' : '') + word; } return result.slice(0, 3).map((line, i) => line.length > limit + 2 ? line.slice(0, limit + 1) + '…' : i === 2 && result.length > 3 ? line.slice(0, limit - 1) + '…' : line); }
    function renderMap() {
        const visible=pimoVisibleCells(graph,selected,search);stage.dataset.design = graph.layout.design || 'organic';
        designBar.querySelectorAll('[data-design]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.design === (graph.layout.design || 'organic'))));
        if (document.activeElement !== mapTitle) mapTitle.textContent = graph.identity.title;
        root.querySelector('[data-map-count]').textContent = `${visible.size} of ${graph.nodes.length} cells · ${graph.metadata?.originalHoneycomb?'select a family to explore':'yours to shape'}`;
        root.querySelector('[data-edges]').innerHTML = graph.edges.filter(edge=>visible.has(edge.from)&&visible.has(edge.to)).map(edge => {
            const points = pimoConnectionPoints(graph, edge), d = pimoConnectionPath(points, graph.layout.design || 'organic'), a = points[0], b = points.at(-1), mid = points.length > 2 ? points[Math.floor(points.length / 2)] : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            return `<g data-edge="${escape(edge.id)}"><path class="pimo-edge-hit" d="${d}"/><path class="pimo-edge ${edge.kind === 'relationship' ? 'is-related' : ''} ${edge.id === selectedEdge ? 'is-selected' : ''}" d="${d}" ${edge.kind === 'branch' ? 'marker-end="url(#pimo-arrow)"' : ''}/>${edge.label ? `<text class="pimo-edge-label" x="${mid.x}" y="${mid.y - 12}">${escape(edge.label.slice(0, 55))}</text>` : ''}</g>`;
        }).join('');
        root.querySelector('[data-cells]').innerHTML = graph.nodes.filter(node=>visible.has(node.id)).map(node => {
            const l = graph.layout.nodes[node.id], textScale = Math.min(27, Math.max(16, 12 * view.width / Math.max(1, stage.clientWidth))), label = lines(node.title, Math.max(8, Math.min(19, Math.floor(l.width * .83 / (textScale * .55))))), active = selected === node.id, d = pimoCellPath(l), isRoot = !graph.edges.some(edge => edge.kind === 'branch' && edge.to === node.id), match = !search || `${node.title} ${node.body}`.toLowerCase().includes(search);
            return `<g class="pimo-cell ${active ? 'is-selected' : ''} ${match ? '' : 'is-dim'}" data-cell="${escape(node.id)}" transform="translate(${l.x} ${l.y})" tabindex="0" role="button" aria-label="${escape(node.title)}" aria-pressed="${active}"><title>${escape(node.title)}</title>${active ? `<path class="cell-outline" d="${d}" transform="scale(1.09)"/>` : ''}<path class="cell-surface" fill="${escape(l.color)}" d="${d}"/><path d="${d}" fill="none" stroke="#fffdf41c" stroke-width="2" transform="translate(-1 -2) scale(.94)"/><text class="cell-kind" y="${-label.length * 9 - 14}">${isRoot ? 'SEED' : node.informationType === 'topic' ? 'TOPIC' : escape(node.informationType.replaceAll('_', ' '))}</text><text class="cell-title">${label.map((line, i) => `<tspan x="0" y="${(i - (label.length - 1) / 2) * 19 + 7}">${escape(line)}</tspan>`).join('')}</text>${node.body ? '<circle class="cell-body-mark" cx="0" cy="41" r="2"/>' : ''}${active ? `<g data-grow="${escape(node.id)}" aria-label="Grow a branch"><circle class="cell-grow" cx="${l.width / 2 + 3}" cy="0" r="15"/><path class="cell-grow-mark" d="M${l.width / 2 - 2} 0h10m-5-5v10"/></g>` : ''}</g>`;
        }).join('');
        root.querySelectorAll('.pimo-cell').forEach(cell => { const appearance = pimoCellAppearance(graph, graph.layout.nodes[cell.dataset.cell]); cell.querySelector('.cell-surface').style.fill = appearance.fill; cell.querySelector('.cell-surface').style.stroke = appearance.stroke; for (const text of cell.querySelectorAll('.cell-title,.cell-kind')) text.style.fill = appearance.text; const dot = cell.querySelector('.cell-body-mark'); if (dot) dot.style.fill = appearance.text; });
        const fontSize = Math.min(27, Math.max(16, 12 * view.width / Math.max(1, stage.clientWidth)));
        root.querySelectorAll('.cell-title').forEach(text => { text.style.fontSize = `${fontSize}px`; const spans = [...text.querySelectorAll('tspan')]; spans.forEach((span, i) => span.setAttribute('y', (i - (spans.length - 1) / 2) * (fontSize + 3) + 6)); const caption = text.parentElement.querySelector('.cell-kind'); caption.setAttribute('y', -(spans.length * (fontSize + 3)) / 2 - 10); if (fontSize > 23) caption.style.display = 'none'; if (spans.length === 3) text.parentElement.querySelector('.cell-body-mark')?.remove(); });
        setView();
    }
    function renderInspector() {
        const edge = graph.edges.find(edge => edge.id === selectedEdge), node = graph.nodes.find(node => node.id === selected);
        if (edge) { inspector.innerHTML = `<div class="pimo-detail-head"><p class="pimo-eyebrow">A living connection</p>${iconButton('close-detail', 'close', 'Close connection details')}</div><h2>Connect the meaning.</h2><label for="pimo-edge-label">Connection label</label><input id="pimo-edge-label" data-edge-field="label" value="${escape(edge.label)}" placeholder="For example: provides habitat" maxlength="160"><label for="pimo-edge-kind">Connection type</label><select id="pimo-edge-kind" data-edge-field="kind"><option value="branch" ${edge.kind === 'branch' ? 'selected' : ''}>Branch — part of this topic</option><option value="relationship" ${edge.kind === 'relationship' ? 'selected' : ''}>Relationship — a connection between ideas</option></select><p style="margin-top:20px">A branch organizes your knowledge. A relationship joins ideas across the map.</p>${edge.waypoints?.length ? '<button class="pimo-branch-action" data-action="straighten">Reset drawn route</button>' : ''}<div class="pimo-actions">${iconButton('delete-edge', 'delete', 'Remove connection')}</div>`; return; }
        if (!node) { inspector.innerHTML = `<p class="pimo-eyebrow">An open canvas</p><div class="pimo-empty-icon">${icon('sprout')}</div><h2>Let an idea<br>take root.</h2><p>Select a cell to shape its knowledge. Or plant something new, wherever it feels right.</p><div class="pimo-node-stats"><div><strong>${graph.nodes.length}</strong>living cells</div><div><strong>${graph.edges.length}</strong>connections</div></div><button class="pimo-branch-action" data-action="add-center">${icon('plus')}Plant an idea</button><p>Try drawing a cell with the pencil tool. Draw a connector to give it a relationship.</p>`; return; }
        const l = graph.layout.nodes[node.id];
        inspector.innerHTML = `<div class="pimo-detail-head"><p class="pimo-eyebrow">Make it yours</p>${iconButton('close-detail', 'close', 'Close cell details')}</div><label class="pimo-eyebrow" for="pimo-title">Cell title</label><input id="pimo-title" data-field="title" value="${escape(node.title)}" maxlength="160"><label for="pimo-body">What belongs here?</label><textarea id="pimo-body" data-field="body" rows="5" maxlength="20000" placeholder="An idea, a story, something you noticed…">${escape(node.body)}</textarea><label>Its own character</label><div class="pimo-swatch-row">${PIMO_COLORS.map(color => `<button type="button" class="pimo-swatch" style="--swatch:${color}" data-color="${color}" title="${({ '#6f825a': 'Moss', '#bc7959': 'Clay', '#648f9b': 'Water', '#b19a64': 'Ochre', '#7b769b': 'Mineral', '#507869': 'Forest' })[color]}" aria-label="${({ '#6f825a': 'Moss', '#bc7959': 'Clay', '#648f9b': 'Water', '#b19a64': 'Ochre', '#7b769b': 'Mineral', '#507869': 'Forest' })[color]}" aria-pressed="${l.color === color}"></button>`).join('')}</div><div class="pimo-shape-row" aria-label="Cell shape">${['organic', 'hexagon', 'round', ...(l.outline ? ['drawn'] : [])].map(shape => `<button type="button" class="pimo-icon" data-shape="${shape}" aria-label="${shape} cell" title="${shape} cell" aria-pressed="${l.shape === shape}">${icon(shape === 'round' ? 'circle' : shape)}</button>`).join('')}</div><button type="button" class="pimo-branch-action" data-action="grow">${icon('plus')}Grow a branch</button><section class="pimo-suggestions"><p class="pimo-eyebrow">A nudge of inspiration</p>${pimoSuggestions(graph, node.id).map(title => `<button class="pimo-suggestion" type="button" data-suggest="${escape(title)}"><span>${escape(title)}</span>${icon('plus')}</button>`).join('') || '<p>There is always room for your own idea.</p>'}</section><details><summary>Content type & sources</summary><label for="pimo-type">Content type</label><select id="pimo-type" data-field="informationType">${[...new Set(['topic', 'fact', 'local_observation', 'practice', 'story', 'question', 'guidance', 'traditional_knowledge', node.informationType])].filter(Boolean).map(type => `<option value="${escape(type)}" ${node.informationType === type ? 'selected' : ''}>${escape(type.replaceAll('_', ' '))}</option>`).join('')}</select><label for="pimo-source">Source link</label><input id="pimo-source" data-field="sourceUrl" type="url" placeholder="https://…" value="${escape(node.sourceUrl || '')}"><label for="pimo-attribution">Attribution</label><input id="pimo-attribution" data-field="attribution" value="${escape(node.attribution || '')}" maxlength="500"><small>Existing source references and provenance stay with imported cells. New content is a draft.</small></details><div class="pimo-actions">${iconButton('duplicate', 'copy', 'Duplicate cell')}${iconButton('connect-selected', 'link', 'Connect this cell')}${iconButton('delete-cell', 'delete', 'Remove this cell (connected cells are kept)')}</div>`;
        inspector.querySelector('.pimo-shape-row')?.insertAdjacentHTML('beforeend', `<button type="button" class="pimo-icon" data-shape="square" aria-label="square cell" title="Square cell" aria-pressed="${l.shape === 'square'}">${icon('square')}</button>`);
    }
    function select(id = '', edge = '') { selected = id; selectedEdge = edge; renderMap(); renderInspector(); spatial?.refresh();if(!gesture&&graph.metadata?.originalHoneycomb)fit(true); }
    function openDetails() { if (matchMedia('(max-width:800px)').matches) root.dataset.sheet = 'inspector'; }
    function vacant(parent) { const p = parent ? graph.layout.nodes[parent] : { x: view.x + view.width / 2, y: view.y + view.height / 2 }; const count = graph.edges.filter(edge => edge.from === parent).length; for (let i = 0; i < 24; i++) { const angle = (count + i) * 1.15 - .5, distance = 245 + Math.floor(i / 8) * 160, position = { x: p.x + Math.cos(angle) * distance, y: p.y + Math.sin(angle) * distance }; if (!Object.values(graph.layout.nodes).some(node => Math.abs(node.x - position.x) < 200 && Math.abs(node.y - position.y) < 150)) return position; } return { x: p.x + 280, y: p.y + 180 }; }
    function grow(title = 'New idea', position, parent = selected, extras = {}) { const result = addPimoCell(graph, { title, ...(position || vacant(parent)), parentId: parent || '', color: graph.layout.nodes[parent]?.color, ...extras }); selected = result.id; selectedEdge = ''; if (commit(result.graph)) { feedback(true); setMode('select'); if (title === 'New idea' && !spatial) { openDetails(); requestAnimationFrame(() => { const input = inspector.querySelector('[data-field=title]'); input?.focus({ preventScroll: true }); input?.select(); }); } } return result.id; }
    function drawCell(points) {
        const xs = points.map(p => p.x), ys = points.map(p => p.y), minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
        if (w < 45 || h < 40) { message('Draw a little larger to give your idea some room.'); return; }
        const result = addPimoCell(graph, { title: 'New idea', x: minX + w / 2, y: minY + h / 2, shape: 'drawn', outline: points.slice(0, 256).map(p => ({ x: (p.x - minX - w / 2) / (w / 2), y: (p.y - minY - h / 2) / (h / 2) })) });
        result.graph.layout.nodes[result.id].width = Math.max(130, Math.min(420, w)); result.graph.layout.nodes[result.id].height = Math.max(110, Math.min(320, h)); selected = result.id; selectedEdge = ''; commit(result.graph); feedback(true); setMode('select'); if (!spatial) { openDetails(); requestAnimationFrame(() => inspector.querySelector('[data-field=title]')?.select()); } return result.id;
    }
    function connect(from, to, waypoints = []) { try { const result = connectPimoCells(graph, from, to, { waypoints }); selected = ''; selectedEdge = result.id; commit(result.graph); feedback(true); message('Connected. Give the relationship a name.'); return result.id; } catch (error) { message(error.message); } finally { linkStart = ''; } }
    function history(direction) { const source = direction === 'undo' ? undo : redo, target = direction === 'undo' ? redo : undo; if (!source.length) return; target.push(copy(graph)); graph = source.pop();editorRevision++;projectDirty=true; if (!graph.nodes.some(node => node.id === selected)) selected = ''; if (!graph.edges.some(edge => edge.id === selectedEdge)) selectedEdge = ''; save(); renderMap(); renderInspector(); updateTools(); spatial?.refresh(); }
    function zoom(factor, origin = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) { const width = Math.max(300, Math.min(12000, view.width * factor)), scale = width / view.width; view = { x: origin.x - (origin.x - view.x) * scale, y: origin.y - (origin.y - view.y) * scale, width, height: view.height * scale }; renderMap(); }
    async function startVoice() {
        if (speech) { speech.stop(); return; }
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) { message('Voice is unavailable in this browser. Type your idea in a new cell.'); return; }
        speech = new Recognition(); speech.lang = 'en-AU'; speech.interimResults = false; speech.maxAlternatives = 1;
        const button = root.querySelector('[data-action=voice]'); button.setAttribute('aria-pressed', 'true'); message('Say an idea for your next cell.');
        speech.onresult = event => { const title = event.results[0][0].transcript.replace(/[.!?]+$/, '').slice(0, 160); grow(title); message(`“${title}” is growing.`); };
        speech.onerror = () => message('Voice did not connect. You can still type your idea.'); speech.onend = () => { speech = null; button.setAttribute('aria-pressed', 'false'); };
        try { speech.start(); } catch { speech = null; button.setAttribute('aria-pressed', 'false'); message('Voice is unavailable right now.'); }
    }
    root.addEventListener('click', async event => {
        const button = event.target.closest('button'); if (!button) return;
        if (button.dataset.design) { if ((graph.layout.design || 'organic') === button.dataset.design) return; library.designPreference = button.dataset.design; if (commit(applyPimoDesign(graph, button.dataset.design))) { fit(); feedback(); message(`${PIMO_DESIGNS.find(item => item.id === button.dataset.design).title} applied. Your knowledge stays connected.`); } return; }
        if (button.dataset.template) { const next = createPimoTemplate(button.dataset.template, library.designPreference ? { design: library.designPreference } : {}); graph = next; selected = next.nodes[0].id; selectedEdge = ''; undo = []; redo = []; save(); renderMap(); renderInspector(); updateTools(); fit(); root.dataset.sheet = ''; feedback(true); message(`${PIMO_TEMPLATES.find(item => item.id === button.dataset.template).title} planted. Your other maps are saved.`); return; }
        if (button.dataset.suggest) { grow(button.dataset.suggest); return; }
        if (button.dataset.color || button.dataset.shape) { const next = copy(graph); if (selected) { Object.assign(next.layout.nodes[selected], button.dataset.color ? { color: button.dataset.color } : { shape: button.dataset.shape }); commit(next); feedback(); } return; }
        const action = button.dataset.action;
        if (action?.startsWith('mode-')) { setMode(action.slice(5)); root.dataset.sheet = ''; return; }
        if (action === 'library' || action === 'inspector') { root.dataset.sheet = root.dataset.sheet === action ? '' : action; return; }
        if (action === 'close-detail') { select(); root.dataset.sheet = ''; }
        if (action === 'grow') grow();
        if (action === 'add-center') grow('New idea', { x: view.x + view.width / 2, y: view.y + view.height / 2 }, '');
        if (action === 'undo' || action === 'redo') history(action);
        if (action === 'fit') fit(true);
        if (action === 'zoom-in' || action === 'zoom-out') zoom(action === 'zoom-in' ? .82 : 1.22);
        if (action === 'arrange') { if (commit(arrangePimoGraph(graph))) { fit(); message('Branches arranged. Undo brings back your drawing.'); } }
        if (action === 'connect-selected') { setMode('connect'); linkStart = selected; message('Choose another cell, or draw to it.'); root.dataset.sheet = ''; }
        if (action === 'delete-cell' && selected) { if(pimoCoreCell(graph,selected)){message('Keep the six original families. Edit or add content inside them.');return;} const id = selected; selected = ''; commit(removePimoCell(graph, id)); message('Cell removed. Its connected cells are kept. Undo to restore.'); }
        if (action === 'delete-edge' && selectedEdge) { const next = copy(graph); next.edges = next.edges.filter(edge => edge.id !== selectedEdge); selectedEdge = ''; commit(next); }
        if (action === 'straighten') { const next = copy(graph); next.edges.find(edge => edge.id === selectedEdge).waypoints = []; commit(next); }
        if (action === 'duplicate' && selected) { const node = graph.nodes.find(node => node.id === selected), l = graph.layout.nodes[selected], { id, ...content } = copy(node); grow(`${node.title} copy`, { x: l.x + 210, y: l.y + 100 }, '', { ...content, title: `${node.title} copy`, color: l.color }); }
        if (action === 'voice') void startVoice();
        if (action === 'sound') { soundOn = !soundOn; button.innerHTML = icon(soundOn ? 'volume' : 'mute'); button.setAttribute('aria-pressed', String(soundOn)); button.setAttribute('aria-label', soundOn ? 'Disable creation sounds' : 'Enable creation sounds'); feedback(true); }
        if (action === 'import') root.querySelector('[data-import]').click();
        if (action === 'export') { const url = URL.createObjectURL(new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = `${graph.identity.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pimo.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('Map exported. Import this file on another device to continue.'); }
        if(action==='save-project'&&options.onSave&&!projectSaving){const revision=editorRevision;projectSaving=true;updateTools();try{await options.onSave(copy(graph));projectDirty=editorRevision!==revision;if(!signal.aborted){if(!projectDirty)root.querySelector('[data-save-state]').innerHTML='<span></span>Saved to plant';message('Saved to the plant. Changed topics remain drafts until published.');}}catch(error){if(!signal.aborted)message('Could not save: '+error.message);}finally{projectSaving=false;if(!signal.aborted)updateTools();}return;}
        if(action==='preview'){try{const {openPimoReaderPreview}=await import("../services/pimoReaderPreview.js?v=0.9800");if(!signal.aborted){readerPreview?.destroy();readerPreview=openPimoReaderPreview(copy(graph),{onClose:()=>readerPreview=null});}}catch(error){message('Preview could not open: '+error.message);}}
        if (action === 'spatial') void openSpatial();
    }, { signal });
    root.addEventListener('change', async event => {
        const element = event.target;
        if (element.hasAttribute('data-map-select')) { try { graph = pimoGraphFromDocument(library.maps[element.value]); selected = graph.nodes[0]?.id || ''; selectedEdge = ''; undo = []; redo = []; save(); renderMap(); renderInspector(); updateTools(); fit(); } catch (error) { message(error.message); } }
        if (element.hasAttribute('data-import')) { try { const file = element.files[0]; if (!file) return; if (file.size > 8 * 1024 * 1024) throw Error('Choose a PIMO file under 8 MB.'); const next = pimoGraphFromDocument(JSON.parse(await file.text())); graph = next; selected = next.nodes[0]?.id || ''; selectedEdge = ''; undo = []; redo = []; save(); renderMap(); renderInspector(); updateTools(); fit(); message('Map imported. Existing source references have been kept.'); } catch (error) { message(error.message); } element.value = ''; }
        if (element.dataset.field && selected) { const next = copy(graph), node = next.nodes.find(node => node.id === selected), value = element.value.trim(); if (element.dataset.field === 'title' && !value) { element.value = node.title; message('Give this cell a title.'); return; } node[element.dataset.field] = value; commit(next, { details: false }); }
        if (element.dataset.edgeField && selectedEdge) { const next = copy(graph); next.edges.find(edge => edge.id === selectedEdge)[element.dataset.edgeField] = element.value; if (!commit(next, { details: false })) renderInspector(); }
    }, { signal });
    root.querySelector('[data-search]').addEventListener('input', event => { search = event.target.value.trim().toLowerCase(); renderMap(); }, { signal });
    svg.addEventListener('pointerdown', event => {
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activePointers.size === 2) { const [a, b] = [...activePointers.values()]; if (gesture?.type === 'move') graph = gesture.before; gesture = { type: 'pinch', distance: Math.hypot(a.x - b.x, a.y - b.y), before: { ...view }, centre: graphPoint({ clientX: (a.x + b.x) / 2, clientY: (a.y + b.y) / 2 }) }; svg.setPointerCapture(event.pointerId); return; }
        if (event.button > 1) return; const p = graphPoint(event), node = event.target.closest('[data-cell]'), edge = event.target.closest('[data-edge]'), growHandle = event.target.closest('[data-grow]');
        if (growHandle) { event.preventDefault(); selected = growHandle.dataset.grow; grow(); return; }
        svg.focus({ preventScroll: true }); root.dataset.sheet = ''; svg.setPointerCapture(event.pointerId); event.preventDefault();
        if (mode === 'draw') gesture = { type: 'draw', points: [p] };
        else if (mode === 'connect' && node) { const id = node.dataset.cell; gesture = { type: 'connect', from: linkStart || id, to: id, points: [p], pointer: p }; }
        else if (mode === 'add') gesture = { type: 'add', point: p };
        else if (node && event.button === 0) { selected = node.dataset.cell; selectedEdge = ''; const l = graph.layout.nodes[selected]; gesture = { type: 'move', id: selected, offset: { x: p.x - l.x, y: p.y - l.y }, before: copy(graph), start: p, moved: false }; renderMap(); renderInspector(); }
        else if (edge) { select('', edge.dataset.edge); gesture = null; openDetails(); }
        else { gesture = { type: 'pan', start: { x: event.clientX, y: event.clientY }, before: { ...view } }; if (mode === 'select') select(); }
    }, { signal });
    svg.addEventListener('pointermove', event => {
        if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (gesture?.type === 'pinch' && activePointers.size >= 2) { const [a, b] = [...activePointers.values()], factor = gesture.distance / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), width = Math.max(300, Math.min(12000, gesture.before.width * factor)), scale = width / gesture.before.width, centre = gesture.centre; view = { x: centre.x - (centre.x - gesture.before.x) * scale, y: centre.y - (centre.y - gesture.before.y) * scale, width, height: gesture.before.height * scale }; renderMap(); return; }
        if (!gesture) return; const p = graphPoint(event);
        if (gesture.type === 'move') { gesture.moved ||= Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) > 5; Object.assign(graph.layout.nodes[gesture.id], { x: p.x - gesture.offset.x, y: p.y - gesture.offset.y }); renderMap(); }
        if (gesture.type === 'pan') { const box = svg.getBoundingClientRect(); view.x = gesture.before.x - (event.clientX - gesture.start.x) / box.width * view.width; view.y = gesture.before.y - (event.clientY - gesture.start.y) / box.height * view.height; setView(); }
        if (gesture.type === 'draw' || gesture.type === 'connect') { if (Math.hypot(p.x - gesture.points.at(-1).x, p.y - gesture.points.at(-1).y) > 8 && gesture.points.length < 220) gesture.points.push(p); const points = gesture.type === 'connect' ? [{ x: graph.layout.nodes[gesture.from].x, y: graph.layout.nodes[gesture.from].y }, ...gesture.points.slice(1), p] : gesture.points; root.querySelector('[data-live-stroke]').setAttribute('d', pimoConnectionPath(points)); }
    }, { signal });
    svg.addEventListener('pointerup', event => {
        activePointers.delete(event.pointerId);
        if (gesture?.type === 'pinch') { if (activePointers.size < 2) gesture = null; return; }
        if (!gesture) return; const active = gesture; gesture = null; const p = graphPoint(event); root.querySelector('[data-live-stroke]').setAttribute('d', '');
        if (active.type === 'move') { if (active.moved) commit(graph, { before: active.before, details: false }); else {openDetails();if(graph.metadata?.originalHoneycomb)fit(true);} }
        if (active.type === 'add') grow('New idea', p, '');
        if (active.type === 'draw') drawCell(active.points);
        if (active.type === 'connect') { const target = cellAt(p); if (target && target.id !== active.from) connect(active.from, target.id, active.points.length > 4 ? active.points.slice(1, -1).map(p => ({ x: p.x, y: p.y })) : []); else { linkStart = active.from; select(active.from); message('Now choose another cell to connect.'); } }
    }, { signal });
    svg.addEventListener('pointercancel', event => { activePointers.delete(event.pointerId); if (gesture?.before?.nodes) { graph = gesture.before; renderMap(); } gesture = null; root.querySelector('[data-live-stroke]').setAttribute('d', ''); }, { signal });
    svg.addEventListener('dblclick', event => { if (mode === 'select' && !event.target.closest('[data-cell]')) grow('New idea', graphPoint(event), ''); }, { signal });
    svg.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(Math.max(-.25, Math.min(.25, event.deltaY * .001))), graphPoint(event)); }, { signal, passive: false });
    root.addEventListener('keydown', event => {
        if (event.target.closest('input,textarea,select,[contenteditable]')) return;
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); history(event.shiftKey ? 'redo' : 'undo'); return; }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.toLowerCase(); if (['v', 'n', 'l', 'd'].includes(key)) setMode({ v: 'select', n: 'add', l: 'connect', d: 'draw' }[key]);
        if (event.key === 'Escape') { root.dataset.sheet = ''; setMode('select'); select(); }
        if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); root.querySelector(`[data-action=${selectedEdge ? 'delete-edge' : 'delete-cell'}]`)?.click(); }
        const cell = event.target.closest('[data-cell]'); if (cell && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select(cell.dataset.cell); openDetails(); inspector.querySelector('input')?.focus(); }
        if (selected && event.key.startsWith('Arrow')) { event.preventDefault(); const next = copy(graph), d = event.shiftKey ? 40 : 10, l = next.layout.nodes[selected]; l.x += event.key === 'ArrowRight' ? d : event.key === 'ArrowLeft' ? -d : 0; l.y += event.key === 'ArrowDown' ? d : event.key === 'ArrowUp' ? -d : 0; commit(next, { details: false }); }
    }, { signal });
    let openingSpatial = false;
    async function openSpatial() {
        if (!spatialAllowed) { message('Use the visual editor on this phone. Spatial PIMO authoring is available on a headset.'); return; }
        if (spatial || openingSpatial || signal.aborted) return spatial;
        openingSpatial = true;
        try {
            const { openPimoSpatialCanvas } = await import("../services/pimoEditorXR.js?v=0.9800");
            if (signal.aborted) return;
            spatial = await openPimoSpatialCanvas({
                getGraph: () => graph, getSelected: () => selected, getSelectedEdge: () => selectedEdge,
                getHistory: () => ({ undo: !!undo.length, redo: !!redo.length }),
                getMaps: () => Object.values(library.maps).map(item => ({ id: item.id, title: item.identity.title, cells: item.nodes.length })),
                onSelect: (id, edge = '') => select(id, edge),
                onCommit: (next, selection) => { const old = { selected, selectedEdge }; if (selection) { selected = selection.cell || ''; selectedEdge = selection.edge || ''; } const ok = commit(next); if (!ok) { selected = old.selected; selectedEdge = old.selectedEdge; } return ok; },
                onReplace: next => { graph = pimoGraphFromDocument(next); selected = graph.nodes[0]?.id || ''; selectedEdge = ''; undo = []; redo = []; save(); renderMap(); renderInspector(); updateTools(); fit(); spatial?.refresh(true); },
                onDraw: drawCell,
                onMove: (id, position) => { const next = copy(graph); if (!next.layout.nodes[id]) return false; Object.assign(next.layout.nodes[id], position); return commit(next); },
                onHistory: history,
                onSave: () => { save(); return storageAvailable; },
                isSaved: () => storageAvailable,
                onLoadMap: id => { const next = library.maps[id]; if (!next) return false; graph = pimoGraphFromDocument(next); selected = graph.nodes[0]?.id || ''; selectedEdge = ''; undo = []; redo = []; save(); renderMap(); renderInspector(); updateTools(); fit(); spatial?.refresh(true); return true; },
                onClose: () => { spatial = null; }
            });
            if (signal.aborted) await spatial.destroy();
            return spatial;
        } catch (error) { message(`XR editor could not open: ${error.message}`); }
        finally { openingSpatial = false; }
    }
    resizeObserver = new ResizeObserver(() => fit()); resizeObserver.observe(stage);
    save(); renderMap(); renderInspector(); updateTools(); requestAnimationFrame(() => fit());
    if (stage.clientWidth < 600) root.querySelector('[data-hint]').textContent = 'Drag to explore · pinch to zoom · tap a cell to edit';
    if (options.xr && spatialAllowed) queueMicrotask(() => void openSpatial());
    return { getDocument: () => copy(graph), openXR: openSpatial, getXRWorkspace: () => spatial, destroy() { readerPreview?.destroy(); abort.abort(); clearTimeout(timer); resizeObserver.disconnect(); speech?.abort(); spatial?.destroy(); void audio?.close(); host.innerHTML = ''; } };
}
