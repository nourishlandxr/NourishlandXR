import * as THREE from '../assets/fruit-window/vendor/three.module.js';

export const BUTTERFLY_SPARKLE_BUDGET=40;
// One instanced draw, no realtime lights, bloom pass or flash. Shared native XR
// rendering uploads the same instances to both eyes.
export function createButterflySparkles(root){
    const geometry=new THREE.OctahedronGeometry(1,0),material=new THREE.MeshStandardMaterial({color:'#fff5ce',emissive:'#ffe4a6',emissiveIntensity:.65,roughness:.8});
    const mesh=new THREE.InstancedMesh(geometry,material,BUTTERFLY_SPARKLE_BUDGET);mesh.name='Butterfly cup sparkle burst';mesh.frustumCulled=false;mesh.count=0;mesh.userData.livingMapDynamic=true;root.add(mesh);
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),origin=new THREE.Vector3();let age=10,disposed=false;
    for(let i=0;i<BUTTERFLY_SPARKLE_BUDGET;i++)mesh.setColorAt(i,new THREE.Color().setHSL(i*.618%1,.3,.75));
    return {
        burst(point){if(disposed)return;origin.copy(point);age=0;},
        update(dt,{reducedMotion=false,visible=true}={}){
            if(disposed)return;age+=Math.max(0,Math.min(.06,dt));mesh.count=visible && age<1.8?(reducedMotion?10:BUTTERFLY_SPARKLE_BUDGET):0;
            for(let i=0;i<mesh.count;i++){
                const t=Math.max(0,age-i*.008),angle=i*2.39996,radius=(reducedMotion?.025:.025+t*.085)*(1+(i%4)*.13),height=reducedMotion?.03:.03+t*(.13+i%5*.012)-t*t*.035;
                const point=new THREE.Vector3(origin.x+Math.cos(angle)*radius,origin.y+height,origin.z+Math.sin(angle)*radius);
                const size=.0035*Math.sin(Math.min(1,t/1.5)*Math.PI)*(1+(i%3)*.15);scale.setScalar(Math.max(0,size));matrix.compose(point,q,scale);mesh.setMatrixAt(i,matrix);
            }mesh.instanceMatrix.needsUpdate=true;
        },
        reset(){age=10;mesh.count=0;},
        snapshot:()=>({active:mesh.count,age,budget:BUTTERFLY_SPARKLE_BUDGET}),
        destroy(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}
    };
}
