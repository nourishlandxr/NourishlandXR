import { SiteManager } from './managers/siteManager.js';
import { renderLaunchScreen } from './screens/launch.js';
import { renderStudio } from './screens/studio.js';
import { renderSites, renderProjectFormScreen, setProjectTemplate } from './screens/sites.js';
import { createProjectSite, deleteProjectSite, renderProjectSiteForm, renderProjectSites, updateProjectSite } from './screens/projectSites.js';
import { renderSiteDashboard, renderSiteOverview, renderSiteAssets, renderSiteExperiences, renderSitePublish } from './screens/siteDashboard.js';
import { renderSiteLocations, renderLocationFormScreen, renderLocationDetailScreen } from './screens/siteLocations.js';
import { renderSiteMap } from './screens/siteMap.js';
import { renderPlaceAssets } from './screens/placeAssets.js';
import { renderAssetWorkspace, renderAssetGeneral } from './screens/assetWorkspace.js';
import { renderV1Editors, renderV1General, renderV1PlantProfile, renderV1Anchors } from './components/v1Editors.js';
import { exitAr, renderArPreparation, renderExplorerGps, renderExplorerMarker, renderExplorerMarkers, renderExplorerPlaces, renderExplorerPlantProfile, renderExplorerProjects, renderExplorerSites, renderVisitorLocationExperience, renderVisitorLocationIntro, renderXrProjects, renderHillyardsExplorer, resetArPlacement, startExplorerAr, startLocationAr, startWelcomeAr, toggleGlobalAr, updateExplorerGps } from './screens/explorer.js';
import { openTemporaryArDemoWindow, startTemporaryArDemo } from './screens/temporaryArDemo.js';
import { refreshFieldLocation, renderFieldMarker, saveFieldMarker, selectFieldPlace, selectFieldPlantProfile, selectFieldProject, selectFieldSite, setFieldMarkerType } from './screens/fieldMarker.js';
import { renderFieldTest } from './screens/fieldTest.js';
import { renderDemoHome } from './screens/demo.js';
import { deleteHillyardsMarker, openHillyardsEntry, openHillyardsMarkerActions, openHillyardsPlantProfileEditor, openMarkerPlantProfile, renderCheckpointForm, renderComingSoon, renderDemoProjects, renderFirstSteps, renderGlobalPlantList, renderHillyardsGuidelines, renderHillyardsProject, saveCheckpoint, editDraftMarker, saveDraftMarker, editDraftPlantProfile, saveDraftPlantProfile, deleteDraftMarker } from './screens/v1Navigation.js';
import { captureMarkerLocation, renderMarkerFirst, renderMarkerFirstEditor, saveMarkerFirst, saveMarkerFirstEditor } from './screens/markerFirst.js';
import { hostedGps, openHostedMarker, openHostedPlace, openHostedProject, openHostedSite, startHostedAr } from './screens/hostedExplorer.js';
import { applyAnalogFilters, renderAnalogExplorer, renderAnalogLibraryPlant, renderAnalogPlace, renderAnalogPlant, renderAnalogPlantList } from './screens/analogExplorer.js';
import { applyFieldGuideFilter, openFieldGuidePlant, positionFieldGuidePlant, renderFieldGuide, renderFieldGuideProjects } from './screens/fieldGuide.js';
import { applyPlatformSettings, captureStartingPointLocation, focusStartingPointMapFields, openProjectEntry, openProjectStartingPoint, renderAddToLocation, renderBrowseContent, renderLocationMap, renderNewLocationSetup, renderPlacementChoice, renderPlatformComingSoon, renderPlatformHome, renderProjectDashboard, renderProjectSettings, renderStartingPointForm, renderStartingPoints, renderStoriesAndFocus, renderVisitorWelcomeEditor, savePlatformSetting, saveProjectStartingPoint, saveVisitorWelcome } from './screens/projectDashboard.js';
import { createPlaceMarker, createSitePlace, deletePlaceMarker, deleteSitePlace, exportProject, importProject, loadDemoMarkers, loadPlaceMarkers, loadProjectSites, loadProjects, loadSitePlaces, saveMarkerAnchor, savePlantProfile, updatePlaceMarker, updateSitePlace } from './services/persistence.js';
import { ensureCreatorAuthentication, HOSTED_MODE, isCreatorAuthDisabled } from './services/apiClient.js';

