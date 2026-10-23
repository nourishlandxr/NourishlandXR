const story = document.querySelector('#food-forest-story');
if (story) {
  const tabs = [...story.querySelectorAll('[data-story-tab]')];
  const chapters = [...story.querySelectorAll('[role="tabpanel"]')];
  const previous = story.querySelector('[data-story-step="-1"]');
  const next = story.querySelector('[data-story-step="1"]');
  // On the main website, the idea belongs beside the rectangular photograph.
  // Keep the earlier portrait reveal on the independent V2 preview.
  const besidePortrait = document.documentElement.hasAttribute('data-experience-site');
  chapters.forEach((chapter, index) => {
    const portrait = chapter.querySelector('figure');
    const paragraph = chapter.querySelector('.story-chapter-copy > p:not(.eyebrow):not(.story-person)');
    const overlay = besidePortrait ? paragraph : document.createElement('figcaption');
    overlay.id = `story-portrait-idea-${index}`;
    if (besidePortrait) {
      overlay.classList.add('story-key-idea');
      const highlight = value => { chapter.dataset.ideaHighlighted = String(value); };
      portrait.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') highlight(true); });
      portrait.addEventListener('pointerleave', () => highlight(false));
      chapter.addEventListener('focusin', () => highlight(true));
      chapter.addEventListener('focusout', event => { if (!chapter.contains(event.relatedTarget)) highlight(false); });
      return;
    } else {
      overlay.className = 'story-portrait-idea';
      overlay.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = 'Key idea';
      const copy = document.createElement('p');
      copy.textContent = paragraph.textContent;
      overlay.append(label, copy);
      portrait.append(overlay);
    }
    const toggle = document.createElement('button');
    toggle.className = 'icon-button story-portrait-toggle';
    toggle.type = 'button';
    toggle.textContent = 'i';
    toggle.setAttribute('aria-label', `Show key idea for ${chapter.querySelector('.story-person').textContent}`);
    toggle.title = 'Show key idea';
    toggle.setAttribute('aria-controls', overlay.id);
    toggle.setAttribute('aria-expanded', 'false');
    portrait.append(toggle);
    let pinned = false, hovering = false;
    const update = () => {
      const open = pinned || hovering;
      portrait.dataset.revealed = String(open);
      chapter.dataset.ideaHighlighted = String(open);
      overlay.setAttribute('aria-hidden', String(!open));
      toggle.setAttribute('aria-expanded', String(open));
    };
    portrait.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; update(); } });
    portrait.addEventListener('pointerleave', () => { hovering = false; update(); });
    toggle.addEventListener('click', () => { pinned = !pinned; update(); });
    toggle.addEventListener('keydown', event => { if (event.key === 'Escape') { pinned = false; hovering = false; update(); } });
  });
  let current = 0;
  function fitPortrait() {
    if (!besidePortrait || story.hidden) return;
    const chapter = chapters[current], space = chapter.querySelector('.story-picture-space');
    if (!space) return;
    const picture = space.querySelector('figure'), image = picture.querySelector('img');
    const ratio = image.naturalWidth ? image.naturalWidth / image.naturalHeight : 1.5;
    const width = Math.min(space.clientWidth, space.clientHeight * ratio);
    Object.assign(picture.style, {width: width + 'px', height: width / ratio + 'px'});
  }
  function warmPortraits() {
    if (story.hidden) return;
    for (const index of [current, (current + 1) % chapters.length]) {
      const image = chapters[index].querySelector('img');
      image.loading = 'eager';
      image.decoding = 'async';
      image.decode().then(fitPortrait).catch(() => {});
    }
  }
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
    warmPortraits();
    requestAnimationFrame(fitPortrait);
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
  warmPortraits();
  window.addEventListener('nourishland:route', event => {
    if (event.detail.page === 'food-forest-story') { warmPortraits(); requestAnimationFrame(fitPortrait); }
  });
  if (besidePortrait) new ResizeObserver(fitPortrait).observe(story.querySelector('.story-reader'));
}
