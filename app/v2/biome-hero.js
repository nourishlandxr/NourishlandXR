import * as THREE from './nlxr/vendor/three.module.min.js';
import { LOCKED_VIEW, LANDING_VIEW, HERO_ZOOM_LIMITS, AMBIENT_ROLL_SPEED, createWheelPivot, rollView, depthDistance, zoomView } from './biome-interaction.js';

const DEPTHS = [
  { key: 'galaxy', label: 'Whole ecosystem', short: 'Whole', copy: 'See the forest as one connected living system.', distance: 7.5 },
  { key: 'forest', label: 'Forest worlds', short: 'Forests', copy: 'Distinct forest worlds gather within the whole.', distance: 5.25 },
  { key: 'wildlife', label: 'Wildlife presence', short: 'Wildlife', copy: 'Wildlife presence connects the living layers.', distance: 3.45 },
  { key: 'understory', label: 'Understory', short: 'Understory', copy: 'The understory reveals a sheltered world.', distance: 2.24 },
  { key: 'microhabitat', label: 'Microhabitat', short: 'Micro', copy: 'Fruit, fungi and small habitats come into view.', distance: 1.44 }
];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const ASSET_URLS = {
  model: new URL('./assets/hero-wheel-biome-surface.glb?v=6', import.meta.url),
  metadata: new URL('./assets/hero-wheel-biome-surface.json?v=6', import.meta.url),
  poster: new URL('./assets/hero-wheel-v5.png', import.meta.url)
};

function makeId() {
  return `nl-biome-${Math.random().toString(36).slice(2, 10)}`;
}

function parseGlb(buffer) {
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) {
    throw new Error('The biome-surface model is not a supported binary glTF file.');
  }

  let documentData;
  let binaryStart;
  for (let cursor = 12; cursor < buffer.byteLength;) {
    const length = header.getUint32(cursor, true);
    const type = header.getUint32(cursor + 4, true);
    const start = cursor + 8;
    if (start + length > buffer.byteLength) throw new Error('The biome-surface model has an incomplete chunk.');
    if (type === 0x4e4f534a) {
      documentData = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, length)));
    } else if (type === 0x004e4942) {
      binaryStart = start;
    }
    cursor = start + length;
  }
  if (!documentData || binaryStart === undefined) throw new Error('The biome-surface model is missing geometry data.');
  return { documentData, binaryStart };
}

function createMarkup(id, fallbackUrl, options) {
  const headingId = `${id}-heading`;
  const detailsId = `${id}-instructions`;
  const heroLabel = options.label || 'Nourishland biome wheel';

  return `
    <div class="nl-biome-scene" data-biome-scene role="region" aria-labelledby="${headingId}">
      <div class="nl-biome-stage" data-biome-stage tabindex="0" role="group" aria-label="${heroLabel}" aria-describedby="${detailsId}">
        <img class="nl-biome-poster" data-biome-poster src="${fallbackUrl}" alt="The Nourishland living-world wheel, an ecosystem layered with miniature forests, water and habitats." width="1024" height="1024" fetchpriority="high">
        <span class="nl-biome-status" data-biome-status role="status" aria-live="polite">Loading the living-world view…</span>
      </div>
      <h1 class="nl-biome-title" id="${headingId}">Nourishland living worlds</h1>
      <div class="nl-biome-navigation">
        <p class="nl-biome-gesture-cue">Grab and drag to roll<span>Scroll to explore</span></p>
        <p class="nl-biome-title" id="${detailsId}">Hold left click and drag sideways to gently roll, or move up and down to move closer or farther while keeping its angle. Release and scroll for continuous zoom between the locked near and far limits. Use arrow keys to roll or push/pull the view, plus and minus to zoom, Home and End for the zoom limits, and Space to pause or resume the slow spin. On touch screens, swipe sideways to roll and vertically to scroll the page.</p>
      </div>
    </div>`;
}

