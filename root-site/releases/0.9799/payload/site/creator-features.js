import {createPimoTemplate} from "./creator/pimoGraphTemplates.js?v=0.9799";
import {pimoCellPath} from "./creator/pimoGraphGeometry.js?v=0.9799";

// Presentation-only adapter around the existing NL models. No account or project writes.
export function createCreatorFeatures(root){
 if(!root)return {setActive(){}};
 const buttons=[...root.querySelectorAll('[data-creator-feature]')],panels=[...root.querySelectorAll('[data-creator-panel]')];
 const flower=root.querySelector('[data-creator-pimo]'),orbButton=root.querySelector('[data-creator-orb]'),cells=root.querySelector('[data-creator-cells]'),canvas=orbButton.querySelector('canvas');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),graph=createPimoTemplate('classic');
 const familyText={
  'Food Forest':'Connect a plant to the layers and living relationships around it.',
  Uses:'Collect the ways people use a plant, with images, context and sources.',
  Propagation:'Add knowledge about starting new plants and share what you observe.',
  'Scientific Information':'Keep identification, botanical details and research connected to the plant.',
  'Historical Data':'Give stories and attributed knowledge a place in the plant’s guide.',
  Cultivation:'Bring growing conditions, care and observations together.'
 };
 const cellButtons=[];
 for(const node of graph.nodes.slice(1)){
  const layout=graph.layout.nodes[node.id],button=document.createElement('button');button.type='button';button.className='creator-pimo-cell';button.textContent=node.title;button.setAttribute('aria-pressed','false');
  button.style.setProperty('--cell-x',String(layout.x/720*100)+'%');button.style.setProperty('--cell-y',String(layout.y/600*100)+'%');button.style.setProperty('--cell-color',layout.color);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-104 -92 208 184');svg.setAttribute('aria-hidden','true');
  const face=document.createElementNS('http://www.w3.org/2000/svg','path');face.setAttribute('d',pimoCellPath(layout));svg.append(face);button.prepend(svg);cells.append(button);cellButtons.push(button);
  button.addEventListener('click',()=>{root.querySelector('[data-creator-cell-title]').textContent=node.title;root.querySelector('[data-creator-cell-copy]').textContent=familyText[node.title];for(const item of cellButtons)item.setAttribute('aria-pressed',String(item===button))});
 }
 let active=false,current='pimo',open=true,orb=null,orbPending=false,map=null,mapPending=false,mapModel=null,mapLevel=0,disposed=false,drag=null,suppressClick=false,totem=null,totemPending=false;
 let queuedYaw=0,queuedPitch=0;
 function visible(){return active&&!document.hidden&&!disposed}
 function syncOrb(){orb?.setActive(visible()&&current==='pimo');totem?.setActive(visible()&&current==='totem');}
 function followTotemSign(target){
  if(target==='notes'){root.querySelector('[data-creator-totem-note]').textContent='Field Notes holds observations from the area, keeping learning close to the place.';if(root.dataset.cleanMap)window.dispatchEvent(new CustomEvent('nourishland:phone-preview'));}
  else if(target==='pimo'||target==='imap')show(target,{focus:true});
 }
 async function loadTotem(){
  if(totem||totemPending||disposed)return;totemPending=true;
  const status=root.querySelector('[data-creator-totem-status]'),stage=root.querySelector('[data-creator-totem-stage]'),select=root.querySelector('[data-creator-totem-style]');
  if(!stage){totemPending=false;return;}
  status.hidden=false;status.textContent='Preparing the Totem…';
  try{
   const {createTotemStudio,TOTEM_MODEL_CHOICES}=await import("/xr/services/craftedTotemStudio.js?v=0.9799");if(disposed)return;
   const cards=[{id:'home',title:'Food Forest'},{id:'pimo',title:'Plant Orbs',boardSide:'right',navigation:{reliable:true}},{id:'notes',title:'Field Notes',boardSide:'left',navigation:{reliable:true}},{id:'imap',title:'Next Totem',boardSide:'right',navigation:{reliable:true}}];
   totem=createTotemStudio(root.querySelector('[data-creator-totem]'),{pixelRatio:1.5,cards,onSign:({signId})=>followTotemSign(signId)});
   if(select){select.textContent='';for(const choice of TOTEM_MODEL_CHOICES){const option=document.createElement('option');option.value=choice.id;option.textContent=choice.label;select.append(option);}}
   stage.dataset.ready='true';status.hidden=true;syncOrb();
  }catch{status.textContent='The 3D Totem could not start on this device. The signs below still connect its destinations.';}finally{totemPending=false;}
 }
 root.querySelector('[data-creator-totem-style]')?.addEventListener('change',event=>{totem?.select(event.target.value);root.querySelector('[data-creator-totem-note]').textContent='Each Totem has its own material and signs, suited to its place.';});
 root.querySelector('[data-creator-totem]')?.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();totem?.turn(event.key==='ArrowLeft'?-.15:.15);}if(event.key==='Home'){event.preventDefault();totem?.front();}});
 function setOpen(value){
  open=value;flower.dataset.open=String(value);orbButton.setAttribute('aria-expanded',String(value));orbButton.setAttribute('aria-label',(value?'Close':'Open')+' the PIMO; drag to rotate the orb');cells.inert=!value;cells.setAttribute('aria-hidden',String(!value));
  const image=orbButton.querySelector('img');image.src='/site/creator/actual-orb-v3-'+(value?'open':'closed')+'.webp';image.alt='Current Nourishland Organic V3 orb, '+(value?'open':'closed');orb?.setOpen(value);
 }
 async function loadOrb(){
  if(orb||orbPending||disposed)return;orbPending=true;
  try{const {createCeramicOrb}=await import("./orb/ceramic-orb.js?v=0.9799");if(disposed)return;orb=await createCeramicOrb(canvas,{reduced});if(disposed){orb.dispose();orb=null;return}orb.setOpen(open);if(queuedYaw||queuedPitch)orb.rotateBy(queuedYaw,queuedPitch);flower.dataset.ready='true';syncOrb()}
  catch{flower.dataset.ready='fallback'}finally{orbPending=false}
 }
 function rotate(x,y){if(orb)orb.rotateBy(x,y);else{queuedYaw+=x;queuedPitch+=y}}
 orbButton.addEventListener('click',event=>{if(suppressClick&&event.detail!==0){suppressClick=false;return}suppressClick=false;setOpen(!open)});
 orbButton.addEventListener('pointerdown',event=>{if(event.button!==0)return;suppressClick=false;drag={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};orbButton.setPointerCapture(event.pointerId)});
 orbButton.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6)drag.moved=true;if(drag.moved){rotate(dx*.009,dy*.009);suppressClick=true;orbButton.dataset.dragging='true'}drag.x=event.clientX;drag.y=event.clientY});
 function endDrag(event){if(!drag||drag.id!==event.pointerId)return;suppressClick=drag.moved;drag=null;orbButton.dataset.dragging='false';if(orbButton.hasPointerCapture(event.pointerId))orbButton.releasePointerCapture(event.pointerId)}
 orbButton.addEventListener('pointerup',endDrag);orbButton.addEventListener('pointercancel',endDrag);
 orbButton.addEventListener('keydown',event=>{const delta={ArrowLeft:[-.14,0],ArrowRight:[.14,0],ArrowUp:[0,-.14],ArrowDown:[0,.14]}[event.key];if(delta){event.preventDefault();rotate(...delta)}else if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false)}});
 function drawMap(){
  if(!map||!mapModel)return;const stage=mapModel.buildSequence?.[mapLevel];map.setData(mapModel,stage);
  const labels=['The terrain','Define areas','Connect paths','Add destinations'];root.querySelector('[data-map-stage]').textContent=(mapLevel+1)+' · '+labels[mapLevel];
  root.querySelector('[data-map-selection]').textContent=stage?.description||'Totems guide people through a growing project.';
 }
 async function loadMap(){
  if(root.dataset.cleanMap){if(map||mapPending||disposed)return;mapPending=true;try{const {mountPlaceShowcase}=await import("./place-showcase.js?v=0.9799");map=await mountPlaceShowcase(root.querySelector('[data-places-showcase]'));}finally{mapPending=false}return;}
  if(map||mapPending||disposed)return;mapPending=true;const status=root.querySelector('[data-creator-map-status]');status.hidden=false;status.textContent='Preparing the Border Ranges map…';
  try{
   const [{createImapV2Landscape3D},response]=await Promise.all([import("./creator/imapV2Landscape3D.js?v=0.9799"),fetch('/site/creator/border-ranges.json')]);if(!response.ok)throw Error('Map data unavailable');mapModel=await response.json();if(disposed)return;
   // Accept a prepared, source-derived terrain package when supplied; the authored map remains labelled schematic otherwise.
   if(mapModel.terrain?.grid?.heights){mapModel.elevationGrid=mapModel.terrain.grid;root.querySelector('[data-map-provenance]').textContent='Border Ranges · NSW contour-derived terrain ('+mapModel.terrain.elevation.min+'–'+mapModel.terrain.elevation.max+' m AHD). Paths and Totem positions are illustrative.';}
   map=createImapV2Landscape3D(root.querySelector('[data-creator-map]'),{hoverLabels:true,onSelect(id){const item=mapModel.elements.find(item=>item.id===id);if(item){map.select(id);root.querySelector('[data-map-selection]').textContent=(item.name||'Map feature')+' · '+(item.type==='totem'?'An area’s wayfinding point connects nearby learning.':'A connected place in the project.')}}});
   drawMap();status.hidden=true;
  }catch{status.textContent='The 3D map could not start on this device. The IMAP connects terrain, areas, paths and plant guides.'}finally{mapPending=false}
 }
 function show(key,{focus=false}={}){
  if(!panels.some(panel=>panel.dataset.creatorPanel===key))return;current=key;
  for(const panel of panels){const selected=panel.dataset.creatorPanel===key;panel.hidden=!selected;panel.inert=!selected}
  for(const button of buttons)button.setAttribute('aria-expanded',String(button.dataset.creatorFeature===key));
  syncOrb();if(visible()){if(key==='pimo')loadOrb();if(key==='imap')loadMap();if(key==='totem')loadTotem()}
  if(focus)root.querySelector('[data-creator-panel="'+key+'"] h3').focus({preventScroll:true});
 }
 for(const button of buttons)button.addEventListener('click',()=>show(button.dataset.creatorFeature,{focus:true}));
 for(const sign of root.querySelectorAll('[data-creator-sign]'))sign.addEventListener('click',()=>{
  followTotemSign(sign.dataset.creatorSign);
 });
 for(const button of root.querySelectorAll('[data-map-control]'))button.addEventListener('click',()=>{if(!map)return;const action=button.dataset.mapControl;if(action==='in')map.zoom(.85);else if(action==='out')map.zoom(1.15);else map[action]()});
 root.querySelector('[data-map-growth]')?.addEventListener('input',event=>{mapLevel=Math.max(0,Math.min(3,Number(event.target.value)||0));drawMap()});
 document.addEventListener('visibilitychange',syncOrb);
 window.addEventListener('pagehide',event=>{if(event.persisted){orb?.setActive(false);totem?.setActive(false);return}disposed=true;orb?.dispose();map?.dispose();totem?.destroy()});
 window.addEventListener('pageshow',()=>syncOrb());
 setOpen(true);
 return {focusIntro(){root.querySelector('[data-creator-panel="'+current+'"] h3').focus({preventScroll:true})},setActive(value){active=value;root.hidden=!value;root.inert=!value;if(value)show(current);else syncOrb()}};
}
