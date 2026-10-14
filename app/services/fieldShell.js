import { dashboardIcon } from './workspaceIcons.js';
const html = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const control = (action, icon, label) => `<button type="button" class="icon-control" data-action="${action}" aria-label="${label}" title="${label}">${dashboardIcon(icon)}</button>`;
export function fieldShellMarkup({ version, target }) {
    return `<div class="platform-shell field-app-shell"><header class="field-app-bar"><button type="button" class="field-brand" data-view="home" aria-label="Field home"><img src="icon.svg" alt="" width="30" height="30"><span>nourishland<small>FIELD</small></span></button><span class="field-connection" data-field-connection>Online</span>${control('settings','settings','App settings')}</header>
<main class="field-app-main"><div class="platform-context">${control('back','arrow','Back')}<p data-context></p>${control('refresh','refresh','Refresh content')}</div><p class="platform-status" role="status" aria-live="polite" data-status></p><div data-content></div></main>
<nav class="field-dock" aria-label="Field dock">${[['home','grid','Home'],['discover','explore','Discover'],['checklists','checklist','Checklists'],['journal','note','Journal']].map(([view,icon,label])=>`<button type="button" data-view="${view}" aria-label="${label}" title="${label}">${dashboardIcon(icon)}<span>${label}</span></button>`).join('')}</nav>
<dialog class="field-settings" data-field-settings aria-labelledby="field-settings-title"><div class="field-settings-heading"><h2 id="field-settings-title">App settings</h2>${control('close-settings','close','Close settings')}</div><p class="welcome-version-badge">V${html(version)} · ${target==='production'?'Live':'Local preview'}</p><h3>Keep Field on your home screen</h3><p>Use your browser’s Install app or Add to home screen action. Open the installed Field icon for the standalone app view.</p><h3>Your device, your notes</h3><p>Journal drafts and checklist progress stay on this device. Export files before clearing browser storage.</p><div data-field-update></div></dialog></div>`;
}
export function fieldLauncherMarkup({ studioUrl, contentUrl, xrUrl }) {
    const tools=[
        {view:'dashboard',icon:'grid',label:'Dashboard',tone:'mint'},
        {view:'discover',icon:'explore',label:'Discover',tone:'sage'},
        {view:'tools',icon:'tools',label:'Handy tools',tone:'sky'},
        {view:'checklists',icon:'checklist',label:'Checklists',tone:'honey'},
        {view:'journal',icon:'note',label:'Journal',tone:'clay'},
        {href:xrUrl,icon:'ar',label:'WebXR',tone:'lavender'},
        {href:studioUrl,icon:'grid',label:'Studio',tone:'sky'},
        {href:contentUrl,icon:'webhub',label:'Content',tone:'mint'}
    ];
    return `<section class="field-launcher" aria-label="Field home"><div class="field-launcher-intro"><p class="field-eyebrow">YOUR FIELD COMPANION</p><h1>A closer look.<br>A world to discover.</h1><p>Choose a tool. Follow your curiosity.</p></div><div class="field-tool-grid" aria-label="Field tools">${tools.map(tool=>{
        const inner=`<span class="field-tool-icon field-tone-${tool.tone}">${dashboardIcon(tool.icon)}</span><span class="field-tool-name">${tool.label}</span>`;
        return tool.view?`<button type="button" class="field-tool" data-view="${tool.view}" aria-label="Open ${tool.label}" title="Open ${tool.label}">${inner}</button>`:`<a class="field-tool" href="${html(tool.href)}" aria-label="Open ${tool.label} separately" title="Open ${tool.label} separately">${inner}<span class="field-external-mark" aria-hidden="true">↗</span></a>`;
    }).join('')}</div><div class="field-home-note">${dashboardIcon('plant')}<p>Notice something?<br><strong>Keep it in your journal.</strong></p><button type="button" class="icon-control" data-view="journal" aria-label="Write an observation" title="Write an observation">${dashboardIcon('arrow')}</button></div><p class="field-launcher-footnote">A little screen time. More time in the landscape.</p></section>`;
}
