import {
    PIM_SPATIAL_CONFIG,
    pimNodeHue,
    pimNodeVisualPosition,
    pimVisibleNodeBounds,
    pimVisibleNodes
} from './plantInformationMesh.js';
import {
    pimConnectionCurve,
    pimConnectionCurveSign,
    pimConnectionPathIsSelected,
    pimConnectionPairs,
    pimHexEdgePoint
} from './plantInformationMeshConnections.js';

export const PIM_TEXTURE_SIZE = Object.freeze({ width: 1440, height: 1080 });
export const PIM_BLOOM_DURATION_MS = 220;
export const PIM_TEXTURE_CELL_WIDTH = 200;
const PIM_TEXTURE_RENDER_PADDING = 84;

/**
 * Return the smallest padded texture that contains every currently visible
 * cell. The authored cell pixels remain fixed; when a deep branch needs more
 * room, the world panel grows with the texture instead of shrinking the
 * cells or clipping them against the original flower-sized canvas.
 */
export function pimHoneycombTextureSize(knowledge, expandedPaths = [], options = {}) {
    const baseWidth = Math.max(320, Number(options.baseWidth ?? options.width) || PIM_TEXTURE_SIZE.width);
    const baseHeight = Math.max(240, Number(options.baseHeight ?? options.height) || PIM_TEXTURE_SIZE.height);
    const layoutOptions = {
        ...options,
        layoutWidth: Number(options.layoutWidth) || baseWidth,
        layoutHeight: Number(options.layoutHeight) || baseHeight,
        cellWidthPixels: Number(options.cellWidthPixels) || PIM_TEXTURE_CELL_WIDTH
    };
    const nodes = pimVisibleNodes(knowledge, expandedPaths, layoutOptions);
    const bounds = pimVisibleNodeBounds(nodes);
    if (![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite)) {
        return { width: baseWidth, height: baseHeight, layoutWidth: baseWidth, layoutHeight: baseHeight };
    }
    const centerX = layoutOptions.layoutWidth / 2;
    const centerY = layoutOptions.layoutHeight / 2;
    const left = bounds.left / 100 * layoutOptions.layoutWidth;
    const right = bounds.right / 100 * layoutOptions.layoutWidth;
    const top = bounds.top / 100 * layoutOptions.layoutHeight;
    const bottom = bounds.bottom / 100 * layoutOptions.layoutHeight;
    // The panel pose maps the texture centre to the world-space PIM centre.
    // Expand symmetrically around that centre so existing cells keep their
    // relative transforms while the new branch has real pixels to render.
    const visibleWidth = Math.max(1, Math.max(centerX - left, right - centerX) * 2);
    const visibleHeight = Math.max(1, Math.max(centerY - top, bottom - centerY) * 2);
    const padding = Math.max(24, Number(options.renderPaddingPixels) || PIM_TEXTURE_RENDER_PADDING);
    return {
        width: Math.max(baseWidth, Math.ceil(visibleWidth + padding * 2)),
        height: Math.max(baseHeight, Math.ceil(visibleHeight + padding * 2)),
        layoutWidth: Math.max(baseWidth, Math.ceil(visibleWidth + padding * 2)),
        layoutHeight: Math.max(baseHeight, Math.ceil(visibleHeight + padding * 2)),
        padding
    };
}

function wrapLines(context, text, maxWidth) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    });
    if (line) lines.push(line);
    return lines;
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
    const lines = wrapLines(context, text, maxWidth).slice(0, maxLines);
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
}

