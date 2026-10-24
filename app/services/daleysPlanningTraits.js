const decodeNumericEntity = (_, decimal, hexadecimal) => {
    const code = decimal ? Number(decimal) : parseInt(hexadecimal, 16);
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
};
const clean = value => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&#(\d+);|&#x([\da-f]+);/gi, decodeNumericEntity).replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values)];
export const DALEYS_FILTER_FIELDS = { climateZone2: 'climate', Height: 'heightBand', Pollination2: 'pollination', Frost_Tolerance2: 'frost', Deciduous2: 'foliage', TimeToFruit: 'timeToHarvest', Bonsai: 'potSuitability', Dwarf: 'sizeManagement', stateRestrict: 'stateRestrictions' };
const rules = [
    ['nitrogen-fixing', /\b(?:nitrogen[- ]fix(?:ing|er|ation)?|fix(?:es|ing)? nitrogen)\b/i],
    ['nitrogen-support', /\b(?:provid(?:e|es|ing) nitrogen|green manure|soil improvement|soil fertility)\b/i],
    ['windbreak', /\b(?:windbreaks?|shelter ?belts?|wind shelter|wind protection)\b/i],
    ['mulch', /\b(?:mulch|chop[- ]and[- ]drop)\b/i],
    ['ground-cover', /\b(?:ground ?cover|ground-cover|weed suppress(?:ion|ing))\b/i],
    ['pollinator-habitat', /\b(?:attract(?:s|ing)?\s+(?:bees|pollinators)|bee attracting|nectar.{0,20}bees|pollinator habitat)\b/i],
    ['wildlife-habitat', /\b(?:habitat|food.{0,25}(?:birds|butterfl)|birds.{0,20}attract|attract.{0,25}(?:birds|butterfl|wildlife))\b/i],
    ['pioneer', /\b(?:pioneer|regenerat(?:ion|ing)|reforestation|revegetation)\b/i],
    ['edible', /\b(?:edible|eaten fresh|eaten cooked|can be eaten|used for food|food crop)\b/i]
];
const conditionPattern = /\b(?:when established|once established|if established|when mature|once mature|in dry periods|during dry periods|in well[- ]drained|where conditions|provided that|if grown|when grown|may|might|benefits from|requires)\b/i;
const negationPattern = /\b(?:not|never|no|avoid|poor|unsuitable|doesn['’]?t|do not|cannot|can not|unable to|lacks?)\b/i;
export function daleysCategoryNames(raw) {
    const name = clean(raw.name);
    return unique((raw.breadcrumb || []).flatMap(path => (path.itemListElement || []).filter(item => clean(item.name) !== name && !/\/sku\d+/i.test(item.item || '')).map(item => clean(item.name))).filter(Boolean));
}
export function daleysSourceFilters(raw) {
    const filters = {};
    for (const filter of raw.filter || []) if (typeof filter.db === 'string') filters[filter.db] = unique([...(filters[filter.db] || []), ...(Array.isArray(filter.value) ? filter.value : [filter.value])].filter(v => v !== null && v !== undefined));
    return filters;
}
function excerpt(text, index, length) {
    const boundaries = /[.!?;\n]+/g; let start = 0, end = text.length;
    for (const match of text.matchAll(boundaries)) { const stop = match.index + match[0].length; if (stop <= index) start = stop; else if (match.index >= index + length) { end = match.index; break; } }
    return text.slice(start, end).trim().slice(0, 320);
}
function polarityOf(sentence, matchIndex) {
    const local = sentence.slice(Math.max(0, matchIndex - 85), matchIndex + 15);
    if (negationPattern.test(local)) return 'negative';
    return conditionPattern.test(sentence) ? 'conditional' : 'positive';
}
export function suggestDaleysFunctions(description, categories = []) {
    const text = clean(description), suggestions = [];
    for (const [id, regex] of rules) {
        for (const match of text.matchAll(new RegExp(regex.source, `${regex.flags.replace('g', '')}g`))) {
            const start = Math.max(0, text.lastIndexOf('.', match.index) + 1), evidence = excerpt(text, match.index, match[0].length), polarity = polarityOf(evidence, match.index - start);
            suggestions.push({ id, status: 'needs-review', basis: 'description-rule', polarity, confidence: polarity === 'positive' ? 'candidate' : 'low', evidence, ...(polarity === 'conditional' ? { caution: 'Supplier statement is conditional; verify growing conditions.' } : polarity === 'negative' ? { caution: 'Source wording negates or limits this function.' } : {}) });
        }
    }
    if (categories.includes('Pioneer Plants') && !suggestions.some(item => item.id === 'pioneer')) suggestions.push({ id: 'pioneer', status: 'source-category', basis: 'Daleys category', polarity: 'positive', evidence: 'Pioneer Plants' });
    return suggestions;
}
function specificationTraits(specifications = {}, page = {}) {
    const traits = [], add = (id, key, basis, normalize = value => ({ value })) => {
        const raw = specifications[key]; if (!raw) return;
        const value = clean(raw); traits.push({ id, ...normalize(value), basis, status: 'source-stated', evidence: `${key}: ${value}`, sourceUrl: page.url || '', observedAt: page.retrievedAt || '' });
    };
    add('climate', 'Preferred Climate', 'supplier-declared-climate', value => ({ value: value.split(/\s*,\s*/) }));
    add('water', 'Water Requirements', 'supplier-declared-water', value => ({ value, ...( /drought hardy|little watering/i.test(value) ? { normalized: 'drought-tolerant-supplier-claim' } : /frequent/i.test(value) ? { normalized: 'frequent-watering' } : /moderate/i.test(value) ? { normalized: 'moderate-watering' } : {}) }));
    add('sun', 'Sun or Shade', 'supplier-declared-light', value => ({ value: value.split(/\s*,\s*/) }));
    add('soil', 'Preferred Soil Type', 'supplier-declared-soil', value => ({ value: value.split(/\s*,\s*/) }));
    add('soil-pH', 'Soil pH', 'supplier-declared-soil-pH');
    const range = value => { const m = value.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*m/i), above = value.match(/(\d+(?:\.\d+)?)\s*m\s*\+/i), exact = value.match(/^(\d+(?:\.\d+)?)\s*m$/i); return { value, ...(m ? { rangeM: { min: Number(m[1]), max: Number(m[2]) } } : above ? { rangeM: { min: Number(above[1]), max: null } } : exact ? { rangeM: { min: Number(exact[1]), max: Number(exact[1]) } } : {}) }; };
    add('mature-height', 'Max Height (when in the ground with good conditions)', 'supplier-declared-mature-height', range);
    add('plant-width', 'Plant Width', 'supplier-declared-plant-width', range);
    add('growth-rate', 'Growth Rate', 'supplier-declared-growth-rate');
    add('harvest-months', 'Fruiting/Harvest Months', 'supplier-declared-harvest-months', value => ({ value: value.split(/\s*,\s*/) }));
    add('pollination', 'Plants required to Pollinate', 'supplier-declared-pollination');
    add('frost', 'Can it Handle Frosts?', 'supplier-declared-frost');
    add('foliage', 'Amount of leaves in Winter?', 'supplier-declared-foliage');
    return traits;
}
function sourceContexts(categories, text) {
    const context = [], add = (id, basis, extra = {}) => context.push({ id, basis, ...extra });
    if (categories.some(category => /^native plants$|^natives$/i.test(category))) add('australian-native', 'source-category', { regionalSuitability: 'not-assessed' });
    if (categories.some(category => /rainforest/i.test(category))) add('rainforest', 'source-category');
    if (categories.some(category => /pioneer/i.test(category))) add('regeneration', 'source-category');
    if (categories.some(category => /understorey/i.test(category))) add('understorey', 'source-category');
    if (categories.some(category => /bush food/i.test(category))) add('bush-food', 'source-category');
    if (/\b(?:climber|climbing|vine)\b/i.test(text)) add('climbing-growth-habit', 'description-rule');
    if (/\b(?:ground ?cover|creeping|prostrate)\b/i.test(text)) add('low-spreading-growth-habit', 'description-rule');
    return context;
}
export function buildDaleysPlanningRecord(raw, { catalog = {}, codebook = {}, page = null, snapshotAt = '' } = {}) {
    const sku = clean(raw.sku || raw.productID), categories = daleysCategoryNames(raw), rawFilters = daleysSourceFilters(raw);
    const sourceUrl = page?.url || raw.url || catalog.productUrl || (raw.offers || []).flat().find(offer => offer.url)?.url || '';
    const fields = {};
    for (const [db, name] of Object.entries(DALEYS_FILTER_FIELDS)) if (rawFilters[db]?.length) fields[name] = { values: rawFilters[db].map(code => ({ code, label: codebook[db]?.[code]?.label || null, ...(codebook[db]?.[code]?.range ? { range: codebook[db][code].range } : {}) })), basis: 'api-filter', sourceField: db, sourceUrl, observedAt: snapshotAt };
    // Daleys API harvest codes have no verified month index convention. Keep them opaque.
    if (rawFilters.Harvest) fields.harvestSourceCodes = { values: rawFilters.Harvest, basis: 'api-filter-unmapped-codes', sourceField: 'Harvest', sourceUrl, note: 'Do not interpret as calendar months until the supplier codebook is verified.' };
    const links = (raw.additionalProperty || []).filter(property => property.name === 'Pollinators').map(property => ({ ids: unique((Array.isArray(property.value) ? property.value : []).map(value => `daleys:${value}`)), sourceText: clean(property.description), basis: 'explicit-polliniser-link', sourceUrl }));
    const functions = suggestDaleysFunctions(raw.description, categories);
    const sourceDescription = clean(raw.description), context = sourceContexts(categories, `${clean(raw.name)} ${sourceDescription}`);
    const record = { id: `daleys:${sku}`, sku, commonName: clean(raw.name), scientificName: clean(raw.botanicalName || catalog.scientificName), listingType: catalog.listingType || (raw.botanicalName ? 'plant' : 'plant_identity_review'), taxonGroupId: catalog.taxonGroupId || '', productGroupId: clean(raw.mpn), sourceUrl, sourceCategories: categories, sourceSnapshotAt: snapshotAt, rawFilters, fields, pollinisers: links, functions, context, layer: { value: null, status: 'unassigned' }, spacingM: null, canopySpreadM: null, sourceDescription, review: { status: 'unreviewed', notes: '' } };
    if (page?.specifications) {
        record.specifications = { values: page.specifications, sourceUrl: page.url, retrievedAt: page.retrievedAt, basis: 'product-specifications' };
        record.traitCandidates = specificationTraits(page.specifications, page);
    }
    const text = `${record.commonName} ${sourceDescription}`;
    let suggested = /\b(?:ground ?cover|creeping|prostrate)\b/i.test(text) ? 'groundcover' : /\b(?:climber|climbing|vine|grape|passionfruit)\b/i.test(text) ? 'climber' : /\b(?:tuber|rhizome|root crop)\b/i.test(text) ? 'root' : /\b(?:herbaceous|perennial herb|annual herb)\b/i.test(text) ? 'herb' : /\bshrub\b/i.test(text) ? 'shrub' : null;
    if (!suggested) { const code = rawFilters.Height?.[0]; suggested = code === 5 ? 'canopy' : code === 4 || code === 3 && /\btree\b/i.test(text) ? 'small-tree' : null; }
    if (suggested && record.listingType !== 'merchandise') record.layer = { value: suggested, status: 'needs-review', basis: 'description-and-height-band', note: 'Layer is a suggested board role; it is not a planting recommendation.' };
    return record;
}

export function applyPlanningOverrides(record, override) {
    if (!override) return structuredClone(record);
    const next = structuredClone(record);
    // Hand edits occupy their own layer; regeneration never replaces them.
    next.curated = structuredClone(override); return next;
}

export function planningRecordMatches(record, { query = '', climate = '', functionId = '', category = '', heightCode = '', pollinationCode = '', reviewedOnly = false } = {}) {
    if (record.listingType === 'merchandise') return false;
    const haystack = [record.commonName, record.scientificName, record.sourceDescription, ...record.sourceCategories].join(' ').toLowerCase();
    if (!query.toLowerCase().split(/\s+/).filter(Boolean).every(word => haystack.includes(word))) return false;
    if (climate && !record.fields.climate?.values.some(value => value.label === climate)) return false;
    if (heightCode && !record.fields.heightBand?.values.some(value => String(value.code) === String(heightCode))) return false;
    if (pollinationCode && !record.fields.pollination?.values.some(value => String(value.code) === String(pollinationCode))) return false;
    const functions = reviewedOnly ? record.curated?.functions || [] : unique([...(record.curated?.functions || []), ...record.functions.filter(item => item.polarity === 'positive').map(item => item.id)]);
    if (functionId && !functions.includes(functionId)) return false;
    if (category && !record.context.some(item => item.id === category) && !record.sourceCategories.includes(category)) return false;
    return true;
}
