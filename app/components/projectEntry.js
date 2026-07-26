function actionCard(item, className = '') {
    return `<button class="${className}" type="button" onclick="${item.action}"><strong>${item.label}</strong>${item.description ? `<span>${item.description}</span>` : ''}</button>`;
}

function statusItem(label, value) {
    return `<div class="experience-status-item"><span>${label}</span><strong>${value}</strong></div>`;
}

const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function contextualGuidance(guidance, target) {
    if (!guidance || guidance.target !== target || ['dashboardWelcome', 'quickAccess'].includes(guidance.feature)) return '';
    return `<aside class="contextual-guidance contextual-guidance-${guidance.stage}" aria-label="${guidance.title}">
        <div><span class="guidance-stage">${guidance.stage === 'new' ? 'First-use guidance' : 'Helpful reminder'}</span><strong>${guidance.title}</strong><p>${guidance.body}</p></div>
        <div class="contextual-guidance-actions">${guidance.action ? `<button class="guidance-primary-action" type="button" onclick="${guidance.action}">${guidance.actionLabel}</button>` : ''}<button type="button" onclick="${guidance.dismissAction}">Got it</button></div>
    </aside>`;
}

function tutorialSpotlight(guidance) {
    if (!guidance || !['dashboardWelcome', 'arMode', 'startingPoint', 'area', 'quickAccess'].includes(guidance.feature)) return '';
    return `<div class="tutorial-spotlight-shield" aria-hidden="true"></div>
        <aside class="tutorial-spotlight-callout tutorial-spotlight-${guidance.target}" aria-label="${guidance.title}">
            <span class="guidance-stage">First steps</span>
            <strong>${guidance.title}</strong>
            <p>${guidance.body}</p>
            <div class="tutorial-spotlight-actions">
                <button type="button" onclick="${guidance.dismissAction}">Skip this step</button>
                <button class="primary" type="button" onclick="${guidance.nextAction}">Next</button>
            </div>
        </aside>`;
}

function latestEntryRow(item) {
    return `<button class="latest-entry-row change-entry-row" type="button" onclick="${item.action}">
        <span class="latest-entry-copy"><strong>${item.label}</strong><span>${item.type}</span></span>
        <span class="latest-entry-detail"><span>Date</span><strong>${item.date}</strong></span>
        <span class="latest-entry-detail latest-entry-author"><span>Added by</span><strong>${item.creator}</strong></span>
    </button>`;
}

