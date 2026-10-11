import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {PRACTICE_TABLE_HALF_WIDTH as width,PRACTICE_TABLE_HALF_DEPTH as depth} from './welcomePracticePhysics.js';
// A single reusable texture, with quiet grain rather than a bright flat surface.
export function createWelcomePracticeTable(root){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#796c56';ctx.fillRect(0,0,1024,512);
 for(let y=0;y<512;y+=2){ctx.strokeStyle=`rgba(91,57,31,${.035+.025*(1+Math.sin(y*.17))})`;ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=1024;x+=12){const yy=y+2.7*Math.sin(x*.011+y*.063)+.8*Math.sin(x*.04+y);x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
 for(const y of [128,256,384]){ctx.fillStyle='rgba(76,48,25,.10)';ctx.fillRect(0,y,1024,1);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const group=new THREE.Group();root.add(group);const top=new THREE.Mesh(new THREE.BoxGeometry(width*2,.035,depth*2),new THREE.MeshStandardMaterial({map:texture,color:'#b2ac97',roughness:.85}));top.position.y=-.0175;group.add(top);
 const material=new THREE.MeshStandardMaterial({color:'#625b49',roughness:.86});
 const stand=new THREE.Mesh(new THREE.CylinderGeometry(.045,.075,1,24),material);group.add(stand);
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.22,.25,.03,32),material);group.add(foot);
 const landing=new THREE.Mesh(new THREE.TorusGeometry(.11,.003,6,40),new THREE.MeshBasicMaterial({color:'#9caa83',transparent:true,opacity:.35,depthWrite:false}));landing.rotation.x=Math.PI/2;landing.position.set(-.43,.005,-.20);group.add(landing);
 const revealMaterials=[top.material,material];
 return {group,stand,foot,landing,revealMaterials};
}