function drawHexagon(context, x, y, radius, fill, stroke, lineWidth = 2) {
    context.beginPath();
    for (let point = 0; point < 6; point += 1) {
        const angle = Math.PI / 3 * point;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (!point) context.moveTo(px, py);
        else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = lineWidth;
    context.stroke();
}

function drawOutlinedLines(context, lines, x, startY, lineHeight) {
    lines.forEach((line, index) => {
        const y = startY + index * lineHeight;
        context.strokeText(line, x, y);
        context.fillText(line, x, y);
    });
}

function quadraticPoint(start, control, end, progress) {
    const t = Math.max(0, Math.min(1, Number(progress)));
    const inverse = 1 - t;
    return {
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
    };
}

function drawPimConnections(context, width, height, nodes, expanded, hoverPath, selectedNodeId, bloom, { currentNodeIds = new Set(), closingPaths = [] } = {}) {
    const source = Array.isArray(nodes) ? nodes : [];
    const closing = Array.isArray(closingPaths) ? closingPaths.map(String) : [];
    const byId = new Map(source.map(node => [String(node.nodeId || node.id || node.path || ''), node]));
    const centerPercent = source[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const center = { x: centerPercent.x / 100 * width, y: centerPercent.y / 100 * height };
    const coreWidth = Math.max(1, Number(source[0]?.layoutCellWidthPercent || 0) / 100 * width);
    const coreHeight = Math.max(1, Number(source[0]?.layoutCellHeightPercent || 0) / 100 * height);
    const position = node => {
        const point = pimNodeVisualPosition(node, node?.depth > 0 ? bloom : 1);
        return {
            center: { x: point.x / 100 * width, y: point.y / 100 * height },
            bounds: {
                left: point.x / 100 * width - Number(node?.layoutCellWidthPercent || 0) / 100 * width / 2,
                top: point.y / 100 * height - Number(node?.layoutCellHeightPercent || 0) / 100 * height / 2,
                width: Math.max(1, Number(node?.layoutCellWidthPercent || 0) / 100 * width),
                height: Math.max(1, Number(node?.layoutCellHeightPercent || 0) / 100 * height)
            }
        };
    };
    const corePosition = {
        center,
        bounds: {
            left: center.x - coreWidth / 2,
            top: center.y - coreHeight / 2,
            width: coreWidth,
            height: coreHeight
        }
    };
    pimConnectionPairs(source).forEach(pair => {
        const child = byId.get(pair.childId);
        const parent = pair.parentId === 'core' ? null : byId.get(pair.parentId);
        if (!child) return;
        const closingLine = !currentNodeIds.has(pair.childId)
            && closing.some(path => child.path === path
                || child.path.startsWith(`${path}.`)
                || child.path.startsWith(`${path}/`));
        if (!closingLine && !currentNodeIds.has(pair.childId)) return;
        const childPosition = position(child);
        const parentPosition = parent ? position(parent) : corePosition;
        const curve = pimConnectionCurve(
            pimHexEdgePoint(parentPosition.center, childPosition.center, parentPosition.bounds),
            pimHexEdgePoint(childPosition.center, parentPosition.center, childPosition.bounds),
            {
                bend: pair.depth > 1 ? .09 : .12,
                sign: pimConnectionCurveSign(pair.parentId, pair.childId)
            }
        );
        const active = selectedNodeId
            ? pimConnectionPathIsSelected(pair, selectedNodeId)
            : expanded.has(child.path)
                || Boolean(parent && expanded.has(parent.path))
                || hoverPath === child.path
                || hoverPath === parent?.path;
        const progress = closingLine ? 1 - bloom : child.depth > 0 ? bloom : 1;
        const end = quadraticPoint(curve.start, curve.control, curve.end, progress);
        context.save();
        context.globalAlpha = closingLine ? Math.max(0, .65 * (1 - bloom)) : active ? .65 : .36;
        const hue = Number.isFinite(Number(child.hue)) ? Number(child.hue) : pimNodeHue(child);
        context.strokeStyle = `hsla(${hue}, 58%, 82%, 1)`;
        context.lineWidth = 1.75;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.beginPath();
        context.moveTo(curve.start.x, curve.start.y);
        context.quadraticCurveTo(curve.control.x, curve.control.y, end.x, end.y);
        context.stroke();
        context.restore();
    });
}

export function drawPlantInformationHoneycomb(context, canvas, knowledge, expandedPaths = [], options = {}) {
    const width = canvas.width;
    const height = canvas.height;
    const expanded = new Set(expandedPaths);
    const closingPaths = [...new Set((Array.isArray(options.closingPaths) ? options.closingPaths : []).map(String))];
    const layoutOptions = {
        selectedNodeId: options.selectedNodeId,
        safeArea: options.safeArea,
        viewportWidth: options.viewportWidth,
        viewportHeight: options.viewportHeight,
        layoutWidth: options.layoutWidth || width,
        layoutHeight: options.layoutHeight || height,
        cellWidthPixels: options.cellWidthPixels || PIM_TEXTURE_CELL_WIDTH,
        cellHeightPixels: options.cellHeightPixels,
        gapPixels: options.gapPixels,
        topInset: options.topInset,
        bottomInset: options.bottomInset
    };
    const currentNodes = pimVisibleNodes(knowledge, expandedPaths, layoutOptions);
    const currentNodeIds = new Set(currentNodes.map(node => String(node.nodeId || node.path)));
    const renderPaths = [...new Set([...expanded, ...closingPaths])];
    const nodes = closingPaths.length
        ? pimVisibleNodes(knowledge, renderPaths, layoutOptions)
        : currentNodes;
    const centerPercent = nodes[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const center = { x: centerPercent.x / 100 * width, y: centerPercent.y / 100 * height };
    const reducedMotion = options.reducedMotion ?? (typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const bloom = reducedMotion ? 1 : Math.max(0, Math.min(1, Number(options.bloomProgress ?? 1)));
    const hoverPath = String(options.hoverPath || '');
    const position = node => {
        const point = pimNodeVisualPosition(node, node.depth > 0 ? bloom : 1);
        return { x: point.x / 100 * width, y: point.y / 100 * height };
    };

    context.clearRect(0, 0, width, height);
    const halo = context.createRadialGradient(center.x, center.y, 50, center.x, center.y, height * .46);
    halo.addColorStop(0, 'rgba(62, 115, 76, .07)');
    halo.addColorStop(.55, 'rgba(20, 48, 30, .02)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, width, height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineJoin = 'round';

    // Draw the single relationship layer first. Lines terminate at the
    // nearest hex edge and remain behind every label and cell surface.
    drawPimConnections(context, width, height, nodes, expanded, hoverPath, options.selectedNodeId, bloom, {
        currentNodeIds,
        closingPaths
    });

    nodes.forEach(node => {
        if (!currentNodeIds.has(String(node.nodeId || node.path))) return;
        const nodeBloom = node.depth > 0 ? bloom : 1;
        // position() already applies the single shared parent-to-child bloom
        // interpolation used by hit-testing; do not interpolate it again.
        const point = position(node);
        const open = expanded.has(node.path);
        const hovered = hoverPath === node.path;
        const selected = String(options.selectedNodeId || '') === node.path;
        const active = open || hovered || selected;
        const hue = pimNodeHue(node);
        const renderedRadius = Math.max(22, Number(node.layoutCellWidthPercent) / 100 * width / 2);
        // A hover/selection state changes only emphasis. Cell scale stays
        // authored so opening a branch never makes the existing flower jump.
        const radius = renderedRadius;
        context.save();
        context.globalAlpha = node.depth > 0 ? (.35 + .65 * nodeBloom) : 1;
        if (active) {
            context.shadowColor = `hsla(${hue}, 70%, 68%, .22)`;
            context.shadowBlur = 8;
        }
        drawHexagon(
            context,
            point.x,
            point.y,
            radius,
            `hsla(${hue}, 31%, 19%, ${active ? .58 : node.depth ? .42 : .22})`,
            `hsla(${hue}, 58%, 82%, ${active ? .98 : .72})`,
            active ? 4 : 2
        );
        context.restore();
        if (node.depth > 0 && nodeBloom < .72) return;
        context.fillStyle = '#fff';
        context.strokeStyle = 'rgba(0, 0, 0, .94)';
        context.lineWidth = 4;
        const titleFontSize = Math.max(node.depth ? 13 : 18, Math.min(node.depth ? 23 : 29, radius * (node.depth ? .25 : .31)));
        const titleLineHeight = Math.round(titleFontSize * 1.08);
        context.font = `650 ${titleFontSize}px system-ui, sans-serif`;
        const textWidth = Math.max(54, radius * 1.5);
        const titleLines = wrapLines(context, node.label, textWidth).slice(0, 2);
        const hasDescription = node.depth > 0 && Boolean(node.value);
        const titleStartY = point.y - radius * .43 + (titleLines.length - 1) * titleLineHeight * .5;
        drawOutlinedLines(context, titleLines, point.x, titleStartY, titleLineHeight);
        if (hasDescription) {
            const detailFontSize = Math.max(10, Math.min(19, titleFontSize * .66));
            const detailLineHeight = Math.round(detailFontSize * 1.2);
            context.font = `500 ${detailFontSize}px system-ui, sans-serif`;
            context.fillStyle = 'rgba(255, 255, 255, .96)';
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            drawWrappedText(context, node.value, point.x, point.y + radius * .11, textWidth, detailLineHeight, 2);
            context.shadowBlur = 0;
        }
    });

    const coreRadius = Math.max(22, Number(nodes[0]?.layoutCellWidthPercent || 13.9) / 100 * width / 2);
    context.save();
    context.shadowColor = 'rgba(76, 108, 166, .18)';
    context.shadowBlur = 8;
    drawHexagon(context, center.x, center.y, coreRadius, 'rgba(39, 58, 92, .78)', 'rgba(137, 165, 213, .82)', 4);
    context.restore();
    context.fillStyle = '#fff';
    context.strokeStyle = 'rgba(0, 0, 0, .94)';
    context.lineWidth = 5;
    const coreFontSize = Math.max(20, Math.min(36, coreRadius * .36));
    context.font = `650 ${coreFontSize}px system-ui, sans-serif`;
    const coreTitle = knowledge.title || knowledge.name || 'Plant';
    const coreLines = wrapLines(context, coreTitle, coreRadius * 1.54).slice(0, 2);
    drawOutlinedLines(context, coreLines, center.x, center.y - (coreLines.length - 1) * coreFontSize / 2, coreFontSize);
    // PIM placement is automatic above the orb; its surface has no recenter
    // control, so the former bottom arrow is deliberately not rendered.
    return;
}

/**
 * Create the spatial PIM texture through the same renderer used by Demo AR.
 * Keeping canvas creation and WebGL upload here prevents Creator from drifting
 * into a second presentation path when the mesh changes.
 */
export function createPlantInformationHoneycombTexture(gl, knowledge, expandedPaths = [], options = {}) {
    if (!gl || typeof document === 'undefined') return null;
    const size = pimHoneycombTextureSize(knowledge, expandedPaths, options);
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = size.width;
    textureCanvas.height = size.height;
    const context = textureCanvas.getContext('2d', { alpha: true });
    if (!context) return null;
    drawPlantInformationHoneycomb(context, textureCanvas, knowledge, expandedPaths, {
        ...options,
        layoutWidth: size.layoutWidth,
        layoutHeight: size.layoutHeight
    });
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
    return texture;
}

export function pimHoneycombTargetAtPercent(knowledge, expandedPaths, xPercent, yPercent, options = {}) {
    if (![xPercent, yPercent].every(Number.isFinite)) return null;
    const bloomProgress = Number.isFinite(Number(options.bloomProgress)) ? Number(options.bloomProgress) : 1;
    const nodes = pimVisibleNodes(knowledge, expandedPaths, {
        selectedNodeId: options.selectedNodeId,
        safeArea: options.safeArea,
        viewportWidth: options.viewportWidth,
        viewportHeight: options.viewportHeight,
        layoutWidth: options.layoutWidth || PIM_TEXTURE_SIZE.width,
        layoutHeight: options.layoutHeight || PIM_TEXTURE_SIZE.height,
        cellWidthPixels: options.cellWidthPixels || PIM_TEXTURE_CELL_WIDTH,
        cellHeightPixels: options.cellHeightPixels,
        gapPixels: options.gapPixels,
        topInset: options.topInset,
        bottomInset: options.bottomInset
    });
    const center = nodes[0]?.layoutCenterPosition || { x: 50, y: 50 };
    const coreWidth = Math.max(.1, Number(nodes[0]?.layoutCellWidthPercent || 0) / 2 * PIM_SPATIAL_CONFIG.colliderScale);
    const coreHeight = Math.max(.1, Number(nodes[0]?.layoutCellHeightPercent || 0) / 2 * PIM_SPATIAL_CONFIG.colliderScale);
    const coreDistance = Math.hypot(
        (xPercent - center.x) / coreWidth,
        (yPercent - center.y) / coreHeight
    );
    if (coreDistance <= 1) {
        return {
            pimCore: true,
            path: '',
            label: knowledge?.title || knowledge?.name || 'Plant',
            position: center
        };
    }
    return nodes
        .map(node => {
            const point = pimNodeVisualPosition(node, node.depth > 0 ? bloomProgress : 1);
            const halfWidth = Math.max(.1, Number(node.layoutCellWidthPercent) / 2 * PIM_SPATIAL_CONFIG.colliderScale);
            const halfHeight = Math.max(.1, Number(node.layoutCellHeightPercent) / 2 * PIM_SPATIAL_CONFIG.colliderScale);
            const normalizedDistance = Math.hypot(
                (xPercent - point.x) / halfWidth,
                (yPercent - point.y) / halfHeight
            );
            return { node, distance: normalizedDistance };
        })
        .sort((left, right) => left.distance - right.distance)
        .find(candidate => candidate.distance <= 1)?.node || null;
}
