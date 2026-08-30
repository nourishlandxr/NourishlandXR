import { loadProjectDashboardV2Model } from '../services/projectDashboardV2Model.js';
import { renderFieldGuide } from './fieldGuide.js';
import { buildSiteMapLayout } from './projectDashboard.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value ?? ''));
const markerIcon = type => ({ plant: '✦', note: '▤', area_checkpoint: '⌖', sub_checkpoint: '◆' }[type] || '•');
const areaIcon = area => area.current ? '⌂' : '▧';

function conceptualMapMarkup(model) {
    const areas = model.areas || [];
    const lines = (model.connections || []).map(connection => {
        const from = areas.find(area => area.id === connection.from)?.point;
        const to = areas.find(area => area.id === connection.to)?.point;
        return from && to ? `<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(2)}" />` : '';
    }).join('');
    const nodes = areas.map((area, index) => `<button class="nlxr-db-v2-map-node${area.current ? ' is-current' : ''}${index % 2 ? ' is-alt' : ''}" type="button" data-map-layer="areas" data-living-area="${encoded(area.id)}" style="--map-x:${area.point.x.toFixed(2)}%;--map-y:${area.point.y.toFixed(2)}%;" aria-label="Inspect ${escapeHtml(area.label)}"><span aria-hidden="true">${areaIcon(area)}</span><strong>${escapeHtml(area.label)}</strong><small data-map-layer="plants">${area.plantCount} plant${area.plantCount === 1 ? '' : 's'}</small>${area.totemCount ? `<em data-map-layer="totems">${area.totemCount} Totem${area.totemCount === 1 ? '' : 's'}</em>` : ''}</button>`).join('');
    const mapImage = model.siteMap?.image || model.livingMap?.background?.assetUrl;
    return `<section class="nlxr-db-v2-living-map" aria-labelledby="nlxrDbV2ConceptualMapTitle">
        <div class="nlxr-db-v2-map-section-heading"><div><p class="nlxr-db-v2-eyebrow">AREA MAP</p><h3 id="nlxrDbV2ConceptualMapTitle">Project layout</h3><p>Organise Areas and confirmed connections in the project view. This layout is conceptual and does not claim GPS accuracy.</p></div></div>
        <div class="nlxr-db-v2-map-canvas" data-site-map-canvas aria-label="Project Area layout">
            ${mapImage ? `<img class="nlxr-db-v2-map-image" src="${escapeHtml(mapImage)}" alt="" aria-hidden="true" />` : ''}
            <div class="nlxr-db-v2-map-grid" aria-hidden="true"></div>
            <svg class="nlxr-db-v2-map-lines" data-map-layer="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="nlxrV2Glow"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#nlxrV2Glow)">${lines}</g></svg>
            ${nodes || '<p class="nlxr-db-v2-map-empty">Add an Area to begin the project map.</p>'}
            <div class="nlxr-db-v2-map-compass" aria-hidden="true">N<br><span>↑</span></div>
        </div>
        <footer class="nlxr-db-v2-map-footer"><span><i aria-hidden="true">✦</i> ${areas.length} area${areas.length === 1 ? '' : 's'} · ${model.totalPlants} plant cluster${model.totalPlants === 1 ? '' : 's'}</span></footer>
        <p class="nlxr-db-v2-map-legend"><span><i class="is-area" aria-hidden="true"></i> Areas</span><span><i class="is-plant" aria-hidden="true"></i> Plant clusters</span><span><i class="is-link" aria-hidden="true"></i> Confirmed links</span><span><i class="is-totem" aria-hidden="true"></i> Totems</span></p>
    </section>`;
}

