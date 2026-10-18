import { LOCKED_VIEW, LANDING_VIEW } from './biome-interaction.js';

const degrees = radians => Math.round(radians * 180 / Math.PI * 10) / 10;
const defaults = { pitch: degrees(LOCKED_VIEW.pitch), yaw: degrees(LOCKED_VIEW.yaw), roll: degrees(LOCKED_VIEW.roll) };
const normalized = value => Math.round((((value + 180) % 360 + 360) % 360 - 180) * 10) / 10;

export function mountWheelAdjustment(hero) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = new URL('./wheel-adjustment.css', import.meta.url).href;
  document.head.append(stylesheet);
  const panel = document.createElement('details');
  panel.className = 'wheel-adjustment';
  panel.open = true;
  panel.innerHTML = `
    <summary>Wheel angle <span>360°</span></summary>
    <div class="wheel-adjustment-body">
      <p>Choose the landing angle. The opening stays centered.</p>
      ${[['pitch','Tilt · X'],['yaw','Turn · Y'],['roll','Roll · Z']].map(([key,label]) => `
        <div class="wheel-angle-row">
          <label for="adjust-${key}">${label}</label>
          <input id="adjust-${key}" data-angle="${key}" type="range" min="-180" max="180" step="0.1" aria-label="${label}, degrees">
          <input data-number="${key}" type="number" min="-180" max="180" step="0.1" aria-label="${label}, exact degrees"><span aria-hidden="true">°</span>
        </div>`).join('')}
      <label class="wheel-guide"><input type="checkbox" data-center-guide checked> Show center guide</label>
      <div class="wheel-adjustment-actions">
        <button type="button" data-lock-angle aria-pressed="false">Lock this angle</button>
        <button type="button" class="wheel-adjustment-icon" data-reset-angle aria-label="Reset landing angle" title="Reset landing angle">↺</button>
        <button type="button" class="wheel-adjustment-icon" data-copy-angle aria-label="Copy angle settings" title="Copy angle settings">⧉</button>
      </div>
      <label class="wheel-copy-label">Copy these settings back to Johnny<textarea data-angle-settings readonly rows="3" spellcheck="false" aria-label="Current wheel angle settings"></textarea></label>
      <label class="wheel-copy-label">Link to reopen this view<input data-angle-link readonly aria-label="Link to this wheel angle"></label>
      <p class="wheel-adjustment-status" role="status" data-angle-status>Preview tool only. The normal landing stays locked.</p>
    </div>`;
  const guide = document.createElement('span');
  guide.className = 'wheel-center-guide';
  guide.setAttribute('aria-hidden', 'true');
  hero.element.append(guide, panel);
  const controls = [...panel.querySelectorAll('[data-angle], [data-number]')];
  const lockButton = panel.querySelector('[data-lock-angle]');
  const status = panel.querySelector('[data-angle-status]');
  let current = { ...defaults };
  let locked = false;

  function sync(orientation) {
    current = Object.fromEntries(Object.entries(orientation).map(([key,value]) => [key,normalized(value)]));
    for (const control of controls) {
      if (control !== document.activeElement) control.value = current[control.dataset.angle || control.dataset.number];
    }
    const settings = { pitch: current.pitch, yaw: current.yaw, roll: current.roll, depth: hero.depth + 1, center: 'locked' };
    panel.querySelector('[data-angle-settings]').value = JSON.stringify(settings, null, 2);
    const link = new URL(location.href);
    link.searchParams.set('wheelAdjust', '1');
    for (const key of ['pitch','yaw','roll']) link.searchParams.set(`wheel${key}`, current[key]);
    link.searchParams.set('wheelLocked', locked ? '1' : '0');
    link.searchParams.set('wheelDepth', String(hero.depth + 1));
    link.hash = '';
    panel.querySelector('[data-angle-link]').value = link.href;
  }

  function lock(value) {
    locked = value;
    hero.setAngleLocked(value);
    controls.forEach(control => { control.disabled = value || !hero.ready; });
    lockButton.setAttribute('aria-pressed', String(value));
    lockButton.textContent = value ? 'Unlock angle' : 'Lock this angle';
    sync(current);
  }

  for (const control of controls) control.addEventListener('input', () => {
    if (locked || !control.checkValidity() || control.value === '') return;
    const key = control.dataset.angle || control.dataset.number;
    current[key] = Number(control.value);
    hero.setOrientation(current);
    sync(current);
  });
  hero.element.parentElement.addEventListener('biome-orientation-change', event => sync(event.detail));
  hero.element.parentElement.addEventListener('biome-depth-change', () => sync(current));
  lockButton.addEventListener('click', () => {
    lock(!locked);
    status.textContent = locked ? 'Angle locked. Copy the settings or the view link.' : 'Angle unlocked for adjustment.';
  });
  panel.querySelector('[data-reset-angle]').addEventListener('click', () => {
    lock(false);
    hero.setOrientation(defaults);
    hero.setDepth(LANDING_VIEW.depth);
    sync(defaults);
    status.textContent = 'Returned to the current landing angle.';
  });
  panel.querySelector('[data-center-guide]').addEventListener('change', event => { guide.hidden = !event.target.checked; });
  panel.querySelector('[data-copy-angle]').addEventListener('click', async () => {
    const field = panel.querySelector('[data-angle-settings]');
    try {
      await navigator.clipboard.writeText(`${field.value}\n\n${panel.querySelector('[data-angle-link]').value}`);
      status.textContent = 'Copied. Paste the settings into our chat.';
    } catch {
      field.focus(); field.select();
      status.textContent = 'Settings selected. Press Ctrl+C to copy.';
    }
  });
  const params = new URLSearchParams(location.search);
  for (const key of ['pitch','yaw','roll']) {
    const raw = params.get(`wheel${key}`);
    if (raw !== null && raw.trim() && Number.isFinite(Number(raw))) current[key] = normalized(Number(raw));
  }
  hero.setOrientation(current);
  const requestedDepth = Number(params.get('wheelDepth'));
  if (Number.isInteger(requestedDepth) && requestedDepth >= 1 && requestedDepth <= 5) hero.setDepth(requestedDepth - 1);
  sync(current);
  lock(params.get('wheelLocked') === '1');
  if (!hero.ready) {
    panel.querySelectorAll('button,input').forEach(control => { control.disabled = true; });
    guide.hidden = true;
    status.textContent = 'The 3D model is unavailable. Angle adjustment requires the interactive view.';
  }
}
