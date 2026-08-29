import { createPlaceMarker, createSitePlace, createSpatialPlant, loadProjectSites, loadSitePlaces, savePlantProfile } from '../services/persistence.js';
import { loadPlantLibrary, searchGlobalPlants } from '../services/plantDataService.js';
import { createPlantProvenance, PLANT_SEARCH_SOURCE_LABEL } from '../services/plantSearchProviders.js';
import { createPimDocument } from '../services/pimModel.js';
import { stagePimImport } from '../services/pimImportReview.js';
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
let globalImportStep = 1;
let globalImportReturnAction = '';
let nonPlantMode = false;

// New profiles begin with the six roots. The branch library is offered by the
// compact + chooser so the first view stays readable and uncluttered.
const initialPimCells = () => [];
// “Name (optional)” remains only as a migration/search phrase; the desktop
// conversion form renders one required Display / common name field.
// “Use existing” is intentionally not rendered in the source-conversion step;
// existing saved records remain available through the separate local workflow.
// Legacy placement copy “Not yet placed · can be placed later” is intentionally
// omitted here; placement belongs to the post-creation flow.
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const globalImportScientificMarkup = value => {
    const scientificName = String(value || '').trim();
    return scientificName ? `<em>${escapeHtml(scientificName)}</em>` : '';
};

