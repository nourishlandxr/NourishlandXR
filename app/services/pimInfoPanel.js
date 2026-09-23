import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';

export const INFO_HELP = 'Select a learning cell, or hold a plant cell to read its details here. Settings adjusts text size or recenters this panel. Hide clears your view; Control panel restores it.';

// This is a reading projection, never a second store of plant knowledge.
export function pimInfoContent(document, path) {
    const node = document?.nodes?.find(item => item.id === path || item.path === path);
    if (!node) return null;
    return { id: node.id, path: node.path, title: node.title,
        plant: document.identity?.commonName || document.identity?.scientificName || document.plantId,
        breadcrumb: [...pimAncestors(document, node.id).map(item => item.title), node.title].join(' › '),
        body: node.body || 'No detailed information has been added to this cell yet.',
        scope: pimKnowledgeScope(node), status: node.status, evidence: node.evidenceStatus,
        safety: node.safetyNote || '',
        sources: (node.sourceIds || []).map(id => document.sources?.find(source => source.id === id))
            .filter(Boolean).map(source => source.title || source.name || source.url || source.id) };
}

export function infoPages(text, columns = 48, rows = 10) {
    const lines = [];
    for (const paragraph of String(text || '').split('\n')) {
        let line = '';
        for (let word of paragraph.split(/\s+/).filter(Boolean)) {
            if (line && line.length + word.length + 1 > columns) { lines.push(line); line = ''; }
            while (word.length > columns) { lines.push(word.slice(0, columns)); word = word.slice(columns); }
            line += (line ? ' ' : '') + word;
        }
        lines.push(line);
    }
    const pages = [];
    for (let i = 0; i < lines.length; i += rows) pages.push(lines.slice(i, i + rows));
    return pages.length ? pages : [['']];
}

// A body-relative approximation: keep the initial heading while translating
// with the viewer. Following head yaw would move it away when looking left.
export function facePanelTowardEyes(center, eyes) {
    const dx=eyes.x-center.x,dy=eyes.y-center.y,dz=eyes.z-center.z;
    const length=Math.hypot(dx,dy,dz)||1;
    const normal={x:dx/length,y:dy/length,z:dz/length};
    const horizontal=Math.hypot(normal.x,normal.z);
    const right=horizontal>1e-6?{x:normal.z/horizontal,y:0,z:-normal.x/horizontal}:{x:1,y:0,z:0};
    const up={x:normal.y*right.z,y:normal.z*right.x-normal.x*right.z,z:-normal.y*right.x};
    return {right,up,normal};
}

export function infoPanelPose(matrix, heading = null, headset = false) {
    if (!matrix) return null;
    const length = Math.hypot(matrix[0], matrix[2]) || 1;
    const right = heading || { x: matrix[0] / length, y: 0, z: matrix[2] / length };
    // In a headset this is a true left-side companion: near the board's
    // reading height, laterally separated, and still inside easy controller
    // reach. Phone/Web mode keeps its lower compact position.
    const side=headset ? 1.28 : .64,forward=headset ? 1.14 : .58,drop=headset ? .02 : .70;
    const center={ x: matrix[12] - right.x * side + right.z * forward,
        y: matrix[13] - drop, z: matrix[14] - right.z * side - right.x * forward };
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
}

// Recover an accidentally lost reading position only when it has left the
// viewer's safe forward envelope. Selection, tab changes and re-renders keep
// the existing pose; this check is the boundary for the gentle automatic
// recovery allowed by the companion-panel contract.
export function panelPoseOutsideSafeBounds(matrix, panelPose) {
    if (!matrix || !panelPose?.center) return false;
    const forwardLength = Math.hypot(Number(matrix[8]) || 0, Number(matrix[10]) || 0) || 1;
    const rightLength = Math.hypot(Number(matrix[0]) || 0, Number(matrix[2]) || 0) || 1;
    const forward = {x:-(Number(matrix[8]) || 0) / forwardLength, z:-(Number(matrix[10]) || 0) / forwardLength};
    const right = {x:(Number(matrix[0]) || 0) / rightLength, z:(Number(matrix[2]) || 0) / rightLength};
    const dx=panelPose.center.x-(Number(matrix[12]) || 0);
    const dy=panelPose.center.y-(Number(matrix[13]) || 0);
    const dz=panelPose.center.z-(Number(matrix[14]) || 0);
    const forwardDistance=dx*forward.x+dz*forward.z;
    const lateralDistance=dx*right.x+dz*right.z;
    return forwardDistance < .16 || forwardDistance > 2.4 || Math.abs(lateralDistance) > 1.45 || Math.abs(dy) > 1.35;
}

// Keep the point under the user's ray fixed instead of snapping the panel's
// centre onto the ray when its off-centre move handle is grabbed.
export function panelCenterFromGrab(ray, grab, axes) {
    if (!ray?.origin || !ray.direction || !grab || !axes?.right || !axes?.up) return null;
    return {
        x:ray.origin.x+ray.direction.x*grab.distance-axes.right.x*grab.localX-axes.up.x*grab.localY,
        y:ray.origin.y+ray.direction.y*grab.distance-axes.right.y*grab.localX-axes.up.y*grab.localY,
        z:ray.origin.z+ray.direction.z*grab.distance-axes.right.z*grab.localX-axes.up.z*grab.localY
    };
}

