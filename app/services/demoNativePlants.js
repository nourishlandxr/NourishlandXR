import {resolvePlantPim} from './pimLegacyAdapter.js';
import {pimToArKnowledge} from './pimModel.js';
import {nativePlantDepthNodes,NATIVE_PLANT_DEPTH_TRANSLATIONS} from './demoNativePlantDepth.js';

const illustrationCaption='Stylised black-and-white teaching illustration';
const source=(id,title,url)=>({id,title,url});
export const NATIVE_PLANT_CHOOSER_COPY='Your second Orb is ready. Choose an Australian rainforest plant to give it a name and open its PIMO.';

const blueQuandongSources=[
    source('plantnet-blue-quandong','NSW Flora Online · Elaeocarpus grandis','https://plantnet.rbgsyd.nsw.gov.au/cgi-bin/NSWfl.pl?lvl=sp&name=Elaeocarpus~grandis&page=nswfl'),
    source('rainforest-rescue-blue-quandong','Rainforest Rescue · Significant Seeds: Blue Quandong','https://www.rainforestrescue.org.au/join-us-for-a-significant-seeds-smoko/'),
    source('wet-tropics-fruit-dispersal','Wet Tropics Management Authority · Forest fruit dispersal','https://www.wettropics.gov.au/rainforest_explorer/Resources/Documents/TropicalTopics/Fruitdispersal.pdf')
];
const fingerLimeSources=[
    source('plantnet-finger-lime','NSW Flora Online · Citrus australasica','https://plantnet.rbgsyd.nsw.gov.au/cgi-bin/NSWfl.pl?lvl=sp&name=Citrus~australasica&page=nswfl'),
    source('anbg-finger-lime','Australian National Botanic Gardens · Australian Finger Lime','https://anbg.gov.au/gnp/interns-2013/citrus-australasica.html'),
    source('nsw-finger-lime-guide','NSW Department of Primary Industries · Australian native finger limes growing guide','https://www.dpird.nsw.gov.au/agriculture/horticulture/citrus/content/manuals-guides/finger-limes'),
    source('sunshine-coast-finger-lime-butterfly','Sunshine Coast Council · Butterfly-friendly plants','https://botanic-garden.sunshinecoast.qld.gov.au/learn/gardening-for-butterflies/butterfly-friendly-plants')
];
const lemonMyrtleSources=[
    source('anbg-lemon-myrtle','Australian National Botanic Gardens · Backhousia citriodora','https://www.anbg.gov.au/gnp/gnp14/backhousia-citriodora.html')
];

export const DEMO_NATIVE_PLANTS=Object.freeze([
    {id:'blue-quandong',name:'Blue Quandong',scientific:'Elaeocarpus grandis',family:'Elaeocarpaceae',colour:'#83bbed',
        statement:'A tall eastern Australian rainforest tree whose vivid blue fruit connects canopy-feeding birds and forest-floor seed dispersers.',
        habitat:'PlantNET records Blue Quandong in riverine and lowland subtropical rainforest on alluvium and along streams, north from the Nambucca River.',
        features:'Leaves are simple, oblong to elliptic and regularly toothed. The globose blue fruit surrounds a deeply sculptured stone. NSW Flora Online notes that some treatments include this species in the broader Elaeocarpus angustifolius.',
        source:blueQuandongSources[0],sources:blueQuandongSources,
        wildlifeImage:new URL('../assets/pimo-cell-illustrations/blue-quandong-rainforest.jpg',import.meta.url).href,
        seedImage:new URL('../assets/pimo-cell-illustrations/blue-quandong-seed.jpg',import.meta.url).href,
        image:new URL('../assets/demo-plants/blue-quandong-leaves.jpg',import.meta.url).href},
    {id:'finger-lime',name:'Finger Lime',scientific:'Citrus australasica',family:'Rutaceae',colour:'#b5d88c',
        statement:'A thorny rainforest-understorey citrus with tiny distinctive leaves, finger-shaped fruit and a documented butterfly-host relationship.',
        habitat:'Australian Finger Lime is native to rainforest communities from south-east Queensland to north-east New South Wales, where it grows as an understorey shrub or small tree.',
        features:'The shrub bears solitary axillary spines and small aromatic leaves. Its narrow cylindrical fruit contains separate bead-like juice vesicles; shape and colour vary among forms.',
        source:fingerLimeSources[1],sources:fingerLimeSources,
        wildlifeImage:new URL('../assets/pimo-cell-illustrations/finger-lime-rainforest.jpg',import.meta.url).href,
        seedImage:new URL('../assets/pimo-cell-illustrations/finger-lime-seed.jpg',import.meta.url).href,
        image:new URL('../assets/demo-plants/finger-lime-illustrative.png',import.meta.url).href},
    {id:'lemon-myrtle',name:'Lemon Myrtle',scientific:'Backhousia citriodora',family:'Myrtaceae',colour:'#e4d992',
        statement:'A fragrant Queensland rainforest tree whose flowering season can turn a plant profile into a question about who visits flowers, and when.',
        habitat:'The Australian National Botanic Gardens records Lemon Myrtle in Queensland coastal forests from Brisbane to Mackay, as a shrub or tree reaching about 8 metres.',
        features:'Leaves are strongly lemon-scented. Numerous white flowers with conspicuous stamens occur in clusters; nut-like capsules contain several small seeds.',
        source:lemonMyrtleSources[0],sources:lemonMyrtleSources,
        wildlifeImage:new URL('../assets/pimo-cell-illustrations/lemon-myrtle-rainforest.jpg',import.meta.url).href,
        seedImage:new URL('../assets/pimo-cell-illustrations/lemon-myrtle-seed.jpg',import.meta.url).href,
        image:new URL('../assets/demo-plants/lemon-myrtle-illustrative.png',import.meta.url).href}
].map(plant=>Object.freeze(plant)));

