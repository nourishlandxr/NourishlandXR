import { renderAssetForm } from '../components/assetForm.js';
import { loadPlaceMarkers } from '../services/persistence.js';

const assetCategories = [
    'Plant',
    'Note'
];

export async function renderPlaceAssets(app, site, place, mode = 'list', asset = null) {
    const assets = await loadPlaceMarkers(site.projectId, site.id, place.id);

    if (mode === 'form') {
        const formHtml = renderAssetForm(
            assetCategories,
            `window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')`,
            asset ? `window.updateAsset(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})` : `window.createAsset(${JSON.stringify(site)}, ${JSON.stringify(place)})`,
            asset || {}
        );

        app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <button class="ghost" onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')">Back</button>
                <h1>${asset ? 'Edit Marker' : 'New Marker'}</h1>
                <p class="subtitle">Add a marker to this Area.</p>
            </div>
            ${formHtml}
        </div>
        `;
        return;
    }

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteMap(${JSON.stringify(site)})">Back</button>
            <h1>Assets</h1>
            <p class="subtitle">Manage markers attached to this Area.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'form')">New Marker</button>
            </div>
        </div>
    `;

    assets.forEach(assetItem => {
        html += `
        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>${assetItem.name}</strong>
                    <p>Category: ${assetItem.category}</p>
                </div>
                <div class="button-row">
                    <button onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(assetItem)})">Open</button>
                    <button onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'form', ${JSON.stringify(assetItem)})">Edit</button>
                    <button onclick="window.deleteAsset(${JSON.stringify(site)}, ${JSON.stringify(place)}, '${assetItem.id}')">Delete</button>
                </div>
            </div>
        </div>
        `;
    });

    html += `</div>`;

    document.getElementById('mapPlaceInfo').innerHTML = `
    <strong>${place.name}</strong><br />
    ${assets.length ? `Assets: ${assets.length}` : 'No assets yet'}
    `;

    app.innerHTML = html;
}
