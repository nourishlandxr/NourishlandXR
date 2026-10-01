import { createPimDocument } from './pimModel.js';
import { PIM_COMPASS } from './pimCompass.js';

const REFERENCE_DATE = '2026-09-29T00:00:00.000Z';
const COMPASS = new Map(PIM_COMPASS.map(cell => [cell.id, cell]));
const PLANT_MEDIA=Object.freeze({
    acacia:{image:new URL('../assets/demo-plants/acacia-fimbriata-illustrative.webp',import.meta.url).href,imageAlt:'Illustrative Acacia fimbriata botanical reference',imageCaption:'Illustrative only · Acacia fimbriata. The Totem plant remains identified as Acacia sp.'},
    jackfruit:{image:new URL('../assets/demo-plants/jackfruit-artocarpus-heterophyllus.webp',import.meta.url).href,imageAlt:'Jackfruit foliage, flowers, fruit and seed reference',imageCaption:'Jackfruit · Artocarpus heterophyllus'},
    lychee:{image:new URL('../assets/demo-plants/lychee-red-ball-illustrative.webp',import.meta.url).href,imageAlt:'Red Ball lychee foliage, flower and fruit reference',imageCaption:'Illustrative cultivar · Red Ball lychee. The Totem plant cultivar is not identified.'}
});

