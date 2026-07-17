import { createPlaceMarker, createSpatialPlant, loadProjects, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import { loadPlantLibrary } from '../services/plantDataService.js';

let app;
let projects = [];
let sites = [];
let places = [];
let selected = { project: '', site: '', place: '' };
let location;
let markerType = 'plant';
let hillyardsMode = false;
let dashboardProjectId = '';
let plantProfiles = [];

const options = (list, value, label) => `
    <option value="">Select ${label}</option>
    ${list.map(item => `<option value="${item.id}" ${item.id === value ? 'selected' : ''}>${item.name}</option>`).join('')}
`;

function draw() {
    const plant = markerType === 'plant';
    const checkpoint = markerType === 'sub_checkpoint';
    app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <button class="ghost" onclick="${dashboardProjectId ? `window.renderProjectDashboard('${encodeURIComponent(dashboardProjectId)}')` : hillyardsMode ? 'window.renderHillyardsProject()' : 'window.renderStudio()'}">Back</button>
                <h1>Add to this location</h1>
            </div>
            <div class="panel">
                <div class="field">
                    <label>Location</label>
                    <select onchange="window.selectFieldProject(this.value)">${options(projects, selected.project, 'Location')}</select>
                </div>
                <div class="field">
                    <label>Site</label>
                    <select onchange="window.selectFieldSite(this.value)">${options(sites, selected.site, 'Site')}</select>
                </div>
                <div class="field">
                    <label>Place</label>
                    <select onchange="window.selectFieldPlace(this.value)">${options(places, selected.place, 'Place')}</select>
                </div>
                <div class="field">
                    <label>Marker Type</label>
                    <select id="fieldType" onchange="window.setFieldMarkerType(this.value)">
                        <option value="plant" ${plant ? 'selected' : ''}>Plant</option>
                        <option value="sub_checkpoint" ${checkpoint ? 'selected' : ''}>Checkpoint</option>
                        <option value="note" ${markerType === 'note' ? 'selected' : ''}>Note</option>
                    </select>
                </div>
                <div class="field">
                    <label>${plant ? 'Common Name' : 'Title'}</label>
                    <input id="fieldName" />
                </div>
                ${plant ? `<div class="field"><label>Reuse plant profile (optional)</label><select id="fieldPlantProfile" onchange="window.selectFieldPlantProfile(this.value)"><option value="">Create a new shared profile</option>${plantProfiles.map(profile => `<option value="${profile.id}">${profile.commonName} · ${profile.scientificName}</option>`).join('')}</select></div><div class="field"><label>Scientific Name</label><input id="fieldScientific" /></div>` : ''}
                <div class="field">
                    <label>${plant ? 'Description' : 'Text'}</label>
                    <textarea id="fieldDescription" rows="3"></textarea>
                </div>
                <div class="field"><label>Visibility</label><select id="fieldVisibility"><option value="public">Public — Visitor and Creator</option><option value="draft">Draft — Creator only</option><option value="hidden">Hidden</option></select></div>
                <p id="fieldLocation" class="meta">${location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · accuracy ${Math.round(location.accuracy)} m` : 'Position optional. Add it now or connect this entry to AR later.'}</p>
                <div class="button-row">
                    <button onclick="window.refreshFieldLocation()">Add current position</button>
                    <button class="primary" onclick="window.saveFieldMarker()">Save Entry</button>
                </div>
                <p id="fieldError" class="meta"></p>
            </div>
        </div>
    `;
}

export async function renderFieldMarker(target, defaults = null) {
    app = target || app;
    if (!app) return;
    location = null;
    plantProfiles = (await loadPlantLibrary(true)).plants || [];
    projects = (await loadProjects()).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    if (defaults) {
        hillyardsMode = true;
        dashboardProjectId = defaults.dashboardProjectId || '';
        selected = { project: defaults.project || '', site: defaults.site || '', place: defaults.place || '' };
        markerType = ['plant', 'note', 'sub_checkpoint'].includes(defaults.type) ? defaults.type : 'plant';
        sites = selected.project ? await loadProjectSites(selected.project) : [];
        places = selected.project && selected.site ? await loadSitePlaces(selected.project, selected.site) : [];
    } else {
        hillyardsMode = false;
        dashboardProjectId = '';
    }
    draw();
}

export function setFieldMarkerType(type) {
    markerType = ['plant', 'note', 'sub_checkpoint'].includes(type) ? type : 'plant';
    draw();
}

export async function selectFieldProject(id) {
    selected = { project: id, site: '', place: '' };
    sites = id ? await loadProjectSites(id) : [];
    places = [];
    draw();
}

export async function selectFieldSite(id) {
    selected.site = id;
    selected.place = '';
    places = id ? await loadSitePlaces(selected.project, id) : [];
    draw();
}

export function selectFieldPlace(id) { selected.place = id; draw(); }

export function selectFieldPlantProfile(id) {
    const profile = plantProfiles.find(item => item.id === id);
    if (!profile) return;
    document.getElementById('fieldName').value = profile.commonName || '';
    document.getElementById('fieldScientific').value = profile.scientificName || '';
    document.getElementById('fieldDescription').value = profile.summary || '';
}

export function refreshFieldLocation() {
    const error = document.getElementById('fieldError');
    if (!navigator.geolocation) { error.textContent = 'Location is unavailable.'; return; }
    navigator.geolocation.getCurrentPosition(position => {
        location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            captured_at: new Date(position.timestamp).toISOString()
        };
        document.getElementById('fieldLocation').textContent = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · accuracy ${Math.round(location.accuracy)} m`;
        error.textContent = '';
    }, failure => {
        error.textContent = failure.code === 1 ? 'Location permission was denied.' : 'Location could not be captured.';
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}

export async function saveFieldMarker() {
    const error = document.getElementById('fieldError');
    const type = document.getElementById('fieldType').value;
    const name = document.getElementById('fieldName').value.trim();
    const description = document.getElementById('fieldDescription').value.trim();
    const scientific = document.getElementById('fieldScientific')?.value.trim();
    const plantId = document.getElementById('fieldPlantProfile')?.value || '';

    if (!selected.project || !selected.site || !selected.place) { error.textContent = 'Select a Location, Site and Place.'; return; }
    if (!name || (type === 'plant' && !scientific) || (type !== 'plant' && !description)) {
        error.textContent = type === 'plant' ? 'Common Name and Scientific Name are required.' : 'Title and Text are required.';
        return;
    }

    try {
        error.textContent = 'Saving…';
        const place = places.find(item => item.id === selected.place);
        const visibility = document.getElementById('fieldVisibility').value;
        const marker = type === 'plant'
            ? (await createSpatialPlant(selected.project, selected.site, selected.place, { plantId, commonName: name, scientificName: scientific, description, visibility, ...(location || {}) })).marker
            : await createPlaceMarker(selected.project, selected.site, selected.place, { name, type, description, visibility, ...(location ? { anchor: { type: 'gps', ...location } } : {}) });
        const site = sites.find(item => item.id === selected.site);
        if (type === 'plant') window.renderFieldGuide(encodeURIComponent(selected.project), true);
        else if (dashboardProjectId) window.renderProjectDashboard(encodeURIComponent(selected.project));
        else window.renderAssetWorkspace(site, place, marker);
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
