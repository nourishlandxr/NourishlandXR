// Keep simulated placement targets reachable when the movable Control panel crosses them.
export function avoidDemoPanelOverlap(anchor, markerRadiusPx, panelRect, viewportWidth, viewportHeight, gutterPx = 12) {
    if (!panelRect || viewportWidth <= 0 || viewportHeight <= 0) return anchor;
    const radius = Math.max(0, markerRadiusPx);
    const inset = radius + Math.max(0, gutterPx);
    const original = { x: Number(anchor.x) * viewportWidth / 100, y: Number(anchor.y) * viewportHeight / 100 };
    const bounds = {
        left: panelRect.left - inset,
        right: panelRect.right + inset,
        top: panelRect.top - inset,
        bottom: panelRect.bottom + inset
    };
    const overlaps = point => point.x > bounds.left && point.x < bounds.right && point.y > bounds.top && point.y < bounds.bottom;
    if (!overlaps(original)) return anchor;
    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
    const minX = radius, maxX = viewportWidth - radius;
    const minY = radius, maxY = viewportHeight - radius;
    const candidates = [
        { x: bounds.left, y: original.y },
        { x: bounds.right, y: original.y },
        { x: original.x, y: bounds.top },
        { x: original.x, y: bounds.bottom }
    ].map(point => ({ x: clamp(point.x, minX, maxX), y: clamp(point.y, minY, maxY) }))
        .filter(point => !overlaps(point));
    if (!candidates.length) return anchor;
    candidates.sort((left, right) =>
        Math.hypot(left.x - original.x, left.y - original.y) - Math.hypot(right.x - original.x, right.y - original.y));
    return { x: candidates[0].x / viewportWidth * 100, y: candidates[0].y / viewportHeight * 100 };
}