// These are authored demonstration profiles, not observations of a real site.
// Each source supports the corresponding plant's general reference content.
const PLANTS = Object.freeze({
    banana: {
        name: 'Banana', scientificName: 'Musa spp.',
        statement: 'A fast-growing banana mat with fruiting stems, broad leaves and new shoots rising from an underground rhizome. The cultivar in this demonstration is not identified.',
        sources: [
            { id: 'banana-uf', title: 'University of Florida IFAS — Banana Growing in the Florida Home Landscape', url: 'https://edis.ifas.ufl.edu/publication/MG040/pdf' },
            { id: 'banana-icraf', title: 'World Agroforestry — Bananas in agroforestry', url: 'https://apps.worldagroforestry.org/Units/Library/Books/Book%2006/html/6.2_some_imp_cr_i_rela_w_tree.htm?n=76' }
        ],
        sections: {
            'food-forest': ['A living middle layer', 'Large leaves can add a quick middle layer and temporary shade around younger plantings. In a real garden, compare that shade with the light needed below it.', [
                ['living-shade', 'Living shade', 'Watch the light change', 'Stand beneath the leaves at different times of day. The useful amount of shade depends on neighbouring plants and season.'],
                ['wind-edge', 'A wind-sensitive edge', 'Broad leaves catch wind', 'Banana leaves and fruiting stems can be damaged by strong wind. A protected position or windbreak can change how this layer performs.']
            ]],
            uses: ['Fruit and useful foliage', 'Banana cultivars differ: some fruit are eaten ripe and others are prepared as cooking bananas. Identify the cultivar and preparation before presenting a particular use.', [
                ['fruit-type', 'Fruit type', 'Dessert or cooking banana?', 'The fruit type and maturity stage determine its usual preparation. This demonstration does not identify a cultivar.']
            ]],
            propagation: ['New shoots from the mat', 'Bananas are usually multiplied by shoots from the underground rhizome rather than by seed. A new shoot can replace a stem after it fruits.', [
                ['suckers', 'Suckers', 'Choose a vigorous shoot', 'Sword suckers have relatively narrow young leaves and are generally preferred to weakly attached water suckers for a productive new stem.', [
                    ['mat-renewal', 'Mat renewal', 'One harvest, another stem', 'A banana pseudostem fruits once; another shoot from the mat can take its place. Follow both stems over time to see the cycle.']
                ]]
            ]],
            'scientific-information': ['An herb, not a woody tree', 'The trunk-like pseudostem is made from tightly packed leaf sheaths. Roots and new shoots arise from an underground rhizome.', [
                ['pseudostem', 'Pseudostem', 'A trunk made of leaves', 'What looks like a trunk is built from overlapping leaf sheaths, not wood. The flowering stalk grows through its centre.']
            ]],
            'historical-data': ['A crop carried between places', 'Bananas originated in Southeast Asia and have been cultivated and moved through many regions. A local plant record should name its cultivar and how it reached this Area.', [
                ['cultivar-story', 'Cultivar story', 'Who brought this plant here?', 'A cultivar name, grower, source and planting date can turn a broad crop history into a trustworthy local story.']
            ]],
            cultivation: ['Warmth, water and shelter', 'Bananas grow best with warmth, steady moisture and fertile, well-drained soil. Site conditions and cultivar change the result.', [
                ['water-and-drainage', 'Water and drainage', 'Moist without standing water', 'Check moisture through the growing season and look for drainage after heavy rain. A single watering rule does not fit every site.'],
                ['wind-protection', 'Wind protection', 'Keep the bunch supported', 'Observe the direction of damaging winds and whether fruiting stems need shelter or support.']
            ]]
        }
    },
    vetiver: {
        name: 'Vetiver grass', scientificName: 'Chrysopogon zizanioides',
        statement: 'A densely tufted perennial grass with narrow leaves, flowering panicles and a fibrous root system. This demonstration treats it as a planted living edge whose real effect must be checked against the slope, water movement and neighbouring plants.',
        sources: [
            { id: 'vetiver-kew', title: 'Royal Botanic Gardens, Kew — Chrysopogon zizanioides', url: 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:396213-1/general-information' },
            { id: 'vetiver-usda', title: 'USDA NRCS — Vetivergrass Plant Guide', url: 'https://plants.sc.egov.usda.gov/DocumentLibrary/plantguide/pdf/pg_chzi.pdf' },
            { id: 'vetiver-victoria', title: 'Agriculture Victoria — Invasiveness assessment for Monto vetiver', url: 'https://vro.agriculture.vic.gov.au/dpi/vro/vrosite.nsf/pages/invasive_monto_vetiver' }
        ],
        sections: {
            'food-forest': ['A planted edge to observe', 'A close row of vetiver can be used as a vegetative barrier, but its useful role depends on the contour, spacing, establishment and actual movement of water and sediment at the site.', [
                ['edge-function', 'Edge function', 'Watch water meet the row', 'After rain, observe whether water slows, spreads, ponds, cuts a new path or carries sediment through the planting. Record what happens before calling the row erosion control.'],
                ['neighbour-effect', 'Neighbour effect', 'Check both sides of the hedge', 'A dense grass edge can change access, light and root-zone conditions. Compare the plants on both sides through the season rather than assuming the relationship is helpful.']
            ]],
            uses: ['Roots, leaves and environmental uses', 'Vetiver has documented environmental and material uses, and its aromatic roots are associated with fragrance products. A local record should name the plant part, preparation and source instead of turning those references into a broad food or medicine claim.', [
                ['aromatic-roots', 'Aromatic roots', 'Identify the material and purpose', 'The roots are known for aromatic oil and crafted materials. Keep fragrance or material use separate from any unverified edible or medicinal claim.'],
                ['cut-leaves', 'Cut leaves', 'Record where biomass goes', 'Cut foliage may be retained as biomass or mulch in some systems. Observe whether it covers soil, obstructs access or affects nearby plants in this particular Area.']
            ]],
            propagation: ['Divide an identified clump', 'Cultivated vetiver is commonly propagated vegetatively by dividing a crown into slips. Fertility and spreading behaviour vary among plant material, so do not assume every vetiver plant is sterile.', [
                ['crown-slips', 'Crown slips', 'Keep roots and crown tissue', 'Prepare planting pieces from an identified parent clump, keep them moist and record the source, division date and establishment result.'],
                ['fertility-check', 'Fertility check', 'Cultivar matters', 'Monto vetiver is reported as functionally sterile, but that evidence should not be applied to an unnamed plant. Record the cultivar or provenance before making a sterility claim.']
            ]],
            'scientific-information': ['A perennial grass in Poaceae', 'Chrysopogon zizanioides is the accepted name for a tufted perennial grass formerly widely recorded as Vetiveria zizanioides. Narrow leaf blades, upright culms, panicles and aromatic roots help describe it.', [
                ['diagnostic-form', 'Diagnostic form', 'Photograph more than leaves', 'Record the basal clump, leaf blades, flowering panicle and roots when available. A leaf-only photograph is not enough to confirm an identity.'],
                ['root-observation', 'Root observation', 'Describe what is actually exposed', 'Vetiver is associated with a dense, deep root system, but depth varies with site and age. Measure an exposed or excavated example rather than assigning a fixed depth to this plant.']
            ]],
            'historical-data': ['A species carried beyond its native range', 'Kew records the native range from north-eastern India to Indo-China and documents the former name Vetiveria zizanioides. A local planting still needs its own source and date.', [
                ['name-history', 'Name history', 'Keep the synonym searchable', 'Retain Vetiveria zizanioides as a synonym in older records while publishing the accepted name Chrysopogon zizanioides.'],
                ['planting-story', 'Planting story', 'Who established this row?', 'Record who supplied and planted the material, its cultivar if known, and the intended purpose. That evidence connects the broad species history to this real place.']
            ]],
            cultivation: ['Establish the row, then inspect it', 'Vetiver is used across warm environments and can tolerate varied conditions once established, but new slips still need suitable planting, moisture and follow-up. Local suitability should be observed rather than promised.', [
                ['establishment-check', 'Establishment check', 'Follow each planted slip', 'Check moisture, new shoots, wash-out and gaps during establishment. Replace a failed section only after considering why it failed.'],
                ['maintenance-check', 'Maintenance check', 'Keep the edge functional', 'Record cutting, accumulated sediment, gaps and unwanted effects on access or neighbouring plants. Adjust maintenance to the purpose of this particular edge.']
            ]]
        }
    },
    acacia: {
        name: 'Acacia', scientificName: 'Acacia sp.',
        statement: 'An Acacia tree or shrub in the legume family. Its species is deliberately unconfirmed, so food, propagation and nitrogen claims remain questions to verify.',
        sources: [
            { id: 'acacia-kew', title: 'Royal Botanic Gardens, Kew — Acacia Mill.', url: 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:325783-2/general-information' },
            { id: 'acacia-icraf', title: 'World Agroforestry — Biological nitrogen fixation in agroforestry', url: 'https://apps.worldagroforestry.org/Units/Library/Books/Book%2007/agroforestry%20a%20decade%20of%20development/html/5_the%20role.htm?n=25' }
        ],
        sections: {
            'food-forest': ['Structure to investigate', 'An Acacia can contribute canopy, litter and habitat, but its actual role depends on the species, size and local setting. Start with what this tree demonstrably changes nearby.', [
                ['canopy-pattern', 'Canopy pattern', 'Where does shade fall?', 'Map the moving shade, fallen material and plants beneath the crown before calling it a support tree.'],
                ['nitrogen-question', 'The nitrogen question', 'Do not assume fixation', 'Some acacias form nitrogen-fixing partnerships, but an unidentified Acacia cannot be assigned that function. Confirm the species and local evidence first.']
            ]],
            uses: ['Species before use', 'The name Acacia covers many species with different materials and traditional uses. This demonstration makes no edible or medicinal claim for the unidentified tree.', [
                ['safe-use-boundary', 'Use needs an identity', 'No generic edible seed claim', 'Do not infer that pods or seeds are edible from the genus name. A use record needs a species, plant part, preparation and reliable attribution.']
            ]],
            propagation: ['Pods, seeds and provenance', 'Acacia fruits are pods, but seed handling differs by species. Keep the parent tree, collection place and identification with any propagation record.', [
                ['seed-source', 'Seed source', 'Keep the parent identity', 'Record which plant supplied the seed and use species-specific guidance before treating or sowing it.']
            ]],
            'scientific-information': ['A diverse legume genus', 'Acacia is a genus in Fabaceae. Its species vary in leaves or phyllodes, flower heads or spikes, and pod shape; these features help narrow identification.', [
                ['phyllodes', 'Leaves or phyllodes?', 'Look closely at the foliage', 'Some acacias carry leaf-like phyllodes instead of divided leaves. Photograph foliage, flowers and pods together for a sounder identification.', [
                    ['species-check', 'Species check', 'Keep uncertainty visible', 'Compare several features with a regional botanical key. Until then, retain Acacia sp. rather than inventing a species name.']
                ]]
            ]],
            'historical-data': ['Names and movement need context', 'The currently accepted Acacia genus is especially diverse in Australia. A local record should distinguish the plant’s origin from where it grows now and note the source of its name.', [
                ['name-history', 'Name history', 'Check the accepted name', 'Taxonomic boundaries around Acacia and related genera have changed. Verify a species name against a current authority before publishing a history.']
            ]],
            cultivation: ['Match the actual species to place', 'Light, mature size, water needs and ecological suitability vary greatly across Acacia species. Identify this plant before offering a planting recipe.', [
                ['site-fit', 'Site fit', 'Look beyond a quick-growing tree', 'Record mature size, shade, roots and seed spread. Check local guidance before planting or distributing an unfamiliar Acacia.']
            ]]
        }
    },
    jackfruit: {
        name: 'Jackfruit', scientificName: 'Artocarpus heterophyllus',
        statement: 'A warm-climate fruit tree whose large fruit may develop on the trunk and older branches. Its canopy and harvest need room in a layered planting.',
        sources: [
            { id: 'jackfruit-icraf', title: 'World Agroforestry — Artocarpus heterophyllus species profile', url: 'https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=239' }
        ],
        sections: {
            'food-forest': ['A future upper layer', 'Jackfruit can form a broad, dense canopy. Its long-term height, spread and heavy fruit should be considered before placing smaller plants or paths beneath it.', [
                ['canopy-space', 'Canopy space', 'Design for the grown tree', 'A young tree occupies little room; the mature crown changes light and access. Compare the planned canopy with neighbours and harvest routes.'],
                ['trunk-fruit', 'Fruit on older wood', 'Look beyond the branch tips', 'Jackfruit can carry large fruit on the trunk and older branches. Observe where fruit forms and keep the area below accessible.']
            ]],
            uses: ['Two harvest stages', 'Young jackfruit is cooked as a vegetable; ripe fruit is eaten fresh or processed. The seed is also used after cooking in some food traditions.', [
                ['young-and-ripe', 'Young and ripe fruit', 'One fruit, different kitchens', 'The young pulp and sweet ripe pulp are used differently. Keep the harvest stage and recipe source with a food record.', [
                    ['cooked-seed', 'Cooked seed', 'A second food from the fruit', 'Seeds may be boiled or roasted before eating. Do not present raw seed as a ready-to-eat snack.']
                ]]
            ]],
            propagation: ['Fresh seed or selected variety', 'Jackfruit can be raised from fresh seed, while grafting or other vegetative methods help retain a selected tree’s characteristics.', [
                ['fresh-seed', 'Fresh seed', 'Sow before it dries', 'Jackfruit seed loses viability when stored dry. Keep the seed source and sowing date with the new plant.']
            ]],
            'scientific-information': ['A multiple fruit', 'The jackfruit is a multiple fruit formed from many flowers. Its bumpy exterior surrounds numerous fruitlets and seeds.', [
                ['fruit-structure', 'Fruit structure', 'Many flowers in one form', 'Look at the rind, yellow fleshy portions and seeds to see how many small units make the large fruit.']
            ]],
            'historical-data': ['A tree with regional food histories', 'World Agroforestry lists a native range including Bangladesh, India and Malaysia. Local cultivation and recipes belong to particular people and places.', [
                ['recipe-provenance', 'Recipe provenance', 'Who taught this use?', 'A useful food story names the community, recipe source or grower, along with whether the fruit was young or ripe.']
            ]],
            cultivation: ['Warmth with drainage', 'Jackfruit performs best in warm, humid conditions with reliable moisture, but it does not tolerate prolonged flooding. Leave space for canopy and fruit access.', [
                ['drainage-check', 'Drainage check', 'Water without waterlogging', 'After heavy rain, check whether water drains away from the roots. Record tree response before changing irrigation.']
            ]]
        }
    },
    lychee: {
        name: 'Lychee', scientificName: 'Litchi chinensis',
        statement: 'A dense-crowned fruit tree with seasonal flower panicles and red-skinned fruit. Weather during flowering helps determine whether a season produces a crop.',
        sources: [
            { id: 'lychee-icraf', title: 'World Agroforestry — Litchi chinensis species profile', url: 'https://apps.worldagroforestry.org/treedb2/speciesprofile.php?Spid=1080' }
        ],
        sections: {
            'food-forest': ['A patient fruit-tree layer', 'Lychee grows into a dense, rounded crown. Its shade and roots need to be read alongside neighbouring plants rather than assuming every understorey will thrive.', [
                ['crown-and-light', 'Crown and light', 'Watch the understorey', 'Compare light beneath the crown in different seasons, and keep access for flowering and fruit harvest.']
            ]],
            uses: ['The edible aril', 'The white, juicy aril around the seed is the part commonly eaten fresh or preserved. Identify ripe fruit and its source before offering food from a local tree.', [
                ['fruit-parts', 'Fruit parts', 'Rind, aril and seed', 'Open a fruit to compare the rough rind, translucent edible aril and inner seed. These parts have different roles and should not be confused.']
            ]],
            propagation: ['Keep a selected cultivar', 'Air layering is a common way to reproduce a selected lychee tree. Fresh seed can germinate, but it does not reliably preserve a named cultivar.', [
                ['air-layer', 'Air layering', 'Roots form on a branch', 'A layered branch is rooted while still attached to the parent tree, then separated once established.', [
                    ['fresh-seed', 'Fresh seed', 'Do not let it dry', 'Lychee seed loses viability quickly when it dries. A seed-grown tree also needs its own identity record.']
                ]]
            ]],
            'scientific-information': ['Flower panicles and fruit', 'Lychee bears many small flowers in branching panicles. Fruit develop with a red, rough rind around the edible aril.', [
                ['flower-to-fruit', 'Flower to fruit', 'Track the change', 'Photograph panicles, developing fruit and mature fruit with dates. These stages are more informative than a single harvest image.']
            ]],
            'historical-data': ['A fruit with many names', 'World Agroforestry records lychee in China, Malaysia and Vietnam and lists names across languages. Local names and cultivation stories should keep their place and source.', [
                ['local-name', 'Local name', 'Record language and place', 'Keep a name alongside the language, community or publication that uses it, rather than treating every name as interchangeable.']
            ]],
            cultivation: ['Seasonal flowering', 'Lychee cropping is sensitive to seasonal weather. A flush of new leaves at the wrong time can compete with flower development; wind and standing water also matter.', [
                ['flower-or-leaf', 'Flowers or leaf flush?', 'Read the seasonal signal', 'Compare cool-season weather, new leaves and flower panicles over several seasons before explaining a poor crop.'],
                ['wind-and-water', 'Wind and water', 'Shelter without waterlogging', 'Protect exposed trees from damaging wind while keeping soil moist but well drained.']
            ]]
        }
    }
});

function contentNode(id, parentId, title, preview, body, sourceIds, informationType = 'fact') {
    return { id, parentId, title, preview, body, informationType, evidenceStatus: 'sourced',
        sourceIds, status: 'published', createdAt: REFERENCE_DATE, updatedAt: REFERENCE_DATE };
}

export function demoNeighbourPim(plantId) {
    const plant = PLANTS[plantId];
    if (!plant) throw new Error(`Unknown demonstration neighbour: ${plantId}`);
    const sourceIds = plant.sources.map(source => source.id);
    const nodes = [];
    const addChildren = (parentId, entries) => entries.forEach(([suffix, title, preview, body, children = []]) => {
        const id = `${plantId}-${suffix}`;
        nodes.push(contentNode(id, parentId, title, preview, body, sourceIds));
        addChildren(id, children);
    });
    for (const [rootId, [preview, body, children]] of Object.entries(plant.sections)) {
        nodes.push(contentNode(rootId, null, COMPASS.get(rootId).title, preview, body, sourceIds, 'category'));
        addChildren(rootId, children);
    }
    return createPimDocument({
        id: `${plantId}-demo-pim`, plantId,
        identity: { commonName: plant.name, scientificName: plant.scientificName, identityStatement: plant.statement, ...(PLANT_MEDIA[plantId] || {}) },
        nodes, sources: plant.sources, createdAt: REFERENCE_DATE, updatedAt: REFERENCE_DATE, now: REFERENCE_DATE,
        metadata: { demonstrationProfile: true, editorialNote: 'Reference information is general; no local observation or species identification is implied.' }
    });
}

// This is the authored four-plant inventory around Totem 2. Additional
// profiles, including Banana, remain available through demoNeighbourPim()
// without appearing as unowned or incidental Orbs in that Area.
export const DEMO_NEIGHBOUR_PLANT_IDS = Object.freeze(['vetiver', 'acacia', 'jackfruit', 'lychee']);
