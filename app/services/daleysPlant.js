const text = value => String(value ?? '').trim();

const availabilityLabels = Object.freeze({
    'https://schema.org/InStock': 'In stock',
    'https://schema.org/PreSale': 'Pre-sale',
    'https://schema.org/OutOfStock': 'Out of stock',
    InStock: 'In stock',
    PreSale: 'Pre-sale',
    OutOfStock: 'Out of stock'
});

function offerRecords(product = {}) {
    return Array.isArray(product.offers) ? product.offers.flatMap(offer => Array.isArray(offer) ? offer : [offer]).filter(Boolean) : [];
}

function imageUrl(value) {
    if (typeof value === 'string') return text(value);
    if (!value || typeof value !== 'object') return '';
    return text(value.url || value.contentUrl || value.thumbnail);
}

function firstImage(product = {}) {
    const productImage = Array.isArray(product.image) ? product.image : [product.image];
    const offerImage = offerRecords(product).flatMap(offer => Array.isArray(offer.image) ? offer.image : [offer.image]);
    return [...productImage, ...offerImage].map(imageUrl).find(Boolean) || '';
}

function priceText(product = {}) {
    const aggregate = product.itemOffered && !Array.isArray(product.itemOffered) ? product.itemOffered : {};
    const offers = offerRecords(product);
    const low = Number(aggregate.lowPrice ?? offers.map(offer => Number(offer.price)).filter(Number.isFinite).sort((a, b) => a - b)[0]);
    const high = Number(aggregate.highPrice ?? offers.map(offer => Number(offer.price)).filter(Number.isFinite).sort((a, b) => b - a)[0]);
    const currency = text(aggregate.priceCurrency || offers.find(offer => offer.priceCurrency)?.priceCurrency || 'AUD');
    if (!Number.isFinite(low)) return '';
    const format = value => value.toFixed(2);
    return Number.isFinite(high) && high !== low ? `${format(low)}–${format(high)} ${currency}` : `${format(low)} ${currency}`;
}

function availabilityText(product = {}) {
    const offers = offerRecords(product);
    const labels = offers.map(offer => availabilityLabels[text(offer.availability)] || text(offer.availability)).filter(Boolean);
    if (labels.includes('In stock')) return 'In stock';
    if (labels.includes('Pre-sale')) return 'Pre-sale';
    return labels[0] || '';
}

export function normalizeDaleysPlantResult(product = {}) {
    if (!product || typeof product !== 'object') return null;
    const commonName = text(product.name);
    if (!commonName) return null;
    const scientificName = text(product.botanicalName || product.scientificName || product.canonicalName);
    const key = text(product.sku || product.productID || product.mpn || commonName);
    const sourceUrl = text(product.url);
    return {
        externalId: key ? `daleys:${key}` : sourceUrl || commonName,
        source: 'daleys',
        sourceLabel: 'Daleys Fruit Tree Nursery',
        commonName,
        scientificName,
        canonicalName: scientificName || commonName,
        family: text(product.family),
        kingdom: 'Plantae',
        rank: 'cultivar',
        description: text(product.description),
        category: text(product.category),
        price: priceText(product),
        availability: availabilityText(product),
        currency: text(product.itemOffered?.priceCurrency || offerRecords(product).find(offer => offer.priceCurrency)?.priceCurrency || 'AUD'),
        thumbnailUrl: firstImage(product),
        imageAttribution: 'Daleys Fruit Tree Nursery',
        imageLicense: '',
        sourceUrl,
        rawSourceData: product
    };
}

export function daleysPlantMatchesQuery(result, query) {
    const terms = text(query).toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const raw = result?.rawSourceData && typeof result.rawSourceData === 'object' ? result.rawSourceData : {};
    const haystack = [
        result?.commonName, result?.scientificName, result?.description, result?.category,
        result?.availability, result?.price, raw.name, raw.botanicalName, raw.description, raw.category
    ].map(text).join(' ').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
}
