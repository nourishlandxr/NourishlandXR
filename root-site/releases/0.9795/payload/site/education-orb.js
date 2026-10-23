import {createCeramicOrb} from "./orb/ceramic-orb.js?v=0.9795";
const root=document.querySelector('[data-education-orb]');
if(root){
 const button=root.querySelector('[data-open-orb]'),paths=root.querySelector('[data-orb-paths]'),summary=document.querySelector('[data-education-summary]'),footerHint=document.querySelector('[data-education-idle-hint]');
 const title=summary.querySelector('[data-summary-title]'),more=summary.querySelector('[data-summary-more]'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const choices=[...paths.querySelectorAll('[data-education-choice]')];
 const details={
  'food-forests':{label:'Food Forests',title:'A new way to grow.',copy:'Discover food forests: diverse, welcoming places to grow food, reconnect with nature and keep learning.',href:'/food-forests/',action:'Explore food forests',color:'#526c45'},
  'immersive-learning':{label:'Immersive Learning',title:'Learn by looking, doing and discovering.',copy:'Follow a plant guide through images, questions and activities. Connect what you learn on screen with the living plants around you, with AR where supported.',href:'/immersive-learning/',action:'Explore immersive learning',color:'#37777b'},
  hillyards:{label:'Hillyards prototype',title:'A real garden becomes a learning place.',copy:'Hillyards Food Forest is the setting for Nourishland’s first immersive-walk prototype. Plant guides and learning activities are being developed around the garden.',href:'/hillyards/',action:'Explore the Hillyards prototype',color:'#ad684c'},
  collaborate:{label:'Build with us',title:'Help shape the first learning experience.',copy:'Educators, growers, researchers and site hosts can help develop the first pilot. Start with a place, the people who know it and something worth sharing.',href:'/collaborate/',action:'See how to take part',color:'#8a7951'}
 };
 let open=false,orb=null,visible=false,pending=false,inView=false,selected=null,origin=null,revision=0,animation=null;
 let interacted=false,hintTimer=null,hintRemaining=8000,hintStarted=0,drag=null,suppressClick=false,queuedYaw=0,queuedPitch=0;
 function pauseHint(){if(hintTimer!==null){clearTimeout(hintTimer);hintTimer=null;hintRemaining=Math.max(0,hintRemaining-(performance.now()-hintStarted))}}
 function showHint(){if(interacted||!visible||document.hidden||!footerHint)return;footerHint.textContent='Tap or click the orb to explore.';footerHint.dataset.visible='true'}
 function syncHint(){pauseHint();if(interacted||!visible||document.hidden)return;if(hintRemaining<=0){showHint();return}hintStarted=performance.now();hintTimer=setTimeout(()=>{hintTimer=null;hintRemaining=0;showHint()},hintRemaining)}
 function markUsed(){interacted=true;pauseHint();if(footerHint){footerHint.dataset.visible='false';footerHint.textContent=''}}
 function closeSummary({focus=false}={}){const trigger=origin,current=++revision;selected=null;animation?.cancel();summary.hidden=true;summary.inert=true;summary.setAttribute('aria-hidden','true');root.dataset.selection='';root.closest('.education-experience').dataset.detail='false';summary.dataset.side='';for(const choice of choices)choice.setAttribute('aria-expanded','false');if(focus&&trigger)requestAnimationFrame(()=>{if(revision===current&&!selected)trigger.focus({preventScroll:true})})}
 function setOpen(value,{focus=false}={}){
  open=value;root.dataset.open=String(value);button.setAttribute('aria-expanded',String(value));button.setAttribute('aria-label',(value?'Close learning connections':'Open learning connections')+'; drag to rotate the orb');paths.inert=!value;paths.setAttribute('aria-hidden',String(!value));if(!value)closeSummary();orb?.setOpen(value);if(focus)button.focus({preventScroll:true});
 }
 function choose(key,choice){const data=details[key];if(!data||!open)return;if(selected===key){closeSummary({focus:true});return}markUsed();const current=++revision;selected=key;origin=choice;root.dataset.selection=key;root.closest('.education-experience').dataset.detail='true';summary.dataset.side='right';summary.dataset.row='upper';
  summary.querySelector('[data-summary-topic]').textContent=data.label;title.textContent=data.title;summary.querySelector('[data-summary-copy]').textContent=data.copy;more.href=data.href;more.textContent=data.action+' ↗';summary.style.setProperty('--summary-accent',data.color);
  summary.hidden=false;summary.inert=false;summary.setAttribute('aria-hidden','false');for(const item of choices)item.setAttribute('aria-expanded',String(item===choice));animation?.cancel();if(!reduced.matches)animation=summary.animate?.([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.75,.2,1)'});
  requestAnimationFrame(()=>{if(revision===current&&selected)title.focus({preventScroll:true})});
 }
 function rotate(x,y){markUsed();if(orb)orb.rotateBy(x,y);else{queuedYaw+=x;queuedPitch+=y}}
 button.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){suppressClick=false;return}suppressClick=false;markUsed();setOpen(!open)});
 button.addEventListener('pointerdown',e=>{if(e.button!==0)return;markUsed();suppressClick=false;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false};button.setPointerCapture(e.pointerId)});
 button.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;if(drag.moved){button.dataset.dragging='true';rotate(dx*.009,dy*.009)}drag.x=e.clientX;drag.y=e.clientY});
 function endDrag(e){if(!drag||drag.id!==e.pointerId)return;suppressClick=e.type==='pointerup'&&drag.moved;drag=null;button.dataset.dragging='false'}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,endDrag);
 button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();rotate(e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0,e.key==='ArrowUp'?-.2:e.key==='ArrowDown'?.2:0)});
 for(const choice of choices)choice.addEventListener('click',()=>choose(choice.dataset.educationChoice,choice));
 summary.querySelector('[data-close-education]')?.addEventListener('click',()=>closeSummary({focus:true}));
 paths.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();let i=choices.indexOf(document.activeElement);if(e.key==='Home')i=0;else if(e.key==='End')i=choices.length-1;else i=(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+choices.length)%choices.length;choices[i].focus()});
 root.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(selected){e.preventDefault();closeSummary({focus:true})}else if(open){e.preventDefault();setOpen(false,{focus:true})}});
 summary.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected){e.preventDefault();closeSummary({focus:true})}});
 function route(){visible=document.body.dataset.page==='education';orb?.setActive(visible&&inView&&!document.hidden);if(!visible&&open)setOpen(false);if(!visible&&footerHint)footerHint.dataset.visible='false';syncHint()}
 window.addEventListener('nourishland:route',route);document.addEventListener('visibilitychange',()=>{orb?.setActive(inView&&visible&&!document.hidden);syncHint()});
 function loadVisibleOrb(){
  if(!inView||orb||pending)return;
  if(document.documentElement?.hasAttribute('data-experience-site')&&root.closest('[data-route]')?.dataset.entrance!=='ready')return;
  pending=true;createCeramicOrb(root.querySelector('canvas'),{reduced,connectionOnly:true}).then(value=>{orb=value;root.dataset.orbReady='true';if(queuedYaw||queuedPitch){orb.rotateBy(queuedYaw,queuedPitch);queuedYaw=queuedPitch=0}orb.setOpen(open);orb.setActive(inView&&visible&&!document.hidden)}).catch(()=>{root.dataset.orbReady='fallback'});
 }
 window.addEventListener('nourishland:page-settled',event=>{if(event.detail.page==='education')loadVisibleOrb()});
 const observer=new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);orb?.setActive(inView&&visible&&!document.hidden);loadVisibleOrb();},{rootMargin:'160px'});
 observer.observe(root);setOpen(false);route();
}
