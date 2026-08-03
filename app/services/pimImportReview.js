import { normalizePimDocument, pimAddNode, pimNodeById } from './pimModel.js';

const clone = value => {
    if (value === undefined) return undefined;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};
const text = value => String(value ?? '').trim();
const safeId = value => text(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'source';
const meaningful = value => value !== null && value !== undefined && (typeof value !== 'string' || Boolean(value.trim())) && (!Array.isArray(value) || value.length > 0);

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

const mappings = {
    accepted_scientific_name: {
        primaryCategory: 'scientific-information',
        parentChain: [{ id: 'taxonomy', title: 'Taxonomy' }],
        nodeId: 'accepted-scientific-name',
        title: 'Accepted scientific name',
        informationType: 'fact',
        evidenceStatus: 'sourced',
        normalize: 'scientific_name'
    },
    scientificName: { aliasOf: 'accepted_scientific_name' },
    acceptedScientificName: { aliasOf: 'accepted_scientific_name' },
    family: {
        primaryCategory: 'scientific-information',
        parentChain: [{ id: 'classification', title: 'Classification' }],
        nodeId: 'family',
        title: 'Family',
        informationType: 'fact',
        evidenceStatus: 'sourced'
    },
    native_range: {
        primaryCategory: 'historical-data',
        parentChain: [{ id: 'range-and-movement', title: 'Range and movement' }],
        nodeId: 'native-range',
        title: 'Native range',
        informationType: 'historical_record',
        evidenceStatus: 'sourced'
    },
    nativeRange: { aliasOf: 'native_range' },
    growth_form: {
        primaryCategory: 'scientific-information',
        parentChain: [{ id: 'morphology', title: 'Morphology' }],
        nodeId: 'growth-form',
        title: 'Growth form',
        informationType: 'fact',
        evidenceStatus: 'sourced'
    },
    growthForm: { aliasOf: 'growth_form' },
    edible_uses: {
        primaryCategory: 'uses',
        parentChain: [{ id: 'culinary', title: 'Culinary' }],
        nodeId: 'edible-uses',
        title: 'Edible uses',
        informationType: 'practice',
        evidenceStatus: 'sourced'
    },
    edibleUses: { aliasOf: 'edible_uses' },
    traditional_medicinal_use: {
        primaryCategory: 'uses',
        parentChain: [{ id: 'medicinal', title: 'Medicinal' }],
        nodeId: 'traditional-medicinal-use',
        title: 'Traditional medicinal use',
        informationType: 'traditional_knowledge',
        evidenceStatus: 'needs_review'
    },
    traditionalMedicinalUse: { aliasOf: 'traditional_medicinal_use' },
    seed_propagation: {
        primaryCategory: 'propagation',
        parentChain: [{ id: 'seed', title: 'Seed' }],
        nodeId: 'seed-propagation',
        title: 'Seed propagation',
        informationType: 'guidance',
        evidenceStatus: 'sourced'
    },
    seedPropagation: { aliasOf: 'seed_propagation' },
    sun_requirement: {
        primaryCategory: 'cultivation',
        parentChain: [{ id: 'light', title: 'Light' }],
        nodeId: 'sun-requirement',
        title: 'Sun requirement',
        informationType: 'guidance',
        evidenceStatus: 'sourced',
        normalize: 'light'
    },
    sunRequirement: { aliasOf: 'sun_requirement' },
    soil_requirement: {
        primaryCategory: 'cultivation',
        parentChain: [{ id: 'soil', title: 'Soil' }],
        nodeId: 'soil-requirement',
        title: 'Soil requirement',
        informationType: 'guidance',
        evidenceStatus: 'sourced'
    },
    soilRequirement: { aliasOf: 'soil_requirement' },
    nitrogen_fixation: {
        primaryCategory: 'food-forest',
        parentChain: [{ id: 'ecological-functions', title: 'Ecological functions' }],
        nodeId: 'nitrogen-fixation',
        title: 'Nitrogen fixation',
        informationType: 'fact',
        evidenceStatus: 'sourced'
    },
    nitrogenFixation: { aliasOf: 'nitrogen_fixation' }
};

export const PIM_EXTERNAL_FIELD_MAP = deepFreeze(mappings);

const METADATA_FIELDS = new Set([
    'sourceDatabase', 'source_database', 'source', 'database', 'sourceRecordId',
    'source_record_id', 'recordId', 'id', 'sourceUrl', 'source_url', 'url',
    'licence', 'license', 'retrievalDate', 'retrievedAt', 'retrieval_date',
    'data', 'fields'
]);

function resolvedMapping(field) {
    const mapping = PIM_EXTERNAL_FIELD_MAP[field];
    if (!mapping) return null;
    return mapping.aliasOf ? PIM_EXTERNAL_FIELD_MAP[mapping.aliasOf] : mapping;
}

function normalizeExternalValue(value, mapping) {
    let normalized;
    if (Array.isArray(value)) normalized = value.map(item => text(item)).filter(Boolean).join('; ');
    else if (value && typeof value === 'object') normalized = JSON.stringify(value);
    else normalized = text(value);
    normalized = normalized.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (mapping.normalize === 'scientific_name') return normalized.replace(/\s+/g, ' ');
    if (mapping.normalize === 'light') {
        const key = normalized.toLocaleLowerCase().replace(/[\s_-]+/g, ' ');
        const light = {
            fullsun: 'Full sun',
            'full sun': 'Full sun',
            partialshade: 'Partial shade',
            'partial shade': 'Partial shade',
            partshade: 'Partial shade',
            'part shade': 'Partial shade',
            shade: 'Shade'
        };
        return light[key] || normalized;
    }
    return normalized;
}

function sourceMetadata(record, options) {
    return {
        sourceDatabase: text(options.sourceDatabase || record.sourceDatabase || record.source_database || record.database || record.source || 'External source'),
        sourceRecordId: text(options.sourceRecordId || record.sourceRecordId || record.source_record_id || record.recordId || record.id),
        sourceUrl: text(options.sourceUrl || record.sourceUrl || record.source_url || record.url),
        licence: text(options.licence || options.license || record.licence || record.license),
        retrievalDate: text(options.retrievalDate || record.retrievalDate || record.retrievedAt || record.retrieval_date || new Date().toISOString())
    };
}

function previewFor(value) {
    return value.length <= 72 ? value : `${value.slice(0, 69).trimEnd()}…`;
}

function comparable(value) {
    return text(value).toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[.;,]+$/g, '');
}

