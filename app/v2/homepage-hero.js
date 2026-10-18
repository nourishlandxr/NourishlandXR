const host = document.querySelector('[data-biome-hero]');

if (host) {
  const posterUrl = new URL('./assets/hero-wheel-v16-poster.webp', import.meta.url).href;
  const videoUrl = new URL('./assets/hero-wheel-v16-cinematic.webm', import.meta.url).href;
  const mp4Url = new URL('./assets/hero-wheel-v16-cinematic.mp4', import.meta.url).href;
  const full3dUrl = new URL('./full-3d/Nourishland-Hero-Living-v16.html', import.meta.url).href;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  host.classList.add('nl-cinematic-mount');
  host.dataset.biomeReady = 'poster';
  host.innerHTML = `
    <div class="nl-cinematic-scene" data-cinematic-hero>
      <img class="nl-cinematic-poster" src="${posterUrl}" alt="The Nourishland living wheel, densely planted with forests, waterways, wetlands and food-forest contours." width="1280" height="720" fetchpriority="high">
      <video class="nl-cinematic-video" muted loop playsinline preload="metadata" poster="${posterUrl}" aria-hidden="true">
        <source src="${videoUrl}" type="video/webm; codecs=vp9">
        <source src="${mp4Url}" type="video/mp4">
      </video>
      <div class="nl-cinematic-actions">
        <span class="nl-cinematic-caption">Living wheel preview</span>
        <a class="nl-cinematic-enter" href="${full3dUrl}">Explore full 3D <span aria-hidden="true">↗</span></a>
      </div>
      <p class="nl-cinematic-status sr-only" role="status" aria-live="polite">A lightweight preview of the Nourishland living wheel is ready. The complete interactive 3D wheel loads only after selecting Explore full 3D.</p>
    </div>`;

  const scene = host.querySelector('[data-cinematic-hero]');
  const video = host.querySelector('video');
  const poster = host.querySelector('.nl-cinematic-poster');

  const showPoster = () => {
    video.pause();
    scene.dataset.media = 'poster';
    host.dataset.biomeReady = 'poster';
  };
  const playVideo = async () => {
    if (reducedMotion.matches || document.hidden) return showPoster();
    try {
      await video.play();
      scene.dataset.media = 'video';
      host.dataset.biomeReady = 'video';
      poster.setAttribute('aria-hidden', 'true');
    } catch {
      showPoster();
    }
  };

  video.addEventListener('canplay', playVideo, {once:true});
  video.addEventListener('error', showPoster);
  document.addEventListener('visibilitychange', () => document.hidden ? video.pause() : playVideo());
  reducedMotion.addEventListener?.('change', () => reducedMotion.matches ? showPoster() : playVideo());
  window.addEventListener('nourishland:navigation-state', event => event.detail?.open ? video.pause() : playVideo());
  if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) playVideo();

  window.nourishlandBiomeHero = {
    get ready() { return ['video', 'poster'].includes(host.dataset.biomeReady); },
    setPaused(paused) { paused ? video.pause() : playVideo(); },
    destroy() { video.pause(); host.replaceChildren(); delete host.dataset.biomeReady; }
  };
}
