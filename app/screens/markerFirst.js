import { createPlaceMarker, createSpatialPlant, loadMarkerAnchor, loadPlaceMarkers, loadPlantProfile, saveMarkerAnchor, savePlantProfile, updatePlaceMarker } from '../services/persistence.js';
import { getPlantById, updatePlantInstance, updatePlantRecord } from '../services/plantDataService.js';

const PROJECT_ID = 'Hillyards';
const SITE_ID = 'main_food_forest';
const PLACE_ID = '2r1';

const TYPES = {
    plant: { title: 'Add Plant Marker', nameLabel: 'Marker Name', saveLabel: 'Save Marker', typeLabel: 'Plant Marker', addLabel: 'Add Information Now' },
    note: { title: 'Add Custom Note', nameLabel: 'Marker Name', saveLabel: 'Save Marker', typeLabel: 'Custom Note', addLabel: 'Add Text Now' },
    intro_checkpoint: { title: 'Add Intro Checkpoint', nameLabel: 'Checkpoint Name', saveLabel: 'Save Checkpoint', typeLabel: 'Intro Checkpoint', addLabel: 'Add Information Now' },
    sub_checkpoint: { title: 'Add Sub Checkpoint', nameLabel: 'Checkpoint Name', saveLabel: 'Save Checkpoint', typeLabel: 'Sub Checkpoint', addLabel: 'Add Information Now' }
};

let app;
let creationType = 'plant';
let capturedLocation = null;
let editingMarker = null;

function typeConfig(type) { return TYPES[type] || TYPES.note; }

function recordLatestEntry(entry) {
    const key = 'nxr-hillyards-latest-entries-v3';
    let items = [];
    try { items = JSON.parse(sessionStorage.getItem(key) || '[]'); } catch {}
    items = [entry, ...items.filter(item => item.id !== entry.id)].slice(0, 12);
    sessionStorage.setItem(key, JSON.stringify(items));
}
function numberValue(id) { const value = document.getElementById(id)?.value; return value === '' ? NaN : Number(value); }

function updateLocationStatus(text) {
    const status = document.getElementById('markerLocationStatus');
    if (status) status.textContent = text;
}

export async function renderMarkerFirst(target, type) {
    app = target;
    creationType = TYPES[type] ? type : 'note';
    capturedLocation = null;
    const config = typeConfig(creationType);
    let parentOptions = '';
    if (creationType === 'sub_checkpoint') {
        const markers = await loadPlaceMarkers(PROJECT_ID, SITE_ID, PLACE_ID);
        parentOptions = markers.filter(marker => ['intro_checkpoint', 'sub_checkpoint'].includes(marker.type)).map(marker => `<option value="${marker.id}">${marker.name}</option>`).join('');
    }
    app.innerHTML = `<div class="screen marker-first"><div class="page-header"><h1>${config.title}</h1><p class="subtitle">Point first. Edit information after.</p></div><div class="panel"><form onsubmit="window.saveMarkerFirst(event)">${creationType === 'sub_checkpoint' ? `<div class="field"><label for="markerParent">Parent Checkpoint</label><select id="markerParent" required><option value="">Select parent</option>${parentOptions}</select></div>` : ''}<div class="field"><label for="markerFirstName">${config.nameLabel}</label><input id="markerFirstName" required /></div>${creationType === 'plant' ? '<div class="field"><label for="markerScientificName">Scientific Name</label><input id="markerScientificName" required /></div>' : ''}<div class="field"><label for="markerVisibility">Visibility</label><select id="markerVisibility"><option value="draft">Draft - Creator only</option><option value="public">Public - Visitor and Creator</option><option value="hidden">Hidden</option></select></div><button type="button" onclick="window.captureMarkerLocation()">Use Current Location</button><div class="coordinate-grid"><div class="field"><label for="markerLatitude">Latitude</label><input id="markerLatitude" type="number" inputmode="decimal" step="any" /></div><div class="field"><label for="markerLongitude">Longitude</label><input id="markerLongitude" type="number" inputmode="decimal" step="any" /></div></div><div class="field"><label for="markerAccuracy">Accuracy (metres)</label><input id="markerAccuracy" type="number" inputmode="decimal" step="any" /></div><p id="markerLocationStatus" class="meta">Location not captured. Current or manual coordinates are required.</p><p id="markerFirstError" class="meta"></p><div class="button-row"><button type="button" onclick="window.renderHillyardsProject()">Cancel</button><button class="primary" type="submit">${config.saveLabel}</button></div></form></div></div>`;
}

