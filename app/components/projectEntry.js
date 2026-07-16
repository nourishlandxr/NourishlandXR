function actionCard(item, className = '') {
    return `<button class="${className}" type="button" onclick="${item.action}"><strong>${item.label}</strong>${item.description ? `<span>${item.description}</span>` : ''}</button>`;
}

function statusItem(label, value, wide = false) {
    return `<div class="experience-status-item${wide ? ' experience-status-item-wide' : ''}"><span>${label}</span><strong>${value}</strong></div>`;
}

function latestEntryRow(item) {
    return `<button class="latest-entry-row" type="button" onclick="${item.action}">
        <span class="latest-entry-icon" aria-hidden="true">${item.icon}</span>
        <span class="latest-entry-copy"><strong>${item.label}</strong><span>${item.type} · ${item.edited}</span></span>
        <span class="entry-status entry-status-${item.statusTone}">${item.status}</span>
    </button>`;
}

export function renderProjectEntry(config) {
    const latestEntries = config.latestEntries || [];
    const latestEntriesHtml = latestEntries.length
        ? latestEntries.map(latestEntryRow).join('')
        : '<p class="project-empty-state">No entries yet. Add something to this location to begin.</p>';

    return `<div class="screen project-entry location-selected" data-location-id="${config.locationId}">
        <header class="location-dashboard-header">
            <button class="change-location-control" type="button" onclick="${config.backAction}">← Change location</button>
            <h1>${config.locationName}</h1>
            <p>${config.siteName} · Dashboard</p>
        </header>

        <section class="experience-launch-grid" aria-label="Explore this location">
            ${config.launchActions.map(item => actionCard(item, 'experience-launch-card')).join('')}
        </section>

        <section class="experience-status" aria-labelledby="experienceStatusTitle">
            <div class="section-heading-row"><h2 id="experienceStatusTitle">Experience status</h2><span class="experience-state experience-state-${config.status.tone}">${config.status.label}</span></div>
            <div class="experience-status-grid">
                ${statusItem('Starting Point', config.status.startingPoint)}
                ${statusItem('Location accuracy', config.status.accuracy)}
                ${statusItem('Entries', config.status.entries)}
                ${statusItem('Last updated', config.status.lastUpdated)}
                ${config.status.directions ? statusItem('Directions to Starting Point', config.status.directions, true) : ''}
            </div>
            ${config.status.notice ? `<p class="setup-notice">${config.status.notice}</p>` : ''}
            <div class="status-actions">${config.status.actions.map(item => `<button type="button" onclick="${item.action}">${item.label}</button>`).join('')}</div>
        </section>

        <section class="location-create-section">
            <button class="add-to-location-action" type="button" onclick="${config.addAction.action}"><strong>${config.addAction.label}</strong><span>${config.addAction.description}</span></button>
        </section>

        <nav class="location-tool-grid" aria-label="Location tools">
            ${config.tools.map(item => actionCard(item, 'location-tool-card')).join('')}
        </nav>

        <section class="latest-entries-section">
            <div class="section-heading-row"><h2>Latest entries</h2><button class="view-all-entries" type="button" onclick="${config.viewAllAction}">View all</button></div>
            <div class="latest-entry-list">${latestEntriesHtml}</div>
        </section>
    </div>`;
}
