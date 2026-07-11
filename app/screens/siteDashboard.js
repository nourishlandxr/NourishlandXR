export function renderSiteDashboard(app, site, onBack) {
    const sections = [
        { key: 'overview', label: 'Overview' },
        { key: 'places', label: 'Places' },
        { key: 'assets', label: 'Assets' },
        { key: 'experiences', label: 'Experiences' },
        { key: 'map', label: 'Map' },
        { key: 'publish', label: 'Publish' }
    ];

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="${onBack}">Back</button>
            <h1>${site.name}</h1>
            <p class="subtitle">Site workspace</p>
        </div>

        <div class="panel">
            <div class="stack-list">
    `;

    sections.forEach(section => {
        const action = section.key === 'overview'
            ? `window.renderSiteOverview(${JSON.stringify(site)})`
            : section.key === 'places'
                ? `window.renderSiteLocations(${JSON.stringify(site)})`
                : section.key === 'assets'
                    ? `window.renderSiteAssets(${JSON.stringify(site)})`
                    : section.key === 'experiences'
                        ? `window.renderSiteExperiences(${JSON.stringify(site)})`
                        : section.key === 'map'
                            ? `window.renderSiteMap(${JSON.stringify(site)})`
                            : `window.renderSitePublish(${JSON.stringify(site)})`;

        html += `
        <div class="list-item">
            <div>
                <strong>${section.label}</strong>
                <p>Manage ${section.label.toLowerCase()}.</p>
            </div>
            <button onclick="${action}">Open</button>
        </div>
        `;
    });

    html += `
            </div>
        </div>
    </div>`;

    app.innerHTML = html;
}

export function renderSiteOverview(app, site) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>Overview</h1>
            <p class="subtitle">Project information</p>
        </div>

        <div class="panel">
            <h2>${site.name}</h2>
            <p class="meta">Template: ${site.template || 'None'}</p>
            <p class="meta">Places: ${(site.locations || []).length}</p>
        </div>
    </div>
    `;
}

export function renderSiteAssets(app, site) {
    const locations = site.locations || [];
    const assets = locations.flatMap(location => (location.assets || []).map(asset => ({ ...asset, placeId: location.id, placeName: location.name })));

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>Assets</h1>
            <p class="subtitle">All authored assets in this site.</p>
        </div>

        <div class="panel">
            <div class="stack-list">
    `;

    if (assets.length) {
        assets.forEach(asset => {
            const place = locations.find(location => location.id === asset.placeId) || {};
            html += `
            <div class="list-item">
                <div>
                    <strong>${asset.name}</strong>
                    <p>${asset.category} · ${asset.placeName}</p>
                </div>
                <button onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Open</button>
            </div>
            `;
        });
    } else {
        html += '<p>No assets yet.</p>';
    }

    html += `
            </div>
        </div>
    </div>`;

    app.innerHTML = html;
}

export function renderSiteExperiences(app, site) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>Experiences</h1>
            <p class="subtitle">Create and manage guided experiences.</p>
        </div>

        <div class="panel">
            <p>No experiences yet.</p>
        </div>
    </div>
    `;
}

export function renderSitePublish(app, site) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>Publish</h1>
            <p class="subtitle">Prepare this site for review.</p>
        </div>

        <div class="panel">
            <p>Publishing is not implemented yet.</p>
        </div>
    </div>
    `;
}
