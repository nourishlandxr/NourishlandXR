import { renderLaunchScreen } from './launch.js';
import { renderSitesScreen } from './sites.js';

export function renderStudio(app) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderLaunchScreen()">Back</button>
            <h1>Nourishland XR Studio</h1>
            <p class="subtitle">Authoring workspace</p>
        </div>

        <div class="panel">
            <div class="list-item">
                <div><strong>Create Field Marker</strong><p>Capture a Plant or Note with the current device location.</p></div>
                <button onclick="window.renderFieldMarker()">Open</button>
            </div>
        </div>
    </div>
    `;
}
