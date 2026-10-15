import {createPeekPortalExperience} from './peekPortalExperience.js';
// Preserved geometry helper for stereo aperture checks.
export function peekAperturePoint(point,eye){const t=eye.z/(eye.z-point.z);return {x:eye.x+(point.x-eye.x)*t,y:eye.y+(point.y-eye.y)*t};}
// The Living Frame and demo share the actual Sun Garden 3D portal.
export async function createLivingFramePeekXR(gl,{createPortal=createPeekPortalExperience}={}){
 const portal=createPortal();if(!await portal.ready){portal.destroy();throw Error('The 3D garden could not load.');}try{portal.setContext(gl);}catch(error){portal.destroy();throw error;}let poseKey=null,disposed=false;
 return {draw(view,pose){if(disposed)return;const key=Array.from(pose.matrix).join(',')+'|'+pose.radius;if(key!==poseKey){poseKey=key;const matrix=Array.from(pose.matrix),scale=(pose.radius || .89)/.89;for(const i of [0,1,2,4,5,6,8,9,10])matrix[i]*=scale;if(portal.active)portal.setAnchor(matrix);else portal.begin(matrix,()=>{},{rectangle:pose.rectangle});}portal.drawNative(gl,view,null,view.transform.matrix);},destroy(){if(disposed)return;disposed=true;portal.destroy();}};
}
