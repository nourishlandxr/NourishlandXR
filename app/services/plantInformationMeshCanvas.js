import {
    PIM_SPATIAL_CONFIG,
    pimNodeHue,
    pimNodeVisualPosition,
    pimVisibleNodes
} from './plantInformationMesh.js';

export const PIM_TEXTURE_SIZE = Object.freeze({ width: 1440, height: 1080 });
export const PIM_BLOOM_DURATION_MS = 220;

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
    const center = { x: width / 2, y: height / 2 };
    const expanded = new Set(expandedPaths);
    const nodes = pimVisibleNodes(knowledge, expandedPaths, {
        selectedNodeId: options.selectedNodeId
    });
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
        const radius = (active ? 104 : 100) * (node.depth > 0 ? Math.max(.12, nodeBloom) : 1);
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
        context.font = `850 ${node.depth ? 23 : 29}px system-ui, sans-serif`;
        const titleLines = wrapLines(context, node.label, 148).slice(0, 3);
        const hasDescription = node.depth > 0 && Boolean(node.value);
        const startY = point.y + (hasDescription ? -28 : 0) - (titleLines.length - 1) * 14;
        drawOutlinedLines(context, titleLines, point.x, startY, 28);
        if (hasDescription) {
            context.font = '700 19px system-ui, sans-serif';
            context.fillStyle = 'rgba(255, 255, 255, .96)';
            context.shadowColor = 'rgba(0, 0, 0, .98)';
            context.shadowBlur = 7;
            drawWrappedText(context, node.value, point.x, startY + titleLines.length * 27 + 4, 150, 19, 3);
            context.shadowBlur = 0;
        }
    });

    context.save();
    context.shadowColor = 'rgba(76, 108, 166, .34)';
    context.shadowBlur = 18;
    drawHexagon(context, center.x, center.y, 100, 'rgba(39, 58, 92, .78)', 'rgba(137, 165, 213, .82)', 4);
    context.restore();
    context.fillStyle = '#fff';
    context.strokeStyle = 'rgba(0, 0, 0, .94)';
    context.lineWidth = 8;
    context.font = '850 36px system-ui, sans-serif';
    const coreTitle = knowledge.title || knowledge.name || 'Plant';
    const coreLines = wrapLines(context, coreTitle, 154).slice(0, 3);
    drawOutlinedLines(context, coreLines, center.x, center.y - (coreLines.length - 1) * 18, 36);
    // PIM placement is automatic above the orb; its surface has no recenter
    // control, so the former bottom arrow is deliberately not rendered.
    return;
    context.beginPath();
    context.arc(center.x, height * .94, 34, 0, Math.PI * 2);
    context.fillStyle = 'rgba(24, 29, 27, .68)';
    context.fill();
    context.strokeStyle = 'rgba(240, 246, 242, .46)';
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = '#fff';
    context.strokeStyle = 'rgba(0, 0, 0, .9)';
    context.lineWidth = 6;
    context.font = '700 44px system-ui, sans-serif';
    context.strokeText('↓', center.x, height * .94 + 2);
    context.fillText('↓', center.x, height * .94 + 2);
}

export function pimHoneycombTargetAtPercent(knowledge, expandedPaths, xPercent, yPercent, options = {}) {
    if (![xPercent, yPercent].every(Number.isFinite)) return null;
    const hitRadius = PIM_SPATIAL_CONFIG.cellWidthMetres / PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres * 50 * PIM_SPATIAL_CONFIG.colliderScale;
    const bloomProgress = Number.isFinite(Number(options.bloomProgress)) ? Number(options.bloomProgress) : 1;
    return pimVisibleNodes(knowledge, expandedPaths, {
        selectedNodeId: options.selectedNodeId,
        safeArea: options.safeArea
    })
        .map(node => {
            const point = pimNodeVisualPosition(node, node.depth > 0 ? bloomProgress : 1);
            return { node, distance: Math.hypot(xPercent - point.x, yPercent - point.y) };
        })
        .sort((left, right) => left.distance - right.distance)
        .find(candidate => candidate.distance <= hitRadius)?.node || null;
}
