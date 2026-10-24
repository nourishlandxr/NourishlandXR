import * as THREE from '../vendor/three.module.min.js';

// Educational silhouettes, not species-specific root predictions. One mesh per plant.
export function createFoodForestRoots(layer,variant=0){
    const depth=({canopy:.9,'small-tree':.68,shrub:.43,herb:.3,groundcover:.2,root:.42,climber:.48})[layer]||.4;
    const positions=[],normals=[];
    function branch(points,radius){
        const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),8,radius,4,false).toNonIndexed();
        positions.push(...geometry.attributes.position.array);normals.push(...geometry.attributes.normal.array);geometry.dispose();
    }
    branch([new THREE.Vector3(0,0,0),new THREE.Vector3(.025,-depth*.4,0),new THREE.Vector3(-.025,-depth,0)],.019);
    for(let i=0;i<5;i++){
        const angle=i/5*Math.PI*2+variant*.52,reach=depth*(.38+(i%3)*.13),start=new THREE.Vector3(0,-.04-(i%2)*depth*.16,0);
        const tip=new THREE.Vector3(Math.cos(angle)*reach,-depth*(.55+(i%3)*.12),Math.sin(angle)*reach);
        branch([start,new THREE.Vector3(tip.x*.65,-depth*.26,tip.z*.65),tip],.012);
        const twig=tip.clone().multiplyScalar(.82);twig.y-=depth*.17;
        branch([new THREE.Vector3(tip.x*.65,-depth*.26,tip.z*.65),tip.clone().lerp(twig,.5),twig],.006);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({color:0xa26a38,roughness:1}),group=new THREE.Group();group.add(new THREE.Mesh(geometry,material));
    return {group,dispose(){geometry.dispose();material.dispose();group.removeFromParent();}};
}
