const host=document.querySelector('[data-biome-hero]');

if(host){
  const lifetime=new AbortController(),{signal}=lifetime;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),portrait=matchMedia('(max-aspect-ratio:1/1)');
  const base=new URL('./assets/hero-clean-hq/',import.meta.url);
  let variant=portrait.matches?'phone':'desktop',video=null,ready=false,destroyed=false;
  let userPaused=false,userRequested=false,menuOpen=false,routeHome=!location.hash||location.hash==='#home';
  let generation=0,frame=0,previous=0,drag=null,turn=0,targetTurn=0,peek=0,targetPeek=0;
  const posterFor=()=>new URL(`${variant}-mp4-poster.webp?v=inner-rock-02`,base).href;
  const icon=paused=>paused?'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>':'<path d="M9 5v14M15 5v14"/>';
  host.dataset.biomeReady='poster';host.dataset.heroRepresentation='high-quality-video';
  host.innerHTML=`<div class="nl-video-scene" tabindex="0" role="group" aria-label="Nourishland landscape. Drag to gently adjust the framing; use arrow keys or Home to reset."><div class="nl-video-plane"><img class="nl-video-poster" src="${posterFor()}" alt="Nourishland’s forest, food terraces, wetlands and waterfalls around a closed rock basin." width="${variant==='phone'?1080:2560}" height="${variant==='phone'?1920:1440}" fetchpriority="high"></div></div><div class="nl-hero-controls"><button type="button" data-hero-play aria-label="Pause landscape animation" title="Pause landscape animation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"></svg></button><button type="button" data-hero-replay aria-label="Replay landscape animation" title="Replay landscape animation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 7M5 3v5h5"/></svg></button></div><p class="sr-only" data-hero-status role="status" aria-live="polite"></p>`;
  const scene=host.querySelector('.nl-video-scene'),plane=host.querySelector('.nl-video-plane'),poster=host.querySelector('img');
  const playButton=host.querySelector('[data-hero-play]'),status=host.querySelector('[data-hero-status]');
  const onHome=()=>document.body.dataset.page?document.body.dataset.page==='home':routeHome;
  const shouldPlay=()=>!destroyed&&!userPaused&&!menuOpen&&!document.hidden&&onHome()&&(!(reduced.matches||navigator.connection?.saveData)||userRequested);
  function syncButton(){const paused=!video||video.paused;const label=paused?'Play landscape animation':'Pause landscape animation';playButton.setAttribute('aria-label',label);playButton.title=label;playButton.setAttribute('aria-pressed',String(!paused));playButton.querySelector('svg').innerHTML=icon(paused);}
  function playback(){if(!video){syncButton();return;}if(shouldPlay())video.play().catch(()=>{syncButton();});else video.pause();syncButton();}
  function reveal(){if(destroyed||!video||video.readyState<2)return;ready=true;plane.classList.add('is-playing');poster.setAttribute('aria-hidden','true');host.dataset.biomeReady='video';status.textContent='';syncButton();}
  function source(){ready=false;plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';poster.src=posterFor();poster.width=variant==='phone'?1080:2560;poster.height=variant==='phone'?1920:1440;if(!video)return;
    const time=video.currentTime||0,token=++generation;video.poster=posterFor();video.src=new URL(`${variant}.mp4?v=inner-rock-02`,base).href;
    video.addEventListener('loadedmetadata',()=>{if(token!==generation)return;if(time&&video.duration)video.currentTime=Math.min(time,video.duration-.05);playback();},{once:true,signal});video.load();playback();
  }
  function startVideo(){if(video||!shouldPlay())return;video=document.createElement('video');Object.assign(video,{className:'nl-hero-video',muted:true,defaultMuted:true,loop:true,playsInline:true,preload:'auto'});video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('disablepictureinpicture','');video.setAttribute('aria-hidden','true');
    video.addEventListener('playing',()=>{if('requestVideoFrameCallback'in video)video.requestVideoFrameCallback(reveal);else reveal();syncButton();},{signal});
    for(const event of ['pause','play','ended'])video.addEventListener(event,syncButton,{signal});
    video.addEventListener('error',()=>{ready=false;plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';status.textContent='The landscape image is available. Video playback could not start.';syncButton();},{signal});
    plane.append(video);source();
  }
  function render(now){frame=0;if(destroyed||document.hidden||!onHome()){previous=0;return;}const dt=previous?Math.min(.05,(now-previous)/1000):1/60;previous=now;const ease=1-Math.exp(-dt*9);turn+=(targetTurn-turn)*ease;peek+=(targetPeek-peek)*ease;
    // Small framing motion only. Avoid the old 12% enlargement that softened
    // the high-resolution video and unnecessarily cropped the landscape.
    plane.style.transform=reduced.matches?'none':`translate3d(${turn*.8}%,${peek*.5}%,0) rotateX(${peek*1.2}deg) rotateY(${-turn*1.2}deg) scale(${1.035-peek*.015})`;
    host.dataset.dragTurn=turn.toFixed(4);host.dataset.scrollProgress=peek.toFixed(4);
    if(Math.abs(turn-targetTurn)>.00005||Math.abs(peek-targetPeek)>.00005)frame=requestAnimationFrame(render);else previous=0;
  }
  function schedule(){if(!frame&&onHome()&&!document.hidden)frame=requestAnimationFrame(render);}
  scene.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};scene.setPointerCapture(e.pointerId);scene.classList.add('is-dragging');},{signal});
  scene.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;targetTurn=Math.max(-1,Math.min(1,targetTurn+(e.clientX-drag.x)/Math.max(320,innerWidth)*3));targetPeek=Math.max(0,Math.min(1,targetPeek-(e.clientY-drag.y)/Math.max(500,innerHeight)*1.7));drag={id:e.pointerId,x:e.clientX,y:e.clientY};schedule();},{signal});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(event,()=>{drag=null;scene.classList.remove('is-dragging');},{signal});
  scene.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey||!onHome())return;e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);targetPeek=Math.max(0,Math.min(1,targetPeek+Math.max(-160,Math.min(160,delta))*.0018));schedule();},{passive:false,signal});
  scene.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')targetTurn=targetPeek=0;else if(e.key==='ArrowLeft'||e.key==='ArrowRight')targetTurn=Math.max(-1,Math.min(1,targetTurn+(e.key==='ArrowLeft'?-.15:.15)));else targetPeek=Math.max(0,Math.min(1,targetPeek+(e.key==='ArrowUp'?-.12:.12)));schedule();},{signal});
  playButton.onclick=()=>{userRequested=true;userPaused=video?!video.paused:false;startVideo();playback();};
  host.querySelector('[data-hero-replay]').onclick=()=>{userRequested=true;userPaused=false;startVideo();if(video?.readyState>=1)video.currentTime=0;playback();};
  document.addEventListener('visibilitychange',()=>{playback();schedule();},{signal});
  window.addEventListener('nourishland:route',e=>{routeHome=e.detail.page==='home';if(routeHome){startVideo();schedule();}playback();},{signal});
  window.addEventListener('nourishland:navigation-state',e=>{menuOpen=Boolean(e.detail.open);playback();},{signal});
  portrait.addEventListener('change',()=>{const next=portrait.matches?'phone':'desktop';if(next!==variant){variant=next;source();}schedule();},{signal});
  reduced.addEventListener('change',()=>{if(reduced.matches){userRequested=false;video?.pause();plane.classList.remove('is-playing');poster.removeAttribute('aria-hidden');host.dataset.biomeReady='poster';}else{if(ready)plane.classList.add('is-playing');startVideo();playback();}syncButton();schedule();},{signal});
  syncButton();poster.decode().catch(()=>{}).finally(()=>{if(!destroyed)startVideo();});schedule();
  window.nourishlandBiomeHero={get ready(){return host.dataset.biomeReady;},get metrics(){return {representation:'high-quality-video',variant,format:'mp4',width:video?.videoWidth||0,height:video?.videoHeight||0,videoRequested:!!video,fullWorldRequested:false,paused:video?.paused??true,reducedMotion:reduced.matches};},setPaused(paused){userPaused=Boolean(paused);startVideo();playback();},reset(){targetTurn=targetPeek=0;schedule();},destroy(){destroyed=true;lifetime.abort();cancelAnimationFrame(frame);video?.pause();video?.removeAttribute('src');video?.load();host.replaceChildren();}};
}
