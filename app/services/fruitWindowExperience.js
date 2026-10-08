import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {OrbitControls} from '../assets/fruit-window/vendor/OrbitControls.js';
import {FruitDiscoveryAsset} from '../assets/fruit-window/discovery-runtime.js';
import {FRUIT_WINDOW_LIBRARY,fruitWindowSpecies,fruitWindowCanPick,FruitWindowGripPair} from './fruitWindowInteraction.js';
import {createFruitWindowXR} from './fruitWindowXR.js';

const assets=new URL('../assets/fruit-window/',import.meta.url);
const vector=point=>new THREE.Vector3(point.x,point.y,point.z);
const visible=node=>{for(let parent=node;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
const disposeScene=scene=>scene?.traverse(node=>{if(!node.isMesh)return;node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material]){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});

export function createFruitWindowExperience({root=document.body,identity={},onHide=()=>{},onState=()=>{}}={}){
    if(!document.querySelector('link[data-fruit-window-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./fruitWindow.css',import.meta.url).href;style.dataset.fruitWindowStyle='';document.head.append(style);}
    const element=document.createElement('section');element.className='nlxr-fruit-window';element.setAttribute('aria-label','Fruit Window');
    element.innerHTML=`<header><strong>Fruit Window</strong><button type="button" data-action="hide">Hide Fruit Window</button></header><p class="fruit-window-context"></p><label class="fruit-window-library">Plant example <select aria-label="Fruit Window plant"></select></label><div class="fruit-window-view"><canvas aria-label="Interactive plant model"></canvas><button class="fruit-window-grip left" aria-label="Left window grip">❮</button><button class="fruit-window-grip right" aria-label="Right window grip">❯</button></div><p class="fruit-window-status" role="status"></p><nav aria-label="Fruit Window actions"></nav><p class="fruit-window-help">Point to feel the leaves move. Select the arrowed fruit to pick it. Hold both grips to move the window.</p>`;
    root.append(element);
    const canvas=element.querySelector('canvas'),status=element.querySelector('.fruit-window-status'),context=element.querySelector('.fruit-window-context'),select=element.querySelector('select'),nav=element.querySelector('nav');
    for(const item of FRUIT_WINDOW_LIBRARY){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.append(option);}
    const actions=[['BUD','Bud'],['FLOWER','Flower'],['FRUIT_SET','Fruit set'],['DEVELOPING','Growing'],['RIPE','Harvest'],['play','Grow'],['pause','Pause'],['pick','Pick'],['return','Return'],['open','Open'],['close','Close']];
    for(const [action,label] of actions){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;nav.append(button);}
    const scene=new THREE.Scene();scene.background=new THREE.Color('#172b26');
    scene.add(new THREE.HemisphereLight(0xfff4d7,0x304435,2.8));const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(-1,2,3);scene.add(light);
    const content=new THREE.Group();scene.add(content);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const camera=new THREE.PerspectiveCamera(36,1,.01,20);camera.position.set(.05,.08,1.65);
    const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,0,0);orbit.enableDamping=true;orbit.minDistance=.65;orbit.maxDistance=2.4;orbit.enablePan=false;
    const loader=new GLTFLoader(),raycaster=new THREE.Raycaster(),grips=new FruitWindowGripPair();
    const anchor={position:new THREE.Vector3(.75,1.3,-1.3),quaternion:new THREE.Quaternion()};
    const handleMaterial=new THREE.MeshStandardMaterial({color:0x80c5b0,roughness:.45});
    const handles=['left','right'].map((side,i)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(.04,.009,8,20),handleMaterial.clone());mesh.name='Window_'+side+'_grip';mesh.position.set(i?.345:-.345,0,.055);mesh.userData.gripSide=side;content.add(mesh);return mesh;});
    const beams=handles.map(()=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.0012,.0012,1,5),new THREE.MeshBasicMaterial({color:0xffd88b}));mesh.visible=false;content.add(mesh);return mesh;});
    const arrow=new THREE.Group();arrow.name='Pickable_fruit_arrow';
    const arrowMaterial=new THREE.MeshStandardMaterial({color:0xffdfa1,emissive:0x44330a,roughness:.55});
    const arrowTip=new THREE.Mesh(new THREE.ConeGeometry(.009,.022,8),arrowMaterial);arrowTip.rotation.z=Math.PI;arrow.add(arrowTip);
    const arrowStem=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.018,6),arrowMaterial);arrowStem.position.y=.018;arrow.add(arrowStem);content.add(arrow);arrow.visible=false;
    let asset=null,frame=null,xr=null,xrGl=null,session=null,space=null,shown=true,destroyed=false,loadVersion=0,placed=false,lastTime=0,raf=0,activeSpecies=null,hover=null,leaves=[],hoverOffsets=[],identityValue=identity,identityKey='',hoverAmount=0,hoverNodes=[];
    const pointers=new Map(),selections=new Set();let pointerSnapshot=null,loading=false,lastControlState='';
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    function announce(message){status.textContent=message;element.dataset.status=message;onState();}
    function describeContext(){
        const match=fruitWindowSpecies(identityValue),plant=identityValue.plant||identityValue.commonName||'this PIMO';
        const same=match&&(match.id===activeSpecies?.id||match.id.startsWith('pigeon_pea_')&&activeSpecies?.id.startsWith('pigeon_pea_'));
        context.textContent=same?'Visual example for '+plant:match?'Library example: '+(activeSpecies?.label||'choose a plant')+'. PIMO information remains '+plant+'.':'No matching model for '+plant+'. Library example: '+(activeSpecies?.label||'choose a plant')+'.';
    }
    function syncButtons(){
        element.dataset.stage=asset?.mode||'loading';element.dataset.picked=String(Boolean(asset?.picked));element.dataset.arrow=String(arrow.visible);element.dataset.hover=hover?.kind||'';element.dataset.hoverAmount=String(hoverAmount);element.dataset.grips=String(grips.holds.size);
        for(const button of nav.querySelectorAll('button')){const action=button.dataset.action;button.disabled=!asset||(['pick','open','close'].includes(action)&&!asset.canPick)||(action==='pick'&&asset.picked)||(action==='return'&&!asset.picked);button.setAttribute('aria-pressed',String(asset?.mode===action));}
        const controlState=[Boolean(asset),asset?.canPick,asset?.picked,asset?.mode].join('|');if(controlState!==lastControlState){lastControlState=controlState;onState();}
    }
    function restoreHover(){for(const [node,q] of hoverOffsets)node.quaternion.copy(q);hoverOffsets=[];}
    function botanicalHit(intersection){
        if(!intersection||!visible(intersection.object))return null;
        for(let node=intersection.object;node;node=node.parent){if(node===asset?.fruit||node===arrow)return 'fruit';if(/leaf|leaflet/i.test(node.name))return 'leaf';}
        return null;
    }
    function localRay(ray){const inverse=anchor.quaternion.clone().invert();return {origin:vector(ray.origin).sub(anchor.position).applyQuaternion(inverse),direction:vector(ray.direction).applyQuaternion(inverse).normalize()};}
    function cast(ray){content.updateMatrixWorld(true);raycaster.set(ray.origin,ray.direction);return raycaster.intersectObjects(content.children,true).filter(hit=>visible(hit.object));}
    function handleAt(ray){const local=localRay(ray);return handles.find(handle=>new THREE.Ray(local.origin,local.direction).intersectSphere(new THREE.Sphere(handle.position,.065),new THREE.Vector3()));}
    function restoreXR(){xr?.destroy();xr=null;if(xrGl&&!destroyed&&asset){xr=createFruitWindowXR(xrGl,content);xr.update();}}
    async function choose(id){
        const item=FRUIT_WINDOW_LIBRARY.find(item=>item.id===id);if(!item)return;
        const version=++loadVersion;loading=true;activeSpecies=item;select.value=id;describeContext();hover=null;hoverAmount=0;hoverNodes=[];grips.reset();restoreHover();arrow.visible=false;
        xr?.destroy();xr=null;if(asset){content.remove(asset.object);asset.dispose();asset=null;}leaves=[];syncButtons();announce('Loading '+item.label+'…');
        let gltf=null;
        try{
            const response=await fetch(new URL(item.folder+'/runtime-manifest.json',assets));if(!response.ok)throw Error('Model information unavailable');const manifest=await response.json(),config=manifest.species[id];
            gltf=await loader.loadAsync(new URL(item.folder+'/'+config.scene,assets).href);
            if(destroyed||version!==loadVersion){disposeScene(gltf.scene);return;}
            asset=new FruitDiscoveryAsset(gltf,config);asset.object.position.y=-.4;content.add(asset.object);
            asset.object.traverse(node=>{if(node.isMesh&&/leaf|leaflet/i.test(node.name)&&!/(stalk|vein|petiole)/i.test(node.name))leaves.push(node);});
            if(!frame){const loaded=await loader.loadAsync(new URL('discovery_window_frame.glb',assets).href);if(destroyed||version!==loadVersion){disposeScene(loaded.scene);return;}frame=loaded.scene;frame.position.y=-.4;content.add(frame);}
            restoreXR();syncButtons();announce(item.label+' ready. The arrow marks the fruit you can pick.');onState();
        }catch(error){if(!destroyed&&version===loadVersion){announce('Unable to load '+item.label+'. Try loading it again.');console.error('[Fruit Window]',error);}}
        finally{if(version===loadVersion)loading=false;}
    }
    function updateIdentity(next){
        identityValue=next||{};const match=fruitWindowSpecies(identityValue),key=[identityValue.plant||identityValue.commonName,identityValue.scientific||identityValue.scientificName].join('|'),changed=key!==identityKey;identityKey=key;
        if(match&&changed&&match.id!==activeSpecies?.id)choose(match.id);
        else if(!activeSpecies)choose('mamey_sapote');
        describeContext();
    }
    function action(name){
        if(name==='hide'){onHide();return;}if(!asset)return;
        restoreHover();hover=null;
        if(asset.stages[name])asset.showStage(name);
        else if(name==='play')asset.play();else if(name==='pause')asset.pause();
        else if(name==='pick')asset.pick(content);else if(name==='return')asset.returnFruit();
        else if(name==='open')asset.open();else if(name==='close')asset.close();
        syncButtons();onState();
    }
    element.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button&&!button.disabled)action(button.dataset.action);});select.addEventListener('change',()=>choose(select.value));
    function pointRay(event){const box=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),camera);return {origin:raycaster.ray.origin.clone(),direction:raycaster.ray.direction.clone()};}
    canvas.addEventListener('pointermove',event=>{hover=cast(pointRay(event)).map(hit=>({hit,kind:botanicalHit(hit)})).find(value=>value.kind)||null;canvas.style.cursor=hover?.kind==='fruit'&&fruitWindowCanPick(asset)?'pointer':'grab';});
    canvas.addEventListener('pointerleave',()=>{hover=null;});
    let clickStart=null;canvas.addEventListener('pointerdown',event=>{clickStart={x:event.clientX,y:event.clientY};});
    canvas.addEventListener('pointerup',event=>{if(clickStart&&Math.hypot(event.clientX-clickStart.x,event.clientY-clickStart.y)<5&&hover?.kind==='fruit'&&fruitWindowCanPick(asset))action('pick');clickStart=null;});
    // On touch screens, both explicit handles must remain pressed. A lone
    // contact can orbit the model but cannot shift the physical window.
    for(const button of element.querySelectorAll('.fruit-window-grip')){
        button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);const side=button.classList.contains('left')?'left':'right';if([...pointers.values()].some(point=>point.side===side))return;pointers.set(event.pointerId,{side,x:event.clientX,y:event.clientY});pointerSnapshot=null;button.classList.add('held');});
        button.addEventListener('pointermove',event=>{const point=pointers.get(event.pointerId);if(!point)return;point.x=event.clientX;point.y=event.clientY;if(pointers.size!==2)return;const values=[...pointers.values()],center={x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2};if(!pointerSnapshot){const box=element.getBoundingClientRect();pointerSnapshot={...center,left:box.left,top:box.top};return;}element.style.left=Math.max(0,Math.min(innerWidth-element.offsetWidth,pointerSnapshot.left+center.x-pointerSnapshot.x))+'px';element.style.top=Math.max(0,Math.min(innerHeight-80,pointerSnapshot.top+center.y-pointerSnapshot.y))+'px';});
        const release=event=>{pointers.delete(event.pointerId);pointerSnapshot=null;button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    }
    const resize=new ResizeObserver(()=>{const box=canvas.getBoundingClientRect();if(box.width&&box.height){renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();}});resize.observe(canvas);
    function advance(time){
        const delta=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;restoreHover();asset?.update(delta);
        hoverAmount+=((hover&&!reduced?1:0)-hoverAmount)*(1-Math.exp(-delta*8));
        // Keep a soft envelope so foliage settles instead of snapping back.
        if(hover){const nearby=hover.hit.point;hoverNodes=[...leaves].sort((a,b)=>a.getWorldPosition(new THREE.Vector3()).distanceToSquared(nearby)-b.getWorldPosition(new THREE.Vector3()).distanceToSquared(nearby)).slice(0,5);if(hover.kind==='fruit')hoverNodes.unshift(asset.fruit);}
        const strength=Math.sin(time*.004)*.025*hoverAmount;
        if(strength&&asset)for(const node of hoverNodes){if(!visible(node)||asset.motion)continue;hoverOffsets.push([node,node.quaternion.clone()]);node.rotateZ(strength*(node===asset.fruit?.35:1));}
        content.updateMatrixWorld(true);arrow.visible=fruitWindowCanPick(asset);
        if(arrow.visible){const box=new THREE.Box3().setFromObject(asset.fruit);arrow.position.set((box.min.x+box.max.x)/2,box.max.y+.035,(box.min.z+box.max.z)/2);}
        syncButtons();if(xrGl)xr?.update();
    }
    function tick(time){
        raf=0;if(destroyed||!shown)return;if(!xrGl){advance(time);orbit.update();renderer.render(scene,camera);}raf=requestAnimationFrame(tick);
    }
    const api={element,anchor,grips,
        show(next=identityValue){shown=true;element.hidden=Boolean(xrGl);updateIdentity(next);if(!asset&&!loading&&activeSpecies)choose(activeSpecies.id);lastTime=performance.now();if(!raf)raf=requestAnimationFrame(tick);onState();},
        hide(){shown=false;element.hidden=true;asset?.pause();grips.reset();selections.clear();pointers.clear();pointerSnapshot=null;hover=null;hoverAmount=0;restoreHover();if(raf)cancelAnimationFrame(raf);raf=0;onState();},
        action,
        nextExample(){const index=FRUIT_WINDOW_LIBRARY.findIndex(item=>item.id===activeSpecies?.id);choose(FRUIT_WINDOW_LIBRARY[(index+1)%FRUIT_WINDOW_LIBRARY.length].id);},
        getLabel(){return activeSpecies?.label||'Plant example';},
        getInteractionTargets(){
            content.updateMatrixWorld(true);const worldCenter=node=>new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).applyQuaternion(anchor.quaternion).add(anchor.position);
            return {leaf:leaves.find(visible)?worldCenter(leaves.find(visible)):null,fruit:asset&&visible(asset.fruit)?worldCenter(asset.fruit):null};
        },
        canAction(name){return Boolean(asset)&&(!['pick','open','close'].includes(name)||asset.canPick)&&(name!=='pick'||!asset.picked)&&(name!=='return'||asset.picked);},
        attach(gl){if(gl===xrGl)return;xrGl=gl;element.hidden=Boolean(gl)||!shown;restoreXR();},
        bindSession(next,referenceSpace){grips.reset();session=next;space=referenceSpace;placed=false;},
        updateSpatial(pose,time,inputRay,xrFrame){
            if(!shown||!xrGl)return;
            if(!placed&&pose){anchor.position.copy(vector(pose.center)).addScaledVector(vector(pose.right),.75);anchor.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(vector(pose.right),vector(pose.up),vector(pose.normal)));placed=true;}
            if(xrFrame&&session){const points=new Map();for(const source of grips.holds.keys()){let grip=null;try{grip=xrFrame.getPose(source.gripSpace||source.targetRaySpace,space)?.transform.position;}catch{}if(Array.from(session.inputSources||[]).includes(source)&&source.gamepad?.buttons?.[1]?.pressed!==false&&grip)points.set(source,grip);}grips.update(points,anchor);
                for(let i=0;i<handles.length;i++){const handle=handles[i],hold=[...grips.holds.values()].find(hold=>hold.side===handle.userData.gripSide);handle.material.color.setHex(hold?0xffd88b:0x80c5b0);beams[i].visible=Boolean(hold);if(hold){const start=hold.point.clone().sub(anchor.position).applyQuaternion(anchor.quaternion.clone().invert()),direction=handle.position.clone().sub(start);beams[i].position.copy(start).add(handle.position).multiplyScalar(.5);beams[i].scale.set(1,direction.length(),1);beams[i].quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());}}
            }
            const ray=inputRay?.origin&&inputRay.direction?localRay(inputRay):null;hover=ray?cast(ray).map(hit=>({hit,kind:botanicalHit(hit)})).find(value=>value.kind)||null:null;
            advance(time);
        },
        handleEvent(event){
            if(!shown||!xrGl||!space)return false;const source=event.inputSource;
            if(selections.has(source)){if(event.type==='select')selections.delete(source);return true;}
            if(event.type==='squeezeend')return grips.release(source);
            if(event.type==='squeezestart'){
                let transform=null,grip=null;try{transform=event.frame?.getPose(source.targetRaySpace,space)?.transform;grip=event.frame?.getPose(source.gripSpace||source.targetRaySpace,space)?.transform.position;}catch{}
                if(!transform||!grip)return false;const m=transform.matrix,ray={origin:{x:m[12],y:m[13],z:m[14]},direction:{x:-m[8],y:-m[9],z:-m[10]}},handle=handleAt(ray);
                return Boolean(handle&&grips.press(source,handle.userData.gripSide,grip));
            }
            if(grips.owns(source))return true;
            if(event.type==='selectstart'){
                let transform;try{transform=event.frame?.getPose(source.targetRaySpace,space)?.transform;}catch{}if(!transform)return false;
                const m=transform.matrix,hits=cast(localRay({origin:{x:m[12],y:m[13],z:m[14]},direction:{x:-m[8],y:-m[9],z:-m[10]}}));
                if(hits.some(hit=>botanicalHit(hit)==='fruit')&&fruitWindowCanPick(asset)){action('pick');selections.add(source);return true;}
            }
            return false;
        },
        activate(ray){if(!shown||!xrGl||!ray)return false;const hit=cast(localRay(ray)).find(hit=>botanicalHit(hit));if(!hit)return false;if(botanicalHit(hit)==='fruit'&&fruitWindowCanPick(asset))action('pick');return true;},
        draw(view){if(shown&&xr)xr.draw(view,anchor);},
        resetGrips(){grips.reset();},
        owns(source){return grips.owns(source)||selections.has(source);},
        rebase(matrix){anchor.position.applyMatrix4(new THREE.Matrix4().fromArray(matrix));anchor.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(matrix)));grips.reset();},
        destroy(){if(destroyed)return;destroyed=true;loadVersion++;api.hide();resize.disconnect();xr?.destroy();orbit.dispose();asset?.dispose();disposeScene(frame);for(const handle of [...handles,...beams]){handle.geometry.dispose();handle.material.dispose();}arrowTip.geometry.dispose();arrowStem.geometry.dispose();arrowMaterial.dispose();handleMaterial.dispose();renderer.dispose();element.remove();}
    };
    api.show(identity);return api;
}