function existingSemanticNodes(document, mapping) {
    return document.nodes.filter(node => node.primaryCategory === mapping.primaryCategory
        && (node.semanticKey === mapping.nodeId || comparable(node.title) === comparable(mapping.title)));
}

// Staging is intentionally non-mutating. The returned document is a clone of
// the input and every candidate remains draft/pending until reviewPimImport is
// called with an explicit decision.
export function stagePimImport(document, sourceRecord = {}, options = {}) {
    const baseDocument = normalizePimDocument(document, { now: options.now });
    const record = clone(sourceRecord || {});
    const data = record.fields && typeof record.fields === 'object'
        ? record.fields
        : record.data && typeof record.data === 'object'
            ? record.data
            : record;
    const source = sourceMetadata(record, options);
    const stagedValues = new Map();
    const items = [];
    const unmapped = [];

    Object.entries(data).forEach(([field, originalValue], index) => {
        if (!meaningful(originalValue) || METADATA_FIELDS.has(field)) return;
        const mapping = resolvedMapping(field);
        if (!mapping) {
            unmapped.push({ field, originalValue: clone(originalValue), reason: 'No approved PIM destination mapping is defined.' });
            return;
        }
        const normalizedValue = normalizeExternalValue(originalValue, mapping);
        if (!normalizedValue) return;
        const existing = existingSemanticNodes(baseDocument, mapping);
        const duplicate = existing.find(node => comparable(node.body || node.preview) === comparable(normalizedValue));
        const stagedKey = `${mapping.primaryCategory}/${mapping.nodeId}/${comparable(normalizedValue)}`;
        const stagedDuplicate = stagedValues.get(stagedKey);
        const conflicts = existing.filter(node => comparable(node.body || node.preview) !== comparable(normalizedValue)).map(node => node.id);
        const sourceSuffix = safeId(source.sourceRecordId || source.sourceDatabase);
        const nodeBaseId = `import-${mapping.nodeId}-${sourceSuffix}`;
        let nodeId = nodeBaseId;
        let nodeSuffix = 2;
        const stagedNodeIds = new Set(items.map(candidate => candidate.proposedNode.id));
        while (pimNodeById(baseDocument, nodeId) || stagedNodeIds.has(nodeId)) nodeId = `${nodeBaseId}-${nodeSuffix++}`;
        const provenance = {
            ...source,
            sourceField: field,
            originalValue: clone(originalValue),
            normalizedValue,
            importStatus: 'staged',
            reviewStatus: 'pending',
            mappingKey: mapping.nodeId
        };
        const item = {
            id: `staged-${mapping.nodeId}-${index + 1}`,
            field,
            destination: {
                primaryCategory: mapping.primaryCategory,
                parentChain: clone(mapping.parentChain),
                semanticKey: mapping.nodeId
            },
            originalValue: clone(originalValue),
            normalizedValue,
            duplicateOf: duplicate?.id || stagedDuplicate?.proposedNode?.id || null,
            conflictsWith: conflicts,
            reviewStatus: 'pending',
            proposedNode: {
                id: nodeId,
                parentId: mapping.parentChain.at(-1)?.id || mapping.primaryCategory,
                title: mapping.title,
                preview: previewFor(normalizedValue),
                body: normalizedValue,
                informationType: mapping.informationType,
                evidenceStatus: mapping.evidenceStatus,
                status: 'draft',
                semanticKey: mapping.nodeId,
                tags: [source.sourceDatabase].filter(Boolean),
                sourceIds: [source.sourceRecordId].filter(Boolean),
                attribution: text(options.attribution || record.attribution),
                safetyNote: text(options.safetyNote || record.safetyNote),
                displayOrder: index,
                provenance: [provenance]
            }
        };
        items.push(item);
        stagedValues.set(stagedKey, item);
    });

    return {
        id: text(options.id || `pim-import-${safeId(source.sourceDatabase)}-${safeId(source.sourceRecordId || source.retrievalDate)}`),
        plantId: baseDocument.plantId,
        status: 'pending_review',
        source,
        createdAt: text(options.now || new Date().toISOString()),
        document: clone(baseDocument),
        items,
        unmapped
    };
}

