import { PIM_COMPASS, PIM_COMPASS_BY_ID } from './pimCompass.js';

export const PIM_SCHEMA_VERSION = 1;

const KNOWLEDGE_MODES = new Set(['agency', 'certainty', 'relationship', 'process']);
const INFORMATION_TYPES = new Set([
    'category',
    'fact',
    'guidance',
    'traditional_knowledge',
    'local_observation',
    'practice',
    'activity',
    'historical_record'
]);
const EVIDENCE_STATES = new Set([
    'verified',
    'sourced',
    'community_contributed',
    'local_observation',
    'draft',
    'needs_review'
]);
const PUBLICATION_STATES = new Set(['draft', 'published', 'archived', 'rejected']);

const clone = value => {
    if (value === undefined) return undefined;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};

const list = value => Array.isArray(value) ? [...value] : value === undefined || value === null || value === '' ? [] : [value];
const text = value => String(value ?? '').trim();
const uniqueText = value => [...new Set(list(value).map(text).filter(Boolean))];
const dateText = value => text(value);

function safeId(value, fallback = 'information') {
    return text(value || fallback)
        .toLocaleLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}

function normalizeIdentity(identity = {}, fallbackPlantId = '') {
    return {
        ...clone(identity),
        commonName: text(identity.commonName ?? identity.common_name),
        scientificName: text(identity.scientificName ?? identity.scientific_name),
        identityStatement: text(identity.identityStatement ?? identity.summary ?? identity.overview),
        image: text(identity.image ?? identity.photo),
        cultivar: text(identity.cultivar),
        synonyms: uniqueText(identity.synonyms),
        regionalNames: uniqueText(identity.regionalNames ?? identity.regional_names),
        tags: uniqueText(identity.tags),
        plantId: text(identity.plantId ?? fallbackPlantId)
    };
}

function normalizeProvenance(value) {
    return list(value).filter(item => item && typeof item === 'object').map(item => ({
        ...clone(item),
        sourceDatabase: text(item.sourceDatabase ?? item.source_database),
        sourceRecordId: text(item.sourceRecordId ?? item.source_record_id),
        sourceUrl: text(item.sourceUrl ?? item.source_url),
        licence: text(item.licence ?? item.license),
        retrievalDate: text(item.retrievalDate ?? item.retrievedAt ?? item.retrieval_date),
        importStatus: text(item.importStatus ?? item.import_status),
        reviewStatus: text(item.reviewStatus ?? item.review_status)
    }));
}

function normalizeNodeFields(node, documentDefaults) {
    return {
        ...clone(node),
        id: safeId(node.id || node.title),
        plantId: text(node.plantId || documentDefaults.plantId),
        parentId: node.parentId === null || node.parentId === undefined || node.parentId === '' ? null : safeId(node.parentId),
        path: text(node.path),
        level: Number.isFinite(Number(node.level)) ? Number(node.level) : 1,
        primaryCategory: safeId(node.primaryCategory || node.primary_category || ''),
        knowledgeMode: text(node.knowledgeMode ?? node.knowledge_mode).toLocaleLowerCase(),
        direction: text(node.direction),
        informationType: text((node.informationType ?? node.information_type) || 'fact').toLocaleLowerCase(),
        title: text(node.title || node.label || 'Information'),
        preview: text(node.preview ?? node.description),
        body: text(node.body ?? node.value),
        tags: uniqueText(node.tags),
        regionalNames: uniqueText(node.regionalNames ?? node.regional_names),
        region: text(node.region),
        climateContext: text(node.climateContext ?? node.climate_context),
        sourceIds: uniqueText(node.sourceIds ?? node.source_ids),
        attribution: text(node.attribution),
        evidenceStatus: text((node.evidenceStatus ?? node.evidence_status) || 'draft').toLocaleLowerCase(),
        safetyNote: text(node.safetyNote ?? node.safety_note),
        media: list(node.media).map(clone),
        displayOrder: Number.isFinite(Number(node.displayOrder ?? node.display_order)) ? Number(node.displayOrder ?? node.display_order) : 0,
        status: text(node.status || 'draft').toLocaleLowerCase(),
        createdAt: dateText(node.createdAt ?? node.created_at ?? documentDefaults.createdAt),
        updatedAt: dateText(node.updatedAt ?? node.updated_at ?? documentDefaults.updatedAt),
        provenance: normalizeProvenance(node.provenance)
    };
}

