import { loadPlaceMarkers, loadProjectSites, loadSitePlaces } from '../services/persistence.js';
import {
    PHYSICAL_ANCHOR_FAMILY,
    createPhysicalAnchorTrackingState,
    normalizePhysicalAnchor,
    physicalMarkerLabel,
    projectPhysicalTotemOverlay,
    resolvePhysicalAnchorEntry
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

// Visitor scanning only identifies a published record. It does not establish
// physical placement or use creator-only marker assignments.
export async function startVisitorMarkerScanner(onMarker) {
    if (activeScanner) throw new Error('Close the creator scanner before opening the visitor scanner.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera scanning is unavailable on this device.');
    await loadDetector();
    const dialog = document.createElement('section');
    dialog.className = 'physical-anchor-scanner visitor-marker-scanner';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Scan a Nourishland ArUco marker');
    dialog.innerHTML = `<video playsinline muted autoplay></video><canvas hidden></canvas><div class="physical-anchor-scan-guide" aria-hidden="true"><span></span></div><header><p>SCAN ARUCO · NL-001–NL-009</p><strong role="status">Opening camera…</strong><p>Point the camera at the complete printed black square.</p></header><footer><button type="button">Close scanner</button></footer>`;
    document.body.append(dialog);
    const video = dialog.querySelector('video');
    const canvas = dialog.querySelector('canvas');
    const status = dialog.querySelector('[role="status"]');
    let stream;
    let frame = 0;
    let stopped = false;
    let previousId = 0;
    let repeatCount = 0;
    const stop = () => {
        stopped = true;
        cancelAnimationFrame(frame);
        stream?.getTracks().forEach(track => track.stop());
        dialog.remove();
    };
    dialog.querySelector('button').addEventListener('click', stop);
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        if (stopped) { stream.getTracks().forEach(track => track.stop()); return; }
        video.srcObject = stream;
        await video.play();
        canvas.width = 640;
        canvas.height = Math.max(240, Math.round(640 * video.videoHeight / video.videoWidth) || 480);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const detector = new window.AR.Detector();
        let last = 0;
        const tick = time => {
            if (stopped) return;
            frame = requestAnimationFrame(tick);
            if (time - last < DETECTION_INTERVAL_MS || video.readyState < 2) return;
            last = time;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const detection = detector.detect(context.getImageData(0, 0, canvas.width, canvas.height))
                .find(item => Number.isInteger(item.id) && item.id >= 1 && item.id <= 10);
            if (!detection) { previousId = 0; repeatCount = 0; return; }
            repeatCount = detection.id === previousId ? repeatCount + 1 : 1;
            previousId = detection.id;
            if (repeatCount < 2) return;
            repeatCount = 0;
            const result = onMarker(detection.id);
            if (result === true) stop();
            else status.textContent = typeof result === 'string' ? result : `${physicalMarkerLabel(detection.id)} is not linked to published content in this project.`;
        };
        status.textContent = 'Find a printed NL marker';
        frame = requestAnimationFrame(tick);
    } catch (error) {
        stop();
        throw error;
    }
}

async function loadProjectAssignments(projectId) {
    const sites = await loadProjectSites(projectId);
    const assignments = [];
    for (const site of sites) {
        const places = await loadSitePlaces(projectId, site.id);
        for (const place of places) {
            const markers = await loadPlaceMarkers(projectId, site.id, place.id);
            assignments.push(...markers.map(marker => ({marker,place,site})));
        }
    }
    return assignments;
}

