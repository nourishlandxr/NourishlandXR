const API_BASE = '/api';

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
