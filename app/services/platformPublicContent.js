// Read-only adapter over the existing publication boundary. No demo imports.
const segment = value => encodeURIComponent(String(value));
const list = value => {
    if (!Array.isArray(value)) throw new Error('The content service returned an invalid list.');
    return value;
};
function identity(value) {
    if (typeof value !== 'string' || !value.trim()) throw new Error('Published content is missing a stable identity.');
    return value;
}
export const contentIdentity = ({ projectId, siteId, areaId, recordId }) =>
    JSON.stringify([projectId, siteId, areaId, recordId]);

export function areaContentRecords(projectId, siteId, areaId, plants, markers) {
    [projectId, siteId, areaId].forEach(identity);
    plants.forEach(plant => { identity(plant.instanceId); identity(plant.plantId); });
    markers.forEach(marker => identity(marker.id));
    const represented = new Set(plants.map(plant => plant.markerId).filter(Boolean));
    return [
        ...plants.map(plant => ({ ...plant, recordId: plant.instanceId, title: plant.commonName,
            kind: 'plant', knowledgeId: plant.plantId, description: plant.summary || '' })),
        ...markers.filter(marker => !represented.has(marker.id)).map(marker => ({
            recordId: marker.id, markerId: marker.id, title: marker.name, kind: marker.type,
            knowledgeId: marker.plantId || '', description: marker.description || ''
        }))
    ].map(record => ({ ...record, projectId, siteId, areaId,
        id: contentIdentity({ projectId, siteId, areaId, recordId: record.recordId }) }));
}

export function createPublicContentClient({ apiBase, fetcher = globalThis.fetch }) {
    async function read(path, signal) {
        const response = await fetcher(`${apiBase}${path}?view=visitor`, {
            method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store', signal
        });
        const data = await response.json().catch(() => { throw new Error('The content service did not return JSON.'); });
        if (!response.ok) throw new Error(data?.error || `Content request failed (${response.status}).`);
        return data;
    }
    const projectPath = id => `/projects/${segment(id)}`;
    const areaPath = (project, site, area) => `${projectPath(project)}/sites/${segment(site)}/places/${segment(area)}`;
    return {
        projects: async signal => list(await read('/projects', signal)),
        project: (id, signal) => read(projectPath(id), signal),
        async areas(projectId, signal) {
            const sites = list(await read(`${projectPath(projectId)}/sites`, signal));
            const groups = await Promise.all(sites.map(async site =>
                list(await read(`${projectPath(projectId)}/sites/${segment(site.id)}/places`, signal))
                    .map(area => ({ ...area, siteId: site.id, siteName: site.name }))));
            return groups.flat();
        },
        async records(projectId, siteId, areaId, signal) {
            const path = areaPath(projectId, siteId, areaId);
            const [resolved, markers] = await Promise.all([read(`${path}/plants`, signal), read(`${path}/markers`, signal)]);
            if (resolved?.version !== 1 || !Array.isArray(resolved.plants)) throw new Error('Unsupported plant content response.');
            return { records: areaContentRecords(projectId, siteId, areaId, resolved.plants, list(markers)),
                warnings: Array.isArray(resolved.warnings) ? resolved.warnings : [] };
        },
        profile: (record, signal) => read(`${areaPath(record.projectId, record.siteId, record.areaId)}/markers/${segment(record.markerId)}/plant-profile`, signal)
    };
}
