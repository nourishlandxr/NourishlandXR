import * as THREE from '../vendor/three.module.min.js';
import {createDiceRenderer} from './diceRenderer.js';
import {getSpatialVisualSettings} from './spatialVisualSettings.js';
import {handTrackingState} from './xrPointer.js';
import {spatialDepthDelta} from './spatialMoveControl.js';
import {createDiceGroundShadow} from './diceGroundShadow.js';
import {rebaseXrPoint} from './xrWorldRebase.js';

export const HERO_TOY_RADIUS=.19,HERO_TOY_REACH=2.2;
const one=new THREE.Vector3(1,1,1),serial=v=>({x:v.x,y:v.y,z:v.z});
// Small fixed substeps keep a throw stable across 60/72/90/120 Hz sessions.
export function createHeroDicePhysics(home,{radius=HERO_TOY_RADIUS,vertices=null}={}){
    const state={home:{...home},position:{x:home.x,y:home.y+radius,z:home.z},rotation:{x:0,y:0,z:0,w:1},velocity:{x:0,y:0,z:0},angularVelocity:{x:0,y:0,z:0},held:false};
    function bound(){const p=state.position,dx=p.x-state.home.x,dz=p.z-state.home.z,d=Math.hypot(dx,dz);if(d>HERO_TOY_REACH){const nx=dx/d,nz=dz/d;p.x=state.home.x+nx*HERO_TOY_REACH;p.z=state.home.z+nz*HERO_TOY_REACH;const outward=state.velocity.x*nx+state.velocity.z*nz;if(outward>0){state.velocity.x-=nx*outward*1.3;state.velocity.z-=nz*outward*1.3;}}if(p.y>state.home.y+2.4){p.y=state.home.y+2.4;state.velocity.y=Math.min(0,-state.velocity.y*.3);}}
    return {state,bound,
        step(dt){if(state.held)return;let remaining=Math.min(.25,Math.max(0,dt));while(remaining>0){const step=Math.min(1/120,remaining);remaining-=step;const p=state.position,v=state.velocity,w=state.angularVelocity;
            v.y-=9.81*step;p.x+=v.x*step;p.y+=v.y*step;p.z+=v.z*step;
            const q=new THREE.Quaternion(state.rotation.x,state.rotation.y,state.rotation.z,state.rotation.w),axis=new THREE.Vector3(w.x,w.y,w.z),speed=axis.length();if(speed>.001)q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis.normalize(),Math.min(14,speed)*step)).normalize();state.rotation={x:q.x,y:q.y,z:q.z,w:q.w};
            let support=radius;if(vertices){support=0;const point=new THREE.Vector3();for(let i=0;i<vertices.length;i+=3)support=Math.max(support,-point.fromArray(vertices,i).applyQuaternion(q).y);}
            if(p.y<state.home.y+support){p.y=state.home.y+support;v.y=Math.abs(v.y)>.45?-v.y*.32:0;const friction=Math.exp(-3.5*step);v.x*=friction;v.z*=friction;w.x+=(v.z/radius-w.x)*Math.min(1,step*8);w.z+=(-v.x/radius-w.z)*Math.min(1,step*8);w.y*=Math.exp(-5*step);if(Math.hypot(v.x,v.z)<.01){v.x=v.z=0;w.x=w.z=0;}}
            bound();
        }}
    };
}
export function createHeroDiceToy(gl,{home,visible=()=>getSpatialVisualSettings().heroDice!==false,canGrab=()=>true}={}){
    const painter=createDiceRenderer(gl,{radius:HERO_TOY_RADIUS,appearance:'hero'}),geometry=painter.geometry,positions=geometry.attributes.position;
    const shadow=createDiceGroundShadow(gl);
    let physics=null,session=null,space=null,abort=null,active=null,lastTime=null,visibleSince=null;const inputs=new Map(),rays=new Map(),pinches=new WeakMap(),suppressed=new WeakMap(),pushed=new WeakSet();
    const model=()=>physics?new THREE.Matrix4().compose(new THREE.Vector3(physics.state.position.x,physics.state.position.y,physics.state.position.z),new THREE.Quaternion(physics.state.rotation.x,physics.state.rotation.y,physics.state.rotation.z,physics.state.rotation.w),one):null;
    function ensure(){if(!visible()){visibleSince=null;return false;}const origin=home?.();if(!origin)return false;visibleSince ??= performance.now();if(!physics)physics=createHeroDicePhysics(origin,{vertices:positions.array});else physics.state.home.y=origin.y;return true;}
    function hit(ray){if(!physics || !visible() || !ray?.origin || !ray.direction)return null;const matrix=model(),origin=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),direction=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize(),local=new THREE.Ray(origin.clone(),direction).applyMatrix4(matrix.clone().invert()),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),point=new THREE.Vector3();let nearest=null;
        for(let i=0;i<positions.count;i+=3){a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);if(!local.intersectTriangle(a,b,c,true,point))continue;const world=point.clone().applyMatrix4(matrix),distance=world.distanceTo(origin);if(!nearest || distance<nearest.distance)nearest={toy:true,point:world,center:world,distance};}return nearest;}
    function rayFor(source){const m=rays.get(source);return m?{origin:new THREE.Vector3().setFromMatrixPosition(m),direction:new THREE.Vector3(0,0,-1).transformDirection(m)}:null;}
    function push(source,frame){
        if(active || source.hand || !ensure())return false;
        try{const pose=frame?.getPose(source.targetRaySpace,space);if(pose)rays.set(source,new THREE.Matrix4().fromArray(pose.transform.matrix));}catch{ /* Use the last tracked pointer pose. */ }
        const ray=rayFor(source),target=hit(ray);if(!target || !canGrab({...target,inputRay:ray,source,near:false}))return false;
        const velocity=new THREE.Vector3(physics.state.velocity.x,physics.state.velocity.y,physics.state.velocity.z).addScaledVector(ray.direction,.65);velocity.y+=.12;velocity.clampLength(0,1.2);
        physics.state.velocity=serial(velocity);physics.state.angularVelocity={x:ray.direction.z*2,y:.6,z:-ray.direction.x*2};pushed.add(source);suppressed.set(source,performance.now()+500);return true;
    }
    function begin(source,near=false){if(active || !ensure())return false;const input=inputs.get(source),ray=rayFor(source),target=near?{toy:true,distance:0}:hit(ray);if(!input || !target || !canGrab({...target,inputRay:ray,source,near}))return false;
        // Preserve the original contact and distance when the grip begins.
        const matrix=model();
        active={source,offset:input.clone().invert().multiply(matrix),samples:[{time:performance.now(),position:{...physics.state.position},rotation:{...physics.state.rotation}}]};physics.state.held=true;physics.state.velocity={x:0,y:0,z:0};physics.state.angularVelocity={x:0,y:0,z:0};return true;
    }
    function release(source,throwing=true){if(active?.source!==source)return false;const samples=active.samples,last=samples.at(-1),first=samples.find(s=>last.time-s.time<120) || samples[0],dt=(last.time-first.time)/1000;
        if(throwing && dt>.008){const v=new THREE.Vector3(last.position.x-first.position.x,last.position.y-first.position.y,last.position.z-first.position.z).multiplyScalar(1/dt).clampLength(0,4.5);physics.state.velocity=serial(v);const q=new THREE.Quaternion(last.rotation.x,last.rotation.y,last.rotation.z,last.rotation.w).multiply(new THREE.Quaternion(first.rotation.x,first.rotation.y,first.rotation.z,first.rotation.w).invert());if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const angle=2*Math.acos(Math.min(1,q.w)),axis=new THREE.Vector3(q.x,q.y,q.z).normalize().multiplyScalar(Math.min(12,angle/dt));physics.state.angularVelocity=serial(axis);}
        physics.state.held=false;suppressed.set(source,performance.now()+500);active=null;return true;
    }
    function unbind(){abort?.abort();if(active)release(active.source,false);for(const source of rays.keys())pushed.delete(source);inputs.clear();rays.clear();session=null;}
    return {hit,get heldSource(){return active?.source || null;},get state(){return physics?.state;},
        bindSession(value,referenceSpace){unbind();session=value;space=referenceSpace;abort=new AbortController();const listen=(type,fn)=>session.addEventListener(type,fn,{capture:true,signal:abort.signal});
            for(const type of ['selectstart','squeezestart'])listen(type,event=>{const handled=type==='selectstart' && !event.inputSource.hand?push(event.inputSource,event.frame):begin(event.inputSource);if(handled){event.stopImmediatePropagation();event.preventDefault();}});
            for(const type of ['selectend','squeezeend'])listen(type,event=>{if(type==='selectend' && !event.inputSource.hand){if(pushed.has(event.inputSource)){pushed.delete(event.inputSource);suppressed.set(event.inputSource,performance.now()+500);event.stopImmediatePropagation();event.preventDefault();}return;}if(release(event.inputSource)){event.stopImmediatePropagation();event.preventDefault();}});
            listen('select',event=>{if(active?.source===event.inputSource || pushed.has(event.inputSource) || performance.now()<(suppressed.get(event.inputSource)||0)){event.stopImmediatePropagation();event.preventDefault();}});
            listen('inputsourceschange',event=>{for(const source of event.removed){release(source,false);inputs.delete(source);rays.delete(source);pushed.delete(source);}});
            listen('visibilitychange',()=>{if(session.visibilityState!=='visible' && active)release(active.source,false);});listen('end',unbind);
        },
        update(frame,time){const dt=lastTime===null?0:Math.max(0,(time-lastTime)/1000);lastTime=time;if(!ensure()){if(active)release(active.source,false);return;}
            for(const source of session?.inputSources || []){let grip=null,ray=null;try{grip=frame.getPose(source.gripSpace || source.targetRaySpace,space);ray=frame.getPose(source.targetRaySpace,space);}catch{ /* A lost pose cancels this source. */ }
                const hand=source.hand?handTrackingState(frame,source,space):null,wrist=hand?.rawJoints.get('wrist'),index=hand?.rawJoints.get('index-finger-tip'),thumb=hand?.rawJoints.get('thumb-tip');
                if(source.hand && hand?.tracked && wrist && index && thumb)inputs.set(source,new THREE.Matrix4().compose(new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2),new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(wrist.matrix)),one));else if(!source.hand && grip)inputs.set(source,new THREE.Matrix4().fromArray(grip.transform.matrix));else inputs.delete(source);
                if(ray)rays.set(source,new THREE.Matrix4().fromArray(ray.transform.matrix));else rays.delete(source);
                if(source.hand){const prior=pinches.get(source);pinches.set(source,Boolean(hand?.pinch));if(!hand?.tracked){release(source,false);continue;}if(!hand.pinch)release(source);else if(prior===false && !active && index && thumb){const midpoint=new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2),p=physics.state.position;if(midpoint.distanceTo(new THREE.Vector3(p.x,p.y,p.z))<HERO_TOY_RADIUS+.04)begin(source,true);}}
            }
            if(active){const input=inputs.get(active.source);if(!input){release(active.source,false);return;}
                if(!active.source.hand){const axes=active.source.gamepad?.axes || [],delta=spatialDepthDelta(axes.length>2?axes[3]:axes[1],Math.min(50,dt*1000)),ray=rayFor(active.source);if(delta && ray){const prior=input.clone().multiply(active.offset),p=new THREE.Vector3().setFromMatrixPosition(prior),depth=p.clone().sub(ray.origin).dot(ray.direction),next=Math.max(.35,Math.min(2.5,depth+delta));p.addScaledVector(ray.direction,next-depth);prior.setPosition(p);active.offset=input.clone().invert().multiply(prior);}}
                const m=input.clone().multiply(active.offset),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.decompose(p,q,s);physics.state.position=serial(p);physics.state.rotation={x:q.x,y:q.y,z:q.z,w:q.w};active.samples.push({time,position:{...physics.state.position},rotation:{...physics.state.rotation}});active.samples=active.samples.filter(sample=>time-sample.time<180);}else physics.step(dt);
        },
        rebase(matrix){if(!physics)return;if(active)release(active.source,false);rebaseXrPoint(physics.state.position,matrix);rebaseXrPoint(physics.state.home,matrix);rebaseXrPoint(physics.state.velocity,matrix,true);const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(matrix)).multiply(new THREE.Quaternion(physics.state.rotation.x,physics.state.rotation.y,physics.state.rotation.z,physics.state.rotation.w));physics.state.rotation={x:q.x,y:q.y,z:q.z,w:q.w};},
        draw(view){if(ensure()){const t=Math.min(1,Math.max(0,(performance.now()-visibleSince)/1000)),opacity=t*t*(3-2*t);shadow.draw(view,physics.state.position,physics.state.home.y,opacity);painter.draw(view,model(),opacity);}},destroy(){unbind();shadow.destroy();painter.destroy();physics=null;}
    };
}
