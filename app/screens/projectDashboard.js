import { createPlaceMarker, createSitePlace, loadPlaceMarkers, loadProjectSites, loadProjects, loadSitePlaces, updatePlaceMarker } from '../services/persistence.js';
import { renderProjectEntry } from '../components/projectEntry.js';
import { BUILD_INFO } from '../services/buildInfo.js';

const PROJECT_NAMES = {
    Hillyards: 'Hillyards Food Forest',
    Frankendael: 'Frankendael Park',
    Daleys: 'Daleys Fruit Tree Nursery',
    Banyula: 'Banyula Farm'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const markerTypeLabel = type => ({ plant: 'Plant Marker', note: 'Custom Note', intro_checkpoint: 'Starting Point', sub_checkpoint: 'Sub Checkpoint' })[type] || 'Marker';

async function projectById(projectId) {
    const project = (await loadProjects()).find(item => item.id === projectId);
    if (!project) throw new Error('Project data is unavailable.');
    return { ...project, name: PROJECT_NAMES[project.id] || project.name };
}

async function projectContent(projectId) {
    const project = await projectById(projectId);
    const sites = await loadProjectSites(project.id);
    const site = sites.find(item => item.id === 'main_food_forest') || sites[0] || null;
    const places = site ? await loadSitePlaces(project.id, site.id) : [];
    const markerGroups = await Promise.all(places.map(async place => ({ place, markers: await loadPlaceMarkers(project.id, site.id, place.id) })));
    const entries = markerGroups.flatMap(group => group.markers.map(marker => ({ marker, place: group.place })));
    entries.sort((left, right) => String(right.marker.modified || right.marker.created || '').localeCompare(String(left.marker.modified || left.marker.created || '')));
    return { project, sites, site, places, entries, startingPoint: entries.find(entry => entry.marker.type === 'intro_checkpoint') || null };
}

export async function renderPlatformHome(app) {
    const projects = (await loadProjects()).filter(project => project.id !== 'plant-library');
    const cards = projects.map(project => `<button class="menu-card project-selection-row" onclick="window.renderProjectDashboard('${encoded(project.id)}')"><strong>${escapeHtml(PROJECT_NAMES[project.id] || project.name)}</strong></button>`).join('');
    app.innerHTML = `<div class="screen platform-home creator-project-menu">
        <div class="page-header">
            <button class="ghost" onclick="window.renderLaunchScreen()">Back</button>
            <p class="welcome-label">Nourishland XR</p>
            <h1>Home</h1>
            <p class="subtitle">Create once. Publish everywhere.</p>
        </div>
        <section class="project-section">
            <h2 class="project-section-title">Projects</h2>
            <div class="menu-stack project-selection-list">${cards || '<div class="panel"><p>No projects are available.</p></div>'}<button class="menu-card create-project-action" onclick="window.renderProjectForm()"><strong>Create a new project...</strong></button></div>
        </section>
        <nav class="platform-global-nav platform-utility-nav" aria-label="Platform utilities">
            <button class="menu-card" onclick="window.renderPlatformComingSoon('Logs')"><strong>Logs</strong><span>Platform activity</span></button>
            <button class="menu-card" onclick="window.renderPlatformComingSoon('Settings')"><strong>Settings</strong><span>Platform preferences</span></button>
            <button class="menu-card" onclick="window.renderPlatformComingSoon('Account')"><strong>Account</strong><span>Local demonstration account</span></button>
        </nav>
    </div>`;
}

export function renderPlatformComingSoon(app, feature) {
    if (feature === 'Settings') {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Settings</h1><p class="subtitle">Platform preferences</p></div><div class="panel"><h2>Build information</h2><p><strong>Version:</strong> <code>${escapeHtml(BUILD_INFO.version)}</code></p><p><strong>Commit:</strong> <code>${escapeHtml(BUILD_INFO.commit)}</code></p><p><strong>Built:</strong> ${escapeHtml(BUILD_INFO.builtAt)}</p><p><strong>Target:</strong> ${escapeHtml(BUILD_INFO.target)}</p></div></div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from Home and every project dashboard.</p></div></div>`;
}

export async function renderProjectDashboard(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, entries, startingPoint } = await projectContent(projectId);
        const back = `window.renderProjectDashboard('${encoded(project.id)}')`;
        const startingAction = startingPoint
            ? { label: 'Starting Point', actions: [
                { label: 'Go to Starting Point', action: `window.openProjectStartingPoint('${encoded(project.id)}')` },
                { label: 'Edit Starting Point', action: `window.editProjectStartingPoint('${encoded(project.id)}')` }
            ] }
            : { label: 'Add Starting Point Marker', action: `window.addProjectStartingPoint('${encoded(project.id)}')` };
        const latestEntries = entries.slice(0, 12).map(({ marker }) => ({ label: marker.name, meta: `${markerTypeLabel(marker.type)} Ã‚Â· ${marker.visibility || 'draft'}`, action: marker.type === 'intro_checkpoint' ? `window.openProjectStartingPoint('${encoded(project.id)}')` : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')` }));
        app.innerHTML = renderProjectEntry({
            projectName: project.name,
            siteName: site?.name || 'No site configured',
            backAction: 'window.renderDemoProjects()',
            mainActions: [
                { label: `Welcome to ${project.name}`, action: `window.renderComingSoon('Welcome to ${escapeHtml(project.name)}', 'Introduce this project and its landscape.', 'Open the public welcome content saved for this project.', 'Select the welcome board from the project dashboard.', '${back}')` },
                startingAction,
                { label: `${project.name} Field Guide`, action: `window.renderFieldGuide('${encoded(project.id)}', true)` },
                { label: 'Map', meta: 'Coming Soon', action: `window.renderComingSoon('Map', 'Show places, markers and plant positions for ${escapeHtml(project.name)}.', 'Read map positions from the shared project workspace.', 'Open the map and select a public marker.', '${back}')` }
            ],
            latestEntries,
            sideActions: [
                { label: 'Logs', meta: 'LOG', action: "window.renderPlatformComingSoon('Logs')" },
                { label: 'Settings', meta: 'SET', action: "window.renderPlatformComingSoon('Settings')" },
                { label: 'Account', meta: 'ACC', action: "window.renderPlatformComingSoon('Account')" }
            ]
        });
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Project unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function startingContext(projectId) {
    const context = await projectContent(projectId);
    if (!context.site) throw new Error('Create a site before adding a starting point.');
    return context;
}

