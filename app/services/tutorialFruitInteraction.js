import * as THREE from '../assets/fruit-window/vendor/three.module.js';
// Normalize authored whole and cut variants independently while retaining their materials.
export function prepareTutorialFruit(model,extent,{normalized=false}={}){
    model.updateMatrixWorld(true);const box=new THREE.Box3();
    if(normalized){const point=new THREE.Vector3();model.traverse(node=>{if(!node.isMesh)return;for(let i=0;i<node.geometry.attributes.position.count;i++){node.getVertexPosition(i,point);box.expandByPoint(point.applyMatrix4(node.matrixWorld));}});}else box.setFromObject(model);
    const size=box.getSize(new THREE.Vector3()),center=normalized?new THREE.Vector3():box.getCenter(new THREE.Vector3()),factor=normalized?extent:extent/Math.max(size.x,size.y,size.z);
    const group=new THREE.Group(),offset=new THREE.Group();group.scale.setScalar(factor);offset.position.copy(center).negate();offset.add(model);group.add(offset);
    return {group,halfSize:{x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)},axis:['x','y','z'].sort((a,b)=>size[a]-size[b])[0]};
}
export function tutorialFruitPrompt(info,canOpen){return info.peel?'Hold your banana with one hand. Use your other hand to peel down its length.':canOpen?'Hold the fruit with both hands and gently pull outward to open it. Then place it on the plate.':'Inspect your fruit, then place it on the plate.';}
