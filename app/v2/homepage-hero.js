import { mountBiomeHero } from './biome-hero.js';

const host = document.querySelector('[data-biome-hero]');
const adjustable = new URLSearchParams(location.search).get('wheelAdjust') === '1';

if (host) {
  host.addEventListener('biome-framing-change', event => {
    const close = Boolean(event.detail.close);
    document.body.toggleAttribute('data-hero-close', close);
  });
  try {
    const hero = await mountBiomeHero(host, {
      label: 'Interactive Nourishland living-world wheel',
      adjustable,
      title: 'Learn from<br><em>living worlds.</em>',
      description: 'Plants, places and the connections between them. Move between the locked far and close views.',
      exploreHref: '#explore',
      pilotHref: '#pilot-program'
    });

    window.addEventListener('nourishland:navigation-state', event => {
      hero.setPaused(Boolean(event.detail?.open));
    });

    hero.setPaused(document.body.hasAttribute('data-navigation-open'));
    window.nourishlandBiomeHero = hero;
    if (adjustable) {
      const { mountWheelAdjustment } = await import('./wheel-adjustment.js');
      mountWheelAdjustment(hero);
    }
  } catch (error) {
    host.dataset.biomeReady = 'error';
    console.warn('The homepage is using its static living-world artwork.', error);
  }
}