const GLOBAL_IMPORT_CATEGORIES = Object.freeze([
    { id: 'scientific-information', label: 'Scientific Information', fallbackCell: 'Imported facts' },
    { id: 'uses', label: 'Uses', fallbackCell: 'Imported uses' },
    { id: 'food-forest', label: 'Food Forest', fallbackCell: 'Imported ecological information' },
    { id: 'cultivation', label: 'Cultivation', fallbackCell: 'Imported growing information' },
    { id: 'propagation', label: 'Propagation', fallbackCell: 'Imported propagation information' },
    { id: 'historical-data', label: 'Historical Data', fallbackCell: 'Imported history' }
]);
const GLOBAL_IMPORT_PROFILE_FACTS = new Set(['common_name', 'alternative_names', 'image']);
const globalImportCategoryId = value => ({
    'Scientific Information': 'scientific-information', Uses: 'uses', 'Food Forest': 'food-forest',
    Cultivation: 'cultivation', Propagation: 'propagation', 'Historical Data': 'historical-data'
}[String(value || '')] || String(value || '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-'));
const globalImportCategory = id => GLOBAL_IMPORT_CATEGORIES.find(category => category.id === id) || GLOBAL_IMPORT_CATEGORIES[0];
const globalImportSuggestedCategory = fact => {
    const suggested = globalImportCategoryId(fact?.destination?.[0]);
    if (GLOBAL_IMPORT_CATEGORIES.some(category => category.id === suggested)) return suggested;
    const key = String(fact?.key || '').toLocaleLowerCase();
    if (/(origin|native|distribution|range|history|traditional|heritage)/.test(key)) return 'historical-data';
    if (/(climate|sun|light|water|soil|cultivat|grow|height|temperature|hardiness)/.test(key)) return 'cultivation';
    if (/(propagat|seed|flower|reproduct|pollinat)/.test(key)) return 'propagation';
    if (/(use|edible|culinary|medicin|craft|toxic|warning)/.test(key)) return 'uses';
    if (/(ecolog|nitrogen|guild|function|relationship|habitat|layer)/.test(key)) return 'food-forest';
    return 'scientific-information';
};
const globalImportCell = (fact, categoryId) => {
    const suggested = globalImportSuggestedCategory(fact);
    return suggested === categoryId && fact?.destination?.[1]
        ? fact.destination[1]
        : globalImportCategory(categoryId).fallbackCell;
};
const globalImportFacts = result => {
    const supplied = Array.isArray(result?.importFacts) ? result.importFacts.filter(fact => fact?.key && fact.value !== undefined) : [];
    if (supplied.length) return supplied;
    return [
        { key: 'common_name', label: 'Display name', value: result?.commonName || result?.canonicalName || result?.scientificName || '', group: 'Essential', recommended: true, destination: ['Plant identity', 'Identity & taxonomy'] },
        { key: 'scientific_name', label: 'Scientific name', value: result?.scientificName || result?.canonicalName || '', group: 'Taxonomy', recommended: true, destination: ['Scientific Information', 'Taxonomy'] },
        ...(result?.description ? [{ key: 'description', label: 'Description', value: result.description, group: 'Essential', recommended: true, destination: ['Scientific Information', 'Description'] }] : []),
        ...(result?.price ? [{ key: 'price', label: 'Price', value: result.price, group: 'Retail', recommended: true, destination: ['Unassigned', 'Retail information'] }] : []),
        ...(result?.availability ? [{ key: 'availability', label: 'Availability', value: result.availability, group: 'Retail', recommended: true, destination: ['Unassigned', 'Retail information'] }] : []),
        ...(result?.category ? [{ key: 'category', label: 'Category', value: result.category, group: 'Retail', recommended: true, destination: ['Scientific Information', 'Classification'] }] : []),
        ...(result?.family ? [{ key: 'family', label: 'Family', value: result.family, group: 'Taxonomy', recommended: true, destination: ['Scientific Information', 'Classification'] }] : []),
        ...(result?.thumbnailUrl ? [{ key: 'image', label: 'Reference image', value: 'Reference image available', group: 'Essential', recommended: true, destination: ['Plant profile', 'Reference image'] }] : [])
    ].filter(fact => fact.value);
};
const globalImportDisplayName = result => result?.commonName || result?.canonicalName || result?.scientificName || 'Unnamed plant';
const globalImportReturn = () => globalImportReturnAction || `window.renderProjectDashboard('${encodeURIComponent(dashboardProjectId)}')`;
const globalImportValueMarkup = fact => String(fact?.value || '').length > 150
    ? `<details class="field-guide-fact-value"><summary>${escapeHtml(String(fact.value).slice(0, 144))}…</summary><span>${escapeHtml(fact.value)}</span></details>`
    : `<small>${escapeHtml(fact?.value || 'Not supplied')}</small>`;

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
    const extraction = new Set(Array.isArray(result.extractionFields) && result.extractionFields.length
        ? result.extractionFields
        : ['common_name', 'scientific_name', ...(result.family ? ['family'] : []), ...(result.thumbnailUrl ? ['image'] : [])]);
    const thumbnail = result.thumbnailUrl
        ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />`
        : '<span class="ala-result-placeholder" aria-hidden="true">🌿</span>';
    return `<section class="ala-import-preview" aria-labelledby="alaImportPreviewTitle">
        <div class="ala-preview-heading"><div><p class="welcome-label">REFERENCE PROFILE</p><h2 id="alaImportPreviewTitle">Review plant record</h2></div><span class="ala-preview-source">${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)}</span></div>
        <div class="ala-preview-identity"><span class="ala-result-image">${thumbnail}</span><div><strong>${escapeHtml(result.scientificName)}</strong><small>${escapeHtml([result.rank, result.family, result.kingdom].filter(Boolean).join(' · ') || 'Plant taxonomy')}</small></div></div>
        <div class="field"><label for="alaImportCommonName">Display / common name</label><input id="alaImportCommonName" value="${escapeHtml(result.commonName || result.canonicalName || result.scientificName)}" /></div>
        <fieldset class="ala-import-extraction"><legend>Content selected for NLXR</legend><p class="meta">Choose the fields to carry into the Plant Profile and PIM. Source provenance is always kept.</p><label><input type="checkbox" data-global-extract-field="common_name" ${extraction.has('common_name') ? 'checked' : ''} /> Display name · Plant identity</label><label><input type="checkbox" data-global-extract-field="scientific_name" ${extraction.has('scientific_name') ? 'checked' : ''} /> Accepted scientific name · Scientific Information</label>${result.family ? `<label><input type="checkbox" data-global-extract-field="family" ${extraction.has('family') ? 'checked' : ''} /> Family · Scientific Information</label>` : ''}${result.thumbnailUrl ? `<label><input type="checkbox" data-global-extract-field="image" ${extraction.has('image') ? 'checked' : ''} /> Reference image · Plant Profile</label>` : ''}</fieldset>
        <dl class="ala-preview-facts"><div><dt>Scientific name</dt><dd><i>${escapeHtml(result.scientificName)}</i></dd></div><div><dt>Family</dt><dd>${escapeHtml(result.family || 'Not supplied by ALA')}</dd></div><div><dt>Source record</dt><dd>${escapeHtml(result.externalId)}</dd></div></dl>
        <p class="meta">This is the source record as returned by the global plant databases. Nothing is added until you convert the selected content into an editable NLXR Plant Profile.</p>
        <div class="button-row"><button type="button" onclick="window.cancelGlobalPlantPreview()">Return to results</button><button class="primary" type="button" onclick="window.confirmGlobalPlantImport()">Create profile with selected content</button></div>
    </section>`;
}

function globalImportFactsMarkup(result) {
    const facts = globalImportFacts(result);
    const extraction = new Set(Array.isArray(result.extractionFields) && result.extractionFields.length
        ? result.extractionFields
        : facts.filter(fact => fact.recommended).map(fact => fact.key));
    const groupedFacts = facts.reduce((groups, fact) => ((groups[fact.group || 'Essential'] ||= []).push(fact), groups), {});
    const thumbnail = result.thumbnailUrl
        ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />`
        : '<span aria-hidden="true">&#127793;</span>';
    return `<article class="field-guide-global-profile field-guide-import-view" aria-labelledby="globalImportFactsTitle">
        <div class="field-guide-import-progress" aria-label="Import progress"><span class="is-active">1 Select facts</span><span>2 Review + plant setup</span></div>
        <p class="field-guide-import-step">Step 1 of 2 · Select facts</p>
        <header class="field-guide-global-profile-heading"><div><span class="field-guide-global-profile-kicker">GLOBAL PLANT IMPORT</span><h2 id="globalImportFactsTitle" tabindex="-1">Select facts</h2><p>Choose the source information you want to bring into this project.</p></div></header>
        <div class="field-guide-import-identity"><span class="field-guide-import-thumbnail">${thumbnail}</span><span><strong>${escapeHtml(globalImportDisplayName(result))}</strong>${globalImportScientificMarkup(result.scientificName)}<small>${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)} · Source attribution is kept automatically.</small></span></div>
        <section class="field-guide-global-profile-extract" aria-labelledby="globalImportFactsListTitle"><div class="field-guide-extract-heading"><div><h3 id="globalImportFactsListTitle">Facts to import</h3><p>Recommended facts are selected. You can change this before reviewing the plant setup.</p></div><button type="button" class="ghost" onclick="window.selectGlobalImportRecommended()">Select recommended</button></div><div class="field-guide-fact-groups">${['Essential', 'Taxonomy', 'Distribution', 'Retail', 'Sources'].map(group => groupedFacts[group]?.length ? `<section class="field-guide-fact-group"><h4>${group}</h4><div>${groupedFacts[group].map(fact => `<label class="field-guide-extract-row"><input type="checkbox" data-global-extract-field="${escapeHtml(fact.key)}" ${extraction.has(fact.key) ? 'checked' : ''} /><span><strong>${escapeHtml(fact.label || fact.key)}</strong>${globalImportValueMarkup(fact)}${fact.recommended ? '<em class="field-guide-recommended">Recommended</em>' : ''}</span></label>`).join('')}</div></section>` : '').join('')}</div></section>
        <p class="field-guide-global-profile-status" data-global-profile-status role="status" aria-live="polite"></p>
        <nav class="field-guide-import-actions" aria-label="Import navigation"><button type="button" class="ghost" onclick="${escapeHtml(globalImportReturn())}">Back</button><button type="button" class="primary" onclick="window.reviewGlobalPlantImport()">Review + plant setup</button></nav>
    </article>`;
}

