export function renderSiteMap(app, site) {
    const places = (site.locations || []).map(location => ({
        id: location.id,
        name: location.name,
        type: location.type
    }));

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderSiteDashboard(${JSON.stringify(site)})">Back</button>
            <h1>${site.name}</h1>
            <p class="subtitle">Map workspace</p>
        </div>

        <div class="two-column">
            <div class="panel">
                <h2>Areas</h2>
                <div class="stack-list">
                    ${places.length ? places.map(place => `
                        <div class="list-item">
                            <div>
                                <strong>${place.name}</strong>
                                <p>${place.type}</p>
                            </div>
                            <button onclick="window.selectMapPlace('${place.id}', ${JSON.stringify(site)})">Select</button>
                        </div>
                    `).join('') : '<p>No Areas yet.</p>'}
                </div>
            </div>

            <div class="panel">
                <h2>Selected Area</h2>
                <div id="mapPlaceInfo" class="meta">No Area selected</div>
                <div class="panel" style="margin-top:10px;">
                    <p>Empty workspace</p>
                </div>
            </div>
        </div>
    </div>
    `;

    app.innerHTML = html;
}
