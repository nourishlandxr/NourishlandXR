// SDK Havok owns free motion; NLXR retains authored bodies and lesson state.
// Simulation coordinates are table-local, so moving the world anchor is not
// mistaken for throwing every object. No renderer/session/frame loop is added.
export function createTutorialPhysicsOwner(sdk,{useWorker=true}={}){
    const {InteractionWorld,PhysicsSystem,PhysicsBody,PhysicsShape,PhysicsShapeType,
        PhysicsState,PhysicsManipulation,Grabbed,Transform,Scene,Mesh,BoxGeometry,MeshBasicMaterial}=sdk;
    const world=new InteractionWorld({entityCapacity:128});world.scene=new Scene();
    for(const component of [Transform,Grabbed,PhysicsBody,PhysicsShape,PhysicsManipulation])world.registerComponent(component);
    world.registerSystem(PhysicsSystem,{configData:{useWorker,updateFrequency:60,interpolation:true}});
    const physics=world.getSystem(PhysicsSystem),records=new Map(),colliders=new Map();
    const geometry=new BoxGeometry(1,1,1),material=new MeshBasicMaterial();
    let disposed=false,lastFloor=null;
    function create(id,position,dimensions,state,shape=PhysicsShapeType.Box){
        const mesh=new Mesh(geometry,material);mesh.name='tutorial-physics:'+id;mesh.position.copy(position);
        world.scene.add(mesh);const entity=world.createEntity();entity.object3D=mesh;entity.addComponent(Transform);
        entity.addComponent(PhysicsShape,{shape,dimensions,restitution:.06,friction:.65,density:600});
        entity.addComponent(PhysicsBody,{state,linearDamping:.15,angularDamping:.45});
        return {entity,mesh,state,dimensions};
    }
    const remove=record=>{record.mesh.removeFromParent();record.entity.destroy();};
    function collider(id,position,dimensions,shape=PhysicsShapeType.Box,angle=0){
        let record=colliders.get(id);
        if(record && (record.mesh.position.distanceTo(position)>1e-6 || dimensions.some((value,i)=>value!==record.dimensions[i]))){remove(record);colliders.delete(id);record=null;}
        if(!record){record=create(id,position,dimensions,PhysicsState.Static,shape);record.mesh.quaternion.setFromAxisAngle({x:0,y:1,z:0},angle);colliders.set(id,record);}
    }
    function syncPose(record,body,resetVelocity=true){
        record.mesh.position.copy(body.position);record.mesh.quaternion.copy(body.rotation);record.mesh.updateMatrixWorld(true);
        physics.setBodyTransform(record.entity,{position:record.mesh.position,quaternion:record.mesh.quaternion},{resetVelocity});
    }
    function reset(){
        for(const record of records.values())syncPose(record,record.body);
    }
    return {
        backend:'iwsdk-havok',world,physics,
        step(bodies,dt,{floor=-1,tableVisible=true,basket=null,plate=null}={}){
            const owned=new Set();if(disposed)return owned;
            collider('floor',{x:0,y:floor-.05,z:0},[8,.1,8]);lastFloor=floor;
            if(tableVisible)collider('table',{x:0,y:-.02,z:0},[1.9,.04,.9]);
            else if(colliders.has('table')){remove(colliders.get('table'));colliders.delete('table');}
            for(const [kind,prop] of [['basket',basket],['plate',plate]]){
                const base=prop?.position,radius=kind==='basket'?.22:.19,height=kind==='basket'?.10:.014;
                const wanted=new Set();
                if(prop?.visible && base){
                    const baseId=kind+'-base';wanted.add(baseId);collider(baseId,{x:base.x,y:base.y+.003,z:base.z},[radius,.006,0],PhysicsShapeType.Cylinder);
                    for(let i=0;i<20;i++){
                        const a=i*Math.PI/10,id=kind+'-wall-'+i;wanted.add(id);
                        // Overlapping tangent segments form a closed circular rim.
                        collider(id,{x:base.x+Math.cos(a)*radius,y:base.y+height/2,z:base.z+Math.sin(a)*radius},[.014,height,radius*.34],PhysicsShapeType.Box,-a);
                    }
                }
                for(const [id,record]of colliders)if(id.startsWith(kind+'-') && !wanted.has(id)){remove(record);colliders.delete(id);}
            }
            const ids=new Set(bodies.filter(body=>body.visible && !body.plantAttached).map(body=>body.id));
            for(const [id,record]of records)if(!ids.has(id)){remove(record);records.delete(id);}
            for(const body of bodies){
                if(!ids.has(body.id))continue;
                const state=body.held || body.basketed || body.anchored?PhysicsState.Kinematic:PhysicsState.Dynamic;
                const dimensions=['x','y','z'].map(axis=>Math.max(.002,body.halfSize[axis]*2));
                let record=records.get(body.id),changed=false;
                if(record && (record.state!==state || dimensions.some((value,i)=>Math.abs(value-record.dimensions[i])>1e-5))){remove(record);records.delete(body.id);record=null;changed=true;}
                if(!record){
                    record=create(body.id,body.position,dimensions,state);record.mesh.quaternion.copy(body.rotation);record.body=body;
                    records.set(body.id,record);
                    if(state===PhysicsState.Dynamic)record.pendingVelocity=true;
                }
                record.body=body;
                owned.add(body.id);
                const handle=record.entity.getValue(PhysicsBody,'_engineBody');
                if(!handle)continue;
                const externalMove=record.published && ['x','y','z'].some(axis=>Math.abs(record.published[axis]-body.position[axis])>1e-5);
                if(state===PhysicsState.Kinematic || changed || externalMove)syncPose(record,body);
                else if(record.pendingVelocity){
                    record.entity.addComponent(PhysicsManipulation,{linearVelocity:[body.velocity.x,body.velocity.y,body.velocity.z],angularVelocity:[body.angular.x,body.angular.y,body.angular.z]});
                    record.pendingVelocity=false;
                }
            }
            world.scene.updateMatrixWorld(true);world.update(Math.max(0,Math.min(.06,dt)),0);
            for(const [id,record]of records){
                if(!owned.has(id) || record.state!==PhysicsState.Dynamic)continue;
                const body=record.body;Object.assign(body.position,{x:record.mesh.position.x,y:record.mesh.position.y,z:record.mesh.position.z});
                Object.assign(body.rotation,{x:record.mesh.quaternion.x,y:record.mesh.quaternion.y,z:record.mesh.quaternion.z,w:record.mesh.quaternion.w});
                const v=record.entity.getVectorView(PhysicsBody,'_linearVelocity'),a=record.entity.getVectorView(PhysicsBody,'_angularVelocity');
                Object.assign(body.velocity,{x:v[0],y:v[1],z:v[2]});Object.assign(body.angular,{x:a[0],y:a[1],z:a[2]});
                body.floorTime=body.position.y-body.halfSize.y<=floor+.015?body.floorTime+dt:0;
                if(body.floorTime>5 || Math.hypot(body.position.x,body.position.z)>3.5 || body.position.y<floor-1){
                    Object.assign(body.position,{x:body.home.x,y:body.home.y ?? body.halfSize.y+.04,z:body.home.z});body.floorTime=0;syncPose(record,body);
                }
                record.published={...body.position};
            }
            return owned;
        },reset,
        snapshot:()=>({backend:'iwsdk-havok',bodies:records.size,colliders:colliders.size,floor:lastFloor,
            ready:[...records].filter(([,record])=>record.entity.getValue(PhysicsBody,'_engineBody')).map(([id])=>id)}),
        dispose(){if(disposed)return;disposed=true;for(const record of [...records.values(),...colliders.values()])remove(record);
            records.clear();colliders.clear();world.unregisterSystem(PhysicsSystem);geometry.dispose();material.dispose();world.scene.clear();}
    };
}
