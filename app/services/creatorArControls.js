const icons = {
 add:'M12 5v14M5 12h14', inspect:'M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5M9 12h6m-3-3v6',
 more:'M4 12h2m5 0h2m5 0h2', exit:'M10 5H4v14h6m4-14 6 7-6 7m-6-7h12',
 plant:'M12 20V9m0 6C4 15 4 7 4 7c8 0 8 8 8 8Zm0-4s0-7 8-7c0 0 0 7-8 7Z',
 note:'M5 4h14v16H5Zm3 5h8m-8 4h8', totem:'M8 21V3h8v18M6 8h12M6 15h12',
 book:'M12 5v15M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z'
};
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]}"/></svg>`;
export function creatorArControlsMarkup() {
 return `<section class="creator-ar-action-palette" data-ar-add-menu hidden aria-label="Add to this place">
 <button type="button" data-quest-ar-action="plant" data-ar-add-plant aria-label="Add Plant">${icon('plant')}<span>Plant</span></button>
 <button type="button" data-quest-ar-action="note" data-ar-add-note aria-label="Add Note">${icon('note')}<span>Note</span></button>
 <button type="button" data-quest-ar-action="special" data-ar-add-special aria-label="Open Totem tools">${icon('totem')}<span>Totem tools</span></button></section>
 <section class="creator-ar-action-palette" data-ar-more-menu hidden aria-label="More AR tools">
 <button type="button" data-ar-view-mode aria-pressed="false">View plants</button>
 <button type="button" data-quest-ar-action="knowledge" data-ar-knowledge-open>${icon('book')}<span>Plant knowledge</span></button>
 <button type="button" data-quest-ar-action="web" data-ar-web-return>Project workspace</button></section>
 <section class="creator-ar-knowledge-context" data-ar-knowledge-context hidden aria-label="Selected plant knowledge"><span data-ar-knowledge-label></span><div>
 <button type="button" data-ar-read-branch>Read / all topics</button><button type="button" data-ar-observe>Add observation</button><button type="button" data-ar-close-knowledge>Close knowledge</button></div></section>
 <section class="creator-ar-placement-actions" data-ar-placement-actions hidden aria-label="Confirm placement"><span data-ar-placement-name></span><button type="button" data-ar-confirm-place>Place here</button><button type="button" data-ar-cancel-place>Cancel</button></section>
 <nav class="creator-ar-taskbar" aria-label="AR placement controls" data-creator-controls="3">
 <button type="button" data-ar-toggle-add aria-expanded="false">${icon('add')}<span>Add</span></button>
 <button type="button" data-ar-select-mode aria-label="Inspect or edit markers" aria-pressed="false">${icon('inspect')}<span>Inspect</span></button>
 <button type="button" data-ar-toggle-more aria-expanded="false">${icon('more')}<span>More</span></button>
 <button type="button" data-quest-ar-action="exit" data-ar-exit-session>${icon('exit')}<span>Exit AR</span></button></nav>`;
}

export function bindCreatorArControls(root, actions) {
 const hideMenus = () => {
   for(const kind of ['add','more']) { root.querySelector(`[data-ar-${kind}-menu]`).hidden = true; root.querySelector(`[data-ar-toggle-${kind}]`).setAttribute('aria-expanded','false'); }
 };
 for (const kind of ['add','more']) root.querySelector(`[data-ar-toggle-${kind}]`).addEventListener('click', () => {
   const menu=root.querySelector(`[data-ar-${kind}-menu]`), open=menu.hidden; hideMenus(); menu.hidden=!open;
   root.querySelector(`[data-ar-toggle-${kind}]`).setAttribute('aria-expanded',String(open));
 });
 for (const [selector, action] of Object.entries(actions)) {
   const button=root.querySelector(selector); if(!button) continue;
   button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();hideMenus();action();});
   // Native click handles touch, keyboard and controller .click() exactly once.
   button.addEventListener('pointerup',event=>event.stopPropagation());
 }
 root.addEventListener('keydown',event=> { if(event.key==='Escape') { hideMenus(); } });
 return {hideMenus};
}
