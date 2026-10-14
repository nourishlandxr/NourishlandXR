import { validateChecklist, parseChecklist } from './checklistContract.js';
import { validatePublishedChecklist } from './publishedChecklistContract.js';
export const CHECKLIST_LIBRARY_KEY = 'nourishland.personal-checklists.v1';
export const CHECKLIST_PROGRESS_KEY = 'nourishland.checklist-progress.v1';
export const checklistKey = experience => JSON.stringify([experience.projectId, experience.id]);
export const progressKey = experience => JSON.stringify([experience.projectId, experience.id, experience.revision, ...(experience.publication === 'published' ? ['published'] : [])]);
const validateProgressExperience = experience => experience?.publication === 'published'
    ? validatePublishedChecklist(experience, experience.projectId) : validateChecklist(experience);
function read(storage, key, property) {
    const raw = storage.getItem(key);
    if (raw === null) return [];
    let value; try { value = JSON.parse(raw); } catch { throw new Error('Saved checklist data could not be read. Existing data has been preserved.'); }
    if (value?.schemaVersion !== 1 || !Array.isArray(value[property])) throw new Error('Unsupported saved checklist data. Existing data has been preserved.');
    return value[property];
}
export function readChecklists(storage = globalThis.localStorage) {
    const items = read(storage,CHECKLIST_LIBRARY_KEY,'experiences');
    const seen = new Set();
    for (const item of items) { validateChecklist(item); const key=checklistKey(item); if(seen.has(key))throw new Error('Duplicate saved checklist identity.'); seen.add(key); }
    return items;
}
export function saveChecklist(experience, storage = globalThis.localStorage) {
    validateChecklist(experience);
    const items=readChecklists(storage), key=checklistKey(experience), previous=items.find(item=>checklistKey(item)===key);
    if (previous && experience.revision < previous.revision) throw new Error('An older checklist cannot replace a newer revision.');
    if (previous && experience.revision === previous.revision) {
        // Semantically compare portable fields; JSON property order is not a revision.
        const normalize = value => JSON.stringify([value.projectId,value.id,value.revision,value.type,value.title,value.description,value.publication,
            value.scope.siteId,value.scope.areaId,value.steps.map(step=>[step.id,step.instructions,step.contentRefs.map(ref=>[ref.type,ref.id]),step.requiredCapabilities,step.completion.type])]);
        if (normalize(previous) !== normalize(experience)) throw new Error('This revision conflicts with an existing checklist. Existing data has been preserved.');
        return previous;
    }
    if (!previous && items.length >= 100) throw new Error('The personal checklist library is full.');
    storage.setItem(CHECKLIST_LIBRARY_KEY,JSON.stringify({schemaVersion:1,experiences:[...items.filter(item=>checklistKey(item)!==key),experience]}));
    return experience;
}
export const importChecklist = (source, storage) => saveChecklist(parseChecklist(source), storage);
export const exportChecklist = experience => JSON.stringify(validateChecklist(experience),null,2);
function readProgress(storage) {
    const items=read(storage,CHECKLIST_PROGRESS_KEY,'progress');
    const seen=new Set();
    for (const item of items) {
        if (!item || typeof item.key !== 'string' || seen.has(item.key) || !Array.isArray(item.completedStepIds)
            || item.completedStepIds.some(id=>typeof id !== 'string') || new Set(item.completedStepIds).size !== item.completedStepIds.length) throw new Error('Invalid checklist progress. Existing data has been preserved.');
        seen.add(item.key);
    }
    return items;
}
export function checklistProgress(experience, storage = globalThis.localStorage) {
    validateProgressExperience(experience);
    const ids=new Set(experience.steps.map(step=>step.id));
    return (readProgress(storage).find(item=>item.key===progressKey(experience))?.completedStepIds || []).filter(id=>ids.has(id));
}
export function setChecklistStep(experience, stepId, complete, storage = globalThis.localStorage) {
    validateProgressExperience(experience);
    if (typeof complete !== 'boolean' || !experience.steps.some(step=>step.id===stepId)) throw new Error('Unknown checklist activity.');
    const items=readProgress(storage),key=progressKey(experience),previous=checklistProgress(experience,storage),completed=new Set(previous);
    if(complete)completed.add(stepId);else completed.delete(stepId);
    if(!items.some(item=>item.key===key) && items.length>=500)throw new Error('Local checklist progress storage is full.');
    storage.setItem(CHECKLIST_PROGRESS_KEY,JSON.stringify({schemaVersion:1,progress:[...items.filter(item=>item.key!==key),{key,completedStepIds:[...completed]}]}));
    return [...completed];
}
