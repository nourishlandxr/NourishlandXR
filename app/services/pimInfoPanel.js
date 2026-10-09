import {limoSpatialControls,drawLimoSpatialControls,drawLimoSpatialReading} from './limoSpatialPresentation.js';
import {pimToArKnowledge} from './pimModel.js';
import {spatialControlLayout} from './spatialControlLayout.js';
import {currentNxrLanguage,setNxrLanguage,translateNxrText as t,translateApp,localizedCanvasContext} from './i18n.js';
import {rebaseXrPose} from './xrWorldRebase.js';
import {ensureExplorerMolecule,initializeExplorerPreview,explorerMoleculeIndex,explorerMoleculeAction,explorerDetailDocument,explorerSelectedPath,explorerPuzzleFit,EXPLORER_RECIPES,EXPLORER_RECIPE} from './explorerMoleculeModel.js';
import {ensureKnowledgeObjects,selectedKnowledgeObject,selectKnowledgeObjectFace,spawnKnowledgeObject} from './knowledgeObjectModel.js';
import {knowledgeExplorer,knowledgeExplorerAction,savedKnowledgeDiscovery,KNOWLEDGE_MODES,availablePimoModes,rememberKnowledgeSelection} from './knowledgeExplorer.js';
import {subscribePimoCapabilities,supportsSpatialPIMO,isPimoDeveloperOverride} from './pimoSpatialCapabilities.js';
import {prepareLivingFrameArtwork} from './livingFrameArtwork.js';
import {loadPreparedImage} from './arAssetPreparation.js';
import {ORB_MODELS,TOTEM_MODELS,RAIN_QUALITIES,resolveGraphicsQuality,currentTotemModel,getSpatialVisualSettings,currentInfoOpacity,currentOrbModel,setSpatialVisualSettings} from './spatialVisualSettings.js';
import { pimAncestors, pimKnowledgeScope } from './pimModel.js';
import { createSpatialTotemCards, hitTotemSurface } from './spatialTotemCards.js';
import { handTrackingState } from './xrPointer.js';
import {fruitWindowSpecies} from './fruitWindowInteraction.js';
import { createHandPokeTracker,handIndexCanPoke } from './handPoke.js';

export const INFO_HELP = `Aim at an object to highlight it. Press a plant cell once to read or expand its information here. Select a Plant Orb to explore information connected to that plant.

Build this in Project Creator
Areas organise real places. Totems welcome and orient visitors. Plant Orbs connect plant knowledge to actual plants, while Notes preserve observations, instructions and provenance. Area links create routes between physical locations. Project maps can use plans, aerial images, hand-drawn layouts or mapped positions, and published information can be updated as a site changes.

NLXR connects knowledge to real plants and real places. Check information against the plant, season and conditions around you. Visual weather is an experience effect, not a sensor reading. Keep location, source and date with local observations.`;
const PANEL_GRAB_HOLD_MS = 800;
const PANEL_GRAB_CANCEL_DISTANCE_PX = 14;

