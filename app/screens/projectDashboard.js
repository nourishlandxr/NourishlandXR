import { createPlaceMarker, createSitePlace, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, updatePlaceMarker } from '../services/persistence.js';
import { renderProjectEntry } from '../components/projectEntry.js';
import { deleteSitePlace, updateSitePlace } from '../services/persistence.js';
import { createProjectSite, deleteProjectOnDisk, renameProjectOnDisk } from '../services/persistence.js';
import { loadMarkerAnchor, saveMarkerAnchor } from '../services/persistence.js';
import { BUILD_INFO } from '../services/buildInfo.js';
import { loadPlantInstances, loadPlantLibrary } from '../services/plantDataService.js';
import { dismissTutorialFeature, getArTutorialProgress, getTutorialStage, isProjectTutorialEnabled, recallTutorialFeatures, recordTutorialEvent, replayArTutorial, resetArLearningTips, resetLearningTips, restartProjectTutorial, setArHintsEnabled, setProjectTutorialMode } from '../services/tutorialProgress.js';
import { prepareArDashboardSnapshot } from './arMode.js';

const PROJECT_NAMES = {
    Hillyards: 'Hillyards Food Forest',
    Frankendael: 'Frankendael Park',
    Daleys: 'Daleys Fruit Tree Nursery'
};
const PROJECT_THEMES = new Set(['light', 'dark', 'forest-dark', 'forest-light', 'cyber']);
const DARK_PROJECT_THEMES = new Set(['dark', 'forest-dark', 'cyber']);
const projectThemeSaveQueues = new Map();
const requestedProjectThemes = new Map();

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const markerTypeLabel = type => ({ plant: 'Plant', note: 'Note', intro_checkpoint: 'Starting Point', sub_checkpoint: 'Checkpoint' })[type] || 'Content';
const markerIcon = type => ({ plant: '🌱', note: '✎', intro_checkpoint: '⚑', sub_checkpoint: '⚑' })[type] || '◆';
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
const entryDateLabel = value => {
    if (!value) return 'Date not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date not recorded';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const entryCreatorLabel = marker => marker.createdBy
    || marker.created_by
    || marker.author
    || marker.creator
    || marker.addedBy
    || marker.added_by
    || 'Local creator';
const SETTINGS_KEY = 'nourishland-xr-settings';
const DEFAULT_SETTINGS = { sound: true, volume: 80, textSize: 'medium', visualQuality: 'automatic', language: 'en', hints: true, developerDiagnostics: false };

export function applyProjectTheme(theme = 'forest-light') {
    const selectedTheme = PROJECT_THEMES.has(theme) ? theme : 'forest-light';
    document.body.dataset.projectTheme = selectedTheme;
    document.body.style.colorScheme = DARK_PROJECT_THEMES.has(selectedTheme) ? 'dark' : 'light';
    return selectedTheme;
}

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
    const resolvedProject = { ...project, name: PROJECT_NAMES[project.id] || project.name };
    applyProjectTheme(resolvedProject.theme);
    return resolvedProject;
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

async function entriesWithPlacement(project, site, entries) {
    if (!site) return entries.map(entry => ({ ...entry, anchor: null, isPlaced: false }));
    return Promise.all(entries.map(async entry => {
        try {
            const anchor = await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id);
            return { ...entry, anchor, isPlaced: Boolean(anchor?.type || anchor?.qr_code || (Number.isFinite(Number(anchor?.latitude)) && Number.isFinite(Number(anchor?.longitude)))) };
        } catch {
            return { ...entry, anchor: null, isPlaced: false };
        }
    }));
}

function hasGpsCoordinates(anchor) {
    return anchor?.type === 'gps'
        && Number.isFinite(Number(anchor.latitude))
        && Number.isFinite(Number(anchor.longitude));
}

async function projectAreaContext(projectId, areaId) {
    const context = await projectContent(projectId);
    const area = context.places.find(place => place.id === areaId && place.name !== 'Unassigned');
    if (!context.site || !area) throw new Error('Area data is unavailable.');
    return {
        ...context,
        area,
        areaEntries: context.entries.filter(entry => entry.place.id === area.id)
    };
}

