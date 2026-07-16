import { loadProjectSites, loadProjects, loadSitePlaces } from '../services/persistence.js';
import { loadResolvedPlantsForPlace } from '../services/plantDataService.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
let currentGuide = null;

async function loadGuide(projectId) {
    const project = (await loadProjects(true)).find(item => item.id === projectId);
    if (!project) throw new Error('This location is not public.');
    const sites = await loadProjectSites(project.id, true);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id, true);
        const placeGroups = await Promise.all(places.map(async place => ({ place, plants: await loadResolvedPlantsForPlace(project.id, site.id, place.id, true) })));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, creator: false };
    return currentGuide;
}

export async function renderFieldGuideProjects(app) {
    const projects = (await loadProjects(true)).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    app.innerHTML = `<div class="screen field-guide"><div class="page-header"><button class="ghost" onclick="window.renderV1Explorer()">Back</button><p class="welcome-label">Field Guide</p><h1>Choose a location</h1><p class="subtitle">Browse plants, maps and information.</p></div><div class="menu-stack">${projects.map(project => `<button class="menu-card" onclick="window.renderFieldGuide('${encoded(project.id)}')"><strong>${escapeHtml(project.name)} Field Guide</strong><span>Location notebook and plant records</span></button>`).join('') || '<div class="panel"><p>No public locations are available.</p></div>'}</div></div>`;
}

export async function renderFieldGuide(app, encodedProjectId, creator = false) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const guide = creator ? await loadCreatorGuide(projectId) : await loadGuide(projectId);
        const backAction = creator ? `window.renderProjectDashboard('${encoded(projectId)}')` : `window.renderVisitorLocationIntro('${encoded(projectId)}')`;
        const places = guide.siteGroups.flatMap(group => group.placeGroups.map(placeGroup => ({ ...placeGroup.place, siteName: group.site.name, count: placeGroup.plants.length })));
        app.innerHTML = `<div class="screen field-guide analog-print-page"><div class="page-header"><button class="ghost analog-navigation" onclick="${backAction}">Back</button><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>Field Guide</h1><p class="subtitle">A living field notebook generated from project data.</p></div><section class="panel"><h2>Project overview</h2><p>${escapeHtml(guide.project.description || 'Explore the public places and plant knowledge connected to this project.')}</p></section><section class="analog-filter-panel analog-navigation"><div class="field"><label for="fieldGuideSearch">Search the guide</label><input id="fieldGuideSearch" type="search" placeholder="Plant, scientific name, place..." oninput="window.applyFieldGuideFilter()" /></div></section><section><h2 class="project-section-title">Places</h2><div class="field-guide-place-cloud">${places.map(place => `<button onclick="window.filterFieldGuidePlace('${escapeHtml(place.id)}')"><strong>${escapeHtml(place.name)}</strong><span>${place.count} plant${place.count === 1 ? '' : 's'}</span></button>`).join('') || '<p class="meta">No public places are available yet.</p>'}</div></section><section><h2 class="project-section-title">Plants</h2><p id="fieldGuideCount" class="meta">${guide.plants.length} plant${guide.plants.length === 1 ? '' : 's'}</p><div class="analog-plant-list">${guide.plants.map(plant => `<button class="analog-plant-row" data-field-guide-plant data-place="${escapeHtml(plant.placeId)}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.placeId, plant.placeName].join(' ').toLowerCase())}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small><em>${escapeHtml(plant.scientificName || 'Scientific name not entered')}</em> · ${escapeHtml(plant.placeName || plant.placeId)}</small></span></button>`).join('') || '<div class="panel"><p>No plants have been published for this project.</p></div>'}</div></section><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button></div></div>`;
        app.innerHTML = app.innerHTML
            .replace('generated from project data', 'generated from location data')
            .replace('Project overview', 'Location overview')
            .replace('connected to this project', 'connected to this location')
            .replace('published for this project', 'published for this location');
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderFieldGuideProjects()">Back</button><h1>Field Guide unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function loadCreatorGuide(projectId) {
    const project = (await loadProjects()).find(item => item.id === projectId);
    if (!project) throw new Error('Location not found.');
    const sites = await loadProjectSites(project.id);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id);
        const placeGroups = await Promise.all(places.map(async place => ({ place, plants: await loadResolvedPlantsForPlace(project.id, site.id, place.id, false) })));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, creator: true };
    return currentGuide;
}

export function applyFieldGuideFilter(placeId = '') {
    const query = document.getElementById('fieldGuideSearch')?.value.trim().toLowerCase() || '';
    let visible = 0;
    document.querySelectorAll('[data-field-guide-plant]').forEach(row => {
        row.hidden = Boolean((query && !row.dataset.search.includes(query)) || (placeId && String(row.dataset.place).toLowerCase() !== String(placeId).toLowerCase()));
        if (!row.hidden) visible += 1;
    });
    const count = document.getElementById('fieldGuideCount');
    if (count) count.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
}

export function openFieldGuidePlant(app, encodedInstanceId) {
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = currentGuide?.plants.find(item => item.instanceId === instanceId);
    if (!plant) throw new Error('Plant is unavailable.');
    const fields = [['Scientific name', plant.scientificName], ['Family', plant.family], ['Origin', plant.origin], ['Plant type', plant.plantType], ['Layer', plant.layer], ['Uses', Array.isArray(plant.uses) ? plant.uses.join(', ') : plant.uses], ['Propagation', Array.isArray(plant.propagation) ? plant.propagation.join(', ') : plant.propagation], ['Place', plant.placeName || plant.placeId], ['Local status', plant.status], ['Notes', plant.localNotes || plant.summary]];
    app.innerHTML = `<div class="screen field-guide analog-print-page"><div class="page-header"><button class="ghost analog-navigation" onclick="window.renderFieldGuide('${encoded(currentGuide.project.id)}', ${currentGuide.creator})">Back</button><p class="print-kicker">${escapeHtml(currentGuide.project.name).toUpperCase()} FIELD GUIDE</p><h1>${escapeHtml(plant.commonName || 'Unnamed plant')}</h1><p class="subtitle"><em>${escapeHtml(plant.scientificName || '')}</em></p></div><dl class="analog-profile-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not entered.')}</dd></div>`).join('')}</dl><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button></div></div>`;
}
