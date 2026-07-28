import { createPlaceMarker, createSitePlace, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, updatePlaceMarker } from '../services/persistence.js';
import { renderProjectEntry } from '../components/projectEntry.js';
import { deleteSitePlace, updateSitePlace } from '../services/persistence.js';
import { createProjectSite, deleteProjectOnDisk, renameProjectOnDisk } from '../services/persistence.js';
import { deleteMarkerAnchor, loadMarkerAnchor, saveMarkerAnchor } from '../services/persistence.js';
import { loadProject } from '../services/persistence.js';
import { deletePlaceMarker, savePlantProfile } from '../services/persistence.js';
import { createAreaRecord } from '../services/areaWorkflow.js';
import { BUILD_INFO } from '../services/buildInfo.js';
import { loadPlantInstances, loadPlantLibrary } from '../services/plantDataService.js';
import { dismissTutorialFeature, getArTutorialProgress, getTutorialStage, isProjectTutorialEnabled, recallTutorialFeatures, recordTutorialEvent, replayArTutorial, resetArLearningTips, resetLearningTips, restartProjectTutorial, setArHintsEnabled, setProjectTutorialMode } from '../services/tutorialProgress.js';
import { scopedMarkerStorageId } from '../services/markerWorkflow.js';

const PROJECT_NAMES = {
    Hillyards: 'Hillyards Food Forest',
    Frankendael: 'Frankendael Park',
    Daleys: 'Daleys Fruit Tree Nursery'
};
const PROJECT_THEMES = new Set(['light', 'dark', 'forest-dark', 'forest-light', 'cyber']);
const DARK_PROJECT_THEMES = new Set(['dark', 'forest-dark', 'cyber']);
const projectThemeSaveQueues = new Map();
const requestedProjectThemes = new Map();
const checkpointSetupFlows = new Map();

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value));
const effectiveMarkerType = marker => marker?.semantic_type === 'area_checkpoint' ? 'area_checkpoint' : marker?.type;
const isAreaTotemMarker = (marker, areaName = '') => effectiveMarkerType(marker) === 'area_checkpoint'
    || (marker?.type === 'sub_checkpoint'
        && String(marker?.name || '').trim().toLocaleLowerCase() === `${String(areaName || '').trim().toLocaleLowerCase()} totem`);
const markerTypeLabel = type => ({ plant: 'Plant', note: 'Note', intro_checkpoint: 'Trail Entrance', sub_checkpoint: 'Checkpoint', area_checkpoint: 'Area Totem' })[type] || 'Content';
const markerIcon = type => ({ plant: '🌱', note: '✎', intro_checkpoint: '⚑', sub_checkpoint: '⚑', area_checkpoint: '⌖' })[type] || '◆';
const visibleQrCode = value => String(value || '').startsWith('nxr-spatial:') ? '' : String(value || '');
async function syncMarkerQrAnchor(projectId, siteId, placeId, markerId, qrCode, description = '', knownAnchor) {
    let anchor = knownAnchor;
    if (anchor === undefined) {
        anchor = await loadMarkerAnchor(projectId, siteId, placeId, markerId).catch(() => null);
    }
    const code = String(qrCode || '').trim();
    const spatialPosition = anchor?.position || anchor?.spatial_position;
    if (code) {
        if (anchor?.type === 'gps') {
            return saveMarkerAnchor(projectId, siteId, placeId, markerId, { ...anchor, type: 'gps', qr_code: code, description: description || anchor.description || '' });
        }
        return saveMarkerAnchor(projectId, siteId, placeId, markerId, {
            type: 'qr',
            qr_code: code,
            description,
            ...(spatialPosition ? {
                spatial_position: spatialPosition,
                spatial_coordinate_space: anchor?.coordinate_space || anchor?.spatial_coordinate_space || 'session-local',
                spatial_checkpoint_id: anchor?.checkpoint_id || anchor?.spatial_checkpoint_id || '',
                spatial_rotation_degrees: anchor?.rotation_degrees ?? anchor?.spatial_rotation_degrees
            } : {})
        });
    }
    if (!anchor || !visibleQrCode(anchor.qr_code)) return anchor;
    if (anchor.type === 'gps') {
        return saveMarkerAnchor(projectId, siteId, placeId, markerId, { ...anchor, qr_code: '' });
    }
    if (spatialPosition) {
        return saveMarkerAnchor(projectId, siteId, placeId, markerId, {
            type: 'spatial',
            position: spatialPosition,
            coordinate_space: anchor.coordinate_space || anchor.spatial_coordinate_space || 'session-local',
            checkpoint_id: anchor.checkpoint_id || anchor.spatial_checkpoint_id || '',
            rotation_degrees: anchor.rotation_degrees ?? anchor.spatial_rotation_degrees,
            qr_code: ''
        });
    }
    return deleteMarkerAnchor(projectId, siteId, placeId, markerId);
}
const isPlantProfileUpgraded = (marker, profile = {}) => Boolean(
    profile.profile_enabled === true
    || profile.scientific_name
    || profile.overview
    || profile.family
    || profile.origin
    || profile.plant_type
    || profile.layer
    || profile.uses
    || profile.propagation
    || profile.relationships
);
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
    let project = null;
    try {
        project = (await loadProjects()).find(item => item.id === projectId) || null;
    } catch {
        // The direct project endpoint below gives the more useful error.
    }
    if (!project) project = await loadProject(projectId);
    if (!project) throw new Error('Location data is unavailable.');
    const resolvedProject = { ...project, name: project.name || PROJECT_NAMES[project.id] || project.id };
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

const clampMapCoordinate = value => Math.max(7, Math.min(93, value));
const mapEntryKey = entry => `${entry.place.id}:${entry.marker.id}`;
const TERRACE_PLAN_POINTS = Object.freeze({
    '1R1': { x: 12, y: 89 }, '1R2': { x: 36, y: 92 }, '1R3': { x: 61, y: 92 }, '1R4': { x: 86, y: 89 },
    '1L1': { x: 14, y: 78 }, '1L2': { x: 36, y: 81 }, '1L3': { x: 61, y: 81 }, '1L4': { x: 86, y: 78 },
    '2R1': { x: 16, y: 60 }, '2R2': { x: 38, y: 63 }, '2R3': { x: 63, y: 63 }, '2R4': { x: 84, y: 60 },
    '2L1': { x: 17, y: 42 }, '2L2': { x: 40, y: 46 }, '2L3': { x: 63, y: 46 }, '2L4': { x: 83, y: 42 }
});
const terracePlanPoint = area => {
    const key = String(area?.name || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    const point = TERRACE_PLAN_POINTS[key];
    return point ? { ...point, positioned: true, planLinked: true } : null;
};

function buildSiteMapLayout(areas, entries, useTerracePlan = false, savedAreaPoints = {}) {
    const gpsPoints = [
        ...areas.map(area => area.anchor),
        ...entries.map(entry => entry.anchor)
    ].filter(hasGpsCoordinates);
    const latitudes = gpsPoints.map(point => Number(point.latitude));
    const longitudes = gpsPoints.map(point => Number(point.longitude));
    const hasMapBounds = latitudes.length > 1 && longitudes.length > 1;
    const maximumLatitude = latitudes.length ? Math.max(...latitudes) : 0;
    const minimumLatitude = latitudes.length ? Math.min(...latitudes) : 0;
    const maximumLongitude = longitudes.length ? Math.max(...longitudes) : 0;
    const minimumLongitude = longitudes.length ? Math.min(...longitudes) : 0;
    const latitudeRange = maximumLatitude - minimumLatitude || 0.0001;
    const longitudeRange = maximumLongitude - minimumLongitude || 0.0001;
    const pointForAnchor = anchor => {
        if (!hasMapBounds || !hasGpsCoordinates(anchor)) return null;
        return {
            x: clampMapCoordinate(8 + ((Number(anchor.longitude) - minimumLongitude) / longitudeRange) * 84),
            y: clampMapCoordinate(92 - ((Number(anchor.latitude) - minimumLatitude) / latitudeRange) * 84),
            positioned: true
        };
    };
    const columns = Math.max(1, Math.min(4, Math.ceil(Math.sqrt(Math.max(areas.length, 1)))));
    const rows = Math.max(1, Math.ceil(Math.max(areas.length, 1) / columns));
    const areaPoints = new Map(areas.map((area, index) => {
        const fallback = {
            x: ((index % columns) + 0.5) * (100 / columns),
            y: (Math.floor(index / columns) + 0.5) * (100 / rows),
            positioned: false
        };
        const saved = savedAreaPoints[area.id];
        const savedPoint = Number.isFinite(Number(saved?.x)) && Number.isFinite(Number(saved?.y))
            ? { x: clampMapCoordinate(Number(saved.x)), y: clampMapCoordinate(Number(saved.y)), positioned: true, planLinked: true }
            : null;
        return [area.id, savedPoint || (useTerracePlan ? terracePlanPoint(area) : null) || pointForAnchor(area.anchor) || fallback];
    }));
    const entriesByArea = new Map(areas.map(area => [area.id, entries.filter(entry => entry.place.id === area.id)]));
    const markerPoints = new Map();
    entriesByArea.forEach((areaEntries, areaId) => {
        const areaPoint = areaPoints.get(areaId) || { x: 50, y: 50, positioned: false };
        areaEntries.forEach((entry, index) => {
            const gpsPoint = pointForAnchor(entry.anchor);
            const angle = (index * 137.5) * Math.PI / 180;
            const ring = 4 + Math.floor(index / 6) * 2.5;
            markerPoints.set(mapEntryKey(entry), gpsPoint || {
                x: clampMapCoordinate(areaPoint.x + Math.cos(angle) * ring),
                y: clampMapCoordinate(areaPoint.y + Math.sin(angle) * ring),
                positioned: false
            });
        });
    });
    return { areaPoints, markerPoints, hasMapBounds };
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
        searchText: searchableText('Area', area.name, area.type, area.description),
        primarySearchText: searchableText(area.name),
        action: `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')`
    }));

    const contentItems = entries.map(({ marker, place }) => {
        const markerType = effectiveMarkerType(marker);
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
            icon: markerIcon(markerType),
            label: escapeHtml(marker.name),
            type: escapeHtml(markerTypeLabel(markerType)),
            area: escapeHtml(place.name || 'Unassigned'),
            detail: escapeHtml(detail),
            searchText: searchableText(
                marker.name,
                markerTypeLabel(markerType),
                place.name,
                marker.description,
                marker.notes,
                plant?.commonName,
                plant?.scientificName,
                plant?.family,
                plant?.cultivar,
                plant?.summary,
                instance?.cultivarOverride,
                legacyProfile?.common_name,
                legacyProfile?.scientific_name,
                legacyProfile?.overview,
                legacyProfile?.identification,
                legacyProfile?.edible_uses
            ),
            primarySearchText: searchableText(marker.name, plant?.commonName, plant?.scientificName),
            action: markerType === 'area_checkpoint'
                ? `window.renderAreaCheckpointForm('${encoded(project.id)}','${encoded(place.id)}')`
                : marker.type === 'intro_checkpoint'
                ? `window.openProjectStartingPoint('${encoded(project.id)}')`
                : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
        };
    });

    return [...areaItems, ...contentItems];
}

export function toggleAreas(trigger) {
    const button = trigger?.currentTarget || trigger;
    const section = button?.closest?.('[data-areas-expanded]');
    if (!section) return;
    const expanded = section.dataset.areasExpanded === 'true';
    section.dataset.areasExpanded = expanded ? 'false' : 'true';
    button.setAttribute('aria-expanded', String(!expanded));
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

    const matchingItems = [];
    items.forEach(item => {
        const matches = terms.length > 0 && terms.every(term => String(item.dataset.search || '').includes(term));
        item.hidden = !matches;
        if (matches) {
            visible += 1;
            matchingItems.push(item);
        }
    });

    const score = item => terms.reduce((total, term) => {
        const primary = String(item.dataset.searchPrimary || '');
        if (primary === term) return total + 1000;
        if (primary.startsWith(term)) return total + 500;
        if (primary.split(/\s+/).some(word => word.startsWith(term))) return total + 250;
        return total + (primary.includes(term) ? 100 : 1);
    }, 0);
    matchingItems
        .sort((left, right) => score(right) - score(left) || String(left.dataset.searchPrimary || '').localeCompare(String(right.dataset.searchPrimary || '')))
        .forEach(item => resultList?.append(item));

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

function dashboardGuidance(projectId, { hasArea, startingConfigured, freshProject, nonPlantMode = false }) {
    if (!isProjectTutorialEnabled(projectId)) return null;
    const candidates = [
        freshProject ? ['dashboardWelcome', 'welcome'] : null,
        ['arMode', 'arPath'],
        ['area', 'areas'],
        ['quickAccess', 'quickStarts']
    ].filter(Boolean);
    const forcedFeature = forcedGuidanceFeatures.get(projectId);
    const forcedTargets = { projectTutorial: 'projectTutorial', arMode: 'arPath', helpGuide: 'helpGuide', area: 'areas', quickAccess: 'quickStarts' };
    const selected = forcedFeature
        ? [forcedFeature, forcedTargets[forcedFeature] || 'header']
        : candidates.find(([feature]) => getTutorialStage(projectId, feature) !== 'understood');
    forcedGuidanceFeatures.delete(projectId);
    if (!selected) return null;
    const [feature, target] = selected;
    const stage = getTutorialStage(projectId, feature);
    const content = {
        dashboardWelcome: {
            title: 'WELCOME TO YOUR DASHBOARD',
            full: 'This is your project home. Nothing is selected yet—take a moment to see the whole Dashboard before we begin.',
            short: 'This is your project home. Nothing is selected yet.',
            actionLabel: '',
            action: ''
        },
        projectTutorial: {
            title: 'This is a good way to start!',
            full: 'The Project Tutorial is now expanded. Its tasks—such as adding one Plant, creating an Area and placing a Totem—give you a simple path through the foundations.',
            short: 'Follow these practical tasks whenever you want a clear next step.',
            actionLabel: '',
            action: ''
        },
        area: {
            title: 'An Area Totem holds a place together',
            full: nonPlantMode
                ? 'A framed Totem marks one room, collection zone or exhibition. Its Dynamic Markers, records and guidance can gather naturally around it.'
                : 'A translucent Totem marks one garden bed, grove or learning zone. The information and Markers belonging to that Area can gather naturally around it.',
            short: 'Use an Area Totem to give one part of the landscape its own identity.',
            actionLabel: hasArea ? 'View Areas' : 'Create Area',
            action: hasArea ? `window.openCreatorContentMode('${encoded(projectId)}')` : `window.renderProjectAreaForm('${encoded(projectId)}', 'dashboard')`
        },
        quickAccess: {
            title: 'Four small ways to understand the system',
            full: nonPlantMode
                ? 'Try any pathway: a Dynamic Marker identifies an object, a Location organises its place, a Totem introduces that Location, and a Note adds provenance, instructions or interpretation.'
                : 'Try any pathway: a Plant identifies a living object, an Area organises a place, a Totem introduces that Area, and a Plant Profile turns a simple Marker into a living library of knowledge.',
            short: 'Use these four pathways whenever you want to practise the foundations.',
            actionLabel: '',
            action: ''
        },
        arMode: {
            title: 'AR Mode and Field Guide work together',
            full: nonPlantMode
                ? 'AR Mode places knowledge beside real objects. The Field Guide is your searchable Web Mode library for reviewing and managing the same records. Use them together: place spatially, then organise and deepen the information.'
                : 'AR Mode places Plants, Notes and knowledge in the real landscape. The Field Guide is your searchable Web Mode library for reviewing, editing and learning from those same records. One gives knowledge a place; the other helps it grow.',
            short: 'AR Mode gives knowledge a place, while the Field Guide helps you manage and deepen it.',
            actionLabel: 'Create your first Marker',
            action: `window.openCreatorArMode('${encoded(projectId)}')`
        },
        helpGuide: {
            title: 'You can find more help here',
            full: 'More project guidance and settings live further down the Dashboard. Return here whenever you need another explanation or want to adjust how the project works.',
            short: 'More guidance and project tools are available here whenever you need them.',
            actionLabel: '',
            action: ''
        },
        contentMode: {
            title: 'About Content Mode',
            full: 'Content Mode lets you add, edit and organize the project without using the camera. Content created here can be positioned later using a map or AR Mode.',
            short: 'Content Mode works without the camera. Position content later when needed.',
            actionLabel: 'Open Content Mode',
            action: `window.openCreatorContentMode('${encoded(projectId)}')`
        },
        startingPoint: {
            title: 'Give a guided journey a clear entrance',
            full: 'A Trail Entrance is an optional welcoming gateway for walkthroughs. Create it only when visitors need a clear beginning; a name and short welcome are enough.',
            short: 'A Trail Entrance is optional and belongs to guided visitor journeys.',
            actionLabel: 'Create Trail Entrance',
            action: `window.startArMode('${encoded(projectId)}', '', '', 'intro_checkpoint')`
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
        closeAction: `window.advanceDashboardTutorial('${encoded(projectId)}', 'finish')`,
        nextAction: `window.advanceDashboardTutorial('${encoded(projectId)}', '${feature}')`,
        introducedEvent: GUIDANCE_EVENTS[feature]
    };
}

export async function dismissProjectGuidance(app, encodedProjectId, feature) {
    const projectId = decodeURIComponent(encodedProjectId);
    dismissTutorialFeature(projectId, feature);
    await renderProjectDashboard(app, encoded(projectId));
}

export async function showWorkModeGuidance(app, encodedProjectId) {
    return advanceDashboardTutorial(app, encodedProjectId, 'dashboardWelcome');
}

export async function advanceDashboardTutorial(app, encodedProjectId, currentStep) {
    const projectId = decodeURIComponent(encodedProjectId);
    const nextFeature = {
        dashboardWelcome: 'projectTutorial',
        projectTutorial: 'arMode',
        arMode: 'helpGuide'
    }[currentStep];
    if (currentStep === 'dashboardWelcome') dismissTutorialFeature(projectId, 'dashboardWelcome');
    if (currentStep === 'projectTutorial') dismissTutorialFeature(projectId, 'contentMode');
    if (nextFeature) {
        forcedGuidanceFeatures.set(projectId, nextFeature);
        await renderProjectDashboard(app, encoded(projectId));
        return;
    }
    ['dashboardWelcome', 'arMode', 'contentMode', 'quickAccess', 'area'].forEach(feature => dismissTutorialFeature(projectId, feature));
    await renderProjectDashboard(app, encoded(projectId));
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }));
}

