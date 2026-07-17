import { createProjectSite, deleteProjectSite, loadProjectSites, updateProjectSite } from '../services/persistence.js';

export async function renderProjectSites(app, project) {
    const sites = await loadProjectSites(project.id);
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjects()">Back</button><h1>${project.name}</h1><p class="subtitle">Locations</p></div><div class="panel"><button class="primary" onclick="window.renderProjectSiteForm(${JSON.stringify(project)})">New Location</button></div>${sites.map(site => `<div class="panel"><div class="list-item"><div><strong>${site.name}</strong><p>Manage this Location and its Areas.</p></div><div class="button-row"><button onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Open</button><button onclick="window.renderProjectSiteForm(${JSON.stringify(project)}, ${JSON.stringify(site)})">Rename</button><button onclick="window.deleteProjectSite(${JSON.stringify(project)}, '${site.id}')">Delete</button></div></div></div>`).join('') || '<div class="panel"><p>No Locations yet.</p></div>'}</div>`;
}

export function renderProjectSiteForm(app, project, site = null) {
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderProjectSites(${JSON.stringify(project)})">Back</button><h1>${site ? 'Rename Location' : 'New Location'}</h1></div><div class="panel"><div class="field"><label for="managedSiteName">Location name</label><input id="managedSiteName" value="${site?.name || ''}" /></div><div class="button-row"><button onclick="window.renderProjectSites(${JSON.stringify(project)})">Cancel</button><button class="primary" onclick="window.saveProjectSite(${JSON.stringify(project)}, ${site ? JSON.stringify(site) : 'null'})">${site ? 'Save Location' : 'Create Location'}</button></div></div></div>`;
}

export { createProjectSite, deleteProjectSite, updateProjectSite };
