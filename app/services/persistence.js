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
        if (response.ok && payload.trim()) {
            // The server answered 2xx with a non-JSON body (for example an HTML
            // fallback page from a rewrite). Keep data as null so list callers
            // coerce it safely, but log the reason instead of hiding it.
            console.warn(`[persistence] Non-JSON response from ${url} (${response.status})`);
        }
        data = null;
    }

    if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
    }

    return data;
}

const visitorQuery = visitor => visitor ? '?view=visitor' : '';
const asList = value => Array.isArray(value) ? value : [];

export async function loadProjects(visitor = false) {
    return asList(await requestJson(`${API_BASE}/projects${visitorQuery(visitor)}`));
}
export async function loadProject(projectId, visitor = false) {
    return requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}${visitorQuery(visitor)}`);
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
    return asList(await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites${visitorQuery(visitor)}`));
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
    return asList(await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places${visitorQuery(visitor)}`));
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
    try {
        return await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/plants`, { method: 'POST', body: JSON.stringify(plant) });
    } catch (error) {
        // Older hosted API deployments do not yet expose the specialised plant
        // route. A plant marker is a complete editable draft in V1, so retain
        // the placement flow instead of making AR depend on that newer route.
        if (!/route not found/i.test(error.message || '')) throw error;
        const name = String(plant.commonName || plant.name || 'New plant').trim() || 'New plant';
        const marker = await createPlaceMarker(projectId, siteId, placeId, {
            name,
            type: 'plant',
            description: plant.description || plant.summary || '',
            plantId: plant.plantId || '',
            plant_profile: {
                common_name: name,
                scientific_name: plant.scientificName || ''
            },
            visibility: plant.visibility || 'draft',
            status: plant.status || 'draft'
        });
        return { marker };
    }
}

const markerUrl = (projectId, siteId, placeId) => `${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/markers`;
export async function loadPlaceMarkers(projectId, siteId, placeId, visitor = false) { return asList(await requestJson(`${markerUrl(projectId, siteId, placeId)}${visitorQuery(visitor)}`)); }
export async function createPlaceMarker(projectId, siteId, placeId, marker) { return requestJson(markerUrl(projectId, siteId, placeId), { method: 'POST', body: JSON.stringify(marker) }); }
export async function updatePlaceMarker(projectId, siteId, placeId, markerId, marker) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'PUT', body: JSON.stringify(marker) }); }
export async function deletePlaceMarker(projectId, siteId, placeId, markerId) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`, { method: 'DELETE' }); }
export async function loadPlantProfile(projectId, siteId, placeId, markerId, visitor = false) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile${visitorQuery(visitor)}`); }
export async function savePlantProfile(projectId, siteId, placeId, markerId, profile) { return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/plant-profile`, { method: 'PUT', body: JSON.stringify(profile) }); }
export async function loadMarkerAnchor(projectId, siteId, placeId, markerId, visitor = false) {
    let anchor;
    try {
        anchor = await requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/anchor${visitorQuery(visitor)}`);
    } catch (error) {
        const markers = await loadPlaceMarkers(projectId, siteId, placeId, visitor);
        const marker = markers.find(item => item.id === markerId);
        if (!marker?.spatial_anchor) throw error;
        return marker.spatial_anchor;
    }
    if (anchor?.type === 'qr' && anchor.spatial_position) {
        return {
            ...anchor,
            type: 'spatial',
            position: anchor.spatial_position,
            coordinate_space: anchor.spatial_coordinate_space || 'session-local',
            checkpoint_id: anchor.spatial_checkpoint_id || '',
            rotation_degrees: anchor.spatial_rotation_degrees ?? anchor.rotation_degrees
        };
    }
    return anchor;
}
export async function saveMarkerAnchor(projectId, siteId, placeId, markerId, anchor) {
    const url = `${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/anchor`;
    try {
        return await requestJson(url, { method: 'PUT', body: JSON.stringify(anchor) });
    } catch (error) {
        const legacySpatialRejection = anchor?.type === 'spatial' && /unsupported|placement|spatial|anchor type|gps|qr/i.test(String(error?.message || ''));
        if (!legacySpatialRejection) throw error;
        const compatibleAnchor = {
            type: 'qr',
            qr_code: `nxr-spatial:${markerId}`,
            spatial_position: anchor.position,
            spatial_coordinate_space: anchor.coordinate_space || 'session-local',
            spatial_checkpoint_id: anchor.checkpoint_id || '',
            captured_at: anchor.captured_at,
            compatibility_format: 'nxr-spatial-v1'
        };
        try {
            const saved = await requestJson(url, { method: 'PUT', body: JSON.stringify(compatibleAnchor) });
            return { ...saved, ...anchor, compatibility_format: 'nxr-spatial-v1' };
        } catch {
            const markerRecordUrl = `${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}`;
            const savedMarker = await requestJson(markerRecordUrl, {
                method: 'PUT',
                body: JSON.stringify({ spatial_anchor: { ...anchor, compatibility_format: 'nxr-marker-spatial-v1' } })
            });
            return { ...anchor, marker_id: savedMarker.id || markerId, compatibility_format: 'nxr-marker-spatial-v1' };
        }
    }
}
export async function deleteMarkerAnchor(projectId, siteId, placeId, markerId) {
    return requestJson(`${markerUrl(projectId, siteId, placeId)}/${encodeURIComponent(markerId)}/anchor`, { method: 'DELETE' });
}

const demoMarkerUrl = markerId => `${API_BASE}/demo-markers${markerId ? `/${encodeURIComponent(markerId)}` : ''}`;
export async function loadDemoMarkers(visitor = false) { return asList(await requestJson(`${demoMarkerUrl()}${visitorQuery(visitor)}`)); }
export async function createDemoMarker(marker) { return requestJson(demoMarkerUrl(), { method: 'POST', body: JSON.stringify(marker) }); }
export async function updateDemoMarker(markerId, marker) { return requestJson(demoMarkerUrl(markerId), { method: 'PUT', body: JSON.stringify(marker) }); }
export async function deleteDemoMarker(markerId) { return requestJson(demoMarkerUrl(markerId), { method: 'DELETE' }); }
export async function loadDemoPlantProfile(markerId) { return requestJson(`${demoMarkerUrl(markerId)}/plant-profile`); }
export async function saveDemoPlantProfile(markerId, profile) { return requestJson(`${demoMarkerUrl(markerId)}/plant-profile`, { method: 'PUT', body: JSON.stringify(profile) }); }