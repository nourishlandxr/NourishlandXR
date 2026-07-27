import { loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, saveMarkerAnchor } from '../services/persistence.js';
import { loadResolvedPlantsForPlace } from '../services/plantDataService.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
let currentGuide = null;

async function loadAreaPlants(projectId, siteId, placeId, visitor) {
    const [resolved, markers] = await Promise.all([
        loadResolvedPlantsForPlace(projectId, siteId, placeId, visitor),
        loadPlaceMarkers(projectId, siteId, placeId, visitor).catch(() => [])
    ]);
    const representedMarkers = new Set(resolved.map(plant => plant.markerId).filter(Boolean));
    const markerPlants = await Promise.all(markers.filter(marker => marker.type === 'plant' && !representedMarkers.has(marker.id)).map(async marker => {
        let profile = marker.plant_profile || {};
        if (marker.plant_profile_path) {
            profile = await loadPlantProfile(projectId, siteId, placeId, marker.id, visitor).catch(() => profile);
        }
        return {
            ...profile,
            instanceId: marker.plantInstanceId || `marker-${marker.id}`,
            markerId: marker.id,
            plantId: marker.plantId || '',
            placeId,
            commonName: profile.common_name || marker.name || 'Unnamed plant',
            scientificName: profile.scientific_name || '',
            family: profile.family || '',
            origin: profile.origin || '',
            plantType: profile.plant_type || '',
            layer: profile.layer || '',
            uses: profile.uses || '',
            propagation: profile.propagation || '',
            status: marker.status || '',
            localNotes: marker.notes || marker.description || profile.overview || '',
            summary: profile.overview || marker.description || ''
        };
    }));
    return [...resolved, ...markerPlants];
}

