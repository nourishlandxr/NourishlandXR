// One convention for every held surface: left/right turns, up/down changes depth.
export function spatialStick(source,elapsedMs=16){
 const axes=source?.gamepad?.axes || [],offset=axes.length>=4?2:0;
 const response=value=>{const n=Number(value)||0,amount=Math.max(0,(Math.abs(n)-.18)/.82);return Math.sign(n)*Math.min(1,amount)**2;};
 const seconds=Math.min(50,Math.max(0,elapsedMs))/1000;
 return {yaw:response(axes[offset])*seconds*1.1,depth:-response(axes[offset+1])*seconds*.65};
}
export function turnSpatialAxes(pose,angle){
 const c=Math.cos(angle),s=Math.sin(angle),turn=v=>({x:v.x*c+v.z*s,y:v.y,z:-v.x*s+v.z*c});
 return {...pose,right:turn(pose.right),up:turn(pose.up),...(pose.normal?{normal:turn(pose.normal)}:{})};
}