const app = document.getElementById('app');
const siteManager = new SiteManager();
applyPlatformSettings();
const setExperienceRole = role => {
    document.body.dataset.experienceRole = role;
    queueMicrotask(syncCreatorTestingWarning);
};

function syncCreatorTestingWarning() {
    const existing = document.getElementById('creatorAuthTestingWarning');
    if (document.body.dataset.experienceRole !== 'creator' || !isCreatorAuthDisabled()) {
        existing?.remove();
        return;
    }
    if (existing) return;
    const screen = app.querySelector('.screen');
    if (!screen) return;
    const warning = document.createElement('div');
    warning.id = 'creatorAuthTestingWarning';
    warning.className = 'creator-auth-testing-warning';
    warning.setAttribute('role', 'status');
    warning.textContent = 'Creator authentication disabled — testing mode';
    screen.prepend(warning);
}

async function unregisterServiceWorkersForTesting() {
    if (!('serviceWorker' in navigator)) return;
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
    } catch (error) {
        console.warn(`Service worker cleanup failed: ${error.message}`);
    }
}

function moveBackButtonsToBottom() {
    app.querySelectorAll('.screen').forEach(screen => {
        const backButtons = [...screen.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Back' && !button.closest('.bottom-back-nav'));
        if (!backButtons.length) return;
        let footer = [...screen.children].find(child => child.classList?.contains('bottom-back-nav'));
        if (!footer) {
            footer = document.createElement('footer');
            footer.className = 'bottom-back-nav';
        }
        backButtons.forEach(button => {
            button.classList.add('bottom-back-button');
            footer.append(button);
        });
        screen.append(footer);
    });
}

function syncArLocationAvailability() {
    document.body.classList.toggle('ar-location-selected', Boolean(app.querySelector('.location-selected')));
}

const backButtonObserver = new MutationObserver(() => queueMicrotask(() => {
    moveBackButtonsToBottom();
    syncCreatorTestingWarning();
    syncArLocationAvailability();
}));
backButtonObserver.observe(app, { childList: true, subtree: true });

async function openDirectExplorer(params) {
    const projectId = params.get('project'); const siteId = params.get('site'); const placeId = params.get('place'); const markerId = params.get('marker');
    setExperienceRole('visitor');
    const projects = await loadProjects(true);
    const project = projects.find(item => String(item.id).toLowerCase() === String(projectId).toLowerCase());
    if (!project) throw new Error('Location not found');
    const sites = await loadProjectSites(project.id, true); const site = sites.find(item => item.id === siteId);
    if (!site) throw new Error('Site not found');
    const places = await loadSitePlaces(project.id, site.id, true); const place = places.find(item => item.id === placeId);
    if (!place) throw new Error('Place not found');
    const markers = await loadPlaceMarkers(project.id, site.id, place.id, true); const marker = markers.find(item => item.id === markerId);
    if (!marker) throw new Error('Marker not found');
    renderExplorerMarker(app, project, site, place, marker);
}

async function bootstrap() {
    try {
        await unregisterServiceWorkersForTesting();
        const params = new URLSearchParams(window.location.search);
        if (!HOSTED_MODE) {
            await siteManager.loadSitesFromDisk();
            await loadDemoMarkers();
        }
        if (params.get('mode') === 'analog' && params.get('instance')) await renderAnalogPlant(app, encodeURIComponent(params.get('instance')));
        else if (params.get('mode') === 'analog' && params.get('place')) await renderAnalogPlace(app, params.get('place'));
        else if (params.get('mode') === 'analog') await renderAnalogExplorer(app);
        else if (params.get('mode') === 'explorer') await openDirectExplorer(params);
        else if (params.get('project')) openHostedProject(app, params.get('project'));
        else renderLaunchScreen(app);
    } catch (error) {
        app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <h1>Studio could not start</h1>
                <p class="subtitle">The persistence server is unavailable.</p>
            </div>
            <div class="panel">
                <p>Start the Studio with <code>node tools/persistence-server.mjs</code> from the repository root, then open <code>http://127.0.0.1:8000/app/</code>.</p>
                <p class="meta">${error.message}</p>
            </div>
        </div>`;
    }
}

window.renderLaunchScreen = () => { setExperienceRole('launch'); renderLaunchScreen(app); };
window.renderHillyardsDemo = () => renderDemoHome(app);
window.renderAnalogExplorer = () => { setExperienceRole('visitor'); return renderAnalogExplorer(app).catch(error => { app.innerHTML = `<div class="screen"><p>Field Guide unavailable: ${error.message}</p></div>`; }); };
window.renderAnalogPlantList = () => renderAnalogPlantList(app).catch(error => { app.innerHTML = `<div class="screen"><p>Plant list unavailable: ${error.message}</p></div>`; });
window.renderAnalogPlace = placeId => renderAnalogPlace(app, placeId).catch(error => { app.innerHTML = `<div class="screen"><p>Place unavailable: ${error.message}</p></div>`; });
window.renderAnalogPlant = instanceId => renderAnalogPlant(app, instanceId).catch(error => { app.innerHTML = `<div class="screen"><p>Plant unavailable: ${error.message}</p></div>`; });
window.renderAnalogLibraryPlant = plantId => renderAnalogLibraryPlant(app, plantId).catch(error => { app.innerHTML = `<div class="screen"><p>Plant unavailable: ${error.message}</p></div>`; });
window.applyAnalogFilters = applyAnalogFilters;
window.renderDemoProjects = async () => {
    try {
        if (!await ensureCreatorAuthentication()) return;
        setExperienceRole('creator');
        await renderDemoProjects(app);
    } catch (error) {
        window.alert(error.message);
    }
};
window.renderProjectDashboard = projectId => renderProjectDashboard(app, projectId);
window.renderNewLocationSetup = projectId => renderNewLocationSetup(app, projectId);
window.renderAddToLocation = projectId => renderAddToLocation(app, projectId);
window.renderPlacementChoice = (projectId, type) => renderPlacementChoice(app, projectId, type);
window.renderBrowseContent = (projectId, creator = false) => renderBrowseContent(app, projectId, creator);
window.renderLocationMap = (projectId, creator = true) => renderLocationMap(app, projectId, creator);
window.renderStoriesAndFocus = projectId => renderStoriesAndFocus(app, projectId);
window.renderProjectSettings = projectId => renderProjectSettings(app, projectId);
window.renderStartingPoints = projectId => renderStartingPoints(app, projectId);
window.editVisitorWelcome = projectId => renderVisitorWelcomeEditor(app, projectId);
window.saveVisitorWelcome = (event, projectId) => saveVisitorWelcome(event, projectId);
window.renderPlatformComingSoon = (feature, returnTo) => renderPlatformComingSoon(app, feature, returnTo);
window.savePlatformSetting = savePlatformSetting;
window.addProjectStartingPoint = projectId => renderStartingPointForm(app, projectId);
window.editProjectStartingPoint = projectId => renderStartingPointForm(app, projectId);
window.saveProjectStartingPoint = (event, projectId) => saveProjectStartingPoint(event, projectId);
window.captureStartingPointLocation = captureStartingPointLocation;
window.focusStartingPointMapFields = focusStartingPointMapFields;
window.openProjectStartingPoint = projectId => openProjectStartingPoint(app, projectId);
window.openProjectEntry = (projectId, markerId) => openProjectEntry(app, projectId, markerId).catch(error => window.alert(error.message));
window.renderFirstSteps = () => renderFirstSteps(app);
window.renderHillyardsProject = () => renderHillyardsProject(app);
window.renderHillyardsGuidelines = () => renderHillyardsGuidelines(app);
window.renderGlobalPlantList = () => renderFieldGuide(app, encodeURIComponent('Hillyards'), true);
window.renderMarkerFirst = (type) => renderMarkerFirst(app, type).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.captureMarkerLocation = () => captureMarkerLocation();
window.saveMarkerFirst = (event) => saveMarkerFirst(event);
window.openMarkerFirstEditor = (markerId) => renderMarkerFirstEditor(app, markerId).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.saveMarkerFirstEditor = (event, markerId, type) => saveMarkerFirstEditor(event, markerId, type);
window.renderCheckpointForm = (type) => renderCheckpointForm(app, type);
window.saveCheckpoint = (event, type) => saveCheckpoint(event, type);
window.renderComingSoon = (feature, purpose, how, example, backAction) => renderComingSoon(app, feature, purpose, how, example, backAction);
window.openHillyardsPlantProfileEditor = () => openHillyardsPlantProfileEditor();
window.openHillyardsEntry = (markerId) => openHillyardsEntry(markerId);
window.openHillyardsMarkerActions = (markerId) => openHillyardsMarkerActions(app, markerId);
window.openMarkerPlantProfile = (markerId) => openMarkerPlantProfile(markerId).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.deleteHillyardsMarker = (markerId) => deleteHillyardsMarker(markerId).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });

window.editDraftMarker = (markerId) => editDraftMarker(app, markerId).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.saveDraftMarker = (event, markerId) => saveDraftMarker(event, markerId).catch(error => window.alert(`Save failed: ${error.message}`));
window.editDraftPlantProfile = (markerId) => editDraftPlantProfile(app, markerId).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.saveDraftPlantProfile = (event, markerId) => saveDraftPlantProfile(event, markerId).catch(error => window.alert(`Profile save failed: ${error.message}`));
window.deleteDraftMarker = (markerId) => deleteDraftMarker(markerId).catch(error => window.alert(`Delete failed: ${error.message}`));
window.renderStudio = () => renderStudio(app);
window.renderFieldTest = (site, place, marker) => renderFieldTest(app, site, place, marker);
window.copyFieldTestUrl = async (url) => { try { await navigator.clipboard.writeText(url); document.getElementById('fieldTestStatus').textContent = 'Test URL copied.'; } catch { document.getElementById('fieldTestStatus').textContent = 'Copy failed. Copy the browser URL manually.'; } };
window.openFieldTestExplorer = (url) => { window.location.href = url; };
window.renderFieldMarker = () => renderFieldMarker(app).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
window.renderLocationFieldMarker = async (projectId, type) => {
    const decodedProjectId = decodeURIComponent(projectId);
    const sites = await loadProjectSites(decodedProjectId);
    if (!sites.length) { window.alert('Add a site before creating location content.'); return; }
    const site = sites[0];
    const places = await loadSitePlaces(decodedProjectId, site.id);
    await renderFieldMarker(app, { project: decodedProjectId, site: site.id, place: places[0]?.id || '', type, dashboardProjectId: decodedProjectId });
};
window.renderPlaceForLocation = async (projectId) => {
    const decodedProjectId = decodeURIComponent(projectId);
    const sites = await loadProjectSites(decodedProjectId);
    if (!sites.length) { window.alert('Add a site before creating a place or zone.'); return; }
    renderLocationFormScreen(app, sites[0]);
};
window.setFieldMarkerType = (type) => setFieldMarkerType(type);
window.selectFieldProject = (id) => selectFieldProject(id);
window.selectFieldSite = (id) => selectFieldSite(id);
window.selectFieldPlace = (id) => selectFieldPlace(id);
window.selectFieldPlantProfile = (id) => selectFieldPlantProfile(id);
window.refreshFieldLocation = () => refreshFieldLocation();
window.saveFieldMarker = () => saveFieldMarker();
window.startWelcomeAr = () => startWelcomeAr();
window.startLocationAr = projectId => startLocationAr(projectId).catch(error => window.alert(`AR could not start: ${error.message}`));
window.renderArPreparation = (projectId, returnContext, placementType) => renderArPreparation(app, projectId, returnContext, placementType);
window.beginPlacementAr = async (projectId, type) => {
    await startLocationAr(projectId);
    window.renderLocationFieldMarker(projectId, type);
};
window.toggleGlobalAr = () => toggleGlobalAr();
window.renderExplorerProjects = () => { setExperienceRole('visitor'); return renderExplorerProjects(app); };
window.renderVisitorLocationExperience = projectId => { setExperienceRole('visitor'); return renderVisitorLocationExperience(app, projectId); };
window.renderVisitorLocationIntro = (projectId, creatorPreview = false) => { setExperienceRole(creatorPreview ? 'creator' : 'visitor'); return renderVisitorLocationIntro(app, projectId, creatorPreview); };
window.renderXrProjects = () => { setExperienceRole('visitor'); return renderXrProjects(app); };
window.renderFieldGuideProjects = () => { setExperienceRole('visitor'); return renderFieldGuideProjects(app); };
window.renderFieldGuide = (projectId, creator = false) => { setExperienceRole(creator ? 'creator' : 'visitor'); return renderFieldGuide(app, projectId, creator); };
window.openFieldGuidePlant = instanceId => openFieldGuidePlant(app, instanceId);
window.positionFieldGuidePlant = instanceId => positionFieldGuidePlant(instanceId);
window.applyFieldGuideFilter = () => applyFieldGuideFilter();
window.filterFieldGuidePlace = placeId => applyFieldGuideFilter(placeId);
window.renderV1Explorer = () => { setExperienceRole('visitor'); return renderExplorerProjects(app); };
window.startTemporaryArDemo = () => { setExperienceRole('visitor'); return startTemporaryArDemo(app); };
window.openTemporaryArDemoWindow = () => { setExperienceRole('visitor'); return openTemporaryArDemoWindow(app); };
window.openHillyardsExplorer = () => renderHillyardsExplorer(app);
window.openHostedProjectPrompt = () => { const url = window.prompt('Hosted project.json URL'); if (url) openHostedProject(app, url); };
window.openHostedProject = (url) => openHostedProject(app, url);
window.openHostedSite = (url) => openHostedSite(url);
window.openHostedPlace = (url) => openHostedPlace(url);
window.openHostedMarker = (url) => openHostedMarker(url);
window.hostedGps = () => hostedGps();
window.startHostedAr = (url) => startHostedAr(url);
window.renderExplorerSites = (project) => renderExplorerSites(app, project);
window.renderExplorerPlaces = (project, site) => renderExplorerPlaces(app, project, site);
window.renderExplorerMarkers = (project, site, place) => renderExplorerMarkers(app, project, site, place);
window.renderExplorerMarker = (project, site, place, marker) => renderExplorerMarker(app, project, site, place, marker);
window.renderExplorerPlantProfile = (project, site, place, marker) => renderExplorerPlantProfile(app, project, site, place, marker);
window.renderExplorerGps = (project) => renderExplorerGps(app, project);
window.updateExplorerGps = () => updateExplorerGps();
window.startExplorerAr = (project, site, place, marker) => startExplorerAr(project, site, place, marker);
window.resetArPlacement = () => resetArPlacement();
window.exitAr = () => exitAr();
window.renderProjects = async () => {
    await siteManager.loadSitesFromDisk();
    renderSites(app, siteManager);
};
window.renderSites = window.renderProjects;
window.renderProjectSites = (project) => renderProjectSites(app, project);
window.renderProjectSiteForm = (project, site = null) => renderProjectSiteForm(app, project, site);
window.saveProjectSite = async (project, site) => {
    const name = document.getElementById('managedSiteName').value.trim();
    if (!name) return;
    if (site) await updateProjectSite(project.id, site.id, { name });
    else await createProjectSite(project.id, { name });
    window.renderProjectSites(project);
};
window.deleteProjectSite = async (project, siteId) => {
    if (!window.confirm('Delete this site and all of its places and markers?')) return;
    await deleteProjectSite(project.id, siteId);
    window.renderProjectSites(project);
};
window.renderProjectForm = (project = null) => renderProjectFormScreen(app, project);
window.setProjectTemplate = (templateKey) => setProjectTemplate(app, templateKey);
window.renderSiteForm = () => window.renderProjectForm();
window.renderSiteDashboard = (site) => renderSiteDashboard(app, site, `window.renderProjectSites(${JSON.stringify({ id: site.projectId, name: site.projectId })})`);
window.renderSiteOverview = (site) => renderSiteOverview(app, site);
window.renderSiteAssets = (site) => renderSiteAssets(app, site);
window.renderSiteExperiences = (site) => renderSiteExperiences(app, site);
window.renderSitePublish = (site) => renderSitePublish(app, site);
window.renderSiteLocations = (site) => renderSiteLocations(app, site);
window.renderSiteMap = (site) => renderSiteMap(app, site);
window.renderPlaceAssets = (site, place, mode, asset) => renderPlaceAssets(app, site, place, mode, asset);
window.renderAssetWorkspace = (site, place, asset) => renderAssetWorkspace(app, site, place, asset);
window.renderAssetGeneral = (site, place, asset) => renderAssetGeneral(app, site, place, asset);
window.renderV1Editors = (site, place, asset) => {
    app.innerHTML = renderV1Editors(site, place, asset, `window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')`);
};
window.renderV1General = (site, place, asset) => {
    app.innerHTML = renderV1General(site, place, asset);
};
window.renderV1PlantProfile = (site, place, asset) => {
    renderV1PlantProfile(site, place, asset).then(html => { app.innerHTML = html; }).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
};
window.savePlantProfile = async (site, place, asset) => {
    const keys = ['common_name','scientific_name','overview','identification','edible_uses','propagation','growing_conditions','notes','references'];
    const profile = Object.fromEntries(keys.map(key => [key, document.getElementById(`profile_${key}`).value]));
    const error = document.getElementById('plantProfileError');
    if (!profile.common_name.trim() || !profile.scientific_name.trim()) { error.textContent = 'Common Name and Scientific Name are required.'; return; }
    try { await savePlantProfile(site.projectId, site.id, place.id, asset.id, profile); window.renderAssetWorkspace(site, place, asset); } catch (failure) { error.textContent = `Save failed: ${failure.message}`; }
};
window.renderV1Anchors = (site, place, asset) => {
    renderV1Anchors(site, place, asset).then(html => { app.innerHTML = html; window.updateAnchorFields(); }).catch(error => { app.innerHTML = `<div class="screen"><p>${error.message}</p></div>`; });
};
window.updateAnchorFields = () => {
    const gps = document.getElementById('anchor_type').value === 'gps';
    document.getElementById('gpsAnchorFields').style.display = gps ? 'block' : 'none';
    document.getElementById('qrAnchorFields').style.display = gps ? 'none' : 'block';
};
window.useCurrentAnchorLocation = () => {
    const error = document.getElementById('anchorError');
    if (!navigator.geolocation) { error.textContent = 'Location is unavailable in this browser.'; return; }
    navigator.geolocation.getCurrentPosition(position => {
        document.getElementById('anchor_type').value = 'gps'; window.updateAnchorFields();
        document.getElementById('anchor_latitude').value = position.coords.latitude;
        document.getElementById('anchor_longitude').value = position.coords.longitude;
        document.getElementById('anchor_altitude').value = position.coords.altitude ?? '';
        document.getElementById('anchor_accuracy').value = position.coords.accuracy;
        document.getElementById('anchor_captured_at').value = new Date(position.timestamp).toISOString();
        error.textContent = 'Current location captured. Save Anchor to persist it.';
    }, failure => { error.textContent = failure.code === 1 ? 'Location permission was denied.' : 'Location could not be captured.'; }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
};
window.saveMarkerAnchor = async (site, place, asset) => {
    const type = document.getElementById('anchor_type').value;
    const anchor = { type, latitude: document.getElementById('anchor_latitude').value, longitude: document.getElementById('anchor_longitude').value, altitude: document.getElementById('anchor_altitude').value, accuracy: document.getElementById('anchor_accuracy').value, captured_at: document.getElementById('anchor_captured_at').value, qr_code: document.getElementById('anchor_qr_code').value, description: document.getElementById('anchor_description').value };
    const error = document.getElementById('anchorError');
    const latitude = Number(anchor.latitude), longitude = Number(anchor.longitude);
    if (type === 'gps' && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) { error.textContent = 'Enter latitude (-90 to 90) and longitude (-180 to 180).'; return; }
    if (type === 'qr' && !anchor.qr_code.trim()) { error.textContent = 'QR Code is required.'; return; }
    try { await saveMarkerAnchor(site.projectId, site.id, place.id, asset.id, anchor); error.textContent = `Saved ${anchor.latitude}, ${anchor.longitude} Â· accuracy ${anchor.accuracy || 'not available'} m Â· ${asset.name} at ${place.name}.`; } catch (failure) { error.textContent = `Save failed: ${failure.message}`; }
};
window.renderLocationForm = (site, location) => renderLocationFormScreen(app, site, location);
window.renderLocationDetail = (site, location) => renderLocationDetailScreen(app, site, location);
window.selectMapPlace = (placeId, site) => {
    const place = (site.locations || []).find(location => location.id === placeId);
    const container = document.getElementById('mapPlaceInfo');

    if (container) {
        container.innerHTML = place
            ? `<strong>${place.name}</strong><br />Type: ${place.type}`
            : 'No place selected';
    }
};
window.createProjectFromForm = async () => {
    const projectName = document.getElementById('projectName');
    const projectTemplate = document.getElementById('projectTemplate');

    if (projectName && projectTemplate) {
        const name = projectName.value.trim();
        const template = projectTemplate.value;

        if (name) {
            const suggestions = (document.getElementById('projectSuggestions')?.value || '').split('\n').map(value => value.trim()).filter(Boolean);
            const created = await siteManager.createProject({ name, template, description: document.getElementById('projectDescription')?.value.trim() || '', coverImage: document.getElementById('projectCoverImage')?.value.trim() || '', visibility: 'draft', siteSuggestions: suggestions });
            await siteManager.loadSitesFromDisk();
            window.renderNewLocationSetup(encodeURIComponent(created.id));
        }
    }
};
window.createSiteFromForm = window.createProjectFromForm;
window.renameProjectFromForm = async (project) => {
    const projectName = document.getElementById('projectName');
    const projectTemplate = document.getElementById('projectTemplate');

    if (projectName && projectTemplate) {
        const name = projectName.value.trim();

        if (name) {
            await siteManager.renameProject(project.id, {
                name,
                template: projectTemplate.value,
                description: document.getElementById('projectDescription')?.value.trim() || '',
                coverImage: document.getElementById('projectCoverImage')?.value.trim() || ''
            });
            await siteManager.loadSitesFromDisk();
            window.renderProjects();
        }
    }
};
window.deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project and all of its places and markers?')) {
        return;
    }

    await siteManager.deleteProject(projectId);
    await siteManager.loadSitesFromDisk();
    window.renderProjects();
};
window.exportProject = async (projectId) => { try { await exportProject(projectId); } catch (error) { window.alert(`Export failed: ${error.message}`); } };
window.importProjectFile = async (file) => {
    if (!file) return;
    try { await importProject(file); }
    catch (error) {
        if (!error.message.includes('already exists') || !window.confirm('A location with this ID already exists. Import as a copy?')) { if (!error.message.includes('already exists')) window.alert(`Import failed: ${error.message}`); return; }
        try { await importProject(file, true); } catch (copyError) { window.alert(`Import failed: ${copyError.message}`); return; }
    }
    await siteManager.loadSitesFromDisk(); window.renderProjects();
};
window.createLocation = async (site) => {
    const locationName = document.getElementById('locationName');
    const locationType = document.getElementById('locationType');

    if (locationName && locationType) {
        const name = locationName.value.trim();
        const type = locationType.value;

        if (name) {
            await createSitePlace(site.projectId, site.id, { name, type, description: '' });
            window.renderSiteLocations(site);
        }
    }
};
window.updateLocation = async (site, location) => {
    const locationName = document.getElementById('locationName');
    const locationType = document.getElementById('locationType');

    if (locationName && locationType) {
        const name = locationName.value.trim();
        const type = locationType.value;

        if (name) {
            const updatedLocation = {
                ...location,
                name,
                type,
                description: location.description || '',
                notes: location.notes || '',
                mapPosition: location.mapPosition || 'Not set'
            };
            await updateSitePlace(site.projectId, site.id, location.id, updatedLocation);
            window.renderSiteLocations(site);
        }
    }
};
window.deleteLocation = async (site, locationId) => {
    await deleteSitePlace(site.projectId, site.id, locationId);
    window.renderSiteLocations(site);
};
window.createAsset = async (site, place) => {
    const assetName = document.getElementById('assetName');
    const assetCategory = document.getElementById('assetCategory');

    if (assetName && assetCategory) {
        const name = assetName.value.trim();
        const category = assetCategory.value;

        if (name) {
            await createPlaceMarker(site.projectId, site.id, place.id, { name, type: category });
            window.renderPlaceAssets(site, place, 'list');
        }
    }
};
window.updateAsset = async (site, place, asset) => {
    const assetName = document.getElementById('assetName');
    const assetCategory = document.getElementById('assetCategory');

    if (assetName && assetCategory) {
        const name = assetName.value.trim();
        const category = assetCategory.value;

        if (name) {
            await updatePlaceMarker(site.projectId, site.id, place.id, asset.id, { name, type: category });
            window.renderPlaceAssets(site, place, 'list');
        }
    }
};
window.deleteAsset = async (site, place, assetId) => {
    await deletePlaceMarker(site.projectId, site.id, place.id, assetId);
    window.renderPlaceAssets(site, place, 'list');
};


window.addEventListener('nxr:latest-entry-added', async () => {
    // Refresh the hidden Tool Box while AR is active so the saved marker is
    // already visible in Latest Entries when the session closes.
    if (app.querySelector('.project-entry')) {
        await renderHillyardsProject(app);
    }
});

bootstrap();
