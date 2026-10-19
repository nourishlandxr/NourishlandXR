const host = document.querySelector('[data-biome-hero]');

if (host) {
  const posterUrl = new URL('./assets/hero-v17-natural-depth-poster.webp', import.meta.url).href;
  const liveUrl = new URL('./full-3d/Nourishland-Hero-Living-v17.html?embed=1&central=1&revision=natural-depth-01', import.meta.url).href;
  const fallbackUrl = new URL('./assets/hero-v17-central-day.mp4', import.meta.url).href;
  const lifetime = new AbortController();
  let viewer = null;
  let fallback = null;
  let readyTimer = null;
  let destroyed = false;

  host.classList.add('nl-cinematic-mount');
  host.dataset.biomeReady = 'poster';
  host.setAttribute('aria-busy', 'true');
  host.innerHTML = `
    <div class="nl-cinematic-scene" data-cinematic-hero data-media="poster">
      <img class="nl-cinematic-poster" src="${posterUrl}" alt="Nourishland's central opening, waterfalls, forests, cultivated terraces and wetlands." width="1920" height="1080" fetchpriority="high">
      <div class="nl-cinematic-actions"><button class="nl-cinematic-enter" type="button" data-enter-3d disabled>Explore Nourishland <span aria-hidden="true">↗</span></button></div>
      <button class="nl-cinematic-return" type="button" data-return-central aria-label="Return to locked central view" title="Return to locked central view" hidden>↩</button>
      <p class="nl-cinematic-loading" data-cinematic-status role="status" aria-live="polite">Loading the live world…</p>
      <button class="nl-video-fallback" data-video-fallback type="button" hidden>View video fallback</button>
    </div>`;

  const scene = host.querySelector('[data-cinematic-hero]');
  const poster = host.querySelector('.nl-cinematic-poster');
  const enter = host.querySelector('[data-enter-3d]');
  const back = host.querySelector('[data-return-central]');
  const status = host.querySelector('[data-cinematic-status]');
  const fallbackButton = host.querySelector('[data-video-fallback]');

  function showFailure() {
    clearInterval(readyTimer);
    host.removeAttribute('aria-busy');
    status.textContent = 'The live world could not finish loading. You can use the video fallback.';
    fallbackButton.hidden = false;
  }

  function presentationChanged(event) {
    const full = event.detail?.mode === 'full';
    scene.dataset.media = full ? 'interactive' : 'live';
    host.dataset.biomeReady = full ? 'interactive' : 'live';
    back.hidden = !full;
    enter.disabled = false;
  }

  function prepareViewer() {
    try {
      const child = viewer.contentWindow;
      child.addEventListener('nl-presentation-change', presentationChanged, { signal: lifetime.signal });
      const style = child.document.createElement('style');
      style.textContent = '.masthead,header,#site-header,.skip,.nl-biome-navigation{display:none!important}html,body,main,.biome-hero-route{height:100%!important;min-height:100%!important;margin:0!important;overflow:hidden!important}';
      child.document.head.append(style);
      let attempts = 0;
      readyTimer = setInterval(() => {
        if (destroyed) return clearInterval(readyTimer);
        attempts += 1;
        const stage = child.document.querySelector('[data-biome-stage]');
        if (child.heroPuzzle?.ready() && child.heroInspection?.setCentral && stage?.dataset.ready === 'true') {
          clearInterval(readyTimer);
          child.heroInspection.setCentral();
          scene.dataset.media = 'live';
          host.dataset.biomeReady = 'live';
          poster.setAttribute('aria-hidden', 'true');
          status.hidden = true;
          enter.disabled = false;
          host.removeAttribute('aria-busy');
        } else if (stage?.dataset.ready === 'error' || attempts > 480) showFailure();
      }, 250);
    } catch { showFailure(); }
  }

  function loadLiveWorld() {
    viewer = document.createElement('iframe');
    viewer.className = 'nl-cinematic-iframe';
    viewer.title = 'Live Nourishland central world with lighting and unlockable camera';
    viewer.src = liveUrl;
    viewer.setAttribute('allow', 'xr-spatial-tracking; fullscreen');
    viewer.addEventListener('load', prepareViewer, { once: true });
    scene.prepend(viewer);
  }

  function enterInteractive() {
    if (destroyed || !viewer?.contentWindow.heroInspection) return;
    viewer.contentWindow.heroInspection.setUnlocked(true);
    viewer.contentWindow.document.querySelector('[data-biome-stage]')?.focus();
  }

  function returnToCentral() {
    viewer?.contentWindow.heroInspection?.setCentral();
    enter.focus();
  }

  function playVideoFallback() {
    clearInterval(readyTimer);
    viewer?.remove();
    viewer = null;
    fallback = document.createElement('video');
    fallback.className = 'nl-cinematic-video';
    fallback.dataset.cinematicVideo = '0';
    fallback.muted = true;
    fallback.loop = true;
    fallback.playsInline = true;
    fallback.poster = posterUrl;
    fallback.src = fallbackUrl;
    scene.prepend(fallback);
    fallbackButton.hidden = true;
    status.hidden = true;
    scene.dataset.media = 'video';
    host.dataset.biomeReady = 'video';
    fallback.play().catch(() => { scene.dataset.media = 'poster'; });
  }

  enter.addEventListener('click', enterInteractive, { signal: lifetime.signal });
  back.addEventListener('click', returnToCentral, { signal: lifetime.signal });
  fallbackButton.addEventListener('click', playVideoFallback, { signal: lifetime.signal });
  window.addEventListener('nourishland:route',event=>{
    if(viewer)viewer.style.display=event.detail.page==='home'?'':'none';
  },{signal:lifetime.signal});
  loadLiveWorld();

  window.nourishlandBiomeHero = {
    get ready() { return ['live', 'interactive', 'video'].includes(host.dataset.biomeReady); },
    enterInteractive,
    returnToCentral,
    setPaused(paused) { if (fallback) paused ? fallback.pause() : fallback.play().catch(() => {}); },
    destroy() {
      destroyed = true;
      clearInterval(readyTimer);
      lifetime.abort();
      fallback?.pause();
      viewer?.remove();
      host.replaceChildren();
      delete host.dataset.biomeReady;
    }
  };
}
