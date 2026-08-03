import { pimToArKnowledge } from './pimModel.js';
import { PIGEON_PEA_PIM } from './pigeonPeaPim.js';

export const PIGEON_PEA_EXAMPLE = Object.freeze({
    id: 'example-1',
    name: 'Example 1',
    slug: 'pigeon-pea',
    commonName: 'Pigeon Pea',
    scientificName: 'Cajanus cajan',
    family: 'Fabaceae',
    plantType: 'Short-lived perennial legume shrub',
    introduction: 'Lets pick a example plant for you. lets go for the Pigeon Pea - Why a pigeon pea? Because its one of the best plants to have in a garden. A highly productive support plant that provides food, replenished soil and biodiversity within the garden.',
    shortProfile: 'Pigeon pea is a fast-growing perennial edible legume that is ecological powerhouse. Its edible peas provide a useful crop, while its nitrogen-fixing contribute to the living soil. It can also function as a temporary hedge, shelter plant and source of chop-and-drop biomass.',
    informationTree: Object.freeze([
        { id: 'about', label: 'ABOUT', details: ['Scientific name: Cajanus cajan', 'Family: Fabaceae', 'Form: Upright, branching perennial shrub', 'Native range: Indian subcontinent', 'Climate: Tropical and subtropical'] },
        { id: 'growth', label: 'GROWTH', details: ['Position: Full sun', 'Water: Drought-tolerant once established', 'Soil: Adaptable, including relatively poor soils', 'Habit: Fast-growing and suitable for intercropping', 'Sensitivity: Protect from severe frost and waterlogged soil'] },
        { id: 'food', label: 'FOOD', details: ['Edible parts: Green peas and mature dried seeds', 'Harvest: Pick young pods for green peas or allow pods to dry', 'Preparation: Cook peas and mature seeds before eating', 'Value: Protein-rich food crop'] },
        { id: 'soil', label: 'SOIL', details: ['Function: Nitrogen-fixing legume', 'Leaf litter: Returns organic matter to the soil', 'Roots: Helps cycle nutrients through the growing system', 'Use: Supports depleted soils and low-input growing systems'] },
        { id: 'garden-role', label: 'GARDEN ROLE', details: ['Support species', 'Temporary shelter and light shade', 'Chop-and-drop biomass', 'Living hedge or productive boundary', 'Companion for intercropped food plants'] },
        { id: 'biodiversity', label: 'BIODIVERSITY', details: ['Flowers provide resources for visiting insects', 'Dense branching provides temporary habitat and shelter', 'Adds a flowering legume layer to the garden', 'Contributes food, biomass and structural diversity'] },
        { id: 'management', label: 'MANAGEMENT', details: ['Prune to control height and encourage branching', 'Use prunings as mulch where appropriate', 'Harvest pods regularly for food production', 'Replace ageing plants as part of garden succession'] },
        { id: 'story', label: 'STORY', details: ['Summary: Pigeon pea connects food production with soil renewal.', 'Demonstration message: One plant can provide food, habitat, biomass and support for the wider garden system.'] }
    ])
});

// AR consumes the same canonical Pigeon Pea document as Web Mode. Only this
// final conversion is renderer-specific; category IDs, paths and content stay
// owned by the shared PIM model.
export const PIGEON_PEA_AR_KNOWLEDGE = Object.freeze(pimToArKnowledge(PIGEON_PEA_PIM));
