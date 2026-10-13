import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';

const supported=['meta-quest-touch-plus','oculus-touch-v3'];
const actions={'controls-trigger':['trigger'],'controls-grip':['squeeze'],'controls-stick':['thumbstick'],brush:['squeeze','trigger'],point:['trigger'],grab:['squeeze'],gloves:['squeeze'],fly:['trigger','squeeze','thumbstick'],fruit:['squeeze','trigger'],packet:['squeeze','trigger'],seed:['squeeze'],harvest:['squeeze'],water:['squeeze'],trial:['squeeze','trigger']};
const labels={'controls-trigger':'Press both triggers','controls-grip':'Squeeze both grips','controls-stick':'Circle both thumbsticks',brush:'Grip to hold · trigger to paint',point:'Index finger · trigger',grab:'Middle finger · grip',gloves:'Gently squeeze your grip',fly:'Trigger forward · grip back · stick turns / height',fruit:'Middle finger · grip',packet:'Hold grip · press trigger to open',seed:'Middle finger · grip',harvest:'Pick · release into the basket',water:'Hold grip · tilt the can',trial:'Grip to hold · trigger to act'};

// Official, grip-space-aligned controller assets; never put a guessed button
// location on an unsupported controller. These assets are bundled for offline XR.
export function createWelcomeControllerGuide(scene,{onAssets=()=>{}}={}){
    const entries=new Map(),loader=new GLTFLoader();let disposed=false,elapsed=0;
    const pending=new THREE.MeshBasicMaterial({color:'#ffc568',transparent:true,opacity:.94,depthWrite:false});
    const pressed=new THREE.MeshBasicMaterial({color:'#8fe5ef',transparent:true,opacity:.97,depthWrite:false});
    function load(profile,hand){
        const key=profile+'/'+hand;if(entries.has(key))return entries.get(key);
        const group=new THREE.Group();group.matrixAutoUpdate=false;group.visible=false;scene.add(group);
        const entry={group,ready:false,failed:false,highlights:[],responses:[]};entries.set(key,entry);
        const base=new URL('../assets/welcome-practice/controllers/'+profile+'/',import.meta.url);
        Promise.all([fetch(new URL('profile.json',base)).then(r=>{if(!r.ok)throw Error('Controller profile unavailable');return r.json();}),loader.loadAsync(new URL(hand+'.glb',base).href)])
            .then(([data,gltf])=>{
                if(disposed){disposeModel(gltf.scene);return;}
                const model=gltf.scene;group.add(model);
                // Preserve the hardware model's textures, finish and button legends.
                for(const [id,component] of Object.entries(data.layouts[hand].components)){
                    const kind=id.replace('xr-standard-','');
                    for(const response of Object.values(component.visualResponses || {})){
                        const value=model.getObjectByName(response.valueNodeName),min=model.getObjectByName(response.minNodeName),max=model.getObjectByName(response.maxNodeName);
                        if(value && min && max && response.valueNodeProperty==='transform')entry.responses.push({value,min,max,property:response.componentProperty,indices:component.gamepadIndices});
                    }
                    if(!['trigger','squeeze','thumbstick'].includes(kind))continue;
                    const response=Object.values(component.visualResponses).find(r=>r.componentProperty==='button'),node=model.getObjectByName(response?.valueNodeName);
                    const meshes=[];node?.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
                    for(const mesh of meshes){const glow=new THREE.Mesh(mesh.geometry,pending),confirmation=new THREE.Mesh(mesh.geometry,pressed),halo=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:'#ffdca0',transparent:true,opacity:.24,depthWrite:false}));halo.scale.setScalar(1.3);halo.visible=false;halo.renderOrder=4;mesh.add(halo);for(const overlay of [glow,confirmation]){overlay.scale.setScalar(1.16);overlay.visible=false;overlay.renderOrder=5;mesh.add(overlay);}entry.highlights.push({kind,glow,confirmation,halo});}
                }
                const canvas=document.createElement('canvas');canvas.width=700;canvas.height=150;
                const texture=new THREE.CanvasTexture(canvas),label=new THREE.Mesh(new THREE.PlaneGeometry(.115,.024),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
                label.position.set(hand==='left'?-.16:.16,.025,0);label.renderOrder=8;group.add(label);const link=new THREE.Mesh(new THREE.CylinderGeometry(.00055,.00055,1,5),new THREE.MeshBasicMaterial({color:'#9ea995',transparent:true,opacity:.55,depthWrite:false}));link.name='Controller label connector';group.add(link);Object.assign(entry,{canvas,texture,label,link,ready:true});onAssets();
            }).catch(error=>{entry.failed=true;console.warn('Welcome controller guide:',error.message);});
        return entry;
    }
    function update(dt,controllers,phase,viewer,complete=false,opacity=1){
        elapsed+=dt;for(const entry of entries.values())entry.group.visible=false;
        const requested=phase.startsWith('controls-')?actions[phase] || []:[];
        for(const input of controllers){
            if(input.source.hand || !input.matrix)continue;
            const profile=(input.source.profiles || []).find(id=>supported.includes(id)),hand=input.source.handedness;
            if(!profile || !['left','right'].includes(hand))continue;
            const entry=load(profile,hand);if(!entry.ready || opacity<.01)continue;
            entry.group.visible=true;entry.group.matrix.fromArray(input.matrix);entry.group.traverse(node=>{for(const m of [node.material].flat().filter(Boolean)){m.userData.controllerBase??={opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite};const base=m.userData.controllerBase;m.opacity=base.opacity*opacity;m.transparent=base.transparent || opacity<1;m.depthWrite=base.depthWrite && opacity>=1;}});
            entry.label.visible=entry.link.visible=requested.length>0;
            for(const r of entry.responses){const gamepad=input.source.gamepad;let value=gamepad?.buttons[r.indices.button]?.value || 0;
                if(r.property==='xAxis' || r.property==='yAxis')value=((gamepad?.axes[r.indices[r.property]] || 0)+1)/2;
                if(r.property==='button' && r.indices.button===0)value=Math.max(value,input.trigger?1:0);
                if(r.property==='button' && r.indices.button===1)value=Math.max(value,input.down?1:0);
                value=THREE.MathUtils.clamp(value,0,1);r.value.position.lerpVectors(r.min.position,r.max.position,value);r.value.quaternion.slerpQuaternions(r.min.quaternion,r.max.quaternion,value);
            }
            for(const {kind,glow,confirmation,halo} of entry.highlights){const down=kind==='trigger'?input.trigger:kind==='squeeze'?input.down:input.source.gamepad?.axes?.some((a,i)=>i>=2 && Math.abs(a)>.18),required=requested.includes(kind),confirmed=Boolean(down || complete);halo.visible=required;halo.scale.setScalar(1.3+.035*Math.sin(elapsed*3));glow.visible=required && !confirmed;confirmation.visible=required && confirmed;glow.scale.setScalar(1.16+.025*Math.sin(elapsed*4));confirmation.scale.setScalar(1.1);}
            const text=complete?'That’s it!':labels[phase];if(requested.length && entry.text!==text){entry.text=text;const ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,700,150);ctx.fillStyle='rgba(39,57,47,.90)';ctx.beginPath();ctx.roundRect(2,2,696,146,16);ctx.fill();ctx.fillStyle='#e0e5d5';ctx.font='500 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
                const lines=phase==='fly' && !complete?['Trigger forward · grip back','Stick turns / height']:[text];lines.forEach((line,i)=>ctx.fillText(line,350,75+(i-(lines.length-1)/2)*50,660));entry.texture.needsUpdate=true;}
            if(viewer){
                const controllerQ=new THREE.Quaternion().setFromRotationMatrix(entry.group.matrix),viewQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(viewer));
                // Labels stay outside the hands in viewer space, even as wrists turn.
                const offset=new THREE.Vector3(hand==='left'?-.10:.10,-.055,.025).applyQuaternion(viewQ).applyQuaternion(controllerQ.clone().invert());
                entry.label.position.copy(offset);entry.label.quaternion.copy(controllerQ.invert().multiply(viewQ));
                const end=offset.clone().multiplyScalar(.52),start=new THREE.Vector3(0,.018,0),direction=end.clone().sub(start);entry.link.position.copy(start).add(end).multiplyScalar(.5);entry.link.scale.y=direction.length();entry.link.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
            }

        }
    }
    return {update,snapshot:()=>[...entries].map(([id,e])=>({id,ready:e.ready,failed:e.failed,visible:e.group.visible,highlighted:e.highlights.filter(h=>h.glow.visible || h.confirmation.visible).map(h=>h.kind)})),destroy(){disposed=true;for(const {group,texture} of entries.values()){scene.remove(group);disposeModel(group);texture?.dispose();}entries.clear();pending.dispose();pressed.dispose();}};
}
function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
