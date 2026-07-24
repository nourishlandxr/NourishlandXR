import { projectTemplates } from '../templates/projectTemplates.js';

export function renderSiteForm(onCancel, onSubmit, project = null, templateKey = 'food_forest') {
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
            <label for="projectTemplate">Template</label>
            <select id="projectTemplate">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onSubmit}">${project ? 'Save Location' : 'Create Location'}</button>
        </div>
    </div>
    `;
}
