import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';

export const INFO_HELP = 'Hold any honeycomb cell until it fills to read its information here. Parent cells also open their branches. Hide this companion while walking; select Side panel to bring it back. Edit information opens the same knowledge used in the desktop editor.';

// This is a reading projection, never a second store of plant knowledge.
export function pimInfoContent(document, path) {
    const node = document?.nodes?.find(item => item.id === path || item.path === path);
    if (!node) return null;
    return { id: node.id, path: node.path, title: node.title,
        plant: document.identity?.commonName || document.identity?.scientificName || document.plantId,
        breadcrumb: [...pimAncestors(document, node.id).map(item => item.title), node.title].join(' › '),
        body: node.body || 'No detailed information has been added to this cell yet.',
        scope: pimKnowledgeScope(node), status: node.status, evidence: node.evidenceStatus,
        safety: node.safetyNote || '',
        sources: (node.sourceIds || []).map(id => document.sources?.find(source => source.id === id))
            .filter(Boolean).map(source => source.title || source.name || source.url || source.id) };
}

export function infoPages(text, columns = 48, rows = 10) {
    const lines = [];
    for (const paragraph of String(text || '').split('\n')) {
        let line = '';
        for (let word of paragraph.split(/\s+/).filter(Boolean)) {
            if (line && line.length + word.length + 1 > columns) { lines.push(line); line = ''; }
            while (word.length > columns) { lines.push(word.slice(0, columns)); word = word.slice(columns); }
            line += (line ? ' ' : '') + word;
        }
        lines.push(line);
    }
    const pages = [];
    for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
    return pages.length ? pages : [['']];
}

// A body-relative approximation: keep the initial heading while translating
// with the viewer. Following head yaw would move it away when looking left.
export function facePanelTowardEyes(center, eyes) {
    const dx=eyes.x-center.x,dy=eyes.y-center.y,dz=eyes.z-center.z;
    const length=Math.hypot(dx,dy,dz)||1;
    const normal={x:dx/length,y:dy/length,z:dz/length};
    const horizontal=Math.hypot(normal.x,normal.z);
    const right=horizontal>1e-6?{x:normal.z/horizontal,y:0,z:-normal.x/horizontal}:{x:1,y:0,z:0};
    const up={x:normal.y*right.z,y:normal.z*right.x-normal.x*right.z,z:-normal.y*right.x};
    return {right,up,normal};
}

export function infoPanelPose(matrix, heading = null) {
    if (!matrix) return null;
    const length = Math.hypot(matrix[0], matrix[2]) || 1;
    const right = heading || { x: matrix[0] / length, y: 0, z: matrix[2] / length };
    const center={ x: matrix[12] - right.x * .62 + right.z * .85,
        y: matrix[13] - .50, z: matrix[14] - right.z * .62 - right.x * .85 };
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
}

