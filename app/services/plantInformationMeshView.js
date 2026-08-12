import {
    pimConnectorPath,
    pimFocusedView,
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
 * The two screens still own their persistence and pointer plumbing, but the
 * visible mesh, cell attributes, parent trail and core handle are deliberately
 * emitted from this shared renderer so a layout fix reaches both modes.
 */
export function plantInformationMeshMarkup(knowledge, expandedPaths = [], options = {}) {
    const source = knowledge || { title: 'Plant Information Mesh', categories: [] };
    const expanded = new Set(Array.isArray(expandedPaths) ? expandedPaths : []);
    const focus = pimFocusedView(source, expandedPaths);
    const nodes = focus?.nodes || pimVisibleNodes(source, expandedPaths);
    const label = value => String(value || '');
    const connectors = nodes.map(node => `<path class="plant-knowledge-connector plant-knowledge-connector-depth-${node.depth}${node.depth > 0 ? ' is-parent-link' : ' is-core-link'}" d="${pimConnectorPath(node)}" pathLength="1" style="--pim-hue:${pimNodeHue(node)}"/>`).join('');
    const cells = nodes.map(node => {
        const hasChildren = pimNodeChildren(node).length > 0;
        const open = expanded.has(node.path);
        const detailsVisible = node.depth > 0;
        const visualDepth = focus ? 1 : node.depth;
        const depthClass = visualDepth ? ` plant-knowledge-child plant-knowledge-child-depth-${Math.min(visualDepth, 3)}` : '';
        const parentPosition = node.parentPosition || { x: 50, y: 50, gridX: 0, gridY: 0 };
        const style = `--pim-node-x:${node.position.x}%;--pim-node-y:${node.position.y}%;--pim-grid-x:${node.position.gridX};--pim-grid-y:${node.position.gridY};--pim-parent-x:${parentPosition.x}%;--pim-parent-y:${parentPosition.y}%;--pim-parent-grid-x:${parentPosition.gridX || 0};--pim-parent-grid-y:${parentPosition.gridY || 0};--pim-node-scale:1;--pim-hue:${pimNodeHue(node)}`;
        return `<button type="button" class="plant-knowledge-cell${depthClass}${open ? ' is-open' : ''}${detailsVisible ? ' is-detail-visible' : ''}" data-pim-node="${escapeHtml(node.path)}" data-pim-direction="${escapeHtml(node.rootDirection || node.direction)}" data-plant-branch="${escapeHtml(node.path)}" data-ar-plant-branch="${escapeHtml(node.path)}" style="${style}" aria-label="${escapeHtml(label(node.label))}${hasChildren ? ' information cell' : ''}" aria-expanded="${hasChildren ? open : false}"><b>${escapeHtml(label(node.label))}</b><small aria-hidden="${!detailsVisible}">${escapeHtml(node.value)}</small></button>`;
    }).join('');
    const focusTrail = focus?.trail.map(node => label(node.label)).join(' › ') || '';
    const back = focus
        ? `<button type="button" class="plant-knowledge-back" data-pim-back="${escapeHtml(focus.focusNode.path)}" data-ar-pim-back="${escapeHtml(focus.focusNode.path)}" aria-label="Return from ${escapeHtml(label(focus.focusNode.label))} to the previous PIM bloom">← ${escapeHtml(source.title)} · ${escapeHtml(focusTrail)}</button>`
        : '';
    const handleLabel = options.handleLabel || `Drag the ${label(source.title)} Plant Information Mesh`;
    const core = focus
        ? `<span class="plant-knowledge-core is-fractal-focus" data-plant-profile-handle tabindex="0" aria-label="${escapeHtml(handleLabel)}"><small>SELECTED TOPIC</small><strong>${escapeHtml(label(focus.focusNode.label))}</strong><i>${escapeHtml(focus.focusNode.value)}</i></span>`
        : `<span class="plant-knowledge-core" data-plant-profile-handle tabindex="0" aria-label="${escapeHtml(handleLabel)}"><strong>${escapeHtml(source.title)}</strong></span>`;
    return `<span class="plant-knowledge-map${focus ? ' is-fractal-focus' : ''}${expandedPaths.length ? ' is-expanded' : ''}" data-pim-layout="honeycomb" data-pim-shared-layout="true" aria-label="Plant Information Mesh">${back}<svg class="plant-knowledge-connectors" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${connectors}</svg>${cells}${core}</span>`;
}