export function captureMarkerLocation() {
    if (!navigator.geolocation) { updateLocationStatus('Location is unavailable. Enter coordinates manually.'); return; }
    updateLocationStatus('Capturing location...');
    navigator.geolocation.getCurrentPosition(position => {
        capturedLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? '',
            accuracy: position.coords.accuracy,
            captured_at: new Date(position.timestamp).toISOString()
        };
        document.getElementById('markerLatitude').value = capturedLocation.latitude;
        document.getElementById('markerLongitude').value = capturedLocation.longitude;
        document.getElementById('markerAccuracy').value = capturedLocation.accuracy;
        updateLocationStatus(`Location captured. Accuracy: ${Math.round(capturedLocation.accuracy)} m.`);
    }, error => updateLocationStatus(error.code === 1 ? 'Location permission denied. Enter coordinates manually.' : 'Location unavailable. Enter coordinates manually.'), { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
}

export async function saveMarkerFirst(event) {
    event.preventDefault();
    const error = document.getElementById('markerFirstError');
    const name = document.getElementById('markerFirstName').value.trim();
    const latitude = numberValue('markerLatitude');
    const longitude = numberValue('markerLongitude');
    const accuracy = numberValue('markerAccuracy');
    const parent = document.getElementById('markerParent')?.value || '';
    const visibility = document.getElementById('markerVisibility').value;
    if (!name) { error.textContent = 'Name is required.'; return; }
    if (creationType === 'plant' && !document.getElementById('markerScientificName').value.trim()) { error.textContent = 'Scientific Name is required.'; return; }
    if (creationType === 'sub_checkpoint' && !parent) { error.textContent = 'Parent Checkpoint is required.'; return; }
    const hasPosition = Number.isFinite(latitude) || Number.isFinite(longitude) || Number.isFinite(accuracy);
    if ((creationType !== 'plant' || hasPosition) && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180)) { error.textContent = 'Capture a location or enter valid latitude and longitude.'; return; }
    if (creationType === 'plant' && hasPosition && (!Number.isFinite(accuracy) || accuracy < 0)) { error.textContent = 'GPS accuracy is required when adding a position.'; return; }
    try {
        error.textContent = 'Saving...';
        const marker = creationType === 'plant'
            ? (await createSpatialPlant(PROJECT_ID, SITE_ID, PLACE_ID, { commonName: name, scientificName: document.getElementById('markerScientificName').value.trim(), description: '', ...(hasPosition ? { latitude, longitude, accuracy, altitude: capturedLocation?.altitude || '', captured_at: capturedLocation?.captured_at || new Date().toISOString() } : {}), visibility })).marker
            : await createPlaceMarker(PROJECT_ID, SITE_ID, PLACE_ID, { name, type: creationType, parent_checkpoint: parent || undefined, visibility, anchor: { type: 'gps', latitude, longitude, altitude: capturedLocation?.altitude || '', accuracy: Number.isFinite(accuracy) ? accuracy : '', captured_at: capturedLocation?.captured_at || new Date().toISOString(), description: '' } });
        recordLatestEntry({ id: marker.id, name: marker.name, type: marker.type, persisted: true });
        renderCreationComplete(marker);
    } catch (failure) { error.textContent = `Save failed: ${failure.message}`; }
}

function renderCreationComplete(marker) {
    const config = typeConfig(marker.type);
    app.innerHTML = `<div class="screen"><div class="page-header"><h1>${marker.name}</h1><p class="subtitle">${config.typeLabel} saved</p></div><div class="panel"><p>The spatial point and GPS anchor are saved. Additional information is optional.</p></div><div class="menu-stack"><button class="menu-card primary" onclick="window.openMarkerFirstEditor('${marker.id}')"><strong>${config.addLabel}</strong></button><button class="menu-card" onclick="window.renderHillyardsProject()"><strong>Done</strong></button></div></div>`;
}

