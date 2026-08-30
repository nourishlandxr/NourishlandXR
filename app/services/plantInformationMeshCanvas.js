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

function measuredTextWidth(context, text) {
    const width = Number(context?.measureText?.(String(text || '')).width);
    return Number.isFinite(width) ? width : String(text || '').length * 8;
}

function splitLongWord(context, word, maxWidth) {
    if (measuredTextWidth(context, word) <= maxWidth) return [word];
    const chunks = [];
    let chunk = '';
    for (const character of Array.from(word)) {
        const candidate = `${chunk}${character}`;
        if (chunk && measuredTextWidth(context, candidate) > maxWidth) {
            chunks.push(chunk);
            chunk = character;
        } else {
            chunk = candidate;
        }
    }
    if (chunk) chunks.push(chunk);
    return chunks.length ? chunks : [word];
}

/**
 * Wrap PIM copy against the inner safe rectangle. Unlike the old helper this
 * also breaks a single long word, preserves intentional newlines and never
 * relies on a canvas max-width argument to clip an over-wide line.
 */
export function wrapPimTextLines(context, text, maxWidth) {
    const width = Math.max(1, Number(maxWidth) || 1);
    const paragraphs = String(text ?? '').split(/\r?\n/);
    const lines = [];
    paragraphs.forEach((paragraph, paragraphIndex) => {
        const words = paragraph.trim().split(/\s+/).filter(Boolean);
        if (!words.length) {
            if (paragraphIndex < paragraphs.length - 1) lines.push('');
            return;
        }
        let line = '';
        words.forEach(word => {
            splitLongWord(context, word, width).forEach((chunk, chunkIndex) => {
                const candidate = line
                    ? `${line}${chunkIndex === 0 ? ' ' : ''}${chunk}`
                    : chunk;
                if (line && measuredTextWidth(context, candidate) > width) {
                    lines.push(line);
                    line = chunk;
                } else {
                    line = candidate;
                }
            });
        });
        if (line) lines.push(line);
        if (paragraphIndex < paragraphs.length - 1) lines.push('');
    });
    while (lines.at(-1) === '') lines.pop();
    return lines;
}

export function pimHoneycombTextSafeArea(radius, options = {}) {
    const cellRadius = Math.max(1, Number(radius) || 1);
    const depth = Number(options.depth) || 0;
    return {
        width: cellRadius * (Number(options.widthFactor) || (depth ? 1.12 : 1.18)),
        height: cellRadius * (Number(options.heightFactor) || (depth ? .82 : .78))
    };
}

function fontSizeRange(radius, depth, options) {
    const cellRadius = Math.max(1, Number(radius) || 1);
    const titleScale = Number(options.titleScale) || (depth ? .25 : .31);
    const preferred = Number(options.maxTitleFontSize)
        || Math.min(depth ? 23 : 29, cellRadius * titleScale);
    const minimum = Number(options.minTitleFontSize)
        || Math.max(10, cellRadius * (depth ? .13 : .16));
    return {
        preferred: Math.max(1, preferred),
        minimum: Math.min(Math.max(1, minimum), Math.max(1, preferred))
    };
}

/**
 * Find a readable title/detail arrangement that fits the central rectangle
 * of a flat-top hexagon. The returned offsets are relative to the hex centre,
 * so the complete group stays vertically centred instead of pinning the
 * title and description to unrelated fixed y positions.
 */
