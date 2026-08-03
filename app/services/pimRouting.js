const clean = value => String(value || '').trim();
const encodeSegment = value => encodeURIComponent(clean(value));

export function pimRouteFromUrl(value) {
    const url = value instanceof URL ? value : new URL(String(value || 'http://localhost/app/'), 'http://localhost/app/');
    const hash = String(url.hash || '').replace(/^#\/?/, '');
    const segments = hash.split('/').filter(Boolean).map(segment => decodeURIComponent(segment));
    const plantIndex = segments.indexOf('plants');
    const slug = plantIndex >= 0 ? clean(segments[plantIndex + 1]) : '';
    const path = plantIndex >= 0 ? segments.slice(plantIndex + 2).map(clean).filter(Boolean).join('/') : '';
    return {
        projectId: clean(url.searchParams.get('pimProject')),
        siteId: clean(url.searchParams.get('pimSite')),
        placeId: clean(url.searchParams.get('pimPlace')),
        markerId: clean(url.searchParams.get('pimMarker')),
        slug,
        path
    };
}

export function pimRouteUrl(route = {}, baseUrl = globalThis.location?.href || 'http://localhost/app/') {
    const url = new URL(String(baseUrl), 'http://localhost/app/');
    const parameters = [
        ['pimProject', route.projectId],
        ['pimSite', route.siteId],
        ['pimPlace', route.placeId],
        ['pimMarker', route.markerId]
    ];
    parameters.forEach(([key, value]) => {
        if (clean(value)) url.searchParams.set(key, clean(value));
        else url.searchParams.delete(key);
    });
    const slug = clean(route.slug) || 'plant';
    const path = clean(route.path).split('/').map(clean).filter(Boolean);
    url.hash = `/plants/${[slug, ...path].map(encodeSegment).join('/')}`;
    return url;
}

export function clearPimRouteUrl(baseUrl = globalThis.location?.href || 'http://localhost/app/') {
    const url = new URL(String(baseUrl), 'http://localhost/app/');
    ['pimProject', 'pimSite', 'pimPlace', 'pimMarker'].forEach(key => url.searchParams.delete(key));
    if (/^#\/?plants\//.test(url.hash)) url.hash = '';
    return url;
}

export function hasCompletePimRoute(route = {}) {
    return Boolean(clean(route.projectId) && clean(route.siteId) && clean(route.placeId) && clean(route.markerId));
}
