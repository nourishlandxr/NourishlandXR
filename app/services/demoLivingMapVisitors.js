import {planLivingMapRoute,livingMapObstacles} from './demoLivingMapRoute.js';

export const LIVING_MAP_VISITOR_COLOURS=['#dc796f','#e5b948','#62afa4','#739acd','#a998c7'];
// Five wooden pegs, one small reusable state each. No timers or rig animation.
export function createLivingMapVisitors(model,routes){
    const entry=model.areas[0].totem,forest=model.areas[1].totem,swales=model.areas[2].totem;
    const obstacles=livingMapObstacles(model),orbs=model.items.filter(item=>item.type==='plant');
    const states=LIVING_MAP_VISITOR_COLOURS.map((colour,index)=>({index,colour,x:entry.x+(index-2)*.19,z:entry.z+.38,heading:0,scale:0,walking:false,interaction:'welcome',focus:null,bob:0,path:[],waypoint:0,wait:0,goal:0}));
    let stage=0,lastTime=null;
    const goalsFor=(count,index)=>{
        const angle=index*Math.PI*2/5;
        if(count===1)return [{x:entry.x+Math.cos(angle)*.43,z:entry.z+Math.sin(angle)*.43,interaction:'welcome',focus:entry.id}];
        if(count===3)return [{x:swales.x+Math.cos(angle)*.52,z:swales.z+Math.sin(angle)*.52,interaction:'note',focus:swales.id},
            {x:swales.x+Math.cos(angle+.5)*.68,z:swales.z+Math.sin(angle+.5)*.68,interaction:'totem',focus:swales.id}];
        return [{x:forest.x+Math.cos(angle)*.55,z:forest.z+Math.sin(angle)*.55,interaction:'totem',focus:forest.id},
            ...orbs.map((orb,i)=>({x:orb.x-.25+index*.10,z:orb.z+.67,interaction:'orb',focus:orb.id}))];
    };
    function moveToGoal(state,count,first=false){
        const goals=goalsFor(count,state.index),target=goals[state.goal%goals.length];state.target=target;
        if(first && count===2)state.path=[...planLivingMapRoute(state,entry,obstacles),...routes[0].slice(1),...planLivingMapRoute(forest,target,obstacles).slice(1)];
        else if(first && count===3)state.path=[...planLivingMapRoute(state,forest,obstacles),...routes[1].slice(1),...planLivingMapRoute(swales,target,obstacles).slice(1)];
        else state.path=planLivingMapRoute(state,target,obstacles);
        state.waypoint=1;state.wait=0;
    }
    return {states,
        update(elapsed,placed,reduced=false){
            if(lastTime!==null && elapsed<lastTime){stage=0;lastTime=null;for(const s of states){s.x=entry.x+(s.index-2)*.19;s.z=entry.z+.38;s.scale=0;s.goal=0;}}
            const dt=lastTime===null?0:Math.max(0,Math.min(.10,(elapsed-lastTime)/1000));lastTime=elapsed;
            const count=Math.min(3,placed.length);
            if(count!==stage){stage=count;for(const s of states){s.goal=0;if(count)moveToGoal(s,count,true);else {s.x=entry.x+(s.index-2)*.19;s.z=entry.z+.38;s.focus=null;s.path=[];}}}
            for(const s of states){
                if(!count){s.scale=0;s.walking=false;continue;}
                s.scale=reduced?1:Math.max(0,Math.min(1,(elapsed-placed[0].at-650-s.index*160)/1000));
                if(s.scale<=0)continue;
                if(reduced){s.x=s.target.x;s.z=s.target.z;s.walking=false;s.interaction=s.target.interaction;s.focus=s.target.focus;s.bob=0;continue;}
                let travel=dt*.62;s.walking=false;
                while(travel>0 && s.waypoint<s.path.length){
                    const p=s.path[s.waypoint],dx=p.x-s.x,dz=p.z-s.z,d=Math.hypot(dx,dz),step=Math.min(d,travel);
                    if(d>1e-6){s.x+=dx/d*step;s.z+=dz/d*step;s.heading=Math.atan2(dx,dz);s.walking=true;}
                    travel-=step;if(d<=step+.00001)s.waypoint++;else break;
                }
                s.interaction=s.walking?'walk':s.target.interaction;s.focus=s.walking?null:s.target.focus;
                s.bob=s.walking?Math.sin(elapsed/145+s.index)*.016:Math.sin(elapsed/720+s.index)*.006;
                if(!s.walking){s.wait+=dt;s.heading+=Math.sin(elapsed/1100+s.index)*dt*.20;
                    if(s.wait>3.5+s.index*.35){s.goal++;moveToGoal(s,count);}}
            }
            return states;
        }
    };
}
