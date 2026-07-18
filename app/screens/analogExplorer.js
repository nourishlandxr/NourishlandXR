import { getResolvedPlantInstance, loadPlantInstances, loadPlantLibrary } from '../services/plantDataService.js';

const PROJECT_ID = 'Hillyards';
const SITE_ID = 'main_food_forest';
const PLACES = ['1R1', '1R2', '1R3', '2R1', '2R2'];
let app;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const listValue = value => Array.isArray(value) ? value.join(', ') : value || '';
const optionList = (values, label) => `<option value="">${label}</option>${[...new Set(values.filter(Boolean))].sort().map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;

async function loadResolvedInventory(refresh = false) {
    const [library, instanceData] = await Promise.all([loadPlantLibrary(refresh, true), loadPlantInstances(PROJECT_ID, SITE_ID, refresh, true)]);
    const plantsById = new Map(library.plants.map(plant => [plant.id, plant]));
    return instanceData.instances.map(instance => {
        const plant = plantsById.get(instance.plantId);
        if (!plant) return null;
        return { ...plant, ...instance, instanceId: instance.id, plantId: plant.id, cultivar: instance.cultivarOverride || plant.cultivar || '', commonName: plant.commonName || '', scientificName: plant.scientificName || '' };
    }).filter(Boolean);
}

function plantRow(plant, index = null) {
    const prefix = index === null ? '' : `<span class="analog-number">${index + 1}.</span>`;
    return `<button class="analog-plant-row" data-analog-plant data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.cultivar, plant.placeId, plant.zoneId, listValue(plant.uses), plant.plantType].join(' ').toLowerCase())}" data-place="${escapeHtml(plant.placeId)}" data-family="${escapeHtml(plant.family)}" data-layer="${escapeHtml(plant.layer)}" data-type="${escapeHtml(plant.plantType)}" data-status="${escapeHtml(plant.status)}" onclick="window.renderAnalogPlant('${encodeURIComponent(plant.instanceId)}')">${prefix}<span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small><em>${escapeHtml(plant.scientificName || 'Scientific name not entered')}</em>${plant.cultivar ? ` Â· ${escapeHtml(plant.cultivar)}` : ''}</small></span></button>`;
}

function printButton() {
    return '<button class="analog-print-button" type="button" onclick="window.print()">Print</button>';
}

export async function renderAnalogExplorer(target) {
    app = target;
    const inventory = await loadResolvedInventory(true);
    app.innerHTML = `<div class="screen analog-explorer"><header class="page-header analog-header"><button class="ghost analog-navigation" onclick="window.renderV1Explorer()">Back</button><p class="welcome-label">Field Guide</p><h1>Hillyards</h1><p class="subtitle">hillyards loaded</p></header><section class="panel analog-intro"><p>A plain-language plant inventory for browsing and printing without entering AR.</p></section><div class="menu-stack"><button class="menu-card" onclick="window.renderAnalogPlantList()"><strong>Hillyards Field Guide</strong><span>${inventory.length} plant instance${inventory.length === 1 ? '' : 's'}</span></button>${PLACES.map(place => `<button class="menu-card" onclick="window.renderAnalogPlace('${place}')"><strong>${place}</strong><span>${inventory.filter(plant => String(plant.placeId).toLowerCase() === place.toLowerCase()).length} plants</span></button>`).join('')}</div></div>`;
}

export async function renderAnalogPlantList(target = app) {
    app = target;
    const plants = await loadResolvedInventory(true);
    app.innerHTML = `<div class="screen analog-explorer analog-print-page"><header class="page-header analog-header"><button class="ghost analog-navigation" onclick="window.renderAnalogExplorer()">Back</button><p class="print-kicker">HILLYARDS FOOD FOREST</p><h1>Hillyards Field Guide</h1><p class="subtitle">hillyards loaded</p></header><section class="analog-filter-panel analog-navigation"><div class="field analog-search"><label for="analogSearch">Search plants</label><input id="analogSearch" type="search" placeholder="Common name, scientific name, family, use..." oninput="window.applyAnalogFilters()" /></div><div class="analog-filter-grid"><select id="analogPlaceFilter" onchange="window.applyAnalogFilters()">${optionList(plants.map(plant => plant.placeId), 'All Areas')}</select><select id="analogFamilyFilter" onchange="window.applyAnalogFilters()">${optionList(plants.map(plant => plant.family), 'All families')}</select><select id="analogLayerFilter" onchange="window.applyAnalogFilters()">${optionList(plants.map(plant => plant.layer), 'All layers')}</select><select id="analogTypeFilter" onchange="window.applyAnalogFilters()">${optionList(plants.map(plant => plant.plantType), 'All plant types')}</select><select id="analogStatusFilter" onchange="window.applyAnalogFilters()">${optionList(plants.map(plant => plant.status), 'All statuses')}</select></div></section><p id="analogResultCount" class="meta">${plants.length} plants</p><div id="analogPlantRows" class="analog-plant-list">${plants.length ? plants.map((plant, index) => plantRow(plant, index)).join('') : '<p>No plants are listed.</p>'}</div><div class="analog-qr-space">QR CODE</div><div class="analog-print-footer">${printButton()}</div></div>`;
}

