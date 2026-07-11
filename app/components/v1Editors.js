export function renderV1Editors(site, place, asset, onBack) {
    const sections = [
        { key: 'general', label: 'General' },
        { key: 'plantProfile', label: 'Plant Profile' },
        { key: 'anchors', label: 'Anchors' }
    ];

    let html = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="${onBack}">Back</button>
            <h1>${asset.name}</h1>
            <p class="subtitle">Field notebook editor</p>
        </div>

        <div class="panel">
            <div class="stack-list">
    `;

    sections.forEach(section => {
        const action = section.key === 'general'
            ? `window.renderV1General(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})`
            : section.key === 'plantProfile'
                ? `window.renderV1PlantProfile(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})`
                : `window.renderV1Anchors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})`;

        html += `
        <div class="list-item">
            <div>
                <strong>${section.label}</strong>
                <p>Open the ${section.label.toLowerCase()} editor.</p>
            </div>
            <button onclick="${action}">Open</button>
        </div>
        `;
    });

    html += `
            </div>
        </div>
    </div>`;

    return html;
}

export function renderV1General(site, place, asset) {
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderV1Editors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>General</h1>
            <p class="subtitle">Basic asset details</p>
        </div>

        <div class="panel">
            <div class="field">
                <label>Name</label>
                <input type="text" value="${asset.name}" />
            </div>
            <div class="field">
                <label>Category</label>
                <input type="text" value="${asset.category || ''}" />
            </div>
        </div>
    </div>
    `;
}

export function renderV1PlantProfile(site, place, asset) {
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderV1Editors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>Plant Profile</h1>
            <p class="subtitle">Plant notes and reference details</p>
        </div>

        <div class="panel">
            <div class="field">
                <label>Common Name</label>
                <input type="text" value="${asset.name}" />
            </div>
            <div class="field">
                <label>Notes</label>
                <textarea rows="4">Plant profile notes go here.</textarea>
            </div>
        </div>
    </div>
    `;
}

export function renderV1Anchors(site, place, asset) {
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderV1Editors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>Anchors</h1>
            <p class="subtitle">Anchor points for this asset</p>
        </div>

        <div class="panel">
            <div class="field">
                <label>Anchor Point</label>
                <input type="text" value="${place.name || ''}" />
            </div>
            <div class="field">
                <label>Notes</label>
                <textarea rows="4">Anchor notes go here.</textarea>
            </div>
        </div>
    </div>
    `;
}