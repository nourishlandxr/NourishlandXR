export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function scrollTurn(top,height,viewport){return clamp(-top/Math.max(1,height-viewport),0,1)*Math.PI*.75;}
export function gestureIntent(dx,dy,options={}){const threshold=Number.isFinite(options?.threshold)?Math.max(2,options.threshold):10;if(Math.max(Math.abs(dx),Math.abs(dy))<threshold)return 'pending';if(options?.allowVertical)return 'rotate';return Math.abs(dx)>Math.abs(dy)?'rotate':'scroll';}

export const WHEEL_DRAG_RADIANS_PER_PIXEL=.012;
export const WHEEL_TOUCH_RADIANS_PER_PIXEL=.008;
export const WHEEL_TOUCH_MAX_VELOCITY=2.2;
export function discoveryOrientation(seed=.5){
 const normalized=Number.isFinite(seed)?seed-Math.floor(seed):.5;
 return {yaw:normalized*Math.PI*2,pitch:(normalized-.5)*.9};
}
export function discoveryMomentumFactor(seed=.5){
 const normalized=Number.isFinite(seed)?seed-Math.floor(seed):.5;
 return .94+normalized*.12;
}
export function wheelGestureVelocity(samples,previousVelocity=0,reducedMotion=false,axis='x',radiansPerPixel=WHEEL_DRAG_RADIANS_PER_PIXEL,maxVelocity=6){
 if(reducedMotion)return 0;
 const sensitivity=Number.isFinite(radiansPerPixel)?clamp(radiansPerPixel,.004,.03):WHEEL_DRAG_RADIANS_PER_PIXEL;
 const limit=Number.isFinite(maxVelocity)?clamp(maxVelocity,.5,6):6;
 const recent=(samples||[]).filter(sample=>Number.isFinite(sample?.[axis])&&Number.isFinite(sample?.at));
 if(recent.length<2)return clamp(previousVelocity,-limit,limit);
 const last=recent.at(-1),windowStart=last.at-110;
 const first=recent.find(sample=>sample.at>=windowStart)||recent[0];
 const seconds=Math.max(.012,(last.at-first.at)/1000);
 const sampled=(last[axis]-first[axis])*sensitivity/seconds;
 const carry=sampled&&Math.sign(sampled)===Math.sign(previousVelocity)?previousVelocity*.24:0;
 return clamp(sampled+carry,-limit,limit);
}
export function decayWheelVelocity(velocity,dt,reducedMotion=false,damping=1.05){
 if(reducedMotion||!Number.isFinite(velocity)||!Number.isFinite(dt))return 0;
 // Enough glide to feel physical without the desktop wheel running away.
 const next=velocity*Math.exp(-Math.max(0,dt)*damping);
 return Math.abs(next)<.012?0:next;
}
