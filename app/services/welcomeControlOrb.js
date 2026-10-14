import {createPracticeBody,stepPracticeBodies} from './welcomePracticePhysics.js';
import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createOrganicOrbGeometry} from './organicOrbGeometry.js';

// A self-contained controller toy. It never creates a plant record or opens PIMO.
export const CONTROL_ORB_PHASES=Object.freeze(['controls-orb-grab','controls-orb-open','controls-face-first','controls-face-second','controls-stick','controls-stick-click']);
export const CONTROL_ORB_DEFAULTS=Object.freeze({x:-.30,y:.24,z:.14,shell:'#244d35',core:'#8848b0'});
export function createWelcomeControlOrb(root,{onFeedback=()=>{}}={}){
    const home=CONTROL_ORB_DEFAULTS,group=new THREE.Group();group.name='Controller practice Orb V3';group.position.set(home.x,home.y,home.z);group.visible=false;root.add(group);
    // Share the organic V3 shell and compact radial travel with demo Plant Orbs.
    // The controller toy keeps its existing purple core and practice mechanics.
    const data=createOrganicOrbGeometry('medium'),cells=[],radius=.072;
    const material=new THREE.MeshStandardMaterial({color:home.shell,roughness:.72,metalness:0,side:THREE.DoubleSide}),shell=new THREE.Group();group.add(shell);
    for(const {id} of data.cells){
        const vertices=[],normals=[],indices=[],remap=new Map();let axis=null;
        for(const source of data.indices){if(data.vertices[source*10+9]!==id)continue;if(!remap.has(source)){remap.set(source,vertices.length/3);vertices.push(...data.vertices.slice(source*10,source*10+3));normals.push(...data.vertices.slice(source*10+3,source*10+6));axis ||= new THREE.Vector3(...data.vertices.slice(source*10+6,source*10+9));}indices.push(remap.get(source));}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
        const mesh=new THREE.Mesh(geometry,material);mesh.name='Orb V3 shell cell '+id;mesh.scale.setScalar(radius);shell.add(mesh);cells.push({mesh,axis});
    }
    const core=new THREE.Mesh(new THREE.SphereGeometry(radius*.94,24,16),new THREE.MeshStandardMaterial({color:home.core,emissive:home.core,emissiveIntensity:.18,roughness:.8}));group.add(core);
    const ball=createPracticeBody('ball',{radius});ball.visible=true;let physical=false,physicalLearned=false,light=false,rightClicked=false,pulseColour=0;const velocity=new THREE.Vector3();let clock=0;
    let owner=null,offset=null,grabbed=false,moved=false,released=false,opened=false,open=0,colour=0,rotation=0,phase='',previous=new Map(),unlocked=new Set(),pairs=new Map();
    function setColour(next){colour=next;material.color.set(next===1?'#d9b9df':'#aadcc4');}
    function release(){if(owner){owner=null;released=true;if(physical){Object.assign(ball.position,group.position);Object.assign(ball.velocity,{x:velocity.x,y:velocity.y,z:velocity.z});}}}
    function reset({keepSkills=false}={}){release();physical=keepSkills && physicalLearned;if(!keepSkills)physicalLearned=false;light=false;rightClicked=physical;group.position.set(home.x,home.y,home.z);Object.assign(ball.position,group.position);Object.assign(ball.velocity,{x:0,y:0,z:0});shell.quaternion.identity();for(const {mesh} of cells)mesh.position.set(0,0,0);grabbed=moved=released=opened=false;open=colour=rotation=0;previous.clear();if(!keepSkills)unlocked.clear();pairs.clear();phase='';material.color.set(home.shell);core.material.color.set(home.core);pulseColour=0;}
    return {group,reset,release,isHolding:source=>owner===source,
        update(dt,id,inputs,completed=[],{visible=true,interact=true}={}){
            clock+=dt;const stage=CONTROL_ORB_PHASES.indexOf(id);if(stage>=0)for(let i=0;i<=stage;i++)unlocked.add(CONTROL_ORB_PHASES[i]);
            group.visible=visible && unlocked.size>0;if(!group.visible){release();return;}
            if(id!==phase){phase=id;previous.clear();}
            if(owner && !inputs.some(input=>input.source===owner && input.matrix && input.down))release();
            const inverse=root.matrixWorld.clone().invert();
            for(const input of inputs){if(!interact || !input.matrix)continue;const before=previous.get(input.source),pose=new THREE.Matrix4().multiplyMatrices(inverse,new THREE.Matrix4().fromArray(input.matrix)),point=new THREE.Vector3().setFromMatrixPosition(pose);
                if(unlocked.has('controls-orb-grab') && !owner && input.down && before?.down===false && point.distanceTo(group.position)<.14){owner=input.source;offset=pose.clone().invert().multiply(new THREE.Matrix4().compose(group.position,group.quaternion,group.scale));grabbed=true;onFeedback('grab',owner);}
                if(owner===input.source){const next=pose.clone().multiply(offset),position=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();next.decompose(position,q,s);if(position.distanceTo(group.position)>.004)moved=true;velocity.copy(position).sub(group.position).divideScalar(Math.max(.001,dt)).clampLength(0,3);group.position.copy(position);group.quaternion.copy(q);}
                if(unlocked.has('controls-orb-open') && input.trigger && before?.trigger===false){let aimed=false;if(input.ray){const ray=new THREE.Ray(new THREE.Vector3().copy(input.ray.origin),new THREE.Vector3().copy(input.ray.direction).normalize()).applyMatrix4(inverse);aimed=ray.distanceToPoint(group.position)<.10 && ray.direction.dot(group.position.clone().sub(ray.origin))>0;}
                    if(point.distanceTo(group.position)<.17 || aimed){opened=!opened;onFeedback('open',input.source);}}
                if(unlocked.has('controls-stick') && (id==='controls-stick' || owner===input.source || point.distanceTo(group.position)<.24)){const axes=input.source.gamepad?.axes || [],o=axes.length>=4?2:0,x=axes[o] || 0,y=axes[o+1] || 0;if(Math.hypot(x,y)>.18){if(input.source.handedness==='right'){shell.rotation.y+=x*dt*2.5;shell.rotation.x+=y*dt*2.5;}else if(physical){ball.velocity.x+=x*dt*3;ball.velocity.z+=y*dt*3;}else {group.position.x=THREE.MathUtils.clamp(group.position.x+x*dt*.3,-.72,.72);group.position.z=THREE.MathUtils.clamp(group.position.z+y*dt*.3,-.28,.28);shell.rotation.z-=x*dt*2.5;}rotation+=Math.hypot(x,y)*dt;}}
                for(const [button,skill,next] of [[4,'controls-face-first',1],[5,'controls-face-second',2]]){const pressed=input.source.gamepad?.buttons?.[button]?.pressed;if(unlocked.has(skill) && pressed && !before?.buttons?.[button] && !(id.startsWith('controls-face-') && input.source.gamepad?.buttons?.[4]?.pressed && input.source.gamepad?.buttons?.[5]?.pressed)){const key=skill,seen=pairs.get(key) || new Set();seen.add(input.source.handedness);pairs.set(key,seen);if(input.source.handedness==='right' && button===4){light=true;}else if(input.source.handedness==='left' && button===5){pulseColour=(pulseColour+1)%4;core.material.color.set([home.core,'#c478d2','#e0ba68','#519c79'][pulseColour]);}else setColour(colour===1?2:1);}}
                const clicked=Boolean(input.source.gamepad?.buttons?.[3]?.pressed);if(id==='controls-stick-click' && clicked && before?.buttons?.[3]===false){if(input.source.handedness==='right'){light=false;rightClicked=true;}else if(rightClicked){physical=physicalLearned=true;release();Object.assign(ball.position,group.position);Object.assign(ball.velocity,{x:0,y:0,z:0});onFeedback('release',input.source);}}
                previous.set(input.source,{down:Boolean(input.down),trigger:Boolean(input.trigger),buttons:(input.source.gamepad?.buttons || []).map(b=>b.pressed)});
            }
            if(physical && !owner && dt>0){stepPracticeBodies([ball],dt,{floor:-.7});group.position.set(ball.position.x,ball.position.y,ball.position.z);shell.rotation.x+=ball.velocity.z*dt/radius;shell.rotation.z-=ball.velocity.x*dt/radius;}core.material.emissive.copy(core.material.color);core.material.emissiveIntensity=light?.35+.65*Math.sin(clock*3+open*2)**2:0;
            open=THREE.MathUtils.damp(open,opened?1:0,1/.32,dt);if(Math.abs((opened?1:0)-open)<.001)open=opened?1:0;for(const {mesh,axis} of cells)mesh.position.copy(axis).multiplyScalar(open*.22*.72*radius);core.rotation.y+=dt*.35;
        },
        complete(id){return id==='controls-orb-grab'?grabbed && moved && released:id==='controls-orb-open'?opened:id==='controls-stick-click'?physical:false;},
        snapshot:()=>({model:'v3',physical,light,rightClicked,pulseColour,radius,skills:[...unlocked],cells:cells.length,opening:open,visible:group.visible,position:group.position.toArray(),held:Boolean(owner),grabbed,moved,released,opened,colour,rotation}),
        destroy(){root.remove(group);group.traverse(node=>node.geometry?.dispose());material.dispose();core.material.dispose();}
    };
}
