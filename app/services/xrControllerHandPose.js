import * as THREE from '../vendor/three.module.min.js';

export function controllerHandParents(names){
    const chains=[['wrist','thumb-metacarpal','thumb-phalanx-proximal','thumb-phalanx-distal','thumb-tip'],
        ...['index','middle','ring','pinky'].map(finger=>['wrist',finger+'-finger-metacarpal',finger+'-finger-phalanx-proximal',finger+'-finger-phalanx-intermediate',finger+'-finger-phalanx-distal',finger+'-finger-tip'])];
    const parentNames=new Map(chains.flatMap(chain=>chain.slice(1).map((name,i)=>[name,chain[i]])));
    return names.map(name=>names.indexOf(parentNames.get(name)));
}

export function controllerHandFlexAxes(names,parents,bind,wristIndex,side){
    const position=i=>new THREE.Vector3().setFromMatrixPosition(bind[i]),wrist=position(wristIndex);
    const index=position(names.indexOf('index-finger-phalanx-proximal')).sub(wrist);
    const pinky=position(names.indexOf('pinky-finger-phalanx-proximal')).sub(wrist);
    // These assets mirror X while keeping the finger order in Z. Orient the
    // palm normal explicitly so both hands close toward their own palm.
    const palm=new THREE.Vector3().crossVectors(index,pinky).normalize().multiplyScalar(side==='left'?-1:1);
    const centre=new THREE.Vector3();
    for(const finger of ['index','middle','ring','pinky'])for(const joint of ['metacarpal','phalanx-proximal'])centre.add(position(names.indexOf(finger+'-finger-'+joint)));
    centre.multiplyScalar(1/8);
    return names.map((name,i)=>{
        const child=parents.findIndex(parent=>parent===i);if(child<0)return new THREE.Vector3(1,0,0);
        const direction=position(child).sub(position(i)).normalize();
        // The thumb opposes across the palm. Reusing the fingers' flexion
        // plane sends its mirrored, angled chain sideways away from the grasp.
        if(name.startsWith('thumb-'))return new THREE.Vector3().crossVectors(direction,centre.clone().sub(position(child))).normalize().transformDirection(bind[i].clone().invert());
        return new THREE.Vector3().crossVectors(direction,palm).normalize().transformDirection(bind[i].clone().invert());
    });
}

export function controllerHandJointPoses(rig,controller){
    const buttons=controller.source.gamepad?.buttons || [];
    // Capacitive contact and residual analogue values are not a closed hand.
    // Release returns exactly to the authored open pose on this frame.
    const pressure=(button,fallback=0)=>{
        if(button?.pressed===false)return 0;
        const value=Number(button?.value??(button?.pressed?1:fallback));
        return THREE.MathUtils.clamp(Number.isFinite(value)?value:0,0,1);
    };
    const trigger=pressure(buttons[0],Number(Boolean(controller.trigger)));
    const grip=pressure(buttons[1],controller.down===false?0:controller.grip??Number(Boolean(controller.down)));
    const thumb=Math.max(...buttons.slice(3).map(button=>pressure(button)),0);
    const posed=[];
    const poseJoint=i=>{
        if(posed[i])return posed[i];
        const parent=rig.parents[i],name=rig.names[i],finger=name.split('-')[0];
        const world=parent<0?rig.bind[i].clone():poseJoint(parent).clone().multiply(rig.bind[parent].clone().invert().multiply(rig.bind[i]));
        const amount=finger==='thumb'?(name.includes('metacarpal')?.65:name.includes('proximal')?1.05:name.includes('distal')?.8:0):name.includes('proximal')?.85:name.includes('intermediate')?1.05:name.includes('distal')?.65:0;
        const curl=finger==='thumb'?Math.max(thumb,grip*.95):finger==='index'?trigger:grip;
        if(amount)world.multiply(new THREE.Matrix4().makeRotationAxis(rig.flexAxes[i],amount*curl));
        return posed[i]=world;
    };
    return rig.names.map((name,i)=>poseJoint(i));
}

export function controllerHandGripMatrix(rig,controllerMatrix){
    // XR grip space sits inside the held handle, at the palm rather than wrist.
    // Use the bind palm so raising the index never shifts the entire hand.
    const palm=new THREE.Vector3();
    for(const finger of ['index','middle','ring','pinky'])for(const joint of ['metacarpal','phalanx-proximal'])palm.add(new THREE.Vector3().setFromMatrixPosition(rig.bind[rig.names.indexOf(finger+'-finger-'+joint)]));
    palm.multiplyScalar(1/8);
    // The controller origin is inside its handle, not on the skin of the palm.
    // Move the palm back toward the wrist and outside that handle, with mirrored
    // offsets. Pitch down from the old flat pointing pose to the holding pose.
    const side=rig.side || (new THREE.Vector3().setFromMatrixPosition(rig.bind[rig.wristIndex]).x<0?'left':'right');
    const lateral=side==='left'?-.025:.025;
    return new THREE.Matrix4().fromArray(controllerMatrix).multiply(new THREE.Matrix4().makeTranslation(lateral,-.012,.035)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2-.32)).multiply(new THREE.Matrix4().makeTranslation(-palm.x,-palm.y,-palm.z));
}