export async function renderMarkerFirstEditor(target, markerId) {
    app = target;
    const markers = await loadPlaceMarkers(PROJECT_ID, SITE_ID, PLACE_ID);
    const marker = markers.find(item => item.id === markerId);
    editingMarker = marker;
    if (!marker) throw new Error('Marker not found.');
    let anchor = {};
    try { anchor = await loadMarkerAnchor(PROJECT_ID, SITE_ID, PLACE_ID, marker.id); } catch { /* Position is optional for plants. */ }
    let profile = null;
    if (marker.type === 'plant' && marker.plantId) {
        const plant = await getPlantById(marker.plantId);
        profile = plant ? { common_name: plant.commonName, scientific_name: plant.scientificName, overview: plant.summary } : {};
    } else if (marker.type === 'plant') profile = await loadPlantProfile(PROJECT_ID, SITE_ID, PLACE_ID, marker.id);
    const checkpoint = ['intro_checkpoint', 'sub_checkpoint'].includes(marker.type);
    app.innerHTML = `<div class="screen"><div class="page-header"><button class="ghost" onclick="window.renderHillyardsProject()">Back</button><h1>${marker.name}</h1><p class="subtitle">${typeConfig(marker.type).typeLabel} Editor</p></div><div class="panel"><form onsubmit="window.saveMarkerFirstEditor(event, '${marker.id}', '${marker.type}')"><div class="field"><label for="editMarkerName">Marker Name</label><input id="editMarkerName" value="${marker.name || ''}" required /></div>${marker.type === 'plant' ? `<div class="field"><label for="editCommonName">Common Name</label><input id="editCommonName" value="${profile?.common_name || ''}" /></div><div class="field"><label for="editScientificName">Scientific Name</label><input id="editScientificName" value="${profile?.scientific_name || ''}" /></div>` : ''}<div class="field"><label for="editMarkerVisibility">Visibility</label><select id="editMarkerVisibility"><option value="draft" ${marker.visibility === 'draft' ? 'selected' : ''}>Draft - Creator only</option><option value="public" ${marker.visibility === 'public' ? 'selected' : ''}>Public - Visitor and Creator</option><option value="hidden" ${marker.visibility === 'hidden' ? 'selected' : ''}>Hidden</option></select></div><div class="field"><label for="editMarkerDescription">${checkpoint ? 'Introduction / Text' : marker.type === 'note' ? 'Text' : 'Description'}</label><textarea id="editMarkerDescription">${marker.description || marker.introduction || ''}</textarea></div>${checkpoint ? `<div class="field"><label for="editMarkerDirections">Written Directions</label><textarea id="editMarkerDirections">${marker.directions || ''}</textarea></div>` : ''}<div class="field"><label for="editMarkerNotes">Notes</label><textarea id="editMarkerNotes">${marker.notes || ''}</textarea></div><div class="coordinate-grid"><div class="field"><label for="editMarkerLatitude">Latitude</label><input id="editMarkerLatitude" type="number" step="any" value="${anchor.latitude ?? ''}" /></div><div class="field"><label for="editMarkerLongitude">Longitude</label><input id="editMarkerLongitude" type="number" step="any" value="${anchor.longitude ?? ''}" /></div></div><p id="markerEditorError" class="meta"></p><div class="button-row"><button type="button" onclick="window.openHillyardsEntry('${marker.id}')">Open Viewer</button><button class="primary" type="submit">Save</button></div></form></div></div>`;
}

export async function saveMarkerFirstEditor(event, markerId, type) {
    event.preventDefault();
    const error = document.getElementById('markerEditorError');
    const name = document.getElementById('editMarkerName').value.trim();
    const latitude = numberValue('editMarkerLatitude');
    const longitude = numberValue('editMarkerLongitude');
    if (!name) { error.textContent = 'Marker Name is required.'; return; }
    try {
        const visibility = document.getElementById('editMarkerVisibility').value;
        const updated = await updatePlaceMarker(PROJECT_ID, SITE_ID, PLACE_ID, markerId, { name, type, visibility, description: document.getElementById('editMarkerDescription').value, directions: document.getElementById('editMarkerDirections')?.value || '', notes: document.getElementById('editMarkerNotes').value });
        if (type === 'plant' && editingMarker?.plantId) await updatePlantRecord(editingMarker.plantId, { commonName: document.getElementById('editCommonName').value || name, scientificName: document.getElementById('editScientificName').value, summary: document.getElementById('editMarkerDescription').value, visibility });
        if (type === 'plant' && editingMarker?.plantInstanceId) await updatePlantInstance(PROJECT_ID, SITE_ID, editingMarker.plantInstanceId, { visibility, markerId: updated.id });
        if (type === 'plant' && !editingMarker?.plantId) await savePlantProfile(PROJECT_ID, SITE_ID, PLACE_ID, updated.id, { common_name: document.getElementById('editCommonName').value, scientific_name: document.getElementById('editScientificName').value, overview: document.getElementById('editMarkerDescription').value, identification: '', edible_uses: '', propagation: '', growing_conditions: '', notes: document.getElementById('editMarkerNotes').value, references: '' });
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) await saveMarkerAnchor(PROJECT_ID, SITE_ID, PLACE_ID, updated.id, { type: 'gps', latitude, longitude });
        window.renderHillyardsProject();
    } catch (failure) { error.textContent = `Save failed: ${failure.message}`; }
}
