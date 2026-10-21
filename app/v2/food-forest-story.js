const story = document.querySelector('#food-forest-story');
if (story) {
  const tabs = [...story.querySelectorAll('[data-story-tab]')];
  const chapters = [...story.querySelectorAll('[role="tabpanel"]')];
  const previous = story.querySelector('[data-story-step="-1"]');
  const next = story.querySelector('[data-story-step="1"]');
  // Retain the original portrait reveal, with a deliberate toggle for touch and keyboard.
  chapters.forEach((chapter, index) => {
    const portrait = chapter.querySelector('figure');
    const overlay = document.createElement('figcaption');
    overlay.id = `story-portrait-idea-${index}`;
    overlay.className = 'story-portrait-idea';
    overlay.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.textContent = 'Key idea';
    const copy = document.createElement('p');
    copy.textContent = chapter.querySelector('.story-chapter-copy > p:not(.eyebrow)').textContent;
    overlay.append(label, copy);
    const toggle = document.createElement('button');
    toggle.className = 'icon-button story-portrait-toggle';
    toggle.type = 'button';
    toggle.textContent = 'i';
    toggle.setAttribute('aria-label', `Show key idea for ${chapter.querySelector('.story-person').textContent}`);
    toggle.title = 'Show key idea';
    toggle.setAttribute('aria-controls', overlay.id);
    toggle.setAttribute('aria-expanded', 'false');
    portrait.append(overlay, toggle);
    let pinned = false, hovering = false;
    const update = () => {
      const open = pinned || hovering;
      portrait.dataset.revealed = String(open);
      overlay.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
    };
    portrait.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; update(); } });
    portrait.addEventListener('pointerleave', () => { hovering = false; update(); });
    toggle.addEventListener('click', () => { pinned = !pinned; update(); });
    toggle.addEventListener('keydown', event => { if (event.key === 'Escape') { pinned = false; hovering = false; update(); } });
  });
  let current = 0;
  function showChapter(index, focus = false) {
    current = Math.max(0, Math.min(index, chapters.length - 1));
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === current));
      tab.tabIndex = i === current ? 0 : -1;
      chapters[i].hidden = i !== current;
    });
    previous.disabled = current === 0;
    next.disabled = current === chapters.length - 1;
    story.querySelector('[data-story-count]').textContent = `${current + 1} / ${chapters.length}`;
    if (focus) tabs[current].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showChapter(index));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); showChapter(target, true); }
    });
  });
  previous.addEventListener('click', () => showChapter(current - 1, true));
  next.addEventListener('click', () => showChapter(current + 1, true));
}
