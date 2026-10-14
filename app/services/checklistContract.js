// Portable data contract; no DOM, renderer, local storage or XR dependencies.
export const CHECKLIST_SCHEMA_VERSION = 1;
export const CHECKLIST_MAX_BYTES = 256 * 1024;
const ID = /^[A-Za-z0-9_-]{1,160}$/;
function object(value, keys, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).some(key => !keys.includes(key))) throw new Error(`Invalid ${label}.`);
}
function text(value, limit, label, required = false) {
    if (typeof value !== 'string' || value.length > limit || (required && !value.trim())) throw new Error(`Invalid ${label}.`);
}
function id(value, label) { if (typeof value !== 'string' || !ID.test(value)) throw new Error(`Invalid ${label}.`); }
export function validateChecklist(value) {
    object(value, ['schemaVersion','id','projectId','revision','type','title','description','publication','scope','steps'], 'checklist');
    if (value.schemaVersion !== CHECKLIST_SCHEMA_VERSION || value.type !== 'checklist' || value.publication !== 'personal-draft') throw new Error('Unsupported checklist version, type or publication state.');
    id(value.id,'experience ID'); id(value.projectId,'project ID');
    if (!Number.isSafeInteger(value.revision) || value.revision < 1) throw new Error('Invalid checklist revision.');
    text(value.title,160,'title',true); text(value.description,4000,'description');
    object(value.scope, ['siteId','areaId'], 'scope');
    text(value.scope.siteId,160,'site ID'); text(value.scope.areaId,160,'area ID');
    if (value.scope.siteId) id(value.scope.siteId,'site ID');
    if (value.scope.areaId) { id(value.scope.areaId,'area ID'); if (!value.scope.siteId) throw new Error('An area requires its site identity.'); }
    if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > 40) throw new Error('Use between 1 and 40 checklist activities.');
    const seen = new Set();
    for (const step of value.steps) {
        object(step,['id','instructions','contentRefs','requiredCapabilities','completion'],'activity');
        id(step.id,'activity ID'); if (seen.has(step.id)) throw new Error('Duplicate activity ID.'); seen.add(step.id);
        text(step.instructions,1000,'activity instructions',true);
        if (!Array.isArray(step.contentRefs) || step.contentRefs.length > 20) throw new Error('Invalid content references.');
        for (const ref of step.contentRefs) {
            object(ref,['type','id'],'content reference');
            if (!['knowledge','specimen','checkpoint'].includes(ref.type)) throw new Error('Unsupported content reference.');
            id(ref.id,'content ID');
        }
        if (!Array.isArray(step.requiredCapabilities) || step.requiredCapabilities.length) throw new Error('This checklist requires no device capabilities.');
        object(step.completion,['type'],'completion');
        if (step.completion.type !== 'self-report') throw new Error('Unsupported completion condition.');
    }
    return value;
}
export function parseChecklist(source) {
    if (typeof source !== 'string' || new TextEncoder().encode(source).byteLength > CHECKLIST_MAX_BYTES) throw new Error('Checklist file exceeds 256 KB.');
    let value; try { value = JSON.parse(source); } catch { throw new Error('The checklist file is not valid JSON.'); }
    return validateChecklist(value);
}
export function createChecklist({ projectId, title, description = '', activities, scope = { siteId:'', areaId:'' } }) {
    return validateChecklist({ schemaVersion:1,id:crypto.randomUUID(),projectId,title:String(title).trim(),description:String(description).trim(),revision:1,
        type:'checklist',publication:'personal-draft',scope,
        steps:activities.map(instructions=>({id:crypto.randomUUID(),instructions:String(instructions).trim(),contentRefs:[],requiredCapabilities:[],completion:{type:'self-report'}})) });
}
