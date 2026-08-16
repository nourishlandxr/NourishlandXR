const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const encoded = value => encodeURIComponent(String(value ?? ''));

const GUIDE_FAQ = Object.freeze([
    ['Getting Started', 'What is a NourishlandXR project?', 'A project brings together the areas, plants, observations and spatial information belonging to one garden, farm or landscape.'],
    ['Projects and Areas', 'What is an area?', 'An area is a defined part of the project, such as an orchard, nursery, garden bed or food-forest zone.'],
    ['Projects and Areas', 'What is Home?', 'Home is the project’s default area. Plants and entries without another assigned area can remain there until organised.'],
    ['Plants and PIM', 'What is the Plant Information Mesh?', 'The PIM is an expandable knowledge system connecting a plant’s uses, ecological relationships, cultivation, propagation, history and verified scientific information.'],
    ['Totems and Alignment', 'What is a Totem?', 'A Totem represents a known spatial reference for an area. It can help organise AR content and may later be associated with physical visual markers or spatial positioning.'],
    ['Plants and PIM', 'What is a Plant Live Tag?', 'A Plant Live Tag connects a specific real plant with its digital profile and spatial content.'],
    ['AR Mode', 'Why does AR request camera permission?', 'AR uses the camera to place digital information within the surrounding environment. Camera access begins only after the user grants permission.'],
    ['Totems and Alignment', 'Why might an AR object need realignment?', 'Browser-based tracking can drift as the device moves or loses visual reference points. A Totem or recognised marker can provide a known alignment checkpoint.'],
    ['Projects and Areas', 'What does “unplaced” mean?', 'An unplaced plant exists in the project but does not yet have a confirmed location in an area or AR scene.'],
    ['Mapping and Export', 'Can project information be exported?', 'Project and plant data can be prepared for supported export formats. Future mapping exports may include spatial coordinates where reliable position data exists.'],
    ['Living Map', 'What is the Living Dashboard?', 'The Living Dashboard is the project’s spatial home: it connects areas, plants, placement progress and confirmed spatial relationships through one Living Map.'],
    ['Troubleshooting', 'What should I do if a feature is unavailable?', 'Use the established Web Hub, Area, Plant and AR actions for confirmed work. Available, Experimental and Planned labels identify what is operational.']
]);

const GUIDE_CATEGORIES = Object.freeze(['All', 'Getting Started', 'Projects and Areas', 'Plants and PIM', 'AR Mode', 'Totems and Alignment', 'Living Map', 'Mapping and Export', 'Troubleshooting']);

const GUIDE_PREVIEW_TOPICS = Object.freeze([
    ['The Living Map', 'The Living Map is intended to show how project areas relate to one another, where plants have been placed and which parts of the landscape still need mapping or alignment.'],
    ['GIS integration', 'Geographic Information Systems can store, analyse and export real-world location data. Future NLXR mapping could associate areas, plants, paths and ecological observations with geographic coordinates and supported GIS formats. Possible future formats include GeoJSON, KML, CSV with coordinates and GIS-compatible project layers.'],
    ['VPS positioning', 'A Visual Positioning System uses recognised visual features from a scanned environment to estimate a device’s position and orientation. This could eventually allow NLXR content to remain aligned across a larger mapped garden more accurately than basic browser tracking alone.'],
    ['Totems and visual markers', 'Totems can operate as known checkpoints within a project. Physical markers may help the application recognise an area, restore alignment and connect local AR experiences to the wider project map.'],
    ['Spatial scanning', 'Future scanning workflows may use phone cameras, 360-degree cameras or supported spatial devices to document an area. Depending on the technology, this may produce reference imagery, spatial positioning data, a point cloud or a 3D model.'],
    ['Photorealistic spatial models', 'A scanned environment may be represented as a photorealistic 3D model for planning and review. NLXR information could then be displayed as a separate interactive layer over the model rather than permanently embedded in its appearance.'],
    ['Continuous garden journeys', 'Connected areas could allow visitors to move through a garden while the system transitions between Totems, plant populations and information layers. Visual checkpoints may periodically correct accumulated tracking drift.'],
    ['GIS and VPS are different', 'GIS records where landscape information exists geographically. VPS helps a device recognise where it is within a visually mapped environment. 3D scanning represents the visible form of the environment. AR displays interactive content within the user’s view. These systems may complement each other, but should not be treated as interchangeable.']
]);

function guidePreviewArt() {
    const nodes = [
        ['Home', 18, 35, 'is-home'], ['Orchard', 74, 28, ''], ['Nursery', 50, 57, 'is-current'], ['Creek', 22, 72, ''], ['Food Forest', 66, 78, '']
    ];
    return `<div class="project-guide-v2-preview-art" role="img" aria-label="Conceptual Living Map preview"><span class="project-guide-v2-preview-art-title">NourishlandXR V1 · Living Map</span><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M18 35 50 57 74 28 66 78 22 72 18 35"/><path d="M74 28 66 78"/></svg>${nodes.map(([label, x, y, className]) => `<span class="project-guide-v2-preview-node ${className}" style="--preview-x:${x}%;--preview-y:${y}%"><i aria-hidden="true">${className === 'is-home' ? '⌂' : '▧'}</i><strong>${label}</strong></span>`).join('')}<small>Conceptual layout · preview only</small></div>`;
}

