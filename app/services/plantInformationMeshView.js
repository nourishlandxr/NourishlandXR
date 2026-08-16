import {
    pimLayoutMetrics,
    pimNodeChildren,
    pimNodeHue,
    pimViewportSafeArea,
    pimVisibleNodes
} from './plantInformationMesh.js';
import {
    pimConnectionCurve,
    pimConnectionCurveSign,
    pimConnectionPathIsSelected,
    pimConnectionPairs,
    pimHexEdgePoint
} from './plantInformationMeshConnections.js';

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

const PIM_CONNECTION_ANIMATION_MS = 260;
const PIM_CONNECTION_SVG_NS = 'http://www.w3.org/2000/svg';

function readCssNumber(element, property, fallback = 0) {
    const inline = element?.style?.getPropertyValue?.(property);
    const computed = typeof globalThis.getComputedStyle === 'function' && element
        ? globalThis.getComputedStyle(element).getPropertyValue(property)
        : '';
    const value = Number.parseFloat(inline || computed || '');
    return Number.isFinite(value) ? value : fallback;
}

function pimMapGeometry(map) {
    const mapRect = map?.getBoundingClientRect?.() || {};
    const width = Math.max(1, Number(mapRect.width) || Number(map?.clientWidth) || 1);
    const height = Math.max(1, Number(mapRect.height) || Number(map?.clientHeight) || 1);
    const mapLeft = Number(mapRect.left) || 0;
    const mapTop = Number(mapRect.top) || 0;
    const position = (element, xProperty, yProperty) => {
        const rect = element?.getBoundingClientRect?.() || {};
        const measuredWidth = Number(rect.width) || readCssNumber(element, 'width');
        const measuredHeight = Number(rect.height) || readCssNumber(element, 'height');
        const widthPixels = Math.max(1, measuredWidth || readCssNumber(map, '--pim-cell-size', 76));
        const heightPixels = Math.max(1, measuredHeight || readCssNumber(map, '--pim-cell-height', widthPixels * .8660254));
        const measuredCenterX = Number(rect.left) + Number(rect.width) / 2 - mapLeft;
        const measuredCenterY = Number(rect.top) + Number(rect.height) / 2 - mapTop;
        const xPercent = readCssNumber(element, xProperty, 50);
        const yPercent = readCssNumber(element, yProperty, 50);
        const center = {
            x: Number(rect.width) > 0 ? measuredCenterX : width * xPercent / 100,
            y: Number(rect.height) > 0 ? measuredCenterY : height * yPercent / 100
        };
        return {
            center,
            bounds: {
                left: center.x - widthPixels / 2,
                top: center.y - heightPixels / 2,
                width: widthPixels,
                height: heightPixels
            }
        };
    };
    return { width, height, position };
}

function ensurePimConnectionLayer(map) {
    if (!map || typeof document === 'undefined') return null;
    let layer = [...map.children].find(element => element.matches?.('.plant-knowledge-connections'));
    if (!layer) {
        layer = document.createElementNS(PIM_CONNECTION_SVG_NS, 'svg');
        layer.classList.add('plant-knowledge-connections');
        layer.setAttribute('aria-hidden', 'true');
        layer.setAttribute('focusable', 'false');
        map.prepend(layer);
    }
    return layer;
}

function pimDomConnectionNodes(map) {
    const geometry = pimMapGeometry(map);
    const elements = new Map();
    const cells = [...map.querySelectorAll('[data-pim-node-id]')];
    cells.forEach(element => elements.set(String(element.dataset.pimNodeId), element));
    const nodes = cells.map(element => {
        const position = geometry.position(element, '--pim-node-x', '--pim-node-y');
        return {
            nodeId: String(element.dataset.pimNodeId || element.dataset.pimNode || ''),
            path: String(element.dataset.pimNode || ''),
            parentId: String(element.dataset.pimParentId || ''),
            depth: Number(element.dataset.pimDepth) || (element.dataset.pimRole === 'child' ? 1 : 0),
            hue: readCssNumber(element, '--pim-hue', 112),
            position,
            element
        };
    });
    const core = map.querySelector('[data-pim-role="center"]');
    return { geometry, elements, nodes, core, corePosition: core ? geometry.position(core, '--pim-core-x', '--pim-core-y') : null };
}