function searchableText(...values) {
    const textValues = value => {
        if (value === null || value === undefined) return [];
        if (Array.isArray(value)) return value.flatMap(textValues);
        if (typeof value === 'object') return Object.values(value).flatMap(textValues);
        return [String(value)];
    };
    return values.flatMap(textValues).join(' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

async function buildProjectSearchItems(project, site, areas, entries) {
    let plantsById = new Map();
    let instancesById = new Map();
    if (site && entries.some(entry => entry.marker.type === 'plant' && entry.marker.plantId)) {
        const [library, instanceData] = await Promise.all([
            loadPlantLibrary(true),
            loadPlantInstances(project.id, site.id, true)
        ]);
        plantsById = new Map((library.plants || []).map(plant => [plant.id, plant]));
        instancesById = new Map((instanceData.instances || []).map(instance => [instance.id, instance]));
    }

    const legacyProfiles = new Map();
    if (site) {
        await Promise.all(entries.map(async entry => {
            if (entry.marker.type !== 'plant' || !entry.marker.plant_profile_path) return;
            try {
                legacyProfiles.set(entry.marker.id, await loadPlantProfile(project.id, site.id, entry.place.id, entry.marker.id));
            } catch {
                legacyProfiles.set(entry.marker.id, null);
            }
        }));
    }

    const areaItems = areas.map(area => ({
        icon: '▧',
        label: escapeHtml(area.name),
        type: 'Area',
        area: escapeHtml(area.type || 'Area'),
        detail: escapeHtml(area.description || 'Open the Area dashboard.'),
        searchText: searchableText('Area', area),
        action: `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')`
    }));

    const contentItems = entries.map(({ marker, place }) => {
        const plant = marker.type === 'plant' ? plantsById.get(marker.plantId) : null;
        const instance = marker.type === 'plant' ? instancesById.get(marker.plantInstanceId) : null;
        const legacyProfile = marker.type === 'plant' ? legacyProfiles.get(marker.id) : null;
        const detail = marker.description
            || marker.notes
            || plant?.scientificName
            || plant?.summary
            || legacyProfile?.scientific_name
            || legacyProfile?.overview
            || 'Open saved information.';
        return {
            icon: markerIcon(marker.type),
            label: escapeHtml(marker.name),
            type: escapeHtml(markerTypeLabel(marker.type)),
            area: escapeHtml(place.name || 'Unassigned'),
            detail: escapeHtml(detail),
            searchText: searchableText(markerTypeLabel(marker.type), place, marker, plant, instance, legacyProfile),
            action: marker.type === 'intro_checkpoint'
                ? `window.openProjectStartingPoint('${encoded(project.id)}')`
                : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
        };
    });

    return [...areaItems, ...contentItems];
}

export function toggleAreas(event) {
    const section = event.currentTarget.closest('[data-areas-expanded]');
    if (!section) return;
    const expanded = section.dataset.areasExpanded === 'true';
    section.dataset.areasExpanded = expanded ? 'false' : 'true';
    const arrow = section.querySelector('.areas-arrow');
    if (arrow) arrow.textContent = expanded ? '▾' : '▴';
}

export function filterProjectSearch(value) {
    const query = String(value || '').trim().toLocaleLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const resultList = document.getElementById('projectSearchResults');
    const emptyState = document.getElementById('projectSearchEmpty');
    const summary = document.getElementById('projectSearchSummary');
    const items = [...document.querySelectorAll('[data-project-search-item]')];
    let visible = 0;

    items.forEach(item => {
        const matches = terms.length > 0 && terms.every(term => String(item.dataset.search || '').includes(term));
        item.hidden = !matches;
        if (matches) visible += 1;
    });

    if (resultList) resultList.hidden = terms.length === 0 || visible === 0;
    if (emptyState) emptyState.hidden = terms.length === 0 || visible > 0;
    if (summary) {
        summary.textContent = terms.length === 0
            ? `Start typing to search ${items.length} item${items.length === 1 ? '' : 's'}.`
            : `${visible} result${visible === 1 ? '' : 's'} for “${String(value).trim()}”.`;
    }
}

const GUIDANCE_EVENTS = {
    dashboardWelcome: 'dashboard_opened',
    arMode: 'ar_mode_introduced',
    contentMode: 'content_mode_introduced',
    quickAccess: 'quick_access_introduced',
    area: 'area_explained',
    startingPoint: 'starting_point_explained'
};
const forcedGuidanceFeatures = new Map();

function dashboardGuidance(projectId, { hasArea, startingConfigured, freshProject }) {
    if (!isProjectTutorialEnabled(projectId)) return null;
    const candidates = [
        freshProject ? ['dashboardWelcome', 'header'] : null,
        ['quickAccess', 'quickAccess'],
        !hasArea ? ['area', 'areas'] : null,
        ['arMode', 'workMode'],
        ['contentMode', 'workMode'],
        !startingConfigured ? ['startingPoint', 'status'] : null
    ].filter(Boolean);
    const forcedFeature = forcedGuidanceFeatures.get(projectId);
    const selected = forcedFeature
        ? [forcedFeature, 'workMode']
        : candidates.find(([feature]) => getTutorialStage(projectId, feature) !== 'understood');
    forcedGuidanceFeatures.delete(projectId);
    if (!selected) return null;
    const [feature, target] = selected;
    const stage = getTutorialStage(projectId, feature);
    const content = {
        dashboardWelcome: {
            title: 'Welcome to your Dashboard',
            full: 'This is where your project is organized, edited and brought to life. You can build content on screen or work directly in the landscape using AR.',
            short: 'This Dashboard is your workspace for organizing content and working in AR.',
            actionLabel: '',
            action: ''
        },
        area: {
            title: 'Areas organise your Location',
            full: 'An Area is a meaningful section inside a Location, such as an orchard row, garden bed, fountain, restaurant, propagation area or walking path. Create one now; you can rename or update it later.',
            short: 'Create or select an Area before adding content. You can change it later.',
            actionLabel: hasArea ? 'View Areas' : 'Create Area',
            action: hasArea ? `window.openCreatorContentMode('${encoded(projectId)}')` : `window.renderProjectAreaForm('${encoded(projectId)}', 'dashboard')`
        },
        quickAccess: {
            title: 'Quick Access',
            full: 'Add a Plant, Checkpoint or Note. You can prepare information now and position it later using a map or AR Mode.',
            short: 'Add a Plant, Checkpoint or Note now and position it later.',
            actionLabel: '',
            action: ''
        },
        arMode: {
            title: 'About AR Mode',
            full: 'AR Mode uses your device’s camera and location to view, create and position content in the physical landscape. Camera and location permission are requested only after you continue through the preparation screen. You can return to Content Mode at any time.',
            short: 'AR Mode uses the camera and location. Permissions are requested only after the preparation screen.',
            actionLabel: 'Open AR Mode',
            action: `window.openCreatorArMode('${encoded(projectId)}')`
        },
        contentMode: {
            title: 'About Content Mode',
            full: 'Content Mode lets you add, edit and organize the project without using the camera. Content created here can be positioned later using a map or AR Mode.',
            short: 'Content Mode works without the camera. Position content later when needed.',
            actionLabel: 'Open Content Mode',
            action: `window.openCreatorContentMode('${encoded(projectId)}')`
        },
        startingPoint: {
            title: 'Starting Point still needed',
            full: 'A Starting Point defines where visitors begin and connects the digital experience to the physical Location. Configure its Area and arrival information now; its position can be updated later.',
            short: 'Set where visitors begin. You can update the Starting Point later.',
            actionLabel: 'Set Starting Point',
            action: `window.editProjectStartingPoint('${encoded(projectId)}')`
        }
    }[feature];
    return {
        feature,
        target,
        stage,
        title: content.title,
        body: stage === 'new' ? content.full : content.short,
        actionLabel: content.actionLabel,
        action: content.action,
        dismissAction: `window.dismissProjectGuidance('${encoded(projectId)}', '${feature}')`,
        nextAction: `window.dismissProjectGuidance('${encoded(projectId)}', '${feature}')`,
        introducedEvent: GUIDANCE_EVENTS[feature]
    };
}

export async function dismissProjectGuidance(app, encodedProjectId, feature) {
    const projectId = decodeURIComponent(encodedProjectId);
    dismissTutorialFeature(projectId, feature);
    await renderProjectDashboard(app, encoded(projectId));
}

export async function showWorkModeGuidance(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    recallTutorialFeatures(projectId, ['arMode', 'contentMode']);
    forcedGuidanceFeatures.set(projectId, 'arMode');
    await renderProjectDashboard(app, encoded(projectId));
}

export async function openCreatorArMode(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    recordTutorialEvent(projectId, 'ar_mode_introduced');
    let started = false;
    try {
        // Call the AR request directly from the quick-action tap. This keeps
        // the browser's user-activation permission intact on mobile devices.
        started = await window.startArMode(projectId);
    } catch (error) {
        console.warn('[Creator AR] Quick Access launch failed.', error);
    }
    if (!started) {
        // Fallback to original AR preparation if immersive AR is not available
        window.renderArPreparation(encoded(projectId), 'creator');
    }
}

export async function openCreatorContentMode(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    recordTutorialEvent(projectId, 'content_mode_opened');
    await renderContentMode(app, encoded(projectId));
}

export async function openQuickAccessChoice(app, encodedProjectId, type) {
    const projectId = decodeURIComponent(encodedProjectId);
    dismissTutorialFeature(projectId, 'quickAccess');
    await renderPlacementChoice(app, encoded(projectId), type);
}

export function openCreatorVisitorPreview(encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    recordTutorialEvent(projectId, 'visitor_preview_opened');
    window.renderVisitorLocationIntro(encoded(projectId), true);
}

export async function renderPlatformHome(app) {
    applyProjectTheme('forest-light');
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
            <div class="menu-stack project-selection-list">${cards || '<div class="panel"><p>No locations are available.</p></div>'}<button class="menu-card create-project-action" onclick="window.renderProjectForm()"><strong>Create a new location, experience or project</strong></button></div>
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
    if (feature === 'About This Tool') {
        app.innerHTML = `<div class="screen about-experience">
            <div class="page-header">
                <button class="ghost" onclick="${backAction}">Back</button>
                <p class="welcome-label">Nourishland XR</p>
                <h1>About This Tool</h1>
            </div>
            <article class="panel about-experience-content">
                <section>
                    <h2>What is NourishlandXR?</h2>
                    <p>NourishlandXR is a place-based tool that connects information directly to real environments — gardens, food forests, farms, parks and nurseries.</p>
                    <p>It helps you record plants, observations, stories and tasks as part of a location. That information can be viewed on a normal screen or experienced in AR through spatial computing and augmented reality.</p>
                </section>
                <section>
                    <h2>How it works</h2>
                    <p>Every plant, note or checkpoint belongs to a Location and Area. The same content works in both content mode (on-screen) and AR mode (in the landscape), so you can enter data efficiently and explore it spatially when you're ready.</p>
                </section>
                <section>
                    <h2>Built for food literacy</h2>
                    <p>NourishlandXR is built by Nourishland — an organisation dedicated to helping people grow food, understand plants and build resilient food systems. This tool is part of a larger mission to make sustainability practical, engaging and accessible.</p>
                </section>
                <p class="about-experience-conclusion"><strong>NourishlandXR turns knowledge about a place into something you can see, edit and share — on screen and in the landscape.</strong></p>
            </article>
        </div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from the welcome page.</p></div></div>`;
}

export async function renderProjectDashboard(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries, startingPoint } = await projectContent(projectId);
        const areas = places.filter(place => place.name !== 'Unassigned');
        const hasArea = areas.length > 0;
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const unplacedEntries = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(entry.marker.type) && !entry.isPlaced);
        let startingAnchor = null;
        if (site && startingPoint) {
            try { startingAnchor = await loadMarkerAnchor(project.id, site.id, startingPoint.place.id, startingPoint.marker.id); }
            catch { startingAnchor = null; }
        }
        const hasGps = Number.isFinite(Number(startingAnchor?.latitude)) && Number.isFinite(Number(startingAnchor?.longitude));
        const startingConfigured = Boolean(startingPoint && (hasGps || startingAnchor?.qr_code));
        const projectEntries = entries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(entry.marker.type));
        const guidance = dashboardGuidance(project.id, { hasArea, startingConfigured, freshProject: !hasArea && projectEntries.length === 0 });
        const latestDate = [
            ...projectEntries.map(entry => entry.marker.modified || entry.marker.created),
            ...areas.map(area => area.modified || area.created)
        ].filter(Boolean).sort().at(-1);
        const latestEntries = placedEntries.slice(0, 8).map(({ marker }) => {
            return {
                label: escapeHtml(marker.name),
                type: escapeHtml(markerTypeLabel(marker.type)),
                date: escapeHtml(entryDateLabel(marker.created || marker.modified)),
                creator: escapeHtml(entryCreatorLabel(marker)),
                action: marker.type === 'intro_checkpoint' ? `window.openProjectStartingPoint('${encoded(project.id)}')` : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
            };
        });
        const areaLinks = areas.map(area => {
            const areaEntries = entries.filter(entry => entry.place.id === area.id);
            return {
                label: escapeHtml(area.name),
                type: escapeHtml(area.type || 'Area'),
                contentCount: areaEntries.length,
                hasLocation: hasGpsCoordinates(area.anchor),
                hasStartingPoint: areaEntries.some(entry => entry.marker.type === 'intro_checkpoint'),
                action: `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')`
            };
        });
        const searchItems = await buildProjectSearchItems(project, site, areas, entries);
        app.innerHTML = renderProjectEntry({
            locationId: escapeHtml(project.id),
            areas: areaLinks,
            searchItems,
            locationName: escapeHtml(project.name),
            siteName: escapeHtml(site?.name || 'No site configured'),
            backAction: 'window.renderDemoProjects()',
            status: {
                entries: String(projectEntries.length),
                unplaced: String(unplacedEntries.length),
                areas: String(areas.length),
                lastUpdated: latestDate ? editedLabel(latestDate).replace(/^Edited /, '') : 'No edits yet',
                notice: startingConfigured ? '' : 'A Starting Point is required before publishing.',
                setupAction: `window.editProjectStartingPoint('${encoded(project.id)}')`
            },
            quickActions: [
                { icon: '📍', label: 'Add Marker', action: `window.openQuickAccessChoice('${encoded(project.id)}', 'plant')` },
                { icon: '✎', label: 'Add Note', action: `window.openQuickAccessChoice('${encoded(project.id)}', 'note')` },
                { icon: '✦', label: 'Spec. Marker', action: `window.renderPlatformComingSoon('Special Marker', 'creator')` },
                { icon: '◈', label: 'AR Mode', action: `window.openCreatorArMode('${encoded(project.id)}')` }
            ],
            guidance,
            fieldGuideAction: `window.renderFieldGuide('${encoded(project.id)}', true)`,
            mapAction: `window.renderLocationMap('${encoded(project.id)}', true)`,
            storiesAction: `window.renderStoriesAndFocus('${encoded(project.id)}')`,
            unplacedAction: `window.renderUnplacedContent('${encoded(project.id)}')`,
            tools: [
                { label: 'Project Settings', description: 'Manage entrances, experience starting points and project-wide configuration.', action: `window.renderProjectSettings('${encoded(project.id)}')` },
                { label: 'NourishlandXR Settings', description: 'Platform settings, text size, hints, diagnostics and build information from the welcome page.', action: `window.renderPlatformComingSoon('Settings', 'creator')` }
            ],
            latestEntries,
            viewAllAction: `window.renderAllProjectEntries('${encoded(project.id)}')`
        });
        prepareArDashboardSnapshot(app).catch(() => {});
        if (guidance?.stage === 'new' && guidance.introducedEvent) {
            recordTutorialEvent(project.id, guidance.introducedEvent);
        }
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Location unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

function allProjectEntryRow(project, marker) {
    const action = marker.type === 'intro_checkpoint'
        ? `window.openProjectStartingPoint('${encoded(project.id)}')`
        : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`;
    const search = searchableText(marker.name, markerTypeLabel(marker.type), marker.description, marker.notes, entryCreatorLabel(marker), entryDateLabel(marker.created || marker.modified));
    return `<button class="latest-entry-row all-project-entry-row" type="button" data-all-project-entry data-search="${escapeHtml(search)}" onclick="${action}">
        <span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${escapeHtml(markerTypeLabel(marker.type))}</span></span>
        <span class="latest-entry-detail"><span>Date</span><strong>${escapeHtml(entryDateLabel(marker.created || marker.modified))}</strong></span>
        <span class="latest-entry-detail latest-entry-author"><span>Added by</span><strong>${escapeHtml(entryCreatorLabel(marker))}</strong></span>
    </button>`;
}

export async function renderAllProjectEntries(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, entries } = await projectContent(projectId);
        const rows = entries.map(({ marker }) => allProjectEntryRow(project, marker)).join('');
        app.innerHTML = `<div class="screen all-project-entries-screen">
            <div class="page-header">
                <button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back to Dashboard</button>
                <p class="welcome-label">Changes</p>
                <h1>All entries</h1>
            </div>
            <section class="all-entries-list-section" aria-labelledby="allEntriesSearchLabel">
                <label id="allEntriesSearchLabel" class="sr-only" for="allEntriesSearch">Search entries</label>
                <div class="project-search-box all-entries-search">
                    <span aria-hidden="true">⌕</span>
                    <input id="allEntriesSearch" type="search" placeholder="Search entries…" autocomplete="off" oninput="window.filterAllProjectEntries(this.value)" />
                </div>
                <p id="allEntriesSearchSummary" class="project-search-summary" aria-live="polite" ${entries.length ? '' : 'hidden'}>${entries.length ? `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}` : ''}</p>
                <div id="allProjectEntryList" class="latest-entry-list">${rows}</div>
                <p id="allEntriesEmpty" class="project-empty-state" ${entries.length ? 'hidden' : ''}>No entries have been added yet.</p>
            </section>
        </div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Entries unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export function filterAllProjectEntries(value) {
    const query = String(value || '').trim().toLocaleLowerCase();
    const rows = [...document.querySelectorAll('[data-all-project-entry]')];
    let matches = 0;
    rows.forEach(row => {
        const visible = !query || (row.dataset.search || '').includes(query);
        row.hidden = !visible;
        if (visible) matches += 1;
    });
    const summary = document.getElementById('allEntriesSearchSummary');
    const empty = document.getElementById('allEntriesEmpty');
    if (summary) {
        summary.hidden = rows.length === 0;
        summary.textContent = query ? `${matches} matching entr${matches === 1 ? 'y' : 'ies'}` : `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`;
    }
    if (empty) {
        empty.hidden = matches > 0;
        empty.textContent = rows.length ? 'No matching entries.' : 'No entries have been added yet.';
    }
}

export async function renderContentMode(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, places, entries, site } = await projectContent(projectId);
        const areas = places.filter(place => place.name !== 'Unassigned');
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const unplacedCount = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(entry.marker.type) && !entry.isPlaced).length;
        const areaRows = areas.map(area => {
            const count = entries.filter(entry => entry.place.id === area.id).length;
            return `<button class="project-area-link" type="button" onclick="window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')">
                <span class="project-area-link-icon" aria-hidden="true">▧</span>
                <span class="project-area-link-copy"><strong>${escapeHtml(area.name)}</strong><span>${escapeHtml(area.type || 'Area')} · ${count} element${count === 1 ? '' : 's'}</span></span>
                <span class="project-area-link-meta">Open Area</span>
            </button>`;
        }).join('');
        app.innerHTML = `<div class="screen content-mode-screen">
            <header class="page-header">
                <button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back to Dashboard</button>
                <p class="welcome-label">Creator workspace</p>
                <h1>Content Mode</h1>
                <p class="subtitle">Add, edit and organize content without using the camera.</p>
            </header>
            <section class="content-mode-introduction">
                <p>Everything here works without camera or location permission. Content can be positioned later using the map or AR Mode.</p>
            </section>
            <nav class="content-mode-tool-grid" aria-label="Content Mode tools">
                <button type="button" onclick="window.renderFieldGuide('${encoded(project.id)}', true)"><strong>Field Guide</strong><span>Browse and edit Plants and their information.</span></button>
                <button type="button" onclick="window.renderLocationMap('${encoded(project.id)}', true, 'content-mode')"><strong>Map</strong><span>Review Areas and spatial organisation without the camera.</span></button>
                <button type="button" onclick="window.renderStoriesAndFocus('${encoded(project.id)}')"><strong>Stories &amp; Checkpoints</strong><span>Manage stories, guided moments and checkpoints.</span></button>
                <button type="button" onclick="window.renderUnplacedContent('${encoded(project.id)}')"><strong>Unplaced Content</strong><span>${unplacedCount} item${unplacedCount === 1 ? '' : 's'} can be positioned later.</span></button>
            </nav>
            <section class="project-areas-section" aria-labelledby="contentModeAreasTitle">
                <div class="section-heading-row"><div><h2 id="contentModeAreasTitle">Areas</h2><p>Open an Area dashboard to manage its content.</p></div><span class="project-area-count">${areas.length}</span></div>
                <div class="project-area-list">${areaRows || '<p class="project-empty-state">No Areas yet. Return to the Dashboard and choose Add Area.</p>'}</div>
            </section>
        </div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back to Dashboard</button><h1>Content Mode unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
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
        const { project, places, entries, startingPoint } = await projectContent(projectId);
        const hasArea = places.some(place => place.name !== 'Unassigned');
        const hasFirstContent = entries.some(entry => !['intro_checkpoint', 'sub_checkpoint'].includes(entry.marker.type));
        app.innerHTML = `<div class="screen setup-flow"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Save and exit</button><p class="welcome-label">New project · Guided setup</p><h1>${escapeHtml(project.name)}</h1><p class="subtitle">Extra instructions are shown while you learn the project structure.</p></div><div class="panel guide"><h2>How NourishlandXR is organised</h2><p><strong>Project → Location → Area → Plant or Note</strong></p><p>Start by creating an Area. An Area is a smaller part of your Location—for example a garden bed, orchard row, terrace, restaurant room or fountain area.</p></div><ol class="setup-checklist"><li class="is-complete"><strong>1. Name the project</strong><span>${escapeHtml(project.name)}</span></li><li class="${hasArea ? 'is-complete' : 'is-current'}"><strong>2. Create the first Area</strong><span>${hasArea ? 'Your project has an Area.' : 'Give your first mapped subdivision a clear name.'}</span></li><li class="${hasFirstContent ? 'is-complete' : hasArea ? 'is-current' : ''}"><strong>3. Add the first Plant or Note</strong><span>Choose the Area it belongs to. AR placement can happen later.</span></li><li class="${startingPoint ? 'is-complete' : hasFirstContent ? 'is-current' : ''}"><strong>4. Set the visitor Starting Point</strong><span>Choose where visitors begin after an Area exists.</span></li><li><strong>5. Preview the visitor experience</strong><span>Review the Location before sharing it.</span></li></ol><div class="button-row"><button type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Open Dashboard</button><button class="primary" type="button" onclick="${hasArea ? `window.renderAddToLocation('${encoded(project.id)}')` : `window.renderProjectAreaForm('${encoded(project.id)}', 'new-project')`}">${hasArea ? 'Add your first content' : 'Create your first Area'}</button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAddToLocation(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    const action = (label, description, onclick) => `<button class="content-type-row" type="button" onclick="${onclick}"><strong>${label}</strong><span>${description}</span></button>`;
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Quick Access</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel"><p>Choose what you want to do next. Create an Area first when this is a new project, then add Plants and Notes inside it.</p></div><div class="content-type-list">${action('Plant', 'Add a plant to an Area.', `window.renderPlacementChoice('${encoded(project.id)}', 'plant')`)}${action('Area', 'Create a mapped subdivision of this Location.', `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')`)}${action('Note', 'Record a short note within an Area.', `window.renderPlacementChoice('${encoded(project.id)}', 'note')`)}</div></div>`;
}

export async function renderPlacementChoice(app, encodedProjectId, type) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const labels = { plant: 'Plant', checkpoint: 'Checkpoint', note: 'Note' };
    const markerType = type === 'checkpoint' ? 'sub_checkpoint' : type;
    const unplacedStage = getTutorialStage(project.id, 'unplacedContent');
    const unplacedGuidance = unplacedStage === 'new'
        ? '<div class="panel contextual-reminder"><p><strong>Saving without AR:</strong> This item can be saved now without a physical position. You can assign it to a map or place it in AR later.</p></div>'
        : unplacedStage === 'learning'
            ? '<div class="panel contextual-reminder"><p>You can save now and position the item later.</p></div>'
            : '';
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Add ${labels[type] || 'Content'}</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${unplacedGuidance}<div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${markerType}', 'ar')"><strong>Place in AR</strong><span>Use your camera and current position to place it in the landscape.</span></button><button class="content-type-row" type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${markerType}', 'without-ar')"><strong>Add without AR</strong><span>Create it now and position it in AR later.</span></button></div></div>`;
    if (unplacedStage === 'new') recordTutorialEvent(project.id, 'unplaced_content_explained');
}

