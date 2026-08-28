import { projectTemplates } from '../templates/projectTemplates.js';

export function renderSiteForm(onCancel, onSubmit, project = null, templateKey = 'empty') {
    const selectedTemplate = project?.template || templateKey;
    const options = Object.entries(projectTemplates).map(([key, template]) => `<option value="${key}" ${selectedTemplate === key ? 'selected' : ''}>${template.label}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="projectName">Location name</label>
            <input type="text" id="projectName" value="${project?.name || ''}" />
        </div>

        <div class="field">
            <label for="projectDescription">Description (optional)</label>
            <textarea id="projectDescription" rows="4" placeholder="Describe this garden, landscape or learning location.">${project?.description || ''}</textarea>
        </div>

        <div class="field">
            <label for="projectTemplate">Starting template</label>
            <select id="projectTemplate">
                ${options}
            </select>
            ${!project ? '<p class="meta project-template-note">Every new project includes a complete Pigeon Pea example plant in Home. Find it at Content → Home → Pigeon Pea.</p>' : ''}
        </div>
        <details class="project-advanced-options">
            <summary>Advanced options</summary>
            ${project ? '' : `<label class="nonplant-template-choice">
                <input type="checkbox" ${selectedTemplate === 'inventory_exhibition' ? 'checked' : ''} onchange="document.getElementById('projectTemplate').value = this.checked ? 'inventory_exhibition' : 'empty'" />
                <span><strong>Non-plant project</strong><small>Neutral records for collections, libraries, offices or exhibitions.</small></span>
            </label>`}

            ${project ? '' : `<label class="tutorial-mode-toggle project-tutorial-toggle">
                <span><strong>Include guided tutorial</strong><small>Turn this off if you already know how you want to begin.</small></span>
                <input id="projectTutorialEnabled" type="checkbox" checked />
            </label>`}

            <label class="tutorial-mode-toggle project-expert-toggle">
                <span><strong>Show advanced controls</strong><small>Reveal technical and precision tools when you need them.</small></span>
                <input id="projectExpertMode" type="checkbox" ${project?.expertMode ? 'checked' : ''} />
            </label>
        </details>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onSubmit}">${project ? 'Save Location' : 'Create Location'}</button>
        </div>
    </div>
    `;
}
