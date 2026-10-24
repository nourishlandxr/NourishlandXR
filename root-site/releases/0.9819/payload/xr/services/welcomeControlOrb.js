import {createPracticeBody,stepPracticeBodies} from "./welcomePracticePhysics.js?v=0.9819";
import * as THREE from "../assets/fruit-window/vendor/three.module.js?v=0.9819";
import {createOrganicOrbGeometry} from "./organicOrbGeometry.js?v=0.9819";

// A self-contained controller toy. It never creates a plant record or opens PIMO.
export const CONTROL_ORB_PHASES=Object.freeze(['controls-orb-intro','controls-trigger','controls-grip','controls-orb-grab','controls-orb-open','controls-face','controls-face-first','controls-face-second','controls-stick','controls-stick-click','settings-open','settings-close','controls-orb-finale']);
export const CONTROL_ORB_DEFAULTS=Object.freeze({x:-.30,y:.072,z:.14,shell:'#eee3cb',core:'#8848b0'});
export function createWelcomeControlOrb(root,options={}){
    const left=createSingleWelcomeControlOrb(root,{...options,handedness:'left',home:{...CONTROL_ORB_DEFAULTS,x:-.29}});
    const right=createSingleWelcomeControlOrb(root,{...options,handedness:'right',home:{...CONTROL_ORB_DEFAULTS,x:.29,core:'#b87961'}});
    const orbs={left,right};
    return {group:left.group,orbs,reset:options=>{left.reset(options);right.reset(options);},release:()=>{left.release();right.release();},isHolding:source=>left.isHolding(source)||right.isHolding(source),collectionTargets:()=>[left.collectionTarget(),right.collectionTarget()],
        update:(dt,id,inputs,completed,settings)=>{left.update(dt,id,inputs,completed,settings);const rightClicked=right.rightClicked;right.update(dt,id,inputs,completed,settings);left.resolveCollision(right);if(!rightClicked && right.rightClicked)left.clearLeftClick();},
        complete:id=>id==='controls-stick-click'?right.rightClicked&&left.leftClicked:left.complete(id)||right.complete(id),
        snapshot:()=>{const a=left.snapshot(),b=right.snapshot();return {...a,visible:a.visible&&b.visible,light:a.light||b.light,colour:Math.max(a.colour,b.colour),pulseColour:Math.max(a.pulseColour,b.pulseColour),rotation:a.rotation+b.rotation,grabbed:a.grabbed||b.grabbed,moved:a.moved||b.moved,released:a.released||b.released,opened:a.opened||b.opened,orbs:{left:a,right:b}};},
        destroy:()=>{left.destroy();right.destroy();}};
}
function createSingleWelcomeControlOrb(root,{onFeedback=()=>{},getPotBounds=()=>null,handedness,home}={}){
    const group=new THREE.Group();group.name=handedness==='left'?'Controller practice Orb V3':'Right controller practice Orb V3';group.position.set(home.x,home.y,home.z);group.visible=false;root.add(group);
    // Share the organic V3 shell and compact radial travel with demo Plant Orbs.
    // The controller toy keeps its existing purple core and practice mechanics.
    const data=createOrganicOrbGeometry('medium'),cells=[],radius=.072;
    const material=new THREE.MeshStandardMaterial({color:home.shell,roughness:.82,metalness:0,side:THREE.DoubleSide}),shell=new THREE.Group();group.add(shell);
    for(const {id} of data.cells){
        const vertices=[],normals=[],indices=[],remap=new Map();let axis=null;
        for(const source of data.indices){if(data.vertices[source*10+9]!==id)continue;if(!remap.has(source)){remap.set(source,vertices.length/3);vertices.push(...data.vertices.slice(source*10,source*10+3));normals.push(...data.vertices.slice(source*10+3,source*10+6));axis ||= new THREE.Vector3(...data.vertices.slice(source*10+6,source*10+9));}indices.push(remap.get(source));}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
        const mesh=new THREE.Mesh(geometry,material);mesh.name='Orb V3 shell cell '+id;mesh.scale.setScalar(radius);shell.add(mesh);cells.push({mesh,axis});
    }
    const core=new THREE.Mesh(new THREE.SphereGeometry(radius*.94,24,16),new THREE.MeshStandardMaterial({color:home.core,emissive:home.core,emissiveIntensity:.18,roughness:.8}));group.add(core);
    const ball=createPracticeBody('ball',{x:home.x,z:home.z,radius});ball.position.y=home.y;ball.visible=true;let physical=true,physicalLearned=true,light=false,rightClicked=false,pulseColour=0;const velocity=new THREE.Vector3();let clock=0,lastCollision=-Infinity,lastSource=null;
    let owner=null,offset=null,grabbed=false,moved=false,released=false,opened=false,open=0,colour=0,rotation=0,phase='',previous=new Map(),unlocked=new Set();
    function setColour(next){colour=next;material.color.set(next===1?'#d9b9df':'#aadcc4');}
    function release(){if(owner){lastSource=owner;owner=null;released=true;if(physical){Object.assign(ball.position,group.position);Object.assign(ball.velocity,{x:velocity.x,y:velocity.y,z:velocity.z});}}}
    let leftClicked=false;
    function reset({keepSkills=false}={}){release();physical=physicalLearned=true;light=false;rightClicked=leftClicked=false;group.position.set(home.x,home.y,home.z);Object.assign(ball.position,group.position);Object.assign(ball.velocity,{x:0,y:0,z:0});shell.quaternion.identity();for(const {mesh} of cells)mesh.position.set(0,0,0);grabbed=moved=released=opened=false;open=colour=rotation=0;previous.clear();if(!keepSkills)unlocked.clear();phase='';material.color.set(home.shell);core.material.color.set(home.core);pulseColour=0;lastCollision=-Infinity;lastSource=null;}
    return {group,reset,release,clearLeftClick:()=>{leftClicked=false;},get rightClicked(){return rightClicked;},get leftClicked(){return leftClicked;},isHolding:source=>owner===source,collectionTarget:()=>({position:group.position,source:owner || lastSource}),
        resolveCollision(other){
            if(!group.visible || !other.group.visible)return;
            const delta=new THREE.Vector3().subVectors(group.position,other.group.position),distance=delta.length(),minimum=radius*2;
            if(distance>=minimum)return;
            if(distance<1e-5)delta.set(handedness==='left'?-1:1,0,0);else delta.divideScalar(distance);
            const overlap=minimum-Math.max(distance,1e-5),moveSelf=owner?0:other.isHolding()?overlap:overlap*.5,moveOther=other.isHolding()?0:owner?overlap:overlap*.5;
            group.position.addScaledVector(delta,moveSelf);other.group.position.addScaledVector(delta,-moveOther);
            Object.assign(ball.position,group.position);Object.assign(other.ballPosition(),other.group.position);
            const relative=(velocity.x-other.physicsVelocity().x)*delta.x+(velocity.y-other.physicsVelocity().y)*delta.y+(velocity.z-other.physicsVelocity().z)*delta.z;
            if(relative<0){const impulse=-relative*.55;if(!owner){velocity.x+=delta.x*impulse;velocity.y+=delta.y*impulse;velocity.z+=delta.z*impulse;}if(!other.isHolding()){const v=other.physicsVelocity();v.x-=delta.x*impulse;v.y-=delta.y*impulse;v.z-=delta.z*impulse;}}
        },
        ballPosition:()=>ball.position,physicsVelocity:()=>ball.velocity,
        update(dt,id,inputs,completed=[],{visible=true,interact=true}={}){
            clock+=dt;const stage=CONTROL_ORB_PHASES.indexOf(id);if(stage>=0)for(let i=0;i<=stage;i++)unlocked.add(CONTROL_ORB_PHASES[i]);
            // Finish the Orb introduction with its core interactions available during the key lessons.
            if(stage>=CONTROL_ORB_PHASES.indexOf('controls-orb-intro'))unlocked.add('controls-orb-grab');
            if(stage>=CONTROL_ORB_PHASES.indexOf('controls-trigger'))unlocked.add('controls-orb-open');
            group.visible=visible && CONTROL_ORB_PHASES.includes(id);if(!group.visible){release();return;}physical=true;
            if(id!==phase){phase=id;previous.clear();}
            if(owner && !inputs.some(input=>input.source===owner && input.matrix && input.down))release();
            const inverse=root.matrixWorld.clone().invert();
            for(const input of inputs){if(!interact || !input.matrix || !input.source?.handedness)continue;const before=previous.get(input.source),pose=new THREE.Matrix4().multiplyMatrices(inverse,new THREE.Matrix4().fromArray(input.matrix)),point=new THREE.Vector3().setFromMatrixPosition(pose);
                if(unlocked.has('controls-orb-grab') && !owner && input.down && before?.down===false && point.distanceTo(group.position)<.14){owner=input.source;offset=pose.clone().invert().multiply(new THREE.Matrix4().compose(group.position,group.quaternion,group.scale));grabbed=true;onFeedback('grab',owner);}
                if(owner===input.source){const next=pose.clone().multiply(offset),position=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();next.decompose(position,q,s);position.x=THREE.MathUtils.clamp(position.x,-.95+radius,.95-radius);position.z=THREE.MathUtils.clamp(position.z,-.45+radius,.45-radius);position.y=Math.max(radius,position.y);if(position.distanceTo(group.position)>.004)moved=true;velocity.copy(position).sub(group.position).divideScalar(Math.max(.001,dt)).clampLength(0,1.25);group.position.copy(position);group.quaternion.copy(q);}
                if(unlocked.has('controls-orb-open') && input.trigger && before?.trigger===false){let aimed=false;if(input.ray){const ray=new THREE.Ray(new THREE.Vector3().copy(input.ray.origin),new THREE.Vector3().copy(input.ray.direction).normalize()).applyMatrix4(inverse);aimed=ray.distanceToPoint(group.position)<.10 && ray.direction.dot(group.position.clone().sub(ray.origin))>0;}
                    if(point.distanceTo(group.position)<.17 || aimed){opened=!opened;onFeedback('open',input.source);}}
                if(input.source.handedness===handedness && unlocked.has('controls-stick') && (id==='controls-stick' || id==='controls-orb-finale' || owner===input.source || point.distanceTo(group.position)<.24)){const axes=input.source.gamepad?.axes || [],o=axes.length>=4?2:0,x=axes[o] || 0,y=axes[o+1] || 0;if(Math.hypot(x,y)>.18){lastSource=input.source;if(input.source.handedness==='right'){shell.rotation.y+=x*dt*1.3;shell.rotation.x+=y*dt*1.3;}ball.velocity.x+=x*dt*.8;ball.velocity.z+=y*dt*.8;rotation+=Math.hypot(x,y)*dt;}}
                if(input.source.handedness===handedness)for(const [button,skill] of [[4,'controls-face-first'],[5,'controls-face-second']]){const pressed=input.source.gamepad?.buttons?.[button]?.pressed;if((unlocked.has(skill)||unlocked.has('controls-face')) && pressed && !before?.buttons?.[button]){if(button===4){pulseColour=(pulseColour+1)%4;core.material.color.set([home.core,'#c478d2','#e0ba68','#519c79'][pulseColour]);light=true;}else setColour(colour===1?2:1);onFeedback('control',input.source);}}
                const clicked=Boolean(input.source.handedness===handedness && input.source.gamepad?.buttons?.[3]?.pressed);if(id==='controls-stick-click' && clicked && before?.buttons?.[3]===false){if(handedness==='right'){light=false;rightClicked=true;}else{leftClicked=true;onFeedback('control',input.source);}}
                previous.set(input.source,{down:Boolean(input.down),trigger:Boolean(input.trigger),buttons:(input.source.gamepad?.buttons || []).map(b=>b.pressed)});
            }
            if(physical && !owner && dt>0){const before={...ball.velocity};stepPracticeBodies([ball],dt,{floor:-.7});const pot=getPotBounds() || {x:.02,z:-.28,radius:.075,top:.118,bottom:0},dx=ball.position.x-pot.x,dz=ball.position.z-pot.z,distance=Math.hypot(dx,dz),limit=radius+pot.radius;let collided=before.x*ball.velocity.x<0 || before.z*ball.velocity.z<0;
                if(distance<limit && ball.position.y-radius<pot.top && ball.position.y+radius>pot.bottom){const nx=distance>.00001?dx/distance:1,nz=distance>.00001?dz/distance:0,approach=ball.velocity.x*nx+ball.velocity.z*nz;ball.position.x=pot.x+nx*limit;ball.position.z=pot.z+nz*limit;if(approach<0){ball.velocity.x-=1.7*approach*nx;ball.velocity.z-=1.7*approach*nz;collided=true;}}
                if(collided && clock-lastCollision>.16){lastCollision=clock;onFeedback('impact',lastSource,.3);}group.position.set(ball.position.x,ball.position.y,ball.position.z);shell.rotation.x+=ball.velocity.z*dt/radius;shell.rotation.z-=ball.velocity.x*dt/radius;}core.material.emissive.copy(core.material.color);core.material.emissiveIntensity=light?.35+.65*Math.sin(clock*3+open*2)**2:0;
            open=THREE.MathUtils.damp(open,opened?1:0,1/.65,dt);if(Math.abs((opened?1:0)-open)<.001)open=opened?1:0;for(const {mesh,axis} of cells)mesh.position.copy(axis).multiplyScalar(open*.22*.72*radius);core.rotation.y+=dt*.22;
        },
        complete(id){return id==='controls-orb-grab'?grabbed && moved && released:id==='controls-orb-open'?opened:id==='controls-stick-click'?rightClicked && leftClicked:false;},
        snapshot:()=>({model:'v3',physical,light,rightClicked,pulseColour,radius,skills:[...unlocked],cells:cells.length,opening:open,visible:group.visible,position:group.position.toArray(),held:Boolean(owner),grabbed,moved,released,opened,colour,rotation}),
        destroy(){root.remove(group);group.traverse(node=>node.geometry?.dispose());material.dispose();core.material.dispose();}
    };
}
