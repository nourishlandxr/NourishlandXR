export const DEMO_CONNECTION_HOLD_MS=500;

export const DEMO_CONNECTION_PHASES=Object.freeze({
    CHOOSING:'choosing',READY:'ready',HOLDING:'holding',DRAGGING:'dragging',RESOLVING:'resolving',RESULT:'result',
    DEEPER_READY:'deeper-ready',DEEPER_HOLDING:'deeper-holding',DEEPER_DRAGGING:'deeper-dragging',DEEPER_RESOLVING:'deeper-resolving',COMPLETE:'complete'
});

export const DEMO_CONNECTION_CHOICES=Object.freeze([
    Object.freeze({
        id:'pruning',sourceId:'pruning',sourceTitle:'Pruning',sourceDetail:'Shape growth and return cut material to the garden.',sourceColor:'#7ea45f',
        targetId:'lim-food-forest',targetTitle:'Living Landscapes',targetDetail:'Read how plants work within a whole place.',targetColor:'#a06a43',
        resultTitle:'Pruning as Biomass Cycling',
        resultSummary:'Pruning can do more than shape Pigeon Pea. Cut material can return cover and organic matter to the living landscape while the plant begins new growth.',
        deeperTitle:'Watch What Changes',
        deeperSummary:'Return after pruning and notice regrowth, ground cover, decomposition and how neighbouring plants respond.'
    }),
    Object.freeze({
        id:'nitrogen-fixation',sourceId:'nitrogen-fixation',sourceTitle:'Nitrogen Fixation',sourceDetail:'Explore the plant’s partnership with root-associated bacteria.',sourceColor:'#6d9e74',
        targetId:'lim-wildlife-relationships',targetTitle:'Wildlife and Relationships',targetDetail:'Follow the relationships that support a living system.',targetColor:'#5f9681',
        resultTitle:'Root Partnerships',
        resultSummary:'Pigeon Pea and compatible soil bacteria can form a partnership below ground. Local conditions decide whether that relationship is active and how it supports nearby life.',
        deeperTitle:'Evidence Beneath the Soil',
        deeperSummary:'Look for root nodules, compare plant vigour and record soil conditions before deciding that nitrogen fixation is active here.'
    })
]);

export const DEMO_DEEPER_CONNECTION=Object.freeze({
    targetId:'lim-pin',targetTitle:'Place and Observation',targetDetail:'Ground the idea in what can be noticed here.',targetColor:'#9a9460'
});

export const DEMO_CONNECTION_POSITIONS=Object.freeze({
    sources:Object.freeze({pruning:Object.freeze({x:40,y:40}),'nitrogen-fixation':Object.freeze({x:40,y:63})}),
    targets:Object.freeze({pruning:Object.freeze({x:60,y:40}),'nitrogen-fixation':Object.freeze({x:60,y:63})}),
    result:Object.freeze({x:50,y:51}),deeperTarget:Object.freeze({x:60,y:53}),deeperResult:Object.freeze({x:50,y:64})
});

export function createDemoConnectionState(){
    return {phase:DEMO_CONNECTION_PHASES.CHOOSING,choiceId:'',dragging:false,pointer:null,hoverTarget:false,holdStartedAt:0,holdProgress:0,primaryResult:null,deeperResult:null,error:''};
}

export function demoConnectionChoice(state){
    return DEMO_CONNECTION_CHOICES.find(choice=>choice.id===state?.choiceId) || null;
}

export function selectDemoConnectionChoice(state,choiceId){
    if(!state || state.primaryResult)return state;
    if(!DEMO_CONNECTION_CHOICES.some(choice=>choice.id===choiceId))return state;
    state.choiceId=choiceId;state.phase=DEMO_CONNECTION_PHASES.READY;state.dragging=false;state.pointer=null;state.hoverTarget=false;state.holdProgress=0;state.error='';
    return state;
}

export function demoConnectionIsDeeper(state){
    return [DEMO_CONNECTION_PHASES.DEEPER_READY,DEMO_CONNECTION_PHASES.DEEPER_HOLDING,DEMO_CONNECTION_PHASES.DEEPER_DRAGGING,DEMO_CONNECTION_PHASES.DEEPER_RESOLVING,DEMO_CONNECTION_PHASES.COMPLETE].includes(state?.phase);
}

export function demoConnectionSource(state){
    const choice=demoConnectionChoice(state);
    if(!choice)return null;
    return demoConnectionIsDeeper(state)?Object.freeze({x:50,y:37}):DEMO_CONNECTION_POSITIONS.sources[choice.id];
}

export function demoConnectionTarget(state){
    const choice=demoConnectionChoice(state);
    if(!choice)return null;
    return demoConnectionIsDeeper(state)?DEMO_CONNECTION_POSITIONS.deeperTarget:DEMO_CONNECTION_POSITIONS.targets[choice.id];
}

export function demoConnectionTargetAt(state,xPercent,yPercent,radius=12){
    const target=demoConnectionTarget(state);
    return Boolean(target && Math.hypot(Number(xPercent)-target.x,Number(yPercent)-target.y)<=radius);
}

export function demoConnectionCurve(start,end){
    const sx=Number(start?.x)||0,sy=Number(start?.y)||0,ex=Number(end?.x)||0,ey=Number(end?.y)||0;
    const bend=Math.max(7,Math.abs(ex-sx)*.28);
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} C ${(sx+bend).toFixed(2)} ${sy.toFixed(2)}, ${(ex-bend).toFixed(2)} ${ey.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
