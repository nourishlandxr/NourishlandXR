export async function biomeWheelSupport(xr=globalThis.navigator?.xr,secure=globalThis.isSecureContext){
 const modes=['immersive-vr','immersive-ar'],support=Object.fromEntries(modes.map(mode=>[mode,false]));
 if(!secure||typeof xr?.isSessionSupported!=='function')return support;
 const results=await Promise.allSettled(modes.map(mode=>xr.isSessionSupported(mode)));
 modes.forEach((mode,i)=>support[mode]=results[i].status==='fulfilled'&&results[i].value===true);return support;
}
export function wholeWheelPose(position,orientation,mode){
 const {x=0,y=0,z=0,w=1}=orientation||{},forward={x:-2*(x*z+w*y),z:-(1-2*(x*x+y*y))};
 const length=Math.hypot(forward.x,forward.z);if(length<.05){forward.x=0;forward.z=-1;}else{forward.x/=length;forward.z/=length;}
 const ar=mode==='immersive-ar',distance=ar?1.35:2;
 return {position:[position.x+forward.x*distance,position.y-.35,position.z+forward.z*distance],yaw:Math.atan2(-forward.x,-forward.z),width:ar?.85:1.45};
}