export async function openCreatorArMode(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    recordTutorialEvent(projectId, 'ar_mode_introduced');
    const started = await window.startArMode?.(encoded(projectId));
    if (!started) await renderArAreaPicker(app, encoded(projectId));
}

export async function openCheckpointQuickSetup(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const context = await projectContent(projectId);
        const areas = context.places.filter(place => place.name !== 'Unassigned');
        const startingPoint = context.startingPoint;
        const startingStep = startingPoint
            ? `<section class="panel guide"><h2>Trail Entrance</h2><p><strong>${escapeHtml(startingPoint.marker.name)}</strong> is already set in ${escapeHtml(startingPoint.place.name)}.</p></section>`
            : `<section class="panel guide"><h2>Optional Trail Entrance</h2><p>A Trail Entrance is useful for guided visitor journeys, but it is not required for ordinary mapping.</p><div class="button-row"><button type="button" onclick="window.renderStartingPointForm('${encoded(context.project.id)}', '', 'checkpoint-quick')">Create Trail Entrance</button><button type="button" onclick="window.openCheckpointQuickSetup('${encoded(context.project.id)}')">Continue without one</button></div></section>`;
        const areaChoices = areas.map(area => `<button class="content-type-row" type="button" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(area.id)}', 'quick')"><strong>${escapeHtml(area.name)}</strong><span>${escapeHtml(area.type || 'Area')} · add a named checkpoint for this Area.</span></button>`).join('');
        app.innerHTML = `<div class="screen checkpoint-quick-setup"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Back to Dashboard</button><p class="welcome-label">Quick Access</p><h1>Add Checkpoint</h1><p class="subtitle">Choose an Area; add a Trail Entrance only for guided journeys.</p></div>${startingStep}<section class="panel"><h2>Area Checkpoint</h2><p>Choose an existing Area, or create a new Area first. The checkpoint is a simple named marker associated with that one Area.</p></section><div class="content-type-list">${areaChoices || '<p class="project-empty-state">No Areas have been created yet.</p>'}<button class="content-type-row" type="button" onclick="window.renderProjectAreaForm('${encoded(context.project.id)}', 'checkpoint-quick')"><strong>Create New Area</strong><span>Name an Area, then add its checkpoint.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back to Dashboard</button><h1>Checkpoint setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderCheckpointPlacementChoice(app, encodedProjectId, encodedAreaId, encodedMarkerId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const markerId = decodeURIComponent(encodedMarkerId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        const marker = context.areaEntries.find(entry => entry.marker.id === markerId)?.marker;
        if (!marker) throw new Error('Checkpoint marker is unavailable.');
        app.innerHTML = `<div class="screen checkpoint-placement-choice"><div class="page-header"><button class="ghost" type="button" onclick="window.openCheckpointQuickSetup('${encoded(context.project.id)}')">Back to Checkpoints</button><p class="welcome-label">Checkpoint saved</p><h1>${escapeHtml(marker.name)}</h1><p class="subtitle">${escapeHtml(context.area.name)} · Area checkpoint</p></div><section class="panel guide"><p>Your checkpoint is saved as a draft. Choose whether to place it with the camera now or return to the dashboard and do that later.</p></section><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '${encoded(marker.id)}')"><strong>Add in AR now</strong><span>Open AR at this Area, recenter the checkpoint, then place related content.</span></button><button class="content-type-row" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')"><strong>Add location later</strong><span>Keep the checkpoint and complete spatial placement another time.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.openCheckpointQuickSetup('${encoded(projectId)}')">Back to Checkpoints</button><h1>Checkpoint unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderArAreaPicker(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const context = await projectContent(projectId);
        const areas = context.places.filter(area => area.name !== 'Unassigned');
        const cards = areas.map(area => {
            const checkpoint = context.entries.find(entry => entry.place.id === area.id && effectiveMarkerType(entry.marker) === 'area_checkpoint');
            if (checkpoint) {
                const checkpointStatus = checkpoint.marker.qr_reference ? `Physical Area Marker: <strong>${escapeHtml(checkpoint.marker.name)}</strong>` : `Temporary Area Marker: <strong>${escapeHtml(checkpoint.marker.name)}</strong> · add the physical marker code later.`;
                return `<section class="panel ar-area-card is-ready"><h2>${escapeHtml(area.name)}</h2><p>${checkpointStatus}</p><div class="button-row"><button class="primary" type="button" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(area.id)}', '${encoded(checkpoint.marker.id)}')">Open placement AR</button><button type="button" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(area.id)}')">Edit Area Marker</button></div></section>`;
            }
            return `<section class="panel ar-area-card"><h2>${escapeHtml(area.name)}</h2><p>No Area Marker yet. You can test AR now and add a temporary marker when you are ready.</p><button type="button" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(area.id)}')">Add Area Marker</button></section>`;
        }).join('');
        app.innerHTML = `<div class="screen ar-area-picker"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Back to Dashboard</button><p class="welcome-label">Creator AR</p><h1>AR setup guide</h1><p class="subtitle">Test with no physical code, then add checkpoints when they are installed.</p></div><section class="panel guide"><h2>Set up a small Area</h2><ol><li><strong>Area Totem</strong> — create the Area’s clear information centre.</li><li><strong>Plants, Markers and Notes</strong> — add discoveries to that Area.</li><li><strong>Optional Trail Entrance</strong> — add one only if visitors need a guided beginning.</li></ol><div class="button-row"><button type="button" onclick="window.renderStartingPoints('${encoded(context.project.id)}')">Home &amp; Entrances</button><button class="primary" type="button" onclick="window.startArMode('${encoded(context.project.id)}')">Open Test AR</button></div></section>${cards || `<section class="panel"><p>Create an Area before placing its Totem and ordinary Markers.</p><div class="button-row"><button class="primary" type="button" onclick="window.renderProjectAreaForm('${encoded(context.project.id)}', 'dashboard')">Create Area</button></div></section>`}</div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back to Dashboard</button><h1>AR setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAreaCheckpointForm(app, encodedProjectId, encodedAreaId, flow = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        const flowKey = `${projectId}:${areaId}`;
        if (flow) checkpointSetupFlows.set(flowKey, flow);
        else checkpointSetupFlows.delete(flowKey);
        const existing = context.areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        const [placedExisting] = existing ? await entriesWithPlacement(context.project, context.site, [existing]) : [];
        const isPlaced = Boolean(placedExisting?.isPlaced);
        let savedCode = existing?.marker.qr_reference || '';
        if (existing && !savedCode) {
            try { savedCode = visibleQrCode((await loadMarkerAnchor(projectId, context.site.id, areaId, existing.marker.id)).qr_code); }
            catch { savedCode = ''; }
        }
        const submitLabel = existing ? 'Save Totem changes' : 'Save Totem';
        const totemName = existing?.marker.name || `${context.area.name} Totem`;
        const totemColor = /^#[0-9a-f]{6}$/i.test(existing?.marker.appearance?.color || '') ? existing.marker.appearance.color : '#68c7b8';
        const board = existing?.marker.area_information_board || {};
        const linkableAreas = context.places.filter(place => place.name !== 'Unassigned' && place.id !== context.area.id);
        const existingLinks = Array.isArray(context.area.totem_links) ? context.area.totem_links : [];
        const linkOptions = linkableAreas.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.name)}</option>`).join('');
        const bubbles = Array.isArray(board.information_bubbles) ? board.information_bubbles : [];
        const startingBubbles = bubbles.length ? bubbles : [''];
        const bubbleFields = startingBubbles.map((text, index) => `<div class="field totem-text-box"><label for="areaCheckpointBubble${index}">Text box ${index + 1}</label><textarea id="areaCheckpointBubble${index}" data-totem-information-box rows="2" placeholder="${index === 0 ? 'What does this Totem help people understand?' : 'Add another useful idea, story or instruction.'}">${escapeHtml(text)}</textarea></div>`).join('');
        app.innerHTML = `<div class="screen area-checkpoint-form totem-profile-page database-record-page"><div class="page-header"><p class="welcome-label">TOTEM · WEB MODE</p><div class="totem-title-row"><h1>${escapeHtml(totemName)}</h1><button type="button" data-edit-totem-name aria-label="Edit Totem name">✎</button></div></div><form id="totemFileForm" class="totem-file-form" onsubmit="window.saveAreaCheckpoint(event, '${encoded(context.project.id)}', '${encoded(context.area.id)}')">
            <section class="totem-profile-hero">
                <div class="totem-profile-visual" style="--totem-color:${totemColor}" aria-hidden="true"><span></span></div>
                <div class="totem-essential-controls">
                    <div class="field totem-name-editor" hidden><label for="areaCheckpointName">Totem name</label><input id="areaCheckpointName" value="${escapeHtml(totemName)}" required /></div>
                    <div class="field totem-color-control"><label for="areaCheckpointColor">Totem color</label><input id="areaCheckpointColor" type="color" value="${totemColor}" /></div>
                    <button class="spatial-focus-button compact-ar-action" type="button" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '${encoded(existing?.marker.id || '')}', '${existing ? '' : 'area_checkpoint'}', '', 'web-totem:${encoded(context.area.id)}', '${encoded(context.site.id)}')">${isPlaced ? 'VIEW IN AR' : 'PLACE IN AR'}</button>
                </div>
            </section>
            <section class="totem-welcome-card"><label for="areaCheckpointIntroduction"><span aria-hidden="true">✦</span> Main welcome text</label><p>The main information bubble is usually the first thing visitors need.</p><textarea id="areaCheckpointIntroduction" rows="3" placeholder="Welcome people into this Area.">${escapeHtml(board.introduction || '')}</textarea></section>
            <section class="totem-information-editor" aria-labelledby="totemTextBoxesTitle"><div class="totem-editor-heading"><div><h2 id="totemTextBoxesTitle">Additional information balloons</h2><p>Attach more text boxes only when this Totem needs them.</p></div><button type="button" data-add-totem-text-box><span aria-hidden="true">+</span> Text box</button></div><div class="totem-text-box-grid" data-totem-text-boxes>${bubbleFields}</div></section>
            <section class="totem-relationship-grid">
                <div class="totem-anchor-card"><span aria-hidden="true">▦</span><div><strong>PHYSICAL QR CODE</strong><p>Link this Totem to the QR label installed at its real-world position.</p><label for="areaCheckpointCode">Totem QR code</label><input id="areaCheckpointCode" value="${escapeHtml(savedCode)}" placeholder="Scan or enter the code on this Totem" /></div></div>
                <div class="totem-link-card"><span aria-hidden="true">↗</span><div><strong>LINK</strong><p>Connect this Totem to another Totem in the location.</p>${linkOptions ? `<label for="areaCheckpointLinkTarget">Link to Totem</label><select id="areaCheckpointLinkTarget"><option value="">Choose another Area Totem</option>${linkOptions}</select><div class="totem-link-measure"><input id="areaCheckpointLinkSteps" type="number" min="0" placeholder="Steps" /><input id="areaCheckpointLinkDistance" type="number" min="0" step="0.1" placeholder="Metres" /></div>` : '<small>Create another Area before linking Totems.</small>'}<div class="totem-existing-links">${existingLinks.map(link => `<span>${escapeHtml(linkableAreas.find(area => area.id === link.target_area_id)?.name || link.target_area_id)}</span>`).join('')}</div></div></div>
            </section>
            <p id="areaCheckpointStatus" class="meta"></p>
        </form><nav class="bottom-navigation totem-bottom-navigation"><button class="primary" type="submit" form="totemFileForm">${submitLabel}</button>${existing ? `<button class="danger" type="button" onclick="window.deleteProjectEntry('${encoded(context.project.id)}','${encoded(existing.marker.id)}')">Delete</button>` : ''}<button type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Back to Area</button><button type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Back to Dashboard</button></nav></div>`;
        app.querySelector('[data-edit-totem-name]')?.addEventListener('click', () => {
            const editor = app.querySelector('.totem-name-editor');
            editor?.removeAttribute('hidden');
            editor?.querySelector('input')?.focus();
        });
        app.querySelector('#areaCheckpointColor')?.addEventListener('input', event => {
            app.querySelector('.totem-profile-visual')?.style.setProperty('--totem-color', event.currentTarget.value);
        });
        app.querySelector('[data-add-totem-text-box]')?.addEventListener('click', () => {
            const grid = app.querySelector('[data-totem-text-boxes]');
            const index = grid?.querySelectorAll('[data-totem-information-box]').length || 0;
            if (!grid) return;
            const field = document.createElement('div');
            field.className = 'field totem-text-box';
            field.innerHTML = `<label for="areaCheckpointBubble${index}">Text box ${index + 1}</label><textarea id="areaCheckpointBubble${index}" data-totem-information-box rows="2" placeholder="Add another useful idea, story or instruction."></textarea>`;
            grid.append(field);
            field.querySelector('textarea')?.focus();
        });
        if (flow === 'quick') {
            const returnButton = app.querySelectorAll('.bottom-navigation button')[1];
            if (returnButton) returnButton.onclick = () => openCheckpointQuickSetup(app, encoded(context.project.id));
        }
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back to Dashboard</button><h1>Checkpoint unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveAreaCheckpoint(event, encodedProjectId, encodedAreaId, flow = '') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const status = document.getElementById('areaCheckpointStatus');
    try {
        const context = await projectAreaContext(projectId, areaId);
        const flowKey = `${projectId}:${areaId}`;
        const nextFlow = flow || checkpointSetupFlows.get(flowKey) || '';
        const name = document.getElementById('areaCheckpointName').value.trim();
        const color = document.getElementById('areaCheckpointColor').value;
        const qrCode = document.getElementById('areaCheckpointCode').value.trim();
        const introduction = document.getElementById('areaCheckpointIntroduction').value.trim();
        const informationBubbles = [...document.querySelectorAll('[data-totem-information-box]')].map(field => field.value.trim()).filter(Boolean);
        const linkTarget = document.getElementById('areaCheckpointLinkTarget')?.value || '';
        const linkSteps = document.getElementById('areaCheckpointLinkSteps')?.value || '';
        const linkDistance = document.getElementById('areaCheckpointLinkDistance')?.value || '';
        if (!name) throw new Error('Checkpoint name is required.');
        const existing = context.areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        if (status) status.textContent = 'Saving Area Marker…';
        const checkpointData = {
            id: existing?.marker.id || scopedMarkerStorageId(projectId, context.site.id, areaId, 'area-totem'),
            name,
            type: 'area_checkpoint',
            description: `Physical anchor for ${context.area.name}.`,
            qr_reference: qrCode,
            area_information_board: {
                title: context.area.name,
                introduction: introduction || `Welcome to ${context.area.name}.`,
                information_bubbles: informationBubbles
            },
            visibility: existing?.marker.visibility || 'draft',
            appearance: { ...(existing?.marker.appearance || {}), color }
        };
        let savedMarker;
        try {
            savedMarker = existing
                ? await updatePlaceMarker(projectId, context.site.id, areaId, existing.marker.id, checkpointData)
                : await createPlaceMarker(projectId, context.site.id, areaId, checkpointData);
        } catch (error) {
            if (!/unsupported|marker type|place type/i.test(String(error?.message || ''))) throw error;
            const compatibleData = { ...checkpointData, type: 'sub_checkpoint', semantic_type: 'area_checkpoint', storage_type: 'sub_checkpoint' };
            savedMarker = existing
                ? await updatePlaceMarker(projectId, context.site.id, areaId, existing.marker.id, compatibleData)
                : await createPlaceMarker(projectId, context.site.id, areaId, compatibleData);
        }
        savedMarker = savedMarker?.marker || savedMarker;
        await syncMarkerQrAnchor(projectId, context.site.id, areaId, savedMarker.id, qrCode, `Physical Totem for ${context.area.name}.`);
        if (linkTarget) {
            const links = Array.isArray(context.area.totem_links) ? context.area.totem_links.filter(link => link.target_area_id !== linkTarget) : [];
            links.push({ target_area_id: linkTarget, steps: linkSteps === '' ? '' : Number(linkSteps), distance_m: linkDistance === '' ? '' : Number(linkDistance) });
            await updateSitePlace(projectId, context.site.id, areaId, { totem_links: links });
        }
        checkpointSetupFlows.delete(flowKey);
        if (nextFlow === 'quick') await renderCheckpointPlacementChoice(document.getElementById('app'), encoded(projectId), encoded(areaId), encoded(savedMarker.id));
        else await window.renderProjectAreaDashboard(encoded(projectId), encoded(areaId));
    } catch (error) {
        if (status) status.textContent = `Area Marker could not be saved: ${error.message}`;
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
    const cards = projects.map(project => {
        const name = PROJECT_NAMES[project.id] || project.name;
        return `<button class="menu-card project-selection-row" onclick="window.renderProjectDashboard('${encoded(project.id)}', '${encoded(name)}')"><strong>${escapeHtml(name)}</strong></button>`;
    }).join('');
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
    if (feature === 'Help Guide') {
        app.innerHTML = `<div class="screen help-guide-screen">
            <div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><p class="welcome-label">NourishlandXR</p><h1>Help Guide</h1><p class="subtitle">Fast answers while you create.</p></div>
            <section class="panel help-guide-quick"><h2>Quick how-to</h2><ol>
                <li><strong>Create in Web Mode:</strong> save Plants, Notes and ideas directly, using the Organizer Folder only for items you want to sort or place later.</li>
                <li><strong>Organise:</strong> create Areas for meaningful parts of the landscape.</li>
                <li><strong>Place in AR:</strong> open an Area or AR Mode, aim at the real location and place an element.</li>
                <li><strong>Optional journeys:</strong> add a Home Base for organisation or a Trail Entrance for a guided walkthrough.</li>
                <li><strong>Explore:</strong> use the Field Guide for Plants, Areas and their information.</li>
            </ol></section>
            <section class="help-faq" aria-labelledby="helpFaqTitle"><h2 id="helpFaqTitle">Frequently asked questions</h2>
                <details open><summary>Do I need AR to begin?</summary><p>No. Web Mode is your database and notebook. Build information first and place it later.</p></details>
                <details><summary>What is a Marker?</summary><p>A Marker is a spatial anchor. It can become a Plant, Note or another useful element.</p></details>
                <details><summary>What is an Area Totem?</summary><p>A Totem represents one Area and gathers the information belonging to that part of the landscape.</p></details>
                <details><summary>Do I need a Home Base or Trail Entrance?</summary><p>No. Areas and their Totems are the foundation. A Home Base is an optional organisational return point; a Trail Entrance is only for guided visitor journeys.</p></details>
                <details><summary>What happens when I am offline?</summary><p>Prepared project content remains available locally. New field observations can be synchronised when connectivity returns.</p></details>
                <details><summary>Can I make a mistake?</summary><p>Yes—and fix it. Creator tools let you edit, move or remove your own content without changing the underlying real place.</p></details>
            </section>
        </div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from the welcome page.</p></div></div>`;
}

export async function renderProjectDashboard(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries, startingPoint } = await projectContent(projectId);
        const nonPlantMode = project.template === 'inventory_exhibition';
        const areas = places.filter(place => place.name !== 'Unassigned');
        const hasArea = areas.length > 0;
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const unplacedEntries = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && !entry.isPlaced);
        const projectEntries = entries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)));
        const placedProjectEntries = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && entry.isPlaced);
        const placedTotemAreaIds = new Set(placedEntries
            .filter(entry => effectiveMarkerType(entry.marker) === 'area_checkpoint' && entry.isPlaced)
            .map(entry => entry.place.id));
        const missingTotemArea = areas.find(area => !placedTotemAreaIds.has(area.id)) || null;
        const allAreasHavePlacedTotems = areas.length > 0 && !missingTotemArea;
        const homeArea = areas.find(area => area.id === project.homeBaseAreaId) || null;
        const plantEntries = projectEntries.filter(entry => effectiveMarkerType(entry.marker) === 'plant');
        const plantCount = plantEntries.length;
        const plantProfiles = await Promise.all(plantEntries.map(async entry => ({
            entry,
            profile: entry.marker.plant_profile_path
                ? await loadPlantProfile(project.id, site?.id || '', entry.place.id, entry.marker.id).catch(() => entry.marker.plant_profile || {})
                : entry.marker.plant_profile || {}
        })));
        const profiledPlants = plantProfiles.filter(({ entry, profile }) => isPlantProfileUpgraded(entry.marker, profile));
        const plantProfileCount = profiledPlants.length;
        const nextPlantWithoutProfile = plantProfiles.find(({ entry, profile }) => !isPlantProfileUpgraded(entry.marker, profile))?.entry || null;
        const noteCount = projectEntries.filter(entry => effectiveMarkerType(entry.marker) === 'note').length;
        const dynamicMarkerCount = projectEntries.filter(entry => effectiveMarkerType(entry.marker) === 'sub_checkpoint').length;
        const growthSteps = nonPlantMode ? [
            { label: 'Add 1 Location Area', complete: hasArea },
            { label: 'Add 5 Dynamic Markers', complete: dynamicMarkerCount >= 5, progress: `${Math.min(dynamicMarkerCount, 5)}/5` },
            { label: 'Create 1 Totem', complete: placedTotemAreaIds.size > 0 },
            { label: 'Add 1 Information Note', complete: noteCount >= 1 }
        ] : [
            { label: 'Add 1 Area', complete: hasArea },
            { label: 'Add 5 Plants', complete: plantCount >= 5, progress: `${Math.min(plantCount, 5)}/5` },
            { label: 'Create 2 Plant Profiles', complete: plantProfileCount >= 2, progress: `${Math.min(plantProfileCount, 2)}/2` },
            { label: 'Add a Home or Entrance', complete: Boolean(homeArea || startingPoint) },
            { label: 'Add 1 Note', complete: noteCount >= 1 }
        ];
        const growthCompleted = growthSteps.filter(step => step.complete).length;
        const firstArea = areas[0];
        const growthNext = nonPlantMode
            ? !hasArea
                ? { label: 'Create your first Location', description: 'Define one room, shelf, zone or exhibition space.', action: `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')` }
                : dynamicMarkerCount < 5
                    ? { label: 'Add a Dynamic Marker', description: `${5 - dynamicMarkerCount} Marker${5 - dynamicMarkerCount === 1 ? '' : 's'} remaining.`, action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'sub_checkpoint', 'without-ar', true)` }
                    : placedTotemAreaIds.size < 1
                        ? { label: 'Create a Totem', description: 'Give the collection a spatial information centre.', action: `window.renderAreaCheckpointForm('${encoded(project.id)}', '${encoded(firstArea.id)}')` }
                        : noteCount < 1
                            ? { label: 'Add an Information Note', description: 'Attach useful context to this collection.', action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'note', 'without-ar', true)` }
                            : { label: 'Tutorial complete', description: 'Your spatial collection is ready.', action: `window.startArMode('${encoded(project.id)}')` }
            : !hasArea
            ? {
                label: 'Create your first Area',
                description: 'Begin with one meaningful section of the landscape.',
                action: `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')`
            }
            : plantCount < 5
                    ? {
                        label: 'Add a Plant',
                        description: `${5 - plantCount} Plant${5 - plantCount === 1 ? '' : 's'} remaining.`,
                        action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`
                    }
                    : plantProfileCount < 2
                        ? {
                            label: 'Create a Plant Profile',
                            description: `${2 - plantProfileCount} Plant Profile${2 - plantProfileCount === 1 ? '' : 's'} remaining.`,
                            action: nextPlantWithoutProfile
                                ? `window.openProjectEntry('${encoded(project.id)}','${encoded(nextPlantWithoutProfile.marker.id)}')`
                                : `window.renderFieldGuide('${encoded(project.id)}', true)`
                        }
                        : !homeArea && !startingPoint
                        ? {
                            label: 'Add a Home or Entrance',
                            description: 'Choose an optional return point or visitor beginning.',
                            action: `window.renderStartingPoints('${encoded(project.id)}')`
                        }
                        : noteCount < 1
                            ? {
                                label: 'Add a Note',
                                description: 'Record one useful observation.',
                                action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'note', 'without-ar', true)`
                            }
                            : {
                                label: 'Tutorial complete',
                                description: 'Your essential mapping tools are ready.',
                                action: `window.startArMode('${encoded(project.id)}')`
                            };
        const growthJourney = project.expertMode === true
            || !isProjectTutorialEnabled(project.id)
            || growthCompleted === growthSteps.length
            ? null
            : {
            steps: growthSteps,
            completed: growthCompleted,
            stage: 'Getting started',
            message: 'Project tutorial',
            nextLabel: growthNext.label,
            nextDescription: growthNext.description,
            nextAction: growthNext.action,
            starterActions: nonPlantMode ? [
                { icon: '◆', label: 'Add Dynamic Marker', description: 'Identify an object, asset or exhibit.', action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'sub_checkpoint', 'without-ar', true)` },
                { icon: '▧', label: 'Create first Location', description: 'Organise a room, shelf, zone or display.', action: `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')` },
                { icon: '⌖', label: 'Create first Totem', description: 'Give the Location an information centre.', action: firstArea ? `window.renderAreaCheckpointForm('${encoded(project.id)}', '${encoded(firstArea.id)}')` : `window.renderProjectAreaForm('${encoded(project.id)}', 'tutorial-totem')` },
                { icon: '✎', label: 'Add Information Note', description: 'Attach instructions, provenance or a story.', action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'note', 'without-ar', true)` }
            ] : [
                {
                    icon: '🌱',
                    label: 'Add first Plant',
                    description: 'Identify one living thing and give it a Marker.',
                    action: `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`
                },
                {
                    icon: '▧',
                    label: 'Create first Area',
                    description: 'Organise one meaningful part of the real place.',
                    action: `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')`
                },
                {
                    icon: '⌖',
                    label: 'Create first Totem',
                    description: 'Give an Area a welcoming information centre.',
                    action: firstArea
                        ? `window.renderAreaCheckpointForm('${encoded(project.id)}', '${encoded(firstArea.id)}')`
                        : `window.renderProjectAreaForm('${encoded(project.id)}', 'tutorial-totem')`
                },
                {
                    icon: '⬡',
                    label: 'Create first Plant Profile',
                    description: 'Turn a Plant Marker into a living knowledge library.',
                    action: nextPlantWithoutProfile
                        ? `window.openProjectEntry('${encoded(project.id)}','${encoded(nextPlantWithoutProfile.marker.id)}')`
                        : `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`
                }
            ],
            optionalFeature: null
        };
        const guidance = project.expertMode === true ? null : dashboardGuidance(project.id, { hasArea, startingConfigured: Boolean(startingPoint), freshProject: !hasArea && projectEntries.length === 0, nonPlantMode });
        const latestDate = [
            ...projectEntries.map(entry => entry.marker.modified || entry.marker.created),
            ...areas.map(area => area.modified || area.created)
        ].filter(Boolean).sort().at(-1);
        const latestEntries = placedEntries.slice(0, 8).map(({ marker, place }) => {
            const markerType = effectiveMarkerType(marker);
            return {
                label: escapeHtml(marker.name),
                type: escapeHtml(markerTypeLabel(markerType)),
                identifier: escapeHtml(marker.plant_code || marker.id),
                location: escapeHtml(place.name === 'Unassigned' ? 'Home' : (place.name || 'N/A')),
                date: escapeHtml(entryDateLabel(marker.created || marker.modified)),
                creator: escapeHtml(entryCreatorLabel(marker)),
                action: markerType === 'area_checkpoint'
                    ? `window.renderAreaCheckpointForm('${encoded(project.id)}','${encoded(place.id)}')`
                    : marker.type === 'intro_checkpoint'
                        ? `window.openProjectStartingPoint('${encoded(project.id)}')`
                        : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
            };
        });
        const areaLinks = areas.map(area => {
            const areaEntries = entries.filter(entry => entry.place.id === area.id);
            return {
                label: escapeHtml(area.name),
                type: escapeHtml(area.type || 'Area'),
                identifier: escapeHtml(area.id),
                contentCount: areaEntries.length,
                hasLocation: hasGpsCoordinates(area.anchor),
                hasStartingPoint: areaEntries.some(entry => entry.marker.type === 'intro_checkpoint'),
                hasHomeBase: project.homeBaseAreaId === area.id,
                action: `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')`
            };
        });
        const searchItems = await buildProjectSearchItems(project, site, areas, entries);
        app.innerHTML = renderProjectEntry({
            locationId: escapeHtml(project.id),
            nonPlantMode,
            areas: areaLinks,
            searchItems,
            locationName: escapeHtml(project.name),
            siteName: escapeHtml(site?.name || 'No site configured'),
            backAction: 'window.renderLaunchScreen()',
            status: {
                entries: String(projectEntries.length),
                unplaced: String(unplacedEntries.length),
                areas: String(areas.length),
                lastUpdated: latestDate ? editedLabel(latestDate).replace(/^Edited /, '') : 'No edits yet',
                notice: ''
            },
            openArAction: `window.startArMode('${encoded(project.id)}')`,
            homeConfigured: Boolean(homeArea || startingPoint),
            homeLabel: homeArea ? 'Home Base' : 'Trail Entrance',
            homeAction: homeArea
                ? `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(homeArea.id)}')`
                : startingPoint
                ? `window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(startingPoint.place.id)}')`
                : '',
            createAreaAction: `window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')`,
            growthJourney,
            addUnplacedAction: `window.renderAddToLocation('${encoded(project.id)}')`,
            createQuickPlantAction: `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`,
            guidance,
            fieldGuideAction: nonPlantMode
                ? `window.renderBrowseContent('${encoded(project.id)}', true)`
                : `window.renderFieldGuide('${encoded(project.id)}', true)`,
            mapAction: `window.renderLocationMap('${encoded(project.id)}', true)`,
            storiesAction: `window.renderStoriesAndFocus('${encoded(project.id)}')`,
            unplacedAction: `window.renderUnplacedContent('${encoded(project.id)}')`,
            tools: [
                { label: 'Project Settings', action: `window.renderProjectSettings('${encoded(project.id)}')` },
                { label: 'NourishlandXR Settings', action: `window.renderPlatformComingSoon('Settings', 'creator')` },
                { label: 'Help Guide', action: `window.renderPlatformComingSoon('Help Guide', 'creator')` }
            ],
            latestEntries,
            viewAllAction: `window.renderAllProjectEntries('${encoded(project.id)}')`
        });
        if (guidance?.stage === 'new' && guidance.introducedEvent) {
            recordTutorialEvent(project.id, guidance.introducedEvent);
        }
        if (guidance?.target) requestAnimationFrame(() => {
            document.querySelector('.tutorial-spotlight-target')?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        });
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Location unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

