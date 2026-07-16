import { loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProjectGpsMarkers, loadProjectSites, loadProjects, loadSitePlaces } from '../services/persistence.js';
import { exitAr, isArActive, resetArPlacement, startArNote } from '../services/arNote.js';
import { disableTargetReticle, enableTargetReticle } from '../services/targetReticle.js';
import { getHillyardsExplorerContext } from './v1Navigation.js';
import { getResolvedPlantInstance } from '../services/plantDataService.js';

let gpsWatchId = null;
let gpsProject = null;
let gpsApp = null;
let gpsMarkers = [];

function stopGps() { if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId); gpsWatchId = null; }
function haversine(lat1, lon1, lat2, lon2) { const r = 6371000, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180; const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2; return 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); }

function errorScreen(message) {
    return `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderLaunchScreen()">Back</button><h1>Explorer unavailable</h1></div><div class="panel"><p>${message}</p></div></div>`;
}

async function resolveMarkerPlant(marker, project, site) {
    if (!marker.plantId || !marker.plantInstanceId) return null;
    try {
        const resolved = await getResolvedPlantInstance(marker.plantInstanceId, project.id, site.id, true);
        return resolved?.plantId === marker.plantId ? resolved : null;
    } catch (error) {
        console.warn(`[PlantData] Marker ${marker.id} could not be resolved: ${error.message}`);
        return null;
    }
}

export async function renderExplorerProjects(app) {
    stopGps();
    disableTargetReticle();
    app.innerHTML = `<div class="screen explorer-entry"><div class="page-header"><button class="ghost" onclick="window.renderLaunchScreen()">Back</button><p class="welcome-label">Visitor</p><h1>Choose how you would like to explore.</h1></div><div class="role-grid visitor-mode-grid"><button class="menu-card role-card" onclick="window.renderXrProjects()"><strong>XR Explorer</strong><span>Immersive, location-based learning.</span></button><button class="menu-card role-card" onclick="window.renderFieldGuideProjects()"><strong>Field Guide</strong><span>Browse plants, maps and information.</span></button></div></div>`;
}

export async function renderXrProjects(app) {
    stopGps();
    disableTargetReticle();
    try {
        const projects = (await loadProjects(true)).filter(project => !['plant-library', 'Banyula'].includes(project.id));
        app.innerHTML = `<div class="screen explorer-entry"><div class="page-header"><button class="ghost" onclick="window.renderV1Explorer()">Back</button><p class="welcome-label">XR Explorer</p><h1>Choose a location</h1><p class="subtitle">Immersive, location-based learning.</p></div><div class="menu-stack">${projects.map(project => `<button class="menu-card" onclick="${project.id === 'Hillyards' ? 'window.openHillyardsExplorer()' : `window.renderExplorerSites(${JSON.stringify(project)})`}"><strong>${project.name}</strong></button>`).join('') || '<div class="panel"><p>No public locations are available.</p></div>'}</div></div>`;
    } catch (error) { app.innerHTML = errorScreen(`Location data could not be loaded: ${error.message}`); }
}

export async function renderHillyardsExplorer(app) {
    stopGps();
    disableTargetReticle();
    try {
        const { project, site, place, markers } = await getHillyardsExplorerContext(true);
        app.innerHTML = `<div class="screen hillyards-explorer"><div class="page-header"><button class="ghost" onclick="window.renderV1Explorer()">Back</button><h1>Hillyards Food Forest</h1><p class="subtitle">Introduction to Location</p></div><div class="panel"><p>Welcome to Hillyards Food Forest, a living demonstration of plant knowledge connected to a real landscape.</p></div><div class="panel"><h2>Directions to Introduction Checkpoint</h2><p>Find the wooden totem with butterflies.</p><p>When you arrive, scan or select the checkpoint.</p></div><button class="menu-card" onclick="window.renderComingSoon('Scan When Found', 'Confirm arrival at the introduction checkpoint.', 'Scan the field checkpoint and open its introduction.', 'Find the wooden totem, scan it, then continue.', 'window.openHillyardsExplorer()')"><strong>Scan When Found</strong><span>Coming Soon</span></button><div class="section-label">Hillyards Content</div><div class="menu-stack">${markers.filter(marker => ['lemon_drop_garcinia','welcome_to_hillyards_xr'].includes(marker.id)).map(marker => `<button class="menu-card" onclick="window.renderExplorerMarker(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(marker)})"><strong>${marker.name}</strong><span>${marker.type === 'plant' ? 'Garcinia intermedia' : 'Custom Note'}</span></button>`).join('')}</div></div>`;
    } catch (error) { app.innerHTML = errorScreen(`Hillyards data could not be loaded: ${error.message}`); }
}