const node=(id,parentId,title,body,{type='fact',evidence='sourced',sources=[],media=null}={})=>({
    id,parentId,title,preview:body,body,informationType:type,evidenceStatus:evidence,status:'published',
    sourceIds:sources,media:media?[media]:[]
});
const illustration=(plant,kind,alt)=>({id:`${plant.id}-${kind}-engraving`,image:kind==='seed'?plant.seedImage:plant.wildlifeImage,
    alt,caption:illustrationCaption,kind:'illustration'});

function baseNativeNodes(plant){
    const src=plant.sources.map(item=>item.id);
    const nodeSource=(...ids)=>ids;
    if(plant.id==='blue-quandong')return [
        node('native-forest-within-food-forest','food-forest','Native forest within the Food Forest','What if the food forest is not only productive, but also begins to read like a local forest? Blue Quandong opens that next layer: a long-lived, large tree associated with eastern Australian rainforest and stream corridors.',{type:'category',sources:nodeSource('plantnet-blue-quandong')}),
        node('canopy-and-space','native-forest-within-food-forest','Make room for a future canopy','Think in decades, not just harvests. A Blue Quandong can become a large tree; place it where mature height, buttressed roots, shade and access to water will fit. It is a forest-scale choice, not a compact orchard tree.',{sources:nodeSource('plantnet-blue-quandong')}),
        node('from-food-forest-to-rainforest','native-forest-within-food-forest','Follow the stream into rainforest','PlantNET links this species with lowland and riverine subtropical rainforest, especially alluvial ground and stream margins. In a food forest, use that habitat clue to ask about moisture, soil movement and the other layers that belong beside a canopy tree.',{type:'category',sources:nodeSource('plantnet-blue-quandong')}),
        node('fruit-eaters','from-food-forest-to-rainforest','Who takes the blue fruit?','Rainforest records describe fruit-doves and other birds feeding in the canopy. Fallen fruit is also used by ground-foraging animals, including brush-turkeys and cassowaries. The fruit links more than one forest height to the same tree.',{sources:nodeSource('rainforest-rescue-blue-quandong','wet-tropics-fruit-dispersal'),media:illustration(plant,'wildlife','Black-and-white rainforest scene: Blue Quandong fruit, birds and a cassowary on the forest floor.')}),
        node('cassowary-seed-journey','fruit-eaters','A seed can travel inside a meal','In north Queensland, southern cassowaries eat Blue Quandong fruit and can carry its large seed away from the parent tree before depositing it. This is a seed-dispersal relationship, not simply an animal eating a crop. Where cassowaries live, intact rainforest connections matter.',{sources:nodeSource('rainforest-rescue-blue-quandong','wet-tropics-fruit-dispersal')}),
        node('blue-quandong-stone','propagation','Inside the sculptured stone','The blue drupe has a thin fleshy layer around a hard, deeply sculptured stone; the stone contains seeds. The dramatic “quandong” surface is a protective endocarp, so the seed story begins by looking past the blue outside.',{sources:nodeSource('plantnet-blue-quandong'),media:illustration(plant,'seed','Black-and-white propagation plate showing Blue Quandong fruit, the deeply sculptured stone and a seedling.')}),
        node('name-and-leaf-detail','scientific-information','Read the leaf; check the name','Look for simple oblong-to-elliptic leaves with regular teeth. NSW Flora Online accepts Elaeocarpus grandis and notes that some taxonomic treatments include it within the broader E. angustifolius concept. Keep the source and region attached when comparing records.',{sources:nodeSource('plantnet-blue-quandong')})
    ];
    if(plant.id==='finger-lime')return [
        node('native-forest-within-food-forest','food-forest','Native forest within the Food Forest','Finger Lime changes the picture from a broad canopy tree to a thorny rainforest-understorey shrub. Add a native layer beneath taller food-forest trees and the planting begins to echo the structure of a subtropical forest.',{type:'category',sources:nodeSource('anbg-finger-lime','nsw-finger-lime-guide')}),
        node('understorey-by-design','native-forest-within-food-forest','A productive understorey, not a hedge','Its natural form is a shrub or small tree, so explore a mid- or understorey position with room for spiny branches, light and access. The food-forest design idea is to combine useful harvest with a native forest layer; actual fit depends on local climate and cultivar.',{sources:nodeSource('nsw-finger-lime-guide')}),
        node('from-understorey-to-rainforest','native-forest-within-food-forest','Return it to its rainforest setting','Finger Lime is native to tropical-to-subtropical rainforest communities in south-east Queensland and north-east New South Wales. In those forests, the plant is one part of a layered community—not a stand-alone crop. Ask what canopy, shelter and neighbouring plants your site can provide.',{type:'category',sources:nodeSource('anbg-finger-lime','nsw-finger-lime-guide')}),
        node('dainty-swallowtail-link','from-understorey-to-rainforest','A leaf becomes a nursery','The Dainty Swallowtail is recorded using Finger Lime as a host plant. Its caterpillar eats leaves: the relationship is with the living plant, not the fruit. Look closely before pruning, and treat a few chewed leaves as evidence of a wider food web rather than automatic damage.',{sources:nodeSource('sunshine-coast-finger-lime-butterfly'),media:illustration(plant,'wildlife','Black-and-white engraving of thorny Finger Lime twigs, tiny leaves and a Dainty Swallowtail caterpillar feeding on a leaf.')}),
        node('citrus-caviar','scientific-information','The “caviar” is citrus vesicles','The fruit is an elongated, narrow citrus berry. Inside, juice vesicles separate into small bead-like segments that release when the fruit is opened. Fruit length, skin colour and pulp colour vary among forms; the finger shape and vesicles are the signature—not a pod of large seeds.',{sources:nodeSource('plantnet-finger-lime','anbg-finger-lime')}),
        node('finger-lime-seed','propagation','Seed, cutting and the living plant','A seed-grown plant may differ from a named selection. Commercial growing guidance discusses seedling rootstocks and vegetative propagation; use the linked NSW guide for the method that matches your goal. Keep cultivar, source and propagation method with the record.',{sources:nodeSource('nsw-finger-lime-guide'),media:illustration(plant,'seed','Black-and-white teaching illustration of finger lime seeds, tiny obovate leaves and thorny twig morphology.')}),
        node('leaf-form','scientific-information','A closer leaf check','Finger Lime leaves are simple and alternate, and much smaller than the long leaves often used in generic citrus drawings. The attached reference shows their compact form; the twig’s straight axillary spines are equally diagnostic. Compare several shoots because leaf shape varies.',{sources:nodeSource('plantnet-finger-lime','anbg-finger-lime')})
    ];
    return [
        node('native-forest-within-food-forest','food-forest','Native forest within the Food Forest','Lemon Myrtle brings a Queensland coastal-rainforest tree into the food-forest story. Its place is not only “the herb with a lemon scent”: it can become a fragrant woody layer, a flowering event and an invitation to observe seasonal visitors.',{type:'category',sources:nodeSource('anbg-lemon-myrtle')}),
        node('fragrant-woody-layer','native-forest-within-food-forest','Give the fragrant layer a place','The species can grow as a medium-sized shrub or tree. In a food forest, plan for its eventual size, shelter and moisture needs; use the foliage as a sensory connection, while keeping the broader canopy and neighbouring plants in view.',{sources:nodeSource('anbg-lemon-myrtle')}),
        node('from-food-forest-to-rainforest','native-forest-within-food-forest','Place it back in coastal rainforest','Lemon Myrtle occurs naturally in Queensland coastal forests. The ANBG also grows it in a sheltered rainforest gully, noting protection from canopy and surrounding shrubs. That gives the food forest a useful design question: can this planting offer a similarly sheltered, moist-growing position?',{type:'category',sources:nodeSource('anbg-lemon-myrtle')}),
        node('flower-visitor-watch','from-food-forest-to-rainforest','A flowering event, then a field question','Clusters of white flowers carry many conspicuous stamens. Rather than assume which local species pollinates them, watch a flowering branch at different times of day: who visits, how long do they stay, and does activity change with weather? Add observations with date and place.',{type:'activity',evidence:'local_observation',sources:nodeSource('anbg-lemon-myrtle'),media:illustration(plant,'wildlife','Black-and-white Lemon Myrtle flowering branch with small flower-visiting insects in a Queensland coastal rainforest setting.')}),
        node('capsule-and-seed','propagation','A small seed held in a capsule','The fruit is a nut-like capsule with several small seeds. ANBG notes that capsules may retain their seeds until the fruit falls. Follow the linked growing guide before choosing a propagation method; record whether your material came from seed or a cutting.',{sources:nodeSource('anbg-lemon-myrtle'),media:illustration(plant,'seed','Black-and-white Lemon Myrtle teaching plate showing a flower cluster, capsule, small seeds and a rooted cutting.')}),
        node('lemon-myrtle-features','scientific-information','Scent, leaf and flower structure','Backhousia citriodora belongs to the myrtle family. Its strongly lemon-scented leaves are oval to lance-shaped; the flowers appear in long-stalked clusters, with numerous fluffy stamens. The scientific name points to the sensory feature without replacing careful plant identification.',{sources:nodeSource('anbg-lemon-myrtle')}),
        node('seasonal-forest-calendar','food-forest','Let flowering create a seasonal calendar','Mark first buds, peak flowering, capsule development and leaf flush in dated Notes. Over time, the plant becomes a living calendar for this particular site—and the visitor can compare it with rainfall, temperature and nearby flowering species.',{type:'activity',evidence:'local_observation',sources:nodeSource('anbg-lemon-myrtle')})
    ];
}