function scannerMarkup() {
    return `<section class="physical-anchor-scanner" data-physical-anchor-scanner role="dialog" aria-modal="true" aria-label="ArUco tag scanner">
        <video data-physical-anchor-video playsinline muted autoplay></video>
        <canvas data-physical-anchor-canvas hidden></canvas>
        <div class="physical-anchor-scan-guide" aria-hidden="true"><span></span></div>
        <div class="physical-anchor-totem" data-physical-anchor-totem hidden aria-live="off">
            <span class="physical-anchor-totem-pillar"></span>
            <strong data-physical-anchor-totem-name></strong>
        </div>
        <header><p>SCAN ARUCO · NL-001–NL-010</p><strong data-physical-anchor-status>Opening camera…</strong><p>Point the camera at the full black square of a printed tag.</p></header>
        <footer>
            <button type="button" data-use-physical-anchor hidden>Use this linked record</button>
            <details><summary>Advanced</summary><button type="button" data-copy-physical-anchor-diagnostics>Copy diagnostics</button></details>
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
    const isVirtualPlant = association.marker.type === 'plant';
    const projected = projectPhysicalTotemOverlay(pose, anchor, {
        width: scanner.canvas.width,
        height: scanner.canvas.height,
        focalLength: scanner.canvas.width
    }, isVirtualPlant ? { heightMetres: .24, widthMetres: .1 } : undefined);
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
    scanner.totem.classList.toggle('is-virtual-tag', isVirtualPlant);
    scanner.totem.dataset.anchorRole = isVirtualPlant ? 'plant-live-tag' : 'totem-marker';
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
    const resolve = markerId => {
        const matching = scanner.assignments.filter(entry => entry.marker.physicalAnchor?.enabled && Number(entry.marker.physicalAnchor.markerId) === markerId);
        return matching.length === 1 ? resolvePhysicalAnchorEntry(matching, markerId) : null;
    };
    const decision = scanner.tracking.update(detections, now, resolve);
    scanner.useButton.hidden = !scanner.onUse || decision.state !== 'tracked';
    scanner.association = decision.state === 'tracked' ? decision.association : null;
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
        if (decision.loadModel || scanner.totem.querySelector('[data-physical-anchor-totem-name]').textContent !== association.marker.name) {
            scanner.totem.querySelector('[data-physical-anchor-totem-name]').textContent = association.marker.name;
            debugLog('model-ready');
        }
        const pose = detectorPose(scanner, decision.detection, association);
        if (applyTotemOverlay(scanner, association, pose)) {
            updateStatus(scanner, `${anchor.markerLabel} · ${association.marker.name}${association.marker.type === 'plant' ? ' · Plant Live Tag' : ' · Totem Marker'}`, 'tracked');
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
        const duplicates = scanner.assignments.filter(entry => entry.marker.physicalAnchor?.enabled && Number(entry.marker.physicalAnchor.markerId) === detections[0].id);
        if (duplicates.length > 1) { updateStatus(scanner, `${detectedMarkerLabel(detections[0].id)} has multiple assignments. Review the linked records.`, 'ambiguous'); return; }
        updateStatus(scanner, `${detectedMarkerLabel(detections[0].id)} detected — assign this tag in a Plant or Totem editor`, 'unassigned');
    } else {
        updateStatus(scanner, 'Point the camera at NL-001–NL-010', 'searching');
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
    document.removeEventListener('keydown', scanner.onKeyDown);
    scanner.root.remove();
    scanner.previousFocus?.focus?.();
    debugLog('camera-stopped');
}

export async function startPhysicalAnchorScanner(projectId, previewAssociation = null, options = {}) {
    if (activeScanner) return false;
    if (window.isArModeActive?.()) throw new Error('Exit the current AR session before scanning a Physical Marker.');
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
        previousFocus: document.activeElement,
        stopped: false
    };
    scanner.useButton = scannerRoot.querySelector('[data-use-physical-anchor]');
    scanner.onUse = options.onUse;
    scanner.useButton.addEventListener('click', async () => {
        const association = scanner.association;
        if (!association || scanner.state !== 'tracked') return;
        await stopPhysicalAnchorScanner();
        scanner.onUse?.(association);
    });
    activeScanner = scanner;
    scanner.onKeyDown = event => { if (event.key === 'Escape') void stopPhysicalAnchorScanner(); };
    document.addEventListener('keydown', scanner.onKeyDown);
    scannerRoot.querySelector('[data-stop-physical-anchor]').focus();
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
        const [assignments] = await Promise.all([options.assignments || loadProjectAssignments(projectId), loadDetector()]);
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
