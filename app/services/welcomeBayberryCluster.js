import * as THREE from '../assets/fruit-window/vendor/three.module.js';
// Five shared fruit instances form one grabbable sprig, including a cut stem.
export function createWelcomeBayberryCluster(model){
 model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),factor=.029/Math.max(size.x,size.y,size.z),fruit=new THREE.Group();fruit.scale.setScalar(factor);fruit.position.copy(centre).multiplyScalar(-factor);fruit.add(model);
 const group=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:'#876847',roughness:1}),leafMat=new THREE.MeshStandardMaterial({color:'#73905d',roughness:.9,side:THREE.DoubleSide});
 const stick=new THREE.Mesh(new THREE.CylinderGeometry(.0024,.0032,.13,8),wood);stick.rotation.z=-.36;stick.position.set(0,.008,0);group.add(stick);
 for(const [x,y,z] of [[-.027,-.039,.012],[.012,-.025,.014],[-.006,.002,.016],[.037,.018,.010],[.009,.037,-.013]]){const berry=fruit.clone(true);const holder=new THREE.Group();holder.position.set(x,y,z);holder.add(berry);group.add(holder);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.001,.001,.027,6),wood);stem.position.set(x*.5,y,z*.5);stem.rotation.z=Math.PI/2;group.add(stem);}
 const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.016,.015,-.015,.038,0,.055);shape.bezierCurveTo(.016,.038,.013,.015,0,0);const geo=new THREE.ShapeGeometry(shape,8);
 for(const [x,y,z,angle] of [[-.014,.04,-.004,.9],[.015,.05,-.002,-.75],[-.03,-.01,-.008,1.25]]){const leaf=new THREE.Mesh(geo,leafMat);leaf.position.set(x,y,z);leaf.rotation.z=angle;leaf.rotation.x=-.35;group.add(leaf);}
 group.rotation.x=-Math.PI/2;return group;
}
