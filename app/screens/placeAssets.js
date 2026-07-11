import { renderAssetForm } from '../components/assetForm.js';

const assetCategories = [
    'Plant',
    'Tree',
    'Shrub',
    'Sculpture',
    'Building',
    'Water Feature',
    'Habitat',
    'Artwork',
    'Sign',
    'Seat',
    'Infrastructure',
    'Other'
];

export function renderPlaceAssets(app, site, place, mode = 'list', asset = null) {
    const assets = place.assets || [];

    if (mode === 'form') {
        const formHtml = renderAssetForm(
            assetCategories,
            `window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')`,
            asset ? `window.updateAsset(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})` : `window.createAsset(${JSON.stringify(site)}, ${JSON.stringify(place)})`
        );

        app.innerHTML = `
        <div class="screen">
            <div class="page-header">
                <button class="ghost" onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')">Back</button>
                <h1>New Asset</h1>
                <p class="subtitle">Add a new asset to this location.</p>
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
            <p class="subtitle">Manage objects attached to this place.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'form')">New Asset</button>
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
