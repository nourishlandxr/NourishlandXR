import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {PAINT_V2_COLOURS} from './spatialPaintV2.js';

export function createSpatialPaintTip(parent){
    const root=new THREE.Group();root.name='Selected paint tip';parent.add(root);
    const pigment=new THREE.MeshBasicMaterial({color:PAINT_V2_COLOURS[0],side:THREE.DoubleSide}),white=new THREE.MeshBasicMaterial({color:'#e5f5e8',side:THREE.DoubleSide});
    const triangle=new THREE.Mesh(new THREE.ConeGeometry(.0065,.012,3),pigment);triangle.rotation.x=-Math.PI/2;root.add(triangle);
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(.0065,12,8),new THREE.MeshBasicMaterial({color:PAINT_V2_COLOURS[0],transparent:true,opacity:.48,depthWrite:false}));root.add(sphere);
    const dots=new THREE.Group();root.add(dots);const dotGeometry=new THREE.SphereGeometry(.00065,5,4);
    for(let i=0;i<12;i++){const dot=new THREE.Mesh(dotGeometry,white),a=i*2.4,r=.0035*Math.sqrt((i+.5)/12);dot.position.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(i)*.002);dots.add(dot);}
    const wave=new THREE.Mesh(new THREE.TorusGeometry(.008,.0007,5,20),pigment);root.add(wave);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,4),pigment);leaf.scale.set(.0025,.006,.0007);leaf.position.set(.007,.002,0);leaf.rotation.z=-.6;root.add(leaf);
    const lights=new THREE.Group();root.add(lights);for(let i=0;i<3;i++){const light=new THREE.Mesh(dotGeometry,white);light.position.set(Math.cos(i*2.1)*.008,Math.sin(i*2.1)*.008,0);lights.add(light);}
    root.visible=false;
    return {root,update(snapshot,time=0){const colour=PAINT_V2_COLOURS[snapshot.colour] || PAINT_V2_COLOURS[0],brush=snapshot.brush,clock=snapshot.motion===false?0:time;root.visible=true;pigment.color.set(colour);sphere.material.color.set(colour);triangle.visible=brush!=='spray';sphere.visible=dots.visible=brush==='spray';wave.visible=brush==='water';leaf.visible=brush==='vine';lights.visible=brush==='firefly';wave.scale.setScalar(1+.1*Math.sin(clock*3));lights.rotation.z=clock*.8;},hide(){root.visible=false;},destroy(){root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)materials.add(node.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
