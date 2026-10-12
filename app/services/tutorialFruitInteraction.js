import * as THREE from '../assets/fruit-window/vendor/three.module.js';
// Normalize authored whole and cut variants independently while retaining their materials.
export function prepareTutorialFruit(model,extent){
    model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),factor=extent/Math.max(size.x,size.y,size.z);
    const group=new THREE.Group(),offset=new THREE.Group();group.scale.setScalar(factor);offset.position.copy(center).negate();offset.add(model);group.add(offset);
    return {group,halfSize:{x:Math.max(.01,size.x*factor/2),y:Math.max(.012,size.y*factor/2),z:Math.max(.01,size.z*factor/2)},axis:['x','y','z'].sort((a,b)=>size[a]-size[b])[0]};
}
export function tutorialFruitPrompt(info,canOpen){return canOpen?`${info.label}. Want to see inside? Hold it in one hand. With your other hand, hold the brush trigger and sweep the glowing tip across it. Release trigger to open.`:`${info.label}. Let’s leave opening that one for later. Pop it on the plate and try another.`;}