export async function ensureProjectLocation(projectId) {
    const sites = await loadProjectSites(projectId);
    if (sites.length) return sites.find(site => site.id === 'main_food_forest') || sites[0];
    return createProjectSite(projectId, { name: 'Main Location', description: 'Primary Location for this project.', visibility: 'draft' });
}

export async function renderProjectAreaForm(app, encodedProjectId, intent = 'dashboard') {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, places } = await projectContent(projectId);
        const firstArea = !places.some(place => place.name !== 'Unassigned');
        const areaStage = getTutorialStage(project.id, 'area');
        const guidance = areaStage === 'new'
            ? '<div class="panel guide"><h2>What is an Area?</h2><p>An Area is a meaningful section inside a Location, such as an orchard row, garden bed, fountain, restaurant, propagation area or walking path.</p><p><strong>What happens next:</strong> Save the Area, then add Plants, Notes or checkpoints. Physical AR placement can happen later, and the Area can be updated.</p></div>'
            : areaStage === 'learning'
                ? '<div class="panel contextual-reminder"><p><strong>Reminder:</strong> Areas organise content inside this Location. Save now and add or position content later.</p></div>'
                : '';
        app.innerHTML = `<div class="screen area-form-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">${areaStage === 'understood' ? 'Project structure' : 'Area guidance'}</p><h1>${firstArea ? 'Create your first Area' : 'Create an Area'}</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${guidance}<form class="panel" onsubmit="window.saveProjectArea(event, '${encoded(project.id)}', '${encoded(intent)}')"><div class="field"><label for="projectAreaName">Area name</label><input id="projectAreaName" placeholder="For example: 1R1, Front Garden or Grafting Area" required /></div><div class="field"><label for="projectAreaType">Area type</label><select id="projectAreaType"><option value="Outdoor Area">Outdoor Area — garden, park, nursery, farm section</option><option value="Indoor Area">Indoor Area — greenhouse, building, covered growing area</option><option value="Bed or Plot">Bed or Plot — garden bed, terrace, production row</option><option value="Room">Room — classroom, propagation room, restaurant</option><option value="Enclosure">Enclosure — pen, protected garden, fenced compartment</option><option value="Path or Route">Path or Route — trail, tour route, nursery lane</option><option value="Other">Other — anything that doesn’t fit</option></select></div><div class="field"><label for="projectAreaDescription">Short description (optional)</label><textarea id="projectAreaDescription" rows="3" placeholder="Explain what this Area contains or how people recognise it."></textarea></div><p id="projectAreaError" class="meta"></p><div class="button-row"><button type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Cancel</button><button class="primary" type="submit">Save Area</button></div></form></div>`;
        if (areaStage === 'new') recordTutorialEvent(project.id, 'area_explained');
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Area setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveProjectArea(event, encodedProjectId, _encodedIntent = 'dashboard') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const error = document.getElementById('projectAreaError');
    try {
        const before = await projectContent(projectId);
        const site = before.site || await ensureProjectLocation(projectId);
        const area = await createSitePlace(projectId, site.id, { name: document.getElementById('projectAreaName').value.trim(), type: document.getElementById('projectAreaType').value, description: document.getElementById('projectAreaDescription').value.trim(), visibility: 'draft' });
        recordTutorialEvent(projectId, 'first_area_created_or_selected');
        const target = document.getElementById('app');
        if (!before.startingPoint) return renderAreaStartingPointQuestion(target, before.project, area);
        return renderProjectAreaDashboard(target, encoded(projectId), encoded(area.id));
    } catch (failure) {
        if (error) error.textContent = `Area could not be saved: ${failure.message}`;
    }
}

