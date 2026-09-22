import { escapeHtml, inlineJson } from '../services/htmlSafety.js';

export function renderPlaceDetails(site, place) {
    const assets = place.assets || [];
    const description = place.description || 'No description yet.';
    const notes = place.notes || 'No notes yet.';
    const mapPosition = place.mapPosition || 'Not set';

    const assetList = assets.length
        ? assets.map(asset => `
            <div class="panel">
                <div class="list-item">
                    <div>
                        <strong>${escapeHtml(asset.name)}</strong>
                        <p>${escapeHtml(asset.category || 'Uncategorized')}</p>
                    </div>
                    <button onclick="window.renderAssetWorkspace(${inlineJson(site)}, ${inlineJson(place)}, ${inlineJson(asset)})">Open</button>
                </div>
            </div>
        `).join('')
        : '<div class="panel"><p>No assets yet.</p></div>';

    return `
    <div class="screen location-selected" data-location-id="${escapeHtml(place.id)}">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteLocations(${inlineJson(site)})">Back</button>
            <h1>${escapeHtml(place.name)}</h1>
            <p class="subtitle">Area details</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button onclick="window.renderLocationForm(${inlineJson(site)}, ${inlineJson(place)})">Edit</button>
                <button onclick="window.deleteLocation(${inlineJson(site)}, ${inlineJson(place.id)})">Delete</button>
            </div>
        </div>

        <div class="panel">
            <h2>Name</h2>
            <p>${escapeHtml(place.name)}</p>
        </div>

        <div class="panel">
            <h2>Description</h2>
            <p>${escapeHtml(description)}</p>
        </div>

        <div class="panel">
            <h2>Assets</h2>
            <div class="stack-list">
                ${assetList}
            </div>
        </div>

        <div class="panel">
            <h2>Notes</h2>
            <p>${escapeHtml(notes)}</p>
        </div>

        <div class="panel">
            <h2>Map Position</h2>
            <p>${escapeHtml(mapPosition)}</p>
        </div>
    </div>
    `;
}
