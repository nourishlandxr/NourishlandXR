import { createPlaceMarker, createSitePlace, createSpatialPlant, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import { loadPlantLibrary, searchGlobalPlants } from '../services/plantDataService.js';
import { recordTutorialEvent } from '../services/tutorialProgress.js';

let app;
let sites = [];
let places = [];
let selected = { project: '', site: '', place: '' };
let markerType = 'plant';
let dashboardProjectId = '';
let plantProfiles = [];
let placementMode = 'without-ar';
let plantSearchScope = 'local';
let globalPlantResults = [];
let selectedGlobalPlant = null;
let globalSearchTimer = null;
let nonPlantMode = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function draw() {
    const plant = markerType === 'plant';
    const typeLabel = plant ? 'Plant' : markerType === 'sub_checkpoint' ? (nonPlantMode ? 'Dynamic Marker' : 'Checkpoint') : 'Note';
    const areaOptions = places.filter(place => place.name !== 'Unassigned').map(area => `<option value="${escapeHtml(area.id)}" ${area.id === selected.place ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
    app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <p class="welcome-label">Organizer Folder</p>
                <h1>Add ${typeLabel}</h1>
                <p class="subtitle">${plant ? 'Let’s keep the first step compact. Add only what you know now.' : 'Save a draft now and complete its details later.'}</p>
            </div>
            <form class="panel minimal-creation-form" onsubmit="window.saveFieldMarker(event)">
                <div class="field compact-area-field">
                    <label for="fieldArea">Area</label>
                    <div class="compact-inline-control"><select id="fieldArea" onchange="window.selectFieldPlace(this.value)">
                        <option value="">Select an Area</option>
                        ${areaOptions}
                        <option value="__unassigned__" ${selected.place === '__unassigned__' ? 'selected' : ''}>Unassigned — decide later</option>
                    </select><button class="inline-form-action" type="button" onclick="window.createFieldArea()">Create new Area</button></div>
                </div>
                <div class="compact-identity-row"><div class="field"><label for="fieldName">${plant ? 'Name (optional)' : 'Name'}</label><input id="fieldName" placeholder="Untitled is okay" /></div>${plant ? `<div class="field"><label for="fieldPlantProfile">Use existing</label><select id="fieldPlantProfile" onchange="window.selectFieldPlantProfile(this.value)"><option value="">New plant</option>${plantProfiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.commonName)}</option>`).join('')}</select></div>` : ''}</div>
                ${plant ? `<details class="compact-advanced"><summary>Advanced plant search</summary><div class="plant-source-picker"><div class="plant-search-scope" role="group" aria-label="Plant search source"><button class="${plantSearchScope === 'local' ? 'primary' : ''}" type="button" onclick="window.setPlantSearchScope('local')">Saved</button><button class="${plantSearchScope === 'global' ? 'primary' : ''}" type="button" onclick="window.setPlantSearchScope('global')">Global</button></div>${plantSearchScope === 'global' ? `<input id="globalPlantSearch" type="search" placeholder="Common name, genus or species…" autocomplete="off" oninput="window.searchGlobalPlantOptions(this.value)" /><div id="globalPlantSearchStatus" class="meta">${selectedGlobalPlant ? `Selected: ${escapeHtml(selectedGlobalPlant.scientificName)}` : 'Type at least 2 letters.'}</div><div class="global-plant-results">${globalPlantResults.map((result, index) => `<button type="button" onclick="window.selectGlobalPlant(${index})"><strong>${escapeHtml(result.commonName || result.canonicalName || result.scientificName)}</strong><span><em>${escapeHtml(result.scientificName)}</em></span></button>`).join('')}</div>` : '<p class="meta">Choose a saved plant from “Use existing” above.</p>'}</div></details>` : ''}
                <div class="placement-compact"><span><strong>Placement</strong><small>Not yet placed · can be placed later</small></span><button type="submit" name="saveIntent" value="ar">AR MODE</button></div>
                <div class="button-row">
                    <button class="primary" type="submit" name="saveIntent" value="later">Add ${typeLabel}</button>
                </div>
                <p id="fieldError" class="meta"></p>
            </form>
            <nav class="bottom-navigation"><button class="ghost" type="button" onclick="window.renderPlacementChoice('${encodeURIComponent(dashboardProjectId)}', '${markerType === 'sub_checkpoint' ? 'checkpoint' : markerType}')">Back</button><button type="button" onclick="window.renderProjectDashboard('${encodeURIComponent(dashboardProjectId)}')">Return to Dashboard</button></nav>
        </div>
    `;
}

export async function renderFieldMarker(target, defaults = null) {
    app = target || app;
    if (!app) return;
    nonPlantMode = defaults?.nonPlantMode === true;
    plantProfiles = nonPlantMode
        ? []
        : ((await loadPlantLibrary(true)).plants || []).filter(profile => !/^lemon drop(?: old profile| garcinia)?$/i.test(String(profile.commonName || profile.name || '').trim()));
    plantSearchScope = 'local';
    globalPlantResults = [];
    selectedGlobalPlant = null;
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

export function setPlantSearchScope(scope) {
    plantSearchScope = scope === 'global' ? 'global' : 'local';
    globalPlantResults = [];
    selectedGlobalPlant = null;
    draw();
}

export function searchGlobalPlantOptions(value) {
    clearTimeout(globalSearchTimer);
    const query = String(value || '').trim();
    const status = document.getElementById('globalPlantSearchStatus');
    if (query.length < 2) {
        globalPlantResults = [];
        if (status) status.textContent = 'Type at least 2 letters.';
        return;
    }
    if (status) status.textContent = 'Searching the global plant list…';
    globalSearchTimer = setTimeout(async () => {
        globalPlantResults = await searchGlobalPlants(query);
        selectedGlobalPlant = null;
        draw();
        const input = document.getElementById('globalPlantSearch');
        if (input) { input.value = query; input.focus(); }
        const nextStatus = document.getElementById('globalPlantSearchStatus');
        if (nextStatus) nextStatus.textContent = globalPlantResults.length ? `${globalPlantResults.length} global result${globalPlantResults.length === 1 ? '' : 's'}.` : 'No global plants found.';
    }, 350);
}

export function selectGlobalPlant(index) {
    selectedGlobalPlant = globalPlantResults[Number(index)] || null;
    if (!selectedGlobalPlant) return;
    document.getElementById('fieldName').value = selectedGlobalPlant.commonName || selectedGlobalPlant.canonicalName || selectedGlobalPlant.scientificName || '';
    const status = document.getElementById('globalPlantSearchStatus');
    if (status) status.textContent = `Selected from GBIF: ${selectedGlobalPlant.scientificName}`;
}

export async function createFieldArea() {
    const name = window.prompt('Name this Area');
    if (!name?.trim()) return;
    const area = await createSitePlace(selected.project, selected.site, { name: name.trim(), type: 'Other', description: '', visibility: 'draft' });
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
    const defaults = { plant: 'Untitled plant', note: 'Untitled note', sub_checkpoint: nonPlantMode ? 'Untitled dynamic marker' : 'Untitled marker' };
    const name = document.getElementById('fieldName').value.trim() || defaults[type];
    const plantId = plantSearchScope === 'local' ? (document.getElementById('fieldPlantProfile')?.value || '') : '';
    const saveIntent = event?.submitter?.value || (placementMode === 'ar' ? 'ar' : 'later');

    if (!selected.project || !selected.site) { error.textContent = 'The selected Location is unavailable.'; return; }
    if (!selected.place) { error.textContent = 'Select an Area or choose Unassigned.'; return; }
    try {
        error.textContent = 'Saving…';
        let place = places.find(item => item.id === selected.place);
        if (selected.place === '__unassigned__') {
            place = places.find(item => item.name === 'Unassigned') || await createSitePlace(selected.project, selected.site, { name: 'Unassigned', type: 'Other', description: 'Content awaiting Area assignment.', visibility: 'draft' });
        }
        if (!place) throw new Error('The selected Area could not be found.');
        const profile = plantProfiles.find(item => item.id === plantId);
        const visibility = 'draft';
        const marker = type === 'plant'
            ? (await createSpatialPlant(selected.project, selected.site, place.id, {
                plantId,
                commonName: name,
                scientificName: profile?.scientificName || selectedGlobalPlant?.scientificName || '',
                family: selectedGlobalPlant?.family || '',
                source: selectedGlobalPlant?.source || '',
                sourceId: selectedGlobalPlant?.sourceId || '',
                sourceUrl: selectedGlobalPlant?.sourceUrl || '',
                visibility
            })).marker
            : await createPlaceMarker(selected.project, selected.site, place.id, {
                name,
                type,
                description: '',
                visibility,
                ...(nonPlantMode && type === 'sub_checkpoint' ? { content_domain: 'nonplant', marker_kind: 'np_marker', dynamic_marker: true } : {})
            });
        recordTutorialEvent(selected.project, 'first_item_created');
        if (saveIntent === 'later') recordTutorialEvent(selected.project, 'first_unplaced_item_saved');
        if (saveIntent === 'ar') window.renderArPreparation(encodeURIComponent(selected.project), 'existing-placement', encodeURIComponent(marker.id), encodeURIComponent(place.id), encodeURIComponent(selected.site));
        else window.openProjectEntry(encodeURIComponent(selected.project), encodeURIComponent(marker.id));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
