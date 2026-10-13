import {drawSpatialTether,drawSpatialPointerContact} from './spatialTetherRenderer.js';

export function welcomeControllerLaserEnd(ray,point,progress){
    const target=point || {x:ray.origin.x+ray.direction.x*2.5,y:ray.origin.y+ray.direction.y*2.5,z:ray.origin.z+ray.direction.z*2.5};
    const t=Math.max(0,Math.min(1,progress));
    return {x:ray.origin.x+(target.x-ray.origin.x)*t,y:ray.origin.y+(target.y-ray.origin.y)*t,z:ray.origin.z+(target.z-ray.origin.z)*t};
}
export function drawWelcomeControllerLaser(gl,renderer,view,ray,point,progress,opacity=1){
    if(!ray || progress<=0)return;
    const end=welcomeControllerLaserEnd(ray,point,progress);
    for(const [width,alpha,colour] of [[.014,.08,[.4,.85,1]],[.005,.32,[.45,.9,1]],[.0015,.95,[.92,.99,1]]])drawSpatialTether(gl,renderer,view,ray.origin,end,{width,curve:0,lift:0,segments:4,color:[...colour,alpha*opacity]});
    if(point && progress>=.99)drawSpatialPointerContact(gl,renderer,view,end,.007,[.8,.96,1,.9*opacity]);
}