function currentMapMarkup(model) {
    const projectId = encoded(model.project.id);
    const visiblePlaces = (model.areas || []).filter(area => !area.current);
    const mapEntries = (model.entries || []).filter(entry => visiblePlaces.some(place => place.id === entry.place?.id));
    const projectIdentity = `${model.project.id} ${model.project.name}`.trim();
    const usesHillyardsPlan = model.project.id === 'Hillyards' || /test loaded data/i.test(projectIdentity);
    const siteMap = model.siteMap || {};
    const mapLayout = buildSiteMapLayout(visiblePlaces, mapEntries, usesHillyardsPlan, siteMap.areaPoints || {});
    const mapBackground = siteMap.image
        ? `<img src="${escapeHtml(siteMap.image)}" alt="${escapeHtml(model.project.name)} uploaded site plan" />`
        : model.livingMap?.background?.assetUrl
            ? `<img src="${escapeHtml(model.livingMap.background.assetUrl)}" alt="${escapeHtml(model.project.name)} site plan" />`
            : usesHillyardsPlan
                ? '<img src="./assets/terrace-marking.png" alt="Terrace site plan showing paths and growing plots" />'
                : '<div class="site-map-generic-surface" aria-hidden="true"></div>';
    const areaOverlays = visiblePlaces.map(place => {
        const count = mapEntries.filter(entry => entry.place.id === place.id).length;
        const point = mapLayout.areaPoints.get(place.id) || { x: 50, y: 50, positioned: false };
        const content = `<strong>${escapeHtml(place.label || place.name)}</strong><span>${count} item${count === 1 ? '' : 's'} · ${point.planLinked ? 'plan linked' : point.positioned ? 'GPS mapped' : 'map layout'}</span>`;
        return `<button class="site-map-area${point.planLinked ? ' is-plan-linked' : ''}" data-map-layer="areas" style="--map-x:${point.x}%;--map-y:${point.y}%" type="button" onclick="window.renderProjectAreaDashboard('${projectId}', '${encoded(place.id)}')" aria-label="Open ${escapeHtml(place.label || place.name)}">${content}</button>`;
    }).join('');
    const mapEntryKey = entry => `${entry.place?.id}:${entry.marker?.id}`;
    const markerPins = mapEntries.map(entry => {
        const point = mapLayout.markerPoints.get(mapEntryKey(entry));
        if (!point) return '';
        const markerType = entry.marker?.semantic_type === 'area_checkpoint' ? 'area_checkpoint' : entry.marker?.type;
        const markerLayer = markerType === 'plant' ? 'plants' : markerType === 'area_checkpoint' ? 'totems' : 'areas';
        const label = `${entry.marker?.name || 'Untitled record'} · ${markerType || 'Content'}`;
        const pinClass = `site-map-pin site-map-pin-${escapeHtml(markerType || 'content')}`;
        return `<button class="${pinClass}" data-map-layer="${markerLayer}" style="--map-x:${point.x}%;--map-y:${point.y}%" type="button" onclick="window.openProjectEntry('${projectId}', '${encoded(entry.marker?.id)}')" aria-label="Open ${escapeHtml(label)}"><span class="sr-only">${escapeHtml(label)}</span></button>`;
    }).join('');
    const mapTotemLinks = visiblePlaces.flatMap(place => (Array.isArray(place.totem_links) ? place.totem_links : []).map(link => ({ from: place, to: visiblePlaces.find(candidate => candidate.id === link.target_area_id), ...link }))).filter(link => link.to);
    const mapTotemDiagram = mapTotemLinks.length ? `<section class="site-map-totem-links" data-map-layer="connections"><h2>Totem links</h2>${mapTotemLinks.map(link => `<span>${escapeHtml(link.from.label || link.from.name)} → ${escapeHtml(link.to.label || link.to.name)}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}</span>`).join('')}</section>` : '';
    const mapStatus = mapLayout.hasMapBounds ? 'GPS positions are shown relative to one another.' : 'Map layout is temporary until Areas receive GPS positions.';
    return `<section class="nlxr-db-v2-current-map" aria-labelledby="nlxrDbV2CurrentMapTitle"><section class="site-map-introduction"><div><p class="welcome-label">Current map</p><h2 id="nlxrDbV2CurrentMapTitle">Areas, paths and placed content</h2><p>This is the saved site map. GPS anchors appear in their real relative positions; content placed only in AR stays within its Area until GPS is added.</p></div><div class="site-map-legend" aria-label="Map legend"><span><i class="is-area"></i>Area</span><span><i class="is-plant"></i>Plant</span><span><i class="is-note"></i>Note / checkpoint</span></div></section><section class="site-map-canvas${usesHillyardsPlan ? ' has-terrace-plan' : ' has-generic-surface'}" data-site-map-canvas aria-label="${escapeHtml(model.project.name)} site map">${mapBackground}<div class="site-map-image-wash" aria-hidden="true"></div>${areaOverlays}${markerPins}<p class="site-map-scale-note">${mapStatus}</p></section><section class="site-map-summary"><strong>${visiblePlaces.length} Area${visiblePlaces.length === 1 ? '' : 's'}</strong><span>${mapEntries.length} mapped item${mapEntries.length === 1 ? '' : 's'}</span><span>${mapLayout.hasMapBounds ? 'GPS relative layout' : 'Area layout mode'}</span></section>${mapTotemDiagram}</section>`;
}