function connectionIsActive(pair, nodesById, core, selectedPath = '') {
    if (selectedPath) return pimConnectionPathIsSelected(pair, selectedPath);
    const child = nodesById.get(pair.childId);
    const parent = pair.parentId === 'core' ? core : nodesById.get(pair.parentId);
    return Boolean(child?.element?.classList.contains('is-open')
        || child?.element?.classList.contains('is-selected')
        || parent?.classList?.contains('is-open')
        || parent?.classList?.contains('is-selected'));
}

/**
 * Recalculate the one SVG connection layer beneath a canonical PIM map.
 * Geometry comes from the rendered cells, so an orientation change or bloom
 * transition cannot leave a line anchored at an old percentage or centre.
 */
export function syncPimConnectionLayer(map) {
    if (!map) return null;
    const layer = ensurePimConnectionLayer(map);
    if (!layer) return null;
    const { geometry, nodes, core, corePosition } = pimDomConnectionNodes(map);
    layer.setAttribute('viewBox', `0 0 ${geometry.width} ${geometry.height}`);
    layer.setAttribute('width', String(geometry.width));
    layer.setAttribute('height', String(geometry.height));
    const selectedPath = map.querySelector('.plant-knowledge-cell.is-selected')?.dataset.pimNode || '';
    const pairs = pimConnectionPairs(nodes);
    const desired = new Map();
    pairs.forEach(pair => {
        const child = nodes.find(node => node.nodeId === pair.childId);
        const childPosition = child?.position;
        const parentPosition = pair.parentId === 'core'
            ? corePosition
            : nodes.find(node => node.nodeId === pair.parentId)?.position;
        if (!childPosition || !parentPosition) return;
        const start = pimHexEdgePoint(parentPosition.center, childPosition.center, parentPosition.bounds);
        const end = pimHexEdgePoint(childPosition.center, parentPosition.center, childPosition.bounds);
        const curve = pimConnectionCurve(start, end, {
            bend: pair.depth > 1 ? .09 : .12,
            sign: pimConnectionCurveSign(pair.parentId, pair.childId)
        });
        desired.set(pair.id, { pair, curve, active: connectionIsActive(pair, new Map(nodes.map(node => [node.nodeId, node])), core, selectedPath) });
    });
    const existing = new Map([...layer.querySelectorAll('.plant-knowledge-connection')]
        .map(path => [String(path.dataset.pimConnectionId || ''), path])
        .filter(([id]) => id));
    const timers = map.__pimConnectionExitTimers || (map.__pimConnectionExitTimers = new Map());
    desired.forEach(({ pair, curve, active }) => {
        const path = existing.get(pair.id) || document.createElementNS(PIM_CONNECTION_SVG_NS, 'path');
        const wasNew = !path.parentNode;
        const wasClosing = path.classList.contains('is-closing');
        if (timers.has(pair.id)) {
            globalThis.clearTimeout(timers.get(pair.id));
            timers.delete(pair.id);
        }
        path.classList.add('plant-knowledge-connection');
        path.classList.toggle('is-active', active);
        path.classList.remove('is-closing');
        path.dataset.pimConnectionId = pair.id;
        path.dataset.pimConnectionParent = pair.parentId;
        path.dataset.pimConnectionChild = pair.childId;
        path.dataset.pimConnectionBranch = pair.branchId;
        path.style.setProperty('--pim-connection-hue', String(pair.hue));
        path.setAttribute('pathLength', '1');
        path.setAttribute('d', curve.d);
        if (wasNew || wasClosing) {
            path.classList.add('is-opening');
            path.addEventListener('animationend', () => path.classList.remove('is-opening'), { once: true });
            if (wasNew) layer.append(path);
        }
    });
    existing.forEach((path, id) => {
        if (desired.has(id) || timers.has(id)) return;
        path.classList.remove('is-opening');
        path.classList.add('is-closing');
        const timer = globalThis.setTimeout(() => {
            path.remove();
            timers.delete(id);
        }, PIM_CONNECTION_ANIMATION_MS);
        timers.set(id, timer);
    });
    return layer;
}