function rootNode(compass, plantId, timestamps, existing = {}) {
    return normalizeNodeFields({
        ...existing,
        id: compass.id,
        plantId,
        parentId: null,
        path: compass.id,
        level: 1,
        primaryCategory: compass.id,
        knowledgeMode: compass.knowledgeMode,
        knowledgeModes: [...compass.knowledgeModes],
        direction: compass.direction,
        informationType: 'category',
        title: compass.title,
        question: compass.question,
        color: compass.color,
        displayOrder: compass.order,
        status: 'published',
        evidenceStatus: existing.evidenceStatus || existing.evidence_status || 'draft'
    }, { plantId, ...timestamps });
}

function applyPaths(nodes) {
    const firstById = new Map();
    nodes.forEach(node => { if (!firstById.has(node.id)) firstById.set(node.id, node); });
    const resolving = new Set();
    const resolved = new Map();

    function resolve(node) {
        if (resolved.has(node)) return resolved.get(node);
        if (resolving.has(node)) {
            const cyclic = { path: node.id, level: 1, primaryCategory: node.primaryCategory };
            resolved.set(node, cyclic);
            return cyclic;
        }
        resolving.add(node);
        let result;
        if (!node.parentId) {
            result = { path: node.id, level: 1, primaryCategory: node.id };
        } else {
            const parent = firstById.get(node.parentId);
            if (!parent) result = { path: node.id, level: Math.max(2, node.level || 2), primaryCategory: node.primaryCategory };
            else {
                const parentResult = resolve(parent);
                result = {
                    path: `${parentResult.path}/${node.id}`,
                    level: parentResult.level + 1,
                    primaryCategory: parentResult.primaryCategory
                };
            }
        }
        resolving.delete(node);
        resolved.set(node, result);
        return result;
    }

    return nodes.map(node => {
        const placement = resolve(node);
        const compass = PIM_COMPASS_BY_ID[placement.primaryCategory];
        return {
            ...node,
            path: placement.path,
            level: placement.level,
            primaryCategory: compass?.id || node.primaryCategory,
            knowledgeMode: compass?.knowledgeMode || node.knowledgeMode,
            knowledgeModes: compass ? [...compass.knowledgeModes] : uniqueText(node.knowledgeModes || node.knowledgeMode),
            direction: compass?.direction || node.direction,
            color: compass?.color || node.color
        };
    });
}

export function normalizePimDocument(document = {}, options = {}) {
    const source = clone(document) || {};
    const now = dateText(options.now || source.updatedAt || source.createdAt || new Date().toISOString());
    const plantId = safeId(source.plantId || source.identity?.plantId || options.plantId || 'plant');
    const timestamps = {
        createdAt: dateText(source.createdAt || now),
        updatedAt: dateText(source.updatedAt || now)
    };
    const rawNodes = Array.isArray(source.nodes) ? source.nodes : [];
    const normalized = rawNodes.map(node => normalizeNodeFields(node || {}, { plantId, ...timestamps }));
    const withRoots = [...normalized];
    PIM_COMPASS.forEach(compass => {
        const index = withRoots.findIndex(node => node.id === compass.id && !node.parentId);
        if (index < 0) withRoots.push(rootNode(compass, plantId, timestamps));
        else withRoots[index] = rootNode(compass, plantId, timestamps, withRoots[index]);
    });
    const rootsFirst = withRoots.sort((left, right) => {
        const leftRoot = PIM_COMPASS_BY_ID[left.id] && !left.parentId ? PIM_COMPASS_BY_ID[left.id].order : Number.MAX_SAFE_INTEGER;
        const rightRoot = PIM_COMPASS_BY_ID[right.id] && !right.parentId ? PIM_COMPASS_BY_ID[right.id].order : Number.MAX_SAFE_INTEGER;
        return leftRoot - rightRoot || left.displayOrder - right.displayOrder;
    });
    return {
        ...source,
        schemaVersion: PIM_SCHEMA_VERSION,
        id: text(source.id || `${plantId}-pim`),
        plantId,
        identity: normalizeIdentity(source.identity || {}, plantId),
        nodes: applyPaths(rootsFirst),
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt
    };
}

