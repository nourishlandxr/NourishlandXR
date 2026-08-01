import { loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, saveMarkerAnchor } from '../services/persistence.js';
import { loadResolvedPlantsForPlace } from '../services/plantDataService.js';
import { DEFAULT_HOME_AREA_NAME, areaIcon, isDefaultHomeArea } from '../services/arExperienceConfig.js';
import { DEFAULT_TOTEM_COLOR } from '../services/totemAppearance.js';
import { physicalMarkerLabel } from '../services/physicalAnchor.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
let currentGuide = null;
let currentGuidePlaceId = '';

async function loadAreaPlants(projectId, siteId, placeId, visitor) {
    const [resolved, markers] = await Promise.all([
        loadResolvedPlantsForPlace(projectId, siteId, placeId, visitor),
        loadPlaceMarkers(projectId, siteId, placeId, visitor).catch(() => [])
    ]);
    const markerById = new Map(markers.map(marker => [marker.id, marker]));
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
            summary: profile.overview || marker.description || '',
            physicalAnchor: marker.physicalAnchor || null,
            virtualTagEnabled: profile.virtual_tag_enabled === true
        };
    }));
    const resolvedPlants = await Promise.all(resolved.map(async plant => {
        if (!plant.markerId) return { ...plant, virtualTagEnabled: false };
        const profile = await loadPlantProfile(projectId, siteId, placeId, plant.markerId, visitor).catch(() => ({}));
        return { ...plant, physicalAnchor: markerById.get(plant.markerId)?.physicalAnchor || null, virtualTagEnabled: profile.virtual_tag_enabled === true };
    }));
    return [...resolvedPlants, ...markerPlants];
}

