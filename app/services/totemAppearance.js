export const DEFAULT_TOTEM_COLOR = '#68765d';

export const TOTEM_STYLES = Object.freeze([
    Object.freeze({ id: 'basic', label: 'Simple Totem', description: 'Carved organic post' }),
    Object.freeze({ id: 'organic', label: 'Light Bulb', description: 'Seedpod light marker' }),
    Object.freeze({ id: 'flat-disc', label: 'Disk Totem', description: 'Vertical round sign or mirror' })
]);

const LEGACY_TOTEM_STYLE_IDS = Object.freeze({ 'light-post': 'flat-disc' });

export const TOTEM_TONES = Object.freeze([
    Object.freeze({ id: 'moss', label: 'Moss', color: '#68765d' }),
    Object.freeze({ id: 'fern', label: 'Fern', color: '#526c55' }),
    Object.freeze({ id: 'sage', label: 'Sage', color: '#829078' }),
    Object.freeze({ id: 'clay', label: 'Clay', color: '#9a6b50' }),
    Object.freeze({ id: 'bark', label: 'Bark', color: '#6d5949' }),
    Object.freeze({ id: 'ochre', label: 'Ochre', color: '#967f50' }),
    Object.freeze({ id: 'stone', label: 'Stone', color: '#747970' }),
    Object.freeze({ id: 'earth-teal', label: 'Earth teal', color: '#506d68' })
]);

export const TOTEM_HEIGHT_PRESETS = Object.freeze([
    Object.freeze({ id: 'low', label: 'Low', metres: 1.05, halfHeightMetres: .525, previewPixels: 82 }),
    Object.freeze({ id: 'standard', label: 'Standard', metres: 1.36, halfHeightMetres: .68, previewPixels: 104 }),
    Object.freeze({ id: 'tall', label: 'Tall', metres: 1.72, halfHeightMetres: .86, previewPixels: 132 })
]);

export function normalizeTotemHeightPreset(value) {
    const candidate = typeof value === 'string' ? value : value?.appearance?.heightPreset;
    return TOTEM_HEIGHT_PRESETS.some(preset => preset.id === candidate) ? candidate : 'standard';
}

export function totemHeightPreset(value) {
    const id = normalizeTotemHeightPreset(value);
    return TOTEM_HEIGHT_PRESETS.find(preset => preset.id === id);
}

export function totemHeightScale(value) {
    return totemHeightPreset(value).halfHeightMetres / TOTEM_HEIGHT_PRESETS[1].halfHeightMetres;
}

export function normalizeTotemStyle(value) {
    const rawCandidate = typeof value === 'string'
        ? value
        : value?.appearance?.totemStyle || value?.appearance?.style;
    const candidate = LEGACY_TOTEM_STYLE_IDS[rawCandidate] || rawCandidate;
    return TOTEM_STYLES.some(style => style.id === candidate) ? candidate : 'basic';
}

export function totemStylePreset(value) {
    const id = normalizeTotemStyle(value);
    return TOTEM_STYLES.find(style => style.id === id);
}
