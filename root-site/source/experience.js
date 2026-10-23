import {mountPlaceShowcase} from './place-showcase.js';
import './living-surfaces.js';
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let entrance=[],pendingEntrance=[],epoch=0,wheel=null,wheelLoading=false,dieDispose=null,dieLoading=false,places=null,placesLoading=false,forestSelection=null;
const forestTopics={layers:{title:'Different layers. Shared light.',copy:'Canopy trees shape the shade. Smaller trees and shrubs fill the middle. Herbs, groundcovers, climbers and roots use other parts of the space. Plan for the size each plant will reach.',points:['Canopy','Understorey','Roots'],color:'#607953'},relationships:{title:'The connections make the forest.',copy:'Roots meet soil and fungi. Flowers attract pollinators. Leaves become shelter and organic matter. These relationships change with the species, conditions and care a place receives.',points:['Soil life','Pollinators','Habitat'],color:'#3f7775'},seasons:{title:'A forest keeps becoming.',copy:'Flowering, harvest, leaf fall and new growth follow different rhythms. A mix of species can spread activity through the year. Watch what changes in your own climate.',points:['Flower','Harvest','Renew'],color:'#a46a4c'}};
const partnerTopics={educator:['Shape a learning experience.','Bring a group of learners, a question or a research interest. Help test a small activity in a real place.'],host:['Start with a small patch of land.','A garden, campus or food forest can become a pilot setting. We begin with an introduction and a shared development plan.'],build:['Help turn the concept into a useful pilot.','Contribute plant knowledge, design, technical skills or funding. We’re looking for people to help develop and test the foundation.']};
function answer(host,text){host.querySelector('h2').textContent=text[0];host.querySelector('p').textContent=text[1];if(!reduced.matches)host.animate([{opacity:.25,transform:'translateY(7px)'},{opacity:1,transform:'none'}],{duration:320,easing:'ease-out'});}
function cancelEntrance(){epoch++;for(const a of entrance)a.cancel();entrance=[];for(const node of pendingEntrance)node.style.opacity='';pendingEntrance=[];}
export function prepareEntrance(key){
 cancelEntrance();const page=document.querySelector(`[data-route="${key}"]`);if(!page)return;
 page.dataset.entering='true';
}
export function enterPage(key){
 const page=document.querySelector(`[data-route="${key}"]`);if(!page)return;
 delete page.dataset.entering;page.dataset.entrance='running';const token=epoch;
 const title=page.querySelector('h1'),object=page.querySelector('.knowledge-flower,[data-platform-totem],.forest-orbit,.places-sculpture,.hillyards-object,.discovery-die,.learning-path-object,.about-emblem,.contact-seed,.story-reader,.guide-scenes');
 const copy=page.querySelector('.education-after-orb,.experience-intro>p,.platform-intro>p');
 const complete=()=>{if(token!==epoch)return;page.dataset.entrance='ready';window.dispatchEvent(new CustomEvent('nourishland:page-settled',{detail:{page:key}}));};
 if(reduced.matches){loadPageObject(key);complete();return;}
 pendingEntrance=[object,copy].filter(Boolean);for(const node of pendingEntrance)node.style.opacity='0';
 const reveal=async(node,duration,scale=1)=>{if(!node||token!==epoch)return;node.style.opacity='';const animation=node.animate([{opacity:0,transform:`translateY(12px) scale(${scale})`},{opacity:1,transform:'none'}],{duration,easing:'cubic-bezier(.22,.75,.2,1)'});entrance.push(animation);await animation.finished.catch(()=>{});};
 (async()=>{
  await reveal(title,420);if(token!==epoch)return;
  // Ensure the heading is actually painted before starting the central object.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await new Promise(resolve=>setTimeout(resolve,120));if(token!==epoch)return;
  if(key!=='education')loadPageObject(key);
  await reveal(object,860,.87);if(token!==epoch)return;
  await new Promise(resolve=>setTimeout(resolve,100));if(token!==epoch)return;
  await reveal(copy,500);if(token!==epoch)return;
  if(key==='education')loadPageObject(key);complete();
 })();
}
async function loadPageObject(key){
 wheel?.setActive(key==='food-forests');
 if(key==='food-forests'&&!wheel&&!wheelLoading){wheelLoading=true;const host=document.querySelector('[data-forest-wheel]');try{const {mountOriginalWheel}=await import('./food-forest-wheel.js');wheel=await mountOriginalWheel(host);wheel.setTopic(forestSelection);wheel.setActive(document.body.dataset.page==='food-forests');}catch{host.dataset.finish='fallback';}finally{wheelLoading=false;}}
 if(key==='places'&&!places&&!placesLoading){placesLoading=true;places=await mountPlaceShowcase(document.querySelector('#places [data-places-showcase]'));placesLoading=false;}
 if(key==='collaborate'&&!dieDispose&&!dieLoading){dieLoading=true;try{const {mountLandingWheel}=await import('/xr/v2/nlxr/services/landingWheel.js');dieDispose=await mountLandingWheel(document.querySelector('[data-discovery-die]'));}finally{dieLoading=false;}}
}
const forest=document.querySelector('[data-forest-orbit]'),forestMenu=forest?.querySelector('#forest-connections'),forestTrigger=forest?.querySelector('[data-forest-menu]'),forestAnswer=forest?.querySelector('[data-forest-answer]');
let threadFrame=0,threadUntil=0;
function forestThreads(now=performance.now()){
 threadFrame=0;if(!forest||document.body.dataset.page!=='food-forests')return;const box=forest.getBoundingClientRect(),svg=forest.querySelector('.forest-orbit-threads');if(!box.width||!box.height)return;
 const origin=forestTrigger.getBoundingClientRect();
 svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);const paths=[...svg.querySelectorAll('path')],middle={x:origin.left+origin.width/2-box.left,y:origin.top+origin.height/2-box.top};
 forest.querySelectorAll('.forest-node').forEach((node,i)=>{const r=node.querySelector('i').getBoundingClientRect(),x=r.left+r.width/2-box.left,y=r.top+r.height/2-box.top;paths[i].setAttribute('d',`M${middle.x} ${middle.y} Q${middle.x+(x-middle.x)*.55} ${middle.y} ${x} ${y}`);});
 if(now<threadUntil)threadFrame=requestAnimationFrame(forestThreads);
}
function trackForest(){forest?.querySelectorAll('a.forest-node').forEach(n=>n.inert=!!forestSelection&&matchMedia('(max-width:700px)').matches);threadUntil=performance.now()+1250;if(!threadFrame)threadFrame=requestAnimationFrame(forestThreads);}
if(forest){new ResizeObserver(trackForest).observe(forest);forest.querySelectorAll('.forest-node').forEach((node,i)=>node.style.setProperty('--node-order',i));}
function forestOpen(open){if(!forest)return;forest.dataset.menuOpen=String(open);forestMenu.inert=!open;forestMenu.setAttribute('aria-hidden',String(!open));forestTrigger.setAttribute('aria-expanded',String(open));trackForest();}
function closeForest(){forestSelection=null;forest.dataset.focused='false';forestAnswer.hidden=true;wheel?.setTopic(null);forest.querySelectorAll('[data-forest-topic]').forEach(b=>b.setAttribute('aria-expanded','false'));forest.querySelectorAll('a.forest-node').forEach(n=>n.inert=false);forestTrigger.focus({preventScroll:true});trackForest();}
forestTrigger?.addEventListener('click',()=>forestOpen(true));
forest?.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')forestOpen(true);});
forest?.addEventListener('focusin',()=>forestOpen(true));
forest?.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'&&!forestSelection&&!forest.contains(document.activeElement))forestOpen(false);});
forest?.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();if(forestSelection)closeForest();else {forestTrigger.focus({preventScroll:true});forestOpen(false);}}});
forest?.querySelector('[data-close-forest]')?.addEventListener('click',closeForest);
document.querySelectorAll('[data-forest-topic]').forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.forestTopic,data=forestTopics[key];if(forestSelection===key){closeForest();return;}forestSelection=key;forest.dataset.focused='true';forestAnswer.hidden=false;
 forestAnswer.style.setProperty('--balloon-accent',data.color);forestAnswer.querySelector('[data-forest-label]').textContent=button.textContent;
 forestAnswer.querySelector('h2').textContent=data.title;forestAnswer.querySelector('[data-forest-copy]').textContent=data.copy;
 forestAnswer.querySelector('.forest-knowledge-points').replaceChildren(...data.points.map(text=>{const span=document.createElement('span');span.textContent=text;return span;}));
 forest.querySelectorAll('[data-forest-topic]').forEach(b=>b.setAttribute('aria-expanded',String(b===button)));wheel?.setTopic(key);
 forest.querySelectorAll('a.forest-node').forEach(n=>n.inert=matchMedia('(max-width:700px)').matches);trackForest();
 if(!reduced.matches)forestAnswer.animate([{opacity:0,transform:'translateY(24px) scale(.5) rotate(-4deg)'},{opacity:1,transform:'none'}],{duration:700,easing:'cubic-bezier(.2,.75,.2,1)'});
 forestAnswer.querySelector('h2').focus({preventScroll:true});
}));
document.querySelectorAll('[data-partner]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-partner]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));answer(document.querySelector('[data-partner-answer]'),partnerTopics[button.dataset.partner]);}));
document.querySelector('[data-open-learning]')?.addEventListener('click',()=>document.querySelector('.header-pathways a[href="/education/"]').click());

// An interactive phone preview, not a link to the production Field app.
const phone=document.createElement('dialog');phone.className='phone-preview experience-dialog';phone.setAttribute('aria-labelledby','phone-preview-title');
phone.innerHTML=`<button type="button" class="experience-icon dialog-close" aria-label="Close phone preview" data-close-phone>×</button><header><p class="eyebrow">On your phone</p><h2 id="phone-preview-title">Keep learning outside.</h2><p>Try an observation in Field Notes.</p></header><div class="phone-frame"><div class="phone-island" aria-hidden="true"></div><div class="phone-screen"><div class="phone-brand">nourishland <small>FIELD PREVIEW</small></div><nav aria-label="Phone preview sections"><button type="button" data-phone-view="plants" aria-pressed="true">Plants</button><button type="button" data-phone-view="notes" aria-pressed="false">Notes</button></nav><section data-phone-page="plants"><p class="eyebrow">Hillyards · example</p><h3>A garden full of questions.</h3><button type="button" class="phone-plant" data-preview-plant><span aria-hidden="true">✧</span><span>Pigeon pea<small>Open the plant tag</small></span><b aria-hidden="true">↗</b></button><section data-phone-tag hidden><h4>A plant, connected to its place.</h4><p>A tag can hold images, growing observations and questions from your visit.</p><button type="button" data-phone-note>Add an observation</button></section><p class="phone-caption">Tap the plant tag to explore.</p></section><section data-phone-page="notes" hidden><p class="eyebrow">Your observation</p><h3>What did you notice?</h3><form data-note-form><label for="preview-observation">Field note</label><textarea id="preview-observation" required maxlength="280" rows="4" placeholder="New flowers, visitors, changes…"></textarea><button type="submit">Keep this observation</button></form><p data-phone-feedback role="status"></p><div data-phone-notes></div></section><p class="phone-preview-label">Interactive preview · example content</p></div></div>`;
document.body.append(phone);
function phoneView(key){for(const page of phone.querySelectorAll('[data-phone-page]'))page.hidden=page.dataset.phonePage!==key;for(const button of phone.querySelectorAll('[data-phone-view]'))button.setAttribute('aria-pressed',String(button.dataset.phoneView===key));}
phone.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;if(button.hasAttribute('data-close-phone'))phone.close();if(button.dataset.phoneView)phoneView(button.dataset.phoneView);if(button.hasAttribute('data-preview-plant'))phone.querySelector('[data-phone-tag]').hidden=!phone.querySelector('[data-phone-tag]').hidden;if(button.hasAttribute('data-phone-note')){phoneView('notes');phone.querySelector('textarea').focus();}});
phone.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const input=phone.querySelector('textarea'),value=input.value.trim();if(!value)return;const note=document.createElement('p');note.className='phone-saved-note';note.textContent=value;phone.querySelector('[data-phone-notes]').replaceChildren(note);input.value='';phone.querySelector('[data-phone-feedback]').textContent='Observation kept in this preview.';});
phone.addEventListener('click',e=>{if(e.target===phone){const r=phone.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)phone.close();}});
export function openPhone({view='plants'}={}){phoneView(view);if(!phone.open)phone.showModal();}

