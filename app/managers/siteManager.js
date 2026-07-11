import { createSite } from '../models/site.js';
import {
    createAssetOnDisk,
    createPlaceOnDisk,
    createSiteOnDisk,
    deleteAssetOnDisk,
    deletePlaceOnDisk,
    loadSite,
    loadSites,
    updateAssetOnDisk,
    updatePlaceOnDisk,
    updateSiteOnDisk
} from '../services/persistence.js';

export class SiteManager {
    constructor() {
        this.sites = [];
    }

    async loadSitesFromDisk() {
        const persistedSites = await loadSites();
        this.sites = (persistedSites || []).map(site => createSite(site));
        return this.sites;
    }

    async getSiteData(id) {
        const persistedSite = await loadSite(id);
        if (!persistedSite) {
            return this.getSite(id);
        }

        const siteIndex = this.sites.findIndex(existingSite => existingSite.id === id);
        const loadedSite = createSite(persistedSite);

        if (siteIndex >= 0) {
            this.sites[siteIndex] = loadedSite;
        } else {
            this.sites.push(loadedSite);
        }

        return loadedSite;
    }

    getAllSites() {
        return this.sites;
    }

    getSite(id) {
        return this.sites.find(site => site.id === id) || null;
    }

    async createSite(site) {
        const createdSite = await createSiteOnDisk(site);
        const newSite = createSite(createdSite);
        this.sites.push(newSite);
        return newSite;
    }

    async updateSite(site) {
        const updatedSite = await updateSiteOnDisk(site);
        const index = this.sites.findIndex(existingSite => existingSite.id === site.id);

        if (index >= 0) {
            this.sites[index] = createSite(updatedSite);
            return this.sites[index];
        }

        const newSite = createSite(updatedSite);
        this.sites.push(newSite);
        return newSite;
    }

    async createPlace(site, place) {
        const createdPlace = await createPlaceOnDisk(site.id, place);
        const refreshedSite = await this.getSiteData(site.id);
        return { site: refreshedSite, place: createdPlace };
    }

    async updatePlace(site, place) {
        const updatedPlace = await updatePlaceOnDisk(site.id, place);
        const refreshedSite = await this.getSiteData(site.id);
        return { site: refreshedSite, place: updatedPlace };
    }

    async deletePlace(site, placeId) {
        await deletePlaceOnDisk(site.id, placeId);
        const refreshedSite = await this.getSiteData(site.id);
        return refreshedSite;
    }

    async createAsset(site, place, asset) {
        const createdAsset = await createAssetOnDisk(site.id, place.id, asset);
        const refreshedSite = await this.getSiteData(site.id);
        return { site: refreshedSite, asset: createdAsset };
    }

    async updateAsset(site, place, asset) {
        const updatedAsset = await updateAssetOnDisk(site.id, place.id, asset);
        const refreshedSite = await this.getSiteData(site.id);
        return { site: refreshedSite, asset: updatedAsset };
    }

    async deleteAsset(site, place, assetId) {
        await deleteAssetOnDisk(site.id, place.id, assetId);
        const refreshedSite = await this.getSiteData(site.id);
        return refreshedSite;
    }

    deleteSite(id) {
        const initialLength = this.sites.length;
        this.sites = this.sites.filter(site => site.id !== id);
        return this.sites.length < initialLength;
    }
}
