import { API_BASE, apiFetch } from './apiClient.js';
import { loadProject, loadProjectSites, loadSitePlaces, loadPlaceMarkers, loadPlantProfile, loadMarkerAnchor, renameProjectOnDisk, createPlaceMarker, createSitePlace } from './persistence.js';
import { recordKey, physicalTagSignature } from './creatorWorkspaceMode.js';
import { loadFieldPackage, saveFieldPackage, loadFieldOperations, saveFieldOperation, removeFieldOperation } from './creatorWorkspaceStore.js';
import { resolvePlantPim } from './pimLegacyAdapter.js';
import { pimAddNode } from './pimModel.js';

export async function concurrent(items, worker, limit = 6) {
    let next = 0;
    const results = new Array(items.length);
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) { const index = next++; results[index] = await worker(items[index], index); }
    }));
    return results;
}

export async function loadCreatorWorkspace(projectId) {
    try {
        const [project, sites] = await Promise.all([loadProject(projectId), loadProjectSites(projectId)]);
        const groups = await concurrent(sites, async site => {
            const places = await loadSitePlaces(projectId, site.id);
            return concurrent(places, async place => ({ site, place, markers: await loadPlaceMarkers(projectId, site.id, place.id) }));
        });
        const areas = groups.flat().map(group => ({ ...group.place, siteId: group.site.id, siteName: group.site.name }));
        const entries = groups.flat().flatMap(group => group.markers.map(marker => {
            const entry = { marker, place: group.place, siteId: group.site.id, siteName: group.site.name };
            return { ...entry, key: recordKey(entry) };
        }));
        return { project, sites, areas, entries, profiles: {}, anchors: {}, offline: false };
    } catch (error) {
        const snapshot = await loadFieldPackage(projectId).catch(() => null);
        if (!snapshot) throw error;
        return { ...snapshot.model, offline: true, preparedAt: snapshot.preparedAt, loadError: error.message };
    }
}

export async function entryProfile(model, entry) {
    if (entry.marker.type !== 'plant') return {};
    if (model.profiles[entry.key]) return model.profiles[entry.key];
    if (model.offline) throw new Error('This profile was not included in the prepared field package.');
    const profile = await loadPlantProfile(model.project.id, entry.siteId, entry.place.id, entry.marker.id);
    model.profiles[entry.key] = profile;
    return profile;
}

export async function entryAnchor(model, entry) {
    if (Object.hasOwn(model.anchors, entry.key)) return model.anchors[entry.key];
    if (model.offline) return null;
    try { model.anchors[entry.key] = await loadMarkerAnchor(model.project.id, entry.siteId, entry.place.id, entry.marker.id); }
    catch (error) { if (error.status !== 404) throw error; model.anchors[entry.key] = null; }
    return model.anchors[entry.key];
}

