const DEFAULT_NAMES = Object.freeze({
    plant: 'A living plant',
    note: 'A small observation',
    sub_checkpoint: 'Discovery point',
    area_checkpoint: 'New Area Totem',
    intro_checkpoint: 'Trail Entrance'
});

export function createMinimalMarkerDraft(type, overrides = {}) {
    const name = overrides.name || DEFAULT_NAMES[type] || 'New marker';
    return {
        name,
        type,
        description: overrides.description || '',
        relationships: Array.isArray(overrides.relationships) ? overrides.relationships : [],
        plant_profile: type === 'plant' ? { common_name: name, ...(overrides.plant_profile || {}) } : undefined,
        visibility: overrides.visibility || 'draft',
        status: overrides.status || 'draft'
    };
}

export function renameMinimalMarker(marker, name) {
    const cleanName = String(name || '').trim();
    if (!cleanName) return marker;
    return { ...marker, name: cleanName, plant_profile: marker.type === 'plant' ? { ...(marker.plant_profile || {}), common_name: cleanName } : marker.plant_profile };
}

export function relateMinimalMarkers(marker, relatedMarkerId, relationship = 'related') {
    if (!relatedMarkerId) return marker;
    const relationships = [...(marker.relationships || [])];
    if (!relationships.some(item => item.marker_id === relatedMarkerId && item.type === relationship)) relationships.push({ marker_id: relatedMarkerId, type: relationship });
    return { ...marker, relationships };
}
