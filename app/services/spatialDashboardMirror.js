const DEFAULT_VIEWPORT_WIDTH = 1280;
const DEFAULT_VIEWPORT_HEIGHT = 900;
const DEFAULT_PANEL_WIDTH = 1.44;
const DEFAULT_PANEL_HEIGHT = 1.02;

const INTERACTIVE_SELECTOR = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[onclick]',
    '[role="button"]',
    '[data-spatial-key]'
].join(',');

const TEXT_INPUT_TYPES = new Set(['', 'text', 'search', 'url', 'email', 'tel', 'number']);
const COLOR_SEQUENCE = ['#5e7956', '#74805d', '#89977c', '#6f5b47', '#9a6b50', '#74786f'];

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const escapeXmlText = value => String(value).replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);

function normalizeVector(vector, fallback) {
    const length = Math.hypot(vector.x, vector.y, vector.z);
    if (length < .0001) return { ...fallback };
    return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

function dot(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function spatialDashboardPanelFromViewer(viewerMatrix, options = {}) {
    if (!viewerMatrix || viewerMatrix.length < 16) return null;
    const distance = Number(options.distance) || 1.18;
    const drop = Number(options.drop) || .03;
    const width = Number(options.width) || DEFAULT_PANEL_WIDTH;
    const height = Number(options.height) || DEFAULT_PANEL_HEIGHT;
    const camera = { x: viewerMatrix[12], y: viewerMatrix[13], z: viewerMatrix[14] };
    const forward = normalizeVector({ x: -viewerMatrix[8], y: 0, z: -viewerMatrix[10] }, { x: 0, y: 0, z: -1 });
    const right = normalizeVector({ x: viewerMatrix[0], y: 0, z: viewerMatrix[2] }, { x: 1, y: 0, z: 0 });
    const up = { x: 0, y: 1, z: 0 };
    const normal = { x: -forward.x, y: 0, z: -forward.z };
    return {
        width,
        height,
        right,
        up,
        normal,
        center: {
            x: camera.x + forward.x * distance,
            y: camera.y - drop,
            z: camera.z + forward.z * distance
        }
    };
}

export function spatialDashboardPanelMatrix(panel) {
    if (!panel) return null;
    const halfWidth = panel.width * .5;
    const halfHeight = panel.height * .5;
    return new Float32Array([
        panel.right.x * halfWidth, panel.right.y * halfWidth, panel.right.z * halfWidth, 0,
        panel.up.x * halfHeight, panel.up.y * halfHeight, panel.up.z * halfHeight, 0,
        panel.normal.x, panel.normal.y, panel.normal.z, 0,
        panel.center.x, panel.center.y, panel.center.z, 1
    ]);
}

export function spatialDashboardRayHit(ray, panel, viewport = {}) {
    if (!ray?.origin || !ray?.direction || !panel) return null;
    const denominator = dot(ray.direction, panel.normal);
    if (Math.abs(denominator) < .0001) return null;
    const centerOffset = {
        x: panel.center.x - ray.origin.x,
        y: panel.center.y - ray.origin.y,
        z: panel.center.z - ray.origin.z
    };
    const distance = dot(centerOffset, panel.normal) / denominator;
    if (distance <= 0) return null;
    const position = {
        x: ray.origin.x + ray.direction.x * distance,
        y: ray.origin.y + ray.direction.y * distance,
        z: ray.origin.z + ray.direction.z * distance
    };
    const local = {
        x: position.x - panel.center.x,
        y: position.y - panel.center.y,
        z: position.z - panel.center.z
    };
    const horizontal = dot(local, panel.right);
    const vertical = dot(local, panel.up);
    if (Math.abs(horizontal) > panel.width * .5 || Math.abs(vertical) > panel.height * .5) return null;
    const u = horizontal / panel.width + .5;
    const v = .5 - vertical / panel.height;
    const viewportWidth = Number(viewport.width) || DEFAULT_VIEWPORT_WIDTH;
    const viewportHeight = Number(viewport.height) || DEFAULT_VIEWPORT_HEIGHT;
    return {
        distance,
        position,
        u,
        v,
        pixelX: u * viewportWidth,
        pixelY: v * viewportHeight
    };
}

function stylesheetText() {
    const rules = [];
    for (const sheet of [...document.styleSheets]) {
        try {
            for (const rule of [...sheet.cssRules]) rules.push(rule.cssText);
        } catch {
            // Cross-origin stylesheets cannot be inspected. Nourishland's
            // application stylesheet is same-origin and remains available.
        }
    }
    return rules.join('\n');
}

function syncFormState(source, clone) {
    const sourceControls = source.querySelectorAll('input, textarea, select, details');
    const cloneControls = clone.querySelectorAll('input, textarea, select, details');
    sourceControls.forEach((control, index) => {
        const copy = cloneControls[index];
        if (!copy) return;
        if (control instanceof HTMLInputElement) {
            copy.setAttribute('value', control.value);
            if (control.checked) copy.setAttribute('checked', '');
            else copy.removeAttribute('checked');
        } else if (control instanceof HTMLTextAreaElement) {
            copy.textContent = control.value;
        } else if (control instanceof HTMLSelectElement) {
            [...copy.options].forEach((option, optionIndex) => {
                if (optionIndex === control.selectedIndex) option.setAttribute('selected', '');
                else option.removeAttribute('selected');
            });
        } else if (control instanceof HTMLDetailsElement) {
            if (control.open) copy.setAttribute('open', '');
            else copy.removeAttribute('open');
        }
    });
}

function safeClone(source, scrollTop, width) {
    const clone = source.cloneNode(true);
    const sourceStyle = getComputedStyle(source);
    for (const property of sourceStyle) {
        if (property.startsWith('--')) clone.style.setProperty(property, sourceStyle.getPropertyValue(property));
    }
    clone.style.setProperty('font-family', sourceStyle.fontFamily);
    clone.style.setProperty('font-size', sourceStyle.fontSize);
    clone.style.setProperty('color', sourceStyle.color);
    clone.style.setProperty('background-color', sourceStyle.backgroundColor);
    clone.removeAttribute('id');
    clone.querySelectorAll('script, canvas, video, iframe, [data-spatial-mirror-ignore]').forEach(element => element.remove());
    clone.querySelectorAll('img').forEach(image => {
        const sourceValue = image.getAttribute('src') || '';
        if (!sourceValue.startsWith('data:') && !sourceValue.startsWith('/') && !sourceValue.startsWith(window.location.origin)) {
            image.removeAttribute('src');
            image.setAttribute('alt', image.getAttribute('alt') || 'Project image');
        }
    });
    syncFormState(source, clone);
    clone.style.setProperty('display', 'block', 'important');
    clone.style.setProperty('visibility', 'visible', 'important');
    clone.style.setProperty('pointer-events', 'none', 'important');
    clone.style.setProperty('position', 'relative', 'important');
    clone.style.setProperty('left', '0', 'important');
    clone.style.setProperty('top', `${-scrollTop}px`, 'important');
    clone.style.setProperty('width', `${width}px`, 'important');
    clone.style.setProperty('max-width', 'none', 'important');
    clone.style.setProperty('margin', '0', 'important');
    return clone;
}

function dispatchValueEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
}

function makeKeyboard(root, activeInput, scrollTop, viewportHeight, onChange, onClose) {
    root.querySelector('[data-spatial-mirror-keyboard]')?.remove();
    const keyboard = document.createElement('section');
    keyboard.dataset.spatialMirrorKeyboard = '';
    keyboard.setAttribute('aria-label', 'Spatial keyboard');
    keyboard.style.cssText = [
        'position:absolute',
        'z-index:99999',
        'left:54px',
        `top:${Math.round(scrollTop + viewportHeight * .51)}px`,
        'width:1172px',
        'box-sizing:border-box',
        'padding:18px',
        'border:3px solid rgba(232,249,190,.92)',
        'border-radius:24px',
        'background:rgba(14,25,22,.98)',
        'box-shadow:0 18px 50px rgba(0,0,0,.55)',
        'display:grid',
        'grid-template-columns:repeat(10,1fr)',
        'gap:8px'
    ].join(';');
    let uppercase = false;
    const keys = [...'QWERTYUIOP', ...'ASDFGHJKL', ...'ZXCVBNM', ...'1234567890', '-', '.', '/', '@'];
    const addKey = (label, value = label, columns = 1) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.spatialKey = value;
        button.textContent = label;
        button.style.cssText = `min-height:54px;padding:8px;border:1px solid rgba(255,255,255,.3);border-radius:10px;background:#385746;color:#fff;font:800 22px system-ui,sans-serif;grid-column:span ${columns}`;
        keyboard.append(button);
    };
    keys.forEach(key => addKey(key, /^[A-Z]$/.test(key) ? key.toLowerCase() : key));
    addKey('SHIFT', 'shift', 2);
    addKey('SPACE', 'space', 3);
    addKey('BACKSPACE', 'backspace', 3);
    addKey('DONE', 'done', 2);
    keyboard.addEventListener('click', event => {
        const key = event.target.closest('[data-spatial-key]')?.dataset.spatialKey;
        if (!key) return;
        if (key === 'done') {
            dispatchValueEvents(activeInput);
            onClose();
            return;
        }
        if (key === 'shift') {
            uppercase = !uppercase;
            event.target.textContent = uppercase ? 'SHIFT ON' : 'SHIFT';
            onChange();
            return;
        }
        if (key === 'backspace') activeInput.value = activeInput.value.slice(0, -1);
        else {
            const typed = key === 'space' ? ' ' : uppercase && /^[a-z]$/.test(key) ? key.toUpperCase() : key;
            activeInput.value += typed;
            if (uppercase && /^[a-z]$/.test(key)) {
                uppercase = false;
                const shift = keyboard.querySelector('[data-spatial-key="shift"]');
                if (shift) shift.textContent = 'SHIFT';
            }
        }
        activeInput.setAttribute('value', activeInput.value);
        activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        onChange();
    });
    root.append(keyboard);
    return keyboard;
}

