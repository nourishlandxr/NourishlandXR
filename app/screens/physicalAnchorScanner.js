import { isArModeActive } from './arMode.js';
import { loadPlaceMarkers, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import {
    PHYSICAL_ANCHOR_FAMILY,
    createPhysicalAnchorTrackingState,
    normalizePhysicalAnchor,
    physicalMarkerLabel,
    projectPhysicalTotemOverlay,
    resolvePhysicalAnchorTotem
} from '../services/physicalAnchor.js';
import { DEFAULT_TOTEM_COLOR, totemHeightScale } from '../services/totemAppearance.js';

const DETECTOR_SCRIPTS = Object.freeze([
    'https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/cv.js',
    'https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/aruco.js',
    'https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/svd.js',
    'https://cdn.jsdelivr.net/npm/js-aruco2@2.0.0/src/posit1.js'
]);
const SETTINGS_KEY = 'nourishland-xr-settings';
const DETECTION_INTERVAL_MS = 80;
const TRACKING_GRACE_MS = 300;

let activeScanner = null;

function platformSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch {
        return {};
    }
}

function physicalAnchorPrototypeEnabled() {
    return platformSettings().physicalAnchors === true;
}

function debugLog(message) {
    if (platformSettings().developerDiagnostics === true) console.info(`[PhysicalAnchor] ${message}`);
}

function loadClassicScript(source) {
    let existing = document.querySelector(`script[data-physical-anchor-source="${source}"]`);
    if (existing?.dataset.loaded === 'true') return Promise.resolve();
    if (existing?.dataset.failed === 'true') {
        existing.remove();
        existing = null;
    }
    return new Promise((resolve, reject) => {
        const script = existing || document.createElement('script');
        script.dataset.physicalAnchorSource = source;
        script.src = source;
        script.async = false;
        script.addEventListener('load', () => {
            script.dataset.loaded = 'true';
            resolve();
        }, { once: true });
        script.addEventListener('error', () => {
            script.dataset.failed = 'true';
            reject(new Error('Marker detector could not be loaded.'));
        }, { once: true });
        if (!existing) document.head.append(script);
    });
}

async function loadDetector() {
    if (window.AR?.Detector && window.POS?.Posit) return;
    for (const source of DETECTOR_SCRIPTS) await loadClassicScript(source);
    if (!window.AR?.Detector || !window.POS?.Posit) throw new Error('Marker detector is unavailable.');
}

async function loadProjectAssignments(projectId) {
    const sites = await loadProjectSites(projectId);
    const site = sites.find(item => item.id === 'main_food_forest') || sites[0];
    if (!site) return [];
    const places = await loadSitePlaces(projectId, site.id);
    const groups = await Promise.all(places.map(async place => ({
        place,
        markers: await loadPlaceMarkers(projectId, site.id, place.id).catch(() => [])
    })));
    return groups.flatMap(group => group.markers.map(marker => ({ marker, place: group.place, site })));
}

function scannerMarkup() {
    return `<section class="physical-anchor-scanner" data-physical-anchor-scanner aria-label="Physical Marker scanner">
        <video data-physical-anchor-video playsinline muted autoplay></video>
        <canvas data-physical-anchor-canvas hidden></canvas>
        <div class="physical-anchor-scan-guide" aria-hidden="true"><span></span></div>
        <div class="physical-anchor-totem" data-physical-anchor-totem hidden aria-live="off">
            <span class="physical-anchor-totem-pillar"></span>
            <strong data-physical-anchor-totem-name></strong>
        </div>
        <header><p>PHYSICAL MARKER · PROTOTYPE</p><strong data-physical-anchor-status>No marker detected</strong></header>
        <footer>
            <button type="button" data-copy-physical-anchor-diagnostics>Copy diagnostics</button>
            <button type="button" data-stop-physical-anchor>Exit scanner</button>
        </footer>
    </section>`;
}

function smoothOverlay(previous, next, alpha = .34) {
    if (!previous) return next;
    const interpolate = key => previous[key] + (next[key] - previous[key]) * alpha;
    let angleDelta = next.rotationDegrees - previous.rotationDegrees;
    while (angleDelta > 180) angleDelta -= 360;
    while (angleDelta < -180) angleDelta += 360;
    return {
        x: interpolate('x'),
        y: interpolate('y'),
        width: interpolate('width'),
        height: interpolate('height'),
        rotationDegrees: previous.rotationDegrees + angleDelta * alpha
    };
}

