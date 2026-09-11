import { resolvePlantPim } from './pimLegacyAdapter.js';
import { PIM_COMPASS } from './pimCompass.js';

const text = value => typeof value === 'string' ? value.trim() : '';
const roots = new Set(PIM_COMPASS.map(node => node.id));
const hasContent = node => Boolean(text(node.body) || text(node.preview) || node.media?.length);

// Availability is independent of review/publication: "Live" never means verified.
export function plantKnowledgeState(document, { expanded = false, loading = false, unavailable = false } = {}) {
    const nodes = (document?.nodes || []).filter(node => hasContent(node) && (!roots.has(node.id) || text(node.body)));
    const live = nodes.length > 0;
    const draftOnly = live && nodes.every(node => node.status !== 'published');
    const state = loading ? 'loading' : unavailable ? 'unavailable' : live ? (expanded ? 'expanded' : 'live') : 'basic';
    return { state, live: !loading && !unavailable && live, count: nodes.length, draftOnly,
        label: loading ? 'Loading knowledge' : unavailable ? 'Knowledge unavailable' : !live ? 'Basic plant' : draftOnly ? 'Draft PIM' : expanded ? 'PIM open' : 'Live PIM' };
}

export function createPlantKnowledgeResolver() {
    const cache = new WeakMap();
    return (profile = {}, { includeDraft = true, expanded = false, loading = false, unavailable = false } = {}) => {
        const source = profile && typeof profile === 'object' ? profile : {};
        const stored = source.pim_document || source.pim || source.pim_nodes;
        let entry = cache.get(source);
        if (!entry || entry.stored !== stored || entry.modified !== source.modified || entry.includeDraft !== includeDraft) {
            entry = { stored, modified: source.modified, includeDraft,
                document: resolvePlantPim(source, {}, { includeDraft }) };
            cache.set(source, entry);
        }
        const result={ ...plantKnowledgeState(entry.document, { expanded, loading, unavailable }), document: entry.document };
        if (!loading && !unavailable && (source.spm_enabled===false || source.profile_enabled===false)) {
            return {...result,state:'basic',live:false,label:'PIM hidden'};
        }
        return result;
    };
}

export function totemKnowledgeCards({ title = 'This area', introduction = '', context = '', bubbles = [], plants = [], notes = [] } = {}) {
    const live = plants.filter(plant => plant.knowledge?.live);
    const names = plants.map(plant => text(plant.name)).filter(Boolean);
    const observations = plants.flatMap(plant => (plant.knowledge?.document?.nodes || [])
        .filter(node => node.informationType === 'local_observation' && hasContent(node))
        .map(node => ({ id: node.id, title: node.title, body: node.body || node.preview, plant: plant.name })));
    const recent = notes.filter(note => text(note.body)).slice(-1)[0] || observations.at(-1);
    const areaBody = [...new Set([introduction, context, ...bubbles].map(text).filter(Boolean))].join('\n\n');
    return [
        { id: 'area', title, eyebrow: 'PLACE', summary: introduction || context || 'Explore this area',
            body: areaBody || 'This area has no introduction yet. Add one in the area settings.' },
        { id: 'plants', title: live.length + ' Live / ' + plants.length + (plants.length===1 ? ' plant' : ' plants'), eyebrow: 'PLANT KNOWLEDGE',
            summary: names.slice(0, 2).join(' · ') || 'No plants in this area yet',
            body: plants.length ? plants.map(plant => plant.name + ' — ' + (plant.knowledge?.label || 'Basic plant')).join('\n') : 'Add plants to this area to connect their knowledge to this Totem.',
            references: plants.map(plant => plant.id) },
        { id: 'notes', title: recent?.title || 'Notes & observations', eyebrow: recent?.plant ? 'LOCAL OBSERVATION' : 'PLACE NOTES',
            summary: recent?.body || 'A place for what you notice here',
            body: recent ? [recent.plant, recent.body].filter(Boolean).join('\n\n') : 'No local note has been added here yet. Add a note or a specimen observation; this card updates from the current area.',
            references: recent ? [recent.id] : [] }
    ];
}

export function escapeSpatialText(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function liveOrbCrownMarkup(knowledge) {
    return knowledge?.live ? '<span class="nlxr-orb-crown" aria-hidden="true">' + Array.from({length:6}, (_, i) => '<i style="--bud:' + i + '"></i>').join('') + '</span>' : '';
}

export function totemCardsMarkup(cards, selectedId = '') {
    const e = escapeSpatialText, selected = cards.find(card => card.id === selectedId);
    return '<div class="nlxr-totem-cards" aria-label="Area knowledge">' + cards.map(card =>
        '<button type="button" data-totem-card="' + e(card.id) + '" aria-expanded="' + (card.id === selectedId) + '"><small>' + e(card.eyebrow) + '</small><strong>' + e(card.title) + '</strong><span>' + e(card.summary) + '</span></button>').join('') + '</div>' +
        (selected ? '<section class="nlxr-totem-detail" aria-label="' + e(selected.title) + '"><button type="button" data-totem-close aria-label="Close area note">×</button><small>' + e(selected.eyebrow) + '</small><h3>' + e(selected.title) + '</h3><p>' + e(selected.body) + '</p></section>' : '');
}
