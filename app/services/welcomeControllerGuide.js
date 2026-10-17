import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {createWelcomeControllerSkin} from './welcomeControllerSkin.js';
import {createWelcomeControllerSparks,welcomeControllerMagicPlane} from './welcomeControllerMagic.js';
import {createBrushControllerV2} from './brushControllerV2.js';
import {createRcBugControllerV2} from './rcBugControllerV2.js';

const supported=['meta-quest-touch-plus','oculus-touch-v3'];
const actions={'controls-face':['a-button','b-button','x-button','y-button'],'controls-orb-grab':['squeeze'],'controls-orb-open':['trigger'],'controls-trigger':['trigger'],'controls-grip':['squeeze'],'controls-stick':['thumbstick'],'controls-stick-click':['thumbstick'],'controls-face-first':['a-button','x-button'],'controls-face-second':['b-button','y-button'],'settings-open':['thumbstick'],'settings-close':['thumbstick'],brush:['squeeze','trigger'],point:['trigger'],grab:['squeeze'],gloves:['squeeze'],fly:['trigger','squeeze','thumbstick'],fruit:['squeeze','trigger'],packet:['squeeze','trigger'],seed:['squeeze'],harvest:['squeeze'],water:['squeeze'],trial:['squeeze','trigger']};
const labels={'controls-face':'A · B / X · Y','controls-trigger':'Press both triggers','controls-grip':'Squeeze both grips','controls-stick':'Circle both thumbsticks','controls-stick-click':'Click both thumbsticks','controls-face-first':'A · right / X · left','controls-face-second':'B · right / Y · left','settings-open':'Left stick · open menu','settings-close':'Left stick · close menu',brush:'Grip to hold · trigger to paint',point:'Index finger · trigger',grab:'Middle finger · grip',gloves:'Gently squeeze your grip',fly:'Trigger forward · grip back · stick turns / height',fruit:'Middle finger · grip',packet:'Hold grip · press trigger to open',seed:'Middle finger · grip',harvest:'Pick · release into the basket',water:'Hold grip · tilt the can',trial:'Grip to hold · trigger to act'};