function activityMarkup(model) {
    const rows = (model.recentActivity || []).map(item => `<li><span class="nlxr-db-v2-activity-icon" aria-hidden="true">${markerIcon(item.type)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span><i aria-hidden="true">•</i></li>`).join('');
    return `<section class="nlxr-db-v2-card nlxr-db-v2-activity-card" aria-labelledby="nlxrDbV2ActivityTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">◷</span><h2 id="nlxrDbV2ActivityTitle">Recent activity</h2></div></header>${rows ? `<ul class="nlxr-db-v2-activity-list">${rows}</ul>` : '<p class="nlxr-db-v2-empty">No activity has been recorded yet.</p>'}</section>`;
}

function statusItem(label, value, action, extraClass = '') {
    return `<button type="button" class="nlxr-db-v2-status-item ${extraClass}" data-v2-status-action="${action}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></button>`;
}

function projectStatusMarkup(model) {
    return `<section class="nlxr-db-v2-status-board" aria-labelledby="nlxrDbV2StatusTitle">
        <header class="nlxr-db-v2-status-heading"><h2 id="nlxrDbV2StatusTitle">Project Status</h2></header>
        <div class="nlxr-db-v2-status-main" role="group" aria-label="Project statistics">
            ${statusItem('Plants', model.totalPlants, 'plants')}
            ${statusItem('Placed', model.placedPlants, 'placed')}
            ${statusItem('Areas', model.areas.length, 'areas')}
            ${statusItem('Mapped', `${model.mappedPercentage}%`, 'mapped', 'is-percentage')}
        </div>
    </section>`;
}

function toolsMarkup(model) {
    const projectId = encoded(model.project.id);
    return `<section class="nlxr-db-v2-card nlxr-db-v2-tools-card" aria-labelledby="nlxrDbV2ToolsTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">⊞</span><h2 id="nlxrDbV2ToolsTitle">Project tools</h2></div></header><div class="nlxr-db-v2-tools-grid"><button type="button" onclick="window.renderPrintCenter('${projectId}')"><span aria-hidden="true">↥</span><strong>Print and Export</strong></button><button type="button" onclick="window.renderProjectGuide('${projectId}')"><span aria-hidden="true">?</span><strong>Project Guide</strong></button><button type="button" onclick="window.renderProjectSettings('${projectId}')"><span aria-hidden="true">⚙</span><strong>Project Settings</strong></button></div></section>`;
}

function areaSummaryMarkup(model) {
    const projectId = encoded(model.project.id);
    const rows = (model.areas || []).map(area => `<button type="button" class="nlxr-db-v2-area-row${area.current ? ' is-current' : ''}" onclick="window.renderProjectAreaDashboard('${projectId}','${encoded(area.id)}')"><span class="nlxr-db-v2-area-icon" aria-hidden="true">${areaIcon(area)}</span><span><strong>${escapeHtml(area.label)}</strong><small>${area.plantCount} plant${area.plantCount === 1 ? '' : 's'} · ${area.entryCount} entr${area.entryCount === 1 ? 'y' : 'ies'}${area.placedTotemCount ? ` · ${area.placedTotemCount} Totem${area.placedTotemCount === 1 ? '' : 's'}` : ''}</small></span><span class="nlxr-db-v2-area-state">${area.current ? 'Current' : 'Open'} <b aria-hidden="true">›</b></span></button>`).join('');
    return `<section class="nlxr-db-v2-card nlxr-db-v2-areas-card" aria-labelledby="nlxrDbV2AreasTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">▧</span><h2 id="nlxrDbV2AreasTitle">Areas</h2></div><span class="nlxr-db-v2-readiness-state">${model.areas.length}</span></header>${rows || '<p class="nlxr-db-v2-empty">No areas have been added yet.</p>'}</section>`;
}

function overviewMarkup(model) {
    return `${projectStatusMarkup(model)}
        ${areaSummaryMarkup(model)}
        <div class="nlxr-db-v2-lower-grid">${activityMarkup(model)}${toolsMarkup(model)}</div>`;
}