function allProjectEntryRow(project, marker, place) {
    const markerType = effectiveMarkerType(marker);
    const action = markerType === 'area_checkpoint'
        ? `window.renderAreaCheckpointForm('${encoded(project.id)}','${encoded(place?.id || '')}')`
        : marker.type === 'intro_checkpoint'
        ? `window.openProjectStartingPoint('${encoded(project.id)}')`
        : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`;
    const search = searchableText(marker.name, markerTypeLabel(markerType), marker.description, marker.notes, entryCreatorLabel(marker), entryDateLabel(marker.created || marker.modified));
    return `<button class="latest-entry-row all-project-entry-row" type="button" data-all-project-entry data-search="${escapeHtml(search)}" onclick="${action}">
        <span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${escapeHtml(markerTypeLabel(markerType))}</span></span>
        <span class="latest-entry-detail"><span>Date</span><strong>${escapeHtml(entryDateLabel(marker.created || marker.modified))}</strong></span>
        <span class="latest-entry-detail latest-entry-author"><span>Added by</span><strong>${escapeHtml(entryCreatorLabel(marker))}</strong></span>
    </button>`;
}

export async function renderAllProjectEntries(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, places, entries } = await projectContent(projectId);
        const rows = entries.map(({ marker, place }) => allProjectEntryRow(project, marker, place)).join('');
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
        app.innerHTML = `<div class="screen visitor-welcome-editor"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">Creator</p><h1>Edit Visitor Welcome</h1><p class="subtitle">This is the introduction visitors see after choosing ${escapeHtml(project.name)}.</p></div><form class="panel" onsubmit="window.saveVisitorWelcome(event, '${encoded(project.id)}')"><div class="field"><label for="visitorWelcomeDescription">Location introduction</label><textarea id="visitorWelcomeDescription" rows="5" placeholder="Introduce the landscape and what visitors can discover.">${escapeHtml(project.description || '')}</textarea></div><div class="field"><label for="visitorWelcomeCover">Optional cover image</label><input id="visitorWelcomeCover" type="url" value="${escapeHtml(project.coverImage || '')}" placeholder="https://…" /></div><div class="field"><label for="visitorWelcomeHeading">Welcome-area heading</label><input id="visitorWelcomeHeading" value="${escapeHtml(marker.name || 'Welcome')}" required /></div><div class="field"><label for="visitorWelcomeText">Welcome message</label><textarea id="visitorWelcomeText" rows="5" placeholder="Welcome visitors and explain how to begin.">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="visitorWelcomeDirections">Arrival instructions</label><textarea id="visitorWelcomeDirections" rows="4" placeholder="Describe how to find the Trail Entrance.">${escapeHtml(marker.directions || '')}</textarea></div><div class="field"><label for="visitorWelcomeVisibility">Visitor visibility</label><select id="visitorWelcomeVisibility"><option value="public" ${marker.visibility === 'public' || !startingPoint ? 'selected' : ''}>Published — visible to visitors</option><option value="draft" ${startingPoint && marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft — creator only</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><p class="meta">Precise GPS, facing direction and QR references remain available under Manage Trail Entrance.</p><p id="visitorWelcomeError" class="meta"></p><div class="button-row"><button type="button" onclick="window.editProjectStartingPoint('${encoded(project.id)}')">Manage Trail Entrance</button><button class="primary" type="submit">Save Visitor Welcome</button></div></form></div>`;
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
        const data = { type: 'intro_checkpoint', experience_role: 'trail-entrance', name: document.getElementById('visitorWelcomeHeading').value.trim(), description: document.getElementById('visitorWelcomeText').value.trim(), directions: document.getElementById('visitorWelcomeDirections').value.trim(), visibility };
        if (context.startingPoint) await updatePlaceMarker(projectId, site.id, place.id, context.startingPoint.marker.id, data);
        else await createPlaceMarker(projectId, site.id, place.id, data);
        await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (failure) {
        if (error) error.textContent = `Save failed: ${failure.message}`;
    }
}

