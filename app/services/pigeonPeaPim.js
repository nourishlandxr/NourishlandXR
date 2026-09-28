import { createPimDocument } from './pimModel.js';
import { enrichTrialNodes, PIGEON_PEA_TRIAL } from './plantTrialContent.js';

const REFERENCE_DATE = '2026-08-03T00:00:00.000Z';

function node(id, parentId, title, preview, body, options = {}) {
    return {
        id,
        parentId,
        title,
        preview,
        body,
        informationType: options.informationType || 'fact',
        evidenceStatus: options.evidenceStatus || 'needs_review',
        status: 'published',
        tags: options.tags || [],
        region: options.region || '',
        climateContext: options.climateContext || '',
        sourceIds: options.sourceIds || [],
        attribution: options.attribution || '',
        safetyNote: options.safetyNote || '',
        displayOrder: options.displayOrder || 0,
        createdAt: REFERENCE_DATE,
        updatedAt: REFERENCE_DATE,
        provenance: options.provenance || []
    };
}

const nodes = [
    node('food-forest', null, 'Food Forest', 'Food, seed and living support', 'Pigeon pea can combine a harvestable crop with fast biomass, temporary shelter and a productive shrub layer. Its actual role should be read from the plant, season and neighbouring species in the place.', { informationType: 'category' }),
    node('ecological-functions', 'food-forest', 'Ecological functions', 'Soil, habitat and biomass support', 'Explore how roots, canopy, flowers and prunings interact with the surrounding planting. These are relationships to observe and manage, not automatic benefits.', { informationType: 'category' }),
    node('nitrogen-fixation', 'ecological-functions', 'Nitrogen fixation', 'Root-associated nitrogen support', 'Pigeon pea forms root-nodule relationships with compatible soil bacteria. How much nitrogen becomes available to neighbouring plants depends on soil biology, management and local conditions.'),
    node('root-nodule-symbiosis', 'nitrogen-fixation', 'Root-nodule symbiosis', 'Bacteria work with roots', 'Root nodules are the visible structures associated with this plant-bacteria relationship. Local observation should be used before assuming that nodulation is active in a particular soil.'),
    node('biomass-and-mulch', 'ecological-functions', 'Biomass and mulch', 'Prunings become mulch', 'Pruned leaves and small stems can be returned to the soil surface as chop-and-drop material.', { informationType: 'practice' }),
    node('nurse-plant', 'ecological-functions', 'Nurse plant', 'Temporary shelter and shade', 'Its quick growth can provide temporary shelter and light shade while slower food-forest plants establish.', { informationType: 'guidance' }),
    node('pollinator-resource', 'ecological-functions', 'Flower visitors', 'Observe pollinators and timing', 'Record which insects visit the flowers, the time of day and what else is flowering nearby. This turns a general pollinator value into evidence about the local garden.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('habitat-structure', 'ecological-functions', 'Habitat structure', 'Branching shelter in the shrub layer', 'The branching canopy can add temporary structure for small garden life. Observe what uses the plant and avoid claiming a relationship that has not been seen locally.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('food-forest-layer', 'food-forest', 'Food-forest layer', 'Shrub to small tree', '', { informationType: 'category' }),
    node('shrub-layer', 'food-forest-layer', 'Shrub layer', 'Productive support layer', 'Pigeon pea is commonly managed as a shrub or short-lived small tree in a layered planting.'),

    node('uses', null, 'Uses', 'Peas, fodder and materials', '', { informationType: 'category' }),
    node('culinary', 'uses', 'Culinary', 'Fresh peas, young pods and dried pulse', 'Different harvest stages have different textures, cooking needs and cultural uses. Retain the recipe source and preparation context with a food record.', { informationType: 'category' }),
    node('fresh-peas', 'culinary', 'Fresh peas', 'Harvest green seeds', 'Green seeds may be harvested and cooked while still tender. Preparation practices vary between cuisines and varieties.', { informationType: 'practice' }),
    node('young-pods', 'culinary', 'Young pods', 'Tender-stage harvest', 'Very young pods are used in some food traditions. Confirm variety, tenderness and an appropriate preparation method before use.', { informationType: 'practice', safetyNote: 'Correct identification and appropriate food preparation are required.' }),
    node('dried-pulse', 'culinary', 'Dried pulse', 'Store mature dry peas', 'Mature dry peas are a storable pulse and should be cooked before eating.', { informationType: 'practice' }),
    node('soak-and-cook', 'dried-pulse', 'Soak and cook', 'Process before eating', 'Sorting, soaking and thorough cooking practices depend on the recipe and the age of the stored seed.', { informationType: 'guidance', safetyNote: 'Do not treat raw dried seed as ready-to-eat food.' }),
    node('culinary-record', 'culinary', 'Culinary record', 'Keep harvest and recipe context', 'Record whether the harvest was a young pod, green seed or mature dry pulse, together with the preparation method and the person, publication or tradition that supplied it.', { informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A named recipe source, knowledge holder or community should accompany a specific preparation.' }),
    node('medicinal', 'uses', 'Medicinal', 'Attribution is required', 'Medicinal information belongs here only when it is accurately attributed to a named community, practitioner or reliable source.', { informationType: 'category', attribution: 'No universal medicinal claim is made by this reference profile.', safetyNote: 'This profile does not provide medical advice.' }),
    node('traditional-knowledge-boundary', 'medicinal', 'Traditional knowledge boundary', 'Document source and context', 'Record who shared the knowledge, the region and cultural context, and any limits placed on sharing it.', { informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A specific knowledge holder or community must be named before adding a practice.', safetyNote: 'Traditional-use records are not medical advice.' }),
    node('craft', 'uses', 'Craft', 'Stems, stakes and fuel', '', { informationType: 'category' }),
    node('garden-stakes', 'craft', 'Garden stakes', 'Use straight mature stems', 'Mature woody stems can be reused as short-lived garden stakes or light structural material.', { informationType: 'practice' }),
    node('basket-materials', 'craft', 'Basket materials', 'Local fibre experiments', 'Flexible material may be tested in locally appropriate craft work. Suitability varies with stem age and preparation.', { informationType: 'practice' }),
    node('fuelwood', 'craft', 'Fuelwood', 'Dry woody prunings', 'Dry woody material may be used as small fuel where local fire rules and clean-burning practices allow.', { informationType: 'practice', safetyNote: 'Follow local fire restrictions and ventilation requirements.' }),
    node('animal-fodder', 'uses', 'Animal fodder', 'Leaves and pods', 'Pigeon pea foliage and seed are used in some animal-feeding systems. Species, ration balance and local husbandry guidance matter.', { informationType: 'guidance', safetyNote: 'Confirm suitability and ration guidance for the animal species.' }),

    node('propagation', null, 'Propagation', 'Seed selection, sowing and sharing', 'Seed propagation connects plant identity with a particular season and place. Keep source, variety, harvest and performance notes so each new generation retains useful context.', { informationType: 'category' }),
    node('seed', 'propagation', 'Seed', 'Primary propagation method', '', { informationType: 'category' }),
    node('direct-sowing', 'seed', 'Direct sowing', 'Sow where plants will grow', 'Direct sowing avoids transplant disturbance and is useful when the final planting position is ready.', { informationType: 'guidance' }),
    node('establishment-timing', 'direct-sowing', 'Establishment timing', 'Use warm growing conditions', 'Choose a warm establishment period with enough soil moisture for germination, adjusting timing to the local climate and season.', { informationType: 'guidance', climateContext: 'Timing varies by climate and season.' }),
    node('nursery-sowing', 'seed', 'Nursery sowing', 'Protect young seedlings', 'Seed can also be started in a nursery container and planted out while young, before roots become restricted.', { informationType: 'guidance' }),
    node('seed-saving', 'seed', 'Seed saving', 'Select healthy mature pods', 'Allow selected pods to mature and dry fully before shelling and storing the seed.', { informationType: 'practice' }),
    node('storage-check', 'seed-saving', 'Storage check', 'Keep seed dry and labelled', 'Store clean dry seed in a labelled container and review it periodically for moisture or insect damage.', { informationType: 'guidance' }),
    node('germination-check', 'seed-saving', 'Germination check', 'Trial a small labelled sample', 'Before relying on older stored seed, trial a small counted sample and record how many emerge. Keep the date and conditions with the result.', { informationType: 'practice' }),
    node('sharing-seed', 'propagation', 'Sharing seed', 'Grow, learn and distribute', 'Record the variety, source, harvest season and local performance when sharing seed so future growers retain useful context.', { informationType: 'practice' }),

    node('scientific-information', null, 'Scientific Information', 'Identity, form and life cycle', 'Scientific information supports reliable identification and comparison. Use botanical name, family, growth form, leaves, flowers and pods together rather than depending on one feature.', { informationType: 'category' }),
    node('taxonomy', 'scientific-information', 'Taxonomy', 'Name and classification', '', { informationType: 'category' }),
    node('accepted-botanical-name', 'taxonomy', 'Accepted botanical name', 'Cajanus cajan', 'The botanical name used in this reference profile is Cajanus cajan.', { sourceIds: ['pigeon-pea-reference-name'] }),
    node('taxonomic-record', 'accepted-botanical-name', 'Taxonomic record', 'Verify against current authority', 'Taxonomic names and synonymy should be checked against a current botanical authority before formal publication.', { informationType: 'guidance' }),
    node('family', 'taxonomy', 'Family', 'Fabaceae', 'Pigeon pea belongs to the legume family, Fabaceae.', { sourceIds: ['pigeon-pea-reference-family'] }),
    node('morphology', 'scientific-information', 'Morphology', 'Woody branching legume', '', { informationType: 'category' }),
    node('growth-form', 'morphology', 'Growth form', 'Shrub or small tree', 'It is a branching, often short-lived perennial shrub that can become a small tree under favourable management.'),
    node('leaf-identification', 'morphology', 'Leaves', 'Three leaflets on each leaf', 'The leaves are typically divided into three leaflets. Leaf form should be checked alongside flowers, pods, branching and a reliable local identification reference.'),
    node('flower-identification', 'morphology', 'Flowers', 'Pea-family flower form', 'Flowers have the characteristic pea-family form and may show colour variation. Record colour and flowering time as supporting features rather than using them alone.'),
    node('pod-identification', 'morphology', 'Pods and seed', 'Flattened pods with visible seed positions', 'Pods mature from green to dry and contain several seeds. Pod shape, surface, colour and seed appearance can support identification and harvest records.'),
    node('phenology', 'scientific-information', 'Phenology', 'Flowering and pod cycles', 'Flowering and pod production respond to variety, day length, temperature, water and plant age.'),
    node('common-names', 'scientific-information', 'Common names', 'Regional and local names', '', { informationType: 'category' }),
    node('pigeon-pea-common-name', 'common-names', 'Pigeon pea', 'Primary common name', 'Pigeon pea is the primary common name used in this reference profile. Use this menu to add regional names with their language, place and source.', { informationType: 'fact' }),

    node('historical-data', null, 'Historical Data', 'Cultivation, movement and cultural records', 'Historical records should keep places, dates, communities and sources visible. They explain how a plant and its practices moved without presenting one simplified origin story as complete.', { informationType: 'category' }),
    node('range-and-movement', 'historical-data', 'Range and movement', 'Origins and cultivation spread', '', { informationType: 'category' }),
    node('native-range', 'range-and-movement', 'Native range', 'Document sources carefully', 'Published accounts of origin and early domestication should be retained with their sources because historical interpretations can differ.', { informationType: 'historical_record' }),
    node('cultivated-distribution', 'range-and-movement', 'Cultivated distribution', 'Now grown widely', 'Pigeon pea is cultivated across many tropical and subtropical regions for food, fodder and farming-system functions.', { informationType: 'historical_record' }),
    node('regional-movement-record', 'cultivated-distribution', 'Regional movement record', 'Attach dates and sources', 'A useful movement record names the place, approximate date, variety or seed line, people or organisation involved, and documentary source.', { informationType: 'guidance' }),
    node('local-introduction-record', 'cultivated-distribution', 'Local introduction record', 'How did this seed reach this place?', 'For a project record, note who introduced the seed, when it arrived, where it came from and whether the current plants descend from that material.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('cultural-history', 'historical-data', 'Cultural history', 'Local names and practices', '', { informationType: 'category' }),
    node('attributed-traditional-knowledge', 'cultural-history', 'Attributed traditional knowledge', 'Name the knowledge holders', 'Traditional knowledge must be presented with appropriate attribution and must not be framed as universally shared knowledge.', { informationType: 'traditional_knowledge', evidenceStatus: 'community_contributed', attribution: 'A named knowledge holder or community is required.' }),

    node('cultivation', null, 'Cultivation', 'Establishment, care, harvest and response', 'Cultivation guidance becomes useful when it is tested against local light, soil, rainfall, season and plant condition. Record responses so care can change with the place.', { informationType: 'category' }),
    node('climate', 'cultivation', 'Climate', 'Tropical and subtropical', '', { informationType: 'category' }),
    node('warm-growing-conditions', 'climate', 'Warm growing conditions', 'Frost-sensitive growth', 'Growth is strongest in warm conditions. Local frost exposure, rainfall pattern and planting season should guide management.', { informationType: 'guidance', climateContext: 'Local climate and season change results.' }),
    node('seasonal-variation', 'warm-growing-conditions', 'Seasonal variation', 'Observe local performance', 'Record flowering, pod set, dieback and regrowth by season rather than assuming the same cycle in every region.', { informationType: 'local_observation' }),
    node('light', 'cultivation', 'Light', 'Full sun preferred', '', { informationType: 'category' }),
    node('full-sun', 'light', 'Full sun', 'Supports sturdy productive growth', 'Full sun generally supports strong flowering and pod production, while neighbouring canopy growth can change performance.', { informationType: 'guidance' }),
    node('spacing-and-access', 'light', 'Spacing and access', 'Keep light and harvest access', 'Allow enough room to reach the plant for pruning and harvest while considering shade on neighbours. The useful spacing depends on the intended size and pruning cycle.', { informationType: 'guidance' }),
    node('soil', 'cultivation', 'Soil', 'Drainage with living biology', '', { informationType: 'category' }),
    node('soil-drainage', 'soil', 'Soil drainage', 'Avoid prolonged waterlogging', 'Establishment is generally more reliable in soil that drains after heavy rain.', { informationType: 'guidance' }),
    node('soil-observation', 'soil', 'Soil observation', 'Check moisture, roots and nodules', 'Observe drainage after rain, root health and whether nodules are present before assuming the soil relationship is functioning. Add dated photographs or notes when possible.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('water', 'cultivation', 'Water', 'Support establishment first', '', { informationType: 'category' }),
    node('establishment-water', 'water', 'Establishment water', 'Moisture while roots establish', 'Provide suitable moisture during germination and early establishment, then adapt watering to soil, rainfall, season and plant condition.', { informationType: 'guidance' }),
    node('maintenance', 'cultivation', 'Maintenance', 'Prune for useful regrowth', '', { informationType: 'category' }),
    node('pruning', 'maintenance', 'Pruning', 'Shape and renew biomass', 'Pruning can manage height, light and biomass production. Timing and severity should reflect plant health and the needs of neighbouring plants.', { informationType: 'guidance' }),
    node('chop-and-drop-cycle', 'pruning', 'Chop-and-drop cycle', 'Return suitable prunings', 'Place clean, suitable prunings on the soil surface while keeping material away from vulnerable stems and avoiding diseased material.', { informationType: 'practice' }),
    node('pruning-response', 'pruning', 'Regrowth response', 'Record what follows each cut', 'Note the cut height, season, plant condition and time taken to regrow. This helps refine a pruning cycle for biomass, light or harvest rather than repeating a fixed schedule.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('health-check', 'maintenance', 'Plant health check', 'Observe before choosing a response', 'Record the location and timing of leaf damage, stem problems, pests or dieback together with recent weather and management. Compare change over time before selecting a treatment.', { informationType: 'local_observation', evidenceStatus: 'local_observation' }),
    node('harvest', 'cultivation', 'Harvest', 'Green or dry stages', 'Harvest timing depends on whether tender seed, young pods or mature dry pulse is wanted.', { informationType: 'guidance' })
];

function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
}

export const PIGEON_PEA_PIM = deepFreeze(createPimDocument({
    id: 'cajanus-cajan-pim',
    plantId: 'cajanus-cajan',
    identity: {
        commonName: 'Pigeon Pea',
        scientificName: 'Cajanus cajan',
        identityStatement: 'A productive legume shrub used for food, propagation, biomass and support within warm-climate food forests.',
        synonyms: [],
        regionalNames: [],
        tags: ['legume', 'pulse', 'food forest', 'support plant']
    },
    nodes: enrichTrialNodes(nodes, PIGEON_PEA_TRIAL, 'pigeon-pea-agroforestry'),
    sources: [...PIGEON_PEA_TRIAL.sources,
        { id: 'pigeon-pea-reference-name', title: 'World Agroforestry — Cajanus cajan taxonomy', url: 'https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=408' },
        { id: 'pigeon-pea-reference-family', title: 'World Agroforestry — Cajanus cajan taxonomy', url: 'https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=408' }],
    createdAt: REFERENCE_DATE,
    updatedAt: REFERENCE_DATE,
    now: REFERENCE_DATE,
    metadata: {
        referenceProfile: true,
        editorialNote: 'Claims marked needs_review require an authoritative source or attributed local record before evidence status is upgraded.'
    }
}));
