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

// A padded disk keeps insects out of the reading surface. Flowers outside
// that boundary remain reachable for nectar visits.
// Choose the existing side of the disk so a flight cannot tunnel through it.
export function avoidLivingFrameDisk(point,pose,index=0,previous=null){
 if(!pose)return point;
 const local=p=>{const d={x:p.x-pose.center.x,y:p.y-pose.center.y,z:p.z-pose.center.z};return {x:d.x*pose.right.x+d.y*pose.right.y+d.z*pose.right.z,y:d.x*pose.up.x+d.y*pose.up.y+d.z*pose.up.z,z:d.x*pose.normal.x+d.y*pose.normal.y+d.z*pose.normal.z};};
 const p=local(point),last=previous?local(previous):null,radius=pose.radius+.025,clearance=.16;
 const inside=Math.hypot(p.x,p.y)<radius;
 let crossing=false;
 if(last&&last.z*p.z<0){const t=last.z/(last.z-p.z);crossing=Math.hypot(last.x+(p.x-last.x)*t,last.y+(p.y-last.y)*t)<radius;}
 if(!crossing&&(!inside||Math.abs(p.z)>=clearance))return point;
 const side=last&&Math.abs(last.z)>.001?Math.sign(last.z):p.z?Math.sign(p.z):1;
 const depth=side*clearance-p.z;
 const result={x:point.x+pose.normal.x*depth,y:point.y+pose.normal.y*depth,z:point.z+pose.normal.z*depth};
 if(crossing&&!inside){const angle=Math.atan2(p.y,p.x)||index*Math.PI/2,dx=Math.cos(angle)*radius-p.x,dy=Math.sin(angle)*radius-p.y;result.x+=pose.right.x*dx+pose.up.x*dy;result.y+=pose.right.y*dx+pose.up.y*dy;result.z+=pose.right.z*dx+pose.up.z*dy;}
 return result;
}
