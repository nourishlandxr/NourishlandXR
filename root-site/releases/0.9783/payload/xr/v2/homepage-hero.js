const host=document.querySelector('[data-biome-hero]');

if(host){
  const lifetime=new AbortController(),{signal}=lifetime;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),portrait=matchMedia('(max-aspect-ratio:1/1)');
  const base=new URL('./assets/hero-clean-hq/',import.meta.url);
  let variant=portrait.matches?'phone':'desktop',video=null,ready=false,destroyed=false;
  let userPaused=false,menuOpen=false,routeHome=!location.hash||location.hash==='#home';
  let generation=0,frame=0,previous=0,drag=null,turn=0,targetTurn=0,peek=0,targetPeek=0;
  const posterFor=()=>new URL(`${variant}-mp4-poster.webp?v=inner-rock-02`,base).href;
  host.dataset.biomeReady='poster';host.dataset.heroRepresentation='high-quality-video';
  host.innerHTML=`<div class="nl-video-scene" tabindex="0" role="group" aria-label="Nourishland landscape. Drag to gently adjust the framing; use arrow keys to move."><div class="nl-video-plane"><img class="nl-video-poster" src="${posterFor()}" alt="Nourishland’s forest, food terraces, wetlands and waterfalls around a closed rock basin." width="${variant==='phone'?1080:2560}" height="${variant==='phone'?1920:1440}" fetchpriority="high"></div></div><p class="sr-only" data-hero-status role="status" aria-live="polite"></p>`;
  const scene=host.querySelector('.nl-video-scene'),plane=host.querySelector('.nl-video-plane'),poster=host.querySelector('img'),status=host.querySelector('[data-hero-status]');
  const onHome=()=>document.body.dataset.page?document.body.dataset.page==='home':routeHome;
  const shouldPlay=()=>!destroyed&&!userPaused&&!menuOpen&&!document.hidden&&onHome()&&!reduced.matches;
  function playback(){if(!video)return;if(shouldPlay())video.play().catch(()=>{});else video.pause();}
  function reveal(){if(destroyed||!video||video.readyState<2||!shouldPlay())return;ready=true;plane.classList.add('is-playing');poster.setAttribute('aria-hidden','true');host.dataset.biomeReady='video';status.textContent='';}
  function source(){ready=false;plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';poster.src=posterFor();poster.width=variant==='phone'?1080:2560;poster.height=variant==='phone'?1920:1440;if(!video)return;
    const time=video.currentTime||0,token=++generation;video.poster=posterFor();video.src=new URL(`${variant}.mp4?v=inner-rock-02`,base).href;
    video.addEventListener('loadedmetadata',()=>{if(token!==generation)return;if(time&&video.duration)video.currentTime=Math.min(time,video.duration-.05);playback();},{once:true,signal});video.load();playback();
  }
  function startVideo(){if(video||!shouldPlay())return;video=document.createElement('video');Object.assign(video,{className:'nl-hero-video',muted:true,defaultMuted:true,autoplay:true,loop:true,playsInline:true,preload:'auto',controls:false});
    for(const attribute of ['muted','autoplay','playsinline','disablepictureinpicture'])video.setAttribute(attribute,'');video.setAttribute('aria-hidden','true');
    video.addEventListener('playing',()=>{if('requestVideoFrameCallback'in video)video.requestVideoFrameCallback(reveal);else reveal();},{signal});
    video.addEventListener('canplay',playback,{signal});
    video.addEventListener('error',()=>{ready=false;plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';status.textContent='The landscape image is available. Video playback could not start.';},{signal});
    plane.append(video);source();
  }
  function render(now){frame=0;if(destroyed||document.hidden||!onHome()){previous=0;return;}const dt=previous?Math.min(.05,(now-previous)/1000):1/60;previous=now;const ease=1-Math.exp(-dt*9);turn+=(targetTurn-turn)*ease;peek+=(targetPeek-peek)*ease;
    plane.style.transform=reduced.matches?'none':`translate3d(${turn*.8}%,${peek*.5}%,0) rotateX(${peek*1.2}deg) rotateY(${-turn*1.2}deg) scale(${1.035-peek*.015})`;
    host.dataset.dragTurn=turn.toFixed(4);host.dataset.scrollProgress=peek.toFixed(4);
    if(Math.abs(turn-targetTurn)>.00005||Math.abs(peek-targetPeek)>.00005)frame=requestAnimationFrame(render);else previous=0;
  }
  function schedule(){if(!frame&&onHome()&&!document.hidden)frame=requestAnimationFrame(render);}
  function resume(){startVideo();playback();schedule();}
  scene.addEventListener('pointerdown',e=>{if(e.button!==0)return;resume();drag={id:e.pointerId,x:e.clientX,y:e.clientY};scene.setPointerCapture(e.pointerId);scene.classList.add('is-dragging');},{signal});
  scene.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;targetTurn=Math.max(-1,Math.min(1,targetTurn+(e.clientX-drag.x)/Math.max(320,innerWidth)*3));targetPeek=Math.max(0,Math.min(1,targetPeek-(e.clientY-drag.y)/Math.max(500,innerHeight)*1.7));drag={id:e.pointerId,x:e.clientX,y:e.clientY};schedule();},{signal});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(event,()=>{drag=null;scene.classList.remove('is-dragging');},{signal});
  scene.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||!onHome())return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);targetPeek=Math.max(0,Math.min(1,targetPeek+Math.max(-160,Math.min(160,delta))*.0018));schedule();},{passive:false,signal});
  scene.addEventListener('keydown',e=>{resume();if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')targetTurn=targetPeek=0;else if(e.key==='ArrowLeft'||e.key==='ArrowRight')targetTurn=Math.max(-1,Math.min(1,targetTurn+(e.key==='ArrowLeft'?-.15:.15)));else targetPeek=Math.max(0,Math.min(1,targetPeek+(e.key==='ArrowUp'?-.12:.12)));schedule();},{signal});
  document.addEventListener('visibilitychange',resume,{signal});
  window.addEventListener('nourishland:route',e=>{routeHome=e.detail.page==='home';resume();},{signal});
  window.addEventListener('nourishland:navigation-state',e=>{menuOpen=Boolean(e.detail.open);resume();},{signal});
  for(const event of ['pageshow','focus'])window.addEventListener(event,resume,{signal});
  document.addEventListener('pointerdown',resume,{signal,passive:true});
  portrait.addEventListener('change',()=>{const next=portrait.matches?'phone':'desktop';if(next!==variant){variant=next;source();}schedule();},{signal});
  reduced.addEventListener('change',()=>{if(reduced.matches){video?.pause();plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';}else if(ready)plane.classList.add('is-playing');resume();},{signal});
  // Request muted inline autoplay immediately; poster decoding must not gate it.
  resume();
  window.nourishlandBiomeHero={get ready(){return host.dataset.biomeReady;},get metrics(){return {representation:'high-quality-video',variant,format:'mp4',width:video?.videoWidth||0,height:video?.videoHeight||0,videoRequested:!!video,fullWorldRequested:false,paused:video?.paused??true,reducedMotion:reduced.matches};},setPaused(paused){userPaused=Boolean(paused);resume();},reset(){targetTurn=targetPeek=0;schedule();},destroy(){destroyed=true;lifetime.abort();cancelAnimationFrame(frame);video?.pause();video?.removeAttribute('src');video?.load();host.replaceChildren();}};
}