function globalImportSetupMarkup(result) {
    const displayName = result.commonName || result.canonicalName || result.scientificName || 'Unnamed plant';
    const facts = Array.isArray(result.extractedFacts) ? result.extractedFacts : [];
    const profileFacts = facts.filter(fact => GLOBAL_IMPORT_PROFILE_FACTS.has(fact.key));
    const pimFacts = facts.filter(fact => !GLOBAL_IMPORT_PROFILE_FACTS.has(fact.key));
    const groups = [...new Set(pimFacts.map(globalImportSuggestedCategory))].map(categoryId => ({
        categoryId,
        facts: pimFacts.filter(fact => globalImportSuggestedCategory(fact) === categoryId)
    }));
    const thumbnail = result.thumbnailUrl
        ? `<img src="${escapeHtml(result.thumbnailUrl)}" alt="" loading="lazy" />`
        : '<span aria-hidden="true">&#127793;</span>';
    return `<section class="field-guide-global-setup" aria-labelledby="globalImportSetupTitle">
        <div class="field-guide-import-progress" aria-label="Import progress"><span class="is-active">1 Select facts</span><span class="is-active">2 Review + plant setup</span></div>
        <p class="field-guide-import-step">Step 2 of 2 · Review + plant setup</p>
        <div class="field-guide-import-identity"><span class="field-guide-import-thumbnail">${thumbnail}</span><span><strong>${escapeHtml(displayName)}</strong>${globalImportScientificMarkup(result.scientificName)}<small>${escapeHtml(result.sourceLabel || PLANT_SEARCH_SOURCE_LABEL)} · ${facts.length} selected fact${facts.length === 1 ? '' : 's'}</small></span></div>
        <section class="field-guide-import-confirmation" aria-labelledby="globalImportSetupTitle"><div><h2 id="globalImportSetupTitle">Ready to create this plant</h2><p>Identity and image stay with the Plant Profile. The remaining facts are grouped below using NLXR’s suggested destinations.</p></div><div class="field-guide-import-profile-summary"><strong>Plant Profile</strong><span>${profileFacts.length ? profileFacts.map(fact => escapeHtml(fact.label || fact.key)).join(' · ') : 'Display name and source attribution'}</span></div></section>
        <section class="field-guide-import-destinations" aria-labelledby="globalImportDestinationsTitle"><div class="field-guide-allocation-group-heading"><div><h2 id="globalImportDestinationsTitle">Place the selected facts</h2><span>Change a whole group once. Individual overrides are under Advanced options.</span></div></div><div class="field-guide-import-destination-groups">${groups.map(group => { const category = globalImportCategory(group.categoryId); return `<section class="field-guide-import-destination-group" data-global-setup-group="${group.categoryId}"><div class="field-guide-allocation-group-heading"><div><h3>${escapeHtml(category.label)}</h3><span>${group.facts.length} fact${group.facts.length === 1 ? '' : 's'} grouped together</span></div><label class="field-guide-global-setup-destination">Destination<select data-global-setup-category="${group.categoryId}" data-global-setup-group-category="${group.categoryId}">${GLOBAL_IMPORT_CATEGORIES.map(option => `<option value="${option.id}" ${option.id === group.categoryId ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label></div><ul class="field-guide-import-fact-list">${group.facts.map(fact => `<li data-global-setup-fact-row="${escapeHtml(fact.key)}"><strong>${escapeHtml(fact.label || fact.key)}</strong>${globalImportValueMarkup(fact)}</li>`).join('')}</ul></section>`; }).join('') || '<p class="meta">No PIM facts selected. Go back and select at least one fact.</p>'}</div></section>
        ${pimFacts.length ? `<details class="field-guide-import-advanced"><summary>Advanced options · move one fact</summary><p>Use this only when one fact belongs in a different category from the rest of its group.</p><div class="field-guide-import-advanced-list">${pimFacts.map(fact => `<label><span><strong>${escapeHtml(fact.label || fact.key)}</strong><small>Use its group destination by default</small></span><select data-global-setup-fact-category="${escapeHtml(fact.key)}"><option value="">Use group destination</option>${GLOBAL_IMPORT_CATEGORIES.map(category => `<option value="${category.id}">${category.label}</option>`).join('')}</select></label>`).join('')}</div></details>` : ''}
        <p class="meta">The Area and display name are confirmed below on this same page. Nothing is saved until you create the NLXR Plant Profile.</p>
    </section>`;
}

function draw() {
    const plant = markerType === 'plant';
    const globalConversion = plant && Boolean(selectedGlobalPlant);
    const globalImportStepOne = globalConversion && globalImportStep === 1;
    const typeLabel = plant ? 'Plant' : markerType === 'sub_checkpoint' ? (nonPlantMode ? 'Dynamic Marker' : 'Checkpoint') : 'Note';
    const identityLabel = plant ? 'Display / common name' : markerType === 'note' ? 'Title' : 'Name';
    const areaOptions = places.filter(place => !isDefaultHomeArea(place)).map(area => `<option value="${escapeHtml(area.id)}" ${area.id === selected.place ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
    app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <p class="welcome-label">Organizer Folder</p>
                <h1>${globalConversion ? (globalImportStepOne ? 'Import plant' : 'Review plant') : `Add ${typeLabel}`}</h1>
                <p class="subtitle">${globalConversion ? (globalImportStepOne ? 'Step 1 of 2 · Select facts.' : 'Step 2 of 2 · Review and set up the plant.') : plant ? 'Let’s keep the first step compact. Add only what you know now.' : 'Save a draft now and complete its details later.'}</p>
            </div>
            ${globalConversion ? (globalImportStepOne ? globalImportFactsMarkup(selectedGlobalPlant) : globalImportSetupMarkup(selectedGlobalPlant)) : ''}
            <form class="panel minimal-creation-form" ${globalImportStepOne ? 'hidden' : ''} onsubmit="window.saveFieldMarker(event)">
                <div class="field compact-area-field">
                    <label for="fieldArea">Area</label>
                    <div class="compact-inline-control"><select id="fieldArea" onchange="window.selectFieldPlace(this.value)">
                        <option value="">Select an Area</option>
                        ${areaOptions}
                        <option value="__unassigned__" ${selected.place === '__unassigned__' ? 'selected' : ''}>Home — assign later</option>
                    </select><button class="inline-form-action" type="button" onclick="window.createFieldArea()">Create new Area</button></div>
                </div>
                <div class="compact-identity-row"><div class="field"><label for="fieldName">${identityLabel}</label><input id="fieldName" ${plant ? 'required' : ''} value="${globalConversion ? escapeHtml(selectedGlobalPlant.commonName || selectedGlobalPlant.canonicalName || selectedGlobalPlant.scientificName) : ''}" placeholder="${markerType === 'note' ? 'Title for this note' : 'Plant name'}" /></div>${plant && !globalConversion ? `<div class="field"><label for="fieldPlantProfile">Saved plant</label><select id="fieldPlantProfile" onchange="window.selectFieldPlantProfile(this.value)"><option value="">Create new plant</option>${plantProfiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.commonName)}</option>`).join('')}</select></div>` : ''}</div>
                ${markerType === 'note' ? '<div class="field note-quick-information"><label for="fieldDescription">Information</label><textarea id="fieldDescription" rows="5" placeholder="Write the information this note should contain."></textarea></div>' : ''}
                ${plant && !globalConversion ? `<details class="compact-advanced"><summary>Search plant database</summary><div class="plant-search-scope" role="group" aria-label="Plant search source"><button type="button" class="${plantSearchScope === 'local' ? 'primary' : ''}" onclick="window.setPlantSearchScope('local')">Saved records</button><button type="button" class="${plantSearchScope === 'global' ? 'primary' : ''}" onclick="window.setPlantSearchScope('global')">Search plant database</button></div><p class="meta">Use Global Search in Content to research and convert source records.</p></details>` : ''}
                <div class="button-row">
                    ${globalConversion ? '<button class="primary" type="submit" name="saveIntent" value="later">Create NLXR Plant Profile</button>' : `<button class="primary" type="submit" name="saveIntent" value="later">Add ${typeLabel}</button>`}
                </div>
                <p id="fieldError" class="meta"></p>
            </form>
            <nav class="bottom-navigation" ${globalImportStepOne ? 'hidden' : ''}><button class="ghost" type="button" onclick="${globalConversion ? escapeHtml(globalImportReturn()) : `window.renderPlacementChoice('${encodeURIComponent(dashboardProjectId)}', '${markerType === 'sub_checkpoint' ? 'checkpoint' : markerType}')`}">${globalImportStepOne ? 'Return to Content' : 'Back'}</button><button type="button" onclick="window.renderProjectDashboard('${encodeURIComponent(dashboardProjectId)}')">Return to Dashboard</button></nav>
        </div>
    `;
}

