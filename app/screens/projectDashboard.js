import { createPlaceMarker, createSitePlace, loadPlaceMarkers, loadPlantProfile, loadProjectSites, loadProjects, loadSitePlaces, updatePlaceMarker } from '../services/persistence.js';
import { languageOptionsMarkup, setNxrLanguage } from '../services/i18n.js';
import { renderProjectEntry } from '../components/projectEntry.js';
import { mountPlantInformationWeb } from '../components/plantInformationWeb.js';
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
import { AREA_ICON_OPTIONS, DEFAULT_HOME_AREA_NAME, areaIcon, isDefaultHomeArea } from '../services/arExperienceConfig.js';
import {
    DEFAULT_TOTEM_COLOR,
    TOTEM_HEIGHT_PRESETS,
    TOTEM_STYLES,
    TOTEM_TONES,
    normalizeTotemHeightPreset,
    normalizeTotemStyle,
    totemHeightPreset
} from '../services/totemAppearance.js';
import {
    PHYSICAL_ANCHOR_DEFAULTS,
    PHYSICAL_ANCHOR_IDS,
    normalizePhysicalAnchor,
    physicalAnchorAssignments,
    physicalMarkerLabel,
    physicalMarkerSvg
} from '../services/physicalAnchor.js';
import { startPhysicalAnchorScanner } from './physicalAnchorScanner.js';
import { PIGEON_PEA_EXAMPLE } from '../services/pigeonPeaExample.js';
import { PIGEON_PEA_PIM } from '../services/pigeonPeaPim.js';
import { resolvePlantPim } from '../services/pimLegacyAdapter.js';
import { normalizePimDocument, pimAddNode } from '../services/pimModel.js';
import { reviewPimImport, stagePimImport } from '../services/pimImportReview.js';
import { pimRouteFromUrl, pimRouteUrl } from '../services/pimRouting.js';
import { createAreaLink, normalizeAreaLinks } from '../services/areaLinks.js';

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
const pimSlug = value => String(value || 'plant').trim().toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'plant';
const effectiveMarkerType = marker => marker?.semantic_type === 'area_checkpoint' ? 'area_checkpoint' : marker?.type;
const isAreaTotemMarker = (marker, areaName = '') => effectiveMarkerType(marker) === 'area_checkpoint'
    || (marker?.type === 'sub_checkpoint'
        && String(marker?.name || '').trim().toLocaleLowerCase() === `${String(areaName || '').trim().toLocaleLowerCase()} totem`);
const markerTypeLabel = type => ({ plant: 'Plant Live Tag', note: 'Note', intro_checkpoint: 'Trail Entrance', sub_checkpoint: 'Checkpoint', area_checkpoint: 'Totem Marker' })[type] || 'Content';
const markerIcon = type => ({ plant: '🌱', note: '✎', intro_checkpoint: '⚑', sub_checkpoint: '⚑', area_checkpoint: '⌖' })[type] || '◆';
const PLANT_LAYER_COLORS = Object.freeze({
    emergent: '#b77a35',
    canopy: '#39784a',
    understory: '#5f9b54',
    shrub: '#748b46',
    herbaceous: '#a27b37',
    groundcover: '#3f8e72',
    rootrhizosphere: '#9b6652',
    climbervine: '#7460a4',
    aquatic: '#3a86a0',
    default: '#5e7956'
});
const plantLayerKey = value => String(value || '').toLocaleLowerCase().replace(/[^a-z]/g, '');
const areaFilterKey = value => String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'not-set';
const plantProfileClimate = profile => String(profile?.climate || profile?.climateContext || profile?.climate_context || '').trim();
function areaEntryPresentation(markerType, plantProfile = {}) {
    if (markerType === 'plant') {
        const layer = String(plantProfile.layer || '').trim();
        return {
            className: 'is-plant',
            icon: '🌱',
            accent: PLANT_LAYER_COLORS[plantLayerKey(layer)] || PLANT_LAYER_COLORS.default,
            kind: 'Plant'
        };
    }
    if (markerType === 'note') return { className: 'is-note', icon: '✎', accent: '#b47560', kind: 'Note · Information record' };
    if (markerType === 'area_checkpoint') return { className: 'is-totem is-totem-entry', icon: '⌖', accent: '#4b7e77', kind: 'Totem Marker · Area anchor' };
    if (markerType === 'intro_checkpoint') return { className: 'is-checkpoint is-trail-entrance', icon: '⚑', accent: '#8060a4', kind: 'Trail Entrance · Guided start' };
    if (markerType === 'sub_checkpoint') return { className: 'is-checkpoint', icon: '⚑', accent: '#5d769b', kind: 'Checkpoint · Spatial record' };
    return { className: 'is-record', icon: markerIcon(markerType), accent: '#68765d', kind: markerTypeLabel(markerType) };
}
const displayAreaName = area => isDefaultHomeArea(area) ? DEFAULT_HOME_AREA_NAME : String(area?.name || area || DEFAULT_HOME_AREA_NAME);
function projectBreadcrumbMarkup(project, area, currentLabel = '') {
    const projectLabel = `Home ${project.name}`;
    const areaLabel = displayAreaName(area);
    const projectAction = `window.renderProjectDashboard('${encoded(project.id)}')`;
    const areaAction = isDefaultHomeArea(area)
        ? `window.renderProjectHome('${encoded(project.id)}')`
        : `window.renderProjectAreaDashboard('${encoded(project.id)}','${encoded(area.id)}')`;
    const areaIsCurrent = !currentLabel;
    const areaSegment = areaIsCurrent
        ? `<strong>${escapeHtml(areaLabel)}</strong>`
        : `<button type="button" onclick="${areaAction}">${escapeHtml(areaLabel)}</button>`;
    return `<nav class="project-breadcrumb" aria-label="Project location"><button type="button" onclick="${projectAction}">${escapeHtml(projectLabel)}</button><span aria-hidden="true">/</span>${areaSegment}${currentLabel ? `<span aria-hidden="true">/</span><strong>${escapeHtml(currentLabel)}</strong>` : ''}</nav>`;
}
const visibleQrCode = value => String(value || '').startsWith('nxr-spatial:') ? '' : String(value || '');
function collapseRecentlyAdded(app) {
    const section = app.querySelector('.latest-entries-section');
    if (!section || section.tagName === 'DETAILS') return;
    const list = section.querySelector('.latest-entry-list');
    if (!list) return;
    const viewAll = section.querySelector('.view-all-entries');
    const details = document.createElement('details');
    details.className = section.className;
    const summary = document.createElement('summary');
    summary.className = 'section-heading-row latest-entries-heading';
    summary.innerHTML = '<h2>Recently added</h2><span class="latest-entries-chevron" aria-hidden="true">⌄</span>';
    const content = document.createElement('div');
    content.className = 'latest-entries-content';
    content.append(list);
    if (viewAll) {
        viewAll.textContent = 'Open detailed log';
        viewAll.setAttribute('aria-label', 'Open detailed log');
        content.append(viewAll);
    }
    details.append(summary, content);
    section.replaceWith(details);
}
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
    marker?.type === 'plant'
    && (profile.spm_enabled === true || profile.profile_enabled === true)
);
const clonePimValue = value => {
    if (value === undefined) return undefined;
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
};
const isPigeonPeaIdentity = identity => {
    const name = `${identity?.commonName || ''} ${identity?.scientificName || ''}`.toLocaleLowerCase();
    return name.includes('pigeon pea') || name.includes('cajanus cajan');
};
function initialPlantPimDocument(profile, identity) {
    const starterUseCategories = [
        ['culinary', 'Culinary', 10],
        ['medicinal', 'Medicinal', 20],
        ['craft', 'Craft', 30]
    ];
    const ensureUseCategories = document => {
        let next = normalizePimDocument(document);
        starterUseCategories.forEach(([id, title, displayOrder]) => {
            if (next.nodes.some(node => node.id === id)) return;
            next = pimAddNode(next, {
                id,
                parentId: 'uses',
                title,
                preview: 'Add plant-part information',
                body: '',
                informationType: 'category',
                evidenceStatus: 'needs_review',
                status: 'published',
                displayOrder
            });
        });
        return next;
    };
    const stored = profile?.pim_document || profile?.pim || profile?.pim_nodes || profile?.pim_categories;
    if (stored) {
        const document = resolvePlantPim(profile, identity, { plantId: identity.plantId });
        const nextIdentity = { ...document.identity };
        Object.entries(identity || {}).forEach(([key, value]) => {
            const meaningful = Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() : value !== undefined && value !== null;
            if (meaningful) nextIdentity[key] = clonePimValue(value);
        });
        return ensureUseCategories({ ...document, identity: nextIdentity });
    }
    if (isPigeonPeaIdentity(identity)) {
        const canonicalIdentity = clonePimValue(PIGEON_PEA_PIM.identity);
        Object.entries(identity || {}).forEach(([key, value]) => {
            const meaningful = Array.isArray(value) ? value.length > 0 : typeof value === 'string' ? value.trim() : value !== undefined && value !== null;
            if (meaningful) canonicalIdentity[key] = clonePimValue(value);
        });
        return ensureUseCategories({
            ...clonePimValue(PIGEON_PEA_PIM),
            plantId: identity.plantId,
            identity: canonicalIdentity
        });
    }
    return ensureUseCategories(resolvePlantPim(profile, identity, { plantId: identity.plantId }));
}
let pigeonPeaExamplePimDocument = null;
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
const LAST_PROJECT_AREA_KEY = 'nourishland-xr-last-area-v1';
const DEFAULT_SETTINGS = { sound: true, volume: 80, textSize: 'medium', visualQuality: 'automatic', language: 'en', hints: true, developerDiagnostics: false, physicalAnchors: false };

function readLastProjectArea(projectId) {
    try {
        const saved = JSON.parse(localStorage.getItem(LAST_PROJECT_AREA_KEY) || '{}');
        return typeof saved?.[projectId] === 'string' ? saved[projectId] : '';
    } catch {
        return '';
    }
}

function rememberLastProjectArea(projectId, areaId) {
    if (!projectId || !areaId) return;
    try {
        const saved = JSON.parse(localStorage.getItem(LAST_PROJECT_AREA_KEY) || '{}');
        localStorage.setItem(LAST_PROJECT_AREA_KEY, JSON.stringify({ ...saved, [projectId]: areaId }));
    } catch {
        // Area memory is a convenience; navigation continues if storage is unavailable.
    }
}

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
    if (name === 'language') {
        setNxrLanguage(value);
        if (document.getElementById('settingsLanguage')) {
            const backButton = document.querySelector('.settings-screen .page-header .ghost');
            const returnTo = backButton?.getAttribute('onclick')?.includes('renderDemoProjects') ? 'creator' : 'launch';
            renderPlatformComingSoon(document.getElementById('app'), 'Settings', returnTo);
        }
        return;
    }
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
    const area = context.places.find(place => place.id === areaId);
    if (!context.site || !area) throw new Error('Area data is unavailable.');
    return {
        ...context,
        area,
        areaEntries: context.entries.filter(entry => entry.place.id === area.id)
    };
}

