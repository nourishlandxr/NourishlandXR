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
import { exitAr, renderArFailure, renderArPreparation, renderExplorerGps, renderExplorerMarker, renderExplorerMarkers, renderExplorerPlaces, renderExplorerPlantProfile, renderExplorerProjects, renderExplorerSites, renderVisitorLocationExperience, renderVisitorLocationIntro, renderXrProjects, renderHillyardsExplorer, resetArPlacement, startExplorerAr, startLocationAr, startWelcomeAr, startArWithSkipCheck, toggleArTechnicalDetails, toggleGlobalAr, updateExplorerGps } from './screens/explorer.js';
import { openTemporaryArDemoWindow, startTemporaryArDemo } from './screens/temporaryArDemo.js';
import { startArMode, exitArMode, isArModeActive } from './screens/arMode.js';
import { createFieldArea, refreshFieldLocation, renderFieldMarker, saveFieldMarker, searchGlobalPlantOptions, selectFieldPlace, selectFieldPlantProfile, selectFieldProject, selectFieldSite, selectGlobalPlant, setFieldMarkerType, setPlantSearchScope } from './screens/fieldMarker.js';
import { renderFieldTest } from './screens/fieldTest.js';
import { renderDemoHome } from './screens/demo.js';
import { deleteHillyardsMarker, openHillyardsEntry, openHillyardsMarkerActions, openHillyardsPlantProfileEditor, openMarkerPlantProfile, renderCheckpointForm, renderComingSoon, renderDemoProjects, renderFirstSteps, renderGlobalPlantList, renderHillyardsGuidelines, renderHillyardsProject, saveCheckpoint, editDraftMarker, saveDraftMarker, editDraftPlantProfile, saveDraftPlantProfile, deleteDraftMarker } from './screens/v1Navigation.js';
import { captureMarkerLocation, renderMarkerFirst, renderMarkerFirstEditor, saveMarkerFirst, saveMarkerFirstEditor } from './screens/markerFirst.js';
import { hostedGps, openHostedMarker, openHostedPlace, openHostedProject, openHostedSite, startHostedAr } from './screens/hostedExplorer.js';
import { applyAnalogFilters, renderAnalogExplorer, renderAnalogLibraryPlant, renderAnalogPlace, renderAnalogPlant, renderAnalogPlantList } from './screens/analogExplorer.js';
import { applyFieldGuideFilter, openFieldGuidePlant, positionFieldGuidePlant, renderFieldGuide, renderFieldGuideProjects } from './screens/fieldGuide.js';
import { printCenterOutput, printPlantVirtualTag, renderPrintCenter, updatePrintRangeFields } from './screens/printCenter.js';
import { captureProjectAreaLocation, deleteProjectArea, deleteProjectFromSettings, navigateToProjectArea, openProjectAreaAr, renderProjectAreaDashboard, renderProjectAreaLocationForm, saveProjectAreaLocation, saveProjectTheme } from './screens/projectDashboard.js';
import { startAreaNavigationAr } from './screens/explorer.js';
import { advanceDashboardTutorial, applyPlatformSettings, beginSiteMapAreaLink, captureStartingPointLocation, deleteProjectEntry, dismissProjectGuidance, ensureProjectLocation, filterAllProjectEntries, filterProjectSearch, focusStartingPointMapFields, openCheckpointQuickSetup, openCreatorArMode, openCreatorContentMode, openCreatorVisitorPreview, openProjectEntry, openProjectStartingPoint, openQuickAccessChoice, placeLinkedAreaOnSiteMap, removeSiteMapPhoto, renderAddToLocation, renderAllProjectEntries, renderArAreaPicker, renderAreaCheckpointForm, renderAreaRequired, renderBrowseContent, renderCheckpointPlacementChoice, renderContentMode, renderLocationMap, renderNewLocationSetup, renderPigeonPeaExample, renderPlacementChoice, renderPlatformComingSoon, renderPlatformHome, renderProjectAreaForm, renderProjectDashboard, renderProjectSettings, renderStartingPointForm, renderStartingPoints, renderStoriesAndFocus, renderUnplacedContent, renderVisitorWelcomeEditor, replayArTutorialFromSettings, resetArLearningTipsFromSettings, resetLearningTipsFromSettings, restartProjectTutorialFromSettings, resumeAreaCreationFlow, saveArLocationNoteSettings, saveAreaCheckpoint, saveAreaInformation, savePlatformSetting, saveProjectArea, saveProjectEntryChanges, saveProjectName, saveProjectPublishing, saveProjectStartingPoint, saveVisitorWelcome, setArHintsFromSettings, setProjectTutorialModeFromSettings, showWorkModeGuidance, toggleAreas, updateProjectExpertMode, uploadSiteMapPhoto } from './screens/projectDashboard.js';
import { createPlaceMarker, createSitePlace, deletePlaceMarker, deleteSitePlace, exportProject, importProject, loadDemoMarkers, loadPlaceMarkers, loadProjectSites, loadProjects, loadSitePlaces, saveMarkerAnchor, savePlantProfile, updatePlaceMarker, updateSitePlace } from './services/persistence.js';
import { ensureCreatorAuthentication, HOSTED_MODE, isCreatorAuthDisabled } from './services/apiClient.js';
import { recordTutorialEvent, restartProjectTutorial, setProjectTutorialMode } from './services/tutorialProgress.js';
import { projectTemplates } from './templates/projectTemplates.js';
import { isDefaultHomeArea } from './services/arExperienceConfig.js';
import { applyNxrLanguage, translateApp } from './services/i18n.js';

