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
            <h2>Projects</h2>
            <p>Create and manage XR projects.</p>
        </div>

        <div class="panel">
            <div class="list-item">
                <div>
                    <strong>Sites</strong>
                    <p>Botanical gardens, parks, and campuses.</p>
                </div>
                <button class="primary" onclick="window.renderSites()">Open</button>
            </div>
            <div class="list-item">
                <div>
                    <strong>Locations</strong>
                    <p>Manage places within a site.</p>
                </div>
            </div>
            <div class="list-item">
                <div>
                    <strong>Objects</strong>
                    <p>Plants, artworks, buildings, and habitats.</p>
                </div>
            </div>
            <div class="list-item">
                <div>
                    <strong>Experiences</strong>
                    <p>Tours, stories, quizzes, and learning paths.</p>
                </div>
            </div>
            <div class="list-item">
                <div>
                    <strong>Publish</strong>
                    <p>Preview and deploy experiences.</p>
                </div>
            </div>
        </div>
    </div>
    `;
}