async function loadAreaGuideGroup(projectId, siteId, place, visitor) {
    const [plants, markers] = await Promise.all([
        loadAreaPlants(projectId, siteId, place.id, visitor),
        loadPlaceMarkers(projectId, siteId, place.id, visitor).catch(() => [])
    ]);
    return {
        place,
        plants,
        totems: markers.filter(marker => marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'),
        hasTotem: markers.some(marker => marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'),
        hasStartingPoint: markers.some(marker => marker.type === 'intro_checkpoint')
    };
}

async function loadGuide(projectId) {
    const project = (await loadProjects(true)).find(item => item.id === projectId);
    if (!project) throw new Error('This location is not public.');
    const sites = await loadProjectSites(project.id, true);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id, true);
        const placeGroups = await Promise.all(places.map(place => loadAreaGuideGroup(project.id, site.id, place, true)));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    const totems = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.totems.map(totem => ({ ...totem, siteId: group.site.id, siteName: group.site.name, placeId: placeGroup.place.id, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, totems, creator: false };
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
        const allPlaces = guide.siteGroups.flatMap(group => group.placeGroups.map(placeGroup => ({ ...placeGroup.place, siteName: group.site.name, count: placeGroup.plants.length, hasTotem: placeGroup.hasTotem, hasStartingPoint: placeGroup.hasStartingPoint })));
        const places = allPlaces.filter(place => place.name !== 'Unassigned');
        const unassignedCount = guide.plants.filter(plant => allPlaces.find(place => place.id === plant.placeId)?.name === 'Unassigned').length;
        const areaCards = places.map(place => {
            const symbols = `${place.hasStartingPoint ? '<i class="field-guide-starting-symbol" aria-label="Trail Entrance"></i>' : ''}${place.hasTotem ? '<i class="field-guide-totem-symbol" aria-label="Area Totem"></i>' : ''}`;
            const card = `<button class="field-guide-area-card" onclick="window.filterFieldGuidePlace('${escapeHtml(place.id)}')"><span class="field-guide-area-symbols" aria-hidden="false">${symbols || '<i class="field-guide-area-symbol" aria-label="Area"></i>'}</span><span><strong>${escapeHtml(place.name)}</strong><small>${place.count} plant${place.count === 1 ? '' : 's'}${place.hasTotem ? ' · Totem' : ''}${place.hasStartingPoint ? ' · Trail Entrance' : ''}</small></span></button>`;
            return creator ? `<div class="field-guide-area-manage">${card}<button type="button" onclick="window.renderProjectAreaDashboard('${encoded(guide.project.id)}','${encoded(place.id)}')">Open &amp; manage</button></div>` : card;
        }).join('');
        const totemLinks = places.flatMap(place => (Array.isArray(place.totem_links) ? place.totem_links : []).map(link => ({ from: place, to: places.find(candidate => candidate.id === link.target_area_id), ...link }))).filter(link => link.to);
        const totemDiagram = `<section><h2 class="project-section-title">Totem connections</h2><div class="totem-connection-diagram">${places.filter(place => place.hasTotem).map(place => `<span class="totem-node">${escapeHtml(place.name)}</span>`).join('')}${totemLinks.map(link => `<span class="totem-link">${escapeHtml(link.from.name)} → ${escapeHtml(link.to.name)}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}</span>`).join('') || '<p class="meta">Totems are shown here as they are placed. Walked-path connections can be added without tying the data to one headset.</p>'}</div></section>`;
        const totemCards = guide.totems.map(totem => {
            const information = Array.isArray(totem.information_bubbles) ? totem.information_bubbles : Array.isArray(totem.text_boxes) ? totem.text_boxes : [];
            const summary = totem.description || totem.notes || information.map(item => typeof item === 'string' ? item : item?.text || item?.content || '').filter(Boolean).join(' ');
            const body = `<span class="field-guide-card-icon field-guide-totem-icon" aria-hidden="true">⌖</span><span><strong>${escapeHtml(totem.name || `${totem.placeName} Totem`)}</strong><small>${escapeHtml(totem.placeName)} · Area checkpoint</small><small>${escapeHtml(summary || 'Information board ready for content.')}</small></span>`;
            return creator
                ? `<button class="field-guide-totem-card" data-field-guide-totem data-place="${escapeHtml(totem.placeId)}" data-search="${escapeHtml([totem.name, totem.placeName, summary].join(' ').toLowerCase())}" type="button" onclick="window.renderAreaCheckpointForm('${encoded(guide.project.id)}','${encoded(totem.placeId)}')">${body}</button>`
                : `<article class="field-guide-totem-card" data-field-guide-totem data-place="${escapeHtml(totem.placeId)}" data-search="${escapeHtml([totem.name, totem.placeName, summary].join(' ').toLowerCase())}">${body}</article>`;
        }).join('');
        const layers = [...new Set(guide.plants.map(plant => String(plant.layer || '').trim()).filter(Boolean))].sort();
        const addPlantAction = creator ? `<button class="field-guide-add-plant" type="button" onclick="window.renderLocationFieldMarker('${encoded(guide.project.id)}','plant','without-ar',true)">+ Add Plant</button>` : '';
        app.innerHTML = `<div class="screen field-guide field-guide-hub analog-print-page"><div class="page-header field-guide-header"><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>Field Guide</h1><p class="subtitle">Find, filter and open Plants, Areas and Totems.</p><div class="field-guide-summary"><span><strong>${guide.plants.length}</strong> Plants</span><span><strong>${places.length}</strong> Areas</span><span><strong>${guide.totems.length}</strong> Totems</span>${unassignedCount ? `<span class="is-unassigned"><strong>${unassignedCount}</strong> In Organizer Folder</span>` : ''}${addPlantAction}</div></div><section class="field-guide-search-deck"><div class="field"><label for="fieldGuideSearch">Deep search</label><input id="fieldGuideSearch" type="search" placeholder="Plants, Totems, Areas, layers, uses or notes…" oninput="window.applyFieldGuideFilter()" /></div><div class="field"><label for="fieldGuideLayer">Forest layer</label><select id="fieldGuideLayer" onchange="window.applyFieldGuideFilter()"><option value="">All layers</option>${layers.map(layer => `<option value="${escapeHtml(layer.toLowerCase())}">${escapeHtml(layer)}</option>`).join('')}</select></div></section><section><div class="field-guide-section-heading"><div><h2>Areas</h2><p>Choose an Area to filter its records below.</p></div><button type="button" onclick="window.applyFieldGuideFilter('')">Show all</button></div><div class="field-guide-place-cloud">${areaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section>${totemCards ? `<section><div class="field-guide-section-heading"><div><h2>Area Totems</h2><p>Area checkpoints and their information boards.</p></div></div><div class="field-guide-totem-grid">${totemCards}</div></section>` : ''}${totemLinks.length || places.some(place => place.hasTotem) ? totemDiagram : ''}<section><div class="field-guide-section-heading"><div><h2>Plant records</h2><p id="fieldGuideCount">${guide.plants.length} plant${guide.plants.length === 1 ? '' : 's'}</p></div></div><div class="analog-plant-list field-guide-plant-grid">${guide.plants.map(plant => `<button class="analog-plant-row field-guide-plant-card" data-field-guide-plant data-place="${escapeHtml(plant.placeId)}" data-layer="${escapeHtml(String(plant.layer || '').toLowerCase())}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.origin, plant.plantType, plant.layer, Array.isArray(plant.uses) ? plant.uses.join(' ') : plant.uses, plant.propagation, plant.localNotes, plant.summary, plant.placeId, plant.placeName].join(' ').toLowerCase())}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-card-icon" aria-hidden="true">🌿</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small><em>${escapeHtml(plant.scientificName || 'Scientific name not entered')}</em></small><small>${escapeHtml(plant.placeName === 'Unassigned' ? 'Organizer Folder · Area not assigned' : plant.placeName || plant.placeId)}${plant.layer ? ` · ${escapeHtml(plant.layer)}` : ''}</small></span></button>`).join('') || '<div class="panel"><p>No plant records yet.</p></div>'}</div></section><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button><button class="ghost analog-navigation" onclick="${backAction}">Back</button></div></div>`;
        const searchDeck = app.querySelector('.field-guide-search-deck');
        const advancedField = document.getElementById('fieldGuideLayer')?.closest('.field');
        if (searchDeck && advancedField) {
            advancedField.hidden = true;
            const advancedButton = document.createElement('button');
            advancedButton.type = 'button';
            advancedButton.className = 'field-guide-advanced-toggle';
            advancedButton.textContent = 'Advanced search';
            advancedButton.setAttribute('aria-expanded', 'false');
            advancedButton.addEventListener('click', () => {
                advancedField.hidden = !advancedField.hidden;
                advancedButton.setAttribute('aria-expanded', String(!advancedField.hidden));
            });
            searchDeck.insertBefore(advancedButton, advancedField);
        }
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
        const placeGroups = await Promise.all(places.map(place => loadAreaGuideGroup(project.id, site.id, place, false)));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    const totems = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.totems.map(totem => ({ ...totem, siteId: group.site.id, siteName: group.site.name, placeId: placeGroup.place.id, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, totems, creator: true };
    return currentGuide;
}

export function applyFieldGuideFilter(placeId = '') {
    const query = document.getElementById('fieldGuideSearch')?.value.trim().toLowerCase() || '';
    const layer = document.getElementById('fieldGuideLayer')?.value || '';
    let visible = 0;
    document.querySelectorAll('[data-field-guide-plant]').forEach(row => {
        row.hidden = Boolean((query && !row.dataset.search.includes(query)) || (layer && row.dataset.layer !== layer) || (placeId && String(row.dataset.place).toLowerCase() !== String(placeId).toLowerCase()));
        if (!row.hidden) visible += 1;
    });
    document.querySelectorAll('[data-field-guide-totem]').forEach(row => {
        row.hidden = Boolean((query && !row.dataset.search.includes(query)) || layer || (placeId && String(row.dataset.place).toLowerCase() !== String(placeId).toLowerCase()));
    });
    const count = document.getElementById('fieldGuideCount');
    if (count) count.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
}

export function openFieldGuidePlant(app, encodedInstanceId) {
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = currentGuide?.plants.find(item => item.instanceId === instanceId);
    if (!plant) throw new Error('Plant is unavailable.');
    const fields = [['Scientific name', plant.scientificName], ['Family', plant.family], ['Origin', plant.origin], ['Plant type', plant.plantType], ['Layer', plant.layer], ['Uses', Array.isArray(plant.uses) ? plant.uses.join(', ') : plant.uses], ['Propagation', Array.isArray(plant.propagation) ? plant.propagation.join(', ') : plant.propagation], ['Area', plant.placeName || plant.placeId], ['Local status', plant.status], ['Notes', plant.localNotes || plant.summary]];
    const positionAction = currentGuide.creator && plant.markerId ? `<section class="panel analog-navigation"><h2>Manage Plant</h2><div class="button-row"><button class="primary" onclick="window.openProjectEntry('${encoded(currentGuide.project.id)}','${encoded(plant.markerId)}')">Rename, move or edit profile</button><button onclick="window.positionFieldGuidePlant('${encoded(plant.instanceId)}')">Update current position</button></div><p id="fieldGuidePositionStatus" class="meta">${Number.isFinite(Number(plant.map?.latitude)) ? `${Number(plant.map.latitude).toFixed(6)}, ${Number(plant.map.longitude).toFixed(6)}` : 'No position saved.'}</p></section>` : '';
    app.innerHTML = `<div class="screen field-guide analog-print-page"><div class="page-header"><button class="ghost analog-navigation" onclick="window.renderFieldGuide('${encoded(currentGuide.project.id)}', ${currentGuide.creator})">Back</button><p class="print-kicker">${escapeHtml(currentGuide.project.name).toUpperCase()} FIELD GUIDE</p><h1>${escapeHtml(plant.commonName || 'Unnamed plant')}</h1><p class="subtitle"><em>${escapeHtml(plant.scientificName || '')}</em></p></div><dl class="analog-profile-grid">${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value || 'Not entered.')}</dd></div>`).join('')}</dl>${positionAction}<div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button></div></div>`;
}

export function positionFieldGuidePlant(encodedInstanceId) {
    const instanceId = decodeURIComponent(encodedInstanceId);
    const plant = currentGuide?.creator && currentGuide.plants.find(item => item.instanceId === instanceId);
    const status = document.getElementById('fieldGuidePositionStatus');
    if (!plant?.markerId || !navigator.geolocation) { if (status) status.textContent = 'Current location is unavailable.'; return; }
    status.textContent = 'Capturing current position…';
    navigator.geolocation.getCurrentPosition(async position => {
        try {
            const anchor = await saveMarkerAnchor(currentGuide.project.id, plant.siteId, plant.placeId, plant.markerId, { type: 'gps', latitude: position.coords.latitude, longitude: position.coords.longitude, altitude: position.coords.altitude ?? '', accuracy: position.coords.accuracy, captured_at: new Date(position.timestamp).toISOString() });
            plant.map = { ...(plant.map || {}), latitude: anchor.latitude, longitude: anchor.longitude };
            status.textContent = `Position saved: ${Number(anchor.latitude).toFixed(6)}, ${Number(anchor.longitude).toFixed(6)} · accuracy ${Math.round(Number(anchor.accuracy))} m`;
        } catch (error) { status.textContent = `Position could not be saved: ${error.message}`; }
    }, error => { status.textContent = error.code === 1 ? 'Location permission was denied.' : 'Current position could not be captured.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}
