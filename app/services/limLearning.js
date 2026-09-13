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
export const LIM_CELLS = Object.freeze(LIM_GROUPS.flatMap(buildGroupCells));
export const LIM_CELL_BY_ID = Object.freeze(Object.fromEntries(LIM_CELLS.map(cell => [cell.id, cell])));
export const LIM_GRAPHS = Object.freeze(LIM_GROUPS.map(group => Object.freeze({ label: group.title, children: group.children })));
const cellByLabel = new Map(LIM_CELLS.map(cell => [cell.title, cell]));
export function limLearningContent(labelOrId) {
    const cell = LIM_CELL_BY_ID[labelOrId] || cellByLabel.get(labelOrId);
    const label = cell?.title || String(labelOrId ?? 'Learning');
    return { title: label, breadcrumb: `Learn to learn · ${label}`, body: cell?.content || fallbackBody(label) };
}
export function limCellById(id) { return LIM_CELL_BY_ID[id] || null; }