function readAccessor(documentData, binaryStart, buffer, accessorId, cache) {
  if (cache.has(accessorId)) return cache.get(accessorId);
  const accessor = documentData.accessors[accessorId];
  const view = documentData.bufferViews[accessor.bufferView];
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
  const ArrayType = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[accessor.componentType];
  if (!size || !ArrayType) throw new Error('The biome-surface model uses an unsupported geometry attribute.');
  const start = binaryStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = (view.byteStride || size * ArrayType.BYTES_PER_ELEMENT) / ArrayType.BYTES_PER_ELEMENT;
  let values;
  if (stride === size) values = new ArrayType(buffer, start, accessor.count * size);
  else {
    values = new ArrayType(accessor.count * size);
    const source = new ArrayType(buffer, start, (accessor.count - 1) * stride + size);
    for (let row = 0; row < accessor.count; row++) {
      for (let column = 0; column < size; column++) values[row * size + column] = source[row * stride + column];
    }
  }
  const attribute = new THREE.BufferAttribute(values, size, Boolean(accessor.normalized));
  cache.set(accessorId, attribute);
  return attribute;
}

function createDepths() {
  return DEPTHS.map(depth => ({ ...depth }));
}

/**
 * Mount the Nourishland biome-wheel hero inside a placeholder element.
 *
 * Example:
 *   const hero = await mountBiomeHero(document.querySelector('[data-biome-hero]'));
 *   hero.setPaused(true); // call while a navigation menu is open
 *   hero.setDepth(2);     // 0–4, with 2 selecting Wildlife presence
 *   hero.destroy();
 */
