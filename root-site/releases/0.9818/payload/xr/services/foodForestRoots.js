import * as THREE from "../vendor/three.module.min.js?v=0.9818";
import {createForestSculpture} from "./foodForestSculpture.js?v=0.9818";

// Canonical root envelope: horizontal radius .5, depth 1. The board maps this
// envelope to explicit metre dimensions; token size and canopy pruning do not.
export function createFoodForestRoots(layer,variant=0){
 const depth=({canopy:.9,'small-tree':.68,shrub:.43,herb:.3,groundcover:.2,root:.42,climber:.48})[layer]||.4,kit=createForestSculpture({seed:layer+':roots:'+variant}),count=['herb','groundcover'].includes(layer)?7:6;
 const main='#ac9472',tip='#cbb795';
 kit.branch([[0,0,0],[.017,-depth*.4,.008],[-.018,-depth,0]],.019,main,.08);
 for(let i=0;i<count;i++){
  const a=i/count*Math.PI*2+variant*.41,reach=depth*(.42+(i%3)*.1),start=[0,-.025-(i%2)*depth*.08,0],bend=[Math.cos(a)*reach*.45,-depth*.24,Math.sin(a)*reach*.45],end=[Math.cos(a)*reach,-depth*(.46+(i%3)*.12),Math.sin(a)*reach];
  kit.branch([start,bend,end],.012,main,.09);
  for(const side of[-1,1]){const b=a+side*.3,reach2=reach*(1.08+(i%2)*.12),fork=[Math.cos(b)*reach2,-depth*(.73+(i%2)*.12),Math.sin(b)*reach2];kit.branch([bend,[end[0]*.9,-depth*.49,end[2]*.9],fork],.0055,tip,.04);}
 }
 const piece=kit.finish(),geo=piece.group.children[0].geometry,p=geo.attributes.position;let radius=0,minY=Infinity,maxY=-Infinity;
 for(let i=0;i<p.count;i++){radius=Math.max(radius,Math.hypot(p.getX(i),p.getZ(i)));minY=Math.min(minY,p.getY(i));maxY=Math.max(maxY,p.getY(i));}
 for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)/radius*.5,(p.getY(i)-maxY)/(maxY-minY),p.getZ(i)/radius*.5);
 geo.computeVertexNormals();geo.computeBoundingSphere();piece.group.name='root-spread-envelope';piece.group.userData={radius:.5,depth:1};
 return {group:piece.group,dispose:piece.dispose};
}
