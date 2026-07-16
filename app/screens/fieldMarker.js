import { createPlaceMarker, createSpatialPlant, loadProjects, loadProjectSites, loadSitePlaces } from '../services/persistence.js';

let app;
let projects = [];
let sites = [];
let places = [];
let selected = { project: '', site: '', place: '' };
let location;
let markerType = 'plant';
let hillyardsMode = false;
let dashboardProjectId = '';

const options = (list, value, label) => `
    <option value="">Select ${label}</option>
    ${list.map(item => `<option value="${item.id}" ${item.id === value ? 'selected' : ''}>${item.name}</option>`).join('')}
`;

function draw() {
    const plant = markerType !== 'note';
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
                        <option value="note" ${!plant ? 'selected' : ''}>Note</option>
                    </select>
                </div>
                <div class="field">
                    <label>${plant ? 'Common Name' : 'Title'}</label>
                    <input id="fieldName" />
                </div>
                ${plant ? '<div class="field"><label>Scientific Name</label><input id="fieldScientific" /></div>' : ''}
                <div class="field">
                    <label>${plant ? 'Description' : 'Text'}</label>
                    <textarea id="fieldDescription" rows="3"></textarea>
                </div>
                <div class="field"><label>Visibility</label><select id="fieldVisibility"><option value="public">Public — Visitor and Creator</option><option value="draft">Draft — Creator only</option><option value="hidden">Hidden</option></select></div>
                <p id="fieldLocation" class="meta">${location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · accuracy ${Math.round(location.accuracy)} m` : plant ? 'Position optional. Add it now or update the plant later.' : 'Location not captured.'}</p>
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
    projects = (await loadProjects()).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    if (defaults) {
        hillyardsMode = true;
        dashboardProjectId = defaults.dashboardProjectId || '';
        selected = { project: defaults.project || '', site: defaults.site || '', place: defaults.place || '' };
        markerType = defaults.type === 'note' ? 'note' : 'plant';
        sites = selected.project ? await loadProjectSites(selected.project) : [];
        places = selected.project && selected.site ? await loadSitePlaces(selected.project, selected.site) : [];
    } else {
        hillyardsMode = false;
        dashboardProjectId = '';
    }
    draw();
}

export function setFieldMarkerType(type) {
    markerType = type === 'note' ? 'note' : 'plant';
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

    if (!selected.project || !selected.site || !selected.place) { error.textContent = 'Select a Location, Site and Place.'; return; }
    if (!name || (type === 'plant' && !scientific) || (type === 'note' && !description)) {
        error.textContent = type === 'plant' ? 'Common Name and Scientific Name are required.' : 'Title and Text are required.';
        return;
    }

    if (type === 'note' && (!location || !Number.isFinite(Number(location.latitude)) || !Number.isFinite(Number(location.longitude)))) { error.textContent = 'Capture a GPS position before saving a note.'; return; }
    try {
        error.textContent = 'Saving…';
        const place = places.find(item => item.id === selected.place);
        const visibility = document.getElementById('fieldVisibility').value;
        const marker = type === 'plant'
            ? (await createSpatialPlant(selected.project, selected.site, selected.place, { commonName: name, scientificName: scientific, description, visibility, ...(location || {}) })).marker
            : await createPlaceMarker(selected.project, selected.site, selected.place, { name, type, description, visibility, anchor: { type: 'gps', ...location } });
        const site = sites.find(item => item.id === selected.site);
        if (type === 'plant') window.renderFieldGuide(encodeURIComponent(selected.project), true);
        else window.renderAssetWorkspace(site, place, marker);
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