function nativeNodes(plant){
    const wildlifeIds=new Set(['fruit-eaters','dainty-swallowtail-link','flower-visitor-watch']);
    const base=baseNativeNodes(plant).map(item=>wildlifeIds.has(item.id)?{...item,parentId:'wildlife-relationships'}:item);
    const depth=nativePlantDepthNodes(plant).map(item=>item.id==='role-in-nature'?{...item,parentId:plant.id==='finger-lime'?'from-understorey-to-rainforest':'from-food-forest-to-rainforest'}:item);
    return [...base,...depth];
}

export function nativePlantProfile(id){
    const plant=DEMO_NATIVE_PLANTS.find(item=>item.id===id);if(!plant)return null;
    return {common_name:plant.name,scientific_name:plant.scientific,pim:{schemaVersion:1,plantId:plant.id,
        identity:{commonName:plant.name,scientificName:plant.scientific,identityStatement:plant.statement,image:plant.image,
            imageAlt:plant.id==='blue-quandong'?'Blue Quandong · reference photograph of long, toothed leaves':`${plant.name} · Colour demo illustration`,imageCaption:plant.name,tags:['Australian native','rainforest','food forest']},
        sources:plant.sources.map(item=>({...item})),nodes:nativeNodes(plant)}};
}

export function chooseDemoNativePlant(record,id){
    const profile=nativePlantProfile(id);if(!profile || !record || record.tutorialStage!=='plant2')return false;
    // Reuse the placed Orb, its anchor, relationships and area ownership.
    Object.assign(record,{name:profile.common_name,demoPlantPreset:id,demoKnowledgeProfile:profile,
        demoKnowledgeProjection:pimToArKnowledge(resolvePlantPim(profile)),demoNativeChoice:id,demoNativeChoicePending:false,
        demoOrbColor:DEMO_NATIVE_PLANTS.find(item=>item.id===id).colour,demoExpanded:false,demoInteractive:true,
        demoAlive:true,awaitingProfileReveal:true});
    return true;
}