function applyTotemOverlay(scanner, association, pose) {
    const anchor = normalizePhysicalAnchor(association.marker.physicalAnchor);
    const projected = projectPhysicalTotemOverlay(pose, anchor, {
        width: scanner.canvas.width,
        height: scanner.canvas.height,
        focalLength: scanner.canvas.width
    });
    if (!projected) return false;
    scanner.smoothedOverlay = smoothOverlay(scanner.smoothedOverlay, projected);
    const videoRect = scanner.video.getBoundingClientRect();
    const scaleX = videoRect.width / scanner.canvas.width;
    const scaleY = videoRect.height / scanner.canvas.height;
    const visual = scanner.smoothedOverlay;
    scanner.totem.style.setProperty('--physical-totem-x', `${visual.x * scaleX}px`);
    scanner.totem.style.setProperty('--physical-totem-y', `${visual.y * scaleY}px`);
    scanner.totem.style.setProperty('--physical-totem-width', `${visual.width * scaleX}px`);
    scanner.totem.style.setProperty('--physical-totem-height', `${visual.height * scaleY * totemHeightScale(association.marker)}px`);
    scanner.totem.style.setProperty('--physical-totem-rotation', `${visual.rotationDegrees}deg`);
    scanner.totem.style.setProperty('--physical-totem-color', association.marker.appearance?.color || DEFAULT_TOTEM_COLOR);
    scanner.totem.hidden = false;
    return true;
}

function updateStatus(scanner, message, state, error = '') {
    scanner.state = state;
    scanner.lastError = error;
    if (scanner.status) scanner.status.textContent = message;
}

function detectedMarkerLabel(markerId) {
    const numericId = Number(markerId);
    return Number.isInteger(numericId) && numericId >= 1 && numericId <= 10
        ? physicalMarkerLabel(numericId)
        : `Marker ID ${markerId}`;
}

function diagnosticRecord(scanner = activeScanner) {
    return {
        browser: navigator.userAgent,
        device: navigator.userAgentData?.platform || navigator.platform || 'unknown',
        markerFamily: PHYSICAL_ANCHOR_FAMILY,
        markerId: scanner?.trackedMarkerId ?? null,
        markerSizeMm: scanner?.trackedMarkerSizeMm ?? null,
        detectionState: scanner?.state || 'stopped',
        lastError: scanner?.lastError || ''
    };
}

export async function copyPhysicalAnchorDiagnostics() {
    const text = JSON.stringify(diagnosticRecord(), null, 2);
    await navigator.clipboard.writeText(text);
    return text;
}

function detectorPose(scanner, detection, association) {
    const anchor = normalizePhysicalAnchor(association.marker.physicalAnchor);
    if (!scanner.posit || scanner.trackedMarkerSizeMm !== anchor.markerSizeMm) {
        scanner.posit = new window.POS.Posit(anchor.markerSizeMm, scanner.canvas.width);
        scanner.trackedMarkerSizeMm = anchor.markerSizeMm;
    }
    const centeredCorners = detection.corners.map(corner => ({
        x: corner.x - scanner.canvas.width / 2,
        y: scanner.canvas.height / 2 - corner.y
    }));
    return scanner.posit.pose(centeredCorners);
}

function detectionFrame(scanner, now) {
    if (activeScanner !== scanner || scanner.stopped) return;
    scanner.frameRequest = requestAnimationFrame(time => detectionFrame(scanner, time));
    if (now - scanner.lastDetectionAt < DETECTION_INTERVAL_MS || scanner.video.readyState < 2) return;
    scanner.lastDetectionAt = now;
    const context = scanner.context;
    context.drawImage(scanner.video, 0, 0, scanner.canvas.width, scanner.canvas.height);
    let detections = [];
    try {
        detections = scanner.detector.detect(context.getImageData(0, 0, scanner.canvas.width, scanner.canvas.height));
    } catch (error) {
        updateStatus(scanner, 'Marker detection failed.', 'error', error.message);
        return;
    }
    const resolve = markerId => resolvePhysicalAnchorTotem(scanner.assignments, markerId);
    const decision = scanner.tracking.update(detections, now, resolve);
    if (decision.state === 'tracked') {
        const association = decision.association;
        if (!association?.marker?.name) {
            scanner.totem.hidden = true;
            updateStatus(scanner, 'Associated Totem missing', 'missing');
            return;
        }
        const anchor = normalizePhysicalAnchor(association.marker.physicalAnchor);
        if (scanner.trackedMarkerId !== decision.detection.id) {
            scanner.trackedMarkerId = decision.detection.id;
            scanner.smoothedOverlay = null;
            debugLog(`marker-detected id=${decision.detection.id}`);
            debugLog(`association-found totem=${association.marker.id}`);
        }
        if (decision.loadModel) {
            scanner.totem.querySelector('[data-physical-anchor-totem-name]').textContent = association.marker.name;
            debugLog('model-ready');
        }
        const pose = detectorPose(scanner, decision.detection, association);
        if (applyTotemOverlay(scanner, association, pose)) {
            updateStatus(scanner, `${anchor.markerLabel} · ${association.marker.name}`, 'tracked');
        }
        return;
    }
    if (decision.state === 'holding') return;
    scanner.totem.hidden = true;
    scanner.smoothedOverlay = null;
    if (decision.state === 'lost') {
        debugLog(`tracking-lost id=${decision.markerId}`);
        updateStatus(scanner, `Marker lost - point the camera at ${physicalMarkerLabel(decision.markerId)}`, 'lost');
        return;
    }
    if (detections.length) {
        updateStatus(scanner, `${detectedMarkerLabel(detections[0].id)} detected but not assigned`, 'unassigned');
    } else {
        updateStatus(scanner, 'No marker detected', 'searching');
    }
}

