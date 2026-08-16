import { loadProjectDashboardV2Model } from '../services/projectDashboardV2Model.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value ?? ''));
const markerIcon = type => ({ plant: '✦', note: '▤', area_checkpoint: '⌖', sub_checkpoint: '◆' }[type] || '•');
const areaIcon = area => area.current ? '⌂' : '▧';

function metric(label, value, icon, extraClass = '') {
    return `<div class="nlxr-db-v2-metric ${extraClass}"><span class="nlxr-db-v2-metric-icon" aria-hidden="true">${icon}</span><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function mapMarkup(model) {
    const areas = model.areas || [];
    const lines = model.connections.map(connection => {
        const from = areas.find(area => area.id === connection.from)?.point;
        const to = areas.find(area => area.id === connection.to)?.point;
        return from && to ? `<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(2)}" />` : '';
    }).join('');
    const nodes = areas.map(area => `<button class="nlxr-db-v2-map-node${area.current ? ' is-current' : ''}" type="button" data-map-layer="areas" data-living-area="${encoded(area.id)}" style="--map-x:${area.point.x.toFixed(2)}%;--map-y:${area.point.y.toFixed(2)}%;" aria-label="Inspect ${escapeHtml(area.label)}"><span aria-hidden="true">${areaIcon(area)}</span><strong>${escapeHtml(area.label)}</strong><small data-map-layer="plants">${area.plantCount} plant${area.plantCount === 1 ? '' : 's'}</small>${area.totemCount ? `<em data-map-layer="totems">${area.totemCount} Totem${area.totemCount === 1 ? '' : 's'}</em>` : ''}</button>`).join('');
    const mapImage = model.siteMap?.image || model.livingMap?.background?.assetUrl;
    return `<div class="nlxr-db-v2-living-map" aria-labelledby="nlxrDbV2MapTitle">
        <div class="nlxr-db-v2-map-canvas" aria-label="Project area layout">
            ${mapImage ? `<img class="nlxr-db-v2-map-image" src="${escapeHtml(mapImage)}" alt="" aria-hidden="true" />` : ''}
            <div class="nlxr-db-v2-map-grid" aria-hidden="true"></div>
            <svg class="nlxr-db-v2-map-lines" data-map-layer="connections" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="nlxrV2Glow"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#nlxrV2Glow)">${lines}</g></svg>
            ${nodes || '<p class="nlxr-db-v2-map-empty">Add an Area to begin the project map.</p>'}
            <div class="nlxr-db-v2-map-compass" aria-hidden="true">N<br><span>↑</span></div>
        </div>
        <footer class="nlxr-db-v2-map-footer"><span><i aria-hidden="true">✦</i> ${areas.length} area${areas.length === 1 ? '' : 's'} · ${model.totalPlants} plant cluster${model.totalPlants === 1 ? '' : 's'}</span></footer>
        <p class="nlxr-db-v2-map-legend"><span><i class="is-area" aria-hidden="true"></i> Areas</span><span><i class="is-plant" aria-hidden="true"></i> Plant clusters</span><span><i class="is-link" aria-hidden="true"></i> Confirmed links</span><span><i class="is-totem" aria-hidden="true"></i> Totems</span></p>
    </div>`;
}

function activityMarkup(model, heading = 'Recent activity') {
    const rows = (model.recentActivity || []).map(item => `<li><span class="nlxr-db-v2-activity-icon" aria-hidden="true">${markerIcon(item.type)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span><i aria-hidden="true">•</i></li>`).join('');
    const viewAll = heading === 'Recent activity' ? '<button type="button" class="nlxr-db-v2-text-action" data-v2-mode="activity">View all</button>' : '';
    return `<section class="nlxr-db-v2-card nlxr-db-v2-activity-card" aria-labelledby="nlxrDbV2ActivityTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">◷</span><h2 id="nlxrDbV2ActivityTitle">${heading}</h2></div>${viewAll}</header>${rows ? `<ul class="nlxr-db-v2-activity-list">${rows}</ul>` : '<p class="nlxr-db-v2-empty">No activity has been recorded yet.</p>'}</section>`;
}

function statusItem(label, value, action, extraClass = '') {
    return `<button type="button" class="nlxr-db-v2-status-item ${extraClass}" data-v2-status-action="${action}"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></button>`;
}

