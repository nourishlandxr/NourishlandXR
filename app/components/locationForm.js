export function renderLocationForm(locationTypes, onCancel, onCreate, initialValues = {}) {
    const options = locationTypes.map(type => `<option value="${type}" ${initialValues.type === type ? 'selected' : ''}>${type}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="locationName">Place name</label>
            <input type="text" id="locationName" value="${initialValues.name || ''}" />
        </div>

        <div class="field">
            <label for="locationType">Place type</label>
            <select id="locationType">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onCreate}">${initialValues.name ? 'Save Place' : 'Create Place'}</button>
        </div>
    </div>
    `;
}
