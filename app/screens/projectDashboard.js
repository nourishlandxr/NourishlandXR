import { createPlaceMarker, createSitePlace, loadPlaceMarkers, loadProjectSites, loadProjects, loadSitePlaces, updatePlaceMarker } from '../services/persistence.js';
import { renderProjectEntry } from '../components/projectEntry.js';
import { createProjectSite, renameProjectOnDisk } from '../services/persistence.js';
import { loadMarkerAnchor, saveMarkerAnchor } from '../services/persistence.js';
import { BUILD_INFO } from '../services/buildInfo.js';

const PROJECT_NAMES = {
    Hillyards: 'Hillyards Food Forest',
    Frankendael: 'Frankendael Park',
    Daleys: 'Daleys Fruit Tree Nursery'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const markerTypeLabel = type => ({ plant: 'Plant Marker', note: 'Custom Note', intro_checkpoint: 'Starting Point', sub_checkpoint: 'Sub Checkpoint' })[type] || 'Marker';
const markerIcon = type => ({ plant: '●', note: '✎', intro_checkpoint: '⌖', sub_checkpoint: '⌖' })[type] || '◆';
const entryStatus = marker => marker.visibility === 'public'
    ? { label: 'Published', tone: 'published' }
    : marker.visibility === 'draft' || !marker.visibility
        ? { label: 'Draft', tone: 'draft' }
        : { label: 'Needs review', tone: 'review' };
const editedLabel = value => {
    if (!value) return 'Date not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not recorded';
    const today = new Date();
    const day = 24 * 60 * 60 * 1000;
    const difference = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()) - new Date(date.getFullYear(), date.getMonth(), date.getDate())) / day);
    if (difference === 0) return 'Edited today';
    if (difference === 1) return 'Edited yesterday';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};
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
    if (!project) throw new Error('Location data is unavailable.');
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
    const projects = (await loadProjects()).filter(project => !['plant-library', 'Banyula'].includes(project.id));
    const cards = projects.map(project => `<button class="menu-card project-selection-row" onclick="window.renderProjectDashboard('${encoded(project.id)}')"><strong>${escapeHtml(PROJECT_NAMES[project.id] || project.name)}</strong></button>`).join('');
    app.innerHTML = `<div class="screen platform-home creator-project-menu">
        <div class="page-header">
            <button class="ghost" onclick="window.renderLaunchScreen()">Back</button>
            <p class="welcome-label">Nourishland XR</p>
            <h1>Home</h1>
            <p class="subtitle">Create once. Publish everywhere.</p>
        </div>
        <section class="project-section">
            <h2 class="project-section-title">Locations</h2>
            <div class="menu-stack project-selection-list">${cards || '<div class="panel"><p>No locations are available.</p></div>'}<button class="menu-card create-project-action" onclick="window.renderProjectForm()"><strong>Create a new location...</strong></button></div>
        </section>
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
        app.innerHTML = `<div class="screen about-experience"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><p class="welcome-label">Nourishland XR · Demo v0.8</p><h1>About This Experience</h1><p class="subtitle">Observe. Explore. Learn in place.</p></div><div class="panel guide"><p><strong>Nourishland XR</strong> turns gardens and landscapes into interactive learning experiences. It connects plants, stories, observations and natural relationships to the real places where they can be discovered.</p><h2>How it works</h2><ol><li><strong>Choose your path.</strong> Create an experience or explore a place.</li><li><strong>Select a location.</strong> Open a garden, food forest, farm or other mapped landscape.</li><li><strong>Learn in context.</strong> Discover markers, plant profiles and stories using Explorer or the Field Guide.</li><li><strong>Explore with AR.</strong> When a location is selected, open its optional augmented-reality experience.</li></ol></div><div class="panel"><h2>Demo note</h2><p>This is a V1 Lite release candidate. Some authoring, publishing and device capabilities will continue to evolve.</p></div></div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from the welcome page.</p></div></div>`;
}

export async function renderProjectDashboard(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, entries, startingPoint } = await projectContent(projectId);
        let startingAnchor = null;
        if (site && startingPoint) {
            try { startingAnchor = await loadMarkerAnchor(project.id, site.id, startingPoint.place.id, startingPoint.marker.id); }
            catch { startingAnchor = null; }
        }
        const hasGps = Number.isFinite(Number(startingAnchor?.latitude)) && Number.isFinite(Number(startingAnchor?.longitude));
        const startingConfigured = Boolean(startingPoint && (hasGps || startingAnchor?.qr_code));
        const published = entries.filter(entry => entry.marker.visibility === 'public').length;
        const drafts = entries.filter(entry => entry.marker.visibility !== 'public' && entry.marker.visibility !== 'hidden').length;
        const latestDate = entries.map(entry => entry.marker.modified || entry.marker.created).filter(Boolean).sort().at(-1);
        const experienceState = !startingConfigured
            ? { label: 'Setup incomplete', tone: 'incomplete' }
            : project.visibility === 'public'
                ? { label: 'Published', tone: 'published' }
                : { label: 'Draft', tone: 'draft' };
        const latestEntries = entries.slice(0, 8).map(({ marker }) => {
            const status = entryStatus(marker);
            return {
                label: escapeHtml(marker.name),
                icon: markerIcon(marker.type),
                type: markerTypeLabel(marker.type),
                status: status.label,
                statusTone: status.tone,
                edited: editedLabel(marker.modified || marker.created),
                action: marker.type === 'intro_checkpoint' ? `window.openProjectStartingPoint('${encoded(project.id)}')` : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
            };
        });
        app.innerHTML = renderProjectEntry({
            locationId: escapeHtml(project.id),
            locationName: escapeHtml(project.name),
            siteName: escapeHtml(site?.name || 'No site configured'),
            backAction: 'window.renderDemoProjects()',
            launchActions: [
                { label: 'Explore with AR', description: 'Discover information as you move through the landscape.', action: `window.startLocationAr('${encoded(project.id)}')` },
                { label: 'Browse Experience', description: 'Explore the map, plants and stories without using the camera.', action: `window.renderFieldGuide('${encoded(project.id)}', true)` }
            ],
            status: {
                label: experienceState.label,
                tone: experienceState.tone,
                startingPoint: escapeHtml(startingPoint?.marker.name || 'Not configured'),
                accuracy: startingAnchor?.accuracy ? `${Math.round(Number(startingAnchor.accuracy))} m` : startingConfigured ? 'Reference marker configured' : 'Not available',
                entries: `${published} published · ${drafts} draft${drafts === 1 ? '' : 's'}`,
                lastUpdated: latestDate ? editedLabel(latestDate).replace(/^Edited /, '') : 'No edits yet',
                directions: escapeHtml(startingPoint?.marker.directions || ''),
                notice: startingConfigured ? '' : 'Setup incomplete: A Starting Point is required before the camera experience can be published.',
                actions: [
                    { label: 'Edit Visitor Welcome', action: `window.editVisitorWelcome('${encoded(project.id)}')` },
                    { label: startingPoint ? 'View Starting Point' : 'Set Starting Point', action: `window.openProjectStartingPoint('${encoded(project.id)}')` },
                    { label: 'Manage Starting Point', action: `window.editProjectStartingPoint('${encoded(project.id)}')` },
                    { label: 'Preview visitor experience', action: `window.renderVisitorLocationIntro('${encoded(project.id)}', true)` }
                ]
            },
            addAction: { label: '+ Add to this location', description: 'Add a plant, place, story, note or starting point.', action: `window.renderAddToLocation('${encoded(project.id)}')` },
            tools: [
                { label: 'Field Guide', description: 'View and manage plants', action: `window.renderFieldGuide('${encoded(project.id)}', true)` },
                { label: 'Map', description: 'View everything by location', action: `window.renderLocationMap('${encoded(project.id)}')` },
                { label: 'Starting Points', description: 'Manage entrances and experience starting points', action: `window.renderStartingPoints('${encoded(project.id)}')` }
            ],
            latestEntries,
            viewAllAction: `window.renderFieldGuide('${encoded(project.id)}', true)`
        });
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Location unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderVisitorWelcomeEditor(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, startingPoint } = await projectContent(projectId);
        const marker = startingPoint?.marker || {};
        app.innerHTML = `<div class="screen visitor-welcome-editor"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">Creator</p><h1>Edit Visitor Welcome</h1><p class="subtitle">This is the introduction visitors see after choosing ${escapeHtml(project.name)}.</p></div><form class="panel" onsubmit="window.saveVisitorWelcome(event, '${encoded(project.id)}')"><div class="field"><label for="visitorWelcomeDescription">Location introduction</label><textarea id="visitorWelcomeDescription" rows="5" placeholder="Introduce the landscape and what visitors can discover.">${escapeHtml(project.description || '')}</textarea></div><div class="field"><label for="visitorWelcomeCover">Optional cover image</label><input id="visitorWelcomeCover" type="url" value="${escapeHtml(project.coverImage || '')}" placeholder="https://…" /></div><div class="field"><label for="visitorWelcomeHeading">Welcome-area heading</label><input id="visitorWelcomeHeading" value="${escapeHtml(marker.name || 'Welcome')}" required /></div><div class="field"><label for="visitorWelcomeText">Welcome message</label><textarea id="visitorWelcomeText" rows="5" placeholder="Welcome visitors and explain how to begin.">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="visitorWelcomeDirections">Arrival instructions</label><textarea id="visitorWelcomeDirections" rows="4" placeholder="Describe how to find the Starting Point.">${escapeHtml(marker.directions || '')}</textarea></div><div class="field"><label for="visitorWelcomeVisibility">Visitor visibility</label><select id="visitorWelcomeVisibility"><option value="public" ${marker.visibility === 'public' || !startingPoint ? 'selected' : ''}>Published — visible to visitors</option><option value="draft" ${startingPoint && marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft — creator only</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><p class="meta">The precise GPS position, accuracy, facing direction and QR reference remain available under Manage Starting Point.</p><p id="visitorWelcomeError" class="meta"></p><div class="button-row"><button type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}')">Manage Starting Point</button><button class="primary" type="submit">Save Visitor Welcome</button></div></form></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Visitor Welcome unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveVisitorWelcome(event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const error = document.getElementById('visitorWelcomeError');
    try {
        const context = await projectContent(projectId);
        await renameProjectOnDisk(projectId, { ...context.project, preserveId: true, name: context.project.name, description: document.getElementById('visitorWelcomeDescription').value.trim(), coverImage: document.getElementById('visitorWelcomeCover').value.trim() });
        const visibility = document.getElementById('visitorWelcomeVisibility').value;
        const site = context.site || await createProjectSite(projectId, { name: 'Main Area', description: 'Main visitor area.', visibility: 'draft' });
        let place = context.startingPoint?.place || context.places[0] || null;
        if (!place) place = await createSitePlace(projectId, site.id, { name: 'Visitor Welcome Area', type: 'Trail Stop', description: 'Where visitors begin the experience.', visibility });
        const data = { type: 'intro_checkpoint', name: document.getElementById('visitorWelcomeHeading').value.trim(), description: document.getElementById('visitorWelcomeText').value.trim(), directions: document.getElementById('visitorWelcomeDirections').value.trim(), visibility };
        if (context.startingPoint) await updatePlaceMarker(projectId, site.id, place.id, context.startingPoint.marker.id, data);
        else {
            const created = await createPlaceMarker(projectId, site.id, place.id, data);
            await updatePlaceMarker(projectId, site.id, place.id, created.id, data);
        }
        await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (failure) {
        if (error) error.textContent = `Save failed: ${failure.message}`;
    }
}