export function createSpatialDashboardMirror(options = {}) {
    const gl = options.gl;
    const root = options.root;
    if (!gl || !root) throw new Error('A WebGL context and dashboard root are required.');
    const width = Number(options.width) || DEFAULT_VIEWPORT_WIDTH;
    const height = Number(options.height) || DEFAULT_VIEWPORT_HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) throw new Error('The spatial dashboard canvas is unavailable.');
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    context.fillStyle = '#f5f7ef';
    context.fillRect(0, 0, width, height);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

    const originalStyle = root.getAttribute('style');
    root.dataset.spatialDashboardMirrorSource = '';
    root.style.setProperty('display', 'block', 'important');
    root.style.setProperty('visibility', 'visible', 'important');
    root.style.setProperty('pointer-events', 'none', 'important');
    root.style.setProperty('position', 'fixed', 'important');
    root.style.setProperty('left', '-20000px', 'important');
    root.style.setProperty('top', '0', 'important');
    root.style.setProperty('width', `${width}px`, 'important');
    root.style.setProperty('max-width', 'none', 'important');
    root.style.setProperty('height', 'auto', 'important');
    root.style.setProperty('min-height', `${height}px`, 'important');
    root.style.setProperty('overflow', 'visible', 'important');

    const css = stylesheetText();
    let scrollTop = 0;
    let activeInput = null;
    let keyboard = null;
    let destroyed = false;
    let refreshTimer = 0;
    let refreshGeneration = 0;
    let refreshPromise = Promise.resolve();

    const maxScroll = () => Math.max(0, Math.max(root.scrollHeight, root.getBoundingClientRect().height) - height);
    const positionKeyboard = () => {
        const nextTop = `${Math.round(scrollTop + height * .51)}px`;
        if (keyboard && keyboard.style.top !== nextTop) keyboard.style.top = nextTop;
    };

    const upload = () => {
        if (destroyed) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    };

    const capture = async () => {
        if (destroyed) return;
        const generation = ++refreshGeneration;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (destroyed || generation !== refreshGeneration) return;
        scrollTop = clamp(scrollTop, 0, maxScroll());
        positionKeyboard();
        const clone = safeClone(root, scrollTop, width);
        const serialized = new XMLSerializer().serializeToString(clone);
        const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#f5f7ef"><style>${escapeXmlText(css)}</style>${serialized}</div></foreignObject></svg>`;
        const imageUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
        try {
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('The dashboard mirror could not be rasterized.'));
                image.src = imageUrl;
            });
            if (destroyed || generation !== refreshGeneration) return;
            context.clearRect(0, 0, width, height);
            context.drawImage(image, 0, 0, width, height);
            upload();
            options.onUpdate?.();
        } finally {
            URL.revokeObjectURL(imageUrl);
        }
    };

    const refresh = () => {
        if (destroyed) return refreshPromise;
        clearTimeout(refreshTimer);
        refreshPromise = new Promise(resolve => {
            refreshTimer = window.setTimeout(() => {
                capture().catch(error => options.onError?.(error)).finally(resolve);
            }, 35);
        });
        return refreshPromise;
    };

    const observer = new MutationObserver(() => refresh());
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true });

    const targetAt = (pixelX, pixelY) => {
        const rootRect = root.getBoundingClientRect();
        const contentX = pixelX;
        const contentY = pixelY + scrollTop;
        const candidates = [...root.querySelectorAll(INTERACTIVE_SELECTOR)].filter(element => {
            const rect = element.getBoundingClientRect();
            if (!rect.width || !rect.height) return false;
            const left = rect.left - rootRect.left;
            const top = rect.top - rootRect.top;
            return contentX >= left && contentX <= left + rect.width && contentY >= top && contentY <= top + rect.height;
        });
        return candidates.at(-1) || null;
    };

    const closeKeyboard = () => {
        keyboard?.remove();
        keyboard = null;
        activeInput = null;
        refresh();
    };

    const showKeyboard = input => {
        activeInput = input;
        const rootRect = root.getBoundingClientRect();
        const inputRect = input.getBoundingClientRect();
        const inputTop = inputRect.top - rootRect.top;
        scrollTop = clamp(inputTop - height * .18, 0, maxScroll());
        keyboard = makeKeyboard(root, input, scrollTop, height, refresh, closeKeyboard);
        options.onStatus?.('Spatial keyboard open. Aim at the keys and press the trigger.');
        refresh();
    };

    const activateAt = (pixelX, pixelY) => {
        const target = targetAt(pixelX, pixelY);
        if (!target) return false;
        if (target.matches('input, textarea')) {
            const type = String(target.getAttribute('type') || '').toLowerCase();
            if (target instanceof HTMLTextAreaElement || TEXT_INPUT_TYPES.has(type)) {
                showKeyboard(target);
                return true;
            }
            if (type === 'color') {
                const currentIndex = COLOR_SEQUENCE.indexOf(String(target.value || '').toLowerCase());
                target.value = COLOR_SEQUENCE[(currentIndex + 1 + COLOR_SEQUENCE.length) % COLOR_SEQUENCE.length];
                dispatchValueEvents(target);
                refresh();
                return true;
            }
            if (type === 'file') {
                options.onStatus?.('File upload remains available in Web Mode. Other dashboard editing stays spatial.');
                return true;
            }
            target.click();
            refresh();
            return true;
        }
        if (target instanceof HTMLSelectElement) {
            const enabledOptions = [...target.options].filter(option => !option.disabled);
            const selected = enabledOptions.indexOf(target.selectedOptions[0]);
            const next = enabledOptions[(selected + 1 + enabledOptions.length) % enabledOptions.length];
            if (next) target.value = next.value;
            dispatchValueEvents(target);
            options.onStatus?.(`${target.labels?.[0]?.textContent?.trim() || 'Option'}: ${next?.textContent?.trim() || target.value}`);
            refresh();
            return true;
        }
        if (target.matches('summary')) {
            target.parentElement.open = !target.parentElement.open;
            refresh();
            return true;
        }
        if (!target.closest('[data-spatial-mirror-keyboard]')) closeKeyboard();
        target.click();
        refresh();
        return true;
    };

    const scrollBy = delta => {
        const next = clamp(scrollTop + Number(delta || 0), 0, maxScroll());
        if (Math.abs(next - scrollTop) < 1) return false;
        scrollTop = next;
        positionKeyboard();
        refresh();
        return true;
    };

    const destroy = () => {
        if (destroyed) return;
        destroyed = true;
        clearTimeout(refreshTimer);
        observer.disconnect();
        keyboard?.remove();
        delete root.dataset.spatialDashboardMirrorSource;
        if (originalStyle == null) root.removeAttribute('style');
        else root.setAttribute('style', originalStyle);
        gl.deleteTexture(texture);
    };

    refresh();
    return {
        texture,
        width,
        height,
        activateAt,
        scrollBy,
        refresh,
        destroy,
        get scrollTop() { return scrollTop; },
        get maxScroll() { return maxScroll(); }
    };
}
