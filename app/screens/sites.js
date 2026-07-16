import { SiteManager } from '../managers/siteManager.js';
import { renderSiteForm } from '../components/siteForm.js';
import { renderSiteDashboard } from './siteDashboard.js';

let selectedTemplate = 'blank';

export function renderSitesScreen(app, siteManager = new SiteManager()) {
    const sites = siteManager.getAllSites().filter(site => site.id !== 'Banyula');

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderStudio()">Back</button>
            <h1>Locations</h1>
            <p class="subtitle">Manage locations in this workspace.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderProjectForm()">New Location</button>
                <button onclick="document.getElementById('projectImportFile').click()">Import Location</button>
                <input id="projectImportFile" type="file" accept=".zip,application/zip" style="display:none" onchange="window.importProjectFile(this.files[0])" />
            </div>
        </div>
    `;

    sites.forEach(site => {
        html += `
        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>${site.name}</strong>
                    <p>Open this location to manage its sites.</p>
                </div>
                <div class="button-row">
                    <button onclick="window.renderProjectSites(${JSON.stringify(site)})">Open</button>
                    <button onclick="window.renderProjectForm(${JSON.stringify(site)})">Rename</button>
                    <button onclick="window.exportProject('${site.id}')">Export</button>
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
        'window.renderDemoProjects()',
        project ? `window.renameProjectFromForm(${JSON.stringify(project)})` : 'window.createProjectFromForm()',
        project,
        selectedTemplate
    );

    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderDemoProjects()">Back</button>
            <h1>${project ? 'Rename Location' : 'New Location'}</h1>
            <p class="subtitle">${project ? 'Update the location name.' : 'Create a new location in this workspace.'}</p>
        </div>
        ${formHtml}
    </div>
    `;
}

export function setProjectTemplate(app, templateKey) {
    selectedTemplate = templateKey;
    renderProjectFormScreen(app);
}

export function renderSiteFormScreen(app, siteManager) {
    return renderProjectFormScreen(app);
}

export function renderSites(app, siteManager) {
    return renderSitesScreen(app, siteManager);
}

