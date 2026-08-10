function finitePosition(position) {
    if (!position || !['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])))) return null;
    return {
        x: Number(position.x),
        y: Number(position.y),
        z: Number(position.z)
    };
}

function round(value) {
    const result = Math.round(Number(value) * 1000) / 1000;
    return Object.is(result, -0) ? 0 : result;
}

function headingDegrees(x, z) {
    return (Math.atan2(x, -z) * 180 / Math.PI + 360) % 360;
}

export function createTotemLinkCalibration(source, target, options = {}) {
    const sourcePosition = finitePosition(source?.position || source);
    const targetPosition = finitePosition(target?.position || target);
    if (!sourcePosition || !targetPosition) return null;
    const relativePosition = {
        x: round(targetPosition.x - sourcePosition.x),
        y: round(targetPosition.y - sourcePosition.y),
        z: round(targetPosition.z - sourcePosition.z)
    };
    const distance = Math.hypot(relativePosition.x, relativePosition.z);
    if (distance < .1) return null;
    return {
        version: 1,
        frame: 'session-local',
        source_totem_id: String(source?.marker?.id || source?.id || '').trim(),
        target_totem_id: String(target?.marker?.id || target?.id || '').trim(),
        relative_position: relativePosition,
        distance_m: round(distance),
        heading_degrees: round(headingDegrees(relativePosition.x, relativePosition.z)),
        captured_at: options.capturedAt || new Date().toISOString()
    };
}

export function reverseTotemLinkCalibration(calibration) {
    const relative = finitePosition(calibration?.relative_position);
    if (!relative) return null;
    return {
        ...calibration,
        source_totem_id: String(calibration.target_totem_id || '').trim(),
        target_totem_id: String(calibration.source_totem_id || '').trim(),
        relative_position: {
            x: round(-relative.x),
            y: round(-relative.y),
            z: round(-relative.z)
        },
        heading_degrees: round(headingDegrees(-relative.x, -relative.z))
    };
}

export function applyTotemLinkCalibration(sourcePosition, calibration) {
    const source = finitePosition(sourcePosition);
    const relative = finitePosition(calibration?.relative_position);
    if (!source || !relative) return null;
    return {
        x: source.x + relative.x,
        y: source.y + relative.y,
        z: source.z + relative.z
    };
}
