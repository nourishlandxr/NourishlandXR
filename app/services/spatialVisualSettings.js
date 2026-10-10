export const TOTEM_MODELS = Object.freeze({carved:Object.freeze({label:'Carved timber'}),botanical:Object.freeze({label:'Botanical column'}),basic:Object.freeze({label:'Elemental'})});
// Presentation preferences only; project records and anchors stay untouched.
export const INFO_GLASS = Object.freeze({defaultOpacity:.70,soil:'#32271f',soilEdge:'#514032',soilGrain:'#705840'});
export const ORB_MODELS = Object.freeze({
    basic:Object.freeze({label:'Basic',latitudeBands:24,longitudeBands:32,roughness:.5,metalness:.03,detail:0}),
    improved:Object.freeze({label:'Improved',latitudeBands:32,longitudeBands:48,roughness:.28,metalness:.08,detail:1}),
    advanced:Object.freeze({label:'Advanced',latitudeBands:32,longitudeBands:48,roughness:.34,metalness:.05,detail:2})
});
// Budgets are independent of object style and XR refresh rate.
export const GRAPHICS_PRESETS=Object.freeze({
 low:Object.freeze({label:'LOW',orbLatitude:16,orbLongitude:24,detail:0,totemRadial:24,totemVertical:16,textureScale:.5,frameScale:.75,frameLeafPixels:0,frameRootSamples:0,rain:'off'}),
 medium:Object.freeze({label:'MED',orbLatitude:32,orbLongitude:48,detail:1,totemRadial:48,totemVertical:32,textureScale:1,frameScale:1,frameLeafPixels:0,frameRootSamples:0,rain:'low'}),
 high:Object.freeze({label:'HIGH',orbLatitude:48,orbLongitude:72,detail:2,totemRadial:72,totemVertical:48,textureScale:2,frameScale:1.5,frameLeafPixels:256,frameRootSamples:36,rain:'hq'})
});
export const RAIN_QUALITIES=Object.freeze({off:{label:'Off',intensity:0,style:'v1',drops:0},low:{label:'Low',intensity:.45,style:'v1',drops:60},high:{label:'High',intensity:1,style:'v1',drops:220},hq:{label:'HQ',intensity:1.65,style:'v2',drops:480}});
export const LIVING_FRAME_QUALITIES=Object.freeze({off:{label:'No Living Frame'},sd:{label:'LF SD'},hd:{label:'LF HD'}});
export function resolveGraphicsQuality(choice='auto',device=globalThis.navigator){
 if(GRAPHICS_PRESETS[choice])return choice;
 // Missing hints and Quest default to MED. Manual HIGH is never downgraded.
 if(/Quest|OculusBrowser/i.test(device?.userAgent || ''))return 'medium';
 if(device && ((device.deviceMemory>0 && device.deviceMemory<=4) || (device.hardwareConcurrency>0 && device.hardwareConcurrency<=4)))return 'low';
 return 'medium';
}
let adaptiveGraphicsQuality=null;
export function setAdaptiveGraphicsQuality(value=null){adaptiveGraphicsQuality=GRAPHICS_PRESETS[value]?value:null;return currentGraphicsQuality();}
export function currentGraphicsQuality(){return preferences.graphicsQuality==='auto' && adaptiveGraphicsQuality?adaptiveGraphicsQuality:resolveGraphicsQuality(preferences.graphicsQuality);}
export function currentGraphicsPreset(){return GRAPHICS_PRESETS[currentGraphicsQuality()];}
export function currentRainQuality(){return preferences.rainQuality;}
const storageKey='nlxr.visual-preferences.v1';
let preferences={cellGlassRevision:1,totemDefaultRevision:2,handDefaultRevision:1,floorOffset:0,insects:true,livingFrame:true,livingFrameQuality:'sd',eyeHeight:1.65,infoOpacity:INFO_GLASS.defaultOpacity,orbModel:'improved',totemModel:'botanical',cellOpacity:.42,handMode:'outline',largeText:false,spatialScale:1,refreshRate:90,showFps:false,graphicsQuality:'auto',rainQuality:GRAPHICS_PRESETS[resolveGraphicsQuality()].rain};
function validated(change){
    const result={};
    if(['auto',...Object.keys(GRAPHICS_PRESETS)].includes(change?.graphicsQuality)){result.graphicsQuality=change.graphicsQuality;result.rainQuality=GRAPHICS_PRESETS[resolveGraphicsQuality(change.graphicsQuality)].rain;}
    if(RAIN_QUALITIES[change?.rainQuality])result.rainQuality=change.rainQuality;
    for(const [key,min,max] of [['infoOpacity',0,1],['cellOpacity',0,1],['spatialScale',.85,1.2],['floorOffset',-1.5,1.5],['eyeHeight',.8,2.2]])if(Number.isFinite(change?.[key]))result[key]=Math.max(min,Math.min(max,change[key]));
    if(ORB_MODELS[change?.orbModel])result.orbModel=change.orbModel;
    if(TOTEM_MODELS[change?.totemModel])result.totemModel=change.totemModel;
    if(['pointer','outline'].includes(change?.handMode))result.handMode=change.handMode;
    for(const key of ['largeText','showFps','insects','heroDice'])if(typeof change?.[key]==='boolean')result[key]=change[key];
    if(LIVING_FRAME_QUALITIES[change?.livingFrameQuality]){result.livingFrameQuality=change.livingFrameQuality;result.livingFrame=change.livingFrameQuality!=='off';}
    else if(typeof change?.livingFrame==='boolean'){result.livingFrame=change.livingFrame;result.livingFrameQuality=change.livingFrame?'sd':'off';}
    if(['auto',60,72,90,120].includes(change?.refreshRate))result.refreshRate=change.refreshRate;
    return result;
}
try{
    const saved=JSON.parse(globalThis.localStorage?.getItem(storageKey) || 'null');
    Object.assign(preferences,validated(saved));
    if(saved && saved.cellGlassRevision!==1){preferences.cellOpacity=.42;globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}
    // HIGH refresh is a per-session trial. A reload recovers from a saved 120 Hz.
    if(preferences.refreshRate===120 || preferences.refreshRate==='auto')preferences.refreshRate=90;
    // Adopt the new default once; later deliberate style choices stay saved.
    if(saved && saved.totemDefaultRevision!==2){preferences.totemModel='botanical';globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}
    if(saved && saved.handDefaultRevision!==1){preferences.handMode='outline';globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}
}catch{ /* Storage is optional in restricted browser sessions. */ }
function syncVisualCss(){globalThis.document?.documentElement?.style.setProperty('--nlxr-panels-opacity',String(preferences.infoOpacity));}
syncVisualCss();
export function getSpatialVisualSettings(){return {heroDice:true,...preferences};}
export function setSpatialVisualSettings(change){
    if(change?.graphicsQuality!==undefined)adaptiveGraphicsQuality=null;
    Object.assign(preferences,validated(change));
    syncVisualCss();
    try{globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}catch{ /* Keep the active session usable. */ }
    return getSpatialVisualSettings();
}
export function currentOrbModel(){return preferences.orbModel;}
export function currentInfoOpacity(){return preferences.infoOpacity;}
// Cell glass is controlled independently from the surrounding information
// panel. Keep a small accessor so canvas based welcome/PIMO surfaces use the
// same live value as the WebGL renderer and the simulated DOM mesh.
export function currentCellOpacity(){return preferences.cellOpacity;}

export function currentShowFps(){return preferences.showFps;}

export function currentTotemModel(){return preferences.totemModel;}
