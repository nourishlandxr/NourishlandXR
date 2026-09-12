export const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export function scrollTurn(top,height,viewport){return clamp(-top/Math.max(1,height-viewport),0,1)*Math.PI*1.5;}
export function gestureIntent(dx,dy){if(Math.max(Math.abs(dx),Math.abs(dy))<10)return 'pending';return Math.abs(dx)>Math.abs(dy)?'rotate':'scroll';}
