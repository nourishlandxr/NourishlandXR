// Starting sizes for the teaching kit, not botanical measurements or supplier data.
export const FOREST_ROOT_PRACTICE = Object.freeze({
    canopy:{spread:8,depth:1.2},'small-tree':{spread:4,depth:.8},shrub:{spread:1.5,depth:.45},herb:{spread:.6,depth:.25},groundcover:{spread:2,depth:.2},root:{spread:.7,depth:.4},climber:{spread:1.5,depth:.5}
});
const finite=Number.isFinite,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function normalizeForestRootFields(item){
    const preset=FOREST_ROOT_PRACTICE[item.layer]||FOREST_ROOT_PRACTICE.herb,hasSpread=finite(item.rootSpreadM),hasDepth=finite(item.rootDepthM),source=typeof item.rootSourceUrl==='string'&&/^https:\/\//.test(item.rootSourceUrl)?item.rootSourceUrl.slice(0,1000):'',evidence=typeof item.rootEvidence==='string'?item.rootEvidence.slice(0,500):'';
    let basis=['practice-preset','user-assumption','reference','unknown'].includes(item.rootBasis)?item.rootBasis:hasSpread||hasDepth?'user-assumption':'practice-preset';
    if(basis==='reference'&&(!source||!evidence))basis='user-assumption';
    const rootSpreadM=clamp(hasSpread?item.rootSpreadM:preset.spread,0,60),rootDepthM=clamp(hasDepth?item.rootDepthM:preset.depth,0,8);
    return {rootSpreadM,rootDepthM,rootBasis:rootSpreadM&&rootDepthM?basis:'unknown',rootSourceUrl:basis==='reference'?source:'',rootEvidence:basis==='reference'?evidence:''};
}
export function forestRootDimensions(state,item,growth=1){
    return {spreadM:(item.rootSpreadM||0)*growth,depthM:(item.rootDepthM||0)*growth,x:(item.rootSpreadM||0)*growth*6/state.widthM,z:(item.rootSpreadM||0)*growth*4/state.depthM,y:(item.rootDepthM||0)*growth*6/state.widthM};
}
export function forestRootOverlaps(state,growth=1){
    const pairs=[];for(let i=0;i<state.pieces.length;i++)for(let j=i+1;j<state.pieces.length;j++){
        const a=state.pieces[i],b=state.pieces[j];if(!a.rootSpreadM||!b.rootSpreadM||!a.rootDepthM||!b.rootDepthM)continue;
        const distance=Math.hypot((a.x-b.x)*state.widthM/6,(a.z-b.z)*state.depthM/4),reach=(a.rootSpreadM+b.rootSpreadM)*growth/2;if(distance<reach)pairs.push({a:a.id,b:b.id,distanceM:distance,overlapM:reach-distance});
    }return pairs;
}
export function forestRootBasisLabel(item){return item.rootBasis==='reference'?'Reference supplied':item.rootBasis==='user-assumption'?'Your planning assumption':item.rootBasis==='unknown'?'Root size not set':'Editable practice size — not plant data';}
