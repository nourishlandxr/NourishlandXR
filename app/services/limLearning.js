// Learning Information Mesh (LIM) content for the introductory demo.
// LIM is separate from the Plant Information Mesh (PIM), which remains the
// source of plant knowledge and saved plant profiles.
const topic = (label, children = []) => ({ label, children: children.map(item => typeof item === 'string' ? { label: item, children: [] } : item) });

export const LIM_GROUPS = Object.freeze([
    Object.freeze({ id: 'climate', title: 'Climate', accent: '#6978b8', corner: 0, children: [
        topic('Subtropical', ['Temperature', 'Rainfall', 'Frost tolerance', 'Seasonal growth', 'Suitable plants', 'Planting conditions']), topic('Tropical', ['Humidity', 'Rainfall', 'Growth']), topic('Temperate', ['Seasons', 'Frost', 'Dormancy']), topic('Cool', ['Shelter', 'Wind exposure']), topic('Dry', ['Water needs', 'Soil cover']), topic('Humid', ['Airflow', 'Cloud cover'])
    ]}),
    Object.freeze({ id: 'food-forest', title: 'Food forest', accent: '#a06a43', corner: 1, children: [
        topic('Layers', ['Canopy', 'Understorey', 'Shrub', 'Herb', 'Ground cover', 'Climbers', 'Roots']), topic('Function', ['Habitat', 'Yield', 'Soil relationships']), topic('Light', ['Shade', 'Height', 'Growth habit']), topic('Ecology', ['Companions', 'Pollinators', 'Soil life'])
    ]}),
    Object.freeze({ id: 'plant', title: 'Plant', accent: '#719b62', corner: 2, children: [
        topic('Identity', ['Species', 'Cultivar', 'Characteristics']), topic('Propagation', ['Seed', 'Cutting', 'Graft', 'Marcot', 'Division']), topic('Range', ['Warmth', 'Latitude', 'Exposure']), topic('Layer', ['Evergreen', 'Mature size', 'Form']), topic('Harvest', ['Fruit', 'Flower', 'Season']), topic('Soil', ['Moisture', 'Soil life'])
    ]}),
    Object.freeze({ id: 'pin', title: 'Pin', accent: '#9a9460', corner: 3, children: [
        topic('Place', ['Story', 'Learning', 'Photo']), topic('Specimen', ['Genus', 'Variety', 'Canopy layer', 'Method']), topic('Observation', ['Date', 'Condition', 'Growth', 'Fruiting', 'Problem', 'Action']), topic('Note', ['Task', 'Data', 'Learning'])
    ]})
]);

