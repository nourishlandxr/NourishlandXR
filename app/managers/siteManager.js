import { createSite } from '../models/site.js';
import { createProjectOnDisk, deleteProjectOnDisk, loadProjects, renameProjectOnDisk } from '../services/persistence.js';

export class SiteManager {
    constructor() {
        this.sites = [];
    }

    async loadSitesFromDisk() {
        const persistedSites = await loadProjects();
        this.sites = (persistedSites || []).map(site => createSite(site));
        return this.sites;
    }

    getAllSites() {
        return this.sites;
    }

    getSite(id) {
        return this.sites.find(site => site.id === id) || null;
    }

    async createProject(project) {
        const createdProject = await createProjectOnDisk(project);
        const newProject = createSite(createdProject);
        this.sites.push(newProject);
        return newProject;
    }

    async renameProject(projectId, project) {
        const renamedProject = createSite(await renameProjectOnDisk(projectId, project));
        const index = this.sites.findIndex(existingSite => existingSite.id === projectId);

        if (index >= 0) {
            this.sites[index] = renamedProject;
        } else {
            this.sites.push(renamedProject);
        }

        return renamedProject;
    }

    async deleteProject(projectId) {
        await deleteProjectOnDisk(projectId);
        this.sites = this.sites.filter(site => site.id !== projectId);
    }

    deleteSite(id) {
        const initialLength = this.sites.length;
        this.sites = this.sites.filter(site => site.id !== id);
        return this.sites.length < initialLength;
    }
}
