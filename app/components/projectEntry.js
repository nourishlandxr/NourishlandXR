function actionCard(item, className = '') {
    return `<button class="${className}" type="button" onclick="${item.action}"><strong>${item.label}</strong>${item.description ? `<span>${item.description}</span>` : ''}</button>`;
}

function statusItem(label, value, wide = false) {
    return `<div class="experience-status-item${wide ? ' experience-status-item-wide' : ''}"><span>${label}</span><strong>${value}</strong></div>`;
}

const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function latestEntryRow(item) {
    return `<button class="latest-entry-row" type="button" onclick="${item.action}">
        <span class="latest-entry-icon" aria-hidden="true">${item.icon}</span>
        <span class="latest-entry-copy"><strong>${item.label}</strong><span>${item.type} · ${item.area} · ${item.edited}</span>${item.placement ? `<span class="placement-status ${item.placementTone || ''}">${item.placement}</span>` : ''}</span>
        <span class="entry-status entry-status-${item.statusTone}">${item.status}</span>
    </button>`;
}

export function renderProjectEntry(config) {
    const latestEntries = config.latestEntries || [];
    const areas = config.areas || [];
    const searchItems = config.searchItems || [];
    const latestEntriesHtml = latestEntries.length
        ? latestEntries.map(latestEntryRow).join('')
        : '<p class="project-empty-state">No changes yet. Add something to this location to begin.</p>';
    const areaListHtml = areas.length
        ? areas.map(area => `<button class="project-area-link" type="button" onclick="${area.action}">
            <span class="project-area-link-icon" aria-hidden="true">▧</span>
            <span class="project-area-link-copy"><strong>${area.label}</strong><span>${area.type} · ${area.contentCount} element${area.contentCount === 1 ? '' : 's'}</span></span>
            <span class="project-area-link-meta">${area.hasStartingPoint ? 'Starting Point' : area.hasLocation ? 'GPS assigned' : 'Open Area'}</span>
        </button>`).join('')
        : '<p class="project-empty-state">No Areas yet. Use Add Area in Quick Access to create one.</p>';
    const searchResultsHtml = searchItems.map(item => `<button class="project-search-result" type="button" data-project-search-item data-search="${escapeAttribute(item.searchText)}" onclick="${item.action}" hidden>
        <span class="project-search-result-icon" aria-hidden="true">${item.icon}</span>
        <span class="project-search-result-copy"><strong>${item.label}</strong><span>${item.type}${item.area ? ` · ${item.area}` : ''}</span>${item.detail ? `<small>${item.detail}</small>` : ''}</span>
        <span class="project-search-result-open">Open</span>
    </button>`).join('');

    return `<div class="screen project-entry location-selected" data-location-id="${config.locationId}">
        <header class="location-dashboard-header">
            <button class="change-location-control" type="button" onclick="${config.backAction}">← Change location</button>
            <h1>${config.locationName}</h1>
            <p>${config.siteName} · Dashboard</p>
            <p class="dashboard-introduction">${config.introduction}</p>
        </header>

        <section class="location-create-section location-create-section-prominent" aria-labelledby="quickAccessTitle">
            <div class="section-heading-row"><h2 id="quickAccessTitle">Quick Access</h2></div>
            <div class="quick-access-grid">
                ${config.quickActions.map(item => `<button class="quick-access-action" type="button" onclick="${item.action}"><span class="quick-access-icon" aria-hidden="true">${item.icon}</span><strong>Add ${item.label}</strong></button>`).join('')}
            </div>
        </section>

        <section class="project-search-section" aria-labelledby="projectSearchTitle">
            <div class="section-heading-row">
                <div><h2 id="projectSearchTitle">Search this project</h2><p>Find any Area, Plant, Note, checkpoint or saved information.</p></div>
            </div>
            <div class="project-search-box">
                <span aria-hidden="true">⌕</span>
                <input id="projectSearchInput" type="search" aria-label="Search this project" placeholder="Search Areas, Plants, Notes and information…" autocomplete="off" oninput="window.filterProjectSearch(this.value)" />
            </div>
            <p id="projectSearchSummary" class="project-search-summary" aria-live="polite">Start typing to search ${searchItems.length} item${searchItems.length === 1 ? '' : 's'}.</p>
            <div id="projectSearchResults" class="project-search-results" hidden>${searchResultsHtml}</div>
            <p id="projectSearchEmpty" class="project-empty-state" hidden>No matches found. Try a Plant name, Area, Note text or description.</p>
        </section>

        ${config.onboarding?.show ? `<section class="guided-setup-panel" aria-labelledby="guidedSetupTitle">
            <p class="welcome-label">Guided setup · Extra help is on</p>
            <h2 id="guidedSetupTitle">Your next steps</h2>
            <p>This project is still new, so NourishlandXR will explain each step. Guidance becomes more compact after you have created an Area and added your first content.</p>
            <ol class="guided-setup-steps">
                <li class="${config.onboarding.hasArea ? 'is-complete' : 'is-current'}"><strong>1. Create an Area</strong><span>An Area is a smaller mapped part of this Location, such as a garden bed, row, terrace or room.</span></li>
                <li class="${config.onboarding.hasContent ? 'is-complete' : config.onboarding.hasArea ? 'is-current' : ''}"><strong>2. Add your first Plant or Note</strong><span>Choose its Area now. Its physical AR position can be added later.</span></li>
                <li class="${config.onboarding.hasStartingPoint ? 'is-complete' : config.onboarding.hasContent ? 'is-current' : ''}"><strong>3. Set the visitor Starting Point</strong><span>Choose the Area visitors enter first, then add arrival information or a physical position.</span></li>
                <li><strong>4. Preview the visitor experience</strong><span>Check the welcome page, Browse Content and AR preparation before publishing.</span></li>
            </ol>
            <button class="primary guided-next-action" type="button" onclick="${config.onboarding.nextAction}">${config.onboarding.nextLabel}</button>
        </section>` : ''}

        <section class="experience-launch-grid" aria-label="Explore this location">
            ${config.launchActions.map(item => actionCard(item, 'experience-launch-card')).join('')}
        </section>

        <section class="project-areas-section" aria-labelledby="projectAreasTitle">
            <div class="section-heading-row"><h2 id="projectAreasTitle">Areas</h2><span class="project-area-count">${areas.length}</span></div>
            <div class="project-area-list">${areaListHtml}</div>
        </section>

        <section class="experience-status" aria-labelledby="experienceStatusTitle">
            <div class="section-heading-row"><h2 id="experienceStatusTitle">Experience status</h2><span class="experience-state experience-state-${config.status.tone}">${config.status.label}</span></div>
            <div class="experience-status-grid">
                ${statusItem('Starting Point', config.status.startingPoint)}
                ${statusItem('Location accuracy', config.status.accuracy)}
                ${statusItem('Entries', config.status.entries)}
                ${statusItem('Unplaced Content', `<button class="status-count-link" type="button" onclick="${config.unplacedAction}">${config.status.unplaced}</button>`)}
                ${statusItem('Last updated', config.status.lastUpdated)}
                ${config.status.directions ? statusItem('Directions to Starting Point', config.status.directions, true) : ''}
            </div>
            ${config.status.notice ? `<p class="setup-notice">${config.status.notice}</p>` : ''}
            <div class="status-actions">${config.status.actions.map(item => `<button type="button" onclick="${item.action}">${item.label}</button>`).join('')}</div>
        </section>

        <nav class="location-tool-grid" aria-label="Location tools">
            ${config.tools.map(item => actionCard(item, 'location-tool-card')).join('')}
        </nav>

        <section class="latest-entries-section">
            <div class="section-heading-row"><h2>Changes</h2><button class="view-all-entries" type="button" onclick="${config.viewAllAction}">View all</button></div>
            <div class="latest-entry-list">${latestEntriesHtml}</div>
        </section>
    </div>`;
}
