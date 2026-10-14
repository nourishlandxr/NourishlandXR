import path from 'node:path';
import { validateChecklist } from '../app/services/checklistContract.js';
import { projectRole } from './projectAccess.mjs';

export function handleProjectChecklists(req, res, pathname, { visitor, access, sendJson, readRequestJson, readJson, writeJson, getProjectPath, publicSnapshot }) {
    const match = pathname.match(/^\/api\/projects\/([^/]+)\/checklists(?:\/([^/]+)(?:\/(publish|unpublish))?)?$/);
    if (!match) return false;
    const [, encodedProject, encodedId, action] = match;
    const projectId = decodeURIComponent(encodedProject), id = encodedId && decodeURIComponent(encodedId);
    const file = path.join(getProjectPath(projectId), 'checklists.json');
    const exists = () => readJson(path.join(getProjectPath(projectId), 'project.json'), null);
    const read = () => {
        const store = readJson(file, { schemaVersion: 1, entries: [] });
        if (store.schemaVersion !== 1 || !Array.isArray(store.entries)) throw new Error('Invalid saved project checklists.');
        const seen = new Set();
        for (const entry of store.entries) {
            validateChecklist(entry.draft);
            if (entry.draft.projectId !== projectId || seen.has(entry.draft.id) || !Number.isSafeInteger(entry.version) || entry.version < 1) throw new Error('Invalid saved project checklist.');
            seen.add(entry.draft.id);
            if (entry.published) {
                validateChecklist({ ...entry.published, publication: 'personal-draft' });
                if (entry.published.publication !== 'published' || entry.published.projectId !== projectId || entry.published.id !== entry.draft.id) throw new Error('Invalid saved published checklist.');
            }
        }
        return store;
    };
    const visible = (experience, snapshot) => {
        if (!snapshot) return false;
        const { siteId, areaId } = experience.scope;
        if (siteId && !snapshot.sites.some(site => site.id === siteId)) return false;
        if (areaId && !snapshot.areas.some(area => area.siteId === siteId && area.id === areaId)) return false;
        const records = snapshot.records.filter(record => (!siteId || record.siteId === siteId) && (!areaId || record.areaId === areaId));
        return experience.steps.every(step => step.contentRefs.every(ref => records.some(record =>
            ref.type === 'knowledge' ? record.knowledgeId === ref.id : ref.type === 'specimen' ? record.kind === 'plant' && record.recordId === ref.id : record.kind.endsWith('checkpoint') && record.recordId === ref.id)));
    };
    const identity = access.identity(req), role = projectRole(identity, projectId);
    if (!visitor && !role) return sendJson(res, identity ? 403 : 401, { error: 'Project membership required' });
    if (!exists()) return sendJson(res, 404, { error: 'Project not found' });
    if (req.method === 'GET' && !action) {
        const store = read();
        if (visitor) {
            const snapshot = publicSnapshot(projectId);
            if (!snapshot) return sendJson(res, 404, { error: 'Public project not found' });
            const experiences = store.entries.map(entry => entry.published).filter(item => item && visible(item, snapshot));
            if (id) return sendJson(res, experiences.some(item => item.id === id) ? 200 : 404, experiences.find(item => item.id === id) || { error: 'Published checklist not found' });
            return sendJson(res, 200, { schemaVersion: 1, contract: 'nourishland.published-checklists', projectId, experiences });
        }
        if (id) return sendJson(res, store.entries.some(entry => entry.draft.id === id) ? 200 : 404, store.entries.find(entry => entry.draft.id === id) || { error: 'Checklist not found' });
        return sendJson(res, 200, { schemaVersion: 1, projectId, role, entries: store.entries });
    }
    if (!id || !['PUT', 'POST'].includes(req.method) || (action ? req.method !== 'POST' : req.method !== 'PUT')) return sendJson(res, 405, { error: 'Unsupported checklist action' });
    if (!role || (action && role !== 'admin')) return sendJson(res, 403, { error: 'Project administrator required to publish' });
    readRequestJson(req, (error, data) => {
        if (error) return sendJson(res, error.statusCode || 400, { error: error.message });
        try {
            const actor = access.identity(req), latestRole = projectRole(actor, projectId);
            if (!latestRole || (action && latestRole !== 'admin')) return sendJson(res, actor ? 403 : 401, { error: 'Project permission changed; sign in again' });
            if (!exists()) return sendJson(res, 404, { error: 'Project not found' });
            const store = read(), previous = store.entries.find(entry => entry.draft.id === id);
            if (!Number.isSafeInteger(data.expectedVersion) || data.expectedVersion !== (previous?.version || 0)) return sendJson(res, 409, { error: 'Checklist changed. Reload before saving or publishing.', version: previous?.version || 0 });
            if (action && !previous) return sendJson(res, 404, { error: 'Checklist not found' });
            const next = previous ? { ...previous } : { version: 0, published: null };
            if (!action) {
                validateChecklist(data.experience);
                if (data.experience.projectId !== projectId || data.experience.id !== id) throw new Error('Checklist identity does not match its project route.');
                if (!previous && store.entries.length >= 100) throw new Error('Project checklist library is full.');
                next.draft = { ...data.experience, revision: previous ? previous.draft.revision + 1 : 1 };
            } else if (action === 'publish') {
                if (!visible(previous.draft, publicSnapshot(projectId))) throw new Error('Publish the project, scope and referenced content before approving this checklist.');
                next.published = { ...previous.draft, publication: 'published' };
                next.publishedBy = actor.id;
                next.publishedAt = new Date().toISOString();
            } else {
                next.published = null;
                next.publishedBy = null;
                next.publishedAt = null;
            }
            next.version += 1;
            next.updatedBy = actor.id;
            next.updatedAt = new Date().toISOString();
            writeJson(file, { schemaVersion: 1, entries: [...store.entries.filter(entry => entry.draft.id !== id), next] });
            return sendJson(res, previous ? 200 : 201, next);
        } catch (failure) { return sendJson(res, 400, { error: failure.message }); }
    });
    return true;
}
