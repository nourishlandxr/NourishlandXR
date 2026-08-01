import { loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces } from '../services/persistence.js';
import { DEFAULT_HOME_AREA_NAME, isDefaultHomeArea } from '../services/arExperienceConfig.js';

let currentPrintCenter = null;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const markerType = marker => marker?.semantic_type === 'area_checkpoint' ? 'area_checkpoint' : marker?.type;
const isPlant = marker => markerType(marker) === 'plant';
const isTotem = marker => markerType(marker) === 'area_checkpoint';
const areaLabel = place => isDefaultHomeArea(place) ? DEFAULT_HOME_AREA_NAME : String(place?.name || DEFAULT_HOME_AREA_NAME);
const profileValue = (profile, key) => {
    const value = profile?.[key];
    return Array.isArray(value) ? value.join(', ') : String(value || '').trim();
};

async function loadPrintData(projectId) {
    const project = (await loadProjects()).find(item => String(item.id) === String(projectId));
    if (!project) throw new Error('Project not found.');
    const sites = await loadProjectSites(project.id);
    const site = sites.find(item => item.id === 'main_food_forest') || sites[0];
    if (!site) throw new Error('Project has no Location yet.');
    const places = await loadSitePlaces(project.id, site.id);
    const placeData = await Promise.all(places.map(async place => {
        const markers = await loadPlaceMarkers(project.id, site.id, place.id).catch(() => []);
        const plants = markers.filter(isPlant);
        const totems = markers.filter(isTotem);
        const plantProfiles = await Promise.all(plants.map(async marker => {
            let profile = marker.plant_profile || {};
            if (marker.plant_profile_path) profile = await loadPlantProfile(project.id, site.id, place.id, marker.id).catch(() => profile);
            return { marker, profile };
        }));
        return { place, plants, totems, plantProfiles };
    }));
    return {
        project,
        site,
        places: placeData,
        plants: placeData.flatMap(group => group.plantProfiles.map(item => ({ ...item, place: group.place }))),
        totems: placeData.flatMap(group => group.totems.map(marker => ({ marker, place: group.place })))
    };
}

function printCenterButton(label, description, action, className = '') {
    return `<button class="print-center-action ${className}" type="button" onclick="${action}"><strong>${label}</strong><span>${description}</span></button>`;
}