async function loadAreaGuideGroup(projectId, siteId, place, visitor) {
    const [plants, markers] = await Promise.all([
        loadAreaPlants(projectId, siteId, place.id, visitor),
        loadPlaceMarkers(projectId, siteId, place.id, visitor).catch(() => [])
    ]);
    const anchorStates = await Promise.all(markers.map(marker => loadMarkerAnchor(projectId, siteId, place.id, marker.id, visitor).catch(() => null)));
    const markerAnchorItems = markers.map((marker, index) => ({ marker, anchor: anchorStates[index] }));
    const placedItems = markerAnchorItems.filter(item => item.anchor?.type === 'spatial');
    const anchoredItems = markerAnchorItems.filter(item => String(item.marker?.physicalAnchor?.markerId ?? '').trim() !== '');
    return {
        place,
        plants,
        markerCount: markers.length,
        placedCount: placedItems.length,
        placedItems,
        anchoredCount: anchoredItems.length,
        anchoredItems,
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
        const places = await loadSitePlaces(project.id, site.id, true).catch(() => []);
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

function applyCreatorWebHubCopy(app) {
    const header = app.querySelector('.field-guide-header');
    const title = header?.querySelector('h1');
    if (title) title.textContent = 'Web Hub';
    header?.querySelector('.field-guide-header-subtitle')?.remove();
    const snapshotTitle = app.querySelector('#fieldGuideEssentialsTitle');
    if (snapshotTitle) snapshotTitle.textContent = 'Project overview';
    const areasTitle = app.querySelector('#fieldGuideAreasTitle');
    if (areasTitle) areasTitle.textContent = 'Areas';
    const searchTitle = app.querySelector('#fieldGuidePlantSearchTitle');
    if (searchTitle) searchTitle.textContent = 'Search plants';
    const searchLabel = app.querySelector('label[for="fieldGuideSearch"]');
    if (searchLabel) searchLabel.textContent = 'Search';
    const creativeTitle = app.querySelector('#fieldGuideCreativeToolsTitle');
    if (creativeTitle) creativeTitle.textContent = 'Creative Features';
    const anchorsTitle = app.querySelector('#fieldGuideAnchorsTitle');
    if (anchorsTitle) anchorsTitle.textContent = 'Anchored Elements';
    const overview = app.querySelector('.field-guide-essentials');
    const creationActions = overview?.querySelector('.field-guide-creation-actions');
    if (overview && creationActions) {
        const actionSection = document.createElement('section');
        actionSection.className = 'field-guide-primary-actions';
        actionSection.setAttribute('aria-label', 'Add to project');
        actionSection.append(creationActions);
        overview.after(actionSection);
    }
    const plantList = app.querySelector('.field-guide-plant-grid');
    if (plantList && !plantList.closest('.field-guide-all-plants')) {
        const details = document.createElement('details');
        details.className = 'field-guide-all-plants';
        const summary = document.createElement('summary');
        summary.innerHTML = '<strong>All plants</strong><span class="field-guide-all-plants-count"></span><span class="field-guide-details-chevron" aria-hidden="true">⌄</span>';
        plantList.parentNode.insertBefore(details, plantList);
        details.append(summary, plantList);
    }
}

export async function renderFieldGuide(app, encodedProjectId, creator = false) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const guide = creator ? await loadCreatorGuide(projectId) : await loadGuide(projectId);
        const backAction = creator ? `window.renderProjectDashboard('${encoded(projectId)}')` : `window.renderVisitorLocationIntro('${encoded(projectId)}')`;
        const guideTitle = creator ? 'Web Hub' : 'Field Guide';
        const allPlaces = guide.siteGroups.flatMap(group => group.placeGroups.map(placeGroup => ({ ...placeGroup.place, siteName: group.site.name, siteId: group.site.id, count: placeGroup.plants.length, markerCount: placeGroup.markerCount, placedCount: placeGroup.placedCount, placedItems: placeGroup.placedItems, anchoredCount: placeGroup.anchoredCount, anchoredItems: placeGroup.anchoredItems, totems: placeGroup.totems, hasTotem: placeGroup.hasTotem, hasStartingPoint: placeGroup.hasStartingPoint })));
        const homePlace = allPlaces.find(isDefaultHomeArea) || null;
        const places = allPlaces;
        const orderedPlaces = [...places].sort((first, second) => Number(isDefaultHomeArea(second)) - Number(isDefaultHomeArea(first)));
        const homeCount = guide.plants.filter(plant => isDefaultHomeArea(allPlaces.find(place => place.id === plant.placeId))).length;
        const unassignedCount = homeCount; // Compatibility alias for the existing summary template.
        guide.plants.forEach(plant => {
            if (isDefaultHomeArea(plant.placeName)) plant.placeName = DEFAULT_HOME_AREA_NAME;
        });
        const areaCards = places.map(place => {
            const symbols = `${place.hasStartingPoint ? '<i class="field-guide-starting-symbol" aria-label="Trail Entrance"></i>' : ''}${place.hasTotem ? '<i class="field-guide-totem-symbol" aria-label="Totem Marker"></i>' : ''}`;
            const action = creator
                ? `window.renderProjectAreaDashboard('${encoded(guide.project.id)}','${encoded(place.id)}')`
                : `window.filterFieldGuidePlace('${escapeHtml(place.id)}')`;
            const icon = `<i class="field-guide-fireplace-symbol" aria-label="Open Area">${areaIcon(place)}</i>${creator ? '' : symbols}`;
            return `<button class="field-guide-area-card${creator ? ' is-creator-area' : ''}" onclick="${action}"><span class="field-guide-area-symbols" aria-hidden="false">${icon}</span><span><strong>${escapeHtml(place.name)}</strong><small>${place.count} plant${place.count === 1 ? '' : 's'}${place.hasTotem ? ' · Totem' : ''}${place.hasStartingPoint ? ' · Trail Entrance' : ''}</small></span></button>`;
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
        const virtualTags = creator ? guide.plants.filter(plant => plant.virtualTagEnabled === true || plant.virtual_tag_enabled === true) : [];
        const virtualTagRows = virtualTags.map(plant => {
            let markerLabel = 'Profile selected · no ArUco linked';
            try {
                if (plant.physicalAnchor?.enabled) markerLabel = `Live · ${physicalMarkerLabel(plant.physicalAnchor.markerId)}`;
            } catch {}
            return `<button type="button" class="field-guide-virtual-tag-row${plant.physicalAnchor?.enabled ? ' is-live' : ''}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-virtual-tag-symbol" aria-hidden="true">▦</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small>${escapeHtml(plant.placeName || plant.placeId)} · ${escapeHtml(markerLabel)}</small></span><b>${plant.physicalAnchor?.enabled ? 'LIVE' : 'Open'}</b></button>`;
        }).join('');
        const virtualTagsSection = creator ? `<details class="field-guide-preparation field-guide-virtual-tags"><summary><span><strong>Plant Live Tags</strong><small>${virtualTags.length} selected · ${virtualTags.filter(plant => plant.physicalAnchor?.enabled).length} live</small></span><span aria-hidden="true">▾</span></summary><div class="field-guide-virtual-tags-body"><p>Plant Live Tags become live when an ArUco marker is linked from the Plant profile.</p><p>Scan a Plant Live Tag to discover the plant, its stories and its relationships with the surrounding ecosystem.</p>${virtualTagRows || '<p class="meta">No Plant profiles are selected yet.</p>'}</div></details>` : '';
        currentGuidePlaceId = '';
        const creationBoard = creator ? `<section class="field-guide-creation-board" aria-label="Add information"><div class="field-guide-creation-actions"><button type="button" onclick="window.renderLocationFieldMarker('${encoded(guide.project.id)}','plant','without-ar',true)"><strong>+ Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${encoded(guide.project.id)}','field-guide')"><strong>+ Area</strong></button></div></section>` : '';
        const placedCount = allPlaces.reduce((sum, place) => sum + place.placedCount, 0);
        const placedByArea = allPlaces.filter(place => place.placedCount > 0).map(place => `<span class="field-guide-element-chip"><strong>${place.placedCount}</strong> ${escapeHtml(place.name)}</span>`).join('');
        const elementSummary = creator ? `<section class="field-guide-preparation field-guide-elements-summary" aria-labelledby="fieldGuideElementsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideElementsTitle">Elements</h2><p>Global summary of placed items, grouped by Area.</p></div></div><details class="field-guide-anchor-readiness" open><summary><span aria-hidden="true">⌖</span><div><strong>${placedCount} placed element${placedCount === 1 ? '' : 's'}</strong><p>Plant records remain in the list below.</p></div></summary><div class="field-guide-element-chips">${placedByArea || '<p>No placed elements yet.</p>'}</div></details></section>` : '';
        const anchoredCount = allPlaces.reduce((sum, place) => sum + place.anchoredCount, 0);
        const anchoredItems = allPlaces.flatMap(place => place.anchoredItems.map(item => ({ ...item, place })));
        const anchoredRows = anchoredItems.map(({ marker, anchor, place }) => {
            const action = marker.type === 'area_checkpoint' || marker.semantic_type === 'area_checkpoint'
                ? `window.renderAreaCheckpointForm('${encoded(guide.project.id)}','${encoded(place.id)}')`
                : marker.type === 'intro_checkpoint'
                    ? `window.renderStartingPointForm('${encoded(guide.project.id)}','${encoded(place.id)}','field-guide')`
                    : `window.openProjectEntry('${encoded(guide.project.id)}','${encoded(marker.id)}',false,'field-guide')`;
            return `<button type="button" onclick="${action}"><span><strong>${escapeHtml(marker.name || 'Anchored item')}</strong><small>${escapeHtml(place.name)} · ${escapeHtml(String(anchor.type).toUpperCase())}</small></span><b>Edit</b></button>`;
        }).join('');
        const preparationTools = creator ? `<section class="field-guide-preparation field-guide-visual-guide" aria-labelledby="fieldGuideVisualGuideTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideVisualGuideTitle">Visual Guide</h2><p>See Areas and their spatial organisation on a map.</p></div></div><div class="field-guide-preparation-grid is-single-action"><button type="button" onclick="window.renderLocationMap('${encoded(guide.project.id)}',true,'field-guide')"><strong>Map</strong><span>View the landscape and its Areas visually.</span></button></div></section><section class="field-guide-preparation field-guide-creative-tools" aria-labelledby="fieldGuideCreativeToolsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideCreativeToolsTitle">Creative Features</h2><p>Shape how visitors discover and experience this place.</p></div></div><div class="field-guide-preparation-grid"><button type="button" onclick="window.renderStartingPoints('${encoded(guide.project.id)}')"><strong>Visitor Entrances</strong><span>Create a guided beginning for visitors.</span></button><details class="field-guide-special-elements"><summary><strong>Special Elements</strong><span>Preview future V2 capabilities.</span></summary><div class="field-guide-special-copy"><p>Special Elements are planned for a future V2 release, bringing richer ways to tell stories in place.</p><ul><li>Videos and moving image</li><li>3D models and spatial objects</li><li>Voice guidance and sound</li><li>More interactive visitor features</li></ul></div></details></div></section><section class="field-guide-preparation" aria-labelledby="fieldGuideAnchorsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAnchorsTitle">Physical Anchors</h2><p>Only elements successfully connected to physical space appear here.</p></div></div><details class="field-guide-anchor-readiness" open><summary><span aria-hidden="true">⌖</span><div><strong>${anchoredCount} anchored element${anchoredCount === 1 ? '' : 's'}</strong><p>Review or edit successful physical-space connections.</p></div></summary><div class="field-guide-anchored-list">${anchoredRows || '<p>No elements are anchored yet.</p>'}</div></details></section>` : '';
        const locationResetAction = creator && homePlace
            ? `window.filterFieldGuidePlace('${escapeHtml(homePlace.id)}')`
            : "window.filterFieldGuidePlace('')";
        if (creator) {
            const creatorAreaCards = orderedPlaces.map(place => {
                const totem = place.totems?.[0];
                const totemColor = /^#[0-9a-f]{6}$/i.test(totem?.appearance?.color || '') ? totem.appearance.color : DEFAULT_TOTEM_COLOR;
                const action = isDefaultHomeArea(place)
                    ? `window.filterFieldGuidePlace('${escapeHtml(place.id)}')`
                    : `window.renderProjectAreaDashboard('${encoded(guide.project.id)}','${encoded(place.id)}')`;
                const searchText = [place.name, place.siteName, 'area'].join(' ').toLowerCase();
                const totemMarkup = place.hasTotem
                    ? `<span class="field-guide-area-totem" style="--area-totem-color:${totemColor}" aria-label="Totem Marker" title="Totem Marker">&#x2316;</span>`
                    : '<span class="field-guide-area-totem is-empty" aria-label="No Totem Marker">&#x25CB;</span>';
                const areaMeta = isDefaultHomeArea(place)
                    ? `<b>${place.count}</b> plant${place.count === 1 ? '' : 's'} &#x00B7; Unassigned`
                    : `<b>${place.count}</b> plant${place.count === 1 ? '' : 's'}`;
                const areaLabel = isDefaultHomeArea(place) ? DEFAULT_HOME_AREA_NAME : place.name;
                return `<button class="field-guide-area-card is-creator-area${isDefaultHomeArea(place) ? ' is-home-area' : ''}" data-field-guide-area data-place="${escapeHtml(place.id)}" data-search="${escapeHtml(searchText)}" type="button" aria-label="${escapeHtml(`${areaLabel}${place.siteName ? `, ${place.siteName}` : ''}`)}" onclick="${action}"><span class="field-guide-area-icon" aria-hidden="true">${areaIcon(place)}</span><span class="field-guide-area-copy"><strong>${escapeHtml(areaLabel)}</strong><small>${areaMeta}</small></span><span class="field-guide-area-totem-slot">${totemMarkup}</span></button>`;
            }).join('');
            const plantRows = guide.plants.map(plant => `<button class="analog-plant-row field-guide-plant-card" data-field-guide-plant data-place="${escapeHtml(plant.placeId)}" data-layer="${escapeHtml(String(plant.layer || '').toLowerCase())}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.origin, plant.plantType, plant.layer, Array.isArray(plant.uses) ? plant.uses.join(' ') : plant.uses, plant.propagation, plant.localNotes, plant.summary, plant.placeId, plant.placeName].join(' ').toLowerCase())}" type="button" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-card-icon" aria-hidden="true">&#x1F33F;</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small><em>${escapeHtml(plant.scientificName || 'Scientific name not entered')}</em></small><small>${escapeHtml(isDefaultHomeArea(plant.placeName) ? DEFAULT_HOME_AREA_NAME : plant.placeName || plant.placeId)}${plant.layer ? ` &#x00B7; ${escapeHtml(plant.layer)}` : ''}</small></span></button>`).join('') || '<div class="panel"><p>No plants yet.</p></div>';
            const creatorPreparationTools = `<section class="field-guide-preparation field-guide-creative-tools" aria-labelledby="fieldGuideCreativeToolsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideCreativeToolsTitle">Creative Features</h2></div></div><div class="field-guide-preparation-grid"><button type="button" onclick="window.renderStartingPoints('${encoded(guide.project.id)}')"><strong>Visitor Entrances</strong><span>Guided beginning.</span></button><details class="field-guide-special-elements"><summary><strong>Special Elements</strong><span>Future V2 features.</span></summary><div class="field-guide-special-copy"><p>Planned place-based tools.</p><ul><li>Videos and moving image</li><li>3D models and spatial objects</li><li>Voice guidance and sound</li><li>More interactive visitor features</li></ul></div></details></div></section><section class="field-guide-preparation" aria-labelledby="fieldGuideAnchorsTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAnchorsTitle">Anchored Elements</h2></div></div><details class="field-guide-anchor-readiness"><summary><span aria-hidden="true">&#x2316;</span><div><strong>${anchoredCount} anchored element${anchoredCount === 1 ? '' : 's'}</strong><p>Only successful physical-space connections.</p></div></summary><div class="field-guide-anchored-list">${anchoredRows || '<p>No elements are anchored yet.</p>'}</div></details></section>`;
            app.innerHTML = `<div class="screen field-guide field-guide-hub field-guide-tool analog-print-page"><div class="page-header field-guide-header"><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>Web Hub</h1></div><section class="field-guide-essentials" aria-labelledby="fieldGuideEssentialsTitle"><div class="field-guide-essentials-heading"><h2 id="fieldGuideEssentialsTitle">Essentials</h2><button class="field-guide-map-action" type="button" onclick="window.renderLocationMap('${encoded(guide.project.id)}',true,'field-guide')">Map</button></div><div class="field-guide-summary"><span><strong>${places.length}</strong> Areas</span><span><strong>${guide.plants.length}</strong> Plants</span><span><strong>${guide.totems.length}</strong> Totems</span><span><strong>${placedCount}</strong> Elements</span><span><strong>${anchoredCount}</strong> Anchored</span></div><div class="field-guide-creation-actions"><button type="button" onclick="window.renderLocationFieldMarker('${encoded(guide.project.id)}','plant','without-ar',true)"><strong>+ Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${encoded(guide.project.id)}','field-guide')"><strong>+ Area</strong></button></div></section><section class="field-guide-areas-board" aria-labelledby="fieldGuideAreasTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuideAreasTitle">Areas</h2></div><button type="button" onclick="${locationResetAction}">All</button></div><div class="field-guide-place-cloud field-guide-area-grid">${creatorAreaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section><section class="field-guide-plant-search" aria-labelledby="fieldGuidePlantSearchTitle"><div class="field-guide-section-heading"><div><h2 id="fieldGuidePlantSearchTitle">Search</h2></div></div><div class="field-guide-search-deck"><div class="field"><label for="fieldGuideSearch">Search plants</label><input id="fieldGuideSearch" type="search" placeholder="Name, scientific name, use or Area" oninput="window.applyFieldGuideFilter()" /></div><details class="field-guide-advanced-search"><summary>More filters</summary><div class="field"><label for="fieldGuideLayer">Layer</label><select id="fieldGuideLayer" onchange="window.applyFieldGuideFilter()"><option value="">All layers</option>${layers.map(layer => `<option value="${escapeHtml(layer.toLowerCase())}">${escapeHtml(layer)}</option>`).join('')}</select></div></details></div><p id="fieldGuideCount">${guide.plants.length} plant${guide.plants.length === 1 ? '' : 's'}</p><div class="analog-plant-list field-guide-plant-grid">${plantRows}</div></section>${creatorPreparationTools}${virtualTagsSection}<details class="field-guide-area-help"><summary aria-label="About Areas">?</summary><p>Each Area keeps its own Plants and spatial markers. Home is the unassigned starting space.</p></details><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button><button class="ghost analog-navigation" onclick="${backAction}">Back</button></div></div>`;
            app.querySelectorAll('.analog-print-button').forEach(button => button.closest('.analog-print-footer')?.remove());
            applyCreatorWebHubCopy(app);
            applyFieldGuideFilter('');
            return;
        }
        app.innerHTML = `<div class="screen field-guide field-guide-hub analog-print-page"><div class="page-header field-guide-header"><p class="print-kicker">${escapeHtml(guide.project.name).toUpperCase()}</p><h1>${guideTitle}</h1><p class="subtitle">${creator ? 'Manage Home, Plants, Areas, Totem Markers and their spatial information.' : 'Find, filter and open Plants, Areas and Totem Markers.'}</p><div class="field-guide-summary"><span><strong>${guide.plants.length}</strong> Plants</span><span><strong>${places.length}</strong> Areas</span><span><strong>${guide.totems.length}</strong> Totem Markers</span>${unassignedCount ? `<span class="is-unassigned"><strong>${unassignedCount}</strong> In Unassigned Folder</span>` : ''}</div></div>${creationBoard}<section class="field-guide-search-deck"><div class="field"><label for="fieldGuideSearch">Deep search</label><input id="fieldGuideSearch" type="search" placeholder="Plants, Totem Markers, Areas, layers, uses or notes…" oninput="window.applyFieldGuideFilter()" /></div><div class="field"><label for="fieldGuideLayer">Forest layer</label><select id="fieldGuideLayer" onchange="window.applyFieldGuideFilter()"><option value="">All layers</option>${layers.map(layer => `<option value="${escapeHtml(layer.toLowerCase())}">${escapeHtml(layer)}</option>`).join('')}</select></div></section><section><div class="field-guide-section-heading"><div><h2>Areas</h2><p>${creator ? 'Home is the default. Open a named Area to work in its saved layout.' : 'Choose an Area to filter its records below.'}</p></div><button type="button" onclick="${locationResetAction}">${creator ? DEFAULT_HOME_AREA_NAME : 'Show all'}</button></div><div class="field-guide-place-cloud">${areaCards || '<p class="meta">No Areas are available yet.</p>'}</div></section>${totemCards ? `<section><div class="field-guide-section-heading"><div><h2>Totem Markers</h2><p>Area markers and their information boards.</p></div></div><div class="field-guide-totem-grid">${totemCards}</div></section>` : ''}${totemLinks.length || places.some(place => place.hasTotem) ? totemDiagram : ''}<section><div class="field-guide-section-heading"><div><h2>Plant records</h2><p id="fieldGuideCount">${creator ? homeCount : guide.plants.length} plant${(creator ? homeCount : guide.plants.length) === 1 ? '' : 's'}</p></div></div><div class="analog-plant-list field-guide-plant-grid">${guide.plants.map(plant => `<button class="analog-plant-row field-guide-plant-card" data-field-guide-plant data-place="${escapeHtml(plant.placeId)}" data-layer="${escapeHtml(String(plant.layer || '').toLowerCase())}" data-search="${escapeHtml([plant.commonName, plant.scientificName, plant.family, plant.origin, plant.plantType, plant.layer, Array.isArray(plant.uses) ? plant.uses.join(' ') : plant.uses, plant.propagation, plant.localNotes, plant.summary, plant.placeId, plant.placeName].join(' ').toLowerCase())}" onclick="window.openFieldGuidePlant('${encoded(plant.instanceId)}')"><span class="field-guide-card-icon" aria-hidden="true">🌿</span><span><strong>${escapeHtml(plant.commonName || 'Unnamed plant')}</strong><small><em>${escapeHtml(plant.scientificName || 'Scientific name not entered')}</em></small><small>${escapeHtml(plant.placeName === 'Unassigned' ? 'Unassigned Folder · Area not assigned' : plant.placeName || plant.placeId)}${plant.layer ? ` · ${escapeHtml(plant.layer)}` : ''}</small></span></button>`).join('') || '<div class="panel"><p>No plant records yet.</p></div>'}</div></section><div class="analog-print-footer"><button class="analog-print-button" onclick="window.print()">Print</button><button class="ghost analog-navigation" onclick="${backAction}">Back</button></div></div>`;
        app.querySelectorAll('.analog-print-button').forEach(button => button.closest('.analog-print-footer')?.remove());
        app.querySelectorAll('.field-guide-area-card').forEach((card, index) => {
            const place = places[index];
            if (!place) return;
            card.dataset.fieldGuideArea = '';
            card.dataset.place = place.id;
            card.dataset.search = [place.name, place.siteName, 'area'].join(' ').toLowerCase();
        });
        const homeSummary = app.querySelector('.field-guide-summary .is-unassigned');
        if (homeSummary) homeSummary.lastChild.textContent = ` In ${DEFAULT_HOME_AREA_NAME}`;
        const searchDeck = app.querySelector('.field-guide-search-deck');
        if (searchDeck) app.querySelector('.field-guide-header')?.after(searchDeck);
        if (creator) {
            app.querySelector('.analog-print-footer')?.insertAdjacentHTML('beforebegin', elementSummary + preparationTools);
            const physicalAnchorsHeading = app.querySelector('#fieldGuideAnchorsTitle');
            if (physicalAnchorsHeading) {
                physicalAnchorsHeading.textContent = 'Anchored Elements';
                physicalAnchorsHeading.nextElementSibling.textContent = 'Only elements linked to physical markers in real space appear here.';
                physicalAnchorsHeading.closest('details')?.removeAttribute('open');
            }
            const footer = app.querySelector('.analog-print-footer');
            const summary = app.querySelector('.field-guide-summary');
            if (summary && footer) footer.before(summary);
            const creationBoard = app.querySelector('.field-guide-creation-board');
            const elementsSummary = app.querySelector('.field-guide-elements-summary');
            if (creationBoard && elementsSummary) elementsSummary.before(creationBoard);
            summary?.insertAdjacentHTML('beforeend', `<span><strong>${placedCount}</strong> Elements</span><span><strong>${anchoredCount}</strong> Anchored Elements</span>`);
            applyFieldGuideFilter(currentGuidePlaceId);
        }
        const advancedField = document.getElementById('fieldGuideLayer')?.closest('.field');
        if (searchDeck && advancedField) {
            const searchLabel = document.querySelector('label[for="fieldGuideSearch"]');
            if (searchLabel) searchLabel.textContent = 'Search';
            const advanced = document.createElement('details');
            advanced.className = 'field-guide-advanced-search';
            advanced.innerHTML = '<summary>Advanced search options</summary>';
            advanced.appendChild(advancedField);
            searchDeck.appendChild(advanced);
        }
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${creator ? `window.renderProjectDashboard('${encoded(projectId)}')` : 'window.renderFieldGuideProjects()'}">Back</button><h1>${creator ? 'Web Hub' : 'Field Guide'} unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function loadCreatorGuide(projectId) {
    const project = (await loadProjects()).find(item => item.id === projectId);
    if (!project) throw new Error('Location not found.');
    const sites = await loadProjectSites(project.id);
    const siteGroups = await Promise.all(sites.map(async site => {
        const places = await loadSitePlaces(project.id, site.id).catch(() => []);
        const placeGroups = await Promise.all(places.map(place => loadAreaGuideGroup(project.id, site.id, place, false)));
        return { site, placeGroups };
    }));
    const plants = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.plants.map(plant => ({ ...plant, siteId: group.site.id, siteName: group.site.name, placeName: placeGroup.place.name }))));
    const totems = siteGroups.flatMap(group => group.placeGroups.flatMap(placeGroup => placeGroup.totems.map(totem => ({ ...totem, siteId: group.site.id, siteName: group.site.name, placeId: placeGroup.place.id, placeName: placeGroup.place.name }))));
    currentGuide = { project, siteGroups, plants, totems, creator: true };
    return currentGuide;
}

export function applyFieldGuideFilter(placeId = currentGuidePlaceId) {
    currentGuidePlaceId = String(placeId || '');
    const query = document.getElementById('fieldGuideSearch')?.value.trim().toLowerCase() || '';
    const layer = document.getElementById('fieldGuideLayer')?.value || '';
    const areaScope = query ? '' : currentGuidePlaceId;
    let visible = 0;
    document.querySelectorAll('[data-field-guide-plant]').forEach(row => {
        row.hidden = Boolean((query && !(row.dataset.search || '').includes(query)) || (layer && row.dataset.layer !== layer) || (areaScope && String(row.dataset.place).toLowerCase() !== areaScope.toLowerCase()));
        if (!row.hidden) visible += 1;
    });
    document.querySelectorAll('[data-field-guide-totem]').forEach(row => {
        row.hidden = Boolean((query && !(row.dataset.search || '').includes(query)) || layer || (areaScope && String(row.dataset.place).toLowerCase() !== areaScope.toLowerCase()));
    });
    document.querySelectorAll('[data-field-guide-area]').forEach(row => {
        row.hidden = Boolean(query && !(row.dataset.search || '').includes(query));
    });
    const matchingPlaces = new Set([...document.querySelectorAll('[data-field-guide-plant]:not([hidden])')].map(row => String(row.dataset.place || '').toLowerCase()).filter(Boolean));
    document.querySelectorAll('[data-field-guide-area]').forEach(row => {
        const placeId = String(row.dataset.place || '').toLowerCase();
        row.classList.toggle('is-search-match', Boolean(query && matchingPlaces.has(placeId)));
        row.classList.toggle('is-search-dimmed', Boolean(query && matchingPlaces.size && !matchingPlaces.has(placeId)));
    });
    const count = document.getElementById('fieldGuideCount');
    if (count) count.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
    const allPlantsCount = document.querySelector('.field-guide-all-plants-count');
    if (allPlantsCount) allPlantsCount.textContent = `${visible} plant${visible === 1 ? '' : 's'}`;
    const allPlants = document.querySelector('.field-guide-all-plants');
    if (allPlants && (query || layer || areaScope)) allPlants.open = true;
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
