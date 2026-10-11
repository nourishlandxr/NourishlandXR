import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createPracticeBody} from './welcomePracticePhysics.js';

// A small, procedural tactile activity: plant first, pour second, grow third.
// Growth is deliberately sped up for practice; it is not a real germination timer.
export function createWelcomePlantPractice(root){
    const pot=new THREE.Group();pot.position.set(0,0,-.08);root.add(pot);
    const material=colour=>new THREE.MeshStandardMaterial({color:colour,roughness:.85});
    const clay=material('#b9c7b1'),soil=material('#726552'),green=material('#94b189'),water=new THREE.MeshBasicMaterial({color:'#acd9df',transparent:true,opacity:.75,depthWrite:false});
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(.072,.052,.085,32,1,true),clay);wall.position.y=.044;pot.add(wall);
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.07,.006,6,32),clay);lip.rotation.x=Math.PI/2;lip.position.y=.09;pot.add(lip);
    const dirt=new THREE.Mesh(new THREE.CylinderGeometry(.064,.064,.008,32),soil);dirt.position.y=.078;pot.add(dirt);
    const target=new THREE.Mesh(new THREE.TorusGeometry(.026,.0015,5,24),new THREE.MeshBasicMaterial({color:'#efdaac'}));target.rotation.x=Math.PI/2;target.position.y=.083;pot.add(target);
    const seedBody=createPracticeBody('seed',{x:-.2,z:.17,radius:.019,halfSize:{x:.019,y:.013,z:.012},bounce:.08});
    const canBody=createPracticeBody('watering-can',{x:.24,z:.16,radius:.075,halfSize:{x:.07,y:.047,z:.041},bounce:.08});
    const seed=new THREE.Group(),can=new THREE.Group();root.add(seed,can);
    const kernel=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),material('#d1b482'));kernel.scale.set(.019,.013,.012);seed.add(kernel);
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.041,.035,.085,24),material('#cad6be'));can.add(shell);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.04,.006,6,24,Math.PI*1.8),clay);handle.position.set(-.04,.004,0);handle.rotation.z=.3;can.add(handle);
    const spoutDirection=new THREE.Vector3(.074,.05,0).normalize(),spout=new THREE.Mesh(new THREE.CylinderGeometry(.011,.015,.09,12),clay);spout.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),spoutDirection);spout.position.set(.064,.012,0);can.add(spout);
    const tip=new THREE.Vector3(.101,.037,0),growth=new THREE.Group();growth.position.y=.08;pot.add(growth);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.002,.003,.18,8),green);stem.position.y=.09;growth.add(stem);
    const leaves=[];for(const [side,y] of [[-1,.065],[1,.085],[-1,.12],[1,.15]]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),green);leaf.scale.set(.045,.004,.015);leaf.rotation.z=side*.4;leaf.position.set(side*.031,y,0);growth.add(leaf);leaves.push(leaf);}
    const drops=[];for(let i=0;i<8;i++){const drop=new THREE.Mesh(new THREE.SphereGeometry(.003,6,4),water);drop.visible=false;root.add(drop);drops.push(drop);}
    let planted=false,poured=0,growTime=0,elapsed=0,pouring=false;
    function reset(){planted=false;poured=0;growTime=0;pouring=false;seedBody.visible=true;growth.visible=false;}
    function plant(body){if(body.id!=='seed' || planted)return false;const p=body.position;if(Math.hypot(p.x-pot.position.x,p.z-pot.position.z)>.052 || p.y<.06 || p.y>.23)return false;planted=true;seedBody.visible=false;target.visible=false;return true;}
    function update(dt,phase){elapsed+=dt;const visible=['seed','water','grow','explore'].includes(phase);pot.visible=visible;growth.visible=visible && poured>=1.2;target.visible=visible && !planted;
        seedBody.visible=visible && !planted;canBody.visible=visible && phase!=='seed';
        seed.visible=seedBody.visible;can.visible=canBody.visible;
        pouring=false;
        if(visible && planted && poured<1.2 && canBody.held && ['water','explore'].includes(phase)){
            const q=new THREE.Quaternion(canBody.rotation.x,canBody.rotation.y,canBody.rotation.z,canBody.rotation.w),origin=tip.clone().applyQuaternion(q).add(new THREE.Vector3(canBody.position.x,canBody.position.y,canBody.position.z)),direction=spoutDirection.clone().applyQuaternion(q);
            pouring=direction.y<-.15 && origin.y>.1 && origin.y<.45 && Math.hypot(origin.x-pot.position.x,origin.z-pot.position.z)<.055;
            if(pouring){poured=Math.min(1.2,poured+dt);drops.forEach((drop,i)=>{const t=(elapsed*2+i/8)%1;drop.position.set(origin.x,THREE.MathUtils.lerp(origin.y,.084,t),origin.z);});}
        }
        drops.forEach(d=>d.visible=pouring);if(growth.visible){if(phase==='grow' || phase==='explore')growTime+=dt;const amount=THREE.MathUtils.smoothstep(growTime,0,4);growth.scale.setScalar(.05+.95*amount);leaves.forEach((leaf,i)=>leaf.rotation.y=Math.sin(elapsed*1.2+i)*.06);}
    }
    return {bodies:[seedBody,canBody],objects:new Map([['seed',seed],['watering-can',can]]),plant,update,reset,previewPhase(phase){if(phase==='water' || phase==='grow'){planted=true;seedBody.visible=false;poured=phase==='grow'?1.2:0;growTime=0;}},get planted(){return planted;},get watered(){return poured>=1.2;},get grown(){return growTime>=4;},get pouring(){return pouring;},snapshot:()=>({planted,water:poured/1.2,grown:growTime>=4,pouring})};
}
