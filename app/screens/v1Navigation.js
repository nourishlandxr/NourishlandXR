import { createPlaceMarker, deleteDemoMarker, deletePlaceMarker, loadDemoMarkers, loadDemoPlantProfile, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, saveDemoPlantProfile, updateDemoMarker } from '../services/persistence.js';
import { renderPlatformHome, renderProjectDashboard } from './projectDashboard.js';

const PROJECT_ID = 'Hillyards';
const SITE_ID = 'main_food_forest';
const PLACE_ID = '2r1';

function markerTypeLabel(type) {
    return ({ plant: 'Plant Marker', note: 'Custom Note', intro_checkpoint: 'Intro Checkpoint', sub_checkpoint: 'Sub Checkpoint' })[type] || 'Marker';
}

async function hillyardsContext(visitor = false) {
    const project = (await loadProjects(visitor)).find(item => item.id === PROJECT_ID);
    if (!project) throw new Error('Hillyards project data is unavailable.');
    const site = (await loadProjectSites(project.id, visitor)).find(item => item.id === SITE_ID);
    if (!site) throw new Error('Main Food Forest is unavailable.');
    const place = (await loadSitePlaces(project.id, site.id, visitor)).find(item => item.id === PLACE_ID);
    if (!place) throw new Error('The internal Hillyards marker place is unavailable.');
    return { project, site, place };
}

export async function renderDemoProjects(app) {
    return renderPlatformHome(app);
}

export function renderFirstSteps(app) {
    app.innerHTML = `<div class="screen"><div class="page-header"><h1>First Steps</h1></div><div class="panel guide"><ol><li>Select Hillyards.</li><li>Create an introduction checkpoint.</li><li>Add a plant marker or custom note.</li><li>Add an anchor.</li><li>Open Explorer.</li><li>Start AR.</li></ol></div><div class="menu-stack"><button class="menu-card" onclick="window.renderHillyardsProject()"><strong>Open Hillyards Demo</strong></button><button class="menu-card" onclick="window.renderV1Explorer()"><strong>Open Explorer</strong></button><button class="menu-card" onclick="window.renderLaunchScreen()"><strong>Back</strong></button></div></div>`;
}

export function renderComingSoon(app, feature, purpose, how, example, backAction = 'window.renderLaunchScreen()') {
    app.innerHTML = `<div class="screen"><div class="page-header"><h1>${feature}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Purpose</h2><p>${purpose}</p></div><div class="panel"><h2>How it will work</h2><p>${how}</p></div><div class="panel"><h2>Example workflow</h2><p>${example}</p></div><div class="panel"><p class="status-label">Status: Coming Soon</p></div><button class="menu-card" onclick="${backAction}"><strong>Back</strong></button></div>`;
}

export async function renderHillyardsProject(app) {
    return renderProjectDashboard(app, PROJECT_ID);
}


export async function openHillyardsMarkerActions(app, markerId) {
    try {
        const draft = (await loadDemoMarkers()).find(item => item.id === markerId);
        if (draft) {
            const profileButton = draft.type === 'plant'
                ? `<button class="menu-card primary" onclick="window.editDraftPlantProfile('${draft.id}')"><strong>Make / Edit Plant Profile</strong></button>`
                : '';
            app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderHillyardsProject()">Back</button><h1>${draft.name}</h1><p class="subtitle">${markerTypeLabel(draft.type)} Â· Draft</p></div><div class="menu-stack"><button class="menu-card" onclick="window.editDraftMarker('${draft.id}')"><strong>Edit Marker</strong></button>${profileButton}<button class="menu-card danger" onclick="window.deleteDraftMarker('${draft.id}')"><strong>Delete</strong></button></div></div>`;
            return;
        }
        const { place } = await hillyardsContext();
        const marker = (await loadPlaceMarkers(PROJECT_ID, SITE_ID, place.id)).find(item => item.id === markerId);
        if (marker) {
            const profileButton = marker.type === 'plant'
                ? `<button class="menu-card primary" onclick="window.openMarkerPlantProfile('${marker.id}')"><strong>Make / Edit Plant Profile</strong></button>`
                : '';
            app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderHillyardsProject()">Back</button><h1>${marker.name}</h1><p class="subtitle">${markerTypeLabel(marker.type)}</p></div><div class="menu-stack"><button class="menu-card" onclick="window.openMarkerFirstEditor('${marker.id}')"><strong>Edit Marker</strong></button>${profileButton}<button class="menu-card" onclick="window.openHillyardsEntry('${marker.id}')"><strong>Open Viewer</strong></button><button class="menu-card danger" onclick="window.deleteHillyardsMarker('${marker.id}')"><strong>Delete</strong></button></div></div>`;
            return;
        }

        throw new Error('Marker not found.');
    } catch (error) {
        app.innerHTML = `<div class="screen"><p>${error.message}</p><button onclick="window.renderHillyardsProject()">Back</button></div>`;
    }
}

