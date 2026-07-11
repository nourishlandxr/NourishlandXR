import { SiteManager } from './managers/siteManager.js';
import { renderLaunchScreen } from './screens/launch.js';
import { renderStudio } from './screens/studio.js';
import { renderSites, renderSiteFormScreen } from './screens/sites.js';
import { renderSiteDashboard, renderSiteOverview, renderSiteAssets, renderSiteExperiences, renderSitePublish } from './screens/siteDashboard.js';
import { renderSiteLocations, renderLocationFormScreen, renderLocationDetailScreen } from './screens/siteLocations.js';
import { renderSiteMap } from './screens/siteMap.js';
import { renderPlaceAssets } from './screens/placeAssets.js';
import { renderAssetWorkspace, renderAssetGeneral } from './screens/assetWorkspace.js';
import { renderV1Editors, renderV1General, renderV1PlantProfile, renderV1Anchors } from './components/v1Editors.js';

const app = document.getElementById('app');
const siteManager = new SiteManager();

async function bootstrap() {
    await siteManager.loadSitesFromDisk();
    renderLaunchScreen(app);
}

window.renderLaunchScreen = () => renderLaunchScreen(app);
window.renderStudio = () => renderStudio(app);
window.renderSites = async () => {
    await siteManager.loadSitesFromDisk();
    renderSites(app, siteManager);
};
window.renderSiteForm = () => renderSiteFormScreen(app, siteManager);
window.renderSiteDashboard = (site) => renderSiteDashboard(app, site, 'window.renderSites()');
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
    app.innerHTML = renderV1PlantProfile(site, place, asset);
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
window.createSiteFromForm = async () => {
    const siteName = document.getElementById('siteName');
    const siteTemplate = document.getElementById('siteTemplate');

    if (siteName && siteTemplate) {
        const name = siteName.value.trim();
        const template = siteTemplate.value;

        if (name) {
            await siteManager.createSite({ id: name.toLowerCase().replace(/\s+/g, '_'), name, template, locations: [] });
            await siteManager.loadSitesFromDisk();
            window.renderSites();
        }
    }
};
window.createLocation = async (site) => {
    const locationName = document.getElementById('locationName');
    const locationType = document.getElementById('locationType');

    if (locationName && locationType) {
        const name = locationName.value.trim();
        const type = locationType.value;

        if (name) {
            const existingSite = siteManager.getSite(site.id);
            if (existingSite) {
                const placeData = {
                    id: name.toLowerCase().replace(/\s+/g, '_'),
                    name,
                    type,
                    description: '',
                    notes: '',
                    mapPosition: 'Not set'
                };
                await siteManager.createPlace(existingSite, placeData);
            }
            const refreshedSite = await siteManager.getSiteData(site.id);
            window.renderSiteLocations(refreshedSite || site);
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
            const existingSite = siteManager.getSite(site.id);
            if (existingSite) {
                await siteManager.updatePlace(existingSite, updatedLocation);
            }
            const refreshedSite = await siteManager.getSiteData(site.id);
            window.renderSiteLocations(refreshedSite || site);
        }
    }
};
window.deleteLocation = async (site, locationId) => {
    const existingSite = siteManager.getSite(site.id);
    if (existingSite) {
        await siteManager.deletePlace(existingSite, locationId);
    }
    const refreshedSite = await siteManager.getSiteData(site.id);
    window.renderSiteLocations(refreshedSite || site);
};
window.createAsset = async (site, place) => {
    const assetName = document.getElementById('assetName');
    const assetCategory = document.getElementById('assetCategory');

    if (assetName && assetCategory) {
        const name = assetName.value.trim();
        const category = assetCategory.value;

        if (name) {
            const existingSite = siteManager.getSite(site.id);
            if (existingSite) {
                const createdAsset = { id: name.toLowerCase().replace(/\s+/g, '_'), name, category, experiences: [] };
                const result = await siteManager.createAsset(existingSite, place, createdAsset);
                const refreshedSite = result.site;
                const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
                window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
                return;
            }
            const refreshedSite = siteManager.getSite(site.id) || site;
            const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
            window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
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
            const existingSite = siteManager.getSite(site.id);
            if (existingSite) {
                const updatedAsset = { ...asset, name, category };
                const result = await siteManager.updateAsset(existingSite, place, updatedAsset);
                const refreshedSite = result.site;
                const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
                window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
                return;
            }
            const refreshedSite = siteManager.getSite(site.id) || site;
            const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
            window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
        }
    }
};
window.deleteAsset = async (site, place, assetId) => {
    const existingSite = siteManager.getSite(site.id);
    if (existingSite) {
        const refreshedSite = await siteManager.deleteAsset(existingSite, place, assetId);
        const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
        window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
        return;
    }
    const refreshedSite = siteManager.getSite(site.id) || site;
    const refreshedPlace = (refreshedSite.locations || []).find(location => location.id === place.id) || place;
    window.renderPlaceAssets(refreshedSite, refreshedPlace, 'list');
};

bootstrap();