export async function renderExplorerSites(app, project) {
    stopGps();
    try {
        const sites = await loadProjectSites(project.id, true);
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderXrProjects()">Back</button><h1>${project.name}</h1><p class="subtitle">Choose a site or use GPS mode.</p></div><div class="panel"><button class="primary" onclick="window.renderExplorerGps(${JSON.stringify(project)})">GPS Mode</button></div>${sites.length ? sites.map(site => `<div class="panel"><div class="list-item"><div><strong>${site.name}</strong><p>${site.description || 'Site'}</p></div><button onclick="window.renderExplorerPlaces(${JSON.stringify(project)}, ${JSON.stringify(site)})">Open</button></div></div>`).join('') : '<div class="panel"><p>No sites are available.</p></div>'}</div>`;
    } catch (error) { app.innerHTML = errorScreen(`Site data could not be loaded: ${error.message}`); }
}

export async function renderExplorerPlaces(app, project, site) {
    stopGps();
    try {
        const places = await loadSitePlaces(project.id, site.id, true);
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerSites(${JSON.stringify(project)})">Back</button><h1>${site.name}</h1><p class="subtitle">Choose a place.</p></div>${places.length ? places.map(place => `<div class="panel"><div class="list-item"><div><strong>${place.name}</strong><p>${place.type || 'Place'}</p></div><button onclick="window.renderExplorerMarkers(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)})">Open</button></div></div>`).join('') : '<div class="panel"><p>No places are available.</p></div>'}</div>`;
    } catch (error) { app.innerHTML = errorScreen(`Place data could not be loaded: ${error.message}`); }
}

export async function renderExplorerMarkers(app, project, site, place) {
    stopGps();
    try {
        const markers = await loadPlaceMarkers(project.id, site.id, place.id, true);
        app.innerHTML = `<div class="screen location-selected" data-location-id="${place.id}"><div class="page-header"><button class="ghost" onclick="window.renderExplorerPlaces(${JSON.stringify(project)}, ${JSON.stringify(site)})">Back</button><h1>${place.name}</h1><p class="subtitle">Choose a marker.</p></div>${markers.length ? markers.map(marker => `<div class="panel" data-target-marker="${marker.name}"><div class="list-item"><div><strong>${marker.name}</strong><p>${marker.type === 'plant' ? 'Plant' : 'Note'}</p></div><button onclick="window.renderExplorerMarker(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(marker)})">Open</button></div></div>`).join('') : '<div class="panel"><p>No markers are available.</p></div>'}<div class="panel hint"><p>Select <strong>Explore with AR</strong> to open the augmented-reality experience for this location.</p></div></div>`; enableTargetReticle();
    } catch (error) { app.innerHTML = errorScreen(`Marker data could not be loaded: ${error.message}`); }
}

export async function renderExplorerMarker(app, project, site, place, marker) {
    stopGps();
    disableTargetReticle();
    try {
        if (marker.type === 'plant') {
            const profile = await loadPlantProfile(project.id, site.id, place.id, marker.id, true);
            const resolved = await resolveMarkerPlant(marker, project, site);
            app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerMarkers(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)})">Back</button><h1>${resolved?.commonName || profile.common_name || marker.name}</h1><p class="subtitle">${resolved?.scientificName || profile.scientific_name || 'Scientific name not available'}</p></div><div class="panel"><h2>Description</h2><p>${resolved?.summary || marker.description || profile.overview || 'No description yet.'}</p>${resolved ? `<p class="meta">${resolved.placeId} · ${resolved.status || 'Status not entered'}</p>` : ''}</div><div class="panel"><button class="primary" onclick="window.renderExplorerPlantProfile(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(marker)})">Learn More</button></div><div id="arStatus" class="meta"></div></div>`;
            return;
        }
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerMarkers(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)})">Back</button><h1>${marker.name}</h1><p class="subtitle">Note</p></div><div class="panel"><p>${marker.description || 'No note text yet.'}</p></div><div id="arStatus" class="meta"></div></div>`;
    } catch (error) { app.innerHTML = errorScreen(`Marker data could not be loaded: ${error.message}`); }
}


export async function renderExplorerPlantProfile(app, project, site, place, marker) {
    stopGps();
    try {
        const profile = await loadPlantProfile(project.id, site.id, place.id, marker.id, true);
        const resolved = await resolveMarkerPlant(marker, project, site);
        const fields = resolved
            ? [['Scientific Name', resolved.scientificName], ['Cultivar', resolved.cultivar], ['Family', resolved.family], ['Origin', resolved.origin], ['Plant Type', resolved.plantType], ['Layer', resolved.layer], ['Uses', (resolved.uses || []).join(', ')], ['Propagation', (resolved.propagation || []).join(', ')], ['Local Status', resolved.status], ['Local Notes', resolved.localNotes], ['Overview', resolved.summary || profile.overview]]
            : [['Scientific Name', profile.scientific_name], ['Overview', profile.overview], ['Identification', profile.identification], ['Edible Uses', profile.edible_uses], ['Propagation', profile.propagation], ['Growing Conditions', profile.growing_conditions], ['Notes', profile.notes], ['References', profile.references]];
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerMarker(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(marker)})">Back</button><h1>${resolved?.commonName || profile.common_name || marker.name}</h1><p class="subtitle">Plant Profile</p></div>${fields.map(([label, value]) => `<div class="panel"><h2>${label}</h2><p>${value || 'Not available.'}</p></div>`).join('')}</div>`;
    } catch (error) { app.innerHTML = errorScreen(`Plant Profile could not be loaded: ${error.message}`); }
}

