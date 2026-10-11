import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createPracticeBody} from './welcomePracticePhysics.js';

// Quiet, solid props: an open basket and a small handheld RC transmitter.
export function createWelcomePracticeProps(root,fruits){
    const basket=new THREE.Group();basket.position.set(.21,0,-.13);root.add(basket);
    const cloth=new THREE.MeshStandardMaterial({color:'#c9b38d',roughness:.88,side:THREE.DoubleSide}),trim=new THREE.MeshStandardMaterial({color:'#e2d0aa',roughness:.75});
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.128,.125,.012,36),cloth);base.position.y=.006;basket.add(base);
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.146,.128,.073,36,1,true),cloth);wall.position.y=.043;basket.add(wall);
    for(const y of [.014,.038,.08]){const band=new THREE.Mesh(new THREE.TorusGeometry(y===.08?.145:y===.014?.13:.138,.003,6,36),trim);band.rotation.x=Math.PI/2;band.position.y=y;basket.add(band);}
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.145,.0045,6,32,Math.PI),trim);handle.position.y=.081;handle.rotation.y=Math.PI/2;basket.add(handle);
    const slots={orange:{x:.15,z:-.09},lime:{x:.26,z:-.09},banana:{x:.2,z:-.18}},collected=new Set();
    const remoteBody=createPracticeBody('remote',{x:-.22,z:.16,radius:.1,halfSize:{x:.095,y:.024,z:.063},bounce:.06}),remote=new THREE.Group();root.add(remote);
    const shellMat=new THREE.MeshStandardMaterial({color:'#e5dfcf',roughness:.7}),controlMat=new THREE.MeshBasicMaterial({color:'#597b80'}),accent=new THREE.MeshBasicMaterial({color:'#e9bb73'});
    const shell=new THREE.Mesh(new THREE.BoxGeometry(.19,.045,.126,3,1,3),shellMat);remote.add(shell);
    const sticks=[];for(const side of [-1,1]){const socket=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.005,20),controlMat);socket.position.set(side*.048,.026,.008);remote.add(socket);const pivot=new THREE.Group();pivot.position.copy(socket.position);remote.add(pivot);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.016,8),controlMat);stem.position.y=.008;pivot.add(stem);const cap=new THREE.Mesh(new THREE.SphereGeometry(.008,12,8),accent);cap.position.y=.017;cap.scale.y=.4;pivot.add(cap);sticks.push(pivot);}
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.004,10,6),accent);lamp.position.set(0,.026,-.035);remote.add(lamp);
    const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.07,8),controlMat);antenna.position.set(0,.025,-.094);antenna.rotation.x=Math.PI/2;remote.add(antenna);
    function place(body){const slot=slots[body.id],p=body.position;if(!slot || Math.hypot(p.x-basket.position.x,p.z-basket.position.z)>.14+Math.min(.035,body.radius*.35) || p.y<.025 || p.y>.55)return false;body.basketed=true;collected.add(body.id);snap(body);return true;}
    function snap(body){const slot=slots[body.id];Object.assign(body.position,{x:slot.x,y:.018+body.halfSize.y,z:slot.z});Object.assign(body.velocity,{x:0,y:0,z:0});Object.assign(body.rotation,{x:0,y:0,z:0,w:1});}
    function remove(body){if(!body.basketed)return;body.basketed=false;collected.delete(body.id);}
    function update(phase,pilot){basket.visible=['fruit','fly','hands','explore'].includes(phase);remoteBody.visible=['fly','explore'].includes(phase);remote.visible=remoteBody.visible;for(const body of fruits){if(phase==='fruit' && !body.held && !body.basketed && body.velocity.y<=0 && body.position.y<.18)place(body);if(body.basketed)snap(body);}const axes=pilot?.source.gamepad?.axes || [],offset=axes.length>=4?2:0;sticks[1].rotation.z=-(axes[offset] || 0)*.32;sticks[1].rotation.x=(axes[offset+1] || 0)*.32;lamp.scale.setScalar(pilot?.trigger?1.3:1);}
    return {basket,remote,body:remoteBody,place,remove,update,get full(){return collected.size===3;},snapshot:()=>({collected:[...collected],full:collected.size===3}),reset(){collected.clear();for(const body of fruits)body.basketed=false;}};
}
