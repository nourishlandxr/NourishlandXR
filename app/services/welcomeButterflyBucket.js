import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {loadTrialButterflies} from './welcomeTrialButterflies.js';

// Every perch is rebuilt from the current tracked joints. No frozen hand targets.
export function createWelcomeButterflyBucket(root,{onAssets=()=>{},onFeedback=()=>{},load=loadTrialButterflies}={}){
    const bucket=new THREE.Group();bucket.name='Hand tracking butterfly bucket';bucket.position.set(-.28,.08,.08);root.add(bucket);
    const material=new THREE.MeshStandardMaterial({color:'#b6d2c0',roughness:.75,side:THREE.DoubleSide});
    const shell=new THREE.Mesh(new THREE.CylinderGeometry(.10,.08,.15,32,1,true),material);bucket.add(shell);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.006,32),material);base.position.y=-.073;bucket.add(base);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.105,.005,8,32,Math.PI),material);bucket.add(handle);handle.position.y=.06;
    let insects=[],disposed=false,asset='loading',time=0,released=0,landed=0,burst=false;
    const holds=new Map(),edges=new Map(),inverse=new THREE.Matrix4();
    const loading=Promise.resolve().then(load).then(models=>{insects=models.map((mesh,i)=>({mesh,state:'bucket',flyUntil:0,home:new THREE.Vector3((i%2-.5)*.065,.035,Math.floor(i/2)*.045-.023)}));
        for(const insect of insects){insect.mesh.scale.setScalar(.055);root.add(insect.mesh);insect.mesh.position.copy(bucket.position).add(insect.home);}
        if(disposed){destroyModels();return;}asset='ready';onAssets();
    }).catch(error=>{if(!disposed){asset='error';console.warn('Butterfly bucket:',error.message);onAssets();}});
    function destroyModels(){const geometries=new Set(),materials=new Set(),textures=new Set();for(const {mesh} of insects){mesh.removeFromParent();mesh.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);if(m.map)textures.add(m.map);}});}geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
    const poseOf=input=>{const matrix=new THREE.Matrix4().fromArray(input.matrix);if(input.pinchPoint)matrix.setPosition(input.pinchPoint.x,input.pinchPoint.y,input.pinchPoint.z);return matrix.premultiply(inverse);};
    function fly(insect,source,credit=true){insect.state='flying';insect.flyUntil=time+2.2;insect.perch=null;if(credit){released++;onFeedback('release',source);}}
    function release(source,credit=true){const hold=holds.get(source);if(!hold)return;holds.delete(source);if(hold.insect)fly(hold.insect,source,credit);}
    function perches(inputs){const result=[];for(const input of inputs){if(input.trigger || input.fist)continue;const pose=poseOf(input),q=new THREE.Quaternion().setFromRotationMatrix(pose);
        const names=['index-finger-phalanx-proximal','middle-finger-phalanx-proximal','ring-finger-phalanx-proximal','pinky-finger-phalanx-proximal'];
        for(let i=0;i<4;i++){const joint=input.joints?.get(names[i]);const point=joint?new THREE.Vector3(joint.x,joint.y,joint.z).applyMatrix4(inverse):new THREE.Vector3((i-1.5)*.018,.018,-.035).applyMatrix4(pose);
            // A small offset keeps feet above the tracked hand surface.
            point.add(new THREE.Vector3(0,.007,0).applyQuaternion(q));result.push({source:input.source,point,q,index:i});}}
        return result;
    }
    function update(dt,inputs=[]){
        root.updateMatrixWorld(true);inverse.copy(root.matrixWorld).invert();const usable=inputs.filter(i=>i.matrix && !i.uiBlocked && i.source.hand);
        for(const source of holds.keys())if(!usable.some(i=>i.source===source))release(source,false);
        for(const source of edges.keys())if(!usable.some(i=>i.source===source))edges.delete(source);
        if(dt<=0)return;time+=Math.min(.06,dt);
        for(const input of usable){const pose=poseOf(input),point=new THREE.Vector3().setFromMatrixPosition(pose),down=Boolean(input.trigger);let hold=holds.get(input.source);
            if(hold && !down){release(input.source);hold=null;}
            if(!hold && down && edges.get(input.source)===false){const occupied=new Set([...holds.values()].map(h=>h.insect));const insect=insects.filter(i=>!occupied.has(i)).sort((a,b)=>a.mesh.position.distanceTo(point)-b.mesh.position.distanceTo(point)).find(i=>i.mesh.position.distanceTo(point)<.065);
                const target=insect?.mesh || (point.distanceTo(bucket.position.clone().add(new THREE.Vector3(0,.10,0)))<.085 && ![...holds.values()].some(h=>!h.insect)?bucket:null);
                if(target){target.updateMatrix();hold={mesh:target,insect,offset:pose.clone().invert().multiply(target.matrix)};holds.set(input.source,hold);if(insect)insect.state='held';onFeedback('grab',input.source);}}
            if(hold){pose.multiply(hold.offset).decompose(hold.mesh.position,hold.mesh.quaternion,hold.mesh.scale);if(!hold.insect && bucket.position.y>.22 && !burst){burst=true;for(const insect of insects)if(insect.state==='bucket')fly(insect,input.source,false);onFeedback('magic',input.source);}}
            edges.set(input.source,down);
        }
        const targets=perches(usable);
        insects.forEach((insect,i)=>{
            if(insect.state==='held')return;
            if(insect.state==='bucket')insect.mesh.position.copy(insect.home).applyQuaternion(bucket.quaternion).add(bucket.position);
            else {
                const target=targets.length?targets[i%targets.length]:null;
                if(!target && insect.state==='landed')fly(insect,null,false);
                if(target && time>=insect.flyUntil){const distance=insect.mesh.position.distanceTo(target.point);if(distance<.012 && insect.state!=='landed'){insect.state='landed';landed++;onFeedback('collect',target.source);}insect.mesh.position.lerp(target.point,1-Math.exp(-dt*5));insect.mesh.quaternion.slerp(target.q,1-Math.exp(-dt*5));insect.perch={hand:target.source.handedness,joint:target.index};}
                else {const targetPoint=new THREE.Vector3(Math.sin(time*1.9+i*1.7)*.25,.35+Math.sin(time*2+i)*.09,.06+Math.cos(time*1.4+i)*.18);insect.mesh.position.lerp(targetPoint,1-Math.exp(-dt*3));insect.mesh.rotation.y=time+i;}
            }
            insect.mesh.traverse(n=>{if(n.morphTargetInfluences)n.morphTargetInfluences[0]=insect.state==='landed'?.08:.5+.5*Math.sin(time*22+i);});
        });
    }
    function reset(){holds.clear();edges.clear();released=landed=0;burst=false;bucket.position.set(-.28,.08,.08);bucket.quaternion.identity();for(const insect of insects){insect.state='bucket';insect.perch=null;insect.mesh.position.copy(bucket.position).add(insect.home);}}
    return {bucket,loading,update,reset,targets:()=>[],picked(){},moved(){},released(){},act(){},releaseAll(){for(const source of holds.keys())release(source,false);edges.clear();},isHolding:source=>holds.has(source),
        hints:()=>asset==='error'?['Butterflies could not load. Reset the activity to retry.']:released===0?['Pinch a butterfly to hold it; open your fingers to release.','Lift the bucket by its handle to let the others fly.']:['Keep a hand open. They will settle along its outline.','Pinch a resting butterfly and release it to fly again.'],
        snapshot:()=>({asset,released,landed,complete:released>0 && landed>0,insects:insects.map(i=>({state:i.state,position:i.mesh.position.toArray(),perch:i.perch}))}),
        destroy(){disposed=true;holds.clear();destroyModels();bucket.removeFromParent();bucket.traverse(n=>n.geometry?.dispose());material.dispose();}};
}