async function projectCheckpointContext(projectId, areaId) {
    const context = await projectContent(projectId);
    const area = context.places.find(place => place.id === areaId);
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
        icon: areaIcon(area),
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
            area: escapeHtml(displayAreaName(place)),
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
            title: 'A Totem Marker holds a place together',
            full: nonPlantMode
                ? 'A framed Totem marks one room, collection zone or exhibition. Its Dynamic Markers, records and guidance can gather naturally around it.'
                : 'A translucent Totem marks one garden bed, grove or learning zone. The information and Markers belonging to that Area can gather naturally around it.',
            short: 'Use a Totem Marker to give one part of the landscape its own identity.',
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
            title: 'AR Mode and Web Hub work together',
            full: nonPlantMode
                ? 'AR Mode places knowledge beside real objects. The Web Hub is your searchable workspace for reviewing and managing the same records. Use them together: place spatially, then organise and deepen the information.'
                : 'AR Mode places Plants, Notes and knowledge in the real landscape. The Web Hub is your searchable workspace for reviewing, editing and learning from those same records. One gives knowledge a place; the other helps it grow.',
            short: 'AR Mode gives knowledge a place, while the Web Hub helps you manage and deepen it.',
            actionLabel: 'Create your first Marker',
            action: `window.openCreatorArMode('${encoded(projectId)}')`
        },
        helpGuide: {
            title: 'Suggest reading: Help Guide',
            full: 'The Help Guide explains the main workflows, Areas, Totems, Plant Live Tags and the relationship between Web Hub and AR Mode.',
            short: 'Open the Help Guide whenever you want a concise explanation of the project tools.',
            actionLabel: 'Open Help Guide',
            action: `window.renderPlatformComingSoon('Help Guide', 'creator')`
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
        const areas = context.places.filter(place => !isDefaultHomeArea(place));
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
        const context = await projectCheckpointContext(projectId, areaId);
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
        const areas = context.places.filter(area => !isDefaultHomeArea(area));
        const cards = areas.map(area => {
            const checkpoint = context.entries.find(entry => entry.place.id === area.id && effectiveMarkerType(entry.marker) === 'area_checkpoint');
            if (checkpoint) {
                const checkpointStatus = checkpoint.marker.qr_reference ? `Physical Area Marker: <strong>${escapeHtml(checkpoint.marker.name)}</strong>` : `Temporary Area Marker: <strong>${escapeHtml(checkpoint.marker.name)}</strong> · add the physical marker code later.`;
                return `<section class="panel ar-area-card is-ready"><h2>${escapeHtml(area.name)}</h2><p>${checkpointStatus}</p><div class="button-row"><button class="primary" type="button" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(area.id)}', '${encoded(checkpoint.marker.id)}')">Open placement AR</button><button type="button" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(area.id)}')">Edit Area Marker</button></div></section>`;
            }
            return `<section class="panel ar-area-card"><h2>${escapeHtml(area.name)}</h2><p>No Area Marker yet. You can test AR now and add a temporary marker when you are ready.</p><button type="button" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(area.id)}')">Add Area Marker</button></section>`;
        }).join('');
        app.innerHTML = `<div class="screen ar-area-picker"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Back to Dashboard</button><p class="welcome-label">Creator AR</p><h1>AR setup guide</h1><p class="subtitle">Test with no physical code, then add checkpoints when they are installed.</p></div><section class="panel guide"><h2>Set up a small Area</h2><ol><li><strong>Totem Marker</strong> — create the Area’s clear information centre.</li><li><strong>Plants, Markers and Notes</strong> — add discoveries to that Area.</li><li><strong>Optional Trail Entrance</strong> — add one only if visitors need a guided beginning.</li></ol><div class="button-row"><button type="button" onclick="window.renderStartingPoints('${encoded(context.project.id)}')">Visitor Entrances</button><button class="primary" type="button" onclick="window.startArMode('${encoded(context.project.id)}')">Open Test AR</button></div></section>${cards || `<section class="panel"><p>Create an Area before placing its Totem Marker and ordinary Markers.</p><div class="button-row"><button class="primary" type="button" onclick="window.renderProjectAreaForm('${encoded(context.project.id)}', 'dashboard')">Create Area</button></div></section>`}</div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back to Dashboard</button><h1>AR setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAreaCheckpointForm(app, encodedProjectId, encodedAreaId, flow = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectCheckpointContext(projectId, areaId);
        const flowKey = `${projectId}:${areaId}`;
        if (flow) checkpointSetupFlows.set(flowKey, flow);
        else checkpointSetupFlows.delete(flowKey);
        const existing = context.areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        let savedCode = existing?.marker.qr_reference || '';
        if (existing && !savedCode) {
            try { savedCode = visibleQrCode((await loadMarkerAnchor(projectId, context.site.id, areaId, existing.marker.id)).qr_code); }
            catch { savedCode = ''; }
        }
        const submitLabel = existing ? 'Save Totem changes' : 'Save Totem';
        const totemName = existing?.marker.name || `${context.area.name} Totem`;
        const totemColor = /^#[0-9a-f]{6}$/i.test(existing?.marker.appearance?.color || '') ? existing.marker.appearance.color : DEFAULT_TOTEM_COLOR;
        const totemHeight = normalizeTotemHeightPreset(existing?.marker);
        const totemStyle = normalizeTotemStyle(existing?.marker);
        const totemHeightDetails = totemHeightPreset(totemHeight);
        const totemToneOptions = TOTEM_TONES.map(tone => `<option value="${tone.color}" ${tone.color.toLowerCase() === totemColor.toLowerCase() ? 'selected' : ''}>${tone.label}</option>`).join('');
        const totemHeightButtons = TOTEM_HEIGHT_PRESETS.map(preset => `<button type="button" data-totem-height="${preset.id}" aria-pressed="${preset.id === totemHeight}"><strong>${preset.label}</strong><small>${preset.metres.toFixed(2)} m</small></button>`).join('');
        const totemStyleButtons = TOTEM_STYLES.map(style => `<button type="button" data-totem-style="${style.id}" aria-pressed="${style.id === totemStyle}"><span class="totem-style-preview totem-style-preview-${style.id}" aria-hidden="true"></span><strong>${style.label}</strong><small>${style.description}</small></button>`).join('');
        const board = existing?.marker.area_information_board || {};
        const linkableAreas = context.places.filter(place => !isDefaultHomeArea(place) && place.id !== context.area.id);
        const existingLinks = normalizeAreaLinks(context.area, context.places);
        const selectedLink = existingLinks.find(link => linkableAreas.some(area => area.id === link?.toAreaId)) || null;
        const linkOptions = linkableAreas.map(area => `<option value="${escapeHtml(area.id)}" ${area.id === selectedLink?.target_area_id ? 'selected' : ''}>${escapeHtml(area.name)}</option>`).join('');
        const destinationTotems = context.entries.filter(entry => linkableAreas.some(area => area.id === entry.place.id) && isAreaTotemMarker(entry.marker, entry.place.name));
        const linkTotemOptions = destinationTotems.map(entry => `<option value="${escapeHtml(entry.marker.id)}" ${entry.marker.id === selectedLink?.targetTotemId ? 'selected' : ''}>${escapeHtml(entry.place.name)} · ${escapeHtml(entry.marker.name || 'Totem')}</option>`).join('');
        const linkMeasure = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : '';
        const bubbles = Array.isArray(board.information_bubbles) ? board.information_bubbles : [];
        const startingBubbles = bubbles.length ? bubbles : [''];
        const bubbleFields = startingBubbles.map((text, index) => `<div class="field totem-text-box"><label for="areaCheckpointBubble${index}">Text box ${index + 1}</label><textarea id="areaCheckpointBubble${index}" data-totem-information-box rows="2" placeholder="${index === 0 ? 'What does this Totem help people understand?' : 'Add another useful idea, story or instruction.'}">${escapeHtml(text)}</textarea></div>`).join('');
        const physicalAnchorEnabled = readPlatformSettings().physicalAnchors === true;
        let savedPhysicalAnchor = null;
        try {
            savedPhysicalAnchor = normalizePhysicalAnchor(existing?.marker.physicalAnchor);
        } catch {
            savedPhysicalAnchor = null;
        }
        const physicalValues = savedPhysicalAnchor || PHYSICAL_ANCHOR_DEFAULTS;
        const assignments = physicalAnchorAssignments(context.entries, existing?.marker.id || '');
        const physicalMarkerOptions = PHYSICAL_ANCHOR_IDS.map(markerId => {
            const assignment = assignments.get(markerId);
            const status = assignment
                ? assignment.isCurrent
                    ? 'Assigned to this Totem'
                    : `Assigned to another Totem · ${assignment.totemName}`
                : 'Available';
            return `<option value="${markerId}" ${markerId === Number(physicalValues.markerId) ? 'selected' : ''}>${physicalMarkerLabel(markerId)} — ${escapeHtml(status)}</option>`;
        }).join('');
        const selectedAssignment = assignments.get(Number(physicalValues.markerId));
        const physicalMarkerCard = physicalAnchorEnabled ? `<details class="totem-physical-anchor-card" ${savedPhysicalAnchor ? 'open' : ''}>
            <summary><span><strong>Physical Marker <small>(optional)</small></strong><small>Paper-anchored Totem prototype</small></span><b aria-hidden="true">⌗</b></summary>
            <div class="totem-physical-anchor-body">
                <p>Associate a printable physical marker with this totem location. In AR mode, scanning the marker anchors the totem to this real-world point.</p>
                <label class="tutorial-mode-toggle physical-anchor-toggle"><span><strong>Use physical marker</strong><small>Off by default. Existing AR remains unchanged.</small></span><input id="areaPhysicalAnchorEnabled" type="checkbox" ${savedPhysicalAnchor ? 'checked' : ''} /></label>
                <div class="totem-physical-anchor-layout" data-physical-anchor-fields ${savedPhysicalAnchor ? '' : 'hidden'}>
                    <div class="totem-physical-marker-preview" data-physical-marker-preview>${physicalMarkerSvg(physicalValues.markerId)}</div>
                    <div class="totem-physical-marker-controls">
                        <label for="areaPhysicalMarkerId">Marker<select id="areaPhysicalMarkerId">${physicalMarkerOptions}</select></label>
                        <p class="physical-marker-assignment-status" data-physical-marker-assignment>${selectedAssignment ? (selectedAssignment.isCurrent ? 'Assigned to this Totem' : `Assigned to ${escapeHtml(selectedAssignment.totemName)}`) : 'Available'}</p>
                        <label class="physical-marker-reassign" data-physical-marker-reassign ${selectedAssignment && !selectedAssignment.isCurrent ? '' : 'hidden'}><input id="areaPhysicalMarkerReassign" type="checkbox" /> Reassign marker from <span>${escapeHtml(selectedAssignment?.totemName || '')}</span></label>
                        <label for="areaPhysicalMarkerSize">Marker size <small>Black square only, excluding white margin</small><span class="input-with-unit"><input id="areaPhysicalMarkerSize" type="number" min="1" step="1" value="${physicalValues.markerSizeMm}" /><b>mm</b></span></label>
                    </div>
                </div>
                <div class="totem-physical-transform-grid" data-physical-anchor-fields ${savedPhysicalAnchor ? '' : 'hidden'}>
                    <fieldset><legend>Totem position relative to marker</legend>
                        <label>X · horizontal<input id="areaPhysicalOffsetX" type="number" step="0.01" value="${physicalValues.offsetMeters.x}" /></label>
                        <label>Y · above plane<input id="areaPhysicalOffsetY" type="number" step="0.01" value="${physicalValues.offsetMeters.y}" /></label>
                        <label>Z · marker-forward<input id="areaPhysicalOffsetZ" type="number" step="0.01" value="${physicalValues.offsetMeters.z}" /></label>
                    </fieldset>
                    <fieldset><legend>Rotation offset</legend>
                        <label>Heading / yaw<input id="areaPhysicalYaw" type="number" step="1" value="${physicalValues.rotationDegrees.yaw}" /></label>
                        <label>Tilt / pitch<input id="areaPhysicalPitch" type="number" step="1" value="${physicalValues.rotationDegrees.pitch}" /></label>
                        <label>Roll<input id="areaPhysicalRoll" type="number" step="1" value="${physicalValues.rotationDegrees.roll}" /></label>
                    </fieldset>
                    <label class="physical-marker-scale">Scale<input id="areaPhysicalScale" type="number" min="0.01" step="0.05" value="${physicalValues.scale}" /></label>
                </div>
                <div class="button-row physical-marker-actions" data-physical-anchor-fields ${savedPhysicalAnchor ? '' : 'hidden'}>
                    <button type="button" data-test-physical-marker>Test in AR</button>
                    <button type="button" data-scan-physical-marker ${savedPhysicalAnchor ? '' : 'disabled'}>Scan Physical Marker</button>
                    ${savedPhysicalAnchor ? '<button class="danger" type="button" data-remove-physical-marker>Remove association</button>' : ''}
                </div>
                <p class="meta" data-physical-anchor-status>${savedPhysicalAnchor ? '' : 'Test in AR uses these current values without saving them.'}</p>
            </div>
        </details>` : '';
        app.innerHTML = `<div class="screen area-checkpoint-form totem-profile-page database-record-page"><div class="web-context-beacon is-area"><span>WORKING IN AREA</span><strong>${escapeHtml(context.area.name)}</strong></div><div class="page-header"><p class="welcome-label">TOTEM · WEB MODE</p><div class="totem-title-row"><h1>${escapeHtml(totemName)}</h1><button type="button" data-edit-totem-name aria-label="Edit Totem name">✎</button></div>${projectBreadcrumbMarkup(context.project, context.area, totemName)}</div><form id="totemFileForm" class="totem-file-form" onsubmit="window.saveAreaCheckpoint(event, '${encoded(context.project.id)}', '${encoded(context.area.id)}')">
            <section class="totem-profile-hero">
                <div class="totem-profile-visual is-style-${totemStyle}" style="--totem-color:${totemColor};--totem-preview-height:${totemHeightDetails.previewPixels}px" aria-hidden="true"><span></span></div>
                <div class="totem-essential-controls">
                    <div class="field totem-name-editor" hidden><label for="areaCheckpointName">Totem name</label><input id="areaCheckpointName" value="${escapeHtml(totemName)}" required /></div>
                    <div class="field totem-color-control"><label for="areaCheckpointTone">Totem colour</label><select id="areaCheckpointTone" aria-label="Totem colour palette">${totemToneOptions}<option value="custom">Custom colour…</option></select><span class="totem-custom-color" hidden><small>Custom</small><input id="areaCheckpointColor" type="color" value="${totemColor}" /></span></div>
                    <div class="field totem-style-control"><span>Totem style</span><div class="totem-style-presets" role="group" aria-label="Totem style">${totemStyleButtons}</div><input id="areaCheckpointStyle" type="hidden" value="${totemStyle}" /></div>
                    <div class="field totem-height-control"><span>Height preset</span><div class="totem-height-presets" role="group" aria-label="Totem height">${totemHeightButtons}</div><input id="areaCheckpointHeight" type="hidden" value="${totemHeight}" /></div>
                </div>
            </section>
            <section class="totem-welcome-card"><label for="areaCheckpointIntroduction"><span aria-hidden="true">✦</span> Main welcome text</label><p>The main information bubble is usually the first thing visitors need.</p><textarea id="areaCheckpointIntroduction" rows="3" placeholder="Welcome people into this Area.">${escapeHtml(board.introduction || '')}</textarea></section>
            <section class="totem-information-editor" aria-labelledby="totemTextBoxesTitle"><div class="totem-editor-heading"><div><h2 id="totemTextBoxesTitle">Additional information balloons</h2><p>Attach more text boxes only when this Totem needs them.</p></div><button type="button" data-add-totem-text-box><span aria-hidden="true">+</span> Text box</button></div><div class="totem-text-box-grid" data-totem-text-boxes>${bubbleFields}</div></section>
            ${physicalMarkerCard}
            <section class="totem-relationship-grid">
                <div class="totem-anchor-card"><span aria-hidden="true">⌖</span><div><strong>ANCHOR TOTEM MARKER</strong><p>Link this Totem Marker to the physical marker installed at its real-world position.</p><label for="areaCheckpointCode">Link Totem Marker</label><input id="areaCheckpointCode" value="${escapeHtml(savedCode)}" placeholder="Scan or enter this Totem Marker’s physical marker" /></div></div>
                <div class="totem-link-card"><span aria-hidden="true">↗</span><div><strong>LINKED AREAS</strong><p>Connect this Totem to another Area. The route is guidance only until the destination Totem is confirmed.</p>${linkOptions ? `<label class="tutorial-mode-toggle" for="areaCheckpointLinkEnabled"><span><strong>Enable Area link</strong><small>Keep the destination selected while walking, then align at its Totem.</small></span><input id="areaCheckpointLinkEnabled" type="checkbox" ${selectedLink ? 'checked' : ''} /></label><label for="areaCheckpointLinkTarget">Destination Area</label><select id="areaCheckpointLinkTarget"><option value="">Choose another Area</option>${linkOptions}</select><label for="areaCheckpointLinkTotem">Destination Totem <small>(optional until placed)</small></label><select id="areaCheckpointLinkTotem"><option value="">Choose a destination Totem</option>${linkTotemOptions}</select><div class="totem-link-measure"><input id="areaCheckpointLinkDistance" type="number" min="0" step="0.1" placeholder="Approx. metres" value="${escapeHtml(String(linkMeasure(selectedLink?.distanceMetres)))}" /><input id="areaCheckpointLinkBearing" type="number" min="0" max="359" step="1" placeholder="Bearing ° (optional)" value="${escapeHtml(String(Number.isFinite(Number(selectedLink?.bearingDegrees)) ? selectedLink.bearingDegrees : ''))}" /></div><label class="tutorial-mode-toggle" for="areaCheckpointLinkBidirectional"><span><strong>Bidirectional</strong><small>Also offer the return link from the destination Area.</small></span><input id="areaCheckpointLinkBidirectional" type="checkbox" ${selectedLink?.bidirectional === false ? '' : 'checked'} /></label><p class="meta">No step counter or compass capture is used. Distance and bearing are optional notes, not precise positioning.</p>` : '<small>Create another Area before linking Totems.</small>'}<div class="totem-existing-links">${existingLinks.map(link => `<span>${escapeHtml(linkableAreas.find(area => area.id === link.toAreaId)?.name || link.toAreaId)}${link.distanceMetres !== null ? ` · about ${escapeHtml(String(link.distanceMetres))} m` : ''}${link.destinationExists === false ? ' · destination missing' : ''}</span>`).join('')}</div></div></div>
            </section>
            <p id="areaCheckpointStatus" class="meta"></p>
        </form><nav class="bottom-navigation totem-bottom-navigation"><button class="primary" type="submit" form="totemFileForm">${submitLabel}</button>${existing ? `<button class="danger" type="button" onclick="window.deleteProjectEntry('${encoded(context.project.id)}','${encoded(existing.marker.id)}')">Delete</button>` : ''}<button type="button" onclick="window.renderProjectAreaDashboard('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Back to Area</button><button type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Back to Dashboard</button></nav></div>`;
        app.querySelector('[data-edit-totem-name]')?.addEventListener('click', () => {
            const editor = app.querySelector('.totem-name-editor');
            editor?.removeAttribute('hidden');
            editor?.querySelector('input')?.focus();
        });
        const colorInput = app.querySelector('#areaCheckpointColor');
        const toneSelect = app.querySelector('#areaCheckpointTone');
        const syncTotemColor = value => {
            if (!value || value === 'custom') return;
            if (colorInput) colorInput.value = value;
            app.querySelector('.totem-profile-visual')?.style.setProperty('--totem-color', value);
        };
        toneSelect?.addEventListener('change', event => {
            const custom = event.currentTarget.value === 'custom';
            app.querySelector('.totem-custom-color')?.toggleAttribute('hidden', !custom);
            syncTotemColor(event.currentTarget.value);
        });
        colorInput?.addEventListener('input', event => {
            app.querySelector('.totem-profile-visual')?.style.setProperty('--totem-color', event.currentTarget.value);
        });
        app.querySelectorAll('[data-totem-style]').forEach(button => button.addEventListener('click', () => {
            const styleInput = app.querySelector('#areaCheckpointStyle');
            const style = normalizeTotemStyle(button.dataset.totemStyle);
            if (!styleInput) return;
            styleInput.value = style;
            app.querySelectorAll('[data-totem-style]').forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
            app.querySelector('.totem-profile-visual')?.classList.remove(...TOTEM_STYLES.map(candidate => `is-style-${candidate.id}`));
            app.querySelector('.totem-profile-visual')?.classList.add(`is-style-${style}`);
        }));
        app.querySelectorAll('[data-totem-height]').forEach(button => button.addEventListener('click', () => {
            const heightInput = app.querySelector('#areaCheckpointHeight');
            if (!heightInput) return;
            heightInput.value = button.dataset.totemHeight;
            app.querySelectorAll('[data-totem-height]').forEach(candidate => candidate.setAttribute('aria-pressed', String(candidate === button)));
            app.querySelector('.totem-profile-visual')?.style.setProperty('--totem-preview-height', `${totemHeightPreset(button.dataset.totemHeight).previewPixels}px`);
        }));
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
        const physicalToggle = app.querySelector('#areaPhysicalAnchorEnabled');
        const physicalSelect = app.querySelector('#areaPhysicalMarkerId');
        const updatePhysicalAnchorFields = () => {
            const enabled = Boolean(physicalToggle?.checked);
            app.querySelectorAll('[data-physical-anchor-fields]').forEach(element => { element.hidden = !enabled; });
        };
        const updatePhysicalAssignment = () => {
            if (!physicalSelect) return;
            const markerId = Number(physicalSelect.value);
            const assignment = assignments.get(markerId);
            const assignmentStatus = app.querySelector('[data-physical-marker-assignment]');
            const reassign = app.querySelector('[data-physical-marker-reassign]');
            const reassignName = reassign?.querySelector('span');
            const confirm = app.querySelector('#areaPhysicalMarkerReassign');
            if (assignmentStatus) assignmentStatus.textContent = assignment
                ? assignment.isCurrent ? 'Assigned to this Totem' : `Assigned to ${assignment.totemName}`
                : 'Available';
            if (reassign) reassign.hidden = !assignment || assignment.isCurrent;
            if (reassignName) reassignName.textContent = assignment?.totemName || '';
            if (confirm) confirm.checked = false;
            const preview = app.querySelector('[data-physical-marker-preview]');
            if (preview) preview.innerHTML = physicalMarkerSvg(markerId);
        };
        physicalToggle?.addEventListener('change', updatePhysicalAnchorFields);
        physicalSelect?.addEventListener('change', updatePhysicalAssignment);
        app.querySelector('[data-test-physical-marker]')?.addEventListener('click', async () => {
            const physicalStatus = app.querySelector('[data-physical-anchor-status]');
            try {
                const physicalAnchor = physicalAnchorFromTotemForm();
                if (!physicalAnchor) throw new Error('Enable the Physical Marker before testing.');
                const assignment = assignments.get(physicalAnchor.markerId);
                if (assignment && !assignment.isCurrent && !document.getElementById('areaPhysicalMarkerReassign')?.checked) {
                    throw new Error(`${physicalAnchor.markerLabel} is assigned to ${assignment.totemName}. Confirm reassignment first.`);
                }
                const started = await startPhysicalAnchorScanner(context.project.id, {
                    marker: {
                        ...(existing?.marker || {}),
                        id: existing?.marker.id || 'physical-marker-preview',
                        name: document.getElementById('areaCheckpointName')?.value.trim() || 'Totem preview',
                        appearance: {
                            ...(existing?.marker.appearance || {}),
                            color: document.getElementById('areaCheckpointColor')?.value || DEFAULT_TOTEM_COLOR,
                            heightPreset: document.getElementById('areaCheckpointHeight')?.value || 'standard'
                        },
                        physicalAnchor
                    },
                    place: context.area,
                    site: context.site
                });
                if (!started && physicalStatus) physicalStatus.textContent = 'Camera scanning could not start. Check the on-screen scanner message.';
            } catch (error) {
                if (physicalStatus) physicalStatus.textContent = error.message;
            }
        });
        app.querySelector('[data-scan-physical-marker]')?.addEventListener('click', async () => {
            const physicalStatus = app.querySelector('[data-physical-anchor-status]');
            try {
                const started = await startPhysicalAnchorScanner(context.project.id);
                if (!started && physicalStatus) physicalStatus.textContent = 'Camera scanning could not start. Check the on-screen scanner message.';
            } catch (error) {
                if (physicalStatus) physicalStatus.textContent = error.message;
            }
        });
        app.querySelector('[data-remove-physical-marker]')?.addEventListener('click', async () => {
            const physicalStatus = app.querySelector('[data-physical-anchor-status]');
            try {
                if (!existing) return;
                if (!window.confirm(`Remove ${savedPhysicalAnchor?.markerLabel || 'this marker'} from ${existing.marker.name}? The Totem and Area will remain.`)) return;
                if (physicalStatus) physicalStatus.textContent = 'Removing marker association…';
                await updatePlaceMarker(context.project.id, context.site.id, context.area.id, existing.marker.id, {
                    ...existing.marker,
                    physicalAnchor: null
                });
                await renderAreaCheckpointForm(app, encoded(context.project.id), encoded(context.area.id), flow);
            } catch (error) {
                if (physicalStatus) physicalStatus.textContent = `Association could not be removed: ${error.message}`;
            }
        });
        if (flow === 'quick') {
            const returnButton = app.querySelectorAll('.bottom-navigation button')[1];
            if (returnButton) returnButton.onclick = () => openCheckpointQuickSetup(app, encoded(context.project.id));
        }
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back to Dashboard</button><h1>Checkpoint unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

function physicalAnchorFromTotemForm() {
    if (!document.getElementById('areaPhysicalAnchorEnabled')?.checked) return null;
    return normalizePhysicalAnchor({
        enabled: true,
        markerId: document.getElementById('areaPhysicalMarkerId')?.value,
        markerSizeMm: document.getElementById('areaPhysicalMarkerSize')?.value,
        offsetMeters: {
            x: document.getElementById('areaPhysicalOffsetX')?.value,
            y: document.getElementById('areaPhysicalOffsetY')?.value,
            z: document.getElementById('areaPhysicalOffsetZ')?.value
        },
        rotationDegrees: {
            yaw: document.getElementById('areaPhysicalYaw')?.value,
            pitch: document.getElementById('areaPhysicalPitch')?.value,
            roll: document.getElementById('areaPhysicalRoll')?.value
        },
        scale: document.getElementById('areaPhysicalScale')?.value
    });
}

function physicalAnchorFromPlantProfileForm() {
    if (!document.getElementById('projectEntryPhysicalAnchorEnabled')?.checked) return null;
    return normalizePhysicalAnchor({
        enabled: true,
        markerId: document.getElementById('projectEntryPhysicalMarkerId')?.value,
        markerSizeMm: document.getElementById('projectEntryPhysicalMarkerSize')?.value,
        offsetMeters: { x: 0, y: 0, z: 0 },
        rotationDegrees: { yaw: 0, pitch: 0, roll: 0 },
        scale: 1
    });
}

export async function saveAreaCheckpoint(event, encodedProjectId, encodedAreaId, flow = '') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    const status = document.getElementById('areaCheckpointStatus');
    const submitButton = event.submitter;
    try {
        if (submitButton) submitButton.disabled = true;
        const context = await projectCheckpointContext(projectId, areaId);
        const flowKey = `${projectId}:${areaId}`;
        const nextFlow = flow || checkpointSetupFlows.get(flowKey) || '';
        const name = document.getElementById('areaCheckpointName')?.value.trim() || `${context.area.name} Totem`;
        const color = document.getElementById('areaCheckpointColor')?.value || DEFAULT_TOTEM_COLOR;
        const totemStyle = normalizeTotemStyle(document.getElementById('areaCheckpointStyle')?.value);
        const heightPreset = normalizeTotemHeightPreset(document.getElementById('areaCheckpointHeight')?.value);
        const qrCode = document.getElementById('areaCheckpointCode')?.value.trim() || '';
        const introduction = document.getElementById('areaCheckpointIntroduction')?.value.trim() || '';
        const informationBubbles = [...document.querySelectorAll('[data-totem-information-box]')].map(field => field.value.trim()).filter(Boolean);
        const linkEnabled = document.getElementById('areaCheckpointLinkEnabled')?.checked === true;
        const linkTarget = document.getElementById('areaCheckpointLinkTarget')?.value || '';
        const linkDistance = document.getElementById('areaCheckpointLinkDistance')?.value || '';
        const linkBearing = document.getElementById('areaCheckpointLinkBearing')?.value || '';
        const linkTargetTotem = document.getElementById('areaCheckpointLinkTotem')?.value || '';
        const linkBidirectional = document.getElementById('areaCheckpointLinkBidirectional')?.checked !== false;
        const physicalAnchorControlPresent = Boolean(document.getElementById('areaPhysicalAnchorEnabled'));
        const physicalAnchor = physicalAnchorControlPresent ? physicalAnchorFromTotemForm() : undefined;
        const reassignPhysicalMarker = Boolean(document.getElementById('areaPhysicalMarkerReassign')?.checked);
        const existing = context.areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        if (status) status.textContent = 'Saving Totem…';
        const checkpointData = {
            id: existing?.marker.id || scopedMarkerStorageId(projectId, context.site.id, areaId, 'area-totem'),
            name,
            type: 'area_checkpoint',
            description: '',
            qr_reference: qrCode,
            area_information_board: {
                title: context.area.name,
                introduction: introduction || `Welcome to ${context.area.name}.`,
                information_bubbles: informationBubbles
            },
            visibility: existing?.marker.visibility || 'draft',
            appearance: { ...(existing?.marker.appearance || {}), color, totemStyle, heightPreset },
            physicalAnchor: physicalAnchorControlPresent ? physicalAnchor : existing?.marker.physicalAnchor,
            reassignPhysicalMarker
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
        if (!savedMarker?.id) throw new Error('The Totem record was not returned after saving.');
        const optionalWarnings = [];
        try {
            await syncMarkerQrAnchor(projectId, context.site.id, areaId, savedMarker.id, qrCode, `Physical Totem for ${context.area.name}.`);
        } catch (error) {
            optionalWarnings.push(`Totem link: ${error.message}`);
        }
        if (linkEnabled && linkTarget) {
            try {
                const route = createAreaLink(areaId, linkTarget, {
                    id: `${areaId}-to-${linkTarget}`,
                    targetTotemId: linkTargetTotem,
                    distanceMetres: linkDistance === '' ? null : Number(linkDistance),
                    bearingDegrees: linkBearing === '' ? null : Number(linkBearing),
                    bidirectional: linkBidirectional,
                    enabled: true
                });
                const links = existingLinks.filter(link => link.toAreaId !== linkTarget);
                links.push(route);
                await updateSitePlace(projectId, context.site.id, areaId, { totem_links: links });
                // A Totem route is a transition in both directions. Keep the
                // destination aware of the return route so either Area can
                // show a sign and load the other Area in AR.
                const targetArea = context.places.find(place => place.id === linkTarget);
                if (targetArea) {
                    const reverseLinks = Array.isArray(targetArea.totem_links)
                        ? normalizeAreaLinks(targetArea, context.places).filter(link => link.toAreaId !== areaId)
                        : [];
                    if (linkBidirectional) {
                        reverseLinks.push(createAreaLink(targetArea.id, areaId, {
                            id: `${targetArea.id}-to-${areaId}`,
                            targetTotemId: existing?.marker.id || '',
                            distanceMetres: route.distanceMetres,
                            bearingDegrees: route.bearingDegrees === null ? null : (route.bearingDegrees + 180) % 360,
                            bidirectional: true,
                            enabled: true
                        }));
                    }
                    await updateSitePlace(projectId, context.site.id, targetArea.id, { totem_links: reverseLinks });
                }
            } catch (error) {
                optionalWarnings.push(`Area link: ${error.message}`);
            }
        } else if (!linkEnabled && existingLinks.length) {
            try {
                const linkedAreaIds = new Set(existingLinks.map(link => link.toAreaId).filter(Boolean));
                await updateSitePlace(projectId, context.site.id, areaId, { totem_links: [] });
                await Promise.all([...linkedAreaIds].map(async targetAreaId => {
                    const targetArea = context.places.find(place => place.id === targetAreaId);
                    if (!targetArea) return;
                    const reverseLinks = Array.isArray(targetArea.totem_links)
                        ? normalizeAreaLinks(targetArea, context.places).filter(link => link.toAreaId !== areaId)
                        : [];
                    await updateSitePlace(projectId, context.site.id, targetArea.id, { totem_links: reverseLinks });
                }));
            } catch (error) {
                optionalWarnings.push(`Area link: ${error.message}`);
            }
        } else if (linkEnabled && !linkTarget) {
            optionalWarnings.push('Link path is enabled, but no destination Area was selected.');
        }
        checkpointSetupFlows.delete(flowKey);
        if (nextFlow === 'quick') await renderCheckpointPlacementChoice(document.getElementById('app'), encoded(projectId), encoded(areaId), encoded(savedMarker.id));
        else await window.renderProjectAreaDashboard(encoded(projectId), encoded(areaId), {
            saveNotice: optionalWarnings.length
                ? `Totem saved. Optional setup needs attention — ${optionalWarnings.join(' · ')}`
                : 'Totem saved in this Area.'
        });
    } catch (error) {
        if (status) status.textContent = `Totem could not be saved: ${error.message}`;
        if (submitButton) submitButton.disabled = false;
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
                <div class="setting-row"><label for="settingsLanguage"><strong>Language</strong></label><select id="settingsLanguage" onchange="window.savePlatformSetting('language', this.value)">${languageOptionsMarkup(settings.language)}</select></div>
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
                    <h2>Using the tool</h2>
                    <p>Using a suitable device, such as your phone, you can map and explore plant-rich places including home gardens, food forests, community gardens, farms and native forests. Add plants, mark important locations, create relationships, record observations and create information that others can discover while visiting the landscape.</p>
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
                <li><strong>Optional journeys:</strong> add a Trail Entrance only when visitors need a guided beginning.</li>
                <li><strong>Explore:</strong> use the Field Guide for Plants, Areas and their information.</li>
            </ol></section>
            <section class="panel help-guide-spatial-devices" aria-labelledby="spatialDevicesTitle"><h2 id="spatialDevicesTitle">Phones and spatial devices</h2>
                <p>Phones are useful for exploring and recording approximate spatial information, but phone tracking can drift and should not be treated as survey-grade positioning.</p>
                <p>Use the honest labels <strong>Approximate placement</strong>, <strong>Record approximate path</strong>, <strong>Confirm at next Totem Marker</strong>, and <strong>Tracking confidence: low, medium or high</strong>.</p>
                <p><strong>Plant Live Tags connect individual plants to interactive digital information. Totem Markers represent broader places, routes and spatial alignment points.</strong></p>
                <p>Future 6DoF devices may support more stable spatial capture. Android XR glasses may provide depth awareness, stable spatial anchors, hand and eye input, voice interaction and room-scale mapping. These capabilities are not legally certified survey measurements. XREAL AURA is an example of future hardware, not a completed or guaranteed integration.</p>
                <p>Two connected experiences share one project: <strong>Explore</strong> helps people discover information, <strong>Create</strong> helps maintain it, <strong>Spatial Survey</strong> records approximate paths and alignments, and <strong>GIS Export</strong> prepares spatial records for later use.</p>
            </section>
            <section class="help-faq" aria-labelledby="helpFaqTitle"><h2 id="helpFaqTitle">Frequently asked questions</h2>
                <details open><summary>Do I need AR to begin?</summary><p>No. Web Mode is your database and notebook. Build information first and place it later.</p></details>
                <details><summary>What is a Marker?</summary><p>A Marker is a spatial anchor. It can become a Plant, Note or another useful element.</p></details>
                <details><summary>What is a Totem Marker?</summary><p>A Totem Marker represents one Area or broader spatial alignment point and gathers the information belonging to that place.</p></details>
                <details><summary>Do I need a Trail Entrance?</summary><p>No. Home already holds anything not assigned to an Area. Add a Trail Entrance only for a guided visitor journey.</p></details>
                <details><summary>What happens when I am offline?</summary><p>Prepared project content remains available locally. New field observations can be synchronised when connectivity returns.</p></details>
                <details><summary>Can I make a mistake?</summary><p>Yes—and fix it. Creator tools let you edit, move or remove your own content without changing the underlying real place.</p></details>
            </section>
        </div>`;
        return;
    }
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>${escapeHtml(feature)}</h1><p class="subtitle">Coming Soon</p></div><div class="panel"><h2>Platform function</h2><p>${escapeHtml(feature)} will remain available from the welcome page.</p></div></div>`;
}

export async function renderProjectHome(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const context = await projectContent(projectId);
        const home = context.places.find(isDefaultHomeArea);
        if (home) {
            await renderProjectAreaDashboard(app, encoded(context.project.id), encoded(home.id));
            return;
        }
        await renderProjectDashboard(app, encoded(context.project.id));
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Home unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderProjectDashboard(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries, startingPoint } = await projectContent(projectId);
        const nonPlantMode = project.template === 'inventory_exhibition';
        const areas = places.filter(place => !isDefaultHomeArea(place));
        const homeArea = places.find(isDefaultHomeArea) || null;
        const layoutAreas = [homeArea, ...areas].filter(Boolean);
        const rememberedAreaId = readLastProjectArea(project.id);
        const activeArea = layoutAreas.find(area => area.id === rememberedAreaId) || homeArea || areas[0] || null;
        const activeAreaId = activeArea?.id || '';
        if (activeAreaId) rememberLastProjectArea(project.id, activeAreaId);
        const hasArea = areas.length > 0;
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const unplacedEntries = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && !entry.isPlaced);
        const projectEntries = entries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)));
        const placedProjectEntries = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && entry.isPlaced);
        const placedTotemAreaIds = new Set(placedEntries
            .filter(entry => isAreaTotemMarker(entry.marker, entry.place?.name) && entry.isPlaced)
            .map(entry => entry.place.id));
        const missingTotemArea = areas.find(area => !placedTotemAreaIds.has(area.id)) || null;
        const allAreasHavePlacedTotems = areas.length > 0 && !missingTotemArea;
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
            { label: 'Add 1 Note', complete: noteCount >= 1 }
        ];
        const growthCompleted = growthSteps.filter(step => step.complete).length;
        const tutorialComplete = growthCompleted === growthSteps.length;
        const tutorialWasEnabled = isProjectTutorialEnabled(project.id);
        if (tutorialWasEnabled && tutorialComplete) {
            setProjectTutorialMode(project.id, false);
        }
        const tutorialEnabled = tutorialWasEnabled && !tutorialComplete;
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
            || !tutorialEnabled
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
                    description: 'Turn a Plant Live Tag into a living knowledge library.',
                    action: nextPlantWithoutProfile
                        ? `window.openProjectEntry('${encoded(project.id)}','${encoded(nextPlantWithoutProfile.marker.id)}')`
                        : `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`
                }
            ],
            optionalFeature: null
        };
        const guidance = project.expertMode === true || !tutorialEnabled
            ? null
            : dashboardGuidance(project.id, { hasArea, startingConfigured: Boolean(startingPoint), freshProject: !hasArea && projectEntries.length === 0, nonPlantMode });
        const latestDate = [
            ...projectEntries.map(entry => entry.marker.modified || entry.marker.created),
            ...areas.map(area => area.modified || area.created)
        ].filter(Boolean).sort().at(-1);
        const latestEntries = placedEntries.slice(0, 10).map(({ marker, place }) => {
            const markerType = effectiveMarkerType(marker);
            return {
                label: escapeHtml(marker.name),
                type: escapeHtml(markerTypeLabel(markerType)),
                identifier: escapeHtml(marker.plant_code || marker.id),
                location: escapeHtml(displayAreaName(place)),
                date: escapeHtml(entryDateLabel(marker.created || marker.modified)),
                creator: escapeHtml(entryCreatorLabel(marker)),
                action: markerType === 'area_checkpoint'
                    ? `window.renderAreaCheckpointForm('${encoded(project.id)}','${encoded(place.id)}')`
                    : marker.type === 'intro_checkpoint'
                        ? `window.openProjectStartingPoint('${encoded(project.id)}')`
                        : `window.openProjectEntry('${encoded(project.id)}','${encoded(marker.id)}')`
            };
        });
        const areaLinks = layoutAreas.map(area => {
            const areaEntries = entries.filter(entry => entry.place.id === area.id);
            const areaPlants = areaEntries.filter(entry => effectiveMarkerType(entry.marker) === 'plant');
            const areaTotem = areaEntries.find(entry => isAreaTotemMarker(entry.marker, area.name));
            const totemColor = /^#[0-9a-f]{6}$/i.test(areaTotem?.marker.appearance?.color || '')
                ? areaTotem.marker.appearance.color
                : '';
            return {
                label: escapeHtml(displayAreaName(area)),
                icon: areaIcon(area),
                contentCount: areaEntries.filter(entry => effectiveMarkerType(entry.marker) !== 'area_checkpoint').length,
                plantCount: areaPlants.length,
                totemPlaced: placedTotemAreaIds.has(area.id),
                totemColor,
                isHome: isDefaultHomeArea(area),
                isCurrent: area.id === activeAreaId,
                action: `window.renderProjectAreaDashboard('${encoded(project.id)}','${encoded(area.id)}')`
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
                areas: String(layoutAreas.length),
                lastUpdated: latestDate ? editedLabel(latestDate).replace(/^Edited /, '') : 'No edits yet',
                notice: ''
            },
            openArAction: `window.openProjectArMode('${encoded(project.id)}','${encoded(activeAreaId)}')`,
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
                { label: 'Help Guide', action: `window.renderPlatformComingSoon('Help Guide', 'creator')` },
                { label: 'Printing options', description: 'Tags, lists, profiles and Map.', action: `window.renderPrintCenter('${encoded(project.id)}')` }
            ],
            latestEntries,
            viewAllAction: `window.renderAllProjectEntries('${encoded(project.id)}')`
        });
        collapseRecentlyAdded(app);
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
        const areas = places.filter(place => !isDefaultHomeArea(place));
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const unplacedCount = placedEntries.filter(entry => ['plant', 'note', 'sub_checkpoint'].includes(entry.marker.type) && !entry.isPlaced).length;
        const areaRows = areas.map(area => {
            const count = entries.filter(entry => entry.place.id === area.id).length;
            return `<button class="project-area-link" type="button" onclick="window.renderProjectAreaDashboard('${encoded(project.id)}', '${encoded(area.id)}')">
                <span class="project-area-link-icon" aria-hidden="true">${areaIcon(area)}</span>
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
                <button type="button" onclick="window.renderFieldGuide('${encoded(project.id)}', true)"><strong>Web Hub</strong><span>Manage Home, Plants, Areas, Totems and their information.</span></button>
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
        app.innerHTML = `<div class="screen setup-flow"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Save and exit</button><p class="welcome-label">Getting started</p><h1>Your space is ready</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><section class="panel guide"><h2>Begin with one Area</h2><p>An Area is a garden bed, orchard section, forest zone or any meaningful part of the landscape you want to understand. Home already holds anything that has not been assigned to an Area; a visitor entrance can be added later if it is useful.</p></section><div class="content-type-list"><button class="content-type-row primary" type="button" onclick="window.renderProjectAreaForm('${encoded(project.id)}', 'dashboard')"><strong>CREATE YOUR FIRST AREA</strong><span>Name the region, then place its Totem now or later.</span></button><button class="content-type-row" type="button" onclick="window.renderProjectDashboard('${encoded(project.id)}')"><strong>Open Dashboard</strong><span>Continue from the simple project checklist.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderDemoProjects()">Back</button><h1>Setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderAddToLocation(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    const project = await projectById(projectId);
    const action = (label, description, onclick) => `<button class="content-type-row" type="button" onclick="${onclick}"><strong>${label}</strong><span>${description}</span></button>`;
    app.innerHTML = `<div class="screen add-content-screen"><div class="page-header"><button class="ghost" onclick="window.renderUnplacedContent('${encoded(project.id)}')">Back to Home</button><h1>Add to Home</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel"><p>Save information here when you want to organise it or assign its physical position later.</p></div><div class="content-type-list">${action('Plant', 'Save a Plant now and position it later.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'plant', 'without-ar', true)`)}${action('Note', 'Record an observation and position it later.', `window.renderLocationFieldMarker('${encoded(project.id)}', 'note', 'without-ar', true)`)}</div></div>`;
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
        const firstArea = !places.some(place => !isDefaultHomeArea(place));
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
        const nextAreaNumber = places.filter(place => !isDefaultHomeArea(place)).length + 1;
        const expertAreaFields = project.expertMode === true ? `<details class="area-advanced-fields"><summary>Optional Area details</summary><div class="field"><label for="projectAreaType">Area type</label><select id="projectAreaType"><option value="Outdoor Area">Outdoor Area</option><option value="Indoor Area">Indoor Area</option><option value="Bed or Plot">Bed or Plot</option><option value="Room">Room</option><option value="Enclosure">Enclosure</option><option value="Path or Route">Path or Route</option><option value="Other">Other</option></select></div><div class="field"><label for="projectAreaDescription">Short description</label><textarea id="projectAreaDescription" rows="3" placeholder="What belongs in this Area?"></textarea></div></details>` : '';
        app.innerHTML = `<div class="screen area-form-screen"><div class="page-header"><button class="ghost" onclick="${returnAction}">Back</button><p class="welcome-label">${firstArea ? 'First Area' : 'Areas'}</p><h1>${firstArea ? 'Create your first Area' : 'Create an Area'}</h1><p class="subtitle">${escapeHtml(project.name)}</p></div>${guidance}<form class="panel simple-area-form" onsubmit="window.saveProjectArea(event, '${encoded(project.id)}', '${encoded(intent)}')"><div class="field"><label for="projectAreaName">Name your Area</label><input id="projectAreaName" value="Area ${nextAreaNumber}" placeholder="Area ${nextAreaNumber}" required /></div><p class="area-name-examples">Examples: Orchard · Vegetable Garden · Creek Bank · Front Bed</p>${expertAreaFields}<p id="projectAreaError" class="meta"></p><div class="area-create-actions"><button type="button" onclick="${returnAction}">Cancel</button><button class="primary" type="submit"><strong>Create Area</strong><span>Save the Area first. You can add and place its Totem from the Area afterwards.</span></button></div></form></div>`;
        if (areaStage === 'new') recordTutorialEvent(project.id, 'area_explained');
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Area setup unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

async function continueAfterAreaCreation(app, projectId, areaId, intent = 'dashboard', areaTutorialCompleted = false) {
    if (intent === 'checkpoint-quick') return renderAreaCheckpointForm(app, encoded(projectId), encoded(areaId), 'quick');
    if (intent === 'tutorial-totem') return renderAreaCheckpointForm(app, encoded(projectId), encoded(areaId), 'tutorial');
    if (['starting-point', 'trail-entrance'].includes(intent)) return renderStartingPointForm(app, encoded(projectId), encoded(areaId), 'trail-entrance');
    if (intent.startsWith('quick:')) {
        const [, type = 'plant', placementMode = 'without-ar'] = intent.split(':');
        return window.renderLocationFieldMarker(encoded(projectId), type, placementMode, false, encoded(areaId));
    }
    return renderProjectAreaDashboard(app, encoded(projectId), encoded(areaId), { areaTutorialCompleted });
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
        return continueAfterAreaCreation(target, projectId, area.id, intent, true);
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

export async function renderProjectAreaDashboard(app, encodedProjectId, encodedAreaId, options = {}) {
    // Keep the Area Totem summary immediately below the basic Area stats so
    // its information and edit link are visible before the marker list.
    const projectId = decodeURIComponent(encodedProjectId);
    const areaId = decodeURIComponent(encodedAreaId);
    try {
        const context = await projectAreaContext(projectId, areaId);
        rememberLastProjectArea(projectId, context.area.id);
        recordTutorialEvent(projectId, 'first_area_created_or_selected');
        const placedAreaEntries = await entriesWithPlacement(context.project, context.site, context.areaEntries);
        const areaEntries = await Promise.all(placedAreaEntries.map(async entry => ({
            ...entry,
            plantProfile: effectiveMarkerType(entry.marker) === 'plant'
                ? await loadPlantProfile(context.project.id, context.site.id, context.area.id, entry.marker.id).catch(() => entry.marker.plant_profile || {})
                : {}
        })));
        const checkpoint = areaEntries.find(entry => isAreaTotemMarker(entry.marker, context.area.name));
        const areaMarkerLocated = Boolean(checkpoint?.isPlaced);
        const canonicalAreaEntries = areaEntries.filter(entry => !isAreaTotemMarker(entry.marker, context.area.name));
        const plantAreaEntries = areaEntries.filter(entry => effectiveMarkerType(entry.marker) === 'plant');
        const areaPlantLayers = [...new Set(plantAreaEntries
            .map(entry => String(entry.plantProfile?.layer || '').trim()))]
            .sort((left, right) => left.localeCompare(right));
        const areaPlantClimates = [...new Set(plantAreaEntries
            .map(entry => plantProfileClimate(entry.plantProfile)))].sort((left, right) => left.localeCompare(right));
        const areaMarkerTypes = [...new Set(canonicalAreaEntries
            .map(entry => effectiveMarkerType(entry.marker)))].sort((left, right) => left.localeCompare(right));
        const areaFilterFieldset = (group, label, values, valueLabel = value => value || 'Not set') => values.length
            ? `<fieldset class="area-marker-filter-group"><legend>${escapeHtml(label)}</legend><div class="area-marker-filter-options">${values.map(value => `<label class="area-marker-filter-option"><input type="checkbox" data-area-marker-filter-group="${escapeHtml(group)}" value="${escapeHtml(areaFilterKey(value))}"><span>${escapeHtml(valueLabel(value))}</span></label>`).join('')}</div></fieldset>`
            : '';
        const areaMarkerTypeLabel = type => type === 'plant' ? 'Plant' : markerTypeLabel(type);
        const rows = canonicalAreaEntries.map(({ marker, isPlaced, plantProfile }) => {
            const markerType = isAreaTotemMarker(marker, context.area.name) ? 'area_checkpoint' : effectiveMarkerType(marker);
            const status = entryStatus(marker);
            const placementLabel = isPlaced ? 'Placed' : 'Not yet placed';
            const presentation = areaEntryPresentation(markerType, plantProfile);
            const webAction = markerType === 'area_checkpoint'
                ? `window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')`
                : markerType === 'intro_checkpoint'
                    ? `window.openProjectStartingPoint('${encoded(context.project.id)}', '${encoded(context.area.id)}')`
                    : `window.openProjectEntry('${encoded(context.project.id)}', '${encoded(marker.id)}', false, 'area-dashboard')`;
            const photo = markerType === 'plant'
                ? String(plantProfile?.photo || plantProfile?.image || marker.photo || marker.image || '').trim()
                : '';
            const layerKey = markerType === 'plant' ? areaFilterKey(plantProfile?.layer || '') : 'other';
            const climateKey = markerType === 'plant' ? areaFilterKey(plantProfileClimate(plantProfile)) : 'other';
            const typeKey = areaFilterKey(markerType);
            const iconMarkup = photo
                ? `<img src="${escapeHtml(photo)}" alt="" loading="lazy">`
                : `<span>${presentation.icon}</span>`;
            return `<article class="area-content-entry area-content-card ${presentation.className}" style="--area-entry-accent:${presentation.accent}" data-area-marker-entry data-marker-type="${escapeHtml(markerType)}" data-marker-filter-type="${escapeHtml(typeKey)}" data-marker-layer="${escapeHtml(layerKey)}" data-marker-climate="${escapeHtml(climateKey)}" role="button" tabindex="0" aria-label="Open ${escapeHtml(marker.name)} · ${escapeHtml(presentation.kind)}" onclick="${webAction}" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();${webAction}}">
                <span class="area-entry-icon${photo ? ' has-photo' : ''}" aria-hidden="true">${iconMarkup}</span>
                <span class="area-entry-copy"><strong>${escapeHtml(marker.name)}</strong><small class="area-entry-kind">${escapeHtml(presentation.kind)}</small><span class="placement-status ${markerType === 'area_checkpoint' || isPlaced ? 'is-placed' : 'is-unplaced'}">${placementLabel} · ${escapeHtml(editedLabel(marker.modified || marker.created))}</span></span>
                <span class="area-entry-status entry-status-${status.tone}">${status.label}</span>
            </article>`;
        }).join('');
        const areaMarkerFilter = `<div class="area-marker-filter" data-area-marker-filter-panel>
            <div class="area-marker-filter-heading"><strong>Filter markers</strong><button type="button" class="ghost" data-area-marker-filter-toggle aria-controls="areaMarkerFilterOptions" aria-expanded="false">Filters</button><span id="areaMarkerFilterStatus" class="meta" aria-live="polite">${canonicalAreaEntries.length} marker${canonicalAreaEntries.length === 1 ? '' : 's'}</span></div>
            <div id="areaMarkerFilterOptions" class="area-marker-filter-options-panel" data-area-marker-filter-options hidden>
                ${areaFilterFieldset('layer', 'Layer', areaPlantLayers)}
                ${areaFilterFieldset('climate', 'Climate', areaPlantClimates)}
                ${areaFilterFieldset('type', 'Type', areaMarkerTypes, areaMarkerTypeLabel)}
            </div>
        </div>`;
        const anchor = hasGpsCoordinates(context.area.anchor) ? context.area.anchor : null;
        const advancedAreaActions = context.project.expertMode === true ? `<div class="area-dashboard-actions">
                <button class="primary" type="button" onclick="window.navigateToProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>Navigate to it in AR</strong><span>${anchor ? 'Open AR navigation to this Area.' : 'Assign a GPS location first, then open AR navigation.'}</span></button>
                <button type="button" onclick="window.renderProjectAreaLocationForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')"><strong>${anchor ? 'Update GPS location' : 'Assign GPS location'}</strong><span>Tag the physical position of this Area.</span></button>
            </div>` : '';
        const plantCount = canonicalAreaEntries.filter(entry => entry.marker.type === 'plant').length;
        const totemCount = checkpoint ? 1 : 0;
        const areaTutorialConfirmation = options.areaTutorialCompleted && isProjectTutorialEnabled(context.project.id)
            ? '<section class="tutorial-step-confirmation" role="status"><span aria-hidden="true">✓</span><div><strong>Add 1 Area complete</strong><p>Your Area is saved. Add a Totem now, or return whenever you are ready.</p></div></section>'
            : '';
        const linkedTotems = (Array.isArray(context.area.totem_links) ? context.area.totem_links : []).map(link => ({ ...link, area: context.places.find(place => place.id === link.target_area_id) })).filter(link => link.area);
        const areaDescription = String(context.area.description || '').trim();
        const pigeonPeaTemplateEntry = isDefaultHomeArea(context.area)
            ? areaEntries.find(entry => entry.marker.template_id === 'pigeon-pea-reference' || entry.plantProfile.template_id === 'pigeon-pea-reference')
            : null;
        const pigeonPeaTemplateCard = pigeonPeaTemplateEntry
            ? `<section class="home-template-card" aria-labelledby="homePigeonPeaTemplateTitle"><div><p class="welcome-label">STARTER PLANT TEMPLATE</p><h2 id="homePigeonPeaTemplateTitle">Pigeon Pea</h2><p>Complete Plant Profile · Info Mesh ready · saved in Home for this new project.</p></div><button type="button" class="primary" onclick="window.openProjectEntry('${encoded(context.project.id)}','${encoded(pigeonPeaTemplateEntry.marker.id)}',false,'home-template')">Open Plant Profile</button></section>`
            : '';
        const areaAboutInfo = isDefaultHomeArea(context.area)
            ? '<span class="area-overview-actions"><button type="button" class="plant-profile-info-bubble" data-area-about-info data-info-trigger data-info-source="areaAboutHelp" aria-expanded="false" aria-label="About the default Home area">i</button><button type="button" data-edit-area-description>Edit</button></span>'
            : '<button type="button" data-edit-area-description>Edit</button>';
        const areaDangerZone = isDefaultHomeArea(context.area)
            ? ''
            : `<section class="area-danger-zone" aria-labelledby="deleteAreaTitle">
                <h2 id="deleteAreaTitle">Delete Area</h2>
                <p>Deleting this Area also deletes its content, Totem and any Trail Entrance stored inside it.</p>
                <button class="danger" type="button" onclick="window.deleteProjectArea('${encoded(context.project.id)}', '${encoded(context.area.id)}')">Delete Area</button>
                <p id="deleteProjectAreaStatus" class="meta"></p>
            </section>`;
        const totemMarker = checkpoint?.marker || null;
        const totemBoard = totemMarker?.area_information_board || {};
        const totemBubbles = Array.isArray(totemBoard.information_bubbles) ? totemBoard.information_bubbles.filter(Boolean) : [];
        const totemStyleLabel = String(totemMarker?.appearance?.totemStyle || totemMarker?.appearance?.style || 'Basic').replace(/[-_]/g, ' ');
        const areaTotemSection = `<section class="area-totem-section" aria-labelledby="areaTotemInformationTitle">
            <header class="section-heading-row"><div><p class="welcome-label">TOTEM INFORMATION</p><h2 id="areaTotemInformationTitle">${escapeHtml(totemMarker?.name || `${context.area.name} Totem`)}</h2><p>${checkpoint ? 'The Totem is this Area’s information centre.' : 'Add a Totem to give this Area a clear information centre.'}</p></div><button type="button" class="primary" onclick="window.renderAreaCheckpointForm('${encoded(context.project.id)}', '${encoded(context.area.id)}')">${checkpoint ? 'View / edit Totem' : 'Add Totem'}</button></header>
            ${checkpoint ? `<div class="totem-stat-grid"><div class="totem-stat"><span class="totem-stat-icon" aria-hidden="true">⌖</span><small>ANCHORED</small><strong>${checkpoint.isPlaced ? 'Yes' : 'Not placed'}</strong></div><div class="totem-stat"><span class="totem-stat-icon" aria-hidden="true">◈</span><small>COLOR</small><strong>${escapeHtml(totemMarker?.appearance?.color || 'Default')}</strong></div><div class="totem-stat"><span class="totem-stat-icon" aria-hidden="true">✦</span><small>TEXT BALLOONS</small><strong>${totemBubbles.length + (totemBoard.introduction ? 1 : 0)}</strong></div><div class="totem-stat"><span class="totem-stat-icon" aria-hidden="true">↗</span><small>LINKED</small><strong>${linkedTotems.length ? `${linkedTotems.length} Area${linkedTotems.length === 1 ? '' : 's'}` : 'None yet'}</strong></div></div>
                ${totemMarker.description ? `<p class="area-totem-description">${escapeHtml(totemMarker.description)}</p>` : ''}
                ${totemBoard.introduction ? `<div class="area-totem-introduction"><strong>Main welcome text</strong><p>${escapeHtml(totemBoard.introduction)}</p></div>` : ''}
                ${totemBubbles.length ? `<div class="area-totem-bubbles"><strong>Additional information</strong><div>${totemBubbles.map((bubble, index) => `<span><b>${index + 1}</b>${escapeHtml(bubble)}</span>`).join('')}</div></div>` : ''}
                ${linkedTotems.length ? `<div class="area-totem-links"><strong>Linked Totems</strong>${linkedTotems.map(link => `<span>${escapeHtml(context.area.name)} → ${escapeHtml(link.area.name)}${link.steps ? ` · ${escapeHtml(link.steps)} steps` : ''}${link.distance_m ? ` · ${escapeHtml(link.distance_m)} m` : ''}</span>`).join('')}</div>` : '<p class="area-totem-empty">No linked Area Totem yet. Add another Area, then connect them from the Totem editor.</p>'}` : '<p class="area-totem-empty">This Area has no Totem yet. A Totem can carry welcome text, information balloons and links to neighbouring Areas.</p>'}
        </section>`;
        app.innerHTML = `<div class="screen area-dashboard database-record-page">
            <header class="page-header area-dashboard-header">
                <div class="area-dashboard-title-row"><div><p class="welcome-label">Area dashboard</p><h1>${escapeHtml(context.area.name)}</h1></div><button class="global-ar-action area-go-ar-compact" type="button" aria-label="Open ${escapeHtml(context.area.name)} in AR" onclick="window.startArMode('${encoded(context.project.id)}', '${encoded(context.area.id)}', '${encoded(checkpoint?.marker.id || '')}', '', '', 'dashboard', '${encoded(context.site.id)}')">AR</button></div>
                ${projectBreadcrumbMarkup(context.project, context.area)}
            </header>
            ${options.saveNotice ? `<p class="area-save-notice" role="status">${escapeHtml(options.saveNotice)}</p>` : ''}
            <section class="area-profile-summary area-encyclopedia-card">
                <div class="area-profile-hero">
                    <div class="area-profile-visual" aria-label="Area icon"><span data-area-icon-reading>${areaIcon(context.area)}</span><small>AREA</small>${areaMarkerLocated ? '<button type="button" class="area-icon-edit-button" data-edit-area-icon aria-label="Edit Area icon" title="Edit Area icon">✎</button>' : ''}</div>
                    <div class="area-vital-grid">
                        <div class="area-vital-setting"><small>TYPE</small><strong data-area-type-reading>${escapeHtml(context.area.type || 'Other')}</strong><button type="button" class="area-inline-edit" data-edit-area-type aria-label="Edit Area type" title="Edit Area type">✎</button></div>
                        <div><small>PLANTS</small><strong>${plantCount}</strong></div>
                        <div><small>TOTEMS</small><strong>${totemCount}</strong></div>
                        <div><small>LOCATION</small><strong>${escapeHtml(context.project.name)}</strong></div>
                    </div>
                </div>
                <form class="area-information-form is-reading" onsubmit="window.saveAreaInformation(event, '${encoded(context.project.id)}', '${encoded(context.area.id)}')">
                    <p data-area-type-form-reading hidden>${escapeHtml(context.area.type || 'Other')}</p><label for="areaType" hidden>Area type</label><select id="areaType" hidden><option value="Outdoor Area" ${context.area.type === 'Outdoor Area' ? 'selected' : ''}>Outdoor Area</option><option value="Indoor Area" ${context.area.type === 'Indoor Area' ? 'selected' : ''}>Indoor Area</option><option value="Bed or Plot" ${context.area.type === 'Bed or Plot' ? 'selected' : ''}>Bed or Plot</option><option value="Room" ${context.area.type === 'Room' ? 'selected' : ''}>Room</option><option value="Enclosure" ${context.area.type === 'Enclosure' ? 'selected' : ''}>Enclosure</option><option value="Path or Route" ${context.area.type === 'Path or Route' ? 'selected' : ''}>Path or Route</option><option value="Other" ${!context.area.type || context.area.type === 'Other' ? 'selected' : ''}>Other</option></select>
                    <div class="area-overview-card"><div class="area-overview-heading"><strong><span aria-hidden="true">✦</span> About this Area</strong>${areaAboutInfo}</div>${areaDescription ? `<p data-area-description-reading>${escapeHtml(areaDescription)}</p>` : ''}<p id="areaAboutHelp" class="area-about-help" data-area-about-help hidden>DEFAULT HOME FOR CONTENT — Home holds items that are not yet assigned to a named Area.</p><label for="areaDescription" hidden>Description</label><textarea id="areaDescription" rows="3" hidden>${escapeHtml(areaDescription)}</textarea></div>
                    <p data-area-icon-form-reading hidden>${areaIcon(context.area)} ${AREA_ICON_OPTIONS.find(option => option.value === areaIcon(context.area))?.label || 'Leaves'}</p><label for="areaIcon" hidden>Area icon</label><select id="areaIcon" hidden>${AREA_ICON_OPTIONS.map(option => `<option value="${escapeHtml(option.value)}" ${option.value === areaIcon(context.area) ? 'selected' : ''}>${option.value} ${escapeHtml(option.label)}</option>`).join('')}</select>
                    <p id="areaInformationStatus" class="meta" aria-live="polite"></p>
                    <button type="submit" data-save-area-description hidden>Save Area information</button>
                </form>
            </section>
            ${areaTotemSection}
            ${pigeonPeaTemplateCard}
            <p id="projectAreaArStatus" class="meta" aria-live="polite"></p>
            ${advancedAreaActions}
            <details class="latest-entries-section area-content-section" open>
                <summary class="section-heading-row"><div><h2>Markers in this Area</h2><p>${canonicalAreaEntries.length} marker${canonicalAreaEntries.length === 1 ? '' : 's'}</p></div><span aria-hidden="true">▾</span></summary>
                ${areaMarkerFilter}<div class="area-content-grid">${rows}</div>
            </details>
            <nav class="bottom-navigation"><button class="ghost" type="button" onclick="window.renderProjectDashboard('${encoded(context.project.id)}')">Return to Dashboard</button></nav>
            ${areaDangerZone}
        </div>`;
        app.querySelector('[data-edit-area-description]')?.addEventListener('click', () => {
            app.querySelector('[data-area-description-reading]')?.setAttribute('hidden', '');
            const textarea = document.getElementById('areaDescription');
            textarea?.removeAttribute('hidden');
            app.querySelector('label[for="areaDescription"]')?.removeAttribute('hidden');
            app.querySelector('[data-save-area-description]')?.removeAttribute('hidden');
            textarea?.focus();
        });
        app.querySelector('[data-area-about-info]')?.addEventListener('click', event => window.toggleInfoOverlay?.(event.currentTarget));
        app.querySelector('[data-edit-area-type]')?.addEventListener('click', () => {
            app.querySelector('[data-area-type-reading]')?.setAttribute('hidden', '');
            app.querySelector('[data-area-type-form-reading]')?.setAttribute('hidden', '');
            app.querySelector('#areaType')?.removeAttribute('hidden');
            app.querySelector('label[for="areaType"]')?.removeAttribute('hidden');
            app.querySelector('[data-save-area-description]')?.removeAttribute('hidden');
            app.querySelector('#areaType')?.focus();
        });
        app.querySelector('[data-edit-area-icon]')?.addEventListener('click', () => {
            app.querySelector('[data-area-icon-form-reading]')?.setAttribute('hidden', '');
            app.querySelector('#areaIcon')?.removeAttribute('hidden');
            app.querySelector('label[for="areaIcon"]')?.removeAttribute('hidden');
            app.querySelector('[data-save-area-description]')?.removeAttribute('hidden');
            app.querySelector('#areaIcon')?.focus();
        });
        const areaMarkerFilterToggle = app.querySelector('[data-area-marker-filter-toggle]');
        const areaMarkerFilterOptions = app.querySelector('[data-area-marker-filter-options]');
        areaMarkerFilterToggle?.addEventListener('click', () => {
            const isOpen = areaMarkerFilterOptions?.hasAttribute('hidden');
            if (isOpen) areaMarkerFilterOptions.removeAttribute('hidden');
            else areaMarkerFilterOptions?.setAttribute('hidden', '');
            areaMarkerFilterToggle.setAttribute('aria-expanded', String(Boolean(isOpen)));
        });
        const applyAreaMarkerFilters = () => {
            const selected = Object.fromEntries(['layer', 'climate', 'type'].map(group => [group, new Set([...app.querySelectorAll(`[data-area-marker-filter-group="${group}"]:checked`)].map(input => input.value))]));
            const entries = [...app.querySelectorAll('[data-area-marker-entry]')];
            let visible = 0;
            entries.forEach(entry => {
                const show = (!selected.layer.size || (entry.dataset.markerType === 'plant' && selected.layer.has(entry.dataset.markerLayer)))
                    && (!selected.climate.size || (entry.dataset.markerType === 'plant' && selected.climate.has(entry.dataset.markerClimate)))
                    && (!selected.type.size || selected.type.has(entry.dataset.markerFilterType));
                entry.hidden = !show;
                if (show) visible += 1;
            });
            const status = app.querySelector('#areaMarkerFilterStatus');
            const active = Object.values(selected).some(values => values.size);
            if (status) status.textContent = active ? `${visible} marker${visible === 1 ? '' : 's'} shown` : `${canonicalAreaEntries.length} marker${canonicalAreaEntries.length === 1 ? '' : 's'}`;
        };
        app.querySelectorAll('[data-area-marker-filter-group]').forEach(input => input.addEventListener('change', applyAreaMarkerFilters));
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
        const type = document.getElementById('areaType')?.value || context.area.type || 'Other';
        const icon = areaIcon({ icon: document.getElementById('areaIcon')?.value || context.area.icon });
        if (status) status.textContent = 'Saving Area information…';
        await updateSitePlace(projectId, context.site.id, areaId, {
            description,
            type,
            icon
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
        if (isDefaultHomeArea(areaId)) {
            if (status) status.textContent = 'Home is a protected Area and cannot be deleted.';
            return;
        }
        const context = await projectAreaContext(projectId, areaId);
        if (isDefaultHomeArea(context.area)) {
            if (status) status.textContent = 'Home is a protected Area and cannot be deleted.';
            return;
        }
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
    const intent = entrance ? 'trail-entrance' : `quick:${type}:${placementMode}`;
    app.innerHTML = `<div class="screen area-required-screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><p class="welcome-label">One foundation step</p><h1>Create an Area</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><div class="panel guide"><h2>Everything grows from Areas</h2><p>${entrance ? 'A Trail Entrance belongs to the Area where a guided journey begins.' : `Every ${type === 'note' ? 'Note' : 'Plant'} belongs to an Area, even when its physical AR position is not known yet.`}</p></div><div class="button-row">${entrance ? '' : `<button type="button" onclick="window.renderLocationFieldMarker('${encoded(project.id)}', '${type}', '${placementMode}', true)">Continue in Home</button>`}<button class="primary" type="button" onclick="window.renderProjectAreaForm('${encoded(project.id)}', '${encoded(intent)}')">Create Area</button></div></div>`;
}

export async function renderUnplacedContent(app, encodedProjectId) {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, entries } = await projectContent(projectId);
        const placementEntries = await entriesWithPlacement(project, site, entries);
        const unplaced = placementEntries.filter(entry => isDefaultHomeArea(entry.place) && ['plant', 'note', 'sub_checkpoint'].includes(effectiveMarkerType(entry.marker)) && !entry.isPlaced);
        // An empty Home is not a destination. Return to the project dashboard
        // after the last Home item is deleted instead of showing a dead page.
        if (!unplaced.length) {
            await renderProjectDashboard(app, encoded(project.id));
            return;
        }
        const rows = unplaced.map(({ marker, place }) => {
            const markerType = effectiveMarkerType(marker);
            return `<div class="latest-entry-row unplaced-content-row"><span class="latest-entry-icon" aria-hidden="true">${markerIcon(markerType)}</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>${markerTypeLabel(markerType)} · Area: ${escapeHtml(displayAreaName(place))}</span><span class="placement-status is-unplaced">Not yet placed</span></span><button type="button" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(marker.id)}', '${encoded(place.id)}', '${encoded(site?.id || '')}')">Place in AR</button></div>`;
        }).join('');
        const example = `<section class="panel plant-example-card" data-example-marker-id="${PIGEON_PEA_EXAMPLE.id}" data-example-plant-slug="${PIGEON_PEA_EXAMPLE.slug}"><p class="welcome-label">OFFICIAL COMPLETE PLANT PROFILE</p><h2>${PIGEON_PEA_EXAMPLE.name}</h2><p><strong>${PIGEON_PEA_EXAMPLE.commonName}</strong> · <i>${PIGEON_PEA_EXAMPLE.scientificName}</i></p><p>${PIGEON_PEA_EXAMPLE.introduction}</p><button type="button" onclick="window.renderPigeonPeaExample('${encoded(project.id)}')">View complete example</button></section>`;
        app.innerHTML = `<div class="screen unplaced-content-screen"><div class="web-context-beacon is-home"><span>UNASSIGNED WORKSPACE</span><strong>HOME</strong></div><div class="page-header"><button class="ghost" onclick="window.renderFieldGuide('${encoded(project.id)}', true)">Back to Web Hub</button><h1>Home</h1><p class="subtitle">${unplaced.length} item${unplaced.length === 1 ? '' : 's'} awaiting organisation or placement.</p></div>${example}<div class="panel"><p>Home is the default workspace for unassigned items, experiments and play that still need a named Area or physical position.</p><button type="button" onclick="window.renderAddToLocation('${encoded(project.id)}')">Add item to Home</button></div><div class="latest-entry-list">${rows || '<p class="project-empty-state">Home has no unassigned items.</p>'}</div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encodedProjectId}')">Back</button><h1>Unplaced Content unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
}

export async function renderPigeonPeaExample(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    pigeonPeaExamplePimDocument ||= normalizePimDocument(clonePimValue(PIGEON_PEA_PIM));
    app.innerHTML = `<div class="screen plant-example-profile" data-example-marker-id="${PIGEON_PEA_EXAMPLE.id}" data-example-plant-slug="${PIGEON_PEA_EXAMPLE.slug}"><div class="page-header"><button class="ghost" onclick="window.renderUnplacedContent('${encoded(project.id)}')">Back to Home</button><p class="welcome-label">COMPLETE PLANT LIVE TAG · TUTORIAL</p><h1>${PIGEON_PEA_EXAMPLE.name}</h1><p class="subtitle">${PIGEON_PEA_EXAMPLE.commonName}</p></div><section class="panel"><h2>${PIGEON_PEA_EXAMPLE.commonName}</h2><p><i>${PIGEON_PEA_EXAMPLE.scientificName}</i> · ${PIGEON_PEA_EXAMPLE.family}</p><p>Location: Home · ${escapeHtml(project.name)}</p><p>${PIGEON_PEA_EXAMPLE.shortProfile}</p></section><section class="plant-example-pim-section" aria-label="Advanced Pigeon Pea Plant Profile"><p class="welcome-label">ADVANCED PLANT PROFILE · INFO MESH</p><p class="meta">The Pigeon Pea example uses the same six-root PIM document as the AR demonstration. Add structured information below to extend a branch.</p><div data-pigeon-pea-pim-mount></div></section></div>`;
    mountPlantInformationWeb(app.querySelector('[data-pigeon-pea-pim-mount]'), {
        document: pigeonPeaExamplePimDocument,
        editable: true,
        showIdentity: false,
        onSaveDocument: nextDocument => {
            pigeonPeaExamplePimDocument = normalizePimDocument(nextDocument);
            return pigeonPeaExamplePimDocument;
        }
    });
    app.querySelector('.plant-example-profile .page-header .ghost')?.setAttribute('onclick', `window.renderProjectDashboard('${encoded(project.id)}')`);
}

export async function renderStoriesAndFocus(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(project.id)}')">Back</button><h1>Stories &amp; Checkpoints</h1><p class="subtitle">${escapeHtml(project.name)}</p></div><nav class="content-mode-tool-grid" aria-label="Stories and checkpoints tools"><button type="button" onclick="window.renderStartingPoints('${encoded(project.id)}')"><strong>Visitor Entrances</strong><span>Manage the optional Trail Entrance for guided visitors.</span></button><button type="button" onclick="window.renderUnplacedContent('${encoded(project.id)}')"><strong>Home</strong><span>Review Plants, Notes and Markers waiting for an Area or physical position.</span></button></nav><div class="panel guide"><h2>Story tools are growing</h2><p>Guided narratives, focused moments and richer Area stories are planned for V2. Existing checkpoints remain available now.</p></div></div>`;
}

