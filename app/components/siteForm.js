import { projectTemplates } from '../templates/projectTemplates.js';

export function renderSiteForm(onCancel, onSubmit, project = null, templateKey = 'blank') {
    const options = Object.entries(projectTemplates).map(([key, template]) => `<option value="${key}" ${templateKey === key ? 'selected' : ''}>${template.label}</option>`).join('');
    const suggestions = project ? '' : projectTemplates[templateKey].sites.join('\n');

    return `
    <div class="panel">
        <div class="field">
            <label for="projectName">Project name</label>
            <input type="text" id="projectName" value="${project?.name || ''}" />
        </div>

        <div class="field">
            <label for="projectTemplate">Template</label>
            <select id="projectTemplate" onchange="window.setProjectTemplate(this.value)">
                ${options}
            </select>
        </div>

        ${project ? '' : `<div class="field"><label for="projectSuggestions">Suggested Sites (one per line; edit or remove as needed)</label><textarea id="projectSuggestions" rows="5">${suggestions}</textarea></div>`}

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onSubmit}">${project ? 'Save Project' : 'Create Project'}</button>
        </div>
    </div>
    `;
}
