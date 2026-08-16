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
    const nodes = areas.map(area => `<button class="nlxr-db-v2-map-node${area.current ? ' is-current' : ''}" type="button" data-living-area="${encoded(area.id)}" style="--map-x:${area.point.x.toFixed(2)}%;--map-y:${area.point.y.toFixed(2)}%;" aria-label="Inspect ${escapeHtml(area.label)}"><span aria-hidden="true">${areaIcon(area)}</span><strong>${escapeHtml(area.label)}</strong><small>${area.plantCount} plant${area.plantCount === 1 ? '' : 's'}</small></button>`).join('');
    const mapModeLabel = model.mapMode === 'image-aligned' ? 'Image aligned' : model.mapMode === 'image-draft' ? 'Image draft' : 'Conceptual layout';
    const mapImage = model.siteMap?.image || model.livingMap?.background?.assetUrl;
    return `<section class="nlxr-db-v2-living-map" aria-labelledby="nlxrDbV2MapTitle">
        <header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">▱</span><div><p class="nlxr-db-v2-eyebrow">SPATIAL OVERVIEW</p><h2 id="nlxrDbV2MapTitle">Living Map</h2></div></div><span class="nlxr-db-v2-map-count">${areas.length} area${areas.length === 1 ? '' : 's'}</span></header>
        <div class="nlxr-db-v2-map-canvas" aria-label="${mapModeLabel} project area layout">
            ${mapImage ? `<img class="nlxr-db-v2-map-image" src="${escapeHtml(mapImage)}" alt="" aria-hidden="true" />` : ''}
            <div class="nlxr-db-v2-map-grid" aria-hidden="true"></div>
            <svg class="nlxr-db-v2-map-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><filter id="nlxrV2Glow"><feGaussianBlur stdDeviation="1.4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#nlxrV2Glow)">${lines}</g></svg>
            ${nodes || '<p class="nlxr-db-v2-map-empty">Add an Area to begin the Living Map. The first layout will be clearly marked conceptual.</p>'}
            <div class="nlxr-db-v2-map-compass" aria-hidden="true">N<br><span>↑</span></div>
        </div>
        <footer class="nlxr-db-v2-map-footer"><span><i aria-hidden="true">✦</i> ${model.totalPlants} plants · ${model.placedPlants} placed</span><strong class="nlxr-db-v2-map-mode">${escapeHtml(mapModeLabel)}</strong></footer>
        <p class="nlxr-db-v2-map-note">${model.mapMode === 'image-aligned' ? 'Area positions are aligned over the project image.' : model.mapMode === 'image-draft' ? 'User image added · confirm alignment before treating positions as aligned.' : 'Nodes are arranged for organising the project, not as geographic coordinates.'}</p>
        <p class="nlxr-db-v2-map-legend"><span><i class="is-area" aria-hidden="true"></i> Areas</span><span><i class="is-link" aria-hidden="true"></i> Confirmed links only</span><span><i class="is-totem" aria-hidden="true"></i> Totems</span></p>
    </section>`;
}

function activityMarkup(model, heading = 'Recent activity') {
    const rows = (model.recentActivity || []).map(item => `<li><span class="nlxr-db-v2-activity-icon" aria-hidden="true">${markerIcon(item.type)}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span><i aria-hidden="true">•</i></li>`).join('');
    return `<section class="nlxr-db-v2-card nlxr-db-v2-activity-card" aria-labelledby="nlxrDbV2ActivityTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">◷</span><h2 id="nlxrDbV2ActivityTitle">${heading}</h2></div><button type="button" class="nlxr-db-v2-text-action" data-v2-mode="activity">View all</button></header>${rows ? `<ul class="nlxr-db-v2-activity-list">${rows}</ul>` : '<p class="nlxr-db-v2-empty">No activity has been recorded yet.</p>'}</section>`;
}

function healthMarkup(model) {
    const readiness = model.spatialReadiness;
    if (readiness.state === 'not-configured') {
        return `<section class="nlxr-db-v2-card nlxr-db-v2-health-card nlxr-db-v2-readiness-card" aria-labelledby="nlxrDbV2HealthTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon is-health" aria-hidden="true">⌁</span><h2 id="nlxrDbV2HealthTitle">Spatial Readiness</h2></div><span class="nlxr-db-v2-readiness-state">Not configured</span></header><p>Areas can stay conceptual. Add a Totem or site image when you want to align this project with a real place.</p><div class="nlxr-db-v2-readiness-actions"><button type="button" class="nlxr-db-v2-review-action" data-v2-guide>Learn about Totems <span aria-hidden="true">›</span></button><button type="button" class="nlxr-db-v2-review-action" data-v2-map-image>Add site image <span aria-hidden="true">›</span></button></div></section>`;
    }
    const placement = model.totalPlants ? `${model.placedPlants} of ${model.totalPlants}` : 'No plants yet';
    return `<section class="nlxr-db-v2-card nlxr-db-v2-health-card" aria-labelledby="nlxrDbV2HealthTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon is-health" aria-hidden="true">⌁</span><h2 id="nlxrDbV2HealthTitle">Spatial Readiness</h2></div><span class="nlxr-db-v2-readiness-state">Configured</span></header><div class="nlxr-db-v2-health-grid"><div><span aria-hidden="true">⌖</span><strong>${readiness.confirmedTotems}</strong><small>Totems confirmed</small></div><div><span aria-hidden="true">▱</span><strong>${readiness.siteImage ? 'Added' : 'Not added'}</strong><small>Site image</small></div><div><span aria-hidden="true">✦</span><strong>${escapeHtml(placement)}</strong><small>Plants placed</small></div></div><div class="nlxr-db-v2-readiness-actions"><button type="button" class="nlxr-db-v2-review-action" data-v2-health-review>Review spatial setup <span aria-hidden="true">›</span></button>${model.totalPlants > model.placedPlants ? `<button type="button" class="nlxr-db-v2-review-action" data-v2-unplaced>Review unplaced plants <span aria-hidden="true">›</span></button>` : ''}</div></section>`;
}

