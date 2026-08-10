import { createPlaceMarker, createSitePlace, createSpatialPlant, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import { loadPlantLibrary, searchGlobalPlants } from '../services/plantDataService.js';
import { createPlantProvenance, PLANT_SEARCH_SOURCE_LABEL } from '../services/plantSearchProviders.js';
import { recordTutorialEvent } from '../services/tutorialProgress.js';
import { AR_EXPERIENCE_CONFIG, DEFAULT_HOME_AREA_NAME, isDefaultHomeArea } from '../services/arExperienceConfig.js';

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
let globalSearchQuery = '';
let alaImportPreview = false;
let alaImportConfirmed = false;
let nonPlantMode = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function alaResultMarkup(result, index) {
    const thumbnail = result.thumbnailUrl
        ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />`
        : '<span class="ala-result-placeholder" aria-hidden="true">🌿</span>';
    return `<button class="ala-search-result" type="button" onclick="window.selectGlobalPlant(${index})">
        <span class="ala-result-image">${thumbnail}</span>
        <span class="ala-result-copy"><strong>${escapeHtml(result.commonName || result.canonicalName || result.scientificName)}</strong><em>${escapeHtml(result.scientificName)}</em><small>${escapeHtml([result.rank, result.family].filter(Boolean).join(' · ') || 'Plant record')}</small><small class="ala-result-source">${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</small></span>
    </button>`;
}

function alaPreviewMarkup(result) {
    const thumbnail = result.thumbnailUrl
        ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />`
        : '<span class="ala-result-placeholder" aria-hidden="true">🌿</span>';
    return `<section class="ala-import-preview" aria-labelledby="alaImportPreviewTitle">
        <div class="ala-preview-heading"><div><p class="welcome-label">IMPORT PREVIEW</p><h2 id="alaImportPreviewTitle">Review plant record</h2></div><span class="ala-preview-source">${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</span></div>
        <div class="ala-preview-identity"><span class="ala-result-image">${thumbnail}</span><div><strong>${escapeHtml(result.scientificName)}</strong><small>${escapeHtml([result.rank, result.family, result.kingdom].filter(Boolean).join(' · ') || 'Plant taxonomy')}</small></div></div>
        <div class="field"><label for="alaImportCommonName">Display / common name</label><input id="alaImportCommonName" value="${escapeHtml(result.commonName || result.canonicalName || result.scientificName)}" /></div>
        <dl class="ala-preview-facts"><div><dt>Scientific name</dt><dd><i>${escapeHtml(result.scientificName)}</i></dd></div><div><dt>Family</dt><dd>${escapeHtml(result.family || 'Not supplied by ALA')}</dd></div><div><dt>Source record</dt><dd>${escapeHtml(result.externalId)}</dd></div></dl>
        <p class="meta">This converts the selected record into an editable NLXR Plant Profile. External taxonomy remains cited reference information; your observations, practices and relationships stay separate.</p>
        <div class="button-row"><button type="button" onclick="window.cancelGlobalPlantPreview()">Return to results</button><button class="primary" type="button" onclick="window.confirmGlobalPlantImport()">Convert to NLXR Plant Profile</button></div>
    </section>`;
}

function draw() {
    const plant = markerType === 'plant';
    const typeLabel = plant ? 'Plant' : markerType === 'sub_checkpoint' ? (nonPlantMode ? 'Dynamic Marker' : 'Checkpoint') : 'Note';
    const identityLabel = plant ? 'Name (optional)' : markerType === 'note' ? 'Title' : 'Name';
    const areaOptions = places.filter(place => !isDefaultHomeArea(place)).map(area => `<option value="${escapeHtml(area.id)}" ${area.id === selected.place ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
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
                        <option value="__unassigned__" ${selected.place === '__unassigned__' ? 'selected' : ''}>Home — assign later</option>
                    </select><button class="inline-form-action" type="button" onclick="window.createFieldArea()">Create new Area</button></div>
                </div>
                <div class="compact-identity-row"><div class="field"><label for="fieldName">${identityLabel}</label><input id="fieldName" placeholder="${markerType === 'note' ? 'Title for this note' : 'Untitled is okay'}" /></div>${plant ? `<div class="field"><label for="fieldPlantProfile">Use existing</label><select id="fieldPlantProfile" onchange="window.selectFieldPlantProfile(this.value)"><option value="">New plant</option>${plantProfiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.commonName)}</option>`).join('')}</select></div>` : ''}</div>
                ${markerType === 'note' ? '<div class="field note-quick-information"><label for="fieldDescription">Information</label><textarea id="fieldDescription" rows="5" placeholder="Write the information this note should contain."></textarea></div>' : ''}
                ${plant ? `<details class="compact-advanced" ${plantSearchScope === 'global' ? 'open' : ''}><summary>Search plant database</summary><div class="plant-source-picker"><div class="plant-search-scope" role="group" aria-label="Plant search source"><button class="${plantSearchScope === 'local' ? 'primary' : ''}" type="button" onclick="window.setPlantSearchScope('local')">Saved records</button><button class="${plantSearchScope === 'global' ? 'primary' : ''}" type="button" onclick="window.setPlantSearchScope('global')">Search plant database</button></div>${plantSearchScope === 'global' ? `${alaImportPreview && selectedGlobalPlant ? alaPreviewMarkup(selectedGlobalPlant) : `<label class="sr-only" for="globalPlantSearch">Search plant database</label><input id="globalPlantSearch" type="search" placeholder="Common or scientific plant name…" value="${escapeHtml(globalSearchQuery)}" autocomplete="off" oninput="window.searchGlobalPlantOptions(this.value)" /><div id="globalPlantSearchStatus" class="meta">${selectedGlobalPlant ? `Selected: ${escapeHtml(selectedGlobalPlant.scientificName)}` : `Type at least 2 letters to search ${PLANT_SEARCH_SOURCE_LABEL}.`}</div><div class="global-plant-results">${globalPlantResults.map(alaResultMarkup).join('') || (globalSearchQuery.length >= 2 ? `<p class="meta">No plant matches found across ${PLANT_SEARCH_SOURCE_LABEL}.</p>` : '')}</div><button class="ghost ala-manual-action" type="button" onclick="window.continueManualPlantCreation()">Continue with manual plant creation</button>`}` : `<p class="meta">Choose a saved plant from “Use existing” above, or search ${PLANT_SEARCH_SOURCE_LABEL}.</p>`}</div></details>` : ''}
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
    const initialGlobalPlant = defaults?.globalPlant && typeof defaults.globalPlant === 'object' ? defaults.globalPlant : null;
    plantProfiles = nonPlantMode
        ? []
        : ((await loadPlantLibrary(true)).plants || []).filter(profile => !/^lemon drop(?: old profile| garcinia)?$/i.test(String(profile.commonName || profile.name || '').trim()));
    plantSearchScope = initialGlobalPlant ? 'global' : 'local';
    globalPlantResults = [];
    selectedGlobalPlant = initialGlobalPlant;
    globalSearchQuery = initialGlobalPlant ? String(initialGlobalPlant.commonName || initialGlobalPlant.scientificName || '').trim() : '';
    alaImportPreview = Boolean(initialGlobalPlant);
    alaImportConfirmed = false;
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
    globalSearchQuery = '';
    alaImportPreview = false;
    alaImportConfirmed = false;
    draw();
}

export function searchGlobalPlantOptions(value) {
    clearTimeout(globalSearchTimer);
    const query = String(value || '').trim();
    globalSearchQuery = query;
    alaImportPreview = false;
    alaImportConfirmed = false;
    const status = document.getElementById('globalPlantSearchStatus');
    if (query.length < 2) {
        globalPlantResults = [];
        if (status) status.textContent = 'Type at least 2 letters.';
        return;
    }
    if (status) status.textContent = 'Searching the global plant list…';
    globalSearchTimer = setTimeout(async () => {
        try {
            globalPlantResults = await searchGlobalPlants(query);
            if (globalSearchQuery !== query || plantSearchScope !== 'global') return;
            selectedGlobalPlant = null;
            draw();
            const input = document.getElementById('globalPlantSearch');
            if (input) { input.value = query; input.focus(); }
            const nextStatus = document.getElementById('globalPlantSearchStatus');
            if (nextStatus) nextStatus.textContent = globalPlantResults.length ? `${globalPlantResults.length} plant record${globalPlantResults.length === 1 ? '' : 's'} found across ${PLANT_SEARCH_SOURCE_LABEL}.` : `No plant matches found across ${PLANT_SEARCH_SOURCE_LABEL}.`;
        } catch (error) {
            if (globalSearchQuery !== query || plantSearchScope !== 'global') return;
            globalPlantResults = [];
            selectedGlobalPlant = null;
            draw();
            const input = document.getElementById('globalPlantSearch');
            if (input) { input.value = query; input.focus(); }
            const nextStatus = document.getElementById('globalPlantSearchStatus');
            if (nextStatus) nextStatus.textContent = error.name === 'AbortError' ? 'Search updated.' : 'Plant database unavailable. You can continue with manual creation.';
        }
    }, 350);
}

export function selectGlobalPlant(index) {
    selectedGlobalPlant = globalPlantResults[Number(index)] || null;
    if (!selectedGlobalPlant) return;
    alaImportPreview = true;
    alaImportConfirmed = false;
    draw();
}

export function cancelGlobalPlantPreview() {
    alaImportPreview = false;
    alaImportConfirmed = false;
    draw();
}

export function continueManualPlantCreation() {
    plantSearchScope = 'local';
    globalPlantResults = [];
    selectedGlobalPlant = null;
    globalSearchQuery = '';
    alaImportPreview = false;
    alaImportConfirmed = false;
    draw();
    document.getElementById('fieldName')?.focus();
}

export async function confirmGlobalPlantImport() {
    if (!selectedGlobalPlant) return;
    const commonName = document.getElementById('alaImportCommonName')?.value.trim();
    if (!commonName) {
        document.getElementById('fieldError').textContent = 'Add a display or common name before creating the Plant Profile.';
        return;
    }
    selectedGlobalPlant = { ...selectedGlobalPlant, commonName };
    document.getElementById('fieldName').value = commonName;
    alaImportConfirmed = true;
    await saveFieldMarker({ preventDefault() {}, submitter: { value: 'later' } });
}

export async function createFieldArea() {
    const name = window.prompt('Name this Area');
    if (!name?.trim()) return;
    const area = await createSitePlace(selected.project, selected.site, { name: name.trim(), type: 'Other', description: '', visibility: 'draft' });
    places = await loadSitePlaces(selected.project, selected.site);
    selected.place = area.id;
    draw();
}

export async function openGlobalPlantProfile(target, defaults = {}) {
    const globalPlant = defaults.globalPlant;
    if (!globalPlant || !defaults.project || !defaults.site) throw new Error('The selected plant record is incomplete.');
    await renderFieldMarker(target, {
        project: defaults.project,
        site: defaults.site,
        place: defaults.place || '__unassigned__',
        type: 'plant',
        placementMode: 'without-ar',
        dashboardProjectId: defaults.project,
        globalPlant
    });
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
    const description = document.getElementById('fieldDescription')?.value.trim() || '';
    const plantId = plantSearchScope === 'local' ? (document.getElementById('fieldPlantProfile')?.value || '') : '';
    const saveIntent = event?.submitter?.value || (placementMode === 'ar' ? 'ar' : 'later');

    if (!selected.project || !selected.site) { error.textContent = 'The selected Location is unavailable.'; return; }
    if (!selected.place) { error.textContent = 'Select an Area or choose Home.'; return; }
    if (type === 'plant' && plantSearchScope === 'global' && selectedGlobalPlant && !alaImportConfirmed) {
        error.textContent = 'Review the selected database record before creating the Plant Profile.';
        return;
    }
    try {
        error.textContent = 'Saving…';
        let place = places.find(item => item.id === selected.place);
        if (selected.place === '__unassigned__') {
            place = places.find(isDefaultHomeArea) || await createSitePlace(selected.project, selected.site, { ...AR_EXPERIENCE_CONFIG.fallbackArea, name: DEFAULT_HOME_AREA_NAME });
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
                source: selectedGlobalPlant?.sourceLabel || selectedGlobalPlant?.source || '',
                sourceId: selectedGlobalPlant?.externalId || selectedGlobalPlant?.sourceId || '',
                sourceUrl: selectedGlobalPlant?.sourceUrl || '',
                image: selectedGlobalPlant?.thumbnailUrl || '',
                imageAttribution: selectedGlobalPlant?.imageAttribution || '',
                imageLicense: selectedGlobalPlant?.imageLicense || '',
                externalSources: selectedGlobalPlant ? [createPlantProvenance(selectedGlobalPlant)] : [],
                visibility
            })).marker
            : await createPlaceMarker(selected.project, selected.site, place.id, {
                name,
                type,
                description,
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
