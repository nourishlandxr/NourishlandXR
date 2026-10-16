import { normalizeProjectGeographicOrigin, projectOriginKey } from './creatorProjectGeography.js';

// Validate and merge the additive project siteMap fields before project.json
// is written. Existing image/layout data remains untouched by map saves.
export function normalizePersistedProjectSiteMap(input, existing = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Project map settings must be an object.');
    const siteMap = { ...existing, ...input };
    const rawOrigin = input.geographicOrigin === undefined ? existing.geographicOrigin : input.geographicOrigin;
    if (rawOrigin == null) {
        siteMap.geographicOrigin = null;
        siteMap.mapData = null;
        return siteMap;
    }
    const origin = normalizeProjectGeographicOrigin(rawOrigin);
    siteMap.geographicOrigin = origin;
    const candidate = input.mapData === undefined ? existing.mapData : input.mapData;
    if (input.mapData === undefined && candidate && candidate.originKey !== projectOriginKey(origin)) {
        siteMap.mapData = null;
        return siteMap;
    }
    if (candidate == null) {
        siteMap.mapData = null;
        return siteMap;
    }
    if (candidate.schemaVersion !== 1 || !['sourced', 'unavailable'].includes(candidate.status)
        || candidate.originKey !== projectOriginKey(origin)) {
        throw new Error('Map information must match the saved project origin. Load map information again.');
    }
    const bounds = candidate.bounds;
    if (!bounds || ![bounds.xmin, bounds.ymin, bounds.xmax, bounds.ymax].every(Number.isFinite)
        || bounds.xmin >= bounds.xmax || bounds.ymin >= bounds.ymax
        || bounds.xmin < -180 || bounds.xmax > 180 || bounds.ymin < -90 || bounds.ymax > 90
        || bounds.xmax - bounds.xmin > .12 || bounds.ymax - bounds.ymin > .12) {
        throw new Error('Project map bounds are invalid or too large.');
    }
    const features = [];
    let points = 0;
    for (const feature of Array.isArray(candidate.features) ? candidate.features : []) {
        const elevation = Number(feature?.attributes?.elevation);
        if (!Number.isFinite(elevation)) continue;
        const paths = [];
        for (const path of feature.geometry?.paths || []) {
            const valid = path.filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1])
                && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90).map(point => point.slice(0, 2));
            if (valid.length < 2) continue;
            points += valid.length;
            if (points > 3200) throw new Error('Project contour detail exceeds the map package limit. Reload a smaller area.');
            paths.push(valid);
        }
        if (paths.length) features.push({ attributes: { elevation }, geometry: { paths } });
        if (features.length > 1500) throw new Error('Project map has too many contour features.');
    }
    if (candidate.status === 'sourced' && !features.length) throw new Error('Sourced project map information must include contour features.');
    if (candidate.status === 'unavailable' && features.length) throw new Error('Unavailable project map information cannot contain sourced contours.');
    siteMap.mapData = {
        schemaVersion: 1, status: candidate.status, originKey: candidate.originKey,
        bounds: { xmin: bounds.xmin, ymin: bounds.ymin, xmax: bounds.xmax, ymax: bounds.ymax, spatialReference: 4326 },
        features, source: String(candidate.source || '').slice(0, 500),
        retrievedAt: Number.isFinite(Date.parse(candidate.retrievedAt)) ? candidate.retrievedAt : new Date().toISOString(),
        quality: String(candidate.quality || (candidate.status === 'sourced' ? 'contour-interpolated' : 'unavailable')).slice(0, 80),
        limited: Boolean(candidate.limited), message: String(candidate.message || '').slice(0, 1000)
    };
    return siteMap;
}
