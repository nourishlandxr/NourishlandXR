import { SiteManager } from './managers/siteManager.js';
import { renderLaunchScreen } from './screens/launch.js';
import { renderStudio } from './screens/studio.js';
import { renderSites, renderProjectFormScreen } from './screens/sites.js';
import { createProjectSite, deleteProjectSite, renderProjectSiteForm, renderProjectSites, updateProjectSite } from './screens/projectSites.js';
import { renderSiteDashboard, renderSiteOverview, renderSiteAssets, renderSiteExperiences, renderSitePublish } from './screens/siteDashboard.js';
import { renderSiteLocations, renderLocationFormScreen, renderLocationDetailScreen } from './screens/siteLocations.js';
import { renderSiteMap } from './screens/siteMap.js';
import { renderPlaceAssets } from './screens/placeAssets.js';
import { renderAssetWorkspace, renderAssetGeneral } from './screens/assetWorkspace.js';
import { renderV1Editors, renderV1General, renderV1PlantProfile, renderV1Anchors } from './components/v1Editors.js';
import { createPlaceMarker, createSitePlace, deletePlaceMarker, deleteSitePlace, savePlantProfile, updatePlaceMarker, updateSitePlace } from './services/persistence.js';

const app = document.getElementById('app');
const siteManager = new SiteManager();

async function bootstrap() {
    try {
        await siteManager.loadSitesFromDisk();
        renderLaunchScreen(app);
    } catch (error) {
        app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <h1>Studio could not start</h1>
                <p class="subtitle">The persistence server is unavailable.</p>
            </div>
            <div class="panel">
                <p>Start the Studio with <code>node tools/persistence-server.mjs</code> from the repository root, then open <code>http://127.0.0.1:8000/</code>.</p>
                <p class="meta">${error.message}</p>
            </div>
        </div>`;
    }
}

window.renderLaunchScreen = () => renderLaunchScreen(app);
window.renderStudio = () => renderStudio(app);
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
    app.innerHTML = renderV1Anchors(site, place, asset);
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
            await siteManager.createProject({ name, template });
            await siteManager.loadSitesFromDisk();
            window.renderProjects();
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
                template: projectTemplate.value
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

bootstrap();
