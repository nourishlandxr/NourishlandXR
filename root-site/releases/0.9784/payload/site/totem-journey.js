// Artwork is deliberately separate from navigation so new Totem exports can
// replace the current placeholder without changing the interaction model.
export const totemBranches = {
  creator: {label:'Creator', copy:'Choose how you want to build.', items:[
    {id:'studio',label:'Desktop Studio',title:'Build and refine your project.',copy:'Edit plant information, images and discovery paths on a larger screen.',href:'/creator/',action:'Open Creator',status:'Device access and account approval apply'},
    {id:'field',label:'Field Multitool',title:'Record knowledge outside.',copy:'Use your phone to mark plants and record observations in a place.',href:'/field/',action:'Open Field tools',status:'Device capabilities vary'},
    {id:'immersive',label:'Immersive app',title:'Create inside the landscape.',copy:'The native Unity Creator and Explorer experience is in development for supported spatial devices.',status:'In development · Unity'}
  ]},
  explorer: {label:'Explorer',copy:'Choose what you want to discover.',items:[
    {id:'tags',label:'Plant tags',title:'See the knowledge around a plant.',copy:'Explore plant information and its connections to growing conditions, uses and ecological relationships.',href:'/explorer/',action:'Open Explorer',status:'Content depends on the published project'},
    {id:'tours',label:'Guided tours',title:'Follow a discovery path.',copy:'Move between linked plants and places, with observations and questions along the way.',href:'/hillyards/',action:'See the Hillyards prototype',status:'Prototype · not a public tour catalogue'},
    {id:'packages',label:'Learning packages',title:'Explore a topic through a place.',copy:'The planned learning packages will connect activities, plant knowledge and discovery paths.',href:'/immersive-learning/',action:'About immersive learning',status:'Planned · seeking pilot collaborators'}
  ]}
};