// Official, grip-space-aligned controller assets; never put a guessed button
// location on an unsupported controller. These assets are bundled for offline XR.
export function createWelcomeControllerGuide(scene,{onAssets=()=>{}}={}){
    const sharedCanvas=document.createElement('canvas');sharedCanvas.width=700;sharedCanvas.height=150;const sharedTexture=new THREE.CanvasTexture(sharedCanvas),shared=new THREE.Mesh(new THREE.PlaneGeometry(.135,.029),new THREE.MeshBasicMaterial({map:sharedTexture,transparent:true,depthWrite:false,depthTest:false}));shared.name='Shared controller instruction';shared.visible=false;shared.renderOrder=25;scene.add(shared);let sharedText='';
    const entries=new Map(),loader=new GLTFLoader();let disposed=false,elapsed=0;
    const pending=new THREE.MeshBasicMaterial({color:'#ffc568',transparent:true,opacity:.94,depthWrite:false});
    const pressed=new THREE.MeshBasicMaterial({color:'#8fe5ef',transparent:true,opacity:.97,depthWrite:false});
    function load(profile,hand){
        const key=profile+'/'+hand;if(entries.has(key))return entries.get(key);
        const group=new THREE.Group();group.matrixAutoUpdate=false;group.visible=false;group.userData.welcomeAlwaysConvert=true;scene.add(group);
        const entry={group,ready:false,failed:false,highlights:[],responses:[],targets:new Map()};entries.set(key,entry);
        const base=new URL('../assets/welcome-practice/controllers/'+profile+'/',import.meta.url);
        entry.promise=Promise.all([fetch(new URL('profile.json',base)).then(r=>{if(!r.ok)throw Error('Controller profile unavailable');return r.json();}),loader.loadAsync(new URL(hand+'.glb',base).href)])
            .then(([data,gltf])=>{
                if(disposed){disposeModel(gltf.scene);return;}
                const model=gltf.scene;group.add(model);entry.model=model;entry.tool='standard';entry.mix=0;entry.skin=createWelcomeControllerSkin(model);entry.originalMaterials=new Set();model.traverse(node=>{for(const material of [node.material].flat().filter(Boolean))entry.originalMaterials.add(material);});const bounds=new THREE.Box3().setFromObject(model);entry.magicBounds={min:bounds.min.y-.003,max:bounds.max.y+.003};entry.sparks=createWelcomeControllerSparks(group,entry.magicBounds.min,entry.magicBounds.max);
                // Preserve the hardware model's textures, finish and button legends.
                for(const [id,component] of Object.entries(data.layouts[hand].components)){
                    const kind=id.replace('xr-standard-','');
                    for(const response of Object.values(component.visualResponses || {})){
                        const value=model.getObjectByName(response.valueNodeName),min=model.getObjectByName(response.minNodeName),max=model.getObjectByName(response.maxNodeName);
                        if(value && min && max && response.valueNodeProperty==='transform')entry.responses.push({value,min,max,property:response.componentProperty,indices:component.gamepadIndices});
                    }
                    if(!['trigger','squeeze','thumbstick','a-button','b-button','x-button','y-button'].includes(kind))continue;
                    const response=Object.values(component.visualResponses).find(r=>r.componentProperty==='button'),node=model.getObjectByName(response?.valueNodeName);
                    if(node)entry.targets.set(kind,node);
                    const meshes=[];node?.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});
                    for(const mesh of meshes){if(!entry.targets.get(kind)?.isMesh)entry.targets.set(kind,mesh);const glow=new THREE.Mesh(mesh.geometry,pending),confirmation=new THREE.Mesh(mesh.geometry,pressed),halo=new THREE.Mesh(mesh.geometry,new THREE.MeshBasicMaterial({color:'#ffdca0',transparent:true,opacity:.24,depthWrite:false}));halo.scale.setScalar(1.3);halo.visible=false;halo.renderOrder=4;mesh.add(halo);for(const overlay of [glow,confirmation]){overlay.scale.setScalar(1.16);overlay.visible=false;overlay.renderOrder=5;mesh.add(overlay);}entry.highlights.push({kind,glow,confirmation,halo});
                        if(/^[abxy]-button$/.test(kind)){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,128,128);ctx.fillStyle='#ffffff';ctx.font='bold 92px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(kind[0].toUpperCase(),64,67);mesh.geometry.computeBoundingBox();mesh.updateWorldMatrix(true,false);const box=mesh.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3()),capNormal=new THREE.Vector3(0,0,1).transformDirection(mesh.matrixWorld),sign=capNormal.y>=0?1:-1;const texture=new THREE.CanvasTexture(c),legend=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(size.x,size.y)*.65,Math.min(size.x,size.y)*.65),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}));legend.name=kind+' visible legend';legend.rotation.y=sign<0?Math.PI:0;legend.position.copy(centre);legend.position.z=(sign>0?box.max.z:box.min.z)+sign*size.z*.08;legend.renderOrder=9;mesh.add(legend);}}
                }
                const canvas=document.createElement('canvas');canvas.width=700;canvas.height=150;
                const texture=new THREE.CanvasTexture(canvas),label=new THREE.Mesh(new THREE.PlaneGeometry(.115,.032),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
                label.position.set(hand==='left'?-.16:.16,.025,0);label.renderOrder=8;group.add(label);const link=new THREE.Mesh(new THREE.CylinderGeometry(.00055,.00055,1,5),new THREE.MeshBasicMaterial({color:'#9ea995',transparent:true,opacity:.55,depthWrite:false}));link.name='Controller label connector';group.add(link);Object.assign(entry,{canvas,texture,label,link,ready:true});onAssets();
            }).catch(error=>{entry.failed=true;console.warn('Welcome controller guide:',error.message);});
        return entry;
    }
    function update(dt,controllers,phase,viewer,complete=false,opacity=1,tool='standard',toolState={}){
        shared.visible=false;elapsed+=dt;for(const entry of entries.values())entry.group.visible=false;
        const requested=phase.startsWith('controls-') || phase.startsWith('settings-')?actions[phase] || []:[];
        for(const input of controllers){
            if(input.source.hand || !input.matrix)continue;
            const profile=(input.source.profiles || []).find(id=>supported.includes(id)),hand=input.source.handedness;
            if(!profile || !['left','right'].includes(hand))continue;
            const entry=load(profile,hand);if(!entry.ready)continue;const handReveal=toolState.handReveal?.[hand] || 0;entry.handReveal=handReveal;if((handReveal>=1 && !(hand==='right' && ['paint','insect'].includes(tool))) || opacity<.01){entry.sparks.update(0,elapsed);continue;}
            const nextTool=hand==='right' && ['paint','insect'].includes(tool)?tool:'standard';
            if(nextTool==='paint' && !entry.brushV2){entry.brushV2=createBrushControllerV2(entry.model);entry.group.add(entry.brushV2.group);onAssets();}
            if(nextTool==='insect' && !entry.rcBugV2){entry.rcBugV2=createRcBugControllerV2(entry.model);onAssets();}
            if(nextTool!==entry.tool)entry.tool=nextTool;
            entry.mix=THREE.MathUtils.clamp(entry.mix+(nextTool==='insect'?1:-1)*dt*5,0,1);
            const blend=entry.mix*entry.mix*(3-2*entry.mix);
            entry.skin.update(dt,nextTool==='paint'?'paint':nextTool==='insect'?'insect':'standard');entry.model.visible=true;
            entry.brushV2?.update(nextTool==='paint',toolState.paintColour,input.source.gamepad?.buttons?.[1]?.value || (input.down?1:0));
            if(entry.rcBugV2){
                const axes=input.source.gamepad?.axes || [],axisOffset=axes.length>=4?2:0;
                entry.rcBugV2.update(nextTool==='insect' && blend>.001,{flying:toolState.flying===true,speed:toolState.speed || 0,companion:toolState.companion || 'bee',stickX:axes[axisOffset] || 0,stickY:axes[axisOffset+1] || 0,trigger:input.trigger,grip:input.grip});
            }
            entry.group.visible=true;entry.group.matrix.fromArray(input.matrix);
            const magic=handReveal>0 && nextTool==='standard'?{progress:handReveal,plane:welcomeControllerMagicPlane(input.matrix,entry.magicBounds.min,entry.magicBounds.max)}:null;
            for(const material of entry.originalMaterials)material.userData.welcomeMagic=magic;entry.sparks.update(handReveal,elapsed);
            const fadeTree=(tree,fade)=>{if(tree.userData.controllerFade===fade)return;tree.userData.controllerFade=fade;const materials=tree.userData.controllerFadeMaterials ||= (()=>{const result=new Set();tree.traverse(node=>{for(const m of [node.material].flat().filter(Boolean))result.add(m);});return [...result];})();for(const m of materials){m.userData.controllerBase??={opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite};const base=m.userData.controllerBase;m.opacity=base.opacity*fade;m.transparent=base.transparent || fade<1;m.depthWrite=base.depthWrite && fade>=1;}};
            fadeTree(entry.model,opacity);if(entry.rcBugV2)fadeTree(entry.rcBugV2.group,opacity*blend);
            fadeTree(entry.label,opacity);fadeTree(entry.link,opacity);
            const completed=complete || (toolState.completedHands || []).includes(hand) || phase==='controls-stick-click' && hand==='right' && toolState.rightStickClicked,rightOnly=phase.startsWith('settings-'),activeHand=phase==='controls-stick-click' && toolState.rightStickClicked || (toolState.completedHands || []).includes('right')?'left':'right',handRequested=(rightOnly?hand!=='left':phase==='controls-face'?false:hand!==activeHand)?[]:requested.filter(kind=>!(/^[abxy]-button$/.test(kind)) || (hand==='right'?['a-button','b-button']:['x-button','y-button']).includes(kind));
            entry.label.visible=entry.link.visible=handRequested.length>0 && !completed;
            for(const r of entry.responses){const gamepad=input.source.gamepad;let value=gamepad?.buttons[r.indices.button]?.value || 0;
                if(r.property==='xAxis' || r.property==='yAxis')value=((gamepad?.axes[r.indices[r.property]] || 0)+1)/2;
                if(r.property==='button' && r.indices.button===0)value=Math.max(value,input.trigger?1:0);
                if(r.property==='button' && r.indices.button===1)value=Math.max(value,input.down?1:0);
                value=THREE.MathUtils.clamp(value,0,1);r.value.position.lerpVectors(r.min.position,r.max.position,value);r.value.quaternion.slerpQuaternions(r.min.quaternion,r.max.quaternion,value);
            }
            for(const {kind,glow,confirmation,halo} of entry.highlights){const down=kind==='trigger'?input.trigger:kind==='squeeze'?input.down:kind==='thumbstick'?Boolean(input.source.gamepad?.buttons?.[3]?.pressed || input.source.gamepad?.axes?.some((a,i)=>i>=2 && Math.abs(a)>.18)):Boolean(input.source.gamepad?.buttons?.[kind==='a-button' || kind==='x-button'?4:5]?.pressed),required=handRequested.includes(kind) && !completed,confirmed=Boolean(down || complete);halo.visible=required;halo.scale.setScalar(1.3+.035*Math.sin(elapsed*3));glow.visible=required && !confirmed && !/^[abxy]-button$/.test(kind);confirmation.visible=required && confirmed && !/^[abxy]-button$/.test(kind);glow.scale.setScalar(1.16+.025*Math.sin(elapsed*4));confirmation.scale.setScalar(1.1);}
            if(hand==='left' && toolState.settingsUnlocked){let ring=entry.stickFunction;if(!ring){const target=entry.targets.get('thumbstick');if(target?.isMesh){target.geometry.computeBoundingBox();const box=target.geometry.boundingBox,size=box.getSize(new THREE.Vector3()),centre=box.getCenter(new THREE.Vector3());ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(size.x,size.y)*.58,Math.max(size.x,size.y)*.045,6,32),new THREE.MeshBasicMaterial({color:'#ed6259',depthWrite:false}));ring.name='Thumbstick settings function ring';ring.position.copy(centre);ring.position.z=box.max.z+size.z*.08;target.add(ring);entry.stickFunction=ring;onAssets();}}if(ring)ring.visible=true;}
            const control=handRequested.find(kind=>entry.targets.has(kind));
            const text=phase==='controls-face'?(hand==='right'?'A · B':'X · Y'):phase==='controls-face-first'?(hand==='right'?'Press A':'Press X'):phase==='controls-face-second'?(hand==='right'?'Press B':'Press Y'):phase==='controls-trigger'?'Press trigger':phase==='controls-grip'?'Squeeze grip':phase==='controls-stick'?'Circle thumbstick':phase==='controls-stick-click'?'Click thumbstick':phase==='controls-orb-grab'?'Hold grip beside Orb':phase==='controls-orb-open'?'Trigger opens Orb':labels[phase];if(handRequested.length && entry.text!==text){entry.text=text;entry.canvas.height=150;const ctx=entry.canvas.getContext('2d');ctx.font='500 42px system-ui';entry.textWidth=Math.min(696,Math.ceil(ctx.measureText(text).width)+44);entry.canvas.width=entry.textWidth;ctx.clearRect(0,0,entry.textWidth,150);ctx.fillStyle='rgba(39,57,47,.90)';ctx.beginPath();ctx.roundRect(2,14,entry.textWidth-4,122,12);ctx.fill();ctx.strokeStyle='rgba(220,245,235,.7)';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#f4fff8';ctx.font='500 42px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
                const lines=phase==='fly' && !complete?['Trigger forward · grip back','Stick turns / height']:[text];lines.forEach((line,i)=>ctx.fillText(line,entry.textWidth/2,75+(i-(lines.length-1)/2)*50,660));entry.texture.needsUpdate=true;}
            if(viewer && entry.label.visible){
                const controllerQ=new THREE.Quaternion().setFromRotationMatrix(entry.group.matrix),viewQ=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(viewer));
                // Labels stay outside the hands in viewer space, even as wrists turn.
                const offset=new THREE.Vector3(hand==='left'?-.13:.13,phase==='controls-face'?.15:.055,-.13).applyQuaternion(viewQ).applyQuaternion(controllerQ.clone().invert());
                entry.label.scale.set(1,1,1);
                entry.label.position.copy(offset);entry.label.quaternion.copy(controllerQ.invert().multiply(viewQ));
                entry.group.updateMatrixWorld(true);const target=entry.targets.get(control),start=target?.geometry?.boundingBox?target.localToWorld(target.geometry.boundingBox.getCenter(new THREE.Vector3())):target?.getWorldPosition(new THREE.Vector3()) || entry.group.getWorldPosition(new THREE.Vector3());entry.group.worldToLocal(start);if(control==='trigger' && target){const bounds=new THREE.Box3().setFromObject(target).applyMatrix4(entry.group.matrixWorld.clone().invert()),direction=offset.clone().sub(start).normalize(),surface=new THREE.Ray(start.clone(),direction).intersectBox(bounds,new THREE.Vector3());if(surface)start.copy(surface).addScaledVector(direction,.002);}const toward=start.clone().sub(offset),end=offset.clone().addScaledVector(toward,Math.min(1,.061/Math.max(.001,toward.length()))),direction=end.clone().sub(start);entry.link.position.copy(start).add(end).multiplyScalar(.5);entry.link.scale.y=direction.length();entry.link.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
            }

        }
    }
    return {update,preload(sources){return Promise.all(sources.map(source=>{const profile=(source.profiles || []).find(id=>supported.includes(id));return profile && ['left','right'].includes(source.handedness)?load(profile,source.handedness).promise:null;}));},snapshot:()=>[...entries].map(([id,e])=>({id,ready:e.ready,failed:e.failed,visible:e.group.visible,tool:e.tool || 'standard',handReveal:e.handReveal || 0,settingsRing:Boolean(e.stickFunction?.visible),labelVisible:Boolean(e.group.visible && e.label?.visible),text:e.text,connectorStart:e.link?.position.toArray(),labelScale:e.label?.scale.x || 1,connectorLength:e.link?.scale.y || 0,pose:e.group.matrix.elements.slice(),sparks:e.sparks?.snapshot?.() || (e.handReveal>0 && e.handReveal<1),rcBugV2:Boolean(e.rcBugV2),hardwareVisible:Boolean(e.model?.visible),highlighted:e.highlights.filter(h=>h.glow.visible || h.confirmation.visible).map(h=>h.kind)})),destroy(){disposed=true;scene.remove(shared);shared.geometry.dispose();shared.material.dispose();sharedTexture.dispose();for(const {group,texture,skin,prototype,rcBugV2,brushV2,sparks} of entries.values()){brushV2?.destroy();rcBugV2?.destroy();prototype?.dispose();sparks?.destroy();skin?.destroy();scene.remove(group);disposeModel(group);texture?.dispose();}entries.clear();pending.dispose();pressed.dispose();}};
}
function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of [n.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>{t.image?.close?.();t.dispose();});}