export async function renderNewLocationSetup(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project } = await projectContent(projectId);
        if (project.expertMode === true) return renderProjectDashboard(app, encoded(project.id));
        app.innerHTML = `<div class="screen setup-flow"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Save and exit</button><p class="welcome-label">Getting started</p><h1>Your space is ready</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><section class="panel guide"><h2>Begin with one Area</h2><p>An Area is a garden bed, orchard section, forest zone or any meaningful part of the landscape you want to understand. A Home Base or visitor entrance can be added later only if it is useful.</p></section><div class="content-type-list"><button class="content-type-row primary" type="button" onclick="window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')"><strong>CREATE YOUR FIRST AREA</strong><span>Name the region, then place its Totem now or later.</span></button><button class="content-type-row" type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')"><strong>Open Dashboard</strong><span>Continue from the simple project checklist.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAddToLocation(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    const action = (label, description, onclick) => `<button class="content-type-row" type="button" onclick="${onclick}"><strong>${label}</strong><span>${description}</span></button>`;
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderUnplacedContent('${encoded(project.id)}')">Back to Unassigned Folder</button><h1>Add to Unassigned Folder</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel"><p>Save information here only when you want to organise it or assign its physical position later.</p></div><div class="content-type-list">${action('Plant', 'Save a Plant now and position it later.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`)}${action('Note', 'Record an observation and position it later.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'note', 'without-ar', true)`)}</div></div>`;
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
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Add ${labels[type] || 'Content'}</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${unplacedGuidance}<div class="content-type-list"><button class="content-type-row" type="button" onclick="window.openCreatorArMode('${encoded(project.id)}')"><strong>Place in AR</strong><span>Open AR now. Choose an Area in the content form, and add a checkpoint later when needed.</span></button><button class="content-type-row" type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${markerType}', 'without-ar')"><strong>Add without AR</strong><span>Create it now and position it in AR later.</span></button></div></div>`;
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
        const returnAction = intent === 'checkpoint-quick'
            ? `window.openCheckpointQuickSetup('${encoded(project.id)}')`
            : intent === 'field-guide'
                ? `window.renderFieldGuide('${encoded(project.id)}', true)`
            : `window.renderProjectDashboard('${encoded(project.id)}')`;
        const nextAreaNumber = places.filter(place => place.name !== 'Unassigned').length + 1;
        const expertAreaFields = project.expertMode === true ? `<details class="area-advanced-fields"><summary>Optional Area details</summary><div class="field"><label for="projectAreaType">Area type</label><select id="projectAreaType"><option value="Outdoor Area">Outdoor Area</option><option value="Indoor Area">Indoor Area</option><option value="Bed or Plot">Bed or Plot</option><option value="Room">Room</option><option value="Enclosure">Enclosure</option><option value="Path or Route">Path or Route</option><option value="Other">Other</option></select></div><div class="field"><label for="projectAreaDescription">Short description</label><textarea id="projectAreaDescription" rows="3" placeholder="What belongs in this Area?"></textarea></div></details>` : '';
        app.innerHTML = `<div class="screen area-form-screen"><div class="page-header"><button class="ghost" onclick="${returnAction}">Back</button><p class="welcome-label">${firstArea ? 'First Area' : 'Areas'}</p><h1>${firstArea ? 'Create your first Area' : 'Create an Area'}</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${guidance}<form class="panel simple-area-form" onsubmit="window.saveProjectArea(event, '${encoded(project.id)}', '${encoded(intent)}')"><div class="field"><label for="projectAreaName">Name your Area</label><input id="projectAreaName" value="Area ${nextAreaNumber}" placeholder="Area ${nextAreaNumber}" required /></div><p class="area-name-examples">Examples: Orchard · Vegetable Garden · Creek Bank · Front Bed</p>${expertAreaFields}<p id="projectAreaError" class="meta"></p><div class="area-create-actions"><button type="button" onclick="${returnAction}">Cancel</button><button type="submit" data-area-next="later"><strong>Create now, place later</strong><span>Save the Area without opening the camera.</span></button><button class="primary" type="submit" data-area-next="place"><strong>Place its Totem in AR</strong><span>Create the Area, then raise its Totem on site.</span></button></div></form></div>`;
        if (areaStage === 'new') recordTutorialEvent(project.id, 'area_explained');
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Area setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function continueAfterAreaCreation(app, projectId, areaId, intent = 'dashboard') {
    if (intent === 'checkpoint-quick') return renderAreaCheckpointForm(app, encoded(projectId), encoded(areaId), 'quick');
    if (intent === 'tutorial-totem') return renderAreaCheckpointForm(app, encoded(projectId), encoded(areaId), 'tutorial');
    if (intent === 'home-base') return renderHomeBaseForm(app, encoded(projectId));
    if (['starting-point', 'trail-entrance'].includes(intent)) return renderStartingPointForm(app, encoded(projectId), encoded(areaId), 'trail-entrance');
    if (intent.startsWith('quick:')) {
        const [, type = 'plant', placementMode = 'without-ar'] = intent.split(':');
        return window.renderLocationFieldMarker(encoded(projectId), type, placementMode, false, encoded(areaId));
    }
    return renderProjectAreaDashboard(app, encoded(projectId), encoded(areaId));
}

export function resumeAreaCreationFlow(app, encodedProjectId, encodedAreaId, encodedIntent = 'dashboard') {
    return continueAfterAreaCreation(
        app,
        decodeURIComponent(encodedProjectId),
        decodeURIComponent(encodedAreaId),
        decodeURIComponent(encodedIntent || 'dashboard')
    );
}

export async function saveProjectArea(event, encodedProjectId, _encodedIntent = 'dashboard') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const intent = decodeURIComponent(_encodedIntent || 'dashboard');
    const error = document.getElementById('projectAreaError');
    try {
        const before = await projectContent(projectId);
        const site = before.site || await ensureProjectLocation(projectId);
        const area = await createAreaRecord(projectId, site.id, {
            name: document.getElementById('projectAreaName').value.trim(),
            type: document.getElementById('projectAreaType')?.value || 'Outdoor Area',
            description: document.getElementById('projectAreaDescription')?.value.trim() || '',
            visibility: 'draft'
        });
        recordTutorialEvent(projectId, 'first_area_created_or_selected');
        const target = document.getElementById('app');
        if (event.submitter?.dataset.areaNext === 'place') {
            const started = await window.startArMode(projectId, area.id, '', 'area_checkpoint', '', intent);
            if (started) return;
        }
        return continueAfterAreaCreation(target, projectId, area.id, intent);
    } catch (failure) {
        if (error) error.textContent = `Area could not be saved: ${failure.message}`;
    }
}

export async function openProjectAreaAr(app, encodedProjectId, encodedAreaId, encodedCheckpointId = '', encodedInitialPlacementType = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const checkpointId = decodeURIComponent(encodedCheckpointId || '');
    const initialPlacementType = decodeURIComponent(encodedInitialPlacementType || '');
    let started = false;
    try {
        started = await window.startArMode?.(projectId, areaId, checkpointId, initialPlacementType, '', 'dashboard');
    } catch (error) {
        console.error('[Area AR]', error);
    }
    if (started) return true;
    await renderProjectAreaDashboard(app, encoded(projectId), encoded(areaId));
    const status = document.getElementById('projectAreaArStatus');
    if (status) status.textContent = 'AR could not start. Check camera permission and WebXR support, then try again on site.';
    return false;
}

export async function renderProjectAreaDashboard(app, encodedProjectId, encodedAreaId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        recordTutorialEvent(projectId, 'first_area_created_or_selected');
        const placedAreaEntries = await entriesWithPlacement(context.project, context.site, context.areaEntries);
        const areaEntries = await Promise.all(placedAreaEntries.map(async entry => ({
            ...entry,
            plantProfile: effectiveMarkerType(entry.marker) === 'plant'
                ? await loadPlantProfile(context.project.id, context.site.id, context.area.id, entry.marker.id).catch(() => entry.marker.plant_profile || {})
                : {}
        })));
        const checkpoint = context.areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        const canonicalAreaEntries = areaEntries.filter(entry => !isAreaTotemMarker(entry.marker, context.area.name) || entry.marker.id === checkpoint?.marker.id);
        const orderedEntries = [...canonicalAreaEntries].sort((left, right) => {
            const leftTotem = isAreaTotemMarker(left.marker, context.area.name) ? 0 : 1;
            const rightTotem = isAreaTotemMarker(right.marker, context.area.name) ? 0 : 1;
            return leftTotem - rightTotem;
        });
        const rows = orderedEntries.map(({ marker, isPlaced, plantProfile }) => {
            const markerType = isAreaTotemMarker(marker, context.area.name) ? 'area_checkpoint' : effectiveMarkerType(marker);
            const status = entryStatus(marker);
            const placementLabel = isPlaced ? 'Placed' : 'Not yet placed';
            const webAction = markerType === 'area_checkpoint'
                ? `window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')`
                : markerType === 'intro_checkpoint'
                    ? `window.openProjectStartingPoint('${encoded(context.project.id)}', '${encoded(context.area.id)}')`
                    : `window.openProjectEntry('${encoded(context.project.id)}', '${encoded(marker.id)}', '${encoded(context.area.id)}')`;
            const profileArAction = markerType === 'plant' && isPlantProfileUpgraded(marker, plantProfile)
                ? `<button class="spatial-focus-button compact-ar-action" type="button" onclick="event.stopPropagation();window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '', '', '${encoded(marker.id)}', 'web-marker:${encoded(marker.id)}', '${encoded(context.site.id)}')">View / edit in AR</button>`
                : '';
            const totemArAction = markerType === 'area_checkpoint'
                ? `<button class="spatial-focus-button compact-ar-action" type="button" onclick="event.stopPropagation();window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '', '${isPlaced ? '' : 'area_checkpoint'}', '${encoded(marker.id)}', 'web-totem:${encoded(context.area.id)}', '${encoded(context.site.id)}')">${isPlaced ? 'View in AR' : 'Place in AR'}</button>`
                : '';
            return `<article class="area-content-entry area-content-card${markerType === 'area_checkpoint' ? ' is-totem-entry' : ''}" role="button" tabindex="0" onclick="${webAction}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${webAction}}">
                <span class="latest-entry-icon" aria-hidden="true">${markerIcon(markerType)}</span>
                <span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(markerType)} · ${editedLabel(marker.modified || marker.created)}</span><span class="placement-status ${markerType === 'area_checkpoint' || isPlaced ? 'is-placed' : 'is-unplaced'}">${placementLabel}</span></span>
                <span class="entry-status entry-status-${status.tone}">${status.label}</span>
                <span class="area-entry-actions">${totemArAction}${profileArAction}</span>
            </article>`;
        }).join('');
        const unplacedTotemRow = checkpoint ? '' : `<article class="area-content-entry area-content-card is-totem-entry" role="button" tabindex="0" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><span class="latest-entry-icon" aria-hidden="true">${markerIcon('area_checkpoint')}</span><span class="latest-entry-copy"><strong>${escapeHtml(context.area.name)} Totem</strong><span>Area Totem · Not yet placed</span></span><span class="area-entry-actions"><button class="spatial-focus-button compact-ar-action" type="button" onclick="event.stopPropagation();window.openProjectAreaAr('${encoded(context.project.id)}', '${encoded(context.area.id)}', '', 'area_checkpoint')">Place in AR</button></span></article>`;
        const anchor = hasGpsCoordinates(context.area.anchor) ? context.area.anchor : null;
        const advancedAreaActions = context.project.expertMode === true ? `<div class="area-dashboard-actions">
                <button class="primary" type="button" onclick="window.navigateToProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>Navigate to it in AR</strong><span>${anchor ? 'Open AR navigation to this Area.' : 'Assign a GPS location first, then open AR navigation.'}</span></button>
                <button type="button" onclick="window.renderProjectAreaLocationForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>${anchor ? 'Update GPS location' : 'Assign GPS location'}</strong><span>Tag the physical position of this Area.</span></button>
            </div>` : '';
        const plantCount = canonicalAreaEntries.filter(entry => entry.marker.type === 'plant').length;
        const totemCount = checkpoint ? 1 : 0;
        const linkedTotems = (Array.isArray(context.area.totem_links) ? context.area.totem_links : []).map(link => ({ ...link, area: context.places.find(place => place.id === link.target_area_id) })).filter(link => link.area);
        app.innerHTML = `<div class="screen area-dashboard database-record-page">
            <header class="page-header area-dashboard-header">
                <p class="welcome-label">Area dashboard</p>
                <h1>${escapeHtml(context.area.name)}</h1>
                <p class="subtitle">${escapeHtml(context.area.type || 'Area')} · ${escapeHtml(context.project.name)}</p>
                <div class="area-top-actions"><button class="area-go-ar-compact" type="button" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '${encoded(checkpoint?.marker.id || '')}', '', '', 'dashboard', '${encoded(context.site.id)}')">GO TO AREA · AR</button><span>${plantCount} Plants · ${totemCount} Totem${totemCount === 1 ? '' : 's'}</span></div>
            </header>
            <section class="area-profile-summary area-encyclopedia-card">
                <div class="area-profile-hero">
                    <div class="area-profile-visual" aria-hidden="true"><span>▧</span><small>AREA</small></div>
                    <div class="area-vital-grid">
                        <div><small>TYPE</small><strong>${escapeHtml(context.area.type || 'Area')}</strong></div>
                        <div><small>PLANTS</small><strong>${plantCount}</strong></div>
                        <div><small>TOTEMS</small><strong>${totemCount}</strong></div>
                        <div><small>LOCATION</small><strong>${anchor ? 'GPS assigned' : 'Spatial Area'}</strong></div>
                    </div>
                </div>
                <form class="area-information-form is-reading" onsubmit="window.saveAreaInformation(event, '${encoded(context.project.id)}', '${encoded(context.area.id)}')">
                    <div class="area-overview-card"><div class="area-overview-heading"><strong><span aria-hidden="true">✦</span> About this Area</strong><button type="button" data-edit-area-description>${context.area.description ? 'Edit' : 'Add description'}</button></div><p data-area-description-reading>${escapeHtml(context.area.description || 'No description has been added yet.')}</p><label for="areaDescription" hidden>Description</label><textarea id="areaDescription" rows="3" hidden>${escapeHtml(context.area.description || '')}</textarea></div>
                    <p id="areaInformationStatus" class="meta" aria-live="polite"></p>
                    <button type="submit" data-save-area-description hidden>Save description</button>
                </form>
                <section class="area-precise-location"><div><strong>Precise location</strong><small>Coming soon</small></div><p>GPS position, walked boundaries and real-world Area measurements will live here.</p></section>
                ${linkedTotems.length ? `<div class="area-totem-links"><strong>Linked Totems</strong>${linkedTotems.map(link => `<span>${escapeHtml(context.area.name)} → ${escapeHtml(link.area.name)}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}</span>`).join('')}</div>` : ''}
            </section>
            <p id="projectAreaArStatus" class="meta" aria-live="polite"></p>
            ${advancedAreaActions}
            <section class="latest-entries-section area-content-section">
                <div class="section-heading-row"><div><h2>Content in this Area</h2><p>${areaEntries.length} existing element${areaEntries.length === 1 ? '' : 's'}</p></div></div>
                <div class="area-content-grid">${unplacedTotemRow}${rows}</div>
            </section>
            <nav class="bottom-navigation"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Return to Dashboard</button></nav>
            <section class="area-danger-zone" aria-labelledby="deleteAreaTitle">
                <h2 id="deleteAreaTitle">Delete Area</h2>
                <p>Deleting this Area also deletes its content, Totem and any Trail Entrance stored inside it.</p>
                <button class="danger" type="button" onclick="window.deleteProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Delete Area</button>
                <p id="deleteProjectAreaStatus" class="meta"></p>
            </section>
        </div>`;
        app.querySelector('[data-edit-area-description]')?.addEventListener('click', () => {
            app.querySelector('[data-area-description-reading]')?.setAttribute('hidden', '');
            const textarea = document.getElementById('areaDescription');
            textarea?.removeAttribute('hidden');
            app.querySelector('label[for="areaDescription"]')?.removeAttribute('hidden');
            app.querySelector('[data-save-area-description]')?.removeAttribute('hidden');
            textarea?.focus();
        });
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Return to Dashboard</button><h1>Area unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveAreaInformation(event, encodedProjectId, encodedAreaId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const status = document.getElementById('areaInformationStatus');
    try {
        const context = await projectAreaContext(projectId, areaId);
        const description = document.getElementById('areaDescription').value.trim();
        if (status) status.textContent = 'Saving Area information…';
        await updateSitePlace(projectId, context.site.id, areaId, {
            description
        });
        await renderProjectAreaDashboard(document.getElementById('app'), encoded(projectId), encoded(areaId));
    } catch (error) {
        if (status) status.textContent = `Area information could not be saved: ${error.message}`;
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
        if (context.project.homeBaseAreaId === areaId) {
            await renameProjectOnDisk(context.project.id, { ...context.project, preserveId: true, name: context.project.name, homeBaseAreaId: '', homeBaseName: '', homeBaseWelcome: '' });
        }
        await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (error) {
        if (status) status.textContent = `Area could not be deleted: ${error.message}`;
    }
}

export async function renderAreaRequired(app, encodedProjectId, type = 'plant', placementMode = 'without-ar', purpose = 'content') {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const entrance = purpose === 'starting-point' || purpose === 'trail-entrance';
    const intent = entrance ? 'trail-entrance' : purpose === 'home-base' ? 'home-base' : `quick:${type}:${placementMode}`;
    app.innerHTML = `<div class="screen area-required-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">One foundation step</p><h1>Create an Area</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel guide"><h2>Everything grows from Areas</h2><p>${entrance ? 'A Trail Entrance belongs to the Area where a guided journey begins.' : purpose === 'home-base' ? 'A Home Base is simply a reference to your main Area.' : `Every ${type === 'note' ? 'Note' : 'Plant'} belongs to an Area, even when its physical AR position is not known yet.`}</p></div><div class="button-row">${entrance || purpose === 'home-base' ? '' : `<button type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${type}', '${placementMode}', true)">Continue as Unassigned</button>`}<button class="primary" type="button" onclick="window.renderProjectAreaForm('${encoded(project.id)}', '${encoded(intent)}')">Create Area</button></div></div>`;
}

export async function renderUnplacedContent(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, entries } = await projectContent(projectId);
        const placementEntries = await entriesWithPlacement(project, site, entries);
        const unplaced = placementEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && !entry.isPlaced);
        const rows = unplaced.map(({ marker, place }) => {
            const markerType = effectiveMarkerType(marker);
            return `<div class="latest-entry-row unplaced-content-row"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(markerType)}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(markerType)} · Area: ${escapeHtml(place.name || 'Unassigned')}</span><span class="placement-status is-unplaced">Not yet placed</span></span><button type="button" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(marker.id)}', '${encoded(place.id)}', '${encoded(site?.id || '')}')">Place in AR</button></div>`;
        }).join('');
        app.innerHTML = `<div class="screen unplaced-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderFieldGuide('${encoded(project.id)}', true)">Back to Field Guide</button><h1>Unassigned Folder</h1><p class="subtitle">${unplaced.length} item${unplaced.length === 1 ? '' : 's'} awaiting organisation or placement.</p></div><div class="panel"><p>This is a secondary workspace for information that still needs an Area or physical position.</p><button type="button" onclick="window.renderAddToLocation('${encoded(project.id)}')">Add item to folder</button></div><div class="latest-entry-list">${rows || '<p class="project-empty-state">The folder is empty.</p>'}</div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Unplaced Content unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderStoriesAndFocus(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Stories &amp; Checkpoints</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><nav class="content-mode-tool-grid" aria-label="Stories and checkpoints tools"><button type="button" onclick="window.renderStartingPoints('${encoded(project.id)}')"><strong>Home &amp; Entrances</strong><span>Manage the project Home Base and visitor Trail Entrance.</span></button><button type="button" onclick="window.renderUnplacedContent('${encoded(project.id)}')"><strong>Organizer Folder</strong><span>Review Plants, Notes and Markers waiting for an Area or physical position.</span></button></nav><div class="panel guide"><h2>Story tools are growing</h2><p>Guided narratives, focused moments and richer Area stories are planned for V2. Existing checkpoints remain available now.</p></div></div>`;
}

export async function renderProjectSettings(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const theme = PROJECT_THEMES.has(project.theme) ? project.theme : 'forest-light';
    const expertMode = project.expertMode === true;
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
        <section class="panel project-name-setting" aria-labelledby="projectNameTitle">
            <div class="section-heading-row"><div><h2 id="projectNameTitle">Project Details</h2><p>Update the project name, description and cover image without changing its saved ID, Areas or content.</p></div></div>
            <form onsubmit="window.saveProjectName(event, '${encoded(project.id)}')">
                <div class="field"><label for="projectSettingsName">Project name</label><input id="projectSettingsName" value="${escapeHtml(project.name)}" required /></div>
                <div class="field"><label for="projectSettingsDescription">Description (optional)</label><textarea id="projectSettingsDescription" rows="4" placeholder="Describe this garden, landscape or learning location.">${escapeHtml(project.description || '')}</textarea></div>
                <div class="field"><label for="projectSettingsCoverImage">Cover image (optional)</label><input id="projectSettingsCoverImage" type="url" value="${escapeHtml(project.coverImage || '')}" placeholder="https://…" /></div>
                <div class="button-row"><button class="primary" type="submit">Save Project Details</button></div>
                <p id="projectNameStatus" class="meta"></p>
            </form>
        </section>
        <section class="panel project-publishing-setting" aria-labelledby="projectPublishingTitle">
            <div class="section-heading-row"><div><h2 id="projectPublishingTitle">Explorer status</h2><p>Choose how this project appears to visitors in Explorer.</p></div></div>
            <form onsubmit="window.saveProjectPublishing(event, '${encoded(project.id)}')">
                <div class="field"><label for="projectSettingsStatus">Status</label><select id="projectSettingsStatus">
                    <option value="hidden" ${project.projectStatus === 'hidden' ? 'selected' : ''}>Hidden from Explorer</option>
                    <option value="under_construction" ${(project.projectStatus || 'under_construction') === 'under_construction' ? 'selected' : ''}>Under construction</option>
                    <option value="demo" ${project.projectStatus === 'demo' ? 'selected' : ''}>Demo</option>
                    <option value="ready" ${project.projectStatus === 'ready' ? 'selected' : ''}>Ready</option>
                </select></div>
                <div class="field"><label for="projectSettingsAddress">Real location (address)</label><input id="projectSettingsAddress" value="${escapeHtml(project.address || '')}" placeholder="Town, region or full visitor address" /></div>
                <div class="field"><label for="projectSettingsCreator">Creator username</label><input id="projectSettingsCreator" value="${escapeHtml(project.creatorUsername || 'Nourishland creator')}" /></div>
                <p class="meta">Hidden projects stay private. Under Construction projects show welcome information but cannot be entered. Demo and Ready projects can be explored.</p>
                <div class="button-row"><button class="primary" type="submit">Save Explorer Status</button></div>
                <p id="projectPublishingStatus" class="meta"></p>
            </form>
        </section>
        <section class="panel expert-mode-setting" aria-labelledby="expertModeTitle">
            <div class="section-heading-row"><div><h2 id="expertModeTitle">Experience level</h2><p>Keep the everyday experience calm, or reveal advanced controls when you need them.</p></div><span class="tutorial-status">${expertMode ? 'Expert' : 'Friendly'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Show advanced controls</strong><small>Show themes, technical guidance, diagnostics and other precision tools.</small></span><input type="checkbox" ${expertMode ? 'checked' : ''} onchange="window.updateProjectExpertMode('${encoded(project.id)}', this.checked)" /></label>
        </section>
        <section class="panel project-theme-setting" aria-labelledby="projectThemeTitle" ${expertMode ? '' : 'hidden'}>
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
            <button class="content-type-row" type="button" onclick="window.renderStartingPoints('${encoded(project.id)}')"><strong>Manage Home &amp; Entrances</strong><span>Choose an optional Home Base or create a Trail Entrance for guided visitors.</span></button>
        </div>
        <section class="panel tutorial-settings" aria-labelledby="tutorialSettingsTitle" ${expertMode ? '' : 'hidden'}>
            <div class="section-heading-row"><div><h2 id="tutorialSettingsTitle">Tutorial &amp; Guidance</h2><p>First-use explanations become shorter after successful actions.</p></div><span class="tutorial-status">${tutorialEnabled ? 'On' : 'Off'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Tutorial Mode</strong><small>Show contextual guidance beside the feature being learned.</small></span><input type="checkbox" ${tutorialEnabled ? 'checked' : ''} onchange="window.setProjectTutorialMode('${encoded(project.id)}', this.checked)" /></label>
            <div class="tutorial-settings-actions">
                <button type="button" onclick="window.restartProjectTutorial('${encoded(project.id)}')">Restart Tutorial for This Project</button>
                <button type="button" onclick="window.resetLearningTips('${encoded(project.id)}')">Reset Learning Tips</button>
            </div>
            <p class="meta">These actions reset guidance only. Plants, Areas, Notes, checkpoints and AR positions are never changed.</p>
        </section>
        <section class="panel tutorial-settings" aria-labelledby="arTutorialSettingsTitle" ${expertMode ? '' : 'hidden'}>
            <div class="section-heading-row"><div><h2 id="arTutorialSettingsTitle">AR Tutorial &amp; Hints</h2><p>Control the compact guidance shown inside Creator AR Mode.</p></div><span class="tutorial-status">${arTutorialLabel}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Show AR Hints</strong><small>Show short surface-detection and placement reminders when they are useful.</small></span><input type="checkbox" ${arTutorial.showHints === false ? '' : 'checked'} onchange="window.setArHints('${encoded(project.id)}', this.checked)" /></label>
            <div class="tutorial-settings-actions">
                <button type="button" onclick="window.replayArTutorial('${encoded(project.id)}')">Replay AR Tutorial</button>
                <button type="button" onclick="window.resetArLearningTips('${encoded(project.id)}')">Reset AR Learning Tips</button>
            </div>
            <p class="meta">The tutorial appears once for an experienced creator, can be skipped, and can always be replayed here. Resetting it never changes project content or AR positions.</p>
        </section>
        <section class="panel tutorial-settings" aria-labelledby="developerDiagnosticsTitle" ${expertMode ? '' : 'hidden'}>
            <div class="section-heading-row"><div><h2 id="developerDiagnosticsTitle">Developer Diagnostics</h2><p>Keep technical AR launch details hidden during normal use.</p></div><span class="tutorial-status">${settings.developerDiagnostics ? 'Debug on' : 'Debug off'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>AR debug logging</strong><small>Write AR launch stages to the browser console for technical testing.</small></span><input type="checkbox" ${settings.developerDiagnostics ? 'checked' : ''} onchange="window.savePlatformSetting('developerDiagnostics', this.checked)" /></label>
            <div class="tutorial-settings-actions"><button type="button" onclick="window.copyArDiagnostics()">Copy Diagnostics</button></div>
            <p id="developerDiagnosticsStatus" class="meta">Diagnostics remain hidden from the camera view.</p>
        </section>
        <section class="panel project-backup-setting" aria-labelledby="backupProjectTitle" ${expertMode ? '' : 'hidden'}>
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

export async function saveProjectName(app, event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const status = document.getElementById('projectNameStatus');
    const name = document.getElementById('projectSettingsName')?.value.trim() || '';
    const description = document.getElementById('projectSettingsDescription')?.value.trim() || '';
    const coverImage = document.getElementById('projectSettingsCoverImage')?.value.trim() || '';
    if (!name) {
        if (status) status.textContent = 'Project name is required.';
        return;
    }
    try {
        if (status) status.textContent = 'Saving project details...';
        const project = await projectById(projectId);
        const savedProject = await renameProjectOnDisk(projectId, { ...project, preserveId: true, name, description, coverImage });
        const subtitle = document.querySelector('.project-settings-screen .page-header .subtitle');
        if (subtitle) subtitle.textContent = `${savedProject.name} · Project-wide configuration`;
        if (status) status.textContent = 'Project details saved.';
    } catch (error) {
        if (status) status.textContent = `Project details could not be saved: ${error.message}`;
    }
}

export async function updateProjectExpertMode(app, encodedProjectId, enabled) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    await renameProjectOnDisk(projectId, { ...project, preserveId: true, name: project.name, expertMode: Boolean(enabled) });
    setProjectTutorialMode(projectId, !enabled);
    await renderProjectSettings(app, encoded(projectId));
}

export async function saveProjectPublishing(app, event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const status = document.getElementById('projectPublishingStatus');
    const projectStatus = document.getElementById('projectSettingsStatus')?.value || 'under_construction';
    const address = document.getElementById('projectSettingsAddress')?.value.trim() || '';
    const creatorUsername = document.getElementById('projectSettingsCreator')?.value.trim() || 'Nourishland creator';
    try {
        if (status) status.textContent = 'Saving Explorer status…';
        const project = await projectById(projectId);
        await renameProjectOnDisk(projectId, {
            ...project,
            preserveId: true,
            name: project.name,
            projectStatus,
            address,
            creatorUsername,
            dateStarted: project.dateStarted || new Date().toISOString(),
            visibility: ['hidden', 'under_construction'].includes(projectStatus) ? 'draft' : 'public'
        });
        if (status) status.textContent = 'Explorer status saved.';
    } catch (error) {
        if (status) status.textContent = `Explorer status could not be saved: ${error.message}`;
    }
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
    const rows = visibleEntries.filter(entry => ['note', 'intro_checkpoint', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker))).map(({ marker }) => creator
        ? `<button class="latest-entry-row" type="button" onclick="window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(effectiveMarkerType(marker))}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(effectiveMarkerType(marker))}</span></span></button>`
        : `<article class="latest-entry-row visitor-content-row"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(effectiveMarkerType(marker))}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(effectiveMarkerType(marker))}</span><span>${escapeHtml(marker.description || marker.notes || '')}</span></span></article>`
    ).join('');
    const back = creator ? `window.renderProjectDashboard('${encoded(project.id)}')` : `window.renderVisitorLocationIntro('${encoded(project.id)}')`;
    app.innerHTML = `<div class="screen browse-content-screen"><div class="page-header"><button class="ghost" onclick="${back}">Back</button><h1>Browse Content</h1><p class="subtitle">Access the project’s plants, stories, checkpoints and maps without entering AR.</p></div><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderFieldGuide('${encoded(project.id)}', ${creator})"><strong>Field Guide</strong><span>Browse plants and visitor-visible information.</span></button><button class="content-type-row" type="button" onclick="window.renderLocationMap('${encoded(project.id)}', ${creator})"><strong>Map</strong><span>View content by location without using the camera.</span></button></div>${rows ? `<section class="latest-entries-section"><h2>Stories and checkpoints</h2><div class="latest-entry-list">${rows}</div></section>` : ''}</div>`;
}

export async function renderLocationMap(app, encodedProjectId, creator = true, returnContext = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries } = await projectContent(projectId);
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const visibleEntries = creator ? placedEntries : placedEntries.filter(entry => entry.marker.visibility === 'public');
        const areas = places.filter(place => place.name !== 'Unassigned');
        const visiblePlaces = creator ? areas : areas.filter(place => visibleEntries.some(entry => entry.place.id === place.id));
        const mapEntries = visibleEntries.filter(entry => visiblePlaces.some(place => place.id === entry.place.id));
        const projectIdentity = `${project.id} ${project.name}`.trim();
        const usesHillyardsPlan = project.id === 'Hillyards' || /test loaded data/i.test(projectIdentity);
        const siteMap = project.siteMap || {};
        const mapLayout = buildSiteMapLayout(visiblePlaces, mapEntries, usesHillyardsPlan, siteMap.areaPoints || {});
        const mapBackground = siteMap.image
            ? `<img src="${escapeHtml(siteMap.image)}" alt="${escapeHtml(project.name)} uploaded site plan" />`
            : usesHillyardsPlan
            ? '<img src="./assets/terrace-marking.png" alt="Terrace site plan showing paths and growing plots" />'
            : '<div class="site-map-generic-surface" aria-hidden="true"></div>';
        const mapEditor = creator ? `<section class="panel site-map-editor"><div><h2>Map photo and Area links</h2><p>Upload a plan or aerial photo, then choose an Area and tap its position on the image.</p></div><label class="site-map-upload">Upload map photo<input type="file" accept="image/*" onchange="window.uploadSiteMapPhoto(event, '${encoded(project.id)}')" /></label>${siteMap.image ? `<button type="button" onclick="window.removeSiteMapPhoto('${encoded(project.id)}')">Remove uploaded photo</button>` : ''}<div class="site-map-link-tools">${visiblePlaces.map(place => `<button type="button" onclick="window.beginSiteMapAreaLink('${encoded(project.id)}', '${encoded(place.id)}', '${encoded(place.name)}')">Link ${escapeHtml(place.name)}</button>`).join('') || '<span>Create an Area before linking the map.</span>'}</div><p class="meta" data-site-map-editor-status>Select an Area, then tap the matching point on the map.</p></section>` : '';
        const areaOverlays = visiblePlaces.map(place => {
            const count = visibleEntries.filter(entry => entry.place.id === place.id).length;
            const point = mapLayout.areaPoints.get(place.id) || { x: 50, y: 50, positioned: false };
            const content = `<strong>${escapeHtml(place.name)}</strong><span>${count} item${count === 1 ? '' : 's'} · ${point.planLinked ? 'plan linked' : point.positioned ? 'GPS mapped' : 'map layout'}</span>`;
            return creator
                ? `<button class="site-map-area${point.planLinked ? ' is-plan-linked' : ''}" style="--map-x:${point.x}%;--map-y:${point.y}%" type="button" onclick="window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(place.id)}')" aria-label="Open ${escapeHtml(place.name)}">${content}</button>`
                : `<div class="site-map-area" style="--map-x:${point.x}%;--map-y:${point.y}%">${content}</div>`;
        }).join('');
        const markerPins = mapEntries.map(entry => {
            const point = mapLayout.markerPoints.get(mapEntryKey(entry));
            if (!point) return '';
            const label = `${entry.marker.name} · ${markerTypeLabel(entry.marker.type)}`;
            const pin = `<span class="sr-only">${escapeHtml(label)}</span>`;
            const pinClass = `site-map-pin site-map-pin-${escapeHtml(entry.marker.type)}`;
            return creator
                ? `<button class="${pinClass}" style="--map-x:${point.x}%;--map-y:${point.y}%" type="button" onclick="window.openProjectEntry('${encoded(project.id)}', '${encoded(entry.marker.id)}')" aria-label="Open ${escapeHtml(label)}">${pin}</button>`
                : `<span class="${pinClass}" style="--map-x:${point.x}%;--map-y:${point.y}%">${pin}</span>`;
        }).join('');
        const mapTotemLinks = visiblePlaces.flatMap(place => (Array.isArray(place.totem_links) ? place.totem_links : []).map(link => ({ from: place, to: visiblePlaces.find(candidate => candidate.id === link.target_area_id), ...link }))).filter(link => link.to);
        const mapTotemDiagram = mapTotemLinks.length ? `<section class="site-map-totem-links"><h2>Totem links</h2>${mapTotemLinks.map(link => `<span>${escapeHtml(link.from.name)} → ${escapeHtml(link.to.name)}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}</span>`).join('')}</section>` : '';
        const backAction = creator && returnContext === 'content-mode'
            ? `window.openCreatorContentMode('${encoded(project.id)}')`
            : creator && returnContext === 'field-guide'
                ? `window.renderFieldGuide('${encoded(project.id)}', true)`
            : creator
                ? `window.renderProjectDashboard('${encoded(project.id)}')`
                : `window.renderBrowseContent('${encoded(project.id)}', false)`;
        app.innerHTML = `<div class="screen location-map-screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>Site Map</h1><p class="subtitle">${escapeHtml(project.name)} · ${escapeHtml(site?.name || 'Location')}</p></div>${mapEditor}<section class="site-map-introduction"><div><p class="welcome-label">Landscape overview</p><h2>Areas, paths and placed content</h2><p>This map shows the site as a whole. GPS anchors appear in their real relative positions; content placed only in AR stays within its Area until GPS is added.</p></div><div class="site-map-legend" aria-label="Map legend"><span><i class="is-area"></i>Area</span><span><i class="is-plant"></i>Plant</span><span><i class="is-note"></i>Note / checkpoint</span></div></section><section class="site-map-canvas${usesHillyardsPlan ? ' has-terrace-plan' : ' has-generic-surface'}" data-site-map-canvas onclick="window.placeLinkedAreaOnSiteMap(event)" aria-label="${escapeHtml(project.name)} site map">${mapBackground}<div class="site-map-image-wash" aria-hidden="true"></div>${areaOverlays}${markerPins}<p class="site-map-scale-note">${mapLayout.hasMapBounds ? 'GPS positions are shown relative to one another.' : 'Map layout is temporary until Areas receive GPS positions.'}</p></section><section class="site-map-summary"><strong>${visiblePlaces.length} Area${visiblePlaces.length === 1 ? '' : 's'}</strong><span>${mapEntries.length} mapped item${mapEntries.length === 1 ? '' : 's'}</span><span>${mapLayout.hasMapBounds ? 'GPS relative layout' : 'Area layout mode'}</span></section>${mapTotemDiagram}${visiblePlaces.length ? '' : '<div class="panel"><p>No visible Areas have been added yet. Create an Area to begin your site map.</p></div>'}</div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Map unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

let pendingSiteMapAreaLink = null;

export function beginSiteMapAreaLink(encodedProjectId, encodedAreaId, encodedAreaName) {
    pendingSiteMapAreaLink = {
        projectId: decodeURIComponent(encodedProjectId),
        areaId: decodeURIComponent(encodedAreaId),
        areaName: decodeURIComponent(encodedAreaName)
    };
    document.querySelector('[data-site-map-canvas]')?.classList.add('is-linking-area');
    const status = document.querySelector('[data-site-map-editor-status]');
    if (status) status.textContent = `Tap the map where ${pendingSiteMapAreaLink.areaName} belongs.`;
}

export async function placeLinkedAreaOnSiteMap(event) {
    if (!pendingSiteMapAreaLink || event.target.closest('.site-map-area, .site-map-pin')) return;
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const point = {
        x: Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100)),
        y: Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100))
    };
    const link = pendingSiteMapAreaLink;
    pendingSiteMapAreaLink = null;
    canvas.classList.remove('is-linking-area');
    const project = await projectById(link.projectId);
    await renameProjectOnDisk(project.id, {
        ...project,
        preserveId: true,
        siteMap: {
            ...(project.siteMap || {}),
            areaPoints: { ...(project.siteMap?.areaPoints || {}), [link.areaId]: point }
        }
    });
    await renderLocationMap(document.getElementById('app'), encoded(project.id), true);
}

function compressedMapImage(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = () => reject(new Error('The selected image could not be opened.'));
        image.onload = () => {
            const maximum = 1600;
            const scale = Math.min(1, maximum / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(image.src);
            resolve(canvas.toDataURL('image/jpeg', .82));
        };
        image.src = URL.createObjectURL(file);
    });
}

export async function uploadSiteMapPhoto(event, encodedProjectId) {
    const file = event.target.files?.[0];
    if (!file) return;
    const status = document.querySelector('[data-site-map-editor-status]');
    if (status) status.textContent = 'Preparing the map photo…';
    try {
        const projectId = decodeURIComponent(encodedProjectId);
        const project = await projectById(projectId);
        const image = await compressedMapImage(file);
        await renameProjectOnDisk(project.id, { ...project, preserveId: true, siteMap: { ...(project.siteMap || {}), image } });
        await renderLocationMap(document.getElementById('app'), encoded(project.id), true);
    } catch (error) {
        if (status) status.textContent = `Map photo could not be saved: ${error.message}`;
    }
}

export async function removeSiteMapPhoto(encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    await renameProjectOnDisk(project.id, { ...project, preserveId: true, siteMap: { ...(project.siteMap || {}), image: '' } });
    await renderLocationMap(document.getElementById('app'), encoded(project.id), true);
}

export async function renderStartingPoints(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, places, entries } = await projectContent(projectId);
        const startingPoints = entries.filter(entry => entry.marker.type === 'intro_checkpoint');
        const homeArea = places.find(place => place.id === project.homeBaseAreaId);
        const homeRow = homeArea ? `<button class="latest-entry-row" type="button" onclick="window.renderHomeBaseForm('${encoded(project.id)}')"><span class="latest-entry-icon" aria-hidden="true">⌂</span><span class="latest-entry-copy"><strong>${escapeHtml(project.homeBaseName || 'Home Base')}</strong><span>Organisational home · ${escapeHtml(homeArea.name)}</span></span></button>` : '';
        const entranceRows = startingPoints.map(({ marker }) => `<button class="latest-entry-row" type="button" onclick="window.openProjectStartingPoint('${encoded(project.id)}')"><span class="latest-entry-icon" aria-hidden="true">⌖</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>Trail Entrance · ${escapeHtml(marker.visibility || 'draft')}</span></span></button>`).join('');
        app.innerHTML = `<div class="screen home-and-entrances"><div class="page-header"><button class="ghost" onclick="window.renderFieldGuide('${encoded(project.id)}', true)">Back to Field Guide</button><p class="welcome-label">Physical-world preparation</p><h1>Home &amp; Visitor Entrance</h1><p class="subtitle">Choose where the project begins and how visitors connect.</p></div><section class="panel guide"><h2>Two useful reference points</h2><p><strong>Home Base</strong> is your organisational return point. <strong>Visitor Entrance</strong> becomes a real-world gateway when it receives a GPS or QR anchor; publishing it then makes that entrance available through Explorer.</p></section><div class="latest-entry-list">${homeRow}${entranceRows}${!homeRow && !entranceRows ? '<p class="project-empty-state">No Home Base or Visitor Entrance has been added.</p>' : ''}</div><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderHomeBaseForm('${encoded(project.id)}')"><strong>${homeArea ? 'Edit Home Base' : 'Add a Home Base'}</strong><span>Choose the main Area for your everyday starting point.</span></button><button class="content-type-row" type="button" onclick="window.renderStartingPointForm('${encoded(project.id)}', '', 'trail-entrance')"><strong>${startingPoints.length ? 'Manage Visitor Entrance' : 'Create a Visitor Entrance'}</strong><span>Add GPS or a physical QR code to connect Explorer visitors to this place.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Home &amp; Entrances unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderHomeBaseForm(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, places } = await projectContent(projectId);
        const areas = places.filter(place => place.name !== 'Unassigned');
        if (!areas.length) return renderProjectAreaForm(app, encoded(project.id), 'home-base');
        app.innerHTML = `<div class="screen home-base-form"><div class="page-header"><button class="ghost" onclick="window.renderStartingPoints('${encoded(project.id)}')">Back</button><p class="welcome-label">Optional · Level 1</p><h1>Choose your Home Base</h1><p class="subtitle">No GPS or AR placement is needed.</p></div><section class="panel guide"><h2>Your everyday return point</h2><p>Choose the Area that feels like the centre of this project. It can open the map, welcome information and organised content without becoming a physical portal.</p></section><form class="panel" onsubmit="window.saveProjectHomeBase(event, '${encoded(project.id)}')"><div class="field"><label for="projectHomeBaseArea">Main Area</label><select id="projectHomeBaseArea" required><option value="">Choose an Area</option>${areas.map(area => `<option value="${escapeHtml(area.id)}" ${project.homeBaseAreaId === area.id ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('')}</select></div><div class="field"><label for="projectHomeBaseName">Home name (optional)</label><input id="projectHomeBaseName" value="${escapeHtml(project.homeBaseName || 'Home Base')}" /></div><div class="field"><label for="projectHomeBaseWelcome">A short welcome (optional)</label><textarea id="projectHomeBaseWelcome" rows="3" placeholder="What belongs here, or what should you remember when returning?">${escapeHtml(project.homeBaseWelcome || '')}</textarea></div><p id="projectHomeBaseStatus" class="meta"></p><div class="button-row">${project.homeBaseAreaId ? `<button type="button" onclick="window.clearProjectHomeBase('${encoded(project.id)}')">Remove Home Base</button>` : ''}<button class="primary" type="submit">Save Home Base</button></div></form></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Home Base unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function saveProjectHomeBase(event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const status = document.getElementById('projectHomeBaseStatus');
    try {
        const project = await projectById(projectId);
        const homeBaseAreaId = document.getElementById('projectHomeBaseArea').value;
        if (!homeBaseAreaId) throw new Error('Choose an Area for the Home Base.');
        if (status) status.textContent = 'Growing your Home Base…';
        await renameProjectOnDisk(project.id, {
            ...project,
            preserveId: true,
            name: project.name,
            homeBaseAreaId,
            homeBaseName: document.getElementById('projectHomeBaseName').value.trim() || 'Home Base',
            homeBaseWelcome: document.getElementById('projectHomeBaseWelcome').value.trim()
        });
        await renderProjectDashboard(document.getElementById('app'), encoded(project.id));
    } catch (error) {
        if (status) status.textContent = `Home Base could not be saved: ${error.message}`;
    }
}

export async function clearProjectHomeBase(encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    await renameProjectOnDisk(project.id, { ...project, preserveId: true, name: project.name, homeBaseAreaId: '', homeBaseName: '', homeBaseWelcome: '' });
    await renderProjectDashboard(document.getElementById('app'), encoded(project.id));
}

async function startingContext(projectId) {
    const context = await projectContent(projectId);
    if (!context.site) throw new Error('Create an Area before adding a Trail Entrance.');
    return context;
}

export async function renderStartingPointForm(app, encodedProjectId, encodedPreferredAreaId = '', flow = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const preferredAreaId = encodedPreferredAreaId ? decodeURIComponent(encodedPreferredAreaId) : '';
    try {
        const context = await projectContent(projectId);
        const areas = context.places.filter(place => place.name !== 'Unassigned');
        if (!areas.length) return renderProjectAreaForm(app, encoded(context.project.id), 'trail-entrance');
        const { project, site, startingPoint } = context;
        const marker = startingPoint?.marker || {};
        let anchor = {};
        if (startingPoint) {
            try { anchor = await loadMarkerAnchor(project.id, site.id, startingPoint.place.id, marker.id); }
            catch { anchor = {}; }
        }
        const startingStage = getTutorialStage(project.id, 'startingPoint');
        const startingGuidance = startingStage === 'new'
            ? '<div class="panel starting-point-explanation"><h2>A beginning for guided journeys</h2><p>A Trail Entrance is optional. Use it when visitors need a clear beginning to a walkthrough; give it a name and short welcome first, then place or anchor it later.</p></div>'
            : startingStage === 'learning'
                ? '<div class="panel contextual-reminder"><p><strong>Keep it simple:</strong> choose its Area, then add a name and short welcome.</p></div>'
                : '';
        const returnAction = flow === 'checkpoint-quick'
            ? `window.openCheckpointQuickSetup('${encoded(project.id)}')`
            : flow === 'field-guide'
                ? `window.renderFieldGuide('${encoded(project.id)}', true)`
            : `window.renderProjectDashboard('${encoded(project.id)}')`;
        const expertMode = project.expertMode === true;
        const areaField = startingPoint
            ? `<input id="projectStartingArea" type="hidden" value="${escapeHtml(startingPoint.place.id)}" /><p class="starting-point-home">Trail begins in ${escapeHtml(startingPoint.place.name)}</p>`
            : `<div class="field"><label for="projectStartingArea">Entrance Area</label><select id="projectStartingArea" required><option value="">Choose an Area</option>${areas.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.name)}</option>`).join('')}</select></div>`;
        const advancedFields = expertMode ? `<details class="starting-point-advanced"><summary>Advanced Trail Entrance options</summary><div class="field"><label for="projectStartingDirections">Arrival instructions</label><textarea id="projectStartingDirections" rows="3">${escapeHtml(marker.directions || '')}</textarea></div><div class="setup-choice-grid"><button type="button" onclick="window.captureStartingPointLocation()"><strong>Use current GPS</strong><span>Capture this phone’s position.</span></button><button type="button" onclick="window.focusStartingPointMapFields()"><strong>Enter coordinates</strong><span>Use a mapped position.</span></button></div><div class="coordinate-grid"><div class="field"><label for="projectStartingLatitude">Latitude</label><input id="projectStartingLatitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.latitude ?? '')}" /></div><div class="field"><label for="projectStartingLongitude">Longitude</label><input id="projectStartingLongitude" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.longitude ?? '')}" /></div></div><div class="coordinate-grid"><div class="field"><label for="projectStartingAccuracy">Accuracy (metres)</label><input id="projectStartingAccuracy" type="number" inputmode="decimal" step="any" value="${escapeHtml(anchor.accuracy ?? '')}" /></div><div class="field"><label for="projectStartingFacing">Visitor facing direction</label><input id="projectStartingFacing" value="${escapeHtml(marker.facing_direction || '')}" /></div></div><div class="field"><label for="projectStartingPhoto">Reference photo</label><input id="projectStartingPhoto" type="url" value="${escapeHtml(marker.reference_photo || '')}" /></div><div class="field"><label for="projectStartingVisibility">Visibility</label><select id="projectStartingVisibility"><option value="draft" ${marker.visibility !== 'public' && marker.visibility !== 'hidden' ? 'selected' : ''}>Draft</option><option value="public" ${marker.visibility === 'public' ? 'selected' : ''}>Public</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div></details>` : '';
        const spatialAction = startingPoint ? `<button type="button" onclick="window.startExistingMarkerPlacement('${encoded(project.id)}', '${encoded(site.id)}', '${encoded(startingPoint.place.id)}', '${encoded(marker.id)}', 'intro_checkpoint')">Place gateway in AR</button>` : '';
        app.innerHTML = `<div class="screen starting-point-form"><div class="page-header"><button class="ghost" onclick="${returnAction}">Back</button><p class="welcome-label">Optional · Guided journey</p><h1>Your Trail Entrance</h1><p class="subtitle">A clear beginning for visitors to ${escapeHtml(project.name)}.</p></div>${startingGuidance}<form class="panel simple-starting-point" onsubmit="window.saveProjectStartingPoint(event, '${encoded(project.id)}', '${encoded(flow || 'trail-entrance')}')">${areaField}<div class="field"><label for="projectStartingName">What should visitors call this entrance?</label><input id="projectStartingName" value="${escapeHtml(marker.name || 'Trail Entrance')}" required /></div><div class="field"><label for="projectStartingDescription">What should they know or feel when they arrive?</label><textarea id="projectStartingDescription" rows="4" placeholder="A short, warm welcome is enough.">${escapeHtml(marker.description || '')}</textarea></div><div class="field"><label for="projectStartingQr">Physical QR or location code <span class="meta">(optional)</span></label><input id="projectStartingQr" value="${escapeHtml(anchor.qr_code || marker.qr_reference || '')}" placeholder="Scan or enter the code installed at this entrance" /></div><p class="meta">A physical code lets a future visit lock this spatial entrance back onto the same real-world point.</p>${advancedFields}<p id="projectStartingLocationStatus" class="meta">${anchor.latitude && anchor.longitude ? 'Its precise position is saved.' : 'Spatial placement is optional and can happen later.'}</p><p id="projectStartingError" class="meta"></p><div class="button-row">${spatialAction}<button class="primary" type="submit">Save Trail Entrance</button></div></form></div>`;
        if (!startingPoint && preferredAreaId && areas.some(area => area.id === preferredAreaId)) {
            document.getElementById('projectStartingArea').value = preferredAreaId;
        }
        if (startingStage === 'new') recordTutorialEvent(project.id, 'starting_point_explained');
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Trail Entrance unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
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