function projectStatusMarkup(model) {
    const readiness = model.spatialReadiness || {};
    const attention = Math.max(0, Number(readiness.totalTotems || 0) - Number(readiness.confirmedTotems || 0));
    const alignedAreas = Number(readiness.areasWithConfirmedTotems || 0);
    const areaTotal = model.areas.length;
    return `<section class="nlxr-db-v2-status-board" aria-labelledby="nlxrDbV2StatusTitle">
        <header class="nlxr-db-v2-status-heading"><h2 id="nlxrDbV2StatusTitle">Project Status</h2><span>Tap a value to manage it</span></header>
        <div class="nlxr-db-v2-status-main" role="group" aria-label="Project statistics">
            ${statusItem('Plants', model.totalPlants, 'plants')}
            ${statusItem('Placed', model.placedPlants, 'placed')}
            ${statusItem('Areas', model.areas.length, 'areas')}
            ${statusItem('Mapped', `${model.mappedPercentage}%`, 'mapped', 'is-percentage')}
        </div>
        <div class="nlxr-db-v2-status-readiness" role="group" aria-label="Spatial readiness">
            ${statusItem('Totems configured', readiness.confirmedTotems || 0, 'totems')}
            ${statusItem('Need attention', attention, 'attention', attention ? 'is-attention' : '')}
            ${statusItem('Areas aligned', `${alignedAreas}/${areaTotal}`, 'alignment')}
            ${statusItem('Site image', readiness.siteImage ? 'Added' : 'Not added', 'site-image')}
        </div>
    </section>`;
}

function toolsMarkup(model) {
    const projectId = encoded(model.project.id);
    const firstPlant = model.plantEntries[0]?.marker?.id;
    const pimAction = firstPlant
        ? `window.openProjectEntry('${projectId}','${encoded(firstPlant)}',false,'dashboard',{workspace:'pim'})`
        : '';
    return `<section class="nlxr-db-v2-card nlxr-db-v2-tools-card" aria-labelledby="nlxrDbV2ToolsTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">⊞</span><h2 id="nlxrDbV2ToolsTitle">Project tools</h2></div></header><div class="nlxr-db-v2-tools-grid"><button type="button" onclick="window.renderFieldGuide('${projectId}',true)"><span aria-hidden="true">✦</span><strong>Plants</strong></button><button type="button" onclick="window.renderFieldGuide('${projectId}',true)"><span aria-hidden="true">▧</span><strong>Areas</strong></button><button type="button" ${pimAction ? `onclick="${pimAction}"` : 'data-v2-notice="pim"'}><span aria-hidden="true">⬡</span><strong>PIM</strong></button><button type="button" onclick="window.renderPrintCenter('${projectId}')"><span aria-hidden="true">↥</span><strong>Export</strong></button><button type="button" onclick="window.renderProjectGuide('${projectId}')"><span aria-hidden="true">?</span><strong>Project Guide</strong></button><button type="button" onclick="window.renderProjectSettings('${projectId}')"><span aria-hidden="true">⚙</span><strong>Project Settings</strong></button></div></section>`;
}

function areaSummaryMarkup(model) {
    const projectId = encoded(model.project.id);
    const rows = (model.areas || []).map(area => `<button type="button" class="nlxr-db-v2-area-row${area.current ? ' is-current' : ''}" onclick="window.renderProjectAreaDashboard('${projectId}','${encoded(area.id)}')"><span class="nlxr-db-v2-area-icon" aria-hidden="true">${areaIcon(area)}</span><span><strong>${escapeHtml(area.label)}</strong><small>${area.plantCount} plant${area.plantCount === 1 ? '' : 's'} · ${area.entryCount} entr${area.entryCount === 1 ? 'y' : 'ies'}${area.placedTotemCount ? ` · ${area.placedTotemCount} Totem${area.placedTotemCount === 1 ? '' : 's'}` : ''}</small></span><span class="nlxr-db-v2-area-state">${area.current ? 'Current' : 'Open'} <b aria-hidden="true">›</b></span></button>`).join('');
    return `<section class="nlxr-db-v2-card nlxr-db-v2-areas-card" aria-labelledby="nlxrDbV2AreasTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">▧</span><h2 id="nlxrDbV2AreasTitle">Areas</h2></div><span class="nlxr-db-v2-readiness-state">${model.areas.length}</span></header>${rows || '<p class="nlxr-db-v2-empty">No areas have been added yet.</p>'}</section>`;
}

function overviewMarkup(model) {
    const projectId = encoded(model.project.id);
    const activeArea = encoded(model.currentAreaId);
    return `<section class="nlxr-db-v2-primary-actions" aria-label="Primary project actions"><button class="is-primary" type="button" onclick="window.openProjectArMode('${projectId}','${activeArea}')"><span aria-hidden="true">⌾</span><strong>Open AR</strong></button><button type="button" onclick="window.renderLocationFieldMarker('${projectId}','plant','without-ar',true)"><span aria-hidden="true">⊕</span><strong>Add Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${projectId}','dashboard')"><span aria-hidden="true">▧</span><strong>Add Area</strong></button></section>
        ${projectStatusMarkup(model)}
        ${areaSummaryMarkup(model)}
        <div class="nlxr-db-v2-lower-grid">${activityMarkup(model)}${toolsMarkup(model)}</div>`;
}

