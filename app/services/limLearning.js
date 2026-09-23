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
export const LIM_PATHWAYS = Object.freeze([
    Object.freeze({
        id: 'lim-path-understand-place',
        title: 'Understand This Place',
        learningGoal: 'Notice the conditions, living structures and relationships that shape a place.',
        description: 'An optional route through seven connected LIM topics.',
        orderedCellIds: Object.freeze([
            'lim-pin-place',
            'lim-climate',
            'lim-food-forest',
            'lim-plant',
            'lim-wildlife-relationships',
            'lim-pin-observation',
            'lim-pin-observation-action'
        ]),
        suggestedBranches: Object.freeze([
            'Begin with what can be directly located and observed.',
            'Notice the climate and local conditions acting on the place.',
            'Read the place as a connected living structure.',
            'Look at how plants participate in that structure.',
            'Follow relationships with wildlife and other living systems.',
            'Return to direct observation before deciding what it means.',
            'Connect what you noticed with a careful next action or Note.'
        ]),
        completionState: 'completed',
        version: 1
    })
]);
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
// The pitch-deck opening uses a small conceptual layer before revealing the
// full LIM. These cells introduce the learning philosophy without changing or
// replacing any of the 97 authored LIM cells below them.
const introCell = ({topics=[],relatedIds=[],parentId=null,...cell}) => Object.freeze({
    ...cell,
    parentId,
    topics:Object.freeze([...topics]),
    relatedIds:Object.freeze([...relatedIds]),
    primaryFaceId:cell.id,
    relatedFaceIds:Object.freeze([]),
    accessibilityLabel:`${cell.title} introductory learning cell`,
    layoutRole:'intro'
});