function mapControlsMarkup(model) {
    const areas = (model.areas || []).filter(area => !area.current);
    const hasMapPhoto = Boolean(model.siteMap?.image || model.livingMap?.background?.assetUrl);
    const areaLinks = areas.map(area => {
        const hasSavedPoint = Boolean(model.siteMap?.areaPoints?.[area.id] || model.livingMap?.nodes?.[area.id]);
        return `<button type="button" class="nlxr-db-v2-map-area-link" data-map-link-area="${encoded(area.id)}" data-map-link-area-name="${encoded(area.label)}"><span class="nlxr-db-v2-map-area-link-icon" aria-hidden="true">⌖</span><span><strong>${escapeHtml(area.label)}</strong><small>${hasSavedPoint ? 'Position saved · choose to update' : 'Choose a point on the map'}</small></span><b aria-hidden="true">+</b></button>`;
    }).join('');
    return `<section class="nlxr-db-v2-map-controls" aria-labelledby="nlxrDbV2MapControlsTitle">
        <header class="nlxr-db-v2-map-controls-heading"><div><p class="nlxr-db-v2-eyebrow">MAP TOOLS</p><h3 id="nlxrDbV2MapControlsTitle">Map options</h3><p>Keep the map photo and Area positions together, then use the detailed workspace for the full map view.</p></div><span class="nlxr-db-v2-map-photo-state">${hasMapPhoto ? 'Map image added' : 'No map image yet'}</span></header>
        <div class="nlxr-db-v2-map-actions">
            <label class="nlxr-db-v2-map-action nlxr-db-v2-map-photo-upload"><span class="nlxr-db-v2-map-action-icon" aria-hidden="true">＋</span><span><strong>Upload map photo</strong><small>Use a plan, aerial photo or hand-drawn layout.</small></span><input type="file" accept="image/*" data-map-photo-upload /></label>
            ${model.siteMap?.image ? '<button type="button" class="nlxr-db-v2-map-action" data-map-photo-remove><span class="nlxr-db-v2-map-action-icon" aria-hidden="true">×</span><span><strong>Remove uploaded photo</strong><small>Keep the Area records and positions.</small></span></button>' : ''}
            <button type="button" class="nlxr-db-v2-map-action" data-map-editor><span class="nlxr-db-v2-map-action-icon" aria-hidden="true">↗</span><span><strong>Open detailed map workspace</strong><small>See placed content, Totem links and spatial export.</small></span></button>
        </div>
        <div class="nlxr-db-v2-map-area-links-section"><div><strong>Place Areas on the map</strong><small>Choose an Area, then click its position in the map above.</small></div><div class="nlxr-db-v2-map-area-links">${areaLinks || '<p class="nlxr-db-v2-map-controls-empty">Create an Area before linking it to the map.</p>'}</div></div>
        <div class="nlxr-db-v2-map-export"><span class="nlxr-db-v2-map-action-icon" aria-hidden="true">⌘</span><span><strong>GIS export</strong><small>GeoPackage, GeoJSON, CSV with X/Y/Z, KML, GPX or DXF.</small></span><span class="nlxr-db-v2-map-export-badge">Coming soon</span></div>
        <p class="nlxr-db-v2-map-status-text" data-v2-map-status role="status">${hasMapPhoto ? 'Choose an Area above to update its position on the map.' : 'Upload a map photo when you are ready, or place Areas on the conceptual map first.'}</p>
    </section>`;
}

function mapWorkspaceMarkup(model) {
    return `<section class="nlxr-db-v2-map-workspace" aria-labelledby="nlxrDbV2ProjectMapTitle"><header class="nlxr-db-v2-map-workspace-heading"><h2 id="nlxrDbV2ProjectMapTitle">Project Map</h2><p>Organise the project first, then review its saved site map below.</p></header>${conceptualMapMarkup(model)}${currentMapMarkup(model)}<div class="nlxr-db-v2-map-toolbar" role="toolbar" aria-label="Map layer filters"><span>Layers</span><div><button type="button" data-map-layer-toggle="areas" aria-pressed="true">Areas</button><button type="button" data-map-layer-toggle="plants" aria-pressed="true">Plant clusters</button><button type="button" data-map-layer-toggle="connections" aria-pressed="true">Connections</button><button type="button" data-map-layer-toggle="totems" aria-pressed="true">Totems</button></div></div>${mapControlsMarkup(model)}</section>`;
}

function previewModeMarkup(model, mode) {
    if (mode === 'map') return mapWorkspaceMarkup(model);
    return overviewMarkup(model);
}

