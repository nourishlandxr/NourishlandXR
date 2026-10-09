export const BUTTERFLY_VARIANTS=Object.freeze([
    ['blue','#8abed6',1],['red','#cf8c7d',1],['yellow','#e0cb7f',1],['green','#98b99a',1],
    ['white','#eeeade',1],['transparent','#dcece5',.28],['purple','#b8a1cd',1],['orange','#d9ae81',1]
].map(([id,colour,wingOpacity],seed)=>Object.freeze({id,colour,wingOpacity,seed,
    red:id==='red',side:seed%2?'left':'right',slot:Math.floor(seed/2),surface:seed%3===0?'image':'control',size:(id==='red'?.055:.065)*.7,
    perchMs:seed===0?60000:seed===1?30000:30000+seed*4200})));

// Brief paired loops, separated by long quiet windows. No attraction to the
// user's face or central map: both partners use their own peripheral anchor.
export function butterflySocialOffset(elapsed,index,{enabled=true,reduced=false}={}){
    if(!enabled || reduced)return {x:0,y:0,z:0,amount:0};
    const pair=Math.floor(index/4)*2+index%2,seconds=elapsed/1000-pair*7;
    const local=((seconds%48)+48)%48,amount=Math.max(0,Math.min(1,(local-27)/2))*Math.max(0,Math.min(1,(35-local)/2));
    const eased=amount*amount*(3-2*amount),angle=(local-27)*1.5+(Math.floor(index/2)%2)*Math.PI;
    return {x:Math.cos(angle)*.08*eased,y:Math.sin(angle)*.045*eased,z:Math.sin(angle)*.055*eased,amount:eased};
}
export function butterflySocialPoint(position,peer,social){
    if(!peer || !social.amount || Math.hypot(position.x-peer.x,position.y-peer.y,position.z-peer.z)>.45)return position;
    const amount=social.amount*.35;
    return {x:position.x+(peer.x-position.x)*amount,y:position.y+(peer.y-position.y)*amount,z:position.z+(peer.z-position.z)*amount};
}
export function butterflyPanelPerch(perch,variant){
    if(!perch)return null;
    const across=(variant.side==='left'?1:-1)*variant.slot*.07;
    return {...perch,center:{x:perch.center.x+perch.right.x*across,y:perch.center.y+perch.right.y*across,z:perch.center.z+perch.right.z*across}};
}