export async function renderFieldMarker(target, defaults = null) {
    app = target || app;
    if (!app) return;
    nonPlantMode = defaults?.nonPlantMode === true;
    const initialGlobalPlant = defaults?.globalPlant && typeof defaults.globalPlant === 'object' ? defaults.globalPlant : null;
    // Draw an import page immediately. The global result already contains all
    // facts needed for step one, so waiting for the full local plant library
    // can only make the button appear stuck on “Opening import page…”.
    plantProfiles = [];
    plantSearchScope = initialGlobalPlant ? 'global' : 'local';
    globalPlantResults = [];
    selectedGlobalPlant = initialGlobalPlant;
    globalSearchQuery = initialGlobalPlant ? String(initialGlobalPlant.commonName || initialGlobalPlant.scientificName || '').trim() : '';
    alaImportPreview = Boolean(initialGlobalPlant);
    globalImportStep = initialGlobalPlant ? 1 : 1;
    globalImportReturnAction = initialGlobalPlant && defaults?.returnAction ? String(defaults.returnAction) : '';
    alaImportConfirmed = false;
    if (defaults) {
        dashboardProjectId = defaults.dashboardProjectId || '';
        selected = { project: defaults.project || '', site: defaults.site || '', place: defaults.place || '' };
        markerType = ['plant', 'note', 'sub_checkpoint'].includes(defaults.type) ? defaults.type : 'plant';
        placementMode = defaults.placementMode === 'ar' ? 'ar' : 'without-ar';
        sites = Array.isArray(defaults.sites) ? defaults.sites : selected.project ? await loadProjectSites(selected.project) : [];
        places = Array.isArray(defaults.places) ? defaults.places : selected.project && selected.site ? await loadSitePlaces(selected.project, selected.site) : [];
    } else {
        dashboardProjectId = '';
        throw new Error('Open Quick Access from a selected location.');
    }
    draw();
    if (!nonPlantMode && !initialGlobalPlant) {
        plantProfiles = ((await loadPlantLibrary(true)).plants || []).filter(profile => !/^lemon drop(?: old profile| garcinia)?$/i.test(String(profile.commonName || profile.name || '').trim()));
        draw();
    }
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

export function selectGlobalImportRecommended() {
    if (!selectedGlobalPlant) return;
    const recommended = new Set(globalImportFacts(selectedGlobalPlant).filter(fact => fact.recommended).map(fact => fact.key));
    document.querySelectorAll('[data-global-extract-field]').forEach(input => {
        input.checked = recommended.has(input.dataset.globalExtractField);
    });
}

export function reviewGlobalPlantImport() {
    if (!selectedGlobalPlant) return;
    const selectedFields = [...document.querySelectorAll('[data-global-extract-field]:checked')]
        .map(input => input.dataset.globalExtractField)
        .filter(Boolean);
    const status = document.querySelector('[data-global-profile-status]');
    if (!selectedFields.length) {
        if (status) status.textContent = 'Select at least one fact to continue.';
        return;
    }
    const factsByKey = new Map(globalImportFacts(selectedGlobalPlant).map(fact => [fact.key, fact]));
    const extractedFacts = selectedFields.map(key => factsByKey.get(key)).filter(Boolean).map(fact => {
        if (GLOBAL_IMPORT_PROFILE_FACTS.has(fact.key)) {
            return { ...fact, confirmedDestinations: [], reviewStatus: 'pending' };
        }
        const categoryId = globalImportSuggestedCategory(fact);
        const category = globalImportCategory(categoryId);
        const cell = globalImportCell(fact, categoryId);
        return {
            ...fact,
            destination: [category.label, cell],
            confirmedDestinations: [[categoryId, cell]],
            reviewStatus: 'pending',
            confidence: 'suggested'
        };
    });
    selectedGlobalPlant = { ...selectedGlobalPlant, extractionFields: selectedFields, extractedFacts };
    alaImportConfirmed = true;
    globalImportStep = 2;
    draw();
    document.getElementById('globalImportSetupTitle')?.focus();
}

function syncGlobalImportSetupDestinations() {
    if (!selectedGlobalPlant || !Array.isArray(selectedGlobalPlant.extractedFacts)) return;
    const extractedFacts = selectedGlobalPlant.extractedFacts.map(fact => {
        if (GLOBAL_IMPORT_PROFILE_FACTS.has(fact.key)) return fact;
        const row = [...document.querySelectorAll('[data-global-setup-fact-row]')].find(item => item.dataset.globalSetupFactRow === fact.key);
        const group = row?.closest('[data-global-setup-group]');
        const groupSelect = group?.querySelector('[data-global-setup-group-category]');
        const override = [...document.querySelectorAll('[data-global-setup-fact-category]')].find(item => item.dataset.globalSetupFactCategory === fact.key);
        const categoryId = override?.value || groupSelect?.value || fact.confirmedDestinations?.[0]?.[0] || globalImportSuggestedCategory(fact);
        const category = globalImportCategory(categoryId);
        const cell = globalImportCell(fact, categoryId);
        return {
            ...fact,
            destination: [category.label, cell],
            confirmedDestinations: [[categoryId, cell]],
            confidence: categoryId === globalImportSuggestedCategory(fact) ? 'suggested' : 'confirmed',
            reviewStatus: 'pending'
        };
    });
    selectedGlobalPlant = { ...selectedGlobalPlant, extractedFacts, extractionFields: extractedFacts.map(fact => fact.key) };
}

export async function confirmGlobalPlantImport() {
    if (!selectedGlobalPlant) return;
    const commonName = document.getElementById('alaImportCommonName')?.value.trim();
    const extractionFields = [...document.querySelectorAll('[data-global-extract-field]:checked')].map(input => input.dataset.globalExtractField).filter(Boolean);
    if (!commonName) {
        document.getElementById('fieldError').textContent = 'Add a display or common name before creating the Plant Profile.';
        return;
    }
    if (!extractionFields.some(field => ['scientific_name', 'family'].includes(field))) {
        document.getElementById('fieldError').textContent = 'Select at least one Scientific Information field to create usable PIM content.';
        return;
    }
    selectedGlobalPlant = { ...selectedGlobalPlant, commonName, extractionFields };
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
        returnAction: defaults.returnAction || '',
        sites: defaults.sites,
        places: defaults.places,
        globalPlant
    });
}

