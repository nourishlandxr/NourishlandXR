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
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-parent-x:${parentPosition.x}%;--pim-parent-y:${parentPosition.y}%;--pim-node-scale:${node.layoutScale || 1};--pim-hue:${pimNodeHue(node)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${selected ? ' is-selected' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-role="${role}" data-pim-node="${escapeHtml(node.path)}" data-pim-node-id="${escapeHtml(node.nodeId || node.path)}" data-pim-parent-id="${escapeHtml(node.parentId || '')}" data-pim-direction="${escapeHtml(node.rootDirection || node.direction)}" data-plant-branch="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(label(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}" aria-selected="${selected}"><b>${escapeHtml(label(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    const handleLabel = options.handleLabel || `Drag the ${label(source.title)} Plant Information Mesh`;
    const center = nodes[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const core = `<span class="plant-knowledge-core" data-pim-role="center" data-plant-profile-handle tabindex="0" style="--pim-core-x:${center.x}%;--pim-core-y:${center.y}%" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    return `<span class="plant-knowledge-map${expanded.size ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-density="${density}" data-pim-shared-layout="true" data-pim-renderer="canonical" style="--pim-cell-size:${metrics.cellWidthPixels}px;--pim-mesh-scale:${layoutScale}" aria-label="Plant Information Mesh">${cells}${core}</span>`;
}