const PROFILE_TRANSLATIONS={
    'blue-quandong':{
        statement:['Uma árvore alta das florestas tropicais do leste da Austrália, cujos frutos azuis ligam aves do dossel aos dispersores de sementes do solo.','Een hoge regenwoudboom uit oostelijk Australië. De blauwe vruchten verbinden vogels in de kroon met zaadverspreiders op de bosbodem.'],
        'native-forest-within-food-forest':['E se a floresta alimentar não fosse apenas produtiva, mas começasse também a parecer uma floresta local? O quandong-azul abre essa camada seguinte: uma árvore de grande porte associada às florestas tropicais do leste da Austrália e aos corredores ribeirinhos.','Wat als het voedselbos niet alleen productief is, maar ook op een plaatselijk bos gaat lijken? De blauwe quandong opent die volgende laag: een grote boom uit regenwoud en beekcorridors in oostelijk Australië.'],
        'canopy-and-space':['Pense em décadas, não apenas em colheitas. O quandong-azul pode tornar-se uma árvore de grande porte; plante-o onde a altura adulta, as raízes tabulares, a sombra e o acesso à água sejam compatíveis. É uma escolha à escala da floresta, não uma árvore compacta de pomar.','Denk in decennia, niet alleen in oogsten. De blauwe quandong kan een grote boom worden; kies een plek waar volwassen hoogte, plankwortels, schaduw en water passen. Dit is een keuze op bosschaal, geen compacte boomgaardboom.'],
        'from-food-forest-to-rainforest':['A Flora de Nova Gales do Sul associa esta espécie à floresta tropical subtropical de terras baixas e ribeirinha, sobretudo em aluviões e margens de cursos de água. Use essa pista de habitat para pensar na humidade, no movimento do solo e nas outras camadas junto a uma árvore de dossel.','De NSW-flora verbindt deze soort met laagland- en beekgebonden subtropisch regenwoud, vooral op alluviale grond en langs waterlopen. Gebruik die habitat als aanleiding om na te denken over vocht, bodem en de andere lagen naast een kroonboom.'],
        'fruit-eaters':['Registos de floresta tropical beschrevem pombos-da-fruta e outras aves a alimentarem-se no dossel. Os frutos caídos também são usados por animais terrestres, incluindo perus-do-mato e casuares. A árvore liga mais do que um estrato da floresta.','Regenwoudbronnen beschrijven fruitduiven en andere vogels die in de kroon eten. Gevallen vruchten worden ook gebruikt door dieren op de bosbodem, waaronder boskalkoenen en kasuarissen. De boom verbindt meerdere boslagen.'],
        'cassowary-seed-journey':['No norte de Queensland, os casuares-australianos comem o fruto e podem transportar a semente grande para longe da árvore-mãe antes de a depositarem. É uma relação de dispersão de sementes, não apenas um animal a comer uma colheita. Onde há casuares, são importantes as ligações entre áreas de floresta intacta.','In Noord-Queensland eten zuidelijke kasuarissen de vrucht en kunnen ze het grote zaad meenemen van de moederboom voordat ze het uitscheiden. Dit is zaadverspreiding, niet alleen een dier dat een oogst eet. Waar kasuarissen leven, zijn verbindingen tussen intacte bossen belangrijk.'],
        'blue-quandong-stone':['De blauwe steenvrucht heeft een dunne vruchtlaag rond een harde, diep gegroefde pit; de pit bevat zaden. Het opvallende oppervlak is een beschermende endocarp. Het zaadverhaal begint dus achter de blauwe buitenkant.','De blauwe steenvrucht heeft een dunne vruchtlaag rond een harde, diep gegroefde pit met zaden. Het opvallende oppervlak is een beschermend endocarp. Het zaadverhaal begint dus achter de blauwe buitenkant.'],
        'name-and-leaf-detail':['Zoek naar enkelvoudige, langwerpig-elliptische bladeren met regelmatige tandjes. NSW Flora Online aanvaardt Elaeocarpus grandis en vermeldt dat sommige taxonomische behandelingen deze soort opnemen in het ruimere E. angustifolius-concept. Bewaar bron en regio bij vergelijkingen.','Procure folhas simples, oblongas a elípticas e regularmente dentadas. A NSW Flora Online aceita Elaeocarpus grandis e refere que algumas classificações a incluem no conceito mais abrangente de E. angustifolius. Registe a fonte e a região ao comparar dados.']
    },
    'finger-lime':{
        statement:['Um citrino espinhoso do sub-bosque da floresta tropical, com folhas pequenas e distintas, frutos alongados e uma relação documentada com uma borboleta hospedeira.','Een doornige citrus uit de regenwoudonderlaag, met opvallend kleine bladeren, vingervormige vruchten en een gedocumenteerde relatie met een waardvlinder.'],
        'native-forest-within-food-forest':['A lima-caviar muda a perspetiva: de uma árvore de dossel ampla para um arbusto espinhoso do sub-bosque da floresta tropical. Acrescente uma camada nativa sob árvores alimentares mais altas e a plantação começa a refletir a estrutura de uma floresta subtropical.','De vingerlimoen verandert het beeld: van een brede kroonboom naar een doornige regenwoudstruik in de onderlaag. Voeg een inheemse laag toe onder hogere voedselbomen en de aanplant gaat de structuur van subtropisch bos weerspiegelen.'],
        'understorey-by-design':['Na natureza, cresce como arbusto ou pequena árvore; explore um lugar no estrato intermédio ou inferior, com espaço para os ramos espinhosos, luz e acesso. A ideia de desenho é combinar colheita útil com uma camada florestal nativa; a adequação depende do clima local e da cultivar.','Van nature is het een struik of kleine boom. Verken een plek in de midden- of onderlaag met ruimte voor stekelige takken, licht en toegang. Het ontwerpidee combineert een bruikbare oogst met een inheemse boslaag; de geschiktheid hangt af van klimaat en cultivar.'],
        'from-understorey-to-rainforest':['A lima-caviar é nativa de comunidades de floresta tropical no sudeste de Queensland e nordeste de Nova Gales do Sul. Nessas florestas, é parte de uma comunidade estratificada, não uma cultura isolada. Pergunte que dossel, abrigo e vizinhança o seu local pode oferecer.','De vingerlimoen is inheems in regenwoudgemeenschappen van Zuidoost-Queensland en Noordoost-New South Wales. In dat bos is de plant deel van een gelaagde gemeenschap, geen op zichzelf staand gewas. Vraag welke kroon, beschutting en buren uw plek kan bieden.'],
        'dainty-swallowtail-link':['A borboleta-cauda-de-andorinha-graciosa está registada como utilizadora da lima-caviar hospedeira. A lagarta come folhas: a relação é com a planta viva, não com o fruto. Observe antes de podar; algumas folhas roídas podem revelar uma teia alimentar mais ampla, não necessariamente um problema.','De kleine citrusvlinder is gedocumenteerd als gebruiker van de vingerlimoen als waardplant. De rups eet bladeren: de relatie is met de levende plant, niet met de vrucht. Kijk goed voordat u snoeit; aangevreten bladeren kunnen wijzen op een voedselweb, niet automatisch op schade.'],
        'citrus-caviar':['O fruto é uma baga cítrica alongada e estreita. No interior, as vesículas de sumo separam-se em pequenas esferas quando o fruto é aberto. O comprimento e as cores da casca e da polpa variam; a forma alongada e as vesículas são a assinatura, não uma vagem cheia de sementes grandes.','De vrucht is een langwerpige, smalle citrusbes. Binnenin vallen sapblaasjes uiteen in kleine bolletjes wanneer de vrucht wordt geopend. Lengte en schil- en pulpkleur verschillen; de langwerpige vorm en sapblaasjes zijn kenmerkend, geen peul met grote zaden.'],
        'finger-lime-seed':['Uma planta obtida de semente pode diferir de uma seleção com nome. As orientações de cultivo comercial abordam porta-enxertos de semente e propagação vegetativa; consulte o guia de Nova Gales do Sul para escolher o método adequado ao objetivo. Registe a cultivar, a origem e o método de propagação.','Een zaailing kan afwijken van een benoemde selectie. Teeltrichtlijnen bespreken zaailingonderstammen en vegetatieve vermeerdering; raadpleeg de NSW-gids om de methode bij uw doel te kiezen. Noteer cultivar, herkomst en vermeerderingsmethode.'],
        'leaf-form':['As folhas da lima-caviar são simples, alternadas e muito menores do que as folhas longas de desenhos genéricos de citrinos. A referência mostra a sua forma compacta; os espinhos axilares retos do ramo também ajudam a identificar a espécie. Compare vários rebentos, pois a forma das folhas varia.','De bladeren van de vingerlimoen zijn enkelvoudig, staan afwisselend en zijn veel kleiner dan de lange bladeren in algemene citrusillustraties. De referentiefoto toont hun compacte vorm; ook de rechte okselstandige doorns helpen bij herkenning. Vergelijk meerdere scheuten, want bladvorm varieert.']
    },
    'lemon-myrtle':{
        statement:['Uma árvore aromática das florestas tropicais de Queensland, cuja floração pode transformar um perfil de planta numa pergunta sobre quem visita as flores e quando.','Een geurige boom uit de regenwouden van Queensland. De bloei maakt van een plantenprofiel een vraag: wie bezoekt de bloemen, en wanneer?'],
        'native-forest-within-food-forest':['A murta-limão traz uma árvore das florestas costeiras de Queensland para a história da floresta alimentar. Não é apenas “a erva com aroma a limão”: pode formar uma camada lenhosa aromática, um episódio de floração e um convite a observar visitantes sazonais.','Citroenmirte brengt een boom uit de kustregenwouden van Queensland in het verhaal van het voedselbos. Het is niet alleen “het kruid met citroengeur”: het kan een geurige houtige laag en bloeimoment vormen, en uitnodigen tot observatie van seizoensbezoekers.'],
        'fragrant-woody-layer':['A espécie pode crescer como arbusto ou árvore de porte médio. Na floresta alimentar, planeie o tamanho adulto, o abrigo e a humidade de que precisa. Use a folhagem como ligação sensorial sem perder de vista o dossel mais amplo e as plantas vizinhas.','De soort kan uitgroeien tot een middelgrote struik of boom. Plan in het voedselbos voor de volwassen maat, beschutting en vochtbehoefte. Gebruik het blad als zintuiglijke verbinding en houd tegelijk de kroonlaag en naburige planten in beeld.'],
        'from-food-forest-to-rainforest':['A murta-limão ocorre naturalmente nas florestas costeiras de Queensland. O Jardim Botânico Nacional Australiano também a cultiva numa ravina abrigada de floresta tropical, protegida pela copa e pelos arbustos circundantes. Poderá a sua floresta alimentar oferecer um local igualmente abrigado e húmido?','De citroenmirte komt van nature voor in de kustbossen van Queensland. De Australian National Botanic Gardens kweekt haar ook in een beschutte regenwoudgeul, met bescherming door de kroon en omringende struiken. Kan uw voedselbos een vergelijkbare beschutte, vochtige plek bieden?'],
        'flower-visitor-watch':['Os cachos de flores brancas têm muitos estames evidentes. Em vez de presumir qual espécie local as poliniza, observe um ramo florido em diferentes horas: quem o visita, quanto tempo permanece e a atividade muda com o tempo? Registe as observações com data e local.','De trossen witte bloemen hebben opvallende meeldraden. Ga niet uit van een specifieke lokale bestuiver, maar observeer een bloeiende tak op verschillende momenten: wie komt langs, hoe lang blijft die en verandert de activiteit met het weer? Noteer datum en plek.'],
        'capsule-and-seed':['O fruto é uma cápsula semelhante a uma noz, com várias sementes pequenas. O Jardim Botânico Nacional Australiano refere que as cápsulas podem reter as sementes até o fruto cair. Consulte o guia associado antes de escolher um método de propagação e registe se o material veio de semente ou estaca.','De vrucht is een nootachtige capsule met enkele kleine zaden. Volgens de Australian National Botanic Gardens kunnen de capsules het zaad vasthouden tot de vrucht valt. Raadpleeg de teeltgids voordat u een vermeerderingsmethode kiest en noteer of het materiaal uit zaad of een stek kwam.'],
        'lemon-myrtle-features':['Backhousia citriodora pertence à família das mirtáceas. As folhas, fortemente aromáticas a limão, são ovais a lanceoladas; as flores surgem em cachos pedunculados com numerosos estames plumosos. O nome científico destaca o aroma, mas não substitui a identificação cuidadosa.','Backhousia citriodora behoort tot de mirtefamilie. De sterk citroengeurende bladeren zijn ovaal tot lancetvormig; de bloemen staan in gesteelde trossen met talrijke pluizige meeldraden. De wetenschappelijke naam verwijst naar de geur, maar vervangt geen zorgvuldige determinatie.'],
        'seasonal-forest-calendar':['Registe os primeiros botões, o pico da floração, a formação das cápsulas e o rebentar das folhas em notas datadas. A planta torna-se um calendário vivo deste local, que pode comparar com a chuva, a temperatura e as espécies vizinhas em flor.','Noteer de eerste knoppen, de piek van de bloei, de capsulevorming en de bladgroei in gedateerde notities. Zo wordt de plant een levende kalender voor deze plek, te vergelijken met regen, temperatuur en bloeiende buren.']
    }
};

