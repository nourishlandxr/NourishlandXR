import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {createLivingSphereGeometry} from './livingSphereGeometry.js';

// A self-contained controller toy. It never creates a plant record or opens PIMO.
export const CONTROL_ORB_PHASES=Object.freeze(['controls-orb-grab','controls-orb-open','controls-face-first','controls-face-second','controls-stick','controls-stick-click']);
export function createWelcomeControlOrb(root,{onFeedback=()=>{}}={}){
    const group=new THREE.Group();group.name='Controller practice Living Orb';group.position.set(0,.24,.12);group.visible=false;root.add(group);
    // Same twelve rounded shell cells and radial travel as the current Living
    // Orb renderer. Opening reveals its coloured core without opening PIMO.
    const data=createLivingSphereGeometry('medium'),cells=[],radius=.105;
    const material=new THREE.MeshStandardMaterial({color:'#b3d0d5',roughness:.72,metalness:0,side:THREE.DoubleSide}),shell=new THREE.Group();group.add(shell);
    for(let id=0;id<12;id++){
        const vertices=[],normals=[],indices=[],remap=new Map();let axis=null;
        for(const source of data.indices){if(data.vertices[source*10+9]!==id)continue;if(!remap.has(source)){remap.set(source,vertices.length/3);vertices.push(...data.vertices.slice(source*10,source*10+3));normals.push(...data.vertices.slice(source*10+3,source*10+6));axis ||= new THREE.Vector3(...data.vertices.slice(source*10+6,source*10+9));}indices.push(remap.get(source));}
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setIndex(indices);
        const mesh=new THREE.Mesh(geometry,material);mesh.name='Living Orb shell cell '+id;mesh.scale.setScalar(radius);shell.add(mesh);cells.push({mesh,axis});
    }
    const core=new THREE.Mesh(new THREE.SphereGeometry(radius*.94,24,16),new THREE.MeshStandardMaterial({color:'#8abdd0',emissive:'#324f57',emissiveIntensity:.18,roughness:.8}));group.add(core);
    let owner=null,offset=null,grabbed=false,moved=false,released=false,opened=false,open=0,colour=0,rotation=0,phase='',previous=new Map();
    function release(){if(owner){owner=null;released=true;}}
    function reset(){release();group.position.set(0,.24,.12);shell.quaternion.identity();grabbed=moved=released=opened=false;open=colour=rotation=0;previous.clear();material.color.set('#b3d0d5');core.material.color.set('#8abdd0');}
    return {group,reset,release,isHolding:source=>owner===source,
        update(dt,id,inputs,completed=[]){
            group.visible=CONTROL_ORB_PHASES.includes(id);if(!group.visible){release();return;}
            if(id!==phase){phase=id;previous.clear();}
            if(owner && !inputs.some(input=>input.source===owner && input.matrix && input.down))release();
            const inverse=root.matrixWorld.clone().invert();
            for(const input of inputs){if(input.source.hand || !input.matrix)continue;const before=previous.get(input.source),pose=new THREE.Matrix4().multiplyMatrices(inverse,new THREE.Matrix4().fromArray(input.matrix)),point=new THREE.Vector3().setFromMatrixPosition(pose);
                if(id==='controls-orb-grab' && !owner && input.down && before?.down===false && point.distanceTo(group.position)<.20){owner=input.source;offset=pose.clone().invert().multiply(new THREE.Matrix4().compose(group.position,group.quaternion,group.scale));grabbed=true;onFeedback('grab',owner);}
                if(owner===input.source){const next=pose.clone().multiply(offset),position=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();next.decompose(position,q,s);if(position.distanceTo(group.position)>.004)moved=true;group.position.copy(position);group.quaternion.copy(q);}
                if(id==='controls-orb-open' && input.trigger && before?.trigger===false){let aimed=false;if(input.ray){const ray=new THREE.Ray(new THREE.Vector3().copy(input.ray.origin),new THREE.Vector3().copy(input.ray.direction).normalize()).applyMatrix4(inverse);aimed=ray.distanceToPoint(group.position)<.14 && ray.direction.dot(group.position.clone().sub(ray.origin))>0;}
                    if(point.distanceTo(group.position)<.24 || aimed){opened=!opened;onFeedback('open',input.source);}}
                if(id==='controls-stick'){const axes=input.source.gamepad?.axes || [],o=axes.length>=4?2:0,x=axes[o] || 0,y=axes[o+1] || 0;if(Math.hypot(x,y)>.18){shell.rotation.y+=x*dt*2.5;shell.rotation.x+=y*dt*2.5;rotation+=Math.hypot(x,y)*dt;}}
                previous.set(input.source,{down:Boolean(input.down),trigger:Boolean(input.trigger)});
            }
            if((id==='controls-face-first' || id==='controls-face-second') && completed.length===2){const next=id==='controls-face-first'?1:2;if(colour!==next){colour=next;material.color.set(next===1?'#d9b9df':'#aadcc4');core.material.color.set(next===1?'#cf8bdd':'#75dbad');}}
            open=THREE.MathUtils.damp(open,opened?1:0,1/.32,dt);for(const {mesh,axis} of cells)mesh.position.copy(axis).multiplyScalar(open*.22*radius);core.rotation.y+=dt*.35;
        },
        complete(id){return id==='controls-orb-grab'?grabbed && moved && released:id==='controls-orb-open'?opened:false;},
        snapshot:()=>({model:'living',cells:cells.length,opening:open,visible:group.visible,position:group.position.toArray(),held:Boolean(owner),grabbed,moved,released,opened,colour,rotation}),
        destroy(){root.remove(group);group.traverse(node=>node.geometry?.dispose());material.dispose();core.material.dispose();}
    };
}
