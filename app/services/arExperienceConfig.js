/*
 * Global AR experience policy used by every creator project.
 * Projects store content and anchors; they do not redefine this interface.
 */
export const DEFAULT_HOME_AREA_NAME = 'Home';
export const isDefaultHomeArea = area => ['home', 'unassigned'].includes(String(area?.name || area || '').trim().toLocaleLowerCase());

export const AR_EXPERIENCE_CONFIG = Object.freeze({
    placementDistanceMetres: 1,
    defaultSite: Object.freeze({
        name: 'Main Location',
        description: 'Primary Location for this project.',
        visibility: 'draft'
    }),
    fallbackArea: Object.freeze({
        name: DEFAULT_HOME_AREA_NAME,
        // Home is the built-in holding Area for records not assigned elsewhere.
        // "Unassigned" remains a recognized legacy name.
        type: 'Other',
        description: 'Default Home for content ready to organise or place later.',
        visibility: 'draft'
    }),
    markerTypes: Object.freeze(['plant', 'sub_checkpoint', 'note', 'intro_checkpoint', 'area_checkpoint'])
});
