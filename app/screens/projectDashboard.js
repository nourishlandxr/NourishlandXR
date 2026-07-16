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
const SETTINGS_KEY = 'nourishland-xr-settings';
const DEFAULT_SETTINGS = { sound: true, volume: 80, textSize: 'medium', visualQuality: 'automatic', language: 'en', hints: true };

export function readPlatformSettings() {
    try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function applyPlatformSettings(settings = readPlatformSettings()) {
    document.body.dataset.textSize = settings.textSize;
    document.body.dataset.visualQuality = settings.visualQuality;
    document.body.dataset.language = settings.language;
    document.body.dataset.hints = settings.hints ? 'on' : 'off';
    document.querySelectorAll('audio, video').forEach(media => {
        media.muted = !settings.sound;
        media.volume = Math.max(0, Math.min(1, Number(settings.volume) / 100));
    });
}

export function savePlatformSetting(name, value) {
    const settings = { ...readPlatformSettings(), [name]: value };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyPlatformSettings(settings);
}

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
            <button class="menu-card" onclick="window.renderPlatformComingSoon('About This Experience')"><strong>About This Experience</strong><span>How Nourishland XR works</span></button>
            <button class="menu-card" onclick="window.renderPlatformComingSoon('Settings')"><strong>Settings</strong><span>Platform preferences</span></button>
            <button class="menu-card" onclick="window.renderPlatformComingSoon('Account')"><strong>Account</strong><span>Local demonstration account</span></button>
        </nav>
    </div>`;
}

export function renderPlatformComingSoon(app, feature, returnTo = 'creator') {
    const backAction = returnTo === 'launch' ? 'window.renderLaunchScreen()' : 'window.renderDemoProjects()';
    if (feature === 'Settings') {
        const settings = readPlatformSettings();
        app.innerHTML = `<div class="screen settings-screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>Settings</h1><p class="subtitle">Adjust the experience for this device.</p></div>
            <div class="panel settings-list">
                <div class="setting-row"><div><strong>Sound</strong><p>Turn experience audio on or off.</p></div><label class="toggle-label"><input type="checkbox" ${settings.sound ? 'checked' : ''} onchange="window.savePlatformSetting('sound', this.checked)"><span>On</span></label></div>
                <div class="setting-row setting-range"><label for="settingsVolume"><strong>Volume</strong></label><div><input id="settingsVolume" type="range" min="0" max="100" step="5" value="${Number(settings.volume)}" oninput="document.getElementById('settingsVolumeValue').textContent = this.value + '%'; window.savePlatformSetting('volume', Number(this.value))"><output id="settingsVolumeValue" for="settingsVolume">${Number(settings.volume)}%</output></div></div>
                <div class="setting-row"><label for="settingsTextSize"><strong>Text size</strong></label><select id="settingsTextSize" onchange="window.savePlatformSetting('textSize', this.value)"><option value="small" ${settings.textSize === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${settings.textSize === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${settings.textSize === 'large' ? 'selected' : ''}>Large</option></select></div>
                <div class="setting-row"><div><strong>Visual quality</strong><p>Balanced automatically for this device.</p></div><span class="setting-value">Automatic</span></div>
                <div class="setting-row"><label for="settingsLanguage"><strong>Language</strong></label><select id="settingsLanguage" onchange="window.savePlatformSetting('language', this.value)"><option value="en" selected>English</option></select></div>
                <div class="setting-row"><div><strong>Hints and instructions</strong><p>Show guidance while creating and exploring.</p></div><label class="toggle-label"><input type="checkbox" ${settings.hints ? 'checked' : ''} onchange="window.savePlatformSetting('hints', this.checked)"><span>On</span></label></div>
            </div>
            <div class="panel build-information"><h2>Build information</h2><p><strong>Version:</strong> <code>${escapeHtml(BUILD_INFO.version)}</code></p><p><strong>Commit:</strong> <code>${escapeHtml(BUILD_INFO.commit)}</code></p><p><strong>Built:</strong> ${escapeHtml(BUILD_INFO.builtAt)}</p><p><strong>Target:</strong> ${escapeHtml(BUILD_INFO.target)}</p></div></div>`;
        return;
    }
    if (feature === 'About This Experience') {
        app.innerHTML = `<div class="screen about-experience"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><p class="welcome-label">Nourishland XR · Demo v0.8</p><h1>About This Experience</h1><p class="subtitle">Observe. Explore. Learn in place.</p></div><div class="panel guide"><p><strong>Nourishland XR</strong> turns gardens and landscapes into interactive learning experiences. It connects plants, stories, observations and natural relationships to the real places where they can be discovered.</p><h2>How it works</h2><ol><li><strong>Choose your path.</strong> Create an experience or explore a place.</li><li><strong>Select a place.</strong> Open a garden, food forest, farm or other mapped landscape.</li><li><strong>Learn in context.</strong> Discover markers, plant profiles and stories using Explorer or the Field Guide.</li><li><strong>Use AR at a location.</strong> When a location is selected, Start AR opens the initial spatial dashboard.</li></ol></div><div class="panel"><h2>Demo note</h2><p>This is a V1 Lite release candidate. Some authoring, publishing and device capabilities will continue to evolve.</p></div></div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from Home and every project dashboard.</p></div></div>`;
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
                { label: 'About This Experience', meta: 'INFO', action: "window.renderPlatformComingSoon('About This Experience')" },
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


