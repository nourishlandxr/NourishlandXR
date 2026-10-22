import {createCreatorFeatures} from "./creator-features.js?v=0.9783";
const stage=document.querySelector('[data-platform-totem]');
if(stage&&stage.dataset.totemJourney===undefined){
 const nav=stage.querySelector('.totem-signs'),panel=stage.querySelector('[data-totem-highlights]'),caption=stage.querySelector('[data-totem-caption]');
 const title=panel.querySelector('[data-highlight-title]'),image=panel.querySelector('[data-highlight-image]'),entry=panel.querySelector('[data-highlight-entry]');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const tools={
  creator:{label:'Creator',hint:'Prepare plant guides and organise a learning place.',title:'Connect a plant to its place.',copy:'PIMOs hold the knowledge. Totems guide people between areas. An IMAP brings the growing project together.',points:['Open a PIMO','Follow a Totem’s signs','Turn the map and watch it grow'],image:'04-pimo-control-panel-fruit-box-768.webp',alt:'Concept illustration of a plant guide with information, an image and a Fruit Window',href:'/creator/',action:'Open Creator',access:''},
  explorer:{label:'Explorer',hint:'Discover plant guides and follow their connections.',title:'See more in the plants around you.',copy:'Open a plant’s guide, explore its images and follow connections to growing needs, uses and ecological relationships.',points:['Discover a plant’s connected knowledge','Explore images and learning content','Follow your own questions'],image:'06-six-perspectives-plant-768.webp',alt:'Concept illustration of a plant surrounded by its connected knowledge perspectives',href:'/explorer/',action:'Open Explorer',access:'Available content depends on the place or project.'},
  field:{label:'Field tools',hint:'Take place knowledge and a field journal outside.',title:'Keep learning in the garden.',copy:'Use your phone to browse published knowledge about a place and keep observations in a personal field journal.',points:['Browse knowledge linked to a place','Record observations in your journal','Keep learning close to the plants'],image:'08-record-observation-768.webp',alt:'Concept illustration of a gardener recording an observation beside a plant',href:'/field/',action:'Open Field tools',access:'Project access and device support may vary.'}
 };

 const creator=createCreatorFeatures(stage.querySelector('[data-creator-system]'));
 const signs=[...stage.querySelectorAll('[data-totem-sign]')];let selected=null,origin=null,revision=0,animation=null;
 function reset({restore=false}={}){
  const trigger=origin,current=++revision;selected=null;creator.setActive(false);animation?.cancel();stage.dataset.totemState='overview';stage.dataset.direction='';panel.hidden=true;panel.inert=true;panel.setAttribute('aria-hidden','true');caption.textContent='Select a sign to learn about a tool.';
  for(const sign of signs)sign.setAttribute('aria-expanded','false');
  if(restore&&trigger)requestAnimationFrame(()=>{if(revision===current&&!selected)trigger.focus({preventScroll:true})});
 }
 function reveal(key,sign){
  if(selected===key){reset({restore:true});return}const tool=tools[key];if(!tool)return;const current=++revision;selected=key;origin=sign;creator.setActive(key==='creator');
  panel.querySelector('[data-highlight-tool]').textContent=tool.label;title.textContent=tool.title;if(key!=='creator'){image.src='/site/art/'+tool.image;image.alt=tool.alt;}
  panel.querySelector('[data-highlight-copy]').textContent=tool.copy;
  panel.querySelector('[data-highlight-points]').replaceChildren(...tool.points.map(text=>{const li=document.createElement('li');li.textContent=text;return li}));
  entry.href=tool.href;entry.textContent=tool.action+' ↗';panel.querySelector('[data-highlight-access]').textContent=tool.access;
  for(const button of signs)button.setAttribute('aria-expanded',String(button===sign));
  stage.dataset.totemState='detail';stage.dataset.direction=key;panel.hidden=false;panel.inert=false;panel.setAttribute('aria-hidden','false');caption.textContent=tool.label+' · select another sign, or select again to close.';
  animation?.cancel();if(!reduced.matches)animation=panel.animate?.([{opacity:0,transform:key==='explorer'?'translateX(-12px)':'translateX(12px)'},{opacity:1,transform:'translateX(0)'}],{duration:260,easing:'ease-out'});
  requestAnimationFrame(()=>{if(revision===current&&selected){if(key==='creator')creator.focusIntro?.();else title.focus({preventScroll:true})}});
 }
 stage.querySelector('[data-totem-close]')?.addEventListener('click',()=>reset({restore:true}));
 for(const sign of signs)sign.addEventListener('click',()=>reveal(sign.dataset.totemSign,sign));
 stage.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&selected){event.preventDefault();reset({restore:true});return}
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;const current=signs.indexOf(document.activeElement);if(current<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?signs.length-1:(current+(event.key==='ArrowUp'?-1:1)+signs.length)%signs.length;signs[next].focus();
 });
 window.addEventListener('nourishland:route',event=>{if(event.detail.page!=='platform')reset()});
}
