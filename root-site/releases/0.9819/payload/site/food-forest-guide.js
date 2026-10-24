import {GUIDE_LAYERS,GUIDE_DESIGNS,GUIDE_PEOPLE} from "./food-forest-guide-content.mjs?v=0.9819";

const guide=document.querySelector('#food-forest-guide');
if(guide){
 const views=[...guide.querySelectorAll('[data-guide-view]')],panels=[...guide.querySelectorAll('[data-guide-scene]')];
 const headings={
  system:['Understand a food forest.','A food forest brings edible and useful plants into a landscape inspired by a natural forest.'],
  layers:['Layers of a food forest.','Explore how plants use the space above and below the ground.'],
  decisions:['Design with intention.','A food forest can be useful, abundant and beautiful. Explore the balance.'],
  people:['Make room for people.','Beauty, diverse crops and spaces to rest, connect and discover belong in the design.']
 };
 function keyboardChoices(buttons,select){
  buttons.forEach((button,index)=>button.addEventListener('keydown',event=>{
   let next;
   if(['ArrowRight','ArrowDown'].includes(event.key))next=(index+1)%buttons.length;
   if(['ArrowLeft','ArrowUp'].includes(event.key))next=(index-1+buttons.length)%buttons.length;
   if(event.key==='Home')next=0;if(event.key==='End')next=buttons.length-1;
   if(next===undefined)return;event.preventDefault();select(buttons[next]);buttons[next].focus();
  }));
 }
 function prepare(panel){
  for(const image of panel.querySelectorAll('img')){image.loading='eager';image.decoding='async';image.decode().then(fit).catch(()=>{});}
 }
 function showView(button){
  const key=button.dataset.guideView;guide.dataset.guideSceneActive=key;
  for(const panel of panels){panel.hidden=panel.dataset.guideScene!==key;panel.inert=panel.hidden;if(!panel.hidden)prepare(panel);}
  for(const item of views){item.setAttribute('aria-selected',String(item===button));item.tabIndex=item===button?0:-1;}
  guide.querySelector('h1').textContent=headings[key][0];guide.querySelector('[data-guide-intro]').textContent=headings[key][1];requestAnimationFrame(fit);
 }
 for(const button of views)button.addEventListener('click',()=>showView(button));
 keyboardChoices(views,showView);

 const layerButtons=[...guide.querySelectorAll('[data-guide-layer]')],spread=guide.querySelector('[data-layer-spread]');
 let selectedLayer='canopy';
 function layerLeader(){
  if(guide.dataset.guideSceneActive!=='layers')return;
  const data=GUIDE_LAYERS[selectedLayer],box=spread.getBoundingClientRect(),button=layerButtons.find(b=>b.dataset.guideLayer===selectedLayer),rect=button.getBoundingClientRect();
  const x=data.point[0],y=data.point[1]*2/3;
  for(const name of ['[data-layer-glow]','[data-layer-target]']){const circle=guide.querySelector(name);circle.setAttribute('cx',x);circle.setAttribute('cy',y);}
  const startX=(rect.right-box.left)/box.width*100,startY=(rect.top+rect.height/2-box.top)/box.width*100;
  guide.querySelector('[data-layer-leader]').setAttribute('d',`M${startX} ${startY} Q${(startX+x)/2} ${startY} ${x} ${y}`);
 }
 function selectLayer(button){
  selectedLayer=button.dataset.guideLayer;const data=GUIDE_LAYERS[selectedLayer];
  for(const item of layerButtons){const active=item===button;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;}
  guide.querySelector('[data-layer-name]').textContent=data.name;guide.querySelector('[data-layer-art-title]').textContent=data.name;guide.querySelector('[data-layer-copy]').textContent=data.copy;
  guide.querySelector('#guide-layer-panel').setAttribute('aria-labelledby',button.id);spread.dataset.layer=selectedLayer;layerLeader();
  fitLayerText();
 }
 for(const button of layerButtons){button.addEventListener('click',()=>selectLayer(button));button.addEventListener('focus',()=>selectLayer(button));button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')selectLayer(button);});}
 keyboardChoices(layerButtons,selectLayer);

 const designButtons=[...guide.querySelectorAll('[data-design-choice]')],triangle=guide.querySelector('[data-design-triangle]');
 function selectDesign(button){
  const key=button.dataset.designChoice,data=GUIDE_DESIGNS[key],[x,y]=data.point;
  triangle.dataset.design=key;triangle.style.setProperty('--design-tone',data.tone);triangle.style.setProperty('--focus-x',x+'%');triangle.style.setProperty('--focus-y',y+'%');
  for(const item of designButtons)item.setAttribute('aria-pressed',String(item===button));
  guide.querySelector('[data-design-name]').textContent=data.name;guide.querySelector('[data-design-copy]').textContent=data.copy;
  for(const selector of ['[data-triangle-aura]','[data-triangle-seed]']){const circle=triangle.querySelector(selector);circle.setAttribute('cx',x*6);circle.setAttribute('cy',y*5);}
  triangle.querySelector('[data-triangle-bonds]').setAttribute('d',`M300 55L${x*6} ${y*5}M80 420L${x*6} ${y*5}M520 420L${x*6} ${y*5}`);
 }
 for(const button of designButtons){button.addEventListener('click',()=>selectDesign(button));button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'&&button.dataset.designChoice!=='blend')selectDesign(button);});}
 keyboardChoices(designButtons,selectDesign);selectDesign(designButtons.find(b=>b.dataset.designChoice==='blend'));

 const peopleButtons=[...guide.querySelectorAll('[data-people-choice]')],people=guide.querySelector('[data-people-picture]');
 function selectPeople(button){
  const data=GUIDE_PEOPLE[button.dataset.peopleChoice];people.dataset.focus=button.dataset.peopleChoice;
  people.style.setProperty('--person-x',data.point[0]+'%');people.style.setProperty('--person-y',data.point[1]+'%');
  for(const item of peopleButtons)item.setAttribute('aria-pressed',String(item===button));
  guide.querySelector('[data-people-name]').textContent=data.name;guide.querySelector('[data-people-copy]').textContent=data.copy;
 }
 for(const button of peopleButtons)button.addEventListener('click',()=>selectPeople(button));
 keyboardChoices(peopleButtons,selectPeople);selectPeople(peopleButtons[0]);

 function fit(){
  if(guide.hidden)return;
  const system=guide.querySelector('.system-image-space'),art=system.querySelector('.forest-system-art'),image=art.querySelector('img');
  if(guide.dataset.guideSceneActive==='system'&&image.naturalWidth){const ratio=image.naturalWidth/image.naturalHeight,width=Math.min(system.clientWidth,system.clientHeight*ratio);Object.assign(art.style,{width:width+'px',height:width/ratio+'px'});}
  if(guide.dataset.guideSceneActive==='layers'){
   const parent=spread.parentElement;
   if(matchMedia('(max-width:700px)').matches)Object.assign(spread.style,{width:'100%',height:'auto'});
   else {const width=Math.min(parent.clientWidth,parent.clientHeight*1.5);Object.assign(spread.style,{width:width+'px',height:width/1.5+'px'});}
   guide.querySelector('.guide-layer-tabs').setAttribute('aria-orientation',matchMedia('(max-width:700px)').matches?'horizontal':'vertical');layerLeader();
   fitLayerText();
  }
 }
 function fitLayerText(){
  if(guide.dataset.guideSceneActive!=='layers'||matchMedia('(max-width:700px)').matches)return;
  const panel=guide.querySelector('.guide-layer-panel'),copy=panel.querySelector('[data-layer-copy]');
  let size=Math.min(20,Math.max(13,spread.clientWidth*.016));copy.style.fontSize=size+'px';
  while(panel.scrollHeight>panel.clientHeight+1&&size>12){size-=.5;copy.style.fontSize=size+'px';}
 }
 new ResizeObserver(fit).observe(guide.querySelector('.guide-views'));
 guide.querySelector('.forest-system-art img').addEventListener('load',fit);
 window.addEventListener('nourishland:route',event=>{if(event.detail.page==='food-forest-guide'){prepare(panels.find(p=>!p.hidden));requestAnimationFrame(fit);}});
 for(const button of guide.querySelectorAll('[data-system-topic]'))button.setAttribute('aria-pressed','false');
 requestAnimationFrame(fit);
}