export async function renderStartingPointForm(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, startingPoint } = await startingContext(projectId);
        const marker = startingPoint?.marker || {};
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${startingPoint ? 'Edit' : 'Add'} Starting Point</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel"><form onsubmit="window.saveProjectStartingPoint(event, '${encoded(project.id)}')"><div class="field"><label for="projectStartingName">Name</label><input id="projectStartingName" value="${escapeHtml(marker.name || 'Starting Point')}" required /></div><div class="field"><label for="projectStartingDescription">Welcome text</label><textarea id="projectStartingDescription" rows="5">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="projectStartingVisibility">Visibility</label><select id="projectStartingVisibility"><option value="draft" ${marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft - Creator only</option><option value="public" ${marker.visibility === 'public' ? 'selected' : ''}>Public</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><p id="projectStartingError" class="meta"></p><button class="primary" type="submit">Save Starting Point</button></form></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Starting Point unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveProjectStartingPoint(event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const error = document.getElementById('projectStartingError');
    try {
        const context = await startingContext(projectId);
        const visibility = document.getElementById('projectStartingVisibility').value;
        let place = context.startingPoint?.place || context.places[0] || null;
        if (!place) place = await createSitePlace(projectId, context.site.id, { name: 'Starting Point', type: 'Trail Stop', description: 'Default project starting point place.', visibility });
        const data = { type: 'intro_checkpoint', name: document.getElementById('projectStartingName').value.trim(), description: document.getElementById('projectStartingDescription').value.trim(), visibility };
        if (context.startingPoint) await updatePlaceMarker(projectId, context.site.id, place.id, context.startingPoint.marker.id, data);
        else await createPlaceMarker(projectId, context.site.id, place.id, data);
        await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}

export async function openProjectStartingPoint(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const { project, startingPoint } = await projectContent(projectId);
    if (!startingPoint) return renderStartingPointForm(app, encoded(projectId));
    const marker = startingPoint.marker;
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${escapeHtml(marker.name)}</h1><p class="subtitle">${escapeHtml(project.name)} Starting Point</p></div><div class="panel"><p>${escapeHtml(marker.description || 'Welcome information has not been added yet.')}</p><p class="meta">Visibility: ${escapeHtml(marker.visibility || 'draft')}</p></div><button class="menu-card" onclick="window.editProjectStartingPoint('${encoded(project.id)}')"><strong>Edit Starting Point</strong></button></div>`;
}

export async function openProjectEntry(app, encodedProjectId, encodedMarkerId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const { project, entries } = await projectContent(projectId);
    const entry = entries.find(item => item.marker.id === markerId);
    if (!entry) throw new Error('Entry not found.');
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${escapeHtml(entry.marker.name)}</h1><p class="subtitle">${markerTypeLabel(entry.marker.type)}</p></div><div class="panel"><p>${escapeHtml(entry.marker.description || entry.marker.notes || 'No additional information yet.')}</p><p class="meta">${escapeHtml(entry.place.name)} Ã‚Â· ${escapeHtml(entry.marker.visibility || 'draft')}</p></div></div>`;
}


