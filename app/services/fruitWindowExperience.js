import * as THREE from '../assets/fruit-window/vendor/three.module.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {OrbitControls} from '../assets/fruit-window/vendor/OrbitControls.js';
import {FruitDiscoveryAsset} from '../assets/fruit-window/discovery-runtime.js';
import {FRUIT_WINDOW_LIBRARY,fruitWindowSpecies,fruitWindowCanPick,FruitWindowGripPair,FruitWindowTriggerHold} from './fruitWindowInteraction.js';
import {createFruitWindowXR} from './fruitWindowXR.js';
import {localizedCanvasContext,translateNxrText as t,translateApp} from './i18n.js';
import {spatialStick} from './spatialStick.js';
import {handTrackingState} from './xrPointer.js';

const assets=new URL('../assets/fruit-window/',import.meta.url);
const vector=point=>new THREE.Vector3(point.x,point.y,point.z);
const visible=node=>{for(let parent=node;parent;parent=parent.parent)if(!parent.visible)return false;return true;};
const disposeScene=scene=>scene?.traverse(node=>{if(!node.isMesh)return;node.geometry.dispose();for(const material of Array.isArray(node.material)?node.material:[node.material]){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}});
export function fruitWindowMotionActive(asset,{held=0,hover=false,hoverAmount=0,hoverOffsets=0}={}){return Boolean(asset?.playing || asset?.motion || Math.abs((asset?.opening||0)-(asset?.targetOpening||0))>1e-5 || held || hover || hoverAmount>.0001 || hoverOffsets);}
export function fruitWindowFit(size){return Math.min(.57/Math.max(.001,size.x,size.y),.26/Math.max(.001,size.z));}
export function fruitWindowVisibleBounds(root,box=new THREE.Box3()){
 box.makeEmpty();root.traverse(node=>{if(node.isMesh&&visible(node)){if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();box.union(node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));}});return box;
}
export function fruitHandPose(state){
 if(!state?.tracked)return null;
 const index=state.rawJoints.get('index-finger-tip'),thumb=state.rawJoints.get('thumb-tip'),wrist=state.rawJoints.get('wrist');
 if(!index||!thumb||!wrist)return null;
 const position=new THREE.Vector3((index.x+thumb.x)/2,(index.y+thumb.y)/2,(index.z+thumb.z)/2),quaternion=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(wrist.matrix));
 return {position,orientation:quaternion,matrix:new THREE.Matrix4().compose(position,quaternion,new THREE.Vector3(1,1,1)).elements};
}