function cameraFailureMessage(error) {
    if (/marker detector/i.test(error?.message || '')) return 'Marker detector unavailable';
    if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Camera permission denied';
    if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'Camera unavailable';
    return 'Camera could not be started';
}

export async function stopPhysicalAnchorScanner() {
    const scanner = activeScanner;
    if (!scanner) return;
    activeScanner = null;
    scanner.stopped = true;
    cancelAnimationFrame(scanner.frameRequest);
    scanner.stream?.getTracks().forEach(track => track.stop());
    scanner.video.srcObject = null;
    scanner.tracking.reset();
    scanner.root.remove();
    debugLog('camera-stopped');
}

export async function startPhysicalAnchorScanner(projectId, previewAssociation = null) {
    if (!physicalAnchorPrototypeEnabled()) throw new Error('Physical Marker prototype is disabled in Settings.');
    if (activeScanner) return false;
    if (isArModeActive()) throw new Error('Exit the current AR session before scanning a Physical Marker.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Unsupported browser: camera access is unavailable.');

    const root = document.createElement('div');
    root.innerHTML = scannerMarkup();
    const scannerRoot = root.firstElementChild;
    document.body.append(scannerRoot);
    const video = scannerRoot.querySelector('[data-physical-anchor-video]');
    const canvas = scannerRoot.querySelector('[data-physical-anchor-canvas]');
    const status = scannerRoot.querySelector('[data-physical-anchor-status]');
    const totem = scannerRoot.querySelector('[data-physical-anchor-totem]');
    const scanner = {
        root: scannerRoot,
        video,
        canvas,
        context: canvas.getContext('2d', { willReadFrequently: true }),
        status,
        totem,
        stream: null,
        detector: null,
        posit: null,
        assignments: [],
        tracking: createPhysicalAnchorTrackingState(TRACKING_GRACE_MS),
        frameRequest: 0,
        lastDetectionAt: -Infinity,
        trackedMarkerId: null,
        trackedMarkerSizeMm: null,
        smoothedOverlay: null,
        state: 'starting',
        lastError: '',
        stopped: false
    };
    activeScanner = scanner;
    scannerRoot.querySelector('[data-stop-physical-anchor]').addEventListener('click', () => void stopPhysicalAnchorScanner());
    scannerRoot.querySelector('[data-copy-physical-anchor-diagnostics]').addEventListener('click', async () => {
        try {
            await copyPhysicalAnchorDiagnostics();
            updateStatus(scanner, 'Diagnostics copied', scanner.state);
        } catch (error) {
            updateStatus(scanner, 'Diagnostics could not be copied', scanner.state, error.message);
        }
    });

    try {
        scanner.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (activeScanner !== scanner) {
            scanner.stream.getTracks().forEach(track => track.stop());
            return false;
        }
        video.srcObject = scanner.stream;
        await video.play();
        canvas.width = Math.min(640, Math.max(320, video.videoWidth || 640));
        canvas.height = Math.round(canvas.width * (video.videoHeight || 480) / (video.videoWidth || 640));
        debugLog('camera-ready');
        const [assignments] = await Promise.all([loadProjectAssignments(projectId), loadDetector()]);
        if (activeScanner !== scanner) return false;
        scanner.assignments = previewAssociation
            ? [previewAssociation, ...assignments.filter(entry => entry.marker.id !== previewAssociation.marker.id)]
            : assignments;
        scanner.detector = new window.AR.Detector({ dictionaryName: 'ARUCO' });
        updateStatus(scanner, 'No marker detected', 'searching');
        scanner.frameRequest = requestAnimationFrame(time => detectionFrame(scanner, time));
        return true;
    } catch (error) {
        if (activeScanner === scanner) {
            updateStatus(scanner, cameraFailureMessage(error), 'error', error.message);
            scanner.stream?.getTracks().forEach(track => track.stop());
        }
        return false;
    }
}
