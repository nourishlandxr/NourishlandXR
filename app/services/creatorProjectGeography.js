import { fetchNswContourFeatures } from './imapElevationSource.js';

// Geographic context belongs to the project, independently of record/XR anchors.
export function normalizeProjectGeographicOrigin(value, now = new Date().toISOString()) {
    const number = input => ['number', 'string'].includes(typeof input) && String(input).trim() !== '' && Number.isFinite(Number(input));
    if (!number(value?.latitude) || !number(value?.longitude)) throw new Error('Enter both latitude and longitude.');
    const latitude = Number(value.latitude), longitude = Number(value.longitude);
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new Error('Latitude must be -90 to 90 and longitude -180 to 180.');
    const accuracyMetres = number(value.accuracyMetres) ? Number(value.accuracyMetres) : null;
    if (accuracyMetres !== null && accuracyMetres < 0) throw new Error('Location accuracy cannot be negative.');
    return { latitude, longitude, source: value.source === 'device' ? 'device' : 'manual', accuracyMetres,
        capturedAt: Number.isFinite(Date.parse(value.capturedAt)) ? value.capturedAt : now };
}

export function normalizeProjectGeographicOriginInputs(latitudeInput, longitudeInput, previousOrigin = null, now = new Date().toISOString()) {
    const latitude = typeof latitudeInput === 'string' ? latitudeInput.trim() : latitudeInput;
    const longitude = typeof longitudeInput === 'string' ? longitudeInput.trim() : longitudeInput;
    const fromDevice = previousOrigin?.source === 'device'
        && latitude !== '' && longitude !== ''
        && Number(latitude) === Number(previousOrigin.latitude)
        && Number(longitude) === Number(previousOrigin.longitude);
    return normalizeProjectGeographicOrigin({
        latitude, longitude,
        source: fromDevice ? 'device' : 'manual',
        accuracyMetres: fromDevice ? previousOrigin.accuracyMetres : null,
        capturedAt: fromDevice ? previousOrigin.capturedAt : now
    }, now);
}

export function projectOriginKey(origin) {
    const point = normalizeProjectGeographicOrigin(origin);
    return `${point.latitude},${point.longitude}`;
}

export function projectMapBounds(origin, widthMetres = 1000) {
    const point = normalizeProjectGeographicOrigin(origin);
    if (!Number.isFinite(widthMetres) || widthMetres < 100 || widthMetres > 5000) throw new Error('Choose a map width between 100 and 5000 metres.');
    const halfLatitude = widthMetres / 2 / 110540;
    const halfLongitude = widthMetres / 2 / (111320 * Math.max(.01, Math.cos(point.latitude * Math.PI / 180)));
    return { xmin: point.longitude - halfLongitude, ymin: point.latitude - halfLatitude,
        xmax: point.longitude + halfLongitude, ymax: point.latitude + halfLatitude, spatialReference: 4326 };
}

export function withProjectGeographicOrigin(project, input) {
    const geographicOrigin = normalizeProjectGeographicOrigin(input);
    const oldMap = project.siteMap?.mapData;
    const matches = oldMap?.originKey === projectOriginKey(geographicOrigin);
    return { ...project, siteMap: { ...project.siteMap, geographicOrigin, mapData: matches ? oldMap : null } };
}

export async function loadProjectMapInformation(origin, { fetchContours = fetchNswContourFeatures, widthMetres = 1000, signal } = {}) {
    const bounds = projectMapBounds(origin, widthMetres);
    const base = { schemaVersion: 1, originKey: projectOriginKey(origin), bounds, retrievedAt: new Date().toISOString() };
    if (bounds.xmin < 140 || bounds.xmax > 154.5 || bounds.ymin < -38.5 || bounds.ymax > -27.5) {
        return { ...base, status: 'unavailable', features: [], source: '', quality: 'unavailable', limited: false,
            message: 'The current contour provider covers NSW only. Your location is saved; continue building or retry with a supported location.' };
    }
    try {
        const result = await fetchContours({ bounds, signal });
        if (signal?.aborted) throw new DOMException('Map loading cancelled.', 'AbortError');
        let pointCount = 0, limited = Boolean(result.exceededTransferLimit);
        const features = [];
        for (const feature of result.features || []) {
            const elevation = Number(feature.attributes?.elevation);
            if (!Number.isFinite(elevation)) continue;
            const paths = [];
            for (const path of feature.geometry?.paths || []) {
                const valid = path.filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
                if (valid.length < 2) continue;
                const stride = Math.max(1, Math.ceil((valid.length - 1) / 31));
                const sampled = valid.filter((_, index) => index % stride === 0).map(point => point.slice(0, 2));
                if ((valid.length - 1) % stride) sampled.push(valid.at(-1).slice(0, 2));
                if (pointCount + sampled.length > 3200) { limited = true; break; }
                pointCount += sampled.length; paths.push(sampled);
                if (sampled.length < valid.length) limited = true;
            }
            if (paths.length) features.push({ attributes: { elevation }, geometry: { paths } });
        }
        if (!features.length) throw new Error('No usable contour information was returned.');
        return { ...base, status: 'sourced', features, source: result.source || '', quality: 'contour-interpolated', limited,
            message: 'Sourced contours; any interpolated surface is illustrative and is not a survey or DEM.' };
    } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') throw error;
        return { ...base, status: 'unavailable', features: [], source: '', quality: 'unavailable', limited: false,
            message: `Map information is unavailable. Your project can still be edited. ${error.message}` };
    }
}

export function withProjectMapInformation(project, mapData) {
    if (!project.siteMap?.geographicOrigin || mapData.originKey !== projectOriginKey(project.siteMap.geographicOrigin)) {
        throw new Error('The location changed while the map loaded. Load the map again for the current location.');
    }
    return { ...project, siteMap: { ...project.siteMap, mapData } };
}

export function projectGeographicMapContext(project) {
    const origin = project.siteMap?.geographicOrigin;
    const mapData = project.siteMap?.mapData;
    return { projectId: project.id, geographicOrigin: origin || null,
        mapData: origin && mapData?.originKey === projectOriginKey(origin) ? mapData : null };
}
