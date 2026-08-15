import {
    pimLayoutMetrics,
    pimNodeChildren,
    pimNodeHue,
    pimViewportSafeArea,
    pimVisibleNodes
} from './plantInformationMesh.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

function syncPimElement(target, source, { content = true } = {}) {
    [...target.attributes].forEach(attribute => {
        if (!source.hasAttribute(attribute.name)) target.removeAttribute(attribute.name);
    });
    [...source.attributes].forEach(attribute => target.setAttribute(attribute.name, attribute.value));
    if (content && target.innerHTML !== source.innerHTML) target.innerHTML = source.innerHTML;
    return target;
}

function pimElementKey(element) {
    if (element?.hasAttribute?.('data-pim-node-id')) return `node:${element.dataset.pimNodeId}`;
    if (element?.hasAttribute?.('data-pim-node')) return `node:${element.dataset.pimNode}`;
    if (element?.getAttribute?.('data-pim-role') === 'center') return 'center';
    return '';
}

/**
 * Diff canonical PIM cells by stable node ID. Demo and Creator call this for
 * branch changes so already-visible cells keep their DOM identity, listeners,
 * transforms and focus while only newly-visible descendants are appended.
 */
export function reconcilePlantInformationMesh(container, markup) {
    if (!container || typeof document === 'undefined') return null;
    const template = document.createElement('template');
    template.innerHTML = String(markup || '').trim();
    const nextMap = template.content.firstElementChild;
    if (!nextMap) return null;
    const currentMap = container.querySelector('[data-pim-renderer="canonical"]');
    if (!currentMap) {
        container.replaceChildren(nextMap);
        return nextMap;
    }

    syncPimElement(currentMap, nextMap, { content: false });
    const currentByKey = new Map(
        [...currentMap.children]
            .map(element => [pimElementKey(element), element])
            .filter(([key]) => key)
    );
    const retained = new Set();
    [...nextMap.children].forEach(nextElement => {
        const key = pimElementKey(nextElement);
        if (!key) return;
        const currentElement = currentByKey.get(key);
        const resolved = currentElement
            ? syncPimElement(currentElement, nextElement)
            : nextElement;
        retained.add(key);
        currentMap.append(resolved);
    });
    currentByKey.forEach((element, key) => {
        if (!retained.has(key)) element.remove();
    });
    return currentMap;
}

export const PIM_PRESS_DURATION_MS = 500;

function pimPressTarget(event) {
    return event?.target?.closest?.('[data-pim-node],[data-pim-back],[data-pim-role="center"]') || null;
}

function pimPointInsideTarget(target, event) {
    const rect = target?.getBoundingClientRect?.();
    if (!rect) return true;
    return event.clientX >= rect.left && event.clientX <= rect.right
        && event.clientY >= rect.top && event.clientY <= rect.bottom;
}

/**
 * One deliberate PIM gesture for Demo and Creator. Delegation keeps the
 * binding valid as reconcilePlantInformationMesh appends new children. A
 * marked click is emitted only after the complete hold so the existing screen
 * handlers remain the one shared data/action path.
 */
