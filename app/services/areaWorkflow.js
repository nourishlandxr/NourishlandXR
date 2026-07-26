import { createSitePlace } from './persistence.js';

export async function createAreaRecord(projectId, siteId, area = {}) {
    const name = String(area.name || '').trim();
    if (!projectId || !siteId) throw new Error('A project and location are required to create an Area.');
    if (!name) throw new Error('Name your Area before continuing.');
    return createSitePlace(projectId, siteId, {
        name,
        type: area.type || 'Outdoor Area',
        description: String(area.description || '').trim(),
        visibility: area.visibility || 'draft'
    });
}
