import { currentTotemModel } from './spatialVisualSettings.js';
export const DEFAULT_TOTEM_COLOR = '#715a46';

export const TOTEM_STYLES = Object.freeze([
    Object.freeze({ id: 'basic', label: 'Bionic Pole', description: 'Turned timber post with a fluted sage ceramic crown' }),
    Object.freeze({ id: 'carved', label: 'Carved timber', description: 'Flowing timber with engraved controls' }),
    Object.freeze({ id: 'botanical', label: 'Botanical column', description: 'Quiet flutes and bronze leaf inlay' }),
    Object.freeze({ id: 'organic', label: 'Halo Stem', description: 'Slender timber pole with an open oval glass halo' }),
    Object.freeze({ id: 'sun', label: 'Sun Totem', secondary: true, color: '#ecc276', description: '1.35 m · Sunny clearings, flowering guilds and pollinator areas. A warm sun light in carved timber.' }),
    Object.freeze({ id: 'leaf', label: 'Leaf Totem', secondary: true, color: '#a5db8d', description: '1.35 m · Woodland edges, edible foliage and regeneration guilds. Light follows the leaf veins.' }),
    Object.freeze({ id: 'rock', label: 'Rock Totem', secondary: true, color: '#38d1dc', description: '1.35 m · Rock gardens, soil communities and water edges. A mineral light seam in stacked stone.' }),
    Object.freeze({ id: 'moon', label: 'Moon Totem', secondary: true, color: '#c2b4ef', description: '1.35 m · Shaded retreats, nocturnal life and reflection areas. A softly lit crescent.' }),
    Object.freeze({ id: 'flat-disc', label: 'Disk Totem', description: 'Flat round marker' })
]);
export const TOTEM_MODEL_CHOICES = Object.freeze(TOTEM_STYLES.filter(style=>style.id!=='flat-disc'));

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
    Object.freeze({ id: 'low', label: 'Low', metres: .92, halfHeightMetres: .46, previewPixels: 72 }),
    Object.freeze({ id: 'standard', label: 'Standard', metres: 1.2, halfHeightMetres: .6, previewPixels: 92 }),
    Object.freeze({ id: 'life-size', label: 'Life size', metres: 2, halfHeightMetres: 1, previewPixels: 152 }),
    Object.freeze({ id: 'tall', label: 'Tall', metres: 1.5, halfHeightMetres: .75, previewPixels: 116 }),
    Object.freeze({ id: 'secondary', label: 'Sub-area', metres: 1.35, halfHeightMetres: .675, previewPixels: 104 }),
    Object.freeze({ id: 'area', label: 'Main area', metres: 2.5, halfHeightMetres: 1.25, previewPixels: 190 })
]);

export function normalizeTotemHeightPreset(value) {
    const candidate = typeof value === 'string' ? value : value?.appearance?.heightPreset;
    return TOTEM_HEIGHT_PRESETS.some(preset => preset.id === candidate) ? candidate : 'standard';
}

export function totemHeightPreset(value) {
    if(typeof value==='object' && !value?.appearance?.heightPreset && TOTEM_MODEL_CHOICES.find(style=>style.id===renderedTotemStyle(value))?.secondary)return TOTEM_HEIGHT_PRESETS.find(preset=>preset.id==='secondary');
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

// Global experiments affect the standard post, without changing stored project data.
export function renderedTotemStyle(value){
    const stored=normalizeTotemStyle(value);
    if(value?.appearance?.totemStyleExplicit)return stored;
    return stored==='basic' ? currentTotemModel() : stored;
}
