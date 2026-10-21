export const FEATURE_KINDS=Object.freeze({individual:'Individual plant',clump:'Plant clump',collection:'Plant collection',point:'Discovery point',note:'Note',totem:'Totem'});
export const FOREST_LAYERS=Object.freeze({'1':'Canopy','2':'Understorey','3':'Shrub','4':'Herbaceous','5':'Ground cover','6':'Root','7':'Climber'});
export function validateSiteFeature(value){
    if(!value || typeof value!=='object' || Array.isArray(value) || !Object.hasOwn(FEATURE_KINDS,value.kind))throw Error('Choose a valid site feature kind.');
    for(const [field,allowed] of [['uses',['edible','medicinal']],['layers',Object.keys(FOREST_LAYERS)]]){
        if(!Array.isArray(value[field]) || value[field].some(item=>!allowed.includes(item)) || new Set(value[field]).size!==value[field].length)throw Error('Invalid feature '+field+'.');
    }
    if(typeof value.source!=='string' || value.source.length>2000)throw Error('Feature sources must be under 2000 characters.');
    return {kind:value.kind,uses:[...value.uses],layers:[...value.layers],source:value.source};
}
export function siteFeature(marker){
    try{return validateSiteFeature(marker.site_feature);}catch{return {kind:marker.type==='plant'?'individual':marker.type==='note'?'note':marker.type==='area_checkpoint'?'totem':'point',uses:[],layers:[],source:''};}
}
export function featureMatches(marker,{use='',layers=[]}={}){
    const feature=siteFeature(marker);return (!use||feature.uses.includes(use))&&(!layers.length||layers.some(layer=>feature.layers.includes(layer)));
}
