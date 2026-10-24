import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDaleysPlanningRecord, applyPlanningOverrides } from '../app/services/daleysPlanningTraits.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), assetDir = path.join(root, 'app/assets/food-forest');
const snapshotPath = path.join(root, 'data1/daleys_planning_pages.json');
const decode = value => value.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&(?:amp|nbsp|lt|gt|quot|apos);/g, word => ({ '&amp;': '&', '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }[word])).replace(/\s+/g, ' ').trim();
export function parseDaleysSpecifications(html) {
    const values = {};
    for (const match of html.matchAll(/<p class="daley-product-specification">([\s\S]*?)<\/p>/g)) {
        const name = match[1].match(/<b>([\s\S]*?)<\/b>/)?.[1], value = match[1].match(/<span class="daley-product-specifications-values">([\s\S]*?)<\/span>/)?.[1];
        if (name && value) values[decode(name)] = decode(value);
    }
    return values;
}
export function buildFoodForestDataQuality(records, { rawProducts = [], pageCount = 0, codebook = {}, sourceSnapshotAt = '' } = {}) {
    const plants = records.filter(record => record.listingType !== 'merchandise');
    const countBy = (items, key) => Object.fromEntries([...new Set(items.map(item => key(item)).filter(Boolean))].sort().map(value => [value, items.filter(item => key(item) === value).length]));
    const fields = ['climate', 'heightBand', 'pollination', 'frost', 'foliage', 'timeToHarvest', 'potSuitability', 'sizeManagement', 'stateRestrictions', 'harvestSourceCodes'];
    const polarity = { positive: 0, conditional: 0, negative: 0 };
    for (const record of plants) for (const item of record.functions) polarity[item.polarity || 'positive'] = (polarity[item.polarity || 'positive'] || 0) + 1;
    const unmappedValues = {};
    for (const product of rawProducts) for (const filter of product.filter || []) {
        const values = Array.isArray(filter.value) ? filter.value : [filter.value], map = codebook.fields?.[filter.db];
        const unknown = map ? values.filter(value => !map[String(value)]) : values;
        if (unknown.length) { const bucket = unmappedValues[filter.db] ||= {}; for (const value of unknown) bucket[String(value)] = (bucket[String(value)] || 0) + 1; }
    }
    const traitCandidates = {};
    for (const record of plants) for (const trait of record.traitCandidates || []) traitCandidates[trait.id] = (traitCandidates[trait.id] || 0) + 1;
    const categoryCoverage = {};
    for (const record of plants) for (const category of record.sourceCategories) categoryCoverage[category] = (categoryCoverage[category] || 0) + 1;
    return {
        schemaVersion: 1, kind: 'nourishland-food-forest-data-quality', generatedAt: new Date().toISOString(), sourceSnapshotAt,
        scope: 'Supplier catalogue evidence only; this report does not certify regional suitability, companion planting, or planting design.',
        counts: { records: records.length, plantCandidates: plants.length, excludedMerchandise: records.length - plants.length, botanicalIdentityMissing: plants.filter(record => !record.scientificName).length, unreviewed: plants.filter(record => record.review.status !== 'reviewed').length, productsWithSourceDescription: plants.filter(record => record.sourceDescription).length, pagesWithLiveSpecifications: plants.filter(record => record.specifications).length, pagesFetched: pageCount, explicitPolliniserLinks: plants.filter(record => record.pollinisers.length).length, recordsWithCuratedOverrides: plants.filter(record => record.curated).length },
        apiFilterCoverage: Object.fromEntries(fields.map(name => [name, plants.filter(record => record.fields[name]).length])),
        functionEvidence: { signalCount: Object.values(polarity).reduce((sum, value) => sum + value, 0), byPolarity: polarity, byFunction: countBy(plants.flatMap(record => record.functions), item => item.id) },
        liveSpecificationTraitCandidates: traitCandidates,
        unlabelledOrUnmappedApiCodes: unmappedValues,
        harvestCodeNote: 'Raw Harvest filter values are retained as opaque supplier codes. The zero-based versus one-based month convention has not been verified.',
        sourceCategoryCoverage: categoryCoverage,
        reviewPolicy: { inferredFunctions: 'needs-review with source excerpt and polarity; conditional and negative mentions are excluded from default positive-function filtering', suggestedLayers: 'needs-review only; never a planting recommendation', manualEdits: 'stored separately in overrides.json and preserved by regeneration' }
    };
}
async function main() {
    const raw = JSON.parse(await fs.readFile(path.join(root, 'workspace/daleys-export/daleys-products.json'), 'utf8'));
    const catalog = JSON.parse(await fs.readFile(path.join(root, 'data1/daleys_plant_catalog.json'), 'utf8'));
    const bySku = new Map(catalog.products.map(item => [item.sku, item]));
    let pages = { schemaVersion: 1, pages: [] }; try { pages = JSON.parse(await fs.readFile(snapshotPath, 'utf8')); } catch { /* First extraction. */ }
    if (process.argv.includes('--refresh-examples')) {
        const ids = ['463', '62', '63', '3324', '283', '2617', '888', '3583', '707', '384', '3108', '2171', '73', '685'];
        for (const sku of ids) {
            const product = raw.products.find(item => String(item.sku) === sku), url = product?.url || bySku.get(sku)?.productUrl; if (!url) continue;
            try {
                const response = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!response.ok) throw Error(`HTTP ${response.status}`);
                const body = await response.text(), specifications = parseDaleysSpecifications(body);
                if (!Object.keys(specifications).length) throw Error('No product specifications; existing snapshot kept');
                const page = { sku, url: response.url, retrievedAt: new Date().toISOString(), specifications };
                pages.pages = pages.pages.filter(item => item.sku !== sku).concat(page); console.log(`${sku} ${product.name}: ${JSON.stringify(specifications)}`);
            } catch (error) { console.warn(`${sku}: ${error.message}`); }
            await new Promise(resolve => setTimeout(resolve, 150));
        }
        await fs.writeFile(snapshotPath, JSON.stringify(pages, null, 2) + '\n');
    }
    const codebook = JSON.parse(await fs.readFile(path.join(assetDir, 'daleys-codebook.json'), 'utf8'));
    const overrides = JSON.parse(await fs.readFile(path.join(assetDir, 'overrides.json'), 'utf8'));
    const records = raw.products.map(product => {
        const record = buildDaleysPlanningRecord(product, { catalog: bySku.get(String(product.sku)), codebook: codebook.fields, page: pages.pages.find(page => page.sku === String(product.sku)), snapshotAt: raw.metadata.extractedAt });
        return applyPlanningOverrides(record, overrides.records?.[record.id] || overrides.records?.[record.sku]);
    });
    const plants = records.filter(record => record.listingType !== 'merchandise'), coverage = {};
    for (const name of ['climate', 'heightBand', 'pollination', 'frost', 'foliage', 'timeToHarvest', 'harvestSourceCodes']) coverage[name] = plants.filter(record => record.fields[name]).length;
    const functions = Object.fromEntries([...new Set(plants.flatMap(record => record.functions.map(item => item.id)))].map(id => [id, plants.filter(record => record.functions.some(item => item.id === id)).length]));
    const output = { schemaVersion: 1, kind: 'nourishland-food-forest-catalog', generatedAt: new Date().toISOString(), sourceSnapshotAt: raw.metadata.extractedAt, source: raw.metadata.source, codebook, summary: { records: records.length, plantCandidates: plants.length, excludedMerchandise: records.length - plants.length, coverage, withPolliniserLinks: plants.filter(record => record.pollinisers.length).length, withLiveSpecifications: plants.filter(record => record.specifications).length, layerSuggestions: plants.filter(record => record.layer.value).length, functionCandidates: functions }, records };
    const quality = buildFoodForestDataQuality(records, { rawProducts: raw.products, pageCount: pages.pages.length, codebook, sourceSnapshotAt: raw.metadata.extractedAt });
    await fs.writeFile(path.join(assetDir, 'plants.json'), JSON.stringify(output) + '\n');
    await fs.writeFile(path.join(assetDir, 'data-quality.json'), JSON.stringify(quality, null, 2) + '\n');
    console.log(JSON.stringify(output.summary, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
