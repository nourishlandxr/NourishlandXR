const host = document.querySelector('[data-biome-hero]');

if (host) {
  const asset = file => new URL(`./assets/${file}`, import.meta.url).href;
  const full3dUrl = new URL('./full-3d/Nourishland-Hero-Living-v17.html?embed=1', import.meta.url).href;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = new AbortController();
  const probe = document.createElement('video');
  // This review's H.264 encode is smaller; prefer it and retain VP9 compatibility.
  let format = probe.canPlayType('video/mp4') ? 'mp4' : 'webm';
  const posterUrl = () => asset(`hero-v17-central-day-poster-${format}.webp`);
  const videoUrl = () => asset(`hero-v17-central-day.${format}`);

  host.classList.add('nl-cinematic-mount');
  host.dataset.biomeReady = 'poster';
  host.innerHTML = `
    <div class="nl-cinematic-scene" data-cinematic-hero data-media="poster">
      <img class="nl-cinematic-poster" src="${posterUrl()}" alt="Waterfalls falling through Nourishland's central opening, surrounded by forest, cultivated terraces and wetlands." width="1920" height="1080" fetchpriority="high">
      <video class="nl-cinematic-video" data-cinematic-video="0" muted loop playsinline preload="metadata" poster="${posterUrl()}" aria-hidden="true"></video>
      <div class="nl-cinematic-actions"><button class="nl-cinematic-enter" type="button" data-enter-3d>Explore Nourishland <span aria-hidden="true">↗</span></button></div>
      <button class="nl-cinematic-return" type="button" data-return-video aria-label="Return to video hero" title="Return to video hero" hidden>↩</button>
      <p class="nl-cinematic-loading" data-cinematic-status role="status" aria-live="polite" hidden></p>
    </div>`;

  const scene = host.querySelector('[data-cinematic-hero]');
  const poster = host.querySelector('.nl-cinematic-poster');
  const video = host.querySelector('video');
  const status = host.querySelector('[data-cinematic-status]');
  const enter = host.querySelector('[data-enter-3d]');
  const back = host.querySelector('[data-return-video]');
  let frame = null;
  let readyTimer = null;
  let destroyed = false;
  let navigationOpen = false;
  let triedFallback = false;
  video.muted = true;

  const showPoster = () => {
    video.pause();
    if (frame) return;
    scene.dataset.media = 'poster';
    host.dataset.biomeReady = 'poster';
    poster.removeAttribute('aria-hidden');
  };
  const playPreview = async () => {
    if (destroyed || frame || navigationOpen || document.hidden) return;
    if (reducedMotion.matches) return showPoster();
    if (!video.hasAttribute('src')) video.src = videoUrl();
    try {
      await video.play();
      if (frame || destroyed || document.hidden || reducedMotion.matches || navigationOpen) return video.pause();
      scene.dataset.media = 'video';
      host.dataset.biomeReady = 'video';
      poster.setAttribute('aria-hidden', 'true');
    } catch { showPoster(); }
  };

  function returnToVideo() {
    clearInterval(readyTimer);
    frame?.remove();
    frame = null;
    back.hidden = true;
    status.hidden = true;
    enter.disabled = false;
    enter.textContent = 'Explore Nourishland ↗';
    host.removeAttribute('aria-busy');
    delete scene.dataset.loading3d;
    showPoster();
    playPreview();
    enter.focus();
  }

  function prepareEmbeddedViewer(viewer) {
    const child = viewer.contentWindow;
    const style = child.document.createElement('style');
    style.textContent = '.masthead,header,#site-header,.skip,.nl-biome-navigation{display:none!important}html,body,main,.biome-hero-route{height:100%!important;min-height:100%!important;margin:0!important;overflow:hidden!important}';
    child.document.head.append(style);
    let attempts = 0;
    readyTimer = setInterval(() => {
      if (destroyed || frame !== viewer) return clearInterval(readyTimer);
      attempts += 1;
      const stage = child.document.querySelector('[data-biome-stage]');
      if (child.heroPuzzle?.ready() && child.heroInspection && stage?.dataset.ready === 'true') {
        clearInterval(readyTimer);
        child.heroPuzzle.reset();
        child.heroPuzzle.setDistance(2.24);
        scene.dataset.media = 'interactive';
        host.dataset.biomeReady = 'interactive';
        host.removeAttribute('aria-busy');
        delete scene.dataset.loading3d;
        status.hidden = true;
        back.hidden = false;
        stage.focus();
      } else if (stage?.dataset.ready === 'error' || attempts > 480) {
        clearInterval(readyTimer);
        status.textContent = 'The full world could not finish loading. Return to the video and try again.';
        back.hidden = false;
      }
    }, 250);
  }

  function enterInteractive() {
    if (frame || destroyed) return;
    video.pause();
    enter.disabled = true;
    enter.textContent = 'Loading world…';
    status.textContent = 'Loading the full V17 world…';
    status.hidden = false;
    host.setAttribute('aria-busy', 'true');
    scene.dataset.loading3d = 'true';
    const viewer = document.createElement('iframe');
    frame = viewer;
    viewer.className = 'nl-cinematic-iframe';
    viewer.title = 'Complete Nourishland V17 world with unlockable camera';
    viewer.src = full3dUrl;
    viewer.setAttribute('allow', 'xr-spatial-tracking; fullscreen');
    viewer.addEventListener('load', () => {
      if (frame !== viewer) return;
      try { prepareEmbeddedViewer(viewer); }
      catch { status.textContent = 'The full world could not open. Return to the video and try again.'; back.hidden = false; }
    }, { once: true });
    scene.prepend(viewer);
  }

  video.addEventListener('error', () => {
    if (!triedFallback) {
      triedFallback = true;
      format = format === 'mp4' ? 'webm' : 'mp4';
      poster.src = posterUrl();
      video.poster = posterUrl();
      video.src = videoUrl();
      playPreview();
    } else showPoster();
  }, { signal: lifetime.signal });
  enter.addEventListener('click', enterInteractive, { signal: lifetime.signal });
  back.addEventListener('click', returnToVideo, { signal: lifetime.signal });
  document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : playPreview(), { signal: lifetime.signal });
  reducedMotion.addEventListener('change', () => reducedMotion.matches ? showPoster() : playPreview(), { signal: lifetime.signal });
  window.addEventListener('nourishland:navigation-state', event => {
    navigationOpen = !!event.detail?.open;
    navigationOpen ? video.pause() : playPreview();
  }, { signal: lifetime.signal });
  playPreview();

  window.nourishlandBiomeHero = {
    get ready() { return ['video', 'poster', 'interactive'].includes(host.dataset.biomeReady); },
    setPaused(paused) { paused ? video.pause() : playPreview(); },
    enterInteractive,
    returnToVideo,
    destroy() {
      destroyed = true;
      clearInterval(readyTimer);
      lifetime.abort();
      video.pause();
      video.removeAttribute('src');
      video.load();
      frame?.remove();
      host.replaceChildren();
      delete host.dataset.biomeReady;
    }
  };
}
