import {planLivingMapRoute,livingMapObstacles,routeSegmentClear} from './demoLivingMapRoute.js';

export const LIVING_MAP_VISITOR_COLOURS=['#dc796f','#e5b948','#62afa4','#739acd','#a998c7'];
// Five wooden pegs, one small reusable state each. No timers or rig animation.
export function createLivingMapVisitors(model,routes){
    const entry=model.areas[0].totem,forest=model.areas[1].totem,swales=model.areas[2].totem;
    const obstacles=livingMapObstacles(model),orbs=model.items.filter(item=>item.type==='plant');
    const states=LIVING_MAP_VISITOR_COLOURS.map((colour,index)=>({index,colour,x:entry.x+(index-2)*.19,z:entry.z+.38,heading:0,scale:0,walking:false,interaction:'welcome',focus:null,bob:0,path:[],waypoint:0,wait:0,goal:0,stage:0,visits:0,pause:0}));
    let stage=0,lastTime=null;
    const variation=(index,goal,salt)=>{const n=Math.sin((index+1)*127.1+(goal+1)*311.7+salt*74.7)*43758.5453;return n-Math.floor(n);};
    const goalsFor=(count,index)=>{
        const angle=index*Math.PI*2/5;
        if(count===1)return [{x:entry.x+Math.cos(angle)*.43,z:entry.z+Math.sin(angle)*.43,interaction:'welcome',focus:entry.id}];
        if(count===3)return [{x:swales.x+Math.cos(angle)*.52,z:swales.z+Math.sin(angle)*.52,interaction:'note',focus:swales.id},
            {x:swales.x+Math.cos(angle+.5)*.68,z:swales.z+Math.sin(angle+.5)*.68,interaction:'totem',focus:swales.id}];
        return [{x:forest.x+Math.cos(angle)*.55,z:forest.z+Math.sin(angle)*.55,interaction:'totem',focus:forest.id},
            ...orbs.map((orb,i)=>({x:orb.x-.25+index*.10,z:orb.z+.67,interaction:'orb',focus:orb.id}))];
    };
    function moveToGoal(state,count,first=false){
        const goals=goalsFor(count,state.index),slot=count===2 && state.goal%goals.length>0?1+(state.goal-1+state.index)%orbs.length:state.goal%goals.length,target={...goals[slot]};
        // Choose a small, safe offset once per destination, not per frame.
        for(let attempt=0;attempt<5;attempt++){const candidate={...target,x:target.x+(variation(state.index,state.goal,attempt+1)-.5)*.32,z:target.z+(variation(state.index,state.goal,attempt+11)-.5)*.28};if((candidate.x/6.1)**2+(candidate.z/4)**2<1 && routeSegmentClear(candidate,candidate,obstacles)){Object.assign(target,candidate);break;}}
        state.target=target;
        if(first){state.focus=null;state.interaction='walk';}
        const route=first && count>1?routes[count-2]:null,mid=route?.[Math.floor(route.length/2)];
        // Keep the path's direction while each visitor takes their own clear
        // route through the landscape instead of marching along its centre.
        const via=mid?{x:mid.x+(variation(state.index,count,31)-.5)*.65,z:mid.z+(variation(state.index,count,41)-.5)*.5}:null;
        if(via && routeSegmentClear(via,via,obstacles) && (via.x/6.1)**2+(via.z/4)**2<1)state.path=[...planLivingMapRoute(state,via,obstacles),...planLivingMapRoute(via,target,obstacles).slice(1)];
        else state.path=planLivingMapRoute(state,target,obstacles);
        state.waypoint=1;state.wait=0;state.dwell=2.4+variation(state.index,state.goal,count)*3.2;
        state.speed=.48+variation(state.index,state.goal,51)*.20;
        state.pause=first?1.0+variation(state.index,count,61)*2.5:variation(state.index,state.goal,71)*.8;
    }
    return {states,
        update(elapsed,placed,reduced=false){
            if(lastTime!==null && elapsed<lastTime){stage=0;lastTime=null;for(const s of states){s.x=entry.x+(s.index-2)*.19;s.z=entry.z+.38;s.scale=0;s.goal=0;s.stage=0;s.visits=0;}}
            const dt=lastTime===null?0:Math.max(0,Math.min(.10,(elapsed-lastTime)/1000));lastTime=elapsed;
            const count=Math.min(3,placed.length);
            if(count<stage || !stage && count){for(const s of states){s.goal=0;s.visits=0;s.stage=count?1:0;s.x=entry.x+(s.index-2)*.19;s.z=entry.z+.38;s.focus=null;s.path=[];if(count)moveToGoal(s,1,true);}}stage=count;
            for(const s of states){
                if(!count){s.scale=0;s.walking=false;continue;}
                s.scale=reduced?1:Math.max(0,Math.min(1,(elapsed-placed[0].at-650-s.index*160)/1000));
                if(s.scale<=0)continue;
                if(reduced){s.x=s.target.x;s.z=s.target.z;s.walking=false;s.interaction=s.target.interaction;s.focus=s.target.focus;s.bob=0;continue;}
                if(s.pause>0){s.pause=Math.max(0,s.pause-dt);s.walking=false;s.bob=0;continue;}
                let travel=dt*s.speed;s.walking=false;
                while(travel>0 && s.waypoint<s.path.length){
                    const p=s.path[s.waypoint],dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),step=Math.min(d,travel);
                    if(d>1e-6){s.x+=dx/d*step;s.z+=dz/d*step;s.heading=Math.atan2(dx,dz);s.walking=true;}
                    travel-=step;if(d<=step+.00001)s.waypoint++;else break;
                }
                s.interaction=s.walking?'walk':s.target.interaction;s.focus=s.walking?null:s.target.focus;
                s.bob=s.walking?Math.sin(elapsed/145+s.index)*.016:Math.sin(elapsed/720+s.index)*.006;
                if(!s.walking){s.wait+=dt;s.heading+=Math.sin(elapsed/1100+s.index)*dt*.20;
                    if(s.wait>s.dwell){s.visits++;const needed=s.stage===2?1+orbs.length:1;
                        if(count>s.stage && s.visits>=needed && elapsed>=placed[s.stage].at+1200+s.index*220){s.stage++;s.goal=0;s.visits=0;moveToGoal(s,s.stage,true);}
                        else{s.goal++;moveToGoal(s,s.stage);}}}
            }
            return states;
        }
    };
}
