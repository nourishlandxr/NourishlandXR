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
    if (!guidance || !['dashboardWelcome', 'projectTutorial', 'arMode', 'helpGuide', 'startingPoint', 'area', 'quickAccess'].includes(guidance.feature)) return '';
    return `<div class="tutorial-spotlight-shield" aria-hidden="true"></div>
        <aside class="tutorial-spotlight-callout tutorial-spotlight-${guidance.target}" role="dialog" aria-modal="true">
            <summary><span class="guidance-stage">First steps</span><strong>${guidance.title}</strong><i aria-hidden="true">⌄</i></summary>
            <div class="tutorial-subtle-tip-body">
            <p>${guidance.body}</p>
            <div class="tutorial-spotlight-actions">
                <button type="button" onclick="${guidance.closeAction || guidance.dismissAction}">Close tutorial</button>
                <button class="primary" type="button" onclick="${guidance.nextAction}">Next</button>
            </div>
            </div>
        </aside>`;
}

function latestEntryRow(item) {
    return `<button class="latest-entry-row change-entry-row database-record-card" type="button" onclick="${item.action}">
        <span class="recent-record-line"><strong>${item.type}:</strong> <span>${item.label}</span> <small>— Location: ${item.location || 'N/A'}</small></span>
    </button>`;
}

