import {
    PIM_SPATIAL_CONFIG,
    pimNodeHue,
    pimNodeVisualPosition,
    pimVisibleNodes
} from './plantInformationMesh.js';

export const PIM_TEXTURE_SIZE = Object.freeze({ width: 1440, height: 1080 });
export const PIM_BLOOM_DURATION_MS = 220;
export const PIM_TEXTURE_CELL_WIDTH = 200;

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

export function drawPlantInformationHoneycomb(context, canvas, knowledge, expandedPaths = [], options = {}) {
    const width = canvas.width;
    const height = canvas.height;
    const expanded = new Set(expandedPaths);
    const nodes = pimVisibleNodes(knowledge, expandedPaths, {
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
    });
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

    nodes.forEach(node => {
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
        const radius = renderedRadius * (active ? 1.035 : 1) * (node.depth > 0 ? Math.max(.12, nodeBloom) : 1);
        context.save();
        if (active) {
            context.shadowColor = `hsla(${hue}, 70%, 68%, .46)`;
            context.shadowBlur = 22;
        }
        drawHexagon(
            context,
            point.x,
            point.y,
            radius,
            `hsla(${hue}, 31%, 19%, ${active ? .58 : node.depth ? .42 : .22})`,
            `hsla(${hue}, 58%, 82%, ${active ? .98 : .72})`,
            active ? 5 : 3
        );
        context.restore();
        if (node.depth > 0 && nodeBloom < .72) return;
        context.fillStyle = '#fff';
        context.strokeStyle = 'rgba(0, 0, 0, .94)';
        context.lineWidth = 7;
        const titleFontSize = Math.max(18, Math.min(node.depth ? 23 : 29, radius * (node.depth ? .25 : .31)));
        const titleLineHeight = Math.round(titleFontSize * 1.08);
        context.font = `850 ${titleFontSize}px system-ui, sans-serif`;
        const textWidth = Math.max(54, radius * 1.5);
        const titleLines = wrapLines(context, node.label, textWidth).slice(0, 3);
        const hasDescription = node.depth > 0 && Boolean(node.value);
        const startY = point.y + (hasDescription ? -titleLineHeight : 0) - (titleLines.length - 1) * titleLineHeight / 2;
        drawOutlinedLines(context, titleLines, point.x, startY, titleLineHeight);
        if (hasDescription) {
            const detailFontSize = Math.max(15, Math.min(19, radius * .2));
            const detailLineHeight = Math.round(detailFontSize * 1.06);
            context.font = `700 ${detailFontSize}px system-ui, sans-serif`;
            context.fillStyle = 'rgba(255, 255, 255, .96)';
            context.shadowColor = 'rgba(0, 0, 0, .98)';
            context.shadowBlur = 7;
            drawWrappedText(context, node.value, point.x, startY + titleLines.length * titleLineHeight + 4, textWidth, detailLineHeight, 3);
            context.shadowBlur = 0;
        }
    });

    const coreRadius = Math.max(22, Number(nodes[0]?.layoutCellWidthPercent || 13.9) / 100 * width / 2);
    context.save();
    context.shadowColor = 'rgba(76, 108, 166, .34)';
    context.shadowBlur = 18;
    drawHexagon(context, center.x, center.y, coreRadius, 'rgba(39, 58, 92, .78)', 'rgba(137, 165, 213, .82)', 4);
    context.restore();
    context.fillStyle = '#fff';
    context.strokeStyle = 'rgba(0, 0, 0, .94)';
    context.lineWidth = 8;
    const coreFontSize = Math.max(20, Math.min(36, coreRadius * .36));
    context.font = `850 ${coreFontSize}px system-ui, sans-serif`;
    const coreTitle = knowledge.title || knowledge.name || 'Plant';
    const coreLines = wrapLines(context, coreTitle, coreRadius * 1.54).slice(0, 3);
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
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = Number(options.width) || PIM_TEXTURE_SIZE.width;
    textureCanvas.height = Number(options.height) || PIM_TEXTURE_SIZE.height;
    const context = textureCanvas.getContext('2d', { alpha: true });
    if (!context) return null;
    drawPlantInformationHoneycomb(context, textureCanvas, knowledge, expandedPaths, options);
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
    return pimVisibleNodes(knowledge, expandedPaths, {
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
    })
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