export async function saveWorkspaceRecord(model, entry, { markerChanges = {}, profileChanges = {}, targetAreaId = entry.place.id } = {}) {
    if (model.offline) throw new Error('Reconnect to edit database records. Field checks and observations can be saved locally.');
    const profile = Object.keys(profileChanges).length ? await entryProfile(model, entry) : null;
    const context = [model.project.id, entry.siteId, entry.place.id, entry.marker.id].map(encodeURIComponent).join('/');
    const response = await apiFetch(`${API_BASE}/workspace-record/${context}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markerChanges, profileChanges, targetAreaId,
            expectedMarkerModified: entry.marker.modified || '',
            ...(profile ? { expectedProfileRevision: Number(profile.revision || 0) } : {}) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result.error || `Record could not save (${response.status}).`); error.status = response.status; throw error; }
    const oldKey = entry.key;
    entry.marker = result.marker;
    entry.place = model.areas.find(area => area.siteId === entry.siteId && area.id === result.placeId) || entry.place;
    entry.key = recordKey(entry);
    if (result.profile) model.profiles[entry.key] = result.profile;
    if (entry.key !== oldKey) { delete model.profiles[oldKey]; model.anchors[entry.key] = model.anchors[oldKey]; delete model.anchors[oldKey]; }
    return entry;
}

export async function createWorkspaceRecord(model, { name, scientificName = '', type = 'plant', siteId, areaId }) {
    const marker = await createPlaceMarker(model.project.id, siteId, areaId, {
        id: `record-${crypto.randomUUID()}`, name, type, visibility: 'draft', status: 'draft',
        plant_profile: type === 'plant' ? { common_name: name, scientific_name: scientificName } : undefined
    });
    const place = model.areas.find(area => area.siteId === siteId && area.id === areaId);
    const entry = { marker, place, siteId, siteName: model.sites.find(site => site.id === siteId)?.name };
    entry.key = recordKey(entry); model.entries.push(entry); return entry;
}

export async function createWorkspaceArea(model, siteId, name) {
    const area = await createSitePlace(model.project.id, siteId, { id: `area-${crypto.randomUUID()}`, name, type: 'Other', visibility: 'draft' });
    model.areas.push({ ...area, siteId, siteName: model.sites.find(site => site.id === siteId)?.name });
    return area;
}

export async function prepareCreatorFieldPackage(model, onProgress = () => {}) {
    if (model.offline) throw new Error('Reconnect to prepare current project records.');
    let completed = 0;
    onProgress(0, model.entries.length);
    await concurrent(model.entries, async entry => {
        await Promise.all([entryProfile(model, entry), entryAnchor(model, entry)]);
        onProgress(++completed, model.entries.length);
    });
    const snapshot = { projectId: model.project.id, preparedAt: new Date().toISOString(), model: structuredClone(model) };
    await saveFieldPackage(snapshot);
    return snapshot;
}

export async function updatePreparedPackage(model) {
    const existing = await loadFieldPackage(model.project.id).catch(() => null);
    if (existing) {
        const keys = new Set(model.entries.map(entry => entry.key));
        const retained = name => Object.fromEntries(Object.entries({ ...existing.model[name], ...model[name] }).filter(([key]) => keys.has(key)));
        await saveFieldPackage({ ...existing, model: structuredClone({ ...model, profiles: retained('profiles'), anchors: retained('anchors') }) });
    }
}

export async function savePlanPoint(model, entry, point) {
    const fresh = await loadProject(model.project.id);
    if ((fresh.modified || '') !== (model.project.modified || '')) throw new Error('Project settings changed elsewhere. Reload before editing the plan.');
    const siteMap = { ...fresh.siteMap, areaPoints: { ...fresh.siteMap?.areaPoints, [`${entry.siteId}/${entry.place.id}`]: { ...point, positionSource: 'manual', locked: true } } };
    model.project = await renameProjectOnDisk(model.project.id, { ...fresh, preserveId: true, siteMap, _expectedModified: fresh.modified || '' });
}

export async function queueFieldResult(model, entry, { kind, note = '', photo = '' }) {
    if (!['tag-association', 'observation'].includes(kind)) throw new Error('Unsupported field result.');
    if (kind === 'tag-association' && !entry.marker.physicalAnchor?.enabled) throw new Error('Assign a printed tag before checking its association.');
    if (kind === 'observation' && !note.trim()) throw new Error('Add an observation before saving.');
    const operation = { id: crypto.randomUUID(), projectId: model.project.id, key: entry.key, siteId: entry.siteId, placeId: entry.place.id,
        markerId: entry.marker.id, createdAt: new Date().toISOString(), kind, note: note.trim(), photo,
        signature: physicalTagSignature(entry.marker), status: 'pending' };
    await saveFieldOperation(operation);
    return operation;
}

const syncRuns = new Map();
export function syncCreatorFieldResults(projectId) {
    if (syncRuns.has(projectId)) return syncRuns.get(projectId);
    const promise = performSync(projectId).finally(() => syncRuns.delete(projectId));
    syncRuns.set(projectId, promise); return promise;
}

async function performSync(projectId) {
    const results = { synced: 0, conflicts: 0, pending: 0 };
    const model = await loadCreatorWorkspace(projectId);
    if (model.offline) return { ...results, pending: (await loadFieldOperations(projectId)).length };
    for (const operation of await loadFieldOperations(projectId)) {
        if (operation.status === 'conflict') { results.conflicts++; continue; }
        const entry = model.entries.find(item => item.key === operation.key);
        if (!entry || physicalTagSignature(entry.marker) !== operation.signature) {
            await saveFieldOperation({ ...operation, status: 'conflict', error: !entry ? 'The record moved or was removed. Review its destination.' : 'The printed tag assignment changed. Review this field result.' });
            results.conflicts++; continue;
        }
        try {
            const work = entry.marker.field_work || {};
            const checks = work.checks || [];
            const observations = work.observations || [];
            const profileChanges = {};
            const target = operation.kind === 'tag-association' ? checks : observations;
            if (!target.some(result => result.id === operation.id)) {
                const event = { id: operation.id, kind: operation.kind, checkedAt: operation.createdAt, signature: operation.signature, note: operation.note, photo: operation.photo };
                const nextWork = { ...work, [operation.kind === 'tag-association' ? 'checks' : 'observations']: [...target, event] };
                if (operation.kind === 'observation' && entry.marker.type === 'plant') {
                    const profile = await entryProfile(model, entry);
                    let document = resolvePlantPim(profile, { id: entry.marker.plantId || entry.marker.id, commonName: profile.common_name || entry.marker.name });
                    const parent = document.nodes.find(node => !node.parentId && node.id === 'scientific-information') || document.nodes.find(node => !node.parentId);
                    document = pimAddNode(document, { id: `field-${operation.id}`, parentId: parent.id, title: 'Field observation', body: operation.note,
                        informationType: 'local_observation', knowledgeScope: 'specimen', specimenId: `${projectId}/${entry.siteId}/${entry.place.id}/${entry.marker.id}`,
                        status: 'draft', evidenceStatus: 'local_observation', media: operation.photo ? [{ type: 'image', url: operation.photo }] : [], createdAt: operation.createdAt });
                    profileChanges.pim_document = document;
                }
                await saveWorkspaceRecord(model, entry, { markerChanges: { field_work: nextWork }, profileChanges });
            }
            await removeFieldOperation(operation.id); results.synced++;
        } catch (error) {
            const conflict = error.status === 409;
            await saveFieldOperation({ ...operation, status: conflict ? 'conflict' : 'pending', error: error.message });
            if (conflict) results.conflicts++; else { results.pending++; break; }
        }
    }
    const remaining = await loadFieldOperations(projectId);
    results.pending = remaining.filter(operation => operation.status === 'pending').length;
    results.conflicts = remaining.filter(operation => operation.status === 'conflict').length;
    await updatePreparedPackage(model);
    return results;
}

export { loadFieldOperations, saveFieldOperation };
