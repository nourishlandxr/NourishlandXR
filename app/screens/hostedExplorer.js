import { startArNote } from '../services/arNote.js';

let app;
let projectUrl;
let project;
let hostedMarkers = [];

const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Inline handlers are retained for compatibility with the legacy screen router,
// but every dynamic argument is encoded before it enters an attribute.
const handlerArg = value => escapeHtml(JSON.stringify(String(value ?? ''))
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029'));

const get = async url => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Missing file: ${url}`);
    try { return await response.json(); }
    catch { throw new Error(`Invalid JSON: ${url}`); }
};

const resolve = (base, relative) => {
    const next = new URL(String(relative || ''), base);
    const origin = new URL(projectUrl || base).origin;
    if (next.origin !== origin || !['http:', 'https:'].includes(next.protocol)) {
        throw new Error('Hosted links must stay on the project origin');
    }
    return next.href;
};

const fail = error => {
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerProjects()">Back</button><h1>Hosted Location unavailable</h1></div><div class="panel"><p>${escapeHtml(error?.message || 'Unknown error')}</p><p class="meta">Check the URL, hosted files, and CORS policy.</p></div></div>`;
};

export async function openHostedProject(target, url) {
    app = target;
    try {
        projectUrl = new URL(url).href;
        project = await get(projectUrl);
        if (!Array.isArray(project.sites)) throw new Error('Hosted project has no sites index');
        hostedMarkers = [];
        sites();
    } catch (error) { fail(error); }
}

function sites() {
    const siteCards = project.sites.map(site => {
        try {
            const url = resolve(projectUrl, site.path);
            return `<div class="panel"><div class="list-item"><strong>${escapeHtml(site.name)}</strong><button onclick="window.openHostedSite(${handlerArg(url)})">Open</button></div></div>`;
        } catch (error) {
            return `<div class="panel"><div class="list-item"><strong>${escapeHtml(site.name)}</strong><span class="meta">Unavailable: ${escapeHtml(error.message)}</span></div></div>`;
        }
    }).join('');
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerProjects()">Back</button><h1>${escapeHtml(project.name)}</h1><p class="subtitle">Hosted read-only project</p></div><div class="panel"><button onclick="window.hostedGps()">GPS Mode</button></div>${siteCards}</div>`;
}

export async function openHostedSite(url) {
    try {
        const site = await get(url);
        if (!Array.isArray(site.places)) throw new Error('Hosted Location has no Areas index');
        const placeCards = site.places.map(place => {
            const placeUrl = resolve(url, place.path);
            return `<div class="panel"><div class="list-item"><strong>${escapeHtml(place.name)}</strong><button onclick="window.openHostedPlace(${handlerArg(placeUrl)})">Open</button></div></div>`;
        }).join('');
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHostedProject(${handlerArg(projectUrl)})">Back</button><h1>${escapeHtml(site.name)}</h1><p class="subtitle">Choose an Area</p></div>${placeCards}</div>`;
    } catch (error) { fail(error); }
}

export async function openHostedPlace(url) {
    try {
        const place = await get(url);
        if (!Array.isArray(place.markers)) throw new Error('Hosted place has no markers index');
        const markerCards = place.markers.map(marker => {
            const markerUrl = resolve(url, marker.path);
            return `<div class="panel"><div class="list-item"><strong>${escapeHtml(marker.name)}</strong><button onclick="window.openHostedMarker(${handlerArg(markerUrl)})">Open</button></div></div>`;
        }).join('');
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHostedProject(${handlerArg(projectUrl)})">Back</button><h1>${escapeHtml(place.name)}</h1></div>${markerCards}</div>`;
    } catch (error) { fail(error); }
}

