const diagram = document.querySelector('[data-forest-system]');
if (diagram) {
  const buttons = [...diagram.querySelectorAll('[data-system-topic]')];
  const title = diagram.querySelector('figcaption [data-system-title]');
  const copy = diagram.querySelector('figcaption [data-system-copy]');
  function select(button) {
    buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    title.textContent = button.dataset.systemTitle;
    copy.textContent = button.dataset.systemCopy;
  }
  buttons.forEach(button => {
    button.addEventListener('click', () => select(button));
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') select(button); });
    button.addEventListener('focus', () => select(button));
  });
}

document.querySelectorAll('[data-play-hillyards]').forEach(button => {
  const video = button.previousElementSibling;
  button.addEventListener('click', () => {
    video.src = video.dataset.videoSrc;
    video.hidden = false;
    button.hidden = true;
    video.focus();
    video.play().catch(() => {});
  }, {once:true});
});
window.addEventListener('nourishland:route', event => {
  if (event.detail.page !== 'hillyards') document.querySelectorAll('[data-hillyards-video]').forEach(video => video.pause());
});