function mapWorkspaceMarkup(model) {
    return `<section class="nlxr-db-v2-map-workspace" aria-labelledby="nlxrDbV2ProjectMapTitle"><header class="nlxr-db-v2-map-workspace-heading"><h2 id="nlxrDbV2ProjectMapTitle">Project Map</h2></header><div class="nlxr-db-v2-map-toolbar" role="toolbar" aria-label="Map controls"><button type="button" data-map-fit>Fit all</button><button type="button" data-map-edit>Edit layout</button><button type="button" data-map-reset>Reset automatic layout</button><button type="button" data-map-align>Totem alignment</button><button type="button" data-v2-map-image>Site image</button><details><summary>Layers</summary><div><button type="button" data-map-layer-toggle="areas" aria-pressed="true">Areas</button><button type="button" data-map-layer-toggle="plants" aria-pressed="true">Plant clusters</button><button type="button" data-map-layer-toggle="connections" aria-pressed="true">Connections</button><button type="button" data-map-layer-toggle="totems" aria-pressed="true">Totems</button></div></details></div>${mapMarkup(model)}<div class="nlxr-db-v2-map-summary" aria-label="Map summary"><span>${model.areas.length} area${model.areas.length === 1 ? '' : 's'}</span><span>${model.totalPlants} plant${model.totalPlants === 1 ? '' : 's'}</span><span>${model.spatialReadiness.confirmedTotems} confirmed Totem${model.spatialReadiness.confirmedTotems === 1 ? '' : 's'}</span></div></section>`;
}

function previewModeMarkup(model, mode) {
    if (mode === 'map') return mapWorkspaceMarkup(model);
    if (mode === 'activity') return activityMarkup(model, 'Activity');
    return overviewMarkup(model);
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
        app.innerHTML = `<div class="screen nlxr-db-v2" data-project-id="${projectKey}">
            <header class="nlxr-db-v2-header"><div class="nlxr-db-v2-header-copy"><p class="nlxr-db-v2-eyebrow">PROJECT</p><div class="nlxr-db-v2-project-title"><h1>${projectLabel}</h1></div>${offlineStatus}</div></header>
            <nav class="nlxr-db-v2-mode-nav" aria-label="Dashboard views"><button type="button" class="is-active" data-v2-mode="overview" aria-current="page"><span aria-hidden="true">✦</span> Overview</button><button type="button" data-v2-mode="map"><span aria-hidden="true">▧</span> Map</button><button type="button" data-v2-mode="activity"><span aria-hidden="true">⌁</span> Activity</button></nav>
            <main class="nlxr-db-v2-mode-panel">${previewModeMarkup(model, 'overview')}</main>
            <p id="nlxrDbV2Notice" class="nlxr-db-v2-notice" role="status" hidden></p>
            <div class="nlxr-living-map-sheet" id="nlxrLivingMapSheet" hidden></div>
        </div>`;

        const panel = app.querySelector('.nlxr-db-v2-mode-panel');
        const notice = message => {
            const target = app.querySelector('#nlxrDbV2Notice');
            if (!target) return;
            target.textContent = message;
            target.hidden = false;
        };
        const showMode = mode => {
            const button = app.querySelector(`[data-v2-mode="${mode}"]`);
            if (!button) return;
            app.querySelectorAll('[data-v2-mode]').forEach(candidate => {
                const active = candidate === button;
                candidate.classList.toggle('is-active', active);
                if (active) candidate.setAttribute('aria-current', 'page');
                else candidate.removeAttribute('aria-current');
            });
            panel.innerHTML = previewModeMarkup(model, mode);
            bindPanel();
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
            showMode(button.dataset.v2Mode);
        }));
        app.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => {
            const messages = {
                pim: 'PIM opens after a Plant record exists. Add or import a Plant first.',
                position: 'Manual position editing is available from Edit layout.'
            };
            notice(messages[control.dataset.v2Notice] || 'This capability is not yet available.');
        }));
        bindPanel();
    } catch (error) {
        app.innerHTML = `<div class="screen nlxr-db-v2"><div class="page-header"><button class="ghost" type="button" onclick="window.renderDemoProjects()">Back to Choose Project</button><p class="nlxr-db-v2-eyebrow">PROJECT</p><h1>Project Dashboard unavailable</h1><p class="subtitle">${escapeHtml(error.message)}</p><button type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Try again</button></div></div>`;
    }
}
