import { SPATIAL_NOTE_TEMPLATES } from '../../services/spatialNoteTemplates.js';

export const PIGEON_PEA_CONTROL_IMAGE = new URL('../../assets/pigeon-pea-cajanus-cajan.png', import.meta.url).href;

export const DEMO_TUTORIAL_ART = Object.freeze({
    wheel:{image:new URL('../../assets/living-knowledge-seed-atlas.png',import.meta.url).href,alt:'Nourishland website hero knowledge wheel, a visual index to information that can grow around a place.'},
    curiosity:{image:new URL('../../assets/demo-tutorial-art/01-plant-curiosity.png',import.meta.url).href,alt:'A visitor pauses beside an unfamiliar plant, wondering what it is.'},
    companion:{image:new URL('../../assets/demo-tutorial-art/02-companion-control-panel.png',import.meta.url).href,alt:'A visitor explores the NourishlandXR companion Control panel.'},
    references:{image:new URL('../../assets/demo-tutorial-art/03-cumbersome-reference-tools.png',import.meta.url).href,alt:'A visitor carries books, a phone, compass and field guides while identifying a plant.'},
    area:{image:new URL('../../assets/demo-tutorial-art/04-create-an-area.png',import.meta.url).href,alt:'A garden Area is organised as part of a living place.'},
    structure:{image:new URL('../../assets/demo-tutorial-art/04b-one-place-clear-structure.png',import.meta.url).href,alt:'Signs for a food forest, rainforest walk and school garden reveal Areas within one connected place.'},
    totem:{image:new URL('../../assets/demo-tutorial-art/05-totem-unfolds-garden-knowledge.png',import.meta.url).href,alt:'A Totem reveals organised plant and garden information in a dense garden.'},
    orb:{image:new URL('../../assets/demo-tutorial-art/06-plant-orb-effects.png',import.meta.url).href,alt:'A Plant Orb connects a plant to its information.'},
    note:{image:new URL('../../assets/demo-tutorial-art/07-add-a-plant-note.png',import.meta.url).href,alt:'A visitor adds a note beside a plant.'},
    connection:{image:new URL('../../assets/demo-tutorial-art/08-connect-pimo-to-limo.png',import.meta.url).href,alt:'Plant information is connected to a learning pathway.'},
    connectedAreas:{image:new URL('../../assets/demo-tutorial-art/10-connected-areas-garden.png',import.meta.url).href,alt:'A monochrome panorama of a large garden with several distinct Totems marking connected Areas.'},
    pathways:{image:new URL('../../assets/demo-tutorial-art/09-explore-archetype-pathways.png',import.meta.url).href,alt:'A visitor explores connected learning pathway archetypes.'}
});

export const DEMO_PANEL_HINTS = Object.freeze([
    'The image panel is attached above.',
    'Open Settings to adjust the experience.',
    'Select Help if you need guidance.',
    'Use Back to revisit an earlier information cell.',
    'Hide this panel when you want an unobstructed view.'
]);

export const WELCOME_BOARD_PARAGRAPHS = Object.freeze([
    'Welcome to the NourishlandXR demo',
    'NLXR is an immersive information hub for living landscapes.'
]);

export const WELCOME_BOARD_PARAGRAPHS_PT = Object.freeze([
    'Bem-vindo à interface de demonstração do NourishlandXR.',
    'A realidade aumentada (RA) e a realidade mista (XR) são tecnologias que nos ajudam a compreender e interagir melhor com o mundo à nossa volta, ligando informação virtual a lugares reais.',
    'O Nourishland XR é um portal de informação sobre plantas, uma ferramenta de mapeamento de ecosistemas e um editor de experiências para visitantes e estudantes. Esta demonstração mostra algumas formas de ligar informação sobre plantas a lugares reais.'
]);

export const DEMO_JOURNEY_STAGES = Object.freeze([
    Object.freeze({id:'why',label:'Arrive'}),
    Object.freeze({id:'map',label:'Plant'}),
    Object.freeze({id:'know',label:'Discover'}),
    Object.freeze({id:'apply',label:'Observe'}),
    Object.freeze({id:'connect',label:'Areas'}),
    Object.freeze({id:'impact',label:'Finish'})
]);

