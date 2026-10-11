import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// A small living guide, built from meshes so it also renders in native WebXR.
export function createZinniaCharacter(){
    const root=new THREE.Group();root.name='Zinnia';
    const green=new THREE.MeshStandardMaterial({color:'#658447',roughness:.85});
    const pink=new THREE.MeshStandardMaterial({color:'#df769a',roughness:.7});
    const gold=new THREE.MeshStandardMaterial({color:'#edbf58',roughness:.85});
    const dark=new THREE.MeshBasicMaterial({color:'#35412d'});
    const white=new THREE.MeshBasicMaterial({color:'#fff8e7'});
    const sphere=new THREE.SphereGeometry(1,16,10);
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.006,.008,.20,10),green);stem.position.y=.10;root.add(stem);
    for(const side of [-1,1]){const leaf=new THREE.Mesh(sphere,green);leaf.scale.set(.055,.008,.019);leaf.position.set(side*.035,.075+side*.015,0);leaf.rotation.z=side*.42;root.add(leaf);}
    const face=new THREE.Group();face.position.set(0,.218,0);root.add(face);
    for(let ring=0;ring<2;ring++)for(let i=0;i<12;i++){const angle=i*Math.PI/6+ring*Math.PI/12,radius=ring?.045:.062;
        const petal=new THREE.Mesh(sphere,pink);petal.scale.set(ring?.018:.022,ring?.039:.043,.010);petal.position.set(Math.sin(angle)*radius,Math.cos(angle)*radius,-.008-ring*.004);petal.rotation.z=-angle;face.add(petal);}
    const centre=new THREE.Mesh(sphere,gold);centre.scale.set(.042,.042,.017);face.add(centre);
    const eyes=[];
    for(const side of [-1,1]){const eye=new THREE.Mesh(sphere,dark);eye.position.set(side*.015,.009,.017);eye.scale.set(.0045,.007,.0025);face.add(eye);eyes.push(eye);
        const glint=new THREE.Mesh(sphere,white);glint.position.set(side*.015-.001,.012,.019);glint.scale.setScalar(.0015);face.add(glint);}
    const smile=new THREE.Mesh(new THREE.TorusGeometry(.010,.0015,6,16,Math.PI),dark);smile.rotation.z=Math.PI;smile.position.set(0,-.009,.017);face.add(smile);
    root.userData.zinnia={face,eyes,smile};return root;
}

export function animateZinniaCharacter(root,time,speaking=false){
    const parts=root?.userData.zinnia;if(!parts)return;
    parts.face.rotation.z=Math.sin(time*.85)*.065;
    parts.face.rotation.y=Math.sin(time*.55)*.09;
    const blink=time%5.3>5.12;
    for(const eye of parts.eyes)eye.scale.y=blink?.001:.007;
    parts.smile.scale.y=speaking?.85+Math.sin(time*11)*.3:1;
}