export async function openHostedMarker(url) {
    try {
        const marker = await get(url);
        const profile = marker.plant_profile_path ? await get(resolve(url, marker.plant_profile_path)) : null;
        let anchor = null;
        let anchorError = '';
        if (marker.anchor_path) {
            try { anchor = await get(resolve(url, marker.anchor_path)); }
            catch (error) { anchorError = error.message; }
        }
        const ar = anchor?.type === 'gps' ? `<button onclick="window.startHostedAr(${handlerArg(url)})">Open in AR</button>` : '';
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHostedProject(${handlerArg(projectUrl)})">Back</button><h1>${escapeHtml(profile?.common_name || marker.name)}</h1><p class="subtitle">${escapeHtml(profile?.scientific_name || marker.type)}</p></div><div class="panel"><p>${escapeHtml(marker.description || 'No description yet.')}</p>${ar}<p id="arStatus" class="meta">${anchorError ? `Anchor unavailable: ${escapeHtml(anchorError)}` : ''}</p></div>${profile ? `<div class="panel"><h2>Overview</h2><p>${escapeHtml(profile.overview || 'Not available.')}</p></div>` : ''}</div>`;
        hostedMarkers.push({ url, marker, profile, anchor });
    } catch (error) { fail(error); }
}

async function collectMarkers() {
    const found = [];
    for (const siteIndex of project.sites) {
        const siteUrl = resolve(projectUrl, siteIndex.path);
        const site = await get(siteUrl);
        for (const placeIndex of site.places || []) {
            const placeUrl = resolve(siteUrl, placeIndex.path);
            const place = await get(placeUrl);
            for (const markerIndex of place.markers || []) {
                const markerUrl = resolve(placeUrl, markerIndex.path);
                const marker = await get(markerUrl);
                let anchor = null;
                let error = '';
                if (marker.anchor_path) {
                    try { anchor = await get(resolve(markerUrl, marker.anchor_path)); }
                    catch (failure) { error = failure.message; }
                }
                found.push({ marker, anchor, error, url: markerUrl, site, place });
            }
        }
    }
    hostedMarkers = found;
    return found;
}

const distance = (a, b, c, d) => {
    const radius = 6371000;
    const x = (c - a) * Math.PI / 180;
    const y = (d - b) * Math.PI / 180;
    const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2;
    return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export async function hostedGps() {
    try {
        const items = await collectMarkers();
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHostedProject(${handlerArg(projectUrl)})">Back</button><h1>${escapeHtml(project.name)}</h1><p class="subtitle">Hosted GPS markers</p></div><div class="panel"><select id="hostRadius" onchange="window.hostedGps()"><option>10</option><option>25</option><option>50</option><option selected>100</option><option>250</option><option>500</option></select><p id="hostGpsStatus">Requesting location…</p></div><div id="hostGpsResults"></div></div>`;
        navigator.geolocation.getCurrentPosition(position => {
            const radius = Number(document.getElementById('hostRadius').value);
            const near = items
                .filter(item => item.anchor?.type === 'gps' && Number.isFinite(Number(item.anchor.latitude)) && Number.isFinite(Number(item.anchor.longitude)))
                .map(item => ({ ...item, d: distance(position.coords.latitude, position.coords.longitude, Number(item.anchor.latitude), Number(item.anchor.longitude)) }))
                .filter(item => item.d <= radius)
                .sort((a, b) => a.d - b.d);
            document.getElementById('hostGpsStatus').textContent = `Accuracy: ${Math.round(position.coords.accuracy)} m`;
            document.getElementById('hostGpsResults').innerHTML = near.length
                ? near.map(item => `<div class="panel"><div class="list-item"><div><strong>${escapeHtml(item.marker.name)}</strong><p>${Math.round(item.d)} m · ${escapeHtml(item.place.name)}</p></div><button onclick="window.openHostedMarker(${handlerArg(item.url)})">Open</button></div></div>`).join('')
                : '<div class="panel"><p>No nearby markers.</p></div>';
        }, error => {
            document.getElementById('hostGpsStatus').textContent = error.code === 1 ? 'Location permission denied.' : 'GPS unavailable.';
        });
    } catch (error) { fail(error); }
}

export async function startHostedAr(url) {
    const cached = hostedMarkers.find(item => item.url === url);
    if (cached) return startArNote(cached.marker, cached.profile);
    await openHostedMarker(url);
}
