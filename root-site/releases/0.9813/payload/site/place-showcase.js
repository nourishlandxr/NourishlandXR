export const PLACE_EXAMPLES=Object.freeze([
 {id:'border',title:'Border Ranges',subtitle:'Forest, ridgelines and connected places.',context:'NSW contour-derived display · exaggerated relief. Paths and markers are illustrative.'},
 {id:'uki',title:'Mount Warning · Uki',subtitle:'A mountain landscape and the places around it.',context:'Illustrative landscape study · not surveyed terrain or a walking route.'},
 {id:'hillyards',title:'Hillyards Food Forest',subtitle:'A small growing place, full of connections.',context:'Illustrative garden layout · the Nourishland learning-walk prototype is in development.'}
]);
export function createIllustrativePlaceModel(id){
 const n=49,heights=[];for(let row=0;row<n;row++)for(let col=0;col<n;col++){
  const x=col/(n-1)*2-1,z=row/(n-1)*2-1;
  heights.push(id==='uki'?1.08*Math.exp(-((x+.12)**2+(z-.05)**2)*6)+.12*Math.sin(x*7+z*4)-.35:.12*Math.sin(x*3)+.09*Math.cos(z*5)+.06*x);
 }
 const names=id==='uki'?['Landscape','Connections','Living knowledge']:['Welcome','Orchard','Learning garden'];
 return {shape:'circular',sizeScale:1,elevationGrid:{radius:6.3,shape:'circular',segments:n-1,size:n,step:12.6/(n-1),heights,min:-.9,max:.9,edits:[]},terrainEdits:[],elements:[
  ...names.map((name,i)=>({id:id+'-'+i,type:'totem',name,x:[-3.5,1.8,3][i],z:[1.6,-2.8,1.3][i],size:1})),
  {id:id+'-path',type:'path',name:'Illustrative connection',size:1.3,points:[{x:-3.5,z:1.6},{x:-1,z:.2},{x:1.8,z:-2.8},{x:3,z:1.3}]}
 ]};
}
export async function mountPlaceShowcase(root){
 if(!root)return;root.dataset.placeReady='loading';
 const canvas=root.querySelector('[data-place-canvas]'),status=root.querySelector('[data-place-status]');
 let renderer,index=0,revision=0,disposed=false,drag=null;
 try{
  const [{createImapV2Landscape3D},response]=await Promise.all([import("./creator/imapV2Landscape3D.js?v=0.9813"),fetch('/site/creator/border-ranges.json')]);
  if(!response.ok)throw Error('Map unavailable');const border=await response.json();if(disposed)return;
  border.elevationGrid=border.terrain.grid;
  renderer=createImapV2Landscape3D(canvas,{hoverLabels:true,ceramic:true});renderer.zoom(.83);
  const models=[border,createIllustrativePlaceModel('uki'),createIllustrativePlaceModel('hillyards')];
  async function show(next){
   index=(next+PLACE_EXAMPLES.length)%PLACE_EXAMPLES.length;const token=++revision,place=PLACE_EXAMPLES[index];root.dataset.placeReady='transitioning';
   if(!matchMedia('(prefers-reduced-motion:reduce)').matches)await canvas.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.96)'}],{duration:180,easing:'ease-out',fill:'forwards'}).finished.catch(()=>{});
   if(disposed||token!==revision)return;
   renderer.setData(models[index]);root.dataset.place=place.id;
   root.querySelector('[data-place-title]').textContent=place.title;root.querySelector('[data-place-subtitle]').textContent=place.subtitle;root.querySelector('[data-place-context]').textContent=place.context;
   canvas.setAttribute('aria-label',place.title+'. Drag or use arrow keys to turn the illustrative model.');
   canvas.getAnimations().forEach(a=>a.cancel());
   if(!matchMedia('(prefers-reduced-motion:reduce)').matches)await canvas.animate([{opacity:0,transform:'scale(.96)'},{opacity:1,transform:'scale(1)'}],{duration:420,easing:'ease-out'}).finished.catch(()=>{});
   if(disposed||token!==revision)return;
   status.hidden=true;root.dataset.placeReady='true';
  }
  root.querySelectorAll('[data-place-step]').forEach(button=>button.addEventListener('click',()=>show(index+Number(button.dataset.placeStep))));
  const title=root.querySelector('.place-switcher');title.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY}});title.addEventListener('pointerup',e=>{if(drag&&Math.abs(e.clientX-drag.x)>40&&Math.abs(e.clientX-drag.x)>Math.abs(e.clientY-drag.y))show(index+(e.clientX<drag.x?1:-1));drag=null;});title.addEventListener('pointercancel',()=>drag=null);
  await show(0);
 }catch{status.textContent='The interactive landscape is unavailable on this device.';root.dataset.placeReady='fallback';}
 return {dispose(){disposed=true;renderer?.dispose();},setActive(){}};
}
