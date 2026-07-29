function finitePosition(position) {
    if (!position || !['x', 'y', 'z'].every(axis => Number.isFinite(Number(position[axis])))) return null;
    return {
        x: Number(position.x),
        y: Number(position.y),
        z: Number(position.z)
    };
}

function subtractPosition(position, origin) {
    return {
        x: position.x - origin.x,
        y: position.y - origin.y,
        z: position.z - origin.z
    };
}

function addPosition(origin, offset) {
    return {
        x: origin.x + offset.x,
        y: origin.y + offset.y,
        z: origin.z + offset.z
    };
}

export function alignAreaToCheckpoint(records, checkpointId, checkpointWorldPosition) {
    const target = finitePosition(checkpointWorldPosition);
    const sourceRecords = Array.isArray(records) ? records : [];
    const checkpoint = sourceRecords.find(record => record?.marker?.id === checkpointId)
        || sourceRecords.find(record => record?.marker?.type === 'area_checkpoint');
    const checkpointStoredPosition = finitePosition(checkpoint?.anchorPosition || checkpoint?.position);
    if (!target || !checkpoint || !checkpointStoredPosition) {
        return { records: sourceRecords, checkpoint: null, origin: null };
    }

    const resolvedCheckpointId = checkpoint.marker.id;
    const alignedRecords = sourceRecords.map(record => {
        const storedPosition = finitePosition(record.anchorPosition || record.position);
        if (!storedPosition) return record;
        const alreadyCheckpointLocal = record.coordinateSpace === 'checkpoint-local'
            && (!record.checkpointId || record.checkpointId === resolvedCheckpointId);
        const checkpointLocalPosition = record.marker.id === resolvedCheckpointId
            ? { x: 0, y: 0, z: 0 }
            : alreadyCheckpointLocal
                ? storedPosition
                : subtractPosition(storedPosition, checkpointStoredPosition);
        return {
            ...record,
            position: addPosition(target, checkpointLocalPosition),
            anchorPosition: checkpointLocalPosition,
            coordinateSpace: 'checkpoint-local',
            checkpointId: resolvedCheckpointId
        };
    });

    return {
        records: alignedRecords,
        checkpoint: alignedRecords.find(record => record?.marker?.id === resolvedCheckpointId) || null,
        origin: target
    };
}