export async function renderNewLocationSetup(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, entries, startingPoint } = await projectContent(projectId);
        const hasFirstContent = entries.some(entry => !['intro_checkpoint', 'sub_checkpoint'].includes(entry.marker.type));
        app.innerHTML = `<div class="screen setup-flow"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Save and exit</button><p class="welcome-label">New location setup</p><h1>${escapeHtml(project.name)}</h1><p class="subtitle">A short checklist to prepare the visitor experience.</p></div><ol class="setup-checklist"><li class="is-complete"><strong>1. Name the location</strong><span>${escapeHtml(project.name)}</span></li><li class="${project.description ? 'is-complete' : ''}"><strong>2. Add a description and optional cover image</strong><span>${escapeHtml(project.description || 'Description can be completed later.')}</span></li><li class="${startingPoint ? 'is-complete' : 'is-current'}"><strong>3. Set the Starting Point</strong><span>Choose where visitors will begin.</span></li><li class="${hasFirstContent ? 'is-complete' : ''}"><strong>4. Add the first plant or place</strong><span>Written information can be added without opening the camera.</span></li><li><strong>5. Preview the visitor experience</strong><span>Review the location before sharing it.</span></li></ol><section class="panel starting-point-explanation"><h2>Set the Starting Point</h2><p>Choose where visitors will begin. This helps Nourishland position the experience correctly when they arrive.</p><div class="setup-choice-grid"><button type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}')"><strong>Set it while standing there</strong><span>Use the phone’s current position.</span></button><button type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}')"><strong>Choose it on the map</strong><span>Useful when creating from a computer.</span></button></div></section><div class="button-row"><button type="button" onclick="window.renderAddToLocation('${encoded(project.id)}')">Add the first plant or place</button><button class="primary" type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Preview location dashboard</button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAddToLocation(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    const action = (label, description, onclick) => `<button class="content-type-row" type="button" onclick="${onclick}"><strong>${label}</strong><span>${description}</span></button>`;
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Add to this location</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel"><p>Add all written information now. A precise physical position can be added manually or captured later with a phone.</p></div><div class="content-type-list">${action('Plant', 'Add names, description and plant information.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant')`)}${action('Place or zone', 'Create a named area within this location.', `window.renderPlaceForLocation('${encoded(project.id)}')`)}${action('Story or information', 'Share knowledge connected to the location.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'note')`)}${action('Note', 'Record an observation or practical detail.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'note')`)}${action('Starting point', 'Choose where visitors begin.', `window.editProjectStartingPoint('${encoded(project.id)}')`)}</div></div>`;
}

