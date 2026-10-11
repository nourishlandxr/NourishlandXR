import * as THREE from '../vendor/three.module.min.js';
import {botanicalLeaf,botanicalBranch,botanicalRoseApple} from './peekBotanicalGeometry.js';

// A few deliberate plant silhouettes, composed around the path. Their silhouettes
// do the visual work; there are no transparent cutouts or tiny floating details.
export function plantPeekOrchard({add,random,groundHeight,pathCentre}) {
 const point=p=>p.isVector3?p.clone():new THREE.Vector3(...p);
 function branch(points,radius,tip=radius*.2){
  const curve=new THREE.CatmullRomCurve3(points.map(point));
  add('bark',botanicalBranch(curve.points,radius,{tip,segments:radius>.025?24:12,sides:radius>.025?12:7}));
  return curve;
 }
 function blade(origin,direction,length,width,key='leaf',roll=0,bend=.19){
  const p=point(origin),d=point(direction).normalize();
  // Keep each blade's broad face legible, even on a sideways branch.
  const normal=new THREE.Vector3(-p.x*.06,.45,1),right=new THREE.Vector3().crossVectors(d,normal).normalize();
  const front=new THREE.Vector3().crossVectors(right,d).normalize();
  const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,d,front));
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),roll));
  const stalk=length*.1,base=p.clone().addScaledVector(d,stalk);
  branch([p,p.clone().lerp(base,.5),base],Math.min(.004,length*.01),.001);
  const g=botanicalLeaf(length,width,{bend,roundness:key==='fernGreen'?1:.68,rows:length>.65?22:14,thickness:length*.006});
  g.applyQuaternion(q);add(key,g,base.toArray());
 }
 function fruitCluster(origin,size=.095,rose=false,count=2){
  const root=point(origin);
  for(let i=0;i<count;i++){
   const c=root.clone().add(new THREE.Vector3((i-(count-1)/2)*size*1.35,-.12-size*(.7+i*.25),(i%2)*size*.5));
   const neck=c.clone().add(new THREE.Vector3(0,size*.86,0));branch([root,root.clone().lerp(neck,.6),neck],.004,.002);
   const g=rose?botanicalRoseApple(size):new THREE.SphereGeometry(size*.82,20,14);
   add(rose?'fruitRose':'fruitApricot',g,c.toArray(),[0,i*.8,.06*(i-1)]);
  }
 }
 function orchardTree(x,z,height,side,index){
  const y=groundHeight(x,z),lean=-side*.2;
  const trunk=branch([[x,y,z],[x+lean*.25,y+height*.38,z+.06],[x+lean,y+height*.72,z-.12],[x+lean*.8,y+height,z-.08]],.095+height*.01,.025);
  for(let j=0;j<7;j++){
   const t=.38+j*.079,root=trunk.getPoint(t),azimuth=j*2.4+index*.8;
   const reach=.55+height*.16+random()*.18;
   const end=root.clone().add(new THREE.Vector3(Math.cos(azimuth)*reach,.2+random()*.32,Math.sin(azimuth)*reach*.65));
   const mid=root.clone().lerp(end,.52);mid.y+=.18;
   const bough=branch([root,mid,end],.027,.006);
   for(let k=0;k<6;k++){
    const u=.22+k*.145,p=bough.getPoint(u),tangent=bough.getTangent(u),sign=k%2?1:-1;
    const d=new THREE.Vector3(tangent.z*sign*.85,-.1+random()*.45,-tangent.x*sign*.85+.2);
    const key=k%3===0?'lightLeaf':'leaf';blade(p,d,.3+random()*.13,.085+random()*.025,key,sign*.35);
   }
   if(j%3===0)fruitCluster(bough.getPoint(.7),.07+height*.012,index%3===0,index%2?2:3);
  }
 }
 // Staggered orchard, opening toward the sun; trunks do not sit in the walking lane.
 [[-1.5,-2.7,2.7],[1.7,-3.7,3.1],[-2.3,-6.3,3.7],[2.4,-8.1,4.2],[-3.8,-11.8,4.8],[4.1,-14,5.2],[-3.5,.4,3.0],[3.8,.7,3.4],[-5.4,-3.8,4.2],[5.9,-4.5,4.6]].forEach(([x,z,h],i)=>orchardTree(x,z,h,Math.sign(x),i));
 // The reference's low fruiting arch: continuous wood, hanging leaves and clusters.
 for(const side of [-1,1]){
  const arch=branch([[side*1.47,.52,-2.7],[side*1.31,1.36,-2.2],[side*.9,1.6,-1.9],[side*.46,1.38,-1.8]],.048,.012);
  for(let j=0;j<5;j++){
   const root=arch.getPoint(.24+j*.16),length=.24+random()*.27;
   const end=root.clone().add(new THREE.Vector3(side*.06,-length,.09));
   const twig=branch([root,root.clone().lerp(end,.4).add(new THREE.Vector3(-side*.04,0,0)),end],.008,.002);
   for(let k=0;k<3;k++)blade(twig.getPoint(.23+k*.22),[side*(k%2?-.48:.55),-.8,.22],.23+random()*.07,.065,k%2?'lightLeaf':'leaf',side*.35);
   if(j!==1)fruitCluster(twig.getPoint(.7),.082+random()*.018,side<0,j%2?2:3);
  }
 }
 function fern(x,z,scale=1){
  const base=new THREE.Vector3(x,groundHeight(x,z)+.02,z);
  for(let f=0;f<5;f++){
   const a=f*2.4,end=base.clone().add(new THREE.Vector3(Math.cos(a)*.46,.24,Math.sin(a)*.46).multiplyScalar(scale));
   const mid=base.clone().lerp(end,.45);mid.y+=.28*scale;
   const frond=branch([base,mid,end],.005,.0015);
   for(let k=1;k<7;k++){
    const t=k/7,p=frond.getPoint(t),tangent=frond.getTangent(t),size=(.19*(1-t)+.035)*scale;
    for(const sign of [-1,1])blade(p,[Math.cos(a+Math.PI/2)*sign,.18,Math.sin(a+Math.PI/2)*sign],size,size*.22,'fernGreen',sign*.18,.12);
   }
  }
 }
 function broadleaf(x,z,scale=1){
  const base=new THREE.Vector3(x,groundHeight(x,z),z);
  for(let j=0;j<5;j++){
   const a=j*2.4,top=base.clone().add(new THREE.Vector3(Math.cos(a)*.22,.42+random()*.2,Math.sin(a)*.22).multiplyScalar(scale));
   branch([base,base.clone().lerp(top,.5),top],.015,.006);
   blade(top,[Math.cos(a),.3,Math.sin(a)],(.46+random()*.18)*scale,.13*scale,j%2?'lightLeaf':'leaf',a*.13,.3);
  }
 }
 function shrub(x,z,scale=1){
  const root=new THREE.Vector3(x,groundHeight(x,z),z);
  for(let j=0;j<5;j++){
   const a=j*2.4,tip=root.clone().add(new THREE.Vector3(Math.cos(a)*.27,.35+random()*.22,Math.sin(a)*.27).multiplyScalar(scale));
   const shoot=branch([root,root.clone().lerp(tip,.5),tip],.01,.003);
   for(let k=0;k<3;k++){
    const p=shoot.getPoint(.4+k*.22);blade(p,[Math.cos(a+k*.8),.55,Math.sin(a+k*.8)],(.17+random()*.07)*scale,.065*scale,k%2?'lightLeaf':'leaf',.25,.15);
   }
  }
 }
 // Broad tropical leaves and ferns form low, separated beds like the supplied paths.
 for(const side of [-1,1]){
  for(let j=0;j<8;j++){
   const z=1.2-j*1.3,x=pathCentre(z)+side*(1.45+random()*.35);
   if(j%3===0)broadleaf(x,z,.72+random()*.15);else fern(x,z,.9+random()*.2);
  }
  broadleaf(side*3.6,-.3,1.2);broadleaf(side*4.5,-5,1.3);
  for(let j=0;j<4;j++)fern(side*(2.5+random()*2.2),1.8-j*1.7,1.1);
  for(let j=0;j<7;j++){const z=-3-j*1.65;shrub(pathCentre(z)+side*(.95+random()*.5),z,.9+random()*.3);}
 }
}
