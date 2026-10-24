import {normalizeForestRootFields,forestRootBasisLabel} from '../app/services/foodForestRootModel.js';
import {PLAN_HEIGHTS} from '../app/services/foodForestV3Model.js';
import * as THREE from '../app/vendor/three.module.min.js';
import {createFoodForestPiece,FOOD_FOREST_LAYERS as layers,FOOD_FOREST_VARIANTS as variants} from '../app/services/foodForestPieces.js';
import {createFoodForestRoots} from '../app/services/foodForestRoots.js';
import {pimoIcon} from '../app/services/pimoEditorIcons.js';
import {createPimoXRFeedback} from '../app/services/pimoXRFeedback.js';
import {BUILD_INFO} from '../app/services/buildInfo.js';

const stage=document.querySelector('.stage'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.03,50),world=new THREE.Group(),models=[],roots=[],decorations=[];
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;stage.prepend(renderer.domElement);scene.add(world);
scene.add(new THREE.HemisphereLight(0xd8ece1,0x374331,1.5));const key=new THREE.DirectionalLight(0xffdfae,3.2);key.position.set(-3,5,4);scene.add(key);const rim=new THREE.DirectionalLight(0xaad7cf,1.5);rim.position.set(3,3,-3);scene.add(rim);
const cues=createPimoXRFeedback();let family='small-tree',variant=0,planted=false,showRoots=false,collection=false,spin=false,rootOverrides={},down=null,birth=-Infinity,reveal=1;
const controls=[['planted','sprout','Show the planted form'],['roots','preview','Look beneath the glass'],['replay','undo','Replay the unfolding'],['collection','arrange','Compare all 28 pieces'],['spin','play','Slowly turn the sculptures'],['sound','volume','Toggle sounds']];
document.querySelector('.actions').innerHTML=controls.map(([id,symbol,title])=>`<button data-action="${id}" aria-label="${title}" title="${title}" aria-pressed="false">${id==='spin'?'<svg class="icon" viewBox="0 0 24 24"><path d="m8 4 12 8-12 8Z"/></svg>':pimoIcon(symbol)}</button>`).join('');
document.querySelector('[data-version]').textContent=`LIVING PIECES V6 · V${BUILD_INFO.version}`;
function clear(){for(const p of models)p.dispose();models.length=0;for(const r of roots)r.dispose();roots.length=0;for(const o of decorations){o.geometry.dispose();o.material.dispose();o.removeFromParent();}decorations.length=0;}
function model(layer,index,x,z,size){
 const p=createFoodForestPiece(layer,{variant:index,planted,size,seed:layer+':gallery:'+index});p.group.position.set(x,0,z);world.add(p.group);models.push(p);
 if(showRoots){const root=createFoodForestRoots(layer,index),metrics=normalizeForestRootFields({layer,...rootOverrides[layer]}),height=new THREE.Box3().setFromObject(p.group).max.y,units=height/PLAN_HEIGHTS[layer];root.group.position.set(x,0,z);root.group.scale.set(metrics.rootSpreadM*units,metrics.rootDepthM*units,metrics.rootSpreadM*units);root.metreScale=units;root.metrics=metrics;world.add(root.group);roots.push(root);const glass=new THREE.Mesh(new THREE.CylinderGeometry(.3*size,.3*size,.018,32),new THREE.MeshStandardMaterial({color:0x89c5ad,transparent:true,opacity:.18,depthWrite:false,roughness:.8}));glass.position.set(x,-.008,z);world.add(glass);decorations.push(glass);}
 if(!planted&&!showRoots){const disc=new THREE.Mesh(new THREE.CylinderGeometry(.31*size,.34*size,.045,32),new THREE.MeshStandardMaterial({color:0x36523b,roughness:1}));disc.position.set(x,-.025,z);world.add(disc);decorations.push(disc);}
}
function rebuild(){
 clear();world.rotation.y=-.18;
 if(collection){layers.forEach((layer,c)=>{for(let v=0;v<4;v++)model(layer.id,v,(c-3)*1.02,(v-1.5)*1.12,.9);});camera.position.set(5.8,7,9);camera.lookAt(0,.2,0);}
 else{model(family,variant,-.6,0,1.8);for(let v=0,n=0;v<4;v++)if(v!==variant){model(family,v,1.15,-1.05+n*1.05,.87);n++;}camera.position.set(showRoots?3.1:2.7,showRoots?2:2.2,showRoots?5.3:4.9);camera.lookAt(.15,showRoots?.25:.45,0);}
 const d=layers.find(l=>l.id===family);document.querySelector('[data-title]').textContent=d.name;document.querySelector('[data-description]').textContent=d.form+'.';document.querySelector('[data-caption]').textContent=collection?'28 original miniatures. Seven ways to grow.':variants[family][variant];
 document.querySelector('.families').innerHTML=layers.map(l=>`<button data-family="${l.id}" aria-pressed="${l.id===family}">${l.name}</button>`).join('');document.querySelector('.variants').innerHTML=variants[family].map((v,i)=>`<button data-variant="${i}" aria-pressed="${i===variant}">${v}</button>`).join('');
 for(const[id]of controls)document.querySelector(`[data-action=${id}]`).setAttribute('aria-pressed',String(id==='sound'?cues.enabled:id==='roots'?showRoots:id==='planted'?planted:id==='spin'?spin:id==='collection'?collection:false));
 const spinButton=document.querySelector('[data-action=spin]');spinButton.innerHTML=spin?'<svg class="icon" viewBox="0 0 24 24"><path d="M8 4v16M16 4v16"/></svg>':'<svg class="icon" viewBox="0 0 24 24"><path d="m8 4 12 8-12 8Z"/></svg>';spinButton.title=spinButton.ariaLabel=spin?'Pause sculpture rotation':'Slowly turn the sculptures';
 const metrics=normalizeForestRootFields({layer:family,...rootOverrides[family]});let rootEditor=document.querySelector('[data-root-editor]');if(!rootEditor){rootEditor=document.createElement('section');rootEditor.dataset.rootEditor='';document.querySelector('.swatches').before(rootEditor);}rootEditor.hidden=!showRoots;rootEditor.innerHTML=`<h3>Root space</h3><label>Spread · ${metrics.rootSpreadM} m across<input type="range" data-root-field="rootSpreadM" aria-label="Gallery root spread" min="0.5" max="20" step="0.5" value="${metrics.rootSpreadM}"></label><label>Depth · ${metrics.rootDepthM} m<input type="range" data-root-field="rootDepthM" aria-label="Gallery root depth" min="0.1" max="3" step="0.1" value="${metrics.rootDepthM}"></label><p>${forestRootBasisLabel(metrics)}. The roots use this size, independent of the display base.</p>`;
 document.querySelector('[data-budget]').textContent=planted?'Planted form · root spread is a planning dimension.':'Display form · a tactile miniature ready to grab.';
 fit();
}
function fit(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.zoom=Math.min(1,camera.aspect*1.2);camera.updateProjectionMatrix();}
new ResizeObserver(fit).observe(stage);
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
 if(button.dataset.family){family=button.dataset.family;variant=0;collection=false;rebuild();}
 else if(button.dataset.variant!==undefined){variant=+button.dataset.variant;collection=false;rebuild();}
 else{const action=button.dataset.action;if(action==='replay'){if(!planted){planted=true;rebuild();}birth=performance.now();cues.play('grow');return;}if(action==='planted')planted=!planted;if(action==='roots'){showRoots=!showRoots;if(showRoots)planted=true;}if(action==='collection')collection=!collection;if(action==='spin')spin=!spin;if(action==='sound')cues.setEnabled(!cues.enabled);rebuild();}
 cues.play('tap');
});
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,rotation:world.rotation.y};renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(down)world.rotation.y=down.rotation+(e.clientX-down.x)*.008;});renderer.domElement.addEventListener('pointerup',()=>down=null);renderer.domElement.addEventListener('pointercancel',()=>down=null);renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.multiplyScalar(THREE.MathUtils.clamp(1+e.deltaY*.0005,.9,1.1));camera.position.clampLength(2.5,18);camera.lookAt(collection?0:.15,.45,0);},{passive:false});
document.addEventListener('change',event=>{const field=event.target.dataset.rootField;if(field){rootOverrides[family]={...normalizeForestRootFields({layer:family,...rootOverrides[family]}),[field]:Number(event.target.value),rootBasis:'user-assumption'};rebuild();cues.play('tap');}});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;rebuild();
renderer.setAnimationLoop(time=>{const t=reduced?1:Math.min(1,Math.max(0,(time-birth)/850));reveal=1-(1-t)**3;models.forEach(p=>p.reveal(reveal));roots.forEach(r=>{const d=r.metrics,u=r.metreScale;r.group.scale.set(d.rootSpreadM*u*Math.max(.001,reveal),d.rootDepthM*u*Math.max(.001,reveal),d.rootSpreadM*u*Math.max(.001,reveal));});if(spin&&!down&&!reduced)world.rotation.y+=.0025;renderer.render(scene,camera);});
window.forestPieceGallery={getState:()=>({family,variant,planted,roots:showRoots,collection,reveal,rootPlan:normalizeForestRootFields({layer:family,...rootOverrides[family]}),count:models.length,rendering:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}})};