let creatorDialog=null,creatorController=null;
async function openCreator(){
 if(!creatorDialog){const template=document.querySelector('#creator-showcase-template');if(!template)return;creatorDialog=document.createElement('dialog');creatorDialog.className='creator-preview experience-dialog';creatorDialog.setAttribute('aria-label','Explore the Creator tools');creatorDialog.innerHTML='<button type="button" class="experience-icon dialog-close" aria-label="Close Creator preview" data-close-creator>×</button>'+template.innerHTML;document.body.append(creatorDialog);
  const root=creatorDialog.querySelector('[data-creator-system]');root.dataset.cleanMap='true';root.hidden=false;root.inert=false;
  root.querySelectorAll('.creator-system-intro,.creator-map-controls,.creator-map-growth,.creator-map-source,.creator-system-footer,.creator-real-capture,.creator-totem-style').forEach(node=>node.remove());
  const imap=root.querySelector('[data-creator-panel="imap"]');imap.innerHTML=`<header><h3 id="creator-imap-title" tabindex="-1">Explore a place in your hands.</h3><p>Terrain, paths and plant knowledge come together.</p></header>`+document.querySelector('#places [data-places-showcase]').outerHTML;
  creatorDialog.querySelector('[data-close-creator]').addEventListener('click',()=>creatorDialog.close());
  const {createCreatorFeatures}=await import('./creator-features.js');creatorController=createCreatorFeatures(root);
  creatorDialog.addEventListener('close',()=>creatorController.setActive(false));
 }
 creatorDialog.showModal();creatorController.setActive(true);
}
document.addEventListener('click',e=>{
 const control=e.target.closest('[data-open-phone],a[href="/field/"],[data-open-showcase]');if(!control)return;
 e.preventDefault();if(control.hasAttribute('data-open-showcase'))openCreator();else openPhone({view:control.matches('a[href="/field/"]')?'plants':'notes'});
});
window.addEventListener('nourishland:phone-preview',()=>openPhone({view:'notes'}));
window.addEventListener('nourishland:route',e=>{cancelEntrance();wheel?.setActive(e.detail.page==='food-forests');if(phone.open)phone.close();if(creatorDialog?.open)creatorDialog.close();});
reduced.addEventListener('change',()=>{cancelEntrance();enterPage(document.body.dataset.page);});
window.addEventListener('pagehide',event=>{if(!event.persisted){wheel?.destroy();dieDispose?.();places?.dispose();}});