export async function renderAnalogPlace(target = app, placeId) {
    app = target;
    const plants = (await loadResolvedInventory(true)).filter(plant => String(plant.placeId).toLowerCase() === String(placeId).toLowerCase());
    app.innerHTML = `<div class="screen analog-explorer analog-print-page"><header class="page-header analog-header"><button class="ghost analog-navigation" onclick="window.renderAnalogExplorer()">Back</button><p class="print-kicker">HILLYARDS FOOD FOREST</p><h1>hillyards loaded</h1><p class="subtitle">Area: ${escapeHtml(placeId)}</p></header><div class="analog-plant-list">${plants.length ? plants.map((plant, index) => plantRow(plant, index)).join('') : '<p>No plants are listed for this Area.</p>'}</div><div class="analog-qr-space">QR CODE</div><div class="analog-print-footer">${printButton()}</div></div>`;
}

export async function renderAnalogPlant(target = app, encodedInstanceId) {
    app = target;
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = await getResolvedPlantInstance(instanceId, PROJECT_ID, SITE_ID, true);
    if (!plant || plant.unresolved) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderAnalogExplorer()">Back</button><h1>Plant unavailable</h1></div><div class="panel"><p>This plant reference could not be resolved.</p></div></div>`;
        return;
    }
    const fields = [['Scientific name', plant.scientificName], ['Cultivar', plant.cultivar], ['Family', plant.family], ['Origin', plant.origin], ['Plant type', plant.plantType], ['Layer', plant.layer], ['Uses', listValue(plant.uses)], ['Propagation', listValue(plant.propagation)], ['Local status', plant.status], ['Local notes', plant.localNotes]];
    app.innerHTML = `<div class="screen analog-explorer analog-profile analog-print-page"><header class="page-header analog-header"><button class="ghost analog-navigation" onclick="window.renderAnalogPlace('${escapeHtml(plant.placeId)}')">Back</button><p class="print-kicker">HILLYARDS FOOD FOREST Â· ${escapeHtml(plant.placeId)}</p><h1>${escapeHtml(plant.commonName)}</h1><p class="subtitle"><em>${escapeHtml(plant.scientificName)}</em></p></header><dl class="analog-profile-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not entered.')}</dd></div>`).join('')}</dl><div class="analog-qr-space">QR CODE</div><div class="analog-print-footer">${printButton()}</div></div>`;
}

export async function renderAnalogLibraryPlant(target = app, encodedPlantId) {
    app = target;
    const plantId = decodeURIComponent(encodedPlantId);
    const plant = (await loadPlantLibrary(true)).plants.find(item => item.id === plantId);
    if (!plant) {
        app.innerHTML = '<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderGlobalPlantList()">Back</button><h1>Plant unavailable</h1></div></div>';
        return;
    }
    const fields = [['Scientific name', plant.scientificName], ['Cultivar', plant.cultivar], ['Family', plant.family], ['Origin', plant.origin], ['Plant type', plant.plantType], ['Layer', plant.layer], ['Uses', listValue(plant.uses)], ['Propagation', listValue(plant.propagation)], ['Summary', plant.summary]];
    app.innerHTML = `<div class="screen analog-explorer analog-profile analog-print-page"><header class="page-header analog-header"><button class="ghost analog-navigation" onclick="window.renderGlobalPlantList()">Back</button><p class="print-kicker">NOURISHLAND PLANT LIBRARY</p><h1>${escapeHtml(plant.commonName || 'Unnamed plant')}</h1><p class="subtitle"><em>${escapeHtml(plant.scientificName || '')}</em></p></header><dl class="analog-profile-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not entered.')}</dd></div>`).join('')}</dl><div class="analog-qr-space">QR CODE</div><div class="analog-print-footer">${printButton()}</div></div>`;
}

export function applyAnalogFilters() {
    const query = document.getElementById('analogSearch')?.value.trim().toLowerCase() || '';
    const filters = [['analogPlaceFilter', 'place'], ['analogFamilyFilter', 'family'], ['analogLayerFilter', 'layer'], ['analogTypeFilter', 'type'], ['analogStatusFilter', 'status']];
    let visible = 0;
    document.querySelectorAll('[data-analog-plant]').forEach(row => {
        const matchesSearch = !query || row.dataset.search.includes(query);
        const matchesFilters = filters.every(([id, key]) => !document.getElementById(id)?.value || row.dataset[key] === document.getElementById(id).value);
        row.hidden = !(matchesSearch && matchesFilters);
        if (!row.hidden) visible += 1;
    });
    const count = document.getElementById('analogResultCount');
    if (count) count.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
}