// This is a reading projection, never a second store of plant knowledge.
export function pimInfoContent(document, path) {
    const node = document?.nodes?.find(item => item.id === path || item.path === path);
    if (!node) return null;
    return { id: node.id, path: node.path, title: node.title,
        ...(node.explorerSample || node.explorerWing?{editable:false}:{}),
        plant: document.identity?.commonName || document.identity?.scientificName || document.plantId,
        breadcrumb: [...pimAncestors(document, node.id).map(item => item.title), node.title].join(' › '),
        body: node.body || 'No detailed information has been added to this cell yet.',
        media: (node.media || []).find(item => item && (item.image || item.url || item.src)) || null,
        scope: pimKnowledgeScope(node), status: node.status, evidence: node.evidenceStatus,
        safety: node.safetyNote || '',
        sourceLinks:(node.sourceIds || []).map(id=>document.sources?.find(source=>source.id===id)).filter(source=>/^https?:\/\//i.test(source?.url || '')).map(source=>({label:source.title || source.name || 'Source',url:source.url})),
        sources: (node.sourceIds || []).map(id => document.sources?.find(source => source.id === id))
            .filter(Boolean).map(source => source.title || source.name || source.url || source.id) };
}

// Keep DOM previews and decoded XR images on the same selected artwork.
// Coloured pathway illustrations are primary; sketches remain a fallback.
export function learningPanelMedia(content) {
    const image=content?.image || content?.sketchImage;
    if(!image)return null;
    return {image,alt:(content.image ? content.imageAlt : content.sketchImageAlt) || content.title || '',caption:content.title || '',plant:false,fit:content.imageFit || 'contain'};
}

export function pimPanelMedia(document,selection=null,fallback=null,previous=null) {
    const cell=selection?.media;
    const cellImage=cell?.image || cell?.url || cell?.src;
    if(cellImage)return {image:String(cellImage),alt:String(cell.alt || selection.title || ''),caption:String(selection.title || '')};
    if(fallback?.image)return {image:String(fallback.image),alt:String(fallback.alt || ''),caption:String(document?.identity?.commonName || '')};
    const identity=document?.identity;
    if(identity?.image)return {image:String(identity.image),alt:String(identity.imageAlt || identity.commonName || identity.scientificName || 'Plant'),caption:String(identity.commonName || '')};
    return previous;
}

export function infoPages(text, columns = 48, rows = 10) {
    const lines = [];
    for (const paragraph of String(t(text) || '').split('\n')) {
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
    return {anchorHeading:right,center,...facePanelTowardEyes(center,{x:matrix[12],y:center.y+(headset?.08:0),z:matrix[14]})};
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
    if(hidden)return [{action:'Restore',label:'Show',ariaLabel:'Show control panel · Grip to move',x:50,y:50,width:900,height:900}];
    if(utilityActions.some(item=>item.id==='close-cancel'))return utilityActions.filter(item=>['close-cancel','close-confirm'].includes(item.id)).map((item,index)=>({action:'Utility:'+item.id,label:item.label,kind:'utility',primary:item.id==='close-confirm',disabled:Boolean(item.disabled),x:238+index*370,y:height-90,width:362,height:64}));
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
    buttons.push({action:'Hide',label:'▣ Minimize',ariaLabel:'Minimize control panel. Show panel restores it.',kind:'menu',x:18,y:284+menuUtilities.length*62,width:174,height:54});
    buttons.push({action:'Notes',label:'▤ Notes',ariaLabel:'Create or select a Note',kind:'menu',x:18,y:height-76,width:174,height:54});
    if(pageCount>1)buttons.push({action:'Previous',label:'Summary',ariaLabel:'Return to the topic summary',kind:'pager',x:650,y:130,width:146,height:42,disabled:page===0},{action:'Next',label:'More info →',ariaLabel:'Read further information in this panel',kind:'pager',x:804,y:130,width:166,height:42,disabled:page>=pageCount-1});
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
// Companion openers share their names and show/hide state in screen and XR views.
export function panelOpenerControls({mediaCollapsed=true,explorerClosed=true,settingsOpen=false}={}){
    return [
        {action:'ToggleMedia',label:'Image',expanded:!mediaCollapsed},
        {action:'Explorer',label:'Controls',expanded:!explorerClosed},
        {action:'Settings',label:'Settings',expanded:settingsOpen}
    ].map((item,index)=>({...item,kind:'menu',panelOpener:true,selected:item.expanded,status:'',
        ariaLabel:`${item.expanded?'Hide':'Show'} ${item.label} panel`,x:18,y:174+index*62,width:174,height:54}));
}
export function controlPanelHeight(lines,largeText=false,pathway=false,utilities=0,moduleCount=0){
    const items=Array.isArray(utilities)?utilities.slice(0,8):[],count=items.length || Math.min(8,Number(utilities)||0);
    const hasPrimary=items.some(item=>item.primary || item.id==='continue');
    const rows=Math.ceil((count-(hasPrimary?1:0))/2)+(hasPrimary?1:0);
    return Math.max(pathway?760:620,390+Math.min(7,lines)*(largeText?46:38)+(pathway?120:0))+(rows+moduleCount)*62+(hasPrimary?10:0);
}

// One row model drives both the DOM companion and the Quest canvas/hit regions.
export function panelSettingsControls({simpleDesktop=false,headset=false,largeText=false,handVisualMode='outline',spatialScale=1,performanceSettings=null,infoOpacity=.38,cellOpacity=.42,orbModel='improved',totemModel='botanical',rainEnabled=true,graphicsQuality=getSpatialVisualSettings().graphicsQuality,rainQuality=getSpatialVisualSettings().rainQuality,floorOffset=0,insects=getSpatialVisualSettings().insects,graphicsOpen=false,soundOpen=false,languageOpen=false,demoSound=null}={}){
    const choice=(action,label,group,title,y,x=540,width=404)=>({action,label,ariaLabel:title || label,settingGroup:group,settingLabel:title,x,y,width,height:58});
    const slider=(action,group,title,value,min,max,step,y)=>({...choice(action,'',group,title,y),kind:'slider',value,min,max,step});
    const includeLanguage=simpleDesktop || typeof document!=='undefined';
    const navigation=choice('GraphicsMenu',graphicsOpen?'‹ General':'Graphics ›','navigation','',100,56,888);
    const close={...choice('CloseSettings','Done','close','Close settings',26,806,138),kind:'settings-close'};
    if(languageOpen)return [choice('LanguageMenu','‹ General','navigation','',100,56,888),...[['en','English'],['pt-PT','Português (Portugal)'],['nl-NL','Nederlands']].map(([code,label],index)=>({...choice('Language:'+code,label,'language','Language',202+index*88,56,888),selected:currentNxrLanguage()===code})),close];
    if(soundOpen && demoSound)return [choice('SoundMenu','‹ General','navigation','',100,56,888),slider('MusicVolume','music','Music volume',demoSound.music,0,1,.01,202),slider('FxVolume','fx','FX volume',demoSound.fx,0,1,.01,290),choice('Haptics',demoSound.haptics?'On':'Off','haptics','Haptics',378),close];
    if(simpleDesktop)return [slider('TextSize','text','Text size',largeText?1:0,0,1,1,184),choice('LanguageMenu','Language ›','language','',290,56,888),choice('SettingsHelp','Help','help','',378,56,888),close];
    const rates=Array.from(performanceSettings?.supported || []).filter(rate=>[60,72,90,120].includes(rate)).sort((a,b)=>a-b);
    const safeRate=Math.max(0,...rates.filter(rate=>rate<=90)) || rates[0];
    const rateWidth=(464-12*Math.max(0,rates.length-1))/Math.max(1,rates.length);
    const rateControls=rates.map((rate,index)=>({...choice(rate===safeRate?'RefreshRate':`RefreshRate:${rate}`,`${rate} Hz`,'performance','Refresh rate / FPS',550,56+index*(rateWidth+12),rateWidth),selected:performanceSettings.actual===rate,disabled:performanceSettings.pending && rate>90}));
    if(graphicsOpen)return [navigation,
        choice('GraphicsQuality',graphicsQuality==='auto'?`Auto · ${resolveGraphicsQuality().toUpperCase().replace('MEDIUM','MED')}`:graphicsQuality.toUpperCase().replace('MEDIUM','MED'),'graphics','Graphics quality',202),
        ...(rainEnabled?[choice('RainQuality',RAIN_QUALITIES[rainQuality]?.label || 'Off','rain','Rain quality',290)]:[]),
        choice('Insects',insects?'On':'Off','insects','Insects',358),
        choice('OrbModel',`Orb · ${ORB_MODELS[orbModel]?.label || 'Improved'}`,'models','Object styles',446,56,420),
        ...(performanceSettings?[...rateControls,choice('ShowFps',performanceSettings.showFps?'On':'Off','fps','FPS / CPU readout',620,540,404)]:[]),
        choice('SettingsHelp','Help','help','',746,56,888),close];
    return [
        slider('InfoOpacity','info-opacity','Main / Control glass',infoOpacity,0,1,.01,104),
        slider('TextSize','text','Text size',largeText?1:0,0,1,1,184),
        slider('SpatialScale','scale','Panel size',spatialScale,.85,1.2,.01,264),
        slider('FloorOffset','floor','Floor height',floorOffset,-1.5,1.5,.01,344),
        ...(headset?[choice('HandMode',handVisualMode==='pointer'?'Pointer':'Hand tracking','hands','Hands',424)]:[]),
        {...choice('HeroDice','Floor dice','hero-dice','',488,56,438),settingLabel:'',height:50,selected:getSpatialVisualSettings().heroDice!==false},
        {...choice('LivingFrame','Frame animation','living-frame','',488,506,438),settingLabel:'',height:50,selected:getSpatialVisualSettings().livingFrame!==false},
        slider('CellOpacity','cell-opacity','PIMO / LIMO cell glass',cellOpacity,0,1,.01,570),
        ...(demoSound?[choice('SoundMenu','Sound ›','sound','',658,56,420)]:[]),...(includeLanguage?[choice('LanguageMenu','Language ›','language','',658,496,448)]:[]),
        {...navigation,y:720,width:420},choice('SettingsHelp','Help','help','',720,496,448),close];
}
export function panelSliderValue(control,x){
    const fraction=Math.max(0,Math.min(1,(x-control.x-18)/(control.width-36)));
    const value=control.min+fraction*(control.max-control.min);
    return Math.max(control.min,Math.min(control.max,Number((control.min+Math.round((value-control.min)/control.step)*control.step).toFixed(3))));
}
export function drawPanelSettingSlider(ctx,item,aimed=false){
    const left=item.x+18,right=item.x+item.width-18,y=item.y+item.height/2;
    const value=(item.value-item.min)/(item.max-item.min),thumb=left+(right-left)*value;
    ctx.lineCap='round';ctx.lineWidth=aimed?9:7;
    ctx.strokeStyle='rgba(222,234,223,.25)';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    ctx.strokeStyle=aimed?'#e4edcf':'#afc8ae';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(thumb,y);ctx.stroke();
    ctx.fillStyle=aimed?'#f0f3db':'#d0dfc9';ctx.beginPath();ctx.arc(thumb,y,aimed?16:13,0,Math.PI*2);ctx.fill();
}

// The headset uses the same actions as the screen panel, but lays them out in
// three independently collapsible regions. These rectangles also drive ray hits.
export function spatialPanelControls({hidden=false,height=800,railCollapsed=false,mediaCollapsed=true,items=[]}={}){
    if(hidden)return [{action:'Restore',label:'Show',ariaLabel:'Show control panel · Grip to move',...items.find(item=>item.action==='Restore'),x:50,y:50,width:900,height:900}];
    const rail=164,media=0;
    const left=rail+22,width=1000-rail-44;
    const button=(item,x,y,w,h)=>({...item,description:item.description || controlDescription(item),x,y,width:w,height:h});
    const result=[];
    const visibility=items.filter(item=>item.kind==='visibility');
    if(visibility.length){visibility.forEach((item,index)=>result.push(button(item,18+index*244,height-64,232,48)));height-=64;}
    const menu=items.filter(item=>['tab','menu'].includes(item.kind)),openers=menu.filter(item=>item.panelOpener),otherMenu=menu.filter(item=>!item.panelOpener);
    openers.forEach((item,index)=>result.push(button(item,16,150+index*56,rail-28,46)));
    const menuStart=150+openers.length*56+(openers.length?26:0);
    otherMenu.forEach((item,index)=>result.push(button(item,16,menuStart+index*50,rail-28,40)));
    const primary=items.find(item=>item.kind==='utility' && (item.primary || item.action==='Utility:continue'));
    const secondary=items.filter(item=>item.kind==='utility' && item!==primary);
    const pager=items.filter(item=>item.kind==='pager');
    const history=items.filter(item=>item.kind==='history');
    const module=items.filter(item=>item.kind==='module'),pathway=items.filter(item=>item.kind==='pathway');
    const closePair=items.filter(item=>['Utility:close-cancel','Utility:close-confirm'].includes(item.action));
    if(closePair.length===2){closePair.forEach((item,index)=>result.push(button(item,left+index*(width/2+4),height-82,width/2-4,64)));return result;}
    const primaryY=primary?height-82:height-20;
    if(primary)result.push(button(primary,left,primaryY,width,64));
    pager.forEach((item,index)=>result.push(button(item,left+width-320+index*164,98,156,36)));
    history.forEach((item,index)=>result.push(button(item,16+index*46,menuStart+otherMenu.length*50,40,38)));
    const rows=Math.ceil(secondary.length/2);
    const references=items.filter(item=>item.kind==='reference').slice(0,2);
    let y=primaryY-(rows*40+module.length*42+pathway.length*42+(references.length?44:0)+8);
    references.forEach((item,index)=>result.push(button(item,left+index*174,y,166,36)));if(references.length)y+=44;
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
        Settings:'Show or hide the Settings panel for reading comfort, graphics and sound.',
        GraphicsMenu:'Open graphics quality, rain and object styles, or return to General settings.',
        SettingsHelp:'Open the full Help page in the Control panel.',
        CloseSettings:'Close Settings. The image stays open.',
        Previous:'Show the previous page.',
        Next:'Show the next page.',
        ToggleMedia:'Show or hide the Media panel for the selected image.',
        Explorer:'Show or hide the PIMO controls, including Fruit Window.',
        ToggleMediaDetach:'Detach or dock the media panel.',
        'Utility:close':'Close the current demo experience.',
        'Utility:continue':'Continue to the next demo step.',
        GraphicsQuality:'Set Orb, Totem and living-frame quality together. Changing preset also sets its default rain; styles stay as chosen.',
        Insects:'Show or hide bees and butterflies.',
        RainQuality:'Cycle Off, Low, High and HQ rain. HQ adds soft streaks, glints and animated ground ripples.' ,
        TextDown:'Reduce the reading text size.',
        TextUp:'Increase the reading text size.',
        Recenter:'Return the panel to its comfortable forward position.',
        HandMode:'Hand tracking: brush to highlight, press with your index fingertip to select. Pinch for distant controls. Pointer is optional.'
    };
    return item.description || descriptions[item.action] || item.ariaLabel || item.label || 'Activate this control.';
}

let panelInstance=0;
export function createPimInfoPanel({ onLimoAction = () => {}, root, headset = false, phoneAR = false, simpleDesktop = false, rainIntensity = 1, rainStyle = 'v2', cellOpacity = getSpatialVisualSettings().cellOpacity, handMode=getSpatialVisualSettings().handMode, rainEnabled=true, panelHints = [], onFloorOffset=()=>{}, onGraphicsQuality=()=>{}, onRainQuality=()=>{}, onPerformanceAction=()=>{}, onInfoOpacity=()=>{}, onOrbModel=()=>{}, onTotemModel=()=>{}, onHandMode=()=>{}, onRainIntensity = () => {}, onRainStyle = () => {}, onCellOpacity = () => {}, onGrab = () => {}, onGripEvent = () => false, inputOccupied = () => false, onInteract = () => {}, onExplorerAction = () => {}, demoSound=null, onEdit = () => {}, onPathwayAction = () => {}, onModuleAction = () => {}, onUtilityAction = () => {}, onMove = () => {} } = {}) {
    root?.classList.toggle('is-simple-desktop-ar',simpleDesktop);
    let rayFilter=()=>true;
    let graphicsQuality=getSpatialVisualSettings().graphicsQuality,rainQuality=getSpatialVisualSettings().rainQuality;
    let floorOffset=getSpatialVisualSettings().floorOffset;
    let performanceSettings=null,infoOpacity=currentInfoOpacity(),orbModel=currentOrbModel(),totemModel=currentTotemModel();
    const HEAVY_RAIN_INTENSITY=1.65;
    let selection=null,record=null,identity=null,page=0,hidden=false,tab='Details',largeText=getSpatialVisualSettings().largeText,settingsOpen=false,spatialScale=getSpatialVisualSettings().spatialScale,ambientRain=Math.max(0,Math.min(HEAVY_RAIN_INTENSITY,Number(rainIntensity)||0)),ambientRainStyle=rainStyle==='v1'?'v1':'v2',meshCellOpacity=Math.max(0,Math.min(1,Number(cellOpacity) || 0)),contextHint='',handVisualMode=handMode==='pointer'?'pointer':'outline';
    let mediaImage=null,mediaImageSource='',mediaPreviousImage=null,mediaFadeStartedAt=0,mediaLoadToken=0,mediaRevision=0,mediaTransitionTimer=0,mediaPreviewBlocked=false,mediaTouched=false,mediaDetached=false,mediaDockSide='top',mediaFloating=null,mediaPosition=null,mediaPointerDrag=null,ignoreMediaClickUntil=0;
    let visibleMedia=null;
    const MEDIA_FADE_MS=650;
    let rotatingPanelHints=Array.isArray(panelHints)?panelHints.map(String).filter(Boolean):[],panelHintIndex=0,panelHintTimer=0;
    let railCollapsed=headset?false:(globalThis.matchMedia?.('(max-width:600px)').matches || false),mediaCollapsed=headset||railCollapsed;
    let renderer=null,pose=null,heading=null,lastTime=0,detached=false,guided=false,introduction=false,pathwayContext=null,moduleContext=null,utilityActions=[],headerProgress=null,taskProgress=null,hoveredPanelId='',hoveredDescription='',hoveredAction='';
    let fruitWindow=null,fruitVisible=false,fruitPending=null,fruitDestroyed=false,fruitGl=null,fruitSession=null,fruitSpace=null,fruitIdentity=null,fruitExample=null;
    let visibilityItems=[],visibilitySignature='';
    const visiblePimoModes=()=>availablePimoModes().filter(mode=>mode!=='explore'||isPimoDeveloperOverride()&&new URLSearchParams(globalThis.location?.search||'').get('explorerConcept')==='1');
    const hideFruitWindow=()=>{fruitVisible=false;fruitWindow?.hide();renderExplorer();};
    async function loadFruitWindow(){
        fruitVisible=true;
        if(fruitWindow){fruitWindow.show(fruitIdentity||identity||{});if(fruitExample)fruitWindow.chooseExample(fruitExample);renderExplorer();return;}
        renderExplorer();
        if(fruitPending)return;
        fruitPending=import('./fruitWindowExperience.js');
        try{const {createFruitWindowExperience}=await fruitPending;if(fruitDestroyed||!fruitVisible)return;
            fruitWindow=createFruitWindowExperience({root:root||document.body,identity:fruitIdentity||identity||{},onHide:hideFruitWindow,onState:()=>{if(!fruitDestroyed)renderExplorer();}});
            if(fruitExample)fruitWindow.chooseExample(fruitExample);
            if(fruitGl)fruitWindow.attach(fruitGl);if(fruitSession)fruitWindow.bindSession(fruitSession,fruitSpace);
            if(!fruitVisible)fruitWindow.hide();
        }catch(error){fruitVisible=false;contextHint='Fruit Window could not load. Please try again.';console.error('[Fruit Window] Could not start',error);}
        finally{fruitPending=null;if(!fruitDestroyed)renderExplorer();}
    }
    const panelCanvases=new Map();let explorerPose=null,explorerPosition=null,explorerClosed=true,panelModeChoice=null,knowledgeRecord=null,knowledgeDocument=null;
    const explorerElement=document.createElement('aside');explorerElement.className='nlxr-settings-companion nlxr-explorer-companion';explorerElement.setAttribute('aria-label','Knowledge options');explorerElement.hidden=true;root?.append(explorerElement);
    let confirmation=null,confirmationSnapshot=null;
    let objectContext=null,stageContext=null,panelShift=null,guidanceAction='',guidanceStartedAt=0,minimizedDragUntil=0;
    let sliderGrab=null,finishingSliderSource=null,graphicsOpen=false,soundOpen=false,languageOpen=false;
    let spatialMove=null,spatialGrabPending=null,finishingMoveSource=null,panelGestureSource=null,manuallyPositioned=false,firstPlacement=true,mediaPose=null,settingsPose=null;
    let removeXrControls=()=>{};
    let handReferenceSpace=null;
    const handPokes=new Map(),handContacts=new Map(),handSelections=new WeakMap();
    const element=document.createElement('aside'),settingsElement=document.createElement('aside'),contentId='control-panel-content-'+(++panelInstance);
    element.className='nlxr-info-panel';element.setAttribute('aria-label','Control panel');root?.append(element);
    settingsElement.className='nlxr-settings-companion';settingsElement.setAttribute('aria-label','Settings companion panel');settingsElement.hidden=true;root?.append(settingsElement);
    const isDesktopDemo=()=>Boolean(root?.querySelector('.tryit-demo.is-desktop-spatial-preview'));
    const text=()=>{
        if(confirmation)return confirmation.body;
        if(tab==='Help')return [moduleContext?.body,INFO_HELP].filter(Boolean).join('\n\n');
        const reading=selection?[selection.body,selection.safety && 'Safety: '+selection.safety,!selection.sourceLinks?.length && selection.sources.length && 'Sources: '+selection.sources.join('; ')].filter(Boolean).join('\n\n')
            :identity?knowledgeRecord?.knowledgeExplorer?.mode==='explore'?knowledgeRecord.explorerMolecule?.puzzle?.phase==='connector'?'Build this branch: grip the loose arm, move it to the matching socket and release to attach.':knowledgeRecord.explorerMolecule?.puzzle?.phase==='piece'?'Arm attached. Grip the topic, fit it onto the free end and release to build the branch.':'Your dice holds the plant name and main topic faces. Open a face to reveal a loose arm, then attach the arm and its topic to build your own structure. '+(knowledgeRecord.explorerMolecule?.purpose || ''):'Curiosity reveals six perspectives on this plant.'
                :'Information about what you select will appear here.';
        // Keep authored paragraphs; give a long unbroken reading body breathing room.
        if(reading.includes('\n') || reading.length<230)return reading;
        const sentences=reading.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [reading];
        return sentences.reduce((parts,sentence,index)=>{if(index%2===0)parts.push(sentence.trim());else parts[parts.length-1]+=' '+sentence.trim();return parts;},[]).join('\n\n');
    };
    const currentHint=()=>confirmation || tab==='Help'?'':contextHint || (record && identity?KNOWLEDGE_MODES[knowledgeExplorer(record).mode].hint:'') || identity?.hint || rotatingPanelHints[panelHintIndex] || '';
    const pages=()=>infoPages(text(),headset?(largeText?44:52):(largeText?46:54),guided?1000:pathwayContext?4:headset&&(headerProgress||taskProgress)?5:7);
    const title=()=>confirmation?.title || (tab==='Help'?'Help':selection?.hideTitle?'':selection?.title || '');
    const hasPimPath=()=>Boolean(selection && identity);
    const pimPath=()=>{
        if(!hasPimPath())return '';
        const plant=String(identity?.plant || selection?.plant || '').trim();
        const trail=String(selection?.breadcrumb || selection?.title || '').split(/\s*[›>]\s*/).filter(Boolean);
        const parts=plant && trail[0]?.toLowerCase()!==plant.toLowerCase() ? [plant,...trail] : trail;
        return parts.join(' > ');
    };
    const panelHeading=()=>title();
    const readingTrail=()=>{
        const parts=String(hasPimPath()?pimPath():selection?.breadcrumb || '').split(/\s*[›>]\s*/).filter(Boolean);
        if(parts.at(-1)?.toLowerCase()===panelHeading().toLowerCase())parts.pop();
        return parts.join(' › ');
    };
    const hasPimPathHeading=()=>false;
    const selectionMetadata=()=>selection && tab==='Details'?[selection.scope==='specimen'?'Local observation':selection.scope==='species'?'Species knowledge':'',selection.status==='draft'?'Draft':'',selection.evidence==='needs_review'?'Awaiting review':''].filter(Boolean).join(' · '):'';
    const metadata=()=>selectionMetadata();
    const previewMedia=()=>mediaPreviewBlocked ? null : selection?.mesh==='lim'
        ? learningPanelMedia(selection)
        : identity?.media?.image ? {...identity.media,caption:identity.media.caption || identity.plant,plant:true} : null;
    const showPlantPreview=()=>Boolean(previewMedia()?.image);
    function loadPanelImage(source,{delayMs=0,discardPrevious=false}={}){
        if(source===mediaImageSource && (!source || mediaImage))return;
        const token=++mediaLoadToken;
        clearTimeout(mediaTransitionTimer);mediaTransitionTimer=0;
        mediaPreviewBlocked=delayMs>0;
        if(discardPrevious){mediaPreviousImage=null;mediaImage=null;mediaImageSource='';visibleMedia=null;mediaFadeStartedAt=performance.now();}
        if(!source){mediaPreviousImage=mediaImage;mediaImage=null;mediaImageSource='';mediaFadeStartedAt=performance.now();return;}
        const beginLoad=()=>{
            if(token!==mediaLoadToken)return;
            loadPreparedImage(source).then(image=>{if(token!==mediaLoadToken)return;if(discardPrevious)mediaPreviousImage=null;else mediaPreviousImage=mediaImage;mediaImage=image;mediaImageSource=source;mediaRevision++;mediaFadeStartedAt=performance.now();render(true);})
                .catch(()=>{if(token!==mediaLoadToken)return;if(discardPrevious)mediaPreviousImage=null;else mediaPreviousImage=mediaImage;mediaImage=null;mediaImageSource=source;mediaFadeStartedAt=performance.now();});
        };
        if(delayMs>0){mediaTransitionTimer=setTimeout(()=>{mediaTransitionTimer=0;mediaPreviewBlocked=false;beginLoad();render(true);},delayMs);return;}
        beginLoad();
    }
    const height=()=>controlPanelHeight(pages()[page]?.length || 0,largeText,Boolean(pathwayContext),utilityActions,tab==='Help'?(moduleContext?.actions?.length||0):0)+(guided?Math.max(0,(pages()[0]?.length || 0)-7)*(largeText?46:38)+80:0)+(visibilityItems.length?64:0);
    const contentKind=()=>selection?.mesh==='lim' || (!selection && !identity) ? 'lim' : 'pim';
    const mainUtilities=()=>utilityActions.filter(item=>!['safety','recenter'].includes(item.id));
    const panelOpeners=()=>panelOpenerControls({mediaCollapsed,explorerClosed,settingsOpen});
    const controls=()=>{
        let items=controlPanelControls({hidden,tab,selected:confirmation?false:Boolean(selection && selection.editable!==false),page,pageCount:pages().length,height:height(),largeText,contentKind:contentKind(),pathwayActions:confirmation?[]:pathwayContext?.actions || [],moduleActions:confirmation?[]:moduleContext?.actions || [],utilityActions:mainUtilities()});
        if(!hidden && !confirmation){
            items=items.filter(item=>item.action!=='Settings');
            const menu=items.filter(item=>['tab','menu'].includes(item.kind));
            menu.forEach((item,index)=>item.y=384+index*62);
            items.filter(item=>item.kind==='history').forEach(item=>item.y=384+menu.length*62);
            items=[...panelOpeners(),...items];
        }
        if(!hidden && !confirmation && visibilityItems.length){
            items=items.filter(item=>item.action!=='Hide' && item.action!=='Notes');
            // Reserve a footer row independently from reading/navigation controls.
            for(const item of items)if(['utility','module','pathway'].includes(item.kind))item.y-=64;
            items.push(...visibilityItems.map((item,index)=>({action:item.id==='control'?'Hide':'Utility:visibility:'+item.id,label:item.label,kind:'visibility',selected:item.id==='control'?!hidden:item.selected,x:18+index*244,y:height()-64,width:232,height:48})));
        }
        if(!hidden && !confirmation)items.push(...(selection?.sourceLinks || []).slice(0,2).map((link,index)=>({action:'OpenSource:'+index,label:index?'Reference ↗':'Source ↗',description:link.label,kind:'reference',x:238+index*174,y:130,width:166,height:42})));
        const visible=confirmation?items.filter(item=>item.kind==='utility'):items;
        if(hidden && visibilityItems.length)for(const item of visible)if(item.action==='Restore'){item.label='CONTROL PANEL';item.ariaLabel='CONTROL PANEL · Grip to move';item.kind='visibility';item.selected=false;}
        return isDesktopDemo()?visible.filter(item=>item.action!=='Recenter'):visible;
    };
    // Fixed geometry prevents tabs and cell lengths from moving the panel in space.
    // The demo keeps one stable spatial frame while its slide copy changes.
    const spatialHeight=()=>phoneAR?900:headset?700:620;
    const spatialControls=()=>spatialPanelControls({hidden,height:spatialHeight(),railCollapsed,mediaCollapsed,items:controls()});
    function act(action){
        if(action==='LanguageMenu'){languageOpen=!languageOpen;graphicsOpen=false;soundOpen=false;render(true);return;}
        if(action.startsWith('Language:')){setNxrLanguage(action.slice(9));render(true);return;}
        if(action.startsWith('OpenSource:')){const link=selection?.sourceLinks?.[Number(action.slice(11))];if(/^https?:\/\//i.test(link?.url || ''))globalThis.open?.(link.url,'_blank','noopener,noreferrer');return;}
        if(guidanceAction===action){guidanceAction='';element.classList.remove('is-panel-guidance');element.querySelectorAll('.is-guidance-target').forEach(button=>button.classList.remove('is-guidance-target'));}
        if(action==='Notes'){onUtilityAction('notes');return;}
        if(action.startsWith('Limo:')){const command=action.slice(5);if(command==='open')onLimoAction(command,knowledgeRecord || record);else selection?.limo?.onAction?.(command);return;}
        if(action.startsWith('Object:')){objectContext?.onAction?.(action.slice(7));return;}
        if(action.startsWith('FruitWindow:')){const command=action.slice(12);if(command==='load')api.showFruitWindow(identity);else if(command==='hide')hideFruitWindow();else if(command==='next')fruitWindow?.nextExample();else fruitWindow?.action(command);renderExplorer();return;}
        if(action==='Explorer'){explorerClosed=!explorerClosed;render(true);return;}
        if(action.startsWith('KnowledgeMode:')){panelModeChoice=action.split(':')[1];if(!visiblePimoModes().includes(panelModeChoice))return;if(!knowledgeRecord){renderExplorer();return;}}
        if(action.startsWith('Knowledge')){
            if(!knowledgeRecord || explorerControls().find(item=>item.action===action)?.disabled)return;
            const owner=knowledgeRecord,state=knowledgeExplorer(owner);if(state.mode==='explore' && owner.explorerMolecule)owner.explorerMolecule.readingPage=page;else state.readingPage=page;onInteract(action);
            const knowledge=knowledgeDocument?pimToArKnowledge(knowledgeDocument.explorerSourceDocument || knowledgeDocument):null;
            if(action.startsWith('KnowledgeMolecule') && knowledge){
                if(explorerMoleculeAction(owner,knowledge,action)){
                    const detail=explorerDetailDocument(knowledgeDocument,owner),path=explorerSelectedPath(owner,knowledge);
                    if(path)api.select(owner,detail,path);else api.focusPlant(owner,detail);
                    onExplorerAction(owner,action);renderExplorer();
                }return;
            }
            if(action==='KnowledgeReadCore'){owner[owner.demoType?'demoSelectedNodeId':'pimSelectedNodeId']='';state.selectedConceptId='core';api.focusPlant(owner,knowledgeDocument);onExplorerAction(owner,action);return;}
            if(action.startsWith('KnowledgeReadPage:')){const key='reader:'+action.slice(18);state.pages[key]=(state.pages[key] || 0)+1;renderExplorer();return;}
            if(action.startsWith('KnowledgeRead:')){
                const node=knowledgeDocument?.nodes.find(item=>item.id===action.slice(14));if(!node)return;
                owner[owner.demoType?'demoSelectedNodeId':'pimSelectedNodeId']=node.path;state.selectedConceptId=node.id;
                const opened=new Set(owner.demoExpandedNodeIds || owner.pimExpandedNodeIds || []);
                for(const ancestor of [...pimAncestors(knowledgeDocument,node.id),node])if(knowledgeDocument.nodes.some(child=>child.parentId===ancestor.id))opened.add(ancestor.path);
                owner[owner.demoType?'demoExpandedNodeIds':'pimExpandedNodeIds']=[...opened];rememberKnowledgeSelection(owner,node.path);
                api.select(owner,knowledgeDocument,node.path);onExplorerAction(owner,action);return;
            }
            if(action.startsWith('KnowledgeFace:') && knowledge){const [objectId,nodeId]=action.slice(14).split('|');const node=knowledgeDocument.nodes.find(item=>item.id===nodeId);if(node){selectKnowledgeObjectFace(owner,knowledge,{...node,knowledgeObjectId:objectId});api.select(owner,knowledgeDocument,node.path);onExplorerAction(owner,action);}return;}
            if(action.startsWith('KnowledgeBranch:') && knowledge){spawnKnowledgeObject(owner,knowledge,action.slice(16));onExplorerAction(owner,action);renderExplorer();return;}
            if(knowledgeExplorerAction(owner,action)){
                if(state.mode!=='explore' && knowledgeDocument?.explorerSourceDocument)api.focusPlant(owner,knowledgeDocument.explorerSourceDocument);
                if(state.mode==='explore' && knowledge){initializeExplorerPreview(owner,knowledge);const path=explorerSelectedPath(owner,knowledge);if(path)api.select(owner,explorerDetailDocument(knowledgeDocument,owner),path);}
                const readingPage=state.mode==='explore'?owner.explorerMolecule?.readingPage || 0:state.readingPage;
                onExplorerAction(owner,action);
                if(action==='KnowledgeResume' || action==='KnowledgeMode:curiosity'){page=readingPage;if(state.mode!=='explore')state.readingPage=readingPage;}
                render();renderExplorer();
            }return;
        }
        const button=(headset?spatialControls():controls()).find(item=>item.action===action);if(button?.disabled)return;onInteract(action);
        if(action==='ToggleMedia'){mediaCollapsed=!mediaCollapsed;mediaTouched=true;}
        if(action==='ToggleMediaDetach'){if(mediaDetached)dockMediaPanel();else detachMediaPanel();return;}
        if(action==='RefreshRate' || action.startsWith('RefreshRate:') || action==='ShowFps'){onPerformanceAction(action);return;}
        if(action==='Restore'){hidden=false;render(true);return;}
        if(action==='Hide')hidden=true;
        if(action==='Help'){tab=tab==='Help'?'Details':'Help';page=0;}
        if(action==='Settings'){
            settingsOpen=!settingsOpen;
            renderSettings();
            // The companion owns only its visibility; leave the image and main
            // panel DOM, dock position and loading lifecycle intact.
            return;
        }
        if(action==='CloseSettings'){settingsOpen=false;renderSettings();return;}
        if(action==='GraphicsMenu'){graphicsOpen=!graphicsOpen;soundOpen=false;renderSettings();return;}
        if(action==='SoundMenu'){soundOpen=!soundOpen;graphicsOpen=false;renderSettings();return;}
        if(action==='Haptics'){demoSound?.setHaptics(!demoSound.volumes().haptics);renderSettings();return;}
        if(action==='SettingsHelp'){settingsOpen=false;tab='Help';page=0;render(true);return;}
        if(action==='Previous')page=0;
        if(action==='Next')page=Math.min(pages().length-1,page+1);
        if(action==='Edit' && selection && selection.editable!==false)onEdit(record,selection.path || selection.id);
        if(action==='TextDown'){largeText=false;page=0;setSpatialVisualSettings({largeText});}
        if(action==='TextUp'){largeText=true;page=0;setSpatialVisualSettings({largeText});}
        if(action==='HandMode'){handVisualMode=handVisualMode==='pointer'?'outline':'pointer';setSpatialVisualSettings({handMode:handVisualMode});onHandMode(handVisualMode);}
        if(action==='Recenter'){heading=null;pose=null;lastTime=0;}
        if(action==='ScaleDown'){spatialScale=Math.max(.85,Math.round((spatialScale-.1)*10)/10);setSpatialVisualSettings({spatialScale});}
        if(action==='ScaleUp'){spatialScale=Math.min(1.2,Math.round((spatialScale+.1)*10)/10);setSpatialVisualSettings({spatialScale});}
        if(action==='GraphicsQuality'){
            const values=['auto','low','medium','high'];graphicsQuality=values[(values.indexOf(graphicsQuality)+1)%values.length];
            rainQuality=setSpatialVisualSettings({graphicsQuality}).rainQuality;
            prepareLivingFrameArtwork(resolveGraphicsQuality(graphicsQuality));
            const rain=RAIN_QUALITIES[rainQuality];onRainIntensity(rain.intensity);onRainStyle(rain.style);onRainQuality(rainQuality);onGraphicsQuality(graphicsQuality);
        }
        if(action==='Insects')setSpatialVisualSettings({insects:!getSpatialVisualSettings().insects});
        if(action==='HeroDice')setSpatialVisualSettings({heroDice:getSpatialVisualSettings().heroDice===false});
        if(action==='LivingFrame'){setSpatialVisualSettings({livingFrame:getSpatialVisualSettings().livingFrame===false});onGraphicsQuality();}
        if(action==='RainQuality'){
            const values=Object.keys(RAIN_QUALITIES);rainQuality=values[(values.indexOf(rainQuality)+1)%values.length];setSpatialVisualSettings({rainQuality});
            const rain=RAIN_QUALITIES[rainQuality];onRainIntensity(rain.intensity);onRainStyle(rain.style);onRainQuality(rainQuality);
        }
        if(action==='InfoOpacity'){infoOpacity=infoOpacity>=1?0:Math.min(1,Math.round((infoOpacity+.1)*10)/10);setSpatialVisualSettings({infoOpacity});onInfoOpacity(infoOpacity);}
        if(action==='OrbModel'){const models=Object.keys(ORB_MODELS);orbModel=models[(models.indexOf(orbModel)+1)%models.length];setSpatialVisualSettings({orbModel});onOrbModel(orbModel);}
        if(action==='TotemModel'){const models=Object.keys(TOTEM_MODELS);totemModel=models[(models.indexOf(totemModel)+1)%models.length];setSpatialVisualSettings({totemModel});onTotemModel(totemModel);}
        if(action==='CellOpacity'){meshCellOpacity=meshCellOpacity>=1?0:Math.round((meshCellOpacity+.1)*10)/10;setSpatialVisualSettings({cellOpacity:meshCellOpacity});onCellOpacity(meshCellOpacity);}
        if(action.startsWith('Path')){onPathwayAction(action);return;}
        if(action.startsWith('Module:')){onModuleAction(action.slice(7));return;}
        if(action.startsWith('Utility:')){onUtilityAction(action.slice(8));return;}
        render();
    }
    function setSliderValue(action,value){
        if(action==='MusicVolume' || action==='FxVolume')demoSound?.setVolume(action==='MusicVolume'?'music':'fx',value);
        if(action==='InfoOpacity'){value=Math.round(value*20)/20;if(value===infoOpacity)return;infoOpacity=value;setSpatialVisualSettings({infoOpacity});element.style.setProperty('--nlxr-info-opacity',String(infoOpacity));settingsElement.style.setProperty('--nlxr-info-opacity',String(infoOpacity));onInfoOpacity(infoOpacity);}
        if(action==='CellOpacity'){value=Math.round(value*20)/20;if(value===meshCellOpacity)return;meshCellOpacity=value;setSpatialVisualSettings({cellOpacity:value});onCellOpacity(value);}
        if(action==='SpatialScale'){spatialScale=value;setSpatialVisualSettings({spatialScale});}
        if(action==='TextSize'){largeText=value>=.5;page=0;setSpatialVisualSettings({largeText});updateReading();}
        if(action==='FloorOffset'){floorOffset=value;setSpatialVisualSettings({floorOffset});onFloorOffset(value);}
        if(action==='KnowledgeDiceSize' && knowledgeRecord){const knowledge=knowledgeDocument?pimToArKnowledge(knowledgeDocument.explorerSourceDocument || knowledgeDocument):null;if(knowledge)explorerMoleculeAction(knowledgeRecord,knowledge,'KnowledgeMoleculeSize:'+value);onExplorerAction(knowledgeRecord,'KnowledgeMoleculeSize:'+value);renderExplorer();}
    }
    function slideAtTarget(button,target){
        if(!target || button.kind!=='slider')return false;
        const value=panelSliderValue(button,(target.localX/target.width+.5)*1000);
        if(value!==controlsForTarget(target).find(item=>item.action===button.action)?.value)setSliderValue(button.action,value);
        return true;
    }
    const settingsControls=()=>panelSettingsControls({simpleDesktop,headset,handVisualMode,spatialScale,performanceSettings,infoOpacity,cellOpacity:meshCellOpacity,orbModel,totemModel,rainEnabled,graphicsQuality,rainQuality,largeText,floorOffset,graphicsOpen,soundOpen,languageOpen,demoSound:demoSound?.volumes()});
    function renderSettings(){
        renderExplorer();
        syncPanelOpenerButtons();
        settingsElement.hidden=!settingsOpen || hidden || detached;
        element.style.setProperty('--nlxr-info-opacity',String(infoOpacity));
        settingsElement.style.setProperty('--nlxr-info-opacity',String(infoOpacity));
        element.classList.toggle('has-settings-companion',settingsOpen);
        if(settingsElement.hidden)return;
        const scrollTop=settingsElement.scrollTop;
        const focused=settingsElement.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        if(!renderer && !globalThis.matchMedia?.('(max-width:700px)').matches){
            const main=element.getBoundingClientRect(),media=element.querySelector('.nlxr-media-wing')?.getBoundingClientRect(),panelWidth=media?.width || Math.min(390,Math.max(300,main.width*.79));
            settingsElement.style.width=panelWidth+'px';settingsElement.style.height=(media?.height || main.height)+'px';
            const above=!mediaCollapsed && mediaDockSide==='left';
            const left=main.left-panelWidth-12;
            // A narrow desktop preview can have no room to the left. Use the
            // free right side rather than clamping Settings over the reader.
            const sideLeft=left>=8?left:main.right+12;
            settingsElement.style.left=Math.max(8,above?main.left+(main.width-panelWidth)/2:sideLeft)+'px';
            settingsElement.style.top=Math.max(8,above?main.top-(media?.height || main.height)-12:main.top)+'px';
            settingsElement.style.bottom='auto';
        }else if(!renderer){settingsElement.style.removeProperty('left');settingsElement.style.removeProperty('top');settingsElement.style.removeProperty('bottom');}
        settingsElement.innerHTML='<header><h2>'+(languageOpen?'Language':soundOpen?'Sound':graphicsOpen?'Graphics':'Settings')+'</h2><button type="button" class="nlxr-settings-close" aria-label="Close settings">Done</button></header><section><div class="nlxr-settings-actions"></div></section>';
        settingsElement.querySelector('.nlxr-settings-close').addEventListener('click',()=>{settingsOpen=false;render(true);});
        const actions=settingsElement.querySelector('.nlxr-settings-actions');
        for(const item of settingsControls().filter(item=>item.action!=='CloseSettings')){
            let row=actions.querySelector(`[data-setting-group="${item.settingGroup}"]`);
            if(!row){
                row=document.createElement('div');row.className='nlxr-setting-row';row.dataset.settingGroup=item.settingGroup;
                const label=document.createElement('span');label.className='nlxr-setting-label';label.textContent=item.settingLabel;
                const choices=document.createElement('div');choices.className='nlxr-setting-options';row.append(label,choices);actions.append(row);
            }
            if(item.kind==='slider'){
                const slider=document.createElement('input');slider.type='range';slider.min=String(item.min);slider.max=String(item.max);slider.step=String(item.step);slider.value=String(item.value);slider.dataset.infoAction=item.action;slider.setAttribute('aria-label',item.ariaLabel);
                slider.addEventListener('input',()=>setSliderValue(item.action,Number(slider.value)));
                row.querySelector('.nlxr-setting-options').append(slider);
            }else row.querySelector('.nlxr-setting-options').append(makeButton(item));
        }
        if(graphicsOpen && performanceStatus()){
            const status=document.createElement('p');status.className='nlxr-settings-status';status.textContent=performanceStatus();status.hidden=!status.textContent;status.setAttribute('role','status');
            const soundRow=actions.querySelector('[data-setting-group="sound"]');
            if(soundRow)actions.insertBefore(status,soundRow);else actions.append(status);
        }
        settingsElement.scrollTop=scrollTop;
        translateApp(settingsElement);
        if(focused)settingsElement.querySelector(`[data-info-action="${focused}"]`)?.focus({preventScroll:true});
    }
    function makeButton(item){
        const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.infoAction=item.action;button.disabled=Boolean(item.disabled);
        button.dataset.controlKind=item.kind || 'action';button.classList.toggle('is-primary-action',Boolean(item.primary) || ['Next','PathNext'].includes(item.action));
        if(item.kind==='visibility'){button.setAttribute('aria-pressed',String(item.selected));button.style.border='2px solid '+(item.selected?'#85e5ae':'#ee8f8b');button.style.background='rgba(16,35,31,.28)';button.title=item.label+' · '+(item.selected?'visible':'hidden');}
        button.setAttribute('aria-label',item.action==='Restore'?'Restore Control panel':item.ariaLabel || item.label);
        button.title=controlDescription(item);
        if(item.panelOpener){
            button.classList.add('nlxr-panel-opener');button.setAttribute('aria-expanded',String(item.expanded));
            const icon=document.createElement('span');icon.className='nlxr-panel-opener-icon';icon.setAttribute('aria-hidden','true');
            const label=document.createElement('span');label.className='nlxr-panel-opener-label';label.textContent=item.label;
            const state=document.createElement('small');state.className='nlxr-panel-opener-state';state.textContent=item.status;
            button.replaceChildren(icon,label,state);button.title=item.ariaLabel;
        }
        if(item.action.startsWith('KnowledgeMode:'))button.setAttribute('aria-pressed',String(Boolean(item.selected)));
        if(item.kind==='tab'){button.setAttribute('role','tab');button.setAttribute('aria-selected',String(item.selected));button.setAttribute('aria-controls',contentId);button.id=contentId+'-'+item.action;button.tabIndex=item.selected?0:-1;}
        if(item.action===guidanceAction)button.classList.add('is-guidance-target');
        if(item.action==='Utility:close-confirm')button.classList.add('is-glass-danger');
        if(item.action.startsWith('Object:') || ['HeroDice','LivingFrame'].includes(item.action)){button.setAttribute('aria-pressed',String(Boolean(item.selected)));button.classList.toggle('is-selected',Boolean(item.selected));}
        button.addEventListener('click',event=>{event.stopPropagation();if(performance.now()<minimizedDragUntil)return;act(item.action);});return button;
    }
    function syncPanelOpenerButtons(){
        for(const item of panelOpeners()){
            const button=element.querySelector(`.nlxr-panel-opener[data-info-action="${item.action}"]`);
            if(!button)continue;
            button.setAttribute('aria-expanded',String(item.expanded));button.setAttribute('aria-label',item.ariaLabel);button.title=item.ariaLabel;
            const state=button.querySelector('.nlxr-panel-opener-state');if(state)state.textContent=item.status;
        }
    }
    function renderControlNavigation(tabs){
        const items=controls(),openers=items.filter(item=>item.panelOpener);
        tabs.replaceChildren();
        if(openers.length){
            const group=document.createElement('section');group.className='nlxr-panel-openers';group.setAttribute('role','group');group.setAttribute('aria-label','Panels');
            const title=document.createElement('small');title.className='nlxr-panel-openers-heading';title.textContent='Panels';group.append(title);
            openers.forEach(item=>group.append(makeButton(item)));tabs.append(group);
        }
        items.filter(item=>['tab','menu'].includes(item.kind) && !item.panelOpener && item.action!=='Hide').forEach(item=>tabs.append(makeButton(item)));
        if(!confirmation){
            const history=document.createElement('nav');history.className='nlxr-demo-history';history.setAttribute('aria-label','Experience history');
            items.filter(item=>item.kind==='history').forEach(item=>history.append(makeButton(item)));if(history.childElementCount)tabs.append(history);
        }
    }
    function performanceStatus(){
        if(performanceSettings?.showFps){const cpu=performanceSettings.cpuMs===null || performanceSettings.cpuMs===undefined?'Measuring CPU…':`CPU ${performanceSettings.cpuMs} ms · ${performanceSettings.heaviest || 'rendering'}`;return `${performanceSettings.label} · ${cpu}`;}
        return performanceSettings?.message || '';
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
        caption.textContent=preview.caption || '';caption.hidden=!preview.caption;
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
        if(taskProgress)return taskProgress;
        if(!headerProgress?.steps?.length)return null;
        const activeIndex=Math.max(0,headerProgress.steps.findIndex(step=>step.id===headerProgress.activeId));
        return {...headerProgress,activeIndex,current:headerProgress.steps[activeIndex]};
    }
    function syncHeaderProgress(target=element.querySelector('.nlxr-control-header')){
        if(!target)return;
        target.querySelector('.nlxr-panel-progress')?.remove();
        const progress=progressState();
        if(!progress)return;
        const region=document.createElement('section');region.className='nlxr-panel-progress';region.classList.toggle('is-checklist',Boolean(progress.checklist));region.setAttribute('aria-label',progress.label);
        const heading=document.createElement('div');heading.className='nlxr-panel-progress-heading';
        const status=document.createElement('span');status.textContent=progress.checklist?`${progress.steps.filter(step=>step.complete).length} of ${progress.steps.length} complete · ${progress.current.label}`:`${progress.activeIndex+1} of ${progress.steps.length} · ${progress.current.label}`;status.setAttribute('aria-live','polite');
        heading.append(status);
        const list=document.createElement('ol');
        progress.steps.forEach((step,index)=>{
            const item=document.createElement('li');item.classList.toggle('is-complete',progress.checklist?step.complete:index<progress.activeIndex);item.classList.toggle('is-current',index===progress.activeIndex);
            if(index===progress.activeIndex)item.setAttribute('aria-current','step');
            const marker=document.createElement('i');marker.setAttribute('aria-hidden','true');if(progress.checklist && step.complete)marker.textContent='✓';
            const text=document.createElement('span');text.textContent=step.label;
            item.append(marker,text);list.append(item);
        });
        region.append(heading,list);target.append(region);
    }
    function syncPanelWings(){
        if(isDesktopDemo())railCollapsed=false;
        element.classList.toggle('is-rail-collapsed',railCollapsed);
        element.classList.toggle('is-media-collapsed',mediaCollapsed || mediaDetached);
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
            if(grab){if(grab.armed && hidden)minimizedDragUntil=performance.now()+350;clearTimeout(grab.timer);try{if(element.hasPointerCapture?.(grab.pointerId))element.releasePointerCapture(grab.pointerId);}catch{}}
            grab=null;element.classList.remove('is-grab-ready','is-grabbed');
            window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);
        };
        const move=event=>{
            if(!grab || event.pointerId!==grab.pointerId)return;
            if(!grab.armed){if(Math.hypot(event.clientX-grab.startX,event.clientY-grab.startY)>PANEL_GRAB_CANCEL_DISTANCE_PX)clear();return;}
            event.preventDefault();
            const left=Math.max(8,Math.min(window.innerWidth-element.offsetWidth-8,event.clientX-grab.offsetX));
            const top=Math.max(8,Math.min(window.innerHeight-element.offsetHeight-8,event.clientY-grab.offsetY));
            element.style.left=`${left}px`;element.style.top=`${top}px`;element.style.right='auto';element.style.bottom='auto';renderSettings();onMove();
        };
        const end=event=>{if(grab && event.pointerId===grab.pointerId)clear();};
        const start=event=>{
            if(detached || (event.pointerType==='mouse' && event.button!==0))return;
            if(!hidden && event.target.closest('button,a,input,select,textarea,[role="button"],[role="tab"],[contenteditable]'))return;
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
    function syncReferenceLinks(content){
        content.querySelector('.nlxr-reference-links')?.remove();
        if(tab!=='Details' || !selection?.sourceLinks?.length)return;
        const links=document.createElement('nav');links.className='nlxr-reference-links';links.setAttribute('aria-label','Information sources');
        for(const link of selection.sourceLinks){if(!/^https?:\/\//i.test(link.url))continue;const anchor=document.createElement('a');anchor.href=link.url;anchor.textContent=link.label+' ↗';anchor.target='_blank';anchor.rel='noopener noreferrer';links.append(anchor);}
        if(links.childElementCount)content.append(links);
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
        if(header){const plant=header.querySelector('h2'),scientific=header.querySelector('.nlxr-control-identity');plant.textContent=identity?.plant || selection?.plant || '';scientific.textContent=identity?.scientific || (identity?'Selected plant':'');plant.hidden=!plant.textContent;scientific.hidden=!scientific.textContent;syncHeaderProgress(header);}
        const detailsTab=element.querySelector('[data-info-action="Details"]');
        if(detailsTab)detailsTab.textContent=contentKind()==='pim'?'Plant':'Selected topic';
        if(tab==='Help'){content.setAttribute('aria-labelledby',contentId+'-Help');content.removeAttribute('aria-label');}
        else{content.removeAttribute('aria-labelledby');content.setAttribute('aria-label','Information');}
        const heading=content.querySelector('h3'),pathHeading=hasPimPathHeading();heading.textContent=panelHeading();heading.hidden=!heading.textContent;heading.classList.toggle('nlxr-pim-pathline',pathHeading);if(pathHeading)heading.title=heading.textContent;else heading.removeAttribute('title');
        const trail=content.querySelector('.nlxr-info-trail');trail.hidden=pathHeading;trail.textContent=tab==='Details'&&!pathHeading?(readingTrail()):'';
        content.querySelector('.nlxr-info-body').textContent=currentPages[page].join('\n');
        let hint=element.querySelector('.nlxr-info-hint');
        if(!hint){hint=document.createElement('p');hint.className='nlxr-info-hint';element.querySelector('.nlxr-reading-surface')?.append(hint);}
        hint.textContent=currentHint();hint.hidden=!hint.textContent;
        content.querySelector('small').textContent=metadata();
        syncReferenceLinks(content);
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
        if(count)count.remove();
        const media=element.querySelector('.nlxr-media-wing') || mediaFloating;
        if(media){
            const desktopDemo=isDesktopDemo();
            if(desktopDemo && railCollapsed){railCollapsed=false;syncPanelWings();}
            const mediaToggle=media.querySelector('.nlxr-media-toggle');
            if(mediaToggle && desktopDemo)mediaToggle.remove();
            refreshMediaWing(media);
        }else if(showPlantPreview())render(true);
        syncDetachedMedia();
        translateApp(element);translateApp(mediaFloating);
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
        if(record?.knowledgeExplorer && tab==='Details')record.knowledgeExplorer.readingPage=page;
        if(detached)return;
        renderSettings();
        const focused=element.contains(document.activeElement)?document.activeElement?.dataset.infoAction:null;
        const needsMediaWing=showPlantPreview() && !mediaCollapsed && !mediaDetached && !element.querySelector('.nlxr-media-wing');
        if(!force && !hidden && !needsMediaWing && element.querySelector('.nlxr-control-header')){
            element.classList.toggle('is-large-text',largeText);
            syncPanelWings();
            updateReading();
            updatePathway();
            const tabs=element.querySelector('.nlxr-control-tabs');
            if(tabs){
                const railScroll=tabs.scrollTop;
                renderControlNavigation(tabs);
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
        const showMediaWing=plantPreviewAvailable && !mediaCollapsed && !mediaDetached;
        element.classList.toggle('is-rail-collapsed',railCollapsed);element.classList.toggle('is-media-collapsed',mediaCollapsed || mediaDetached);element.classList.toggle('is-media-detached',mediaDetached);element.dataset.mediaDockSide=mediaDockSide;element.classList.remove('is-tools-collapsed');element.classList.toggle('has-media',showMediaWing);
        element.dataset.contentKind=contentKind();
        element.dataset.primaryFaceId=contentKind()==='lim' ? (selection?.primaryFaceId || '') : '';
        element.dataset.relatedFaceIds=contentKind()==='lim' ? (selection?.relatedFaceIds || []).join(',') : '';
        element.dataset.pathwayMode=pathwayContext?.mode || '';
        element.style.setProperty('--lim-accent',selection?.mesh==='lim' ? (selection.accent || '#719b62') : 'transparent');
        if(hidden){const restore=makeButton(controls()[0]);restore.title='Show Control panel · hold and drag to move';element.append(restore);}
        else{
            const header=document.createElement('header');header.className='nlxr-control-header';
            const brand=document.createElement('span');brand.className='nlxr-panel-brand';brand.setAttribute('aria-label','Control panel');brand.innerHTML='CONTROL<br>PANEL';header.append(brand);
            const plant=document.createElement('h2');plant.textContent=identity?.plant || selection?.plant || '';plant.hidden=!plant.textContent;
            const scientific=document.createElement('p');scientific.className='nlxr-control-identity';scientific.textContent=identity?.scientific || (identity?'Selected plant':'');scientific.hidden=!scientific.textContent;
            const hideControl=visibilityItems.length?null:optionalPanelControl(controls(),'Hide');
            if(hideControl){const hideButton=makeButton(hideControl);hideButton.classList.add('is-panel-hide');header.append(hideButton);}
            header.classList.add('is-move-handle');header.title='Hold to move the Control panel';
            header.append(plant,scientific);element.append(header);syncHeaderProgress(header);
            const tabs=document.createElement('nav');tabs.className='nlxr-control-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-orientation','vertical');tabs.setAttribute('aria-label','Control panel sections');
            renderControlNavigation(tabs);
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
            const trail=document.createElement('p');trail.className='nlxr-info-trail';trail.hidden=pathHeading;trail.textContent=tab==='Details'&&!pathHeading?(readingTrail()):'';
            const body=document.createElement('p');body.className='nlxr-info-body';body.textContent=pages()[page].join('\n');
            const hint=document.createElement('p');hint.className='nlxr-info-hint';hint.textContent=currentHint();hint.hidden=!hint.textContent;
            const reading=document.createElement('div');reading.className='nlxr-reading-surface';reading.append(body,hint);
            const status=document.createElement('small');status.textContent=metadata();content.append(heading,trail,reading,status);
            syncReferenceLinks(content);
            if(tab==='Help'){const guides=document.createElement('nav');guides.className='nlxr-guide-actions';guides.setAttribute('aria-label','Available guides');controls().filter(item=>item.kind==='module' && !item.disabled).forEach(item=>guides.append(makeButton(item)));if(guides.childElementCount)content.append(guides);}
            element.append(content);
            if(showMediaWing){
                element.append(createMediaWing());
            }
            const tools=document.createElement('footer');tools.className='nlxr-tools-dock';tools.setAttribute('aria-label','Control panel tools');
            const visibility=document.createElement('nav');visibility.className='nlxr-visibility-footer';visibility.setAttribute('aria-label','Scene visibility');visibility.style.cssText='display:flex;gap:8px;flex-wrap:wrap';controls().filter(item=>item.kind==='visibility').forEach(item=>visibility.append(makeButton(item)));if(visibility.childElementCount)tools.append(visibility);
            if(!confirmation){const pager=document.createElement('nav');pager.className='nlxr-content-pager';pager.setAttribute('aria-label','Topic pages');controls().filter(item=>item.kind==='pager').forEach(item=>pager.append(makeButton(item)));tools.append(pager);}
            const nav=document.createElement('nav');nav.className='nlxr-control-actions';nav.setAttribute('aria-label','Reading controls');controls().filter(item=>!item.kind && item.action!=='Hide' && !item.disabled).forEach(item=>nav.append(makeButton(item)));if(nav.childElementCount)tools.append(nav);
            if(utilityActions.length){const utilities=document.createElement('nav');utilities.className='nlxr-control-utilities';utilities.setAttribute('aria-label','Experience controls');controls().filter(item=>item.kind==='utility').forEach(item=>utilities.append(makeButton(item)));if(utilities.childElementCount)tools.append(utilities);}
            element.append(tools);
        }
        syncDetachedMedia();
        renderExplorer();
        translateApp(element);translateApp(mediaFloating);
        if(focused)(element.querySelector('[data-info-action="'+focused+'"]') || element.querySelector('button'))?.focus({preventScroll:true});
    }
    element.addEventListener('keydown',event=>{
        if(event.target.getAttribute('role')!=='tab' || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
        event.preventDefault();
        act('Help');
        element.querySelector('[data-info-action="'+tab+'"]')?.focus();
    });
    element.addEventListener('beforexrselect',event=>event.preventDefault());
    let explorerDrag=null;explorerElement.addEventListener('pointerdown',event=>{event.stopPropagation();if(event.target.closest('button,input,select,textarea,summary'))return;const rect=explorerElement.getBoundingClientRect();explorerDrag={id:event.pointerId,started:performance.now(),x:event.clientX-rect.left,y:event.clientY-rect.top};explorerElement.setPointerCapture?.(event.pointerId);});
    explorerElement.addEventListener('pointermove',event=>{if(explorerDrag?.id!==event.pointerId || performance.now()-explorerDrag.started<PANEL_GRAB_HOLD_MS)return;explorerPosition={x:Math.max(8,event.clientX-explorerDrag.x),y:Math.max(8,event.clientY-explorerDrag.y)};explorerElement.style.left=explorerPosition.x+'px';explorerElement.style.top=explorerPosition.y+'px';const main=element.getBoundingClientRect();explorerElement.classList.toggle('is-magnetized',Math.abs(explorerPosition.y-main.bottom-12)<80 && Math.abs(explorerPosition.x-main.left)<100);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])explorerElement.addEventListener(type,()=>{
        if(explorerDrag && explorerPosition){const main=element.getBoundingClientRect(),rect=explorerElement.getBoundingClientRect();
            if(Math.abs(rect.top-main.bottom-12)<80 && Math.abs(rect.left-main.left)<100){explorerPosition=null;renderExplorer();explorerElement.classList.add('is-magnetized');}}
        explorerDrag=null;
    });
    const removePanelMove=bindPanelMove();
    element.addEventListener('pointerdown',event=>event.stopPropagation());
    function canvas(card){
        const key=card.id || 'control';let c=panelCanvases.get(key);
        if(!c){c=document.createElement('canvas');panelCanvases.set(key,c);}
        if(c.width!==1000)c.width=1000;
        const h=card.hidden?1000:card.height;if(c.height!==h)c.height=h;
        const ctx=localizedCanvasContext(c.getContext('2d'));ctx.clearRect(0,0,c.width,c.height);ctx.textAlign='left';ctx.globalAlpha=1;
        if(card.hidden){const footerRestore=card.controls?.some(item=>item.action==='Restore' && item.kind==='visibility');ctx.fillStyle='rgba(19,38,34,.25)';ctx.beginPath();ctx.arc(500,500,440,0,Math.PI*2);ctx.fill();ctx.strokeStyle=card.grabState?'#eaffdf':footerRestore?'#ee8f8b':'rgba(237,255,245,.66)';ctx.lineWidth=8;ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='600 140px Manrope, system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(footerRestore?'CONTROL':'Show',500,420,720);ctx.font='600 140px Manrope, system-ui';ctx.fillText(footerRestore?'PANEL':'Panel',500,590,720);return c;}
            const gradient=ctx.createLinearGradient(0,0,1000,c.height);gradient.addColorStop(0,`rgba(15,29,34,${card.infoOpacity ?? .38})`);gradient.addColorStop(1,`rgba(6,17,23,${card.infoOpacity ?? .38})`);
        ctx.fillStyle=gradient;ctx.beginPath();ctx.roundRect(4,4,992,c.height-8,24);ctx.fill();
        ctx.strokeStyle=card.grabState==='held'?'#dfff9b':card.grabState==='ready'?'#bceeff':card.grabState==='hover'?'#a6e7fa':card.guided?'#93d9f2':'rgba(166,204,229,.72)';
        ctx.lineWidth=card.grabState==='held'?8:card.grabState?5:4;
        ctx.stroke();ctx.textBaseline='top';
        ctx.fillStyle='rgba(139,211,241,.85)';ctx.fillRect(22,10,96,4);
        if(card.explorer && card.limo){drawLimoSpatialControls(ctx,card);return c;}
        if(card.explorer){
            ctx.fillStyle='#edf3e4';ctx.font='700 30px Manrope, system-ui';ctx.fillText('Controls',24,12,180);ctx.font='500 20px Manrope, system-ui';ctx.fillStyle='#cfdfd9';ctx.fillText(card.linkedLabel || card.question,230,15,600);
            for(const item of card.controls){
                if(item.kind==='heading'){ctx.globalAlpha=1;ctx.textAlign='left';ctx.font='650 23px Manrope, system-ui';ctx.fillStyle='#eef8e5';ctx.fillText(item.label,item.x,item.y,item.width);continue;}
                ctx.globalAlpha=item.disabled ? .4 : 1;const aimed=card.hoverAction===item.action;
                ctx.fillStyle=item.selected?'rgba(145,183,135,.26)':aimed?'rgba(173,209,217,.22)':'rgba(24,48,42,.12)';ctx.strokeStyle=item.selected?'#dceabd':aimed?'#c9edf1':'rgba(166,204,229,.6)';ctx.lineWidth=item.selected?4:2;ctx.beginPath();ctx.roundRect(item.x,item.y,item.width,item.height,14);ctx.fill();ctx.stroke();
                if(item.kind==='swatch'){ctx.fillStyle=item.color;ctx.beginPath();ctx.roundRect(item.x+item.width/2-17,item.y+10,34,34,8);ctx.fill();}
                else if(item.kind==='slider'){ctx.textAlign='left';ctx.font='500 22px Manrope, system-ui';ctx.fillStyle='#edf3e4';ctx.fillText(item.action==='CellOpacity'?'Cell glass · '+Math.round(item.value*100)+'%':'Structure scale · '+item.value.toFixed(2)+'×',22,item.y+12,224);drawPanelSettingSlider(ctx,item,aimed);}
                else {ctx.font=(item.kind==='mode'?'650 31px':'650 27px')+' Manrope, system-ui';ctx.fillStyle='#edf3e4';ctx.textAlign='center';ctx.fillText(item.label,item.x+item.width/2,item.y+12,item.width-16);}
            }
            ctx.globalAlpha=1;ctx.font='500 18px Manrope, system-ui';ctx.fillStyle='#d5ded7';ctx.textAlign='center';for(const item of card.controls.filter(control=>control.kind==='mode'))infoPages(item.description,31,2)[0].forEach((line,index)=>ctx.fillText(line,item.x+item.width/2,124+index*22,item.width-16));ctx.textAlign='left';return c;
        }
        if(card.media){
            const imageX=8,imageY=8,imageWidth=984,imageHeight=c.height-84;
            ctx.fillStyle='rgba(3,12,18,.78)';ctx.beginPath();ctx.roundRect(imageX,imageY,imageWidth,imageHeight,24);ctx.fill();
            ctx.save();ctx.beginPath();ctx.roundRect(imageX,imageY,imageWidth,imageHeight,24);ctx.clip();
            // Keep the entire photograph inside the rounded viewport, including its corners.
            const drawMedia=(image,alpha)=>{if(!image || alpha<=0)return;const inset=8,scale=Math.min((imageWidth-inset*2)/image.naturalWidth,(imageHeight-inset*2)/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(image,imageX+(imageWidth-w)/2,imageY+(imageHeight-h)/2,w,h);ctx.restore();};
            drawMedia(card.previousImage,1-card.imageFade);drawMedia(card.image,card.imageFade);
            ctx.restore();ctx.fillStyle='rgba(4,15,18,.76)';ctx.beginPath();ctx.roundRect(imageX,c.height-76,imageWidth,68,[0,0,24,24]);ctx.fill();
            ctx.textBaseline='top';
            if(card.hoverHint){ctx.fillStyle='rgba(8,20,31,.88)';ctx.beginPath();ctx.roundRect(28,68,770,46,12);ctx.fill();ctx.fillStyle='#e4eef0';ctx.font='400 19px system-ui';ctx.fillText(card.hoverHint,44,81,740);}
            if(card.caption){ctx.fillStyle='#f4f7f2';ctx.font='650 23px system-ui';ctx.textAlign='center';ctx.fillText(card.caption,500,c.height-57,920);ctx.textAlign='left';}
            return c;
        }
        if(card.settings){
            ctx.fillStyle='#fcfff7';ctx.font='700 42px Manrope, system-ui';ctx.fillText(card.languageOpen?'Language':card.soundOpen?'Sound':card.graphicsOpen?'Graphics':'Settings',56,30,700);
            const groups=new Map();
            card.controls.forEach(button=>{if(button.settingLabel && button.action!=='CloseSettings' && !groups.has(button.settingGroup))groups.set(button.settingGroup,{label:button.settingLabel,y:button.y,paired:['models','performance'].includes(button.settingGroup)});});
            groups.forEach(group=>{
                ctx.fillStyle='rgba(9,25,27,.18)';ctx.beginPath();ctx.roundRect(40,group.y-5,920,68,14);ctx.fill();
                ctx.strokeStyle='rgba(238,249,243,.27)';ctx.lineWidth=2.5;ctx.stroke();
                ctx.fillStyle='#fcfff4';ctx.font='650 30px Manrope, system-ui';ctx.fillText(group.label,58,group.paired?group.y-43:group.y+14,group.paired?880:460);
            });
            card.controls.forEach(button=>{
                const aimed=card.hoverAction===button.action && !button.disabled;
                if(button.kind==='slider'){drawPanelSettingSlider(ctx,button,aimed);return;}
                ctx.fillStyle=aimed?'rgba(210,235,224,.3)':button.selected?'rgba(175,212,191,.28)':'rgba(238,250,242,.13)';ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,21);ctx.fill();
                ctx.strokeStyle=aimed?'rgba(243,248,226,.95)':'rgba(239,251,244,.48)';ctx.lineWidth=aimed?5:2.5;ctx.stroke();
                ctx.fillStyle='#fcfff4';ctx.font='650 30px Manrope, system-ui';ctx.textAlign='center';ctx.fillText(button.label,button.x+button.width/2,button.y+14,button.width-24);
            });ctx.textAlign='left';
            if(card.graphicsOpen && card.performanceMessage){
                ctx.fillStyle='rgba(9,25,27,.18)';ctx.beginPath();ctx.roundRect(40,684,920,50,12);ctx.fill();
                ctx.strokeStyle='rgba(238,249,243,.27)';ctx.lineWidth=2.5;ctx.stroke();
                ctx.fillStyle='#dfebe0';ctx.font='500 21px Manrope, system-ui';infoPages(card.performanceMessage,80,2)[0].forEach((line,index)=>ctx.fillText(line,56,692+index*22,888));
            }
            return c;
        }
        if(card.limo && !card.hidden){drawLimoSpatialReading(ctx,card);}
        else if(card.headset && !card.hidden){
            const rail=card.railCollapsed?54:164,media=0;
            const left=rail+22,right=1000-media-22,width=right-left;
            const headerBottom=card.progress?164:88;
            ctx.fillStyle=`rgba(5,15,27,${(card.infoOpacity ?? .38)*.16})`;ctx.fillRect(6,headerBottom,rail,c.height-headerBottom-7);
            ctx.fillStyle=`rgba(8,22,34,${(card.infoOpacity ?? .38)*.16})`;ctx.fillRect(1000-media,headerBottom,media-6,c.height-headerBottom-7);
            ctx.fillStyle='rgba(157,208,235,.36)';ctx.fillRect(left,headerBottom+1,width,2);
            if(card.progress){
                const progressRight=718,progressWidth=Math.max(180,progressRight-left),stepWidth=progressWidth/Math.max(1,card.progress.steps.length-1),barY=48;
                ctx.fillStyle='#dfff9b';ctx.font='700 17px system-ui';ctx.textAlign='left';ctx.fillText(`${card.progress.activeIndex+1} / ${card.progress.steps.length} · ${card.progress.current.label.toUpperCase()}`,left,20,progressWidth);ctx.textAlign='left';
                ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(left,barY,progressWidth,3);
                ctx.fillStyle='#dfff9b';ctx.fillRect(left,barY,Math.max(3,stepWidth*card.progress.activeIndex),3);
                card.progress.steps.forEach((step,index)=>{const x=left+stepWidth*index,complete=card.progress.checklist?step.complete:index<card.progress.activeIndex;
                    if(card.progress.checklist && complete){const age=(lastTime || performance.now())-card.progress.successAt;if(age>=0 && age<1000){ctx.save();ctx.globalAlpha=(1-age/1000)*.45;ctx.fillStyle='#b6efcd';ctx.beginPath();ctx.arc(x,barY,12+age/70,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#c7f4dc';ctx.font='700 23px system-ui';ctx.fillText('✓',x-8,barY-12);}
                    else{ctx.beginPath();ctx.arc(x,barY+1.5,index===card.progress.activeIndex?7:5,0,Math.PI*2);ctx.fillStyle=complete?'#c7f4dc':'#536469';ctx.fill();}});
            }
            ctx.fillStyle=card.panelGuidance?'#dfffba':'#ffffff';ctx.font='800 24px system-ui';const brand=currentNxrLanguage()==='pt-PT'?['PAINEL','DE CONTROLO']:currentNxrLanguage()==='nl-NL'?['BEDIENINGS','PANEEL']:['CONTROL','PANEL'];ctx.fillText(brand[0],17,20,142);ctx.fillText(brand[1],17,49,142);
            if(card.plant && card.plant.toLowerCase()!=='control panel'){ctx.fillStyle='#f3f8fc';ctx.font='650 34px system-ui';ctx.textAlign='center';ctx.fillText(card.plant,left+width/2,card.progress?86:20,width-24);ctx.textAlign='left';}
            if(card.scientific){ctx.fillStyle='#c9e0ed';ctx.font='500 21px system-ui';ctx.textAlign='center';ctx.fillText(card.scientific,left+width/2,card.progress?130:58,width);ctx.textAlign='left';}
            let y=headerBottom+22;
            if(card.pathway){
                ctx.fillStyle='#badbc1';ctx.font='600 20px system-ui';ctx.fillText(card.pathway.title,left,y,width);y+=28;
                ctx.fillStyle='#d4e0dc';ctx.font='400 19px system-ui';ctx.fillText(card.pathway.progress,left,y,width);y+=27;
                infoPages(card.pathway.explanation,Math.max(26,Math.floor(width/13)),2)[0].forEach(line=>{ctx.fillText(line,left,y,width);y+=21;});y+=10;
            }
            if(card.accent){ctx.fillStyle=card.accent;ctx.fillRect(left,y-3,5,30);}
            if(card.title){ctx.fillStyle='#f3f8fc';ctx.font='650 27px system-ui';ctx.textAlign='center';ctx.fillText(card.title,left+width/2,y,width-10);ctx.textAlign='left';y+=48;}
            if(card.trail){ctx.fillStyle='#c9e0ed';ctx.font='500 21px system-ui';ctx.fillText(card.trail,left,y,width);y+=32;}
            const actionTop=Math.min(...card.controls.filter(item=>item.kind==='utility'||item.kind==='reference'||['TextSize','Recenter'].includes(item.action)).map(item=>item.y),card.height-76);
            const readingHint=card.hoverHint || card.hint,contentBottom=actionTop-14,hintHeight=readingHint?60:0;
            ctx.fillStyle='rgba(4,18,23,.38)';ctx.strokeStyle='rgba(211,241,231,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(left-10,y-10,width+20,Math.max(20,contentBottom-y+10),16);ctx.fill();ctx.stroke();
            ctx.save();ctx.beginPath();ctx.rect(left,y,width,Math.max(0,contentBottom-y-hintHeight));ctx.clip();
            ctx.fillStyle='#ffffff';ctx.font=(card.largeText?'600 31px':'600 27px')+' Manrope, system-ui';
            const lineHeight=card.largeText?36:32;
            ctx.textAlign='left';card.lines.forEach(line=>{ctx.fillText(line,left,y,width);y+=lineHeight;});ctx.restore();
            if(readingHint){ctx.fillStyle='#d8e6e3';ctx.font='600 20px system-ui';ctx.textAlign='center';infoPages(readingHint,Math.max(24,Math.floor(width/11)),2)[0].forEach((line,index)=>ctx.fillText(line,left+width/2,contentBottom-hintHeight+8+index*24,width-16));ctx.textAlign='left';}
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
            if(card.trail){ctx.fillStyle='rgba(69,111,103,.28)';ctx.beginPath();ctx.roundRect(194,contentTop+18,784,34,9);ctx.fill();ctx.fillStyle='#8ee6d0';ctx.font='650 19px system-ui';ctx.fillText(card.trail,206,contentTop+40,760);}
            const bodyOffset=card.trail?75:47;
            card.lines.forEach((line,i)=>{ctx.fillStyle='#f1f4f4';ctx.font=(card.largeText?'400 31px':'400 27px')+' system-ui';ctx.textAlign='left';ctx.fillText(line,titleX,contentTop+bodyOffset+i*(card.largeText?36:32),titleWidth);ctx.textAlign='left';});
            if(card.hoverHint && !card.progress){ctx.fillStyle='rgba(8,23,26,.24)';ctx.beginPath();ctx.roundRect(200,92,630,42,10);ctx.fill();ctx.fillStyle='#d6e5eb';ctx.font='400 16px system-ui';infoPages(card.hoverHint,65,2)[0].forEach((line,index)=>ctx.fillText(line,210,98+index*18,610));}
            const footerY=card.pathway?card.height-190:card.height-86;
            if(card.hint){ctx.fillStyle='#d8e6e3';ctx.font='600 21px system-ui';ctx.textAlign='center';infoPages(card.hint,72,2)[0].forEach((line,index)=>ctx.fillText(line,500,footerY-64+index*25,740));ctx.textAlign='left';}
            ctx.fillStyle='#b4c3c7';ctx.font='400 17px system-ui';ctx.fillText(card.metadata,200,footerY,600);
            if(card.tab==='Details')ctx.fillText(card.page,882,footerY,88);
        }
        const panelButtons=card.controls.filter(button=>button.panelOpener);
        if(panelButtons.length){
            const first=panelButtons[0],last=panelButtons[panelButtons.length-1],groupTop=first.y-30;
            ctx.fillStyle='rgba(233,237,228,.045)';ctx.beginPath();ctx.roundRect(first.x-8,groupTop-6,first.width+16,last.y+last.height-groupTop+14,16);ctx.fill();
            ctx.strokeStyle='rgba(226,232,217,.28)';ctx.lineWidth=1.5;ctx.stroke();
            ctx.fillStyle='#d6ded4';ctx.font='650 16px system-ui';ctx.textAlign='left';ctx.fillText('PANELS',first.x+8,groupTop+2,first.width-16);
        }
        card.controls.forEach(button=>{
            const radius=button.kind==='tab'?13:15;
            const aimed=card.hoverAction===button.action && !button.disabled;
            const isContinue=button.action==='Utility:continue';
            if(button.kind!=='tab' && button.kind!=='handle' && !button.disabled && !isContinue){ctx.fillStyle='rgba(4,9,12,.34)';ctx.beginPath();ctx.roundRect(button.x,button.y+5,button.width,button.height,radius);ctx.fill();}
            const face=ctx.createLinearGradient(button.x,button.y,button.x,button.y+button.height);
            if(isContinue){face.addColorStop(0,button.disabled?'rgba(100,112,112,.12)':'rgba(55,96,81,.88)');face.addColorStop(1,button.disabled?'rgba(100,112,112,.06)':'rgba(11,32,28,.94)');}
            else if(button.panelOpener){face.addColorStop(0,button.expanded?'rgba(239,239,223,.16)':'rgba(237,239,229,.11)');face.addColorStop(1,'rgba(34,39,37,.08)');}
            else if(button.action==='Utility:close-confirm'){face.addColorStop(0,'rgba(192,53,51,.38)');face.addColorStop(1,'rgba(92,24,30,.24)');}
            else if(button.primary){face.addColorStop(0,'rgba(79,128,115,.18)');face.addColorStop(1,'rgba(29,69,68,.26)');}
            else if(button.selected){face.addColorStop(0,'rgba(140,205,235,.5)');face.addColorStop(1,'rgba(56,112,150,.4)');}
            else if(button.disabled){face.addColorStop(0,'rgba(211,220,225,.05)');face.addColorStop(1,'rgba(211,220,225,.025)');}
            else if(button.action==='Utility:close'){face.addColorStop(0,'rgba(224,199,191,.14)');face.addColorStop(1,'rgba(45,34,33,.08)');}
            else if(button.kind==='toggle'||button.kind==='handle'){face.addColorStop(0,'rgba(174,232,252,.4)');face.addColorStop(1,'rgba(61,137,177,.2)');}
            else {face.addColorStop(0,'rgba(225,242,239,.12)');face.addColorStop(.5,'rgba(169,202,207,.08)');face.addColorStop(1,'rgba(19,42,46,.10)');}
            ctx.fillStyle=face;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,radius);ctx.fill();
            if(button.kind!=='tab' && !button.disabled){ctx.strokeStyle=button.action==='Utility:close-confirm'?'rgba(255,180,177,.82)':button.panelOpener?'rgba(230,233,222,.48)':isContinue?'rgba(220,218,202,.72)':button.primary?'rgba(200,233,216,.82)':'rgba(232,244,240,.48)';ctx.lineWidth=3;ctx.stroke();}
            if(button.kind==='visibility'){ctx.strokeStyle=button.selected?'#85e5ae':'#ee8f8b';ctx.lineWidth=aimed?5:3;ctx.stroke();}
            if(aimed){ctx.fillStyle='rgba(219,237,216,.22)';ctx.fill();ctx.strokeStyle='rgba(245,247,222,.96)';ctx.lineWidth=4;ctx.stroke();}
            if(button.action===guidanceAction){ctx.strokeStyle=`rgba(211,245,205,${.45+.4*(.5+.5*Math.sin((lastTime-guidanceStartedAt)/450))})`;ctx.lineWidth=5;ctx.stroke();}
            if(button.selected){ctx.fillStyle='#9adcf4';ctx.fillRect(button.x,button.y+9,4,button.height-18);}
            if(button.panelOpener){
                ctx.strokeStyle='#d6ded6';ctx.lineWidth=1.8;ctx.beginPath();ctx.roundRect(button.x+10,button.y+10,14,14,3);ctx.moveTo(button.x+15,button.y+11);ctx.lineTo(button.x+15,button.y+23);ctx.stroke();
                ctx.textAlign='left';ctx.fillStyle='#f1fffc';ctx.font='550 20px system-ui';ctx.fillText(button.label,button.x+33,button.y+16,button.width-40);return;
            }
            ctx.fillStyle=button.disabled?'#899297':isContinue?'#ffffff':button.primary?'#f3fbf4':button.kind==='toggle'||button.kind==='handle'?'#a9e7fa':'#f1f7fb';ctx.font=(isContinue?'750 ':button.primary?'680 ':button.kind==='toggle'||button.kind==='handle'?'650 ':'600 ')+(isContinue?'46px':button.primary?'32px':button.kind==='toggle'||button.kind==='handle'?'28px':'25px')+' Manrope, system-ui';ctx.textAlign='center';
            if(isContinue && ctx.measureText(button.label).width>button.width-28){ctx.font='700 34px Manrope, system-ui';const words=button.label.split(/\s+/),split=Math.ceil(words.length/2),lines=[words.slice(0,split).join(' '),words.slice(split).join(' ')];lines.forEach((line,i)=>ctx.fillText(line,button.x+button.width/2,button.y+button.height/2-34+i*36,button.width-28));}
            else ctx.fillText(button.label,button.x+button.width/2,button.y+(button.height-(isContinue?44:button.primary?34:button.kind==='toggle'||button.kind==='handle'?30:28))/2,button.width-16);
        });return c;
    }
    function hit(ray){if(!pose || !renderer || detached)return null;const target=renderer.hit(ray);if(target?.card.hidden && Math.hypot(target.localX/target.width,target.localY/target.height)>.44)return null;return target;}
    const controlsForTarget=target=>target?.card?.explorer?explorerControls():target?.card?.settings?settingsControls():(headset?spatialControls():controls());
    const targetButtonAtRay=target=>{
        if(!target?.width || !target.height)return null;
        const x=(target.localX/target.width+.5)*1000,logicalHeight=target.card?.hidden?1000:target.card?.height || spatialHeight();
        const y=(.5-target.localY/target.height)*logicalHeight;
        return controlsForTarget(target).find(item=>x>=item.x && x<=item.x+item.width && y>=item.y && y<=item.y+item.height) || null;
    };
    function updateHandContacts(frame,time,blocked=false){
        handContacts.clear();
        const sources=[...(frame?.session?.inputSources || [])].filter(source=>source.hand);
        for(const [source,poke] of handPokes)if(!sources.includes(source)){poke.reset();handPokes.delete(source);}
        if(blocked===true || !handReferenceSpace || !renderer || detached || frame?.session?.visibilityState==='hidden'){for(const poke of handPokes.values())poke.reset();return null;}
        let hover=null;
        for(const source of sources){
            const state=handTrackingState(frame,source,handReferenceSpace),poke=handPokes.get(source) || createHandPokeTracker();handPokes.set(source,poke);
            if(!state?.tracked || typeof blocked==='function' && blocked(source)){poke.reset();continue;}
            for(const point of state.rawJoints.values()){
                const target=renderer.hitPoint(point,{front:.045,back:.018});if(!target)continue;
                handContacts.set(source,true);const button=targetButtonAtRay(target);
                if(button && (!hover || target.distance<hover.distance))hover={...target,button};
            }
            const index=state.rawJoints.get('index-finger-tip'),surface=renderer.hitPoint(index),target=surface?{...surface,button:targetButtonAtRay(surface)}:null;
            if(!handIndexCanPoke(state))poke.reset();
            else if(poke.update(index,target,time)){
                // A poke owns its press, including a simultaneous pinch event.
                handContacts.set(source,true);
                handSelections.set(source,state.pinchSequence+(state.pinch?0:1));
                if(!slideAtTarget(target.button,target) && target.button.action!=='MoveMediaPanel')act(target.button.action);
            }else if(poke.pressed && target?.button?.kind==='slider' && !target.button.disabled && poke.action===target.button.action){
                slideAtTarget(target.button,target);
            }
        }
        return hover;
    }
    function explorerControls(){
        if(fruitVisible)return [{action:'Explorer',label:'Close controls',x:22,y:70,width:464,height:54},{action:'FruitWindow:next',label:'Other fruits',x:506,y:70,width:464,height:54}];
        if(selection?.limo && !objectContext)return limoSpatialControls(selection.limo);
        if(selection?.controlsType==='LIMO' && !objectContext)return [{action:'Explorer',label:'Done',x:852,y:8,width:124,height:38},{action:'Utility:limo-show',label:'Show cells',x:22,y:62,width:464,height:54},{action:'Utility:limo-hide',label:'Hide cells',x:506,y:62,width:464,height:54}];
        if(objectContext)return [{action:'Explorer',label:'Done',x:852,y:8,width:124,height:38},...spatialControlLayout(objectContext.actions).map(item=>({...item,action:'Object:'+item.id}))];
        if(!knowledgeRecord && stageContext)return [{action:'Explorer',label:'Done',x:852,y:8,width:124,height:38},...spatialControlLayout(stageContext.actions || []).map(item=>({...item,action:'Utility:'+item.id}))];
        const state=knowledgeRecord?knowledgeExplorer(knowledgeRecord):{mode:panelModeChoice};
        return [{action:'Explorer',label:'Done',x:852,y:8,width:124,height:38},...visiblePimoModes().map((id,i)=>({action:'KnowledgeMode:'+id,label:KNOWLEDGE_MODES[id].label,x:22+i*326,y:128,width:304,height:54,kind:'mode',description:KNOWLEDGE_MODES[id].description,selected:state.mode===id})),
            {action:'Limo:open',label:'Learn in this Project · LIMO',x:22,y:66,width:948,height:54},
            {action:'FruitWindow:load',label:fruitVisible?'Fruit Window loaded':'Load Fruit Window',x:22,y:204,width:464,height:54,disabled:fruitVisible},
            {action:'FruitWindow:hide',label:'Hide Fruit Window',x:506,y:204,width:464,height:54,disabled:!fruitVisible},
            ];
    }
    const explorerHeight=()=>Math.max(180,...explorerControls().map(item=>item.y+item.height+18));

    function renderExplorer(){
        explorerElement.hidden=hidden || detached || confirmation || explorerClosed || Boolean(renderer);element.classList.toggle('has-explorer-companion',!explorerElement.hidden);if(explorerElement.hidden)return;
        const state=knowledgeRecord?knowledgeExplorer(knowledgeRecord):{mode:availablePimoModes().includes(panelModeChoice)?panelModeChoice:'curiosity'},main=element.getBoundingClientRect();explorerElement.style.setProperty('--nlxr-info-opacity',String(infoOpacity));
        explorerElement.style.width=main.width+'px';explorerElement.style.left=(explorerPosition?.x ?? main.left)+'px';explorerElement.style.top=(explorerPosition?.y ?? Math.max(8,Math.min(main.bottom+12,window.innerHeight-166)))+'px';
        explorerElement.replaceChildren();const header=document.createElement('header'),title=document.createElement('h2');title.textContent=fruitVisible?'Controls · FDW':selection?.limo?'LIMO · '+selection.limo.cue:objectContext?.title || (knowledgeRecord?'Controls · PIMO':selection?.controlsType==='LIMO'?'Controls · LIMO':'Controls');header.append(title);header.title='Grip to move Controls';const linked=document.createElement('small');linked.textContent=fruitVisible?fruitWindow?.getLabel()||'Fruit Discovery Window':objectContext?.linkedName || identity?.plant || record?.name || stageContext?.linkedName || selection?.title || '';header.append(linked);
        const hint=document.createElement('span');hint.className='nlxr-explorer-hint';hint.textContent=fruitVisible?'Hold Trigger to carry fruit. Bring it close and keep holding to open it.':selection?.limo?.coverage || objectContext?.hint || (knowledgeRecord?KNOWLEDGE_MODES[state.mode].question:'Select a Note, Totem or Plant Orb to see its controls.');header.append(hint);explorerElement.append(header);
        const modes=document.createElement('nav');modes.className='nlxr-explorer-modes';modes.setAttribute('aria-label','Knowledge view');
        const options=document.createElement('nav');options.className='nlxr-explorer-options';options.setAttribute('aria-label','PIMO controls');
        for(const item of explorerControls()){
            if(item.action==='Explorer'){header.append(makeButton(item));continue;}
            if(item.kind==='heading'){const heading=document.createElement('h3');heading.className='nlxr-object-control-heading';heading.textContent=item.label;options.append(heading);continue;}
            if(item.kind==='slider'){const label=document.createElement('label');label.className='nlxr-explorer-size';label.textContent=item.action==='CellOpacity'?'Cell surface · '+Math.round(item.value*100)+'% solid':'Structure scale · '+item.value.toFixed(2)+'×';const slider=document.createElement('input');slider.type='range';slider.min=item.min;slider.max=item.max;slider.step=item.step;slider.value=item.value;slider.setAttribute('aria-label',item.action==='CellOpacity'?'PIMO cell opacity':'Explorer structure scale');slider.addEventListener('input',()=>setSliderValue(item.action,Number(slider.value)));label.append(slider);options.append(label);}
            else {const button=makeButton(item);button.setAttribute('aria-pressed',String(Boolean(item.selected)));if(item.ariaLabel)button.setAttribute('aria-label',item.ariaLabel);if(item.kind==='swatch'){button.textContent='';button.setAttribute('aria-label',t('Light · '+item.label));const swatch=document.createElement('span');swatch.className='nlxr-light-swatch';swatch.style.backgroundColor=item.color;button.append(swatch);}if(item.kind==='mode'){const choice=document.createElement('div'),description=document.createElement('p');choice.className='nlxr-explorer-mode-choice';description.textContent=item.description;description.id=contentId+'-'+item.action.replace(':','-')+'-description';button.setAttribute('aria-describedby',description.id);choice.append(button,description);modes.append(choice);}else options.append(button);}
        }explorerElement.append(modes,options);
        translateApp(explorerElement);
        // Keep specialised assembly forms out of the everyday mode chooser.
    }
    function renderMoleculeCustomization(){
        const knowledge=pimToArKnowledge(knowledgeDocument.explorerSourceDocument || knowledgeDocument),molecule=ensureExplorerMolecule(knowledgeRecord,knowledge),index=explorerMoleculeIndex(knowledge,knowledgeRecord);
        const progress=document.createElement('p');progress.className='nlxr-molecule-progress';progress.setAttribute('role','status');
        progress.textContent=molecule.wings.filter(id=>molecule.assembled.includes('core>'+id)).length+' wings built · '+molecule.discovered.length+' topics discovered'+(molecule.purpose?' · '+molecule.purpose:'');explorerElement.append(progress);
        const details=document.createElement('details');details.className='nlxr-molecule-customize';details.open=Boolean(molecule.customizationOpen);details.addEventListener('toggle',()=>{if(details.isConnected)molecule.customizationOpen=details.open;});const summary=document.createElement('summary');summary.textContent='Customize your organism';details.append(summary);
        const message=document.createElement('p');message.textContent='Choose what matters here. Wildlife and Historical Facts suit a ranger’s focus. Traditional uses can belong in your rainforest story when supported by recorded knowledge.';details.append(message);
        const form=document.createElement('form');form.setAttribute('aria-label','Organism identity');
        const input=(parent,label,value='',type='text')=>{const row=document.createElement('label');row.textContent=label;const field=document.createElement('input');field.type=type;field.value=value;field.setAttribute('aria-label',label);row.append(field);parent.append(row);return field;};
        const submit=(parent,label)=>{const button=document.createElement('button');button.type='submit';button.textContent=label;parent.append(button);};
        const name=input(form,'Organism name',molecule.name || index.title),purpose=input(form,'Purpose or place',molecule.purpose || '');name.maxLength=80;purpose.maxLength=280;submit(form,'Apply name and purpose');
        const encode=values=>encodeURIComponent(JSON.stringify(values));
        form.addEventListener('submit',event=>{event.preventDefault();act('KnowledgeMoleculePersonalize:'+encode({name:name.value,purpose:purpose.value}));});details.append(form);
        const wing=index.nodes.get(index.nodes.get(molecule.selectedId)?.domainId);
        if(wing && wing.id!=='core' && molecule.wings.includes(wing.id)){
            const style=document.createElement('form');style.setAttribute('aria-label','Selected wing style');
            const label=input(style,'Wing name',wing.label),colour=input(style,'Wing colour',wing.colour || '#79ab91','color'),scale=input(style,'Wing scale',molecule.wingObjects[wing.id]?.scale || 1,'number');scale.min=.65;scale.max=1.6;scale.step=.05;submit(style,'Apply wing style');
            style.addEventListener('submit',event=>{event.preventDefault();act('KnowledgeMoleculeWingStyle:'+encode({label:label.value,colour:colour.value,scale:Number(scale.value)}));});details.append(style);
        }
        const custom=document.createElement('form');custom.setAttribute('aria-label','Create a custom wing');
        const title=input(custom,'New wing name'),colour=input(custom,'New wing colour','#8ca7b4','color');title.required=true;title.maxLength=72;
        const label=document.createElement('label');label.textContent='Choose existing topics (up to 12)';const select=document.createElement('select');select.multiple=true;select.size=6;select.required=true;select.setAttribute('aria-label','Topics for custom wing');
        for(const node of explorerMoleculeIndex(knowledge).nodes.values()){if(node.id==='core'||node.sample||node.virtualWing||node.sourceId)continue;const option=document.createElement('option');option.value=node.id;option.textContent=(node.path || node.id)+' · '+node.label;select.append(option);}label.append(select);custom.append(label);
        submit(custom,'Create wing in library');custom.addEventListener('submit',event=>{event.preventDefault();act('KnowledgeMoleculeCustom:'+encode({label:title.value,colour:colour.value,sourceIds:[...select.selectedOptions].map(option=>option.value)}));});details.append(custom);explorerElement.append(details);
    }
    function explorerDockPose(){if(!pose)return null;const {mainHeight,mainWidth}=spatialDimensions(),offset=mainHeight/2+explorerHeight()/1000*mainWidth/2+.035;return {...pose,center:{x:pose.center.x-pose.up.x*offset,y:pose.center.y-pose.up.y*offset,z:pose.center.z-pose.up.z*offset}};}
    function explorerSpatialPose(){return explorerPose || explorerDockPose();}
    function explorerNearDock(){const dock=explorerDockPose();return Boolean(dock && explorerPose && Math.hypot(explorerPose.center.x-dock.center.x,explorerPose.center.y-dock.center.y,explorerPose.center.z-dock.center.z)<.16);}
    function finishExplorerDock(){if(explorerNearDock()){explorerPose=null;explorerPosition=null;explorerElement.classList.add('is-magnetized');}}
    function settingsDockPose(){return spatialMediaDockPose(!mediaCollapsed && mediaDockSide==='left'?'top':'left');}
    function settingsNearDock(){const dock=settingsDockPose();return Boolean(dock && settingsPose && Math.hypot(settingsPose.center.x-dock.center.x,settingsPose.center.y-dock.center.y,settingsPose.center.z-dock.center.z)<.24);}
    function finishSettingsDock(){if(settingsNearDock()){settingsPose=null;settingsElement.classList.add('is-magnetized');}}
    function spatialDimensions(){return {mainWidth:(hidden ? .14 : headset ? .84 : .66)*spatialScale,mainHeight:(hidden ? .14 : headset ? guided?Math.max(.588,spatialHeight()/700*.588):.588 : spatialHeight()/1000*.60)*spatialScale,mediaWidth:.66*spatialScale};}
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
        setRayFilter(value){rayFilter=typeof value==='function'?value:()=>true;},
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
        clearPlant(nextRecord){if(knowledgeRecord===nextRecord)knowledgeRecord=null;if(record!==nextRecord){renderExplorer();return false;}record=null;identity=null;selection=null;mediaCollapsed=true;loadPanelImage('');page=0;render(true);return true;},
        showLearning(content){
            objectContext=null;contextHint='';
            if(!content?.keepExplorerContext)knowledgeRecord=null;
            record=null;identity=null;selection={...content,sources:[],editable:false,mesh:content?.mesh || 'lim'};
            const imageSource=learningPanelMedia(content)?.image || '';
            mediaCollapsed=true;mediaTouched=false;
            if(imageSource)mediaCollapsed=false;
            loadPanelImage(imageSource,{delayMs:Number(content?.imageTransitionDelayMs)||0,discardPrevious:Boolean(content?.discardPreviousImage)});
            tab='Details';page=0;if(content?.controlsType)explorerClosed=false;render(true);
        },
        setLearningModules(value,{open=false}={}){const previousTab=tab;moduleContext=value?{...value,actions:[...(value.actions||[])]}:null;if(open && moduleContext)tab='Help';page=0;if(previousTab==='Details' && tab==='Details')updateReading();else render();},
        setUtilityActions(items=[]){utilityActions=items.slice(0,8).map(item=>({...item}));render();},
        setVisibilityItems(items=[]){const signature=JSON.stringify(items);if(signature===visibilitySignature)return;visibilitySignature=signature;visibilityItems=items.map(item=>({...item}));render(true);},
        showFruitWindow(nextIdentity=null,example=null){fruitIdentity=nextIdentity || identity;fruitExample=example || fruitWindowSpecies(fruitIdentity || {})?.id || null;return loadFruitWindow();},
        hideFruitWindow,
        setObjectContext(value){objectContext=value;knowledgeRecord=null;knowledgeDocument=null;panelModeChoice=null;mediaCollapsed=true;loadPanelImage('');render(true);},
        setStageContext(value,{preserveObject=false}={}){stageContext=value;if(!preserveObject){objectContext=null;knowledgeRecord=null;knowledgeDocument=null;}renderExplorer();},
        makeRoomFor(point){
            if(!pose || !point || spatialMove || spatialGrabPending)return false;
            const delta={x:point.x-pose.center.x,y:point.y-pose.center.y,z:point.z-pose.center.z},dot=axis=>delta.x*axis.x+delta.y*axis.y+delta.z*axis.z,{mainWidth,mainHeight}=spatialDimensions();
            if(Math.abs(dot(pose.right))>mainWidth/2+.3 || Math.abs(dot(pose.up))>mainHeight/2+.7 || Math.abs(dot(pose.normal))>.75)return false;
            finishExplorerDock();finishSettingsDock();if(!mediaDetached)mediaPose=null;
            const direction=dot(pose.right)>=0?-1:1,distance=mainWidth/2+.5;
            panelShift={from:{...pose.center},to:{x:pose.center.x+pose.right.x*direction*distance,y:pose.center.y,z:pose.center.z+pose.right.z*direction*distance},startedAt:performance.now()};return true;
        },
        guideTool(action='Explorer'){guidanceAction=action;guidanceStartedAt=performance.now();element.classList.toggle('is-panel-guidance',action==='ToggleMedia');render(true);},
        snapshot(){return {selection:selection?{...selection}:null,record,identity:identity?{...identity}:null,knowledgeRecord,knowledgeDocument,objectContext,stageContext,contextHint,page,hidden,tab,settingsOpen,mediaCollapsed,explorerClosed,panelModeChoice,headerProgress,pathwayContext,moduleContext,fruitVisible,fruitIdentity,fruitExample:fruitWindow?.getExample()||fruitExample};},
        restoreSnapshot(value){if(!value)return;hideFruitWindow();({selection,record,identity,knowledgeRecord,knowledgeDocument,objectContext,stageContext,contextHint,page,hidden,tab,settingsOpen,mediaCollapsed,explorerClosed,panelModeChoice,headerProgress,pathwayContext,moduleContext}=value);loadPanelImage(identity?.media?.image || learningPanelMedia(selection)?.image || '',{discardPrevious:true});if(value.fruitVisible){fruitIdentity=value.fruitIdentity;fruitExample=value.fruitExample;void loadFruitWindow();}render(true);},
        setHeaderProgress(value){headerProgress=value?.steps?.length?{label:String(value.label || 'Progress'),activeId:String(value.activeId || value.steps[0].id),steps:value.steps.map(step=>({id:String(step.id),label:String(step.label)}))}:null;render();},
        setTaskProgress(value){
            if(!value){taskProgress=null;render();return;}
            const steps=value.steps.map(step=>({...step})),pending=steps.findIndex(step=>!step.complete),activeIndex=pending<0?steps.length-1:pending;
            taskProgress={label:'Try the interactions',checklist:true,steps,activeIndex,current:pending<0?{label:'Ready to continue'}:steps[activeIndex],successAt:value.successAt || 0};render();
        },
        setXRPerformance(value){performanceSettings=value;renderSettings();updateReading();},
        setContextualHint(message=''){contextHint=String(message || '');page=0;updateReading();},
        setPanelHints(values=[]){rotatingPanelHints=Array.isArray(values)?values.map(String).filter(Boolean):[];panelHintIndex=0;clearInterval(panelHintTimer);panelHintTimer=0;if(rotatingPanelHints.length>1)panelHintTimer=setInterval(()=>{panelHintIndex=(panelHintIndex+1)%rotatingPanelHints.length;if(!contextHint && !identity?.hint && tab!=='Help')updateReading();},7000);if(!contextHint && !identity?.hint && tab!=='Help')updateReading();},
        setMediaCollapsed(value=true){mediaCollapsed=Boolean(value);mediaTouched=false;render(true);},
        setExplorerOpen(value=true){explorerClosed=!Boolean(value);render(true);},
        setSettingsOpen(value=true){settingsOpen=Boolean(value);renderSettings();},
        restore(){hidden=false;detached=false;element.style.visibility='';render(true);},
        minimize(){act('Hide');},
        setCompact(value=true){const compact=Boolean(value) && !isDesktopDemo();railCollapsed=false;if(compact)mediaCollapsed=true;element.classList.toggle('is-opening-compact',compact);if(!element.querySelector('.nlxr-media-wing') && showPlantPreview() && !mediaCollapsed)render(true);else syncPanelWings();},
        recenter(){heading=null;pose=null;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;render();},
        setPathwayContext(value){pathwayContext=value ? {...value,actions:[...(value.actions || [])]} : null;updatePathway();},
        setGuided(value){guided=Boolean(value);element.classList.toggle('is-guided',guided);},
        setIntroduction(value){introduction=Boolean(value);element.classList.toggle('is-intro-reveal',introduction);},
        focusPlant(nextRecord,document,media=null){
            if(!visiblePimoModes().includes(knowledgeExplorer(nextRecord).mode))knowledgeExplorerAction(nextRecord,'KnowledgeMode:curiosity');
            explorerClosed=false;
            objectContext=null;
            const previousMedia=record===nextRecord ? identity?.media : null;
            const previousHint=record===nextRecord ? identity?.hint : '';
            if(panelModeChoice)knowledgeExplorerAction(nextRecord,'KnowledgeMode:'+panelModeChoice);const savedContext=knowledgeExplorer(nextRecord);
            document=savedContext.mode==='explore'?explorerDetailDocument(document,nextRecord):document.explorerSourceDocument || document;
            const selectedPath=savedContext.mode==='explore'?explorerSelectedPath(nextRecord,pimToArKnowledge(document.explorerSourceDocument || document)):nextRecord.demoSelectedNodeId || nextRecord.pimSelectedNodeId;
            const selectedContent=selectedPath?pimInfoContent(document,selectedPath):null;
            const nextMedia=pimPanelMedia(document,selectedContent,media,previousMedia);
            record=nextRecord;knowledgeRecord=nextRecord;knowledgeDocument=document;selection=selectedContent;identity={plant:document.identity?.commonName || document.identity?.scientificName || 'Plant',scientific:document.identity?.scientificName || '',media:nextMedia,hint:String(media?.hint || previousHint || '')};
            mediaCollapsed=!nextMedia?.image;mediaTouched=false;
            loadPanelImage(nextMedia?.image || '');
            tab='Details';page=savedContext.mode==='explore'?nextRecord.explorerMolecule?.readingPage || 0:savedContext.readingPage || 0;if(fruitVisible)fruitWindow?.show(identity);render(true);
        },
        select(nextRecord,document,path){const next=pimInfoContent(document,path);if(!next)return false;objectContext=null;const sameRecord=record===nextRecord,previous=sameRecord?identity?.media:null,previousHint=sameRecord?identity?.hint:'';const cellMedia=next.media;const image=cellMedia?.image || cellMedia?.url || cellMedia?.src || document?.identity?.image;const media=image?{image:String(image),alt:String(cellMedia?.alt || document.identity?.imageAlt || document.identity?.commonName || document.identity?.scientificName || 'Plant'),caption:String((cellMedia?.image || cellMedia?.url || cellMedia?.src) ? next.title : document.identity?.commonName || '')}:previous;record=nextRecord;knowledgeRecord=nextRecord;knowledgeDocument=document;selection=next;identity={plant:next.plant,scientific:document.identity?.scientificName || '',media,hint:previousHint};loadPanelImage(media?.image || '');mediaCollapsed=!media?.image;mediaTouched=false;tab='Details';hidden=false;page=0;render(true);return true;},
        refresh(nextRecord,document){if(record===nextRecord && selection)api.select(record,document,selection.id);},
        suspend(value){element.style.visibility=value?'hidden':'';detached=Boolean(value);renderSettings();if(!value){updateReading();updatePathway();}},
        attach(gl){fruitGl=gl;fruitWindow?.attach(gl);renderer?.destroy();renderer=createSpatialTotemCards(gl,{canvas,surfaces:(_position,_viewRight,cards)=>{
            if(!pose)return [];
            const {mainWidth,mainHeight,mediaWidth}=spatialDimensions();
            const surfaces=[{...pose,width:mainWidth,height:mainHeight,card:cards[0]}];
            const settingsCard=cards.find(card=>card.settings),mediaCard=cards.find(card=>card.media),explorerCard=cards.find(card=>card.explorer);
            if(explorerCard && !hidden)surfaces.push({...explorerSpatialPose(),width:mainWidth,height:explorerHeight()/1000*mainWidth,card:explorerCard});
            const settingsSurfacePose=settingsPose || spatialMediaDockPose(mediaCard && mediaDockSide==='left'?'top':'left');
            if(settingsOpen && !hidden && settingsCard)surfaces.push({...settingsSurfacePose,width:mediaWidth,height:mainHeight,card:settingsCard});
            if(!hidden && mediaCard){mediaPose ||= spatialMediaDockPose(mediaDockSide);const mediaSurface=mediaDetached?mediaPose:spatialMediaDockPose(mediaDockSide);if(mediaSurface){const forward=pose.normal,horizontal=Math.hypot(forward.x,forward.z)||1;const normal={x:forward.x/horizontal,y:0,z:forward.z/horizontal};surfaces.push({...mediaSurface,normal,right:{x:normal.z,y:0,z:-normal.x},up:{x:0,y:1,z:0},width:mediaWidth,height:mediaWidth*mediaCard.height/1000,card:mediaCard});}}
            return surfaces;
        }});element.hidden=true;settingsElement.hidden=true;syncDetachedMedia();},
        update(matrix,time=performance.now(),inputRay=null,xrFrame=null,touchBlocked=false){
            const next=infoPanelPose(matrix,heading,headset,phoneAR);if(!next)return;heading=next.anchorHeading;
            const grab=sliderGrab || spatialMove || spatialGrabPending;
            let heldTransform=null,handMoveRay=null;
            if(spatialMove?.panel==='settings' && grab?.source?.hand && xrFrame){const state=handTrackingState(xrFrame,grab.source,grab.referenceSpace);if(!state?.tracked || !state.pinch)finishSettingsDock();}
            if(grab?.source?.hand && xrFrame){const state=handTrackingState(xrFrame,grab.source,grab.referenceSpace),index=state?.rawJoints.get('index-finger-tip'),thumb=state?.rawJoints.get('thumb-tip');if(!state?.tracked || !state.pinch){if(spatialMove?.panel==='explorer')finishExplorerDock();spatialMove=null;spatialGrabPending=null;sliderGrab=null;}else if(index && thumb){const origin={x:(index.x+thumb.x)/2,y:(index.y+thumb.y)/2,z:(index.z+thumb.z)/2};if(!grab.handAnchor){grab.handAnchor=origin;grab.panelAnchor={...(grab.panel==='explorer'?explorerSpatialPose():grab.panel==='settings'?settingsPose || spatialMediaDockPose('left'):grab.panel==='media'?mediaPose || spatialMediaDockPose(mediaDockSide):pose).center};}handMoveRay=state.pointer?{...state.pointer,direction:grab.handDirection || state.pointer.direction}:null;grab.handCenter={x:grab.panelAnchor.x+origin.x-grab.handAnchor.x,y:grab.panelAnchor.y+origin.y-grab.handAnchor.y,z:grab.panelAnchor.z+origin.z-grab.handAnchor.z};}}
            if(grab && !grab.source?.hand && xrFrame?.getPose && grab.source?.targetRaySpace && grab.referenceSpace){
                try{heldTransform=xrFrame.getPose(grab.source.targetRaySpace,grab.referenceSpace)?.transform.matrix || null;}catch{heldTransform=null;}
            }
            const heldRay=handMoveRay || (heldTransform?{origin:{x:heldTransform[12],y:heldTransform[13],z:heldTransform[14]},direction:{x:-heldTransform[8],y:-heldTransform[9],z:-heldTransform[10]}}:xrFrame?null:inputRay);
            if(sliderGrab && heldRay){const target=hitTotemSurface(heldRay,[sliderGrab.surface]);if(target)slideAtTarget(sliderGrab.button,target);}
            if(spatialGrabPending && time-spatialGrabPending.startedAt>=PANEL_GRAB_HOLD_MS){
                if(heldRay && hit(heldRay)?.card?.id===spatialGrabPending.cardId){
                    if(spatialGrabPending.panel==='media' && !mediaDetached){mediaPose=spatialMediaDockPose(mediaDockSide);mediaDetached=true;mediaCollapsed=false;render(true);}
                    spatialMove={...spatialGrabPending,panel:spatialGrabPending.panel};onGrab(spatialGrabPending.source);
                }
                spatialGrabPending=null;
            }
            if(spatialMove && heldRay?.origin && heldRay?.direction){
                panelShift=null;
                const depthSource=spatialMove.source;
                const axes=depthSource?.gamepad?.axes || [],stick=Number(axes.length>2?axes[3]:axes[1]) || 0;
                if(Math.abs(stick)>.15)spatialMove.distance=Math.max(.4,Math.min(2.5,spatialMove.distance-stick*Math.min(.05,Math.max(0,(time-lastTime)/1000))*.9));
                pose ||= next;
                if(spatialMove.panel==='media')mediaPose ||= spatialMediaDockPose(mediaDockSide);
                const current=spatialMove.panel==='explorer'?explorerSpatialPose():spatialMove.panel==='settings'?settingsPose || spatialMediaDockPose('left'):spatialMove.panel==='media'?mediaPose:pose;
                const center=spatialMove.handCenter || panelCenterFromGrab(heldRay,spatialMove,current);
                const facing=facePanelTowardEyes(center,{x:matrix[12],y:matrix[13],z:matrix[14]});
                const moved={...current,center,...facing,anchorHeading:facing.right};
                if(spatialMove.panel==='explorer'){explorerPose=moved;if(explorerNearDock())explorerPose=explorerDockPose();}else if(spatialMove.panel==='settings'){settingsPose=moved;if(settingsNearDock())settingsPose=settingsDockPose();settingsElement.classList.toggle('is-magnetized',settingsNearDock());}else if(spatialMove.panel==='media'){
                    mediaPose=moved;const candidate=spatialDockCandidate(mediaPose);
                    if(candidate){mediaPose=spatialMediaDockPose(candidate.side);spatialMove.dockSide=candidate.side;}else spatialMove.dockSide=null;
                }else{finishExplorerDock();finishSettingsDock();if(!mediaDetached)mediaPose=null;pose=moved;heading=facing.right;manuallyPositioned=true;}
            }else if(!pose){
                pose=next;
                if(headset && firstPlacement){
                    pose.center={x:pose.center.x-pose.right.x*.6,y:pose.center.y,z:pose.center.z-pose.right.z*.6};
                    pose={...pose,...facePanelTowardEyes(pose.center,{x:matrix[12],y:matrix[13],z:matrix[14]})};
                }
                firstPlacement=false;
            }
            if(panelShift && pose && !spatialMove && !spatialGrabPending){const progress=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?1:Math.min(1,Math.max(0,(time-panelShift.startedAt)/650)),amount=progress*progress*(3-2*progress);pose.center=Object.fromEntries(['x','y','z'].map(axis=>[axis,panelShift.from[axis]+(panelShift.to[axis]-panelShift.from[axis])*amount]));manuallyPositioned=true;if(progress===1)panelShift=null;}
            const directHover=updateHandContacts(xrFrame,time,touchBlocked);
            const hoverTarget=directHover || (inputRay ? hit(inputRay) : null),hoverButton=directHover?.button || targetButtonAtRay(hoverTarget);
            hoveredAction=hoverButton?.disabled?'':hoverButton?.action || '';
            const nextHoverDescription=hoverButton ? controlDescription(hoverButton) : '';
            const nextHoverPanelId=hoverTarget?.card?.id || '';
            if(nextHoverDescription!==hoveredDescription || nextHoverPanelId!==hoveredPanelId){hoveredDescription=nextHoverDescription;hoveredPanelId=nextHoverPanelId;}
            fruitWindow?.updateSpatial(pose,time,inputRay,xrFrame);lastTime=time;
        },
        recenter(){heading=null;pose=null;explorerPose=null;explorerPosition=null;mediaPose=mediaDetached?null:mediaPose;lastTime=0;manuallyPositioned=false;firstPlacement=false;spatialMove=null;spatialGrabPending=null;renderExplorer();},
        getPosition(){return pose?.center ? {...pose.center} : null;},
        rebase(matrix){fruitWindow?.rebase(matrix);for(const surface of new Set([pose,explorerPose,settingsPose,mediaPose]))rebaseXrPose(surface,matrix);spatialMove=null;spatialGrabPending=null;sliderGrab=null;},
        draw(view){
            fruitWindow?.draw(view);
            if(!renderer || !pose || detached)return;const p=pages();page=Math.min(page,p.length-1);
            const pimPathSelected=hasPimPath(),plantMedia=Boolean(identity?.media?.image);
            const card={id:'control',limo:selection?.limo,infoOpacity,headset,hidden,panelGuidance:guidanceAction==='ToggleMedia',tab,height:hidden?1000:spatialHeight(),largeText,guided,grabState:spatialMove?.panel==='main'?'held':spatialGrabPending?.panel==='main'?'ready':hoveredPanelId==='control'?'hover':'',guidancePhase:guidanceAction?Math.floor(lastTime/180):0,fadeDuration:introduction?1500:450,controls:headset?spatialControls():controls(),hoverAction:hoveredPanelId==='control'?hoveredAction:'',railCollapsed,mediaCollapsed,pathway:pathwayContext,progress:progressState(),accent:selection?.mesh==='lim'?selection.accent:'',plant:identity?.plant || selection?.plant || 'Control panel',scientific:identity?.scientific || (identity?'Selected plant':''),title:panelHeading(),trail:tab==='Details'?(readingTrail()):'',lines:p[page],hint:currentHint(),hoverHint:hoveredPanelId==='control'?hoveredDescription:'',page:'',metadata:metadata()};
            const settingsCard={id:'settings',settings:true,graphicsOpen,soundOpen,languageOpen,performanceMessage:performanceStatus(),infoOpacity,height:840,controls:settingsControls(),hoverAction:hoveredPanelId==='settings'?hoveredAction:'',hoverHint:hoveredPanelId==='settings'?hoveredDescription:''};
            // Both eyes use the last XR update time, not different wall-clock samples.
            const imageFade=Math.min(1,Math.max(0,((lastTime || performance.now())-mediaFadeStartedAt)/(selection?.imageFadeMs || MEDIA_FADE_MS)));
            if(imageFade>=1)mediaPreviousImage=null;
            const preview=previewMedia(),mediaCard={id:'media',media:true,panelGuidance:guidanceAction==='ToggleMedia',mediaRevision,imageSource:preview?.image || '',height:760,image:mediaImage,previousImage:mediaPreviousImage,imageFade,fadeDuration:selection?.imageFadeMs || MEDIA_FADE_MS,caption:preview?.caption || '',grabState:spatialMove?.panel==='media'?'held':spatialGrabPending?.panel==='media'?'ready':hoveredPanelId==='media'?'hover':'',hoverHint:hoveredPanelId==='media'?hoveredDescription:''};
            const explorerCard={id:'explorer',limo:fruitVisible?null:selection?.limo,explorer:true,infoOpacity,height:explorerHeight(),question:objectContext?.hint || (knowledgeRecord?KNOWLEDGE_MODES[knowledgeExplorer(knowledgeRecord).mode].question:'Select a Note, Totem or Plant Orb to see its controls.'),controls:explorerControls(),hoverAction:hoveredPanelId==='explorer'?hoveredAction:'',grabState:spatialMove?.panel==='explorer'?'held':hoveredPanelId==='explorer'?'hover':''};
            if(fruitVisible)explorerCard.question='Hold Trigger to carry fruit. Bring it close and keep holding to open it.';
            explorerCard.linkedLabel=fruitVisible?(fruitWindow?.getLabel()||'Fruit Discovery Window')+' · FDW':(objectContext?.linkedName || identity?.plant || record?.name || stageContext?.linkedName || selection?.title || '')+' · '+(objectContext?.title?.replace('Controls · ','') || (knowledgeRecord?'PIMO':selection?.controlsType || ''));
            const cards=[card];if(!confirmation && !explorerClosed)cards.push(explorerCard);if(settingsOpen)cards.push(settingsCard);if(!hidden && !mediaCollapsed && preview?.image)cards.push(mediaCard);
            renderer.begin();renderer.draw(view,{id:'companion'},pose.center,cards,'');renderer.end();
        },hit,
        refreshExplorer({mode}={}){
            if(mode && availablePimoModes().includes(mode)){
                panelModeChoice=mode;
                if(knowledgeRecord)knowledgeExplorerAction(knowledgeRecord,'KnowledgeMode:'+mode);
            }
            renderExplorer();
        },
        getHeldInputSource(){return spatialMove?.source || null;},
        activate(ray){if(fruitWindow?.activate(ray))return true;const target=hit(ray);if(!target)return false;const button=targetButtonAtRay(target);if(button && !slideAtTarget(button,target) && button.action!=='MoveMediaPanel')act(button.action);return true;},
        isHandInteracting(source){return Boolean(source && handContacts.get(source));},
        hitPoint(point){return !pose || !renderer || detached?null:renderer.hitPoint(point,{front:.045,back:.025});},
        activateHand(ray,source,state){
            if(api.isHandInteracting(source))return true;
            const target=hit(ray);if(!target)return false;
            const button=targetButtonAtRay(target);if(!button || button.disabled)return true;
            const sequence=state?.pinchSequence+(state?.pinch?0:1);
            if(source && handSelections.get(source)===sequence)return true;
            if(source)handSelections.set(source,sequence);
            if(!slideAtTarget(button,target) && button.action!=='MoveMediaPanel')act(button.action);return true;
        },
        getPerchPose(side='right',surface='control'){
            if(!pose || hidden || detached)return null;
            if(surface==='image'){
                if(mediaCollapsed || !previewMedia()?.image)return null;
                const {mediaWidth}=spatialDimensions(),mediaSurface=mediaDetached?mediaPose:spatialMediaDockPose(mediaDockSide);
                if(!mediaSurface)return null;
                const across=(side==='left'?-1:1)*mediaWidth/2,up=mediaWidth*.76/2;
                return {...mediaSurface,center:{x:mediaSurface.center.x+mediaSurface.right.x*across+mediaSurface.up.x*up,y:mediaSurface.center.y+mediaSurface.right.y*across+mediaSurface.up.y*up,z:mediaSurface.center.z+mediaSurface.right.z*across+mediaSurface.up.z*up}};
            }
            const {mainWidth,mainHeight}=spatialDimensions();
            // Feet sit on the extreme top-right edge, outside companion faces.
            const across=(side==='left'?-1:1)*mainWidth/2;
            return {...pose,center:{x:pose.center.x+pose.right.x*across+pose.up.x*mainHeight/2,y:pose.center.y+pose.right.y*across+pose.up.y*mainHeight/2,z:pose.center.z+pose.right.z*across+pose.up.z*mainHeight/2}};
        },
        bindSession(session,referenceSpace){removeXrControls();fruitSession=session;fruitSpace=referenceSpace;fruitWindow?.bindSession(session,referenceSpace);handReferenceSpace=referenceSpace;const handle=event=>{
            if((fruitWindow?.owns(event.inputSource)||!inputOccupied(event.inputSource))&&fruitWindow?.handleEvent(event)){event.stopImmediatePropagation();return;}
            const grip=event.type.startsWith('squeeze'),type=grip?(event.type==='squeezestart'?'selectstart':'selectend'):event.type;
            if(grip && event.inputSource?.hand)return;
            if(inputOccupied(event.inputSource))return;
            if(grip && onGripEvent(event)){event.stopImmediatePropagation();return;}
            if(!event.inputSource?.hand && !grip && (spatialMove?.source===event.inputSource || spatialGrabPending?.source===event.inputSource))return;
            if(event.inputSource?.hand && api.isHandInteracting(event.inputSource) && type==='select'){event.stopImmediatePropagation();return;}
            if(sliderGrab && sliderGrab.source!==event.inputSource)return;
            if(type==='selectstart')finishingSliderSource=null;
            if(type==='select' && finishingSliderSource===event.inputSource){finishingSliderSource=null;event.stopImmediatePropagation();return;}
            if(sliderGrab?.source===event.inputSource && type==='selectend'){sliderGrab=null;panelGestureSource=null;finishingSliderSource=event.inputSource;event.stopImmediatePropagation();return;}
            if(type==='selectstart' && finishingMoveSource===event.inputSource)finishingMoveSource=null;
            if(type==='selectend' && spatialMove?.source===event.inputSource){
                const moving=spatialMove,candidate=moving.panel==='media'?spatialDockCandidate(mediaPose):null;
                if(moving.panel==='explorer')finishExplorerDock();if(moving.panel==='settings')finishSettingsDock();finishingMoveSource=event.inputSource;spatialMove=null;
                if(moving.panel==='media' && candidate)dockSpatialMedia(candidate.side);
                event.stopImmediatePropagation();return;
            }
            if(type==='selectend' && spatialGrabPending?.source===event.inputSource){
                if(performance.now()-spatialGrabPending.startedAt>=PANEL_GRAB_HOLD_MS)finishingMoveSource=event.inputSource;
                spatialGrabPending=null;event.stopImmediatePropagation();return;
            }
            if(type==='select' && (spatialMove?.source===event.inputSource || finishingMoveSource===event.inputSource)){finishingMoveSource=null;event.stopImmediatePropagation();return;}
            if(type==='selectend' && panelGestureSource!==event.inputSource)return;
            if(type==='select' && panelGestureSource && panelGestureSource!==event.inputSource)return;
            const handState=event.inputSource?.hand ? handTrackingState(event.frame,event.inputSource,referenceSpace) : null;
            const handRay=handState?.pointer;
            const targetRaySpace=event.inputSource?.targetRaySpace;
            const transform=targetRaySpace ? event.frame?.getPose(targetRaySpace,referenceSpace)?.transform.matrix : null;
            if(!handRay && !transform)return;
            const ray=handRay || {origin:{x:transform[12],y:transform[13],z:transform[14]},direction:{x:-transform[8],y:-transform[9],z:-transform[10]}};
            if(!rayFilter(ray))return;
            const target=hit(ray);if(!target){if(type==='selectend' && panelGestureSource===event.inputSource){panelGestureSource=null;event.stopImmediatePropagation();}return;}
            event.stopImmediatePropagation();
            const button=grip?null:targetButtonAtRay(target);
            if(!event.inputSource?.hand && !grip && !button)return;
            if(event.inputSource?.hand && type==='selectstart' && button && button.kind!=='slider'){
                panelGestureSource=event.inputSource;api.activateHand(ray,event.inputSource,handState);return;
            }
            // The shared pinch edge already selects a hand button once.
            if(event.inputSource?.hand && type==='select'){spatialGrabPending=null;panelGestureSource=null;return;}
            if(type==='selectstart' && target.card?.settings)panelGestureSource=event.inputSource;
            if(type==='selectstart' && target.card?.settings && !button){panelGestureSource=event.inputSource;settingsPose ||= settingsDockPose();spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'settings',cardId:'settings',startedAt:performance.now()-PANEL_GRAB_HOLD_MS};return;}
            if(type==='selectstart' && button?.kind==='slider'){
                sliderGrab={source:event.inputSource,referenceSpace,button,surface:{...target}};panelGestureSource=event.inputSource;slideAtTarget(button,target);return;
            }
            if(type==='selectstart' && target.card?.id==='explorer' && !button){panelGestureSource=event.inputSource;explorerPose ||= explorerSpatialPose();spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'explorer',cardId:'explorer',startedAt:performance.now()-PANEL_GRAB_HOLD_MS};return;}
            if(type==='selectstart' && target.card?.id==='media'){
                panelGestureSource=event.inputSource;
                spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'media',cardId:'media',startedAt:performance.now()-PANEL_GRAB_HOLD_MS,handDirection:event.inputSource?.hand?{...ray.direction}:null};
                return;
            }
            if(type==='selectstart' && target.card?.id==='control' && !button){
                panelGestureSource=event.inputSource;
                spatialGrabPending={source:event.inputSource,referenceSpace,distance:target.distance,localX:target.localX,localY:target.localY,panel:'main',cardId:'control',startedAt:performance.now()-PANEL_GRAB_HOLD_MS,handDirection:event.inputSource?.hand?{...ray.direction}:null};
                return;
            }
            if(type==='selectend' && button?.action?.startsWith('Object:') && !spatialMove){spatialGrabPending=null;act(button.action);finishingMoveSource=event.inputSource;panelGestureSource=null;event.stopImmediatePropagation();return;}
            if(type==='selectend' && button?.action?.startsWith('Object:') && !spatialMove){spatialGrabPending=null;act(button.action);finishingMoveSource=event.inputSource;panelGestureSource=null;event.stopImmediatePropagation();return;}
            if(type==='select' && !spatialMove){spatialGrabPending=null;api.activate(ray);}
            if(type==='selectend')panelGestureSource=null;
        };const visibility=()=>{if(session.visibilityState!=='visible'){fruitWindow?.resetGrips();sliderGrab=null;finishingSliderSource=null;spatialGrabPending=null;spatialMove=null;finishingMoveSource=null;panelGestureSource=null;}};for(const type of ['selectstart','selectend','select','squeezestart','squeezeend'])session.addEventListener(type,handle,true);session.addEventListener('visibilitychange',visibility);
            removeXrControls=()=>{fruitWindow?.resetGrips();fruitSession=null;fruitSpace=null;handReferenceSpace=null;handContacts.clear();handPokes.clear();sliderGrab=null;finishingSliderSource=null;spatialGrabPending=null;spatialMove=null;finishingMoveSource=null;panelGestureSource=null;for(const type of ['selectstart','selectend','select','squeezestart','squeezeend'])session.removeEventListener(type,handle,true);session.removeEventListener('visibilitychange',visibility);};},
        destroy(){fruitDestroyed=true;fruitVisible=false;fruitWindow?.destroy();fruitWindow=null;globalThis.removeEventListener?.('nxr-languagechange',languageChanged);removeCapabilities();mediaLoadToken++;clearTimeout(mediaTransitionTimer);clearInterval(panelHintTimer);mediaImage=null;mediaPreviousImage=null;removePanelMove();removeXrControls();renderer?.destroy();renderer=null;panelCanvases.clear();mediaFloating?.remove();element.remove();settingsElement.remove();explorerElement.remove();if(simpleDesktop)root?.classList.remove('is-simple-desktop-ar');}
    };const removeCapabilities=subscribePimoCapabilities(()=>{if(knowledgeRecord)knowledgeExplorer(knowledgeRecord);render(true);});
    function languageChanged(){render(true);}
    globalThis.addEventListener?.('nxr-languagechange',languageChanged);
    render();return api;
}