export function createPimDocument(input = {}) {
    const source = typeof input === 'string' ? { plantId: input } : input || {};
    return normalizePimDocument({
        schemaVersion: PIM_SCHEMA_VERSION,
        id: source.id,
        plantId: source.plantId,
        identity: source.identity || {},
        nodes: source.nodes || [],
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
        metadata: clone(source.metadata || {}),
        legacy: clone(source.legacy)
    }, { now: source.now });
}

export function validatePimDocument(document = {}) {
    const errors = [];
    const warnings = [];
    if (!document || typeof document !== 'object' || Array.isArray(document)) {
        return { valid: false, errors: ['PIM document must be an object.'], warnings };
    }
    if (Number(document.schemaVersion) !== PIM_SCHEMA_VERSION) errors.push(`schemaVersion must be ${PIM_SCHEMA_VERSION}.`);
    if (!text(document.plantId)) errors.push('plantId is required.');
    if (!Array.isArray(document.nodes)) errors.push('nodes must be an array.');
    if (errors.length && !Array.isArray(document.nodes)) return { valid: false, errors, warnings };

    const nodes = document.nodes || [];
    const counts = new Map();
    nodes.forEach(node => counts.set(node?.id, (counts.get(node?.id) || 0) + 1));
    for (const [id, count] of counts) if (!text(id) || count > 1) errors.push(!text(id) ? 'Every node requires an ID.' : `Duplicate node ID: ${id}.`);
    const byId = new Map(nodes.filter(node => node?.id).map(node => [node.id, node]));
    const canonical = counts.size === byId.size ? normalizePimDocument(document, { now: document.updatedAt || document.createdAt }) : null;

    PIM_COMPASS.forEach(compass => {
        const root = byId.get(compass.id);
        if (!root) errors.push(`Missing compass category: ${compass.id}.`);
        else {
            if (root.parentId) errors.push(`${compass.id} must be a root node.`);
            if (root.direction !== compass.direction) errors.push(`${compass.id} must use direction ${compass.direction}.`);
            if (root.knowledgeMode !== compass.knowledgeMode) errors.push(`${compass.id} must use knowledge mode ${compass.knowledgeMode}.`);
        }
    });

    nodes.forEach(node => {
        if (!node || typeof node !== 'object') { errors.push('Every node must be an object.'); return; }
        if (node.parentId && !byId.has(node.parentId)) errors.push(`${node.id} references missing parent ${node.parentId}.`);
        if (text(node.plantId) !== text(document.plantId)) errors.push(`${node.id} must use document plantId ${document.plantId}.`);
        if (!PIM_COMPASS_BY_ID[node.primaryCategory]) errors.push(`${node.id} has invalid primaryCategory ${node.primaryCategory}.`);
        if (!KNOWLEDGE_MODES.has(node.knowledgeMode)) errors.push(`${node.id} has invalid knowledgeMode ${node.knowledgeMode}.`);
        if (!INFORMATION_TYPES.has(node.informationType)) errors.push(`${node.id} has invalid informationType ${node.informationType}.`);
        if (!EVIDENCE_STATES.has(node.evidenceStatus)) errors.push(`${node.id} has invalid evidenceStatus ${node.evidenceStatus}.`);
        if (!PUBLICATION_STATES.has(node.status)) errors.push(`${node.id} has invalid status ${node.status}.`);
        if (!text(node.title)) errors.push(`${node.id} requires a title.`);
        if (!text(node.path) || !node.path.split('/').every(Boolean)) errors.push(`${node.id} requires a stable ID path.`);
        if (!Number.isInteger(node.level) || node.level < 1) errors.push(`${node.id} has invalid level.`);
        const canonicalNode = canonical ? pimNodeById(canonical, node.id) : null;
        if (canonicalNode && node.path !== canonicalNode.path) errors.push(`${node.id} path must be ${canonicalNode.path}.`);
        if (canonicalNode && node.level !== canonicalNode.level) errors.push(`${node.id} level must be ${canonicalNode.level}.`);
        if (canonicalNode && node.primaryCategory !== canonicalNode.primaryCategory) errors.push(`${node.id} must inherit category ${canonicalNode.primaryCategory}.`);
        if (canonicalNode && node.direction !== canonicalNode.direction) errors.push(`${node.id} must inherit direction ${canonicalNode.direction}.`);
        if (canonicalNode && node.knowledgeMode !== canonicalNode.knowledgeMode) errors.push(`${node.id} must inherit knowledge mode ${canonicalNode.knowledgeMode}.`);
        if (!Array.isArray(node.tags) || !Array.isArray(node.sourceIds) || !Array.isArray(node.media) || !Array.isArray(node.provenance)) {
            errors.push(`${node.id} contains a non-array collection field.`);
        }
        const visited = new Set([node.id]);
        let parentId = node.parentId;
        while (parentId) {
            if (visited.has(parentId)) { errors.push(`Cycle detected at ${node.id}.`); break; }
            visited.add(parentId);
            parentId = byId.get(parentId)?.parentId || null;
        }
        if (!node.preview && !node.body && node.informationType !== 'category') warnings.push(`${node.id} has no preview or body.`);
        if (node.informationType === 'traditional_knowledge' && !node.attribution) warnings.push(`${node.id} requires traditional-knowledge attribution.`);
    });
    return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

export function pimNodeById(document, nodeId) {
    return (document?.nodes || []).find(node => node.id === nodeId) || null;
}

export function pimChildren(document, parentId = null) {
    const target = parentId === undefined || parentId === '' ? null : parentId;
    return (document?.nodes || [])
        .filter(node => (node.parentId ?? null) === target)
        .sort((left, right) => left.displayOrder - right.displayOrder || left.title.localeCompare(right.title));
}

export function pimAncestors(document, nodeId) {
    const ancestors = [];
    const visited = new Set();
    let node = pimNodeById(document, nodeId);
    while (node?.parentId && !visited.has(node.parentId)) {
        visited.add(node.parentId);
        node = pimNodeById(document, node.parentId);
        if (node) ancestors.unshift(node);
    }
    return ancestors;
}

function descendantIds(document, nodeId) {
    const found = new Set();
    const pending = [nodeId];
    while (pending.length) {
        const parentId = pending.shift();
        pimChildren(document, parentId).forEach(child => {
            if (found.has(child.id)) return;
            found.add(child.id);
            pending.push(child.id);
        });
    }
    return found;
}

function toggleOpenIds(document, openIds, nodeId) {
    const current = [...new Set(list(openIds).map(text).filter(Boolean))];
    if (!nodeId || nodeId === 'core' || nodeId === 'centre' || nodeId === 'center' || nodeId === document?.plantId) return [];
    if (!current.includes(nodeId)) return [...current, nodeId];
    const remove = descendantIds(document, nodeId);
    remove.add(nodeId);
    return current.filter(id => !remove.has(id));
}

// Supports both pimToggleOpenNodes(document, state, nodeId) and
// pimToggleOpenNodes(openIds, nodeId, { document }). Array state is convenient
// for most Web views; object state also represents the central plant being
// fully collapsed and reopened without inferring state from the DOM.
export function pimToggleOpenNodes(first, second, third, fourth = {}) {
    const document = Array.isArray(first?.nodes) ? first : third?.document || fourth?.document || null;
    const state = Array.isArray(first?.nodes) ? second : first;
    const nodeId = Array.isArray(first?.nodes) ? third : second;
    if (state && !Array.isArray(state) && typeof state === 'object') {
        const centerTarget = !nodeId || ['core', 'centre', 'center', document?.plantId].includes(nodeId);
        if (centerTarget) return { ...state, centerOpen: state.centerOpen === false, openNodeIds: [] };
        return {
            ...state,
            centerOpen: true,
            openNodeIds: toggleOpenIds(document, state.openNodeIds || [], nodeId)
        };
    }
    return toggleOpenIds(document, state || [], nodeId);
}

export function pimOpenAncestors(document, openNodeIds, nodeId) {
    const opened = new Set(list(openNodeIds).map(text).filter(Boolean));
    pimAncestors(document, nodeId).forEach(node => opened.add(node.id));
    if (pimNodeById(document, nodeId)) opened.add(nodeId);
    return [...opened];
}

function searchableValues(value) {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value.flatMap(searchableValues);
    if (typeof value === 'object') return Object.values(value).flatMap(searchableValues);
    return [String(value)];
}

function searchScore(fields, query, tokens) {
    const normalizedFields = fields.map(value => String(value || '').toLocaleLowerCase());
    let score = 0;
    normalizedFields.forEach((value, index) => {
        if (!value) return;
        if (value === query) score += 120 - index * 4;
        else if (value.startsWith(query)) score += 75 - index * 3;
        else if (value.includes(query)) score += 45 - index * 2;
        tokens.forEach(token => { if (value.includes(token)) score += Math.max(2, 12 - index); });
    });
    return score;
}

export function pimSearch(document, query, options = {}) {
    const source = options.includeDraft === false ? pimPublishedDocument(document) : normalizePimDocument(document);
    const normalizedQuery = text(query).toLocaleLowerCase().replace(/\s+/g, ' ');
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const results = [];
    const identity = source.identity || {};
    const identityFields = [identity.commonName, identity.scientificName, ...list(identity.synonyms), ...list(identity.regionalNames), ...list(identity.tags), identity.identityStatement];
    const identityScore = searchScore(identityFields, normalizedQuery, tokens);
    if (identityScore) results.push({
        kind: 'plant',
        plantId: source.plantId,
        nodeId: null,
        title: identity.commonName || identity.scientificName || source.plantId,
        preview: identity.identityStatement,
        path: source.plantId,
        pathLabel: identity.commonName || source.plantId,
        ancestry: [],
        openNodeIds: [],
        // Identity matches should lead to the plant before a node that happens
        // to repeat the accepted name; node results remain available below it.
        score: identityScore + 200
    });

    source.nodes.forEach(node => {
        const fields = [
            node.title,
            node.preview,
            node.body,
            ...node.tags,
            ...node.regionalNames,
            node.region,
            node.climateContext,
            node.attribution,
            node.safetyNote,
            ...node.sourceIds,
            ...searchableValues(node.provenance)
        ];
        const score = searchScore(fields, normalizedQuery, tokens);
        if (!score) return;
        const ancestors = pimAncestors(source, node.id);
        const ancestry = ancestors.map(item => ({ id: item.id, title: item.title, path: item.path }));
        results.push({
            kind: 'node',
            plantId: source.plantId,
            nodeId: node.id,
            title: node.title,
            preview: node.preview,
            path: node.path,
            pathLabel: [identity.commonName || source.plantId, ...ancestors.map(item => item.title), node.title].join(' → '),
            ancestry,
            openNodeIds: [...ancestors.map(item => item.id), node.id],
            primaryCategory: node.primaryCategory,
            score
        });
    });
    const limit = Number.isFinite(Number(options.limit)) ? Math.max(0, Number(options.limit)) : 50;
    return results.sort((left, right) => right.score - left.score || left.path.localeCompare(right.path)).slice(0, limit);
}

export function pimAddNode(document, node, options = {}) {
    const source = normalizePimDocument(document, options);
    const id = safeId(node?.id || node?.title);
    if (PIM_COMPASS_BY_ID[id]) throw new Error(`Compass node ${id} already exists and cannot be added.`);
    if (pimNodeById(source, id)) throw new Error(`PIM node ID already exists: ${id}.`);
    const parentId = safeId(node?.parentId || '');
    const parent = pimNodeById(source, parentId);
    if (!parent) throw new Error(`PIM parent node was not found: ${parentId || 'blank'}.`);
    const now = dateText(options.now || new Date().toISOString());
    return normalizePimDocument({
        ...source,
        nodes: [...source.nodes, {
            ...clone(node),
            id,
            plantId: source.plantId,
            parentId,
            primaryCategory: parent.primaryCategory,
            knowledgeMode: parent.knowledgeMode,
            direction: parent.direction,
            createdAt: node.createdAt || now,
            updatedAt: node.updatedAt || now
        }],
        updatedAt: now
    }, { now });
}

export function pimUpdateNode(document, nodeId, patch = {}, options = {}) {
    const source = normalizePimDocument(document, options);
    const existing = pimNodeById(source, nodeId);
    if (!existing) throw new Error(`PIM node was not found: ${nodeId}.`);
    if (patch.id && patch.id !== nodeId) throw new Error('PIM node IDs are stable and cannot be changed.');
    const isRoot = Boolean(PIM_COMPASS_BY_ID[nodeId] && !existing.parentId);
    const nextParentId = isRoot ? null : patch.parentId === undefined ? existing.parentId : safeId(patch.parentId);
    if (!isRoot && !pimNodeById(source, nextParentId)) throw new Error(`PIM parent node was not found: ${nextParentId}.`);
    if (nodeId === nextParentId || descendantIds(source, nodeId).has(nextParentId)) throw new Error('A PIM node cannot become its own descendant.');
    const now = dateText(options.now || new Date().toISOString());
    const nodes = source.nodes.map(node => node.id !== nodeId ? node : {
        ...node,
        ...clone(patch),
        id: nodeId,
        parentId: nextParentId,
        createdAt: node.createdAt,
        updatedAt: now
    });
    return normalizePimDocument({ ...source, nodes, updatedAt: now }, { now });
}

export function pimPublishedDocument(document) {
    const source = normalizePimDocument(document);
    const keep = new Set(PIM_COMPASS.map(entry => entry.id));
    let changed = true;
    while (changed) {
        changed = false;
        source.nodes.forEach(node => {
            if (keep.has(node.id) || node.status !== 'published' || !keep.has(node.parentId)) return;
            keep.add(node.id);
            changed = true;
        });
    }
    return normalizePimDocument({ ...source, nodes: source.nodes.filter(node => keep.has(node.id)) });
}

export function pimToArKnowledge(document, options = {}) {
    const source = options.includeDraft === false ? pimPublishedDocument(document) : normalizePimDocument(document);
    const visited = new Set();
    function projectNode(node, parentPath = 'core') {
        if (visited.has(node.id)) return null;
        visited.add(node.id);
        const children = pimChildren(source, node.id).map(child => projectNode(child, node.path)).filter(Boolean);
        visited.delete(node.id);
        return {
            id: node.id,
            path: node.path,
            parentPath,
            label: node.title,
            description: node.preview || node.body,
            value: node.body,
            direction: node.direction,
            primaryCategory: node.primaryCategory,
            knowledgeMode: node.knowledgeMode,
            informationType: node.informationType,
            evidenceStatus: node.evidenceStatus,
            status: node.status,
            attribution: node.attribution,
            safetyNote: node.safetyNote,
            provenance: clone(node.provenance),
            children
        };
    }
    return {
        plantId: source.plantId,
        title: source.identity.commonName || source.identity.scientificName || source.plantId,
        scientificName: source.identity.scientificName,
        identityStatement: source.identity.identityStatement,
        categories: PIM_COMPASS.map(compass => projectNode(pimNodeById(source, compass.id), 'core'))
    };
}