const app = document.getElementById('app');
const CURRENT_VIEW_KEY = 'nourishland-xr-current-view-v1';
function rememberCurrentView(view, args = []) {
    try { sessionStorage.setItem(CURRENT_VIEW_KEY, JSON.stringify({ view, args })); }
    catch {}
}
function forgetCurrentView() {
    try { sessionStorage.removeItem(CURRENT_VIEW_KEY); }
    catch {}
}
function readCurrentView() {
    try { return JSON.parse(sessionStorage.getItem(CURRENT_VIEW_KEY) || 'null'); }
    catch {
        forgetCurrentView();
        return null;
    }
}
function pushViewHistory(view, args = [], extra = {}) {
    const state = { nourishlandView: view, viewArgs: args, ...extra };
    const sameView = history.state?.nourishlandView === view
        && JSON.stringify(history.state?.viewArgs || []) === JSON.stringify(args);
    if (!sameView) history.pushState(state, '', window.location.href);
}
function replaceViewHistory(view, args = [], extra = {}) {
    history.replaceState({ nourishlandView: view, viewArgs: args, ...extra }, '', window.location.href);
}
function placeGlobalNavigationAtBottom() {
    app.querySelectorAll('.screen').forEach(screen => {
        const buttons = [...screen.querySelectorAll(':scope > .page-header > button:first-child, :scope > header.page-header > button:first-child')]
            .filter(button => /^(back|return|exit|close|save and exit)/i.test(button.textContent.trim()));
        if (!buttons.length) return;
        let navigation = screen.querySelector(':scope > .bottom-navigation');
        if (!navigation) {
            navigation = document.createElement('nav');
            navigation.className = 'bottom-navigation global-bottom-navigation';
            screen.append(navigation);
        }
        buttons.forEach(button => navigation.append(button));
    });
}
new MutationObserver(() => {
    requestAnimationFrame(() => {
        placeGlobalNavigationAtBottom();
        translateApp(app);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
}).observe(app, { childList: true });
const siteManager = new SiteManager();
const escapeMainHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const decodeMainValue = value => {
    try { return decodeURIComponent(String(value ?? '')); }
    catch { return String(value ?? ''); }
};
applyPlatformSettings();
applyNxrLanguage();
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
    if (!place) throw new Error('Area not found');
    const markers = await loadPlaceMarkers(project.id, site.id, place.id, true); const marker = markers.find(item => item.id === markerId);
    if (!marker) throw new Error('Marker not found');
    renderExplorerMarker(app, project, site, place, marker);
}

async function bootstrap() {
    try {
        await unregisterServiceWorkersForTesting();
        const params = new URLSearchParams(window.location.search);
        const recoveryKey = 'nourishland-xr-active-creator-ar';
        let recovery = null;
        try { recovery = JSON.parse(sessionStorage.getItem(recoveryKey) || 'null'); }
        catch { sessionStorage.removeItem(recoveryKey); }
        if (!params.size && recovery?.projectId) {
            sessionStorage.removeItem(recoveryKey);
            setExperienceRole('creator');
            await renderProjectDashboard(app, encodeURIComponent(recovery.projectId));
            return;
        }
        const rememberedView = !params.size ? readCurrentView() : null;
        if (rememberedView?.view === 'projects') {
            setExperienceRole('creator');
            replaceViewHistory('projects');
            await renderDemoProjects(app);
            return;
        }
        if (rememberedView?.view === 'dashboard' && rememberedView.args?.[0]) {
            setExperienceRole('creator');
            replaceViewHistory('dashboard', rememberedView.args, { projectId: rememberedView.args[0], projectName: rememberedView.args[1] || '' });
            await window.renderProjectDashboard(...rememberedView.args);
            return;
        }
        if (rememberedView?.view === 'print-center' && rememberedView.args?.[0]) {
            setExperienceRole('creator');
            replaceViewHistory('print-center', rememberedView.args);
            await renderPrintCenter(app, ...rememberedView.args);
            return;
        }
        if (rememberedView?.view === 'area' && rememberedView.args?.[0] && rememberedView.args?.[1]) {
            setExperienceRole('creator');
            replaceViewHistory('area', rememberedView.args);
            await renderProjectAreaDashboard(app, ...rememberedView.args);
            return;
        }
        if (rememberedView?.view === 'totem' && rememberedView.args?.[0] && rememberedView.args?.[1]) {
            setExperienceRole('creator');
            replaceViewHistory('totem', rememberedView.args);
            await renderAreaCheckpointForm(app, ...rememberedView.args);
            return;
        }
        if (rememberedView?.view === 'entry' && rememberedView.args?.[0] && rememberedView.args?.[1]) {
            setExperienceRole('creator');
            replaceViewHistory('entry', rememberedView.args);
            await openProjectEntry(app, ...rememberedView.args);
            return;
        }
        if (rememberedView?.view === 'field-guide' && rememberedView.args?.[0]) {
            setExperienceRole(rememberedView.args?.[1] ? 'creator' : 'visitor');
            replaceViewHistory('field-guide', rememberedView.args);
            await renderFieldGuide(app, ...rememberedView.args);
            return;
        }
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

window.renderLaunchScreen = () => { forgetCurrentView(); replaceViewHistory('welcome'); setExperienceRole('launch'); renderLaunchScreen(app); };
window.renderHillyardsDemo = () => renderDemoHome(app);
window.renderAnalogExplorer = () => { setExperienceRole('visitor'); return renderAnalogExplorer(app).catch(error => { app.innerHTML = `<div class="screen"><p>Field Guide unavailable: ${error.message}</p></div>`; }); };
window.renderAnalogPlantList = () => renderAnalogPlantList(app).catch(error => { app.innerHTML = `<div class="screen"><p>Plant list unavailable: ${error.message}</p></div>`; });
window.renderAnalogPlace = placeId => renderAnalogPlace(app, placeId).catch(error => { app.innerHTML = `<div class="screen"><p>Area unavailable: ${error.message}</p></div>`; });
window.renderAnalogPlant = instanceId => renderAnalogPlant(app, instanceId).catch(error => { app.innerHTML = `<div class="screen"><p>Plant unavailable: ${error.message}</p></div>`; });
window.renderAnalogLibraryPlant = plantId => renderAnalogLibraryPlant(app, plantId).catch(error => { app.innerHTML = `<div class="screen"><p>Plant unavailable: ${error.message}</p></div>`; });
window.applyAnalogFilters = applyAnalogFilters;
window.renderDemoProjects = async () => {
    try {
        if (!await ensureCreatorAuthentication()) return;
        setExperienceRole('creator');
        rememberCurrentView('projects');
        history.replaceState({ nourishlandView: 'projects' }, '', window.location.href);
        await renderDemoProjects(app);
    } catch (error) {
        window.alert(error.message);
    }
};
window.renderProjectDashboard = async (projectId, projectName = '', fromHistory = false, loadingContext = 'opening') => {
    if (window.__nourishlandSpatialWindow?.renderProjectDashboard) {
        return window.__nourishlandSpatialWindow.renderProjectDashboard(projectId);
    }
    rememberCurrentView('dashboard', [projectId, projectName]);
    const resolvedName = decodeMainValue(projectName || history.state?.projectName || projectId || 'Project');
    const gardenLoadingComments = [
        'Adding the trellis…',
        'Soaking the seeds…',
        'Digging a few holes…',
        'Checking the compost…',
        'Inviting the pollinators…',
        'Untangling the garden hose…',
        'Labeling the seedlings…',
        'Waking up the worms…',
        'Sharpening the secateurs…',
        'Mulching the pathways…',
        'Turning the compost pile…',
        'Checking for rain…',
        'Making tea for the gardener…',
        'Counting ladybirds…',
        'Training the climbing beans…',
        'Moving the wheelbarrow…',
        'Finding the missing trowel…',
        'Watering the young trees…',
        'Listening for frogs…',
        'Opening the seed library…',
        'Sketching the garden beds…',
        'Pruning the fruit trees…',
        'Checking the beehive…',
        'Planting a few surprises…',
        'Sweeping the potting bench…',
        'Mapping the mycelium…',
        'Gathering fallen leaves…',
        'Welcoming the beneficial insects…',
        'Following the garden path…',
        'Giving the soil a moment…'
    ];
    if (!fromHistory && (history.state?.nourishlandView !== 'dashboard' || history.state?.projectId !== projectId)) {
        history.pushState({ nourishlandView: 'dashboard', projectId, projectName: resolvedName }, '', window.location.href);
    }
    app.innerHTML = `<div class="project-loading-screen" role="status" aria-live="polite">
        <div class="project-loading-mark" aria-hidden="true">◉</div>
        <p class="welcome-label">${loadingContext === 'returning' ? 'Returning to dashboard' : 'Nourishland XR'}</p>
        <h1>${escapeMainHtml(resolvedName)}</h1>
        <p data-project-loading-comment>${loadingContext === 'returning' ? 'Walking back from the garden…' : gardenLoadingComments[0]}</p>
        <div class="project-loading-track" aria-hidden="true"><span></span></div>
    </div>`;
    let loadingCommentIndex = 0;
    const loadingCommentTimer = setInterval(() => {
        const comment = app.querySelector('[data-project-loading-comment]');
        if (!comment) return;
        loadingCommentIndex = (loadingCommentIndex + 1) % gardenLoadingComments.length;
        comment.textContent = gardenLoadingComments[loadingCommentIndex];
    }, 2200);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    try {
        return await renderProjectDashboard(app, projectId);
    } finally {
        clearInterval(loadingCommentTimer);
    }
};
window.addEventListener('popstate', event => {
    if (isArModeActive()) return;
    if (event.state?.nourishlandView === 'dashboard' && event.state.projectId) {
        void window.renderProjectDashboard(event.state.projectId, event.state.projectName || '', true);
        return;
    }
    if (event.state?.nourishlandView === 'print-center' && event.state.viewArgs?.[0]) {
        rememberCurrentView('print-center', event.state.viewArgs);
        setExperienceRole('creator');
        void renderPrintCenter(app, ...event.state.viewArgs);
        return;
    }
    if (event.state?.nourishlandView === 'projects') {
        setExperienceRole('creator');
        void renderDemoProjects(app);
        return;
    }
    const args = event.state?.viewArgs || [];
    if (event.state?.nourishlandView === 'area' && args[0] && args[1]) {
        rememberCurrentView('area', args);
        setExperienceRole('creator');
        void renderProjectAreaDashboard(app, ...args);
        return;
    }
    if (event.state?.nourishlandView === 'totem' && args[0] && args[1]) {
        rememberCurrentView('totem', args);
        setExperienceRole('creator');
        void renderAreaCheckpointForm(app, ...args);
        return;
    }
    if (event.state?.nourishlandView === 'entry' && args[0] && args[1]) {
        rememberCurrentView('entry', args);
        setExperienceRole('creator');
        void openProjectEntry(app, ...args);
        return;
    }
    if (event.state?.nourishlandView === 'field-guide' && args[0]) {
        rememberCurrentView('field-guide', args);
        setExperienceRole(args[1] ? 'creator' : 'visitor');
        void renderFieldGuide(app, ...args);
        return;
    }
    forgetCurrentView();
    setExperienceRole('launch');
    renderLaunchScreen(app);
});
window.toggleAreas = toggleAreas;
window.openCreatorArMode = projectId => openCreatorArMode(app, projectId);
window.openProjectArMode = async (projectId, areaId = '') => {
    const decodedProjectId = decodeArArgument(projectId);
    const decodedAreaId = decodeArArgument(areaId);
    const started = await startArMode(decodedProjectId, decodedAreaId);
    if (!started) await renderArAreaPicker(app, encodeURIComponent(decodedProjectId));
    return started;
};
window.openCreatorArCheckpointSetup = projectId => renderArAreaPicker(app, projectId);
window.openCheckpointQuickSetup = projectId => openCheckpointQuickSetup(app, projectId);
window.openCreatorContentMode = projectId => openCreatorContentMode(app, projectId);
window.openQuickAccessChoice = (projectId, type) => openQuickAccessChoice(app, projectId, type);
window.openCreatorVisitorPreview = projectId => openCreatorVisitorPreview(projectId);
window.renderContentMode = projectId => renderContentMode(app, projectId);
window.renderPrintCenter = (projectId, section = 'prints', fromHistory = false) => {
    const args = [projectId, section];
    rememberCurrentView('print-center', args);
    if (!fromHistory && history.state?.nourishlandView !== 'print-center') history.pushState({ nourishlandView: 'print-center', viewArgs: args }, '', window.location.href);
    setExperienceRole('creator');
    return renderPrintCenter(app, projectId, section);
};
window.printCenterOutput = kind => printCenterOutput(app, kind);
window.printPlantVirtualTag = (projectId, siteId, placeId, markerId) => printPlantVirtualTag(app, projectId, siteId, placeId, markerId);
window.updatePrintRangeFields = updatePrintRangeFields;
window.beginSiteMapAreaLink = beginSiteMapAreaLink;
window.placeLinkedAreaOnSiteMap = placeLinkedAreaOnSiteMap;
window.uploadSiteMapPhoto = uploadSiteMapPhoto;
window.removeSiteMapPhoto = removeSiteMapPhoto;
window.dismissProjectGuidance = (projectId, feature) => dismissProjectGuidance(app, projectId, feature);
window.showWorkModeGuidance = projectId => showWorkModeGuidance(app, projectId);
window.advanceDashboardTutorial = (projectId, step) => advanceDashboardTutorial(app, projectId, step);
window.filterProjectSearch = filterProjectSearch;
window.renderNewLocationSetup = projectId => renderNewLocationSetup(app, projectId);
window.renderAddToLocation = projectId => renderAddToLocation(app, projectId);
window.renderPlacementChoice = (projectId, type) => renderPlacementChoice(app, projectId, type);
window.renderBrowseContent = (projectId, creator = false) => renderBrowseContent(app, projectId, creator);
window.renderLocationMap = (projectId, creator = true, returnContext = '') => renderLocationMap(app, projectId, creator, returnContext);
window.renderStoriesAndFocus = projectId => renderStoriesAndFocus(app, projectId);
window.renderProjectSettings = projectId => renderProjectSettings(app, projectId);
window.saveArLocationNoteSettings = (event, projectId) => saveArLocationNoteSettings(app, event, projectId);
window.saveProjectTheme = (projectId, theme) => saveProjectTheme(projectId, theme);
window.saveProjectName = (event, projectId) => saveProjectName(app, event, projectId);
window.saveProjectPublishing = (event, projectId) => saveProjectPublishing(app, event, projectId);
window.updateProjectExpertMode = (projectId, enabled) => updateProjectExpertMode(app, projectId, enabled);
window.setProjectTutorialMode = (projectId, enabled) => setProjectTutorialModeFromSettings(app, projectId, enabled);
window.restartProjectTutorial = projectId => restartProjectTutorialFromSettings(app, projectId);
window.resetLearningTips = projectId => resetLearningTipsFromSettings(app, projectId);
window.replayArTutorial = projectId => replayArTutorialFromSettings(app, projectId);
window.resetArLearningTips = projectId => resetArLearningTipsFromSettings(app, projectId);
window.setArHints = (projectId, enabled) => setArHintsFromSettings(app, projectId, enabled);
window.deleteProjectFromSettings = (projectId, projectName = '') => deleteProjectFromSettings(projectId, projectName);
window.renderUnplacedContent = projectId => renderUnplacedContent(app, projectId);
window.renderPigeonPeaExample = projectId => renderPigeonPeaExample(app, projectId);
window.renderAllProjectEntries = projectId => renderAllProjectEntries(app, projectId);
window.filterAllProjectEntries = filterAllProjectEntries;
window.renderProjectAreaForm = (projectId, intent = 'dashboard') => renderProjectAreaForm(app, projectId, intent);
window.saveProjectArea = (event, projectId, intent) => saveProjectArea(event, projectId, intent);
window.renderAreaCheckpointForm = (projectId, areaId, flow = '') => {
    const args = [projectId, areaId, flow];
    rememberCurrentView('totem', args);
    pushViewHistory('totem', args);
    return renderAreaCheckpointForm(app, projectId, areaId, flow);
};
window.saveAreaCheckpoint = (event, projectId, areaId, flow = '') => saveAreaCheckpoint(event, projectId, areaId, flow);
window.renderCheckpointPlacementChoice = (projectId, areaId, markerId) => renderCheckpointPlacementChoice(app, projectId, areaId, markerId);
window.renderProjectAreaDashboard = (projectId, areaId, options = {}) => {
    if (window.__nourishlandSpatialWindow?.renderProjectAreaDashboard) {
        return window.__nourishlandSpatialWindow.renderProjectAreaDashboard(projectId, areaId, options);
    }
    const args = [projectId, areaId];
    rememberCurrentView('area', args);
    pushViewHistory('area', args);
    return renderProjectAreaDashboard(app, projectId, areaId, options);
};
window.saveAreaInformation = (event, projectId, areaId) => saveAreaInformation(event, projectId, areaId);
window.openProjectAreaAr = (projectId, areaId, checkpointId = '', initialPlacementType = '') => openProjectAreaAr(app, projectId, areaId, checkpointId, initialPlacementType);
window.navigateToProjectArea = (projectId, areaId) => navigateToProjectArea(app, projectId, areaId);
window.renderProjectAreaLocationForm = (projectId, areaId) => renderProjectAreaLocationForm(app, projectId, areaId);
window.captureProjectAreaLocation = captureProjectAreaLocation;
window.saveProjectAreaLocation = (event, projectId, areaId) => saveProjectAreaLocation(event, projectId, areaId);
window.deleteProjectArea = (projectId, areaId) => deleteProjectArea(projectId, areaId);
window.renderStartingPoints = projectId => renderStartingPoints(app, projectId);
window.resumeAreaCreationFlow = (projectId, areaId, intent) => resumeAreaCreationFlow(app, projectId, areaId, intent);
window.editVisitorWelcome = projectId => renderVisitorWelcomeEditor(app, projectId);
window.saveVisitorWelcome = (event, projectId) => saveVisitorWelcome(event, projectId);
window.renderPlatformComingSoon = (feature, returnTo) => renderPlatformComingSoon(app, feature, returnTo);
window.savePlatformSetting = savePlatformSetting;
window.addProjectStartingPoint = (projectId, areaId = '', flow = '') => renderStartingPointForm(app, projectId, areaId, flow);
window.editProjectStartingPoint = (projectId, areaId = '', flow = '') => renderStartingPointForm(app, projectId, areaId, flow);
window.saveProjectStartingPoint = (event, projectId, flow = '') => saveProjectStartingPoint(event, projectId, flow);
window.captureStartingPointLocation = captureStartingPointLocation;
window.focusStartingPointMapFields = focusStartingPointMapFields;
window.openProjectStartingPoint = projectId => openProjectStartingPoint(app, projectId);
window.openProjectEntry = (projectId, markerId, returnToAr = false, returnContext = '') => {
    if (window.__nourishlandSpatialWindow?.openProjectEntry) {
        return window.__nourishlandSpatialWindow.openProjectEntry(projectId, markerId, returnToAr, returnContext);
    }
    const args = [projectId, markerId, returnToAr, returnContext];
    rememberCurrentView('entry', args);
    pushViewHistory('entry', args);
    return openProjectEntry(app, projectId, markerId, returnToAr, returnContext).catch(error => window.alert(error.message));
};
window.saveProjectEntryChanges = saveProjectEntryChanges;
window.deleteProjectEntry = (projectId, markerId) => deleteProjectEntry(projectId, markerId).catch(error => window.alert(`Delete failed: ${error.message}`));
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
window.renderLocationFieldMarker = async (projectId, type, placementMode = 'without-ar', allowUnassigned = false, preferredAreaId = '') => {
    const decodedProjectId = decodeURIComponent(projectId);
    const project = (await loadProjects().catch(() => [])).find(item => item.id === decodedProjectId);
    let sites = await loadProjectSites(decodedProjectId);
    let site = sites.find(item => item.id === 'main_food_forest') || sites[0] || null;
    const areas = site ? await loadSitePlaces(decodedProjectId, site.id) : [];
    if (!allowUnassigned && !areas.some(area => !isDefaultHomeArea(area))) return renderAreaRequired(app, projectId, type, placementMode, 'content');
    if (!site) {
        site = await ensureProjectLocation(decodedProjectId);
        sites = [site];
    }
    const decodedAreaId = preferredAreaId ? decodeURIComponent(preferredAreaId) : '';
    const selectedArea = areas.some(area => area.id === decodedAreaId) ? decodedAreaId : allowUnassigned ? '__unassigned__' : '';
    await renderFieldMarker(app, { project: decodedProjectId, site: site.id, place: selectedArea, type, placementMode, dashboardProjectId: decodedProjectId, nonPlantMode: project?.template === 'inventory_exhibition' });
};
window.renderPlaceForLocation = async (projectId) => {
    const decodedProjectId = decodeURIComponent(projectId);
    const sites = await loadProjectSites(decodedProjectId);
    if (!sites.length) { window.alert('Add a Location before creating an Area.'); return; }
    renderLocationFormScreen(app, sites[0]);
};
window.setFieldMarkerType = (type) => setFieldMarkerType(type);
window.selectFieldProject = (id) => selectFieldProject(id);
window.selectFieldSite = (id) => selectFieldSite(id);
window.selectFieldPlace = (id) => selectFieldPlace(id);
window.selectFieldPlantProfile = (id) => selectFieldPlantProfile(id);
window.setPlantSearchScope = setPlantSearchScope;
window.searchGlobalPlantOptions = searchGlobalPlantOptions;
window.selectGlobalPlant = selectGlobalPlant;
window.createFieldArea = () => createFieldArea().catch(error => window.alert(`Area could not be created: ${error.message}`));
window.refreshFieldLocation = () => refreshFieldLocation();
window.saveFieldMarker = event => saveFieldMarker(event);
window.startWelcomeAr = () => startWelcomeAr();
window.startLocationAr = projectId => startLocationAr(projectId).catch(error => renderArFailure(app, projectId, 'visitor', error));
window.startCreatorLocationAr = async projectId => {
    try {
        await startLocationAr(projectId);
        recordTutorialEvent(decodeURIComponent(projectId), 'ar_mode_launched');
    } catch (error) {
        renderArFailure(app, projectId, 'creator', error);
    }
};
window.toggleArTechnicalDetails = toggleArTechnicalDetails;
window.toggleProjectLayoutInfo = button => {
    const infoId = button?.getAttribute('aria-controls');
    const info = infoId ? document.getElementById(infoId) : null;
    if (!info) return;
    const expanded = info.hidden;
    info.hidden = !expanded;
    button.setAttribute('aria-expanded', String(expanded));
};
window.copyArDiagnostics = () => copyArDiagnostics().catch(error => {
    const status = document.getElementById('developerDiagnosticsStatus') || document.getElementById('arTechnicalCopyStatus');
    if (status) status.textContent = `Copy failed: ${error.message}`;
});
window.renderArPreparation = (projectId, returnContext, placementType, placeId, siteId) => renderArPreparation(app, projectId, returnContext, placementType, placeId, siteId);
window.startArWithSkipCheck = (projectId, returnContext, placementType, placeId, siteId) => startArWithSkipCheck(app, projectId, returnContext, placementType, placeId, siteId);
window.beginPlacementAr = async (projectId, type) => {
    await startLocationAr(projectId);
    window.renderLocationFieldMarker(projectId, type, 'ar');
};
window.beginExistingPlacementAr = async (projectId, markerId, placeId, siteId) => {
    try {
        const decodedProjectId = decodeURIComponent(projectId);
        const decodedSiteId = decodeURIComponent(siteId);
        const decodedPlaceId = decodeURIComponent(placeId);
        const decodedMarkerId = decodeURIComponent(markerId);
        await startLocationAr(projectId);
        const site = (await loadProjectSites(decodedProjectId)).find(item => item.id === decodedSiteId);
        const place = (await loadSitePlaces(decodedProjectId, decodedSiteId)).find(item => item.id === decodedPlaceId);
        const marker = (await loadPlaceMarkers(decodedProjectId, decodedSiteId, decodedPlaceId)).find(item => item.id === decodedMarkerId);
        if (!site || !place || !marker) throw new Error('Saved content could not be reopened for placement.');
        app.innerHTML = await renderV1Anchors(site, place, marker);
        window.updateAnchorFields();
    } catch (error) {
        window.alert(`Placement could not start: ${error.message}`);
    }
};
window.beginAreaNavigationAr = (projectId, siteId, placeId) => startAreaNavigationAr(projectId, siteId, placeId).catch(error => window.alert(`Area navigation could not start: ${error.message}`));
window.toggleGlobalAr = () => toggleGlobalAr();
window.renderExplorerProjects = () => { setExperienceRole('visitor'); return renderExplorerProjects(app); };
window.renderVisitorLocationExperience = projectId => { setExperienceRole('visitor'); return renderVisitorLocationExperience(app, projectId); };
window.renderVisitorLocationIntro = (projectId, creatorPreview = false, explorePreview = false) => { setExperienceRole(creatorPreview ? 'creator' : 'visitor'); return renderVisitorLocationIntro(app, projectId, creatorPreview, explorePreview); };
window.renderXrProjects = () => { setExperienceRole('visitor'); return renderXrProjects(app); };
window.renderFieldGuideProjects = () => { setExperienceRole('visitor'); return renderFieldGuideProjects(app); };
window.renderFieldGuide = (projectId, creator = false) => {
    if (window.__nourishlandSpatialWindow?.renderFieldGuide) {
        return window.__nourishlandSpatialWindow.renderFieldGuide(projectId, creator);
    }
    const args = [projectId, creator];
    rememberCurrentView('field-guide', args);
    pushViewHistory('field-guide', args);
    setExperienceRole(creator ? 'creator' : 'visitor');
    return renderFieldGuide(app, projectId, creator);
};
window.openFieldGuidePlant = instanceId => openFieldGuidePlant(app, instanceId);
window.positionFieldGuidePlant = instanceId => positionFieldGuidePlant(instanceId);
window.applyFieldGuideFilter = () => applyFieldGuideFilter();
window.filterFieldGuidePlace = placeId => applyFieldGuideFilter(placeId);
window.renderV1Explorer = () => { setExperienceRole('visitor'); return renderExplorerProjects(app); };
window.startTemporaryArDemo = () => { setExperienceRole('visitor'); return startTemporaryArDemo(app); };
const decodeArArgument = value => {
    const text = String(value ?? '');
    try { return decodeURIComponent(text); } catch { return text; }
};
window.startArMode = (projectId, areaId, checkpointId, initialPlacementType = '', existingMarkerId = '', returnContext = '', preferredSiteId = '') => startArMode(
    decodeArArgument(projectId),
    decodeArArgument(areaId),
    decodeArArgument(checkpointId),
    decodeArArgument(initialPlacementType),
    decodeArArgument(existingMarkerId),
    decodeArArgument(returnContext),
    decodeArArgument(preferredSiteId)
);
window.startExistingMarkerPlacement = async (projectId, siteId, areaId, markerId, markerType = 'sub_checkpoint') => {
    const started = await startArMode(
        decodeURIComponent(projectId),
        decodeURIComponent(areaId),
        '',
        markerType,
        decodeURIComponent(markerId),
        'dashboard',
        decodeURIComponent(siteId)
    );
    if (!started) {
        const status = document.getElementById('projectStartingError');
        const message = 'AR could not start. Check camera access and WebXR support, then try again.';
        if (status) status.textContent = message;
        else window.alert(message);
    }
};
window.exitArMode = () => exitArMode();
window.isArModeActive = () => isArModeActive();
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
    if (!window.confirm('Delete this Location and all of its Areas and content?')) return;
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
            : 'No Area selected';
    }
};
window.createProjectFromForm = async () => {
    const projectName = document.getElementById('projectName');
    const projectTemplate = document.getElementById('projectTemplate');

    if (projectName && projectTemplate) {
        const name = projectName.value.trim();
        const template = projectTemplate.value;

        if (name) {
            const suggestions = projectTemplates[template]?.sites || [];
            const expertMode = document.getElementById('projectExpertMode')?.checked === true;
            const tutorialEnabled = document.getElementById('projectTutorialEnabled')?.checked !== false;
            const created = await siteManager.createProject({ name, template, description: document.getElementById('projectDescription')?.value.trim() || '', coverImage: '', visibility: 'draft', projectStatus: 'under_construction', expertMode, siteSuggestions: suggestions });
            restartProjectTutorial(created.id);
            setProjectTutorialMode(created.id, tutorialEnabled && !expertMode);
            await siteManager.loadSitesFromDisk();
            window.renderProjectDashboard(encodeURIComponent(created.id));
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
                coverImage: project.coverImage || '',
                expertMode: document.getElementById('projectExpertMode')?.checked === true
            });
            await siteManager.loadSitesFromDisk();
            window.renderProjects();
        }
    }
};
window.deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project and all of its Areas and content?')) {
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
    // already visible in Changes when the session closes.
    if (app.querySelector('.project-entry')) {
        await renderHillyardsProject(app);
    }
});

bootstrap();