export function bindPlantInformationMeshPress(container, options = {}) {
    if (!container || container.dataset.pimPressBound === 'true') return () => {};
    container.dataset.pimPressBound = 'true';
    const active = { pointerId: null, target: null, timer: 0, frame: 0, complete: false, keyboard: false, startedAt: 0 };
    const raf = callback => (globalThis.requestAnimationFrame
        ? globalThis.requestAnimationFrame(callback)
        : globalThis.setTimeout(() => callback(performance.now()), 16));
    const caf = frame => (globalThis.cancelAnimationFrame ? globalThis.cancelAnimationFrame(frame) : globalThis.clearTimeout(frame));
    const clearFrame = () => {
        if (active.frame) caf(active.frame);
        active.frame = 0;
    };
    const resetVisual = (target, drain = false) => {
        if (!target) return;
        target.classList.remove('is-pressing');
        if (drain) {
            target.classList.add('is-press-draining');
            globalThis.setTimeout(() => {
                target.classList.remove('is-press-draining');
                target.style.removeProperty('--pim-press-progress');
            }, 120);
        } else {
            target.classList.remove('is-press-draining');
            target.style.removeProperty('--pim-press-progress');
        }
    };
    const finish = ({ completed = false, drain = true } = {}) => {
        const target = active.target;
        globalThis.clearTimeout(active.timer);
        active.timer = 0;
        clearFrame();
        if (target && completed) {
            target.style.setProperty('--pim-press-progress', '1');
            target.classList.remove('is-pressing', 'is-press-draining');
            target.classList.add('is-press-complete');
            globalThis.setTimeout(() => {
                target.classList.remove('is-press-complete');
                target.style.removeProperty('--pim-press-progress');
            }, 360);
        } else resetVisual(target, drain);
        active.pointerId = null;
        active.target = null;
        active.complete = false;
        active.keyboard = false;
    };
    const dispatchActivation = target => {
        if (!target || active.target !== target) return;
        active.complete = true;
        target.style.setProperty('--pim-press-progress', '1');
        target.classList.add('is-press-complete');
        if (typeof navigator !== 'undefined') navigator.vibrate?.(10);
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: globalThis.window });
        Object.defineProperty(click, '__nxrPimHoldActivation', { value: true });
        target.dispatchEvent(click);
        finish({ completed: true, drain: false });
    };
    const update = timestamp => {
        if (!active.target) return;
        const progress = Math.max(0, Math.min(1, (timestamp - active.startedAt) / PIM_PRESS_DURATION_MS));
        active.target.style.setProperty('--pim-press-progress', String(progress));
        if (progress < 1) active.frame = raf(update);
    };
    const begin = (target, event, keyboard = false) => {
        if (!target || active.target || target.disabled) return;
        active.target = target;
        active.pointerId = keyboard ? 'keyboard' : event.pointerId;
        active.keyboard = keyboard;
        active.complete = false;
        active.startedAt = performance.now();
        target.classList.add('is-pressing');
        target.style.setProperty('--pim-press-progress', '0');
        if (!keyboard) target.setPointerCapture?.(event.pointerId);
        active.timer = globalThis.setTimeout(() => dispatchActivation(target), PIM_PRESS_DURATION_MS);
        active.frame = raf(update);
        event.preventDefault();
        event.stopPropagation();
    };
    const cancel = event => {
        if (!active.target) return;
        if (!active.keyboard && event?.pointerId !== undefined && event.pointerId !== active.pointerId) return;
        finish({ drain: true });
        event?.preventDefault?.();
        event?.stopPropagation?.();
    };
    container.addEventListener('pointerdown', event => {
        const target = pimPressTarget(event);
        if (target) begin(target, event);
    });
    container.addEventListener('pointermove', event => {
        if (!active.target || active.keyboard || event.pointerId !== active.pointerId) return;
        if (!pimPointInsideTarget(active.target, event)) cancel(event);
    });
    container.addEventListener('pointerup', event => {
        if (!active.target || active.keyboard || event.pointerId !== active.pointerId) return;
        if (!active.complete) cancel(event);
        else finish({ completed: true, drain: false });
    });
    container.addEventListener('pointercancel', cancel);
    container.addEventListener('lostpointercapture', event => {
        if (active.target && !active.complete) cancel(event);
    });
    container.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const target = pimPressTarget(event);
        if (target) begin(target, event, true);
    });
    container.addEventListener('keyup', event => {
        if (!active.keyboard || (event.key !== 'Enter' && event.key !== ' ')) return;
        if (!active.complete) cancel(event);
        else finish({ completed: true, drain: false });
    });
    // Screen-level click handlers are kept for the completed marked click;
    // ordinary taps must not activate a cell before the hold completes.
    container.addEventListener('click', event => {
        if (event.__nxrPimHoldActivation) return;
        if (!pimPressTarget(event)) return;
        event.preventDefault();
        event.stopPropagation();
    }, true);
    options.signal?.addEventListener?.('abort', () => finish({ drain: false }), { once: true });
    return () => {
        finish({ drain: false });
        container.dataset.pimPressBound = 'false';
    };
}

/**
 * One DOM contract for the AR PIM in Demo and Creator mode.
 *
 * Selection highlights one stable node, while expansion keeps the complete
 * primary mesh and appends descendants beside their real parent.
 */
