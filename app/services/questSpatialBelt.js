export const QUEST_SPATIAL_BELT_ACTIONS = Object.freeze([
    Object.freeze({ id: 'plant', label: 'PLANT', symbol: '+', color: '#527a4d' }),
    Object.freeze({ id: 'note', label: 'NOTE', symbol: 'N', color: '#8a654d' }),
    Object.freeze({ id: 'special', label: 'SPECIAL', symbol: '\u25C6', color: '#8c7544' }),
    Object.freeze({ id: 'view', label: 'VIEW', symbol: '\u25C9', color: '#4b7184' }),
    Object.freeze({ id: 'move', label: 'MOVE', symbol: '\u270B', color: '#7b6547' }),
    Object.freeze({ id: 'pointer', label: 'AIM', symbol: '\u27A4', color: '#4d7482' }),
    Object.freeze({ id: 'web', label: 'WEB', symbol: '\u21B5', color: '#3973a2' })
]);

export function isTrackedHeadsetInputSource(source) {
    return Boolean(source && (source.targetRayMode === 'tracked-pointer' || source.hand));
}

export function questSpatialBeltLayout(viewerMatrix, options = {}) {
    if (!viewerMatrix || viewerMatrix.length < 16) return [];
    const distance = Number(options.distance) || .92;
    const drop = Number(options.drop) || .58;
    const spacing = Number(options.spacing) || .17;
    const curve = Number(options.curve) || .025;
    const forwardLength = Math.hypot(viewerMatrix[8], viewerMatrix[10]) || 1;
    const rightLength = Math.hypot(viewerMatrix[0], viewerMatrix[2]) || 1;
    const forward = { x: -viewerMatrix[8] / forwardLength, z: -viewerMatrix[10] / forwardLength };
    const right = { x: viewerMatrix[0] / rightLength, z: viewerMatrix[2] / rightLength };
    const camera = { x: viewerMatrix[12], y: viewerMatrix[13], z: viewerMatrix[14] };
    return QUEST_SPATIAL_BELT_ACTIONS.map((action, index) => {
        const slot = index - (QUEST_SPATIAL_BELT_ACTIONS.length - 1) / 2;
        const edgeCurve = Math.pow(Math.abs(slot) / 3, 2) * curve;
        return {
            ...action,
            index,
            radius: .105,
            position: {
                x: camera.x + forward.x * (distance - edgeCurve) + right.x * slot * spacing,
                y: camera.y - drop - edgeCurve * .65,
                z: camera.z + forward.z * (distance - edgeCurve) + right.z * slot * spacing
            }
        };
    });
}

export function questSpatialBeltRayTarget(ray, layout) {
    if (!ray?.origin || !ray?.direction || !Array.isArray(layout)) return null;
    return layout.map(button => {
        const offset = {
            x: button.position.x - ray.origin.x,
            y: button.position.y - ray.origin.y,
            z: button.position.z - ray.origin.z
        };
        const along = offset.x * ray.direction.x + offset.y * ray.direction.y + offset.z * ray.direction.z;
        if (along <= 0) return { button, along: Infinity, miss: Infinity };
        const closest = {
            x: ray.origin.x + ray.direction.x * along,
            y: ray.origin.y + ray.direction.y * along,
            z: ray.origin.z + ray.direction.z * along
        };
        return {
            button,
            along,
            miss: Math.hypot(
                button.position.x - closest.x,
                button.position.y - closest.y,
                button.position.z - closest.z
            )
        };
    }).filter(candidate => candidate.miss <= candidate.button.radius)
        .sort((left, right) => left.along - right.along)[0]?.button || null;
}
