export function renderSiteForm(siteManager, onCancel, onCreate) {
    const templates = [
        'Botanical Garden',
        'Food Forest',
        'Public Park',
        'University',
        'Museum'
    ];

    let options = templates.map(template => `<option value="${template}">${template}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="siteName">Site name</label>
            <input type="text" id="siteName" />
        </div>

        <div class="field">
            <label for="siteTemplate">Template</label>
            <select id="siteTemplate">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onCreate}">Create Site</button>
        </div>
    </div>
    `;
}