function printCenterMarkup(data) {
    const projectId = encoded(data.project.id);
    const defaultCopies = Math.max(1, Math.min(data.totems.length || 1, 12));
    return `<div class="screen print-center-screen" data-print-center>
        <header class="page-header print-center-header">
            <button class="ghost" type="button" onclick="window.renderProjectDashboard('${projectId}')">Back to Dashboard</button>
            <p class="welcome-label">Project workspace</p>
            <h1>Anchors &amp; Prints</h1>
            <p class="subtitle">Prepare physical tags and printable project information in one place.</p>
        </header>
        <section class="print-center-section print-center-anchors" aria-labelledby="printAnchorsTitle">
            <div class="print-center-section-heading"><div><p class="welcome-label">Anchors</p><h2 id="printAnchorsTitle">Print anchors</h2></div><span class="print-center-count">${data.plants.length} Plants · ${data.totems.length} Totems</span></div>
            <div class="print-center-card-grid">
                <article class="print-center-card">
                    <div><h3>Plant tags</h3><p>Make simple labels for selected plants.</p></div>
                    <div class="print-center-form-grid">
                        <label>Range<select id="printPlantTagRange" onchange="window.updatePrintRangeFields()"><option value="all">All plants (${data.plants.length})</option><option value="first-10">First 10</option><option value="first-25">First 25</option><option value="custom">Custom range</option></select></label>
                        <label>Size<select id="printPlantTagSize"><option value="small">Small · 50 × 30 mm</option><option value="medium" selected>Medium · 70 × 40 mm</option><option value="large">Large · 100 × 60 mm</option></select></label>
                    </div>
                    <div id="printPlantCustomRange" class="print-center-custom-range" hidden><label>From<input id="printPlantTagStart" type="number" min="1" value="1" /></label><label>To<input id="printPlantTagEnd" type="number" min="1" value="${Math.max(1, Math.min(data.plants.length || 1, 10))}" /></label></div>
                    ${printCenterButton('Print plant tags', 'Print the selected range.', `window.printCenterOutput('plant-tags')`, 'primary')}
                </article>
                <article class="print-center-card">
                    <div><h3>Totem Tags</h3><p>Print numbered tags for Totems in this project.</p></div>
                    <div class="print-center-form-grid">
                        <label>Number<input id="printTotemTagCount" type="number" min="1" max="24" value="${defaultCopies}" /></label>
                        <label>Size<select id="printTotemTagSize"><option value="small">Small · 70 × 45 mm</option><option value="medium" selected>Medium · A6</option><option value="large">Large · A5</option></select></label>
                    </div>
                    ${printCenterButton('Print Totem Tags', 'Choose the number and size.', `window.printCenterOutput('totem-tags')`, 'primary')}
                </article>
            </div>
        </section>
        <section class="print-center-section print-center-information" aria-labelledby="printInfoTitle">
            <div class="print-center-section-heading"><div><p class="welcome-label">Prints</p><h2 id="printInfoTitle">Print info</h2></div></div>
            <div class="print-center-info-grid">
                ${printCenterButton('Plant lists', 'A compact list of every Plant and Area.', `window.printCenterOutput('plant-list')`)}
                ${printCenterButton('Plant profiles', 'Printable profile sheets for every Plant.', `window.printCenterOutput('plant-profiles')`)}
                ${printCenterButton('Map', 'Open the project Map with a print action.', `window.renderLocationMap('${projectId}', true, 'print-center')`)}
            </div>
        </section>
    </div>`;
}

function plantTagMarkup(plant, index, size) {
    const profile = plant.profile || {};
    return `<article class="print-tag plant-tag print-tag-${escapeHtml(size)}"><span class="print-tag-index">PLANT TAG ${String(index + 1).padStart(3, '0')}</span><h2>${escapeHtml(plant.marker.name || 'Unnamed plant')}</h2><p><em>${escapeHtml(profileValue(profile, 'scientificName') || profileValue(profile, 'scientific_name') || 'Scientific name not entered')}</em></p><small>${escapeHtml(areaLabel(plant.place))}</small></article>`;
}

function totemTagMarkup(data, index, size) {
    const item = data.totems[index % Math.max(data.totems.length, 1)];
    const place = item?.place;
    const marker = item?.marker;
    const label = place ? areaLabel(place) : `Totem ${String(index + 1).padStart(2, '0')}`;
    const color = /^#[0-9a-f]{6}$/i.test(marker?.appearance?.color || '') ? marker.appearance.color : '#5d8b62';
    return `<article class="print-tag totem-tag print-tag-${escapeHtml(size)}" style="--print-totem-color:${color}"><span class="print-tag-index">TOTEM TAG ${String(index + 1).padStart(3, '0')}</span><span class="print-totem-mark" aria-hidden="true">⌖</span><h2>${escapeHtml(label)}</h2><p>Area anchor</p><small>Place this tag at the Totem location.</small></article>`;
}

