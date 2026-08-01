// Public language is intentionally separate from storage terminology. The
// legacy fields below are still accepted so saved records and relationships
// keep working while their labels move to the new vocabulary.

export const NXR_TERMINOLOGY = Object.freeze({
    totemMarker: 'Totem Marker',
    scanTotemMarker: 'Scan Totem Marker',
    totemIdentified: 'Totem identified',
    totemAlignment: 'Totem alignment',
    plantLiveTag: 'Plant Live Tag',
    scanPlantLiveTag: 'Scan Plant Live Tag',
    plantIdentified: 'Plant identified',
    createPlantLiveTag: 'Create Plant Live Tag',
    linkPlantLiveTag: 'Link Plant Live Tag'
});

const LEGACY_TAG_FIELDS = Object.freeze(['virtual_tag_enabled', 'virtualTagEnabled', 'virtual_tag', 'plant_tag', 'plantTag']);

export function migrateLegacyTagRecord(record = {}) {
    const migrated = { ...record };
    const isPlant = record.type === 'plant' || record.plantId || record.plantInstanceId;
    const legacyEnabled = LEGACY_TAG_FIELDS.some(field => record[field] === true);
    if (isPlant && legacyEnabled) migrated.tagRole = 'plant-live-tag';
    if (record.type === 'area_checkpoint' || record.semantic_type === 'area_checkpoint') migrated.markerRole = 'totem-marker';
    // IDs, physical anchors, parent relationships and legacy fields are all
    // retained. This is a read-time compatibility mapping, not a destructive
    // migration.
    return migrated;
}

export function publicMarkerLabel(type) {
    return type === 'area_checkpoint' ? NXR_TERMINOLOGY.totemMarker : type === 'plant' ? NXR_TERMINOLOGY.plantLiveTag : '';
}
