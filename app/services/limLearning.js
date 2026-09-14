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
        content: 'Climate and place work together. Broad climate patterns describe seasons, warmth and rainfall, while slope, shelter, buildings, soil and water create local differences. Compare the wider climate label with what you can observe here: sun, wind, moisture and frost may vary over a short distance. These local patterns connect climate knowledge to plant choices and living-landscape design.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-climate-subtropical', children: Object.freeze(['lim-climate-subtropical-temperature', 'lim-climate-subtropical-rainfall']) }),
            Object.freeze({ id: 'lim-climate-cool', children: Object.freeze(['lim-climate-cool-shelter']) }),
            Object.freeze({ id: 'lim-climate-dry', children: Object.freeze(['lim-climate-dry-water-needs']) })
        ])
    }),
    Object.freeze({
        id: 'lim-food-forest', title: 'Living Landscapes', accent: '#a06a43', position: 'north-east',
        legacyAliases: Object.freeze(['food-forest', 'living-landscapes', 'lim-face-living-landscapes']),
        content: 'Living landscapes combine plants, animals, soil, water and people across space and time. Food-forest layers offer a practical way to think about height, light, access, habitat and yield, but they are design tools rather than compulsory rules. Read the existing place first, then compare how its parts share resources and perform more than one function.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-food-forest-layers', children: Object.freeze(['lim-food-forest-layers-canopy', 'lim-food-forest-layers-ground-cover']) }),
            Object.freeze({ id: 'lim-food-forest-function', children: Object.freeze(['lim-food-forest-function-yield']) }),
            Object.freeze({ id: 'lim-food-forest-light', children: Object.freeze(['lim-food-forest-light-shade']) })
        ])
    }),
    Object.freeze({
        id: 'lim-plant', title: 'Plants and Life', accent: '#719b62', position: 'east',
        legacyAliases: Object.freeze(['plant', 'plants-life', 'lim-face-plants-life']),
        content: 'Plants and life brings together identity, form, reproduction, propagation, growth, harvest and changing life cycles. These topics help explorers ask useful questions without turning the LIM into a profile of the plant in view. Begin with observable features, mark uncertainty honestly, and connect each observation with place, season and relationships.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-identity', children: Object.freeze(['lim-plant-identity-species', 'lim-plant-identity-characteristics']) }),
            Object.freeze({ id: 'lim-plant-propagation', children: Object.freeze(['lim-plant-propagation-seed', 'lim-plant-propagation-cutting']) }),
            Object.freeze({ id: 'lim-plant-soil', children: Object.freeze(['lim-plant-soil-moisture']) })
        ])
    }),
    Object.freeze({
        id: 'lim-pin', title: 'Place and Observation', accent: '#9a9460', position: 'south-east',
        legacyAliases: Object.freeze(['pin', 'place-observation', 'lim-face-place-observation']),
        content: 'Place and observation connects learning with where and when it happened. A pin can hold a story, photograph, specimen note or measured condition without claiming that every interpretation is proven. Record direct observations clearly, add dates and context, and label assumptions as questions. Returning to the same place turns a single moment into evidence of change.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-pin-place', children: Object.freeze(['lim-pin-place-photo']) }),
            Object.freeze({ id: 'lim-pin-observation', children: Object.freeze(['lim-pin-observation-date', 'lim-pin-observation-condition']) }),
            Object.freeze({ id: 'lim-pin-specimen', children: Object.freeze(['lim-pin-specimen-genus']) })
        ])
    }),
    Object.freeze({
        id: 'lim-uses-making', title: 'Uses and Making', accent: '#bd7659', position: 'south',
        legacyAliases: Object.freeze(['uses-making', 'lim-face-uses-making']),
        content: 'Uses and making follows how living materials become food, craft, structures or other practical resources. A recorded use belongs to a particular species, part, preparation and cultural context; it is not automatic proof of safety or suitability. Connect harvest with identification and evidence, and distinguish established knowledge from tradition, experiment or personal practice.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-harvest', children: Object.freeze(['lim-plant-harvest-fruit', 'lim-plant-harvest-flower']) }),
            Object.freeze({ id: 'lim-plant-harvest-season', children: Object.freeze([]) })
        ])
    }),
    Object.freeze({
        id: 'lim-origins-culture', title: 'Origins and Culture', accent: '#8d75a5', position: 'south-west',
        legacyAliases: Object.freeze(['origins-culture', 'lim-face-origins-culture']),
        content: 'Origins and culture examines where living materials come from, how they move, and how people build knowledge and relationships around them. Geographic origin differs from present range. Cultural practices also vary within communities and through time, so record sources and context rather than presenting one account as universal.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-plant-range', children: Object.freeze(['lim-plant-range-latitude', 'lim-plant-range-exposure']) }),
            Object.freeze({ id: 'lim-pin-place-story', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-plant-range-warmth', children: Object.freeze([]) })
        ])
    }),
    Object.freeze({
        id: 'lim-wildlife-relationships', title: 'Wildlife and Relationships', accent: '#5f9681', position: 'west',
        legacyAliases: Object.freeze(['wildlife-relationships', 'lim-face-wildlife-relationships']),
        content: 'Wildlife and relationships looks at birds, insects, fungi, soil organisms and the exchanges surrounding plants and places. Pollination, shelter, feeding, competition, disease and dispersal can overlap, and an interaction is not always beneficial to every participant. Observe who is present, what occurs and when before proposing an explanation.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-food-forest-ecology', children: Object.freeze(['lim-food-forest-ecology-pollinators', 'lim-food-forest-ecology-companions']) }),
            Object.freeze({ id: 'lim-food-forest-function-habitat', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-food-forest-function-soil-relationships', children: Object.freeze(['lim-plant-soil-soil-life']) })
        ])
    }),
    Object.freeze({
        id: 'lim-discovery-pathways', title: 'Discovery and Pathways', accent: '#4f879e', position: 'north-west',
        legacyAliases: Object.freeze(['discovery-pathways', 'lim-face-discovery-pathways']),
        content: 'Discovery and pathways supports free exploration through questions, comparisons, records, evidence, problems and actions. Start anywhere, follow meaningful connections, and return when new observations change your understanding. Future optional pathways can arrange these same cells around a learning goal, while the open mesh remains available for curiosity-led learning.',
        showcase: Object.freeze([
            Object.freeze({ id: 'lim-pin-note', children: Object.freeze(['lim-pin-note-task', 'lim-pin-note-data']) }),
            Object.freeze({ id: 'lim-pin-observation-action', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-pin-specimen-method', children: Object.freeze([]) }),
            Object.freeze({ id: 'lim-pin-place-learning', children: Object.freeze([]) })
        ])
    })
]);