import {craftPortrait,warmPortraits} from "./totem-portraits.js?v=0.9784";
export function initTotemJourney(stage) {
  if(!stage)return;
  const artwork='/site/art/platform-totem-menu-640.webp';
  const sign=(label,attrs,index)=>`<button type="button" class="journey-sign journey-sign-${index}" ${attrs}><span>${label}</span></button>`;
  const sculpture=(label,buttons)=>`<div class="journey-sculpture"><img src="${artwork}" alt="" width="640" height="960"><span class="journey-plaque">${label}</span><nav aria-label="${label} choices">${buttons}</nav></div>`;
  stage.dataset.journey='overview';stage.dataset.detail='false';stage.dataset.motion='idle';
  stage.innerHTML=`<nav class="journey-breadcrumb" aria-label="Platform location"><button type="button" data-journey-home>Platform</button><button type="button" data-journey-parent hidden></button><span data-journey-trail hidden></span></nav>
    <svg class="journey-connection" aria-hidden="true"><path data-ground-link="branch"/><path class="journey-ground-flow" data-ground-flow/><g class="journey-ground-seeds"><circle r="2.5"/><circle r="2"/><circle r="2.5"/></g></svg>
    <svg class="journey-balloon-tether" aria-hidden="true"><path/></svg>
    <figure class="journey-actor journey-parent">${sculpture('Platform',sign('Creator','data-journey-branch="creator" aria-expanded="false"',0)+sign('Explorer','data-journey-branch="explorer" aria-expanded="false"',1)+sign('Demos','data-journey-demos',2))}<figcaption data-parent-caption></figcaption></figure>
    <section class="journey-actor journey-child" hidden aria-label="Selected platform branch"><h2 class="sr-only" tabindex="-1" data-branch-heading></h2><figure>${sculpture('','')}<figcaption data-child-caption></figcaption></figure></section>
    <section class="journey-detail journey-info-balloon living-balloon" hidden aria-labelledby="journey-detail-title"><button class="journey-close balloon-close" type="button" data-detail-close aria-label="Close selected tool">×</button><p class="eyebrow" data-detail-label></p><h3 id="journey-detail-title" tabindex="-1"></h3><p data-detail-copy></p><p class="journey-availability" data-detail-status></p><a data-detail-link></a></section>
    <p class="sr-only" role="status" data-journey-status></p>`;
  const parent=stage.querySelector('.journey-parent'),child=stage.querySelector('.journey-child'),detail=stage.querySelector('.journey-detail');
  const actors=[parent,child],reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const animations=new Map();let branch=null,selected=null,revision=0,branchRevision=0,frame=0,until=0,positions=[],balloonAnimation=null,lastFrame=0,measured={width:0,height:0};
  function positionBalloon(){
    const tether=stage.querySelector('.journey-balloon-tether');
    if(!selected||detail.hidden){tether.querySelector('path').setAttribute('d','');return;}
    const sign=child.querySelector(`[data-journey-item="${selected}"]`);if(!sign)return;
    const box=stage.getBoundingClientRect(),target=sign.getBoundingClientRect(),mobile=box.width<700;
    if(!box.width||!box.height)return;
    detail.style.maxHeight=Math.max(110,Math.min(mobile?310:420,box.height-110))+'px';
    const width=detail.offsetWidth,height=detail.offsetHeight,leftSide=sign.classList.contains('journey-sign-0')||sign.classList.contains('journey-sign-2');
    const clamp=(v,min,max)=>Math.max(min,Math.min(v,Math.max(min,max)));
    const x=clamp(mobile?(box.width-width)/2:leftSide?target.left-box.left-width-22:target.right-box.left+22,12,box.width-width-12);
    const y=clamp(mobile?target.bottom-box.top+20:target.top-box.top+target.height/2-height*.4,50,box.height-height-55);
    detail.style.left=x+'px';detail.style.top=y+'px';
    detail.dataset.side=mobile?'bottom':leftSide?'left':'right';
    detail.style.transformOrigin=mobile?'50% 0':leftSide?'100% 40%':'0 40%';
    const a={x:target.left-box.left+target.width*(mobile?.5:leftSide?0:1),y:target.top-box.top+target.height*(mobile?1:.5)};
    const b={x:mobile?clamp(a.x,x+20,x+width-20):leftSide?x+width:x,y:mobile?y:clamp(a.y,y+24,y+height-24)};
    tether.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    tether.querySelector('path').setAttribute('d',`M${a.x} ${a.y} Q${(a.x+b.x)/2} ${a.y} ${b.x} ${b.y}`);
  }
  function groundLinks(now=performance.now()){
    frame=0;const box=stage.getBoundingClientRect();if(!box.width||!box.height)return;
    const visible=!document.hidden&&document.body.dataset.page==='platform';
    const alive=!!branch&&visible&&!reduced.matches;stage.dataset.connectorAlive=String(alive);
    const base=node=>{const s=node.querySelector('.journey-sculpture'),r=s.getBoundingClientRect();return{x:r.left+r.width*Number(s.dataset.groundX||.505)-box.left,y:r.top+r.height*Number(s.dataset.groundY||.955)-box.top}};
    const svg=stage.querySelector('.journey-connection');svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    const path=stage.querySelector('[data-ground-link=branch]'),flow=stage.querySelector('[data-ground-flow]'),seeds=stage.querySelector('.journey-ground-seeds');
    if(!child.hidden){
      const p=base(parent),q=base(child),bend=Math.min(32,Math.abs(q.x-p.x)*.1),wave=alive?Math.sin(now*.0012)*3:0;
      const d=`M${p.x} ${p.y} C${p.x+(q.x-p.x)*.35} ${p.y+bend+wave} ${q.x-(q.x-p.x)*.35} ${q.y+bend-wave} ${q.x} ${q.y}`;
      path.setAttribute('d',d);flow.setAttribute('d',d);seeds.style.display=alive?'':'none';
      if(alive){const length=path.getTotalLength();[...seeds.children].forEach((seed,i)=>{const progress=(now*.000065+i/3)%1,point=path.getPointAtLength(progress*length);seed.setAttribute('cx',point.x);seed.setAttribute('cy',point.y);seed.style.opacity=String(Math.sin(progress*Math.PI)*.8);});}
    }else {path.setAttribute('d','');flow.setAttribute('d','');seeds.style.display='none';}
    positionBalloon();
    // Continuous living motion at ~30 fps; no idle loop off-route or in a hidden tab.
    if((alive||now<until)&&visible)frame=requestAnimationFrame(t=>{if(t-lastFrame<30){frame=requestAnimationFrame(groundLinks);return;}lastFrame=t;groundLinks(t);});
  }
  function track(){until=performance.now()+1150;if(!frame)frame=requestAnimationFrame(groundLinks);}
  function metrics(){
    const r=stage.getBoundingClientRect(),mobile=r.width<700;
    measured={width:r.width,height:r.height};
    // Reserve space above for breadcrumbs and below for captions / demo link.
    const size=Math.max(80,Math.min(420,r.width*(mobile?.88:.38),(r.height-100)/1.5));
    stage.style.setProperty('--totem-size',size+'px');
    const floor=r.height-28,height=size*1.5;
    const pose=(x,scale,depth=0)=>({x:x-size/2,y:floor-depth-height,scale,opacity:1});
    let next;
    if(!branch)next=[pose(r.width*.5,1),pose(r.width*.52,.18,50)];
    else next=[pose(r.width*(mobile?.18:.2),.28,Math.min(85,r.height*.15)),pose(r.width*(mobile?.64:.6),mobile?.86:.94)];
    return next;
  }
  const transform=p=>`translate3d(${p.x}px,${p.y}px,0) scale(${p.scale})`;
  function layout({animate=true,focus=null}={}){
    const token=++revision,next=metrics(),duration=reduced.matches||!animate?0:960;
    // Sample before cancelling: rapid clicks continue from the visible frame.
    const from=actors.map(node=>({transform:getComputedStyle(node).transform,opacity:getComputedStyle(node).opacity,hidden:node.hidden}));
    for(const animation of animations.values())animation.cancel();animations.clear();
    stage.dataset.motion=duration?'moving':'idle';
    const active=[true,!!branch];const promises=[];
    actors.forEach((node,i)=>{
      const end=next[i],wasHidden=from[i].hidden;node.inert=!active[i];node.setAttribute('aria-hidden',String(!active[i]));
      if(wasHidden&&!active[i]){node.style.transform=transform(end);node.style.opacity='0';return;}
      node.hidden=false;node.style.transform=transform(end);node.style.opacity=active[i]?'1':'0';
      const start=wasHidden?transform(positions[i]||{...end,scale:.16}):from[i].transform;
      if(duration){const animation=node.animate([{transform:start,opacity:wasHidden?0:Number(from[i].opacity)},{transform:transform(end),opacity:active[i]?1:0}],{duration,easing:'cubic-bezier(.22,.75,.2,1)',fill:'none'});animations.set(node,animation);promises.push(animation.finished.catch(()=>{}));}
      else node.hidden=!active[i];
    });
    positions=next;track();
    Promise.all(promises).then(()=>{if(token!==revision)return;actors.forEach((node,i)=>node.hidden=!active[i]);stage.dataset.motion='idle';groundLinks();focus?.focus({preventScroll:true});});
  }
  function updateNavigation(){
    const crumb=stage.querySelector('[data-journey-parent]');crumb.hidden=!branch;crumb.textContent=branch?' / '+totemBranches[branch].label:'';
    const trail=stage.querySelector('[data-journey-trail]');trail.hidden=!selected;trail.textContent=selected?' / '+totemBranches[branch].items.find(i=>i.id===selected).label:'';
    stage.dataset.journey=branch||'overview';stage.dataset.detail=String(!!selected);
    for(const sign of parent.querySelectorAll('[data-journey-branch]'))sign.setAttribute('aria-expanded',String(sign.dataset.journeyBranch===branch));
    for(const sign of child.querySelectorAll('[data-journey-item]'))sign.setAttribute('aria-expanded',String(sign.dataset.journeyItem===selected));
  }
  function closeDetail(restore=false){
    const old=selected;selected=null;balloonAnimation?.cancel();detail.hidden=true;updateNavigation();positionBalloon();
    if(restore)child.querySelector(`[data-journey-item="${old}"]`)?.focus({preventScroll:true});
  }
  function home(restore=false){
    branchRevision++;
    const old=branch;branch=null;selected=null;detail.hidden=true;updateNavigation();
    stage.querySelector('[data-parent-caption]').textContent='';
    layout({focus:restore?parent.querySelector(`[data-journey-branch="${old}"]`):null});
    stage.querySelector('[data-journey-status]').textContent='Platform overview';
  }
  async function openBranch(key){
    const data=totemBranches[key];if(!data)return;
    const request=++branchRevision;
    branch=key;selected=null;detail.hidden=true;
    child.querySelector('.journey-plaque').textContent=data.label;
    child.querySelector('[data-branch-heading]').textContent=data.label;
    child.querySelector('nav').setAttribute('aria-label',data.label+' choices');
    child.querySelector('nav').innerHTML=data.items.map((item,i)=>sign(item.label,`data-journey-item="${item.id}" aria-expanded="false" aria-controls="journey-detail-title"`,i)).join('');
    delete child.querySelector('.journey-sculpture').dataset.crafted;
    await craftPortrait(child,key==='creator'?'botanical':'organic');
    if(request!==branchRevision||branch!==key)return;
    child.querySelector('[data-child-caption]').textContent='';
    stage.querySelector('[data-parent-caption]').textContent='';
    updateNavigation();layout({focus:child.querySelector('[data-branch-heading]')});
    stage.querySelector('[data-journey-status]').textContent=data.label+' connected to Platform';
  }
  function openItem(id){
    const item=totemBranches[branch]?.items.find(item=>item.id===id);if(!item)return;
    selected=id;balloonAnimation?.cancel();
    detail.dataset.tone=id==='field'?'earth':branch==='creator'?'leaf':'water';
    detail.querySelector('[data-detail-label]').textContent=item.label;detail.querySelector('h3').textContent=item.title;
    detail.querySelector('[data-detail-copy]').textContent=item.copy;detail.querySelector('[data-detail-status]').textContent=item.status;
    const link=detail.querySelector('[data-detail-link]');link.hidden=!item.href;if(item.href){link.href=item.href;link.textContent=item.action+' ↗';}else link.removeAttribute('href');
    detail.querySelector('[data-open-showcase]')?.remove();
    detail.hidden=false;updateNavigation();positionBalloon();track();
    if(!reduced.matches)balloonAnimation=detail.animate([{opacity:0,transform:'scale(.35) translateY(18px) rotate(-5deg)',filter:'blur(4px)'},{opacity:1,transform:'scale(1.025) rotate(.5deg)',filter:'blur(0)',offset:.78},{opacity:1,transform:'none',filter:'none'}],{duration:650,easing:'cubic-bezier(.2,.75,.2,1)'});
    detail.querySelector('h3').focus({preventScroll:true});
  }
  stage.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-journey-home'))return home(true);
    if(button.hasAttribute('data-journey-parent'))return closeDetail(true);
    if(button.hasAttribute('data-journey-demos'))return location.assign('/demos/');
    if(button.dataset.journeyBranch)return openBranch(button.dataset.journeyBranch);
    if(button.hasAttribute('data-detail-close'))return closeDetail(true);
    if(button.dataset.journeyItem&&branch)return selected===button.dataset.journeyItem?closeDetail(true):openItem(button.dataset.journeyItem);
  });
  // Aim at the small ancestor to return, while its visible labels remain intact.
  parent.addEventListener('click',event=>{if(branch&&!event.target.closest('button'))home(true);});
  stage.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(selected)closeDetail(true);else home(true);}});
  new ResizeObserver(()=>{
    const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;
    if(Math.abs(r.width-measured.width)<.5&&Math.abs(r.height-measured.height)<.5)return;
    layout({animate:stage.dataset.motion==='moving'});
  }).observe(stage);
  reduced.addEventListener('change',()=>layout({animate:false}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;stage.dataset.connectorAlive='false';}else track();});
  window.addEventListener('nourishland:route',event=>{if(event.detail.page!=='platform'){home();for(const animation of animations.values())animation.finish();}else {warmPortraits();craftPortrait(parent,'basic').then(track);}});
  if(document.body.dataset.page==='platform'){warmPortraits();craftPortrait(parent,'basic').then(track);}
  updateNavigation();layout({animate:false});
  return {home,openBranch,openItem,get moving(){return stage.dataset.motion==='moving';}};
}
initTotemJourney(document.querySelector('[data-totem-journey]'));
