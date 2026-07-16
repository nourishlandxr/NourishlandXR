import { API_BASE, apiFetch } from './apiClient.js';

async function requestJson(url, options = {}) {
    let response;
    try {
        response = await apiFetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options
        });
    } catch (error) {
        throw new Error(`Persistence server unavailable: ${error.message}`);
    }

    const payload = await response.text();
    let data = null;

    try {
        data = payload ? JSON.parse(payload) : null;
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
}

const visitorQuery = visitor => visitor ? '?view=visitor' : '';

export async function loadProjects(visitor = false) {
    return requestJson(`${API_BASE}/projects${visitorQuery(visitor)}`);
}
export async function loadProjectGpsMarkers(projectId, visitor = false) { return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/gps-markers${visitorQuery(visitor)}`); }

export async function createProjectOnDisk(projectData) {
    return requestJson(`${API_BASE}/projects`, {
        method: 'POST',
        body: JSON.stringify(projectData)
    });
}

export async function renameProjectOnDisk(projectId, projectData) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
        method: 'PUT',
        body: JSON.stringify(projectData)
    });
}

export async function deleteProjectOnDisk(projectId) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}`, {
        method: 'DELETE'
    });
}
export async function exportProject(projectId) {
    const response = await apiFetch(`${API_BASE}/projects/${encodeURIComponent(projectId)}/export`);
    if (!response.ok) throw new Error('Export failed');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = `${projectId}.zip`; link.click(); URL.revokeObjectURL(url);
}
export async function importProject(file, asCopy = false) {
    return requestJson(`${API_BASE}/projects/import`, { method: 'POST', headers: { 'Content-Type': 'application/zip', 'X-Import-As-Copy': String(asCopy) }, body: await file.arrayBuffer() });
}

export async function loadProjectSites(projectId, visitor = false) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites${visitorQuery(visitor)}`);
}

export async function createProjectSite(projectId, siteData) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites`, { method: 'POST', body: JSON.stringify(siteData) });
}

export async function updateProjectSite(projectId, siteId, siteData) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}`, { method: 'PUT', body: JSON.stringify(siteData) });
}

export async function deleteProjectSite(projectId, siteId) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}`, { method: 'DELETE' });
}

export async function loadSitePlaces(projectId, siteId, visitor = false) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places${visitorQuery(visitor)}`);
}

export async function createSitePlace(projectId, siteId, placeData) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places`, { method: 'POST', body: JSON.stringify(placeData) });
}

export async function updateSitePlace(projectId, siteId, placeId, placeData) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}`, { method: 'PUT', body: JSON.stringify(placeData) });
}

export async function deleteSitePlace(projectId, siteId, placeId) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}`, { method: 'DELETE' });
}

export async function createSpatialPlant(projectId, siteId, placeId, plant) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/plants`, { method: 'POST', body: JSON.stringify(plant) });
}

const markerUrl = (projectId, siteId, placeId) => `${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/markers`;
export async function loadPlaceMarkers(projectId, siteId, placeId, visitor = false) { return requestJson(`${markerUrl(projectId, siteId, placeId)}${visitorQuery(visitor)}`); }
export async function createPlaceMarker(projectId, siteId, placeId, marker) { return requestJson(markerUrl(projectId, siteId, placeId), { method: 'POST', body: JSON.stringify(marker) }); }
export async function updatePlaceMarker(projectId, siteId, placeId, markerId, marker) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'PUT', body: JSON.stringify(marker) }); }
export async function deletePlaceMarker(projectId, siteId, placeId, markerId) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'DELETE' }); }
export async function loadPlantProfile(projectId, siteId, placeId, markerId, visitor = false) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile${visitorQuery(visitor)}`); }
export async function savePlantProfile(projectId, siteId, placeId, markerId, profile) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile`, { method: 'PUT', body: JSON.stringify(profile) }); }
export async function loadMarkerAnchor(projectId, siteId, placeId, markerId, visitor = false) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/anchor${visitorQuery(visitor)}`); }
export async function saveMarkerAnchor(projectId, siteId, placeId, markerId, anchor) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/anchor`, { method: 'PUT', body: JSON.stringify(anchor) }); }

const demoMarkerUrl = markerId => `${API_BASE}/demo-markers${markerId ? `/${encodeURIComponent(markerId)}` : ''}`;
export async function loadDemoMarkers(visitor = false) { return requestJson(`${demoMarkerUrl()}${visitorQuery(visitor)}`); }
export async function createDemoMarker(marker) { return requestJson(demoMarkerUrl(), { method: 'POST', body: JSON.stringify(marker) }); }
export async function updateDemoMarker(markerId, marker) { return requestJson(demoMarkerUrl(markerId), { method: 'PUT', body: JSON.stringify(marker) }); }
export async function deleteDemoMarker(markerId) { return requestJson(demoMarkerUrl(markerId), { method: 'DELETE' }); }
export async function loadDemoPlantProfile(markerId) { return requestJson(`${demoMarkerUrl(markerId)}/plant-profile`); }
export async function saveDemoPlantProfile(markerId, profile) { return requestJson(`${demoMarkerUrl(markerId)}/plant-profile`, { method: 'PUT', body: JSON.stringify(profile) }); }