export async function saveProjectStartingPoint(event, encodedProjectId, flow = '') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const nextFlow = decodeURIComponent(flow || '');
    const error = document.getElementById('projectStartingError');
    try {
        const context = await startingContext(projectId);
        const existingMarker = context.startingPoint?.marker || {};
        const visibility = document.getElementById('projectStartingVisibility')?.value || existingMarker.visibility || 'draft';
        const selectedAreaId = document.getElementById('projectStartingArea')?.value || '';
        const place = context.startingPoint?.place || context.places.find(area => area.id === selectedAreaId) || null;
        if (!place) throw new Error('Select an Area for the Trail Entrance.');
        const latitude = document.getElementById('projectStartingLatitude')?.value.trim() || '';
        const longitude = document.getElementById('projectStartingLongitude')?.value.trim() || '';
        const accuracy = document.getElementById('projectStartingAccuracy')?.value.trim() || '';
        const qrReference = document.getElementById('projectStartingQr')?.value.trim() || existingMarker.qr_reference || '';
        const hasCoordinates = latitude !== '' && longitude !== '' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
        const anchoredVisibility = (hasCoordinates || qrReference) && visibility !== 'hidden' ? 'public' : visibility;
        const data = { type: 'intro_checkpoint', experience_role: 'trail-entrance', name: document.getElementById('projectStartingName').value.trim(), description: document.getElementById('projectStartingDescription').value.trim(), directions: document.getElementById('projectStartingDirections')?.value.trim() || existingMarker.directions || '', reference_photo: document.getElementById('projectStartingPhoto')?.value.trim() || existingMarker.reference_photo || '', facing_direction: document.getElementById('projectStartingFacing')?.value.trim() || existingMarker.facing_direction || '', qr_reference: qrReference, visibility: anchoredVisibility };
        let savedMarker;
        if (context.startingPoint) savedMarker = await updatePlaceMarker(projectId, context.site.id, place.id, context.startingPoint.marker.id, data);
        else savedMarker = await createPlaceMarker(projectId, context.site.id, place.id, data);
        if (hasCoordinates || qrReference) await saveMarkerAnchor(projectId, context.site.id, place.id, savedMarker.id, { type: hasCoordinates ? 'gps' : 'qr', latitude: hasCoordinates ? Number(latitude) : '', longitude: hasCoordinates ? Number(longitude) : '', accuracy: accuracy === '' ? '' : Number(accuracy), qr_code: qrReference, description: data.directions });
        recordTutorialEvent(projectId, 'starting_point_configured');
        if (nextFlow === 'checkpoint-quick') await openCheckpointQuickSetup(document.getElementById('app'), encoded(projectId));
        else if (nextFlow === 'field-guide') await window.renderFieldGuide(encoded(projectId), true);
        else await renderProjectDashboard(document.getElementById('app'), encoded(projectId));
    } catch (failure) {
        error.textContent = `Save failed: ${failure.message}`;
    }
}

