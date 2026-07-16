import { createPlaceMarker, createSitePlace, loadProjects, loadProjectSites, loadSitePlaces } from '../services/persistence.js';

let app;
let projects = [];
let sites = [];
let selected = { project: '', site: '' };
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
                <p id="fieldLocation" class="meta">${location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} · accuracy ${Math.round(location.accuracy)} m` : 'Location not captured.'}</p>
                <div class="button-row">
                    <button onclick="window.refreshFieldLocation()">Add current position</button>
                    <button class="primary" onclick="window.saveFieldMarker()">Save Entry</button>
                </div>
                <p id="fieldError" class="meta"></p>
            </div>
        </div>
    `;
}

async function getFieldPlace() {
    const places = await loadSitePlaces(selected.project, selected.site);
    let place = places.find(item => item.id === 'field_markers');
    if (!place) {
        place = await createSitePlace(selected.project, selected.site, {
            name: 'Field Markers',
            type: 'Operational Area',
            description: 'Automatic storage area for markers created through the simplified field form.'
        });
    }
    return place;
}

export async function renderFieldMarker(target, defaults = null) {
    app = target || app;
    if (!app) return;
    projects = (await loadProjects()).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    if (defaults) {
        hillyardsMode = true;
        dashboardProjectId = defaults.dashboardProjectId || '';
        selected = { project: defaults.project || '', site: defaults.site || '' };
        markerType = defaults.type === 'note' ? 'note' : 'plant';
        sites = selected.project ? await loadProjectSites(selected.project) : [];
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
    selected = { project: id, site: '' };
    sites = id ? await loadProjectSites(id) : [];
    draw();
}

export async function selectFieldSite(id) {
    selected.site = id;
    draw();
}

// Retained for compatibility with older callers; Place selection is no longer shown.
export function selectFieldPlace() {}

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

    if (!selected.project || !selected.site) { error.textContent = 'Select a Location and Site.'; return; }
    if (!name || (type === 'plant' && !scientific) || (type === 'note' && !description)) {
        error.textContent = type === 'plant' ? 'Common Name and Scientific Name are required.' : 'Title and Text are required.';
        return;
    }

    try {
        error.textContent = 'Saving…';
        const place = await getFieldPlace();
        const marker = await createPlaceMarker(selected.project, selected.site, place.id, {
            name,
            type,
            description,
            anchor: location ? { type: 'gps', ...location } : { type: '', latitude: '', longitude: '', accuracy: '', description: '' },
            plant_profile: type === 'plant' ? { common_name: name, scientific_name: scientific } : undefined
        });
        const site = sites.find(item => item.id === selected.site);
        window.renderAssetWorkspace(site, place, marker);
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
