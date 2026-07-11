export function renderLaunchScreen(app) {
    app.innerHTML = `
    <div class="screen">
        <div class="page-header">
            <h1>Nourishland XR</h1>
            <p class="subtitle">Spatial learning platform</p>
        </div>

        <div class="panel">
            <h2>Platform</h2>
            <p>Preview visitor experiences.</p>
            <div class="button-row">
                <button onclick="alert('Platform coming soon')">Launch Platform</button>
            </div>
        </div>

        <div class="panel">
            <h2>Studio</h2>
            <p>Create and manage sites, locations, assets, and experiences.</p>
            <div class="button-row">
                <button class="primary" onclick="window.renderStudio()">Launch Studio</button>
            </div>
        </div>
    </div>
    `;
}