export async function openProjectStartingPoint(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const { project, startingPoint } = await projectContent(projectId);
    if (!startingPoint) return renderStartingPointForm(app, encoded(projectId));
    const marker = startingPoint.marker;
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>${escapeHtml(marker.name)}</h1><p class="subtitle">${escapeHtml(project.name)} Trail Entrance</p></div><div class="panel"><p>${escapeHtml(marker.description || 'Welcome information has not been added yet.')}</p><p class="meta">Visibility: ${escapeHtml(marker.visibility || 'draft')}</p></div><button class="menu-card" onclick="window.editProjectStartingPoint('${encoded(project.id)}')"><strong>Edit Trail Entrance</strong></button></div>`;
}

function plantProfileEditorMarkup(entry, profile) {
    const layerOptions = ['Emergent', 'Canopy', 'Understory', 'Shrub', 'Herbaceous', 'Groundcover', 'Root / rhizosphere', 'Climber / vine', 'Aquatic'].map(layer => `<option value="${layer}" ${profile.layer === layer ? 'selected' : ''}>${layer}</option>`).join('');
    const photo = profile.photo || profile.image || '';
    const orbColor = profile.orb_color || entry.marker.appearance?.color || '#8fc9a3';
    return `<section class="plant-encyclopedia-card">
        <input id="projectEntryProfileEnabled" type="hidden" value="true">
        <div class="plant-card-hero">
            <div class="plant-photo-space">${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(entry.marker.name)}" />` : '<span aria-hidden="true">🌿</span><small>Add a plant photo</small>'}</div>
            <div class="plant-vital-grid">
                <div class="field"><label for="projectEntryAreaOverview">Area</label><select id="projectEntryAreaOverview" onchange="document.getElementById('projectEntryArea').value=this.value"></select></div>
                <div class="field"><label for="projectEntryLayer">Forest layer</label><select id="projectEntryLayer"><option value="">Choose layer</option>${layerOptions}</select></div>
                <div class="field plant-color-field"><label for="projectEntryOrbColor">Orb color</label><input id="projectEntryOrbColor" type="color" value="${escapeHtml(orbColor)}" /></div>
                <div class="field"><label for="projectEntryOrbSize">Orb size</label><select id="projectEntryOrbSize"><option value="small" ${profile.orb_size === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${!profile.orb_size || profile.orb_size === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${profile.orb_size === 'large' ? 'selected' : ''}>Large</option></select></div>
            </div>
        </div>
        <div class="plant-overview-card"><label for="projectEntryOverview"><span aria-hidden="true">✦</span> Overview</label><textarea id="projectEntryOverview" rows="2" placeholder="A short, useful introduction—add it whenever you are ready.">${escapeHtml(profile.overview || entry.marker.description || '')}</textarea></div>
        <details class="plant-info-drawer"><summary><span aria-hidden="true">⌕</span><strong>Identity &amp; photo</strong><small>Name, scientific identity and image</small></summary><div class="plant-drawer-fields">
            <div class="field"><label for="projectEntryCommonName">Common name</label><input id="projectEntryCommonName" value="${escapeHtml(profile.common_name || entry.marker.name)}" oninput="document.getElementById('projectEntryName').value=this.value" /></div>
            <div class="field"><label for="projectEntryScientificName">Scientific name</label><input id="projectEntryScientificName" value="${escapeHtml(profile.scientific_name || '')}" /></div>
            <div class="field"><label for="projectEntryFamily">Family / genus</label><input id="projectEntryFamily" value="${escapeHtml(profile.family || '')}" /></div>
            <div class="field"><label for="projectEntryPhoto">Photo URL</label><input id="projectEntryPhoto" type="url" value="${escapeHtml(photo)}" placeholder="Optional" /></div>
        </div></details>
        <details class="plant-info-drawer"><summary><span aria-hidden="true">☀</span><strong>Growing knowledge</strong><small>Uses, relationships and propagation</small></summary><div class="plant-drawer-fields">
            <div class="field"><label for="projectEntryUses">Uses</label><textarea id="projectEntryUses" rows="2">${escapeHtml(profile.uses || '')}</textarea></div>
            <div class="field"><label for="projectEntryRelationships">Relationships</label><textarea id="projectEntryRelationships" rows="2">${escapeHtml(profile.relationships || profile.companions || '')}</textarea></div>
            <div class="field"><label for="projectEntryPropagation">Propagation / biology</label><textarea id="projectEntryPropagation" rows="2">${escapeHtml(profile.propagation || '')}</textarea></div>
        </div></details>
        <details class="plant-info-drawer"><summary><span aria-hidden="true">◌</span><strong>Origin &amp; story</strong><small>Optional history and context</small></summary><div class="plant-drawer-fields"><div class="field"><label for="projectEntryOrigin">Origin and history</label><textarea id="projectEntryOrigin" rows="2">${escapeHtml(profile.origin || '')}</textarea></div></div></details>
    </section>`;
}

export async function openProjectEntry(app, encodedProjectId, encodedMarkerId, returnToAr = false, returnContext = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const { project, site, places, entries } = await projectContent(projectId);
    const entry = entries.find(item => item.marker.id === markerId);
    if (!entry) throw new Error('Entry not found.');
    const [placement] = await entriesWithPlacement(project, site, [entry]);
    const plant = entry.marker.type === 'plant';
    const markerAnchor = plant ? await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id).catch(() => null) : null;
    const plantQrCode = plant ? visibleQrCode(entry.marker.qr_reference || markerAnchor?.qr_code) : '';
    const profile = plant ? await loadPlantProfile(project.id, site.id, entry.place.id, entry.marker.id).catch(() => entry.marker.plant_profile || {}) : {};
    const plantProfileReady = plant && isPlantProfileUpgraded(entry.marker, profile);
    const areaOptions = places.map(place => `<option value="${escapeHtml(place.id)}" ${place.id === entry.place.id ? 'selected' : ''}>${escapeHtml(place.name)}</option>`).join('');
    const returnArLabel = plant ? 'BACK TO AR · SAME PLANT' : 'BACK TO AR · SAME MARKER';
    const returnArCopy = plant
        ? 'Take your time with this Plant. Back to AR returns directly to the same Area with this orb open.'
        : 'Take your time with this information. Back to AR returns directly to the same Area and Marker.';
    const returnArAction = returnToAr ? `<button class="ar-portal" type="button" onclick="window.startArMode('${encoded(project.id)}', '${encoded(entry.place.id)}', '', '', '${encoded(entry.marker.id)}', 'web-marker:${encoded(entry.marker.id)}', '${encoded(site?.id || '')}')">${returnArLabel}</button>` : '';
    const arHandoff = returnToAr ? `<aside class="ar-web-handoff" aria-label="Return to augmented reality"><div><strong>WEB MODE</strong><p>${returnArCopy}</p></div>${returnArAction}</aside>` : '';
    const specialMarkerEditor = entry.marker.type === 'sub_checkpoint' ? `<div class="field"><label for="projectEntrySpecialSymbol">Marker symbol</label><select id="projectEntrySpecialSymbol"><option value="" ${entry.marker.special_symbol ? '' : 'selected'}>Standard checkpoint</option>${[['↑', 'Arrow up'], ['→', 'Arrow right'], ['↓', 'Arrow down'], ['←', 'Arrow left'], ['!', 'Exclamation point'], ['?', 'Question mark']].map(([symbol, label]) => `<option value="${symbol}" ${entry.marker.special_symbol === symbol ? 'selected' : ''}>${label}</option>`).join('')}</select></div>` : '';
    const noteColor = /^#[0-9a-f]{6}$/i.test(entry.marker.appearance?.color || '') ? entry.marker.appearance.color : '#d7834f';
    const noteAppearanceEditor = entry.marker.type === 'note' ? `<div class="field note-color-field"><label for="projectEntryNoteColor">Note board colour</label><input id="projectEntryNoteColor" type="color" value="${noteColor}" /><small>The board keeps the same clear spatial shape; colour distinguishes its purpose.</small></div>` : '';
    app.innerHTML = `<div class="screen project-entry-editor${entry.marker.type === 'note' ? ' note-record-editor' : ''}${returnToAr ? ' is-ar-web-handoff' : ''}"><div class="page-header"><p class="welcome-label">${markerTypeLabel(entry.marker.type)} · Web Mode</p><h1>${escapeHtml(entry.marker.name)}</h1><p class="subtitle">${escapeHtml(entry.place.name)} · ${placement.isPlaced ? 'Placed' : 'Not placed'}</p></div>${arHandoff}${plantProfileReady ? `<section class="spatial-focus-panel"><p>Open this Plant alone for focused viewing or placement. Add or change profile content in Web Mode.</p><button class="spatial-focus-button" type="button" onclick="window.startArMode('${encoded(project.id)}', '${encoded(entry.place.id)}', '', '', '${encoded(entry.marker.id)}', 'web-marker:${encoded(entry.marker.id)}', '${encoded(site?.id || '')}')">View / edit this Plant in AR</button></section>` : ''}<form class="panel" onsubmit="window.saveProjectEntryChanges(event, '${encoded(project.id)}', '${encoded(entry.marker.id)}', ${returnToAr})"><div class="field"><label for="projectEntryName">Rename</label><input id="projectEntryName" value="${escapeHtml(entry.marker.name)}" required /></div><div class="field"><label for="projectEntryArea">Move to Area</label><select id="projectEntryArea">${areaOptions}</select></div>${specialMarkerEditor}${noteAppearanceEditor}<div class="field"><label for="projectEntryDescription">${entry.marker.type === 'note' ? 'Note' : 'Description'}</label><textarea id="projectEntryDescription" rows="4">${escapeHtml(entry.marker.description || entry.marker.notes || '')}</textarea></div>${plant ? `${plantProfileEditorMarkup(entry, profile)}<section class="plant-qr-anchor-card"><span aria-hidden="true">▦</span><div><strong>PHYSICAL QR CODE</strong><p>Link this Plant to the QR label beside it. Its AR position remains attached.</p><label for="projectEntryQrCode">Plant QR code</label><input id="projectEntryQrCode" value="${escapeHtml(plantQrCode)}" placeholder="Scan or enter the code on this Plant label" /></div></section>` : ''}<p class="placement-status ${placement.isPlaced ? 'is-placed' : 'is-unplaced'}">Placement: ${placement.isPlaced ? 'Placed' : 'Not placed'}${plantQrCode ? ' · QR linked' : ''}</p><p id="projectEntryEditStatus" class="meta"></p><div class="button-row">${placement.isPlaced ? '' : `<button type="button" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(entry.marker.id)}', '${encoded(entry.place.id)}', '${encoded(site?.id || '')}')">Place in AR</button>`}<button class="primary" type="submit">Save changes</button><button class="danger" type="button" onclick="window.deleteProjectEntry('${encoded(project.id)}','${encoded(entry.marker.id)}')">Delete</button></div></form><nav class="bottom-navigation">${returnToAr ? '' : returnArAction}<button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">${returnToAr ? 'Stay in Web Mode · Project' : 'Return to Dashboard'}</button></nav></div>`;
    if (returnContext === 'field-guide') {
        const backButton = app.querySelector('.bottom-navigation .ghost');
        if (backButton) {
            backButton.textContent = 'Back to Field Guide';
            backButton.onclick = () => window.renderFieldGuide(encoded(project.id), true);
        }
    }
    if (plant) {
        app.querySelector('form')?.classList.add('plant-file-form');
        const headerLabel = app.querySelector('.page-header .welcome-label');
        const headerSubtitle = app.querySelector('.page-header .subtitle');
        if (headerLabel) headerLabel.textContent = 'PLANT · WEB MODE';
        if (headerSubtitle) headerSubtitle.textContent = `${entry.place.name} · ${placement.isPlaced ? 'PLACED' : 'NOT PLACED'} · ${entry.marker.plant_code || entry.marker.id}`;
        const spatialCopy = app.querySelector('.spatial-focus-panel p');
        const spatialButton = app.querySelector('.spatial-focus-panel button');
        if (spatialCopy) spatialCopy.textContent = 'Open this Plant in spatial view.';
        if (spatialButton) spatialButton.textContent = 'OPEN IN AR';
        const overviewArea = document.getElementById('projectEntryAreaOverview');
        if (overviewArea) {
            overviewArea.innerHTML = areaOptions;
            overviewArea.value = entry.place.id;
        }
    }
}

export async function saveProjectEntryChanges(event, encodedProjectId, encodedMarkerId, returnToAr = false) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const status = document.getElementById('projectEntryEditStatus');
    try {
        status.textContent = 'Saving…';
        const { project, site, entries } = await projectContent(projectId);
        const entry = entries.find(item => item.marker.id === markerId);
        if (!entry) throw new Error('Entry not found.');
        const name = document.getElementById('projectEntryName').value.trim();
        const description = document.getElementById('projectEntryDescription').value.trim();
        const targetAreaId = document.getElementById('projectEntryArea').value;
        const specialSymbol = document.getElementById('projectEntrySpecialSymbol')?.value;
        const noteColor = document.getElementById('projectEntryNoteColor')?.value;
        const noteAppearance = noteColor ? { appearance: { ...(entry.marker.appearance || {}), color: noteColor } } : {};
        const profileEnabled = entry.marker.type === 'plant' && document.getElementById('projectEntryProfileEnabled')?.value === 'true';
        const qrCode = profileEnabled ? document.getElementById('projectEntryQrCode')?.value.trim() || '' : '';
        const sourceAnchor = profileEnabled ? await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id).catch(() => null) : null;
        let savedMarker = entry.marker;
        if (targetAreaId !== entry.place.id) {
            const { created, modified, plant_profile_path, spatial_anchor, ...portableMarker } = entry.marker;
            const response = await createPlaceMarker(project.id, site.id, targetAreaId, {
                ...portableMarker,
                name,
                description,
                ...(profileEnabled ? { qr_reference: qrCode } : {}),
                ...(specialSymbol !== undefined ? { special_symbol: specialSymbol } : {}),
                ...noteAppearance,
                notes: entry.marker.type === 'note' ? description : entry.marker.notes || ''
            });
            savedMarker = response.marker || response;
            if (entry.marker.type === 'plant') {
                const existingProfile = await loadPlantProfile(project.id, site.id, entry.place.id, entry.marker.id).catch(() => entry.marker.plant_profile || {});
                if (isPlantProfileUpgraded(entry.marker, existingProfile)) {
                    await savePlantProfile(project.id, site.id, targetAreaId, savedMarker.id, existingProfile);
                }
            }
            await deletePlaceMarker(project.id, site.id, entry.place.id, entry.marker.id);
        } else {
            savedMarker = await updatePlaceMarker(project.id, site.id, entry.place.id, entry.marker.id, {
                ...entry.marker,
                name,
                description,
                ...(profileEnabled ? { qr_reference: qrCode } : {}),
                ...(specialSymbol !== undefined ? { special_symbol: specialSymbol } : {}),
                ...noteAppearance,
                notes: entry.marker.type === 'note' ? description : entry.marker.notes || ''
            });
        }
        savedMarker = savedMarker?.marker || savedMarker;
        if (profileEnabled) {
            const movableAnchor = targetAreaId !== entry.place.id && sourceAnchor
                ? { ...sourceAnchor, position: null, spatial_position: null }
                : undefined;
            await syncMarkerQrAnchor(project.id, site.id, targetAreaId, savedMarker.id, qrCode, `Physical QR label for ${name}.`, movableAnchor);
        }
        if (profileEnabled) {
            await savePlantProfile(project.id, site.id, targetAreaId, savedMarker.id, {
                ...(await loadPlantProfile(project.id, site.id, targetAreaId, savedMarker.id).catch(() => ({}))),
                profile_enabled: true,
                common_name: document.getElementById('projectEntryCommonName').value.trim() || name,
                scientific_name: document.getElementById('projectEntryScientificName').value.trim(),
                family: document.getElementById('projectEntryFamily').value.trim(),
                origin: document.getElementById('projectEntryOrigin').value.trim(),
                layer: document.getElementById('projectEntryLayer').value.trim(),
                photo: document.getElementById('projectEntryPhoto').value.trim(),
                orb_color: document.getElementById('projectEntryOrbColor').value,
                orb_size: document.getElementById('projectEntryOrbSize').value,
                uses: document.getElementById('projectEntryUses').value.trim(),
                relationships: document.getElementById('projectEntryRelationships').value.trim(),
                propagation: document.getElementById('projectEntryPropagation').value.trim(),
                overview: document.getElementById('projectEntryOverview').value.trim()
            });
        }
        await openProjectEntry(document.getElementById('app'), encoded(project.id), encoded(savedMarker.id), returnToAr);
    } catch (error) {
        if (status) status.textContent = `Could not save: ${error.message}`;
    }
}

export async function deleteProjectEntry(encodedProjectId, encodedMarkerId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const { project, site, entries } = await projectContent(projectId);
    const entry = entries.find(item => item.marker.id === markerId);
    if (!entry) throw new Error('Entry not found.');
    if (!window.confirm(`Delete “${entry.marker.name}”? This cannot be undone.`)) return;
    await deletePlaceMarker(project.id, site.id, entry.place.id, entry.marker.id);
    await renderProjectDashboard(document.getElementById('app'), encoded(project.id));
}
