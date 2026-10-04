export const TOTEM_MODELS = Object.freeze({carved:Object.freeze({label:'Carved timber'}),botanical:Object.freeze({label:'Botanical column'}),basic:Object.freeze({label:'Elemental'})});
// Presentation preferences only; project records and anchors stay untouched.
export const INFO_GLASS = Object.freeze({defaultOpacity:.38,soil:'#32271f',soilEdge:'#514032',soilGrain:'#705840'});
export const ORB_MODELS = Object.freeze({
    basic:Object.freeze({label:'Basic',latitudeBands:24,longitudeBands:32,roughness:.5,metalness:.03,detail:0}),
    improved:Object.freeze({label:'Improved',latitudeBands:32,longitudeBands:48,roughness:.28,metalness:.08,detail:1}),
    advanced:Object.freeze({label:'Advanced',latitudeBands:32,longitudeBands:48,roughness:.34,metalness:.05,detail:2})
});
const storageKey='nlxr.visual-preferences.v1';
let preferences={infoOpacity:INFO_GLASS.defaultOpacity,orbModel:'improved',totemModel:'carved',cellOpacity:1,handMode:'pointer',largeText:false,spatialScale:1,refreshRate:90,showFps:false};
function validated(change){
    const result={};
    for(const [key,min,max] of [['infoOpacity',0,1],['cellOpacity',0,1],['spatialScale',.85,1.2]])if(Number.isFinite(change?.[key]))result[key]=Math.max(min,Math.min(max,change[key]));
    if(ORB_MODELS[change?.orbModel])result.orbModel=change.orbModel;
    if(TOTEM_MODELS[change?.totemModel])result.totemModel=change.totemModel;
    if(['pointer','outline'].includes(change?.handMode))result.handMode=change.handMode;
    for(const key of ['largeText','showFps'])if(typeof change?.[key]==='boolean')result[key]=change[key];
    if(['auto',72,90,120].includes(change?.refreshRate))result.refreshRate=change.refreshRate;
    return result;
}
try{
    const saved=JSON.parse(globalThis.localStorage?.getItem(storageKey) || 'null');
    Object.assign(preferences,validated(saved));
}catch{ /* Storage is optional in restricted browser sessions. */ }
export function getSpatialVisualSettings(){return {...preferences};}
export function setSpatialVisualSettings(change){
    Object.assign(preferences,validated(change));
    try{globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}catch{ /* Keep the active session usable. */ }
    return getSpatialVisualSettings();
}
export function currentOrbModel(){return preferences.orbModel;}
export function currentInfoOpacity(){return preferences.infoOpacity;}

export function currentShowFps(){return preferences.showFps;}

export function currentTotemModel(){return preferences.totemModel;}