const NODE_TEXT_TRANSLATIONS=DEMO_NATIVE_PLANTS.flatMap(plant=>{
    const entries=PROFILE_TRANSLATIONS[plant.id];
    return nativeNodes(plant).flatMap(item=>{
        const translated=entries[item.id];if(!translated)return [];
        const titleTranslations={
            'native-forest-within-food-forest':['Floresta nativa dentro da floresta alimentar','Inheems bos in het voedselbos'],
            'canopy-and-space':['Reserve espaço para uma copa futura','Geef een toekomstige kroon de ruimte'],
            'from-food-forest-to-rainforest':['Siga o curso de água até à floresta tropical','Volg de beek het regenwoud in'],
            'from-understorey-to-rainforest':['Volte ao ambiente de floresta tropical','Terug naar de regenwoudomgeving'],
            'fruit-eaters':['Quem come o fruto azul?','Wie eet de blauwe vrucht?'],
            'cassowary-seed-journey':['Uma semente viaja dentro de uma refeição','Een zaad reist mee in een maaltijd'],
            'blue-quandong-stone':['Dentro do caroço esculpido','In de gegroefde pit'],
            'name-and-leaf-detail':['Observe a folha; confirme o nome','Bekijk het blad; controleer de naam'],
            'understorey-by-design':['Um sub-bosque produtivo, não uma sebe','Een productieve onderlaag, geen haag'],
            'dainty-swallowtail-link':['Uma folha torna-se um berçário','Een blad wordt een kraamkamer'],
            'citrus-caviar':['O “caviar” são vesículas cítricas','De “kaviaar” bestaat uit citrusblaasjes'],
            'finger-lime-seed':['Semente, estaca e planta viva','Zaad, stek en levende plant'],
            'leaf-form':['Observe melhor a folha','Bekijk het blad van dichtbij'],
            'fragrant-woody-layer':['Dê lugar à camada aromática','Geef de geurige laag een plek'],
            'flower-visitor-watch':['Uma floração e uma pergunta no terreno','Een bloeimoment en een veldvraag'],
            'capsule-and-seed':['Uma pequena semente dentro de uma cápsula','Een klein zaad in een capsule'],
            'lemon-myrtle-features':['Aroma, folha e estrutura da flor','Geur, blad en bloemstructuur'],
            'seasonal-forest-calendar':['Deixe a floração criar um calendário sazonal','Laat de bloei een seizoenskalender maken']
        }[item.id];
        return [[item.title,titleTranslations?.[0]||item.title,titleTranslations?.[1]||item.title],
            [item.body,translated[0],translated[1]]];
    });
});