export function renderProjectEntry(config) {
    const latestEntries = config.latestEntries || [];
    const areas = config.areas || [];
    const searchItems = config.searchItems || [];
    const latestEntriesHtml = latestEntries.length
        ? latestEntries.map(latestEntryRow).join('')
        : '<p class="project-empty-state">No entries have been added yet.</p>';
    const areaListHtml = areas.length
        ? areas.map(area => `<button class="project-area-link" type="button" onclick="${area.action}">
            <span class="project-area-link-icon" aria-hidden="true">▧</span>
            <span class="project-area-link-copy"><strong>${area.label}</strong><span>${area.type} · ${area.contentCount} element${area.contentCount === 1 ? '' : 's'}</span></span>
            <span class="project-area-link-meta">${area.hasHomeBase ? 'Home Base' : area.hasStartingPoint ? 'Trail Entrance' : area.hasLocation ? 'GPS assigned' : 'Open Area'}</span>
        </button>`).join('')
        : '<p class="project-empty-state">No Areas yet. Create one when you are ready to organise content.</p>';
    const searchResultsHtml = searchItems.map(item => `<button class="project-search-result" type="button" data-project-search-item data-search="${escapeAttribute(item.searchText)}" data-search-primary="${escapeAttribute(item.primarySearchText || item.label)}" onclick="${item.action}" hidden>
        <span class="project-search-result-icon" aria-hidden="true">${item.icon}</span>
        <span class="project-search-result-copy"><strong>${item.label}</strong><span>${item.type}${item.area ? ` · ${item.area}` : ''}</span>${item.detail ? `<small>${item.detail}</small>` : ''}</span>
        <span class="project-search-result-open">Open</span>
    </button>`).join('');
    const growth = config.growthJourney;
    const growthJourneyHtml = growth ? `<section class="living-map-progress" aria-labelledby="livingMapProgressTitle">
        <div class="living-map-progress-heading">
            <div><span class="growth-stage">${escapeAttribute(growth.stage)}</span><h2 id="livingMapProgressTitle">Your living map is ${escapeAttribute(growth.message)}</h2></div>
            <strong>${growth.completed} of ${growth.steps.length}</strong>
        </div>
        <div class="living-growth-path" role="progressbar" aria-valuemin="0" aria-valuemax="${growth.steps.length}" aria-valuenow="${growth.completed}">
            ${growth.steps.map((step, index) => `<span class="${step.complete ? 'is-complete' : index === growth.completed ? 'is-current' : ''}" title="${escapeAttribute(step.label)}"><i></i><small>${escapeAttribute(step.label)}</small></span>`).join('')}
        </div>
        <div class="living-map-next"><span>${escapeAttribute(growth.nextDescription)}</span><button class="primary" type="button" onclick="${growth.nextAction}">${escapeAttribute(growth.nextLabel)}</button></div>
        ${growth.optionalFeature ? `<details class="living-map-optional"><summary>Optional: create a home or visitor entrance</summary><p>A Home Base helps organise an everyday map. A Trail Entrance begins a guided visitor journey. Neither is required for an orchard or backyard map.</p><div class="button-row">${growth.optionalFeature.showHome ? `<button type="button" onclick="${growth.optionalFeature.homeAction}">Add Home Base</button>` : ''}${growth.optionalFeature.showTrail ? `<button type="button" onclick="${growth.optionalFeature.trailAction}">Create Trail Entrance</button>` : ''}</div></details>` : ''}
    </section>` : '';
    const spotlightTarget = ['arMode', 'startingPoint', 'area', 'quickAccess'].includes(config.guidance?.feature)
            ? 'quickAccess'
            : '';

    // Quiet management tools displayed below the primary AR path.
    const contentSections = `
        <section class="content-mode-section">
            <button class="content-mode-card" type="button" onclick="${config.fieldGuideAction}">
                <span class="content-mode-icon" aria-hidden="true">🌿</span>
                <div><strong>Field Guide</strong><span>Browse and edit Plants and their information.</span></div>
            </button>
            <button class="content-mode-card" type="button" onclick="${config.mapAction}">
                <span class="content-mode-icon" aria-hidden="true">⌕</span>
                <div><strong>Site Map</strong><span>See Areas, paths and placed content across the property.</span></div>
            </button>
            <button class="content-mode-card" type="button" onclick="${config.storiesAction}">
                <span class="content-mode-icon" aria-hidden="true">⚑</span>
                <div><strong>Stories & Checkpoints</strong><span>Manage stories, guided moments and checkpoints.</span></div>
            </button>
        </section>`;

    return `<div class="screen project-entry location-selected${spotlightTarget ? ' tutorial-spotlight-active' : ''}" data-location-id="${config.locationId}">
        <header class="location-dashboard-header${spotlightTarget === 'header' ? ' tutorial-spotlight-target' : ''}">
            <h1>${config.locationName}</h1>
            <span class="dashboard-identity">Dashboard</span>
            <p class="dashboard-location-name">${config.siteName}</p>
        </header>

        ${growthJourneyHtml}

        <section class="dashboard-ar-path${spotlightTarget === 'quickAccess' ? ' tutorial-spotlight-target' : ''}" aria-labelledby="openArTitle">
            <button class="dashboard-open-ar" type="button" onclick="${config.openArAction}">
                <span aria-hidden="true">◉</span>
                <strong id="openArTitle">OPEN AR</strong>
                <small>Place or update Markers on site.</small>
            </button>
            <div class="dashboard-vital-actions">
                ${config.homeConfigured ? `<button class="dashboard-spatial-home" type="button" onclick="${config.homeAction}"><b aria-hidden="true">◊</b><strong>${config.homeLabel}</strong></button>` : ''}
            </div>
        </section>

        ${contentSections}

        <section class="project-search-section" aria-labelledby="projectSearchTitle">
            <div class="section-heading-row">
                <div><h2 id="projectSearchTitle">Search</h2><p>Find an Area, Plant, Note, checkpoint or saved information.</p></div>
            </div>
            <div class="project-search-box">
                <span aria-hidden="true">⌕</span>
                <input id="projectSearchInput" type="search" aria-label="Search this project" placeholder="Search Areas, Plants, Notes and information…" autocomplete="off" oninput="window.filterProjectSearch(this.value)" />
            </div>
            <p id="projectSearchSummary" class="project-search-summary" aria-live="polite">Type to search ${searchItems.length} item${searchItems.length === 1 ? '' : 's'}.</p>
            <div id="projectSearchResults" class="project-search-results">${searchResultsHtml}</div>
            <p id="projectSearchEmpty" class="project-empty-state" hidden>No matches found. Try a Plant name, Area, Note text or description.</p>
        </section>

        <section class="project-areas-section collapsed-areas" aria-labelledby="projectAreasTitle" data-areas-expanded="false">
            <div class="section-heading-row areas-heading-row">
                <button class="areas-toggle" type="button" aria-expanded="false" onclick="window.toggleAreas(this)">
                    <h2 id="projectAreasTitle">Areas</h2>
                    <span class="areas-toggle-right"><span class="project-area-count">${areas.length}</span><span class="areas-arrow" aria-hidden="true">▾</span></span>
                </button>
                <button class="project-create-area" type="button" onclick="${config.createAreaAction || ''}">+ CREATE AREA</button>
            </div>
            ${contextualGuidance(config.guidance, 'areas')}
            <div class="project-area-list">${areaListHtml}</div>
        </section>

        <section class="experience-status project-status" aria-labelledby="projectStatusTitle">
            <div class="section-heading-row"><h2 id="projectStatusTitle">Project Status</h2></div>
            <div class="experience-status-grid">
                ${statusItem('Entries', config.status.entries)}
                ${statusItem('Unplaced', `<button class="status-count-link" type="button" onclick="${config.unplacedAction}">${config.status.unplaced}</button>`)}
                ${statusItem('Areas', config.status.areas)}
                ${statusItem('Updated', config.status.lastUpdated)}
            </div>
        </section>

        <nav class="location-tool-grid" aria-label="Location tools">
            ${config.tools.map(item => actionCard(item, 'location-tool-card')).join('')}
        </nav>

        <section class="latest-entries-section">
            <div class="section-heading-row"><h2>Changes</h2><button class="view-all-entries" type="button" onclick="${config.viewAllAction}">See all</button></div>
            <div class="latest-entry-list">${latestEntriesHtml}</div>
        </section>
        <footer class="dashboard-location-footer">
            <button class="change-location-control exit-project-creator" type="button" onclick="${config.backAction}">← Exit Project Creator</button>
        </footer>
        ${tutorialSpotlight(config.guidance)}
    </div>`;
}