// The eight LIM faces are the current public learning structure. The original
// four groups above remain intact as migration metadata for every authored cell.
// Faces are presentation and pathway parents; they never become Plant PIM data.
export const LIM_FACES = Object.freeze([
    Object.freeze({
        id: 'lim-climate', title: 'Climate and Place', accent: '#6978b8', position: 'north',
        legacyAliases: Object.freeze(['climate', 'climate-place', 'lim-face-climate-place']),
        content: 'Explore climate, seasons, temperature, rainfall, humidity, frost, shelter, exposure, water and the local conditions that shape a place.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-climate-subtropical', children: Object.freeze(['lim-climate-subtropical-temperature', 'lim-climate-subtropical-rainfall']) }),
            Object.freeze({ id: 'lim-climate-cool', children: Object.freeze(['lim-climate-cool-shelter']) }),
            Object.freeze({ id: 'lim-climate-dry', children: Object.freeze(['lim-climate-dry-water-needs']) })
        ])
    }),
    Object.freeze({
        id: 'lim-food-forest', title: 'Living Landscapes', accent: '#a06a43', position: 'north-east',
        legacyAliases: Object.freeze(['food-forest', 'living-landscapes', 'lim-face-living-landscapes']),
        content: 'Explore food-forest layers, canopy, understorey, ground cover, roots, light, shade, yield and the functions that create a living landscape.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-food-forest-layers', children: Object.freeze(['lim-food-forest-layers-canopy', 'lim-food-forest-layers-ground-cover']) }),
            Object.freeze({ id: 'lim-food-forest-function', children: Object.freeze(['lim-food-forest-function-yield']) }),
            Object.freeze({ id: 'lim-food-forest-light', children: Object.freeze(['lim-food-forest-light-shade']) })
        ])
    }),
    Object.freeze({
        id: 'lim-plant', title: 'Plants and Life', accent: '#719b62', position: 'east',
        legacyAliases: Object.freeze(['plant', 'plants-life', 'lim-face-plants-life']),
        content: 'Explore plant identity, form, life cycle, growth, propagation, harvest and the ways plants change over time.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-identity', children: Object.freeze(['lim-plant-identity-species', 'lim-plant-identity-characteristics']) }),
            Object.freeze({ id: 'lim-plant-propagation', children: Object.freeze(['lim-plant-propagation-seed', 'lim-plant-propagation-cutting']) }),
            Object.freeze({ id: 'lim-plant-soil', children: Object.freeze(['lim-plant-soil-moisture']) })
        ])
    }),
    Object.freeze({
        id: 'lim-pin', title: 'Place and Observation', accent: '#9a9460', position: 'south-east',
        legacyAliases: Object.freeze(['pin', 'place-observation', 'lim-face-place-observation']),
        content: 'Explore pins, places, stories, photos, dates, conditions, notes, tasks and observations recorded in the living world.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-pin-place', children: Object.freeze(['lim-pin-place-photo']) }),
            Object.freeze({ id: 'lim-pin-observation', children: Object.freeze(['lim-pin-observation-date', 'lim-pin-observation-condition']) }),
            Object.freeze({ id: 'lim-pin-specimen', children: Object.freeze(['lim-pin-specimen-genus']) })
        ])
    }),
    Object.freeze({
        id: 'lim-uses-making', title: 'Uses and Making', accent: '#bd7659', position: 'south',
        legacyAliases: Object.freeze(['uses-making', 'lim-face-uses-making']),
        content: 'Explore food preparation, cultivation methods, harvest, craft, building materials and other practical uses with suitable evidence and safety context.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-harvest', children: Object.freeze(['lim-plant-harvest-fruit', 'lim-plant-harvest-flower']) }),
            Object.freeze({ id: 'lim-plant-harvest-season', children: Object.freeze([]) })
        ])
    }),
    Object.freeze({
        id: 'lim-origins-culture', title: 'Origins and Culture', accent: '#8d75a5', position: 'south-west',
        legacyAliases: Object.freeze(['origins-culture', 'lim-face-origins-culture']),
        content: 'Explore geographic origins, movement between regions, the communities connected with plants, traditions and cultural histories.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-range', children: Object.freeze(['lim-plant-range-latitude', 'lim-plant-range-exposure']) }),
            Object.freeze({ id: 'lim-pin-place-story', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-plant-range-warmth', children: Object.freeze([]) })
        ])
    }),
    Object.freeze({
        id: 'lim-wildlife-relationships', title: 'Wildlife and Relationships', accent: '#5f9681', position: 'west',
        legacyAliases: Object.freeze(['wildlife-relationships', 'lim-face-wildlife-relationships']),
        content: 'Explore birds, insects, pollinators, fungi, soil organisms, seed dispersal and the ecological relationships around plants and places.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-food-forest-ecology', children: Object.freeze(['lim-food-forest-ecology-pollinators', 'lim-food-forest-ecology-companions']) }),
            Object.freeze({ id: 'lim-food-forest-function-habitat', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-food-forest-function-soil-relationships', children: Object.freeze(['lim-plant-soil-soil-life']) })
        ])
    }),
    Object.freeze({
        id: 'lim-discovery-pathways', title: 'Discovery and Pathways', accent: '#4f879e', position: 'north-west',
        legacyAliases: Object.freeze(['discovery-pathways', 'lim-face-discovery-pathways']),
        content: 'Explore how to observe, compare, record, question and connect topics. These connections can later form guided pathways toward a learning goal.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-pin-note', children: Object.freeze(['lim-pin-note-task', 'lim-pin-note-data']) }),
            Object.freeze({ id: 'lim-pin-observation-action', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-pin-specimen-method', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-pin-place-learning', children: Object.freeze([]) })
        ])
    })
]);

