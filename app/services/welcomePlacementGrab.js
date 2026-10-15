import * as THREE from '../assets/fruit-window/vendor/three.module.js';

// One pose-relative owner; aiming direction never becomes an implicit floor plane.
export function createWelcomePlacementGrab(target){
    let owner=null,offset=null;
    return {get owner(){return owner;},begin(source,matrix){if(owner || !matrix)return false;target.updateMatrix();owner=source;offset=new THREE.Matrix4().fromArray(matrix).invert().multiply(target.matrix);return true;},
        update(inputs){if(!owner)return false;const input=inputs.find(i=>i.source===owner),down=input && (input.down || input.trigger || input.source.gamepad?.buttons?.some(b=>b.pressed));if(!input?.matrix || !down){owner=null;offset=null;return true;}const pose=new THREE.Matrix4().fromArray(input.matrix).multiply(offset);pose.decompose(target.position,target.quaternion,target.scale);const yaw=new THREE.Euler().setFromQuaternion(target.quaternion,'YXZ').y;target.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),yaw);target.updateMatrixWorld(true);return false;},
        cancel(){owner=null;offset=null;}};
}