function toolsMarkup(model) {
    const projectId = encoded(model.project.id);
    const firstPlant = model.plantEntries[0]?.marker?.id;
    const pimAction = firstPlant
        ? `window.openProjectEntry('${projectId}','${encoded(firstPlant)}',false,'dashboard-v2',{workspace:'pim'})`
        : '';
    return `<section class="nlxr-db-v2-card nlxr-db-v2-tools-card" aria-labelledby="nlxrDbV2ToolsTitle"><header class="nlxr-db-v2-card-heading"><div><span class="nlxr-db-v2-section-icon" aria-hidden="true">⊞</span><h2 id="nlxrDbV2ToolsTitle">Project tools</h2></div></header><div class="nlxr-db-v2-tools-grid"><button type="button" onclick="window.renderFieldGuide('${projectId}',true)"><span aria-hidden="true">✦</span><strong>Plants</strong></button><button type="button" onclick="window.renderFieldGuide('${projectId}',true)"><span aria-hidden="true">▧</span><strong>Areas</strong></button><button type="button" ${pimAction ? `onclick="${pimAction}"` : 'data-v2-notice="pim"'}><span aria-hidden="true">⬡</span><strong>PIM</strong></button><button type="button" onclick="window.renderPrintCenter('${projectId}')"><span aria-hidden="true">↥</span><strong>Export</strong></button><button type="button" onclick="window.renderProjectGuide('${projectId}')"><span aria-hidden="true">?</span><strong>Project Guide</strong></button><button type="button" onclick="window.renderProjectSettings('${projectId}')"><span aria-hidden="true">⚙</span><strong>Settings</strong></button></div></section>`;
}

function overviewMarkup(model) {
    const projectId = encoded(model.project.id);
    const activeArea = encoded(model.currentAreaId);
    return `${mapMarkup(model)}
        <section class="nlxr-db-v2-metrics" aria-label="Project metrics">${metric('Plants', model.totalPlants, '✦')}${metric('Placed', model.placedPlants, '⌖')}${metric('Areas', model.areas.length, '▧')}${metric('Mapped', `${model.mappedPercentage}%`, '◔', 'is-percentage')}</section>
        <section class="nlxr-db-v2-primary-actions" aria-label="Primary project actions"><button class="is-primary" type="button" onclick="window.openProjectArMode('${projectId}','${activeArea}')"><span aria-hidden="true">⌾</span><strong>Open AR</strong></button><button type="button" onclick="window.renderLocationFieldMarker('${projectId}','plant','without-ar',true)"><span aria-hidden="true">⊕</span><strong>Add Plant</strong></button><button type="button" onclick="window.renderProjectAreaForm('${projectId}','dashboard')"><span aria-hidden="true">▧</span><strong>Add Area</strong></button></section>
        ${healthMarkup(model)}
        <div class="nlxr-db-v2-lower-grid">${activityMarkup(model)}${toolsMarkup(model)}</div>`;
}

function previewModeMarkup(model, mode) {
    if (mode === 'map') return `<section class="nlxr-db-v2-mode-preview"><p class="nlxr-db-v2-eyebrow">MAP PREVIEW</p><h2>Map mode is being shaped around the Living Map.</h2><p>The current V2 overview already uses your Areas and records. A dedicated map workspace will add editing, filtering and alignment controls as they become available.</p>${mapMarkup(model)}</section>`;
    if (mode === 'activity') return `<section class="nlxr-db-v2-mode-preview"><p class="nlxr-db-v2-eyebrow">ACTIVITY PREVIEW</p><h2>Project changes in one calm timeline.</h2><p>Activity is currently a compact preview. Existing records remain available through the established Web Hub and project entry actions.</p>${activityMarkup(model, 'Activity')}</section>`;
    return overviewMarkup(model);
}