export async function renderLocationMap(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries } = await projectContent(projectId);
        const placeRows = places.map(place => {
            const count = entries.filter(entry => entry.place.id === place.id).length;
            return `<div class="location-map-row"><div><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.type || 'Place')} · ${count} entr${count === 1 ? 'y' : 'ies'}</span></div><span>${escapeHtml(place.mapPosition || 'Position not set')}</span></div>`;
        }).join('');
        app.innerHTML = `<div class="screen location-map-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Map</h1><p class="subtitle">${escapeHtml(project.name)} · ${escapeHtml(site?.name || 'Location')}</p></div><div class="panel"><h2>Spatial overview</h2><p>Browse every place and its entries without opening the camera.</p></div><div class="location-map-list">${placeRows || '<div class="panel"><p>No places have been added yet.</p></div>'}</div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Map unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderStartingPoints(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, entries } = await projectContent(projectId);
        const startingPoints = entries.filter(entry => ['intro_checkpoint', 'sub_checkpoint'].includes(entry.marker.type));
        const rows = startingPoints.map(({ marker }) => `<button class="latest-entry-row" type="button" onclick="${marker.type === 'intro_checkpoint' ? `window.openProjectStartingPoint('${encoded(project.id)}')` : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`}"><span class="latest-entry-icon" aria-hidden="true">⌖</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${marker.type === 'intro_checkpoint' ? 'Main Starting Point' : 'Additional Starting Point'} · ${escapeHtml(marker.visibility || 'draft')}</span></span></button>`).join('');
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Starting Points</h1><p class="subtitle">Manage entrances and experience starting points.</p></div><div class="latest-entries-section"><div class="latest-entry-list">${rows || '<p class="project-empty-state">No Starting Point has been configured.</p>'}</div></div><button class="add-to-location-action" type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}')"><strong>${startingPoints.length ? 'Manage Starting Point' : 'Set Starting Point'}</strong><span>Choose where visitors begin the experience.</span></button></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Starting Points unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
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
        const { project, site, startingPoint } = await startingContext(projectId);
        const marker = startingPoint?.marker || {};
        let anchor = {};
        if (startingPoint) {
            try { anchor = await loadMarkerAnchor(project.id, site.id, startingPoint.place.id, marker.id); }
            catch { anchor = {}; }
        }
        app.innerHTML = `<div class="screen starting-point-form"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${startingPoint ? 'Manage' : 'Set'} Starting Point</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel starting-point-explanation"><h2>Set the Starting Point</h2><p>Choose where visitors will begin. This helps Nourishland position the experience correctly when they arrive.</p></div><form class="panel" onsubmit="window.saveProjectStartingPoint(event, '${encoded(project.id)}')"><div class="field"><label for="projectStartingName">Starting-point name</label><input id="projectStartingName" value="${escapeHtml(marker.name || 'Starting Point')}" required /></div><div class="field"><label for="projectStartingDescription">Welcome text</label><textarea id="projectStartingDescription" rows="4">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="projectStartingDirections">Arrival instructions</label><textarea id="projectStartingDirections" rows="3">${escapeHtml(marker.directions || '')}</textarea></div><div class="setup-choice-grid"><button type="button" onclick="window.captureStartingPointLocation()"><strong>Set it while standing there</strong><span>Use this phone’s current position.</span></button><button type="button" onclick="window.focusStartingPointMapFields()"><strong>Choose it on the map</strong><span>Enter coordinates from a computer.</span></button></div><div class="coordinate-grid"><div class="field"><label for="projectStartingLatitude">Latitude</label><input id="projectStartingLatitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.latitude ?? '')}" /></div><div class="field"><label for="projectStartingLongitude">Longitude</label><input id="projectStartingLongitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.longitude ?? '')}" /></div></div><div class="coordinate-grid"><div class="field"><label for="projectStartingAccuracy">Location accuracy (metres)</label><input id="projectStartingAccuracy" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.accuracy ?? '')}" /></div><div class="field"><label for="projectStartingFacing">Direction visitors should face</label><input id="projectStartingFacing" value="${escapeHtml(marker.facing_direction || '')}" placeholder="For example: north toward the orchard" /></div></div><div class="field"><label for="projectStartingPhoto">Optional reference photo</label><input id="projectStartingPhoto" type="url" value="${escapeHtml(marker.reference_photo || '')}" placeholder="https://…" /></div><div class="field"><label for="projectStartingQr">Optional QR or physical marker reference</label><input id="projectStartingQr" value="${escapeHtml(anchor.qr_code || marker.qr_reference || '')}" /></div><div class="field"><label for="projectStartingVisibility">Visibility</label><select id="projectStartingVisibility"><option value="draft" ${marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft - Creator only</option><option value="public" ${marker.visibility === 'public' ? 'selected' : ''}>Public</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><p id="projectStartingLocationStatus" class="meta">${anchor.latitude && anchor.longitude ? `Position configured${anchor.accuracy ? ` · accuracy ${escapeHtml(anchor.accuracy)} m` : ''}.` : 'Position not configured. You can save and finish it later.'}</p><p id="projectStartingError" class="meta"></p><button class="primary" type="submit">Save Starting Point</button></form></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Starting Point unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export function captureStartingPointLocation() {
    const status = document.getElementById('projectStartingLocationStatus');
    if (!navigator.geolocation) { if (status) status.textContent = 'Current position is unavailable. Enter coordinates manually.'; return; }
    if (status) status.textContent = 'Finding your current position…';
    navigator.geolocation.getCurrentPosition(position => {
        document.getElementById('projectStartingLatitude').value = position.coords.latitude;
        document.getElementById('projectStartingLongitude').value = position.coords.longitude;
        document.getElementById('projectStartingAccuracy').value = position.coords.accuracy;
        status.textContent = `Current position captured · accuracy ${Math.round(position.coords.accuracy)} m.`;
    }, failure => { status.textContent = failure.code === 1 ? 'Location permission was denied. Enter coordinates manually.' : 'Current position is unavailable. Enter coordinates manually.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}

export function focusStartingPointMapFields() {
    document.getElementById('projectStartingLatitude')?.focus();
    const status = document.getElementById('projectStartingLocationStatus');
    if (status) status.textContent = 'Enter the latitude and longitude selected on your map.';
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
        const latitude = document.getElementById('projectStartingLatitude').value.trim();
        const longitude = document.getElementById('projectStartingLongitude').value.trim();
        const accuracy = document.getElementById('projectStartingAccuracy').value.trim();
        const qrReference = document.getElementById('projectStartingQr').value.trim();
        const hasCoordinates = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
        const data = { type: 'intro_checkpoint', name: document.getElementById('projectStartingName').value.trim(), description: document.getElementById('projectStartingDescription').value.trim(), directions: document.getElementById('projectStartingDirections').value.trim(), reference_photo: document.getElementById('projectStartingPhoto').value.trim(), facing_direction: document.getElementById('projectStartingFacing').value.trim(), qr_reference: qrReference, visibility };
        let savedMarker;
        if (context.startingPoint) savedMarker = await updatePlaceMarker(projectId, context.site.id, place.id, context.startingPoint.marker.id, data);
        else {
            savedMarker = await createPlaceMarker(projectId, context.site.id, place.id, data);
            savedMarker = await updatePlaceMarker(projectId, context.site.id, place.id, savedMarker.id, data);
        }
        if (hasCoordinates || qrReference) await saveMarkerAnchor(projectId, context.site.id, place.id, savedMarker.id, { type: hasCoordinates ? 'gps' : 'qr', latitude: hasCoordinates ? Number(latitude) : '', longitude: hasCoordinates ? Number(longitude) : '', accuracy: accuracy === '' ? '' : Number(accuracy), qr_code: qrReference, description: data.directions });
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
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${escapeHtml(entry.marker.name)}</h1><p class="subtitle">${markerTypeLabel(entry.marker.type)}</p></div><div class="panel"><p>${escapeHtml(entry.marker.description || entry.marker.notes || 'No additional information yet.')}</p><p class="meta">${escapeHtml(entry.place.name)} · ${escapeHtml(entry.marker.visibility || 'draft')}</p></div></div>`;
}


