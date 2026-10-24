import {boardPointInside} from "./foodForestBoardModel.js?v=0.9819";
import {normalizeForestRootFields} from "./foodForestRootModel.js?v=0.9819";
// Learning progress and schematic occupied space are separate from token size.
export const FOREST_LESSON_STEPS = [
    {title:'Plant your first tree.',prompt:'Pick up the tree. Find it a home.',layer:'small-tree'},
    {title:'Watch your tree grow.',prompt:'Slide from little to large. What changes?'},
    {title:'Who could grow underneath?',prompt:'Choose a bush, flowers or a spreading patch.',layer:'groundcover'},
    {title:'Give a vine somewhere to climb.',prompt:'Plant a vine with its own little trellis.',layer:'climber'},
    {title:'Here comes the wind.',prompt:'Try a windy day. Where could shelter go?',layer:'canopy'},
    {title:'Your little forest is beginning.',prompt:'Keep experimenting. There is more to discover.'}
];
export function normalizeForestLearning(raw,hasPieces=false){return {active:typeof raw?.active==='boolean'?raw.active:!hasPieces,step:Number.isInteger(raw?.step)?Math.max(0,Math.min(5,raw.step)):0};}
export function advanceForestLesson(before,state){
    if(!state.learning?.active)return false;
    const added=state.pieces.filter(p=>!before.pieces.some(q=>q.id===p.id)),step=state.learning.step;
    if(step===0&&added.some(p=>['canopy','small-tree'].includes(p.layer))){state.learning.step=1;state.growth=0;}
    else if(step===2&&added.some(p=>['groundcover','shrub','herb'].includes(p.layer)))state.learning.step=3;
    else if(step===3&&added.some(p=>p.layer==='climber'))state.learning.step=4;
    else if(step===4&&state.scenario==='wind')state.learning.step=5;
    return step!==state.learning.step;
}
export function forestSpaceKind(piece){return piece.layer==='groundcover'?'ground-patch':piece.layer==='climber'?'climbing-extent':piece.layer==='root'?'root-patch':'canopy';}
export function forestSupport(state,piece){return piece.supportKind==='plant'?state.pieces.find(p=>p.id===piece.supportId&&['canopy','small-tree'].includes(p.layer)&&p.id!==piece.id)||null:null;}
export function attachForestVine(state,piece){
    const tree=forestSupport(state,piece);if(!tree)return;
    const offset=[[.22,.16],[-.22,.16],[.22,-.16],[-.22,-.16],[0,0]].find(([x,z])=>boardPointInside({x:tree.x+x,z:tree.z+z},state.boundary));
    if(offset){piece.x=tree.x+offset[0];piece.z=tree.z+offset[1];}
}
export function forestSpaceFields(item){
    const limit=(v,fallback)=>Number.isFinite(v)?Math.max(.25,Math.min(12,v)):fallback;
    return {...normalizeForestRootFields(item),groundWidthM:limit(item.groundWidthM,item.layer==='groundcover'?2:1),groundDepthM:limit(item.groundDepthM,item.layer==='groundcover'?1.5:1),supportKind:['plant','trellis','trail'].includes(item.supportKind)?item.supportKind:'trellis',supportId:typeof item.supportId==='string'?item.supportId.slice(0,120):''};
}
