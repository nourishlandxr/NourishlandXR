// Tutorial-only interaction owner. NLXR keeps its scene, narration, authored
// object identities and post-release physics; IWSDK manages grip ownership.
export function createTutorialInteractionOwner(runtime, sdk, {scope='tutorial',capacity=64,distance=false}={}) {
    if (!runtime || runtime.backend !== 'iwsdk') return null;
    const { InteractionWorld, GrabSystem, OneHandGrabbable, TwoHandsGrabbable, DistanceGrabbable,
        Handle, Grabbed, RayInteractable, Transform, Visibility, LevelTag, Scene, PerspectiveCamera,
        XROrigin, MultiPointer, Group, Mesh, BoxGeometry, MeshBasicMaterial, Matrix4 } = sdk;
    // SDK's ECS foundation only; no renderer-owning World.create(), XRSession,
    // canvas, physics engine or second animation loop.
    const world = new InteractionWorld({entityCapacity:capacity});
    world.scene = new Scene(); world.camera = new PerspectiveCamera();
    const origin = new XROrigin(); world.player = origin; world.scene.add(origin);
    world.sceneEntity={object3D:world.scene};
    const pointers = Object.fromEntries(['left','right'].map(side=>[side,new MultiPointer(side,world.scene,world.camera,origin)]));
    for(const pointer of Object.values(pointers)){
        pointer.toggleSubPointer('ray',distance);pointer.toggleSubPointer('touch',false);
    }
    // Tutorial pointers have their own target scope. They cannot hit Demo/PIMO
    // panels or steal their pointer capture. Native SDK input sampling is shared.
    world.input = { xr: { multiPointers:pointers, gazePointer:runtime.input.gazePointer,
        isPrimary:()=>false } };
    for (const component of [Transform, Visibility, OneHandGrabbable,
        TwoHandsGrabbable, DistanceGrabbable, Handle, Grabbed, RayInteractable, LevelTag]) world.registerComponent(component);
    // Inputs already contain the native pinch/fist or SDK squeeze state. Route
    // that single action edge to grab; don't forward a second pinch edge.
    world.registerSystem(GrabSystem, { configData: { useHandPinchForGrab: false } });
    const grab = world.getSystem(GrabSystem);
    const root=new Group();world.scene.add(root);
    const records=new Map(),edges=new Map(),holders=new Map(),blocked=new Set();
    const geometry=new BoxGeometry(2,2,2),material=new MeshBasicMaterial();
    const transform=new Matrix4();let disposed=false,lastTime=0;
    const cancel=id=>{
        const record=records.get(id);if(!record)return;
        const side=grab.getHolderHand(record.entity);if(side){const source=edges.get(side)?.source;if(source)blocked.add(source);}
        grab.forceRelease(record.entity);
        if(record.entity.hasComponent(Grabbed))record.entity.removeComponent(Grabbed);
        for(const [source,hold] of holders)if(hold.id===id)holders.delete(source);
    };
    const reset=()=>{
        if(disposed)return;
        for(const id of records.keys())cancel(id);
        for(const pointer of Object.values(pointers))pointer.update(false,0,lastTime);
        holders.clear();
    };
    return {
        backend:'iwsdk',world,grab,pointers,
        step(inputs,targets,{rootMatrix,dt,time,enabled=true}={}){
            if(disposed)return;
            lastTime=time;root.matrix.fromArray(rootMatrix);root.matrixAutoUpdate=false;
            if(!enabled)reset();
            const ids=new Set(targets.map(body=>body.id));
            for(const [id,record] of records)if(!ids.has(id)){
                cancel(id);record.mesh.removeFromParent();record.entity.destroy();records.delete(id);
            }
            for(const body of targets){
                let record=records.get(body.id);
                if(!record){
                    const mesh=new Mesh(geometry,material);mesh.name=scope+'-grabbable:'+body.id;
                    mesh.pointerEvents='auto';root.add(mesh);
                    const entity=world.createEntity();entity.object3D=mesh;
                    entity.addComponent(Transform);entity.addComponent(Visibility);
                    // Reject a second hand rather than allowing a one-hand fruit
                    // to change owner while the first hand is still holding it.
                    mesh.addEventListener('pointerdown',event=>{
                        const handle=entity.getValue(Handle,'instance');
                        if(handle?.inputState.size && !handle.inputState.has(event.pointerId))event.stopImmediatePropagation();
                    });
                    if(distance){entity.addComponent(RayInteractable);entity.addComponent(DistanceGrabbable,{movementMode:'MoveFromTarget',returnToOrigin:false,rotate:true,translate:true,scale:false});}
                    else entity.addComponent(OneHandGrabbable,{rotate:true,translate:true});
                    records.set(body.id,record={mesh,entity,body});
                }
                record.body=body;
                const half=body.halfSize;
                record.mesh.scale.set(Math.max(.008,half.x),Math.max(.008,half.y),Math.max(.008,half.z));
                if(!record.entity.hasComponent(Grabbed)){
                    record.mesh.position.copy(body.position);record.mesh.quaternion.copy(body.rotation);
                }
                record.mesh.visible=enabled && body.visible;
            }
            world.scene.grabDescendants=[...records.values()].map(record=>record.mesh);
            world.scene.rayDescendants=distance?world.scene.grabDescendants:[];world.scene.touchDescendants=[];
            world.scene.updateMatrixWorld(true);
            for(const side of ['left','right']){
                const input=inputs.find(value=>value.source.handedness===side && value.matrix?.length===16 && Array.from(value.matrix).every(Number.isFinite) && !value.uiBlocked);
                const previous=edges.get(side);
                if(previous?.source && previous.source!==input?.source){
                    for(const [id,record] of records)if(grab.getHolderHand(record.entity)===side)cancel(id);
                    pointers[side].update(false,0,time);blocked.add(previous.source);
                }
                if(input && !input.down)blocked.delete(input.source);
                const connected=enabled && dt>0 && Boolean(input);
                const down=connected && Boolean(input.down) && !blocked.has(input.source);
                if(input){
                    transform.fromArray(input.matrix).decompose(origin.gripSpaces[side].position,origin.gripSpaces[side].quaternion,origin.gripSpaces[side].scale);
                    origin.gripSpaces[side].updateMatrixWorld(true);
                    if(input.rayMatrix){origin.raySpaces[side].matrixAutoUpdate=false;origin.raySpaces[side].matrix.fromArray(input.rayMatrix);origin.raySpaces[side].updateMatrixWorld(true);}
                }
                pointers[side].toggleSubPointer('ray',distance && !input?.source.hand);
                origin.updateMatrixWorld(true);
                const start=down && !(previous?.down && previous.source===input?.source),end=!down && Boolean(previous?.down);
                pointers[side].update(connected,dt,time,{
                    squeezeStart:start,squeezeEnd:end,
                    selectStart:distance && !input?.source.hand && start,selectEnd:distance && end
                });
                edges.set(side,{source:input?.source,down});
            }
            world.update(dt,time);world.scene.updateMatrixWorld(true);holders.clear();
            for(const [id,record] of records)if(record.entity.hasComponent(Grabbed)){
                const side=grab.getHolderHand(record.entity),source=edges.get(side)?.source;
                if(source)holders.set(source,{id,matrix:Float32Array.from(record.mesh.matrix.elements)});
            }
        },
        held:source=>holders.get(source) || null,
        cancel,reset,
        snapshot:()=>({backend:'iwsdk',targets:records.size,held:[...holders.values()].map(hold=>hold.id)}),
        dispose(){
            if(disposed)return;reset();disposed=true;
            for(const {entity,mesh} of records.values()){mesh.removeFromParent();entity.destroy();}records.clear();
            for(const pointer of Object.values(pointers))pointer.dispose();
            world.unregisterSystem(GrabSystem);
            geometry.dispose();material.dispose();world.scene.clear();edges.clear();blocked.clear();
        }
    };
}
