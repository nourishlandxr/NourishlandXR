import * as THREE from '../vendor/three.module.min.js';
import {FOOD_FOREST_FOUNDATIONS as groups,FOOD_FOREST_FOUNDATION_VARIANTS as variants,createFoodForestFoundationPiece} from '../services/foodForestFoundations.js';

const stage=document.querySelector('.stage'),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(37,1,.03,60),world=new THREE.Group(),pieces=[];
const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;stage.prepend(renderer.domElement);scene.add(world);
scene.add(new THREE.HemisphereLight(0xdbe9d6,0x3b4332,1.65));const key=new THREE.DirectionalLight(0xffe2b8,2.8);key.position.set(-3,5,4);scene.add(key);const fill=new THREE.DirectionalLight(0xb1d2bb,1.2);fill.position.set(3,2,-4);scene.add(fill);
let groupId='edge-control',variant=0,planted=false,collection=false,spinning=false,drag=null,birth=performance.now(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const actions=[...document.querySelectorAll('[data-action]')];

function clear(){for(const piece of pieces)piece.dispose();pieces.length=0;}
function addPiece(id,v,x,z,size){const piece=createFoodForestFoundationPiece(id,{variant:v,size,planted,seed:`${id}:v7:${v}`});piece.group.position.set(x,0,z);world.add(piece.group);pieces.push(piece);}
function selectGroup(id){groupId=id;variant=0;collection=false;rebuild();}
function rebuild(){
 clear();world.rotation.y=-.18;
 const compact=stage.clientWidth<620;
 if(collection){
  groups.forEach((group,row)=>variants[group.id].forEach((_label,col)=>addPiece(group.id,col,(col-1.5)*1.0,(row-2)*1.02,compact?.66:.74)));
  camera.position.set(compact?8.8:6.9,compact?10:8.0,compact?13:10.8);camera.lookAt(0,.18,0);
 }else{
  addPiece(groupId,variant,compact?0:-.72,0,compact?2.55:1.62);let col=0;
  if(!compact)variants[groupId].forEach((_label,index)=>{if(index===variant)return;addPiece(groupId,index,1.05+(col%2)*.56,-1.13+Math.floor(col/2)*1.14,.76);col++;});
  camera.position.set(compact?1.25:3.0,compact?1.75:2.65,compact?3.45:5.8);camera.lookAt(0,.28,0);
 }
 const group=groups.find(item=>item.id===groupId);document.querySelector('[data-title]').textContent=group.title;document.querySelector('[data-role]').textContent=group.role+'.';document.querySelector('[data-form]').textContent=variants[groupId][variant];document.querySelector('[data-note]').textContent=group.note;document.querySelector('[data-caption]').textContent=collection?'Twenty foundational forms. Five jobs and growth patterns.':variants[groupId][variant];document.querySelector('[data-examples]').innerHTML=group.examples.map(example=>`<span>${example}</span>`).join('');
 document.querySelector('.family-list').innerHTML=groups.map((item,index)=>`<button data-group="${item.id}" aria-pressed="${item.id===groupId}"><span class="family-mark" aria-hidden="true">${['↗','N','◌','●','✿'][index]}</span><span class="family-copy"><strong>${item.title}</strong><small>${item.role}</small></span></button>`).join('');
 document.querySelector('.variant-list').innerHTML=variants[groupId].map((name,index)=>`<button data-variant="${index}" aria-pressed="${index===variant}">${name}</button>`).join('');
 for(const button of actions){const action=button.dataset.action;button.setAttribute('aria-pressed',String(action==='planted'?planted:action==='collection'?collection:action==='spin'?spinning:false));}
 const spin= document.querySelector('[data-action="spin"]');spin.title=spin.ariaLabel=spinning?'Pause slow rotation':'Slowly turn the pieces';
 birth=performance.now();fit();
}
function fit(){const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.zoom=collection?Math.min(1.2,camera.aspect*1.05):stage.clientWidth<620?1:Math.min(1.08,camera.aspect*1.16);camera.updateProjectionMatrix();}
new ResizeObserver(fit).observe(stage);
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.group){selectGroup(button.dataset.group);return;}
 if(button.dataset.variant!==undefined){variant=Number(button.dataset.variant);collection=false;rebuild();return;}
 const action=button.dataset.action;
 if(action==='planted'){planted=!planted;rebuild();}
 if(action==='collection'){collection=!collection;rebuild();}
 if(action==='spin'){spinning=!spinning;rebuild();}
});
renderer.domElement.addEventListener('pointerdown',event=>{drag={x:event.clientX,rotation:world.rotation.y};renderer.domElement.setPointerCapture(event.pointerId);});
renderer.domElement.addEventListener('pointermove',event=>{if(drag)world.rotation.y=drag.rotation+(event.clientX-drag.x)*.008;});
renderer.domElement.addEventListener('pointerup',()=>drag=null);renderer.domElement.addEventListener('pointercancel',()=>drag=null);
renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();camera.position.multiplyScalar(THREE.MathUtils.clamp(1+event.deltaY*.0005,.9,1.1));camera.position.clampLength(2.7,20);camera.lookAt(collection?0:.05,.35,0);},{passive:false});
rebuild();renderer.setAnimationLoop(time=>{const progress=reduced?1:Math.min(1,Math.max(0,(time-birth)/720)),open=1-(1-progress)**3;pieces.forEach(piece=>piece.reveal(open));if(spinning&&!drag&&!reduced)world.rotation.y+=.0021;renderer.render(scene,camera);});
window.foodForestFoundationPreview={getState:()=>({group:groupId,variant,planted,collection,spinning,pieces:pieces.length,rendering:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures}})};