// Companion copy is keyed by stable ID. Titles repeat across the mesh, so an
// ID-based catalogue keeps each explanation specific without changing layout,
// relationships or saved-state compatibility.
const LIM_CONTENT = Object.freeze({
    'lim-climate': 'Climate and place work together. Broad climate patterns describe seasons, warmth and rainfall, while slope, shelter, buildings, soil and water create local differences. Compare the wider climate label with what you can observe here: sun, wind, moisture and frost may vary over a short distance. These local patterns connect climate knowledge to plant choices and living-landscape design.',
    'lim-climate-subtropical': 'Subtropical places often combine warm summers with milder winters, but the label covers many rainfall and frost patterns. Local elevation, exposure and shelter can create meaningful differences. Compare seasonal temperature, rainfall and signs of cold before drawing conclusions about what may grow well.',
    'lim-climate-subtropical-temperature': 'Temperature affects growth, flowering, water use and the timing of seasonal change. Daily highs and overnight lows both matter. Compare exposed and sheltered positions, and record unusual heat or cold alongside the date and weather conditions.',
    'lim-climate-subtropical-rainfall': 'Rainfall describes water arriving from the atmosphere, but totals alone do not show how long water remains available. Intensity, season, slope and soil change the result. Compare recent rain with soil moisture and signs of runoff or pooling.',
    'lim-climate-subtropical-frost-tolerance': 'Frost tolerance describes how plants respond to freezing or near-freezing conditions. Responses vary with species, age, moisture and exposure. Look for colder hollows and protected edges, and keep observed frost damage separate from assumptions about its cause.',
    'lim-climate-subtropical-seasonal-growth': 'Seasonal growth is the changing pace of shoots, leaves, flowers and roots through the year. Temperature, rainfall and day length can overlap. Recording dates and conditions helps distinguish a recurring seasonal pattern from a one-off response.',
    'lim-climate-subtropical-suitable-plants': 'A suitable plant matches the conditions and purpose of a place. Climate is one guide, alongside soil, water, light, space and care. Treat planting lists as starting points, then compare them with local observations and reliable identification.',
    'lim-climate-subtropical-planting-conditions': 'Planting conditions include soil moisture, drainage, temperature, light, wind and the space available for mature growth. Conditions can differ within one site. Observe the planting position itself and consider how nearby layers may change it over time.',
    'lim-climate-tropical': 'Tropical climates remain generally warm, yet rainfall may be continuous, seasonal or interrupted by a pronounced dry period. Elevation and exposure also create local variation. Compare humidity, soil moisture and active growth across seasons rather than treating “tropical” as one uniform condition.',
    'lim-climate-tropical-humidity': 'Humidity is the amount of water vapour in the air relative to temperature. It influences drying, cooling and some plant and fungal activity. Compare humid still areas with breezier positions, especially after rain or overnight.',
    'lim-climate-tropical-rainfall': 'Tropical rainfall can arrive as frequent showers, intense storms or a distinct wet season. The same total may create different soil conditions. Record timing and intensity, then compare drainage, erosion and moisture beneath different vegetation layers.',
    'lim-climate-tropical-growth': 'Warmth can support growth for long periods, but water, nutrients, light and plant life cycles still set limits. Compare new leaves or shoots across wet and dry periods, and avoid assuming that every change has a single cause.',
    'lim-climate-temperate': 'Temperate climates usually show marked seasonal change, though timing and intensity vary by place. Winter cold, summer warmth, rainfall and growing-season length interact. Local records reveal more than the label alone, especially around frost, dormancy and spring growth.',
    'lim-climate-temperate-seasons': 'Seasons organise recurring changes in temperature, light and rainfall. Living things may respond at different times each year. Compare flowering, leaf fall or new growth with dates and conditions to build a local seasonal picture.',
    'lim-climate-temperate-frost': 'Frost forms when surfaces cool enough for ice to develop. Low ground, clear nights and still air can make it highly local. Record where frost appears and which tissues change, without assuming all damage has the same cause.',
    'lim-climate-temperate-dormancy': 'Dormancy is a period of reduced visible activity that helps some plants meet seasonal conditions. It is not the same as death. Look for buds, retained stems and the timing of renewed growth before interpreting a quiet season.',
    'lim-climate-cool': 'Cool conditions can slow growth and shorten active seasons, but slope, sunlight and shelter may create warmer pockets. Wind and frost patterns often matter as much as an average temperature. Compare exposed areas with protected edges over time.',
    'lim-climate-cool-shelter': 'Shelter reduces exposure to wind, driving rain or rapid temperature change. Walls, landform and vegetation can all create it, sometimes with added shade or reduced airflow. Compare both the benefits and trade-offs of a sheltered position.',
    'lim-climate-cool-wind-exposure': 'Wind exposure can increase drying, cool leaves and place mechanical stress on plants. Its effect depends on direction, strength, duration and surrounding barriers. Observe movement and damage patterns, then record the weather before interpreting them.',
    'lim-climate-dry': 'In dry environments, the timing and storage of water shape living systems. Soil cover, shade, rooting depth and plant form influence how moisture is retained or lost. Compare the surface with conditions below it before deciding that a place is uniformly dry.',
    'lim-climate-dry-water-needs': 'Water needs vary with species, size, growth stage, weather and soil. A plant may need more during establishment than later. Check soil moisture and plant condition together rather than relying on a fixed schedule.',
    'lim-climate-dry-soil-cover': 'Soil cover can reduce direct sun, soften raindrop impact and change evaporation. Living covers and loose organic materials behave differently and may also compete, decompose or provide habitat. Compare covered and exposed patches through a dry period.',
    'lim-climate-humid': 'Humid conditions slow evaporation and can keep leaves wet for longer, while drainage may still vary below ground. Air movement, spacing and canopy density shape the local result. Compare an enclosed area with a more open one after rain.',
    'lim-climate-humid-airflow': 'Airflow moves heat and moisture around leaves and through vegetation. Too little or too much can create different stresses. Observe leaf movement, drying time and surrounding density rather than treating airflow as simply good or bad.',
    'lim-climate-humid-cloud-cover': 'Cloud cover changes incoming light and can moderate daytime heating and overnight cooling. Its effect depends on season and duration. Compare light, temperature and plant activity on clear and overcast days when possible.',

    'lim-food-forest': 'Living landscapes combine plants, animals, soil, water and people across space and time. Food-forest layers offer a practical way to think about height, light, access, habitat and yield, but they are design tools rather than compulsory rules. Read the existing place first, then compare how its parts share resources and perform more than one function.',
    'lim-food-forest-layers': 'Food forests use different heights: canopy, smaller trees, shrubs, herbs, ground covers, roots and climbers. These are useful design guides, not a requirement to fill every layer.',
    'lim-food-forest-layers-canopy': 'The canopy is the upper tree layer. It intercepts light, changes wind and rain, and shapes conditions beneath it. Compare its seasonal shade and spread with the needs of the understorey.',
    'lim-food-forest-layers-understorey': 'The understorey grows below taller vegetation, where light, shelter and moisture differ from open ground. Its character changes with canopy density and season. Look at how much sky remains visible from below.',
    'lim-food-forest-layers-shrub': 'The shrub layer contains woody plants that remain lower than the main tree layers. Shrubs can shape access, shelter, habitat and harvest. Consider mature width as well as height when reading their place in the mesh.',
    'lim-food-forest-layers-herb': 'The herb layer includes non-woody plants near ground level. Some are seasonal, while others persist. Their growth reveals changes in light, moisture and disturbance, and can connect the shrub layer with ground cover.',
    'lim-food-forest-layers-ground-cover': 'Low-growing plants cover the soil surface. Depending on the species, they can provide habitat, reduce exposed soil or produce a harvest.',
    'lim-food-forest-layers-climbers': 'Climbing plants gain height by using other structures for support. Their reach can connect layers, but mature weight and competition for light matter. Observe what supports them and where their foliage eventually spreads.',
    'lim-food-forest-layers-roots': 'Roots anchor plants and gather water and nutrients from overlapping soil zones. Depth and spread vary, so neighbouring plants may compete, coexist or interact in ways that are difficult to see from above.',
    'lim-food-forest-function': 'Function asks what a plant or feature actually does in a place: perhaps providing food, shade, shelter, access or habitat. A single element may serve several functions, and its contribution can change with season and maturity. Compare intended purpose with observed results.',
    'lim-food-forest-function-yield': 'Yield is any useful output from a living landscape, including food, material, seed, shade or knowledge. Quantity is only one measure; timing, effort, reliability and who benefits also matter. Connect harvest observations with uses and making.',
    'lim-food-forest-light': 'Light changes through each day and season as the sun moves and vegetation grows. Canopy, buildings and landform create patterns of sun and shade. Repeated observation helps match those patterns with different layers and growth habits.',
    'lim-food-forest-light-shade': 'Shade reduces direct sunlight but varies in depth, duration and season. Dappled canopy shade differs from a solid wall shadow. Compare when shade arrives and which layers create it before judging the conditions beneath.',
    'lim-food-forest-light-height': 'Height determines how plants meet light, wind and one another. Present height is only part of the picture; mature size and pruning can alter the structure. Compare vertical position with canopy spread and access.',
    'lim-food-forest-light-growth-habit': 'Growth habit describes the way a plant occupies space, such as upright, spreading, clumping or climbing. It influences light capture and neighbouring layers. Observe form over time rather than judging it from one young specimen.',
    'lim-plant-layer': 'A layer describes a plant’s main position within the vertical structure of a living landscape. Mature height, width, form and season all affect that role. Layers can overlap, and a plant need not fit one category perfectly.',
    'lim-plant-layer-evergreen': 'Evergreen plants retain functional leaves across seasons, although individual leaves are still replaced. Their continuing cover can provide shade or shelter year-round. Compare leaf density through the year rather than assuming it never changes.',
    'lim-plant-layer-mature-size': 'Mature size is the approximate height and spread a plant can reach under suitable conditions. Space, climate and care may alter it. Use it to consider future light, access and neighbouring layers, not as a guaranteed measurement.',
    'lim-plant-layer-form': 'Form is the overall shape created by stems, branches and leaves. It can be upright, rounded, spreading or irregular, and may change with age or pruning. Compare form with growth habit and available space.',
    'lim-pin-specimen-canopy-layer': 'A canopy-layer note records where a specimen currently sits in the vertical structure. Record what you observe and the date, because size and neighbouring shade can change. The label supports comparison without forcing the plant into a permanent category.',

    'lim-plant': 'Plants and life brings together identity, form, reproduction, propagation, growth, harvest and changing life cycles. These topics help explorers ask useful questions without turning the LIM into a profile of the plant in view. Begin with observable features, mark uncertainty honestly, and connect each observation with place, season and relationships.',
    'lim-plant-identity': 'Plant identity connects observations with shared knowledge. Names may refer to a species, cultivar or local description, and similar-looking plants can differ. Record the features supporting an identification and keep uncertainty visible until reliable evidence resolves it.',
    'lim-plant-identity-species': 'A species name groups organisms through a scientific classification, but identification depends on evidence. Compare several features, life stages and reliable sources; a photograph or common name alone may not settle the question.',
    'lim-plant-identity-cultivar': 'A cultivar is a selected plant variety maintained for particular characteristics. Cultivar names sit alongside, but are not the same as, species names. Labels and propagation history can be important evidence when visible features overlap.',
    'lim-plant-identity-characteristics': 'Characteristics are observable features such as leaf arrangement, bark, flowers, fruit and growth form. Choose features that remain useful for comparison, record their condition, and avoid treating one variable feature as definitive identification.',
    'lim-plant-propagation': 'Propagation means growing new plants from seed or from parts of existing plants. Each method carries different variation, timing and care. Compare the method with the species, purpose and conditions rather than assuming one approach always works best.',
    'lim-plant-propagation-seed': 'A seed carries the beginning of a new plant. Moisture, temperature and sometimes light help trigger germination. Requirements vary by species; a seed-grown plant can differ from its parent.',
    'lim-plant-propagation-cutting': 'A cutting uses a piece of stem, leaf or root to begin another plant. Success varies with species, timing, moisture and hygiene. Record the material and conditions so results can be compared rather than assumed.',
    'lim-plant-propagation-graft': 'Grafting joins compatible plant tissues so they grow together as rootstock and scion. The method can combine useful qualities, but compatibility and technique matter. Record both plant identities and the joining method.',
    'lim-plant-propagation-marcot': 'Marcotting, or air layering, encourages roots on a stem while it remains attached to the parent plant. Moisture, timing and species affect success. The rooted section is separated only after sufficient roots develop.',
    'lim-plant-propagation-division': 'Division separates an established clump or root system into viable sections. Each section needs suitable roots and shoots, and the method only suits certain growth forms. Observe recovery and new growth after replanting.',
    'lim-plant-soil': 'Soil is a living habitat as well as support for roots. Texture, water, air and organisms influence plant growth. Observe it before deciding what to change.',
    'lim-plant-soil-moisture': 'Soil moisture is water held between soil particles and available in the root zone. The surface may not represent conditions below. Compare depth, drainage and recent weather before interpreting plant responses.',

    'lim-pin': 'Place and observation connects learning with where and when it happened. A pin can hold a story, photograph, specimen note or measured condition without claiming that every interpretation is proven. Record direct observations clearly, add dates and context, and label assumptions as questions. Returning to the same place turns a single moment into evidence of change.',
    'lim-pin-place': 'Place combines location with conditions, people, history and change. A useful place record gives enough context to understand an observation without reducing the site to coordinates. Stories, learning notes and photographs can reveal different parts of that context.',
    'lim-pin-place-photo': 'A photograph records one viewpoint at one moment. Add a date, location and useful context, and avoid treating what lies outside the frame as absent. Repeated views can make change easier to compare.',
    'lim-pin-specimen': 'A specimen record links observations to one organism or collected reference. Identity may remain uncertain. Describe how it was recognised, where it was found and what was observed without extending those details to every member of its kind.',
    'lim-pin-specimen-genus': 'A genus groups related species within scientific classification. It can be a useful level when species evidence is incomplete. Keep the identification as broad as the available features justify, and record what would help refine it.',
    'lim-pin-specimen-variety': 'Variety can describe a formally named botanical rank or be used informally in everyday speech. Record the exact label and its source. Do not assume that visible difference alone confirms a recognised variety or cultivar.',
    'lim-pin-observation': 'An observation records what you actually notice at a place and time. Keep it separate from explanations you have not yet checked. Returning later helps reveal change.',
    'lim-pin-observation-date': 'A date places an observation in time. It allows comparisons with season, weather, growth and earlier records. Include time of day when light, temperature or animal activity could affect what was seen.',
    'lim-pin-observation-condition': 'Condition describes the immediate context of an observation, such as weather, soil moisture, light or disturbance. Record only what is relevant and observable. Conditions help explain differences without proving a single cause.',
    'lim-pin-observation-growth': 'A growth observation records visible change in shoots, leaves, roots or overall size. Use comparable viewpoints or measurements where practical, and note the interval and conditions before interpreting the pattern.',
    'lim-pin-observation-fruiting': 'A fruiting observation records developing, ripe, damaged or fallen fruit at a particular time. Note abundance carefully and connect it with flowering or wildlife observations without assuming why the pattern occurred.',

    'lim-uses-making': 'Uses and making follows how living materials become food, craft, structures or other practical resources. A recorded use belongs to a particular species, part, preparation and cultural context; it is not automatic proof of safety or suitability. Connect harvest with identification and evidence, and distinguish established knowledge from tradition, experiment or personal practice.',
    'lim-plant-harvest': 'Harvest is the gathering of a useful plant part or other yield at an appropriate stage. Timing, identification, ownership, regeneration and who else relies on the resource all matter. Record what was taken and what remained.',
    'lim-plant-harvest-fruit': 'Fruit develops from a flower and may carry seeds, though forms vary widely. Edibility cannot be inferred from appearance or wildlife use. Reliable identification, preparation and individual suitability matter before any food use.',
    'lim-plant-harvest-flower': 'Flowers support plant reproduction and may also have culinary, craft or cultural uses. Harvest can affect pollinators and later seed or fruit. Confirm identity and safe use rather than assuming every flower is edible.',
    'lim-plant-harvest-season': 'Harvest season is the period when a useful part is available or at a preferred stage. Timing varies with climate, weather and care. Local dated observations are more informative than a calendar rule alone.',

    'lim-origins-culture': 'Origins and culture examines where living materials come from, how they move, and how people build knowledge and relationships around them. Geographic origin differs from present range. Cultural practices also vary within communities and through time, so record sources and context rather than presenting one account as universal.',
    'lim-plant-range': 'Range describes the places where a plant occurs, whether native, cultivated, introduced or naturalised. Present distribution is not the same as geographic origin. Maps and records change with evidence, so note the source and date.',
    'lim-plant-range-warmth': 'Warmth helps describe the thermal conditions across a range, but averages can hide nights, seasons and elevation. Compare broad distribution with local temperature observations rather than assuming every location offers the same conditions.',
    'lim-plant-range-latitude': 'Latitude measures distance north or south of the equator and influences broad light and seasonal patterns. Elevation, oceans and landform can produce very different climates at similar latitudes, so it is one clue rather than a complete explanation.',
    'lim-plant-range-exposure': 'Exposure describes how open a place is to sun, wind, rain or salt. It helps explain why the same species may behave differently across its range. Compare exposed edges with protected positions nearby.',
    'lim-pin-place-story': 'A place story records how people understand, remember or relate to a location. Identify the speaker or source when appropriate, respect consent and uncertainty, and avoid presenting one account as the voice of an entire community.',

    'lim-wildlife-relationships': 'Wildlife and relationships looks at birds, insects, fungi, soil organisms and the exchanges surrounding plants and places. Pollination, shelter, feeding, competition, disease and dispersal can overlap, and an interaction is not always beneficial to every participant. Observe who is present, what occurs and when before proposing an explanation.',
    'lim-food-forest-function-habitat': 'Habitat provides the resources and conditions an organism needs, such as food, shelter, water and breeding space. A place may suit one life stage but not another. Look for use over time rather than judging habitat from appearance alone.',
    'lim-food-forest-function-soil-relationships': 'Soil relationships connect roots with water, minerals, fungi, microbes and animals. They may involve exchange, competition, decomposition or disease. Many processes are hidden, so separate visible signs from explanations that require further evidence.',
    'lim-food-forest-ecology': 'Ecology examines relationships among organisms and their surroundings. Patterns of shelter, feeding, competition, decomposition and disturbance can overlap. Record what occurs, where and when, then compare possible explanations instead of assuming every nearby organism is helping.',
    'lim-food-forest-ecology-companions': 'Companion planting places species together in the hope of useful relationships, but outcomes vary with climate, spacing and care. Treat companion claims as questions to observe and compare, not universal rules.',
    'lim-food-forest-ecology-pollinators': 'Pollinators move pollen while visiting flowers for food or other resources. Different visitors, flower forms and seasons create different relationships. Record the visitor and behaviour when possible, rather than assuming every flower visit results in pollination.',
    'lim-food-forest-ecology-soil-life': 'Soil life includes fungi, bacteria, protists and animals involved in decomposition, nutrient movement, feeding and disease. Activity varies with moisture, roots and organic matter. Visible organisms reveal only part of this community.',
    'lim-plant-soil-soil-life': 'Living roots interact with fungi, microbes and soil animals in relationships that range from exchange to competition or disease. Avoid reading plant condition as proof of one hidden process; compare soil, roots and seasonal change.',

    'lim-discovery-pathways': 'Discovery and pathways supports free exploration through questions, comparisons, records, evidence, problems and actions. Start anywhere, follow meaningful connections, and return when new observations change your understanding. Future optional pathways can arrange these same cells around a learning goal, while the open mesh remains available for curiosity-led learning.',
    'lim-pin-place-learning': 'A learning record captures how understanding changes, not just the final answer. Link the question, observation and source that influenced it. Uncertainty and revision are valuable because they show how knowledge developed.',
    'lim-pin-specimen-method': 'Method records how an observation, identification or measurement was made. Enough detail allows someone to understand or repeat it. Include tools, viewpoint or sampling limits when they affect the result.',
    'lim-pin-observation-problem': 'A problem is a gap between what is happening and what is wanted or expected. Describe the evidence before naming a cause. Clear framing can reveal several explanations and more than one possible response.',
    'lim-pin-observation-action': 'An action records what was changed, when and why. Keep it linked to the original observation so later results can be compared. One outcome may not prove that the action caused it.',
    'lim-pin-note': 'A note holds a useful question, task, data point or learning reflection. Give it enough context to remain meaningful later. Linking the note to a place, date or observation turns a loose thought into a reusable record.',
    'lim-pin-note-task': 'A task states an intended action and the reason it matters. Add timing or conditions when relevant, then record what actually happened. Completion alone does not describe the outcome.',
    'lim-pin-note-data': 'Data is recorded information used for comparison or reasoning. Include units, method, date and missing values where relevant. A number becomes more useful when its context and limitations remain attached.',
    'lim-pin-note-learning': 'A learning note records a new connection, changed idea or remaining question. Link it to the observations or sources behind it so another explorer can follow the reasoning.'
});
const fallbackBody = label => `${label} is available as a learning topic, but its companion explanation has not been provided.`;
const slug = value => String(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function buildCells(group, nodes, parentId = null, path = []) {
    return nodes.flatMap(node => {
        const nextPath = [...path, node.label];
        const cell = Object.freeze({
            id: `lim-${group.id}-${nextPath.slice(1).map(slug).join('-')}`,
            title: node.label,
            content: LIM_CONTENT[`lim-${group.id}-${nextPath.slice(1).map(slug).join('-')}`] || fallbackBody(node.label),
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
        content: LIM_CONTENT[`lim-${group.id}`] || fallbackBody(group.title),
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
