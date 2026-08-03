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

const informationCell = (id, label, description = '', children = []) => Object.freeze({
    id,
    label,
    description,
    children: Object.freeze(children)
});

// Reusable plant data: the renderer knows only about categories, directions
// and children. Replacing this object with another plant produces the same PIM.
export const PIGEON_PEA_AR_KNOWLEDGE = Object.freeze({
    id: 'pigeon-pea',
    plantId: PIGEON_PEA_EXAMPLE.slug,
    name: PIGEON_PEA_EXAMPLE.commonName,
    scientificName: PIGEON_PEA_EXAMPLE.scientificName,
    title: PIGEON_PEA_EXAMPLE.commonName,
    core: Object.freeze({ scientific: PIGEON_PEA_EXAMPLE.scientificName, layer: 'Shrub layer' }),
    categories: Object.freeze([
        informationCell('food-forest', 'Food Forest', 'Roles in a layered, living food system.', [
            informationCell('shrub-layer', 'Shrub layer'),
            informationCell('nitrogen-fixer', 'Nitrogen fixer', 'A legume relationship that supports living soil.'),
            informationCell('nurse-plant', 'Nurse plant', 'Shelter and light shade while slower plants establish.'),
            informationCell('windbreak', 'Windbreak', 'A temporary living screen in a young guild.'),
            informationCell('biomass-mulch', 'Biomass and mulch', 'Prune, chop and return growth to the soil.', [
                informationCell('prune', 'Prune', 'Manage height and stimulate branching.'),
                informationCell('chop-drop', 'Chop and drop', 'Lay soft growth on the soil surface.'),
                informationCell('succession', 'Succession', 'Sacrifice, save seed and replant when the guild needs space.')
            ])
        ]),
        informationCell('uses', 'Uses', 'Food, fodder and practical garden value.', [
            informationCell('edible-seeds', 'Edible seeds', 'Harvest green or mature seed.', [
                informationCell('harvest', 'Harvest', 'Pick young pods or wait for mature dry seed.'),
                informationCell('processing', 'Processing', 'Sort, dry, store and cook before eating.'),
                informationCell('seed-saving', 'Seed saving', 'Keep vigorous seed for experimenting, sharing and expansion.')
            ]),
            informationCell('young-pods', 'Young edible pods'),
            informationCell('dried-pulse', 'Dried pulse'),
            informationCell('animal-fodder', 'Animal fodder')
        ]),
        informationCell('medicinal', 'Medicinal', 'Traditional knowledge only; not medical advice.', [
            informationCell('traditional-leaf', 'Traditional leaf uses', 'Traditional knowledge; not medical advice.'),
            informationCell('traditional-root', 'Traditional root uses', 'Traditional knowledge; not medical advice.'),
            informationCell('safety', 'Knowledge and safety', 'Record the community, source and context. Do not present traditional use as clinical guidance.')
        ]),
        informationCell('scientific-information', 'Scientific Information', 'Botany and growth form.', [
            informationCell('botanical-name', 'Botanical name', 'Cajanus cajan'),
            informationCell('family', 'Family', 'Fabaceae'),
            informationCell('growth-form', 'Growth form', 'Annual or short-lived perennial shrub.'),
            informationCell('dry-tropical-legume', 'Dry-tropical legume')
        ]),
        informationCell('historical-data', 'Historical Data', 'Origin, cultivation and movement.', [
            informationCell('native-range', 'Native range', 'Indian subcontinent.'),
            informationCell('cultivated-pulse', 'Long-cultivated tropical pulse'),
            informationCell('global-cultivation', 'Cultivated widely', 'Now grown throughout many tropical and subtropical regions.')
        ]),
        informationCell('craft', 'Craft', 'Practical uses for stems and dry material.', [
            informationCell('basket-work', 'Basket work', 'Basket work from stems.'),
            informationCell('fuelwood', 'Fuelwood', 'Stems used as fuelwood.'),
            informationCell('garden-stakes', 'Garden stakes'),
            informationCell('natural-crafts', 'Natural crafts', 'Dry plant material for simple natural crafts.')
        ])
    ].map((category, index) => Object.freeze({
        ...category,
        direction: ['top', 'upper-left', 'lower-left', 'upper-right', 'lower-right', 'bottom'][index]
    })))
});
