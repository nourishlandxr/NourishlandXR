import { createPimoGraph, addPimoCell, connectPimoCells } from "./pimoGraph.js?v=0.9792";
import { applyPimoDesign } from "./pimoGraphDesigns.js?v=0.9792";

export const PIMO_TEMPLATES = [
    { id: 'classic', title: 'Classic', subtitle: 'The original six knowledge families', icon: 'hexagon', color: '#507869' },
    { id: 'utility', title: 'Utility', subtitle: 'Uses, in all their forms', icon: 'spark', color: '#bc7959' },
    { id: 'bio', title: 'Bio', subtitle: 'Scientific & historical knowledge', icon: 'leaf', color: '#648f9b' },
    { id: 'food-forest', title: 'Food Forest', subtitle: 'Layers & living relationships', icon: 'sprout', color: '#6f825a' },
    { id: 'growing', title: 'Propagation & Cultivation', subtitle: 'Create new plants. Help them grow.', icon: 'grow', color: '#b19a64' },
    { id: 'empty', title: 'Empty', subtitle: 'One idea. Any direction.', icon: 'circle', color: '#7b769b' }
];

export function createPimoTemplate(template = 'utility', { design = template === 'classic' ? 'classic' : 'organic' } = {}) {
    const titles = { classic: 'My plant knowledge', utility: 'The useful garden', bio: 'A closer look', 'food-forest': 'My food forest', growing: 'Growing together', empty: 'My knowledge garden' };
    if (!titles[template]) throw Error('Choose a PIMO starter template.');
    let graph = createPimoGraph(titles[template]);
    graph.metadata = { template };
    const ids = [];
    function cell(title, x, y, parent = -1, color = '#6f825a', body = '') { const result = addPimoCell(graph, { title, x, y, parentId: ids[parent] || '', color, body }); graph = result.graph; ids.push(result.id); return ids.length - 1; }
    cell(graph.identity.title, 0, 0, -1, '#507869', 'The beginning of your knowledge map. Add what matters to this place.');
    graph.layout.nodes[ids[0]].width = 216; graph.layout.nodes[ids[0]].height = 158;
    if (template === 'empty') return applyPimoDesign(graph, design);
    if (template === 'classic') {
        ['Food Forest', 'Uses', 'Propagation', 'Scientific Information', 'Historical Data', 'Cultivation'].forEach((title, i) => {
            const angle = i / 6 * Math.PI * 2 - Math.PI / 2;
            cell(title, Math.cos(angle) * 350, Math.sin(angle) * 245, 0, ['#6f825a', '#bc7959', '#648f9b', '#7b769b', '#b19a64', '#507869'][i]);
        });
    } else if (template === 'utility') {
        cell('Uses', 0, -220, 0, '#b19a64');
        cell('Edible', -330, -240, 1, '#6f825a'); cell('Medicinal knowledge', 330, -240, 1, '#bc7959', 'Collect attributed knowledge, sources and safety context.');
        cell('Kitchen & sharing', -300, 160, 2, '#648f9b'); cell('Materials & craft', 310, 160, 1, '#7b769b');
        cell('Edible flowers', -550, -80, 2, '#bc7959');
        graph = connectPimoCells(graph, ids[4], ids[5], { label: 'share a practice' }).graph;
    } else if (template === 'bio') {
        cell('Scientific Information', -285, -50, 0, '#648f9b'); cell('Historical Data', 285, -50, 0, '#7b769b');
        cell('Identification', -490, -240, 1, '#6f825a'); cell('Research & sources', -490, 180, 1, '#648f9b');
        cell('Stories through time', 500, -230, 2, '#b19a64'); cell('Attributed knowledge', 500, 190, 2, '#bc7959');
    } else if (template === 'food-forest') {
        cell('Layers', -285, -50, 0, '#6f825a'); cell('Relationships', 285, -50, 0, '#648f9b');
        cell('Canopy', -510, -240, 1, '#507869'); cell('Understory', -550, -30, 1, '#6f825a'); cell('Forest floor', -480, 185, 1, '#b19a64');
        cell('Wildlife', 520, -220, 2, '#bc7959'); cell('Soil & fungi', 520, 160, 2, '#7b769b');
        graph = connectPimoCells(graph, ids[5], ids[7], { label: 'explore the connection' }).graph;
    } else if (template === 'growing') {
        cell('Propagation', -285, -50, 0, '#648f9b'); cell('Cultivation', 285, -50, 0, '#b19a64');
        cell('Seeds', -500, -235, 1, '#6f825a'); cell('Cuttings', -500, 180, 1, '#bc7959');
        cell('Growing conditions', 510, -230, 2, '#507869'); cell('Seasonal care', 510, 180, 2, '#7b769b');
    }
    return applyPimoDesign(graph, design);
}