// Shared rectangles are used by the spatial artwork and its ray hit testing.
export function controlPanelControls({hidden=false,tab='Details',selected=false,page=0,pageCount=1,height=680,largeText=false,contentKind='lim',pathwayActions=[],moduleActions=[],utilityActions=[]}={}) {
    if(hidden)return [{action:'Restore',label:'Control panel',x:30,y:36,width:940,height:70}];
    const utilities=utilityActions.slice(0,8),primary=utilities.find(item=>item.primary || item.id==='continue');
    const menuUtilities=utilities.filter(item=>['close','lim-visibility'].includes(item.id));
    const secondary=utilities.filter(item=>item!==primary && !menuUtilities.includes(item));
    const secondaryRows=Math.ceil(secondary.length/2),primaryHeight=primary?68:0,moduleRows=tab==='Modules'?moduleActions.length:0;
    const primaryY=height-22-primaryHeight,secondaryStart=primaryY-secondaryRows*62;
    const actionY=secondaryStart-moduleRows*58-62;
    const buttons=[{action:'Hide',label:'Hide',x:18,y:height-76,width:174,height:54}];
    ['Details','Modules','Help','Settings'].forEach((action,i)=>buttons.push({action,label:action==='Details'?(contentKind==='pim'?'Plant':'Selected topic'):action==='Modules'?'Guides':action,kind:'tab',selected:tab===action,x:18,y:148+i*68,width:174,height:56}));
    menuUtilities.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.id==='close'?'Close demo':item.label,kind:'menu',disabled:Boolean(item.disabled),x:18,y:428+index*62,width:174,height:54}));
    if(tab==='Details' && pageCount>1)buttons.push({action:'Previous',label:'‹',ariaLabel:'Previous page',kind:'pager',x:852,y:130,width:52,height:42,disabled:page===0},{action:'Next',label:'›',ariaLabel:'Next page',kind:'pager',x:918,y:130,width:52,height:42,disabled:page>=pageCount-1});
    if(tab==='Settings')buttons.push({action:'TextSize',label:largeText?'Standard text':'Larger text',x:238,y:actionY,width:350,height:48},{action:'Recenter',label:'Recenter panel',x:608,y:actionY,width:362,height:48});
    pathwayActions.slice(0,3).forEach((item,index)=>buttons.push({action:item.action,label:item.label,kind:'pathway',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238+index*244,y:actionY-62,width:226,height:48}));
    if(tab==='Modules')moduleActions.forEach((item,index)=>buttons.push({action:'Module:'+item.id,label:item.label,kind:'module',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238,y:actionY+index*58,width:732,height:48}));
    secondary.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.label,kind:'utility',disabled:Boolean(item.disabled),x:index%2?608:238,y:secondaryStart+Math.floor(index/2)*62,width:index%2?362:350,height:54}));
    if(primary)buttons.push({action:'Utility:'+primary.id,label:primary.label,kind:'utility',primary:true,disabled:Boolean(primary.disabled),x:238,y:primaryY,width:732,height:68});
    return buttons;
}
export function controlPanelHeight(lines,largeText=false,pathway=false,utilities=0,moduleCount=0){
    const items=Array.isArray(utilities)?utilities.slice(0,8):[],count=items.length || Math.min(8,Number(utilities)||0);
    const hasPrimary=items.some(item=>item.primary || item.id==='continue');
    const rows=Math.ceil((count-(hasPrimary?1:0))/2)+(hasPrimary?1:0);
    return Math.max(pathway?760:620,390+Math.min(7,lines)*(largeText?46:38)+(pathway?120:0))+(rows+moduleCount)*62+(hasPrimary?10:0);
}

// The headset uses the same actions as the screen panel, but lays them out in
// three independently collapsible regions. These rectangles also drive ray hits.
export function spatialPanelControls({hidden=false,height=800,railCollapsed=false,mediaCollapsed=true,items=[]}={}){
    if(hidden)return [{action:'Restore',label:'Control panel',x:30,y:36,width:940,height:70}];
    const rail=railCollapsed?62:200,media=mediaCollapsed?62:230;
    const left=rail+22,width=1000-rail-media-44;
    const button=(item,x,y,w,h)=>({...item,x,y,width:w,height:h});
    const result=[button({action:'MovePanel',label:'●',ariaLabel:'Grab and move Control panel',kind:'handle'},744,24,62,48),
        button({action:'Hide',label:'Hide'},824,24,140,48),
        button({action:'ToggleMenu',label:'●',ariaLabel:railCollapsed?'Open settings and sections':'Collapse settings and sections',kind:'toggle'},12,128,rail-24,50),
        button({action:'ToggleMedia',label:'●',ariaLabel:mediaCollapsed?'Open plant media':'Collapse plant media',kind:'toggle'},1000-media+8,128,media-20,50)];
    if(!railCollapsed)items.filter(item=>['tab','menu'].includes(item.kind)).forEach((item,index)=>result.push(button(item,18,196+index*64,rail-36,52)));
    const primary=items.find(item=>item.kind==='utility' && (item.primary || item.action==='Utility:continue'));
    const secondary=items.filter(item=>item.kind==='utility' && item!==primary);
    const reading=items.filter(item=>['TextSize','Recenter'].includes(item.action));
    const pager=items.filter(item=>item.kind==='pager');
    const module=items.filter(item=>item.kind==='module'),pathway=items.filter(item=>item.kind==='pathway');
    const primaryY=primary?height-82:height-26;
    if(primary)result.push(button(primary,left,primaryY,width,56));
    pager.forEach((item,index)=>result.push(button(item,left+width-108+index*56,124,48,42)));
    const rows=Math.ceil(secondary.length/2);
    let y=primaryY-(rows*54+reading.length*54+module.length*54+pathway.length*54+10);
    for(const group of [pathway,module,reading])for(const item of group){result.push(button(item,left,y,width,48));y+=54;}
    secondary.forEach((item,index)=>result.push(button(item,left+(index%2)*(width/2+4),y+Math.floor(index/2)*54,width/2-4,48)));
    return result;
}

