import {createHandPokeTracker,handIndexCanPoke} from './handPoke.js';

// Scene surfaces use the same front approach and release rule as UI panels.
export function createHandSurfaceInteraction({hitPoint,onHover=()=>{},onPress=()=>{},holdDuration=()=>0,onHoldProgress=()=>{}}){
    const pokes=new Map(),contacts=new Set(),releaseUntil=new WeakMap(),holds=new Map();let removeEvents=()=>{};
    const cancel=source=>{const held=holds.get(source);if(held)onHoldProgress(held.target,0);holds.delete(source);};
    const isNear=source=>contacts.has(source) || (releaseUntil.get(source)||0)>performance.now();
    return {
        update(entries,time,blocked=false){
            contacts.clear();let hover=null;
            for(const [source,poke] of pokes)if(!entries.some(entry=>entry.source===source)){cancel(source);poke.reset();pokes.delete(source);}
            for(const {source,state} of entries){
                const poke=pokes.get(source) || createHandPokeTracker();pokes.set(source,poke);
                if((typeof blocked==='function'?blocked(source):blocked) || !state?.tracked){cancel(source);poke.reset();continue;}
                for(const point of state.rawJoints.values()){
                    const target=hitPoint(point,source);if(!target)continue;
                    contacts.add(source);if(!hover || target.distance<hover.distance)hover=target;
                }
                const point=state.rawJoints.get('index-finger-tip'),target=hitPoint(point,source);
                if(!handIndexCanPoke(state)){cancel(source);poke.reset();}
                else {
                    if(poke.update(point,target,time)){const duration=holdDuration(target);if(duration)holds.set(source,{target,key:target.button.action,start:time,duration,point:{...point}});else {releaseUntil.set(source,performance.now()+450);onPress(target,source);}}
                    const held=holds.get(source);if(held){
                        if(!target || target.button.action!==held.key || !poke.pressed || Math.hypot(point.x-held.point.x,point.y-held.point.y,point.z-held.point.z)>.025)cancel(source);
                        else {const amount=Math.min(1,(time-held.start)/held.duration);onHoldProgress(target,amount);if(amount===1){cancel(source);releaseUntil.set(source,performance.now()+450);onPress({...target,holdCompleted:true},source);}}
                    }
                }
            }
            onHover(hover);
        },
        isNear,
        bindSession(session){removeEvents();const handle=event=>{if(event.inputSource?.hand && isNear(event.inputSource)){event.stopImmediatePropagation();event.preventDefault();}};
            for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);
            removeEvents=()=>{for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);};},
        reset(){contacts.clear();for(const source of holds.keys())cancel(source);for(const poke of pokes.values())poke.reset();pokes.clear();onHover(null);},
        destroy(){removeEvents();this.reset();}
    };
}
