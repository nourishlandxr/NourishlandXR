import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';

const supported=['meta-quest-touch-plus','oculus-touch-v3'];
const actions={point:['trigger'],grab:['squeeze'],gloves:['squeeze'],fly:['trigger','squeeze','thumbstick'],fruit:['squeeze'],packet:['squeeze','trigger'],seed:['squeeze'],harvest:['squeeze'],water:['squeeze']};
const labels={point:'Index finger · trigger',grab:'Middle finger · grip',gloves:'Gently squeeze your grip',fly:'Trigger forward · grip back · stick turns / height',fruit:'Middle finger · grip',packet:'Hold grip · press trigger to open',seed:'Middle finger · grip',harvest:'Pick · release into the basket',water:'Hold grip · tilt the can'};

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
                const originalMaterials=new Set();model.traverse(node=>{if(node.isMesh){for(const material of [node.material].flat())originalMaterials.add(material);node.material=new THREE.MeshBasicMaterial({color:'#eee7d8',transparent:false,opacity:1,depthWrite:true});}});
                const originalTextures=new Set();for(const material of originalMaterials){for(const value of Object.values(material))if(value?.isTexture)originalTextures.add(value);material.dispose();}for(const texture of originalTextures){texture.image?.close?.();texture.dispose();}
                for(const [id,component] of Object.entries(data.layouts[hand].components)){
                    const kind=id.replace('xr-standard-','');
                    // Keep every face button and joystick legible, including
                    // the controls not highlighted by the current lesson.
                    model.getObjectByName(component.rootNodeName)?.traverse(node=>{if(node.isMesh){node.material.color.set(['trigger','squeeze'].includes(kind)?'#617455':'#334c3a');}});
                    for(const response of Object.values(component.visualResponses || {})){
                        const value=model.getObjectByName(response.valueNodeName),min=model.getObjectByName(response.minNodeName),max=model.getObjectByName(response.maxNodeName);
                        if(value && min && max && response.valueNodeProperty==='transform')entry.responses.push({value,min,max,property:response.componentProperty,indices:component.gamepadIndices});
                    }
                    if(!['trigger','squeeze','thumbstick'].includes(kind))continue;
                    const response=Object.values(component.visualResponses).find(r=>r.componentProperty==='button'),node=model.getObjectByName(response?.valueNodeName);
                    const meshes=[];node?.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
                    for(const mesh of meshes){const glow=new THREE.Mesh(mesh.geometry,pending),confirmation=new THREE.Mesh(mesh.geometry,pressed),halo=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:'#ffdca0',transparent:true,opacity:.24,depthWrite:false}));halo.scale.setScalar(1.3);halo.visible=false;halo.renderOrder=4;mesh.add(halo);for(const overlay of [glow,confirmation]){overlay.scale.setScalar(1.16);overlay.visible=false;overlay.renderOrder=5;mesh.add(overlay);}entry.highlights.push({kind,glow,confirmation,halo});}
                }
                const canvas=document.createElement('canvas');canvas.width=700;canvas.height=120;
                const texture=new THREE.CanvasTexture(canvas),label=new THREE.Mesh(new THREE.PlaneGeometry(.19,.033),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
                label.position.set(hand==='left'?-.08:.08,.12,0);label.renderOrder=8;group.add(label);Object.assign(entry,{canvas,texture,label,ready:true});onAssets();
            }).catch(error=>{entry.failed=true;console.warn('Welcome controller guide:',error.message);});
        return entry;
    }
    function update(dt,controllers,phase,viewer,complete=false,opacity=1){
        elapsed+=dt;for(const entry of entries.values())entry.group.visible=false;
        const requested=actions[phase] || [];
        for(const input of controllers){
            if(input.source.hand || !input.matrix)continue;
            const profile=(input.source.profiles || []).find(id=>supported.includes(id)),hand=input.source.handedness;
            if(!profile || !['left','right'].includes(hand))continue;
            const entry=load(profile,hand);if(!entry.ready || !requested.length || opacity<.01)continue;
            entry.group.visible=true;entry.group.matrix.fromArray(input.matrix);entry.group.traverse(node=>{for(const m of [node.material].flat().filter(Boolean)){m.userData.baseOpacity??=m.opacity;m.opacity=m.userData.baseOpacity*opacity;m.transparent=m.opacity<1;m.depthWrite=m.opacity>=1;}});
            for(const r of entry.responses){const gamepad=input.source.gamepad;let value=gamepad?.buttons[r.indices.button]?.value || 0;
                if(r.property==='xAxis' || r.property==='yAxis')value=((gamepad?.axes[r.indices[r.property]] || 0)+1)/2;
                if(r.property==='button' && r.indices.button===0)value=Math.max(value,input.trigger?1:0);
                if(r.property==='button' && r.indices.button===1)value=Math.max(value,input.down?1:0);
                value=THREE.MathUtils.clamp(value,0,1);r.value.position.lerpVectors(r.min.position,r.max.position,value);r.value.quaternion.slerpQuaternions(r.min.quaternion,r.max.quaternion,value);
            }
            for(const {kind,glow,confirmation,halo} of entry.highlights){const down=kind==='trigger'?input.trigger:kind==='squeeze'?input.down:input.source.gamepad?.axes?.some((a,i)=>i>=2 && Math.abs(a)>.18),required=requested.includes(kind),confirmed=Boolean(down || complete);halo.visible=required;halo.scale.setScalar(1.3+.035*Math.sin(elapsed*3));glow.visible=required && !confirmed;confirmation.visible=required && confirmed;glow.scale.setScalar(1.16+.025*Math.sin(elapsed*4));confirmation.scale.setScalar(1.1);}
            const text=complete?'That’s it!':labels[phase];if(entry.text!==text){entry.text=text;const ctx=entry.canvas.getContext('2d');ctx.clearRect(0,0,700,120);ctx.fillStyle='rgba(246,245,231,.97)';ctx.beginPath();ctx.roundRect(2,2,696,116,30);ctx.fill();ctx.fillStyle='#354b3b';ctx.font='500 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,350,60,660);entry.texture.needsUpdate=true;}
            if(viewer){const controllerQ=new THREE.Quaternion().setFromRotationMatrix(entry.group.matrix),viewQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(viewer));entry.label.quaternion.copy(controllerQ.invert().multiply(viewQ));}
        }
    }
    return {update,snapshot:()=>[...entries].map(([id,e])=>({id,ready:e.ready,failed:e.failed,visible:e.group.visible,highlighted:e.highlights.filter(h=>h.glow.visible || h.confirmation.visible).map(h=>h.kind)})),destroy(){disposed=true;for(const {group,texture} of entries.values()){scene.remove(group);disposeModel(group);texture?.dispose();}entries.clear();pending.dispose();pressed.dispose();}};
}
function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
