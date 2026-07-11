export function renderSiteForm(onCancel, onSubmit, project = null) {
    const templates = [
        'Botanical Garden',
        'Food Forest',
        'Public Park',
        'University',
        'Museum'
    ];

    const options = templates.map(template => `<option value="${template}" ${project?.template === template ? 'selected' : ''}>${template}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="projectName">Project name</label>
            <input type="text" id="projectName" value="${project?.name || ''}" />
        </div>

        <div class="field">
            <label for="projectTemplate">Template</label>
            <select id="projectTemplate">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onSubmit}">${project ? 'Save Project' : 'Create Project'}</button>
        </div>
    </div>
    `;
}
