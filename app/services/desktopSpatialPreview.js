const DESKTOP_SPATIAL_MIN_WIDTH = 960;
const DESKTOP_SPATIAL_MIN_HEIGHT = 600;

function mediaMatches(query, fallback = false) {
    try { return globalThis.matchMedia?.(query)?.matches ?? fallback; }
    catch { return fallback; }
}

export function isDesktopSpatialPreviewEnvironment({
    simulated = false,
    quest = false,
    width = globalThis.innerWidth || 0,
    height = globalThis.innerHeight || 0,
    finePointer = mediaMatches('(pointer: fine)'),
    hover = mediaMatches('(hover: hover)')
} = {}) {
    return Boolean(simulated
        && !quest
        && finePointer
        && hover
        && width >= DESKTOP_SPATIAL_MIN_WIDTH
        && height >= DESKTOP_SPATIAL_MIN_HEIGHT);
}

function controlMarkup() {
    return `<aside class="nlxr-desktop-spatial-chrome" data-desktop-spatial-chrome aria-label="Desktop spatial view">
        <div class="nlxr-desktop-spatial-frame" data-desktop-spatial-frame>
            <header class="nlxr-desktop-spatial-heading">
                <span><i aria-hidden="true"></i> Desktop · live spatial view</span>
                <small>A window into the place</small>
            </header>
            <div class="nlxr-desktop-spatial-depth" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="nlxr-desktop-spatial-horizon" aria-hidden="true"></div>
            <p class="nlxr-desktop-spatial-help">Drag open space to look around <span>·</span> Scroll to move closer</p>
            <button type="button" class="nlxr-desktop-spatial-reset" data-desktop-spatial-reset>Reset view</button>
        </div>
    </aside>`;
}

function interactiveTarget(target) {
    return target instanceof Element && Boolean(target.closest('button,[role="button"],input,select,textarea,a,.nlxr-info-panel,.tryit-guided-choice,.tryit-virtual-tag-mode'));
}

export function mountDesktopSpatialPreview(root, { simulated = false, quest = false } = {}) {
    const demo = root?.querySelector?.('.tryit-demo');
    const stage = demo?.querySelector?.('.tryit-stage');
    if (!demo || !stage || !isDesktopSpatialPreviewEnvironment({ simulated, quest })) return () => {};

    stage.insertAdjacentHTML('afterbegin', controlMarkup());
    const chrome = stage.querySelector('[data-desktop-spatial-chrome]');
    const reset = stage.querySelector('[data-desktop-spatial-reset]');
    const mediaQueries = [
        globalThis.matchMedia?.('(pointer: fine)'),
        globalThis.matchMedia?.('(hover: hover)')
    ].filter(Boolean);
    let active = false;
    let dragging = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let startLookX = 0;
    let startLookY = 0;
    let lookX = 0;
    let lookY = 0;
    let zoom = 1;

    const applyView = () => {
        demo.style.setProperty('--desktop-look-x', `${lookX.toFixed(2)}px`);
        demo.style.setProperty('--desktop-look-y', `${lookY.toFixed(2)}px`);
        demo.style.setProperty('--desktop-yaw', `${(lookX * .12).toFixed(2)}deg`);
        demo.style.setProperty('--desktop-pitch', `${(-lookY * .1).toFixed(2)}deg`);
        demo.style.setProperty('--desktop-scene-zoom', zoom.toFixed(3));
    };
    const resetView = () => {
        lookX = 0;
        lookY = 0;
        zoom = 1;
        applyView();
    };
    const syncEnvironment = () => {
        active = isDesktopSpatialPreviewEnvironment({ simulated, quest });
        demo.classList.toggle('is-desktop-spatial-preview', active);
        chrome.hidden = !active;
        if (!active) {
            dragging = false;
            demo.classList.remove('is-desktop-looking');
            resetView();
        }
    };
    const onPointerDown = event => {
        if (!active || event.button !== 0 || interactiveTarget(event.target)) return;
        dragging = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        startLookX = lookX;
        startLookY = lookY;
        stage.setPointerCapture?.(pointerId);
        demo.classList.add('is-desktop-looking');
    };
    const onPointerMove = event => {
        if (!active || !dragging || event.pointerId !== pointerId) return;
        lookX = Math.max(-34, Math.min(34, startLookX + (event.clientX - startX) * .09));
        lookY = Math.max(-22, Math.min(22, startLookY + (event.clientY - startY) * .07));
        applyView();
    };
    const releasePointer = event => {
        if (!dragging || (event?.pointerId != null && event.pointerId !== pointerId)) return;
        dragging = false;
        pointerId = null;
        demo.classList.remove('is-desktop-looking');
    };
    const onWheel = event => {
        if (!active || event.ctrlKey || interactiveTarget(event.target)) return;
        event.preventDefault();
        zoom = Math.max(.92, Math.min(1.08, zoom - event.deltaY * .00035));
        applyView();
    };
    const onKeyDown = event => {
        if (!active || event.key !== 'Escape' || interactiveTarget(event.target)) return;
        resetView();
    };

    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', releasePointer);
    stage.addEventListener('pointercancel', releasePointer);
    stage.addEventListener('wheel', onWheel, { passive: false });
    globalThis.addEventListener?.('resize', syncEnvironment, { passive: true });
    globalThis.addEventListener?.('keydown', onKeyDown);
    mediaQueries.forEach(query => query.addEventListener?.('change', syncEnvironment));
    reset?.addEventListener('click', resetView);
    applyView();
    syncEnvironment();

    return () => {
        stage.removeEventListener('pointerdown', onPointerDown);
        stage.removeEventListener('pointermove', onPointerMove);
        stage.removeEventListener('pointerup', releasePointer);
        stage.removeEventListener('pointercancel', releasePointer);
        stage.removeEventListener('wheel', onWheel);
        globalThis.removeEventListener?.('resize', syncEnvironment);
        globalThis.removeEventListener?.('keydown', onKeyDown);
        mediaQueries.forEach(query => query.removeEventListener?.('change', syncEnvironment));
        reset?.removeEventListener('click', resetView);
        demo.classList.remove('is-desktop-spatial-preview', 'is-desktop-looking');
        chrome?.remove();
    };
}
