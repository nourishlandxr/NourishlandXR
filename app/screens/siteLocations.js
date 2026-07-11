import { renderLocationForm } from '../components/locationForm.js';
import { renderPlaceDetails } from '../components/placeDetails.js';
import { loadSitePlaces } from '../services/persistence.js';

const locationTypes = [
    'Row',
    'Terrace',
    'Garden',
    'Collection',
    'Glasshouse',
    'Orchard Block',
    'Trail Stop',
    'Habitat',
    'Water Feature',
    'Operational Area',
    'Other'
];

export async function renderSiteLocations(app, site) {
    const locations = await loadSitePlaces(site.projectId, site.id);

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>Places</h1>
            <p class="subtitle">Manage named places in the site.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderLocationForm(${JSON.stringify(site)})">New Place</button>
            </div>
        </div>
    `;

    locations.forEach(location => {
        html += `
        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>${location.name}</strong>
                    <p>Type: ${location.type}</p>
                </div>
                <div class="button-row">
                    <button onclick="window.renderLocationDetail(${JSON.stringify(site)}, ${JSON.stringify(location)})">Open</button>
                    <button onclick="window.renderLocationForm(${JSON.stringify(site)}, ${JSON.stringify(location)})">Edit</button>
                    <button onclick="window.deleteLocation(${JSON.stringify(site)}, '${location.id}')">Delete</button>
                </div>
            </div>
        </div>
        `;
    });

    html += `</div>`;
    app.innerHTML = html;
}

export function renderLocationFormScreen(app, site, location = null) {
    const formHtml = renderLocationForm(
        locationTypes,
        `window.renderSiteLocations(${JSON.stringify(site)})`,
        location ? `window.updateLocation(${JSON.stringify(site)}, ${JSON.stringify(location)})` : `window.createLocation(${JSON.stringify(site)})`,
        location || {}
    );

    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteLocations(${JSON.stringify(site)})">Back</button>
            <h1>${location ? 'Edit Place' : 'New Place'}</h1>
            <p class="subtitle">Define the place details.</p>
        </div>
        ${formHtml}
    </div>
    `;
}

export function renderLocationDetailScreen(app, site, location) {
    app.innerHTML = renderPlaceDetails(site, location);
}
