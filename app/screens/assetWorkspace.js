import { escapeHtml, inlineJson } from '../services/htmlSafety.js';

export function renderAssetWorkspace(app, site, place, asset) {
    const siteArg = inlineJson(site);
    const placeArg = inlineJson(place);
    const assetArg = inlineJson(asset);
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderPlaceAssets(${siteArg}, ${placeArg}, 'list')">Back</button>
            <h1>${escapeHtml(asset.name)}</h1>
            <p class="subtitle">Field notebook editor</p>
        </div>

        <div class="panel">
            <div class="stack-list">
                <div class="list-item">
                    <div>
                        <strong>General</strong>
                        <p>Basic details for this asset.</p>
                    </div>
                    <button onclick="window.renderV1General(${siteArg}, ${placeArg}, ${assetArg})">Open</button>
                </div>
                ${asset.type === 'plant' ? `<div class="list-item">
                    <div>
                        <strong>Plant Profile</strong>
                        <p>Plant reference notes.</p>
                    </div>
                    <button onclick="window.renderV1PlantProfile(${siteArg}, ${placeArg}, ${assetArg})">Open</button>
                </div>` : ''}
                <div class="list-item">
                    <div>
                        <strong>Anchors</strong>
                        <p>Anchor points and notes.</p>
                    </div>
                    <button onclick="window.renderV1Anchors(${siteArg}, ${placeArg}, ${assetArg})">Open</button>
                </div>
                <div class="list-item"><div><strong>Field Test</strong><p>Check this marker for an outdoor test.</p></div><button onclick="window.renderFieldTest(${siteArg}, ${placeArg}, ${assetArg})">Open</button></div>
            </div>
        </div>
    </div>`;
}

export function renderAssetGeneral(app, site, place, asset) {
    const siteArg = inlineJson(site);
    const placeArg = inlineJson(place);
    const assetArg = inlineJson(asset);
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderAssetWorkspace(${siteArg}, ${placeArg}, ${assetArg})">Back</button>
            <h1>General</h1>
            <p class="subtitle">Asset details</p>
        </div>

        <div class="panel">
            <h2>${escapeHtml(asset.name)}</h2>
            <p class="meta">Category: ${escapeHtml(asset.category)}</p>
        </div>
    </div>
    `;
}
