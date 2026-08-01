/*
 * Global AR experience policy used by every creator project.
 * Projects store content and anchors; they do not redefine this interface.
 */
export const DEFAULT_HOME_AREA_NAME = 'Home';
export const isDefaultHomeArea = area => area?.systemKey === 'home'
    || ['home', 'unassigned'].includes(String(area?.name || area || '').trim().toLocaleLowerCase());
export const AREA_ICON_OPTIONS = Object.freeze([
    { value: '🌿', label: 'Leaves' },
    { value: '🌳', label: 'Tree' },
    { value: '🪴', label: 'Potted plant' },
    { value: '🍎', label: 'Fruit' },
    { value: '🌻', label: 'Flower' },
    { value: '💧', label: 'Water' },
    { value: '🪨', label: 'Stone' },
    { value: '🐝', label: 'Pollinators' },
    { value: '🧭', label: 'Explore' }
]);
export const areaIcon = area => AREA_ICON_OPTIONS.some(option => option.value === area?.icon) ? area.icon : AREA_ICON_OPTIONS[0].value;

export const AR_EXPERIENCE_CONFIG = Object.freeze({
    placementDistanceMetres: 1,
    // Notes use the same measured one-metre ray, but their DOM preview stays
    // hidden until that point can be projected into the live AR view.
    notePlacementDistanceMetres: 1,
    defaultSite: Object.freeze({
        name: 'Main Location',
        description: 'Primary Location for this project.',
        visibility: 'draft'
    }),
    fallbackArea: Object.freeze({
        name: DEFAULT_HOME_AREA_NAME,
        systemKey: 'home',
        // Home is the built-in holding Area for records not assigned elsewhere.
        // "Unassigned" remains a recognized legacy name.
        type: 'Other',
        description: 'Default Home for content ready to organise or place later.',
        visibility: 'draft'
    }),
    markerTypes: Object.freeze(['plant', 'sub_checkpoint', 'note', 'intro_checkpoint', 'area_checkpoint'])
});
