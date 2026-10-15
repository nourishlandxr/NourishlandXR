import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {NOURISHLAND_PAINT_TIP} from './nourishlandControllerPrototype.js';

// An attachment to the bundled WebXR hardware model, never a replacement grip.
// Button decoration follows the actual mesh and its profile animation hierarchy.
export function createBrushControllerV2(model){
    const group=new THREE.Group();group.name='Brush controller V2 attachment';
    const tip=new THREE.Vector3().copy(NOURISHLAND_PAINT_TIP),back=tip.clone().add(new THREE.Vector3(0,.006,.004));
    model.updateWorldMatrix(true,true);
    const shell=model.getObjectByName('controller_mesh') || model.getObjectByName('controller');
    if(shell){
        const frame=model.parent?.matrixWorld || new THREE.Matrix4(),origin=tip.clone().applyMatrix4(frame),centre=new THREE.Box3().setFromObject(shell).getCenter(new THREE.Vector3()),direction=centre.clone().sub(origin).normalize();
        const hit=new THREE.Raycaster(origin,direction).intersectObject(shell,false)[0];
        if(hit)back.copy(hit.point).addScaledVector(direction,.006).applyMatrix4(frame.clone().invert());
    }
    // A short tapered point grows directly from the controller shell.
    const head=new THREE.Group();head.name='Brush V2 controller-mounted point';head.position.copy(tip);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),tip.clone().sub(back).normalize());group.add(head);
    const geometries=new Set(),material=new THREE.MeshStandardMaterial({color:'#a8b4ad',roughness:.4,metalness:.55}),materials=new Set([material]);
    const fibre=new THREE.MeshStandardMaterial({color:'#33443e',roughness:.9}),pigment=new THREE.MeshStandardMaterial({color:'#86e7d0',roughness:.56});materials.add(fibre);materials.add(pigment);
    const length=Math.max(.006,tip.distanceTo(back)),pointLength=Math.min(.004,length*.24);
    const pointGeometry=new THREE.CylinderGeometry(0,.0032,length,8,1);pointGeometry.rotateX(-Math.PI/2);geometries.add(pointGeometry);
    const point=new THREE.Mesh(pointGeometry,fibre);point.name='Brush V2 direct tapered point';point.position.z=length/2;head.add(point);
    const tipGeometry=new THREE.CylinderGeometry(0,.001,length*.22,6,1);tipGeometry.rotateX(-Math.PI/2);geometries.add(tipGeometry);
    const paintTip=new THREE.Mesh(tipGeometry,pigment);paintTip.name='Brush V2 contact tip';paintTip.position.z=pointLength/2;paintTip.scale.y=.45;head.add(paintTip);
    const fascia=[];
    model.updateMatrixWorld(true);
    for(const name of ['a_button','b_button','x_button','y_button']){
        const button=model.getObjectByName(name);if(!button?.isMesh)continue;
        button.geometry.computeBoundingBox();const box=button.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
        const axis=['x','y','z'].sort((a,b)=>size[a]-size[b])[0],normal=new THREE.Vector3();normal[axis]=1;
        const worldNormal=normal.clone().transformDirection(button.matrixWorld);if(worldNormal.y<0)normal.negate();
        const dimensions=['x','y','z'].filter(a=>a!==axis),radius=Math.min(...dimensions.map(a=>size[a]))*.51;
        const bezel=new THREE.Mesh(new THREE.TorusGeometry(radius,.0007,5,24),material);bezel.name='Brush V2 raised bezel · '+name;
        bezel.position.copy(center).addScaledVector(normal,size[axis]*.43);bezel.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);button.add(bezel);fascia.push(bezel);
    }
    group.visible=false;fascia.forEach(n=>n.visible=false);
    return {group,update(active,colour){group.visible=active;fascia.forEach(n=>n.visible=active);if(colour)pigment.color.set(colour);},destroy(){group.removeFromParent();geometries.forEach(g=>g.dispose());for(const n of fascia){n.removeFromParent();n.geometry.dispose();}materials.forEach(m=>m.dispose());}};
}
