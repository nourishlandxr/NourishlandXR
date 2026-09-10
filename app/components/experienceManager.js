const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const handlerArg = value => escapeHtml(JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029'));

const experienceTypes = [
    'Plant Literacy',
    'Fruit Discovery',
    'Hidden Network',
    'Story',
    'Quiz',
    'Audio Guide',
    'Video',
    'Custom'
];

function defaultExperience(name = 'New Experience', type = experienceTypes[0]) {
    return {
        id: `experience-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name,
        type,
        content: 'Placeholder content',
        media: 'Placeholder media'
    };
}

export function renderExperienceManager(site, place, asset, onBack) {
    const experiences = asset.experiences || [];

    const listMarkup = experiences.length
        ? experiences.map(experience => `
            <div class="panel">
                <div class="list-item">
                    <div>
                        <strong>${escapeHtml(experience.name)}</strong>
                        <p>${escapeHtml(experience.type || 'Custom')}</p>
                    </div>
                    <div class="button-row">
                        <button onclick="window.openExperience(${handlerArg(site)}, ${handlerArg(place)}, ${handlerArg(asset)}, ${handlerArg(experience)})">Open</button>
                        <button onclick="window.editExperience(${handlerArg(site)}, ${handlerArg(place)}, ${handlerArg(asset)}, ${handlerArg(experience)})">Edit</button>
                        <button onclick="window.deleteExperience(${handlerArg(site)}, ${handlerArg(place)}, ${handlerArg(asset)}, ${handlerArg(experience.id)})">Delete</button>
                    </div>
                </div>
            </div>
        `).join('')
        : '<div class="panel"><p>No experiences yet.</p></div>';

    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="${escapeHtml(onBack)}">Back</button>
            <h1>Experiences</h1>
            <p class="subtitle">Manage experiences for this asset.</p>
        </div>

        <div class="panel">
            <div class="button-row">
                <button class="primary" onclick="window.createExperience(${handlerArg(site)}, ${handlerArg(place)}, ${handlerArg(asset)})">+ New Experience</button>
            </div>
        </div>

        <div class="panel">
            <div class="stack-list">
                ${listMarkup}
            </div>
        </div>
    </div>
    `;
}

export function renderExperienceWorkspace(site, place, asset, experience) {
    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="window.renderAssetWorkspace(${handlerArg(site)}, ${handlerArg(place)}, ${handlerArg(asset)})">Back</button>
            <h1>${escapeHtml(experience.name)}</h1>
            <p class="subtitle">Experience workspace</p>
        </div>

        <div class="panel">
            <h2>Title</h2>
            <p>${escapeHtml(experience.name)}</p>
        </div>

        <div class="panel">
            <h2>Type</h2>
            <p>${escapeHtml(experience.type || 'Custom')}</p>
        </div>

        <div class="panel">
            <h2>Content</h2>
            <p>${escapeHtml(experience.content || 'Placeholder content')}</p>
        </div>

        <div class="panel">
            <h2>Media</h2>
            <p>${escapeHtml(experience.media || 'Placeholder media')}</p>
        </div>
    </div>
    `;
}

export function renderExperienceForm(site, place, asset, experience = null, onCancel, onSubmit) {
    const selectedExperience = experience || defaultExperience('Untitled Experience');

    const options = experienceTypes.map(type => `<option value="${escapeHtml(type)}" ${selectedExperience.type === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('');

    return `
    <div class="screen">
        <div class="page-header">
            <button class="ghost" onclick="${escapeHtml(onCancel)}">Back</button>
            <h1>${experience ? 'Edit Experience' : 'New Experience'}</h1>
            <p class="subtitle">Define the experience details.</p>
        </div>

        <div class="panel">
            <div class="field">
                <label for="experienceName">Name</label>
                <input type="text" id="experienceName" value="${escapeHtml(selectedExperience.name)}" />
            </div>

            <div class="field">
                <label for="experienceType">Type</label>
                <select id="experienceType">
                    ${options}
                </select>
            </div>

            <div class="button-row">
                <button onclick="${escapeHtml(onCancel)}">Cancel</button>
                <button class="primary" onclick="${escapeHtml(onSubmit)}">Save</button>
            </div>
        </div>
    </div>
    `;
}

export { experienceTypes, defaultExperience };