export function renderProjectEntry(config) {
    const latestEntries = config.latestEntries || [];
    const areas = config.areas || [];
    const searchItems = config.searchItems || [];
    const spotlightTarget = config.guidance?.target || '';
    const latestEntriesHtml = latestEntries.length
        ? latestEntries.map(latestEntryRow).join('')
        : '<p class="project-empty-state">No entries have been added yet.</p>';
    const areaListHtml = areas.length
        ? areas.map(area => `<button class="project-area-overview-card" type="button" data-home-area="${area.isHome ? 'true' : 'false'}" data-current-area="${area.isCurrent ? 'true' : 'false'}"${area.isCurrent ? ' aria-current="location"' : ''} aria-label="Open ${area.label}" onclick="${area.action}">
            <span class="project-area-overview-icon" aria-hidden="true">${area.icon || '▧'}</span>
            <span class="project-area-overview-copy"><strong>${area.label}</strong>${area.isHome ? '<small class="project-area-overview-home-badge">HOME</small>' : ''}${area.isCurrent ? '<small class="project-area-overview-current-badge">YOU ARE HERE</small>' : ''}<span>${area.plantCount ?? 0} plant${area.plantCount === 1 ? '' : 's'} · ${area.contentCount} entr${area.contentCount === 1 ? 'y' : 'ies'}</span></span>
            <span class="project-area-overview-totem"><i style="--area-totem-color:${area.totemColor || 'transparent'}" aria-hidden="true">⌖</i><small>${area.totemPlaced ? 'Totem' : 'No Totem'}</small></span>
        </button>`).join('')
        : '<p class="project-empty-state">No Areas yet. Create one when you are ready to organise content.</p>';
    const areaOverviewHtml = `<section class="project-areas-section project-layout-section${spotlightTarget === 'areas' ? ' tutorial-spotlight-target' : ''}" aria-labelledby="projectAreasTitle" data-areas-expanded="true">
        <div class="section-heading-row areas-heading-row"><div><small class="dashboard-section-kicker">PROJECT OVERVIEW</small><h2 id="projectAreasTitle">Areas</h2></div><div class="areas-heading-actions"><span class="areas-toggle-right"><span class="project-area-count">${areas.length}</span></span><button class="project-layout-info" type="button" aria-expanded="false" aria-controls="projectLayoutInfo" onclick="window.toggleProjectLayoutInfo(this)"><span aria-hidden="true">i</span><span class="sr-only">About Project Overview</span></button></div></div>
        <p id="projectLayoutInfo" class="project-layout-intro" hidden>Each Area is a focused part of the project. Open a card to see its dashboard and information.</p>
        ${contextualGuidance(config.guidance, 'areas')}
        <div class="project-area-list">${areaListHtml}</div>
    </section>`;
    const searchResultsHtml = searchItems.map(item => `<button class="project-search-result" type="button" data-project-search-item data-search="${escapeAttribute(item.searchText)}" data-search-primary="${escapeAttribute(item.primarySearchText || item.label)}" onclick="${item.action}" hidden>
        <span class="project-search-result-icon" aria-hidden="true">${item.icon}</span>
        <span class="project-search-result-copy"><strong>${item.label}</strong><span>${item.type}${item.area ? ` · ${item.area}` : ''}</span>${item.detail ? `<small>${item.detail}</small>` : ''}</span>
        <span class="project-search-result-open">Open</span>
    </button>`).join('');
    const growth = config.growthJourney;
    const growthJourneyHtml = growth ? `<details class="living-map-progress subtle-project-tutorial${config.guidance?.target === 'projectTutorial' ? ' tutorial-spotlight-target' : ''}"${config.guidance?.target === 'projectTutorial' ? ' open' : ''}>
        <summary class="living-map-progress-heading">
            <div><span class="growth-stage">${escapeAttribute(growth.stage)}</span><h2 id="livingMapProgressTitle">${escapeAttribute(growth.message)}</h2></div>
            <span class="tutorial-summary-progress"><strong>${growth.completed} of ${growth.steps.length}</strong><i aria-hidden="true">⌄</i></span>
        </summary>
        <div class="project-tutorial-details">
        <div class="tutorial-task-list" role="list" aria-label="Getting started tasks">
            ${growth.steps.map(step => `<span class="${step.complete ? 'is-complete' : ''}" role="listitem"><i aria-hidden="true">${step.complete ? '✓' : '○'}</i><strong>${escapeAttribute(step.label)}</strong>${step.progress ? `<small>${escapeAttribute(step.progress)}</small>` : ''}</span>`).join('')}
        </div>
        <div class="tutorial-purpose"><strong>Why begin here?</strong><p>Spatial knowledge becomes useful when information is attached to a real object or place. These small actions show the complete idea—identify something, organise its place, give the place a Totem, then let its information grow. Plant records receive a unique ID automatically when they are created.</p></div>
        <div class="tutorial-quick-starts${config.guidance?.target === 'quickStarts' ? ' tutorial-spotlight-target' : ''}" aria-label="Tutorial quick starts">
            ${growth.starterActions.map(action => `<button type="button" onclick="${action.action}"><span aria-hidden="true">${action.icon}</span><strong>${escapeAttribute(action.label)}</strong><small>${escapeAttribute(action.description)}</small></button>`).join('')}
        </div>
        </div>
    </details>` : '';
    // Quiet management tools displayed below the primary AR path.
    const contentSections = config.nonPlantMode ? `
        <section class="content-mode-section">
            <button class="content-mode-card" type="button" onclick="${config.fieldGuideAction}">
                <span class="content-mode-icon" aria-hidden="true">▦</span>
                <div><strong>Collection Library</strong><span>Browse Dynamic Markers, records and attached information.</span></div>
            </button>
            <button class="content-mode-card" type="button" onclick="${config.mapAction}">
                <span class="content-mode-icon" aria-hidden="true">⌕</span>
                <div><strong>Location Map</strong><span>See rooms, zones, Totems and placed objects.</span></div>
            </button>
            <button class="content-mode-card" type="button" onclick="${config.storiesAction}">
                <span class="content-mode-icon" aria-hidden="true">⚑</span>
                <div><strong>Stories &amp; Exhibitions</strong><span>Manage interpretation, provenance and guided experiences.</span></div>
            </button>
        </section>` : '';

    return `<div class="screen project-entry location-selected${config.nonPlantMode ? ' nonplant-project' : ''}${spotlightTarget ? ' tutorial-spotlight-active' : ''}" data-location-id="${config.locationId}">
        <div class="dashboard-frame">
        <header class="location-dashboard-header">
            <p class="dashboard-frame-kicker">PROJECT DASHBOARD</p>
            <h1>${config.locationName}</h1>
        </header>

        ${growthJourneyHtml}

        <section class="dashboard-ar-path${spotlightTarget === 'arPath' ? ' tutorial-spotlight-target' : ''}" aria-labelledby="openArTitle">
            <button class="global-ar-action dashboard-open-ar ar-square-action" type="button" aria-label="Open project in AR" onclick="${config.openArAction}">
                <strong id="openArTitle">AR</strong>
            </button>
            <button class="dashboard-field-guide" type="button" onclick="${config.fieldGuideAction}" aria-label="Open ${config.nonPlantMode ? 'Collection Library' : 'Web Hub'}"><span aria-hidden="true">🌿</span><strong>${config.nonPlantMode ? 'COLLECTION LIBRARY' : 'WEB HUB'}</strong></button>
        </section>

        <div class="${spotlightTarget === 'contentModes' ? 'tutorial-spotlight-target' : ''}">${contentSections}</div>

        ${areaOverviewHtml}

        <section class="project-search-section" aria-labelledby="projectSearchTitle">
            <div class="section-heading-row">
                <div><h2 id="projectSearchTitle">Search</h2><p>${config.nonPlantMode ? 'Find a Location, Dynamic Marker, Totem, Note or collection record.' : 'Find an Area, Plant, Note, checkpoint or saved information.'}</p></div>
            </div>
            <div class="project-search-box">
                <span aria-hidden="true">⌕</span>
                <input id="projectSearchInput" type="search" aria-label="Search this project" placeholder="${config.nonPlantMode ? 'Search Locations, Dynamic Markers, Totems and records…' : 'Search Areas, Plants, Notes and information…'}" autocomplete="off" oninput="window.filterProjectSearch(this.value)" />
            </div>
            <p id="projectSearchSummary" class="project-search-summary" aria-live="polite">Type to search ${searchItems.length} item${searchItems.length === 1 ? '' : 's'}.</p>
            <div id="projectSearchResults" class="project-search-results">${searchResultsHtml}</div>
            <p id="projectSearchEmpty" class="project-empty-state" hidden>No matches found. Try a ${config.nonPlantMode ? 'Marker, Location, Totem or record description' : 'Plant name, Area, Note text or description'}.</p>
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

        <nav class="location-tool-grid${spotlightTarget === 'helpGuide' ? ' tutorial-spotlight-target' : ''}" aria-label="Location tools">
            ${config.tools.map(item => actionCard(item, 'location-tool-card')).join('')}
        </nav>

        <section class="latest-entries-section">
            <div class="section-heading-row"><div><h2>Recent record files</h2><p>Plants, Totems, Notes and other saved database records.</p></div><button class="view-all-entries" type="button" onclick="${config.viewAllAction}">See all</button></div>
            <div class="latest-entry-list">${latestEntriesHtml}</div>
        </section>
        <footer class="dashboard-location-footer">
            <button class="change-location-control exit-project-creator" type="button" onclick="${config.backAction}">← Exit Project Creator</button>
        </footer>
        ${tutorialSpotlight(config.guidance)}
        </div>
    </div>`;
}
