import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const endpoint = 'https://www.daleysfruit.com.au/app/products.php';
const batchSize = 100;
const outputPath = path.join(rootDir, 'data1', 'daleys_plant_catalog.json');
const args = process.argv.slice(2);
const fromJsonIndex = args.indexOf('--from-json');
const sourceSnapshotPath = fromJsonIndex >= 0 ? path.resolve(args[fromJsonIndex + 1] || '') : '';

function text(value) {
    return String(value ?? '').trim();
}

function apiName(product) {
    const props = Array.isArray(product.additionalProperty) ? product.additionalProperty : [];
    const botanical = props.find(item => /botanic|scientific/i.test(text(item?.name)))?.value;
    return text(botanical || product.botanicalName || product.scientificName || product.canonicalName);
}

function apiImage(product) {
    const images = Array.isArray(product.image) ? product.image : [product.image];
    return images.map(image => typeof image === 'string' ? image : image?.url || image?.contentUrl || '').map(text).find(Boolean) || '';
}

function sourceUrl(product) {
    const offers = Array.isArray(product.offers) ? product.offers.flatMap(offer => Array.isArray(offer) ? offer : [offer]) : [];
    return text(offers.find(offer => offer?.url)?.url || product.url);
}

async function readSnapshot() {
    const snapshot = JSON.parse(await fs.readFile(sourceSnapshotPath, 'utf8'));
    const products = Array.isArray(snapshot) ? snapshot : snapshot.products;
    if (!Array.isArray(products)) throw new Error('Snapshot must contain a products array.');
    return {
        extractedAt: text(snapshot.extracted_at) || new Date().toISOString(),
        products: products.map(product => ({
            sku: text(product.sku),
            name: text(product.common_name || product.name),
            botanicalName: text(product.botanical_name || product.botanicalName || product.scientificName),
            category: text(product.category),
            url: text(product.product_url || product.url),
            image: text(product.image_url || product.image),
            description: text(product.description)
        }))
    };
}

async function readLiveApi() {
    const products = [];
    for (let start = 0; start < 100000; start += batchSize) {
        const response = await fetch(`${endpoint}?Start=${start}&Qty=${batchSize}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(30000)
        });
        if (!response.ok) throw new Error(`Daleys API returned HTTP ${response.status} at offset ${start}.`);
        const payload = await response.json();
        if (!payload?.success || !Array.isArray(payload.data)) throw new Error(`Invalid Daleys API response at offset ${start}.`);
        products.push(...payload.data.map(product => ({
            sku: text(product.sku || product.productID || product.mpn),
            name: text(product.name),
            botanicalName: apiName(product),
            category: text(product.category),
            url: sourceUrl(product),
            image: apiImage(product),
            description: text(product.description)
        })));
        console.log(`Fetched ${products.length} product listings`);
        if (payload.data.length < batchSize) break;
    }
    return { extractedAt: new Date().toISOString(), products };
}

function classifyProducts(products, draft) {
    const bySku = new Map();
    for (const group of draft?.groups || []) {
        for (const sku of group.skus || []) {
            bySku.set(String(sku), {
                listingType: group.record_type === 'merchandise' ? 'merchandise' : group.record_type === 'plant_identity_review' ? 'plant_identity_review' : 'plant',
                catalogCategory: text(group.category),
                taxonGroupId: text(group.group_id),
                needsReview: Boolean(group.needs_review || group.record_type === 'plant_identity_review')
            });
        }
    }
    const seen = new Set();
    return products.filter(product => {
        const key = product.sku || product.name;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).map(product => ({
        id: `daleys:${product.sku || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        sku: product.sku,
        commonName: product.name,
        scientificName: product.botanicalName,
        sourceCategory: product.category,
        catalogCategory: bySku.get(product.sku)?.catalogCategory || '',
        listingType: bySku.get(product.sku)?.listingType || (product.botanicalName ? 'plant' : 'plant_identity_review'),
        taxonGroupId: bySku.get(product.sku)?.taxonGroupId || '',
        needsReview: bySku.get(product.sku)?.needsReview ?? !product.botanicalName,
        description: product.description,
        productUrl: product.url,
        imageUrl: product.image,
        source: 'Daleys Fruit Tree Nursery'
    }));
}

const snapshot = sourceSnapshotPath ? await readSnapshot() : await readLiveApi();
if (!snapshot.products.length) throw new Error('Daleys returned no product listings; refusing to replace the existing database.');
const draft = JSON.parse(await fs.readFile(path.join(rootDir, 'data1', 'daleys_database_draft.json'), 'utf8'));
const products = classifyProducts(snapshot.products, draft);
const skuCount = new Set(products.map(product => product.sku).filter(Boolean)).size;
if (products.length < 1000 || skuCount !== products.filter(product => product.sku).length) {
    throw new Error(`Catalog validation failed (${products.length} listings, ${skuCount} unique SKUs); refusing to replace the existing database.`);
}

const countBy = key => products.filter(product => product[key]).length;
const database = {
    schemaVersion: 1,
    source: endpoint,
    extractedAt: snapshot.extractedAt,
    listingCount: products.length,
    summary: {
        uniqueSkus: skuCount,
        plants: products.filter(product => product.listingType === 'plant').length,
        identityReview: products.filter(product => product.listingType === 'plant_identity_review').length,
        merchandise: products.filter(product => product.listingType === 'merchandise').length,
        withScientificName: countBy('scientificName'),
        withDescription: countBy('description'),
        withImage: countBy('imageUrl'),
        withProductUrl: countBy('productUrl'),
        reviewRequired: products.filter(product => product.needsReview).length
    },
    products
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
const temporaryPath = `${outputPath}.tmp`;
await fs.writeFile(temporaryPath, `${JSON.stringify(database, null, 2)}\n`, 'utf8');
await fs.rename(temporaryPath, outputPath);
console.log(JSON.stringify({ outputPath, extractedAt: database.extractedAt, ...database.summary, listingCount: database.listingCount }, null, 2));
