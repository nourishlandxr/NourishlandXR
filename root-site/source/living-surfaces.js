// Keep details in the same composition as the object that revealed them.
const education=document.querySelector('#education .education-experience'),summary=education?.querySelector('[data-education-summary]');
if(education)education.insertAdjacentHTML('afterbegin','<svg class="education-balloon-tether" aria-hidden="true"><path/></svg>');
let frame=0;
function placeEducation(){
 frame=0;if(!education||!summary)return;
 education.dataset.detail=String(!summary.hidden);const tether=education.querySelector('.education-balloon-tether');if(summary.hidden){tether?.querySelector('path').setAttribute('d','');return;}
 const box=education.getBoundingClientRect(),choice=education.querySelector('[data-education-choice][aria-expanded=true]');if(!choice||!box.width||!box.height)return;
 const target=choice.getBoundingClientRect(),mobile=box.width<1050,width=summary.offsetWidth,height=summary.offsetHeight;
 const clamp=(v,a,b)=>Math.max(a,Math.min(v,Math.max(a,b)));
 const left=mobile?(box.width-width)/2:summary.dataset.side==='left'?target.left-box.left-width-20:target.right-box.left+20;
 const top=mobile?box.height-height-8:target.top-box.top+target.height*.45-height*.38;
 Object.assign(summary.style,{left:clamp(left,10,box.width-width-10)+'px',right:'auto',top:clamp(top,6,box.height-height-6)+'px',margin:'0'});
 summary.style.transformOrigin=mobile?'50% 0':summary.dataset.side==='left'?'100% 35%':'0 35%';
 if(tether){const panel=summary.getBoundingClientRect(),leftSide=summary.dataset.side==='left',a={x:(mobile?target.left+target.width/2:leftSide?target.left:target.right)-box.left,y:(mobile?target.bottom:target.top+target.height/2)-box.top},b={x:(mobile?panel.left+panel.width/2:leftSide?panel.right:panel.left)-box.left,y:(mobile?panel.top:Math.max(panel.top+35,Math.min(target.top+target.height/2,panel.bottom-35)))-box.top};tether.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);tether.querySelector('path').setAttribute('d',`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y} ${b.x} ${b.y}`);}
}
function schedule(){if(!frame)frame=requestAnimationFrame(placeEducation);}
if(education&&summary){new MutationObserver(schedule).observe(summary,{attributes:true,subtree:true,attributeFilter:['hidden','data-side','data-row']});const resize=new ResizeObserver(schedule);resize.observe(education);resize.observe(summary);window.addEventListener('nourishland:route',schedule);}

// The original portraits and their hover/tap key-idea reveals remain intact.
const story=document.querySelector('#food-forest-story');
if(story){
 story.querySelector('h1').textContent='A food forest story.';
 story.querySelector('.lead').textContent='Meet five approaches to observing, designing and growing with nature.';
 for(const chapter of story.querySelectorAll('.story-chapter')){
  for(const br of chapter.querySelectorAll('h2 br'))br.replaceWith(document.createTextNode(' '));
  const identity=document.createElement('p');identity.className='story-identity';identity.textContent=chapter.querySelector('.story-person').textContent;chapter.append(identity);
 }
 const bridge=story.querySelector('.story-bridge');bridge.innerHTML='<nav class="story-next" aria-label="Continue exploring"><a href="/food-forests/guide/">Explore the living guide <span aria-hidden="true">↗</span></a><a href="/platform/">The Nourishland tools <span aria-hidden="true">↗</span></a></nav>';
}

// Preserve the existing interactive guide modules; show one scene at a time.
const guide=document.querySelector('#food-forest-guide');
if(guide){
 guide.querySelector('.ff-opening').innerHTML='<h1 id="foodforest-title" tabindex="-1">See the living system.</h1><p>Explore the plants, people, soil and water—and how they affect each other.</p>';
 const definitions=[['system','Living system','.forest-system'],['layers','Layers','.layers-module'],['decisions','Design','.ff-orientations'],['learning','Learning','.ff-learning'],['people','People','.ff-teachers']];
 const nav=document.createElement('nav');nav.className='guide-scenes-nav';nav.setAttribute('aria-label','Explore the living guide');
 const scenes=document.createElement('div');scenes.className='guide-scenes';
 for(const [key,label,selector]of definitions){
  const scene=guide.querySelector(selector);if(!scene)continue;scene.classList.add('guide-scene');scene.dataset.guideScene=key;scene.hidden=key!=='system';scene.inert=key!=='system';scenes.append(scene);
  const button=document.createElement('button');button.type='button';button.dataset.guideView=key;button.textContent=label;button.setAttribute('aria-pressed',String(key==='system'));nav.append(button);
 }
 for(const node of [...guide.children])if(!node.classList.contains('ff-opening'))node.hidden=true;
 guide.append(scenes,nav);
 for(const button of guide.querySelectorAll('[data-learning-step]')){button.textContent=Number(button.dataset.learningStep)<0?'←':'→';button.title=button.getAttribute('aria-label');}
 const layerImage=scenes.querySelector('.layers-figure img');if(layerImage)layerImage.src='/site/art/food-forest-layers-09784.webp';
 function prepareImages(scene){for(const image of scene.querySelectorAll('img')){image.loading='eager';image.decoding='async';image.dataset.retainedArt='pending';image.decode().then(()=>{image.dataset.retainedArt='ready';fitArt();}).catch(()=>{image.dataset.retainedArt='ready';});}}
 const system=scenes.querySelector('[data-guide-scene=system]'),art=system?.querySelector('.forest-system-art'),image=art?.querySelector('img');
 function fitArt(){if(!art||system.hidden||!image.naturalWidth)return;const box=system.getBoundingClientRect(),caption=system.querySelector('figcaption')?.getBoundingClientRect().height||90,ratio=image.naturalWidth/image.naturalHeight,width=Math.min(box.width-20,Math.max(80,box.height-caption-30)*ratio);Object.assign(art.style,{flex:'none',width:width+'px',height:width/ratio+'px'});}
 if(image){image.addEventListener('load',fitArt);new ResizeObserver(fitArt).observe(scenes);window.addEventListener('nourishland:route',event=>{if(event.detail.page==='food-forest-guide')prepareImages(scenes.querySelector('.guide-scene:not([hidden])'));requestAnimationFrame(fitArt);});}
 nav.addEventListener('click',event=>{const button=event.target.closest('[data-guide-view]');if(!button)return;for(const scene of scenes.children){scene.hidden=scene.dataset.guideScene!==button.dataset.guideView;scene.inert=scene.hidden;if(!scene.hidden)prepareImages(scene);}for(const item of nav.children)item.setAttribute('aria-pressed',String(item===button));requestAnimationFrame(fitArt);});
}
