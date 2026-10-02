import {ORB_MODELS,getSpatialVisualSettings,currentInfoOpacity,currentOrbModel,setSpatialVisualSettings} from './spatialVisualSettings.js';
import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';
import { handTrackingState } from './xrPointer.js';

export const INFO_HELP = `Aim at an object to highlight it. Press a plant cell once to read or expand its information here. Select a Plant Orb to explore information connected to that plant.

Build this in Project Creator
Areas organise real places. Totems welcome and orient visitors. Plant Orbs connect PIMO to actual plants, while Notes preserve observations, instructions and provenance. Area links create routes between physical locations. Project maps can use plans, aerial images, hand-drawn layouts or mapped positions, and published information can be updated as a site changes.

NLXR connects knowledge to real plants and real places. Check information against the plant, season and conditions around you. Visual weather is an experience effect, not a sensor reading. Keep location, source and date with local observations.`;
const PANEL_GRAB_HOLD_MS = 800;
const PANEL_GRAB_CANCEL_DISTANCE_PX = 14;

// This is a reading projection, never a second store of plant knowledge.
export function pimInfoContent(document, path) {
    const node = document?.nodes?.find(item => item.id === path || item.path === path);
    if (!node) return null;
    return { id: node.id, path: node.path, title: node.title,
        plant: document.identity?.commonName || document.identity?.scientificName || document.plantId,
        breadcrumb: [...pimAncestors(document, node.id).map(item => item.title), node.title].join(' › '),
        body: node.body || 'No detailed information has been added to this cell yet.',
        media: (node.media || []).find(item => item && (item.image || item.url || item.src)) || null,
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
export function companionPanelPose(pose, side, mainWidth, companionWidth, angleDegrees = 18, gap = 0) {
    const direction=side==='left'?-1:1,turn=side==='left'?1:-1;
    const radians=angleDegrees*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);
    const right={x:pose.right.x*cos-pose.normal.x*sin*turn,y:pose.right.y*cos-pose.normal.y*sin*turn,z:pose.right.z*cos-pose.normal.z*sin*turn};
    const normal={x:pose.normal.x*cos+pose.right.x*sin*turn,y:pose.normal.y*cos+pose.right.y*sin*turn,z:pose.normal.z*cos+pose.right.z*sin*turn};
    const hingeDistance=mainWidth/2+gap/2,companionDistance=companionWidth/2+gap/2;
    const hinge={x:pose.center.x+pose.right.x*hingeDistance*direction,y:pose.center.y+pose.right.y*hingeDistance*direction,z:pose.center.z+pose.right.z*hingeDistance*direction};
    return {...pose,right,normal,center:{x:hinge.x+right.x*companionDistance*direction,y:hinge.y+right.y*companionDistance*direction,z:hinge.z+right.z*companionDistance*direction}};
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

// Keep the point under the user's ray fixed when the panel is grabbed.
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
    if(hidden)return [{action:'Restore',label:'Control panel',x:150,y:28,width:700,height:104}];
    const utilities=utilityActions.slice(0,8),primary=utilities.find(item=>item.primary || item.id==='continue');
    const menuUtilities=utilities.filter(item=>['close','lim-visibility'].includes(item.id))
        .sort((a,b)=>({close:0,'lim-visibility':1}[a.id]-({close:0,'lim-visibility':1}[b.id])));
    const historyUtilities=utilities.filter(item=>['back','forward'].includes(item.id));
    const secondary=utilities.filter(item=>item!==primary && !menuUtilities.includes(item) && !historyUtilities.includes(item));
    const secondaryRows=Math.ceil(secondary.length/2),primaryHeight=primary?68:0,moduleRows=tab==='Help'?moduleActions.length:0;
    const primaryY=height-22-primaryHeight,secondaryStart=primaryY-secondaryRows*62;
    const actionY=secondaryStart-moduleRows*58-62;
    const buttons=[];
    buttons.push({action:'Help',label:'Help',kind:'tab',selected:tab==='Help',x:18,y:148,width:174,height:56});
    buttons.push({action:'Settings',label:'Settings',kind:'menu',x:18,y:216,width:174,height:56});
    menuUtilities.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.id==='close'?'Close demo':item.label,ariaLabel:item.ariaLabel || item.label,title:item.description,description:item.description,kind:'menu',disabled:Boolean(item.disabled),x:18,y:284+index*62,width:174,height:54}));
    buttons.push({action:'Hide',label:'Hide',kind:'menu',x:18,y:284+menuUtilities.length*62,width:174,height:54});
    if(pageCount>1)buttons.push({action:'Previous',label:'‹',ariaLabel:'Previous page',kind:'pager',x:852,y:130,width:52,height:42,disabled:page===0},{action:'Next',label:'›',ariaLabel:'Next page',kind:'pager',x:910,y:130,width:52,height:42,disabled:page>=pageCount-1});
    historyUtilities.filter(item=>item.id!=='forward' || !item.disabled).forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.id==='back'?'‹':'›',ariaLabel:item.label,title:item.description,kind:'history',disabled:Boolean(item.disabled),x:18+index*56,y:284+(menuUtilities.length+1)*62,width:48,height:42}));
    pathwayActions.slice(0,3).forEach((item,index)=>buttons.push({action:item.action,label:item.label,kind:'pathway',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238+index*244,y:actionY-moduleRows*58-62,width:226,height:48}));
    if(tab==='Help')moduleActions.forEach((item,index)=>buttons.push({action:'Module:'+item.id,label:item.label,kind:'module',primary:Boolean(item.primary),disabled:Boolean(item.disabled),x:238,y:actionY-moduleRows*58+index*58,width:732,height:48}));
    secondary.forEach((item,index)=>buttons.push({action:'Utility:'+item.id,label:item.label,kind:'utility',disabled:Boolean(item.disabled),x:index%2?608:238,y:secondaryStart+Math.floor(index/2)*62,width:index%2?362:350,height:54}));
    if(primary)buttons.push({action:'Utility:'+primary.id,label:primary.label,kind:'utility',primary:true,disabled:Boolean(primary.disabled),x:238,y:primaryY,width:732,height:68});
    return buttons;
}
export function optionalPanelControl(items=[],action=''){
    return Array.isArray(items)?items.find(item=>item?.action===action) || null:null;
}
export function controlPanelHeight(lines,largeText=false,pathway=false,utilities=0,moduleCount=0){
    const items=Array.isArray(utilities)?utilities.slice(0,8):[],count=items.length || Math.min(8,Number(utilities)||0);
    const hasPrimary=items.some(item=>item.primary || item.id==='continue');
    const rows=Math.ceil((count-(hasPrimary?1:0))/2)+(hasPrimary?1:0);
    return Math.max(pathway?760:620,390+Math.min(7,lines)*(largeText?46:38)+(pathway?120:0))+(rows+moduleCount)*62+(hasPrimary?10:0);
}

// One row model drives both the DOM companion and the Quest canvas/hit regions.
export function panelSettingsControls({headset=false,handVisualMode='pointer',spatialScale=1,meshCellOpacity=1,ambientRain=1,ambientRainStyle='v2',performanceSettings=null,infoOpacity=.38,orbModel='improved',rainEnabled=true}={}){
    const row=index=>90+index*54,shift=headset?1:0;
    return [
        ...(headset?[{action:'HandMode',label:handVisualMode==='pointer'?'Pointer':'Outline',ariaLabel:'Switch hand tracking visual mode',settingGroup:'hands',settingLabel:'Hands',x:756,y:row(0),width:188,height:42}]:[]),
        {action:'TextDown',label:'A−',ariaLabel:'Decrease text size',settingGroup:'text',settingLabel:'Text size',x:756,y:row(shift),width:88,height:42},
        {action:'TextUp',label:'A+',ariaLabel:'Increase text size',settingGroup:'text',x:856,y:row(shift),width:88,height:42},
        {action:'ScaleDown',label:'−',ariaLabel:'Decrease spatial scale',settingGroup:'scale',settingLabel:`Spatial scale · ${Math.round(spatialScale*100)}%`,x:756,y:row(shift+1),width:88,height:42},
        {action:'ScaleUp',label:'+',ariaLabel:'Increase spatial scale',settingGroup:'scale',x:856,y:row(shift+1),width:88,height:42},
        {action:'CellOpacity',label:`Glass · ${Math.round(meshCellOpacity*100)}%`,ariaLabel:'Change PIMO and LIMO cell glass opacity',settingGroup:'opacity',settingLabel:'Cell glass',x:756,y:row(shift+2),width:188,height:42},
        {action:'InfoOpacity',label:`${Math.round(infoOpacity*100)}%`,ariaLabel:'Change control panel and main screen background opacity',settingGroup:'info-opacity',settingLabel:'Info background opacity',x:756,y:row(shift+3),width:188,height:42},
        {action:'OrbModel',label:ORB_MODELS[orbModel]?.label || 'Improved',ariaLabel:'Change Plant Orb model: Basic, Improved or Advanced',settingGroup:'orb-model',settingLabel:'Plant Orb model',x:756,y:row(shift+4),width:188,height:42},
        {action:'RainIntensity',label:ambientRain<=0?'Off':ambientRain<1?'Light':ambientRain>1?'Heavy':'Normal',ariaLabel:'Change rain intensity',settingGroup:'rain',settingLabel:'Rain intensity',x:756,y:row(shift+5),width:188,height:42},
        {action:'RainStyle',label:ambientRainStyle.toUpperCase(),ariaLabel:'Switch rain visual style',settingGroup:'style',settingLabel:'Rain style',x:756,y:row(shift+6),width:188,height:42},
        ...(headset && performanceSettings ? [
            {action:'RefreshRate',label:performanceSettings.pending?'Applying...':performanceSettings.rate==='auto'?'Auto':`${performanceSettings.rate} Hz`,disabled:performanceSettings.pending || !performanceSettings.supported.length,ariaLabel:'Cycle supported XR refresh rates',settingGroup:'refresh',settingLabel:`Refresh rate / ${performanceSettings.actual || 'unknown'} Hz active`,x:756,y:row(shift+8),width:188,height:42},
            {action:'ShowFps',label:performanceSettings.showFps?'On':'Off',ariaLabel:'Show measured XR FPS',settingGroup:'fps',settingLabel:'Show FPS',x:756,y:row(shift+9),width:188,height:42}
        ]:[]),
        {action:'Recenter',label:'Recenter',ariaLabel:'Recenter panel',settingGroup:'position',settingLabel:'Panel position',x:756,y:row(shift+7),width:188,height:42}
    ].filter(item=>rainEnabled || !['RainIntensity','RainStyle'].includes(item.action)).map(item=>!rainEnabled && item.y>=row(shift+7)?{...item,y:item.y-108}:item).map(item=>item.width!==188?item:{...item,width:Math.max(96,Math.min(188,item.label.length*12+32)),x:944-Math.max(96,Math.min(188,item.label.length*12+32))});
}

