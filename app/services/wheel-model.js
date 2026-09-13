export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function scrollTurn(top,height,viewport){return clamp(-top/Math.max(1,height-viewport),0,1)*Math.PI*1.5;}
export function gestureIntent(dx,dy){if(Math.max(Math.abs(dx),Math.abs(dy))<10)return 'pending';return Math.abs(dx)>Math.abs(dy)?'rotate':'scroll';}

export const WHEEL_DRAG_RADIANS_PER_PIXEL=.012;
export function wheelGestureVelocity(samples,previousVelocity=0,reducedMotion=false){
 if(reducedMotion)return 0;
 const recent=(samples||[]).filter(sample=>Number.isFinite(sample?.x)&&Number.isFinite(sample?.at));
 if(recent.length<2)return clamp(previousVelocity,-8,8);
 const last=recent.at(-1),windowStart=last.at-110;
 const first=recent.find(sample=>sample.at>=windowStart)||recent[0];
 const seconds=Math.max(.012,(last.at-first.at)/1000);
 const sampled=(last.x-first.x)*WHEEL_DRAG_RADIANS_PER_PIXEL/seconds;
 const carry=sampled&&Math.sign(sampled)===Math.sign(previousVelocity)?previousVelocity*.24:0;
 return clamp(sampled+carry,-8,8);
}
export function decayWheelVelocity(velocity,dt,reducedMotion=false){
 if(reducedMotion||!Number.isFinite(velocity)||!Number.isFinite(dt))return 0;
 const next=velocity*Math.exp(-Math.max(0,dt)*1.05);
 return Math.abs(next)<.012?0:next;
}