async function renderContentInDashboard(panel, projectKey) {
    const staging = document.createElement('div');
    // Render the content markup off-screen first, but keep actions pointed at
    // the live dashboard panel after it is moved into the tab shell.
    await renderFieldGuide(staging, projectKey, true, panel);
    const content = staging.querySelector('.field-guide-workspace');
    if (!content) throw new Error('Content workspace unavailable.');
    panel.classList.add('field-guide-hub-redesign');
    panel.replaceChildren(content);
}

export async function renderProjectDashboardV2(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const model = await loadProjectDashboardV2Model(projectId);
        const projectLabel = escapeHtml(model.project.name || model.project.id);
        const projectKey = encoded(model.project.id);
        const offlineStatus = typeof navigator !== 'undefined' && navigator.onLine === false
            ? '<p class="nlxr-db-v2-sync is-offline"><i aria-hidden="true"></i> Offline</p>'
            : '';
        app.innerHTML = `<div class="screen app-surface app-surface-dashboard nlxr-db-v2" data-project-id="${projectKey}">
            <header class="nlxr-db-v2-header"><div class="nlxr-db-v2-header-copy"><p class="nlxr-db-v2-eyebrow">PROJECT</p><div class="nlxr-db-v2-project-title"><h1>${projectLabel}</h1></div>${offlineStatus}</div></header>
            <nav class="nlxr-db-v2-mode-nav" aria-label="Dashboard views"><button type="button" class="is-active" data-v2-mode="overview" aria-current="page"><span aria-hidden="true">✦</span> Overview</button><button type="button" data-v2-mode="map"><span aria-hidden="true">▧</span> Map</button><button type="button" data-v2-mode="content"><span aria-hidden="true">☰</span> Content</button></nav>
            <div class="nlxr-db-v2-ar-strip" aria-label="AR access"><button type="button" class="nlxr-db-v2-ar-button" data-v2-open-ar><span class="nlxr-db-v2-ar-icon" aria-hidden="true">＋</span><span class="nlxr-db-v2-ar-copy"><strong>Open AR mode</strong><small>Place this project’s Content in the landscape.</small></span><span class="nlxr-db-v2-ar-meta"><b>AR</b><i aria-hidden="true">→</i></span></button></div>
            <main class="nlxr-db-v2-mode-panel">${previewModeMarkup(model, 'overview')}</main>
            <p id="nlxrDbV2Notice" class="nlxr-db-v2-notice" role="status" hidden></p>
            <div class="nlxr-living-map-sheet" id="nlxrLivingMapSheet" hidden></div>
            <footer class="nlxr-db-v2-close-project"><button type="button" data-v2-close-project>Close Project</button></footer>
        </div>`;

        const panel = app.querySelector('.nlxr-db-v2-mode-panel');
        const notice = message => {
            const target = app.querySelector('#nlxrDbV2Notice');
            if (!target) return;
            target.textContent = message;
            target.hidden = false;
        };
        app.querySelector('[data-v2-open-ar]')?.addEventListener('click', () => window.openCreatorArMode(projectKey));
        const showMode = async mode => {
            const button = app.querySelector(`[data-v2-mode="${mode}"]`);
            if (!button) return;
            app.querySelectorAll('[data-v2-mode]').forEach(candidate => {
                const active = candidate === button;
                candidate.classList.toggle('is-active', active);
                if (active) candidate.setAttribute('aria-current', 'page');
                else candidate.removeAttribute('aria-current');
            });
            if (mode === 'content') {
                await renderContentInDashboard(panel, projectKey);
            } else {
                panel.classList.remove('field-guide-hub-redesign');
                panel.innerHTML = previewModeMarkup(model, mode);
                bindPanel();
            }
        };
        const bindPanel = () => {
            panel.querySelectorAll('[data-living-area]').forEach(button => button.addEventListener('click', () => {
                const area = model.areas.find(candidate => candidate.id === button.dataset.livingArea);
                const sheet = app.querySelector('#nlxrLivingMapSheet');
                if (!area || !sheet) return;
                sheet.innerHTML = `<div><div><p class="nlxr-db-v2-eyebrow">AREA</p><h2>${escapeHtml(area.label)}</h2><p>${area.plantCount} plant${area.plantCount === 1 ? '' : 's'} · ${area.entryCount} entr${area.entryCount === 1 ? 'y' : 'ies'}</p></div><button type="button" aria-label="Close area details" data-close-map-sheet>×</button></div><p>${area.totemCount ? `${area.placedTotemCount} Totem${area.placedTotemCount === 1 ? '' : 's'} confirmed.` : 'No Totem is configured for this Area.'}</p><div><button type="button" onclick="window.renderProjectAreaDashboard('${projectKey}','${encoded(area.id)}')">Open Area</button><button type="button" onclick="window.openProjectArMode('${projectKey}','${encoded(area.id)}')">Open in AR</button><button type="button" data-v2-notice="position">Edit position</button></div>`;
                sheet.hidden = false;
                sheet.querySelector('[data-close-map-sheet]')?.addEventListener('click', () => { sheet.hidden = true; });
                sheet.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => notice('Manual position editing is available from Edit layout.')));
            }));
            panel.querySelectorAll('[data-v2-health-review]').forEach(control => control.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard')));
            panel.querySelector('[data-v2-guide]')?.addEventListener('click', () => window.renderProjectGuide(projectKey));
            panel.querySelector('[data-v2-map-image]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard'));
            panel.querySelector('[data-v2-unplaced]')?.addEventListener('click', () => window.renderFieldGuide(projectKey, true));
            panel.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => notice('This capability is not yet available. Existing project tools remain available for live work.')));
            panel.querySelector('[data-map-edit]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard'));
            panel.querySelector('[data-map-reset]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard'));
            panel.querySelector('[data-map-align]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard'));
            panel.querySelector('[data-map-fit]')?.addEventListener('click', () => {
                panel.querySelector('.nlxr-db-v2-map-canvas')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                notice('All project areas are visible in the automatic layout.');
            });
            panel.querySelector('[data-map-photo-upload]')?.addEventListener('change', event => {
                if (typeof window.uploadSiteMapPhoto === 'function') void window.uploadSiteMapPhoto(event, projectKey, 'dashboard-v2');
            });
            panel.querySelector('[data-map-photo-remove]')?.addEventListener('click', () => {
                if (typeof window.removeSiteMapPhoto === 'function') void window.removeSiteMapPhoto(projectKey, 'dashboard-v2');
            });
            panel.querySelector('[data-map-editor]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard'));
            panel.querySelectorAll('[data-map-link-area]').forEach(control => control.addEventListener('click', () => {
                if (typeof window.beginSiteMapAreaLink === 'function') window.beginSiteMapAreaLink(projectKey, control.dataset.mapLinkArea, control.dataset.mapLinkAreaName, 'dashboard-v2');
            }));
            panel.querySelectorAll('[data-site-map-canvas]').forEach(canvas => canvas.addEventListener('click', event => {
                if (typeof window.placeLinkedAreaOnSiteMap === 'function') void window.placeLinkedAreaOnSiteMap(event);
            }));
            panel.querySelectorAll('[data-map-layer-toggle]').forEach(control => control.addEventListener('click', () => {
                const layer = control.dataset.mapLayerToggle;
                const active = control.getAttribute('aria-pressed') !== 'true';
                control.setAttribute('aria-pressed', String(active));
                panel.querySelectorAll(`[data-map-layer="${layer}"]`).forEach(item => item.classList.toggle('is-layer-hidden', !active));
            }));
            panel.querySelectorAll('[data-v2-status-action]').forEach(control => control.addEventListener('click', () => {
                const action = control.dataset.v2StatusAction;
                if (action === 'plants' || action === 'areas') return window.renderFieldGuide(projectKey, true);
                if (action === 'placed') {
                    showMode('map');
                    notice('Placed Plants are shown in the Plant clusters layer.');
                    return;
                }
                return window.renderLocationMap(projectKey, true, 'dashboard');
            }));
        };
        app.querySelectorAll('[data-v2-mode]').forEach(button => button.addEventListener('click', () => {
            void showMode(button.dataset.v2Mode);
        }));
        app.querySelector('[data-v2-close-project]')?.addEventListener('click', () => window.renderDemoProjects());
        app.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => {
            const messages = {
                pim: 'PIM opens after a Plant record exists. Add or import a Plant first.',
                position: 'Manual position editing is available from Edit layout.'
            };
            notice(messages[control.dataset.v2Notice] || 'This capability is not yet available.');
        }));
        bindPanel();
    } catch (error) {
        app.innerHTML = `<div class="screen app-surface app-surface-dashboard nlxr-db-v2"><div class="page-header"><button class="ghost" type="button" onclick="window.renderDemoProjects()">Back to Project Selection</button><p class="nlxr-db-v2-eyebrow">PROJECT</p><h1>Project Dashboard unavailable</h1><p class="subtitle">${escapeHtml(error.message)}</p><button type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Try again</button></div></div>`;
    }
}