// The headset uses the same actions as the screen panel, but lays them out in
// three independently collapsible regions. These rectangles also drive ray hits.
export function spatialPanelControls({hidden=false,height=800,railCollapsed=false,mediaCollapsed=true,items=[]}={}){
    if(hidden)return [{action:'Restore',label:'Control panel',x:150,y:28,width:700,height:104}];
    const rail=164,media=0;
    const left=rail+22,width=1000-rail-44;
    const button=(item,x,y,w,h)=>({...item,description:item.description || controlDescription(item),x,y,width:w,height:h});
    const result=[];
    items.filter(item=>['tab','menu'].includes(item.kind)).forEach((item,index)=>result.push(button(item,16,150+index*50,rail-28,40)));
    const primary=items.find(item=>item.kind==='utility' && (item.primary || item.action==='Utility:continue'));
    const secondary=items.filter(item=>item.kind==='utility' && item!==primary);
    const pager=items.filter(item=>item.kind==='pager');
    const history=items.filter(item=>item.kind==='history');
    const module=items.filter(item=>item.kind==='module'),pathway=items.filter(item=>item.kind==='pathway');
    const primaryY=primary?height-82:height-20;
    if(primary)result.push(button(primary,left,primaryY,width,64));
    pager.forEach((item,index)=>result.push(button(item,left+width-(pager.length-index)*46,98,40,34)));
    history.forEach((item,index)=>result.push(button(item,16+index*46,150+items.filter(menu=>['tab','menu'].includes(menu.kind)).length*50,40,38)));
    const rows=Math.ceil(secondary.length/2);
    let y=primaryY-(rows*40+module.length*42+pathway.length*42+8);
    for(const group of [pathway,module])for(const item of group){result.push(button(item,left,y,width,36));y+=40;}
    secondary.forEach((item,index)=>result.push(button(item,left+(index%2)*(width/2+4),y+Math.floor(index/2)*40,width/2-4,36)));
    return result;
}

function controlDescription(item={}){
    const descriptions={
        MoveMediaPanel:'Press and hold to detach and move the media panel; release near an edge to dock it.',
        Hide:'Collapse the Control panel. Reopen it from its small tab.',
        Restore:'Restore the Control panel.',
        Help:'Open the available help and tutorial options.',
        Settings:'Adjust text size, glass opacity, Orb model, panel scale and device settings.',
        Previous:'Show the previous page.',
        Next:'Show the next page.',
        ToggleMedia:'Show or hide the selected plant image.',
        ToggleMediaDetach:'Detach or dock the media panel.',
        'Utility:close':'Close the current demo experience.',
        'Utility:continue':'Continue to the next demo step.',
        RainIntensity:'Cycle rain between off, light, normal, and heavy.',
        RainStyle:'Switch between the preserved Rain V1 effect and the layered Rain V2 trial.',
        TextDown:'Reduce the reading text size.',
        TextUp:'Increase the reading text size.',
        Recenter:'Return the panel to its comfortable forward position.',
        HandMode:'Switch between a subtle hand outline for direct interaction and an index-finger laser for aiming.'
    };
    return item.description || descriptions[item.action] || item.ariaLabel || item.label || 'Activate this control.';
}

