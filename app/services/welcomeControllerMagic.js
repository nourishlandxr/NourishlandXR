import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const WELCOME_HAND_MAGIC=Object.freeze({delay:.45,duration:4.2,stagger:.8});
const ease=t=>t*t*(3-2*t);
export function welcomeHandMagicProgress(age,side){
    const offset=WELCOME_HAND_MAGIC.delay+(side==='right'?WELCOME_HAND_MAGIC.stagger:0);
    return ease(Math.max(0,Math.min(1,(age-offset)/WELCOME_HAND_MAGIC.duration)));
}
// Coordinate in controller grip space, normalized from handle to button deck.
export function welcomeControllerMagicPlane(matrix,min,max){
    const inverse=new THREE.Matrix4().fromArray(matrix).invert().elements,range=Math.max(.001,max-min);
    return [inverse[1]/range,inverse[5]/range,inverse[9]/range,(inverse[13]-min)/range];
}

// Small sparks follow the moving surface boundary. No surrounding bubble.
export function createWelcomeControllerSparks(group,min,max){
    const geometry=new THREE.IcosahedronGeometry(1,0),material=new THREE.MeshBasicMaterial({color:'#fff2b0',transparent:true,opacity:.95,depthWrite:false});
    const sparks=new THREE.InstancedMesh(geometry,material,64);sparks.name='Magic sparks at controller transformation';sparks.frustumCulled=false;sparks.visible=false;group.add(sparks);
    const pose=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
    return {update(progress,time){
        sparks.visible=progress>0 && progress<1;if(!sparks.visible)return;
        for(let i=0;i<64;i++){
            const angle=i*2.399963+time*.65,life=(time*1.4+i*.137)%1,radius=.027+life*.042;
            position.set(Math.cos(angle)*radius,min+(max-min)*progress+(life-.5)*.018,Math.sin(angle)*radius);
            scale.setScalar((.002+.0032*Math.sin(i*1.7)**2)*(1-life));pose.compose(position,rotation,scale);sparks.setMatrixAt(i,pose);
        }
        sparks.instanceMatrix.needsUpdate=true;
    },destroy(){group.remove(sparks);geometry.dispose();material.dispose();}};
}
