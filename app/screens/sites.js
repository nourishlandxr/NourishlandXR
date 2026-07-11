import { SiteManager } from '../managers/siteManager.js';
import { renderSiteForm } from '../components/siteForm.js';
import { renderSiteDashboard } from './siteDashboard.js';

export function renderSitesScreen(app, siteManager = new SiteManager()) {
    const sites = siteManager.getAllSites();

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderStudio()">Back</button>
            <h1>Sites</h1>
            <p class="subtitle">Manage authored site projects.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderSiteForm()">New Site</button>
            </div>
        </div>
    `;

    sites.forEach(site => {
        html += `
        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>${site.name}</strong>
                    <p>Open this site to manage its content.</p>
                </div>
                <button onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Open</button>
            </div>
        </div>
        `;
    });

    html += `</div>`;
    app.innerHTML = html;
}

export function renderSiteFormScreen(app, siteManager) {
    const formHtml = renderSiteForm(
        siteManager,
        'window.renderSites()' ,
        'window.createSiteFromForm()'
    );

    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSites()">Back</button>
            <h1>New Site</h1>
            <p class="subtitle">Create a new site entry.</p>
        </div>
        ${formHtml}
    </div>
    `;
}

export function renderSites(app, siteManager) {
    return renderSitesScreen(app, siteManager);
}
