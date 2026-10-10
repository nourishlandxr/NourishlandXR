import {getSpatialVisualSettings} from './spatialVisualSettings.js';
import {WELCOME_SHAPE} from './arWelcomePanel.js';
import {WELCOME_PANEL_DRAW_OFFSET,AR_WELCOME_CANVAS} from './arWelcomeShowcase.js';

// Use the reading surface's actual axes and pixel centre for the native rim.
export function livingFramePose(board){
 const sx=Math.hypot(board[0],board[1],board[2]),sy=Math.hypot(board[4],board[5],board[6]);
 const right={x:board[0]/sx,y:board[1]/sx,z:board[2]/sx},up={x:board[4]/sy,y:board[5]/sy,z:board[6]/sy},normal={x:board[8],y:board[9],z:board[10]};
 const x=((WELCOME_PANEL_DRAW_OFFSET.x+WELCOME_SHAPE.cx)/AR_WELCOME_CANVAS.width-.5)*.4*sx;
 const y=(.5-(WELCOME_PANEL_DRAW_OFFSET.y+WELCOME_SHAPE.cy)/AR_WELCOME_CANVAS.height)*.16*sy;
 const center={x:board[12]+right.x*x+up.x*y,y:board[13]+right.y*x+up.y*y+(getSpatialVisualSettings().livingFrameHeight||0),z:board[14]+right.z*x+up.z*y};
 return {center,right,up,normal,radius:WELCOME_SHAPE.radius/AR_WELCOME_CANVAS.width*.4*sx,matrix:new Float32Array([right.x,right.y,right.z,0,up.x,up.y,up.z,0,normal.x,normal.y,normal.z,0,center.x,center.y,center.z,1])};
}

// SD and HD grown rim bounds: radius 1.059 m, depth -0.142..0.190 m.
// Include the renderer's +0.012 m offset and a small contact margin.
export const LIVING_FRAME_CONTACT=Object.freeze({inner:.74,outer:1.09,front:.215,back:-.17,beeClearance:.28});
export function livingFrameRimHit(ray,pose){
 if(!ray?.origin||!ray.direction||!pose)return null;
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const d={x:ray.origin.x-pose.center.x,y:ray.origin.y-pose.center.y,z:ray.origin.z-pose.center.z};
 const o={x:dot(d,pose.right),y:dot(d,pose.up),z:dot(d,pose.normal)},v={x:dot(ray.direction,pose.right),y:dot(ray.direction,pose.up),z:dot(ray.direction,pose.normal)};
 const {inner,outer,front,back}=LIVING_FRAME_CONTACT,candidates=[];
 if(Math.abs(v.z)>1e-8)for(const depth of [front,back]){const t=(depth-o.z)/v.z,r=Math.hypot(o.x+v.x*t,o.y+v.y*t);if(t>0&&r>=inner&&r<=outer)candidates.push(t);}
 // Side walls also catch oblique rays and rays starting inside the depth slab.
 const a=v.x*v.x+v.y*v.y,b=2*(o.x*v.x+o.y*v.y);
 if(a>1e-8)for(const radius of [inner,outer]){const c=o.x*o.x+o.y*o.y-radius*radius,disc=b*b-4*a*c;if(disc<0)continue;for(const t of [(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)]){const z=o.z+v.z*t;if(t>0&&z>=back&&z<=front)candidates.push(t);}}
 if(!candidates.length)return null;
 const distance=Math.min(...candidates),point={x:ray.origin.x+ray.direction.x*distance,y:ray.origin.y+ray.direction.y*distance,z:ray.origin.z+ray.direction.z*distance};
 return {kind:'living-frame-rim',id:'living-frame-rim',distance,point};
}

// A padded disk keeps insects out of the reading surface. Flowers outside
// that boundary remain reachable for nectar visits.
// Choose the existing side of the disk so a flight cannot tunnel through it.
export function avoidLivingFrameDisk(point,pose,index=0,previous=null){
 if(!pose)return point;
 const local=p=>{const d={x:p.x-pose.center.x,y:p.y-pose.center.y,z:p.z-pose.center.z};return {x:d.x*pose.right.x+d.y*pose.right.y+d.z*pose.right.z,y:d.x*pose.up.x+d.y*pose.up.y+d.z*pose.up.z,z:d.x*pose.normal.x+d.y*pose.normal.y+d.z*pose.normal.z};};
 const p=local(point),last=previous?local(previous):null,radius=Math.max(pose.radius+.20,LIVING_FRAME_CONTACT.outer+.035),clearance=LIVING_FRAME_CONTACT.beeClearance;
 const inside=Math.hypot(p.x,p.y)<radius;
 let crossing=false;
 if(last&&last.z*p.z<0){const t=last.z/(last.z-p.z);crossing=Math.hypot(last.x+(p.x-last.x)*t,last.y+(p.y-last.y)*t)<radius;}
 // Test the whole flight segment against the padded rim's depth slab. A bee
 // can otherwise enter a petal sideways without crossing the central plane.
 if(last&&!crossing){
  const dz=p.z-last.z,dx=p.x-last.x,dy=p.y-last.y;
  let lo=0,hi=1;
  if(Math.abs(dz)<1e-8){if(Math.abs(last.z)>=clearance)hi=-1;}
  else {const a=(-clearance-last.z)/dz,b=(clearance-last.z)/dz;lo=Math.max(0,Math.min(a,b));hi=Math.min(1,Math.max(a,b));}
  if(lo<=hi){const t=Math.max(lo,Math.min(hi,-(last.x*dx+last.y*dy)/(dx*dx+dy*dy||1)));crossing=Math.hypot(last.x+dx*t,last.y+dy*t)<radius;}
 }
 if(!crossing&&(!inside||Math.abs(p.z)>=clearance))return point;
 const side=last&&Math.abs(last.z)>.001?Math.sign(last.z):p.z?Math.sign(p.z):1;
 if(crossing&&last&&Math.abs(last.z)<clearance&&Math.hypot(last.x,last.y)>=radius){
  // First retreat clear of the rim; the next frame slides along its safe face.
  const depth=side*clearance-last.z;
  return {x:previous.x+pose.normal.x*depth,y:previous.y+pose.normal.y*depth,z:previous.z+pose.normal.z*depth};
 }
 const depth=side*clearance-p.z;
 const result={x:point.x+pose.normal.x*depth,y:point.y+pose.normal.y*depth,z:point.z+pose.normal.z*depth};
 if(crossing&&!inside){const angle=Math.atan2(p.y,p.x)||index*Math.PI/2,dx=Math.cos(angle)*radius-p.x,dy=Math.sin(angle)*radius-p.y;result.x+=pose.right.x*dx+pose.up.x*dy;result.y+=pose.right.y*dx+pose.up.y*dy;result.z+=pose.right.z*dx+pose.up.z*dy;}
 return result;
}