let panelInstance=0;
export function createPimInfoPanel({ root, headset = false, phoneAR = false, rainIntensity = 1, rainStyle = 'v2', cellOpacity = getSpatialVisualSettings().cellOpacity, handMode=getSpatialVisualSettings().handMode, rainEnabled=true, panelHints = [], onPerformanceAction=()=>{}, onInfoOpacity=()=>{}, onOrbModel=()=>{}, onHandMode=()=>{}, onRainIntensity = () => {}, onRainStyle = () => {}, onCellOpacity = () => {}, onGrab = () => {}, onEdit = () => {}, onPathwayAction = () => {}, onModuleAction = () => {}, onUtilityAction = () => {}, onMove = () => {} } = {}) {
    let performanceSettings=null,infoOpacity=currentInfoOpacity(),orbModel=currentOrbModel();
    const HEAVY_RAIN_INTENSITY=1.65;
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=getSpatialVisualSettings().largeText,settingsOpen=false,spatialScale=getSpatialVisualSettings().spatialScale,ambientRain=Math.max(0,Math.min(HEAVY_RAIN_INTENSITY,Number(rainIntensity)||0)),ambientRainStyle=rainStyle==='v1'?'v1':'v2',meshCellOpacity=Math.max(0,Math.min(1,Number(cellOpacity) || 0)),contextHint='',handVisualMode=handMode==='outline'?'outline':'pointer';
    let mediaImage=null,mediaImageSource='',mediaPreviousImage=null,mediaFadeStartedAt=0,mediaLoadToken=0,mediaTransitionTimer=0,mediaPreviewBlocked=false,mediaTouched=false,mediaDetached=false,mediaDockSide='top',mediaFloating=null,mediaPosition=null,mediaPointerDrag=null,ignoreMediaClickUntil=0;
    let visibleMedia=null;
    const MEDIA_FADE_MS=650;
    let rotatingPanelHints=Array.isArray(panelHints)?panelHints.map(String).filter(Boolean):[],panelHintIndex=0,panelHintTimer=0;
    let railCollapsed=headset?false:(globalThis.matchMedia?.('(max-width:600px)').matches || false),mediaCollapsed=headset||railCollapsed;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false,introduction=false,pathwayContext=null,moduleContext=null,utilityActions=[],headerProgress=null,hoveredPanelId='',hoveredDescription='',hoveredAction='';
    let confirmation=null,confirmationSnapshot=null;
    let spatialMove=null,spatialGrabPending=null,finishingMoveSource=null,panelGestureSource=null,manuallyPositioned=false,firstPlacement=true,mediaPose=null;
    let removeXrControls=()=>{};
    const element=document.createElement('aside'),settingsElement=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    settingsElement.className='nlxr-settings-companion';settingsElement.setAttribute('aria-label','Settings companion panel');settingsElement.hidden=true;root?.append(settingsElement);
    const isDesktopDemo=()=>Boolean(root?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    const text=()=>{
        if(confirmation)return confirmation.body;
        if(tab==='Help')return [moduleContext?.body,INFO_HELP].filter(Boolean).join('\n\n');
        const reading=selection?[selection.body,selection.safety && 'Safety: '+selection.safety,selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
            :identity?'Information about what you select will appear here. Select a Plant Orb or hold one of its cells to explore.'
                :'Information about what you select will appear here.';
        return reading;
    };
    const currentHint=()=>confirmation || tab==='Help'?'':contextHint || identity?.hint || rotatingPanelHints[panelHintIndex] || '';
    const pages=()=>infoPages(text(),headset?(largeText?29:34):(largeText?32:38),pathwayContext?4:7);
    const title=()=>confirmation?.title || (tab==='Help'?'Help':selection?.hideTitle?'':selection?.title || '');
    const hasPimPath=()=>Boolean(selection && identity);
    const pimPath=()=>{
        if(!hasPimPath())return '';
        const plant=String(identity?.plant || selection?.plant || '').trim();
        const trail=String(selection?.breadcrumb || selection?.title || '').split(/\s*[›>]\s*/).filter(Boolean);
        const parts=plant && trail[0]?.toLowerCase()!==plant.toLowerCase() ? [plant,...trail] : trail;
        return parts.join(' > ');
    };
    const panelHeading=()=>hasPimPath() && tab==='Details' ? pimPath() : title();
    const hasPimPathHeading=()=>hasPimPath() && tab==='Details';
    const selectionMetadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const metadata=()=>[selectionMetadata(),performanceSettings?.showFps?performanceSettings.label:''].filter(Boolean).join(' / ');
    const previewMedia=()=>mediaPreviewBlocked ? null : selection?.mesh==='lim' && (selection.sketchImage || selection.image)
        ? {image:selection.sketchImage || selection.image,alt:selection.sketchImageAlt || selection.imageAlt || selection.title,caption:'',plant:false,fit:selection.imageFit || 'cover'}
        : identity?.media?.image ? {...identity.media,caption:identity.media.caption || identity.plant,plant:true} : null;
    const showPlantPreview=()=>Boolean(previewMedia()?.image);
    function loadPanelImage(source,{delayMs=0,discardPrevious=false}={}){
        if(source===mediaImageSource)return;
        const token=++mediaLoadToken;
        clearTimeout(mediaTransitionTimer);mediaTransitionTimer=0;
        mediaPreviewBlocked=delayMs>0;
        if(discardPrevious){mediaPreviousImage=null;mediaImage=null;mediaImageSource='';visibleMedia=null;mediaFadeStartedAt=performance.now();}
        if(!source){mediaPreviousImage=mediaImage;mediaImage=null;mediaImageSource='';mediaFadeStartedAt=performance.now();return;}
        const beginLoad=()=>{
            if(token!==mediaLoadToken)return;
            const image=new Image();image.decoding='async';
            image.onload=()=>{if(token!==mediaLoadToken)return;if(discardPrevious)mediaPreviousImage=null;else mediaPreviousImage=mediaImage;mediaImage=image;mediaImageSource=source;mediaFadeStartedAt=performance.now();};
            image.onerror=()=>{if(token!==mediaLoadToken)return;if(discardPrevious)mediaPreviousImage=null;else mediaPreviousImage=mediaImage;mediaImage=null;mediaImageSource=source;mediaFadeStartedAt=performance.now();};
            image.src=source;
        };
        if(delayMs>0){mediaTransitionTimer=setTimeout(()=>{mediaTransitionTimer=0;mediaPreviewBlocked=false;beginLoad();render(true);},delayMs);return;}
        beginLoad();
    }
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText,Boolean(pathwayContext),utilityActions,tab==='Help'?(moduleContext?.actions?.length||0):0);
    const contentKind=()=>selection?.mesh==='lim' || (!selection && !identity) ? 'lim' : 'pim';
    const mainUtilities=()=>utilityActions.filter(item=>!['safety','recenter'].includes(item.id));
    const controls=()=>{const items=controlPanelControls({hidden,tab,selected:confirmation?false:Boolean(selection && selection.editable!==false),page,pageCount:pages().length,height:height(),largeText,contentKind:contentKind(),pathwayActions:confirmation?[]:pathwayContext?.actions || [],moduleActions:confirmation?[]:moduleContext?.actions || [],utilityActions:mainUtilities()});const visible=confirmation?items.filter(item=>item.kind==='utility'):items;return isDesktopDemo()?visible.filter(item=>item.action!=='Recenter'):visible;};
    // Fixed geometry prevents tabs and cell lengths from moving the panel in space.
    const spatialHeight=()=>phoneAR?900:headset?600:height();
    const spatialControls=()=>spatialPanelControls({hidden,height:spatialHeight(),railCollapsed,mediaCollapsed,items:controls()});
    function act(action){
        const button=(headset?spatialControls():controls()).find(item=>item.action===action);if(button?.disabled)return;
        if(action==='ToggleMedia'){mediaCollapsed=!mediaCollapsed;mediaTouched=true;}
        if(action==='ToggleMediaDetach'){if(mediaDetached)dockMediaPanel();else detachMediaPanel();return;}
        if(action==='RefreshRate' || action==='ShowFps'){if(action==='RefreshRate' && (performanceSettings?.pending || !performanceSettings?.supported.length))return;onPerformanceAction(action);return;}
        if(action==='Restore'){hidden=false;render(true);return;}
        if(action==='Hide')hidden=true;
        if(action==='Help'){tab=tab==='Help'?'Details':'Help';page=0;}
        if(action==='Settings'){
            settingsOpen=!settingsOpen;
            if(settingsOpen){mediaCollapsed=true;mediaDetached=false;mediaPose=null;mediaPosition=null;}
            renderSettings();
        }
        if(action==='Previous')page=Math.max(0,page-1);
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection && selection.editable!==false)onEdit(record,selection.path || selection.id);
        if(action==='TextDown'){largeText=false;page=0;setSpatialVisualSettings({largeText});}
        if(action==='TextUp'){largeText=true;page=0;setSpatialVisualSettings({largeText});}
        if(action==='HandMode'){handVisualMode=handVisualMode==='pointer'?'outline':'pointer';setSpatialVisualSettings({handMode:handVisualMode});onHandMode(handVisualMode);}
        if(action==='Recenter'){heading=null;pose=null;lastTime=0;}
        if(action==='ScaleDown'){spatialScale=Math.max(.85,Math.round((spatialScale-.1)*10)/10);setSpatialVisualSettings({spatialScale});}
        if(action==='ScaleUp'){spatialScale=Math.min(1.2,Math.round((spatialScale+.1)*10)/10);setSpatialVisualSettings({spatialScale});}
        if(action==='RainIntensity'){ambientRain=ambientRain>=HEAVY_RAIN_INTENSITY?0:ambientRain>=1?HEAVY_RAIN_INTENSITY:ambientRain<=0?.45:1;onRainIntensity(ambientRain);}
        if(action==='RainStyle'){ambientRainStyle=ambientRainStyle==='v1'?'v2':'v1';onRainStyle(ambientRainStyle);}
        if(action==='InfoOpacity'){infoOpacity=infoOpacity>=1?0:Math.min(1,Math.round((infoOpacity+.1)*10)/10);setSpatialVisualSettings({infoOpacity});onInfoOpacity(infoOpacity);}
        if(action==='OrbModel'){const models=Object.keys(ORB_MODELS);orbModel=models[(models.indexOf(orbModel)+1)%models.length];setSpatialVisualSettings({orbModel});onOrbModel(orbModel);}
        if(action==='CellOpacity'){meshCellOpacity=meshCellOpacity>=1?0:Math.round((meshCellOpacity+.1)*10)/10;setSpatialVisualSettings({cellOpacity:meshCellOpacity});onCellOpacity(meshCellOpacity);}
        if(action.startsWith('Path')){onPathwayAction(action);return;}
        if(action.startsWith('Module:')){onModuleAction(action.slice(7));return;}
        if(action.startsWith('Utility:')){onUtilityAction(action.slice(8));return;}
        render();
    }
    const settingsControls=()=>panelSettingsControls({headset,handVisualMode,spatialScale,meshCellOpacity,ambientRain,ambientRainStyle,performanceSettings,infoOpacity,orbModel,rainEnabled});
    function renderSettings(){
        settingsElement.hidden=!settingsOpen || hidden || detached;
        element.style.setProperty('--nlxr-info-opacity',String(infoOpacity));
        settingsElement.style.setProperty('--nlxr-info-opacity',String(infoOpacity));
        element.classList.toggle('has-settings-companion',settingsOpen);
        if(settingsElement.hidden)return;
        const scrollTop=settingsElement.scrollTop;
        const focused=settingsElement.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        if(!renderer && !globalThis.matchMedia?.('(max-width:700px)').matches){
            const main=element.getBoundingClientRect(),panelWidth=Math.min(390,Math.max(300,window.innerWidth-32));
            settingsElement.style.left=Math.max(8,main.left-panelWidth-6)+'px';
            settingsElement.style.top=Math.max(8,main.top)+'px';
            settingsElement.style.bottom='auto';
        }else if(!renderer){settingsElement.style.removeProperty('left');settingsElement.style.removeProperty('top');settingsElement.style.removeProperty('bottom');}
        settingsElement.innerHTML='<header><h2>Settings</h2><button type="button" class="nlxr-settings-close" aria-label="Close settings">Done</button></header><section><div class="nlxr-settings-actions"></div><h3>Safety</h3><p>Keep a clear walking area and remain aware of people, plants, furniture and uneven ground around you.</p><h3>Help</h3><p>'+INFO_HELP+'</p></section>';
        settingsElement.querySelector('.nlxr-settings-close').addEventListener('click',()=>{settingsOpen=false;render(true);});
        const actions=settingsElement.querySelector('.nlxr-settings-actions');
        for(const item of settingsControls()){
            let row=actions.querySelector(`[data-setting-group="${item.settingGroup}"]`);
            if(!row){
                row=document.createElement('div');row.className='nlxr-setting-row';row.dataset.settingGroup=item.settingGroup;
                const label=document.createElement('span');label.className='nlxr-setting-label';label.textContent=item.settingLabel;
                const choices=document.createElement('div');choices.className='nlxr-setting-options';row.append(label,choices);actions.append(row);
            }
            row.querySelector('.nlxr-setting-options').append(makeButton(item));
        }
        const infoOpacityRow=actions.querySelector('[data-setting-group="info-opacity"]');
        if(infoOpacityRow){
            infoOpacityRow.querySelector('button')?.remove();
            const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.value=String(Math.round(infoOpacity*100));slider.setAttribute('aria-label','Info background opacity');
            const value=document.createElement('output');value.textContent=slider.value+'%';
            slider.addEventListener('input',()=>{infoOpacity=Number(slider.value)/100;value.textContent=slider.value+'%';setSpatialVisualSettings({infoOpacity});element.style.setProperty('--nlxr-info-opacity',String(infoOpacity));settingsElement.style.setProperty('--nlxr-info-opacity',String(infoOpacity));onInfoOpacity(infoOpacity);});
            infoOpacityRow.querySelector('.nlxr-setting-options').append(slider,value);
        }
        const opacityRow=actions.querySelector('[data-setting-group="opacity"]');
        if(opacityRow){
            opacityRow.querySelector('button')?.remove();
            const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.value=String(Math.round(meshCellOpacity*100));slider.setAttribute('aria-label','Cell glass opacity');
            const value=document.createElement('output');value.textContent=slider.value+'%';
            slider.addEventListener('input',()=>{meshCellOpacity=Number(slider.value)/100;value.textContent=slider.value+'%';setSpatialVisualSettings({cellOpacity:meshCellOpacity});onCellOpacity(meshCellOpacity);});
            opacityRow.querySelector('.nlxr-setting-options').append(slider,value);
        }
        settingsElement.scrollTop=scrollTop;
        if(focused)settingsElement.querySelector(`[data-info-action="${focused}"]`)?.focus({preventScroll:true});
    }
    function makeButton(item){
        const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.infoAction=item.action;button.disabled=Boolean(item.disabled);
        button.dataset.controlKind=item.kind || 'action';button.classList.toggle('is-primary-action',Boolean(item.primary) || ['Next','PathNext'].includes(item.action));
        button.setAttribute('aria-label',item.action==='Restore'?'Restore Control panel':item.ariaLabel || item.label);
        button.title=controlDescription(item);
        if(item.kind==='tab'){button.setAttribute('role','tab');button.setAttribute('aria-selected',String(item.selected));button.setAttribute('aria-controls',contentId);button.id=contentId+'-'+item.action;button.tabIndex=item.selected?0:-1;}
        button.addEventListener('click',event=>{event.stopPropagation();act(item.action);});return button;
    }
    function makePanelToggle(label,className,onClick,expanded){
        const button=document.createElement('button');button.type='button';button.className=className;button.textContent=label;button.setAttribute('aria-expanded',String(expanded));
        button.title=className==='nlxr-media-toggle'?'Show or hide the selected plant image.':'Toggle this panel.';
        button.addEventListener('click',event=>{event.stopPropagation();onClick();syncPanelWings();});return button;
    }
    function mediaFigure(preview){
        const figure=document.createElement('figure');figure.className='nlxr-plant-preview';if(preview?.fit==='contain')figure.classList.add('is-tutorial-art');
        const stack=document.createElement('div');stack.className='nlxr-media-image-stack';
        const caption=document.createElement('figcaption');figure.append(stack,caption);
        if(preview){
            const image=document.createElement('img');image.src=preview.image;image.alt=preview.alt || '';image.decoding='async';image.className='is-media-entering';image.onload=()=>requestAnimationFrame(()=>image.classList.remove('is-media-entering'));
            stack.append(image);figure.dataset.mediaTarget=preview.image;caption.textContent=preview.caption || '';caption.hidden=!preview.caption;
        }
        return figure;
    }
    function updateMediaFigure(figure,preview){
        const stack=figure.querySelector('.nlxr-media-image-stack'),caption=figure.querySelector('figcaption');
        figure.classList.toggle('is-tutorial-art',preview?.fit==='contain');
        if(figure.dataset.mediaTarget===preview.image)return;
        figure.dataset.mediaTarget=preview.image;
        const image=document.createElement('img');image.alt=preview.alt || '';image.decoding='async';image.className='is-media-entering';
        const token=preview.image;
        image.onload=()=>{
            if(!figure.isConnected || figure.dataset.mediaTarget!==token)return;
            const old=[...stack.querySelectorAll('img')];stack.append(image);
            requestAnimationFrame(()=>{image.classList.remove('is-media-entering');old.forEach(node=>node.classList.add('is-media-leaving'));});
            setTimeout(()=>old.forEach(node=>node.remove()),MEDIA_FADE_MS+60);
            caption.textContent=preview.caption || '';caption.hidden=!preview.caption;
            visibleMedia={...preview};
        };
        image.onerror=()=>{if(figure.dataset.mediaTarget===token)figure.dataset.mediaTarget='';};
        image.src=preview.image;
    }
    function refreshMediaWing(media){
        if(!media)return;
        const preview=previewMedia(),figure=media.querySelector('.nlxr-plant-preview'),empty=media.querySelector('.nlxr-media-empty');
        media.setAttribute('aria-label',preview?.plant?'Plant image':'Illustration');
        if(preview?.image){
            if(figure)updateMediaFigure(figure,preview);
            else{const next=mediaFigure(visibleMedia && visibleMedia.image!==preview.image?visibleMedia:null);empty?.replaceWith(next);updateMediaFigure(next,preview);}
        }else if(figure){const next=document.createElement('div');next.className='nlxr-media-empty';next.setAttribute('aria-hidden','true');figure.replaceWith(next);}
    }
    function createMediaWing({floating=false}={}){
        const media=document.createElement('aside');media.className='nlxr-media-wing'+(floating?' nlxr-media-floating':'');
        const toolbar=document.createElement('div');toolbar.className='nlxr-media-toolbar';
        if(!floating && !isDesktopDemo())toolbar.append(makePanelToggle('Media','nlxr-media-toggle',()=>{mediaCollapsed=!mediaCollapsed;mediaTouched=true;},!mediaCollapsed));
        if(toolbar.childElementCount)media.append(toolbar);
        const preview=previewMedia();
        if(preview?.image){const figure=mediaFigure(visibleMedia && visibleMedia.image!==preview.image?visibleMedia:null);media.append(figure);updateMediaFigure(figure,preview);}
        else{const empty=document.createElement('div');empty.className='nlxr-media-empty';empty.setAttribute('aria-hidden','true');media.append(empty);}
        bindMediaPanelMove(media);
        return media;
    }
    function closestDockCandidate(panelRect,mainRect,threshold=88){
        if(!panelRect || !mainRect)return null;
        const overlap=(a0,a1,b0,b1)=>Math.max(0,Math.min(a1,b1)-Math.max(a0,b0));
        const candidates=[
            {side:'right',gap:Math.abs(panelRect.left-mainRect.right),overlap:overlap(panelRect.top,panelRect.bottom,mainRect.top,mainRect.bottom)},
            {side:'left',gap:Math.abs(panelRect.right-mainRect.left),overlap:overlap(panelRect.top,panelRect.bottom,mainRect.top,mainRect.bottom)},
            {side:'bottom',gap:Math.abs(panelRect.top-mainRect.bottom),overlap:overlap(panelRect.left,panelRect.right,mainRect.left,mainRect.right)},
            {side:'top',gap:Math.abs(panelRect.bottom-mainRect.top),overlap:overlap(panelRect.left,panelRect.right,mainRect.left,mainRect.right)}
        ].filter(candidate=>candidate.gap<=threshold && candidate.overlap>=48).sort((a,b)=>a.gap-b.gap);
        return candidates[0] || null;
    }
    function placeMediaAgainstMain(side,panelRect,mainRect){
        const gap=8,centerX=(mainRect.left+mainRect.right)/2,centerY=(mainRect.top+mainRect.bottom)/2;
        if(side==='right')return {left:mainRect.right+gap,top:centerY-panelRect.height/2};
        if(side==='left')return {left:mainRect.left-panelRect.width-gap,top:centerY-panelRect.height/2};
        if(side==='bottom')return {left:centerX-panelRect.width/2,top:mainRect.bottom+gap};
        return {left:centerX-panelRect.width/2,top:mainRect.top-panelRect.height-gap};
    }
    function clampMediaPosition(left,top){
        const width=mediaFloating?.offsetWidth || 340,height=mediaFloating?.offsetHeight || 300;
        return {left:Math.max(8,Math.min(window.innerWidth-width-8,left)),top:Math.max(8,Math.min(window.innerHeight-height-8,top))};
    }
    function syncDetachedMedia(){
        if(!mediaDetached){mediaFloating?.remove();mediaFloating=null;return;}
        if(!mediaFloating){mediaFloating=createMediaWing({floating:true});root?.append(mediaFloating);}
        refreshMediaWing(mediaFloating);
        mediaFloating.hidden=Boolean(renderer || hidden || mediaCollapsed || !previewMedia()?.image);
        const position=mediaPosition || {left:Math.max(8,element.getBoundingClientRect().right+12),top:element.getBoundingClientRect().top};
        mediaFloating.style.left=position.left+'px';mediaFloating.style.top=position.top+'px';
    }
    function detachMediaPanel(){
        if(!showPlantPreview())return;
        const wing=element.querySelector('.nlxr-media-wing'),rect=wing?.getBoundingClientRect(),main=element.getBoundingClientRect();
        mediaPosition=rect?.width?{left:rect.left,top:rect.top}:{left:Math.min(window.innerWidth-360,main.right+12),top:main.top};
        mediaDetached=true;mediaCollapsed=false;render(true);
    }
    function dockMediaPanel(side=null){
        const main=element.getBoundingClientRect(),panel=mediaFloating?.getBoundingClientRect();
        if(!side && panel){const distances=[['right',Math.abs(panel.left-main.right)],['left',Math.abs(panel.right-main.left)],['bottom',Math.abs(panel.top-main.bottom)],['top',Math.abs(panel.bottom-main.top)]];side=distances.sort((a,b)=>a[1]-b[1])[0][0];}
        mediaDockSide=side || 'top';mediaDetached=false;mediaPosition=null;mediaCollapsed=false;render(true);
    }
    function bindMediaPanelMove(surface){
        surface.addEventListener('pointerdown',event=>{
            if(event.button!==0 && event.pointerType==='mouse')return;
            if(event.target.closest('button,a,input,select,textarea,[role="button"],[contenteditable]'))return;
            event.stopPropagation();const rect=surface.getBoundingClientRect();
            mediaPointerDrag={pointerId:event.pointerId,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,startX:event.clientX,startY:event.clientY,moved:false,armed:false,timer:null};surface.classList.add('is-grab-ready');
            mediaPointerDrag.timer=setTimeout(()=>{if(!mediaPointerDrag || mediaPointerDrag.pointerId!==event.pointerId)return;if(!mediaDetached)detachMediaPanel();mediaPointerDrag.armed=true;surface.classList.remove('is-grab-ready');mediaFloating?.classList.add('is-grabbed');onGrab(null);},PANEL_GRAB_HOLD_MS);
            const move=next=>{
                if(!mediaPointerDrag || next.pointerId!==mediaPointerDrag.pointerId)return;
                const drag=mediaPointerDrag;
                if(!drag.armed){if(Math.hypot(next.clientX-drag.startX,next.clientY-drag.startY)>PANEL_GRAB_CANCEL_DISTANCE_PX)cancel(next);return;}
                next.preventDefault();const rawLeft=next.clientX-drag.offsetX,rawTop=next.clientY-drag.offsetY;
                drag.moved ||= Math.hypot(next.clientX-drag.startX,next.clientY-drag.startY)>4;
                const raw=clampMediaPosition(rawLeft,rawTop),rawRect={...mediaFloating.getBoundingClientRect(),left:raw.left,top:raw.top,right:raw.left+rect.width,bottom:raw.top+rect.height,width:rect.width,height:rect.height};
                const candidate=closestDockCandidate(rawRect,element.getBoundingClientRect());
                const position=candidate?placeMediaAgainstMain(candidate.side,rawRect,element.getBoundingClientRect()):raw;
                mediaPosition=clampMediaPosition(position.left,position.top);mediaFloating.style.left=mediaPosition.left+'px';mediaFloating.style.top=mediaPosition.top+'px';
                mediaFloating.classList.toggle('is-magnetized',Boolean(candidate));if(candidate)mediaFloating.dataset.dockSide=candidate.side;else delete mediaFloating.dataset.dockSide;
            };
            const end=next=>{
                if(!mediaPointerDrag || (next?.pointerId!==undefined && next.pointerId!==mediaPointerDrag.pointerId))return;
                const drag=mediaPointerDrag,candidate=closestDockCandidate(mediaFloating.getBoundingClientRect(),element.getBoundingClientRect());
                clearTimeout(drag.timer);mediaPointerDrag=null;surface.classList.remove('is-grab-ready','is-grabbed');mediaFloating?.classList.remove('is-grab-ready','is-grabbed');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);
                if(drag.moved){ignoreMediaClickUntil=performance.now()+450;if(candidate)dockMediaPanel(candidate.side);else{mediaFloating?.classList.remove('is-magnetized');delete mediaFloating?.dataset.dockSide;}}
            };
            const cancel=next=>{if(next.pointerId!==mediaPointerDrag?.pointerId)return;clearTimeout(mediaPointerDrag.timer);mediaPointerDrag=null;surface.classList.remove('is-grab-ready','is-grabbed');mediaFloating?.classList.remove('is-grab-ready','is-grabbed');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',cancel);mediaFloating?.classList.remove('is-magnetized');};
            window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',cancel);
        });
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
        const status=document.createElement('span');status.textContent=`${progress.activeIndex+1} of ${progress.steps.length} · ${progress.current.label}`;status.setAttribute('aria-live','polite');
        heading.append(status);
        const list=document.createElement('ol');
        progress.steps.forEach((step,index)=>{
            const item=document.createElement('li');item.classList.toggle('is-complete',index<progress.activeIndex);item.classList.toggle('is-current',index===progress.activeIndex);
            if(index===progress.activeIndex)item.setAttribute('aria-current','step');
            const marker=document.createElement('i');marker.setAttribute('aria-hidden','true');
            const text=document.createElement('span');text.textContent=step.label;
            item.append(marker,text);list.append(item);
        });
        region.append(heading,list);target.append(region);
    }
    function syncPanelWings(){
        if(isDesktopDemo())railCollapsed=false;
        element.classList.toggle('is-rail-collapsed',railCollapsed);
        element.classList.toggle('is-media-collapsed',mediaCollapsed || mediaDetached || (settingsOpen && !mediaDetached));
        element.classList.toggle('is-media-detached',mediaDetached);
        element.dataset.mediaDockSide=mediaDockSide;
        const railToggle=element.querySelector('.nlxr-rail-toggle');
        const mediaToggle=element.querySelector('.nlxr-media-toggle');
        if(railToggle){railToggle.setAttribute('aria-expanded',String(!railCollapsed));railToggle.setAttribute('aria-label',railCollapsed?'Open settings and sections':'Collapse settings and sections');}
        if(mediaToggle){mediaToggle.setAttribute('aria-expanded',String(!mediaCollapsed));mediaToggle.setAttribute('aria-label',mediaCollapsed?'Open plant media':'Collapse plant media');}
    }
    function bindPanelMove(){
        let grab=null;
        const clear=()=>{
            if(grab){clearTimeout(grab.timer);try{if(element.hasPointerCapture?.(grab.pointerId))element.releasePointerCapture(grab.pointerId);}catch{}}
            grab=null;element.classList.remove('is-grab-ready','is-grabbed');
            window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);
        };
        const move=event=>{
            if(!grab || event.pointerId!==grab.pointerId)return;
            if(!grab.armed){if(Math.hypot(event.clientX-grab.startX,event.clientY-grab.startY)>PANEL_GRAB_CANCEL_DISTANCE_PX)clear();return;}
            event.preventDefault();
            const left=Math.max(8,Math.min(window.innerWidth-element.offsetWidth-8,event.clientX-grab.offsetX));
            const top=Math.max(8,Math.min(window.innerHeight-element.offsetHeight-8,event.clientY-grab.offsetY));
            element.style.left=`${left}px`;element.style.top=`${top}px`;element.style.right='auto';element.style.bottom='auto';onMove();
        };
        const end=event=>{if(grab && event.pointerId===grab.pointerId)clear();};
        const start=event=>{
            if(hidden || detached || (event.pointerType==='mouse' && event.button!==0))return;
            if(event.target.closest('button,a,input,select,textarea,[role="button"],[role="tab"],[contenteditable]'))return;
            clear();
            const rect=element.getBoundingClientRect();
            grab={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,armed:false,timer:null};
            element.classList.add('is-grab-ready');
            grab.timer=setTimeout(()=>{
                if(!grab || grab.pointerId!==event.pointerId)return;
                grab.armed=true;element.classList.remove('is-grab-ready');element.classList.add('is-grabbed');
                try{element.setPointerCapture?.(event.pointerId);}catch{}
            },PANEL_GRAB_HOLD_MS);
            window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);
        };
        element.addEventListener('pointerdown',start);
        return ()=>{clear();element.removeEventListener('pointerdown',start);};
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
        if(header){const plant=header.querySelector('h2'),scientific=header.querySelector('.nlxr-control-identity');plant.textContent=identity?.plant || selection?.plant || '';scientific.textContent=identity?.scientific || (identity?'Selected plant':'');plant.hidden=hasPimPath() || !plant.textContent;scientific.hidden=hasPimPath() || !scientific.textContent;syncHeaderProgress(header);}
        const detailsTab=element.querySelector('[data-info-action="Details"]');
        if(detailsTab)detailsTab.textContent=contentKind()==='pim'?'Plant':'Selected topic';
        if(tab==='Help'){content.setAttribute('aria-labelledby',contentId+'-Help');content.removeAttribute('aria-label');}
        else{content.removeAttribute('aria-labelledby');content.setAttribute('aria-label','Information');}
        const heading=content.querySelector('h3'),pathHeading=hasPimPathHeading();heading.textContent=panelHeading();heading.hidden=!heading.textContent;heading.classList.toggle('nlxr-pim-pathline',pathHeading);if(pathHeading)heading.title=heading.textContent;else heading.removeAttribute('title');
        const trail=content.querySelector('.nlxr-info-trail');trail.hidden=pathHeading;trail.textContent=tab==='Details'&&!pathHeading?selection?.breadcrumb || '':'';
        content.querySelector('.nlxr-info-body').textContent=currentPages[page].join('\n');
        let hint=element.querySelector('.nlxr-info-hint');
        if(!hint){hint=document.createElement('p');hint.className='nlxr-info-hint';element.querySelector('.nlxr-tools-dock')?.append(hint);}
        hint.textContent=currentHint();hint.hidden=!hint.textContent;
        content.querySelector('small').textContent=metadata();
        let pager=element.querySelector('.nlxr-content-pager');
        if(!pager && !confirmation){pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');element.querySelector('.nlxr-tools-dock')?.prepend(pager);}
        if(pager)pager.replaceChildren(...controls().filter(item=>item.kind==='pager').map(makeButton));
        let history=element.querySelector('.nlxr-demo-history');
        if(!history && !confirmation){history=document.createElement('nav');history.className='nlxr-demo-history';history.setAttribute('aria-label','Experience history');element.querySelector('.nlxr-control-tabs')?.append(history);}
        if(history)history.replaceChildren(...controls().filter(item=>item.kind==='history').map(makeButton));
        let guides=content.querySelector('.nlxr-guide-actions');
        if(tab==='Help' && !guides){guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');content.append(guides);}
        if(guides){if(tab==='Help')guides.replaceChildren(...controls().filter(item=>item.kind==='module' && !item.disabled).map(makeButton));else guides.remove();}
        const count=element.querySelector('.nlxr-control-page');
        if(count)count.textContent=(page+1)+' / '+currentPages.length;
        const media=element.querySelector('.nlxr-media-wing') || mediaFloating;
        if(media){
            const desktopDemo=isDesktopDemo();
            if(desktopDemo && railCollapsed){railCollapsed=false;syncPanelWings();}
            const mediaToggle=media.querySelector('.nlxr-media-toggle');
            if(mediaToggle && desktopDemo)mediaToggle.remove();
            refreshMediaWing(media);
        }else if(showPlantPreview())render(true);
        syncDetachedMedia();
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
        const needsMediaWing=showPlantPreview() && !mediaCollapsed && !mediaDetached && !settingsOpen && !element.querySelector('.nlxr-media-wing');
        if(!force && !hidden && !needsMediaWing && element.querySelector('.nlxr-control-header')){
            element.classList.toggle('is-large-text',largeText);
            syncPanelWings();
            updateReading();
            updatePathway();
            const tabs=element.querySelector('.nlxr-control-tabs');
            if(tabs){
                const railScroll=tabs.scrollTop;
                tabs.querySelectorAll('[data-info-action]').forEach(button=>button.remove());
                controls().filter(item=>['tab','menu'].includes(item.kind) && item.action!=='Hide').forEach(item=>tabs.append(makeButton(item)));
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
        if(desktopDemo)railCollapsed=false;
        const showMediaWing=plantPreviewAvailable && !mediaCollapsed && !mediaDetached && !settingsOpen;
        element.classList.toggle('is-rail-collapsed',railCollapsed);element.classList.toggle('is-media-collapsed',mediaCollapsed || mediaDetached || (settingsOpen && !mediaDetached));element.classList.toggle('is-media-detached',mediaDetached);element.dataset.mediaDockSide=mediaDockSide;element.classList.remove('is-tools-collapsed');element.classList.toggle('has-media',showMediaWing);
        element.dataset.contentKind=contentKind();
        element.dataset.primaryFaceId=contentKind()==='lim' ? (selection?.primaryFaceId || '') : '';
        element.dataset.relatedFaceIds=contentKind()==='lim' ? (selection?.relatedFaceIds || []).join(',') : '';
        element.dataset.pathwayMode=pathwayContext?.mode || '';
        element.style.setProperty('--lim-accent',selection?.mesh==='lim' ? (selection.accent || '#719b62') : 'transparent');
        if(hidden)element.append(makeButton(controls()[0]));
        else{
            const header=document.createElement('header');header.className='nlxr-control-header';
            const brand=document.createElement('span');brand.className='nlxr-panel-brand';brand.setAttribute('aria-label','Control panel');brand.innerHTML='CONTROL<br>PANEL';header.append(brand);
            const plant=document.createElement('h2');plant.textContent=identity?.plant || selection?.plant || '';plant.hidden=hasPimPath() || !plant.textContent;
            const scientific=document.createElement('p');scientific.className='nlxr-control-identity';scientific.textContent=identity?.scientific || (identity?'Selected plant':'');scientific.hidden=hasPimPath() || !scientific.textContent;
            const hideControl=optionalPanelControl(controls(),'Hide');
            if(hideControl){const hideButton=makeButton(hideControl);hideButton.classList.add('is-panel-hide');header.append(hideButton);}
            header.classList.add('is-move-handle');header.title='Hold to move the Control panel';
            header.append(plant,scientific);element.append(header);syncHeaderProgress(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
            controls().filter(item=>['tab','menu'].includes(item.kind) && item.action!=='Hide').forEach(item=>tabs.append(makeButton(item)));
            if(!confirmation){const history=document.createElement('nav');history.className='nlxr-demo-history';history.setAttribute('aria-label','Experience history');controls().filter(item=>item.kind==='history').forEach(item=>history.append(makeButton(item)));if(history.childElementCount)tabs.append(history);}
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
            const heading=document.createElement('h3'),pathHeading=hasPimPathHeading();heading.textContent=panelHeading();heading.hidden=!heading.textContent;heading.classList.toggle('nlxr-pim-pathline',pathHeading);if(pathHeading)heading.title=heading.textContent;
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.hidden=pathHeading;trail.textContent=tab==='Details'&&!pathHeading?selection?.breadcrumb || '':'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const hint=document.createElement('p');hint.className='nlxr-info-hint';hint.textContent=currentHint();hint.hidden=!hint.textContent;
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,body,status);
            if(tab==='Help'){const guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');controls().filter(item=>item.kind==='module' && !item.disabled).forEach(item=>guides.append(makeButton(item)));if(guides.childElementCount)content.append(guides);}
            element.append(content);
            if(showMediaWing){
                element.append(createMediaWing());
            }
            const tools=document.createElement('footer');tools.className='nlxr-tools-dock';tools.setAttribute('aria-label','Control panel tools');
            tools.append(hint);
            if(!confirmation){const pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');controls().filter(item=>item.kind==='pager').forEach(item=>pager.append(makeButton(item)));tools.append(pager);}
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Reading controls');controls().filter(item=>!item.kind && item.action!=='Hide' && !item.disabled).forEach(item=>nav.append(makeButton(item)));if(nav.childElementCount)tools.append(nav);
            if(utilityActions.length){const utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');controls().filter(item=>item.kind==='utility').forEach(item=>utilities.append(makeButton(item)));if(utilities.childElementCount)tools.append(utilities);}
            element.append(tools);
            if(tab==='Details' && pages().length>1){const count=document.createElement('small');count.className='nlxr-control-page';count.textContent=(page+1)+' / '+pages().length;element.append(count);}
        }
        syncDetachedMedia();
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();
        act('Help');
        element.querySelector('[data-info-action="'+tab+'"]')?.focus();
    });
    element.addEventListener('beforexrselect',event=>event.preventDefault());
    const removePanelMove=bindPanelMove();
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    function canvas(card){
        const c=document.createElement('canvas');c.width=1000;c.height=card.hidden?160:card.height;const ctx=c.getContext('2d');
            const gradient=ctx.createLinearGradient(0,0,1000,c.height);gradient.addColorStop(0,`rgba(15,29,34,${card.infoOpacity ?? .38})`);gradient.addColorStop(1,`rgba(6,17,23,${card.infoOpacity ?? .38})`);
        ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,992,c.height-8,24);ctx.fill();
        ctx.strokeStyle=card.grabState==='held'?'#dfff9b':card.grabState==='ready'?'#bceeff':card.grabState==='hover'?'#a6e7fa':card.guided?'#93d9f2':'rgba(166,204,229,.72)';
        ctx.lineWidth=card.grabState==='held'?8:card.grabState?5:4;
        ctx.stroke();ctx.textBaseline='top';
        ctx.fillStyle='rgba(139,211,241,.85)';ctx.fillRect(22,10,96,4);
        if(card.media){
            if(card.hoverHint){ctx.fillStyle='rgba(8,20,31,.88)';ctx.beginPath();ctx.roundRect(40,78,770,46,12);ctx.fill();ctx.fillStyle='#d6e5eb';ctx.font='400 19px system-ui';ctx.fillText(card.hoverHint,56,91,740);}
            const imageX=40,imageY=96,imageWidth=920,imageHeight=c.height-(card.caption?166:126);
            ctx.fillStyle='rgba(3,12,18,.78)';ctx.beginPath();ctx.roundRect(imageX,imageY,imageWidth,imageHeight,20);ctx.fill();
            const drawMedia=(image,alpha)=>{if(!image || alpha<=0)return;const scale=Math.min(imageWidth/image.naturalWidth,imageHeight/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,imageX+(imageWidth-w)/2,imageY+(imageHeight-h)/2,w,h);ctx.restore();};
            drawMedia(card.previousImage,1-card.imageFade);drawMedia(card.image,card.imageFade);
            if(card.caption){ctx.fillStyle='#d2e0e8';ctx.font='600 20px system-ui';ctx.textAlign='center';ctx.fillText(card.caption,500,c.height-48,904);ctx.textAlign='left';}
            return c;
        }
        if(card.settings){
            ctx.fillStyle='#f3f8fc';ctx.font='700 34px system-ui';ctx.fillText('Settings',56,32,888);
            const groups=new Map();
            card.controls.forEach(button=>{if(!groups.has(button.settingGroup))groups.set(button.settingGroup,{label:button.settingLabel,y:button.y});});
            groups.forEach(group=>{
                ctx.fillStyle='rgba(9,25,27,.28)';ctx.beginPath();ctx.roundRect(40,group.y-4,920,50,12);ctx.fill();
                ctx.strokeStyle='rgba(238,249,243,.27)';ctx.lineWidth=2.5;ctx.stroke();
                ctx.fillStyle='#e6f2e9';ctx.font='600 20px system-ui';ctx.fillText(group.label,58,group.y+10,670);
            });
            card.controls.forEach(button=>{
                const aimed=card.hoverAction===button.action && !button.disabled;
                ctx.fillStyle=aimed?'rgba(210,235,224,.3)':'rgba(238,250,242,.13)';ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,21);ctx.fill();
                ctx.strokeStyle=aimed?'rgba(243,248,226,.95)':'rgba(239,251,244,.48)';ctx.lineWidth=aimed?5:2.5;ctx.stroke();
                ctx.fillStyle='#f5fbf5';ctx.font='650 20px system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+9,button.width-12);
            });ctx.textAlign='left';
            const footerY=Math.max(480,...card.controls.map(button=>button.y+button.height+32));
            ctx.fillStyle='#f3f8fc';ctx.font='650 20px system-ui';ctx.fillText('Safety',56,footerY,888);
            ctx.fillStyle='#c9e0ed';ctx.font='500 16px system-ui';infoPages('Keep a clear walking area and remain aware of people, plants, furniture and uneven ground.',90,2)[0].forEach((line,index)=>ctx.fillText(line,56,footerY+26+index*20,888));
            ctx.fillStyle='#f3f8fc';ctx.font='650 20px system-ui';ctx.fillText('Help',56,footerY+68,888);
            ctx.fillStyle='#c9e0ed';ctx.font='500 16px system-ui';infoPages(INFO_HELP,92,1)[0].forEach((line,index)=>ctx.fillText(line,56,footerY+93+index*20,888));
            if(card.hoverHint){ctx.fillStyle='rgba(5,16,26,.93)';ctx.beginPath();ctx.roundRect(258,20,690,50,10);ctx.fill();ctx.strokeStyle='rgba(166,204,229,.4)';ctx.stroke();ctx.fillStyle='#e0edf2';ctx.font='400 18px system-ui';ctx.fillText(card.hoverHint,276,35,654);}
            return c;
        }
        if(card.headset && !card.hidden){
            const rail=card.railCollapsed?54:164,media=0;
            const left=rail+22,right=1000-media-22,width=right-left;
            const headerBottom=card.progress?108:88;
            ctx.fillStyle=`rgba(5,15,27,${(card.infoOpacity ?? .38)*.16})`;ctx.fillRect(6,headerBottom,rail,c.height-headerBottom-7);
            ctx.fillStyle=`rgba(8,22,34,${(card.infoOpacity ?? .38)*.16})`;ctx.fillRect(1000-media,headerBottom,media-6,c.height-headerBottom-7);
            ctx.fillStyle='rgba(157,208,235,.36)';ctx.fillRect(left,headerBottom+1,width,2);
            if(card.progress){
                const progressRight=718,progressWidth=Math.max(180,progressRight-left),stepWidth=progressWidth/Math.max(1,card.progress.steps.length-1),barY=48;
                ctx.fillStyle='#dfff9b';ctx.font='700 17px system-ui';ctx.textAlign='left';ctx.fillText(`${card.progress.activeIndex+1} / ${card.progress.steps.length} · ${card.progress.current.label.toUpperCase()}`,left,20,progressWidth);ctx.textAlign='left';
                ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(left,barY,progressWidth,3);
                ctx.fillStyle='#dfff9b';ctx.fillRect(left,barY,Math.max(3,stepWidth*card.progress.activeIndex),3);
                card.progress.steps.forEach((step,index)=>{const x=left+stepWidth*index;ctx.beginPath();ctx.arc(x,barY+1.5,index===card.progress.activeIndex?7:5,0,Math.PI*2);ctx.fillStyle=index<=card.progress.activeIndex?'#dfff9b':'#536469';ctx.fill();});
            }
            ctx.fillStyle='#e8f7f1';ctx.font='650 17px system-ui';ctx.fillText('CONTROL',24,22,128);ctx.fillText('PANEL',24,42,128);
            if(card.plant && card.plant.toLowerCase()!=='control panel'){ctx.fillStyle='#f3f8fc';ctx.font='650 34px system-ui';ctx.fillText(card.plant,left,card.progress?58:20,Math.max(100,width-150));}
            if(card.scientific){ctx.fillStyle='#c9e0ed';ctx.font='500 21px system-ui';ctx.fillText(card.scientific,left,card.progress?91:58,width);}
            let y=headerBottom+22;
            if(card.pathway){
                ctx.fillStyle='#badbc1';ctx.font='600 20px system-ui';ctx.fillText(card.pathway.title,left,y,width);y+=28;
                ctx.fillStyle='#d4e0dc';ctx.font='400 19px system-ui';ctx.fillText(card.pathway.progress,left,y,width);y+=27;
                infoPages(card.pathway.explanation,Math.max(26,Math.floor(width/13)),2)[0].forEach(line=>{ctx.fillText(line,left,y,width);y+=21;});y+=10;
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.fillRect(left,y-3,5,30);}
            if(card.title){ctx.fillStyle='#f3f8fc';ctx.font='650 27px system-ui';ctx.textAlign='center';ctx.fillText(card.title,left+width/2,y,width-10);ctx.textAlign='left';y+=48;}
            if(card.trail){ctx.fillStyle='#c9e0ed';ctx.font='500 21px system-ui';ctx.fillText(card.trail,left,y,width);y+=32;}
            const actionTop=Math.min(...card.controls.filter(item=>item.kind==='utility'||['TextSize','Recenter'].includes(item.action)).map(item=>item.y),card.height-76);
            const contentBottom=actionTop-14;
            ctx.save();ctx.beginPath();ctx.rect(left,y,width,Math.max(0,contentBottom-y));ctx.clip();
            ctx.fillStyle='#f3f8fc';ctx.font=(card.largeText?'500 31px':'500 27px')+' system-ui';
            const lineHeight=card.largeText?36:32;
            ctx.textAlign='center';card.lines.forEach(line=>{ctx.fillText(line,left+width/2,y,width);y+=lineHeight;});ctx.restore();
            if(card.hint){ctx.fillStyle='#d8e6e3';ctx.font='600 20px system-ui';ctx.textAlign='center';infoPages(card.hint,Math.max(24,Math.floor(width/11)),2)[0].forEach((line,index)=>ctx.fillText(line,left+width/2,actionTop-57+index*24,width-16));ctx.textAlign='left';}
            if(card.hoverHint){ctx.fillStyle='rgba(5,16,26,.88)';ctx.beginPath();ctx.roundRect(14,card.height-132,136,104,12);ctx.fill();ctx.strokeStyle='rgba(166,204,229,.32)';ctx.stroke();ctx.fillStyle='#d6e5eb';ctx.font='400 16px system-ui';infoPages(card.hoverHint,18,5)[0].forEach((line,index)=>ctx.fillText(line,24,card.height-120+index*18,116));}
            ctx.fillStyle='#d4e0dc';ctx.font='400 18px system-ui';ctx.fillText(card.metadata,left,card.height-23,width);
            if(card.tab==='Details' && card.page)ctx.fillText(card.page,right-65,card.height-20,65);
        }else if(!card.hidden){
            ctx.fillStyle=`rgba(18,41,30,${(card.infoOpacity ?? .38)*.15})`;ctx.fillRect(6,6,168,c.height-12);ctx.fillStyle=`rgba(34,54,43,${(card.infoOpacity ?? .38)*.15})`;ctx.fillRect(180,6,814,112);
            if(card.plant){ctx.fillStyle='#f1f4f4';ctx.font='600 32px system-ui';ctx.fillText(card.plant,200,22,770);}
            if(card.scientific){ctx.fillStyle='#bdc9cc';ctx.font='400 19px system-ui';ctx.fillText(card.scientific,200,67,770);}
            let contentTop=card.pathway?230:142;const titleX=card.accent?218:200,titleWidth=card.accent?752:772;
            if(card.pathway){
                ctx.fillStyle='#aaccc1';ctx.font='600 20px system-ui';ctx.fillText(card.pathway.title+(card.pathway.preview?' · PREVIEW':''),200,132,560);
                ctx.fillStyle='#b7c5c9';ctx.font='500 17px system-ui';ctx.fillText(card.pathway.progress,790,134,180);ctx.font='400 17px system-ui';
                infoPages(card.pathway.explanation,78,2)[0].forEach((line,index)=>ctx.fillText(line,200,162+index*21,772));
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
            if(card.accent){ctx.fillStyle=card.accent;ctx.globalAlpha=.92;ctx.fillRect(titleX,contentTop-6,5,32);ctx.globalAlpha=1;}
            ctx.fillStyle='#f1f4f4';ctx.font='600 26px system-ui';ctx.textAlign='center';ctx.fillText(card.title,titleX+titleWidth/2,contentTop,titleWidth);ctx.textAlign='left';
            if(card.trail){ctx.fillStyle='#b4c3c7';ctx.font='400 18px system-ui';ctx.fillText(card.trail,200,contentTop+38,772);}
            const bodyOffset=card.trail?75:47;
            card.lines.forEach((line,i)=>{ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 31px':'400 27px')+' system-ui';ctx.textAlign='center';ctx.fillText(line,titleX+titleWidth/2,contentTop+bodyOffset+i*(card.largeText?36:32),titleWidth);ctx.textAlign='left';});
            if(card.hoverHint){ctx.fillStyle='rgba(5,16,26,.88)';ctx.beginPath();ctx.roundRect(20,500,142,92,10);ctx.fill();ctx.fillStyle='#d6e5eb';ctx.font='400 15px system-ui';infoPages(card.hoverHint,18,4)[0].forEach((line,index)=>ctx.fillText(line,30,512+index*18,122));}
            const footerY=card.pathway?card.height-190:card.height-86;
            if(card.hint){ctx.fillStyle='#d8e6e3';ctx.font='600 21px system-ui';ctx.textAlign='center';infoPages(card.hint,72,2)[0].forEach((line,index)=>ctx.fillText(line,500,footerY-64+index*25,740));ctx.textAlign='left';}
            ctx.fillStyle='#b4c3c7';ctx.font='400 17px system-ui';ctx.fillText(card.metadata,200,footerY,600);
            if(card.tab==='Details')ctx.fillText(card.page,882,footerY,88);
        }
        card.controls.forEach(button=>{
            const radius=button.kind==='tab'?13:15;
            const isContinue=button.action==='Utility:continue';
            if(button.kind!=='tab' && button.kind!=='handle' && !button.disabled && !isContinue){ctx.fillStyle='rgba(4,9,12,.34)';ctx.beginPath();ctx.roundRect(button.x,button.y+5,button.width,button.height,radius);ctx.fill();}
            const face=ctx.createLinearGradient(button.x,button.y,button.x,button.y+button.height);
            if(isContinue){face.addColorStop(0,'rgba(10,26,29,.06)');face.addColorStop(1,'rgba(10,26,29,.12)');}
            else if(button.primary){face.addColorStop(0,'rgba(79,128,115,.18)');face.addColorStop(1,'rgba(29,69,68,.26)');}
            else if(button.selected){face.addColorStop(0,'rgba(140,205,235,.5)');face.addColorStop(1,'rgba(56,112,150,.4)');}
            else if(button.disabled){face.addColorStop(0,'rgba(211,220,225,.05)');face.addColorStop(1,'rgba(211,220,225,.025)');}
            else if(button.action==='Utility:close'){face.addColorStop(0,'rgba(159,101,82,.44)');face.addColorStop(1,'rgba(94,51,45,.38)');}
            else if(button.kind==='toggle'||button.kind==='handle'){face.addColorStop(0,'rgba(174,232,252,.4)');face.addColorStop(1,'rgba(61,137,177,.2)');}
            else {face.addColorStop(0,'rgba(119,169,198,.34)');face.addColorStop(.5,'rgba(56,93,122,.56)');face.addColorStop(1,'rgba(26,52,78,.74)');}
            ctx.fillStyle=face;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,radius);ctx.fill();
            if(button.kind!=='tab' && !button.disabled){ctx.strokeStyle=isContinue?'rgba(220,218,202,.72)':button.primary?'rgba(200,233,216,.82)':'rgba(232,244,240,.48)';ctx.lineWidth=isContinue?12:button.primary?3:2.5;ctx.stroke();}
            if(card.hoverAction===button.action && !button.disabled){ctx.fillStyle='rgba(219,237,216,.22)';ctx.fill();ctx.strokeStyle='rgba(245,247,222,.96)';ctx.lineWidth=isContinue?14:5;ctx.stroke();}
            if(button.selected){ctx.fillStyle='#9adcf4';ctx.fillRect(button.x,button.y+9,4,button.height-18);}
            ctx.fillStyle=button.disabled?'#899297':isContinue?'#e1dfd2':button.primary?'#f3fbf4':button.kind==='toggle'||button.kind==='handle'?'#a9e7fa':'#f1f7fb';ctx.font=(isContinue?'600 ':button.primary?'680 ':button.kind==='toggle'||button.kind==='handle'?'650 ':'600 ')+(isContinue?'44px':button.primary?'28px':button.kind==='toggle'||button.kind==='handle'?'26px':'21px')+' system-ui';ctx.textAlign='center';ctx.fillText(isContinue?button.label.toUpperCase():button.label,button.x+button.width/2,button.y+(button.height-(isContinue?44:button.primary?34:button.kind==='toggle'||button.kind==='handle'?30:28))/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;return renderer.hit(ray);}
    const controlsForTarget=target=>target?.card?.settings?settingsControls():(headset?spatialControls():controls());
    const targetButtonAtRay=target=>{
        if(!target?.width || !target.height)return null;
        const x=(target.localX/target.width+.5)*1000,logicalHeight=target.card?.height || (hidden?160:spatialHeight());
        const y=(.5-target.localY/target.height)*logicalHeight;
        return controlsForTarget(target).find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height) || null;
    };
    function spatialDimensions(){return {mainWidth:(hidden ? .38 : headset ? .84 : .66)*spatialScale,mainHeight:(hidden ? .11 : headset ? .50 : spatialHeight()/1000*.60)*spatialScale,mediaWidth:.66*spatialScale};}
    function spatialMediaDockPose(side){
        if(!pose)return null;
        const {mainWidth,mainHeight,mediaWidth}=spatialDimensions(),mediaHeight=mainHeight,gap=.035;
        if(side==='left'||side==='right')return companionPanelPose(pose,side,mainWidth,mediaWidth,18,gap);
        const direction=side==='bottom'?-1:1,distance=mainHeight/2+mediaHeight/2+gap;
        return {...pose,center:{x:pose.center.x+pose.up.x*distance*direction,y:pose.center.y+pose.up.y*distance*direction,z:pose.center.z+pose.up.z*distance*direction}};
    }
    function spatialDockCandidate(panelPose){
        if(!pose || !panelPose?.center)return null;
        const {mainWidth,mainHeight,mediaWidth}=spatialDimensions(),mediaHeight=mainHeight;
        const delta={x:panelPose.center.x-pose.center.x,y:panelPose.center.y-pose.center.y,z:panelPose.center.z-pose.center.z};
        const localX=delta.x*pose.right.x+delta.y*pose.right.y+delta.z*pose.right.z,localY=delta.x*pose.up.x+delta.y*pose.up.y+delta.z*pose.up.z;
        const candidates=[
            {side:'right',error:Math.abs(localX-(mainWidth+mediaWidth)/2),overlap:Math.abs(localY)<=(mainHeight+mediaHeight)/2+.06},
            {side:'left',error:Math.abs(localX+(mainWidth+mediaWidth)/2),overlap:Math.abs(localY)<=(mainHeight+mediaHeight)/2+.06},
            {side:'top',error:Math.abs(localY-(mainHeight+mediaHeight)/2),overlap:Math.abs(localX)<=(mainWidth+mediaWidth)/2+.06},
            {side:'bottom',error:Math.abs(localY+(mainHeight+mediaHeight)/2),overlap:Math.abs(localX)<=(mainWidth+mediaWidth)/2+.06}
        ].filter(candidate=>candidate.error<=.18 && candidate.overlap).sort((a,b)=>a.error-b.error);
        return candidates[0] || null;
    }
    function dockSpatialMedia(side){mediaDockSide=side || 'top';mediaDetached=false;mediaPose=null;mediaPosition=null;mediaCollapsed=false;render(true);}
    const api={element,
        showConfirmation(value={}){
            if(!confirmation){confirmationSnapshot={tab,page,hidden,settingsOpen,mediaCollapsed,detached,visibility:element.style.visibility};}
            confirmation={title:String(value.title || 'Close demo?'),body:String(value.body || 'Your current demo state will close. Choose Keep demo open to return, or Close demo to leave.')};
            tab='Details';page=0;hidden=false;settingsOpen=false;mediaCollapsed=true;detached=false;element.style.visibility='';render(true);
        },
        hideConfirmation(){
            if(!confirmation)return false;
            confirmation=null;
            const snapshot=confirmationSnapshot;confirmationSnapshot=null;
            if(snapshot){tab=snapshot.tab;page=snapshot.page;hidden=snapshot.hidden;settingsOpen=snapshot.settingsOpen;mediaCollapsed=snapshot.mediaCollapsed;detached=snapshot.detached;element.style.visibility=snapshot.visibility;}
            render(true);return true;
        },
        clearPlant(nextRecord){if(record!==nextRecord)return false;record=null;identity=null;selection=null;mediaCollapsed=true;loadPanelImage('');page=0;render(true);return true;},
        showLearning(content){
            record=null;identity=null;selection={...content,sources:[],editable:false,mesh:content?.mesh || 'lim'};
            const imageSource=content?.sketchImage || content?.image || '';
            mediaCollapsed=true;mediaTouched=false;
            if(imageSource)mediaCollapsed=false;
            loadPanelImage(imageSource,{delayMs:Number(content?.imageTransitionDelayMs)||0,discardPrevious:Boolean(content?.discardPreviousImage)});
            tab='Details';page=0;render(true);
        },
        setLearningModules(value,{open=false}={}){const previousTab=tab;moduleContext=value?{...value,actions:[...(value.actions||[])]}:null;if(open && moduleContext)tab='Help';page=0;if(previousTab==='Details' && tab==='Details')updateReading();else render();},
        setUtilityActions(items=[]){utilityActions=items.slice(0,8).map(item=>({...item}));render();},
        setHeaderProgress(value){headerProgress=value?.steps?.length?{label:String(value.label || 'Progress'),activeId:String(value.activeId || value.steps[0].id),steps:value.steps.map(step=>({id:String(step.id),label:String(step.label)}))}:null;render();},
        setXRPerformance(value){performanceSettings=value;renderSettings();},
        setContextualHint(message=''){contextHint=String(message || '');page=0;updateReading();},
        setPanelHints(values=[]){rotatingPanelHints=Array.isArray(values)?values.map(String).filter(Boolean):[];panelHintIndex=0;clearInterval(panelHintTimer);panelHintTimer=0;if(rotatingPanelHints.length>1)panelHintTimer=setInterval(()=>{panelHintIndex=(panelHintIndex+1)%rotatingPanelHints.length;if(!contextHint && !identity?.hint && tab!=='Help')updateReading();},7000);if(!contextHint && !identity?.hint && tab!=='Help')updateReading();},
        setMediaCollapsed(value=true){mediaCollapsed=Boolean(value);mediaTouched=false;render(true);},
        restore(){hidden=false;detached=false;element.style.visibility='';render(true);},
        setCompact(value=true){const compact=Boolean(value) && !isDesktopDemo();railCollapsed=false;if(compact)mediaCollapsed=true;element.classList.toggle('is-opening-compact',compact);if(!element.querySelector('.nlxr-media-wing') && showPlantPreview() && !mediaCollapsed)render(true);else syncPanelWings();},
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;render();},
        setPathwayContext(value){pathwayContext=value ? {...value,actions:[...(value.actions || [])]} : null;updatePathway();},
        setGuided(value){guided=Boolean(value);element.classList.toggle('is-guided',guided);},
        setIntroduction(value){introduction=Boolean(value);element.classList.toggle('is-intro-reveal',introduction);},
        focusPlant(nextRecord,document,media=null){
            const previousMedia=record===nextRecord ? identity?.media : null;
            const previousHint=record===nextRecord ? identity?.hint : '';
            const identityImage=document?.identity?.image;
            const nextMedia=media?.image ? {image:String(media.image),alt:String(media.alt || ''),caption:String(media.caption || '')}
                : identityImage ? {image:String(identityImage),alt:String(document.identity.imageAlt || document.identity.commonName || document.identity.scientificName || 'Plant'),caption:String(document.identity.imageCaption || '')}
                    : previousMedia;
            record=nextRecord;selection=null;identity={plant:document.identity?.commonName || document.identity?.scientificName || 'Plant',scientific:document.identity?.scientificName || '',media:nextMedia,hint:String(media?.hint || previousHint || '')};
            mediaCollapsed=!nextMedia?.image;mediaTouched=false;
            loadPanelImage(nextMedia?.image || '');
            tab='Details';page=0;render(true);
        },
        select(nextRecord,document,path){const next=pimInfoContent(document,path);if(!next)return false;const sameRecord=record===nextRecord,previous=sameRecord?identity?.media:null,previousHint=sameRecord?identity?.hint:'';const cellMedia=next.media;const image=cellMedia?.image || cellMedia?.url || cellMedia?.src || document?.identity?.image;const media=image?{image:String(image),alt:String(cellMedia?.alt || document.identity?.imageAlt || document.identity?.commonName || document.identity?.scientificName || 'Plant'),caption:String(cellMedia?.caption || document.identity?.imageCaption || '')}:previous;record=nextRecord;selection=next;identity={plant:next.plant,scientific:document.identity?.scientificName || '',media,hint:previousHint};loadPanelImage(media?.image || '');mediaCollapsed=!media?.image;mediaTouched=false;tab='Details';hidden=false;page=0;render(true);return true;},
        refresh(nextRecord,document){if(record===nextRecord && selection)api.select(record,document,selection.id);},
        suspend(value){element.style.visibility=value?'hidden':'';detached=Boolean(value);renderSettings();if(!value){updateReading();updatePathway();}},
        attach(gl){renderer?.destroy();renderer=createSpatialTotemCards(gl,{canvas,surfaces:(_position,_viewRight,cards)=>{
            if(!pose)return [];
            const {mainWidth,mainHeight,mediaWidth}=spatialDimensions();
            const surfaces=[{...pose,width:mainWidth,height:mainHeight,card:cards[0]}];
            const settingsCard=cards.find(card=>card.settings),mediaCard=cards.find(card=>card.media);
            const settingsWidth=.62*spatialScale,gap=0,companionHeight=mainHeight*.78;
            if(settingsOpen && !hidden && settingsCard)surfaces.push({...companionPanelPose(pose,'left',mainWidth,settingsWidth,18,gap),width:settingsWidth,height:mainHeight*(settingsCard.height/spatialHeight()),card:settingsCard});
            if(!hidden && mediaCard && (mediaDetached || !settingsOpen)){mediaPose ||= spatialMediaDockPose(mediaDockSide);const mediaSurface=mediaDetached?mediaPose:spatialMediaDockPose(mediaDockSide);if(mediaSurface)surfaces.push({...mediaSurface,width:mediaWidth,height:mainHeight,card:mediaCard});}
            return surfaces;
        }});element.hidden=true;settingsElement.hidden=true;syncDetachedMedia();},
        update(matrix,time=performance.now(),inputRay=null,xrFrame=null){
            const next=infoPanelPose(matrix,heading,headset,phoneAR);if(!next)return;heading=next.anchorHeading;
            const grab=spatialMove || spatialGrabPending;
            let heldTransform=null,handMoveRay=null;
            if(grab?.source?.hand && xrFrame){const pointer=handTrackingState(xrFrame,grab.source,grab.referenceSpace)?.pointer;handMoveRay=pointer?{...pointer,direction:grab.handDirection || pointer.direction}:null;}
            if(grab && !grab.source?.hand && xrFrame?.getPose && grab.source?.targetRaySpace && grab.referenceSpace){
                try{heldTransform=xrFrame.getPose(grab.source.targetRaySpace,grab.referenceSpace)?.transform.matrix || null;}catch{heldTransform=null;}
            }
            const heldRay=handMoveRay || (heldTransform?{origin:{x:heldTransform[12],y:heldTransform[13],z:heldTransform[14]},direction:{x:-heldTransform[8],y:-heldTransform[9],z:-heldTransform[10]}}:xrFrame?null:inputRay);
            if(spatialGrabPending && time-spatialGrabPending.startedAt>=PANEL_GRAB_HOLD_MS){
                if(heldRay && hit(heldRay)?.card?.id===spatialGrabPending.cardId){
                    if(spatialGrabPending.panel==='media' && !mediaDetached){mediaPose=spatialMediaDockPose(mediaDockSide);mediaDetached=true;mediaCollapsed=false;render(true);}
                    spatialMove={...spatialGrabPending,panel:spatialGrabPending.panel};onGrab(spatialGrabPending.source);
                }
                spatialGrabPending=null;
            }
            if(spatialMove && heldRay?.origin && heldRay?.direction){
                pose ||= next;
                if(spatialMove.panel==='media')mediaPose ||= spatialMediaDockPose(mediaDockSide);
                const current=spatialMove.panel==='media'?mediaPose:pose;
                const center=panelCenterFromGrab(heldRay,spatialMove,current);
                const facing=facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]});
                const moved={...current,center,...facing,anchorHeading:facing.right};
                if(spatialMove.panel==='media'){
                    mediaPose=moved;const candidate=spatialDockCandidate(mediaPose);
                    if(candidate){mediaPose=spatialMediaDockPose(candidate.side);spatialMove.dockSide=candidate.side;}else spatialMove.dockSide=null;
                }else{pose=moved;heading=facing.right;manuallyPositioned=true;}
            }else if(!pose){
                pose=next;
                if(headset && firstPlacement){
                    pose.center={x:pose.center.x-pose.right.x*.6,y:pose.center.y,z:pose.center.z-pose.right.z*.6};
                    pose={...pose,...facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
                }
                firstPlacement=false;
            }
            const hoverTarget=inputRay ? hit(inputRay) : null,hoverButton=targetButtonAtRay(hoverTarget);
            hoveredAction=hoverButton?.disabled?'':hoverButton?.action || '';
            const nextHoverDescription=hoverButton ? controlDescription(hoverButton) : '';
            const nextHoverPanelId=hoverTarget?.card?.id || '';
            if(nextHoverDescription!==hoveredDescription || nextHoverPanelId!==hoveredPanelId){hoveredDescription=nextHoverDescription;hoveredPanelId=nextHoverPanelId;}
            lastTime=time;
        },
        recenter(){heading=null;pose=null;mediaPose=mediaDetached?null:mediaPose;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;spatialGrabPending=null;},
        getPosition(){return pose?.center ? {...pose.center} : null;},
        draw(view){
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const pimPathSelected=hasPimPath(),plantMedia=Boolean(identity?.media?.image);
            const card={id:'control',infoOpacity,headset,hidden,tab,height:spatialHeight(),largeText,guided,grabState:spatialMove?.panel==='main'?'held':spatialGrabPending?.panel==='main'?'ready':hoveredPanelId==='control'?'hover':'',fadeDuration:introduction?1500:450,controls:headset?spatialControls():controls(),hoverAction:hoveredPanelId==='control'?hoveredAction:'',railCollapsed,mediaCollapsed,pathway:pathwayContext,progress:progressState(),accent:selection?.mesh==='lim'?selection.accent:'',plant:pimPathSelected?'':identity?.plant || selection?.plant || 'Control panel',scientific:pimPathSelected?'':identity?.scientific || (identity?'Selected plant':''),title:panelHeading(),trail:pimPathSelected?'':tab==='Details'?selection?.breadcrumb || '':'',lines:p[page],hint:currentHint(),hoverHint:hoveredPanelId==='control'?hoveredDescription:'',page:p.length>1?(page+1)+' / '+p.length:'',metadata:metadata()};
            const settingsCard={id:'settings',settings:true,infoOpacity,height:Math.max(spatialHeight(),performanceSettings?920:820),controls:settingsControls(),hoverAction:hoveredPanelId==='settings'?hoveredAction:'',hoverHint:hoveredPanelId==='settings'?hoveredDescription:''};
            const imageFade=Math.min(1,Math.max(0,(performance.now()-mediaFadeStartedAt)/(selection?.imageFadeMs || MEDIA_FADE_MS)));
            if(imageFade>=1)mediaPreviousImage=null;
            const preview=previewMedia(),mediaCard={id:'media',media:true,height:760,image:mediaImage,previousImage:mediaPreviousImage,imageFade,fadeDuration:selection?.imageFadeMs || MEDIA_FADE_MS,caption:plantMedia?(identity?.media?.caption || identity?.plant || ''):'',grabState:spatialMove?.panel==='media'?'held':spatialGrabPending?.panel==='media'?'ready':hoveredPanelId==='media'?'hover':'',hoverHint:hoveredPanelId==='media'?hoveredDescription:''};
            const cards=[card];if(settingsOpen)cards.push(settingsCard);if(!hidden && !mediaCollapsed && preview?.image && (mediaDetached || !settingsOpen))cards.push(mediaCard);
            renderer.begin();renderer.draw(view,{id:'companion'},pose.center,cards,'');renderer.end();
        },hit,
        activate(ray){const target=hit(ray);if(!target)return false;const button=targetButtonAtRay(target);if(button && button.action!=='MoveMediaPanel')act(button.action);return true;},
        bindSession(session,referenceSpace){removeXrControls();const handle=event=>{
            if(event.type==='selectstart' && finishingMoveSource===event.inputSource)finishingMoveSource=null;
            if(event.type==='selectend' && spatialMove?.source===event.inputSource){
                const moving=spatialMove,candidate=moving.panel==='media'?spatialDockCandidate(mediaPose):null;
                finishingMoveSource=event.inputSource;spatialMove=null;
                if(moving.panel==='media' && candidate)dockSpatialMedia(candidate.side);
                event.stopImmediatePropagation();return;
            }
            if(event.type==='selectend' && spatialGrabPending?.source===event.inputSource){
                if(performance.now()-spatialGrabPending.startedAt>=PANEL_GRAB_HOLD_MS)finishingMoveSource=event.inputSource;
                spatialGrabPending=null;event.stopImmediatePropagation();return;
            }
            if(event.type==='select' && (spatialMove?.source===event.inputSource || finishingMoveSource===event.inputSource)){finishingMoveSource=null;event.stopImmediatePropagation();return;}
            if(event.type==='selectend' && panelGestureSource!==event.inputSource)return;
            if(event.type==='select' && panelGestureSource && panelGestureSource!==event.inputSource)return;
            const handRay=event.inputSource?.hand ? handTrackingState(event.frame,event.inputSource,referenceSpace)?.pointer : null;
            const targetRaySpace=event.inputSource?.targetRaySpace;
            const transform=targetRaySpace ? event.frame?.getPose(targetRaySpace,referenceSpace)?.transform.matrix : null;
            if(!handRay && !transform)return;
            const ray=handRay || {origin:{x:transform[12],y:transform[13],z:transform[14]},direction:{x:-transform[8],y:-transform[9],z:-transform[10]}};
            const target=hit(ray);if(!target){if(event.type==='selectend' && panelGestureSource===event.inputSource){panelGestureSource=null;event.stopImmediatePropagation();}return;}
            event.stopImmediatePropagation();
            const button=targetButtonAtRay(target);
            if(event.type==='selectstart' && target.card?.id==='media'){
                panelGestureSource=event.inputSource;
                spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'media',cardId:'media',startedAt:performance.now(),handDirection:event.inputSource?.hand?{...ray.direction}:null};
                return;
            }
            if(event.type==='selectstart' && target.card?.id==='control' && !hidden){
                panelGestureSource=event.inputSource;
                spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'main',cardId:'control',startedAt:performance.now(),handDirection:event.inputSource?.hand?{...ray.direction}:null};
                return;
            }
            if(event.type==='select' && !spatialMove){spatialGrabPending=null;api.activate(ray);}
            if(event.type==='selectend')panelGestureSource=null;
        };const visibility=()=>{if(session.visibilityState!=='visible'){spatialGrabPending=null;spatialMove=null;finishingMoveSource=null;panelGestureSource=null;}};for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);session.addEventListener('visibilitychange',visibility);
            removeXrControls=()=>{spatialGrabPending=null;spatialMove=null;finishingMoveSource=null;panelGestureSource=null;for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);session.removeEventListener('visibilitychange',visibility);};},
        destroy(){mediaLoadToken++;clearTimeout(mediaTransitionTimer);clearInterval(panelHintTimer);mediaImage=null;mediaPreviousImage=null;removePanelMove();removeXrControls();renderer?.destroy();renderer=null;mediaFloating?.remove();element.remove();settingsElement.remove();}
    };render();return api;
}