let panelInstance=0;
export function createPimInfoPanel({ root, headset = false, onEdit = () => {}, onPathwayAction = () => {}, onModuleAction = () => {}, onUtilityAction = () => {}, onMove = () => {} } = {}) {
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=false;
    let mediaImage=null,mediaLoadToken=0,mediaTouched=false;
    let railCollapsed=headset?false:(globalThis.matchMedia?.('(max-width:600px)').matches || false),mediaCollapsed=headset||railCollapsed;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false,pathwayContext=null,moduleContext=null,utilityActions=[];
    let spatialMove=null,finishingMoveSource=null,manuallyPositioned=false;
    let removeXrControls=()=>{};
    const element=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    const text=()=>tab==='Modules'?(moduleContext?.body || 'Choose a short guide. It will lead through a few cells, then return to the demo.') : tab==='Help'?INFO_HELP:tab==='Settings'
        ? 'Make this panel comfortable to read. Choose a larger text size, or recenter it to the left of your current view. Your plant selection stays in place.'
        : selection?[selection.body,selection.safety && 'Safety: '+selection.safety,selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
        : identity?'Explore the honeycomb around '+identity.plant+'. Hold a cell to read its details here.'
        :'This is your Control panel. It stays nearby to help you read selected topics, follow the tutorial and adjust the experience.';
    const pages=()=>infoPages(text(),headset?(largeText?27:31):(largeText?32:38),pathwayContext?4:7);
    const title=()=>tab==='Modules'?(moduleContext?.title || 'Guides'):tab==='Help'?'Explore at your own pace':tab==='Settings'?'Reading comfort':selection?.title || (identity?'Choose a topic':'Ready to explore');
    const metadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const previewMedia=()=>selection?.mesh==='lim' && selection.image
        ? {image:selection.image,alt:selection.imageAlt || selection.title,caption:'Pathway illustration'}
        : identity?.media?.image ? {...identity.media,caption:`${identity.plant} · reference image`} : null;
    const showPlantPreview=()=>Boolean(previewMedia()?.image);
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText,Boolean(pathwayContext),utilityActions,tab==='Modules'?(moduleContext?.actions?.length||0):0);
    const contentKind=()=>selection?.mesh==='lim' || (!selection && !identity) ? 'lim' : 'pim';
    const controls=()=>controlPanelControls({hidden,tab,selected:Boolean(selection && selection.editable!==false),page,pageCount:pages().length,height:height(),largeText,contentKind:contentKind(),pathwayActions:pathwayContext?.actions || [],moduleActions:moduleContext?.actions || [],utilityActions});
    const spatialHeight=()=>headset?Math.max(850,height()+190):height();
    const spatialControls=()=>spatialPanelControls({hidden,height:spatialHeight(),railCollapsed,mediaCollapsed,items:controls()});
    function act(action){
        const button=(headset?spatialControls():controls()).find(item=>item.action===action);if(button?.disabled)return;
        if(action==='ToggleMenu')railCollapsed=!railCollapsed;
        if(action==='ToggleMedia'){mediaCollapsed=!mediaCollapsed;mediaTouched=true;}
        if(action==='MovePanel')return;
        if(action==='Restore')hidden=false;
        if(action==='Hide')hidden=true;
        if(['Details','Modules','Help','Settings'].includes(action)){tab=action;page=0;}
        if(action==='Previous')page=Math.max(0,page-1);
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection && selection.editable!==false)onEdit(record,selection.path || selection.id);
        if(action==='TextSize'){largeText=!largeText;page=0;}
        if(action==='Recenter'){heading=null;pose=null;lastTime=0;}
        if(action.startsWith('Path')){onPathwayAction(action);return;}
        if(action.startsWith('Module:')){onModuleAction(action.slice(7));return;}
        if(action.startsWith('Utility:')){onUtilityAction(action.slice(8));return;}
        render();
    }
    function makeButton(item){
        const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.infoAction=item.action;button.disabled=Boolean(item.disabled);
        button.dataset.controlKind=item.kind || 'action';button.classList.toggle('is-primary-action',Boolean(item.primary) || ['Next','PathNext'].includes(item.action));
        button.setAttribute('aria-label',item.action==='Restore'?'Restore Control panel':item.ariaLabel || item.label);
        if(item.kind==='tab'){button.setAttribute('role','tab');button.setAttribute('aria-selected',String(item.selected));button.setAttribute('aria-controls',contentId);button.id=contentId+'-'+item.action;button.tabIndex=item.selected?0:-1;}
        button.addEventListener('click',event=>{event.stopPropagation();act(item.action);});return button;
    }
    function makePanelToggle(label,className,onClick,expanded){
        const button=document.createElement('button');button.type='button';button.className=className;button.textContent=label;button.setAttribute('aria-expanded',String(expanded));
        button.addEventListener('click',event=>{event.stopPropagation();onClick();syncPanelWings();});return button;
    }
    function syncPanelWings(){
        element.classList.toggle('is-rail-collapsed',railCollapsed);
        element.classList.toggle('is-media-collapsed',mediaCollapsed);
        const railToggle=element.querySelector('.nlxr-rail-toggle');
        const mediaToggle=element.querySelector('.nlxr-media-toggle');
        if(railToggle){railToggle.setAttribute('aria-expanded',String(!railCollapsed));railToggle.setAttribute('aria-label',railCollapsed?'Open settings and sections':'Collapse settings and sections');}
        if(mediaToggle){mediaToggle.setAttribute('aria-expanded',String(!mediaCollapsed));mediaToggle.setAttribute('aria-label',mediaCollapsed?'Open plant media':'Collapse plant media');}
    }
    function bindPanelMove(handle){
        handle.addEventListener('pointerdown',event=>{
            if(event.button!==0 && event.pointerType==='mouse')return;
            event.preventDefault();event.stopPropagation();const rect=element.getBoundingClientRect(),dx=event.clientX-rect.left,dy=event.clientY-rect.top;
            handle.setPointerCapture?.(event.pointerId);
            const move=next=>{const left=Math.max(8,Math.min(window.innerWidth-element.offsetWidth-8,next.clientX-dx)),top=Math.max(8,Math.min(window.innerHeight-element.offsetHeight-8,next.clientY-dy));element.style.left=left+'px';element.style.top=top+'px';element.style.right='auto';element.style.bottom='auto';onMove();};
            const end=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',end);handle.removeEventListener('pointercancel',end);};
            handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
        });
    }
    function updateReading(){
        if(detached)return;
        const content=element.querySelector('[role="tabpanel"]');
        if(hidden || !content){render(true);return;}
        const currentPages=pages();
        page=Math.min(page,currentPages.length-1);
        element.dataset.contentKind=contentKind();
        element.dataset.primaryFaceId=contentKind()==='lim' ? (selection?.primaryFaceId || '') : '';
        element.dataset.relatedFaceIds=contentKind()==='lim' ? (selection?.relatedFaceIds || []).join(',') : '';
        element.style.setProperty('--lim-accent',selection?.mesh==='lim' ? (selection.accent || '#719b62') : 'transparent');
        const header=element.querySelector('.nlxr-control-header');
        if(header){header.querySelector('h2').textContent=identity?.plant || selection?.plant || 'Control panel';header.querySelector('.nlxr-control-identity').textContent=identity?.scientific || (identity?'Selected plant':'Your exploration guide');}
        const detailsTab=element.querySelector('[data-info-action="Details"]');
        if(detailsTab)detailsTab.textContent=contentKind()==='pim'?'Plant':'Selected topic';
        content.setAttribute('aria-labelledby',contentId+'-'+tab);
        content.querySelector('h3').textContent=title();
        content.querySelector('.nlxr-info-trail').textContent=tab==='Details'?selection?.breadcrumb || 'Explore → Details':'';
        content.querySelector('.nlxr-info-body').textContent=currentPages[page].join('\n');
        content.querySelector('small').textContent=metadata();
        let pager=content.querySelector('.nlxr-content-pager');
        if(!pager && currentPages.length>1){pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');content.append(pager);}
        if(pager)pager.replaceChildren(...controls().filter(item=>item.kind==='pager').map(makeButton));
        let guides=content.querySelector('.nlxr-guide-actions');
        if(tab==='Modules' && !guides){guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');content.append(guides);}
        if(guides){if(tab==='Modules')guides.replaceChildren(...controls().filter(item=>item.kind==='module' && !item.disabled).map(makeButton));else guides.remove();}
        const count=element.querySelector('.nlxr-control-page');
        if(count)count.textContent=(page+1)+' / '+currentPages.length;
        const media=element.querySelector('.nlxr-media-wing');
        if(media){
            const preview=previewMedia(),figure=media.querySelector('.nlxr-plant-preview'),empty=media.querySelector('.nlxr-media-empty');
            if(preview){
                if(figure){const image=figure.querySelector('img');if(image.getAttribute('src')!==preview.image)image.src=preview.image;image.alt=preview.alt || '';figure.querySelector('figcaption').textContent=preview.caption;}
                else{const next=document.createElement('figure');next.className='nlxr-plant-preview';const image=document.createElement('img');image.src=preview.image;image.alt=preview.alt || '';image.decoding='async';const caption=document.createElement('figcaption');caption.textContent=preview.caption;next.append(image,caption);empty?.replaceWith(next);}
            }else if(figure){const next=document.createElement('p');next.className='nlxr-media-empty';next.textContent='Plant imagery and references appear here when a plant is selected.';figure.replaceWith(next);}
            media.setAttribute('aria-label',selection?.mesh==='lim'?'Pathway illustration':'Plant media');
        }else if(showPlantPreview())render(true);
    }
    function updatePathway(){
        if(detached)return;
        element.dataset.pathwayMode=pathwayContext?.mode || '';
        const existing=element.querySelector('.nlxr-pathway-context');
        if(!pathwayContext){existing?.remove();return;}
        const pathway=existing || document.createElement('section');
        pathway.className='nlxr-pathway-context';pathway.setAttribute('aria-live','polite');
        const heading=document.createElement('div');heading.className='nlxr-pathway-heading';
        const name=document.createElement('strong');name.textContent=pathwayContext.title || 'Learning Paths';heading.append(name);
        if(pathwayContext.preview){const badge=document.createElement('small');badge.textContent='Preview';heading.append(badge);}
        const progress=document.createElement('span');progress.textContent=pathwayContext.progress || '';
        const explanation=document.createElement('p');explanation.textContent=pathwayContext.explanation || '';
        const actions=document.createElement('nav');actions.setAttribute('aria-label','Learning Path actions');
        controls().filter(item=>item.kind==='pathway').forEach(item=>actions.append(makeButton(item)));
        pathway.replaceChildren(heading,progress,explanation,actions);
        if(!existing)element.querySelector('[role="tabpanel"]')?.before(pathway);
    }
    function render(force=false){
        if(detached)return;
        const focused=element.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        const needsMediaWing=(element.classList.contains('is-demo-panel') || element.classList.contains('is-creator-panel')) && !element.querySelector('.nlxr-media-wing');
        if(!force && !hidden && !needsMediaWing && element.querySelector('.nlxr-control-header')){
            element.classList.toggle('is-large-text',largeText);
            syncPanelWings();
            updateReading();
            updatePathway();
            const tabs=element.querySelector('.nlxr-control-tabs');
            if(tabs){
                const railScroll=tabs.scrollTop;
                tabs.querySelectorAll('[data-info-action]').forEach(button=>button.remove());
                controls().filter(item=>['tab','menu'].includes(item.kind)).forEach(item=>tabs.append(makeButton(item)));
                tabs.scrollTop=railScroll;
            }
            const tools=element.querySelector('.nlxr-tools-dock');
            if(tools){
                let nav=tools.querySelector('.nlxr-control-actions');
                if(!nav){nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Reading controls');tools.append(nav);}
                nav.replaceChildren(...controls().filter(item=>!item.kind && item.action!=='Hide' && !item.disabled).map(makeButton));
                let utilities=tools.querySelector('.nlxr-control-utilities');
                if(utilityActions.length){
                    if(!utilities){utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');tools.append(utilities);}
                    utilities.replaceChildren(...controls().filter(item=>item.kind==='utility').map(makeButton));
                }else utilities?.remove();
            }
            if(focused)element.querySelector('[data-info-action="'+focused+'"]')?.focus({preventScroll:true});
            return;
        }
        element.replaceChildren();element.classList.toggle('is-hidden',hidden);element.classList.toggle('is-large-text',largeText);
        const showMediaWing=showPlantPreview() || element.classList.contains('is-demo-panel') || element.classList.contains('is-creator-panel');
        element.classList.toggle('is-rail-collapsed',railCollapsed);element.classList.toggle('is-media-collapsed',mediaCollapsed);element.classList.remove('is-tools-collapsed');element.classList.toggle('has-media',showMediaWing);
        element.dataset.contentKind=contentKind();
        element.dataset.primaryFaceId=contentKind()==='lim' ? (selection?.primaryFaceId || '') : '';
        element.dataset.relatedFaceIds=contentKind()==='lim' ? (selection?.relatedFaceIds || []).join(',') : '';
        element.dataset.pathwayMode=pathwayContext?.mode || '';
        element.style.setProperty('--lim-accent',selection?.mesh==='lim' ? (selection.accent || '#719b62') : 'transparent');
        if(hidden)element.append(makeButton(controls()[0]));
        else{
            const header=document.createElement('header');header.className='nlxr-control-header';
            const plant=document.createElement('h2');plant.textContent=identity?.plant || selection?.plant || 'Control panel';
            const scientific=document.createElement('p');scientific.className='nlxr-control-identity';scientific.textContent=identity?.scientific || (identity?'Selected plant':'Your exploration guide');
            const hideButton=makeButton(controls()[0]);hideButton.classList.add('is-panel-hide');
            const moveButton=document.createElement('button');moveButton.type='button';moveButton.className='nlxr-panel-move';moveButton.textContent='●';moveButton.setAttribute('aria-label','Hold and move Control panel');bindPanelMove(moveButton);
            header.append(hideButton,moveButton,plant,scientific);element.append(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
            tabs.append(makePanelToggle('●','nlxr-rail-toggle',()=>{railCollapsed=!railCollapsed;},!railCollapsed));
            tabs.lastElementChild?.setAttribute('aria-label',railCollapsed?'Open settings and sections':'Collapse settings and sections');
            controls().filter(item=>['tab','menu'].includes(item.kind)).forEach(item=>tabs.append(makeButton(item)));
            element.append(tabs);
            if(pathwayContext){
                const pathway=document.createElement('section');pathway.className='nlxr-pathway-context';pathway.setAttribute('aria-live','polite');
                const heading=document.createElement('div');heading.className='nlxr-pathway-heading';
                const name=document.createElement('strong');name.textContent=pathwayContext.title || 'Learning Paths';heading.append(name);
                if(pathwayContext.preview){const badge=document.createElement('small');badge.textContent='Preview';heading.append(badge);}
                const progress=document.createElement('span');progress.textContent=pathwayContext.progress || '';
                const explanation=document.createElement('p');explanation.textContent=pathwayContext.explanation || '';
                const actions=document.createElement('nav');actions.setAttribute('aria-label','Learning Path actions');
                controls().filter(item=>item.kind==='pathway').forEach(item=>actions.append(makeButton(item)));
                pathway.append(heading,progress,explanation,actions);element.append(pathway);
            }
            const content=document.createElement('section');content.id=contentId;content.setAttribute('role','tabpanel');content.setAttribute('aria-labelledby',contentId+'-'+tab);content.tabIndex=0;
            const heading=document.createElement('h3');heading.textContent=title();
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.textContent=tab==='Details'?selection?.breadcrumb || 'Explore → Details':'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,body,status);
            const pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');controls().filter(item=>item.kind==='pager').forEach(item=>pager.append(makeButton(item)));if(pager.childElementCount)content.append(pager);
            if(tab==='Modules'){const guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');controls().filter(item=>item.kind==='module' && !item.disabled).forEach(item=>guides.append(makeButton(item)));if(guides.childElementCount)content.append(guides);}
            element.append(content);
            if(showMediaWing){
                const media=document.createElement('aside');media.className='nlxr-media-wing';media.setAttribute('aria-label',selection?.mesh==='lim'?'Pathway illustration':'Plant media');
                const mediaToggle=makePanelToggle('●','nlxr-media-toggle',()=>{mediaCollapsed=!mediaCollapsed;mediaTouched=true;},!mediaCollapsed);mediaToggle.setAttribute('aria-label',mediaCollapsed?'Open plant media':'Collapse plant media');media.append(mediaToggle);
                if(showPlantPreview()){const figure=document.createElement('figure');figure.className='nlxr-plant-preview';const image=document.createElement('img');const preview=previewMedia();image.src=preview.image;image.alt=preview.alt || '';image.decoding='async';const caption=document.createElement('figcaption');caption.textContent=preview.caption;figure.append(image,caption);media.append(figure);}
                else{const empty=document.createElement('p');empty.className='nlxr-media-empty';empty.textContent='Plant imagery and references appear here when a plant is selected.';media.append(empty);}
                element.append(media);
            }
            const tools=document.createElement('footer');tools.className='nlxr-tools-dock';tools.setAttribute('aria-label','Control panel tools');
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Reading controls');controls().filter(item=>!item.kind && item.action!=='Hide' && !item.disabled).forEach(item=>nav.append(makeButton(item)));if(nav.childElementCount)tools.append(nav);
            if(utilityActions.length){const utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');controls().filter(item=>item.kind==='utility').forEach(item=>utilities.append(makeButton(item)));if(utilities.childElementCount)tools.append(utilities);}
            element.append(tools);
            if(tab==='Details'){const count=document.createElement('small');count.className='nlxr-control-page';count.textContent=(page+1)+' / '+pages().length;element.append(count);}
        }
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();const tabs=['Details','Modules','Help','Settings'],index=tabs.indexOf(tab);
        act(event.key==='Home'?'Details':event.key==='End'?'Settings':tabs[(index+(['ArrowRight','ArrowDown'].includes(event.key)?1:tabs.length-1))%tabs.length]);
        element.querySelector('[data-info-action="'+tab+'"]')?.focus();
    });
    element.addEventListener('beforexrselect',event=>event.preventDefault());
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    function canvas(card){
        const c=document.createElement('canvas');c.width=1000;c.height=card.hidden?160:card.height;const ctx=c.getContext('2d');
            const gradient=ctx.createLinearGradient(0,0,1000,c.height);gradient.addColorStop(0,'rgba(53,75,62,.74)');gradient.addColorStop(1,'rgba(19,34,28,.66)');
        ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,992,c.height-8,22);ctx.fill();ctx.strokeStyle=card.guided?'#b7dcc8':'rgba(205,229,202,.42)';ctx.lineWidth=card.guided?4:2;ctx.stroke();ctx.textBaseline='top';
        if(card.headset && !card.hidden){
            const rail=card.railCollapsed?62:200,media=card.mediaCollapsed?62:230;
            const left=rail+22,right=1000-media-22,width=right-left;
            ctx.fillStyle='rgba(11,25,20,.25)';ctx.fillRect(6,115,rail,c.height-122);
            ctx.fillStyle='rgba(14,29,24,.28)';ctx.fillRect(1000-media,115,media-6,c.height-122);
            ctx.fillStyle='#f1f4f4';ctx.font='600 35px system-ui';ctx.fillText(card.plant,left,28,Math.max(100,width-150));
            ctx.fillStyle='#d4e0dc';ctx.font='400 25px system-ui';ctx.fillText(card.scientific,left,77,width);
            let y=156;
            if(card.pathway){
                ctx.fillStyle='#badbc1';ctx.font='600 24px system-ui';ctx.fillText(card.pathway.title,left,y,width);y+=35;
                ctx.fillStyle='#d4e0dc';ctx.font='400 23px system-ui';ctx.fillText(card.pathway.progress,left,y,width);y+=34;
                infoPages(card.pathway.explanation,Math.max(26,Math.floor(width/13)),2)[0].forEach(line=>{ctx.fillText(line,left,y,width);y+=24;});y+=16;
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.fillRect(left,y-3,6,34);}
            ctx.fillStyle='#f1f4f4';ctx.font='600 30px system-ui';ctx.fillText(card.title,left+12,y,width-12);y+=46;
            ctx.fillStyle='#d4e0dc';ctx.font='400 23px system-ui';ctx.fillText(card.trail,left,y,width);y+=42;
            const actionTop=Math.min(...card.controls.filter(item=>item.kind==='utility'||['TextSize','Recenter'].includes(item.action)).map(item=>item.y),card.height-90);
            const contentBottom=actionTop-22;
            ctx.save();ctx.beginPath();ctx.rect(left,y,width,Math.max(0,contentBottom-y));ctx.clip();
            ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 38px':'400 33px')+' system-ui';
            const lineHeight=card.largeText?46:41;
            card.lines.forEach(line=>{ctx.fillText(line,left,y,width);y+=lineHeight;});ctx.restore();
            if(!card.mediaCollapsed){
                const imageX=1000-media+12,imageY=206,imageWidth=media-28,imageHeight=Math.max(180,card.height-300);
                if(card.image){const scale=Math.min(imageWidth/card.image.naturalWidth,imageHeight/card.image.naturalHeight);
                    ctx.fillStyle='rgba(233,239,228,.92)';ctx.fillRect(imageX,imageY,imageWidth,imageHeight);
                    ctx.drawImage(card.image,imageX+(imageWidth-card.image.naturalWidth*scale)/2,imageY+(imageHeight-card.image.naturalHeight*scale)/2,card.image.naturalWidth*scale,card.image.naturalHeight*scale);
                }else{ctx.fillStyle='#bdc9cc';ctx.font='400 20px system-ui';infoPages('Plant media appears here when a plant is selected.',18,4)[0].forEach((line,index)=>ctx.fillText(line,imageX,imageY+index*27,imageWidth));}
            }
            ctx.fillStyle='#d4e0dc';ctx.font='400 22px system-ui';ctx.fillText(card.metadata,left,card.height-27,width);
            if(card.tab==='Details')ctx.fillText(card.page,right-65,card.height-20,65);
        }else if(!card.hidden){
            ctx.fillStyle='rgba(18,41,30,.32)';ctx.fillRect(6,6,204,c.height-12);ctx.fillStyle='rgba(34,54,43,.32)';ctx.fillRect(214,6,780,155);
            ctx.fillStyle='#f1f4f4';ctx.font='600 38px system-ui';ctx.fillText(card.plant,238,30,732);
            ctx.fillStyle='#bdc9cc';ctx.font='400 23px system-ui';ctx.fillText(card.scientific,238,91,732);
            let contentTop=card.pathway?292:187;const titleX=card.accent?258:238,titleWidth=card.accent?712:732;
            if(card.pathway){
                ctx.fillStyle='#aaccc1';ctx.font='600 22px system-ui';ctx.fillText(card.pathway.title+(card.pathway.preview?' · PREVIEW':''),238,178,560);
                ctx.fillStyle='#b7c5c9';ctx.font='500 19px system-ui';ctx.fillText(card.pathway.progress,790,180,180);ctx.font='400 19px system-ui';
                infoPages(card.pathway.explanation,72,2)[0].forEach((line,index)=>ctx.fillText(line,238,218+index*24,732));
            }
            if(card.image){
                const imageTop=contentTop-8,imageHeight=Math.min(520,Math.max(250,card.height*.42)),imageWidth=732;
                ctx.save();ctx.beginPath();ctx.roundRect(238,imageTop,imageWidth,imageHeight,14);ctx.clip();
                const naturalWidth=card.image.naturalWidth || imageWidth,naturalHeight=card.image.naturalHeight || imageHeight;
                const scale=Math.min(imageWidth/naturalWidth,imageHeight/naturalHeight),drawWidth=naturalWidth*scale,drawHeight=naturalHeight*scale;
                ctx.fillStyle='rgba(233,239,228,.92)';ctx.fillRect(238,imageTop,imageWidth,imageHeight);ctx.drawImage(card.image,238+(imageWidth-drawWidth)/2,imageTop+(imageHeight-drawHeight)/2,drawWidth,drawHeight);
                ctx.restore();ctx.strokeStyle='rgba(210,232,215,.4)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(238,imageTop,imageWidth,imageHeight,14);ctx.stroke();
                contentTop+=imageHeight+20;
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.globalAlpha=.92;ctx.fillRect(238,contentTop-7,7,42);ctx.globalAlpha=1;}
            ctx.fillStyle='#f1f4f4';ctx.font='600 32px system-ui';ctx.fillText(card.title,titleX,contentTop,titleWidth);
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.trail,238,contentTop+45,732);
            ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 40px':'400 34px')+' system-ui';card.lines.forEach((line,i)=>ctx.fillText(line,238,contentTop+93+i*(card.largeText?46:38),732));
            const footerY=card.pathway?card.height-218:card.height-106;
            ctx.fillStyle='#b4c3c7';ctx.font='400 20px system-ui';ctx.fillText(card.metadata,238,footerY,600);
            if(card.tab==='Details')ctx.fillText(card.page,882,footerY,88);
        }
        card.controls.forEach(button=>{
            const radius=button.kind==='tab'?13:15;
            if(button.kind!=='tab' && button.kind!=='handle' && !button.disabled){ctx.fillStyle='rgba(4,9,12,.34)';ctx.beginPath();ctx.roundRect(button.x,button.y+5,button.width,button.height,radius);ctx.fill();}
            const face=ctx.createLinearGradient(button.x,button.y,button.x,button.y+button.height);
            if(button.primary){face.addColorStop(0,'rgba(232,246,189,.98)');face.addColorStop(.55,'rgba(183,215,151,.96)');face.addColorStop(1,'rgba(135,178,114,.98)');}
            else if(button.selected){face.addColorStop(0,'rgba(185,216,177,.44)');face.addColorStop(1,'rgba(88,124,94,.36)');}
            else if(button.disabled){face.addColorStop(0,'rgba(211,220,225,.05)');face.addColorStop(1,'rgba(211,220,225,.025)');}
            else if(button.action==='Utility:close'){face.addColorStop(0,'rgba(159,101,82,.44)');face.addColorStop(1,'rgba(94,51,45,.38)');}
            else if(button.kind==='toggle'||button.kind==='handle'){face.addColorStop(0,'rgba(212,246,177,.38)');face.addColorStop(1,'rgba(95,153,87,.18)');}
            else {face.addColorStop(0,'rgba(151,180,145,.24)');face.addColorStop(.5,'rgba(70,94,75,.5)');face.addColorStop(1,'rgba(35,56,43,.68)');}
            ctx.fillStyle=face;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,radius);ctx.fill();
            if(button.kind!=='tab' && !button.disabled){ctx.strokeStyle='rgba(232,244,240,.42)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(button.x+radius,button.y+2,button.width-radius*2,1.5);}
            if(button.selected){ctx.fillStyle='#aaccc1';ctx.fillRect(button.x,button.y+9,3,button.height-18);}
            ctx.fillStyle=button.disabled?'#899297':button.primary?'#15261c':button.kind==='toggle'||button.kind==='handle'?'#d9ffb3':'#f1f4f4';ctx.font=(button.primary?'700 ':button.kind==='toggle'||button.kind==='handle'?'700 ':'500 ')+(button.kind==='toggle'||button.kind==='handle'?'32px':'29px')+' system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+(button.height-(button.kind==='toggle'||button.kind==='handle'?36:34))/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;return hitTotemSurface(ray,[{...pose,width:hidden?.26:.66,height:hidden?.06:spatialHeight()/1000*.66}]);}
    const api={element,
        showLearning(content){
            const wasDetails=tab==='Details';
            record=null;identity=null;selection={...content,sources:[],editable:false,mesh:content?.mesh || 'lim'};
            mediaImage=null;const token=++mediaLoadToken;
            if(content?.image && !mediaTouched)mediaCollapsed=false;
            if(content?.image){const image=new Image();image.decoding='async';image.onload=()=>{if(token===mediaLoadToken)mediaImage=image;};image.onerror=()=>{if(token===mediaLoadToken)mediaImage=null;};image.src=content.image;}
            tab='Details';hidden=false;page=0;if(wasDetails)updateReading();else render();
        },
        setLearningModules(value,{open=false}={}){const previousTab=tab;moduleContext=value?{...value,actions:[...(value.actions||[])]}:null;if(open && moduleContext)tab='Modules';else if(!moduleContext && tab==='Modules')tab='Details';page=0;if(previousTab==='Details' && tab==='Details')updateReading();else render();},
        setUtilityActions(items=[]){utilityActions=items.slice(0,8).map(item=>({...item}));render();},
        setCompact(value=true){const compact=Boolean(value);railCollapsed=compact;if(compact)mediaCollapsed=true;element.classList.toggle('is-opening-compact',compact);if(!element.querySelector('.nlxr-media-wing') && (element.classList.contains('is-demo-panel') || element.classList.contains('is-creator-panel')))render(true);else syncPanelWings();},
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;spatialMove=null;render();},
        setPathwayContext(value){pathwayContext=value ? {...value,actions:[...(value.actions || [])]} : null;updatePathway();},
        setGuided(value){guided=Boolean(value);element.classList.toggle('is-guided',guided);},
        focusPlant(nextRecord,document,media=null){
            const wasDetails=tab==='Details';
            const previousMedia=record===nextRecord ? identity?.media : null;
            const identityImage=document?.identity?.image;
            const nextMedia=media?.image ? {image:String(media.image),alt:String(media.alt || '')}
                : identityImage ? {image:String(identityImage),alt:String(document.identity.commonName || document.identity.scientificName || 'Plant')}
                    : previousMedia;
            record=nextRecord;selection=null;identity={plant:document.identity?.commonName || document.identity?.scientificName || 'Plant',scientific:document.identity?.scientificName || '',media:nextMedia};mediaImage=null;
            if(nextMedia?.image && !mediaTouched)mediaCollapsed=false;
            const token=++mediaLoadToken;
            if(nextMedia?.image){const image=new Image();image.decoding='async';image.onload=()=>{if(token===mediaLoadToken)mediaImage=image;};image.onerror=()=>{if(token===mediaLoadToken)mediaImage=null;};image.src=nextMedia.image;}
            tab='Details';page=0;if(wasDetails)updateReading();else render();
        },
        select(nextRecord,document,path){const next=pimInfoContent(document,path);if(!next)return false;const wasDetails=tab==='Details';const previous=record===nextRecord?identity?.media:null;const image=document?.identity?.image;const media=image?{image:String(image),alt:String(document.identity.commonName || document.identity.scientificName || 'Plant')}:previous;record=nextRecord;selection=next;identity={plant:next.plant,scientific:document.identity?.scientificName || '',media};if(media?.image && !mediaTouched)mediaCollapsed=false;tab='Details';hidden=false;page=0;if(wasDetails)updateReading();else render();return true;},
        refresh(nextRecord,document){if(record===nextRecord && selection)api.select(record,document,selection.id);},
        suspend(value){element.style.visibility=value?'hidden':'';detached=Boolean(value);if(!value){updateReading();updatePathway();}},
        attach(gl){renderer?.destroy();renderer=createSpatialTotemCards(gl,{canvas,surfaces:(_position,_right,cards)=>pose?[{...pose,width:hidden?.26:.66,height:hidden?.06:spatialHeight()/1000*.66,card:cards[0]}]:[]});element.hidden=true;},
        update(matrix,time=performance.now(),inputRay=null,xrFrame=null){
            if(!manuallyPositioned && panelPoseOutsideSafeBounds(matrix,pose)){heading=null;pose=null;lastTime=0;}
            const next=infoPanelPose(matrix,heading,headset);if(!next)return;heading=next.anchorHeading;
            let heldTransform=null;
            if(spatialMove && xrFrame?.getPose && spatialMove.source?.targetRaySpace && spatialMove.referenceSpace){
                try{heldTransform=xrFrame.getPose(spatialMove.source.targetRaySpace,spatialMove.referenceSpace)?.transform.matrix || null;}catch{heldTransform=null;}
            }
            const heldRay=heldTransform?{origin:{x:heldTransform[12],y:heldTransform[13],z:heldTransform[14]},direction:{x:-heldTransform[8],y:-heldTransform[9],z:-heldTransform[10]}}:xrFrame?null:inputRay;
            if(spatialMove && heldRay?.origin && heldRay?.direction){
                pose ||= next;
                pose.center=panelCenterFromGrab(heldRay,spatialMove,pose);
                manuallyPositioned=true;
            }else if(!manuallyPositioned){
                const amount=pose?1-Math.exp(-Math.min(100,Math.max(0,time-lastTime))/160):1;
                if(!pose)pose=next;else for(const key of ['x','y','z'])pose.center[key]+=(next.center[key]-pose.center[key])*amount;
            }
            if(!spatialMove)Object.assign(pose,facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]}));
            lastTime=time;
        },
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;spatialMove=null;},
        getPosition(){return pose?.center ? {...pose.center} : null;},
        draw(view){
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const card={id:'control',headset,hidden,tab,height:spatialHeight(),largeText,guided,controls:headset?spatialControls():controls(),railCollapsed,mediaCollapsed,pathway:pathwayContext,image:showPlantPreview()?mediaImage:null,accent:selection?.mesh==='lim'?selection.accent:'',plant:identity?.plant || selection?.plant || 'Control panel',scientific:identity?.scientific || (identity?'Selected plant':'Your exploration guide'),title:title(),trail:tab==='Details'?selection?.breadcrumb || 'Explore → Details':'',lines:p[page],page:(page+1)+' / '+p.length,metadata:metadata()};
            renderer.begin();renderer.draw(view,{id:'companion'},pose.center,[card],'');renderer.end();
        },hit,
        activate(ray){const target=hit(ray);if(!target)return false;const x=(target.localX/target.width+.5)*1000,y=(.5-target.localY/target.height)*(hidden?160:spatialHeight());
            const button=(headset?spatialControls():controls()).find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);if(button && button.action!=='MovePanel')act(button.action);return true;},
        bindSession(session,referenceSpace){removeXrControls();const handle=event=>{
            if(event.type==='selectstart' && finishingMoveSource===event.inputSource)finishingMoveSource=null;
            if(event.type==='selectend' && spatialMove?.source===event.inputSource){finishingMoveSource=event.inputSource;spatialMove=null;event.stopImmediatePropagation();return;}
            if(event.type==='select' && (spatialMove?.source===event.inputSource || finishingMoveSource===event.inputSource)){finishingMoveSource=null;event.stopImmediatePropagation();return;}
            const transform=event.frame?.getPose(event.inputSource.targetRaySpace,referenceSpace)?.transform.matrix;if(!transform)return;
            const ray={origin:{x:transform[12],y:transform[13],z:transform[14]},direction:{x:-transform[8],y:-transform[9],z:-transform[10]}};
            const target=hit(ray);if(!target)return;
            event.stopImmediatePropagation();
            const x=(target.localX/target.width+.5)*1000,y=(.5-target.localY/target.height)*(hidden?160:spatialHeight());
            const button=spatialControls().find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);
            if(event.type==='selectstart' && button?.action==='MovePanel'){
                spatialMove={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY};
                return;
            }
            if(event.type==='select' && !spatialMove)api.activate(ray);
        };for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);
            removeXrControls=()=>{for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);};},
        destroy(){mediaLoadToken++;mediaImage=null;removeXrControls();renderer?.destroy();renderer=null;element.remove();}
    };render();return api;
}
