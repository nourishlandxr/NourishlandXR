import {
    pimConnectorPath,
    pimNodeChildren,
    pimNodeHue,
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
    const nodes = pimVisibleNodes(source, expanded, {
        selectedNodeId: options.selectedNodeId
    });
    const label = value => String(value || '');
    const connectors = nodes
        .filter(node => node.depth > 0)
        .map(node => `<path class="plant-knowledge-connector plant-knowledge-connector-depth-${node.depth} is-parent-link" d="${pimConnectorPath(node)}" pathLength="1" style="--pim-hue:${pimNodeHue(node)}"/>`)
        .join('');
    const cells = nodes.map(node => {
        const hasChildren = pimNodeChildren(node).length > 0;
        const open = expanded.has(node.path);
        const selected = String(options.selectedNodeId || '') === node.path;
        const detailsVisible = node.depth > 0;
        const role = node.depth === 0 ? 'primary' : 'child';
        const depthClass = node.depth ? ` plant-knowledge-child plant-knowledge-child-depth-${Math.min(node.depth, 3)}` : '';
        const parentPosition = node.parentPosition || { x: 50, y: 50, gridX: 0, gridY: 0 };
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-grid-x:${node.position.gridX};--pim-grid-y:${node.position.gridY};--pim-parent-x:${parentPosition.x}%;--pim-parent-y:${parentPosition.y}%;--pim-parent-grid-x:${parentPosition.gridX || 0};--pim-parent-grid-y:${parentPosition.gridY || 0};--pim-node-scale:1;--pim-hue:${pimNodeHue(node)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${selected ? ' is-selected' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-role="${role}" data-pim-node="${escapeHtml(node.path)}" data-pim-node-id="${escapeHtml(node.nodeId || node.path)}" data-pim-parent-id="${escapeHtml(node.parentId || '')}" data-pim-direction="${escapeHtml(node.rootDirection || node.direction)}" data-plant-branch="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(label(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}" aria-selected="${selected}"><b>${escapeHtml(label(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    const handleLabel = options.handleLabel || `Drag the ${label(source.title)} Plant Information Mesh`;
    const core = `<span class="plant-knowledge-core" data-pim-role="center" data-plant-profile-handle tabindex="0" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    return `<span class="plant-knowledge-map${expanded.size ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-shared-layout="true" data-pim-renderer="canonical" aria-label="Plant Information Mesh"><svg class="plant-knowledge-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>${cells}${core}</span>`;
}
