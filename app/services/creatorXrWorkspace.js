import { escapeWorkspaceHtml as html } from './creatorWorkspaceFrame.js';
import { creatorHubTools, creatorAccessCapabilities } from './creatorHub.js';
import { dashboardIcon as icon } from './workspaceIcons.js';
import { creatorLogoMarkup } from './creatorIdentity.js';
import { ensureCreatorInterfaceStyles } from './creatorInterface.js';
import { BUILD_INFO } from './buildInfo.js';

export const CREATOR_XR_SURFACE = Object.freeze({ width:960, height:740, metresWide:1.12, metresHigh:.864, distance:1.25 });
const titles = {hub:'Creator',records:'Areas & objects',content:'PIMOs & content',paths:'Discovery Paths','map-tools':'Map','preview-tools':'Preview','project-tools':'Project',leave:'Open screen editor?'};
const glassKey = 'nlxr.creator-xr-glass.v1';
const clampGlass = value => Math.max(.16, Math.min(.72, Number(value) || .28));

export function mountCreatorXrWorkspace(root, options) {
    if(creatorAccessCapabilities().kind==='phone')return null;
    const {projectId='',siteId='',projectName,areaName,getRecords,onInspect,onPlace,onKnowledge,onClose,onOpenTool,onAction=()=>{},onRecenter=()=>{}} = options;
    ensureCreatorInterfaceStyles();
    if (!document.querySelector('[data-creator-xr-panel]')) {
        const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(`../creator-xr-panel.css?v=${BUILD_INFO.version}`,import.meta.url).href;link.dataset.creatorXrPanel='';document.head.append(link);
    }
    const abort=new AbortController();let view='hub',page=0,busy=false,dirty=false,destroyed=false,child=null,generation=0,leavingTool='';
    let glass=.28;try {glass=clampGlass(localStorage.getItem(glassKey));} catch {}
    const records=()=>getRecords().filter(record=>record.marker.status!=='archived');
    const control=(action,symbol,label)=>`<button type="button" class="xr-icon" data-xr-action="${action}" aria-label="${html(label)}" title="${html(label)}" data-xr-hint="${html(label)}">${icon(symbol)}</button>`;
    const action=(id,symbol,label,detail='')=>`<button type="button" class="xr-action" data-xr-command="${id}" data-xr-hint="${html(detail||label)}">${icon(symbol)}<span><strong>${html(label)}</strong>${detail?`<small>${html(detail)}</small>`:''}</span>${icon('next')}</button>`;
    const screenLink=()=>onOpenTool?`<button class="xr-screen-link" type="button" data-xr-screen="${view}">${icon('monitor')}Open screen editor</button>`:'';
    const status=text=>{const node=root.querySelector('[data-xr-status]');if(node)node.textContent=text;};
    function canLeave() {if(busy||dirty||child?.canLeave?.()===false){status(busy?'Wait for the current operation.':'Save or discard path edits before leaving.');return false;}return true;}
    function disposeChild() {generation++;child?.destroy();child=null;dirty=false;}
    function render() {
        if(destroyed)return;
        disposeChild();
        root.innerHTML=`<section class="creator-xr-worklist creator-game-xr creator-xr-panel" data-xr-view="${view}" style="--creator-xr-glass:${glass}">
          <header class="xr-panel-header"><div class="xr-hub-brand">${creatorLogoMarkup()}<div><small>NOURISHLAND</small><h1>${titles[view]||'Creator'}</h1></div></div><nav aria-label="Panel controls">${view!=='hub'?control('back','back','Back to Creator'):''}${control('recenter','pin','Bring panel in front of me')}${control('settings','settings','Control Panel settings')}${control('close','close','Close Creator panel')}</nav></header>
          <div class="xr-panel-context">${icon('pin')}<span>${html(projectName)}${areaName?' / '+html(areaName):''}</span><span class="xr-session-state">XR · Active</span></div>
          <main class="xr-panel-content" data-xr-content data-spatial-scroll></main>
          <footer class="xr-panel-footer"><p role="status" aria-live="polite" data-xr-status>Choose a tool. Your XR session stays open.</p><label class="xr-glass-control">Glass<span class="xr-glass-range" style="--glass-level:${(glass-.16)/.56*100}%"><i aria-hidden="true"></i><b aria-hidden="true"></b><input type="range" data-spatial-mirror-ignore data-xr-glass min="0.16" max="0.72" step="0.04" value="${glass}" aria-label="Creator panel glass opacity"></span><output data-xr-glass-value>${Math.round(glass*100)}%</output></label></footer></section>`;
        const host=root.querySelector('[data-xr-content]');
        if(view==='hub') {
            const captions={records:'Place & organise',content:'Read & connect knowledge',paths:'Create a guided walk','map-tools':'Mark areas & lines','preview-tools':'Inspect the experience','project-tools':'Project & device tools'};
            host.innerHTML=`<div class="xr-hub-tools">${creatorHubTools({kind:'headset'}).map(tool=>`<button type="button" data-xr-tool="${tool.id}" data-hub-tool="${tool.id}"${tool.id==='records'?' data-hub-records':''} data-xr-hint="${html(captions[tool.id])}"><span class="xr-tool-symbol">${icon(tool.icon)}</span><span><strong>${html(tool.title)}</strong><small>${captions[tool.id]}</small></span>${icon('next')}</button>`).join('')}</div>`;
        } else if(view==='records'||view==='content') {
            const entries=records().filter(record=>view==='records'||record.marker.type==='plant');
            page=Math.min(page,Math.max(0,Math.ceil(entries.length/4)-1));
            host.innerHTML=(view==='records'?`<div class="xr-quick-tools">${action('plant','plant','Orb')}${action('note','note','Note')}${action('totem','totem','Totem tools')}</div>`:'<p class="xr-pane-intro">Choose a plant to open its spatial knowledge workspace.</p>')+
              `<div class="xr-element-list">${entries.slice(page*4,page*4+4).map(record=>`<article class="xr-element-row"><button type="button" data-inspect="${html(record.marker.id)}" data-xr-hint="${html(record.marker.name)}">${icon(record.marker.type==='plant'?'plant':record.marker.type==='note'?'note':'totem')}<span><strong>${html(record.marker.name)}</strong><small>${html(record.areaName||areaName||'Current Area')}</small></span></button>${view==='records'?`<button type="button" data-place="${html(record.marker.id)}">Place</button>`:''}${record.marker.type==='plant'?`<button type="button" data-knowledge="${html(record.marker.id)}">${view==='content'?'Open PIMO':'Read'}</button>`:''}</article>`).join('')||'<p class="xr-empty">No matching elements in this Area.</p>'}</div><div class="xr-list-pages"><button type="button" class="xr-icon" data-page="-1" aria-label="Previous page" title="Previous page"${page===0?' disabled':''}>${icon('previous')}</button><span>${page+1} / ${Math.max(1,Math.ceil(entries.length/4))}</span><button type="button" class="xr-icon" data-page="1" aria-label="Next page" title="Next page"${(page+1)*4>=entries.length?' disabled':''}>${icon('next')}</button>${screenLink()}</div>`;
        } else if(view==='paths') {
            host.innerHTML='<p class="xr-pane-intro">Add linked stops, questions and observations. Save a draft, then preview the walk.</p><div data-xr-path-editor></div>';
            const token=generation;
            void (async()=>{
                try {
                    if(!projectId)throw Error('Open a saved project to create a path.');
                    const [{loadCreatorWorkspace},{mountCreatorTourStudio}]=await Promise.all([import('./creatorWorkspaceData.js'),import('./creatorTourStudio.js')]);
                    const model=await loadCreatorWorkspace(projectId);
                    if(destroyed||token!==generation)return;
                    const mounted=await mountCreatorTourStudio(host.querySelector('[data-xr-path-editor]'),{model,siteId:siteId||model.sites[0]?.id||'',spatial:true,onDirty:value=>{dirty=value;if(!value)status('Path ready. Preview it or return to Creator.');}});
                    if(destroyed||token!==generation)mounted.destroy();else child=mounted;
                }catch(error){if(!destroyed&&token===generation)status(`Paths could not open: ${error.message}`);}
            })();
        } else if(view==='map-tools') {
            host.innerHTML=`<p class="xr-pane-intro">Select a placed Orb in the scene, then mark the area or line it represents.</p><div class="xr-action-grid">${action('map-area','area','Map an area','Outline a clump, bed or collection.')}${action('map-line','ruler','Map a line','Trace a row, edge or connection.')}${action('totem','totem','Totem links','Open the existing Totem tools.')}${action('inspect','explore','Select an element','Inspect before marking.')}</div>${screenLink()}`;
        } else if(view==='preview-tools') {
            host.innerHTML=`<div class="xr-action-grid">${action('inspect','explore','Inspect the scene','Return to the immersive view.')}${action('knowledge','webhub','Plant knowledge','Open the selected plant workspace.')}${action('limo','plant','Project learning','Open this project’s learning experience.')}<button type="button" class="xr-action" data-xr-tool="paths">${icon('checklist')}<span><strong>Preview a path</strong><small>Use a saved draft and its real features.</small></span>${icon('next')}</button></div>`;
        } else if(view==='project-tools') {
            host.innerHTML=`<div class="xr-project-card"><p>PROJECT</p><h2>${html(projectName)}</h2><p>${html(areaName||'Current Area')} · ${records().length} active elements</p></div><div class="xr-action-grid">${action('settings','settings','Control Panel settings','Glass, graphics and device controls.')}${action('quick-start','help','Creator quick start','Practise Orb, Note and Totem placement.')}</div><p class="xr-pane-intro">Project setup, publishing and file uploads remain in the screen editor.</p>${screenLink()}`;
        } else if(view==='leave') {
            host.innerHTML=`<div class="xr-leave-card"><h2>Continue on screen?</h2><p>This closes the immersive session through its saved-exit flow and opens the ${html(titles[leavingTool]||'project')} editor.</p><div class="xr-quick-tools"><button type="button" data-xr-action="stay">Stay in XR</button><button type="button" data-xr-action="leave">Open screen editor</button></div></div>`;
        }
    }
    function navigate(next) {if(!canLeave())return;page=0;view=next;render();}
    async function run(callback) {if(!canLeave())return;busy=true;try{await callback();}catch(error){status(error.message);}finally{busy=false;}}
    root.addEventListener('click',event=>{
        const button=event.target.closest('button');if(!button||button.disabled)return;
        const tool=button.dataset.xrTool;
        if(tool){navigate(tool);return;}
        if(button.dataset.xrScreen){if(canLeave()){leavingTool=button.dataset.xrScreen;view='leave';render();}return;}
        const command=button.dataset.xrCommand;
        if(command){void run(()=>onAction(command));return;}
        const actionId=button.dataset.xrAction;
        if(actionId==='back'){navigate('hub');return;}
        if(actionId==='stay'){navigate(leavingTool||'hub');return;}
        if(actionId==='recenter'){onRecenter();status('Panel moved in front of you.');return;}
        if(actionId==='settings'){void run(()=>onAction('settings'));return;}
        if(actionId==='close'){if(canLeave())onClose();return;}
        if(actionId==='leave'){void run(()=>onOpenTool?.(leavingTool));return;}
        if(button.dataset.page){page+=Number(button.dataset.page);render();return;}
        const id=button.dataset.inspect||button.dataset.place||button.dataset.knowledge;
        if(!id)return;
        const record=records().find(record=>record.marker.id===id);if(!record)return;
        void run(()=>button.dataset.knowledge?onKnowledge(record):button.dataset.place?onPlace(record):view==='content'?onKnowledge(record):onInspect(record));
    },{signal:abort.signal});
    const hint=event=>{const target=event.target.closest('[data-xr-hint]');if(target&&!dirty&&!busy)status(target.dataset.xrHint);};
    root.addEventListener('focusin',hint,{signal:abort.signal});root.addEventListener('pointerover',hint,{signal:abort.signal});
    root.addEventListener('input',event=>{
        if(!event.target.matches('[data-xr-glass]'))return;
        glass=clampGlass(event.target.value);root.firstElementChild.style.setProperty('--creator-xr-glass',String(glass));root.querySelector('[data-xr-glass-value]').textContent=Math.round(glass*100)+'%';
        root.querySelector('.xr-glass-range').style.setProperty('--glass-level',((glass-.16)/.56*100)+'%');
        try{localStorage.setItem(glassKey,String(glass));}catch{}
    },{signal:abort.signal});
    render();return {get view(){return view;},canLeave,
        contextActions(){if(view!=='paths'||!root.querySelector('[data-tour-field]'))return [];const disabled=selector=>!root.querySelector(selector)||root.querySelector(selector).matches(':disabled');return [{id:'path-save',label:'Save path draft',icon:'check',disabled:disabled('[data-tour-save]')},{id:'path-preview',label:'Preview path',icon:'play',disabled:disabled('[data-tour-preview]')},{id:'path-discard',label:'Discard path edits',icon:'undo',disabled:disabled('[data-tour-discard]')}];},
        activateContext(id){const selector={'path-save':'[data-tour-save]','path-preview':'[data-tour-preview]','path-discard':'[data-tour-discard]'}[id];const button=selector&&root.querySelector(selector);if(button&&!button.matches(':disabled')){button.click();return true;}return false;},
        destroy(){destroyed=true;disposeChild();abort.abort();}};
}