export function plantInformationMeshMarkup(knowledge, expandedPaths = [], options = {}) {
    const source = knowledge || { title: 'Plant Information Mesh', categories: [] };
    const expanded = new Set(expandedPaths instanceof Set ? expandedPaths : (Array.isArray(expandedPaths) ? expandedPaths : []));
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const viewportWidth = Number(options.viewportWidth) || Number(visualViewport?.width) || Number(windowWidth) || 0;
    const viewportHeight = Number(options.viewportHeight) || Number(visualViewport?.height) || Number(windowHeight) || 0;
    const metrics = pimLayoutMetrics({
        viewportWidth: viewportWidth || undefined,
        viewportHeight: viewportHeight || undefined,
        layoutWidth: options.layoutWidth,
        layoutHeight: options.layoutHeight,
        cellWidthPixels: options.cellWidthPixels,
        cellHeightPixels: options.cellHeightPixels,
        gapPixels: options.gapPixels
    });
    const layoutOptions = options.safeArea
        ? { selectedNodeId: options.selectedNodeId, safeArea: options.safeArea }
        : viewportWidth && viewportHeight
            ? {
                selectedNodeId: options.selectedNodeId,
                safeArea: pimViewportSafeArea(viewportWidth, viewportHeight, {
                    topInset: options.topInset ?? 24,
                    bottomInset: options.bottomInset ?? 80,
                    horizontalInset: options.horizontalInset ?? 24
                })
            }
            : { selectedNodeId: options.selectedNodeId };
    const nodes = pimVisibleNodes(source, expanded, {
        ...layoutOptions,
        viewportWidth: viewportWidth || undefined,
        viewportHeight: viewportHeight || undefined,
        layoutWidth: metrics.layoutWidth,
        layoutHeight: metrics.layoutHeight,
        cellWidthPixels: metrics.cellWidthPixels,
        cellHeightPixels: metrics.cellHeightPixels,
        gapPixels: metrics.gapPixels
    });
    const label = value => String(value || '');
    const layoutScale = nodes[0]?.layoutScale || 1;
    const renderedCellWidth = Number(nodes[0]?.layoutCellWidthPixels) || metrics.cellWidthPixels * layoutScale;
    // Dense phone layouts keep the full hierarchy and stable geometry, but
    // reserve each hexagon for its cell name. Secondary copy remains in the
    // accessible label/data model and returns automatically at larger sizes.
    const density = viewportWidth <= 430 || renderedCellWidth < 76 ? 'compact' : 'comfortable';
    const cells = nodes.map(node => {
        const hasChildren = pimNodeChildren(node).length > 0;
        const open = expanded.has(node.path);
        const selected = String(options.selectedNodeId || '') === node.path;
        const detailsVisible = node.depth > 0;
        const role = node.depth === 0 ? 'primary' : 'child';
        const depthClass = node.depth ? ` plant-knowledge-child plant-knowledge-child-depth-${Math.min(node.depth, 3)}` : '';
        const parentPosition = node.parentPosition || { x: 50, y: 50, gridX: 0, gridY: 0 };
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-parent-x:${parentPosition.x}%;--pim-parent-y:${parentPosition.y}%;--pim-node-scale:${node.layoutScale || 1};--pim-child-index:${Number(node.childIndex) || 0};--pim-hue:${pimNodeHue(node)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${selected ? ' is-selected' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-role="${role}" data-pim-node="${escapeHtml(node.path)}" data-pim-node-id="${escapeHtml(node.nodeId || node.path)}" data-pim-parent-id="${escapeHtml(node.parentId || '')}" data-pim-direction="${escapeHtml(node.rootDirection || node.direction)}" data-plant-branch="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(label(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}" aria-selected="${selected}"><span class="plant-knowledge-press-fill" aria-hidden="true"></span><b>${escapeHtml(label(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    const handleLabel = options.handleLabel || `Drag the ${label(source.title)} Plant Information Mesh`;
    const center = nodes[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const core = `<span class="plant-knowledge-core" data-pim-role="center" data-plant-profile-handle tabindex="0" style="--pim-core-x:${center.x}%;--pim-core-y:${center.y}%" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    return `<span class="plant-knowledge-map${expanded.size ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-density="${density}" data-pim-shared-layout="true" data-pim-renderer="canonical" style="--pim-cell-size:${metrics.cellWidthPixels}px;--pim-mesh-scale:${layoutScale}" aria-label="Plant Information Mesh">${cells}${core}</span>`;
}