export function refreshFieldLocation() {
    document.getElementById('fieldError').textContent = 'Use Place in AR after saving to add a physical position.';
}

async function saveSelectedGlobalPimContent(projectId, siteId, placeId, markerId, commonName) {
    if (!selectedGlobalPlant || !Array.isArray(selectedGlobalPlant.extractionFields)) return;
    const selectedFields = new Set(selectedGlobalPlant.extractionFields);
    const extractedFacts = Array.isArray(selectedGlobalPlant.extractedFacts) ? selectedGlobalPlant.extractedFacts : [];
    const profile = {
        common_name: commonName,
        scientific_name: selectedFields.has('scientific_name') ? selectedGlobalPlant.scientificName || '' : '',
        family: selectedFields.has('family') ? selectedGlobalPlant.family || '' : '',
        photo: selectedFields.has('image') ? selectedGlobalPlant.thumbnailUrl || '' : '',
        image: selectedFields.has('image') ? selectedGlobalPlant.thumbnailUrl || '' : '',
        externalSources: [{ ...createPlantProvenance(selectedGlobalPlant), sourceDatabase: selectedGlobalPlant.sourceLabel || PLANT_SEARCH_SOURCE_LABEL, sourceRecordId: selectedGlobalPlant.externalId || '', sourceUrl: selectedGlobalPlant.sourceUrl || '', retrievalDate: new Date().toISOString(), reviewStatus: 'pending', rawSourceData: selectedGlobalPlant.rawSourceData || {} }],
        research_extraction: extractedFacts
    };
    const importFields = {};
    if (profile.scientific_name) importFields.scientificName = profile.scientific_name;
    if (profile.family) importFields.family = profile.family;
    extractedFacts.forEach(fact => {
        if (fact?.key && fact.value !== undefined && !(fact.key in importFields)) importFields[fact.key] = fact.value;
    });
    if (Object.keys(importFields).length) {
        const document = createPimDocument({
            plantId: markerId,
            identity: { commonName, scientificName: profile.scientific_name, image: profile.image },
            nodes: initialPimCells()
        });
        // Keep extracted facts in the review queue only.  Adding them to the
        // document before staging made the same fact exist twice: once as an
        // unpublished draft and again as the deterministic import candidate.
        // The review service creates the parent chain and PIM node only after
        // the editor approves it.
        const staging = stagePimImport(document, {
            ...importFields,
            sourceDatabase: selectedGlobalPlant.sourceLabel || PLANT_SEARCH_SOURCE_LABEL,
            sourceRecordId: selectedGlobalPlant.externalId || selectedGlobalPlant.sourceId || '',
            sourceUrl: selectedGlobalPlant.sourceUrl || '',
            licence: selectedGlobalPlant.imageLicense || '',
            attribution: selectedGlobalPlant.imageAttribution || ''
        }, { plantId: markerId, attribution: selectedGlobalPlant.imageAttribution || '' });
        profile.profile_enabled = true;
        profile.spm_enabled = true;
        profile.pim_document = staging.document;
        profile.pim_import_review = staging;
    }
    await savePlantProfile(projectId, siteId, placeId, markerId, profile);
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
        if (type === 'plant' && selectedGlobalPlant && alaImportConfirmed) {
            syncGlobalImportSetupDestinations();
            await saveSelectedGlobalPimContent(selected.project, selected.site, place.id, marker.id, name);
        }
        recordTutorialEvent(selected.project, 'first_item_created');
        if (saveIntent === 'later') recordTutorialEvent(selected.project, 'first_unplaced_item_saved');
        if (saveIntent === 'ar') window.renderArPreparation(encodeURIComponent(selected.project), 'existing-placement', encodeURIComponent(marker.id), encodeURIComponent(place.id), encodeURIComponent(selected.site));
        else window.openProjectEntry(encodeURIComponent(selected.project), encodeURIComponent(marker.id));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}
