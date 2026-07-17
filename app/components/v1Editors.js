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

export async function renderV1PlantProfile(site, place, asset) {
    const { loadPlantProfile } = await import('../services/persistence.js');
    const profile = await loadPlantProfile(site.projectId, site.id, place.id, asset.id);
    const fields = [['common_name','Common Name'],['scientific_name','Scientific Name'],['overview','Overview'],['identification','Identification'],['edible_uses','Edible Uses'],['propagation','Propagation'],['growing_conditions','Growing Conditions'],['notes','Notes'],['references','References']];
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderV1Editors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>Plant Profile</h1>
            <p class="subtitle">Plant notes and reference details</p>
        </div>

        <div class="panel">
            <div id="plantProfileError" class="meta"></div>
            ${fields.map(([key,label]) => `<div class="field"><label for="profile_${key}">${label}</label>${key === 'common_name' || key === 'scientific_name' ? `<input id="profile_${key}" value="${profile[key] || ''}" />` : `<textarea id="profile_${key}" rows="3">${profile[key] || ''}</textarea>`}</div>`).join('')}
            <div class="button-row"><button onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Cancel</button><button class="primary" onclick="window.savePlantProfile(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Save Plant Profile</button></div>
        </div>
    </div>
    `;
}

export async function renderV1Anchors(site, place, asset) {
    const { loadMarkerAnchor } = await import('../services/persistence.js');
    let anchor = {};
    try { anchor = await loadMarkerAnchor(site.projectId, site.id, place.id, asset.id); }
    catch { anchor = {}; }
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderV1Editors(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Back</button>
            <h1>Anchors</h1>
            <p class="subtitle">Place this item physically within Area ${place.name}</p>
        </div>

        <div class="panel">
            <div id="anchorError" class="meta"></div>
            <p class="placement-status ${anchor.type ? 'is-placed' : 'is-unplaced'}">Placement status: ${anchor.type ? 'Placed' : 'Not yet placed'}</p>
            <div class="field">
                <label for="anchor_type">Anchor Type</label>
                <select id="anchor_type" onchange="window.updateAnchorFields()"><option value="gps" ${anchor.type === 'gps' ? 'selected' : ''}>GPS</option><option value="qr" ${anchor.type === 'qr' ? 'selected' : ''}>QR</option></select>
            </div>
            <div id="gpsAnchorFields"><div class="button-row"><button onclick="window.useCurrentAnchorLocation()">Use Current Location</button></div><div class="field"><label for="anchor_latitude">Latitude</label><input id="anchor_latitude" value="${anchor.latitude || ''}" /></div><div class="field"><label for="anchor_longitude">Longitude</label><input id="anchor_longitude" value="${anchor.longitude || ''}" /></div><div class="field"><label for="anchor_altitude">Altitude</label><input id="anchor_altitude" value="${anchor.altitude || ''}" /></div><div class="field"><label for="anchor_accuracy">Accuracy</label><input id="anchor_accuracy" value="${anchor.accuracy || ''}" /></div><div class="field"><label for="anchor_captured_at">Captured Timestamp</label><input id="anchor_captured_at" value="${anchor.captured_at || ''}" /></div></div>
            <div id="qrAnchorFields"><div class="field"><label for="anchor_qr_code">QR Code</label><input id="anchor_qr_code" value="${anchor.qr_code || ''}" /></div><div class="field"><label for="anchor_description">Description</label><textarea id="anchor_description" rows="3">${anchor.description || ''}</textarea></div></div>
            <div class="button-row"><button onclick="window.renderAssetWorkspace(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Cancel</button><button class="primary" onclick="window.saveMarkerAnchor(${JSON.stringify(site)}, ${JSON.stringify(place)}, ${JSON.stringify(asset)})">Save Anchor</button></div>
        </div>
    </div>
    `;
}
