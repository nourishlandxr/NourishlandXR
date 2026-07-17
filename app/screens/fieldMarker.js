import { createPlaceMarker, createSitePlace, createSpatialPlant, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import { loadPlantLibrary } from '../services/plantDataService.js';

let app;
let sites = [];
let places = [];
let selected = { project: '', site: '', place: '' };
let markerType = 'plant';
let dashboardProjectId = '';
let plantProfiles = [];
let placementMode = 'without-ar';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function draw() {
    const plant = markerType === 'plant';
    const typeLabel = plant ? 'Plant' : markerType === 'sub_checkpoint' ? 'Checkpoint' : 'Note';
    const areaOptions = places.filter(place => place.name !== 'Unassigned').map(area => `<option value="${escapeHtml(area.id)}" ${area.id === selected.place ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
    app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <button class="ghost" type="button" onclick="window.renderPlacementChoice('${encodeURIComponent(dashboardProjectId)}', '${markerType === 'sub_checkpoint' ? 'checkpoint' : markerType}')">Back</button>
                <p class="welcome-label">Quick Access</p>
                <h1>Add ${typeLabel}</h1>
                <p class="subtitle">${placementMode === 'ar' ? 'Create the item, then continue to AR placement.' : 'Create the item now and place it later.'}</p>
            </div>
            <form class="panel minimal-creation-form" onsubmit="window.saveFieldMarker(event)">
                <div class="field">
                    <label for="fieldArea">Area</label>
                    <select id="fieldArea" onchange="window.selectFieldPlace(this.value)">
                        <option value="">Select an Area</option>
                        ${areaOptions}
                        <option value="__unassigned__" ${selected.place === '__unassigned__' ? 'selected' : ''}>Unassigned — decide later</option>
                    </select>
                    <button class="inline-form-action" type="button" onclick="window.createFieldArea()">Create a new Area</button>
                </div>
                <div class="field">
                    <label for="fieldName">${plant ? 'Common name' : markerType === 'note' ? 'Name or short title' : 'Name'}</label>
                    <input id="fieldName" required />
                </div>
                ${plant ? `<div class="field"><label for="fieldPlantProfile">Reuse Plant Profile</label><select id="fieldPlantProfile" onchange="window.selectFieldPlantProfile(this.value)"><option value="">Create a new profile to complete later</option>${plantProfiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.commonName)}${profile.scientificName ? ` · ${escapeHtml(profile.scientificName)}` : ''}</option>`).join('')}</select></div>` : ''}
                <p class="placement-status is-unplaced"><strong>Placement status:</strong> Not yet placed</p>
                <p class="meta">Area assignment records where this item belongs. Its physical AR position can be added separately.</p>
                <div class="button-row">
                    <button type="button" onclick="window.renderProjectDashboard('${encodeURIComponent(dashboardProjectId)}')">Cancel</button>
                    <button class="primary" type="submit">Save</button>
                </div>
                <p id="fieldError" class="meta"></p>
            </form>
        </div>
    `;
}

export async function renderFieldMarker(target, defaults = null) {
    app = target || app;
    if (!app) return;
    plantProfiles = (await loadPlantLibrary(true)).plants || [];
    if (defaults) {
        dashboardProjectId = defaults.dashboardProjectId || '';
        selected = { project: defaults.project || '', site: defaults.site || '', place: defaults.place || '' };
        markerType = ['plant', 'note', 'sub_checkpoint'].includes(defaults.type) ? defaults.type : 'plant';
        placementMode = defaults.placementMode === 'ar' ? 'ar' : 'without-ar';
        sites = selected.project ? await loadProjectSites(selected.project) : [];
        places = selected.project && selected.site ? await loadSitePlaces(selected.project, selected.site) : [];
    } else {
        dashboardProjectId = '';
        throw new Error('Open Quick Access from a selected location.');
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
}

export async function createFieldArea() {
    const name = window.prompt('Name this Area');
    if (!name?.trim()) return;
    const area = await createSitePlace(selected.project, selected.site, { name: name.trim(), type: 'Area', description: '', visibility: 'draft' });
    places = await loadSitePlaces(selected.project, selected.site);
    selected.place = area.id;
    draw();
}

export function refreshFieldLocation() {
    document.getElementById('fieldError').textContent = 'Use Place in AR after saving to add a physical position.';
}

export async function saveFieldMarker(event) {
    event?.preventDefault();
    const error = document.getElementById('fieldError');
    const type = markerType;
    const name = document.getElementById('fieldName').value.trim();
    const plantId = document.getElementById('fieldPlantProfile')?.value || '';

    if (!selected.project || !selected.site) { error.textContent = 'The selected Location is unavailable.'; return; }
    if (!selected.place) { error.textContent = 'Select an Area or choose Unassigned.'; return; }
    if (!name) { error.textContent = type === 'plant' ? 'Common name is required.' : 'Name is required.'; return; }

    try {
        error.textContent = 'Saving…';
        let place = places.find(item => item.id === selected.place);
        if (selected.place === '__unassigned__') {
            place = places.find(item => item.name === 'Unassigned') || await createSitePlace(selected.project, selected.site, { name: 'Unassigned', type: 'Area', description: 'Content awaiting Area assignment.', visibility: 'draft' });
        }
        if (!place) throw new Error('The selected Area could not be found.');
        const profile = plantProfiles.find(item => item.id === plantId);
        const visibility = 'draft';
        const marker = type === 'plant'
            ? (await createSpatialPlant(selected.project, selected.site, place.id, { plantId, commonName: name, scientificName: profile?.scientificName || '', visibility })).marker
            : await createPlaceMarker(selected.project, selected.site, place.id, { name, type, description: '', visibility });
        if (placementMode === 'ar') window.renderArPreparation(encodeURIComponent(selected.project), 'existing-placement', encodeURIComponent(marker.id), encodeURIComponent(place.id), encodeURIComponent(selected.site));
        else window.renderProjectDashboard(encodeURIComponent(selected.project));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
