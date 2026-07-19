let dot, label, active, refreshTimer, activateTarget;

function findTarget() {
    const elements = document.elementsFromPoint(innerWidth / 2, innerHeight / 2);
    return elements.find(element => element !== dot && element !== label)
        ?.closest?.('[data-target-marker]') || null;
}

function update() {
    if (!dot) return;
    const next = findTarget();
    if (active && active !== next) active.classList.remove('reticle-targeted');
    active = next;
    dot.classList.toggle('reticle-active', Boolean(active));
    label.textContent = active?.dataset.targetMarker || '';
    label.hidden = !active;
    if (active) active.classList.add('reticle-targeted');
}

function activate(event) {
    if (!active || event.target.closest?.('button, a, input, select, textarea')) return;
    event.preventDefault();
    if (activateTarget) activateTarget(active);
    else active.querySelector('button')?.click();
}

export function enableTargetReticle(options = {}) {
    activateTarget = options.onActivate || null;
    if (dot) return update();
    dot = document.createElement('div');
    dot.id = 'targetReticle';
    dot.setAttribute('aria-hidden', 'true');
    label = document.createElement('div');
    label.id = 'targetReticleLabel';
    label.setAttribute('aria-live', 'polite');
    label.hidden = true;
    document.body.append(dot, label);
    addEventListener('scroll', update, true);
    addEventListener('resize', update);
    addEventListener('pointermove', update, true);
    document.addEventListener('click', activate, true);
    refreshTimer = window.setInterval(update, 150);
    update();
}

export function disableTargetReticle() {
    if (!dot) return;
    active?.classList.remove('reticle-targeted');
    dot.remove();
    label.remove();
    dot = label = active = activateTarget = null;
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = null;
    removeEventListener('scroll', update, true);
    removeEventListener('resize', update);
    removeEventListener('pointermove', update, true);
    document.removeEventListener('click', activate, true);
}