export function fitPimTextBlock(context, options = {}) {
    const radius = Math.max(1, Number(options.radius) || 1);
    const depth = Number(options.depth) || 0;
    const title = String(options.title ?? '').trim();
    const detail = String(options.detail ?? '').trim();
    const hasDetail = Boolean(detail);
    const safeArea = pimHoneycombTextSafeArea(radius, options);
    const titleRange = fontSizeRange(radius, depth, options);
    const titleLinesLimit = Number.isFinite(Number(options.maxTitleLines))
        ? Math.max(1, Number(options.maxTitleLines))
        : Infinity;
    const detailLinesLimit = Number.isFinite(Number(options.maxDetailLines))
        ? Math.max(1, Number(options.maxDetailLines))
        : Infinity;
    const detailPreferred = Number(options.maxDetailFontSize)
        || Math.min(depth ? 17 : 19, titleRange.preferred * .64);
    const detailMinimum = Number(options.minDetailFontSize)
        || Math.max(8, radius * (depth ? .09 : .1));
    const gap = hasDetail ? Math.max(3, radius * (depth ? .035 : .028)) : 0;
    const step = .5;
    const titleLineHeightFor = size => Math.max(1, Math.round(size * 1.06));
    const detailLineHeightFor = size => Math.max(1, Math.round(size * 1.12));
    const build = (titleFontSize, detailFontSize) => {
        context.font = `650 ${titleFontSize}px system-ui, sans-serif`;
        const titleWidth = Math.max(1, safeArea.width - titleFontSize * .18);
        const titleLines = wrapPimTextLines(context, title, titleWidth);
        if (!titleLines.length || titleLines.length > titleLinesLimit) return null;
        const titleLineHeight = titleLineHeightFor(titleFontSize);
        let detailLines = [];
        let detailLineHeight = 0;
        if (hasDetail) {
            context.font = `500 ${detailFontSize}px system-ui, sans-serif`;
            const detailWidth = Math.max(1, safeArea.width - detailFontSize * .16);
            detailLines = wrapPimTextLines(context, detail, detailWidth);
            if (!detailLines.length || detailLines.length > detailLinesLimit) return null;
            detailLineHeight = detailLineHeightFor(detailFontSize);
        }
        const titleHeight = titleLines.length * titleLineHeight;
        const detailHeight = detailLines.length * detailLineHeight;
        const totalHeight = titleHeight + (hasDetail ? gap + detailHeight : 0);
        if (totalHeight > safeArea.height) return null;
        const titleOffsetY = -totalHeight / 2 + titleLineHeight / 2;
        return {
            titleLines,
            detailLines,
            titleFontSize,
            detailFontSize,
            titleLineHeight,
            detailLineHeight,
            titleOffsetY,
            detailOffsetY: titleOffsetY + titleHeight + gap + detailLineHeight / 2,
            safeWidth: safeArea.width,
            safeHeight: safeArea.height,
            totalHeight
        };
    };

    for (let titleFontSize = titleRange.preferred; titleFontSize >= titleRange.minimum; titleFontSize -= step) {
        const detailStart = hasDetail
            ? Math.max(detailMinimum, Math.min(detailPreferred, titleFontSize * .64))
            : 0;
        const detailEnd = hasDetail
            ? detailMinimum
            : 0;
        for (let detailFontSize = detailStart; hasDetail ? detailFontSize >= detailEnd : detailFontSize === 0; detailFontSize -= step) {
            const result = build(titleFontSize, detailFontSize);
            if (result) return result;
        }
    }

    // Only genuinely dense copy enters this range. Normal labels keep the
    // readable minimum above; unusually long content is reduced further until
    // all of its wrapped lines fit rather than being clipped or discarded.
    for (let titleFontSize = titleRange.minimum - step; titleFontSize >= 1; titleFontSize -= step) {
        const detailStart = hasDetail
            ? Math.max(1, Math.min(detailPreferred, titleFontSize * .64))
            : 0;
        for (let detailFontSize = detailStart; hasDetail ? detailFontSize >= 1 : detailFontSize === 0; detailFontSize -= step) {
            const result = build(titleFontSize, detailFontSize);
            if (result) return result;
        }
    }

    // Empty labels have no drawable lines, but still return a stable shape for
    // callers that render a partially authored PIM record.
    const fallbackTitleSize = Math.max(6, titleRange.minimum * .8);
    const fallbackDetailSize = hasDetail ? Math.max(6, Math.min(detailMinimum, fallbackTitleSize * .58)) : 0;
    return build(fallbackTitleSize, fallbackDetailSize) || {
        titleLines: wrapPimTextLines(context, title, Math.max(1, safeArea.width - fallbackTitleSize * .18)),
        detailLines: hasDetail ? wrapPimTextLines(context, detail, Math.max(1, safeArea.width - fallbackDetailSize * .16)) : [],
        titleFontSize: fallbackTitleSize,
        detailFontSize: fallbackDetailSize,
        titleLineHeight: titleLineHeightFor(fallbackTitleSize),
        detailLineHeight: hasDetail ? detailLineHeightFor(fallbackDetailSize) : 0,
        titleOffsetY: 0,
        detailOffsetY: 0,
        safeWidth: safeArea.width,
        safeHeight: safeArea.height,
        totalHeight: safeArea.height
    };
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
        const hasDescription = node.depth > 0 && Boolean(node.value);
        const textLayout = fitPimTextBlock(context, {
            title: node.label,
            detail: hasDescription ? node.value : '',
            radius,
            depth: node.depth
        });
        context.fillStyle = '#fff';
        context.strokeStyle = 'rgba(0, 0, 0, .94)';
        context.font = `650 ${textLayout.titleFontSize}px system-ui, sans-serif`;
        context.lineWidth = Math.max(2, Math.round(textLayout.titleFontSize * .13));
        drawOutlinedLines(
            context,
            textLayout.titleLines,
            point.x,
            point.y + textLayout.titleOffsetY,
            textLayout.titleLineHeight
        );
        if (textLayout.detailLines.length) {
            context.font = `500 ${textLayout.detailFontSize}px system-ui, sans-serif`;
            context.lineWidth = Math.max(1.5, Math.round(textLayout.detailFontSize * .1));
            context.fillStyle = 'rgba(255, 255, 255, .96)';
            context.shadowColor = 'transparent';
            context.shadowBlur = 0;
            drawOutlinedLines(
                context,
                textLayout.detailLines,
                point.x,
                point.y + textLayout.detailOffsetY,
                textLayout.detailLineHeight
            );
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
    const coreTitle = knowledge.title || knowledge.name || 'Plant';
    const coreTextLayout = fitPimTextBlock(context, {
        title: coreTitle,
        radius: coreRadius,
        maxTitleFontSize: 36,
        minTitleFontSize: Math.max(14, coreRadius * .18),
        titleScale: .36,
        widthFactor: 1.18,
        heightFactor: .78
    });
    const coreLines = coreTextLayout.titleLines;
    context.font = `650 ${coreTextLayout.titleFontSize}px system-ui, sans-serif`;
    context.lineWidth = Math.max(2, Math.round(coreTextLayout.titleFontSize * .14));
    drawOutlinedLines(context, coreLines, center.x, center.y + coreTextLayout.titleOffsetY, coreTextLayout.titleLineHeight);
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