function renderAreaStartingPointQuestion(app, project, area) {
    app.innerHTML = `<div class="screen area-starting-point-question">
        <div class="page-header">
            <p class="welcome-label">Area created</p>
            <h1>Is this where your Starting Point will be?</h1>
            <p class="subtitle">${escapeHtml(area.name)} · ${escapeHtml(project.name)}</p>
        </div>
        <section class="panel guide">
            <h2>Choose what happens next</h2>
            <p>A Starting Point is where visitors begin the experience. If visitors will begin in this Area, NourishlandXR will preselect it in the Starting Point form.</p>
            <p><strong>If not:</strong> the Area is already saved and its Area dashboard will open.</p>
        </section>
        <div class="area-question-actions">
            <button type="button" onclick="window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')"><strong>No</strong><span>Open the ${escapeHtml(area.name)} Area dashboard</span></button>
            <button class="primary" type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}', '${encoded(area.id)}')"><strong>Yes</strong><span>Create the Starting Point in this Area</span></button>
        </div>
    </div>`;
}

export async function renderProjectAreaDashboard(app, encodedProjectId, encodedAreaId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        recordTutorialEvent(projectId, 'first_area_created_or_selected');
        const areaEntries = await entriesWithPlacement(context.project, context.site, context.areaEntries);
        const rows = areaEntries.map(({ marker, isPlaced }) => {
            const status = entryStatus(marker);
            const action = marker.type === 'intro_checkpoint'
                ? `window.openProjectStartingPoint('${encoded(context.project.id)}', '${encoded(context.area.id)}')`
                : `window.openProjectEntry('${encoded(context.project.id)}', '${encoded(marker.id)}', '${encoded(context.area.id)}')`;
            return `<button class="latest-entry-row" type="button" onclick="${action}">
                <span class="latest-entry-icon" aria-hidden="true">${markerIcon(marker.type)}</span>
                <span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(marker.type)} · ${editedLabel(marker.modified || marker.created)}</span><span class="placement-status ${isPlaced ? 'is-placed' : 'is-unplaced'}">${isPlaced ? 'Placed' : 'Not yet placed'}</span></span>
                <span class="entry-status entry-status-${status.tone}">${status.label}</span>
            </button>`;
        }).join('');
        const anchor = hasGpsCoordinates(context.area.anchor) ? context.area.anchor : null;
        const locationStatus = anchor
            ? `GPS location assigned${Number.isFinite(Number(anchor.accuracy)) ? ` · accuracy ${Math.round(Number(anchor.accuracy))} m` : ''}`
            : 'No GPS location assigned';
        app.innerHTML = `<div class="screen area-dashboard">
            <header class="page-header area-dashboard-header">
                <button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Return to Dashboard</button>
                <p class="welcome-label">Area dashboard</p>
                <h1>${escapeHtml(context.area.name)}</h1>
                <p class="subtitle">${escapeHtml(context.area.type || 'Area')} · ${escapeHtml(context.project.name)}</p>
            </header>
            <section class="panel area-profile-summary">
                <h2>About this Area</h2>
                <p>${escapeHtml(context.area.description || 'No description has been added yet.')}</p>
                <p class="area-location-status ${anchor ? 'is-assigned' : 'is-unassigned'}">${locationStatus}</p>
            </section>
            <div class="area-dashboard-actions">
                <button class="primary" type="button" onclick="window.navigateToProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>Navigate to it in AR</strong><span>${anchor ? 'Open AR navigation to this Area.' : 'Assign a GPS location first, then open AR navigation.'}</span></button>
                <button type="button" onclick="window.renderProjectAreaLocationForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>${anchor ? 'Update GPS location' : 'Assign GPS location'}</strong><span>Tag the physical position of this Area.</span></button>
            </div>
            <section class="latest-entries-section area-content-section">
                <div class="section-heading-row"><div><h2>Content in this Area</h2><p>${areaEntries.length} existing element${areaEntries.length === 1 ? '' : 's'}</p></div></div>
                <div class="latest-entry-list">${rows || '<p class="project-empty-state">No content has been added to this Area yet.</p>'}</div>
            </section>
            <section class="area-danger-zone" aria-labelledby="deleteAreaTitle">
                <h2 id="deleteAreaTitle">Delete Area</h2>
                <p>Deleting this Area also deletes the content and Starting Point stored inside it.</p>
                <button class="danger" type="button" onclick="window.deleteProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Delete Area</button>
                <p id="deleteProjectAreaStatus" class="meta"></p>
            </section>
        </div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Return to Dashboard</button><h1>Area unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function navigateToProjectArea(app, encodedProjectId, encodedAreaId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        if (!hasGpsCoordinates(context.area.anchor)) return renderAreaLocationPrompt(app, context);
        window.renderArPreparation(encoded(context.project.id), 'area-navigation', '', encoded(context.area.id), encoded(context.site.id));
    } catch (error) {
        window.alert(`Area navigation is unavailable: ${error.message}`);
    }
}

function renderAreaLocationPrompt(app, context) {
    app.innerHTML = `<div class="screen area-location-prompt">
        <div class="page-header">
            <button class="ghost" type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Back to Area</button>
            <p class="welcome-label">GPS location needed</p>
            <h1>Assign a location to ${escapeHtml(context.area.name)}?</h1>
            <p class="subtitle">AR navigation needs a physical destination.</p>
        </div>
        <section class="panel guide">
            <h2>Next step</h2>
            <p>Choose <strong>Assign Location</strong>, then stand in the Area and capture your current GPS position. You can also enter coordinates manually.</p>
        </section>
        <div class="button-row">
            <button type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Not now</button>
            <button class="primary" type="button" onclick="window.renderProjectAreaLocationForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Assign Location</button>
        </div>
    </div>`;
}

export async function renderProjectAreaLocationForm(app, encodedProjectId, encodedAreaId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        const anchor = hasGpsCoordinates(context.area.anchor) ? context.area.anchor : {};
        app.innerHTML = `<div class="screen area-location-form">
            <div class="page-header">
                <button class="ghost" type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Back to Area</button>
                <p class="welcome-label">GPS tagging</p>
                <h1>Assign ${escapeHtml(context.area.name)}’s location</h1>
                <p class="subtitle">Save one physical destination for Area navigation.</p>
            </div>
            <section class="panel guide">
                <h2>For the best result</h2>
                <ol><li>Stand at a recognisable point inside the Area.</li><li>Choose <strong>Use Current GPS</strong> and allow location access.</li><li>Check the accuracy, then save.</li></ol>
            </section>
            <form class="panel" onsubmit="window.saveProjectAreaLocation(event, '${encoded(context.project.id)}', '${encoded(context.area.id)}')">
                <button type="button" onclick="window.captureProjectAreaLocation()">Use Current GPS</button>
                <div class="coordinate-grid">
                    <div class="field"><label for="projectAreaLatitude">Latitude</label><input id="projectAreaLatitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.latitude ?? '')}" required /></div>
                    <div class="field"><label for="projectAreaLongitude">Longitude</label><input id="projectAreaLongitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.longitude ?? '')}" required /></div>
                </div>
                <div class="field"><label for="projectAreaAccuracy">Location accuracy (metres)</label><input id="projectAreaAccuracy" type="number" inputmode="decimal" step="any" min="0" value="${escapeHtml(anchor.accuracy ?? '')}" required /></div>
                <p id="projectAreaLocationStatus" class="meta">${hasGpsCoordinates(anchor) ? 'A saved GPS location is shown. Capture again to update it.' : 'Location not captured yet.'}</p>
                <div class="button-row"><button type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Cancel</button><button class="primary" type="submit">Save Area Location</button></div>
            </form>
        </div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Return to Dashboard</button><h1>GPS tagging unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export function captureProjectAreaLocation() {
    const status = document.getElementById('projectAreaLocationStatus');
    if (!navigator.geolocation) {
        if (status) status.textContent = 'GPS is unavailable on this device. Enter coordinates manually.';
        return;
    }
    if (status) status.textContent = 'Finding your current position…';
    navigator.geolocation.getCurrentPosition(position => {
        document.getElementById('projectAreaLatitude').value = position.coords.latitude;
        document.getElementById('projectAreaLongitude').value = position.coords.longitude;
        document.getElementById('projectAreaAccuracy').value = position.coords.accuracy;
        status.textContent = `Current position captured · accuracy ${Math.round(position.coords.accuracy)} m.`;
    }, failure => {
        status.textContent = failure.code === 1 ? 'Location permission was denied. Enter coordinates manually.' : 'Current GPS position is unavailable. Enter coordinates manually.';
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}

export async function saveProjectAreaLocation(event, encodedProjectId, encodedAreaId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const status = document.getElementById('projectAreaLocationStatus');
    try {
        const context = await projectAreaContext(projectId, areaId);
        const latitude = Number(document.getElementById('projectAreaLatitude').value);
        const longitude = Number(document.getElementById('projectAreaLongitude').value);
        const accuracy = Number(document.getElementById('projectAreaAccuracy').value);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) throw new Error('Latitude must be between -90 and 90.');
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude must be between -180 and 180.');
        if (!Number.isFinite(accuracy) || accuracy < 0) throw new Error('Location accuracy must be zero or greater.');
        if (status) status.textContent = 'Saving Area location…';
        await updateSitePlace(projectId, context.site.id, areaId, { anchor: { type: 'gps', latitude, longitude, accuracy, captured_at: new Date().toISOString() } });
        await renderProjectAreaDashboard(document.getElementById('app'), encoded(projectId), encoded(areaId));
    } catch (error) {
        if (status) status.textContent = `Location could not be saved: ${error.message}`;
    }
}

export async function deleteProjectArea(encodedProjectId, encodedAreaId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const status = document.getElementById('deleteProjectAreaStatus');
    try {
        const context = await projectAreaContext(projectId, areaId);
        if (!window.confirm(`Delete ${context.area.name} and all content inside it? This cannot be undone.`)) return;
        if (status) status.textContent = 'Deleting Area…';
        await deleteSitePlace(projectId, context.site.id, areaId);
        await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (error) {
        if (status) status.textContent = `Area could not be deleted: ${error.message}`;
    }
}

export async function renderAreaRequired(app, encodedProjectId, type = 'plant', placementMode = 'without-ar', purpose = 'content') {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const startingPoint = purpose === 'starting-point';
    const intent = startingPoint ? 'starting-point' : `quick:${type}:${placementMode}`;
    app.innerHTML = `<div class="screen area-required-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">One setup step first</p><h1>Create an Area</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel guide"><h2>Why is an Area needed?</h2><p>${startingPoint ? 'A Starting Point belongs to the Area where visitors first arrive.' : `Every ${type === 'note' ? 'Note' : 'Plant'} belongs to an Area, even when its physical AR position is not known yet.`}</p><p><strong>Next steps:</strong></p><ol><li>Create and name the Area.</li><li>${startingPoint ? 'Continue to the Starting Point form.' : `Return to the ${type === 'note' ? 'Note' : 'Plant'} form.`}</li><li>${startingPoint ? 'Add arrival information and, when ready, its physical position.' : 'Choose Place in AR or Add without AR.'}</li></ol></div><div class="button-row">${startingPoint ? '' : `<button type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${type}', '${placementMode}', true)">Continue as Unassigned</button>`}<button class="primary" type="button" onclick="window.renderProjectAreaForm('${encoded(project.id)}', '${encoded(intent)}')">Create Area</button></div></div>`;
}

export async function renderUnplacedContent(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, entries } = await projectContent(projectId);
        const placementEntries = await entriesWithPlacement(project, site, entries);
        const unplaced = placementEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(entry.marker.type) && !entry.isPlaced);
        const rows = unplaced.map(({ marker, place }) => `<div class="latest-entry-row unplaced-content-row"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(marker.type)}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(marker.type)} · Area: ${escapeHtml(place.name || 'Unassigned')}</span><span class="placement-status is-unplaced">Not yet placed</span></span><button type="button" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(marker.id)}', '${encoded(place.id)}', '${encoded(site?.id || '')}')">Place in AR</button></div>`).join('');
        app.innerHTML = `<div class="screen unplaced-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Unplaced Content</h1><p class="subtitle">${unplaced.length} item${unplaced.length === 1 ? '' : 's'} awaiting physical placement.</p></div><div class="panel"><p>These items already belong to an Area or the Unassigned list. Their content is saved normally and can be positioned later.</p></div><div class="latest-entry-list">${rows || '<p class="project-empty-state">Everything has been placed.</p>'}</div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Unplaced Content unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderStoriesAndFocus(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">Planned for V2</p><h1>Stories and Focus Elements</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel guide"><p>Create special checkpoints for stories, guided moments and focused experiences connected to an Area.</p><h2>What is planned</h2><ul><li>A story attached to a particular Area</li><li>A guided narrative or learning sequence</li><li>A special checkpoint</li><li>Visual effects showing movement, relationships or living processes</li><li>A focused moment that reveals something normally unseen</li></ul><p class="meta">These V2 tools are not active yet. Existing checkpoints continue to work as before.</p></div></div>`;
}

export async function renderProjectSettings(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const theme = PROJECT_THEMES.has(project.theme) ? project.theme : 'forest-light';
    const tutorialEnabled = isProjectTutorialEnabled(project.id);
    const arTutorial = getArTutorialProgress();
    const settings = readPlatformSettings();
    const arTutorialLabel = {
        not_started: 'Not started',
        in_progress: 'In progress',
        completed: 'Completed',
        skipped: 'Skipped'
    }[arTutorial.state] || 'Not started';
    app.innerHTML = `<div class="screen project-settings-screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button>
            <h1>Project Settings</h1>
            <p class="subtitle">${escapeHtml(project.name)} · Project-wide configuration</p>
        </div>
        <section class="panel project-theme-setting" aria-labelledby="projectThemeTitle">
            <div class="section-heading-row"><div><h2 id="projectThemeTitle">Change Theme</h2><p>Choose the visual style used while working inside this project.</p></div></div>
            <div class="field">
                <label for="projectTheme">Project theme</label>
                <select id="projectTheme" onchange="window.saveProjectTheme('${encoded(project.id)}', this.value)">
                    <option value="light" ${theme === 'light' ? 'selected' : ''}>LIGHT (White)</option>
                    <option value="dark" ${theme === 'dark' ? 'selected' : ''}>DARK (Black)</option>
                    <option value="forest-dark" ${theme === 'forest-dark' ? 'selected' : ''}>FOREST DARK (Green)</option>
                    <option value="forest-light" ${theme === 'forest-light' ? 'selected' : ''}>FOREST LIGHT</option>
                    <option value="cyber" ${theme === 'cyber' ? 'selected' : ''}>CYBER (Gray / Purple)</option>
                </select>
            </div>
            <div class="theme-preview-strip" data-theme-preview="${theme}" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <p id="projectThemeStatus" class="meta">Current theme: ${escapeHtml(theme.replace('-', ' '))}.</p>
        </section>
        <div class="content-type-list">
            <button class="content-type-row" type="button" onclick="window.renderStartingPoints('${encoded(project.id)}')"><strong>Manage entrances and experience starting points</strong><span>Manage Master Markers and choose where visitors begin the experience.</span></button>
        </div>
        <section class="panel tutorial-settings" aria-labelledby="tutorialSettingsTitle">
            <div class="section-heading-row"><div><h2 id="tutorialSettingsTitle">Tutorial &amp; Guidance</h2><p>First-use explanations become shorter after successful actions.</p></div><span class="tutorial-status">${tutorialEnabled ? 'On' : 'Off'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Tutorial Mode</strong><small>Show contextual guidance beside the feature being learned.</small></span><input type="checkbox" ${tutorialEnabled ? 'checked' : ''} onchange="window.setProjectTutorialMode('${encoded(project.id)}', this.checked)" /></label>
            <div class="tutorial-settings-actions">
                <button type="button" onclick="window.restartProjectTutorial('${encoded(project.id)}')">Restart Tutorial for This Project</button>
                <button type="button" onclick="window.resetLearningTips('${encoded(project.id)}')">Reset Learning Tips</button>
            </div>
            <p class="meta">These actions reset guidance only. Plants, Areas, Notes, checkpoints and AR positions are never changed.</p>
        </section>
        <section class="panel tutorial-settings" aria-labelledby="arTutorialSettingsTitle">
            <div class="section-heading-row"><div><h2 id="arTutorialSettingsTitle">AR Tutorial &amp; Hints</h2><p>Control the compact guidance shown inside Creator AR Mode.</p></div><span class="tutorial-status">${arTutorialLabel}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Show AR Hints</strong><small>Show short surface-detection and placement reminders when they are useful.</small></span><input type="checkbox" ${arTutorial.showHints === false ? '' : 'checked'} onchange="window.setArHints('${encoded(project.id)}', this.checked)" /></label>
            <div class="tutorial-settings-actions">
                <button type="button" onclick="window.replayArTutorial('${encoded(project.id)}')">Replay AR Tutorial</button>
                <button type="button" onclick="window.resetArLearningTips('${encoded(project.id)}')">Reset AR Learning Tips</button>
            </div>
            <p class="meta">The tutorial appears once for an experienced creator, can be skipped, and can always be replayed here. Resetting it never changes project content or AR positions.</p>
        </section>
        <section class="panel tutorial-settings" aria-labelledby="developerDiagnosticsTitle">
            <div class="section-heading-row"><div><h2 id="developerDiagnosticsTitle">Developer Diagnostics</h2><p>Keep technical AR launch details hidden during normal use.</p></div><span class="tutorial-status">${settings.developerDiagnostics ? 'Debug on' : 'Debug off'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>AR debug logging</strong><small>Write AR launch stages to the browser console for technical testing.</small></span><input type="checkbox" ${settings.developerDiagnostics ? 'checked' : ''} onchange="window.savePlatformSetting('developerDiagnostics', this.checked)" /></label>
            <div class="tutorial-settings-actions"><button type="button" onclick="window.copyArDiagnostics()">Copy Diagnostics</button></div>
            <p id="developerDiagnosticsStatus" class="meta">Diagnostics remain hidden from the camera view.</p>
        </section>
        <section class="panel project-backup-setting" aria-labelledby="backupProjectTitle">
            <div class="section-heading-row"><h2 id="backupProjectTitle">Backup Project to File</h2><span class="coming-soon-badge">Coming Soon</span></div>
            <p>Exports a configuration file containing all project data, Areas, content and settings.</p>
            <button type="button" disabled aria-disabled="true">Backup Project</button>
        </section>
        <section class="project-delete-zone" aria-labelledby="deleteProjectTitle">
            <h2 id="deleteProjectTitle">Delete Project</h2>
            <p>Permanently deletes this project, all Areas and all content. This cannot be undone.</p>
            <button class="danger" type="button" onclick="window.deleteProjectFromSettings('${encoded(project.id)}', '${encoded(project.name)}')">Delete Project</button>
            <p id="deleteProjectSettingsStatus" class="meta"></p>
        </section>
    </div>`;
}

function updateProjectThemeControls(theme, message) {
    const select = document.getElementById('projectTheme');
    const preview = document.querySelector('.theme-preview-strip');
    const status = document.getElementById('projectThemeStatus');
    if (select && select.value !== theme) select.value = theme;
    if (preview) preview.dataset.themePreview = theme;
    if (status) status.textContent = message;
}

export function saveProjectTheme(encodedProjectId, theme) {
    const projectId = decodeURIComponent(encodedProjectId);
    if (!PROJECT_THEMES.has(theme)) {
        updateProjectThemeControls(applyProjectTheme('forest-light'), 'Theme could not be saved: Choose a supported project theme.');
        return Promise.resolve();
    }

    requestedProjectThemes.set(projectId, theme);
    applyProjectTheme(theme);
    updateProjectThemeControls(theme, `Applying ${theme.replace('-', ' ')} theme…`);

    const previousSave = projectThemeSaveQueues.get(projectId) || Promise.resolve();
    const queuedSave = previousSave.catch(() => {}).then(async () => {
        const project = (await loadProjects()).find(item => item.id === projectId);
        if (!project) throw new Error('Location data is unavailable.');
        await renameProjectOnDisk(projectId, { preserveId: true, name: project.name, theme });
        if (requestedProjectThemes.get(projectId) === theme) {
            applyProjectTheme(theme);
            updateProjectThemeControls(theme, `Theme saved: ${theme.replace('-', ' ')}.`);
        }
    }).catch(async error => {
        if (requestedProjectThemes.get(projectId) !== theme) return;
        try {
            const project = (await loadProjects()).find(item => item.id === projectId);
            const savedTheme = PROJECT_THEMES.has(project?.theme) ? project.theme : 'forest-light';
            applyProjectTheme(savedTheme);
            updateProjectThemeControls(savedTheme, `Theme could not be saved: ${error.message}`);
        } catch {
            updateProjectThemeControls(theme, `Theme could not be saved: ${error.message}`);
        }
    }).finally(() => {
        if (projectThemeSaveQueues.get(projectId) === queuedSave) projectThemeSaveQueues.delete(projectId);
    });

    projectThemeSaveQueues.set(projectId, queuedSave);
    return queuedSave;
}

export async function setProjectTutorialModeFromSettings(app, encodedProjectId, enabled) {
    const projectId = decodeURIComponent(encodedProjectId);
    setProjectTutorialMode(projectId, enabled);
    await renderProjectSettings(app, encoded(projectId));
}

export async function restartProjectTutorialFromSettings(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    restartProjectTutorial(projectId);
    await renderProjectSettings(app, encoded(projectId));
}

export async function resetLearningTipsFromSettings(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    resetLearningTips();
    await renderProjectSettings(app, encoded(projectId));
}

export async function replayArTutorialFromSettings(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    replayArTutorial();
    await renderProjectSettings(app, encoded(projectId));
}

export async function resetArLearningTipsFromSettings(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    resetArLearningTips();
    await renderProjectSettings(app, encoded(projectId));
}

export async function setArHintsFromSettings(app, encodedProjectId, enabled) {
    const projectId = decodeURIComponent(encodedProjectId);
    setArHintsEnabled(enabled);
    await renderProjectSettings(app, encoded(projectId));
}

export async function deleteProjectFromSettings(encodedProjectId, encodedProjectName = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const projectName = encodedProjectName ? decodeURIComponent(encodedProjectName) : projectId;
    const status = document.getElementById('deleteProjectSettingsStatus');
    try {
        if (!window.confirm(`Delete ${projectName} and all of its Areas and content? This cannot be undone.`)) return;
        if (status) status.textContent = 'Deleting project…';
        const pendingThemeSave = projectThemeSaveQueues.get(projectId);
        if (pendingThemeSave) await pendingThemeSave;
        await deleteProjectOnDisk(projectId);
        projectThemeSaveQueues.delete(projectId);
        requestedProjectThemes.delete(projectId);
        applyProjectTheme('forest-light');
        await renderPlatformHome(document.getElementById('app'));
    } catch (error) {
        if (status) status.textContent = `Project could not be deleted: ${error.message}`;
    }
}

export async function renderBrowseContent(app, encodedProjectId, creator = false) {
    const projectId = decodeURIComponent(encodedProjectId);
    const { project, entries } = await projectContent(projectId);
    const visibleEntries = creator ? entries : entries.filter(entry => entry.marker.visibility === 'public');
    const rows = visibleEntries.filter(entry => ['note', 'intro_checkpoint', 'sub_checkpoint'].includes(entry.marker.type)).map(({ marker }) => creator
        ? `<button class="latest-entry-row" type="button" onclick="window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(marker.type)}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(marker.type)}</span></span></button>`
        : `<article class="latest-entry-row visitor-content-row"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(marker.type)}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(marker.type)}</span><span>${escapeHtml(marker.description || marker.notes || '')}</span></span></article>`
    ).join('');
    const back = creator ? `window.renderProjectDashboard('${encoded(project.id)}')` : `window.renderVisitorLocationIntro('${encoded(project.id)}')`;
    app.innerHTML = `<div class="screen browse-content-screen"><div class="page-header"><button class="ghost" onclick="${back}">Back</button><h1>Browse Content</h1><p class="subtitle">Access the project’s plants, stories, checkpoints and maps without entering AR.</p></div><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderFieldGuide('${encoded(project.id)}', ${creator})"><strong>Field Guide</strong><span>Browse plants and visitor-visible information.</span></button><button class="content-type-row" type="button" onclick="window.renderLocationMap('${encoded(project.id)}', ${creator})"><strong>Map</strong><span>View content by location without using the camera.</span></button></div>${rows ? `<section class="latest-entries-section"><h2>Stories and checkpoints</h2><div class="latest-entry-list">${rows}</div></section>` : ''}</div>`;
}

export async function renderLocationMap(app, encodedProjectId, creator = true, returnContext = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries } = await projectContent(projectId);
        const visibleEntries = creator ? entries : entries.filter(entry => entry.marker.visibility === 'public');
        const areas = places.filter(place => place.name !== 'Unassigned');
        const visiblePlaces = creator ? areas : areas.filter(place => visibleEntries.some(entry => entry.place.id === place.id));
        const placeRows = visiblePlaces.map(place => {
            const count = visibleEntries.filter(entry => entry.place.id === place.id).length;
            const locationLabel = hasGpsCoordinates(place.anchor) ? 'GPS assigned' : 'Position not set';
            const content = `<div><strong>${escapeHtml(place.name)}</strong><span>${escapeHtml(place.type || 'Area')} · ${count} entr${count === 1 ? 'y' : 'ies'}</span></div><span>${locationLabel}</span>`;
            return creator
                ? `<button class="location-map-row" type="button" onclick="window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(place.id)}')">${content}</button>`
                : `<div class="location-map-row">${content}</div>`;
        }).join('');
        const backAction = creator && returnContext === 'content-mode'
            ? `window.openCreatorContentMode('${encoded(project.id)}')`
            : `window.renderBrowseContent('${encoded(project.id)}', ${creator})`;
        app.innerHTML = `<div class="screen location-map-screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>Map</h1><p class="subtitle">${escapeHtml(project.name)} · ${escapeHtml(site?.name || 'Location')}</p></div><div class="panel"><h2>Spatial overview</h2><p>Browse every Area and its entries without opening the camera.</p></div><div class="location-map-list">${placeRows || '<div class="panel"><p>No visitor-visible Areas have been added yet.</p></div>'}</div></div>`;
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
    if (!context.site) throw new Error('Create an Area before adding a Starting Point.');
    return context;
}