export const DEMO_NATIVE_PLANT_TRANSLATIONS=Object.freeze([
    ['Choose the next plant','Escolha a próxima planta','Kies de volgende plant'],
    [NATIVE_PLANT_CHOOSER_COPY,'O seu segundo Orbe está pronto. Escolha uma planta australiana da floresta tropical para lhe dar um nome e abrir o seu PIMO.','Uw tweede Orb is klaar. Kies een Australische regenwoudplant om hem een naam te geven en zijn PIMO te openen.'],
    ['Blue Quandong','Quandong-azul','Blauwe quandong'],['Finger Lime','Lima-caviar','Vingerlimoen'],['Lemon Myrtle','Murta-limão','Citroenmirte'],
    [illustrationCaption,'Ilustração educativa estilizada a preto e branco','Gestileerde zwart-witte educatieve illustratie'],
    ['Native forest within the Food Forest','Floresta nativa dentro da floresta alimentar','Inheems bos in het voedselbos'],
    ['Make room for a future canopy','Reserve espaço para uma copa futura','Geef een toekomstige boomkroon de ruimte'],
    ['Follow the stream into rainforest','Siga o curso de água até à floresta tropical','Volg de beek het regenwoud in'],
    ['Who takes the blue fruit?','Quem come o fruto azul?','Wie eet de blauwe vrucht?'],
    ['A seed can travel inside a meal','Uma semente viaja dentro de uma refeição','Een zaad kan meereizen in een maaltijd'],
    ['Inside the sculptured stone','Dentro do caroço esculpido','In de gegroefde pit'],
    ['Read the leaf; check the name','Observe a folha; confirme o nome','Bekijk het blad; controleer de naam'],
    ['A productive understorey, not a hedge','Um sub-bosque produtivo, não uma sebe','Een productieve onderlaag, geen haag'],
    ['Return it to its rainforest setting','Volte ao seu ambiente de floresta tropical','Plaats hem terug in zijn regenwoudomgeving'],
    ['A leaf becomes a nursery','Uma folha torna-se um berçário','Een blad wordt een kraamkamer'],
    ['The “caviar” is citrus vesicles','O “caviar” são vesículas cítricas','De “kaviaar” bestaat uit citrusblaasjes'],
    ['Seed, cutting and the living plant','Semente, estaca e planta viva','Zaad, stek en de levende plant'],
    ['A closer leaf check','Observe melhor a folha','Bekijk het blad van dichtbij'],
    ['Give the fragrant layer a place','Dê lugar à camada aromática','Geef de geurige laag een plek'],
    ['Place it back in coastal rainforest','Coloque-a de novo na floresta costeira','Plaats hem terug in het kustregenwoud'],
    ['A flowering event, then a field question','Uma floração e uma pergunta no terreno','Een bloeiend moment en een veldvraag'],
    ['A small seed held in a capsule','Uma pequena semente dentro de uma cápsula','Een klein zaad in een capsule'],
    ['Scent, leaf and flower structure','Aroma, folha e estrutura da flor','Geur, blad en bloemstructuur'],
    ['Let flowering create a seasonal calendar','Deixe a floração criar um calendário sazonal','Laat de bloei een seizoenskalender maken'],
    ...DEMO_NATIVE_PLANTS.map(plant=>[plant.statement,PROFILE_TRANSLATIONS[plant.id].statement[0],PROFILE_TRANSLATIONS[plant.id].statement[1]]),
    ...NODE_TEXT_TRANSLATIONS,
    ...NATIVE_PLANT_DEPTH_TRANSLATIONS
]);
