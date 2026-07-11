export function renderAssetForm(assetCategories, onCancel, onCreate, initialValues = {}) {
    const options = assetCategories.map(category => `<option value="${category}" ${initialValues.category === category ? 'selected' : ''}>${category}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="assetName">Name</label>
            <input type="text" id="assetName" value="${initialValues.name || ''}" />
        </div>

        <div class="field">
            <label for="assetCategory">Category</label>
            <select id="assetCategory">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onCreate}">${initialValues.name ? 'Save Asset' : 'Create Asset'}</button>
        </div>
    </div>
    `;
}
