import {pimoGraphDocument} from "./pimoGraphDocument.js?v=0.9799";
import {pimToArKnowledge,pimChildren,pimAncestors} from "./pimModel.js?v=0.9799";
import {drawPlantInformationHoneycomb,pimHoneycombTargetAtPercent} from "./plantInformationMeshCanvas.js?v=0.9799";
import {pimoIcon} from "./pimoEditorIcons.js?v=0.9799";
export function openPimoReaderPreview(graph,{onClose=()=>{}}={}){
 const documentModel=pimoGraphDocument(graph),knowledge=pimToArKnowledge(documentModel,{includeDraft:true}),expanded=new Set(),dialog=document.createElement('dialog');
 const returnFocus=document.activeElement;let selected='',layout={},destroyed=false;
 dialog.className='pimo-reader-preview';dialog.setAttribute('aria-label','Preview your PIMO');
 dialog.innerHTML=`<div class="pimo-preview-shell"><header><h2>Preview your PIMO</h2><button type="button" class="pimo-icon" data-preview-close aria-label="Close preview" title="Close preview">${pimoIcon('close')}</button></header><p class="pimo-preview-hint">Draft preview · explore the same honeycomb used by the plant reader.</p><div class="pimo-preview-body"><div class="pimo-preview-map"><canvas aria-label="Plant knowledge honeycomb. Choose a topic below to explore." role="img"></canvas><nav aria-label="Knowledge families" data-preview-families></nav></div><article class="pimo-preview-reading" tabindex="0" aria-live="polite" data-preview-reading></article></div></div>`;
 const canvas=dialog.querySelector('canvas'),reading=dialog.querySelector('[data-preview-reading]'),families=dialog.querySelector('[data-preview-families]');
 const button=(node,where)=>{const b=document.createElement('button');b.type='button';b.dataset.previewNode=node.id;b.textContent=node.title;b.onclick=()=>select(node.id);where.append(b);return b;};
 for(const root of documentModel.nodes.filter(node=>!node.parentId))button(root,families);
 function paint(){
  if(destroyed)return;const box=canvas.getBoundingClientRect(),scale=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(320,Math.round(box.width*scale));canvas.height=Math.max(260,Math.round(box.height*scale));
  layout={layoutWidth:canvas.width,layoutHeight:canvas.height,viewportWidth:canvas.width,viewportHeight:canvas.height,cellWidthPixels:Math.min(200*scale,canvas.width/3.8),selectedNodeId:selected,topInset:16,bottomInset:16,horizontalInset:16,cellOpacity:1};
  drawPlantInformationHoneycomb(canvas.getContext('2d'),canvas,knowledge,[...expanded],layout);
 }
 function select(id=''){
  selected=id;const node=documentModel.nodes.find(n=>n.id===id);reading.replaceChildren();
  const breadcrumb=document.createElement('p');breadcrumb.className='pimo-preview-breadcrumb';breadcrumb.textContent=node?[...pimAncestors(documentModel,id),node].map(n=>n.title).join(' › '):documentModel.identity.commonName;reading.append(breadcrumb);
  const heading=document.createElement('h3');heading.textContent=node?.title||documentModel.identity.commonName;reading.append(heading);
  const text=document.createElement('p');text.textContent=node?.body||node?.preview||(node?'No content yet. Add information in the editor.':documentModel.identity.identityStatement||'Choose one of the six knowledge families.');reading.append(text);
  if(node){expanded.add(node.path);for(const ancestor of pimAncestors(documentModel,id))expanded.add(ancestor.path);
   if(node.safetyNote){const safety=document.createElement('p');safety.className='pimo-preview-safety';safety.textContent=node.safetyNote;reading.append(safety);}
   if(node.parentId){const back=document.createElement('button');back.type='button';back.className='pimo-icon';back.setAttribute('aria-label','Back to parent topic');back.innerHTML=pimoIcon('undo');back.onclick=()=>select(node.parentId);reading.append(back);}
   const children=document.createElement('nav');children.setAttribute('aria-label','Topics in '+node.title);for(const child of pimChildren(documentModel,id))button(child,children);reading.append(children);
   for(const sourceId of node.sourceIds||[]){const source=documentModel.sources?.find(s=>s.id===sourceId);if(!/^https?:\/\//i.test(source?.url||''))continue;const a=document.createElement('a');a.href=source.url;a.textContent=source.title||source.url;a.target='_blank';a.rel='noopener noreferrer';reading.append(a);}
  }
  for(const b of families.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.previewNode===(node?.primaryCategory||id)));
  paint();
 }
 canvas.addEventListener('click',event=>{const box=canvas.getBoundingClientRect(),hit=pimHoneycombTargetAtPercent(knowledge,[...expanded],(event.clientX-box.left)/box.width*100,(event.clientY-box.top)/box.height*100,layout);if(hit?.pimCore)select();else if(hit?.path){const node=documentModel.nodes.find(n=>n.path===hit.path||n.id===hit.path);if(node)select(node.id);}});
 function close(){if(destroyed)return;destroyed=true;observer.disconnect();dialog.close();dialog.remove();returnFocus?.focus({preventScroll:true});onClose();}
 dialog.querySelector('[data-preview-close]').onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 document.body.append(dialog);dialog.showModal();const observer=new ResizeObserver(paint);observer.observe(canvas);select();
 return {document:documentModel,close,destroy:close};
}
