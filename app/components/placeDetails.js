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
                        <strong>${asset.name}</strong>
                        <p>${asset.category || 'Uncategorized'}</p>
                    </div>
                    <button onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Open</button>
                </div>
            </div>
        `).join('')
        : '<div class="panel"><p>No assets yet.</p></div>';

    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteLocations(${JSON.stringify(site)})">Back</button>
            <h1>${place.name}</h1>
            <p class="subtitle">Place details</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button onclick="window.renderLocationForm(${JSON.stringify(site)}, ${JSON.stringify(place)})">Edit</button>
                <button onclick="window.deleteLocation(${JSON.stringify(site)}, '${place.id}')">Delete</button>
            </div>
        </div>

        <div class="panel">
            <h2>Name</h2>
            <p>${place.name}</p>
        </div>

        <div class="panel">
            <h2>Description</h2>
            <p>${description}</p>
        </div>

        <div class="panel">
            <h2>Assets</h2>
            <div class="stack-list">
                ${assetList}
            </div>
        </div>

        <div class="panel">
            <h2>Notes</h2>
            <p>${notes}</p>
        </div>

        <div class="panel">
            <h2>Map Position</h2>
            <p>${mapPosition}</p>
        </div>
    </div>
    `;
}