function ensureParentChain(document, item, now) {
    let result = document;
    let parentId = item.destination.primaryCategory;
    item.destination.parentChain.forEach((segment, index) => {
        const existing = pimNodeById(result, segment.id);
        if (existing) {
            if (existing.parentId !== parentId) throw new Error(`Import destination ${segment.id} already exists under another branch.`);
            parentId = existing.id;
            return;
        }
        result = pimAddNode(result, {
            id: segment.id,
            parentId,
            title: segment.title,
            preview: '',
            body: '',
            informationType: 'category',
            evidenceStatus: 'draft',
            status: 'published',
            displayOrder: index
        }, { now });
        parentId = segment.id;
    });
    return { document: result, parentId };
}

function normalizedReview(review, fallbackPatch) {
    if (typeof review === 'string') return { decision: review, changes: fallbackPatch || {}, publish: false };
    const source = review || {};
    return {
        decision: text(source.decision || source.action).toLocaleLowerCase(),
        changes: clone(source.changes || source.patch || fallbackPatch || {}),
        publish: source.publish === true
    };
}

export function reviewPimImport(staging, itemId, review, patch = {}) {
    const source = clone(staging || {});
    const index = (source.items || []).findIndex(item => item.id === itemId);
    if (index < 0) throw new Error(`Staged PIM import item was not found: ${itemId}.`);
    const decision = normalizedReview(review, patch);
    if (!['approve', 'reject', 'modify'].includes(decision.decision)) throw new Error('Import review decision must be approve, reject or modify.');
    const item = source.items[index];
    const now = text(review?.reviewedAt || new Date().toISOString());

    if (decision.decision === 'reject') {
        item.reviewStatus = 'rejected';
        item.reviewedAt = now;
        item.rejectionReason = text(review?.reason || patch?.reason);
    } else if (item.duplicateOf && decision.decision === 'approve' && !Object.keys(decision.changes).length) {
        // An editor can acknowledge an exact duplicate without silently adding
        // a second published fact.
        item.reviewStatus = 'approved_duplicate';
        item.reviewedAt = now;
    } else {
        const prepared = ensureParentChain(normalizePimDocument(source.document), item, now);
        const changes = { ...decision.changes };
        delete changes.id;
        delete changes.parentId;
        delete changes.primaryCategory;
        const proposedNode = {
            ...item.proposedNode,
            ...changes,
            parentId: prepared.parentId,
            status: decision.publish ? 'published' : 'draft',
            updatedAt: now,
            provenance: item.proposedNode.provenance.map(entry => ({
                ...entry,
                normalizedValue: changes.body ?? entry.normalizedValue,
                importStatus: decision.publish ? 'published' : 'approved_draft',
                reviewStatus: decision.decision === 'modify' ? 'modified' : 'approved',
                reviewedAt: now
            }))
        };
        source.document = pimAddNode(prepared.document, proposedNode, { now });
        item.proposedNode = proposedNode;
        item.normalizedValue = proposedNode.body;
        item.reviewStatus = decision.decision === 'modify' ? 'modified' : 'approved';
        item.reviewedAt = now;
    }
    source.items[index] = item;
    source.status = source.items.every(entry => entry.reviewStatus !== 'pending') ? 'reviewed' : 'pending_review';
    source.updatedAt = now;
    return source;
}