export function createPimInfoPanel({ root, onEdit = () => {} } = {}) {
    let selection = null, record = null, page = 0, hidden = false, help = true;
    let renderer = null, pose = null, heading = null, lastTime = 0, detached = false;
    let removeXrControls = () => {};
    const element = globalThis.document.createElement('aside');
    element.className = 'nlxr-info-panel'; element.setAttribute('aria-label', 'Side panel');
    root?.append(element);
    const text = () => help || !selection ? INFO_HELP : [selection.body,
        selection.safety && 'Safety: ' + selection.safety,
        selection.sources.length && 'Sources: ' + selection.sources.join('; ')].filter(Boolean).join('\n\n');
    const pages = () => infoPages(text(), 38, 9);
    const controls = () => hidden ? ['Side panel'] : ['Hide', 'Help', 'Previous', 'Next', ...(selection ? ['Edit'] : [])];
    function act(action) {
        if (action === 'Side panel') hidden = false;
        if (action === 'Hide') hidden = true;
        if (action === 'Help') { help = !help; page = 0; }
        if (action === 'Previous') page = Math.max(0, page - 1);
        if (action === 'Next') page = Math.min(pages().length - 1, page + 1);
        if (action === 'Edit' && selection) onEdit(record, selection.path || selection.id);
        render();
    }
    function render() {
        if (detached) return;
        const focused = element.contains(document.activeElement) ? document.activeElement?.dataset.infoAction : null;
        element.replaceChildren(); element.classList.toggle('is-hidden', hidden);
        if (!hidden) {
            const label = document.createElement('small'); label.textContent = 'Side panel · ' + (selection?.plant || 'YOUR COMPANION');
            const title = document.createElement('h2'); title.textContent = help || !selection ? 'Knowledge beside you' : selection.title;
            const trail = document.createElement('p'); trail.className = 'nlxr-info-trail'; trail.textContent = help ? 'Hold · explore · read' : selection?.breadcrumb || '';
            const body = document.createElement('p'); body.className = 'nlxr-info-body'; body.setAttribute('role', 'status'); body.textContent = pages()[page].join('\n');
            const metadata = document.createElement('small'); metadata.textContent = help || !selection ? 'Hide any time. Side panel restores this panel.' : [selection.scope === 'specimen' ? 'Local specimen' : selection.scope === 'species' ? 'Species knowledge' : 'Scope unspecified', selection.status, selection.evidence].filter(Boolean).join(' · ');
            element.append(label, title, trail, body, metadata);
        }
        const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'Info panel controls');
        for (const action of controls()) {
            const button = document.createElement('button'); button.type = 'button'; button.textContent = action;
            button.dataset.infoAction = action; button.setAttribute('aria-label', action === 'Edit' ? 'Edit information' : action === 'Side panel' ? 'Restore Side panel' : action);
            button.disabled = action === 'Previous' && page === 0 || action === 'Next' && page === pages().length - 1;
            button.addEventListener('click', event => { event.stopPropagation(); act(action); }); nav.append(button);
        }
        element.append(nav);
        if (!hidden) { const count = document.createElement('small'); count.textContent = (page + 1) + ' / ' + pages().length; element.append(count); }
        if (focused) (element.querySelector('[data-info-action="' + focused + '"]') || element.querySelector('button'))?.focus({ preventScroll: true });
    }
    element.addEventListener('beforexrselect', event => event.preventDefault());
    element.addEventListener('pointerdown', event => event.stopPropagation());
    function canvas(card) {
        const c = document.createElement('canvas'); c.width = 800; c.height = card.hidden ? 160 : 800;
        const ctx = c.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 800, c.height);
        gradient.addColorStop(0, 'rgba(60,112,164,.82)'); gradient.addColorStop(1, 'rgba(15,43,79,.82)');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(4, 4, 792, c.height - 8, 26); ctx.fill();
        ctx.strokeStyle = 'rgba(168,215,255,.88)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.textBaseline = 'top'; ctx.fillStyle = '#f2f7ff';
        if (!card.hidden) {
            ctx.font = '500 22px system-ui'; ctx.fillText(card.plant, 34, 28, 732);
            ctx.font = '600 34px system-ui';
            infoPages(card.title, 36, 2)[0].forEach((line, i) => ctx.fillText(line, 34, 65 + i * 40, 732));
            ctx.font = '400 20px system-ui'; ctx.fillText(card.trail, 34, 157, 732);
            ctx.font = '400 34px system-ui'; card.lines.forEach((line, i) => ctx.fillText(line, 34, 208 + i * 42, 732));
            ctx.font = '400 20px system-ui'; ctx.fillText(card.metadata, 34, 618, 732);
            ctx.fillText(card.page, 34, 654, 732);
        }
        const actions = card.controls, w = 740 / actions.length, y = card.hidden ? 36 : 707;
        actions.forEach((action, i) => {
            const disabled = action === 'Previous' && card.first || action === 'Next' && card.last;
            ctx.fillStyle = disabled ? 'rgba(195,225,255,.08)' : 'rgba(195,225,255,.2)'; ctx.fillRect(30 + i * w, y, w - 8, 58);
            ctx.fillStyle = disabled ? '#9aafc6' : '#f2f7ff'; ctx.font = '500 24px system-ui'; ctx.fillText(action, 41 + i * w, y + 14, w - 25);
        });
        return c;
    }
    function hit(ray) {
        if (!pose || !renderer) return null;
        return hitTotemSurface(ray, [{ ...pose, width: hidden ? .30 : .66, height: hidden ? .07 : .66 }]);
    }
    const api = {
        element,
        select(nextRecord, document, path) {
            const next = pimInfoContent(document, path); if (!next) return false;
            selection = next; record = nextRecord; help = false; hidden = false; page = 0; render(); return true;
        },
        refresh(nextRecord, document) { if (record === nextRecord && selection) api.select(record, document, selection.id); },
        suspend(value) { element.style.visibility = value ? 'hidden' : ''; detached = Boolean(value); if (!value) render(); },
        attach(gl) {
            renderer?.destroy(); renderer = createSpatialTotemCards(gl, { canvas,
                surfaces: (_position, _right, cards) => pose ? [{ ...pose, width: hidden ? .30 : .66, height: hidden ? .07 : .66, card: cards[0] }] : [] });
            element.hidden = true; // Immersive information is rendered in world space.
        },
        update(matrix, time = performance.now()) {
            const next = infoPanelPose(matrix, heading); if (!next) return;
            heading = next.anchorHeading;
            const amount = pose ? 1 - Math.exp(-Math.min(100, Math.max(0, time - lastTime)) / 160) : 1;
            if (!pose) pose = next;
            else for (const key of ['x', 'y', 'z']) pose.center[key] += (next.center[key] - pose.center[key]) * amount;
            // Position follows gently; the face aims at the current eye midpoint
            // in both yaw and pitch, including while the position is catching up.
            Object.assign(pose,facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]}));
            lastTime = time;
        },
        recenter() { heading = null; pose = null; },
        draw(view) {
            if (!renderer || !pose || detached) return;
            const p = pages(); page = Math.min(page, p.length - 1);
            const card = { id: 'info', hidden, controls: controls(), first: page === 0, last: page === p.length - 1,
                plant: 'Side panel · ' + (selection?.plant || 'YOUR COMPANION'), title: help || !selection ? 'Knowledge beside you' : selection.title,
                trail: help ? 'Hold · explore · read' : selection?.breadcrumb || '', lines: p[page], page: (page + 1) + ' / ' + p.length,
                metadata: help || !selection ? 'Hide any time. Side panel restores this panel.' : [selection.scope, selection.status, selection.evidence].filter(Boolean).join(' · ') };
            renderer.begin(); renderer.draw(view, { id: 'companion' }, pose.center, [card], ''); renderer.end();
        },
        hit,
        activate(ray) {
            const target = hit(ray); if (!target || detached) return false;
            const u = target.localX / target.width + .5;
            const v = .5 - target.localY / target.height;
            const top = hidden ? 36 / 160 : 707 / 800, bottom = hidden ? 94 / 160 : 765 / 800;
            if (v >= top && v <= bottom && u >= 30 / 800 && u <= 770 / 800) {
                const actions = controls(), index = Math.floor((u * 800 - 30) / (740 / actions.length));
                if (actions[index]) act(actions[index]);
            }
            return true; // Reading surface consumes input; never places an orb behind it.
        },
        bindSession(session, referenceSpace) {
            removeXrControls();
            const handle = event => {
                const transform = event.frame?.getPose(event.inputSource.targetRaySpace, referenceSpace)?.transform.matrix;
                if (!transform) return;
                const ray = { origin: { x: transform[12], y: transform[13], z: transform[14] }, direction: { x: -transform[8], y: -transform[9], z: -transform[10] } };
                if (hit(ray) && !detached) { event.stopImmediatePropagation(); if (event.type === 'select') api.activate(ray); }
            };
            for (const type of ['selectstart', 'selectend', 'select']) session.addEventListener(type, handle, true);
            removeXrControls = () => { for (const type of ['selectstart', 'selectend', 'select']) session.removeEventListener(type, handle, true); };
        },
        destroy() { removeXrControls(); renderer?.destroy(); renderer = null; element.remove(); }
    };
    render(); return api;
}