function schedulePimConnectionReflow(map) {
    if (!map) return;
    syncPimConnectionLayer(map);
    if (map.__pimConnectionFrames) return;
    let frameCount = 0;
    const raf = callback => globalThis.requestAnimationFrame
        ? globalThis.requestAnimationFrame(callback)
        : globalThis.setTimeout(() => callback(performance.now()), 40);
    const run = () => {
        map.__pimConnectionFrames = 0;
        syncPimConnectionLayer(map);
        frameCount += 1;
        if (frameCount < 5) map.__pimConnectionFrames = raf(run);
    };
    map.__pimConnectionFrames = raf(run);
}

function bindPimConnectionLayout(map, signal) {
    if (!map || map.__pimConnectionLayoutBound) return;
    const refresh = () => schedulePimConnectionReflow(map);
    const observer = typeof globalThis.ResizeObserver === 'function'
        ? new globalThis.ResizeObserver(refresh)
        : null;
    observer?.observe(map);
    globalThis.window?.addEventListener?.('resize', refresh, { passive: true });
    globalThis.window?.addEventListener?.('orientationchange', refresh, { passive: true });
    globalThis.window?.visualViewport?.addEventListener?.('resize', refresh, { passive: true });
    const cleanup = () => {
        observer?.disconnect();
        globalThis.window?.removeEventListener?.('resize', refresh);
        globalThis.window?.removeEventListener?.('orientationchange', refresh);
        globalThis.window?.visualViewport?.removeEventListener?.('resize', refresh);
        if (map.__pimConnectionFrames && globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(map.__pimConnectionFrames);
        map.__pimConnectionFrames = 0;
        map.__pimConnectionLayoutBound = false;
    };
    map.__pimConnectionLayoutBound = true;
    map.__pimConnectionLayoutCleanup = cleanup;
    signal?.addEventListener?.('abort', cleanup, { once: true });
    refresh();
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
        schedulePimConnectionReflow(nextMap);
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
    schedulePimConnectionReflow(currentMap);
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
    bindPimConnectionLayout(container.querySelector('[data-pim-renderer="canonical"]'), options.signal);
    return () => {
        finish({ drain: false });
        container.querySelector('[data-pim-renderer="canonical"]')?.__pimConnectionLayoutCleanup?.();
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
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${selected ? ' is-selected' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-role="${role}" data-pim-depth="${node.depth}" data-pim-node="${escapeHtml(node.path)}" data-pim-node-id="${escapeHtml(node.nodeId || node.path)}" data-pim-parent-id="${escapeHtml(node.parentId || '')}" data-pim-direction="${escapeHtml(node.rootDirection || node.direction)}" data-plant-branch="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(label(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}" aria-selected="${selected}"><span class="plant-knowledge-press-fill" aria-hidden="true"></span><b>${escapeHtml(label(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    const handleLabel = options.handleLabel || `Drag the ${label(source.title)} Plant Information Mesh`;
    const center = nodes[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const core = `<span class="plant-knowledge-core" data-pim-role="center" data-plant-profile-handle tabindex="0" style="--pim-core-x:${center.x}%;--pim-core-y:${center.y}%" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    const connections = '<svg class="plant-knowledge-connections" aria-hidden="true" focusable="false"></svg>';
    return `<span class="plant-knowledge-map${expanded.size ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-density="${density}" data-pim-shared-layout="true" data-pim-renderer="canonical" style="--pim-cell-size:${metrics.cellWidthPixels}px;--pim-mesh-scale:${layoutScale}" aria-label="Plant Information Mesh">${connections}${cells}${core}</span>`;
}
