import {createHandPokeTracker,handIndexCanPoke} from './handPoke.js';

// Scene surfaces use the same front approach and release rule as UI panels.
export function createHandSurfaceInteraction({hitPoint,onHover=()=>{},onPress=()=>{}}){
    const pokes=new Map(),contacts=new Set(),releaseUntil=new WeakMap();let removeEvents=()=>{};
    const isNear=source=>contacts.has(source) || (releaseUntil.get(source)||0)>performance.now();
    return {
        update(entries,time,blocked=false){
            contacts.clear();let hover=null;
            for(const [source,poke] of pokes)if(!entries.some(entry=>entry.source===source)){poke.reset();pokes.delete(source);}
            for(const {source,state} of entries){
                const poke=pokes.get(source) || createHandPokeTracker();pokes.set(source,poke);
                if((typeof blocked==='function'?blocked(source):blocked) || !state?.tracked){poke.reset();continue;}
                for(const point of state.rawJoints.values()){
                    const target=hitPoint(point,source);if(!target)continue;
                    contacts.add(source);if(!hover || target.distance<hover.distance)hover=target;
                }
                const point=state.rawJoints.get('index-finger-tip'),target=hitPoint(point,source);
                if(!handIndexCanPoke(state))poke.reset();
                else if(poke.update(point,target,time)){releaseUntil.set(source,performance.now()+450);onPress(target,source);}
            }
            onHover(hover);
        },
        isNear,
        bindSession(session){removeEvents();const handle=event=>{if(event.inputSource?.hand && isNear(event.inputSource)){event.stopImmediatePropagation();event.preventDefault();}};
            for(const type of ['selectstart','selectend','select'])session.addEventListener(type,handle,true);
            removeEvents=()=>{for(const type of ['selectstart','selectend','select'])session.removeEventListener(type,handle,true);};},
        reset(){contacts.clear();for(const poke of pokes.values())poke.reset();pokes.clear();onHover(null);},
        destroy(){removeEvents();this.reset();}
    };
}