export async function editDraftMarker(app, markerId) {
    const draft = (await loadDemoMarkers()).find(item => item.id === markerId);
    if (!draft) return renderComingSoon(app, 'Marker unavailable', 'Open a draft marker.', 'Create the marker in AR, then edit it here.', 'Create another marker.', 'window.renderHillyardsProject()');
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHillyardsMarkerActions('${draft.id}')">Back</button><h1>Edit Marker</h1><p class="subtitle">${markerTypeLabel(draft.type)}</p></div><div class="panel"><form onsubmit="window.saveDraftMarker(event, '${draft.id}')"><div class="field"><label for="draftMarkerName">Marker Name</label><input id="draftMarkerName" value="${String(draft.name || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" required /></div><div class="field"><label for="draftMarkerStatus">Status</label><select id="draftMarkerStatus"><option value="draft" ${draft.status === 'draft' ? 'selected' : ''}>Draft</option><option value="ready" ${draft.status === 'ready' ? 'selected' : ''}>Ready</option></select></div><div class="button-row"><button type="button" onclick="window.openHillyardsMarkerActions('${draft.id}')">Cancel</button><button class="primary" type="submit">Save</button></div></form></div></div>`;
}

export async function saveDraftMarker(event, markerId) {
    event.preventDefault();
    await updateDemoMarker(markerId, { name: document.getElementById('draftMarkerName').value.trim(), status: document.getElementById('draftMarkerStatus').value });
    await renderHillyardsProject(document.getElementById('app'));
}

export async function editDraftPlantProfile(app, markerId) {
    const draft = (await loadDemoMarkers()).find(item => item.id === markerId);
    if (!draft || draft.type !== 'plant') return;
    const profile = await loadDemoPlantProfile(markerId);
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.openHillyardsMarkerActions('${draft.id}')">Back</button><h1>Plant Profile</h1><p class="subtitle">${draft.name}</p></div><div class="panel"><form onsubmit="window.saveDraftPlantProfile(event, '${draft.id}')"><div class="field"><label for="draftCommonName">Common Name</label><input id="draftCommonName" value="${String(profile.common_name || draft.name).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" /></div><div class="field"><label for="draftScientificName">Scientific Name</label><input id="draftScientificName" value="${String(profile.scientific_name || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" /></div><div class="field"><label for="draftOverview">Overview</label><textarea id="draftOverview" rows="5">${String(profile.overview || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</textarea></div><div class="button-row"><button type="button" onclick="window.openHillyardsMarkerActions('${draft.id}')">Cancel</button><button class="primary" type="submit">Save Profile</button></div></form></div></div>`;
}

export async function saveDraftPlantProfile(event, markerId) {
    event.preventDefault();
    await saveDemoPlantProfile(markerId, { common_name: document.getElementById('draftCommonName').value.trim(), scientific_name: document.getElementById('draftScientificName').value.trim(), overview: document.getElementById('draftOverview').value.trim() });
    await renderHillyardsProject(document.getElementById('app'));
}

export async function deleteDraftMarker(markerId) {
    if (!window.confirm('Delete this draft marker?')) return;
    await deleteDemoMarker(markerId);
    await renderHillyardsProject(document.getElementById('app'));
}

export async function openMarkerPlantProfile(markerId) {
    const { site, place } = await hillyardsContext();
    const marker = (await loadPlaceMarkers(PROJECT_ID, SITE_ID, place.id)).find(item => item.id === markerId);
    if (!marker || marker.type !== 'plant') throw new Error('Plant marker not found.');
    window.renderV1PlantProfile(site, place, marker);
}

export async function deleteHillyardsMarker(markerId) {
    if (!window.confirm('Delete this marker?')) return;
    const { place } = await hillyardsContext();
    await deletePlaceMarker(PROJECT_ID, SITE_ID, place.id, markerId);
    await renderHillyardsProject(document.getElementById('app'));
}

export function renderHillyardsGuidelines(app) {
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderHillyardsProject()">Back</button><h1>Project Guidelines</h1><p class="subtitle">Hillyards Food Forest</p></div><div class="panel"><h2>Purpose</h2><p>Keep field knowledge concise, accurate and connected to a real marker.</p></div><div class="panel"><h2>Marker guidance</h2><p>Use Plant Markers for identified plants and Custom Notes for directions, introductions or observations.</p></div><div class="panel"><h2>Anchor guidance</h2><p>Confirm the physical location before saving a GPS anchor. Replace approximate demonstration coordinates with surveyed positions during field testing.</p></div></div>`;
}

export async function renderGlobalPlantList() {
    window.renderFieldGuide(PROJECT_ID, true);
}

export async function renderCheckpointForm(app, type) {
    const sub = type === 'sub';
    let parentOptions = '';
    if (sub) {
        try {
            const { place } = await hillyardsContext();
            const markers = await loadPlaceMarkers(PROJECT_ID, SITE_ID, place.id);
            parentOptions = markers.map(marker => `<option value="${marker.name}">${marker.name}</option>`).join('');
        } catch {}
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><h1>${sub ? 'Add Sub Checkpoint' : 'Add Intro Checkpoint'}</h1><p class="subtitle">Hillyards Food Forest</p></div><div class="panel"><form onsubmit="window.saveCheckpoint(event, '${type}')">${sub ? `<div class="field"><label for="checkpointParent">Parent checkpoint</label><select id="checkpointParent" required><option value="">Select checkpoint</option>${parentOptions}</select></div>` : ''}<div class="field"><label for="checkpointTitle">Title</label><input id="checkpointTitle" required /></div><div class="field"><label for="checkpointText">${sub ? 'Text' : 'Introduction text'}</label><textarea id="checkpointText" rows="4" required></textarea></div><div class="field"><label for="checkpointDirections">Written directions</label><textarea id="checkpointDirections" rows="3" required></textarea></div>${sub ? '' : '<div class="field"><label for="checkpointAnchor">Optional anchor status</label><select id="checkpointAnchor"><option value="">Not configured</option><option value="gps">GPS demo anchor</option></select></div>'}<p id="checkpointError" class="meta"></p><div class="button-row"><button type="button" onclick="window.renderHillyardsProject()">Cancel</button><button class="primary" type="submit">Save</button></div></form></div></div>`;
}

export async function saveCheckpoint(event, type) {
    event.preventDefault();
    const error = document.getElementById('checkpointError');
    try {
        const { place } = await hillyardsContext();
        const title = document.getElementById('checkpointTitle').value.trim();
        const text = document.getElementById('checkpointText').value.trim();
        const directions = document.getElementById('checkpointDirections').value.trim();
        const parent = document.getElementById('checkpointParent')?.value;
        const gps = document.getElementById('checkpointAnchor')?.value === 'gps';
        await createPlaceMarker(PROJECT_ID, SITE_ID, place.id, {
            type: 'note',
            name: title,
            description: `${parent ? `Parent checkpoint: ${parent}\n` : ''}${text}\n\nDirections: ${directions}`,
            anchor: gps ? { type: 'gps', latitude: -28.6911053, longitude: 153.003029, description: 'Approximate Cedar Point demo anchor.' } : undefined
        });
        await renderHillyardsProject(document.getElementById('app'));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}

export async function openHillyardsPlantProfileEditor() {
    const { site, place } = await hillyardsContext();
    const marker = (await loadPlaceMarkers(PROJECT_ID, SITE_ID, place.id)).find(item => item.id === 'lemon_drop_garcinia');
    if (!marker) throw new Error('The requested plant marker is unavailable.');
    window.renderV1PlantProfile(site, place, marker);
}

export async function openHillyardsEntry(markerId) {
    const { project, site, place } = await hillyardsContext();
    const marker = (await loadPlaceMarkers(PROJECT_ID, SITE_ID, place.id)).find(item => item.id === markerId);
    if (marker) window.renderExplorerMarker(project, site, place, marker);
}

export async function getHillyardsExplorerContext(visitor = false) {
    const context = await hillyardsContext(visitor);
    return { ...context, markers: await loadPlaceMarkers(PROJECT_ID, SITE_ID, context.place.id, visitor), profile: await loadPlantProfile(PROJECT_ID, SITE_ID, PLACE_ID, 'lemon_drop_garcinia', visitor) };
}