export const LIM_INTRO_CELLS = Object.freeze([
    introCell({id:'lim-intro-analysis',title:'Read Nature',accent:'#6978b8',topics:['Climate','Topography','Landscape','Strategy'],relatedIds:['lim-intro-smart-feedback'],content:'Read Nature begins with the conditions already shaping a site before a solution is proposed. Climate, topography, landscape patterns and practical strategy reveal constraints, opportunities and relationships that a single photograph can hide.',lookFor:'Sun, shade, slope, water movement, wind, access, existing vegetation, human use and signs of change through time.',question:'Which condition is shaping the place most strongly right now, and what evidence supports that reading?',next:'Compare Climate, Topography and Landscape, then use Strategy to choose the next useful observation.'}),
    introCell({id:'lim-intro-analysis-climate',parentId:'lim-intro-analysis',title:'Climate',accent:'#6978b8',topics:['Seasons','Temperature','Rainfall','Wind','Frost and heat','Microclimates'],relatedIds:['lim-intro-literacy-plants'],content:'Climate describes recurring patterns of temperature, rainfall, season and exposure. A broad climate label is only a starting point: buildings, hollows, canopy, wind and recent weather create microclimates that can change what grows across a few metres.',lookFor:'Seasonal timing, frost pockets, reflected heat, damp edges, wind exposure and differences between sheltered and open positions.',question:'Where does this place behave differently from the wider climate description, and which observation supports that conclusion?',next:'Connect Climate with Plant needs, then compare it with Topography to explain local variation.'}),
    introCell({id:'lim-intro-analysis-topography',parentId:'lim-intro-analysis',title:'Topography',accent:'#6978b8',topics:['Elevation','Slope','Aspect','Drainage','Erosion','High and low points'],relatedIds:['lim-intro-food-water'],content:'Topography is the shape and level of land. Elevation, slope and aspect influence water movement, sun, wind, access and where growing conditions form, so a small change in height can produce a meaningful change in the living system.',lookFor:'High and low points, contours, runoff paths, pooling, erosion, stable ground, aspect and difficult access.',question:'Where would water, people, seeds and roots naturally travel if no path or drain had been built?',next:'Connect Topography with Water, then bring the result into Landscape and Strategy.'}),
    introCell({id:'lim-intro-analysis-landscape',parentId:'lim-intro-analysis',title:'Landscape',accent:'#6978b8',topics:['Soil','Water','Existing vegetation','Wildlife','Structures','Access and movement','Human use'],relatedIds:['lim-intro-food-design'],content:'Landscape brings landform, soil, water, vegetation, wildlife, built elements and people into one view. Read their relationships before isolating a single feature; the most useful pattern is often found at an edge, transition or point of repeated use.',lookFor:'Shelter, movement, competing uses, existing care, disturbed ground, habitat and places where life is already thriving.',question:'What relationship becomes visible when this place is read as a connected system instead of separate objects?',next:'Connect Landscape with Design, then use Strategy to decide what deserves closer observation.'}),
    introCell({id:'lim-intro-analysis-strategy',parentId:'lim-intro-analysis',title:'Strategy',accent:'#6978b8',topics:['Opportunities','Constraints','Questions','Zones','Priorities','Baseline observations','Further investigation'],relatedIds:['lim-intro-smart-goals','lim-intro-smart-limitations','lim-intro-smart-challenges'],content:'Strategy connects what a place is now with careful next steps. It turns opportunities, constraints and unanswered questions into priorities, zones and reversible actions, while a baseline gives later observations something honest to compare against.',lookFor:'The smallest useful action, the evidence behind it, the care available and the condition that would make the plan change.',question:'What would you try first, how would you know whether it helped, and when should the decision be reviewed?',next:'Connect Strategy with Goals, Limitations and Challenges before moving into action.'}),

    introCell({id:'lim-intro-literacy',title:'Understand the Land',accent:'#719b62',topics:['Plants','Guilds','Grow','Fruit','Soil life','Wildlife'],content:'Understand the Land builds the ability to read organisms and their relationships. Plant identity, guilds, growth, harvest, soil life and wildlife become a practical language for exploring a place while keeping direct observation separate from assumption.',lookFor:'Form, life cycle, neighbours, root conditions, seasonal visitors, signs of stress and signs of support.',question:'What can be described directly, what is inferred from a relationship, and what still needs another observation?',next:'Choose one living subject, then follow its needs and relationships rather than stopping at its name.'}),
    introCell({id:'lim-intro-literacy-plants',parentId:'lim-intro-literacy',title:'Plants',accent:'#719b62',topics:['Identity','Growth form','Life cycle','Needs','Ecological roles'],relatedIds:['lim-intro-analysis-climate'],content:'Plants can be read through identity, growth form, life cycle, needs and ecological roles. Begin with observable features and keep uncertainty visible; a careful “not sure yet” protects every later claim about care, use or relationships.',lookFor:'Leaves, stems, bark, branching, roots, scale, season, health and features that distinguish similar species.',question:'Which feature would another observer need in order to check the identification and understand the plant in this place?',next:'Connect Plants with Climate, Guilds and Grow rather than treating a name as the end of the inquiry.'}),
    introCell({id:'lim-intro-literacy-guilds',parentId:'lim-intro-literacy',title:'Guilds',accent:'#719b62',topics:['Companions','Support species','Shared resources','Competition','Pollination','Fertility','Mutual relationships'],relatedIds:['lim-intro-food-function'],content:'A guild explores organisms that may support shared functions such as food, shade, habitat, pollination or fertility. It is a testable idea about relationships, not a promise that every companion will cooperate in every place or season.',lookFor:'Flowering times, root zones, shared resources, competition, habitat, fertility and the people who will maintain the planting.',question:'Which relationship has been observed here, which is still a design hypothesis, and what evidence would distinguish them?',next:'Connect Guilds with Function to test whether the proposed relationships are doing useful work.'}),
    introCell({id:'lim-intro-literacy-grow',parentId:'lim-intro-literacy',title:'Grow',accent:'#719b62',topics:['Propagation','Establishment','Watering','Feeding','Pruning','Health','Pests','Seasonal care'],relatedIds:['lim-intro-food-succession'],content:'Growing knowledge joins propagation, establishment, water, nutrition, pruning, health and seasonal care. The method should suit the species, place and people caring for it; a technically possible method can still be a poor local choice.',lookFor:'Roots, new growth, water stress, protection, timing, pests, failure points and the care that is realistically available.',question:'What does this plant need during its current life stage, and who will notice if that need changes or is missed?',next:'Connect Grow with Succession to plan for establishment, maturity and changing care.'}),
    introCell({id:'lim-intro-literacy-fruit',parentId:'lim-intro-literacy',title:'Fruit',accent:'#719b62',topics:['Edible parts','Flowering','Season','Ripeness','Harvest','Preparation','Safety','Storage and sharing'],relatedIds:['lim-intro-smart-outcomes'],content:'Fruit connects plant identity with flowering, pollination, season, ripeness, harvest, preparation and safe use. A harvest is also evidence of how a plant responds to its place, so timing and conditions matter more than a fixed promise of yield.',lookFor:'Flowers, pollinators, fruit set, ripeness cues, damage, edible parts, harvest method and what remains for wildlife.',question:'What changed between flowering and harvest, and what evidence is needed before describing an edible use as safe?',next:'Connect Fruit with Outcomes, then record preparation knowledge with its source and local context.'}),
    introCell({id:'lim-intro-literacy-soil-life',parentId:'lim-intro-literacy',title:'Soil Life',accent:'#719b62',topics:['Soil structure','Organic matter','Fungi','Bacteria','Decomposers','Nutrient cycling','Root zone'],relatedIds:['lim-intro-food-energy'],content:'Soil life includes fungi, bacteria, decomposers, roots and other organisms that transform organic matter and shape soil structure. Their activity cannot be reduced to a single fertility score; moisture, air, disturbance and living roots all affect the system.',lookFor:'Aggregation, pores, roots, litter, fungi, invertebrates, smell, moisture and the speed at which organic material changes.',question:'What direct signs suggest an active soil community, and which claims would require sampling or longer observation?',next:'Connect Soil Life with Energy to follow how organic matter and nutrients move through the forest.'}),
    introCell({id:'lim-intro-literacy-wildlife',parentId:'lim-intro-literacy',title:'Wildlife',accent:'#719b62',topics:['Habitat','Pollinators','Predators','Seed dispersers','Nesting','Seasonal presence','Conflict'],relatedIds:['lim-intro-food-stewardship'],content:'Wildlife reveals how birds, insects, mammals and other animals use a place for food, shelter, nesting, movement and reproduction. An interaction may help one participant and challenge another, so observation should record behaviour before assigning a simple benefit or harm.',lookFor:'Tracks, calls, nests, feeding, pollination, dispersal, predation, seasonal arrival and repeated movement routes.',question:'Who is present, what are they doing, when does it happen, and how confident is the interpretation?',next:'Connect Wildlife with Stewardship so habitat, harvest and conflict can be managed together.'}),

    introCell({id:'lim-intro-food-forest',title:'Design the Forest',accent:'#a06a43',topics:['Function','Energy','Design','Succession','Water','Stewardship'],content:'Design the Forest uses ecological patterns to create productive living landscapes. Function, flows, spatial design, succession, water and stewardship guide decisions while observation keeps them grounded in place; the model is a prompt for thinking, not a rigid recipe.',lookFor:'Layers, relationships, water, access, maintenance, seasonal change and places where one element performs several useful roles.',question:'Which function or relationship is missing, overloaded or likely to change as the living system matures?',next:'Choose a design lens, test it against the place, and leave a clear path back to observation.'}),
    introCell({id:'lim-intro-food-function',parentId:'lim-intro-food-forest',title:'Function',accent:'#a06a43',topics:['Food and yield','Habitat','Shade and shelter','Fertility','Access','Multiple functions'],relatedIds:['lim-intro-literacy-guilds'],content:'Function asks what each element contributes: food, shade, habitat, shelter, access, fertility or another role. One element may perform several functions, and a function only matters if it works for this place and the people maintaining it.',lookFor:'Outputs, support roles, maintenance burden, seasonal gaps and useful overlaps between plants, structures and human activity.',question:'What job is this element doing, and what direct evidence shows that the job is being done?',next:'Connect Function with Guilds, then use Energy and Design to place useful relationships well.'}),
    introCell({id:'lim-intro-food-energy',parentId:'lim-intro-food-forest',title:'Energy',accent:'#a06a43',topics:['Sunlight','Water flow','Wind','Organic matter','Human work','Storage and loss'],relatedIds:['lim-intro-literacy-soil-life'],content:'Sunlight, water, wind, organic matter and human effort move through a food forest. Good design notices where these flows arrive, where they are stored and where they are lost, then reduces needless work without pretending that care can disappear.',lookFor:'Sun paths, shade, runoff, wind, mulch, nutrient cycles, tool access and tasks that must be repeated.',question:'Where is useful energy being lost, and where could a living relationship capture, store or redirect it?',next:'Connect Energy with Soil Life, then compare the result with Water, Design and Succession.'}),
    introCell({id:'lim-intro-food-design',parentId:'lim-intro-food-forest',title:'Design',accent:'#a06a43',topics:['Layers','Spacing','Access','Edges','Zones','Redundancy','Maintenance'],relatedIds:['lim-intro-analysis-landscape'],content:'Design arranges plants, paths, water and access around real goals and conditions. Layers, spacing, edges, zones and redundancy become useful only when people can safely reach, observe and care for the system as it changes.',lookFor:'Scale, future canopy, access, safety, water, sight lines, maintenance routes and the consequences of mature size.',question:'What is the smallest design move that would improve function and make the next season easier to learn from?',next:'Connect Design with Landscape, then test the choice against Stewardship and future Succession.'}),
    introCell({id:'lim-intro-food-succession',parentId:'lim-intro-food-forest',title:'Succession',accent:'#a06a43',topics:['Pioneer species','Nurse plants','Canopy closure','Changing light','Replacement','Maturity'],relatedIds:['lim-intro-literacy-grow'],content:'Succession is change through time. Early plants can protect soil and prepare conditions for later ones, while a food forest shifts in shade, structure and care as it matures; planning for change prevents today’s solution becoming tomorrow’s obstacle.',lookFor:'Fast and slow growers, nurse plants, changing light, mortality, recruitment, replacement and changing maintenance needs.',question:'What is this planting preparing for, and what will need to change when roots, canopy and access mature?',next:'Connect Succession with Grow, then return to Outcomes and Feedback to make change visible.'}),
    introCell({id:'lim-intro-food-water',parentId:'lim-intro-food-forest',title:'Water',accent:'#a06a43',topics:['Source','Capture','Infiltration','Storage','Overflow','Irrigation','Drought and flood'],relatedIds:['lim-intro-analysis-topography'],content:'Water design follows rainfall, runoff, infiltration, storage, irrigation and safe overflow through the site. The aim is to slow, spread, sink or move water according to real conditions without creating erosion, waterlogging or an unrealistic maintenance burden.',lookFor:'Sources, contours, compacted ground, pooling, dry zones, overflow routes, roof water and signs of erosion.',question:'Where does water arrive, where can it safely pause, and where must it continue during an extreme event?',next:'Connect Water with Topography before choosing storage, planting or earthworks.'}),
    introCell({id:'lim-intro-food-stewardship',parentId:'lim-intro-food-forest',title:'Stewardship',accent:'#a06a43',topics:['Observation','Maintenance','Harvest','Pruning','Safety','Shared roles','Adaptation'],relatedIds:['lim-intro-literacy-wildlife','lim-intro-smart-feedback'],content:'Stewardship is the continuing work of observing, maintaining, harvesting and adapting a living system. It includes safety, shared responsibility and care for wildlife as well as plants; a design that nobody can maintain is incomplete.',lookFor:'Who notices change, who has access, which tasks repeat, when intervention is needed and where care could cause unintended harm.',question:'What care does this place need next, who can provide it, and how will their observations return to the knowledge mesh?',next:'Connect Stewardship with Wildlife and Feedback so care becomes part of the learning cycle.'}),

    introCell({id:'lim-intro-smart',title:'Shape the Outcome',accent:'#4f879e',topics:['Vision','Goals','Outcomes','Limitations','Challenges','Decisions','Feedback'],content:'Shape the Outcome turns observations into a shared direction and useful decisions. Vision, clear goals, measurable outcomes, honest limits, practical choices and feedback keep technology connected to the living place it serves; the interface should inform care rather than replace it.',lookFor:'A future worth working toward, a decision that needs evidence, the people affected, a responsible person and the moment when the result should be reviewed.',question:'What future should this work help create, what can the system help people notice, and what must remain a human judgement made in the place?',next:'Begin with Vision, connect it to a goal or decision, make uncertainty visible, then return through Feedback to Read Nature again.'}),
    introCell({id:'lim-intro-vision',parentId:'lim-intro-smart',title:'Vision',accent:'#4f879e',topics:['Purpose','Future state','Values','People','Place','Time horizon'],relatedIds:['lim-intro-smart-goals','lim-intro-smart-outcomes'],content:'Vision describes the future a project hopes to help create for a living place. It gives goals and decisions a shared direction without pretending the future is fixed; observation, participation and feedback can refine the vision as the place changes.',lookFor:'The people and living systems included, the values guiding the work, a meaningful time horizon and signs that the imagined future still belongs to this place.',question:'What future is worth working toward here, who should help shape it, and what would show that the vision needs to change?',next:'Connect Vision with Goals and Outcomes, then use Feedback to keep the shared direction responsive to the living place.'}),
    introCell({id:'lim-intro-smart-goals',parentId:'lim-intro-smart',title:'Goals',accent:'#4f879e',topics:['Purpose','People','Place','Timeframe','Priorities','Meaning of success'],relatedIds:['lim-intro-analysis-strategy','lim-intro-smart-decisions'],content:'Goals describe the change a project is trying to create for particular people and a particular place. A clear purpose, timeframe and priority make it easier to choose what to observe, build and measure, and give a team a shared reason to return.',lookFor:'Who benefits, what changes, where it changes, when it matters and how success would be recognised without the interface.',question:'Can the goal guide a real decision for the person caring for the place, or is it still too broad to act on?',next:'Connect Goals with Strategy and Decisions, then define an Outcome that could show progress.'}),
    introCell({id:'lim-intro-smart-outcomes',parentId:'lim-intro-smart',title:'Outcomes',accent:'#4f879e',topics:['Indicators','Yield','Resilience','Habitat','Learning','Unintended effects'],relatedIds:['lim-intro-literacy-fruit','lim-intro-smart-feedback'],content:'Outcomes are the changes that follow from action. Indicators may include yield, resilience, habitat or learning, but intended results must be compared with what actually happens, including effects that were not expected.',lookFor:'A visible change, a useful measure, a time window and consequences for other plants, people, wildlife or future care.',question:'What would count as evidence of progress, and what result would make the project pause or change course?',next:'Connect Outcomes with Fruit where harvest is relevant, then use Feedback to carry the result into the next decision.'}),
    introCell({id:'lim-intro-smart-limitations',parentId:'lim-intro-smart',title:'Limitations',accent:'#4f879e',topics:['Missing data','Seasonal bias','Access','Time and budget','Capacity','Technology','Uncertainty'],relatedIds:['lim-intro-analysis-strategy','lim-intro-smart-decisions'],content:'Every observation, tool and dataset has limits. Naming missing evidence, seasonal bias, uneven access, available time, technical constraints and uncertain identification makes the knowledge more useful and prevents the interface from creating false confidence.',lookFor:'What was not measured, who was absent, which source is old, what the sensor cannot see and where care capacity is limited.',question:'What would need to be known before making a stronger claim or committing to a less reversible action?',next:'Connect Limitations with Strategy and Decisions so uncertainty changes the plan instead of being hidden.'}),
    introCell({id:'lim-intro-smart-challenges',parentId:'lim-intro-smart',title:'Challenges',accent:'#4f879e',topics:['Problem','Possible causes','Safe experiments','Support','Risks','Review point'],relatedIds:['lim-intro-analysis-strategy'],content:'Challenges reveal where more observation, support or experimentation is needed. A problem becomes a learning question when the record keeps possible causes, risk, attempted response, available support and the next review together.',lookFor:'The bottleneck, people affected, competing explanations, the smallest safe experiment and the signal that would show learning.',question:'What is the next useful question, what risk must be managed, and who can help answer it in the living place?',next:'Connect Challenges with Strategy, then record the experiment as a Decision with a review point.'}),
    introCell({id:'lim-intro-smart-decisions',parentId:'lim-intro-smart',title:'Decisions',accent:'#4f879e',topics:['Options','Trade-offs','Evidence','Responsibility','Reversibility','Next action'],relatedIds:['lim-intro-smart-goals','lim-intro-smart-limitations'],content:'Decisions turn goals and evidence into a chosen next action. Good decisions make options, trade-offs, responsibility and reversibility visible, especially when knowledge is incomplete; they record why a path was chosen rather than only what happened.',lookFor:'The available options, evidence behind each one, people affected, cost of reversal and person responsible for follow-through.',question:'Which option best serves the goal within current limits, and what new evidence would justify changing it?',next:'Connect Decisions with Goals and Limitations, then define the observation that will create useful Feedback.'}),
    introCell({id:'lim-intro-smart-feedback',parentId:'lim-intro-smart',title:'Feedback',accent:'#4f879e',topics:['Observe','Record','Compare','Learn','Adjust','Return to place'],relatedIds:['lim-intro-analysis','lim-intro-food-stewardship','lim-intro-smart-outcomes'],content:'Feedback closes the learning cycle: observe what happened, record enough context, compare it with the goal, learn from difference and adjust the next action. It turns the LIM from a one-way explanation into a living record that improves through return visits.',lookFor:'A previous expectation, a dated observation, a meaningful difference, an interpretation and the next moment to check again.',question:'What changed, how confident is that reading, and what should be observed when the place is revisited?',next:'Return to Read Nature. The new observation may change the strategy, design or goal.'})
]);