export function createFruitWindowExperience({root=document.body,identity={},showLibraryChoices=true,onHide=()=>{},onState=()=>{},onMedia=()=>{}}={}){
    if(!document.querySelector('link[data-fruit-window-style]')){const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./fruitWindow.css',import.meta.url).href;style.dataset.fruitWindowStyle='';document.head.append(style);}
    const element=document.createElement('section');element.className='nlxr-fruit-window';element.setAttribute('aria-label','Fruit Window');
    element.innerHTML=`<header><strong>Fruit Window</strong><button type="button" data-action="hide">Hide Fruit Window</button></header><p class="fruit-window-context"></p><label class="fruit-window-library">Plant example <select aria-label="Fruit Window plant"></select></label><div class="fruit-window-view"><canvas aria-label="Interactive plant model"></canvas><button class="fruit-window-grip left" aria-label="Left window grip">❮</button><button class="fruit-window-grip right" aria-label="Right window grip">❯</button></div><p class="fruit-window-status" role="status"></p><nav aria-label="Fruit Window actions"></nav><p class="fruit-window-help">Point to feel the leaves move. Select the arrowed fruit to pick it. Hold both grips to move the window. Hold fruit with both pointers and pull apart to open it.</p>`;
    root.append(element);
    element.querySelector('.fruit-window-library').hidden=!showLibraryChoices;
    const canvas=element.querySelector('canvas'),status=element.querySelector('.fruit-window-status'),context=element.querySelector('.fruit-window-context'),select=element.querySelector('select'),nav=element.querySelector('nav');
    for(const item of FRUIT_WINDOW_LIBRARY){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;select.append(option);}
    const actions=[['play','Play development'],['pause','Pause'],['return','Return fruit']];
    for(const [action,label] of actions){const button=document.createElement('button');button.type='button';button.dataset.action=action;button.textContent=label;nav.append(button);}
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x20372e);
    scene.add(new THREE.HemisphereLight(0xfff9ee,0x718477,1.6));const light=new THREE.DirectionalLight(0xfff4e0,1.6);light.position.set(-1,2,3);scene.add(light);
    const content=new THREE.Group();scene.add(content);
    const plantMount=new THREE.Group();content.add(plantMount);
    const branchSupports=new THREE.Group();content.add(branchSupports);
    const nameCanvas=document.createElement('canvas');nameCanvas.width=768;nameCanvas.height=112;
    const nameTexture=new THREE.CanvasTexture(nameCanvas);nameTexture.colorSpace=THREE.SRGBColorSpace;const nameMaterial=new THREE.MeshBasicMaterial({map:nameTexture,transparent:true,depthWrite:false});
    const nameplate=new THREE.Mesh(new THREE.PlaneGeometry(.48,.064),nameMaterial);nameplate.position.set(0,.278,.162);nameplate.renderOrder=20;content.add(nameplate);
    const plaque=new THREE.Mesh(new THREE.BoxGeometry(.49,.074,.004),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,transparent:true,opacity:.65,depthWrite:false}));plaque.position.set(0,.278,.158);plaque.renderOrder=10;content.add(plaque);
    const playCanvas=document.createElement('canvas');playCanvas.width=128;playCanvas.height=128;const pc=playCanvas.getContext('2d');pc.fillStyle='rgba(25,51,40,.9)';pc.beginPath();pc.roundRect(2,2,124,124,28);pc.fill();pc.strokeStyle='#bbebc7';pc.lineWidth=4;pc.stroke();pc.fillStyle='#f8ffed';pc.beginPath();pc.moveTo(48,32);pc.lineTo(94,64);pc.lineTo(48,96);pc.closePath();pc.fill();
    const playTexture=new THREE.CanvasTexture(playCanvas),playMaterial=new THREE.MeshBasicMaterial({map:playTexture,transparent:true,depthWrite:false});
    const playButton=new THREE.Mesh(new THREE.PlaneGeometry(.07,.07),playMaterial);playButton.position.set(.26,-.36,.166);playButton.name='Flower_development_play';content.add(playButton);
    playButton.visible=true;
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    const camera=new THREE.PerspectiveCamera(36,1,.01,20);camera.position.set(.02,.02,1.18);
    const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,0,0);orbit.enableDamping=true;orbit.minDistance=.65;orbit.maxDistance=2.4;orbit.enablePan=false;
    const loader=new GLTFLoader(),raycaster=new THREE.Raycaster(),grips=new FruitWindowGripPair(),fruitHold=new FruitWindowTriggerHold();
    const anchor={position:new THREE.Vector3(.75,1.3,-1.3),quaternion:new THREE.Quaternion()};
    const handleMaterial=new THREE.MeshStandardMaterial({color:0x80c5b0,roughness:.45});
    const handles=['left','right'].map((side,i)=>{const mesh=new THREE.Mesh(new THREE.TorusGeometry(.025,.0035,8,20),handleMaterial.clone());mesh.name='Window_'+side+'_grip';mesh.position.set(i?.345:-.345,0,.12);mesh.userData.gripSide=side;content.add(mesh);return mesh;});
    const beams=handles.map(()=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.0012,.0012,1,5),new THREE.MeshBasicMaterial({color:0xffd88b}));mesh.visible=false;content.add(mesh);return mesh;});
    const arrow=new THREE.Group();arrow.name='Pickable_fruit_arrow';
    const arrowMaterial=new THREE.MeshStandardMaterial({color:0xffdfa1,emissive:0x44330a,roughness:.55});
    const arrowTip=new THREE.Mesh(new THREE.ConeGeometry(.009,.022,8),arrowMaterial);arrowTip.rotation.z=Math.PI;arrow.add(arrowTip);
    const arrowStem=new THREE.Mesh(new THREE.CylinderGeometry(.003,.003,.018,6),arrowMaterial);arrowStem.position.y=.018;arrow.add(arrowStem);content.add(arrow);arrow.visible=false;
    let asset=null,frame=null,xr=null,xrGl=null,session=null,space=null,shown=true,destroyed=false,loadVersion=0,placed=false,lastTime=0,raf=0,activeSpecies=null,hover=null,leaves=[],hoverOffsets=[],identityValue=identity,identityKey='',hoverAmount=0,hoverNodes=[];
    const pointers=new Map(),selections=new Set(),handPinches=new Map(),castCache=new Map();let rayMeshes=[],hoverCastAt=-Infinity,pointerSnapshot=null,loading=false,lastControlState='',hoverSampleAt=-Infinity,modelDirty=true,arrowSampleAt=-Infinity,modelUpdates=0,boundsUpdates=0;
    let dockPose=null,magnetized=true,fadeStartedAt=null,fadeTimer=0;
    const fadeOpacity=time=>fadeStartedAt===null?1:Math.max(0,1-(time-fadeStartedAt)/550);
    function finishBoxGrip(){if(!grips.holds.size && dockPose && anchor.position.distanceTo(dockPose.position)<.22){anchor.position.copy(dockPose.position);anchor.quaternion.copy(dockPose.quaternion);magnetized=true;}}
    function joinBranchToWalls(){
        disposeScene(branchSupports);branchSupports.clear();let wood=null,best=0;
        asset.object.traverse(node=>{if(!node.isMesh || !/woody|branch|trunk|stem/i.test(node.name) || /leaf|stalk|vein|petiole|fruit/i.test(node.name))return;const box=new THREE.Box3().setFromObject(node),score=box.getSize(new THREE.Vector3()).lengthSq();if(score>best){wood=node;best=score;}});
        if(!wood)return;
        const box=new THREE.Box3().setFromObject(wood),size=box.getSize(new THREE.Vector3()),axis=size.x>size.y?'x':'y',attribute=wood.geometry.attributes.position;
        const points=[];
        for(let i=0;i<attribute.count;i++)points.push(content.worldToLocal(new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(wood.matrixWorld)));
        points.sort((a,b)=>a[axis]-b[axis]);
        const span=points.at(-1)[axis]-points[0][axis];if(span<.001)return;
        for(const side of [-1,1]){
            const extreme=side<0?points[0][axis]:points.at(-1)[axis],distance=p=>side*(extreme-p[axis]);
            const tip=points.filter(p=>distance(p)<=span*.04),neck=points.filter(p=>distance(p)>=span*.12 && distance(p)<=span*.28);
            if(!tip.length || !neck.length)continue;
            const centre=cloud=>cloud.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(cloud.length);
            const point=centre(tip),inside=centre(neck),direction=point.clone().sub(inside).normalize();
            if(direction[axis]*side<=.1)continue;
            const radii=tip.map(p=>{const offset=p.clone().sub(point);return offset.addScaledVector(direction,-offset.dot(direction)).length();}).sort((a,b)=>a-b);
            const radius=THREE.MathUtils.clamp(radii[Math.floor(radii.length*.65)],.0015,.012);
            const start=point.clone().addScaledVector(direction,-radius*2);
            // Continue the actual end tangent until it enters an enclosure wall.
            // A shallow curve and taper keep this part of the branch, not a rail.
            const contacts=['x','y'].map(key=>Math.abs(direction[key])>.001?((direction[key]>0?.324:-.324)-start[key])/direction[key]:Infinity).filter(value=>value>0);
            const length=Math.min(...contacts);if(!Number.isFinite(length)||length<.002)continue;
            const end=start.clone().addScaledVector(direction,length);
            const bend=new THREE.Vector3(-direction.y,direction.x,0).normalize().multiplyScalar(Math.min(.012,length*.06)*side);
            const curve=new THREE.CatmullRomCurve3([start,start.clone().addScaledVector(direction,length*.32),start.clone().addScaledVector(direction,length*.7).add(bend),end]);
            for(const p of curve.points)p.z=THREE.MathUtils.clamp(p.z,-.045,.045);
            const geometry=new THREE.TubeGeometry(curve,12,radius,8,false),positions=geometry.attributes.position;
            for(let ring=0;ring<=12;ring++){
                const amount=ring/12,c=curve.getPointAt(amount),taper=1-.18*amount;
                for(let segment=0;segment<=8;segment++){const index=ring*9+segment,p=new THREE.Vector3().fromBufferAttribute(positions,index).sub(c).multiplyScalar(taper*(1+.025*Math.sin(segment*2.4+ring*.8))).add(c);positions.setXYZ(index,p.x,p.y,p.z);}
            }
            geometry.computeVertexNormals();
            const original=Array.isArray(wood.material)?wood.material[0]:wood.material,extension=new THREE.Mesh(geometry,original.clone());
            extension.name='Observation_branch_extension';branchSupports.add(extension);
        }
    }
    const fruitBox=new THREE.Box3(),fruitCenter=new THREE.Vector3(),observationBounds=new THREE.Box3(new THREE.Vector3(-.43,-.44,-.18),new THREE.Vector3(.43,.4,.27));
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let statusCopy=null;
    function announce(message){statusCopy=message;status.textContent=message();element.dataset.status=status.textContent;translateApp(element);onState();}
    function labelWindow(item){const ctx=localizedCanvasContext(nameCanvas.getContext('2d'));ctx.clearRect(0,0,768,112);ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#ffffff';ctx.shadowOffsetY=1;ctx.fillStyle='#20372e';ctx.font='750 39px Manrope, system-ui';ctx.fillText(item.label,384,36,720);ctx.font='italic 500 27px Manrope, system-ui';ctx.fillText(item.scientific,384,82,720);ctx.shadowOffsetY=0;nameTexture.needsUpdate=true;}
    function describeContext(){
        const match=fruitWindowSpecies(identityValue),plant=identityValue.plant||identityValue.commonName||'this PIMO';
        const same=match&&(match.id===activeSpecies?.id||match.id.startsWith('pigeon_pea_')&&activeSpecies?.id.startsWith('pigeon_pea_'));
        context.textContent=same?t('Visual example for')+' '+t(plant):match?t('Library example')+': '+t(activeSpecies?.label||'choose a plant')+'. '+t('PIMO information remains')+' '+t(plant)+'.':t('No matching model for')+' '+t(plant)+'. '+t('Library example')+': '+t(activeSpecies?.label||'choose a plant')+'.';
    }
    function syncButtons(){
        const values={stage:asset?.mode||'loading',picked:String(Boolean(asset?.picked)),arrow:String(arrow.visible),hover:hover?.kind||'',hoverAmount:String(Math.round(hoverAmount*100)/100),grips:String(grips.holds.size)};
        for(const [key,value] of Object.entries(values))if(element.dataset[key]!==value)element.dataset[key]=value;
        const controlState=[Boolean(asset),asset?.canPick,asset?.picked,asset?.mode].join('|');if(controlState===lastControlState)return;
        for(const button of nav.querySelectorAll('button')){const action=button.dataset.action;button.disabled=!asset||(['pick','open','close'].includes(action)&&!asset.canPick)||(action==='pick'&&asset.picked)||(action==='return'&&!asset.picked);button.setAttribute('aria-pressed',String(asset?.mode===action));}
        lastControlState=controlState;onState();
    }
    function restoreHover(){for(const [node,q] of hoverOffsets)node.quaternion.copy(q);hoverOffsets=[];}
    function botanicalHit(intersection){
        if(!intersection||!visible(intersection.object))return null;
        for(let node=intersection.object;node;node=node.parent){if(node===playButton)return 'play';if(asset?.pickableRigs.has(node)||asset?.detachedParts.includes(node)||node===arrow)return 'fruit';if(/leaf|leaflet/i.test(node.name))return 'leaf';}
        return null;
    }
    function hitFruit(hit){for(let node=hit?.object;node;node=node.parent)if(asset?.pickableRigs.has(node)||asset?.detachedParts.includes(node))return node;return asset?.mainFruit;}
    function localSourcePose(transform){return {position:vector(transform.position).sub(anchor.position).applyQuaternion(anchor.quaternion.clone().invert()),quaternion:anchor.quaternion.clone().invert().multiply(new THREE.Quaternion(transform.orientation.x,transform.orientation.y,transform.orientation.z,transform.orientation.w))};}
    function pickHit(hit){
        if(fruitHold.holds.size>=2)return false;
        if(!asset?.canPick)return false;const fruit=hitFruit(hit);
        if(asset.detachedParts.includes(fruit))return true;
        if(fruitHold.source!==null && fruit!==asset.fruit)return false;
        if(asset.picked && fruit===asset.fruit)return !asset.motion;
        if(!asset.selectFruit(fruit))return false;return asset.pick(content,{hold:true});
    }
    function localRay(ray){const inverse=anchor.quaternion.clone().invert();return {origin:vector(ray.origin).sub(anchor.position).applyQuaternion(inverse),direction:vector(ray.direction).applyQuaternion(inverse).normalize()};}
    function cast(ray){
        if(!asset?.picked && !fruitHold.holds.size && !new THREE.Ray(ray.origin,ray.direction).intersectsBox(observationBounds))return [];
        const key=[ray.origin.x,ray.origin.y,ray.origin.z,ray.direction.x,ray.direction.y,ray.direction.z].join('|');if(castCache.has(key))return castCache.get(key);
        content.updateMatrixWorld(true);raycaster.set(ray.origin,ray.direction);
        // Hidden development and cutaway meshes must never consume triangle
        // intersection work. Reuse contacts requested by several UI consumers.
        const hits=raycaster.intersectObjects(rayMeshes.filter(visible),false);
        // The enclosure still blocks picking through its back or sides.
        const wall=hits.findIndex(hit=>hit.object.parent===frame);
        const result=wall<0?hits:hits.slice(0,wall+1);if(castCache.size>=8)castCache.clear();castCache.set(key,result);return result;
    }
    function handFruitHit(transform){
        if(!asset?.canPick||!transform)return null;
        content.updateMatrixWorld(true);const point=localSourcePose(transform).position,box=new THREE.Box3(),candidates=asset.detachedParts.length?asset.detachedParts:[...asset.pickableRigs.keys()];
        let nearest=null,distance=Infinity;
        for(const fruit of candidates){if(!visible(fruit))continue;fruitWindowVisibleBounds(fruit,box);const d=box.distanceToPoint(point);if(d<.045&&d<distance){nearest={object:fruit,point:point.clone(),distance:d};distance=d;}}
        return nearest;
    }
    function beginHandFruit(source,state){
        const transform=fruitHandPose(state);if(!transform)return false;
        const hit=handFruitHit(transform)||(state.pointer?cast(localRay(state.pointer)).find(hit=>botanicalHit(hit)==='fruit'):null);
        if(!hit||!pickHit(hit))return false;
        const held=fruitHold.begin(source,hitFruit(hit),localSourcePose(transform),performance.now());if(held){selections.add(source);modelDirty=true;syncButtons();}return held;
    }
    function handleAt(ray){const local=localRay(ray);return handles.find(handle=>new THREE.Ray(local.origin,local.direction).intersectSphere(new THREE.Sphere(handle.position,.065),new THREE.Vector3()));}
    function restoreXR(){xr?.destroy();xr=null;if(xrGl&&!destroyed&&asset){xr=createFruitWindowXR(xrGl,content);xr.update();}}
    async function choose(id){
        const item=FRUIT_WINDOW_LIBRARY.find(item=>item.id===id);if(!item)return;
        const version=++loadVersion;loading=true;modelDirty=true;arrowSampleAt=-Infinity;activeSpecies=item;select.value=id;describeContext();labelWindow(item);hover=null;hoverAmount=0;hoverNodes=[];grips.reset();fruitHold.reset();selections.clear();restoreHover();arrow.visible=false;
        xr?.destroy();xr=null;if(asset){plantMount.remove(asset.object);asset.dispose();asset=null;}leaves=[];syncButtons();announce(()=>t('Loading')+' '+t(item.label)+'…');
        let gltf=null;
        try{
            const response=await fetch(new URL(item.folder+'/runtime-manifest.json',assets));if(!response.ok)throw Error('Model information unavailable');const manifest=await response.json(),config=manifest.species[id];
            gltf=await loader.loadAsync(new URL(item.folder+'/'+config.scene,assets).href);
            if(destroyed||version!==loadVersion){disposeScene(gltf.scene);return;}
            asset=new FruitDiscoveryAsset(gltf,config);plantMount.position.set(0,0,0);plantMount.scale.setScalar(1);plantMount.add(asset.object);content.updateMatrixWorld(true);
            // Fit the complete branch inside the square, once, independently
            // of the animation mixer so Harvest cannot undo the placement.
            const bounds=fruitWindowVisibleBounds(asset.object);
            const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),scale=fruitWindowFit(size);
            plantMount.scale.setScalar(scale);plantMount.position.set(-center.x*scale,-center.y*scale-.025,-center.z*scale);content.updateMatrixWorld(true);
            joinBranchToWalls();
            asset.object.traverse(node=>{if(node.isMesh&&/leaf|leaflet/i.test(node.name)&&!/(stalk|vein|petiole)/i.test(node.name))leaves.push(node);});
            if(!frame){
                frame=new THREE.Group();frame.name='Fruit_observation_box';
                const back=new THREE.Mesh(new THREE.BoxGeometry(.65,.65,.008),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.22,depthWrite:false}));back.position.z=-.154;frame.add(back);
                const wallMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8,transparent:true,opacity:.3,depthWrite:false});
                for(const [x,y,w,h] of [[0,.325,.66,.012],[0,-.325,.66,.012],[-.325,0,.012,.65],[.325,0,.012,.65]]){
                    const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,.30),wallMaterial);wall.position.set(x,y,0);frame.add(wall);
                }
                const rimMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6,transparent:true,opacity:.8,depthWrite:false});
                for(const [x,y,w,h] of [[0,.325,.66,.009],[0,-.325,.66,.009],[-.325,0,.009,.65],[.325,0,.009,.65]]){
                    const rim=new THREE.Mesh(new THREE.BoxGeometry(w,h,.009),rimMaterial);rim.position.set(x,y,.154);frame.add(rim);
                }
                content.add(frame);
            }
            if(!xrGl)renderer.render(scene,camera);
            rayMeshes=[];content.traverse(node=>{if(node.isMesh)rayMeshes.push(node);});castCache.clear();
            onMedia({image:item.image,caption:item.label,imageAlt:item.label,exampleId:item.id});
            restoreXR();syncButtons();announce(()=>t(item.label)+'. '+t('Ready. The arrow marks the fruit you can pick.'));onState();
        }catch(error){if(!destroyed&&version===loadVersion){announce(()=>t('Unable to load')+' '+t(item.label)+'. '+t('Try loading it again.'));console.error('[Fruit Window]',error);}}
        finally{if(version===loadVersion)loading=false;}
    }
    function updateRip(){
        if(!asset || !fruitHold.pair)return;
        const progress=fruitHold.pullProgress();if(Math.abs(progress-asset.opening)>1e-5){asset.setCutaway(progress);modelDirty=true;}
        if(progress>=1){const parts=asset.splitFruit(content);if(parts.length>=2){modelDirty=true;fruitHold.separate(parts);rayMeshes=[];content.traverse(node=>{if(node.isMesh)rayMeshes.push(node);});announce(()=>t('Opened. Inspect both halves and the seeds.'));}}
    }
    function updateIdentity(next){
        identityValue=next||{};const match=fruitWindowSpecies(identityValue),key=[identityValue.plant||identityValue.commonName,identityValue.scientific||identityValue.scientificName].join('|'),changed=key!==identityKey;identityKey=key;
        if(match&&changed&&match.id!==activeSpecies?.id)choose(match.id);
        else if(!activeSpecies)choose('mamey_sapote');
        describeContext();
    }
    function action(name){
        if(name==='hide'){onHide();return;}if(!asset)return;
        modelDirty=true;arrowSampleAt=-Infinity;
        restoreHover();hover=null;
        if(asset.stages[name])asset.showStage(name);
        else if(name==='play'){fruitHold.reset();asset.play();}else if(name==='pause')asset.pause();
        else if(name==='pick')asset.pick(content,{hold:true});else if(name==='return'){fruitHold.reset();asset.returnFruit();}
        else if(name==='close'){fruitHold.reset();asset.restoreParts();asset.setCutaway(0);}
        syncButtons();onState();
    }
    element.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button&&!button.disabled)action(button.dataset.action);});select.addEventListener('change',()=>choose(select.value));
    function pointRay(event){const box=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,-(event.clientY-box.top)/box.height*2+1),camera);return {origin:raycaster.ray.origin.clone(),direction:raycaster.ray.direction.clone()};}
    canvas.addEventListener('pointermove',event=>{const ray=pointRay(event);if(fruitHold.owns(event.pointerId)){const distance=fruitHold.holds.get(event.pointerId).desktopDepth,position=ray.origin.clone().addScaledVector(ray.direction,distance);fruitHold.update(event.pointerId,{position,quaternion:camera.quaternion});updateRip();return;}hover=cast(ray).map(hit=>({hit,kind:botanicalHit(hit)})).find(value=>value.kind)||null;canvas.style.cursor=hover?.kind==='fruit'&&asset?.canPick?'pointer':'grab';});
    canvas.addEventListener('pointerleave',()=>{hover=null;});
    canvas.addEventListener('pointerdown',event=>{const ray=pointRay(event),hit=cast(ray).find(hit=>botanicalHit(hit));if(botanicalHit(hit)==='play'){action('play');return;}if(botanicalHit(hit)!=='fruit'||!pickHit(hit))return;orbit.enabled=false;canvas.setPointerCapture(event.pointerId);fruitHold.begin(event.pointerId,hitFruit(hit),{position:ray.origin.clone().addScaledVector(ray.direction,hit.distance),quaternion:camera.quaternion},performance.now());const hold=fruitHold.holds.get(event.pointerId);if(hold)hold.desktopDepth=hit.distance;});
    const releasePointer=event=>{if(fruitHold.release(event.pointerId)){orbit.enabled=fruitHold.holds.size===0;syncButtons();}};canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('lostpointercapture',releasePointer);
    // On touch screens, both explicit handles must remain pressed. A lone
    // contact can orbit the model but cannot shift the physical window.
    for(const button of element.querySelectorAll('.fruit-window-grip')){
        button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);const side=button.classList.contains('left')?'left':'right';if([...pointers.values()].some(point=>point.side===side))return;pointers.set(event.pointerId,{side,x:event.clientX,y:event.clientY});pointerSnapshot=null;button.classList.add('held');});
        button.addEventListener('pointermove',event=>{const point=pointers.get(event.pointerId);if(!point)return;point.x=event.clientX;point.y=event.clientY;if(pointers.size!==2)return;const values=[...pointers.values()],center={x:(values[0].x+values[1].x)/2,y:(values[0].y+values[1].y)/2};if(!pointerSnapshot){const box=element.getBoundingClientRect();pointerSnapshot={...center,left:box.left,top:box.top};return;}element.style.left=Math.max(0,Math.min(innerWidth-element.offsetWidth,pointerSnapshot.left+center.x-pointerSnapshot.x))+'px';element.style.top=Math.max(0,Math.min(innerHeight-80,pointerSnapshot.top+center.y-pointerSnapshot.y))+'px';});
        const release=event=>{pointers.delete(event.pointerId);pointerSnapshot=null;button.classList.remove('held');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
    }
    let desktopDirty=true,desktopRenders=0;orbit.addEventListener('change',()=>{desktopDirty=true;});
    const resize=new ResizeObserver(()=>{const box=canvas.getBoundingClientRect();if(box.width&&box.height){renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();desktopDirty=true;}});resize.observe(canvas);
    function advance(time){
        if(modelDirty)castCache.clear();
        const delta=Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
        const moving=fruitWindowMotionActive(asset,{held:fruitHold.holds.size,hover,hoverAmount,hoverOffsets:hoverOffsets.length});
        modelDirty ||= moving;restoreHover();if(moving)asset?.update(delta);
        hoverAmount+=((hover&&!reduced?1:0)-hoverAmount)*(1-Math.exp(-delta*8));
        // Keep a soft envelope so foliage settles instead of snapping back.
        if(hover && time-hoverSampleAt>120){hoverSampleAt=time;const nearby=hover.hit.point;hoverNodes=leaves.map(node=>({node,distance:node.getWorldPosition(new THREE.Vector3()).distanceToSquared(nearby)})).sort((a,b)=>a.distance-b.distance).slice(0,5).map(value=>value.node);if(hover.kind==='fruit' && !asset.picked)hoverNodes.unshift(asset.fruit);}
        const strength=Math.sin(time*.004)*.025*hoverAmount;
        if(strength&&asset)for(const node of hoverNodes){if(!visible(node)||asset.motion)continue;hoverOffsets.push([node,node.quaternion.clone()]);node.rotateZ(strength*(node===asset.fruit?.35:1));}
        const showArrow=fruitWindowCanPick(asset);if(arrow.visible!==showArrow){arrow.visible=showArrow;modelDirty=true;}
        if(modelDirty){content.updateMatrixWorld(true);if(arrow.visible && (arrowSampleAt===-Infinity || time-arrowSampleAt>=50)){fruitWindowVisibleBounds(asset.mainFruit,fruitBox);fruitBox.getCenter(fruitCenter);arrow.position.set(fruitCenter.x,fruitBox.max.y+.035,fruitCenter.z);arrowSampleAt=time;boundsUpdates++;}}
        syncButtons();const changed=modelDirty;if(xrGl){for(let i=0;i<6;i++)if(xr?.prepareNext())break;if(modelDirty && xr){xr.update();modelUpdates++;modelDirty=false;}}else modelDirty=false;return changed;
    }
    function tick(time){
        raf=0;if(destroyed||!shown)return;if(!xrGl && !document.hidden){const changed=advance(time);orbit.update();if(changed || desktopDirty){renderer.render(scene,camera);desktopRenders++;desktopDirty=false;}}raf=requestAnimationFrame(tick);
    }
    const api={element,anchor,grips,
        dockBeside(panel){const box=panel?.getBoundingClientRect();if(!box)return;const width=Math.min(440,innerWidth*.38);element.style.width=width+'px';element.style.left=Math.max(8,Math.min(innerWidth-width-8,box.right+16))+'px';element.style.top=Math.max(8,Math.min(innerHeight-element.offsetHeight-8,box.top))+'px';},
        show(next=identityValue){clearTimeout(fadeTimer);fadeTimer=0;fadeStartedAt=null;element.style.opacity='1';shown=true;element.hidden=Boolean(xrGl);updateIdentity(next);if(!asset&&!loading&&activeSpecies)choose(activeSpecies.id);lastTime=performance.now();if(!xrGl&&!raf)raf=requestAnimationFrame(tick);onState();},
        hide({immediate=false}={}){asset?.pause();grips.reset();fruitHold.reset();selections.clear();pointers.clear();pointerSnapshot=null;hover=null;hoverAmount=0;restoreHover();clearTimeout(fadeTimer);const finish=()=>{shown=false;fadeStartedAt=null;element.hidden=true;if(raf)cancelAnimationFrame(raf);raf=0;onState();};if(immediate || reduced || !shown){finish();return;}fadeStartedAt=performance.now();element.style.opacity='0';fadeTimer=setTimeout(finish,550);onState();},
        action,
        chooseExample:choose,
        nextExample(){const index=FRUIT_WINDOW_LIBRARY.findIndex(item=>item.id===activeSpecies?.id);choose(FRUIT_WINDOW_LIBRARY[(index+1)%FRUIT_WINDOW_LIBRARY.length].id);},
        getPerchPose(side='right'){if(!shown||fadeStartedAt!==null)return null;const right=new THREE.Vector3(1,0,0).applyQuaternion(anchor.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(anchor.quaternion),normal=new THREE.Vector3(0,0,1).applyQuaternion(anchor.quaternion),center=anchor.position.clone().addScaledVector(right,side==='left'?-.22:.22).addScaledVector(up,.331).addScaledVector(normal,.064);return {center,right,up,normal};},
        getPhoto(){return asset&&!loading?{image:activeSpecies.image,caption:activeSpecies.label,imageAlt:activeSpecies.label,exampleId:activeSpecies.id}:null;},
        performanceSnapshot(){return {modelUpdates,boundsUpdates,desktopRenders,playing:Boolean(asset?.playing),ready:Boolean(asset)&&!loading,renderStats:xr?.stats||null};},
        getLabel(){return activeSpecies?.label||'Plant example';},
        getExample(){return activeSpecies?.id||null;},
        gripContact(source){const hold=grips.holds.get(source),handle=hold && handles.find(item=>item.userData.gripSide===hold.side);return handle?handle.position.clone().applyQuaternion(anchor.quaternion).add(anchor.position):null;},
        refreshMedia(){const photo=api.getPhoto();if(photo)onMedia(photo);},
        getInteractionTargets(){
            content.updateMatrixWorld(true);const worldCenter=node=>fruitWindowVisibleBounds(node).getCenter(new THREE.Vector3()).applyQuaternion(anchor.quaternion).add(anchor.position);
            return {leaf:leaves.find(visible)?worldCenter(leaves.find(visible)):null,fruit:asset&&visible(asset.fruit)?worldCenter(asset.fruit):null};
        },
        hit(ray){
            if(!shown||fadeStartedAt!==null||!xrGl||!ray?.origin||!ray.direction)return null;
            const local=localRay(ray),meshHit=cast(local)[0];
            const point=meshHit?.point.clone() || new THREE.Ray(local.origin,local.direction).intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),new THREE.Vector3());
            if(!point || !meshHit && (Math.abs(point.x)>.35 || Math.abs(point.y)>.36))return null;
            point.applyQuaternion(anchor.quaternion).add(anchor.position);
            return {kind:'fruit-window',card:{id:'fruit-window'},point:{x:point.x,y:point.y,z:point.z},distance:point.distanceTo(vector(ray.origin))};
        },
        canAction(name){return Boolean(asset)&&(name!=='play'||Boolean(asset.clips.Development))&&(!['pick','open','close'].includes(name)||asset.canPick)&&(name!=='pick'||!asset.picked)&&(name!=='return'||asset.picked);},
        attach(gl){if(gl===xrGl)return;xrGl=gl;element.hidden=Boolean(gl)||!shown;if(gl&&raf){cancelAnimationFrame(raf);raf=0;}restoreXR();if(!gl&&shown&&!raf)raf=requestAnimationFrame(tick);},
        bindSession(next,referenceSpace){grips.reset();fruitHold.reset();handPinches.clear();session=next;space=referenceSpace;placed=false;},
        updateSpatial(pose,time,inputRay,xrFrame,canUse=()=>true){
            if(!shown||!xrGl)return;
            castCache.clear();
            if(pose && fadeStartedAt===null){dockPose={position:vector(pose.center).addScaledVector(vector(pose.right),(pose.width || .84)/2+.345+.025),quaternion:new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(vector(pose.right),vector(pose.up),vector(pose.normal))).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-.16))};if(!placed || magnetized && !grips.holds.size){anchor.position.copy(dockPose.position);anchor.quaternion.copy(dockPose.quaternion);placed=true;}}
            if(xrFrame&&session){const points=new Map();for(const source of grips.holds.keys()){let grip=null;try{grip=xrFrame.getPose(source.gripSpace||source.targetRaySpace,space)?.transform.position;}catch{}if(Array.from(session.inputSources||[]).includes(source)&&source.gamepad?.buttons?.[1]?.pressed!==false&&grip)points.set(source,grip);}grips.update(points,anchor);
                if(grips.holds.size===2){const values=[...grips.holds.keys()].map(source=>spatialStick(source,time-lastTime)),depth=values.reduce((sum,value)=>sum+value.depth,0)/values.length,yaw=values.reduce((sum,value)=>sum+value.yaw,0)/values.length;if(depth)grips.moveDepth(depth,new THREE.Vector3(0,0,-1).applyQuaternion(anchor.quaternion),anchor);if(yaw)grips.rotate(yaw,anchor);}
                for(let i=0;i<handles.length;i++){const handle=handles[i],hold=[...grips.holds.values()].find(hold=>hold.side===handle.userData.gripSide);handle.material.color.setHex(hold?0xffd88b:0x80c5b0);beams[i].visible=false;}
                finishBoxGrip();
            }
            if(xrFrame){
                const sources=Array.from(session?.inputSources||[]);
                for(const source of sources.filter(source=>source.hand)){
                    const state=handTrackingState(xrFrame,source,space),was=handPinches.get(source)||false;handPinches.set(source,Boolean(state?.pinch));
                    if(!state?.pinch){fruitHold.release(source);selections.delete(source);}
                    else if(!was&&!fruitHold.owns(source)&&canUse(source))beginHandFruit(source,state);
                }
                for(const source of handPinches.keys())if(!sources.includes(source))handPinches.delete(source);
                for(const source of [...fruitHold.holds.keys()]){
                let transform=null;try{transform=source.hand?fruitHandPose(handTrackingState(xrFrame,source,space)):xrFrame.getPose(source.targetRaySpace,space)?.transform;}catch{}
                const released=source.hand?!handTrackingState(xrFrame,source,space)?.pinch:source.gamepad?.buttons?.[0]?.pressed===false;
                if(!sources.includes(source)||released||!transform){fruitHold.release(source);continue;}
                const axes=source.gamepad?.axes||[],vertical=Number(axes.length>=4?axes[3]:axes[1])||0,amount=Math.max(0,(Math.abs(vertical)-.18)/.82);
                if(amount && !fruitHold.pair)fruitHold.moveDistance(-Math.sign(vertical)*amount*amount*Math.min(.05,Math.max(0,(time-lastTime)/1000))*.45,source);
                fruitHold.update(source,localSourcePose(transform));modelDirty=true;
            }updateRip();}
            if(time-hoverCastAt>=50){hoverCastAt=time;const ray=inputRay?.origin&&inputRay.direction?localRay(inputRay):null;hover=ray?cast(ray).map(hit=>({hit,kind:botanicalHit(hit)})).find(value=>value.kind)||null:null;}
            advance(time);
        },
        handleEvent(event){
            if(!shown||fadeStartedAt!==null||!xrGl||!space)return false;const source=event.inputSource;
            if(event.type==='selectend' && fruitHold.release(source)){syncButtons();return true;}
            if(event.type==='selectstart')selections.delete(source);
            if(event.type==='selectstart'&&source.hand){const state=handTrackingState(event.frame,source,space);handPinches.set(source,Boolean(state?.pinch));if(fruitHold.owns(source)||beginHandFruit(source,state))return true;}
            if(selections.has(source)){if(event.type==='select')selections.delete(source);return true;}
            if(event.type==='squeezeend'){const released=grips.release(source);finishBoxGrip();return released;}
            if(event.type==='squeezestart'){
                let transform=null,grip=null;try{transform=event.frame?.getPose(source.targetRaySpace,space)?.transform;grip=event.frame?.getPose(source.gripSpace||source.targetRaySpace,space)?.transform.position;}catch{}
                if(!transform||!grip)return false;const m=transform.matrix,ray={origin:{x:m[12],y:m[13],z:m[14]},direction:{x:-m[8],y:-m[9],z:-m[10]}},handle=handleAt(ray);
                const pressed=Boolean(handle&&grips.press(source,handle.userData.gripSide,grip));if(pressed)magnetized=false;return pressed;
            }
            if(grips.owns(source))return true;
            if(event.type==='selectstart'){
                let transform;try{transform=event.frame?.getPose(source.targetRaySpace,space)?.transform;}catch{}if(!transform)return false;
                const m=transform.matrix,hits=cast(localRay({origin:{x:m[12],y:m[13],z:m[14]},direction:{x:-m[8],y:-m[9],z:-m[10]}}));
                const hit=hits.find(hit=>botanicalHit(hit));
                if(fruitHold.source!==null && botanicalHit(hit)==='play'){selections.add(source);return true;}
                if(botanicalHit(hit)==='play'){action('play');selections.add(source);return true;}
                if(botanicalHit(hit)==='fruit'&&pickHit(hit)){fruitHold.begin(source,hitFruit(hit),localSourcePose(transform),performance.now());selections.add(source);syncButtons();return true;}
            }
            return false;
        },
        activate(ray){if(!shown||fadeStartedAt!==null||!xrGl||!ray)return false;const hit=cast(localRay(ray)).find(hit=>botanicalHit(hit));if(!hit)return false;if(botanicalHit(hit)==='play')action('play');return true;},
        draw(view){if(shown&&xr)xr.draw(view,anchor,fadeOpacity(performance.now()));},
        resetGrips(){grips.reset();fruitHold.reset();selections.clear();},
        owns(source){return grips.owns(source)||fruitHold.owns(source)||selections.has(source);},
        rebase(matrix){anchor.position.applyMatrix4(new THREE.Matrix4().fromArray(matrix));anchor.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().fromArray(matrix)));grips.reset();},
        destroy(){if(destroyed)return;destroyed=true;globalThis.removeEventListener?.('nxr-languagechange',languageChanged);loadVersion++;api.hide({immediate:true});resize.disconnect();xr?.destroy();orbit.dispose();asset?.dispose();disposeScene(frame);disposeScene(branchSupports);for(const handle of [...handles,...beams,nameplate,plaque,playButton]){handle.geometry.dispose();handle.material.dispose();}nameTexture.dispose();playTexture.dispose();arrowTip.geometry.dispose();arrowStem.geometry.dispose();arrowMaterial.dispose();handleMaterial.dispose();renderer.dispose();element.remove();}
    };
    function languageChanged(){translateApp(element);describeContext();if(activeSpecies)labelWindow(activeSpecies);if(statusCopy){status.textContent=statusCopy();element.dataset.status=status.textContent;}onState();}
    globalThis.addEventListener?.('nxr-languagechange',languageChanged);translateApp(element);
    api.show(identity);return api;
}
