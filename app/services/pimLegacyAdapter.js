import { PIM_COMPASS_BY_ID } from './pimCompass.js';
import {
    createPimDocument,
    normalizePimDocument,
    pimAddNode,
    pimNodeById,
    pimPublishedDocument,
    pimUpdateNode
} from './pimModel.js';

const clone = value => {
    if (value === undefined) return undefined;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};
const text = value => String(value ?? '').trim();
const meaningful = value => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return Boolean(value.trim());
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
};
const contentText = value => Array.isArray(value) ? value.map(text).filter(Boolean).join('; ') : text(value);
const comparable = value => contentText(value).toLocaleLowerCase().replace(/\s+/g, ' ').replace(/[.;,]+$/g, '');
const safeId = value => text(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'information';

const FIELD_MAPPINGS = Object.freeze({
    identification: Object.freeze({ parentId: 'scientific-information', id: 'legacy-identification', title: 'Identification', informationType: 'fact' }),
    edible_uses: Object.freeze({ parentId: 'uses', id: 'legacy-culinary-uses', title: 'Culinary', informationType: 'practice' }),
    uses: Object.freeze({ parentId: 'uses', id: 'legacy-general-uses', title: 'General uses', informationType: 'practice' }),
    medicinal: Object.freeze({ parentId: 'uses', id: 'legacy-medicinal-uses', title: 'Medicinal', informationType: 'traditional_knowledge' }),
    medicinal_uses: Object.freeze({ parentId: 'uses', id: 'legacy-medicinal-uses-detail', title: 'Medicinal', informationType: 'traditional_knowledge' }),
    craft: Object.freeze({ parentId: 'uses', id: 'legacy-craft-uses', title: 'Craft', informationType: 'practice' }),
    material_uses: Object.freeze({ parentId: 'uses', id: 'legacy-material-uses', title: 'Craft and materials', informationType: 'practice' }),
    propagation: Object.freeze({ parentId: 'propagation', id: 'legacy-propagation-guidance', title: 'Propagation guidance', informationType: 'guidance' }),
    growing_conditions: Object.freeze({ parentId: 'cultivation', id: 'legacy-growing-conditions', title: 'Growing conditions', informationType: 'guidance' }),
    care: Object.freeze({ parentId: 'cultivation', id: 'legacy-care', title: 'Care', informationType: 'guidance' }),
    climate: Object.freeze({ parentId: 'cultivation', id: 'legacy-climate', title: 'Climate', informationType: 'guidance' }),
    family: Object.freeze({ parentId: 'scientific-information', id: 'legacy-family', title: 'Family and genus', informationType: 'fact' }),
    plant_type: Object.freeze({ parentId: 'scientific-information', id: 'legacy-growth-form', title: 'Growth form', informationType: 'fact' }),
    origin: Object.freeze({ parentId: 'historical-data', id: 'legacy-origin-history', title: 'Origin and history', informationType: 'historical_record' }),
    layer: Object.freeze({ parentId: 'food-forest', id: 'legacy-food-forest-layer', title: 'Food-forest layer', informationType: 'fact' }),
    relationships: Object.freeze({ parentId: 'food-forest', id: 'legacy-relationships', title: 'Plant relationships', informationType: 'local_observation' }),
    companions: Object.freeze({ parentId: 'food-forest', id: 'legacy-companions', title: 'Companion relationships', informationType: 'local_observation' })
});

const IDENTITY_FIELDS = Object.freeze({
    common_name: 'commonName',
    commonName: 'commonName',
    scientific_name: 'scientificName',
    scientificName: 'scientificName',
    cultivar: 'cultivar',
    overview: 'identityStatement',
    summary: 'identityStatement',
    photo: 'image',
    image: 'image',
    synonyms: 'synonyms',
    regional_names: 'regionalNames',
    regionalNames: 'regionalNames'
});

const PRESENTATION_FIELDS = new Set([
    'modified', 'created', 'profile_enabled', 'spm_enabled', 'virtual_tag_enabled',
    'orb_color', 'orb_size', 'attribute_chain_count', 'pim_categories', 'pim',
    'pim_document', 'pim_nodes'
]);

function legacyProvenance(field, originalValue) {
    return [{
        sourceDatabase: 'NourishlandXR legacy Plant Profile',
        sourceRecordId: field,
        sourceUrl: '',
        licence: '',
        retrievalDate: '',
        originalValue: clone(originalValue),
        normalizedValue: contentText(originalValue),
        importStatus: 'legacy_adapter',
        reviewStatus: 'needs_review',
        sourceField: field
    }];
}

function identityFromLegacy(profile, identity = {}) {
    const result = { ...clone(identity) };
    Object.entries(IDENTITY_FIELDS).forEach(([field, destination]) => {
        if (!meaningful(profile[field]) || meaningful(result[destination])) return;
        result[destination] = clone(profile[field]);
    });
    result.commonName ||= text(profile.common_name || profile.commonName);
    result.scientificName ||= text(profile.scientific_name || profile.scientificName);
    return result;
}

// Runtime-only and reversible: the legacy object is copied verbatim into the
// resulting document. No source file is rewritten, and every generated node
// points back to its exact source field and original value.
export function adaptLegacyPlantProfile(profile = {}, identity = {}, options = {}) {
    const sourceProfile = clone(profile || {});
    const plantId = options.plantId || identity.plantId || profile.plantId || profile.plant_id || profile.scientific_name || profile.common_name || 'plant';
    let document = createPimDocument({
        plantId,
        identity: identityFromLegacy(profile, identity),
        createdAt: profile.created || options.now,
        updatedAt: profile.modified || options.now,
        now: options.now,
        legacy: {
            sourceFormat: 'nourishland-plant-profile-v1',
            sourceProfile
        }
    });
    const report = {
        sourceFormat: 'nourishland-plant-profile-v1',
        mapped: [],
        unmapped: [],
        duplicates: [],
        preservedFields: Object.keys(sourceProfile)
    };
    const seenContent = new Map();

    Object.entries(IDENTITY_FIELDS).forEach(([field, destination]) => {
        if (meaningful(profile[field])) report.mapped.push({ field, target: `identity.${destination}`, nodeIds: [] });
    });

    Object.entries(FIELD_MAPPINGS).forEach(([field, mapping]) => {
        if (!meaningful(profile[field])) return;
        const value = contentText(profile[field]);
        const key = comparable(value);
        if (seenContent.has(key)) {
            report.duplicates.push({ field, duplicateOf: seenContent.get(key), value: clone(profile[field]) });
            return;
        }
        seenContent.set(key, field);
        document = pimAddNode(document, {
            id: mapping.id,
            parentId: mapping.parentId,
            title: mapping.title,
            preview: value.length > 80 ? `${value.slice(0, 77).trimEnd()}…` : value,
            body: value,
            informationType: mapping.informationType,
            evidenceStatus: 'needs_review',
            status: 'published',
            displayOrder: 100,
            provenance: legacyProvenance(field, profile[field])
        }, { now: profile.modified || options.now });
        report.mapped.push({ field, target: `${mapping.parentId}/${mapping.id}`, nodeIds: [mapping.id] });
    });

    Object.entries(sourceProfile).forEach(([field, value]) => {
        if (!meaningful(value)) return;
        if (IDENTITY_FIELDS[field] || FIELD_MAPPINGS[field]) return;
        if (PRESENTATION_FIELDS.has(field)) {
            report.mapped.push({ field, target: `legacy.sourceProfile.${field}`, nodeIds: [] });
            return;
        }
        const reason = field === 'notes'
            ? 'Free-form notes are ambiguous and require a parent-node decision.'
            : field === 'references'
                ? 'Free-form references require provenance review before attaching them to facts.'
                : 'No safe PIM destination is defined for this legacy field.';
        report.unmapped.push({ field, value: clone(value), reason });
    });

    document = normalizePimDocument({
        ...document,
        legacy: {
            ...document.legacy,
            sourceProfile,
            report: clone(report)
        }
    }, { now: profile.modified || options.now });
    return { document, report };
}

function documentFromLegacyCategories(profile, identity, options) {
    let document = createPimDocument({
        plantId: options.plantId || identity.plantId || profile.plantId || profile.common_name || 'plant',
        identity: identityFromLegacy(profile, identity),
        now: options.now,
        legacy: { sourceFormat: 'nourishland-pim-categories-v1', sourceProfile: clone(profile) }
    });
    const usedIds = new Set(document.nodes.map(node => node.id));
    const categories = Array.isArray(profile.pim_categories) ? profile.pim_categories : [];

    function addChildren(children, parentId, rootId, depth = 0) {
        (Array.isArray(children) ? children : []).forEach((item, index) => {
            const source = Array.isArray(item)
                ? { label: item[0], description: item[1], children: item[2] }
                : item || {};
            const baseId = safeId(source.id || source.label || `information-${index + 1}`);
            let id = baseId;
            if (usedIds.has(id)) id = `${parentId}-${baseId}`;
            let suffix = 2;
            while (usedIds.has(id)) id = `${parentId}-${baseId}-${suffix++}`;
            usedIds.add(id);
            document = pimAddNode(document, {
                ...clone(source),
                id,
                parentId,
                title: text(source.title || source.label || 'Information'),
                preview: text(source.preview || source.description || source.value),
                body: text(source.body || source.value || source.description),
                informationType: source.informationType || 'fact',
                evidenceStatus: source.evidenceStatus || 'needs_review',
                status: source.status || 'published',
                displayOrder: Number.isFinite(Number(source.displayOrder)) ? Number(source.displayOrder) : index,
                provenance: source.provenance || legacyProvenance('pim_categories', source)
            }, { now: options.now });
            addChildren(source.children, id, rootId, depth + 1);
        });
    }

    categories.forEach(category => {
        const rootId = safeId(category?.id || category?.label);
        if (!PIM_COMPASS_BY_ID[rootId]) return;
        document = pimUpdateNode(document, rootId, {
            preview: text(category.preview || category.description || category.value),
            body: text(category.body || category.value),
            evidenceStatus: category.evidenceStatus || 'needs_review',
            provenance: category.provenance || []
        }, { now: options.now });
        addChildren(category.children, rootId, rootId);
    });
    return document;
}

export function resolvePlantPim(profile = {}, identity = {}, options = {}) {
    const includeDraft = options.includeDraft !== false;
    const stored = profile?.pim_document || profile?.pim;
    let document;
    if (stored && typeof stored === 'object' && Array.isArray(stored.nodes)) {
        document = normalizePimDocument({
            ...clone(stored),
            plantId: stored.plantId || options.plantId || identity.plantId,
            identity: { ...clone(identity), ...clone(stored.identity || {}) }
        }, { now: options.now });
    } else if (Array.isArray(profile?.pim_nodes)) {
        document = normalizePimDocument({
            schemaVersion: profile.pim_schema_version || 1,
            plantId: options.plantId || identity.plantId || profile.plantId || profile.common_name || 'plant',
            identity: identityFromLegacy(profile, identity),
            nodes: clone(profile.pim_nodes),
            legacy: { sourceFormat: 'nourishland-pim-nodes-v1', sourceProfile: clone(profile) }
        }, { now: options.now });
    } else if (Array.isArray(profile?.pim_categories)) {
        document = documentFromLegacyCategories(profile, identity, options);
    } else {
        document = adaptLegacyPlantProfile(profile, identity, options).document;
    }
    return includeDraft ? document : pimPublishedDocument(document);
}
