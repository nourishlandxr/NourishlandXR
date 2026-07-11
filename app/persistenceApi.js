import { createPlace, createMarker, deletePlace, deleteMarker, loadSite, loadSiteList, saveSite, updatePlace, updateMarker } from './persistence.js';

export function handlePersistenceAction(action, payload) {
    const projectName = payload.projectName || 'Hillyards';

    switch (action) {
        case 'loadSite':
            return loadSite(projectName);
        case 'loadSiteList':
            return loadSiteList();
        case 'saveSite':
            return saveSite(projectName, payload.siteData);
        case 'createPlace':
            return createPlace(projectName, payload.placeData);
        case 'updatePlace':
            return updatePlace(projectName, payload.placeData);
        case 'deletePlace':
            return deletePlace(projectName, payload.placeId);
        case 'createMarker':
            return createMarker(projectName, payload.placeId, payload.markerData);
        case 'updateMarker':
            return updateMarker(projectName, payload.placeId, payload.markerData);
        case 'deleteMarker':
            return deleteMarker(projectName, payload.placeId, payload.markerId);
        default:
            return loadSite(projectName);
    }
}