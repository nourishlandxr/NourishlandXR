const point=(state,name)=>state?.rawJoints?.get(name) || state?.joints?.get(name);
export function orbPinchPoint(state){const a=point(state,'index-finger-tip'),b=point(state,'thumb-tip');return state?.tracked && a && b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2}:null;}
export function openPalmUnderOrb(state,orb){
 if(!state?.tracked || state.pinch || !orb)return false;
 const wrist=point(state,'wrist'),index=point(state,'index-finger-metacarpal'),little=point(state,'pinky-finger-metacarpal'),middle=point(state,'middle-finger-metacarpal'),tip=point(state,'index-finger-tip');
 if(!wrist || !index || !little || !middle || !tip)return false;
 const a={x:index.x-wrist.x,y:index.y-wrist.y,z:index.z-wrist.z},b={x:little.x-wrist.x,y:little.y-wrist.y,z:little.z-wrist.z};
 const normal={x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x},length=Math.hypot(normal.x,normal.y,normal.z)||1;
 const palm={x:(wrist.x+middle.x)/2,y:(wrist.y+middle.y)/2,z:(wrist.z+middle.z)/2};
 return Math.abs(normal.y)/length>.7 && Math.hypot(tip.x-wrist.x,tip.y-wrist.y,tip.z-wrist.z)>.13 && orb.y-palm.y>.025 && orb.y-palm.y<.18 && Math.hypot(orb.x-palm.x,orb.z-palm.z)<.11;
}
