const API_BASE = `${window.location.protocol}//${window.location.host}/api`;

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json'
        },
        ...options
    });

    const payload = await response.text();
    let data = null;

    try {
        data = payload ? JSON.parse(payload) : null;
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.error || 'Request failed');
    }

    return data;
}

export async function loadSites() {
    return requestJson(`${API_BASE}/sites`);
}

export async function loadProjects() {
    return requestJson(`${API_BASE}/projects`);
}

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

export async function loadProjectSites(projectId) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites`);
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

export async function loadSitePlaces(projectId, siteId) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places`);
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

const markerUrl = (projectId, siteId, placeId) => `${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/markers`;
export async function loadPlaceMarkers(projectId, siteId, placeId) { return requestJson(markerUrl(projectId, siteId, placeId)); }
export async function createPlaceMarker(projectId, siteId, placeId, marker) { return requestJson(markerUrl(projectId, siteId, placeId), { method: 'POST', body: JSON.stringify(marker) }); }
export async function updatePlaceMarker(projectId, siteId, placeId, markerId, marker) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'PUT', body: JSON.stringify(marker) }); }
export async function deletePlaceMarker(projectId, siteId, placeId, markerId) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'DELETE' }); }
export async function loadPlantProfile(projectId, siteId, placeId, markerId) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile`); }
export async function savePlantProfile(projectId, siteId, placeId, markerId, profile) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile`, { method: 'PUT', body: JSON.stringify(profile) }); }

export async function loadSite(siteId) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}`);
}

export async function createSiteOnDisk(siteData) {
    return requestJson(`${API_BASE}/sites`, {
        method: 'POST',
        body: JSON.stringify(siteData)
    });
}

export async function updateSiteOnDisk(siteData) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteData.id)}`, {
        method: 'PUT',
        body: JSON.stringify(siteData)
    });
}

export async function createPlaceOnDisk(siteId, placeData) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations`, {
        method: 'POST',
        body: JSON.stringify(placeData)
    });
}

export async function updatePlaceOnDisk(siteId, placeData) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations/${encodeURIComponent(placeData.id)}`, {
        method: 'PUT',
        body: JSON.stringify(placeData)
    });
}

export async function deletePlaceOnDisk(siteId, placeId) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations/${encodeURIComponent(placeId)}`, {
        method: 'DELETE'
    });
}

export async function createAssetOnDisk(siteId, placeId, assetData) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations/${encodeURIComponent(placeId)}/assets`, {
        method: 'POST',
        body: JSON.stringify(assetData)
    });
}

export async function updateAssetOnDisk(siteId, placeId, assetData) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations/${encodeURIComponent(placeId)}/assets/${encodeURIComponent(assetData.id)}`, {
        method: 'PUT',
        body: JSON.stringify(assetData)
    });
}

export async function deleteAssetOnDisk(siteId, placeId, assetId) {
    return requestJson(`${API_BASE}/sites/${encodeURIComponent(siteId)}/locations/${encodeURIComponent(placeId)}/assets/${encodeURIComponent(assetId)}`, {
        method: 'DELETE'
    });
}
