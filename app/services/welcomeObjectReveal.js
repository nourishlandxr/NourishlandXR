import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// White mesh silhouettes precede each object. Meshes work in both renderers.
export function createWelcomeObjectReveal(object,{duration=3.6,glowStrength=1}={}){
    const shell=new THREE.Group();shell.name=object.name+' white arrival glow';object.add(shell);
    const materials=new Map(),copies=[],glow=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
    object.updateMatrixWorld(true);const inverse=object.matrixWorld.clone().invert(),meshes=[];
    object.traverse(node=>{if(node.isMesh)meshes.push(node);});
    for(const node of meshes){for(const mat of [node.material].flat())if(mat && !materials.has(mat))materials.set(mat,{opacity:mat.opacity,transparent:mat.transparent,depthWrite:mat.depthWrite});
        const copy=new THREE.Mesh(node.geometry,glow);copy.matrixAutoUpdate=false;copy.matrix.multiplyMatrices(inverse,node.matrixWorld);shell.add(copy);copies.push({copy,node});}
    let complete=false;
    return {removeGlow(){shell.removeFromParent();glow.dispose();},update(age){
        object.visible=age>=0;
        const progress=age*3.6/duration;
        const amount=THREE.MathUtils.smoothstep(progress,glowStrength?1.8:0,3.1);
        shell.visible=glowStrength>0 && age>=0 && progress<3.6;glow.opacity=age<0?0:THREE.MathUtils.smoothstep(progress,0,.8)*(1-THREE.MathUtils.smoothstep(progress,2.5,3.6))*.65*glowStrength;
        if(shell.visible){object.updateMatrixWorld(true);inverse.copy(object.matrixWorld).invert();for(const {copy,node} of copies)copy.matrix.multiplyMatrices(inverse,node.matrixWorld);}
        if(complete && progress>=3.6)return;
        for(const [mat,original] of materials){mat.opacity=original.opacity*amount;mat.transparent=amount<1 || original.transparent;mat.depthWrite=amount>=1 && original.depthWrite;}
        complete=progress>=3.6;
    }};
}