export const DEMO_ORB_MATERIALS = Object.freeze({
    brown: {
        shell: [0.34, 0.23, 0.14], core: [0.67, 0.48, 0.27], radius: 0.07,
        style: '--demo-orb-size:56px;--demo-orb-light:#ead7ba;--demo-orb-mid:#8a6946;--demo-orb-dark:#3e2a1c;--demo-orb-core-light:#f1dfbd;--demo-orb-core-mid:#a77b48;--demo-orb-core-dark:#4d321e'
    },
    pigeonPea: {
        shell: [0.05, 0.34, 0.38], core: [0.42, 0.9, 0.82], ring: [0.55, 0.95, 0.92], radius: 0.065,
        style: '--demo-orb-size:56px;--demo-orb-light:#b8f2e9;--demo-orb-mid:#238a8a;--demo-orb-dark:#073a44;--demo-orb-ring:#8ff4e6'
    },
    green: {
        shell: [0.48, 0.18, 0.05], core: [0.98, 0.62, 0.14], ring: [1, 0.78, 0.25], radius: 0.074,
        style: '--demo-orb-size:62px;--demo-orb-light:#ffe0a0;--demo-orb-mid:#d17723;--demo-orb-dark:#6b250c;--demo-orb-ring:#ffc84a'
    },
    banana: {shell:[.22,.46,.12],core:[.75,.85,.28],ring:[.87,.95,.38],radius:.067,style:'--demo-orb-light:#e5f5a6;--demo-orb-mid:#81a543;--demo-orb-dark:#2b5b31;--demo-orb-ring:#daf378'},
    vetiver: {shell:[.19,.38,.21],core:[.58,.78,.38],ring:[.75,.9,.49],radius:.064,style:'--demo-orb-light:#d9edb0;--demo-orb-mid:#6e9852;--demo-orb-dark:#294d32;--demo-orb-ring:#b9da72'},
    acacia: {shell:[.51,.31,.10],core:[.96,.76,.30],ring:[1,.85,.42],radius:.067,style:'--demo-orb-light:#fff0b5;--demo-orb-mid:#c99843;--demo-orb-dark:#70461c;--demo-orb-ring:#ffdc72'},
    jackfruit: {shell:[.18,.32,.47],core:[.44,.73,.91],ring:[.58,.83,1],radius:.067,style:'--demo-orb-light:#c4ecff;--demo-orb-mid:#4b93b3;--demo-orb-dark:#203e66;--demo-orb-ring:#92d8fa'},
    lychee: {shell:[.47,.14,.27],core:[.96,.46,.61],ring:[1,.65,.74],radius:.067,style:'--demo-orb-light:#ffd2dc;--demo-orb-mid:#ca6685;--demo-orb-dark:#692648;--demo-orb-ring:#ffaac1'}
});

export const BIOMAP_CATEGORIES = Object.freeze({
    FOOD: [], FOREST: [],
    'PLANT LITERACY': ['DWARF', 'DECIDUOUS', 'EVERGREEN', 'ANNUAL', 'PERENNIAL'],
    RELATIONSHIPS: [], FRUIT: [], FLOWER: [], SEED: [], GUILD: [],
    'MICRO CLIMATE': ['TROPICAL', 'SUBTROPICAL', 'WARM TEMPERATE', 'COOL TEMPERATE', 'MEDITERRANEAN', 'ARID'],
    USES: ['CULINARY', 'MEDICINAL', 'INDUSTRIAL'],
    PROPAGATION: ['GRAFTING', 'GERMINATION', 'MARCOTTS', 'CUTTINGS', 'CLONING'],
    LAYERS: ['CANOPY', 'LOW TREE', 'SHRUB', 'HERBACEOUS', 'GROUNDCOVER', 'RHIZOSPHERE', 'VERTICAL']
});

export const INTRO_KNOWLEDGE_KEYWORDS = Object.freeze(Object.keys(BIOMAP_CATEGORIES));

export const DEMO_CONTENT = Object.freeze({
    plant: { title: 'Plant · Pigeon Pea', accent: '#b7e895', lines: ['CLIMATE  Tropical · subtropical', 'USES  Food · soil · biomass', 'RELATIONSHIPS  Pollinators · intercropping'] },
    note: { title: 'Focus Point · Seasonal observation', accent: '#f0cf70', lines: ['STORY  New growth after summer rain', 'MEDIA  Sound · animation · images', 'ACTION  Revisit · compare · update'] },
    zone: { title: 'Welcome to this area', accent: '#785a43', bubbles: ['NOTES · nearby', 'PLANT ORBS · around this Totem', 'NEIGHBOUR TOTEM · right'] },
    zoneTwo: { title: 'Welcome to this area', accent: '#438f99', bubbles: ['NOTES · nearby', 'PLANT ORBS · around this Totem', 'NEIGHBOUR TOTEM · left'] }
});

export const NOTE_TEMPLATES = Object.freeze(Object.fromEntries(SPATIAL_NOTE_TEMPLATES.map(item => [item.id, Object.freeze({
    title: item.title,
    accent: item.color,
    lines: item.topics.length ? item.topics.map(topic => `${topic.title.toUpperCase()}  ${topic.body}`) : [item.description]
})])));

export const DEMO_NOTE_TEMPLATE_KEYS = Object.freeze(Object.keys(NOTE_TEMPLATES));
