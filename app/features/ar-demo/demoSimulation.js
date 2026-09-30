import { DEMO_ORB_MATERIALS } from './demoContent.js';

export function simulatedAnchorStyle(anchor) {
    return `--marker-x:${Number(anchor.x).toFixed(2)}%;--marker-y:${Number(anchor.y).toFixed(2)}%`;
}

export function simulatedAnchorFromPointer(
    startAnchor,
    startX,
    startY,
    pointer,
    viewport,
    avoidAnchor = anchor => anchor,
    markerRadius = 32
) {
    const viewportWidth = Number(viewport?.width) || 320;
    const viewportHeight = Number(viewport?.height) || 640;
    const anchor = {
        x: Math.max(8, Math.min(92, Number(startAnchor?.x) + ((pointer.clientX - startX) / viewportWidth) * 100)),
        y: Math.max(12, Math.min(88, Number(startAnchor?.y) + ((pointer.clientY - startY) / viewportHeight) * 100))
    };
    return avoidAnchor(anchor, markerRadius);
}

export function demoOrbStyle(record) {
    return DEMO_ORB_MATERIALS[record?.demoOrbColor]?.style || '';
}
