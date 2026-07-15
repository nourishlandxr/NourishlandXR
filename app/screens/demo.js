import { loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces } from '../services/persistence.js';

const PROJECT_ID = 'Hillyards';
const SITE_ID = 'main_food_forest';
const PLACE_ID = '2r1';

export async function renderDemoHome(app) {
    try {
        const project = (await loadProjects()).find(item => item.id === PROJECT_ID);
        if (!project) throw new Error('The Hillyards project is missing.');
        const site = (await loadProjectSites(project.id)).find(item => item.id === SITE_ID);
        if (!site) throw new Error('The Main Food Forest site is missing.');
        const place = (await loadSitePlaces(project.id, site.id)).find(item => item.id === PLACE_ID);
        if (!place) throw new Error('The Hillyards demo place is missing.');
        const markers = await loadPlaceMarkers(project.id, site.id, place.id);
        const cards = await Promise.all(markers.map(async marker => ({
            marker,
            anchor: await loadMarkerAnchor(project.id, site.id, place.id, marker.id),
            profile: marker.type === 'plant' ? await loadPlantProfile(project.id, site.id, place.id, marker.id) : null
        })));

        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderLaunchScreen()">Back</button><h1>Hillyards Demo</h1><p class="subtitle">${site.name}</p></div>${cards.map(({ marker, anchor, profile }) => `<div class="panel"><div class="list-item"><div><strong>${profile?.common_name || marker.name}</strong><p>${profile?.scientific_name || 'Spatial Text Marker'}</p><p class="meta">Anchor: ${anchor.type === 'gps' ? 'GPS configured' : 'Not configured'}</p></div><button class="primary" onclick="window.renderExplorerMarker(${JSON.stringify(project)}, ${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(marker)})">Open</button></div></div>`).join('')}</div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderLaunchScreen()">Back</button><h1>Hillyards Demo</h1></div><div class="panel"><h2>Demo unavailable</h2><p>${error.message}</p></div></div>`;
    }
}

export function renderDemoFeature(app) { return renderDemoHome(app); }