export async function renderExplorerGps(app, project) {
    gpsApp = app; gpsProject = project; gpsMarkers = await loadProjectGpsMarkers(project.id, true);
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderExplorerSites(${JSON.stringify(project)})">Back</button><h1>${project.name}</h1><p class="subtitle">GPS nearby markers</p></div><div class="panel"><div class="field"><label for="gpsRadius">Detection radius</label><select id="gpsRadius" onchange="window.updateExplorerGps()"><option>10</option><option>25</option><option>50</option><option selected>100</option><option>250</option><option>500</option></select></div><p id="gpsStatus">Requesting location permission…</p></div><div id="gpsResults"></div></div>`;
    if (!navigator.geolocation) { document.getElementById('gpsStatus').textContent = 'GPS is unavailable in this browser.'; return; }
    gpsWatchId = navigator.geolocation.watchPosition(position => renderGpsResults(position), error => { document.getElementById('gpsStatus').textContent = error.code === 1 ? 'Location permission was denied.' : 'GPS location is unavailable.'; }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
}

function renderGpsResults(position) {
    const radius = Number(document.getElementById('gpsRadius')?.value || 100);
    const results = gpsMarkers.map(item => ({ ...item, distance: haversine(position.coords.latitude, position.coords.longitude, Number(item.anchor.latitude), Number(item.anchor.longitude)) })).filter(item => Number.isFinite(item.distance) && item.distance <= radius).sort((a, b) => a.distance - b.distance);
    const accuracy = Math.round(position.coords.accuracy);
    document.getElementById('gpsStatus').textContent = `${accuracy > radius ? 'Poor GPS accuracy. ' : ''}Accuracy: ${accuracy} m. Radius: ${radius} m.`;
    document.getElementById('gpsResults').innerHTML = results.length ? results.map(item => `<div class="panel"><div class="list-item"><div><strong>${item.marker.name}</strong><p>${item.marker.type} · ${Math.round(item.distance)} m · ${item.place.name}</p></div><button onclick="window.renderExplorerMarker(${JSON.stringify(gpsProject)}, ${JSON.stringify(item.site)}, ${JSON.stringify(item.place)}, ${JSON.stringify(item.marker)})">Open</button></div></div>`).join('') : '<div class="panel"><p>No nearby markers inside this radius.</p></div>';
}

export function updateExplorerGps() { if (navigator.geolocation && gpsWatchId !== null) navigator.geolocation.getCurrentPosition(renderGpsResults); }
export async function startExplorerAr(project, site, place, marker) { const profile = marker.type === 'plant' ? await loadPlantProfile(project.id, site.id, place.id, marker.id, true) : null; await startArNote(marker, profile); }

export async function startWelcomeAr() {
    await startArNote(null, null);
}

export async function startLocationAr(encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = (await loadProjects()).find(item => item.id === projectId);
    if (!project) throw new Error('Location not found');
    const sites = await loadProjectSites(project.id);
    const groups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id);
        return Promise.all(places.map(async place => ({
            project,
            site,
            place,
            markers: await loadPlaceMarkers(project.id, site.id, place.id)
        })));
    }));
    const entries = groups.flat().flatMap(group => group.markers.map(marker => ({ ...group, marker })));
    entries.sort((left, right) => String(right.marker.modified || right.marker.created || '').localeCompare(String(left.marker.modified || left.marker.created || '')));
    const starting = entries.find(entry => entry.marker.type === 'intro_checkpoint');
    let startingAnchor = null;
    if (starting) {
        try { startingAnchor = await loadMarkerAnchor(project.id, starting.site.id, starting.place.id, starting.marker.id); }
        catch { /* An incomplete Starting Point is valid. */ }
    }
    const target = groups.flat()[0] || null;
    await startArNote(null, null, {
        projectId: project.id,
        locationName: project.name,
        siteId: target?.site.id || '',
        placeId: target?.place.id || '',
        markers: entries.map(entry => ({ ...entry.marker, _siteId: entry.site.id, _placeId: entry.place.id })),
        status: {
            startingPoint: starting?.marker.name || 'Not configured',
            accuracy: startingAnchor?.accuracy ? `${Math.round(Number(startingAnchor.accuracy))} m` : 'Not available',
            entries: `${entries.filter(entry => entry.marker.visibility === 'public').length} published · ${entries.filter(entry => entry.marker.visibility !== 'public' && entry.marker.visibility !== 'hidden').length} drafts`,
            label: startingAnchor?.latitude && startingAnchor?.longitude ? 'Ready to preview' : 'Setup incomplete'
        }
    });
}

export async function toggleGlobalAr() {
    if (isArActive()) { exitAr(); return; }
    await startWelcomeAr();
}

export { resetArPlacement, exitAr };
