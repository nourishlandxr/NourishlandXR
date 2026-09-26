import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';

export const INFO_HELP = 'Aim at an object to highlight it. Hold a plant cell to read its details here. Select a Plant Orb to explore information connected to that plant.';

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

export function infoPanelPose(matrix, heading = null, headset = false, phoneAR = false) {
    if (!matrix) return null;
    const length = Math.hypot(matrix[0], matrix[2]) || 1;
    const right = heading || { x: matrix[0] / length, y: 0, z: matrix[2] / length };
    // The headset console begins below the current forward view, like a
    // waist-height spatial workstation. Looking down to it produces a gentle
    // upward-facing pitch instead of a vertical panel in the main FOV.
    const side=phoneAR ? .58 : headset ? 0 : .82;
    const forward=phoneAR ? .78 : headset ? 1.08 : .62;
    const drop=phoneAR ? .24 : headset ? .30 : .72;
    const center={ x: matrix[12] - right.x * side + right.z * forward,
        y: matrix[13] - drop, z: matrix[14] - right.z * side - right.x * forward };
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
}

// Build companion faces from the main panel's local axes. The restrained
// inward turn reads as one curved workstation without billboarding each face.
export function companionPanelPose(pose, side, offset, angleDegrees = 18, arcDepth = .24) {
    const direction=side==='left'?-1:1,turn=side==='left'?1:-1;
    const radians=angleDegrees*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
    return {...pose,
        center:{x:pose.center.x+pose.right.x*offset*direction+pose.normal.x*arcDepth,
            y:pose.center.y+pose.normal.y*arcDepth,
            z:pose.center.z+pose.right.z*offset*direction+pose.normal.z*arcDepth},
        right:{x:pose.right.x*cos-pose.normal.x*sin*turn,y:pose.right.y*cos-pose.normal.y*sin*turn,z:pose.right.z*cos-pose.normal.z*sin*turn},
        normal:{x:pose.normal.x*cos+pose.right.x*sin*turn,y:pose.normal.y*cos+pose.right.y*sin*turn,z:pose.normal.z*cos+pose.right.z*sin*turn}
    };
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
    if(hidden)return [{action:'Restore',label:'Restore panel',x:150,y:28,width:700,height:104}];
    const utilities=utilityActions.slice(0,8),primary=utilities.find(item=>item.primary || item.id==='continue');
    const menuUtilities=utilities.filter(item=>['close','lim-visibility'].includes(item.id));
    const secondary=utilities.filter(item=>item!==primary && !menuUtilities.includes(item));
    const secondaryRows=Math.ceil(secondary.length/2),primaryHeight=primary?68:0,moduleRows=tab==='Help'?moduleActions.length:0;
    const primaryY=height-22-primaryHeight,secondaryStart=primaryY-secondaryRows*62;
    const actionY=secondaryStart-moduleRows*58-62;
    const buttons=[{action:'Hide',label:'Hide',x:18,y:height-76,width:174,height:54}];
    buttons.push({action:'Help',label:'Help',kind:'tab',selected:tab==='Help',x:18,y:148,width:174,height:56});
    buttons.push({action:'Settings',label:'Settings',kind:'menu',x:18,y:216,width:174,height:56});
    menuUtilities.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.id==='close'?'Close demo':item.label,kind:'menu',disabled:Boolean(item.disabled),x:18,y:284+index*62,width:174,height:54}));
    if(tab==='Details' && pageCount>1)buttons.push({action:'Previous',label:'‹',ariaLabel:'Previous page',kind:'pager',x:852,y:130,width:52,height:42,disabled:page===0},{action:'Next',label:'›',ariaLabel:'Next page',kind:'pager',x:918,y:130,width:52,height:42,disabled:page>=pageCount-1});
    pathwayActions.slice(0,3).forEach((item,index)=>buttons.push({action:item.action,label:item.label,kind:'pathway',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238+index*244,y:actionY-moduleRows*58-62,width:226,height:48}));
    if(tab==='Help')moduleActions.forEach((item,index)=>buttons.push({action:'Module:'+item.id,label:item.label,kind:'module',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238,y:actionY-moduleRows*58+index*58,width:732,height:48}));
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
    if(hidden)return [{action:'Restore',label:'Restore panel',x:150,y:28,width:700,height:104}];
    const rail=200,media=0;
    const left=rail+22,width=1000-rail-44;
    const button=(item,x,y,w,h)=>({...item,x,y,width:w,height:h});
    const result=[button({action:'MovePanel',label:'✋',ariaLabel:'Grab and move Control panel',kind:'handle'},744,24,62,48),
        button({action:'Hide',label:'Hide'},824,24,140,48)];
    items.filter(item=>['tab','menu'].includes(item.kind)).forEach((item,index)=>result.push(button(item,18,196+index*64,rail-36,52)));
    const primary=items.find(item=>item.kind==='utility' && (item.primary || item.action==='Utility:continue'));
    const secondary=items.filter(item=>item.kind==='utility' && item!==primary);
    const pager=items.filter(item=>item.kind==='pager');
    const module=items.filter(item=>item.kind==='module'),pathway=items.filter(item=>item.kind==='pathway');
    const primaryY=primary?height-82:height-26;
    if(primary)result.push(button(primary,left,primaryY,width,56));
    pager.forEach((item,index)=>result.push(button(item,left+width-108+index*56,124,48,42)));
    const rows=Math.ceil(secondary.length/2);
    let y=primaryY-(rows*54+module.length*54+pathway.length*54+10);
    for(const group of [pathway,module])for(const item of group){result.push(button(item,left,y,width,48));y+=54;}
    secondary.forEach((item,index)=>result.push(button(item,left+(index%2)*(width/2+4),y+Math.floor(index/2)*54,width/2-4,48)));
    return result;
}

