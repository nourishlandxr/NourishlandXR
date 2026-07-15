function actionButton(item, className = '') {
    if (item.actions) {
        const actions = item.actions.map(action => `<button type="button" onclick="${action.action}">${action.label}</button>`).join('');
        return `<div class="project-action ${className} project-action-group"><strong>${item.label}</strong><div>${actions}</div></div>`;
    }
    return `<button class="project-action ${className}" onclick="${item.action}"><strong>${item.label}</strong>${item.meta ? `<span>${item.meta}</span>` : ''}</button>`;
}

export function renderProjectEntry(config) {
    const markers = config.markers || [];
    const latestEntries = config.latestEntries || [];
    const latestEntriesHtml = latestEntries.length
        ? latestEntries.map(item => actionButton(item, 'project-latest-row')).join('')
        : '<p class="project-empty-state">No entries yet. Add a marker to begin.</p>';
    return `<div class="screen project-entry">
        <header class="project-entry-header">
            <button class="ghost" onclick="${config.backAction}">Back</button>
            <h1>${config.projectName}</h1>
            ${config.siteName ? `<p class="subtitle">${config.siteName}</p>` : ''}
        </header>
        <div class="project-dashboard-layout">
            <main>
                <div class="project-primary-grid">
                    ${(config.mainActions || []).map(item => actionButton(item, 'project-primary-action')).join('')}
                </div>
        ${markers.length ? `<section class="project-section">
            <h2 class="project-section-title project-section-title-centred">Markers</h2>
            <div class="project-row-list">${markers.map(item => actionButton(item, 'project-marker-row')).join('')}</div>
        </section>` : ''}
        <section class="project-section">
            <h2 class="project-section-title">Latest Entries</h2>
            <div class="project-row-list project-latest-list">${latestEntriesHtml}</div>
        </section>
            </main>
            <aside class="project-side-menu" aria-label="Dashboard tools">
                ${(config.sideActions || []).map(item => actionButton(item, 'project-side-action')).join('')}
            </aside>
        </div>
    </div>`;
}