export function renderProjectGuide(app, encodedProjectId = '', returnTo = 'creator') {
    let projectId = '';
    try { projectId = decodeURIComponent(encodedProjectId || ''); } catch { projectId = String(encodedProjectId || ''); }
    const backAction = projectId
        ? `window.renderLivingDashboard('${encoded(projectId)}')`
        : returnTo === 'launch' ? 'window.renderLaunchScreen()' : 'window.renderDemoProjects()';
    const v2Action = projectId ? `window.renderLivingDashboard('${encoded(projectId)}')` : 'window.renderDemoProjects()';
    const faqHtml = GUIDE_FAQ.map(([category, question, answer], index) => {
        const id = `projectGuideAnswer${index + 1}`;
        const search = `${category} ${question} ${answer}`.toLocaleLowerCase();
        return `<article class="project-guide-faq-item" data-guide-item data-guide-category="${escapeHtml(category)}" data-guide-search="${escapeHtml(search)}"><button type="button" class="project-guide-faq-question" data-guide-question aria-expanded="${index === 0 ? 'true' : 'false'}" aria-controls="${id}"><span>${escapeHtml(question)}</span><i aria-hidden="true">+</i></button><div id="${id}" class="project-guide-faq-answer" data-guide-answer${index === 0 ? '' : ' hidden'}><p>${escapeHtml(answer)}</p></div></article>`;
    }).join('');
    const topicStatus = ['Available', 'Planned', 'Planned', 'Available', 'Planned', 'Planned', 'Planned', 'Available'];
    const topicHtml = GUIDE_PREVIEW_TOPICS.map(([title, body], index) => `<details class="project-guide-preview-topic"><summary><span>${escapeHtml(title)}</span><b class="project-guide-topic-status is-${topicStatus[index].toLocaleLowerCase()}">${topicStatus[index]}</b><i aria-hidden="true">+</i></summary><p>${escapeHtml(body)}</p></details>`).join('');

    app.innerHTML = `<div class="screen project-guide-screen">
        <header class="project-guide-header"><button class="ghost project-guide-back" type="button" onclick="${backAction}">← Back</button><p class="project-guide-eyebrow">NOURISHLANDXR</p><h1>Project Guide</h1><p class="subtitle">Fast answers for projects, plants, PIM and spatial work.</p></header>
        <section class="project-guide-faq-section" aria-labelledby="projectGuideFaqTitle"><div class="project-guide-section-heading"><div><p class="project-guide-eyebrow">QUICK ANSWERS</p><h2 id="projectGuideFaqTitle">Project Guide FAQ</h2></div><span class="project-guide-count">${GUIDE_FAQ.length} answers</span></div><div class="project-guide-search"><span aria-hidden="true">⌕</span><input id="projectGuideSearch" type="search" placeholder="Search the guide" aria-label="Search the guide" autocomplete="off" /></div><div class="project-guide-category-row" role="group" aria-label="Guide categories">${GUIDE_CATEGORIES.map((category, index) => `<button type="button" class="${index === 0 ? 'is-active' : ''}" data-guide-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}</div><div class="project-guide-faq-list">${faqHtml}</div><p class="project-guide-empty" data-guide-empty hidden>No guide answers match that search.</p></section>
        <section class="project-guide-v2-section" aria-labelledby="projectGuideV2Title"><div class="project-guide-v2-heading"><div><p class="project-guide-eyebrow">ROADMAP</p><h2 id="projectGuideV2Title">Living Map roadmap</h2></div><span class="project-guide-preview-badge">NourishlandXR V1</span></div><p>The Living Map is the shared spatial foundation for projects. Available tools use real project records; Experimental and Planned topics are labelled so they are never mistaken for working features.</p>${guidePreviewArt()}<button type="button" class="project-guide-open-v2" onclick="${v2Action}">Open Living Dashboard <span aria-hidden="true">›</span></button><div class="project-guide-preview-topics" aria-label="Living Map roadmap topics">${topicHtml}</div></section>
    </div>`;

    const applyFilters = () => {
        const query = String(app.querySelector('#projectGuideSearch')?.value || '').trim().toLocaleLowerCase();
        const category = app.querySelector('[data-guide-filter].is-active')?.dataset.guideFilter || 'All';
        let visibleCount = 0;
        app.querySelectorAll('[data-guide-item]').forEach(item => {
            const matchesCategory = category === 'All' || item.dataset.guideCategory === category;
            const matchesQuery = !query || item.dataset.guideSearch.includes(query);
            const visible = matchesCategory && matchesQuery;
            item.hidden = !visible;
            if (visible) visibleCount += 1;
        });
        const empty = app.querySelector('[data-guide-empty]');
        if (empty) empty.hidden = visibleCount !== 0;
    };
    app.querySelector('#projectGuideSearch')?.addEventListener('input', applyFilters);
    app.querySelectorAll('[data-guide-filter]').forEach(button => button.addEventListener('click', () => {
        app.querySelectorAll('[data-guide-filter]').forEach(candidate => candidate.classList.toggle('is-active', candidate === button));
        applyFilters();
    }));
    app.querySelectorAll('[data-guide-question]').forEach(button => button.addEventListener('click', () => {
        const answer = app.querySelector(`#${button.getAttribute('aria-controls')}`);
        if (!answer) return;
        const open = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!open));
        answer.hidden = open;
        button.closest('.project-guide-faq-item')?.classList.toggle('is-open', !open);
    }));
}
