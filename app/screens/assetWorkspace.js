export function renderAssetWorkspace(app, site, place, asset) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderPlaceAssets(${JSON.stringify(site)}, ${JSON.stringify(place)}, 'list')">Back</button>
            <h1>${asset.name}</h1>
            <p class="subtitle">Field notebook editor</p>
        </div>

        <div class="panel">
            <div class="stack-list">
                <div class="list-item">
                    <div>
                        <strong>General</strong>
                        <p>Basic details for this asset.</p>
                    </div>
                    <button onclick="window.renderV1General(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Open</button>
                </div>
                <div class="list-item">
                    <div>
                        <strong>Plant Profile</strong>
                        <p>Plant reference notes.</p>
                    </div>
                    <button onclick="window.renderV1PlantProfile(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Open</button>
                </div>
                <div class="list-item">
                    <div>
                        <strong>Anchors</strong>
                        <p>Anchor points and notes.</p>
                    </div>
                    <button onclick="window.renderV1Anchors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Open</button>
                </div>
            </div>
        </div>
    </div>`;
}

export function renderAssetGeneral(app, site, place, asset) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>General</h1>
            <p class="subtitle">Asset details</p>
        </div>

        <div class="panel">
            <h2>${asset.name}</h2>
            <p class="meta">Category: ${asset.category}</p>
        </div>
    </div>
    `;
}
