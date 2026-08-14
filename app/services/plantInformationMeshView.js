import {
    pimNodeChildren,
    pimNodeHue,
    pimViewportSafeArea,
    pimVisibleNodes
} from './plantInformationMesh.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

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
        viewportWidth: options.viewportWidth,
        viewportHeight: options.viewportHeight
    });
    const label = value => String(value || '');
    const layoutScale = nodes[0]?.layoutScale || 1;
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
    const core = `<span class="plant-knowledge-core" data-pim-role="center" data-plant-profile-handle tabindex="0" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    return `<span class="plant-knowledge-map${expanded.size ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-shared-layout="true" data-pim-renderer="canonical" style="--pim-mesh-scale:${layoutScale}" aria-label="Plant Information Mesh">${cells}${core}</span>`;
}
