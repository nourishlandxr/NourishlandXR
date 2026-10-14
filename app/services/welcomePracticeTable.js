import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {PRACTICE_TABLE_HALF_WIDTH as width,PRACTICE_TABLE_HALF_DEPTH as depth} from './welcomePracticePhysics.js';
// A single reusable texture, with quiet grain rather than a bright flat surface.
export function createWelcomePracticeTable(root){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#796c56';ctx.fillRect(0,0,1024,512);
 for(let y=0;y<512;y+=2){ctx.strokeStyle=`rgba(91,57,31,${.035+.025*(1+Math.sin(y*.17))})`;ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=1024;x+=12){const yy=y+2.7*Math.sin(x*.011+y*.063)+.8*Math.sin(x*.04+y);x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
 for(const y of [128,256,384]){ctx.fillStyle='rgba(76,48,25,.10)';ctx.fillRect(0,y,1024,1);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const group=new THREE.Group();group.name='Welcome practice table';root.add(group);const top=new THREE.Mesh(new THREE.BoxGeometry(width*2,.035,depth*2),new THREE.MeshStandardMaterial({map:texture,color:'#b2ac97',roughness:.85}));top.position.y=-.0175;group.add(top);
 const material=new THREE.MeshStandardMaterial({color:'#625b49',roughness:.86});
 for(const side of [-1,1]){
  const edge=new THREE.Mesh(new THREE.BoxGeometry(width*2,.045,.018),material);edge.position.set(0,.0225,side*(depth-.009));group.add(edge);
  const end=new THREE.Mesh(new THREE.BoxGeometry(.018,.045,depth*2),material);end.position.set(side*(width-.009),.0225,0);group.add(end);
 }
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,1,24),material);group.add(stand);
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.03,32),material);group.add(foot);
 const landing=new THREE.Mesh(new THREE.TorusGeometry(.11,.003,6,40),new THREE.MeshBasicMaterial({color:'#9caa83',transparent:true,opacity:.35,depthWrite:false}));landing.name='Dragonfly landing marker';landing.visible=false;landing.userData.skipArrivalGlow=true;landing.rotation.x=Math.PI/2;landing.position.set(-.43,.005,-.20);group.add(landing);
 const revealMaterials=[top.material,material];
 const grip=new THREE.Group();grip.name='Table height grip';grip.position.set(0,-.018,depth+.035);group.add(grip);
 const handleMaterial=new THREE.MeshStandardMaterial({color:'#a9ac97',roughness:.7,metalness:.15});
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.09,0,-.035),new THREE.Vector3(-.09,0,.025),new THREE.Vector3(-.065,0,.045),new THREE.Vector3(.065,0,.045),new THREE.Vector3(.09,0,.025),new THREE.Vector3(.09,0,-.035)]);
 const handle=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.008,8,false),handleMaterial);handle.name='Rounded table pull handle';grip.add(handle);revealMaterials.push(handleMaterial);
 function setHeight(height){
  // Keep the whole pedestal beneath the underside, including during reveal.
  const underside=-.038,footTop=-height+.030;
  stand.scale.y=Math.max(.05,underside-footTop);stand.position.y=(underside+footTop)/2;
  foot.position.y=-height+.015;
 }
 setHeight(.8);
 return {group,stand,foot,landing,grip,revealMaterials,setHeight};
}