export async function renderProjectDashboardV2(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const model = await loadProjectDashboardV2Model(projectId);
        const projectLabel = escapeHtml(model.project.name || model.project.id);
        const projectKey = encoded(model.project.id);
        app.innerHTML = `<div class="screen nlxr-db-v2" data-project-id="${projectKey}">
            <header class="nlxr-db-v2-header"><div class="nlxr-db-v2-header-copy"><p class="nlxr-db-v2-eyebrow">LIVING DASHBOARD</p><div class="nlxr-db-v2-project-title"><h1>${projectLabel}</h1><button type="button" aria-label="Choose another project" onclick="window.renderDemoProjects()">⌄</button></div><p class="nlxr-db-v2-sync"><i aria-hidden="true"></i> Project records ready</p></div><div class="nlxr-db-v2-header-actions"><details class="nlxr-db-v2-overflow"><summary aria-label="Project options">⋮</summary><div><button type="button" onclick="window.renderProjectDashboardV09('${projectKey}')">Open Classic Dashboard</button><button type="button" onclick="window.renderProjectSettings('${projectKey}')">Project Settings</button><button type="button" onclick="window.renderProjectGuide('${projectKey}')">Project Guide</button></div></details></div></header>
            <div class="nlxr-db-v2-version-row"><span class="nlxr-db-v2-preview-badge">NourishlandXR V1 <small>Living</small></span><button type="button" class="nlxr-db-v2-return" onclick="window.renderProjectDashboardV09('${projectKey}')">Classic Dashboard</button></div>
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
        const bindPanel = () => {
            panel.querySelectorAll('[data-living-area]').forEach(button => button.addEventListener('click', () => {
                const area = model.areas.find(candidate => candidate.id === button.dataset.livingArea);
                const sheet = app.querySelector('#nlxrLivingMapSheet');
                if (!area || !sheet) return;
                sheet.innerHTML = `<div><div><p class="nlxr-db-v2-eyebrow">AREA</p><h2>${escapeHtml(area.label)}</h2><p>${area.plantCount} plant${area.plantCount === 1 ? '' : 's'} · ${area.entryCount} entr${area.entryCount === 1 ? 'y' : 'ies'}</p></div><button type="button" aria-label="Close area details" data-close-map-sheet>×</button></div><p>${area.totemCount ? `${area.placedTotemCount} Totem${area.placedTotemCount === 1 ? '' : 's'} confirmed.` : 'No Totem is configured. This Area can remain conceptual.'}</p><div><button type="button" onclick="window.renderProjectAreaDashboard('${projectKey}','${encoded(area.id)}')">Open Area</button><button type="button" onclick="window.openProjectArMode('${projectKey}','${encoded(area.id)}')">Open in AR</button><button type="button" data-v2-notice="position">Edit position</button></div>`;
                sheet.hidden = false;
                sheet.querySelector('[data-close-map-sheet]')?.addEventListener('click', () => { sheet.hidden = true; });
                sheet.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => notice('Manual position editing will be added to the Living Map workspace.')));
            }));
            panel.querySelectorAll('[data-v2-health-review]').forEach(control => control.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard-v2')));
            panel.querySelector('[data-v2-guide]')?.addEventListener('click', () => window.renderProjectGuide(projectKey));
            panel.querySelector('[data-v2-map-image]')?.addEventListener('click', () => window.renderLocationMap(projectKey, true, 'dashboard-v2'));
            panel.querySelector('[data-v2-unplaced]')?.addEventListener('click', () => window.renderFieldGuide(projectKey, true));
            panel.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => notice('This Living Map capability is not yet available. Existing project tools remain available for live work.')));
        };
        app.querySelectorAll('[data-v2-mode]').forEach(button => button.addEventListener('click', () => {
            const mode = button.dataset.v2Mode;
            app.querySelectorAll('[data-v2-mode]').forEach(candidate => {
                const active = candidate === button;
                candidate.classList.toggle('is-active', active);
                if (active) candidate.setAttribute('aria-current', 'page');
                else candidate.removeAttribute('aria-current');
            });
            panel.innerHTML = previewModeMarkup(model, mode);
            bindPanel();
        }));
        app.querySelectorAll('[data-v2-notice]').forEach(control => control.addEventListener('click', () => {
            const messages = {
                pim: 'PIM opens after a Plant record exists. Add or import a Plant first.',
                position: 'Manual position editing will be added to the Living Map workspace.'
            };
            notice(messages[control.dataset.v2Notice] || 'This Living Map capability is not yet available.');
        }));
        bindPanel();
    } catch (error) {
        app.innerHTML = `<div class="screen nlxr-db-v2"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboardV09('${encoded(projectId)}')">Back to Classic Dashboard</button><p class="nlxr-db-v2-eyebrow">LIVING DASHBOARD</p><h1>Living Dashboard unavailable</h1><p class="subtitle">${escapeHtml(error.message)}</p><button type="button" onclick="window.renderProjectDashboardV09('${encoded(projectId)}')">Open Classic Dashboard</button></div></div>`;
    }
}
