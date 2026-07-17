export function renderLocationForm(locationTypes, onCancel, onCreate, initialValues = {}) {
    const availableTypes = initialValues.type && !locationTypes.includes(initialValues.type)
        ? [initialValues.type, ...locationTypes]
        : locationTypes;
    const options = availableTypes.map(type => `<option value="${type}" ${initialValues.type === type ? 'selected' : ''}>${type}</option>`).join('');

    return `
    <div class="panel">
        <div class="field">
            <label for="locationName">Area name</label>
            <input type="text" id="locationName" value="${initialValues.name || ''}" />
        </div>

        <div class="field">
            <label for="locationType">Area type</label>
            <select id="locationType">
                ${options}
            </select>
        </div>

        <div class="button-row">
            <button onclick="${onCancel}">Cancel</button>
            <button class="primary" onclick="${onCreate}">${initialValues.name ? 'Save Area' : 'Create Area'}</button>
        </div>
    </div>
    `;
}
