export const DEMO_CONNECTION_PHASES=Object.freeze({
    IDLE:'idle',FIRST:'first',FIRST_RESOLVING:'first-resolving',SECOND:'second',SECOND_RESOLVING:'second-resolving',COMPLETE:'complete'
});

export const DEMO_CONNECTIONS=Object.freeze({
    first:Object.freeze({
        targetId:'lim-food-forest',targetTitle:'Living Landscapes',
        resultTitle:'Biomass Cycling',
        resultSummary:"Pruning isn't only about controlling the plant. Pruned Pigeon Pea can return useful biomass to the landscape while stimulating fresh growth."
    }),
    second:Object.freeze({
        targetId:'lim-pin',targetTitle:'Place & Observation',
        resultTitle:'Watch What Changes',
        resultSummary:'After pruning, look at what changes around the plant. Notice regrowth, where cut material settles, ground coverage, decomposition and responses from neighbouring plants.'
    })
});

export function createDemoConnectionState(){
    return {phase:DEMO_CONNECTION_PHASES.FIRST,dragging:false,pointer:null,hoverTarget:false,firstResult:null,secondResult:null};
}

export function demoConnectionStep(state){
    if(!state)return null;
    if([DEMO_CONNECTION_PHASES.FIRST,DEMO_CONNECTION_PHASES.FIRST_RESOLVING].includes(state.phase))return DEMO_CONNECTIONS.first;
    if([DEMO_CONNECTION_PHASES.SECOND,DEMO_CONNECTION_PHASES.SECOND_RESOLVING].includes(state.phase))return DEMO_CONNECTIONS.second;
    return null;
}

export function demoConnectionTargetAt(state,xPercent,yPercent,radius=12){
    const step=demoConnectionStep(state);
    if(!step)return false;
    const target=step===DEMO_CONNECTIONS.first?{x:82,y:27}:{x:82,y:76};
    return Math.hypot(Number(xPercent)-target.x,Number(yPercent)-target.y)<=radius;
}

export function demoConnectionCurve(start,end){
    const sx=Number(start?.x)||0,sy=Number(start?.y)||0,ex=Number(end?.x)||0,ey=Number(end?.y)||0;
    const bend=Math.max(7,Math.abs(ex-sx)*.28);
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} C ${(sx+bend).toFixed(2)} ${sy.toFixed(2)}, ${(ex-bend).toFixed(2)} ${ey.toFixed(2)}, ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
