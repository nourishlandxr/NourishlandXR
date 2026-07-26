import { createSitePlace } from './persistence.js';

export async function createAreaRecord(projectId, siteId, area = {}) {
    const name = String(area.name || '').trim();
    if (!projectId || !siteId) throw new Error('A project and location are required to create an Area.');
    if (!name) throw new Error('Name your Area before continuing.');
    const payload = {
        name,
        type: area.type || 'Outdoor Area',
        description: String(area.description || '').trim(),
        visibility: area.visibility || 'draft'
    };
    try {
        return await createSitePlace(projectId, siteId, payload);
    } catch (error) {
        if (!/unsupported place type/i.test(String(error?.message || ''))) throw error;
        return createSitePlace(projectId, siteId, { ...payload, type: 'Other' });
    }
}
