// Personal drafts only. These records never mutate official project knowledge.
export const FIELD_JOURNAL_KEY = 'nourishland.field-journal.v1';
function validateDraft(draft) {
    if (!draft || typeof draft.id !== 'string' || !draft.id || typeof draft.text !== 'string'
        || !draft.text.trim() || draft.text.length > 4000 || draft.status !== 'local-draft'
        || typeof draft.createdAt !== 'string' || !Number.isFinite(Date.parse(draft.createdAt))
        || !['projectId', 'siteId', 'areaId', 'targetId'].every(key => typeof draft[key] === 'string')) {
        throw new Error('Journal data is unsupported. Existing drafts have been preserved.');
    }
    return draft;
}
export function readJournal(storage = globalThis.localStorage) {
    const raw = storage.getItem(FIELD_JOURNAL_KEY);
    if (raw === null) return [];
    let data;
    try { data = JSON.parse(raw); } catch { throw new Error('Journal data could not be read. Existing drafts have been preserved.'); }
    if (data?.schemaVersion !== 1 || !Array.isArray(data.drafts)) throw new Error('Unsupported journal version. Existing drafts have been preserved.');
    return data.drafts.map(validateDraft);
}
export function saveJournalDraft({ text, projectId = '', siteId = '', areaId = '', targetId = '' }, storage = globalThis.localStorage) {
    const drafts = readJournal(storage);
    if (drafts.length >= 500) throw new Error('This journal has reached its draft limit. Export your drafts before adding more.');
    const draft = validateDraft({ id: globalThis.crypto.randomUUID(), text: String(text).trim(),
        projectId, siteId, areaId, targetId, createdAt: new Date().toISOString(), status: 'local-draft' });
    // setItem is atomic; quota/security failures leave prior drafts untouched.
    storage.setItem(FIELD_JOURNAL_KEY, JSON.stringify({ schemaVersion: 1, drafts: [...drafts, draft] }));
    return draft;
}
export const journalExport = storage => JSON.stringify({ schemaVersion: 1, drafts: readJournal(storage) }, null, 2);
