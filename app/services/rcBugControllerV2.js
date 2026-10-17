import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Small flight controls attach to the bundled Meta controller. The hardware
// grip, trigger, thumbstick and labeled face buttons remain the real model.
export function createRcBugControllerV2(model){
    const group=new THREE.Group();group.name='RC Bug controller V2 flight controls';
    const geometries=new Set(),materials=new Set();
    const material=(colour,roughness=.42,metalness=.12)=>{const value=new THREE.MeshStandardMaterial({color:colour,roughness,metalness});materials.add(value);return value;};
    const shell=material('#526d60',.48,.16),edge=material('#d6bd78',.38,.34),wing=material('#9bd5c9',.28,.18),bee=material('#e4bd62',.36,.12),firefly=material('#62c6cf',.3,.15);
    const mesh=(geometry,mat,name,parent=group)=>{geometries.add(geometry);const node=new THREE.Mesh(geometry,mat);node.name=name;node.castShadow=true;parent.add(node);return node;};

    // Low profile flight pod at the controller nose; it adds no hand extension.
    const pod=new THREE.Group();pod.name='Controller-mounted insect flight pod';pod.position.set(0,-.031,-.061);group.add(pod);
    const base=mesh(new THREE.SphereGeometry(.0068,16,10),shell,'Flight pod base',pod);base.scale.set(1,.42,1.18);
    const rim=mesh(new THREE.TorusGeometry(.006,.00065,5,28),edge,'Raised flight pod rim',pod);rim.rotation.x=Math.PI/2;rim.position.y=.0025;
    const body=mesh(new THREE.SphereGeometry(.0021,12,8),bee,'Bee / firefly selector',pod);body.scale.set(.75,.65,1.6);body.position.y=.004;
    const wings=[];for(const side of [-1,1]){const item=mesh(new THREE.SphereGeometry(.0026,10,8),wing,'Flight pod wing',pod);item.position.set(side*.0025,.004,.0001);item.scale.set(.65,.28,1.5);item.rotation.y=side*.22;wings.push(item);}
    const glowMaterial=material('#79dce3',.25,.08);glowMaterial.emissive.set('#40b9c2');glowMaterial.emissiveIntensity=.08;
    const indicator=mesh(new THREE.SphereGeometry(.0012,10,8),glowMaterial,'Flight status indicator',pod);indicator.position.set(0,.004,-.0038);

    // Slim raised rings follow real button faces, preserving Meta labels and travel.
    const bezels=[];
    for(const name of ['a_button','b_button','thumbstick']){
        const button=model.getObjectByName(name);if(!button?.isMesh)continue;
        button.geometry.computeBoundingBox();const box=button.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());
        const axis=['x','y','z'].sort((a,b)=>size[a]-size[b])[0],normal=new THREE.Vector3();normal[axis]=1;
        const worldNormal=normal.clone().transformDirection(button.matrixWorld);if(worldNormal.y<0)normal.negate();
        const dimensions=['x','y','z'].filter(a=>a!==axis),radius=Math.min(...dimensions.map(a=>size[a]))*.55;
        const bezel=mesh(new THREE.TorusGeometry(radius,.00065,5,24),name==='a_button'?firefly:edge,'RC Bug V2 bezel · '+name,button);
        bezel.position.copy(centre).addScaledVector(normal,size[axis]*.48);bezel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);bezels.push(bezel);
    }
    group.visible=false;model.add(group);
    return {group,update(active,{flying=false,speed=0,companion='bee'}={}){
        group.visible=Boolean(active);if(!active)return;
        body.material=companion==='firefly'?firefly:bee;
        const pulse=flying?.22+.5*Math.min(1,Math.max(0,speed)):.06;
        glowMaterial.emissiveIntensity=pulse;indicator.scale.setScalar(flying?1.25:1);
        wings.forEach((item,index)=>{item.rotation.z=(index?1:-1)*(flying?.12:0);});
    },destroy(){group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
