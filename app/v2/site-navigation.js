const navigation = document.querySelector('#main-nav');
const menuButton = document.querySelector('.menu-toggle');
const pageRegions = [...document.querySelectorAll('main, footer')];
const originalInertState = new Map(pageRegions.map(region => [region, region.inert]));
let menuOpen = false;

function currentRoute() {
  return decodeURIComponent(location.hash.slice(1) || 'home');
}

function syncPathwayMenu() {
  const route = currentRoute();
  const educationRoutes = new Set(['pathways', 'learn', 'grow', 'food-forests', 'connect', 'creator-steps']);
  const pathway = educationRoutes.has(route) ? 'education' : 'platform';
  document.body.dataset.menuPathway = pathway;
  document.querySelectorAll('.header-pathways a[href^="#"]').forEach(link => {
    const active = link.hash.slice(1) === (pathway === 'education' ? 'pathways' : 'explore');
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('#main-nav a[href^="#"]').forEach(link => {
    if (link.hash.slice(1) === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function announceNavigationState(open) {
  document.body.toggleAttribute('data-navigation-open', open);
  window.dispatchEvent(new CustomEvent('nourishland:navigation-state', { detail: { open } }));
}

function closeMenu({ restoreFocus = false } = {}) {
  if (!menuOpen) return;
  menuOpen = false;
  navigation.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open menu');
  menuButton.title = 'Open menu';
  document.body.removeAttribute('data-menu-open');
  announceNavigationState(false);
  pageRegions.forEach(region => { region.inert = originalInertState.get(region); });
  if (restoreFocus) menuButton.focus();
}

function openMenu() {
  if (menuOpen) return;
  menuOpen = true;
  navigation.classList.add('is-open');
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Close menu');
  menuButton.title = 'Close menu';
  document.body.setAttribute('data-menu-open', 'true');
  announceNavigationState(true);
  pageRegions.forEach(region => { region.inert = true; });
  requestAnimationFrame(() => focusableInMenu()[0]?.focus());
}

function focusableInMenu() {
  return [...navigation.querySelectorAll('a[href]')]
    .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
}

menuButton.addEventListener('click', () => menuOpen ? closeMenu({ restoreFocus: true }) : openMenu());
document.querySelector('.header-pathways')?.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const links = [...event.currentTarget.querySelectorAll('a[href]')];
  const current = Math.max(0, links.indexOf(document.activeElement));
  const step = event.key === 'ArrowRight' ? 1 : -1;
  links[(current + step + links.length) % links.length]?.focus();
  event.preventDefault();
});
navigation.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link) return;
  if (link.hash.slice(1) === currentRoute()) closeMenu({ restoreFocus: true });
});
navigation.addEventListener('keydown', event => {
  if (!menuOpen || event.key !== 'Tab') return;
  const focusables = focusableInMenu();
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables.at(-1);
  if (event.shiftKey && (document.activeElement === first || !navigation.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !navigation.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuOpen) {
    closeMenu({ restoreFocus: true });
    event.preventDefault();
  }
});
document.addEventListener('pointerdown', event => {
  if (menuOpen && !navigation.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
});
window.addEventListener('hashchange', () => {
  syncPathwayMenu();
  closeMenu({ restoreFocus: true });
});
syncPathwayMenu();
