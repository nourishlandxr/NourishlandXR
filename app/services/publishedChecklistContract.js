import { validateChecklist } from './checklistContract.js';

// Approval comes from the server response, never an imported personal file.
export function validatePublishedChecklist(value, projectId) {
    if (value?.publication !== 'published' || value.projectId !== projectId) throw new Error('Invalid published checklist.');
    validateChecklist({ ...value, publication: 'personal-draft' });
    return value;
}

export function validatePublishedChecklists(value, projectId) {
    if (value?.schemaVersion !== 1 || value.contract !== 'nourishland.published-checklists' || value.projectId !== projectId
        || !Array.isArray(value.experiences)) throw new Error('Unsupported published checklist response.');
    const ids = new Set();
    for (const experience of value.experiences) {
        validatePublishedChecklist(experience, projectId);
        if (ids.has(experience.id)) throw new Error('Duplicate published checklist identity.');
        ids.add(experience.id);
    }
    return value;
}
