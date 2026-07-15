import { API_BASE, apiFetch } from './apiClient.js';
const KEBAB_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const libraryCache = new Map();
const instanceCache = new Map();

async function requestJson(url, fallback, options = {}) {
    try {
        const response = await apiFetch(url, { headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, ...options });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
        return data;
    } catch (error) {
        if (options.method && options.method !== 'GET') throw error;
        console.warn(`[PlantData] ${url}: ${error.message}`);
        return fallback;
    }
}

function reportWarnings(warnings) {
    warnings.forEach(warning => console.warn(`[PlantData] ${warning}`));
    return warnings;
}

export function validatePlantLibrary(library = libraryCache.get('creator')) {
    const warnings = [];
    const plants = Array.isArray(library?.plants) ? library.plants : [];
    if (!Array.isArray(library?.plants)) warnings.push('Plant library does not contain a plants array.');
    const seen = new Set();
    plants.forEach((plant, index) => {
        if (!plant || typeof plant !== 'object') { warnings.push(`Plant record ${index + 1} is invalid.`); return; }
        if (!plant.id) warnings.push(`Plant record ${index + 1} is missing an ID.`);
        else {
            if (!KEBAB_ID.test(plant.id)) warnings.push(`Plant ID "${plant.id}" must use lowercase kebab-case.`);
            if (seen.has(plant.id)) warnings.push(`Duplicate plant ID: ${plant.id}.`);
            seen.add(plant.id);
        }
    });
    return reportWarnings(warnings);
}

export function validatePlantInstances(instanceData, library = libraryCache) {
    const warnings = [];
    const instances = Array.isArray(instanceData?.instances) ? instanceData.instances : [];
    const plantIds = new Set((library?.plants || []).map(plant => plant.id));
    if (!Array.isArray(instanceData?.instances)) warnings.push('Plant instance file does not contain an instances array.');
    const seen = new Set();
    instances.forEach((instance, index) => {
        if (!instance || typeof instance !== 'object') { warnings.push(`Plant instance ${index + 1} is invalid.`); return; }
        if (!instance.id) warnings.push(`Plant instance ${index + 1} is missing an ID.`);
        else if (seen.has(instance.id)) warnings.push(`Duplicate instance ID: ${instance.id}.`);
        if (instance.id) seen.add(instance.id);
        if (!instance.plantId || !plantIds.has(instance.plantId)) warnings.push(`Missing plant reference for instance ${instance.id || index + 1}: ${instance.plantId || 'blank'}.`);
        if (!instance.placeId) warnings.push(`Missing place ID for instance ${instance.id || index + 1}.`);
    });
    return reportWarnings(warnings);
}

export async function loadPlantLibrary(refresh = false, visitor = false) {
    const key = visitor ? 'visitor' : 'creator';
    if (!libraryCache.has(key) || refresh) {
        const query = visitor ? '?view=visitor' : '';
        const data = await requestJson(`${API_BASE}/plant-library${query}`, { version: 1, plants: [] });
        validatePlantLibrary(data);
        libraryCache.set(key, data);
    }
    return libraryCache.get(key);
}

export async function createPlantRecord(data) {
    const plant = await requestJson(`${API_BASE}/plant-library`, null, { method: 'POST', body: JSON.stringify(data) });
    libraryCache.clear();
    return plant;
}

export async function updatePlantRecord(plantId, data) {
    const plant = await requestJson(`${API_BASE}/plant-library/${encodeURIComponent(plantId)}`, null, { method: 'PUT', body: JSON.stringify(data) });
    libraryCache.clear();
    return plant;
}

export async function loadPlantInstances(projectId, siteId, refresh = false, visitor = false) {
    const key = `${visitor ? 'visitor' : 'creator'}:${projectId}/${siteId}`;
    if (!instanceCache.has(key) || refresh) {
        const query = visitor ? '?view=visitor' : '';
        const data = await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/plant-instances${query}`, { version: 1, instances: [] });
        const library = await loadPlantLibrary(refresh, visitor);
        validatePlantInstances(data, library);
        instanceCache.set(key, data);
    }
    return instanceCache.get(key);
}

export async function createPlantInstance(projectId, siteId, data) {
    const instance = await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/plant-instances`, null, { method: 'POST', body: JSON.stringify(data) });
    instanceCache.clear();
    return instance;
}

export async function updatePlantInstance(projectId, siteId, instanceId, data) {
    const instance = await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/plant-instances/${encodeURIComponent(instanceId)}`, null, { method: 'PUT', body: JSON.stringify(data) });
    instanceCache.clear();
    return instance;
}

export async function getPlantById(plantId, visitor = false) {
    return (await loadPlantLibrary(false, visitor)).plants.find(plant => plant.id === plantId) || null;
}

export async function getPlantInstanceById(instanceId, projectId = 'Hillyards', siteId = 'main_food_forest', visitor = false) {
    return (await loadPlantInstances(projectId, siteId, false, visitor)).instances.find(instance => instance.id === instanceId) || null;
}

export async function getInstancesByPlace(placeId, projectId = 'Hillyards', siteId = 'main_food_forest', visitor = false) {
    const target = String(placeId || '').toLowerCase();
    return (await loadPlantInstances(projectId, siteId, false, visitor)).instances.filter(instance => String(instance.placeId || '').toLowerCase() === target);
}

export async function getResolvedPlantInstance(instanceId, projectId = 'Hillyards', siteId = 'main_food_forest', visitor = false) {
    const instance = await getPlantInstanceById(instanceId, projectId, siteId, visitor);
    if (!instance) return null;
    const plant = await getPlantById(instance.plantId, visitor);
    if (!plant) return { instanceId: instance.id, ...instance, unresolved: true };
    return { ...plant, ...instance, instanceId: instance.id, plantId: plant.id, cultivar: instance.cultivarOverride || plant.cultivar || '', commonName: plant.commonName || '', scientificName: plant.scientificName || '' };
}

export async function loadResolvedPlantsForPlace(projectId, siteId, placeId, visitor = false) {
    const query = visitor ? '?view=visitor' : '';
    const payload = await requestJson(`${API_BASE}/projects/${encodeURIComponent(projectId)}/sites/${encodeURIComponent(siteId)}/places/${encodeURIComponent(placeId)}/plants${query}`, { version: 1, plants: [] });
    (payload.warnings || []).forEach(warning => console.warn(`[PlantData] ${warning}`));
    return Array.isArray(payload.plants) ? payload.plants : [];
}