export async function renderStartingPointForm(app, encodedProjectId, encodedPreferredAreaId = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const preferredAreaId = encodedPreferredAreaId ? decodeURIComponent(encodedPreferredAreaId) : '';
    try {
        const context = await projectContent(projectId);
        const areas = context.places.filter(place => place.name !== 'Unassigned');
        if (!context.site || !areas.length) return renderAreaRequired(app, encoded(projectId), 'starting-point', 'without-ar', 'starting-point');
        const { project, site, startingPoint } = context;
        const marker = startingPoint?.marker || {};
        let anchor = {};
        if (startingPoint) {
            try { anchor = await loadMarkerAnchor(project.id, site.id, startingPoint.place.id, marker.id); }
            catch { anchor = {}; }
        }
        const startingStage = getTutorialStage(project.id, 'startingPoint');
        const startingGuidance = startingStage === 'new'
            ? '<div class="panel starting-point-explanation"><h2>What is a Starting Point?</h2><p>A Starting Point defines where visitors begin and helps connect the digital experience to the physical Location. Choose its Area and arrival information now; physical positioning can be completed or changed later.</p><p><strong>Next:</strong> Save the welcome details, then preview the visitor experience from the Dashboard.</p></div>'
            : startingStage === 'learning'
                ? '<div class="panel contextual-reminder"><p><strong>Reminder:</strong> Choose where visitors begin. Its directions and physical position can be updated later.</p></div>'
                : '';
        app.innerHTML = `<div class="screen starting-point-form"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${startingPoint ? 'Manage' : 'Set'} Starting Point</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${startingGuidance}<form class="panel" onsubmit="window.saveProjectStartingPoint(event, '${encoded(project.id)}')"><div class="field"><label for="projectStartingArea">Area</label>${startingPoint ? `<p id="projectStartingArea" class="field-readonly-value">${escapeHtml(startingPoint.place.name)}</p>` : `<select id="projectStartingArea" required><option value="">Select an Area</option>${areas.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.name)}</option>`).join('')}</select>`}</div><div class="field"><label for="projectStartingName">Starting-point name</label><input id="projectStartingName" value="${escapeHtml(marker.name || 'Starting Point')}" required /></div><div class="field"><label for="projectStartingDescription">Welcome text</label><textarea id="projectStartingDescription" rows="4">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="projectStartingDirections">Arrival instructions</label><textarea id="projectStartingDirections" rows="3">${escapeHtml(marker.directions || '')}</textarea></div><div class="setup-choice-grid"><button type="button" onclick="window.captureStartingPointLocation()"><strong>Set it while standing there</strong><span>Use this phone’s current position.</span></button><button type="button" onclick="window.focusStartingPointMapFields()"><strong>Choose it on the map</strong><span>Enter coordinates from a computer.</span></button></div><div class="coordinate-grid"><div class="field"><label for="projectStartingLatitude">Latitude</label><input id="projectStartingLatitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.latitude ?? '')}" /></div><div class="field"><label for="projectStartingLongitude">Longitude</label><input id="projectStartingLongitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.longitude ?? '')}" /></div></div><div class="coordinate-grid"><div class="field"><label for="projectStartingAccuracy">Location accuracy (metres)</label><input id="projectStartingAccuracy" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.accuracy ?? '')}" /></div><div class="field"><label for="projectStartingFacing">Direction visitors should face</label><input id="projectStartingFacing" value="${escapeHtml(marker.facing_direction || '')}" placeholder="For example: north toward the orchard" /></div></div><div class="field"><label for="projectStartingPhoto">Optional reference photo</label><input id="projectStartingPhoto" type="url" value="${escapeHtml(marker.reference_photo || '')}" placeholder="https://…" /></div><div class="field"><label for="projectStartingQr">Optional QR or physical marker reference</label><input id="projectStartingQr" value="${escapeHtml(anchor.qr_code || marker.qr_reference || '')}" /></div><div class="field"><label for="projectStartingVisibility">Visibility</label><select id="projectStartingVisibility"><option value="draft" ${marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft - Creator only</option><option value="public" ${marker.visibility === 'public' ? 'selected' : ''}>Public</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><p id="projectStartingLocationStatus" class="meta">${anchor.latitude && anchor.longitude ? `Position configured${anchor.accuracy ? ` · accuracy ${escapeHtml(anchor.accuracy)} m` : ''}.` : 'Position not configured. You can save and finish it later.'}</p><p id="projectStartingError" class="meta"></p><button class="primary" type="submit">Save Starting Point</button></form></div>`;
        if (!startingPoint && preferredAreaId && areas.some(area => area.id === preferredAreaId)) {
            document.getElementById('projectStartingArea').value = preferredAreaId;
        }
        if (startingStage === 'new') recordTutorialEvent(project.id, 'starting_point_explained');
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
        const selectedAreaId = document.getElementById('projectStartingArea')?.value || '';
        const place = context.startingPoint?.place || context.places.find(area => area.id === selectedAreaId) || null;
        if (!place) throw new Error('Select an Area for the Starting Point.');
        const latitude = document.getElementById('projectStartingLatitude').value.trim();
        const longitude = document.getElementById('projectStartingLongitude').value.trim();
        const accuracy = document.getElementById('projectStartingAccuracy').value.trim();
        const qrReference = document.getElementById('projectStartingQr').value.trim();
        const hasCoordinates = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
        const data = { type: 'intro_checkpoint', name: document.getElementById('projectStartingName').value.trim(), description: document.getElementById('projectStartingDescription').value.trim(), directions: document.getElementById('projectStartingDirections').value.trim(), reference_photo: document.getElementById('projectStartingPhoto').value.trim(), facing_direction: document.getElementById('projectStartingFacing').value.trim(), qr_reference: qrReference, visibility };
        let savedMarker;
        if (context.startingPoint) savedMarker = await updatePlaceMarker(projectId, context.site.id, place.id, context.startingPoint.marker.id, data);
        else savedMarker = await createPlaceMarker(projectId, context.site.id, place.id, data);
        if (hasCoordinates || qrReference) await saveMarkerAnchor(projectId, context.site.id, place.id, savedMarker.id, { type: hasCoordinates ? 'gps' : 'qr', latitude: hasCoordinates ? Number(latitude) : '', longitude: hasCoordinates ? Number(longitude) : '', accuracy: accuracy === '' ? '' : Number(accuracy), qr_code: qrReference, description: data.directions });
        recordTutorialEvent(projectId, 'starting_point_configured');
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
    const { project, site, entries } = await projectContent(projectId);
    const entry = entries.find(item => item.marker.id === markerId);
    if (!entry) throw new Error('Entry not found.');
    const [placement] = await entriesWithPlacement(project, site, [entry]);
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${escapeHtml(entry.marker.name)}</h1><p class="subtitle">${markerTypeLabel(entry.marker.type)}</p></div><div class="panel"><p>${escapeHtml(entry.marker.description || entry.marker.notes || 'Detailed information can be added later.')}</p><p class="meta">Area: ${escapeHtml(entry.place.name)} · ${escapeHtml(entry.marker.visibility || 'draft')}</p><p class="placement-status ${placement.isPlaced ? 'is-placed' : 'is-unplaced'}">Placement status: ${placement.isPlaced ? 'Placed' : 'Not yet placed'}</p>${placement.isPlaced ? '' : `<button class="primary" type="button" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(entry.marker.id)}', '${encoded(entry.place.id)}', '${encoded(site?.id || '')}')">Place in AR</button>`}</div></div>`;
}