export async function mountBiomeHero(target, options = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(host instanceof Element)) throw new TypeError('mountBiomeHero needs a host element or selector.');
  if (host.dataset.biomeMounted === 'true') throw new Error('A biome hero is already mounted in this element.');

  const id = makeId();
  const event = (type, detail = {}) => host.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
  const fallbackUrl = options.fallbackImage || ASSET_URLS.poster.href;
  host.classList.add('nl-biome-mount');
  host.innerHTML = createMarkup(id, fallbackUrl, options);
  host.dataset.biomeMounted = 'true';

  const root = host.querySelector('.nl-biome-scene');
  const stage = host.querySelector('[data-biome-stage]');
  const status = host.querySelector('[data-biome-status]');
  const fallbackImage = host.querySelector('[data-biome-poster]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const resources = new Set();
  const keep = resource => (resources.add(resource), resource);
  const depths = createDepths();
  const motionParam = new URLSearchParams(location.search).get('biomeMotion');
  const forcedFallback = options.forceFallback === true || new URLSearchParams(location.search).has('biomeFallback');
  let renderer;
  let resizeObserver;
  let intersectionObserver;
  let removalObserver;
  let frame = 0;
  let last = 0;
  let reduced = media.matches || motionParam === 'reduce';
  let userPaused = Boolean(options.adjustable);
  let externallyPaused = false;
  let visible = true;
  let depthIndex = 0;
  let pointerGesture;
  let stageActive = false;
  let closeFraming;
  let destroyed = false;
  let loadError = null;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.08, 60);
  const { wheel, model } = createWheelPivot();
  scene.add(wheel);
  const state = { roll: LOCKED_VIEW.roll, distance: 7.5 };
  const targetState = { ...state };
  let adjustmentPitch = LOCKED_VIEW.pitch;
  let adjustmentYaw = LOCKED_VIEW.yaw;
  let adjustmentLocked = false;
  const surfaces = [];
  let baseDistance = 7.5;

  const listen = (element, type, handler, extra = {}) => element?.addEventListener(type, handler, { ...extra, signal: abort.signal });
  const setStatus = message => { status.textContent = message; };
  const invalidate = () => {
    if (!destroyed && !frame && visible && !document.hidden && host.dataset.biomeReady === 'true') frame = requestAnimationFrame(draw);
  };
  const emitDepth = source => event('biome-depth-change', {
    index: depthIndex,
    key: depths[depthIndex].key,
    label: depths[depthIndex].label,
    depth: depthIndex + 1,
    source
  });
  const syncMotionControl = () => {
    const moving = !userPaused && !externallyPaused && !reduced;
    root.dataset.motion = reduced ? 'reduce' : moving ? 'play' : 'paused';
  };

  function draw(now) {
    frame = 0;
    if (destroyed || !visible || document.hidden || host.dataset.biomeReady !== 'true') return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;
    const autoRotate = !reduced && !userPaused && !externallyPaused && !pointerGesture && !adjustmentLocked;
    if (autoRotate) targetState.roll += dt * AMBIENT_ROLL_SPEED;

    const ease = reduced ? 1 : 1 - Math.exp(-dt * (pointerGesture ? 14 : 5.5));
    let moving = false;
    for (const key of Object.keys(state)) {
      state[key] = lerp(state[key], targetState[key], ease);
      if (Math.abs(targetState[key] - state[key]) > 0.00015) moving = true;
    }
    wheel.rotation.set(LOCKED_VIEW.pitch, LOCKED_VIEW.yaw, state.roll);
    if (options.adjustable) wheel.rotation.set(adjustmentPitch, adjustmentYaw, state.roll);
    state.distance = Math.max(depthDistance(HERO_ZOOM_LIMITS.near, baseDistance), Math.min(depthDistance(HERO_ZOOM_LIMITS.far, baseDistance), state.distance));
    camera.position.set(0, 0, state.distance);
    stage.dataset.distance = state.distance.toFixed(4);
    const isClose = state.distance <= depthDistance(HERO_ZOOM_LIMITS.near * 1.1, baseDistance);
    if (closeFraming !== isClose) { closeFraming = isClose; event('biome-framing-change', { close: isClose }); }
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    stage.dataset.rotation = [wheel.rotation.x, wheel.rotation.y, wheel.rotation.z].map(value => value.toFixed(3)).join(',');
    if (options.adjustable) event('biome-orientation-change', api.orientation);
    if (moving || autoRotate) invalidate();
  }

  function setDistance(value, { source = 'api', announce = true } = {}) {
    targetState.distance = clamp(value, depthDistance(HERO_ZOOM_LIMITS.near, baseDistance), depthDistance(HERO_ZOOM_LIMITS.far, baseDistance));
    // Depth metadata follows the continuous view; it never snaps the camera.
    const normalized = targetState.distance * 7.5 / baseDistance;
    let index = HERO_ZOOM_LIMITS.farDepth;
    for (let candidate = index + 1; candidate <= HERO_ZOOM_LIMITS.nearDepth; candidate++) {
      if (Math.abs(depths[candidate].distance - normalized) < Math.abs(depths[index].distance - normalized)) index = candidate;
    }
    const changed = depthIndex !== index;
    depthIndex = index;
    root.dataset.depth = String(index + 1);
    if (announce && changed) emitDepth(source);
    if (host.dataset.biomeReady === 'true') applyDepthVisibility();
    else invalidate();
  }

  function setDepth(value, options = {}) {
    const index = clamp(Math.round(Number(value) || 0), HERO_ZOOM_LIMITS.farDepth, HERO_ZOOM_LIMITS.nearDepth);
    setDistance(depthDistance(depths[index].distance, baseDistance), options);
  }

  function resize() {
    if (!renderer || destroyed) return;
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(5200000 / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const previousBase = baseDistance;
    baseDistance = Math.max(8.8, 4.65 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    targetState.distance *= baseDistance / previousBase;
    state.distance *= baseDistance / previousBase;
    invalidate();
  }

  async function loadModel() {
    if (forcedFallback) throw new Error('Fallback mode was requested for the standalone preview.');
    const [modelResponse, metadataResponse] = await Promise.all([
      fetch(options.modelUrl || ASSET_URLS.model, { signal: abort.signal }),
      fetch(options.metadataUrl || ASSET_URLS.metadata, { signal: abort.signal })
    ]);
    if (!modelResponse.ok) throw new Error(`The biome-surface model request failed (${modelResponse.status}).`);
    if (!metadataResponse.ok) throw new Error(`The biome-surface model notes request failed (${metadataResponse.status}).`);
    const [buffer, metadata] = await Promise.all([modelResponse.arrayBuffer(), metadataResponse.json()]);
    const { documentData, binaryStart } = parseGlb(buffer);
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const imageTextures = await Promise.all((documentData.images || []).map(async definition => {
      let source;
      let temporary = false;
      if (definition.bufferView !== undefined) {
        const view = documentData.bufferViews[definition.bufferView];
        source = URL.createObjectURL(new Blob([new Uint8Array(buffer, binaryStart + (view.byteOffset || 0), view.byteLength)], { type: definition.mimeType || 'image/png' }));
        temporary = true;
      } else {
        source = new URL(definition.uri, options.modelUrl || ASSET_URLS.model).href;
      }
      try {
        const texture = await new THREE.TextureLoader().loadAsync(source);
        if (destroyed) { texture.dispose(); return texture; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.anisotropy = anisotropy;
        return keep(texture);
      } finally {
        if (temporary) URL.revokeObjectURL(source);
      }
    }));
    if (destroyed) return;
    const modelTextures = (documentData.textures || []).map(definition => imageTextures[definition.source]);
    const attributes = new Map();
    let triangles = 0;

    for (const { primitive, meshName } of documentData.meshes.flatMap(mesh => mesh.primitives.map(primitive => ({ primitive, meshName: mesh.name || '' })))) {
      const geometry = keep(new THREE.BufferGeometry());
      geometry.setAttribute('position', readAccessor(documentData, binaryStart, buffer, primitive.attributes.POSITION, attributes));
      if (primitive.indices !== undefined) geometry.setIndex(readAccessor(documentData, binaryStart, buffer, primitive.indices, attributes));
      if (primitive.attributes.NORMAL !== undefined) geometry.setAttribute('normal', readAccessor(documentData, binaryStart, buffer, primitive.attributes.NORMAL, attributes));
      else geometry.computeVertexNormals();
      if (primitive.attributes.TEXCOORD_0 !== undefined) geometry.setAttribute('uv', readAccessor(documentData, binaryStart, buffer, primitive.attributes.TEXCOORD_0, attributes));
      if (primitive.attributes.COLOR_0 !== undefined) geometry.setAttribute('color', readAccessor(documentData, binaryStart, buffer, primitive.attributes.COLOR_0, attributes));
      geometry.computeBoundingSphere();

      const materialDefinition = documentData.materials?.[primitive.material] || {};
      const pbr = materialDefinition.pbrMetallicRoughness || {};
      const color = pbr.baseColorFactor || [1, 1, 1, 1];
      const material = keep(new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(color[0], color[1], color[2]),
        map: pbr.baseColorTexture ? modelTextures[pbr.baseColorTexture.index] : null,
        roughness: pbr.roughnessFactor ?? 0.93,
        metalness: pbr.metallicFactor ?? 0,
        side: materialDefinition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
        vertexColors: Boolean(geometry.getAttribute('color')),
        opacity: color[3],
        transparent: materialDefinition.alphaMode === 'BLEND',
        alphaTest: materialDefinition.alphaMode === 'MASK' ? (materialDefinition.alphaCutoff ?? 0.5) : 0,
        emissive: new THREE.Color().setRGB(...(materialDefinition.emissiveFactor || [0, 0, 0]))
      }));
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = materialDefinition.name || meshName || 'Wheel surface';
      mesh.userData.foliage = materialDefinition.extras?.foliage ?? /ecosystem|microhabitat|moss|lichen|fung|mushroom|flower|seedling|insect|foliage|leaf|leaves|frond|vein|root|strand|branch/i.test(mesh.name);
      const depthMatch = /depth[_ -]?([2-5])/i.exec(mesh.name);
      const explicitDepth = Number(primitive.extras?.revealDepth ?? primitive.extras?.depth ?? materialDefinition.extras?.revealDepth ?? materialDefinition.extras?.depth ?? depthMatch?.[1] ?? 1);
      mesh.userData.revealDepth = /fruit|fung|mushroom/i.test(mesh.name) ? 5 : clamp(Number.isFinite(explicitDepth) ? explicitDepth : 1, 1, 5);
      mesh.userData.triangleCount = primitive.indices !== undefined
        ? documentData.accessors[primitive.indices].count / 3
        : documentData.accessors[primitive.attributes.POSITION].count / 3;
      triangles += mesh.userData.triangleCount;
      mesh.castShadow = !/raised leaf veins/i.test(mesh.name);
      mesh.receiveShadow = true;
      model.add(mesh);
      surfaces.push(mesh);
    }

    if (destroyed) return;
    stage.dataset.parts = String(metadata.parts ?? surfaces.length);
    stage.dataset.triangles = String(Math.round(triangles));
    stage.dataset.modelVersion = String(metadata.version ?? 5);
    applyDepthVisibility();
  }

  function applyDepthVisibility() {
    const activeDepth = depthIndex + 1;
    surfaces.forEach(mesh => { mesh.visible = mesh.userData.revealDepth <= activeDepth; });
    invalidate();
  }

  function fail(error) {
    if (destroyed) return;
    loadError = error;
    host.dataset.biomeReady = 'error';
    root.dataset.ready = 'error';
    stage.dataset.ready = 'error';
    cancelAnimationFrame(frame);
    frame = 0;
    fallbackImage.hidden = false;
    fallbackImage.alt = 'Static view of the Nourishland living-world wheel. The interactive 3D model could not be loaded.';
    stage.setAttribute('aria-label', 'Static image of the Nourishland living-world wheel. Interactive 3D view unavailable.');
    stage.removeAttribute('tabindex');
    stage.dataset.active = 'false';
    stageActive = false;
    pointerGesture = null;
    setStatus('The interactive view could not be loaded. The Nourishland wheel image is shown instead.');
    console.warn('Nourishland biome hero is using its visible poster fallback:', error);
    event('biome-hero-error', { error, fallback: fallbackUrl });
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    removalObserver?.disconnect();
    cancelAnimationFrame(frame);
    for (const resource of resources) resource.dispose?.();
    renderer?.dispose();
    renderer?.forceContextLoss();
    host.classList.remove('nl-biome-mount');
    delete host.dataset.biomeMounted;
    delete host.dataset.biomeReady;
    host.replaceChildren();
    event('biome-hero-destroy', {});
  }

  function setPaused(value) {
    externallyPaused = Boolean(value);
    root.dataset.navigationOpen = String(externallyPaused);
    root.inert = externallyPaused;
    if (externallyPaused) {
      pointerGesture = null;
      stageActive = false;
      stage.dataset.active = 'false';
    }
    syncMotionControl();
    invalidate();
  }

  function setReducedMotion(value) {
    reduced = Boolean(value);
    if (reduced) {
      Object.assign(state, targetState);
      cancelAnimationFrame(frame);
      frame = 0;
    }
    syncMotionControl();
    invalidate();
  }

  const api = {
    element: root,
    stage,
    setDepth,
    setPaused,
    setReducedMotion,
    setOrientation({ pitch, yaw, roll }) {
      if (!options.adjustable || externallyPaused || loadError) return false;
      if (![pitch, yaw, roll].every(Number.isFinite)) throw new TypeError('Angles must be finite degrees.');
      adjustmentPitch = THREE.MathUtils.degToRad(pitch);
      adjustmentYaw = THREE.MathUtils.degToRad(yaw);
      state.roll = targetState.roll = THREE.MathUtils.degToRad(roll);
      userPaused = true;
      syncMotionControl();
      invalidate();
      return true;
    },
    get orientation() {
      return { pitch: THREE.MathUtils.radToDeg(options.adjustable ? adjustmentPitch : LOCKED_VIEW.pitch),
        yaw: THREE.MathUtils.radToDeg(options.adjustable ? adjustmentYaw : LOCKED_VIEW.yaw), roll: THREE.MathUtils.radToDeg(state.roll) };
    },
    setAngleLocked(value) {
      if (!options.adjustable) return;
      adjustmentLocked = Boolean(value);
      if (adjustmentLocked) { userPaused = true; pointerGesture = null; syncMotionControl(); }
    },
    focus() { stage.focus({ preventScroll: true }); },
    destroy,
    get depth() { return depthIndex; },
    get ready() { return host.dataset.biomeReady === 'true'; },
    get error() { return loadError; },
    get paused() { return externallyPaused; },
    get reducedMotion() { return reduced; }
  };

  listen(host, 'focusin', eventObject => {
    if (eventObject.target === stage) {
      stageActive = true;
      stage.dataset.active = 'true';
    }
  });
  listen(host, 'focusout', eventObject => {
    if (eventObject.target === stage) {
      stageActive = false;
      stage.dataset.active = 'false';
      }
  });
  listen(stage, 'pointerenter', eventObject => {
    if (eventObject.pointerType === 'mouse' && !externallyPaused && !loadError && host.dataset.biomeReady === 'true') {
      stageActive = true;
      stage.dataset.active = 'true';
    }
  });
  listen(stage, 'pointerleave', eventObject => {
    if (eventObject.pointerType === 'mouse' && document.activeElement !== stage && !pointerGesture) {
      stageActive = false;
      stage.dataset.active = 'false';
      }
  });
  listen(stage, 'pointerdown', eventObject => {
    if (externallyPaused || loadError || host.dataset.biomeReady !== 'true' || (eventObject.pointerType === 'mouse' && eventObject.button !== 0)) return;
    if (options.adjustable && adjustmentLocked) return;
    if (pointerGesture) return;
    pointerGesture = { id: eventObject.pointerId, x: eventObject.clientX, y: eventObject.clientY, lastX: eventObject.clientX, lastY: eventObject.clientY, intent: eventObject.pointerType === 'touch' ? 'touch-pending' : 'axis-pending', dragged: false };
    if (eventObject.pointerType !== 'touch') stage.setPointerCapture(eventObject.pointerId);
    stage.focus({ preventScroll: true });
    invalidate();
  });
  listen(stage, 'pointermove', eventObject => {
    if (!pointerGesture || pointerGesture.id !== eventObject.pointerId) return;
    const totalX = eventObject.clientX - pointerGesture.x;
    const totalY = eventObject.clientY - pointerGesture.y;
    if (pointerGesture.intent === 'touch-pending') {
      if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 8) return;
      if (Math.abs(totalY) >= Math.abs(totalX)) { pointerGesture = null; return; }
      pointerGesture.intent = 'horizontal';
      stage.setPointerCapture(eventObject.pointerId);
    } else if (pointerGesture.intent === 'axis-pending') {
      if (Math.max(Math.abs(totalX), Math.abs(totalY)) < 4) return;
      pointerGesture.intent = Math.abs(totalY) > Math.abs(totalX) ? 'vertical' : 'horizontal';
    }
    if (!['horizontal', 'vertical'].includes(pointerGesture.intent)) return;
    pointerGesture.dragged = true;
    eventObject.preventDefault();
    if (pointerGesture.intent === 'horizontal') {
      const dx = eventObject.clientX - pointerGesture.lastX;
      targetState.roll = rollView(targetState.roll, dx, eventObject.pointerType);
      state.roll = targetState.roll;
    } else if (eventObject.pointerType !== 'touch') {
      const dy = eventObject.clientY - pointerGesture.lastY;
      setDistance(zoomView(targetState.distance, dy, 0, stage.clientHeight, baseDistance), { source: 'drag' });
    }
    pointerGesture.lastX = eventObject.clientX;
    pointerGesture.lastY = eventObject.clientY;
    invalidate();
  });
  const endPointer = eventObject => {
    if (!pointerGesture || pointerGesture.id !== eventObject.pointerId) return;
    // No drag momentum; ambient motion resumes only if the user has not paused it.
    state.roll = targetState.roll;
    pointerGesture = null;
    invalidate();
  };
  listen(stage, 'pointerup', endPointer);
  listen(stage, 'pointercancel', endPointer);
  listen(stage, 'lostpointercapture', endPointer);
  listen(stage, 'wheel', eventObject => {
    if (externallyPaused || host.dataset.biomeReady !== 'true' || eventObject.ctrlKey || eventObject.metaKey || eventObject.deltaY === 0) return;
    eventObject.preventDefault();
    if (pointerGesture) return;
    setDistance(zoomView(targetState.distance, eventObject.deltaY, eventObject.deltaMode, stage.clientHeight, baseDistance), { source: 'wheel' });
  }, { passive: false });
  listen(stage, 'keydown', eventObject => {
    if (externallyPaused || loadError || host.dataset.biomeReady !== 'true') return;
    if (eventObject.ctrlKey || eventObject.metaKey || eventObject.altKey) return;
    if (options.adjustable && adjustmentLocked && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(eventObject.key)) return;
    let handled = true;
    if (eventObject.key === 'ArrowLeft') targetState.roll -= 0.025;
    else if (eventObject.key === 'ArrowRight') targetState.roll += 0.025;
    else if (eventObject.key === 'ArrowUp') setDistance(zoomView(targetState.distance, -64, 0, stage.clientHeight, baseDistance), { source: 'keyboard' });
    else if (eventObject.key === 'ArrowDown') setDistance(zoomView(targetState.distance, 64, 0, stage.clientHeight, baseDistance), { source: 'keyboard' });
    else if (eventObject.key === ' ') { userPaused = !userPaused; if (userPaused) state.roll = targetState.roll; syncMotionControl(); }
    else if (eventObject.key === 'Home') setDepth(HERO_ZOOM_LIMITS.farDepth, { source: 'keyboard' });
    else if (eventObject.key === 'End') setDepth(HERO_ZOOM_LIMITS.nearDepth, { source: 'keyboard' });
    else if (eventObject.key === '+' || eventObject.key === '=') setDistance(targetState.distance * 0.96, { source: 'keyboard' });
    else if (eventObject.key === '-') setDistance(targetState.distance / 0.96, { source: 'keyboard' });
    else handled = false;
    if (handled) {
      if (eventObject.key === 'ArrowLeft' || eventObject.key === 'ArrowRight') {
        userPaused = true;
        syncMotionControl();
      }
      eventObject.preventDefault();
      invalidate();
    }
  });
  listen(media, 'change', eventObject => setReducedMotion(eventObject.matches));
  listen(document, 'visibilitychange', () => {
    last = 0;
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else invalidate();
  });
  listen(window, 'pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  listen(window, 'pageshow', () => { last = 0; invalidate(); });

  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
    else { cancelAnimationFrame(frame); frame = 0; }
  }, { threshold: 0 });
  intersectionObserver.observe(host);
  removalObserver = new MutationObserver(() => { if (!host.isConnected) destroy(); });
  removalObserver.observe(document.body, { childList: true, subtree: true });

  setDepth(options.initialDepth ?? LANDING_VIEW.depth, { source: 'init', announce: false });
  syncMotionControl();
  try {
    renderer = keep(new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.03;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.append(renderer.domElement);
    listen(renderer.domElement, 'webglcontextlost', eventObject => {
      eventObject.preventDefault();
      fail(new Error('The browser lost the WebGL drawing context.'));
    });
    scene.add(new THREE.HemisphereLight(0xfffdf1, 0x304332, 1.6));
    const keyLight = new THREE.DirectionalLight(0xfff5dd, 2.25);
    keyLight.position.set(-3, 5, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe1edce, 0.88);
    fillLight.position.set(4, 1, 3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xb4c7a2, 0.95);
    rimLight.position.set(3, 3, -5);
    scene.add(rimLight);
    resize();
    await loadModel();
    if (destroyed) return api;
    // The first rendered frame uses the chosen view, without a fly-in from a different depth.
    resize();
    Object.assign(state, targetState);
    host.dataset.biomeReady = 'true';
    root.dataset.ready = 'true';
    stage.dataset.ready = 'true';
    fallbackImage.hidden = true;
    stage.setAttribute('aria-label', 'Interactive Nourishland biome wheel, centered in the view. Hold left click and drag horizontally to roll or vertically to pull closer and push farther while keeping its angle. Release and scroll to zoom continuously within the locked limits. Focus the wheel for keyboard controls.');
    setStatus('The biome-surface living-world view is ready.');
    applyDepthVisibility();
    resize();
    invalidate();
    event('biome-hero-ready', { version: Number(stage.dataset.modelVersion) || 5, parts: Number(stage.dataset.parts) || surfaces.length, triangles: Number(stage.dataset.triangles) || undefined });
  } catch (error) {
    fail(error);
  }

  return api;
}

export { DEPTHS as BIOME_DEPTHS };
