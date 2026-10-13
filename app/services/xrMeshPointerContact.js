import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// Hit the same visible geometry as the XR renderer, including current morphs.
// The optional outer transform is the native renderer's model matrix.
export function createMeshPointerContact(){
    const caster=new THREE.Raycaster(),worldRay=new THREE.Ray(),inverse=new THREE.Matrix4(),localRay=new THREE.Ray(),meshes=[],cache=new WeakMap();
    return (ray,root,{matrix=null,kind='surface',id=kind,frameToken=null}={})=>{
        if(!root || !ray?.origin || !ray.direction)return null;
        for(let node=root;node;node=node.parent)if(!node.visible)return null;
        root.updateWorldMatrix(true,false);
        const key=frameToken===null?null:[frameToken,kind,ray.origin.x,ray.origin.y,ray.origin.z,ray.direction.x,ray.direction.y,ray.direction.z,...root.matrixWorld.elements,...(matrix || [])].join('|');
        if(key && cache.get(root)?.key===key)return cache.get(root).hit;
        worldRay.origin.copy(ray.origin);worldRay.direction.copy(ray.direction);if(worldRay.direction.lengthSq()<1e-10)return null;worldRay.direction.normalize();
        localRay.copy(worldRay);if(matrix){inverse.fromArray(matrix).invert();localRay.applyMatrix4(inverse);}
        caster.set(localRay.origin,localRay.direction);root.updateWorldMatrix(true,true);meshes.length=0;
        root.traverseVisible(node=>{if(node.isMesh && !node.userData.pointerIgnore && [node.material].flat().some(material=>material?.visible!==false && (material?.opacity ?? 1)>.03))meshes.push(node);});
        const hit=caster.intersectObjects(meshes,false)[0];if(!hit){if(key)cache.set(root,{key,hit:null});return null;}
        const point=hit.point.clone();if(matrix)point.applyMatrix4(new THREE.Matrix4().fromArray(matrix));
        const contact={kind,id,distance:point.distanceTo(worldRay.origin),point,worldPoint:point,object:hit.object};if(key)cache.set(root,{key,hit:contact});return contact;
    };
}