export const LIM_INTRO_CELL_BY_ID = Object.freeze(Object.fromEntries(LIM_INTRO_CELLS.map(cell=>[cell.id,cell])));
const LIM_INTRO_ROOT_IDS = Object.freeze(['lim-intro-analysis','lim-intro-literacy','lim-intro-food-forest','lim-intro-smart']);
export const LIM_INTRO_BRANCHES = Object.freeze(LIM_INTRO_ROOT_IDS.map(id=>{
    const root=LIM_INTRO_CELL_BY_ID[id];
    return Object.freeze({
        id:root.id,
        title:root.title,
        displayLabel:root.title,
        accent:root.accent,
        children:Object.freeze(LIM_INTRO_CELLS.filter(cell=>cell.parentId===root.id))
    });
}));
const cellByLabel = new Map(LIM_ALL_CELLS.map(cell => [cell.title, cell]));
const LEGACY_LABEL_IDS = Object.freeze({Climate:'lim-climate','Food forest':'lim-food-forest',Plant:'lim-plant',Pin:'lim-pin'});
export function limLearningContent(labelOrId) {
    const cell = LIM_INTRO_CELL_BY_ID[labelOrId] || LIM_CELL_BY_ID[labelOrId] || LIM_CELL_BY_ID[LEGACY_LABEL_IDS[labelOrId]] || cellByLabel.get(labelOrId);
    const label = cell?.title || String(labelOrId ?? 'Learning');
    const face = LIM_FACES.find(item => item.id === cell?.primaryFaceId);
    const introParent = cell?.layoutRole === 'intro' ? LIM_INTRO_CELL_BY_ID[cell.parentId] : null;
    const relatedIntro = cell?.layoutRole === 'intro' ? (cell.relatedIds || []).map(id=>LIM_INTRO_CELL_BY_ID[id]?.title).filter(Boolean) : [];
    const body = cell?.layoutRole === 'intro'
        ? [cell.content, cell.topics?.length && `Explore · ${cell.topics.join(' · ')}`, cell.lookFor && `Look for · ${cell.lookFor}`, cell.question && `Ask · ${cell.question}`, cell.next && `Next · ${cell.next}`, relatedIntro.length && `Connect · ${relatedIntro.join(' · ')}`].filter(Boolean).join('\n\n')
        : (cell?.content || fallbackBody(label));
    return {
        id: cell?.id || String(labelOrId || ''), title: label,
        breadcrumb: cell?.layoutRole === 'intro' ? `Learn to learn · ${introParent ? `${introParent.title} · ` : ''}${label}` : `Learn to learn · ${face?.title || 'Learning Information Mesh'}${cell && cell.id !== face?.id ? ` · ${label}` : ''}`,
        body, primaryFaceId: cell?.primaryFaceId || null,
        primaryFace: face?.title || '', relatedFaceIds: cell?.relatedFaceIds || Object.freeze([]),
        accent: cell?.accent || '', accessibilityLabel: cell?.accessibilityLabel || `${label} learning cell`,
        pathwayRefs: cell?.pathwayRefs || Object.freeze([])
    };
}
export function limCellById(id) { return LIM_CELL_BY_ID[id] || null; }
