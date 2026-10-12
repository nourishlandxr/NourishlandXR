// Hover can come from any joint. Only an index fingertip approaching from the
// front can press; retreat is required before another press, even on a neighbour.
export function handIndexCanPoke(state){
    if(!state?.tracked || state.pinch)return false;
    const joints=state.rawJoints,tip=joints.get('index-finger-tip'),knuckle=joints.get('index-finger-phalanx-proximal'),middle=joints.get('index-finger-phalanx-intermediate'),wrist=joints.get('wrist');
    if(!tip || !knuckle || !middle || !wrist)return false;
    const a={x:middle.x-knuckle.x,y:middle.y-knuckle.y,z:middle.z-knuckle.z},b={x:tip.x-middle.x,y:tip.y-middle.y,z:tip.z-middle.z};
    const straight=(a.x*b.x+a.y*b.y+a.z*b.z)/(Math.hypot(a.x,a.y,a.z)*Math.hypot(b.x,b.y,b.z) || 1);
    const curled=['middle','ring','pinky'].filter(finger=>{
        const end=joints.get(finger+'-finger-tip'),base=joints.get(finger+'-finger-phalanx-proximal');
        return end && base && Math.hypot(end.x-wrist.x,end.y-wrist.y,end.z-wrist.z)<Math.hypot(base.x-wrist.x,base.y-wrist.y,base.z-wrist.z)+.025;
    }).length;
    return curled>=2 && straight>.5 && Math.hypot(tip.x-wrist.x,tip.y-wrist.y,tip.z-wrist.z)>Math.hypot(knuckle.x-wrist.x,knuckle.y-wrist.y,knuckle.z-wrist.z)+.025;
}

export function createHandPokeTracker(){
    let previous=null,armed=false,pressed=false,frontSince=null;
    return {
        update(point,target,time){
            if(!point){previous=null;armed=false;pressed=false;frontSince=null;return false;}
            const continuous=previous && time-previous.time<100 && Math.hypot(point.x-previous.point.x,point.y-previous.point.y,point.z-previous.point.z)<.10;
            if(!continuous){armed=false;pressed=false;frontSince=null;}
            const distance=target?.signedDistance;
            if(pressed){if(!target || distance>.024)pressed=false;}
            const sameTarget=previous?.id===target?.card?.id && previous?.action===target?.button?.action;
            if(!sameTarget){armed=false;frontSince=null;}
            if(!pressed && target?.button && distance>.018){frontSince ??= time;if(time-frontSince>=120)armed=true;}
            const pushing=continuous && sameTarget && distance<previous.distance-.0002;
            const contact=distance-(Math.min(.012,point.radius || .008));
            const activate=Boolean(armed && !pressed && target?.button && !target.button.disabled && pushing && contact<=.002 && distance>=-.025);
            if(activate){pressed=true;armed=false;}
            // Leaving the panel does not permit a sideways brush to select.
            if(!target && !pressed){armed=false;frontSince=null;}
            previous={point:{x:point.x,y:point.y,z:point.z},time,distance,id:target?.card?.id,action:target?.button?.action};return activate;
        },
        reset(){previous=null;armed=false;pressed=false;frontSince=null;},
        get pressed(){return pressed;},get action(){return pressed?previous?.action:null;}
    };
}
