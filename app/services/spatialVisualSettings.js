// Presentation preferences only; project records and anchors stay untouched.
export const INFO_GLASS = Object.freeze({defaultOpacity:.38,soil:'#32271f',soilEdge:'#514032',soilGrain:'#705840'});
export const ORB_MODELS = Object.freeze({
    basic:Object.freeze({label:'Basic',latitudeBands:24,longitudeBands:32,roughness:.5,metalness:.03,detail:0}),
    improved:Object.freeze({label:'Improved',latitudeBands:32,longitudeBands:48,roughness:.28,metalness:.08,detail:1}),
    advanced:Object.freeze({label:'Advanced',latitudeBands:32,longitudeBands:48,roughness:.34,metalness:.05,detail:2})
});
const storageKey='nlxr.visual-preferences.v1';
let preferences={infoOpacity:INFO_GLASS.defaultOpacity,orbModel:'improved'};
try{
    const saved=JSON.parse(globalThis.localStorage?.getItem(storageKey) || 'null');
    if(Number.isFinite(saved?.infoOpacity))preferences.infoOpacity=Math.max(0,Math.min(1,saved.infoOpacity));
    if(ORB_MODELS[saved?.orbModel])preferences.orbModel=saved.orbModel;
}catch{ /* Storage is optional in restricted browser sessions. */ }
export function getSpatialVisualSettings(){return {...preferences};}
export function setSpatialVisualSettings(change){
    if(Number.isFinite(change.infoOpacity))preferences.infoOpacity=Math.max(0,Math.min(1,change.infoOpacity));
    if(ORB_MODELS[change.orbModel])preferences.orbModel=change.orbModel;
    try{globalThis.localStorage?.setItem(storageKey,JSON.stringify(preferences));}catch{ /* Keep the active session usable. */ }
    return getSpatialVisualSettings();
}
export function currentOrbModel(){return preferences.orbModel;}
export function currentInfoOpacity(){return preferences.infoOpacity;}
