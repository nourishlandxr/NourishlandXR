import { SiteManager } from '../managers/siteManager.js';
import { renderSiteForm } from '../components/siteForm.js';
import { renderSiteDashboard } from './siteDashboard.js';

export function renderSitesScreen(app, siteManager = new SiteManager()) {
    const sites = siteManager.getAllSites();

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderStudio()">Back</button>
            <h1>Projects</h1>
            <p class="subtitle">Manage projects in this workspace.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderProjectForm()">New Project</button>
            </div>
        </div>
    `;

    sites.forEach(site => {
        html += `
        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>${site.name}</strong>
                    <p>Open this project to manage its sites.</p>
                </div>
                <div class="button-row">
                    <button onclick="window.renderProjectSites(${JSON.stringify(site)})">Open</button>
                    <button onclick="window.renderProjectForm(${JSON.stringify(site)})">Rename</button>
                    <button onclick="window.deleteProject('${site.id}')">Delete</button>
                </div>
            </div>
        </div>
        `;
    });

    html += `</div>`;
    app.innerHTML = html;
}

export function renderProjectFormScreen(app, project = null) {
    const formHtml = renderSiteForm(
        'window.renderProjects()',
        project ? `window.renameProjectFromForm(${JSON.stringify(project)})` : 'window.createProjectFromForm()',
        project
    );

    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderProjects()">Back</button>
            <h1>${project ? 'Rename Project' : 'New Project'}</h1>
            <p class="subtitle">${project ? 'Update the project name.' : 'Create a new project in this workspace.'}</p>
        </div>
        ${formHtml}
    </div>
    `;
}

export function renderSiteFormScreen(app, siteManager) {
    return renderProjectFormScreen(app);
}

export function renderSites(app, siteManager) {
    return renderSitesScreen(app, siteManager);
}