let panelInstance=0;
export function createPimInfoPanel({ root, headset = false, phoneAR = false, onEdit = () => {}, onPathwayAction = () => {}, onModuleAction = () => {}, onUtilityAction = () => {}, onMove = () => {} } = {}) {
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=false,settingsOpen=false,spatialScale=1,contextHint='';
    let mediaImage=null,mediaLoadToken=0,mediaTouched=false;
    let railCollapsed=headset?false:(globalThis.matchMedia?.('(max-width:600px)').matches || false),mediaCollapsed=headset||railCollapsed;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false,introduction=false,pathwayContext=null,moduleContext=null,meshContext=null,utilityActions=[],headerProgress=null;
    let spatialMove=null,finishingMoveSource=null,manuallyPositioned=false,firstPlacement=true;
    let removeXrControls=()=>{};
    const element=document.createElement('aside'),settingsElement=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    settingsElement.className='nlxr-settings-companion';settingsElement.setAttribute('aria-label','Settings companion panel');settingsElement.hidden=true;root?.append(settingsElement);
    const isDesktopDemo=()=>Boolean(root?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    const meshText=()=>{
        if(!meshContext || (!meshContext.items?.length && !meshContext.result && !meshContext.error))return '';
        const lines=['SELECTED KNOWLEDGE',...(meshContext.items?.length?meshContext.items.map((item,index)=>`${index+1}. ${item.title}`):['None'])];
        if(meshContext.mode==='resolving')lines.push('','Connecting ideas…');
        if(meshContext.error)lines.push('','Unable to connect these ideas',meshContext.error);
        if(meshContext.result && selection?.id!==meshContext.result.id)lines.push('','DISCOVERED IDEA',meshContext.result.title,meshContext.result.summary);
        return lines.join('\n');
    };
    const text=()=>{
        if(tab==='Help')return [moduleContext?.body,INFO_HELP].filter(Boolean).join('\n\n');
        const reading=selection?[selection.body,selection.safety && 'Safety: '+selection.safety,selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
            :identity?'Information about what you select will appear here. Select a Plant Orb or hold one of its cells to explore.'
                :'Information about what you select will appear here.';
        const interactionHint=contextHint ? `HINT\n${contextHint}` : identity?.hint ? `HINT\n${identity.hint}` : '';
        return [reading,interactionHint,meshText()].filter(Boolean).join('\n\n────────────────\n\n');
    };
    const pages=()=>infoPages(text(),headset?(largeText?27:31):(largeText?32:38),pathwayContext?4:7);
    const title=()=>tab==='Help'?'Help':selection?.title || (identity?'':'Ready to explore');
    const metadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const previewMedia=()=>selection?.mesh==='lim' && selection.image
        ? {image:selection.image,alt:selection.imageAlt || selection.title,caption:'Pathway illustration'}
        : identity?.media?.image ? {...identity.media,caption:`${identity.plant} · reference image`} : null;
    const showPlantPreview=()=>Boolean(previewMedia()?.image);
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText,Boolean(pathwayContext),utilityActions,tab==='Help'?(moduleContext?.actions?.length||0):0);
    const contentKind=()=>selection?.mesh==='lim' || (!selection && !identity) ? 'lim' : 'pim';
    const mainUtilities=()=>utilityActions.filter(item=>!['safety','recenter'].includes(item.id));
    const controls=()=>{const items=controlPanelControls({hidden,tab,selected:Boolean(selection && selection.editable!==false),page,pageCount:pages().length,height:height(),largeText,contentKind:contentKind(),pathwayActions:pathwayContext?.actions || [],moduleActions:moduleContext?.actions || [],utilityActions:mainUtilities()});return isDesktopDemo()?items.filter(item=>item.action!=='Recenter'):items;};
    // Fixed geometry prevents tabs and cell lengths from moving the panel in space.
    const spatialHeight=()=>phoneAR?960:headset?720:height();
    const spatialControls=()=>spatialPanelControls({hidden,height:spatialHeight(),railCollapsed,mediaCollapsed,items:controls()});
    function act(action){
        const button=(headset?spatialControls():controls()).find(item=>item.action===action);if(button?.disabled)return;
        if(action==='ToggleMedia'){mediaCollapsed=!mediaCollapsed;mediaTouched=true;}
        if(action==='MovePanel')return;
        if(action==='Restore')hidden=false;
        if(action==='Hide')hidden=true;
        if(action==='Help'){tab=tab==='Help'?'Details':'Help';page=0;}
        if(action==='Settings'){settingsOpen=!settingsOpen;renderSettings();}
        if(action==='Previous')page=Math.max(0,page-1);
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection && selection.editable!==false)onEdit(record,selection.path || selection.id);
        if(action==='TextDown'){largeText=false;page=0;}
        if(action==='TextUp'){largeText=true;page=0;}
        if(action==='Recenter'){heading=null;pose=null;lastTime=0;}
        if(action==='ScaleDown')spatialScale=Math.max(.85,Math.round((spatialScale-.1)*10)/10);
        if(action==='ScaleUp')spatialScale=Math.min(1.2,Math.round((spatialScale+.1)*10)/10);
        if(action.startsWith('Path')){onPathwayAction(action);return;}
        if(action.startsWith('Module:')){onModuleAction(action.slice(7));return;}
        if(action.startsWith('Utility:')){onUtilityAction(action.slice(8));return;}
        render();
    }
    const settingsControls=()=>[
        {action:'TextDown',label:'A−',ariaLabel:'Decrease text size',x:56,y:224,width:188,height:62},
        {action:'TextUp',label:'A+',ariaLabel:'Increase text size',x:756,y:224,width:188,height:62},
        {action:'ScaleDown',label:'−',ariaLabel:'Decrease spatial scale',x:56,y:316,width:188,height:62},
        {action:'ScaleUp',label:'+',ariaLabel:'Increase spatial scale',x:756,y:316,width:188,height:62},
        {action:'Recenter',label:'◎  Recenter panel',x:56,y:408,width:888,height:62}
    ];
    function renderSettings(){
        settingsElement.hidden=!settingsOpen || hidden || detached;
        element.classList.toggle('has-settings-companion',settingsOpen);
        if(settingsElement.hidden)return;
        settingsElement.innerHTML='<header><h2>Settings</h2></header><section><div class="nlxr-settings-actions"></div><p class="nlxr-scale-readout">Spatial scale · '+Math.round(spatialScale*100)+'%</p><h3>Safety</h3><p>Keep a clear walking area and remain aware of people, plants, furniture and uneven ground around you.</p><h3>Help</h3><p>'+INFO_HELP+'</p></section>';
        const actions=settingsElement.querySelector('.nlxr-settings-actions');
        settingsControls().forEach(item=>actions.append(makeButton(item)));
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
    function progressState(){
        if(!headerProgress?.steps?.length)return null;
        const activeIndex=Math.max(0,headerProgress.steps.findIndex(step=>step.id===headerProgress.activeId));
        return {...headerProgress,activeIndex,current:headerProgress.steps[activeIndex]};
    }
    function syncHeaderProgress(target=element.querySelector('.nlxr-control-header')){
        if(!target)return;
        target.querySelector('.nlxr-panel-progress')?.remove();
        const progress=progressState();
        if(!progress)return;
        const region=document.createElement('section');region.className='nlxr-panel-progress';region.setAttribute('aria-label',progress.label);
        const heading=document.createElement('div');heading.className='nlxr-panel-progress-heading';
        const label=document.createElement('strong');label.textContent=progress.label;
        const status=document.createElement('span');status.textContent=`${progress.activeIndex+1} of ${progress.steps.length} · ${progress.current.label}`;status.setAttribute('aria-live','polite');
        heading.append(label,status);
        const list=document.createElement('ol');
        progress.steps.forEach((step,index)=>{
            const item=document.createElement('li');item.classList.toggle('is-complete',index<progress.activeIndex);item.classList.toggle('is-current',index===progress.activeIndex);
            if(index===progress.activeIndex)item.setAttribute('aria-current','step');
            const marker=document.createElement('i');marker.setAttribute('aria-hidden','true');
            const text=document.createElement('span');text.textContent=step.label;
            item.append(marker,text);list.append(item);
        });
        region.append(heading,list);target.prepend(region);
    }
    function syncPanelWings(){
        if(isDesktopDemo()){railCollapsed=false;mediaCollapsed=false;}
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
        if(header){header.querySelector('h2').textContent=identity?.plant || selection?.plant || 'Control panel';header.querySelector('.nlxr-control-identity').textContent=identity?.scientific || (identity?'Selected plant':'Your exploration guide');syncHeaderProgress(header);}
        const detailsTab=element.querySelector('[data-info-action="Details"]');
        if(detailsTab)detailsTab.textContent=contentKind()==='pim'?'Plant':'Selected topic';
        if(tab==='Help'){content.setAttribute('aria-labelledby',contentId+'-Help');content.removeAttribute('aria-label');}
        else{content.removeAttribute('aria-labelledby');content.setAttribute('aria-label','Information');}
        content.querySelector('h3').textContent=title();
        content.querySelector('.nlxr-info-trail').textContent=tab==='Details'?selection?.breadcrumb || '':'';
        content.querySelector('.nlxr-info-body').textContent=currentPages[page].join('\n');
        content.querySelector('small').textContent=metadata();
        let pager=content.querySelector('.nlxr-content-pager');
        if(!pager && currentPages.length>1){pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');content.append(pager);}
        if(pager)pager.replaceChildren(...controls().filter(item=>item.kind==='pager').map(makeButton));
        let guides=content.querySelector('.nlxr-guide-actions');
        if(tab==='Help' && !guides){guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');content.append(guides);}
        if(guides){if(tab==='Help')guides.replaceChildren(...controls().filter(item=>item.kind==='module' && !item.disabled).map(makeButton));else guides.remove();}
        const count=element.querySelector('.nlxr-control-page');
        if(count)count.textContent=(page+1)+' / '+currentPages.length;
        const media=element.querySelector('.nlxr-media-wing');
        if(media){
            const preview=previewMedia(),figure=media.querySelector('.nlxr-plant-preview'),empty=media.querySelector('.nlxr-media-empty');
            const desktopDemo=isDesktopDemo();
            if(desktopDemo && (railCollapsed || mediaCollapsed)){railCollapsed=false;mediaCollapsed=false;syncPanelWings();}
            const mediaToggle=media.querySelector('.nlxr-media-toggle');
            if(mediaToggle && desktopDemo)mediaToggle.remove();
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
        renderSettings();
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
        const plantPreviewAvailable=showPlantPreview();
        const desktopDemo=isDesktopDemo();
        if(desktopDemo){railCollapsed=false;mediaCollapsed=false;}
        const showMediaWing=plantPreviewAvailable || element.classList.contains('is-demo-panel') || element.classList.contains('is-creator-panel');
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
            header.append(hideButton);
            if(!desktopDemo){const moveButton=document.createElement('button');moveButton.type='button';moveButton.className='nlxr-panel-move';moveButton.textContent='✋';moveButton.setAttribute('aria-label','Grab and move Control panel');bindPanelMove(moveButton);header.append(moveButton);}
            header.append(plant,scientific);element.append(header);syncHeaderProgress(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
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
            const content=document.createElement('section');content.id=contentId;content.setAttribute('role','tabpanel');if(tab==='Help')content.setAttribute('aria-labelledby',contentId+'-Help');else content.setAttribute('aria-label','Information');content.tabIndex=0;
            const heading=document.createElement('h3');heading.textContent=title();
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.textContent=tab==='Details'?selection?.breadcrumb || '':'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,body,status);
            const pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');controls().filter(item=>item.kind==='pager').forEach(item=>pager.append(makeButton(item)));if(pager.childElementCount)content.append(pager);
            if(tab==='Help'){const guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');controls().filter(item=>item.kind==='module' && !item.disabled).forEach(item=>guides.append(makeButton(item)));if(guides.childElementCount)content.append(guides);}
            element.append(content);
            if(showMediaWing){
                const media=document.createElement('aside');media.className='nlxr-media-wing';media.setAttribute('aria-label',selection?.mesh==='lim'?'Pathway illustration':'Plant media');
                if(!desktopDemo){const mediaToggle=makePanelToggle('Media','nlxr-media-toggle',()=>{mediaCollapsed=!mediaCollapsed;mediaTouched=true;},!mediaCollapsed);mediaToggle.setAttribute('aria-label',mediaCollapsed?'Open plant media':'Collapse plant media');media.append(mediaToggle);}
                if(showPlantPreview()){const figure=document.createElement('figure');figure.className='nlxr-plant-preview';const image=document.createElement('img');const preview=previewMedia();image.src=preview.image;image.alt=preview.alt || '';image.decoding='async';const caption=document.createElement('figcaption');caption.textContent=preview.caption;figure.append(image,caption);media.append(figure);}
                else{const empty=document.createElement('p');empty.className='nlxr-media-empty';empty.textContent='Plant imagery and references appear here when a plant is selected.';media.append(empty);}
                element.append(media);
            }
            const tools=document.createElement('footer');tools.className='nlxr-tools-dock';tools.setAttribute('aria-label','Control panel tools');
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Reading controls');controls().filter(item=>!item.kind && item.action!=='Hide' && !item.disabled).forEach(item=>nav.append(makeButton(item)));if(nav.childElementCount)tools.append(nav);
            if(utilityActions.length){const utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');controls().filter(item=>item.kind==='utility').forEach(item=>utilities.append(makeButton(item)));if(utilities.childElementCount)tools.append(utilities);}
            element.append(tools);
            if(tab==='Details' && pages().length>1){const count=document.createElement('small');count.className='nlxr-control-page';count.textContent=(page+1)+' / '+pages().length;element.append(count);}
        }
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();
        act('Help');
        element.querySelector('[data-info-action="'+tab+'"]')?.focus();
    });
    element.addEventListener('beforexrselect',event=>event.preventDefault());
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    function canvas(card){
        const c=document.createElement('canvas');c.width=1000;c.height=card.hidden?160:card.height;const ctx=c.getContext('2d');
            const gradient=ctx.createLinearGradient(0,0,1000,c.height);gradient.addColorStop(0,'rgba(39,57,73,.96)');gradient.addColorStop(1,'rgba(9,20,31,.94)');
        ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,992,c.height-8,24);ctx.fill();ctx.strokeStyle=card.guided?'#93d9f2':'rgba(166,204,229,.72)';ctx.lineWidth=card.guided?4:2;ctx.stroke();ctx.textBaseline='top';
        ctx.fillStyle='rgba(139,211,241,.85)';ctx.fillRect(22,10,96,4);
        if(card.media){
            ctx.fillStyle='#dfff9b';ctx.font='700 22px system-ui';ctx.fillText('PLANT MEDIA',48,34,904);
            ctx.fillStyle='#f3f8fc';ctx.font='700 42px system-ui';ctx.fillText(card.title || 'Selected plant',48,72,904);
            const imageX=48,imageY=142,imageWidth=904,imageHeight=c.height-212;
            ctx.fillStyle='rgba(3,12,18,.78)';ctx.beginPath();ctx.roundRect(imageX,imageY,imageWidth,imageHeight,20);ctx.fill();
            if(card.image){const scale=Math.min(imageWidth/card.image.naturalWidth,imageHeight/card.image.naturalHeight),w=card.image.naturalWidth*scale,h=card.image.naturalHeight*scale;ctx.drawImage(card.image,imageX+(imageWidth-w)/2,imageY+(imageHeight-h)/2,w,h);}
            ctx.fillStyle='#d2e0e8';ctx.font='600 23px system-ui';ctx.fillText(card.caption || 'Plant reference image',48,c.height-48,904);
            return c;
        }
            if(card.settings){
            ctx.fillStyle='#f3f8fc';ctx.font='700 48px system-ui';ctx.fillText('Settings',56,46,888);
            ctx.fillStyle='#dfff9b';ctx.font='650 26px system-ui';ctx.textAlign='center';ctx.fillText('Text size',500,238,450);ctx.fillText(`Spatial scale · ${Math.round(spatialScale*100)}%`,500,330,450);ctx.textAlign='left';
            ctx.fillStyle='#f3f8fc';ctx.font='650 29px system-ui';ctx.fillText('Safety',56,500,888);
            ctx.fillStyle='#c9e0ed';ctx.font='500 22px system-ui';infoPages('Keep a clear walking area and remain aware of people, plants, furniture and uneven ground.',72,2)[0].forEach((line,index)=>ctx.fillText(line,56,538+index*28,888));
            ctx.fillStyle='#f3f8fc';ctx.font='650 27px system-ui';ctx.fillText('Help',56,610,888);
            ctx.fillStyle='#c9e0ed';ctx.font='500 21px system-ui';infoPages(INFO_HELP,76,2)[0].forEach((line,index)=>ctx.fillText(line,56,644+index*26,888));
            card.controls.forEach(button=>{const face=ctx.createLinearGradient(button.x,button.y,button.x,button.y+button.height);face.addColorStop(0,button.primary?'#d5f4fb':'rgba(119,169,198,.56)');face.addColorStop(1,button.primary?'#60add1':'rgba(26,52,78,.84)');ctx.fillStyle=face;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,16);ctx.fill();ctx.strokeStyle='rgba(232,244,240,.48)';ctx.stroke();ctx.fillStyle=button.primary?'#102b3a':'#f1f7fb';ctx.font='700 27px system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+18,button.width-18);});
            return c;
        }
        if(card.headset && !card.hidden){
            const rail=card.railCollapsed?62:200,media=0;
            const left=rail+22,right=1000-media-22,width=right-left;
            const headerBottom=card.progress?155:116;
            ctx.fillStyle='rgba(5,15,27,.68)';ctx.fillRect(6,headerBottom,rail,c.height-headerBottom-7);
            ctx.fillStyle='rgba(8,22,34,.7)';ctx.fillRect(1000-media,headerBottom,media-6,c.height-headerBottom-7);
            ctx.fillStyle='rgba(157,208,235,.36)';ctx.fillRect(left,headerBottom+1,width,2);
            if(card.progress){
                const progressRight=718,progressWidth=Math.max(180,progressRight-left),stepWidth=progressWidth/Math.max(1,card.progress.steps.length-1),barY=48;
                ctx.fillStyle='#dfff9b';ctx.font='700 17px system-ui';ctx.textAlign='left';ctx.fillText(`${card.progress.activeIndex+1} / ${card.progress.steps.length} · ${card.progress.current.label.toUpperCase()}`,left,20,progressWidth);ctx.textAlign='left';
                ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(left,barY,progressWidth,3);
                ctx.fillStyle='#dfff9b';ctx.fillRect(left,barY,Math.max(3,stepWidth*card.progress.activeIndex),3);
                card.progress.steps.forEach((step,index)=>{const x=left+stepWidth*index;ctx.beginPath();ctx.arc(x,barY+1.5,index===card.progress.activeIndex?7:5,0,Math.PI*2);ctx.fillStyle=index<=card.progress.activeIndex?'#dfff9b':'#536469';ctx.fill();});
            }
            ctx.fillStyle='#f3f8fc';ctx.font='650 42px system-ui';ctx.fillText(card.plant,left,card.progress?72:23,Math.max(100,width-150));
            ctx.fillStyle='#c9e0ed';ctx.font='500 29px system-ui';ctx.fillText(card.scientific,left,card.progress?121:76,width);
            let y=headerBottom+40;
            if(card.pathway){
                ctx.fillStyle='#badbc1';ctx.font='600 24px system-ui';ctx.fillText(card.pathway.title,left,y,width);y+=35;
                ctx.fillStyle='#d4e0dc';ctx.font='400 23px system-ui';ctx.fillText(card.pathway.progress,left,y,width);y+=34;
                infoPages(card.pathway.explanation,Math.max(26,Math.floor(width/13)),2)[0].forEach(line=>{ctx.fillText(line,left,y,width);y+=24;});y+=16;
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.fillRect(left,y-3,6,34);}
            ctx.fillStyle='#f3f8fc';ctx.font='650 38px system-ui';ctx.fillText(card.title,left+12,y,width-12);y+=51;
            ctx.fillStyle='#c9e0ed';ctx.font='500 27px system-ui';ctx.fillText(card.trail,left,y,width);y+=45;
            const actionTop=Math.min(...card.controls.filter(item=>item.kind==='utility'||['TextSize','Recenter'].includes(item.action)).map(item=>item.y),card.height-90);
            const contentBottom=actionTop-22;
            ctx.save();ctx.beginPath();ctx.rect(left,y,width,Math.max(0,contentBottom-y));ctx.clip();
            ctx.fillStyle='#f3f8fc';ctx.font=(card.largeText?'500 47px':'500 42px')+' system-ui';
            const lineHeight=card.largeText?56:50;
            card.lines.forEach(line=>{ctx.fillText(line,left,y,width);y+=lineHeight;});ctx.restore();
            ctx.fillStyle='#d4e0dc';ctx.font='400 22px system-ui';ctx.fillText(card.metadata,left,card.height-27,width);
            if(card.tab==='Details' && card.page)ctx.fillText(card.page,right-65,card.height-20,65);
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
            if(button.primary){face.addColorStop(0,'rgba(213,244,251,.98)');face.addColorStop(.55,'rgba(152,215,235,.96)');face.addColorStop(1,'rgba(96,173,209,.98)');}
            else if(button.selected){face.addColorStop(0,'rgba(140,205,235,.5)');face.addColorStop(1,'rgba(56,112,150,.4)');}
            else if(button.disabled){face.addColorStop(0,'rgba(211,220,225,.05)');face.addColorStop(1,'rgba(211,220,225,.025)');}
            else if(button.action==='Utility:close'){face.addColorStop(0,'rgba(159,101,82,.44)');face.addColorStop(1,'rgba(94,51,45,.38)');}
            else if(button.kind==='toggle'||button.kind==='handle'){face.addColorStop(0,'rgba(174,232,252,.4)');face.addColorStop(1,'rgba(61,137,177,.2)');}
            else {face.addColorStop(0,'rgba(119,169,198,.34)');face.addColorStop(.5,'rgba(56,93,122,.56)');face.addColorStop(1,'rgba(26,52,78,.74)');}
            ctx.fillStyle=face;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,radius);ctx.fill();
            if(button.kind!=='tab' && !button.disabled){ctx.strokeStyle='rgba(232,244,240,.42)';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='rgba(255,255,255,.2)';ctx.fillRect(button.x+radius,button.y+2,button.width-radius*2,1.5);}
            if(button.selected){ctx.fillStyle='#9adcf4';ctx.fillRect(button.x,button.y+9,4,button.height-18);}
            ctx.fillStyle=button.disabled?'#899297':button.primary?'#102b3a':button.kind==='toggle'||button.kind==='handle'?'#a9e7fa':'#f1f7fb';ctx.font=(button.primary?'750 ':button.kind==='toggle'||button.kind==='handle'?'700 ':'600 ')+(button.kind==='toggle'||button.kind==='handle'?'35px':'32px')+' system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+(button.height-(button.kind==='toggle'||button.kind==='handle'?38:37))/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;return renderer.hit(ray);}
    const controlsForTarget=target=>target?.card?.settings?settingsControls():(headset?spatialControls():controls());
    const api={element,
        showLearning(content){
            const wasDetails=tab==='Details';
            record=null;identity=null;selection={...content,sources:[],editable:false,mesh:content?.mesh || 'lim'};
            mediaImage=null;const token=++mediaLoadToken;
            if(content?.image && !mediaTouched)mediaCollapsed=false;
            if(content?.image){const image=new Image();image.decoding='async';image.onload=()=>{if(token===mediaLoadToken)mediaImage=image;};image.onerror=()=>{if(token===mediaLoadToken)mediaImage=null;};image.src=content.image;}
            tab='Details';hidden=false;page=0;if(wasDetails)updateReading();else render();
        },
        setLearningModules(value,{open=false}={}){const previousTab=tab;moduleContext=value?{...value,actions:[...(value.actions||[])]}:null;if(open && moduleContext)tab='Help';page=0;if(previousTab==='Details' && tab==='Details')updateReading();else render();},
        setMeshComposition(value){meshContext=value?{...value,items:[...(value.items || [])]}:null;page=0;updateReading();},
        setUtilityActions(items=[]){utilityActions=items.slice(0,8).map(item=>({...item}));render();},
        setHeaderProgress(value){headerProgress=value?.steps?.length?{label:String(value.label || 'Progress'),activeId:String(value.activeId || value.steps[0].id),steps:value.steps.map(step=>({id:String(step.id),label:String(step.label)}))}:null;render();},
        setContextualHint(message=''){contextHint=String(message || '');page=0;updateReading();},
        setCompact(value=true){const compact=Boolean(value) && !isDesktopDemo();railCollapsed=false;if(compact)mediaCollapsed=true;else if(isDesktopDemo())mediaCollapsed=false;element.classList.toggle('is-opening-compact',compact);if(!element.querySelector('.nlxr-media-wing') && (element.classList.contains('is-demo-panel') || element.classList.contains('is-creator-panel')))render(true);else syncPanelWings();},
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;render();},
        setPathwayContext(value){pathwayContext=value ? {...value,actions:[...(value.actions || [])]} : null;updatePathway();},
        setGuided(value){guided=Boolean(value);element.classList.toggle('is-guided',guided);},
        setIntroduction(value){introduction=Boolean(value);element.classList.toggle('is-intro-reveal',introduction);},
        focusPlant(nextRecord,document,media=null){
            const wasDetails=tab==='Details';
            const previousMedia=record===nextRecord ? identity?.media : null;
            const previousHint=record===nextRecord ? identity?.hint : '';
            const identityImage=document?.identity?.image;
            const nextMedia=media?.image ? {image:String(media.image),alt:String(media.alt || '')}
                : identityImage ? {image:String(identityImage),alt:String(document.identity.commonName || document.identity.scientificName || 'Plant')}
                    : previousMedia;
            record=nextRecord;selection=null;identity={plant:document.identity?.commonName || document.identity?.scientificName || 'Plant',scientific:document.identity?.scientificName || '',media:nextMedia,hint:String(media?.hint || previousHint || '')};mediaImage=null;
            if(nextMedia?.image && !mediaTouched)mediaCollapsed=false;
            const token=++mediaLoadToken;
            if(nextMedia?.image){const image=new Image();image.decoding='async';image.onload=()=>{if(token===mediaLoadToken)mediaImage=image;};image.onerror=()=>{if(token===mediaLoadToken)mediaImage=null;};image.src=nextMedia.image;}
            tab='Details';page=0;if(wasDetails)updateReading();else render();
        },
        select(nextRecord,document,path){const next=pimInfoContent(document,path);if(!next)return false;const wasDetails=tab==='Details';const sameRecord=record===nextRecord,previous=sameRecord?identity?.media:null,previousHint=sameRecord?identity?.hint:'';const image=document?.identity?.image;const media=image?{image:String(image),alt:String(document.identity.commonName || document.identity.scientificName || 'Plant')}:previous;record=nextRecord;selection=next;identity={plant:next.plant,scientific:document.identity?.scientificName || '',media,hint:previousHint};if(media?.image && !mediaTouched)mediaCollapsed=false;tab='Details';hidden=false;page=0;if(wasDetails)updateReading();else render();return true;},
        refresh(nextRecord,document){if(record===nextRecord && selection)api.select(record,document,selection.id);},
        suspend(value){element.style.visibility=value?'hidden':'';detached=Boolean(value);renderSettings();if(!value){updateReading();updatePathway();}},
        attach(gl){renderer?.destroy();renderer=createSpatialTotemCards(gl,{canvas,surfaces:(_position,_viewRight,cards)=>{
            if(!pose)return [];
            const mainWidth=(hidden?.38:headset?1:.66)*spatialScale,mainHeight=(hidden?.11:headset?.54:spatialHeight()/1000*.66)*spatialScale;
            const surfaces=[{...pose,width:mainWidth,height:mainHeight,card:cards[0]}];
            const settingsCard=cards.find(card=>card.settings),mediaCard=cards.find(card=>card.media);
            const settingsWidth=.62*spatialScale,mediaWidth=.66*spatialScale,gap=.012,companionHeight=.54*spatialScale;
            if(settingsOpen && !hidden && settingsCard){const offset=mainWidth/2+settingsWidth/2+gap;surfaces.push({...companionPanelPose(pose,'left',offset),width:settingsWidth,height:companionHeight,card:settingsCard});}
            if(!hidden && mediaCard){const offset=mainWidth/2+mediaWidth/2+gap;surfaces.push({...companionPanelPose(pose,'right',offset),width:mediaWidth,height:companionHeight,card:mediaCard});}
            return surfaces;
        }});element.hidden=true;settingsElement.hidden=true;},
        update(matrix,time=performance.now(),inputRay=null,xrFrame=null){
            const next=infoPanelPose(matrix,heading,headset,phoneAR);if(!next)return;heading=next.anchorHeading;
            let heldTransform=null;
            if(spatialMove && xrFrame?.getPose && spatialMove.source?.targetRaySpace && spatialMove.referenceSpace){
                try{heldTransform=xrFrame.getPose(spatialMove.source.targetRaySpace,spatialMove.referenceSpace)?.transform.matrix || null;}catch{heldTransform=null;}
            }
            const heldRay=heldTransform?{origin:{x:heldTransform[12],y:heldTransform[13],z:heldTransform[14]},direction:{x:-heldTransform[8],y:-heldTransform[9],z:-heldTransform[10]}}:xrFrame?null:inputRay;
            if(spatialMove && heldRay?.origin && heldRay?.direction){
                pose ||= next;
                pose.center=panelCenterFromGrab(heldRay,spatialMove,pose);
                const facing=facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]});
                pose={...pose,...facing,anchorHeading:facing.right};heading=facing.right;
                manuallyPositioned=true;
            }else if(!pose){
                pose=next;
                if(headset && firstPlacement){
                    pose.center={x:pose.center.x-pose.right.x*.6,y:pose.center.y,z:pose.center.z-pose.right.z*.6};
                    pose={...pose,...facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
                }
                firstPlacement=false;
            }
            lastTime=time;
        },
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;},
        getPosition(){return pose?.center ? {...pose.center} : null;},
        draw(view){
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const card={id:'control',headset,hidden,tab,height:spatialHeight(),largeText,guided,fadeDuration:introduction?1500:450,controls:headset?spatialControls():controls(),railCollapsed,mediaCollapsed,pathway:pathwayContext,progress:progressState(),accent:selection?.mesh==='lim'?selection.accent:'',plant:identity?.plant || selection?.plant || 'Control panel',scientific:identity?.scientific || (identity?'Selected plant':'Your exploration guide'),title:title(),trail:tab==='Details'?selection?.breadcrumb || '':'',lines:p[page],page:p.length>1?(page+1)+' / '+p.length:'',metadata:metadata()};
            const settingsCard={id:'settings',settings:true,height:spatialHeight(),controls:settingsControls()};
            const preview=previewMedia(),mediaCard={id:'media',media:true,height:760,title:identity?.plant || selection?.plant || 'Plant',image:mediaImage,caption:preview?.caption || 'Plant reference image'};
            const cards=[card];if(settingsOpen)cards.push(settingsCard);if(!mediaCollapsed && preview?.image)cards.push(mediaCard);
            renderer.begin();renderer.draw(view,{id:'companion'},pose.center,cards,'');renderer.end();
        },hit,
        activate(ray){const target=hit(ray);if(!target)return false;const x=(target.localX/target.width+.5)*1000,y=(.5-target.localY/target.height)*(hidden?160:spatialHeight());
            const button=controlsForTarget(target).find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);if(button && button.action!=='MovePanel')act(button.action);return true;},
        bindSession(session,referenceSpace){removeXrControls();const handle=event=>{
            if(event.type==='selectstart' && finishingMoveSource===event.inputSource)finishingMoveSource=null;
            if(event.type==='selectend' && spatialMove?.source===event.inputSource){finishingMoveSource=event.inputSource;spatialMove=null;event.stopImmediatePropagation();return;}
            if(event.type==='select' && (spatialMove?.source===event.inputSource || finishingMoveSource===event.inputSource)){finishingMoveSource=null;event.stopImmediatePropagation();return;}
            const transform=event.frame?.getPose(event.inputSource.targetRaySpace,referenceSpace)?.transform.matrix;if(!transform)return;
            const ray={origin:{x:transform[12],y:transform[13],z:transform[14]},direction:{x:-transform[8],y:-transform[9],z:-transform[10]}};
            const target=hit(ray);if(!target)return;
            event.stopImmediatePropagation();
            const x=(target.localX/target.width+.5)*1000,y=(.5-target.localY/target.height)*(hidden?160:spatialHeight());
            const button=controlsForTarget(target).find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height);
            if(event.type==='selectstart' && button?.action==='MovePanel'){
                spatialMove={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY};
                return;
            }
            if(event.type==='select' && !spatialMove)api.activate(ray);
        };for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);
            removeXrControls=()=>{for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);};},
        destroy(){mediaLoadToken++;mediaImage=null;removeXrControls();renderer?.destroy();renderer=null;element.remove();settingsElement.remove();}
    };render();return api;
}
