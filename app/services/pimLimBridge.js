// PIM records plant knowledge. LIM turns selected knowledge into questions
// about purpose, relationships, design and action. These bridges keep the two
// meshes distinct while giving visitors an intentional way to move between
// them.
const BRIDGE_GROUPS = Object.freeze([
    Object.freeze({
        id: 'seed-purpose',
        pimIds: Object.freeze(['seed-saving', 'sharing-seed', 'direct-sowing', 'nursery-sowing', 'seed', 'propagation', 'fresh-peas', 'young-pods', 'dried-pulse', 'harvest', 'culinary']),
        title: 'From harvest to purpose',
        question: 'The PIM explains that seed can be harvested, eaten, saved or shared. What good could that do in this place?',
        application: 'Use the LIM to compare local conditions, understand how the plant grows, choose a food-forest function and make a decision that can be reviewed later.',
        limIds: Object.freeze(['lim-intro-analysis-landscape', 'lim-intro-literacy-grow', 'lim-intro-food-function', 'lim-intro-smart-decisions'])
    }),
    Object.freeze({
        id: 'soil-purpose',
        pimIds: Object.freeze(['root-nodule-symbiosis', 'nitrogen-fixation', 'biomass-and-mulch', 'chop-and-drop-cycle', 'soil', 'ecological-functions']),
        title: 'From plant trait to soil purpose',
        question: 'The PIM describes nitrogen fixation or useful biomass. How might that function support this soil and the plants around it?',
        application: 'Use the LIM to test the claim against the site, examine soil relationships, choose a useful function and record feedback from the living system.',
        limIds: Object.freeze(['lim-intro-analysis-landscape', 'lim-intro-literacy-soil-life', 'lim-intro-food-function', 'lim-intro-smart-feedback'])
    }),
    Object.freeze({
        id: 'design-purpose',
        pimIds: Object.freeze(['nurse-plant', 'shrub-layer', 'food-forest-layer', 'food-forest']),
        title: 'From plant profile to design role',
        question: 'The PIM describes a fast-growing support shrub. Where could that role help, and what could it compete with or shade?',
        application: 'Use the LIM to read the existing landscape, explore plant relationships, place the function within a design and define the outcome you expect.',
        limIds: Object.freeze(['lim-intro-analysis-landscape', 'lim-intro-literacy-guilds', 'lim-intro-food-design', 'lim-intro-smart-outcomes'])
    }),
    Object.freeze({
        id: 'care-purpose',
        pimIds: Object.freeze(['pruning', 'maintenance', 'establishment-water', 'water', 'full-sun', 'light', 'seasonal-variation', 'warm-growing-conditions', 'climate']),
        title: 'From care guidance to local action',
        question: 'The PIM offers care guidance. Does it fit the conditions visible here, and how will someone know whether it worked?',
        application: 'Use the LIM to read climate and growth in place, plan stewardship and return through feedback instead of treating general guidance as a fixed rule.',
        limIds: Object.freeze(['lim-intro-analysis-climate', 'lim-intro-literacy-grow', 'lim-intro-food-stewardship', 'lim-intro-smart-feedback'])
    }),
    Object.freeze({
        id: 'knowledge-boundary',
        pimIds: Object.freeze(['traditional-knowledge-boundary', 'attributed-traditional-knowledge', 'medicinal', 'cultural-history']),
        title: 'From information to responsible use',
        question: 'The PIM can preserve a use or tradition. Who provided that knowledge, what context belongs with it, and what should not be claimed?',
        application: 'Use the LIM to examine the source, understand the people and place involved, name limitations and make a responsible decision about sharing.',
        limIds: Object.freeze(['lim-intro-analysis', 'lim-intro-literacy-plants', 'lim-intro-smart-limitations', 'lim-intro-smart-decisions'])
    })
]);

function selectedNode(document, path) {
    return document?.nodes?.find(node => node.id === path || node.path === path) || null;
}

function ancestryIds(document, path) {
    const byId = new Map((document?.nodes || []).map(node => [node.id, node]));
    const ids = [];
    let node = selectedNode(document, path);
    while (node && !ids.includes(node.id)) {
        ids.push(node.id);
        node = byId.get(node.parentId);
    }
    return ids;
}

export function pimLimBridgeFor(document, path) {
    const node = selectedNode(document, path);
    if (!node) return null;
    const ancestry = ancestryIds(document, path);
    const ranked = BRIDGE_GROUPS
        .map(bridge => ({ bridge, distance: Math.min(...bridge.pimIds.map(id => ancestry.indexOf(id)).filter(index => index >= 0)) }))
        .filter(candidate => Number.isFinite(candidate.distance))
        .sort((a, b) => a.distance - b.distance);
    if (!ranked.length) return null;
    const bridge = ranked[0].bridge;
    return Object.freeze({
        ...bridge,
        sourceId: node.id,
        sourceTitle: node.title,
        limIds: Object.freeze([...bridge.limIds])
    });
}

export function defaultPimLimBridge(document) {
    return pimLimBridgeFor(document, 'seed-saving')
        || pimLimBridgeFor(document, 'food-forest')
        || null;
}

export const PIM_LIM_BRIDGE_GROUPS = BRIDGE_GROUPS;
