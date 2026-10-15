import * as THREE from '../vendor/three.module.min.js';

// The native renderer chooses the exact face/object first. Only that object
// enters this isolated SDK owner; its proxy never participates in menu hits.
export function createKnowledgeSDKGrip(runtime,{scope='knowledge'}={}){
    const owner=runtime.createDemoInteractions({scope});
    const rootMatrix=new THREE.Matrix4().elements;
    let held=null,time=0,disposed=false;
    function step(matrix,rayMatrix,down,dt=.016){
        if(!held || disposed)return null;
        time+=Math.max(.001,Math.min(.06,dt));
        owner.step([{source:held.source,matrix:matrix.elements,rayMatrix:rayMatrix?.elements,down}],
            [held.body],{rootMatrix,dt:Math.max(.001,Math.min(.06,dt)),time,enabled:true});
        const result=owner.held(held.source);
        if(!result)return null;
        const world=new THREE.Matrix4().fromArray(result.matrix),position=new THREE.Vector3(),rotation=new THREE.Quaternion();
        world.decompose(position,rotation,new THREE.Vector3());
        return new THREE.Matrix4().compose(position,rotation,held.scale);
    }
    return {
        begin(source,object,world,matrix,rayMatrix){
            if(disposed || held)return false;
            const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();world.decompose(position,rotation,scale);
            const radius=Math.max(.008,Number(object.radius)||.08);
            held={source,scale,body:{id:String(object.id),position,rotation,
                halfSize:object.halfSize || {x:radius*scale.x,y:radius*scale.y,z:radius*scale.z},visible:true}};
            step(matrix,rayMatrix,false);
            if(step(matrix,rayMatrix,true))return true;
            owner.reset();held=null;return false;
        },
        update(matrix,rayMatrix,dt){return step(matrix,rayMatrix,true,dt);},
        reset(){owner.reset();held=null;},
        snapshot:()=>owner.snapshot(),
        dispose(){if(disposed)return;disposed=true;held=null;owner.dispose();}
    };
}
