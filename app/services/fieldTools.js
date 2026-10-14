import { dashboardIcon } from './workspaceIcons.js';
const html = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const FIELD_PREVIEW_TOOLS = Object.freeze([
    {id:'compass',icon:'explore',title:'Compass',description:'Find your bearing. Sensor support and calibration will be added later.'},
    {id:'measure',icon:'ruler',title:'Tape measure',description:'Record reference distances. Camera measurement and accuracy validation will be added later.'},
    {id:'identify',icon:'plant',title:'Plant identifier',description:'Collect a plant photo and review possible matches. Camera capture and identification are not connected yet.'}
]);
export function fieldToolsMarkup(selected = '') {
    const tool=FIELD_PREVIEW_TOOLS.find(item=>item.id===selected);
    if(tool)return `<section class="field-tool-detail"><p class="field-eyebrow">HANDY TOOLS  /  PREVIEW</p><h1>${html(tool.title)}</h1><div class="field-preview-visual" aria-hidden="true">${dashboardIcon(tool.icon)}</div><p>${html(tool.description)}</p><p class="field-preview-label" role="status">Preview only  /  no live sensor, measurement or identification result.</p><button type="button" class="field-submenu-card" data-preview-tool="">${dashboardIcon('arrow')}All handy tools</button></section>`;
    return `<section class="field-submenu"><p class="field-eyebrow">YOUR FIELD KIT</p><h1>Handy tools</h1><p>Explore the tools we are preparing for your field work.</p><div class="field-submenu-grid">${FIELD_PREVIEW_TOOLS.map(item=>`<button type="button" class="field-submenu-card" data-preview-tool="${item.id}">${dashboardIcon(item.icon)}<span><strong>${html(item.title)}</strong><small>Preview</small></span>${dashboardIcon('arrow')}</button>`).join('')}</div></section>`;
}
export function fieldDashboardMarkup({projectName='',journalCount=0,checklistCount=0,storageError=''}={}) {
    return `<section class="field-submenu"><p class="field-eyebrow">AT A GLANCE</p><h1>Your dashboard</h1><p>${projectName?`Working with ${html(projectName)}`:'Choose a place in Discover, or start with your personal field notes.'}</p>${storageError?`<p role="status">${html(storageError)}</p>`:''}<div class="field-submenu-grid">${[
        ['discover','explore','Discover','Published places and plant knowledge'],['journal','note','Journal',`${journalCount} local observations`],['checklists','checklist','Checklists',`${checklistCount} personal checklists`],['tools','tools','Handy tools','Compass, tape measure and plant identifier previews']
    ].map(([view,icon,title,detail])=>`<button type="button" class="field-submenu-card" data-view="${view}">${dashboardIcon(icon)}<span><strong>${title}</strong><small>${detail}</small></span>${dashboardIcon('arrow')}</button>`).join('')}</div><p class="field-dashboard-note">Personal notes and checklist progress stay on this device. Published project content comes from the shared Nourishland service.</p></section>`;
}