function printSheet(data, kind, options = {}) {
    const projectId = encoded(data.project.id);
    const back = `window.renderPrintCenter('${projectId}')`;
    if (kind === 'plant-tags') {
        const range = options.range || 'all';
        let start = range === 'custom' ? Number(options.start || 1) - 1 : 0;
        let end = range === 'first-10' ? 10 : range === 'first-25' ? 25 : data.plants.length;
        if (range === 'custom') end = Number(options.end || start + 1);
        start = Math.max(0, Math.min(start, data.plants.length));
        end = Math.max(start + 1, Math.min(Number(end), data.plants.length));
        const plants = data.plants.slice(start, end);
        return { title: 'Plant tags', subtitle: `${plants.length} selected · ${data.project.name}`, className: `print-sheet-tags print-sheet-${options.size || 'medium'}`, body: plants.map((plant, index) => plantTagMarkup(plant, start + index, options.size || 'medium')).join('') || '<p>No Plants are available for this range.</p>', back };
    }
    if (kind === 'totem-tags') {
        const count = Math.max(1, Math.min(24, Number(options.count) || 1));
        return { title: 'Totem Tags', subtitle: `${count} tag${count === 1 ? '' : 's'} · ${data.project.name}`, className: `print-sheet-tags print-sheet-${options.size || 'medium'}`, body: Array.from({ length: count }, (_, index) => totemTagMarkup(data, index, options.size || 'medium')).join(''), back };
    }
    if (kind === 'plant-list') {
        return { title: 'Plant list', subtitle: `${data.plants.length} Plants · ${data.project.name}`, className: 'print-sheet-information', body: `<ol class="print-plant-list">${data.plants.map(item => `<li><strong>${escapeHtml(item.marker.name || 'Unnamed plant')}</strong><span><em>${escapeHtml(profileValue(item.profile, 'scientificName') || profileValue(item.profile, 'scientific_name') || 'Scientific name not entered')}</em> · ${escapeHtml(areaLabel(item.place))}</span></li>`).join('') || '<li>No Plants are available.</li>'}</ol>`, back };
    }
    return { title: 'Plant profiles', subtitle: `${data.plants.length} profiles · ${data.project.name}`, className: 'print-sheet-information print-sheet-profiles', body: data.plants.map(item => `<article class="print-profile-card"><h2>${escapeHtml(item.marker.name || 'Unnamed plant')}</h2><p class="print-profile-scientific"><em>${escapeHtml(profileValue(item.profile, 'scientificName') || profileValue(item.profile, 'scientific_name') || 'Scientific name not entered')}</em></p><dl><div><dt>Area</dt><dd>${escapeHtml(areaLabel(item.place))}</dd></div><div><dt>Family</dt><dd>${escapeHtml(profileValue(item.profile, 'family') || 'Not entered')}</dd></div><div><dt>Uses</dt><dd>${escapeHtml(profileValue(item.profile, 'uses') || 'Not entered')}</dd></div><div><dt>Notes</dt><dd>${escapeHtml(profileValue(item.profile, 'localNotes') || profileValue(item.profile, 'summary') || item.marker.description || 'Not entered')}</dd></div></dl></article>`).join('') || '<p>No Plant profiles are available.</p>', back };
}

export async function renderPrintCenter(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        currentPrintCenter = await loadPrintData(projectId);
        app.innerHTML = printCenterMarkup(currentPrintCenter);
        updatePrintRangeFields();
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Prints unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export function updatePrintRangeFields() {
    const range = document.getElementById('printPlantTagRange');
    const custom = document.getElementById('printPlantCustomRange');
    if (custom) custom.hidden = range?.value !== 'custom';
}

export function printCenterOutput(app, kind) {
    if (!currentPrintCenter) return;
    const options = kind === 'plant-tags'
        ? { range: document.getElementById('printPlantTagRange')?.value || 'all', start: document.getElementById('printPlantTagStart')?.value, end: document.getElementById('printPlantTagEnd')?.value, size: document.getElementById('printPlantTagSize')?.value || 'medium' }
        : { count: document.getElementById('printTotemTagCount')?.value, size: document.getElementById('printTotemTagSize')?.value || 'medium' };
    const sheet = printSheet(currentPrintCenter, kind, options);
    app.innerHTML = `<div class="screen print-output-screen"><header class="page-header print-output-header"><button class="ghost" type="button" onclick="${sheet.back}">Back to Anchors &amp; Prints</button><p class="welcome-label">Print workspace</p><h1>${sheet.title}</h1><p class="subtitle">${sheet.subtitle}</p><button class="print-sheet-action" type="button" onclick="window.print()">Print</button></header><main class="print-sheet ${sheet.className}">${sheet.body}</main></div>`;
    window.setTimeout(() => window.print(), 80);
}