export async function renderProjectSettings(app, encodedProjectId) {
    const project = await projectById(decodeURIComponent(encodedProjectId));
    const theme = PROJECT_THEMES.has(project.theme) ? project.theme : 'forest-light';
    const expertMode = project.expertMode === true;
    const tutorialEnabled = isProjectTutorialEnabled(project.id);
    const arTutorial = getArTutorialProgress();
    const settings = readPlatformSettings();
    const arLocationNote = {
        enabled: project.arLocationNote?.enabled !== false,
        title: project.arLocationNote?.title || project.name,
        prompt: project.arLocationNote?.prompt || 'WHERE AM I NOW?'
    };
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
        <details class="panel project-name-setting settings-collapsible" open aria-labelledby="projectNameTitle">
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="projectNameTitle">Project Details</h2><p>Update the project name, description and cover image without changing its saved ID, Areas or content.</p></div>
                    <span class="settings-collapsible-trailing"><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body">
                <form onsubmit="window.saveProjectName(event, '${encoded(project.id)}')">
                    <div class="field"><label for="projectSettingsName">Project name</label><input id="projectSettingsName" value="${escapeHtml(project.name)}" required /></div>
                    <div class="field"><label for="projectSettingsDescription">Description (optional)</label><textarea id="projectSettingsDescription" rows="4" placeholder="Describe this garden, landscape or learning location.">${escapeHtml(project.description || '')}</textarea></div>
                    <div class="field"><label for="projectSettingsCoverImage">Cover image (optional)</label><input id="projectSettingsCoverImage" type="url" value="${escapeHtml(project.coverImage || '')}" placeholder="https://…" /></div>
                    <div class="button-row"><button class="primary" type="submit">Save Project Details</button></div>
                    <p id="projectNameStatus" class="meta"></p>
                </form>
            </div>
        </details>
        <details class="panel project-location-note-setting settings-collapsible" aria-labelledby="projectLocationNoteTitle">
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="projectLocationNoteTitle">AR Location Note</h2><p>A transparent Location Note can be opened from its Totem Marker in AR. It stays hidden when AR opens.</p></div>
                    <span class="settings-collapsible-trailing"><span class="tutorial-status">${arLocationNote.enabled ? 'Available' : 'Unavailable'}</span><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body">
                <form onsubmit="window.saveArLocationNoteSettings(event, '${encoded(project.id)}')">
                    <label class="tutorial-mode-toggle"><span><strong>Available from Totem Marker</strong><small>Let people view or hide it from the selected Totem toolbar.</small></span><input id="projectLocationNoteEnabled" type="checkbox" ${arLocationNote.enabled ? 'checked' : ''} /></label>
                    <div class="field"><label for="projectLocationNotePrompt">Opening question</label><input id="projectLocationNotePrompt" value="${escapeHtml(arLocationNote.prompt)}" placeholder="WHERE AM I NOW?" /></div>
                    <div class="field"><label for="projectLocationNoteName">Location name</label><input id="projectLocationNoteName" value="${escapeHtml(arLocationNote.title)}" placeholder="${escapeHtml(project.name)}" /></div>
                    <p class="meta">The Area name is added automatically from the Area used to enter AR. Sessions without a chosen Area display Home.</p>
                    <div class="button-row"><button class="primary" type="submit">Save Location Note</button></div>
                    <p id="projectLocationNoteStatus" class="meta"></p>
                </form>
            </div>
        </details>
        <details class="panel project-publishing-setting settings-collapsible" aria-labelledby="projectPublishingTitle">
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="projectPublishingTitle">Explorer status</h2><p>Choose how this project appears to visitors in Explorer.</p></div>
                    <span class="settings-collapsible-trailing"><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body">
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
            </div>
        </details>
        <section class="panel expert-mode-setting" aria-labelledby="expertModeTitle">
            <div class="section-heading-row"><div><h2 id="expertModeTitle">Experience level</h2><p>Keep the everyday experience calm, or reveal advanced controls when you need them.</p></div><span class="tutorial-status">${expertMode ? 'Expert' : 'Friendly'}</span></div>
            <label class="tutorial-mode-toggle"><span><strong>Show advanced controls</strong><small>Show themes, technical guidance, diagnostics and other precision tools.</small></span><input type="checkbox" ${expertMode ? 'checked' : ''} onchange="window.updateProjectExpertMode('${encoded(project.id)}', this.checked)" /></label>
        </section>
        <details class="panel project-theme-setting settings-collapsible" aria-labelledby="projectThemeTitle" ${expertMode ? '' : 'hidden'}>
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="projectThemeTitle">Change Theme</h2><p>Choose the visual style used while working inside this project.</p></div>
                    <span class="settings-collapsible-trailing"><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body">
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
            </div>
        </details>
        <div class="content-type-list">
            <button class="content-type-row" type="button" onclick="window.renderStartingPoints('${encoded(project.id)}')"><strong>Manage Visitor Entrances</strong><span>Create an optional Trail Entrance for guided visitors.</span></button>
        </div>
        <details class="panel settings-collapsible" aria-labelledby="tutorialSettingsTitle" ${expertMode ? '' : 'hidden'}>
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="tutorialSettingsTitle">Tutorial & Guidance</h2><p>First-use explanations become shorter after successful actions.</p></div>
                    <span class="settings-collapsible-trailing"><span class="tutorial-status">${tutorialEnabled ? 'On' : 'Off'}</span><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body tutorial-settings">
                <label class="tutorial-mode-toggle"><span><strong>Tutorial Mode</strong><small>Show contextual guidance beside the feature being learned.</small></span><input type="checkbox" ${tutorialEnabled ? 'checked' : ''} onchange="window.setProjectTutorialMode('${encoded(project.id)}', this.checked)" /></label>
                <div class="tutorial-settings-actions">
                    <button type="button" onclick="window.restartProjectTutorial('${encoded(project.id)}')">Restart Tutorial for This Project</button>
                    <button type="button" onclick="window.resetLearningTips('${encoded(project.id)}')">Reset Learning Tips</button>
                </div>
                <p class="meta">These actions reset guidance only. Plants, Areas, Notes, checkpoints and AR positions are never changed.</p>
            </div>
        </details>
        <details class="panel settings-collapsible" aria-labelledby="arTutorialSettingsTitle" ${expertMode ? '' : 'hidden'}>
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="arTutorialSettingsTitle">AR Tutorial & Hints</h2><p>Control the compact guidance shown inside Creator AR Mode.</p></div>
                    <span class="settings-collapsible-trailing"><span class="tutorial-status">${arTutorialLabel}</span><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body tutorial-settings">
                <label class="tutorial-mode-toggle"><span><strong>Show AR Hints</strong><small>Show short surface-detection and placement reminders when they are useful.</small></span><input type="checkbox" ${arTutorial.showHints === false ? '' : 'checked'} onchange="window.setArHints('${encoded(project.id)}', this.checked)" /></label>
                <div class="tutorial-settings-actions">
                    <button type="button" onclick="window.replayArTutorial('${encoded(project.id)}')">Replay AR Tutorial</button>
                    <button type="button" onclick="window.resetArLearningTips('${encoded(project.id)}')">Reset AR Learning Tips</button>
                </div>
                <p class="meta">The tutorial appears once for an experienced creator, can be skipped, and can always be replayed here. Resetting it never changes project content or AR positions.</p>
            </div>
        </details>
        <details class="panel settings-collapsible" aria-labelledby="developerDiagnosticsTitle" ${expertMode ? '' : 'hidden'}>
            <summary>
                <div class="section-heading-row">
                    <div><h2 id="developerDiagnosticsTitle">Developer Diagnostics</h2><p>Keep technical AR launch details hidden during normal use.</p></div>
                    <span class="settings-collapsible-trailing"><span class="tutorial-status">${settings.developerDiagnostics ? 'Debug on' : 'Debug off'}</span><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body tutorial-settings">
                <label class="tutorial-mode-toggle"><span><strong>AR debug logging</strong><small>Write AR launch stages to the browser console for technical testing.</small></span><input type="checkbox" ${settings.developerDiagnostics ? 'checked' : ''} onchange="window.savePlatformSetting('developerDiagnostics', this.checked)" /></label>
                <label class="tutorial-mode-toggle"><span><strong>Physical Marker prototype</strong><small>Enable experimental printed ArUco anchors in Totem Alignment.</small></span><input type="checkbox" ${settings.physicalAnchors ? 'checked' : ''} onchange="window.savePlatformSetting('physicalAnchors', this.checked)" /></label>
                <div class="tutorial-settings-actions"><button type="button" onclick="window.copyArDiagnostics()">Copy Diagnostics</button></div>
                <p id="developerDiagnosticsStatus" class="meta">Diagnostics remain hidden from the camera view.</p>
            </div>
        </details>
        <details class="panel project-backup-setting settings-collapsible" aria-labelledby="backupProjectTitle" ${expertMode ? '' : 'hidden'}>
            <summary>
                <div class="section-heading-row">
                    <h2 id="backupProjectTitle">Backup Project to File</h2>
                    <span class="settings-collapsible-trailing"><span class="coming-soon-badge">Coming Soon</span><span class="settings-collapsible-chevron" aria-hidden="true">▾</span></span>
                </div>
            </summary>
            <div class="settings-collapsible-body">
                <p>Exports a configuration file containing all project data, Areas, content and settings.</p>
                <button type="button" disabled aria-disabled="true">Backup Project</button>
            </div>
        </details>
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

export async function saveArLocationNoteSettings(app, event, encodedProjectId) {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const status = document.getElementById('projectLocationNoteStatus');
    const enabled = document.getElementById('projectLocationNoteEnabled')?.checked !== false;
    const prompt = document.getElementById('projectLocationNotePrompt')?.value.trim() || 'WHERE AM I NOW?';
    try {
        if (status) status.textContent = 'Saving Location Note...';
        const project = await projectById(projectId);
        const title = document.getElementById('projectLocationNoteName')?.value.trim() || project.name;
        await renameProjectOnDisk(projectId, {
            ...project,
            preserveId: true,
            name: project.name,
            arLocationNote: { enabled, prompt, title }
        });
        if (status) status.textContent = 'Location Note saved. Open it from the Totem Marker in AR.';
    } catch (error) {
        if (status) status.textContent = `Location Note could not be saved: ${error.message}`;
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
    app.innerHTML = `<div class="screen browse-content-screen"><div class="page-header"><button class="ghost" onclick="${back}">Back</button><h1>Browse Content</h1><p class="subtitle">Access the project’s plants, stories, checkpoints and maps without entering AR.</p></div><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderFieldGuide('${encoded(project.id)}', ${creator})"><strong>${creator ? 'Web Hub' : 'Field Guide'}</strong><span>Browse plants and visitor-visible information.</span></button><button class="content-type-row" type="button" onclick="window.renderLocationMap('${encoded(project.id)}', ${creator})"><strong>Map</strong><span>View content by location without using the camera.</span></button></div>${rows ? `<section class="latest-entries-section"><h2>Stories and checkpoints</h2><div class="latest-entry-list">${rows}</div></section>` : ''}</div>`;
}

export async function renderLocationMap(app, encodedProjectId, creator = true, returnContext = '') {
    const projectId = decodeURIComponent(encodedProjectId);
    try {
        const { project, site, places, entries } = await projectContent(projectId);
        const placedEntries = await entriesWithPlacement(project, site, entries);
        const visibleEntries = creator ? placedEntries : placedEntries.filter(entry => entry.marker.visibility === 'public');
        const areas = places.filter(place => !isDefaultHomeArea(place));
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
            : creator && returnContext === 'print-center'
                ? `window.renderPrintCenter('${encoded(project.id)}')`
            : creator
                ? `window.renderProjectDashboard('${encoded(project.id)}')`
                : `window.renderBrowseContent('${encoded(project.id)}', false)`;
        const mapPrintAction = creator && returnContext === 'print-center' ? '<button class="print-center-inline-action" type="button" onclick="window.print()">Print Map</button>' : '';
        const gisExportPreview = `<section class="gis-export-preview" aria-labelledby="gisExportTitle"><div class="gis-export-preview-heading"><div><p class="welcome-label">Coming soon</p><h2 id="gisExportTitle">GIS Export</h2></div><span class="gis-export-badge">Preview</span></div><p>Prepare future spatial records for GeoPackage, GeoJSON, CSV with X/Y/Z, KML, GPX or DXF.</p><button type="button" disabled aria-disabled="true">GIS Export — Coming soon</button></section>`;
        app.innerHTML = `<div class="screen location-map-screen"><div class="page-header"><button class="ghost" onclick="${backAction}">Back</button><h1>Site Map</h1><p class="subtitle">${escapeHtml(project.name)} · ${escapeHtml(site?.name || 'Location')}</p>${mapPrintAction}</div>${mapEditor}<section class="site-map-introduction"><div><p class="welcome-label">Landscape overview</p><h2>Areas, paths and placed content</h2><p>This map shows the site as a whole. GPS anchors appear in their real relative positions; content placed only in AR stays within its Area until GPS is added.</p></div><div class="site-map-legend" aria-label="Map legend"><span><i class="is-area"></i>Area</span><span><i class="is-plant"></i>Plant</span><span><i class="is-note"></i>Note / checkpoint</span></div></section>${gisExportPreview}<section class="site-map-canvas${usesHillyardsPlan ? ' has-terrace-plan' : ' has-generic-surface'}" data-site-map-canvas onclick="window.placeLinkedAreaOnSiteMap(event)" aria-label="${escapeHtml(project.name)} site map">${mapBackground}<div class="site-map-image-wash" aria-hidden="true"></div>${areaOverlays}${markerPins}<p class="site-map-scale-note">${mapLayout.hasMapBounds ? 'GPS positions are shown relative to one another.' : 'Map layout is temporary until Areas receive GPS positions.'}</p></section><section class="site-map-summary"><strong>${visiblePlaces.length} Area${visiblePlaces.length === 1 ? '' : 's'}</strong><span>${mapEntries.length} mapped item${mapEntries.length === 1 ? '' : 's'}</span><span>${mapLayout.hasMapBounds ? 'GPS relative layout' : 'Area layout mode'}</span></section>${mapTotemDiagram}${visiblePlaces.length ? '' : '<div class="panel"><p>No visible Areas have been added yet. Create an Area to begin your site map.</p></div>'}</div>`;
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

function compressedPlantImage(file) {
    return new Promise((resolve, reject) => {
        if (file.size > 12 * 1024 * 1024) return reject(new Error('Choose an image smaller than 12 MB.'));
        const image = new Image();
        image.onerror = () => reject(new Error('The selected image could not be opened.'));
        image.onload = () => {
            const maximum = 1200;
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
        const { project, entries } = await projectContent(projectId);
        const startingPoints = entries.filter(entry => entry.marker.type === 'intro_checkpoint');
        const entranceRows = startingPoints.map(({ marker }) => `<button class="latest-entry-row" type="button" onclick="window.openProjectStartingPoint('${encoded(project.id)}')"><span class="latest-entry-icon" aria-hidden="true">⌖</span><span class="latest-entry-copy"><strong>${escapeHtml(marker.name)}</strong><span>Trail Entrance · ${escapeHtml(marker.visibility || 'draft')}</span></span></button>`).join('');
        app.innerHTML = `<div class="screen home-and-entrances"><div class="page-header"><button class="ghost" onclick="window.renderFieldGuide('${encoded(project.id)}', true)">Back to Web Hub</button><p class="welcome-label">Physical-world preparation</p><h1>Visitor Entrances</h1><p class="subtitle">Add a guided beginning only when visitors need one.</p></div><section class="panel guide"><h2>Home is already available</h2><p>Home automatically holds anything that has not been assigned to an Area. A Visitor Entrance is optional and becomes a real-world gateway when it receives a GPS or QR anchor.</p></section><div class="latest-entry-list">${entranceRows || '<p class="project-empty-state">No Visitor Entrance has been added.</p>'}</div><div class="content-type-list"><button class="content-type-row" type="button" onclick="window.renderStartingPointForm('${encoded(project.id)}', '', 'trail-entrance')"><strong>${startingPoints.length ? 'Manage Visitor Entrance' : 'Create a Visitor Entrance'}</strong><span>Add GPS or a physical QR code to connect Explorer visitors to this place.</span></button></div></div>`;
    } catch (error) {
        app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectDashboard('${encoded(projectId)}')">Back</button><h1>Visitor Entrances unavailable</h1></div><div class="panel"><p>${escapeHtml(error.message)}</p></div></div>`;
    }
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
        const areas = context.places.filter(place => !isDefaultHomeArea(place));
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

function plantPhysicalAnchorCardMarkup(entry, profile, entries) {
    if (readPlatformSettings().physicalAnchors !== true) {
        return '<p class="meta plant-physical-anchor-unavailable"><button type="button" class="plant-profile-info-bubble" data-info-trigger data-info-source="plantPhysicalMarkerHelp" aria-expanded="false" aria-controls="plantPhysicalMarkerHelp" aria-label="About physical marker links" onclick="window.toggleInfoOverlay(this)">i</button><span id="plantPhysicalMarkerHelp" data-info-title="Physical marker link" hidden>Enable the Physical Marker prototype in Settings to connect a printed ArUco marker to this Plant Live Tag.</span></p>';
    }
    let savedPhysicalAnchor = null;
    try {
        savedPhysicalAnchor = normalizePhysicalAnchor(entry.marker.physicalAnchor);
    } catch {
        savedPhysicalAnchor = null;
    }
    const physicalValues = savedPhysicalAnchor || PHYSICAL_ANCHOR_DEFAULTS;
    const assignments = physicalAnchorAssignments(entries, entry.marker.id);
    const physicalMarkerOptions = PHYSICAL_ANCHOR_IDS.map(markerId => {
        const assignment = assignments.get(markerId);
        const status = assignment
            ? assignment.isCurrent
                ? 'Assigned to this Plant'
                : `Assigned to ${assignment.markerName}`
            : 'Available';
        return `<option value="${markerId}" ${markerId === Number(physicalValues.markerId) ? 'selected' : ''}>${physicalMarkerLabel(markerId)} — ${escapeHtml(status)}</option>`;
    }).join('');
    const selectedAssignment = assignments.get(Number(physicalValues.markerId));
    return `<details class="plant-physical-anchor-card" ${savedPhysicalAnchor ? 'open' : ''}>
        <summary><span><strong>Physical marker link</strong><small>Optional printed marker for this Plant Live Tag</small></span><b aria-hidden="true">⌗</b></summary>
        <div class="plant-physical-anchor-body">
            <p>When the Plant Live Tag is enabled, assign an ArUco marker here. Scanning it will show this Plant profile as a live tag.</p>
            <label class="tutorial-mode-toggle physical-anchor-toggle"><span><strong>Link ArUco marker</strong><small>Requires Plant Live Tag to be enabled.</small></span><input id="projectEntryPhysicalAnchorEnabled" type="checkbox" ${savedPhysicalAnchor ? 'checked' : ''} /></label>
            <div data-plant-physical-anchor-fields ${savedPhysicalAnchor ? '' : 'hidden'}>
                <div class="plant-physical-marker-layout">
                    <div class="totem-physical-marker-preview" data-plant-physical-marker-preview>${physicalMarkerSvg(physicalValues.markerId)}</div>
                    <div class="totem-physical-marker-controls">
                        <label for="projectEntryPhysicalMarkerId">Marker<select id="projectEntryPhysicalMarkerId">${physicalMarkerOptions}</select></label>
                        <p class="physical-marker-assignment-status" data-plant-physical-assignment>${selectedAssignment ? (selectedAssignment.isCurrent ? 'Assigned to this Plant' : `Assigned to ${escapeHtml(selectedAssignment.markerName)}`) : 'Available'}</p>
                        <label class="physical-marker-reassign" data-plant-physical-reassign ${selectedAssignment && !selectedAssignment.isCurrent ? '' : 'hidden'}><input id="projectEntryPhysicalMarkerReassign" type="checkbox" /> Reassign marker from <span>${escapeHtml(selectedAssignment?.markerName || '')}</span></label>
                        <label for="projectEntryPhysicalMarkerSize">Marker size <span class="input-with-unit"><input id="projectEntryPhysicalMarkerSize" type="number" min="1" step="1" value="${physicalValues.markerSizeMm}" /><b>mm</b></span></label>
                    </div>
                </div>
            </div>
        </div>
    </details>`;
}

function plantProfileEditorMarkup(entry, profile, physicalAnchorMarkup = '', projectId = '', returnToAr = false, returnContext = '') {
    const layerOptions = ['Emergent', 'Canopy', 'Understory', 'Shrub', 'Herbaceous', 'Groundcover', 'Root / rhizosphere', 'Climber / vine', 'Aquatic'].map(layer => `<option value="${layer}" ${profile.layer === layer ? 'selected' : ''}>${layer}</option>`).join('');
    const photo = profile.photo || profile.image || '';
    const spmEnabled = profile.spm_enabled === true || profile.profile_enabled === true;
    return `<section class="plant-encyclopedia-card">
        <input id="projectEntryProfileEnabled" type="hidden" value="${spmEnabled ? 'true' : 'false'}">
        <div class="plant-card-hero">
            <div class="plant-photo-column">
                <div class="plant-photo-space" data-plant-photo-preview>${photo ? `<img src="${escapeHtml(photo)}" alt="${escapeHtml(entry.marker.name)}" />` : '<span aria-hidden="true">🌿</span><small>Add a plant photo</small>'}</div>
                <input id="projectEntryPhotoData" type="hidden" value="${escapeHtml(photo)}" />
                <label class="plant-photo-upload" for="projectEntryPhoto">Upload plant photo<input id="projectEntryPhoto" type="file" accept="image/*" /></label>
                <button type="button" class="plant-photo-remove" data-remove-plant-photo ${photo ? '' : 'hidden'}>Remove photo</button>
                <p class="plant-photo-status" data-plant-photo-status aria-live="polite"></p>
            </div>
            <div class="plant-vital-grid">
                <div class="field plant-orb-size-control"><label for="projectEntryOrbSize">Orb size</label><select id="projectEntryOrbSize"><option value="small" ${profile.orb_size === 'small' ? 'selected' : ''}>Small</option><option value="medium" ${!profile.orb_size || profile.orb_size === 'medium' ? 'selected' : ''}>Medium</option><option value="large" ${profile.orb_size === 'large' ? 'selected' : ''}>Large</option></select></div>
                <div class="field"><label for="projectEntryCommonName">Common name</label><input id="projectEntryCommonName" value="${escapeHtml(profile.common_name || entry.marker.name)}" oninput="document.getElementById('projectEntryName').value=this.value" /></div>
                <div class="field"><label for="projectEntryScientificName">Scientific name</label><input id="projectEntryScientificName" value="${escapeHtml(profile.scientific_name || '')}" /></div>
                <div class="field"><label for="projectEntryLayer">Forest layer</label><select id="projectEntryLayer"><option value="">Choose layer</option>${layerOptions}</select></div>
                <div class="field"><label for="projectEntryClimate">Climate</label><input id="projectEntryClimate" value="${escapeHtml(profile.climate || '')}" placeholder="Warm temperate, tropical…" /></div>
                <section class="plant-profile-spm-toggle plant-profile-spm-toggle--inline" aria-labelledby="plantSpmTitle">
                    <div class="plant-spm-toggle-line">
                        <label class="plant-spm-toggle-label" for="projectEntrySpmEnabled"><strong id="plantSpmTitle">ACTIVATE INFO MESH</strong><input id="projectEntrySpmEnabled" type="checkbox" ${spmEnabled ? 'checked' : ''} /></label>
                        <button class="plant-profile-info-bubble" type="button" data-spm-info data-info-trigger data-info-source="plantSpmHelp" aria-expanded="false" aria-controls="plantSpmHelp" aria-label="About Info Mesh">i</button>
                    </div>
                    <p id="plantSpmHelp" class="plant-spm-help" hidden>Info Mesh opens an expandable information diagram shared by Web Mode and AR.</p>
                </section>
                <div class="field plant-area-field"><label for="projectEntryAreaOverview">Area</label><select id="projectEntryAreaOverview" onchange="document.getElementById('projectEntryArea').value=this.value"></select></div>
            </div>
        </div>
        <div id="projectEntrySpmFields" class="plant-profile-spm-fields" ${spmEnabled ? '' : 'hidden'}>
        <section class="plant-qr-anchor-card plant-virtual-tag-card"><span aria-hidden="true">▦</span><div><div class="plant-live-tag-heading"><strong>PLANT LIVE TAG</strong><button type="button" class="plant-profile-info-bubble" data-info-trigger data-info-source="plantLiveTagHelp" aria-expanded="false" aria-controls="plantLiveTagHelp" aria-label="About Plant Live Tags" onclick="window.toggleInfoOverlay(this)">i</button></div><p id="plantLiveTagHelp" data-info-title="Plant Live Tag" hidden>Prepare this Plant profile to become a scannable garden tag that opens its Web Hub profile.</p><label class="ar-inline-checkbox" for="projectEntryVirtualTag"><input id="projectEntryVirtualTag" type="checkbox" ${profile.virtual_tag_enabled === true ? 'checked' : ''} /> <span>Make this Plant a Plant Live Tag</span></label>${physicalAnchorMarkup}</div></section>
        </div>
        <div class="plant-profile-pim-cta"><div><strong>Plant Information Mesh</strong><small>Open the expandable plant knowledge workspace shared by Web Mode and AR.</small></div><button type="button" class="plant-profile-pim-open" onclick="window.openProjectPim('${encoded(projectId)}','${encoded(entry.marker.id)}',${Boolean(returnToAr)},'${encoded(returnContext)}')">Open Info Mesh</button></div>
    </section>`;
}

function plantProfileId(project, marker) {
    return String(marker?.plant_code || marker?.id || `${project?.id || 'project'}-plant`).trim();
}

function plantProfileStatsMarkup(project, entry, profile, editableColor = false) {
    const color = /^#[0-9a-f]{6}$/i.test(profile.orb_color || entry.marker.appearance?.color || '')
        ? profile.orb_color || entry.marker.appearance.color
        : '#5e7956';
    const spmEnabled = profile.spm_enabled === true || profile.profile_enabled === true;
    return `<section class="plant-profile-stats" aria-label="Plant vital stats">
        <div class="plant-profile-stat-color"><small>PLANT COLOR</small><strong>${editableColor ? `<input id="projectEntryOrbColor" type="color" value="${escapeHtml(color)}" aria-label="Plant color" /><span>${color}</span>` : `<i style="--plant-profile-color:${color}" aria-hidden="true"></i>${color}`}</strong></div>
        <div><small>MARKER TYPE</small><strong>PLANT</strong></div>
        <div><small>NUMBER</small><strong>${escapeHtml(plantProfileId(project, entry.marker))}</strong></div>
        <div><small>INFO MESH</small><strong>${spmEnabled ? 'ACTIVE' : 'OFF'}</strong></div>
    </section>`;
}

function plantProfileHeaderMarkup(project, entry, placement, profile) {
    // The legacy plant-profile-ar-button is intentionally not rendered: a profile has no reliable AR area context.
    const displayName = profile.common_name || entry.marker.name || 'Unnamed plant';
    const areaLabel = displayAreaName(entry.place);
    const projectAction = `window.renderProjectDashboard('${encoded(project.id)}')`;
    const areaAction = `window.renderProjectAreaDashboard('${encoded(project.id)}','${encoded(entry.place.id)}')`;
    const areaSegment = `<button type="button" onclick="${isDefaultHomeArea(entry.place) ? `window.renderProjectHome('${encoded(project.id)}')` : areaAction}">${escapeHtml(areaLabel)}</button>`;
    return `<header class="plant-profile-header">
        <div class="plant-profile-heading">
            <p class="plant-profile-kicker">PLANT PROFILE</p>
            <h1>${escapeHtml(displayName)}</h1>
            <nav class="plant-profile-location" aria-label="Plant location"><button type="button" onclick="${projectAction}">${escapeHtml(project.name)}</button><span aria-hidden="true">/</span>${areaSegment}<span aria-hidden="true">/</span><strong>${escapeHtml(plantProfileId(project, entry.marker))}</strong></nav>
        </div>
    </header>`;
}

export async function openProjectEntry(app, encodedProjectId, encodedMarkerId, returnToAr = false, returnContext = '', pimInitialState = null) {
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const { project, site, places, entries } = await projectContent(projectId);
    const entry = entries.find(item => item.marker.id === markerId);
    if (!entry) throw new Error('Entry not found.');
    const [placement] = await entriesWithPlacement(project, site, [entry]);
    const plant = entry.marker.type === 'plant';
    const quickArPlantEdit = returnToAr && plant;
    const markerAnchor = plant ? await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id).catch(() => null) : null;
    const plantQrCode = plant ? visibleQrCode(entry.marker.qr_reference || markerAnchor?.qr_code) : '';
    const profile = plant ? await loadPlantProfile(project.id, site.id, entry.place.id, entry.marker.id).catch(() => entry.marker.plant_profile || {}) : {};
    const routeFromUrl = plant && typeof location !== 'undefined' ? pimRouteFromUrl(location.href) : {};
    const pimWorkspace = plant && (pimInitialState?.workspace === 'pim' || (routeFromUrl.path && (!routeFromUrl.markerId || routeFromUrl.markerId === entry.marker.id)));
    const pimIdentity = plant ? {
        plantId: entry.marker.plantId || entry.marker.id,
        commonName: profile.common_name || entry.marker.name || 'Unnamed plant',
        scientificName: profile.scientific_name || '',
        identityStatement: profile.overview || entry.marker.description || '',
        image: profile.photo || profile.image || '',
        cultivar: profile.cultivar || '',
        synonyms: profile.synonyms || [],
        regionalNames: profile.regional_names || profile.regionalNames || []
    } : null;
    let activePimDocument = plant ? initialPlantPimDocument(profile, pimIdentity) : null;
    let activePimImportReview = plant ? profile.pim_import_review || profile.pim_import_staging || null : null;
    const plantPhysicalAnchorMarkup = plant ? plantPhysicalAnchorCardMarkup(entry, profile, entries) : '';
    const areaOptions = places.map(place => `<option value="${escapeHtml(place.id)}" ${place.id === entry.place.id ? 'selected' : ''}>${escapeHtml(place.name)}</option>`).join('');
    const returnArLabel = 'AR';
    const returnArCopy = plant
        ? 'Take your time with this Plant. Back to AR returns directly to the same Area with this orb open.'
        : 'Take your time with this information. Back to AR returns directly to the same Area and Marker.';
    const returnArAction = returnToAr ? `<button class="global-ar-action ar-portal" type="button" aria-label="Return to AR with ${escapeHtml(entry.marker.name)}" onclick="window.startArMode('${encoded(project.id)}', '${encoded(entry.place.id)}', '', '', '${encoded(entry.marker.id)}', 'web-marker:${encoded(entry.marker.id)}', '${encoded(site?.id || '')}')">${returnArLabel}</button>` : '';
    const arHandoff = returnToAr ? `<aside class="ar-web-handoff" aria-label="Return to augmented reality"><div><strong>WEB MODE</strong><p>${returnArCopy}</p></div>${returnArAction}</aside>` : '';
    const specialMarkerEditor = entry.marker.type === 'sub_checkpoint' ? `<div class="field"><label for="projectEntrySpecialSymbol">Marker symbol</label><select id="projectEntrySpecialSymbol"><option value="" ${entry.marker.special_symbol ? '' : 'selected'}>Standard checkpoint</option>${[['↑', 'Arrow up'], ['→', 'Arrow right'], ['↓', 'Arrow down'], ['←', 'Arrow left'], ['!', 'Exclamation point'], ['?', 'Question mark']].map(([symbol, label]) => `<option value="${symbol}" ${entry.marker.special_symbol === symbol ? 'selected' : ''}>${label}</option>`).join('')}</select></div>` : '';
    const noteColor = /^#[0-9a-f]{6}$/i.test(entry.marker.appearance?.color || '') ? entry.marker.appearance.color : '#d7834f';
    const noteSurface = entry.marker.appearance?.surface === 'outline' ? 'outline' : 'filled';
    const noteOpacity = [1, .8, .6, .4].includes(Number(entry.marker.appearance?.opacity)) ? Number(entry.marker.appearance.opacity) : 1;
    const noteAppearanceEditor = entry.marker.type === 'note' ? `<div class="field note-color-field"><label for="projectEntryNoteColor">Note board colour</label><input id="projectEntryNoteColor" type="color" value="${noteColor}" /><label for="projectEntryNoteSurface">Board style</label><select id="projectEntryNoteSurface"><option value="filled" ${noteSurface === 'filled' ? 'selected' : ''}>Filled color</option><option value="outline" ${noteSurface === 'outline' ? 'selected' : ''}>Transparent with color outline</option></select><label for="projectEntryNoteOpacity">Opacity</label><select id="projectEntryNoteOpacity"><option value="1" ${noteOpacity === 1 ? 'selected' : ''}>100% · Solid</option><option value="0.8" ${noteOpacity === .8 ? 'selected' : ''}>80%</option><option value="0.6" ${noteOpacity === .6 ? 'selected' : ''}>60%</option><option value="0.4" ${noteOpacity === .4 ? 'selected' : ''}>40%</option></select><small>Use a filled board for emphasis or a transparent board when the landscape should remain visible.</small></div>` : '';
    const quickPlantColor = profile.orb_color || entry.marker.appearance?.color || '#5e7956';
    const quickPlantTones = TOTEM_TONES.map(tone => `<button type="button" data-plant-quick-tone="${tone.color}" aria-label="${tone.label} plant tone" aria-pressed="${tone.color.toLowerCase() === quickPlantColor.toLowerCase()}" style="--plant-quick-tone:${tone.color}"><span aria-hidden="true"></span><small>${tone.label}</small></button>`).join('');
    const quickPlantFields = quickArPlantEdit ? `<input id="projectEntryArQuickEdit" type="hidden" value="true" /><input id="projectEntryProfileEnabled" type="hidden" value="true" /><input id="projectEntryName" type="hidden" value="${escapeHtml(profile.common_name || entry.marker.name)}" />
        <section class="plant-ar-quick-editor" aria-labelledby="plantArQuickTitle"><div><p class="welcome-label">QUICK EDIT</p><h2 id="plantArQuickTitle">Plant profile</h2></div>
        <div class="plant-ar-quick-fields"><label for="projectEntryCommonName">Common name<input id="projectEntryCommonName" value="${escapeHtml(profile.common_name || entry.marker.name)}" oninput="document.getElementById('projectEntryName').value=this.value" required /></label><label for="projectEntryScientificName">Scientific name<input id="projectEntryScientificName" value="${escapeHtml(profile.scientific_name || '')}" /></label><div class="plant-ar-quick-tone"><label for="projectEntryOrbColor">Plant tone</label><div class="plant-ar-quick-tones">${quickPlantTones}</div><label class="plant-ar-custom-tone" for="projectEntryOrbColor"><span>Custom</span><input id="projectEntryOrbColor" type="color" value="${escapeHtml(quickPlantColor)}" /></label></div></div></section>`
        : '';
    const plantPrintAction = plant && profile.virtual_tag_enabled === true && entry.marker.physicalAnchor?.enabled
        ? `<button type="button" class="plant-print-action" onclick="window.printPlantVirtualTag('${encoded(project.id)}','${encoded(site.id)}','${encoded(entry.place.id)}','${encoded(entry.marker.id)}')">PRINT PLANT LIVE TAG</button>`
        : '';
    const plantEditorFields = `<input id="projectEntryName" type="hidden" value="${escapeHtml(profile.common_name || entry.marker.name)}" /><input id="projectEntryArea" type="hidden" value="${escapeHtml(entry.place.id)}" />${plantProfileEditorMarkup(entry, profile, plantPhysicalAnchorMarkup, project.id, returnToAr, returnContext)}<details class="plant-qr-anchor-card plant-profile-link-card"><summary><span aria-hidden="true">▦</span><span><strong>Physical label link</strong><small>Optional QR code for this Plant</small></span></summary><div><label for="projectEntryQrCode">Plant QR code</label><input id="projectEntryQrCode" value="${escapeHtml(plantQrCode)}" placeholder="Scan or enter the code on this Plant label" />${plantPrintAction}</div></details>`;
    const standardEditorFields = quickArPlantEdit ? '' : plant ? plantEditorFields : `<div class="field"><label for="projectEntryName">${entry.marker.type === 'note' ? 'Title' : 'Rename'}</label><input id="projectEntryName" value="${escapeHtml(entry.marker.name)}" required /></div><div class="field"><label for="projectEntryArea">Move to Area</label><select id="projectEntryArea">${areaOptions}</select></div>${specialMarkerEditor}${noteAppearanceEditor}<div class="field"><label for="projectEntryDescription">${entry.marker.type === 'note' ? 'Information' : 'Description'}</label><textarea id="projectEntryDescription" rows="4">${escapeHtml(entry.marker.description || entry.marker.notes || '')}</textarea></div>`;
    const entryContextName = displayAreaName(entry.place);
    const entryIsHome = isDefaultHomeArea(entry.place);
    const webReturnAction = plant
        ? `window.renderProjectHome('${encoded(project.id)}')`
        : entryIsHome
            ? `window.renderProjectDashboard('${encoded(project.id)}')`
            : `window.renderProjectAreaDashboard('${encoded(project.id)}','${encoded(entry.place.id)}')`;
    const webReturnLabel = plant ? 'BACK' : entryIsHome ? 'Back to Home' : `Back to ${escapeHtml(entryContextName)}`;
    const plantProfileBackButton = plant ? `<button class="ghost project-entry-back-button" type="button" onclick="${webReturnAction}">${webReturnLabel}</button>` : '';
    const pimBackButton = plant ? `<button class="ghost project-entry-back-button" type="button" onclick="window.openProjectEntry('${encoded(project.id)}','${encoded(entry.marker.id)}',${Boolean(returnToAr)},'${encoded(returnContext)}')">Back to Plant Profile</button>` : '';
    const entryHeader = plant
        ? `${plantProfileHeaderMarkup(project, { ...entry, site }, placement, profile)}${plantProfileStatsMarkup(project, entry, profile, !quickArPlantEdit && !pimWorkspace)}`
        : `<div class="web-context-beacon ${entryIsHome ? 'is-home' : 'is-area'}"><span>${entryIsHome ? 'UNASSIGNED WORKSPACE' : 'WORKING IN AREA'}</span><strong>${escapeHtml(entryContextName)}</strong></div><div class="page-header"><p class="welcome-label">${markerTypeLabel(entry.marker.type)} · Web Mode</p><h1>${escapeHtml(entry.marker.name)}</h1><p class="subtitle">${escapeHtml(entryContextName)} · ${placement.isPlaced ? 'Placed' : 'Not placed'}</p>${projectBreadcrumbMarkup(project, entry.place, entry.marker.name)}</div>`;
    const placementStatus = plant ? '' : `<p class="placement-status ${placement.isPlaced ? 'is-placed' : 'is-unplaced'}">Placement: ${placement.isPlaced ? 'Placed' : 'Not placed'}</p>`;
    const placeButton = !plant && !quickArPlantEdit && !placement.isPlaced ? `<button class="global-ar-action ar-square-action" type="button" aria-label="Place ${escapeHtml(entry.marker.name)} in AR" onclick="window.renderArPreparation('${encoded(project.id)}', 'existing-placement', '${encoded(entry.marker.id)}', '${encoded(entry.place.id)}', '${encoded(site?.id || '')}')">AR</button>` : '';
    const profileScreen = `<form class="panel" onsubmit="window.saveProjectEntryChanges(event, '${encoded(project.id)}', '${encoded(entry.marker.id)}', ${returnToAr}, '${encoded(returnContext)}')">${quickPlantFields}${standardEditorFields}${placementStatus}<p id="projectEntryEditStatus" class="meta"></p><div class="button-row${plant ? ' plant-profile-action-row' : ''}">${placeButton}<button class="primary" type="submit">${quickArPlantEdit ? 'Save' : plant ? 'Save' : 'Save changes'}</button>${plantProfileBackButton}${quickArPlantEdit ? '' : `<button class="danger" type="button" onclick="window.deleteProjectEntry('${encoded(project.id)}','${encoded(entry.marker.id)}')">Delete</button>`}</div></form>`;
    const pimScreen = `<section class="plant-pim-workspace" aria-label="Plant Information Mesh workspace"><header class="plant-pim-workspace-header"><div><p class="welcome-label">PLANT KNOWLEDGE</p><h2>Plant Information Mesh</h2><p>Explore, edit and connect the same plant knowledge used by Web Mode and AR.</p></div><div class="plant-pim-workspace-actions">${pimBackButton}${returnToAr ? returnArAction : ''}</div></header><div class="plant-pim-workspace-mount" data-plant-pim-web-mount></div></section>`;
    const entryWorkspace = pimWorkspace ? pimScreen : profileScreen;
    app.innerHTML = `<div class="screen project-entry-editor${entry.marker.type === 'note' ? ' note-record-editor' : ''}${returnToAr ? ' is-ar-web-handoff' : ''}${quickArPlantEdit ? ' plant-ar-quick-edit' : ''}${pimWorkspace ? ' is-pim-workspace' : ''}">${entryHeader}${arHandoff}${entryWorkspace}${plant && pimWorkspace ? '' : plant ? '' : `<nav class="bottom-navigation">${returnToAr ? '' : returnArAction}<button class="ghost" type="button" onclick="${webReturnAction}">${returnToAr ? `Stay in Web Mode · ${escapeHtml(entryContextName)}` : webReturnLabel}</button></nav>`}</div>`;
    if (quickArPlantEdit) {
        const quickSaveButton = app.querySelector('.project-entry-editor button.primary');
        const quickReturnButton = app.querySelector('.project-entry-back-button') || app.querySelector('.project-entry-editor .bottom-navigation .ghost');
        const contextBeacon = app.querySelector('.project-entry-editor .web-context-beacon');
        if (quickSaveButton) quickSaveButton.textContent = 'SAVE';
        if (quickReturnButton) {
            quickReturnButton.textContent = returnToAr ? 'BACK TO AR' : 'BACK';
            quickReturnButton.onclick = returnToAr
                ? () => window.startArMode(encoded(project.id), encoded(entry.place.id), '', '', encoded(entry.marker.id), `web-marker:${encoded(entry.marker.id)}`, encoded(site?.id || ''))
                : () => window.renderProjectHome(encoded(project.id));
        }
        if (entryIsHome && contextBeacon) {
            const label = contextBeacon.querySelector('span');
            if (label) label.textContent = 'PROJECT HOME';
        }
    }
    if (!plant && (returnContext === 'field-guide' || returnContext === 'webhub')) {
        const backButton = app.querySelector('.project-entry-back-button') || app.querySelector('.bottom-navigation .ghost');
        if (backButton) {
            backButton.textContent = 'Back to Web Hub';
            backButton.onclick = () => window.renderFieldGuide(encoded(project.id), true);
        }
    }
    if (plant) {
        app.querySelector('form')?.classList.add('plant-file-form');
        const virtualTagToggle = app.querySelector('#projectEntryVirtualTag');
        const plantPhysicalToggle = app.querySelector('#projectEntryPhysicalAnchorEnabled');
        const plantPhysicalSelect = app.querySelector('#projectEntryPhysicalMarkerId');
        const spmToggle = app.querySelector('#projectEntrySpmEnabled');
        const spmFields = app.querySelector('#projectEntrySpmFields');
        const profileEnabledField = app.querySelector('#projectEntryProfileEnabled');
        let pimWebController = null;
        const pimInitialRouteState = pimInitialState || (routeFromUrl.path && (!routeFromUrl.markerId || routeFromUrl.markerId === entry.marker.id) ? { path: routeFromUrl.path } : {});
        const savePimDocument = async nextDocument => {
            activePimDocument = normalizePimDocument(nextDocument);
            await savePlantProfile(project.id, site.id, entry.place.id, entry.marker.id, {
                ...profile,
                profile_enabled: true,
                spm_enabled: true,
                pim_document: activePimDocument
            });
            return activePimDocument;
        };
        const mountInfoMesh = () => {
            const mount = app.querySelector('[data-plant-pim-web-mount]');
            if (!mount || !activePimDocument || (!pimWorkspace && !spmToggle?.checked)) return;
            pimWebController?.destroy();
            mount.hidden = false;
            pimWebController = mountPlantInformationWeb(mount, {
                document: activePimDocument,
                editable: true,
                showSearch: false,
                showIdentity: pimWorkspace,
                importReview: activePimImportReview,
                initialState: pimInitialRouteState,
                onRouteChange: (state, node) => {
                    if (!node || typeof history === 'undefined' || typeof history.replaceState !== 'function') return;
                    const routeUrl = pimRouteUrl({
                        projectId: project.id,
                        siteId: site.id,
                        placeId: entry.place.id,
                        markerId: entry.marker.id,
                        slug: pimSlug(activePimDocument.identity?.commonName),
                        path: node.path
                    });
                    history.replaceState(null, '', `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`);
                },
                onSaveDocument: savePimDocument,
                onApproveImport: async item => {
                    const nextReview = reviewPimImport(activePimImportReview, item?.id || item?.itemId, 'approve');
                    activePimImportReview = nextReview;
                    if (nextReview?.document) {
                        activePimDocument = normalizePimDocument(nextReview.document);
                        await savePimDocument(activePimDocument);
                    }
                    return activePimDocument;
                },
                onRejectImport: async item => {
                    activePimImportReview = reviewPimImport(activePimImportReview, item?.id || item?.itemId, 'reject');
                    return activePimDocument;
                },
                onModifyImport: () => undefined
            });
        };
        const updateSpmFields = () => {
            const enabled = pimWorkspace || Boolean(spmToggle?.checked);
            spmFields?.toggleAttribute('hidden', !enabled);
            if (profileEnabledField) profileEnabledField.value = enabled ? 'true' : 'false';
            if (enabled) mountInfoMesh();
            else {
                pimWebController?.destroy();
                pimWebController = null;
            }
        };
        const plantAssignments = physicalAnchorAssignments(entries, entry.marker.id);
        const updatePlantPhysicalFields = () => {
            const visible = Boolean(virtualTagToggle?.checked && plantPhysicalToggle?.checked);
            app.querySelector('[data-plant-physical-anchor-fields]')?.toggleAttribute('hidden', !visible);
        };
        const updatePlantPhysicalAssignment = () => {
            if (!plantPhysicalSelect) return;
            const assignment = plantAssignments.get(Number(plantPhysicalSelect.value));
            const status = app.querySelector('[data-plant-physical-assignment]');
            const reassign = app.querySelector('[data-plant-physical-reassign]');
            if (status) status.textContent = assignment
                ? assignment.isCurrent ? 'Assigned to this Plant' : `Assigned to ${assignment.markerName}`
                : 'Available';
            if (reassign) reassign.hidden = !assignment || assignment.isCurrent;
            const name = reassign?.querySelector('span');
            if (name) name.textContent = assignment?.markerName || '';
            const confirm = app.querySelector('#projectEntryPhysicalMarkerReassign');
            if (confirm) confirm.checked = false;
            const preview = app.querySelector('[data-plant-physical-marker-preview]');
            if (preview) preview.innerHTML = physicalMarkerSvg(Number(plantPhysicalSelect.value));
        };
        virtualTagToggle?.addEventListener('change', updatePlantPhysicalFields);
        plantPhysicalToggle?.addEventListener('change', updatePlantPhysicalFields);
        plantPhysicalSelect?.addEventListener('change', updatePlantPhysicalAssignment);
        spmToggle?.addEventListener('change', updateSpmFields);
        if (pimWorkspace) mountInfoMesh();
        else updateSpmFields();
        updatePlantPhysicalFields();
        const spmInfo = app.querySelector('[data-spm-info]');
        spmInfo?.addEventListener('click', () => window.toggleInfoOverlay?.(spmInfo));
        const quickColorInput = document.getElementById('projectEntryOrbColor');
        const syncQuickPlantTones = color => {
            app.querySelectorAll('[data-plant-quick-tone]').forEach(button => {
                button.setAttribute('aria-pressed', button.dataset.plantQuickTone.toLowerCase() === color.toLowerCase() ? 'true' : 'false');
            });
        };
        app.querySelectorAll('[data-plant-quick-tone]').forEach(button => {
            button.addEventListener('click', () => {
                if (!quickColorInput) return;
                quickColorInput.value = button.dataset.plantQuickTone;
                syncQuickPlantTones(quickColorInput.value);
            });
        });
        quickColorInput?.addEventListener('input', () => syncQuickPlantTones(quickColorInput.value));
        const overviewArea = document.getElementById('projectEntryAreaOverview');
        if (overviewArea) {
            overviewArea.innerHTML = areaOptions;
            overviewArea.value = entry.place.id;
        }
        const plantPhotoInput = app.querySelector('#projectEntryPhoto');
        const plantPhotoData = app.querySelector('#projectEntryPhotoData');
        const plantPhotoPreview = app.querySelector('[data-plant-photo-preview]');
        const plantPhotoRemove = app.querySelector('[data-remove-plant-photo]');
        const plantPhotoStatus = app.querySelector('[data-plant-photo-status]');
        const renderPlantPhotoPreview = photoValue => {
            if (plantPhotoPreview) plantPhotoPreview.innerHTML = photoValue
                ? `<img src="${escapeHtml(photoValue)}" alt="${escapeHtml(profile.common_name || entry.marker.name)}" />`
                : '<span aria-hidden="true">🌿</span><small>Add a plant photo</small>';
            if (plantPhotoRemove) plantPhotoRemove.hidden = !photoValue;
        };
        plantPhotoInput?.addEventListener('change', async () => {
            const file = plantPhotoInput.files?.[0];
            if (!file) return;
            if (!String(file.type || '').startsWith('image/')) {
                plantPhotoInput.value = '';
                if (plantPhotoStatus) plantPhotoStatus.textContent = 'Choose an image file.';
                return;
            }
            plantPhotoInput.dataset.processing = 'true';
            if (plantPhotoStatus) plantPhotoStatus.textContent = 'Preparing photo…';
            try {
                const photoValue = await compressedPlantImage(file);
                if (plantPhotoData) plantPhotoData.value = photoValue;
                renderPlantPhotoPreview(photoValue);
                if (plantPhotoStatus) plantPhotoStatus.textContent = 'Photo ready to save with this Plant Profile.';
            } catch (error) {
                if (plantPhotoStatus) plantPhotoStatus.textContent = `Photo could not be prepared: ${error.message}`;
            } finally {
                delete plantPhotoInput.dataset.processing;
            }
        });
        plantPhotoRemove?.addEventListener('click', () => {
            plantPhotoInput.value = '';
            if (plantPhotoData) plantPhotoData.value = '';
            renderPlantPhotoPreview('');
            if (plantPhotoStatus) plantPhotoStatus.textContent = 'Photo removed. Save the Plant Profile to confirm.';
        });
    }
}

export async function saveProjectEntryChanges(event, encodedProjectId, encodedMarkerId, returnToAr = false, encodedReturnContext = '') {
    event.preventDefault();
    const projectId = decodeURIComponent(encodedProjectId);
    const markerId = decodeURIComponent(encodedMarkerId);
    const status = document.getElementById('projectEntryEditStatus');
    try {
        if (document.getElementById('projectEntryPhoto')?.dataset.processing === 'true') {
            if (status) status.textContent = 'Please wait for the plant photo to finish preparing.';
            return;
        }
        status.textContent = 'Saving…';
        const { project, site, entries } = await projectContent(projectId);
        const entry = entries.find(item => item.marker.id === markerId);
        if (!entry) throw new Error('Entry not found.');
        const fieldValue = (id, fallback = '') => {
            const field = document.getElementById(id);
            return field ? field.value.trim() : fallback;
        };
        const quickArPlantEdit = entry.marker.type === 'plant' && document.getElementById('projectEntryArQuickEdit')?.value === 'true';
        const name = fieldValue('projectEntryName', entry.marker.name);
        const description = fieldValue('projectEntryDescription', entry.marker.description || entry.marker.notes || '');
        const targetAreaId = document.getElementById('projectEntryArea')?.value || entry.place.id;
        const specialSymbol = document.getElementById('projectEntrySpecialSymbol')?.value;
        const noteColor = document.getElementById('projectEntryNoteColor')?.value;
        const noteSurface = document.getElementById('projectEntryNoteSurface')?.value;
        const noteOpacity = document.getElementById('projectEntryNoteOpacity')?.value;
        const noteAppearance = noteColor ? { appearance: { ...(entry.marker.appearance || {}), color: noteColor, opacity: Number(noteOpacity || 1), surface: noteSurface === 'outline' ? 'outline' : 'filled' } } : {};
        const spmEnabled = entry.marker.type === 'plant' && (document.getElementById('projectEntryArQuickEdit')?.value === 'true' || document.getElementById('projectEntrySpmEnabled')?.checked === true);
        const plantProfileFormPresent = entry.marker.type === 'plant' && Boolean(document.getElementById('projectEntryCommonName'));
        const profileEnabled = entry.marker.type === 'plant' && (spmEnabled || document.getElementById('projectEntryProfileEnabled')?.value === 'true');
        const plantColor = entry.marker.type === 'plant' ? document.getElementById('projectEntryOrbColor')?.value : '';
        const plantAppearance = plantColor ? { appearance: { ...(entry.marker.appearance || {}), color: plantColor } } : {};
        const virtualTagEnabled = profileEnabled && (document.getElementById('projectEntryVirtualTag')?.checked ?? false);
        const plantPhysicalAnchorControlPresent = entry.marker.type === 'plant' && Boolean(document.getElementById('projectEntryPhysicalAnchorEnabled'));
        const plantPhysicalAnchor = plantPhysicalAnchorControlPresent && virtualTagEnabled ? physicalAnchorFromPlantProfileForm() : null;
        const plantPhysicalReassign = Boolean(document.getElementById('projectEntryPhysicalMarkerReassign')?.checked);
        if (plantPhysicalAnchor) {
            const assignment = physicalAnchorAssignments(entries, entry.marker.id).get(plantPhysicalAnchor.markerId);
            if (assignment && !assignment.isCurrent && !plantPhysicalReassign) {
                throw new Error(`${plantPhysicalAnchor.markerLabel} is already assigned to ${assignment.markerName}. Confirm marker reassignment first.`);
            }
        }
        const qrField = document.getElementById('projectEntryQrCode');
        const manageQrAnchor = profileEnabled && Boolean(qrField);
        const qrCode = manageQrAnchor ? qrField.value.trim() : entry.marker.qr_reference || '';
        const sourceAnchor = manageQrAnchor ? await loadMarkerAnchor(project.id, site.id, entry.place.id, entry.marker.id).catch(() => null) : null;
        const existingPlantProfile = plantProfileFormPresent
            ? await loadPlantProfile(project.id, site.id, entry.place.id, entry.marker.id).catch(() => entry.marker.plant_profile || {})
            : {};
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
                ...plantAppearance,
                ...(plantPhysicalAnchorControlPresent ? { physicalAnchor: virtualTagEnabled ? plantPhysicalAnchor : null, reassignPhysicalMarker: plantPhysicalReassign } : {}),
                notes: entry.marker.type === 'note' ? description : entry.marker.notes || ''
            });
            savedMarker = response.marker || response;
            if (entry.marker.type === 'plant') {
                if (isPlantProfileUpgraded(entry.marker, existingPlantProfile)) {
                    await savePlantProfile(project.id, site.id, targetAreaId, savedMarker.id, existingPlantProfile);
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
                ...plantAppearance,
                ...(plantPhysicalAnchorControlPresent ? { physicalAnchor: virtualTagEnabled ? plantPhysicalAnchor : null, reassignPhysicalMarker: plantPhysicalReassign } : {}),
                notes: entry.marker.type === 'note' ? description : entry.marker.notes || ''
            });
        }
        savedMarker = savedMarker?.marker || savedMarker;
        if (manageQrAnchor) {
            const movableAnchor = targetAreaId !== entry.place.id && sourceAnchor
                ? { ...sourceAnchor, position: null, spatial_position: null }
                : undefined;
            await syncMarkerQrAnchor(project.id, site.id, targetAreaId, savedMarker.id, qrCode, `Physical QR label for ${name}.`, movableAnchor);
        }
        if (plantProfileFormPresent) {
            const nextPlantProfile = {
                ...existingPlantProfile,
                profile_enabled: spmEnabled,
                spm_enabled: spmEnabled,
                common_name: fieldValue('projectEntryCommonName', existingPlantProfile.common_name || name) || name,
                scientific_name: fieldValue('projectEntryScientificName', existingPlantProfile.scientific_name || ''),
                climate: fieldValue('projectEntryClimate', existingPlantProfile.climate || ''),
                family: existingPlantProfile.family || '',
                origin: existingPlantProfile.origin || '',
                layer: fieldValue('projectEntryLayer', existingPlantProfile.layer || ''),
                photo: document.getElementById('projectEntryPhotoData')?.value || existingPlantProfile.photo || existingPlantProfile.image || '',
                orb_color: plantColor || existingPlantProfile.orb_color || entry.marker.appearance?.color || '#5e7956',
                orb_size: fieldValue('projectEntryOrbSize', existingPlantProfile.orb_size || 'medium'),
                uses: existingPlantProfile.uses || '',
                relationships: existingPlantProfile.relationships || existingPlantProfile.companions || '',
                attribute_chain_count: existingPlantProfile.attribute_chain_count ?? '',
                propagation: existingPlantProfile.propagation || '',
                overview: existingPlantProfile.overview || entry.marker.description || '',
                virtual_tag_enabled: document.getElementById('projectEntryVirtualTag')?.checked ?? existingPlantProfile.virtual_tag_enabled === true
            };
            if (profileEnabled) {
                const nextPimIdentity = {
                    plantId: entry.marker.plantId || savedMarker.id,
                    commonName: nextPlantProfile.common_name,
                    scientificName: nextPlantProfile.scientific_name,
                    identityStatement: nextPlantProfile.overview,
                    image: nextPlantProfile.photo,
                    cultivar: nextPlantProfile.cultivar || '',
                    synonyms: nextPlantProfile.synonyms || [],
                    regionalNames: nextPlantProfile.regional_names || nextPlantProfile.regionalNames || []
                };
                nextPlantProfile.pim_document = initialPlantPimDocument(nextPlantProfile, nextPimIdentity);
            }
            await savePlantProfile(project.id, site.id, targetAreaId, savedMarker.id, nextPlantProfile);
        }
        await openProjectEntry(document.getElementById('app'), encoded(project.id), encoded(savedMarker.id), returnToAr, decodeURIComponent(encodedReturnContext || ''));
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
    if (isDefaultHomeArea(entry.place)) {
        await renderUnplacedContent(document.getElementById('app'), encoded(project.id));
    } else {
        await renderProjectAreaDashboard(document.getElementById('app'), encoded(project.id), encoded(entry.place.id));
    }
}