const lessons = {
    'Food forest': 'A food forest grows useful plants in layers, inspired by a forest. Trees, shrubs, herbs and ground covers share space. Explore Layers to see how height, light and plant relationships shape the garden.',
    'Climate': 'Climate describes the long-term pattern of warmth, rainfall and seasons in a place. It helps us understand which plants may thrive. A sheltered corner can differ from the wider climate: observation matters too.',
    'Plant': 'Every plant has a story: how it grows, reproduces and relates to its surroundings. Start with what you notice, then follow a connected topic to learn more.',
    'Pin': 'A pin connects a story or observation to a place. It might mark a garden technique, a group of plants or a change you want to revisit. Learning can begin with a place, before choosing a plant.',
    'Layers': 'Food forests use different heights: canopy, smaller trees, shrubs, herbs, ground covers, roots and climbers. These are useful design guides, not a requirement to fill every layer.',
    'Seed': 'A seed carries the beginning of a new plant. Moisture, temperature and sometimes light help trigger germination. Requirements vary by species; a seed-grown plant can differ from its parent.',
    'Propagation': 'Propagation means growing new plants, from seeds or from parts of existing plants. Explore the methods, then choose one suited to the species and conditions.',
    'Soil': 'Soil is a living habitat as well as support for roots. Texture, water, air and organisms influence plant growth. Observe it before deciding what to change.',
    'Ecology': 'Ecology explores relationships between organisms and their environment. Look for pollinators, shelter, leaf litter and other signs of connections around you.',
    'Observation': 'An observation records what you actually notice at a place and time. Keep it separate from explanations you have not yet checked. Returning later helps reveal change.',
    'Light': 'Light changes through the day and seasons. Nearby trees and structures create shade; observing these patterns helps place plants appropriately.',
    'Tropical': 'Tropical regions are generally warm throughout the year. Rainfall can be seasonal or frequent, so water and dry-season conditions still matter.',
    'Subtropical': 'Subtropical places often have warm summers and milder winters. Frost, rainfall and exposure vary locally and can shape plant choices.',
    'Temperate': 'Temperate climates have distinct seasonal changes. Winter cold, summer warmth and growing-season length influence plant growth.',
    'Cool': 'Cool conditions can slow growth and shorten growing seasons. Shelter and local frost patterns are useful things to observe.',
    'Dry': 'In dry environments, water availability shapes growth. Soil cover, shade and suitable species can help a garden use water thoughtfully.',
    'Humid': 'Humid air affects evaporation and plant health. Spacing and airflow matter, alongside rainfall and soil drainage.',
    'Canopy': 'The canopy is the upper tree layer. It shapes shade, shelter and the conditions beneath it.',
    'Understorey': 'The understorey grows below taller trees, where light and shelter differ from open ground.',
    'Ground cover': 'Low-growing plants cover the soil surface. Depending on the species, they can provide habitat, reduce exposed soil or produce a harvest.',
    'Roots': 'Roots anchor plants and take up water and nutrients. Their depth and spread influence how plants share soil space.',
    'Climbers': 'Climbing plants use other structures for support. Consider their mature weight and growth before choosing a support.',
    'Pollinators': 'Pollinators move pollen between flowers. Watch which animals visit, when flowers open and how these patterns change.',
    'Soil life': 'Fungi, bacteria and soil animals help cycle organic matter. Leaf litter and living roots are part of this below-ground community.',
    'Cutting': 'A cutting is a piece of a plant used to grow another. Success depends on species, timing and care while roots develop.',
    'Graft': 'Grafting joins plant material so it can grow together. Compatibility and the qualities of the rootstock and scion both matter.',
    'Place': 'A place brings together plants, people, conditions and history. Explore its stories before focusing on a single specimen.',
    'Learning': 'Follow a cell that interests you. Read its explanation here, then try a neighbouring topic. There is no required order.',
    'Function': 'A plant can offer several functions, such as food, shade or habitat. Observe what it actually contributes in this place.',
    'Identity': 'Plant identity helps connect observations to reliable knowledge. Similar-looking plants can differ, so uncertain identification should stay marked as uncertain.'
};
const fallbackBody = label => `Explore ${label.toLowerCase()} as part of this living place. Notice what changes between plants, locations and seasons. A useful learning note records what you see, where you see it and the questions you want to investigate next.`;
const slug = value => String(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function buildCells(group, nodes, parentId = null, path = []) {
    return nodes.flatMap(node => {
        const nextPath = [...path, node.label];
        const cell = Object.freeze({
            id: `lim-${group.id}-${nextPath.slice(1).map(slug).join('-')}`,
            title: node.label,
            content: lessons[node.label] || fallbackBody(node.label),
            parentId,
            groupId: group.id,
            group: group.title,
            accent: group.accent,
            layoutRole: parentId ? (node.children.length ? 'branch' : 'attribute') : 'root',
            tutorialStep: 'welcome',
            accessibilityLabel: `${node.label} learning cell in ${group.title}`,
            path: nextPath
        });
        return [cell, ...buildCells(group, node.children, cell.id, nextPath)];
    });
}
function buildGroupCells(group) {
    const root = Object.freeze({
        id: `lim-${group.id}`,
        title: group.title,
        content: lessons[group.title] || fallbackBody(group.title),
        parentId: null,
        groupId: group.id,
        group: group.title,
        accent: group.accent,
        layoutRole: 'root',
        tutorialStep: 'welcome',
        accessibilityLabel: `${group.title} learning cell`,
        path: [group.title]
    });
    return [root, ...buildCells(group, group.children, root.id, [group.title])];
}
const LEGACY_LIM_CELLS = LIM_GROUPS.flatMap(buildGroupCells);
const belongsTo = (cell, id) => cell.id === id || cell.id.startsWith(id + '-');
function primaryFaceId(cell) {
    if (belongsTo(cell, 'lim-pin-note') || ['lim-pin-place-learning', 'lim-pin-observation-action', 'lim-pin-observation-problem'].includes(cell.id)) return 'lim-discovery-pathways';
    if (cell.id === 'lim-pin-specimen-method') return 'lim-discovery-pathways';
    if (belongsTo(cell, 'lim-plant-harvest') || cell.id === 'lim-plant-harvest-flower') return 'lim-uses-making';
    if (cell.id === 'lim-food-forest-function-yield') return 'lim-food-forest';
    if (cell.id === 'lim-pin-specimen-canopy-layer') return 'lim-food-forest';
    if (belongsTo(cell, 'lim-plant-range') || cell.id === 'lim-pin-place-story') return 'lim-origins-culture';
    if (belongsTo(cell, 'lim-food-forest-ecology') || ['lim-food-forest-function-habitat', 'lim-food-forest-function-soil-relationships', 'lim-plant-soil-soil-life'].includes(cell.id)) return 'lim-wildlife-relationships';
    if (cell.groupId === 'climate') return 'lim-climate';
    if (cell.groupId === 'food-forest' || belongsTo(cell, 'lim-plant-layer')) return 'lim-food-forest';
    if (cell.groupId === 'plant') return 'lim-plant';
    return 'lim-pin';
}
const LEGACY_FACE = Object.freeze({ climate: 'lim-climate', 'food-forest': 'lim-food-forest', plant: 'lim-plant', pin: 'lim-pin' });
const RELATED_FACE_IDS = Object.freeze({
    'lim-climate': ['lim-plant', 'lim-pin'],
    'lim-climate-subtropical-frost-tolerance': ['lim-plant'],
    'lim-climate-subtropical-seasonal-growth': ['lim-plant'],
    'lim-climate-subtropical-suitable-plants': ['lim-plant', 'lim-food-forest'],
    'lim-climate-subtropical-planting-conditions': ['lim-food-forest', 'lim-plant'],
    'lim-climate-tropical-rainfall': ['lim-pin'],
    'lim-climate-tropical-growth': ['lim-plant'],
    'lim-climate-temperate-seasons': ['lim-plant'],
    'lim-climate-temperate-frost': ['lim-plant'],
    'lim-climate-temperate-dormancy': ['lim-plant'],
    'lim-climate-cool-shelter': ['lim-food-forest'],
    'lim-climate-cool-wind-exposure': ['lim-pin'],
    'lim-climate-dry-water-needs': ['lim-plant'],
    'lim-climate-dry-soil-cover': ['lim-food-forest'],
    'lim-climate-humid-airflow': ['lim-plant'],
    'lim-food-forest': ['lim-plant', 'lim-wildlife-relationships'],
    'lim-food-forest-layers': ['lim-plant'],
    'lim-food-forest-layers-roots': ['lim-plant', 'lim-wildlife-relationships'],
    'lim-food-forest-function': ['lim-uses-making', 'lim-wildlife-relationships'],
    'lim-food-forest-function-habitat': ['lim-food-forest'],
    'lim-food-forest-function-yield': ['lim-uses-making'],
    'lim-food-forest-function-soil-relationships': ['lim-food-forest', 'lim-plant'],
    'lim-food-forest-light': ['lim-climate', 'lim-plant'],
    'lim-food-forest-ecology': ['lim-food-forest'],
    'lim-food-forest-ecology-pollinators': ['lim-food-forest', 'lim-plant'],
    'lim-food-forest-ecology-soil-life': ['lim-food-forest', 'lim-plant'],
    'lim-plant': ['lim-food-forest', 'lim-uses-making'],
    'lim-plant-identity': ['lim-pin'],
    'lim-plant-propagation': ['lim-uses-making'],
    'lim-plant-range': ['lim-climate', 'lim-plant'],
    'lim-plant-layer': ['lim-plant'],
    'lim-plant-harvest': ['lim-plant', 'lim-food-forest'],
    'lim-plant-harvest-flower': ['lim-plant', 'lim-wildlife-relationships'],
    'lim-plant-soil': ['lim-climate', 'lim-food-forest', 'lim-wildlife-relationships'],
    'lim-plant-soil-soil-life': ['lim-plant', 'lim-food-forest'],
    'lim-pin': ['lim-discovery-pathways'],
    'lim-pin-place': ['lim-origins-culture', 'lim-discovery-pathways'],
    'lim-pin-place-story': ['lim-pin'],
    'lim-pin-place-learning': ['lim-pin'],
    'lim-pin-place-photo': ['lim-discovery-pathways'],
    'lim-pin-specimen': ['lim-plant'],
    'lim-pin-specimen-genus': ['lim-plant'],
    'lim-pin-specimen-variety': ['lim-plant'],
    'lim-pin-specimen-canopy-layer': ['lim-pin', 'lim-plant'],
    'lim-pin-specimen-method': ['lim-pin', 'lim-plant'],
    'lim-pin-observation': ['lim-discovery-pathways'],
    'lim-pin-observation-condition': ['lim-climate'],
    'lim-pin-observation-growth': ['lim-plant'],
    'lim-pin-observation-fruiting': ['lim-plant'],
    'lim-pin-observation-problem': ['lim-pin'],
    'lim-pin-observation-action': ['lim-pin'],
    'lim-pin-note': ['lim-pin'],
    'lim-pin-note-task': ['lim-pin'],
    'lim-pin-note-data': ['lim-pin'],
    'lim-pin-note-learning': ['lim-pin']
});
// Editorial review completed in Phase 8. The confirmed decisions are encoded in
// primaryFaceId and RELATED_FACE_IDS above; this export remains for consumers
// that expect a review collection, but is intentionally empty after approval.
export const LIM_MAPPING_REVIEW = Object.freeze([]);
const REVIEW_IDS = new Set(LIM_MAPPING_REVIEW.map(item => item.cellId));
export const LIM_CELLS = Object.freeze(LEGACY_LIM_CELLS.map(cell => {
    const faceId = primaryFaceId(cell);
    const face = LIM_FACES.find(item => item.id === faceId);
    const related = new Set(RELATED_FACE_IDS[cell.id] || []);
    if (LEGACY_FACE[cell.groupId] && LEGACY_FACE[cell.groupId] !== faceId) related.add(LEGACY_FACE[cell.groupId]);
    related.delete(faceId);
    const isFace = cell.id === faceId;
    return Object.freeze({ ...cell,
        legacyGroupId: cell.groupId,
        legacyGroup: cell.group,
        legacyParentId: cell.parentId,
        legacyAccent: cell.accent,
        legacyTitle: cell.title,
        title: isFace ? face.title : cell.title,
        accent: face?.accent || cell.accent,
        primaryFaceId: faceId,
        faceParentId: isFace ? null : faceId,
        relatedFaceIds: Object.freeze([...related]),
        layoutRole: isFace ? 'face' : cell.layoutRole,
        accessibilityLabel: isFace ? `${face.title} LIM face` : `${cell.title} learning cell in ${face.title}`,
        pathwayRefs: Object.freeze([]),
        faceMappingStatus: REVIEW_IDS.has(cell.id) ? 'review' : 'approved'
    });
}));
export const LIM_FACE_CELLS = Object.freeze(LIM_FACES.map(face => LIM_CELLS.find(cell => cell.id === face.id) || Object.freeze({
    id: face.id, title: face.title, content: face.content, parentId: null,
    groupId: null, group: 'Learning Information Mesh', accent: face.accent,
    layoutRole: 'face', tutorialStep: 'welcome', accessibilityLabel: `${face.title} LIM face`,
    path: Object.freeze([face.title]), primaryFaceId: face.id, faceParentId: null,
    relatedFaceIds: Object.freeze([]), pathwayRefs: Object.freeze([]), faceMappingStatus: 'authored'
})));
const FACE_CELL_IDS = new Set(LIM_FACE_CELLS.map(cell => cell.id));
export const LIM_ALL_CELLS = Object.freeze([...LIM_FACE_CELLS, ...LIM_CELLS.filter(cell => !FACE_CELL_IDS.has(cell.id))]);
export const LIM_CELL_BY_ID = Object.freeze(Object.fromEntries(LIM_ALL_CELLS.map(cell => [cell.id, cell])));
export const LIM_FACE_MEMBERS = Object.freeze(Object.fromEntries(LIM_FACES.map(face => [
    face.id, Object.freeze(LIM_CELLS.filter(cell => cell.primaryFaceId === face.id).map(cell => cell.id))
])));
export const LIM_DATA_VERSION = 2;
export const LIM_PATHWAY_SCHEMA = Object.freeze({
    version: 1,
    fields: Object.freeze(['id','title','learningGoal','description','orderedCellIds','suggestedBranches','completionState','version'])
});
export const LIM_PATHWAYS = Object.freeze([]);
export const LIM_LEGACY_FACE_MIGRATION = Object.freeze(Object.fromEntries(LIM_FACES.flatMap(face => [
    [face.id, face.id], ...face.legacyAliases.map(alias => [alias, face.id])
])));
export function normalizeLimFaceId(value) {
    const key = String(value || '');
    return LIM_LEGACY_FACE_MIGRATION[key] || key;
}
export function migrateLegacyLimState(state = {}) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) return state;
    const migrated = {...state, limDataVersion:LIM_DATA_VERSION};
    const normalizeField = field => { if (field in migrated) migrated[field] = normalizeLimFaceId(migrated[field]); };
    ['activeFaceId','selectedFaceId','selectedCellId'].forEach(normalizeField);
    for (const field of ['expandedFaceIds','visitedFaceIds']) {
        if (Array.isArray(migrated[field])) migrated[field] = [...new Set(migrated[field].map(normalizeLimFaceId))];
    }
    if (!migrated.activeFaceId && migrated.groupId) migrated.activeFaceId = normalizeLimFaceId(migrated.groupId);
    return migrated;
}
const graphCell = id => {
    const cell = LIM_CELL_BY_ID[id];
    return cell ? { id: cell.id, limId: cell.id, label: cell.title, accent: cell.accent, accessibilityLabel: cell.accessibilityLabel, primaryFaceId:cell.primaryFaceId, children: [] } : null;
};
export const LIM_GRAPHS = Object.freeze(LIM_FACES.map(face => Object.freeze({
    id: face.id,
    limId: face.id,
    label: face.title,
    accent: face.accent,
    accessibilityLabel: `${face.title} LIM face`,
    children: Object.freeze(face.showcase.map(branch => {
        const node = graphCell(branch.id);
        return node ? Object.freeze({ ...node, children: Object.freeze(branch.children.map(graphCell).filter(Boolean).map(Object.freeze)) }) : null;
    }).filter(Boolean))
})));
const cellByLabel = new Map(LIM_ALL_CELLS.map(cell => [cell.title, cell]));
const LEGACY_LABEL_IDS = Object.freeze({Climate:'lim-climate','Food forest':'lim-food-forest',Plant:'lim-plant',Pin:'lim-pin'});
export function limLearningContent(labelOrId) {
    const cell = LIM_CELL_BY_ID[labelOrId] || LIM_CELL_BY_ID[LEGACY_LABEL_IDS[labelOrId]] || cellByLabel.get(labelOrId);
    const label = cell?.title || String(labelOrId ?? 'Learning');
    const face = LIM_FACES.find(item => item.id === cell?.primaryFaceId);
    return {
        id: cell?.id || String(labelOrId || ''), title: label,
        breadcrumb: `Learn to learn · ${face?.title || 'Learning Information Mesh'}${cell && cell.id !== face?.id ? ` · ${label}` : ''}`,
        body: cell?.content || fallbackBody(label), primaryFaceId: cell?.primaryFaceId || null,
        primaryFace: face?.title || '', relatedFaceIds: cell?.relatedFaceIds || Object.freeze([]),
        accent: cell?.accent || '', accessibilityLabel: cell?.accessibilityLabel || `${label} learning cell`,
        pathwayRefs: cell?.pathwayRefs || Object.freeze([])
    };
}
export function limCellById(id) { return LIM_CELL_BY_ID[id] || null; }
