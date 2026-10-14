// Harvested fruit only. Attached plant parts and authored return animations
// remain under FruitDiscoveryAsset ownership.
export function createFruitWindowSDKPhysics(physics,THREE,{content,visibleBounds,onChange=()=>{}}){
    const bodies=new Map();let lastTime=null,disposed=false;
    return {
        physics,
        update(asset,holds,time){
            if(disposed || !asset)return;
            const dt=lastTime===null?0:Math.max(0,Math.min(.05,(time-lastTime)/1000));lastTime=time;
            const fruits=asset.motion?[]:asset.detachedParts.length?asset.detachedParts:asset.picked?[asset.fruit]:[];
            const ids=new Set(fruits.map(fruit=>fruit.uuid));for(const id of bodies.keys())if(!ids.has(id))bodies.delete(id);
            content.updateMatrixWorld(true);const inverse=content.matrixWorld.clone().invert();
            for(const fruit of fruits){
                const box=visibleBounds(fruit).applyMatrix4(inverse);if(box.isEmpty())continue;
                const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()).multiplyScalar(.5);
                let body=bodies.get(fruit.uuid);const held=[...holds.values()].some(hold=>hold.fruit===fruit);
                if(!body){body={id:fruit.uuid,position:{...center},rotation:{x:0,y:0,z:0,w:1},halfSize:{...size},velocity:{x:0,y:0,z:0},angular:{x:0,y:0,z:0},home:{...center},floorTime:0,visible:true,fruit};bodies.set(fruit.uuid,body);}
                if(held && dt>0)for(const axis of ['x','y','z'])body.velocity[axis]=Math.max(-2,Math.min(2,(center[axis]-body.position[axis])/dt));
                body.position={...center};body.held=held;body.halfSize={...size};
            }
            physics.step([...bodies.values()],dt,{floor:-.34,tableVisible:false});
            for(const body of bodies.values())if(!body.held){
                const fruit=body.fruit,old=visibleBounds(fruit).applyMatrix4(inverse).getCenter(new THREE.Vector3());
                const delta=new THREE.Vector3(body.position.x-old.x,body.position.y-old.y,body.position.z-old.z);
                // Fruit roots are attached to content; tolerate nested hosts too.
                const next=content.localToWorld(content.worldToLocal(fruit.getWorldPosition(new THREE.Vector3())).add(delta));
                fruit.position.copy(fruit.parent.worldToLocal(next));onChange();
            }
        },
        snapshot:()=>({bodies:bodies.size,physics:physics.snapshot()}),
        reset(){bodies.clear();lastTime=null;physics.step([],0,{floor:-.34,tableVisible:false});},
        dispose(){if(disposed)return;disposed=true;physics.dispose();bodies.clear();}
    };
}
