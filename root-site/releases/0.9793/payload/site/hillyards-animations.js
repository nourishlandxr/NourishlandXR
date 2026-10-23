// Garden animations are part of the page, rather than optional media players.
export function mountHillyardsAnimations(host,{doc=document,win=window}={}){
 const videos=[...host.querySelectorAll('video')],motion=win.matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController();
 let current=0,visible=true,destroyed=false;
 const active=()=>!destroyed&&visible&&!doc.hidden&&!doc.body.hasAttribute('data-navigation-open')&&doc.body.dataset.page==='hillyards'&&!host.closest('[hidden]')&&!motion.matches;
 function load(video){if(!video.getAttribute('src')){video.muted=true;video.defaultMuted=true;video.src=video.dataset.animationSrc;video.load();}}
 function sync(){
  videos.forEach((video,i)=>{if(i!==current||!active())video.pause();});
  if(!active())return;
  const video=videos[current];load(video);video.play().catch(()=>{host.dataset.playback='waiting';});
 }
 function reveal(index){if(index!==current)return;host.dataset.animation=String(index);host.dataset.playback='playing';host.querySelector('figcaption').textContent=videos[index].dataset.label;}
 videos.forEach((video,index)=>{
  video.muted=true;video.defaultMuted=true;video.playsInline=true;video.controls=false;
  video.addEventListener('playing',()=>{if(index===current){reveal(index);load(videos[(index+1)%videos.length]);}},{signal:abort.signal});
  video.addEventListener('ended',()=>{if(index!==current)return;current=(current+1)%videos.length;videos[current].currentTime=0;sync();},{signal:abort.signal});
  video.addEventListener('error',()=>{if(index===current)host.dataset.playback='unavailable';},{signal:abort.signal});
 });
 for(const event of ['nourishland:route','nourishland:navigation-state','pageshow'])win.addEventListener(event,sync,{signal:abort.signal});
 doc.addEventListener('visibilitychange',sync,{signal:abort.signal});doc.addEventListener('pointerdown',sync,{passive:true,signal:abort.signal});
 motion.addEventListener('change',sync,{signal:abort.signal});
 const observer=new win.IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;sync();},{threshold:.05});observer.observe(host);sync();
 return {sync,destroy(){destroyed=true;abort.abort();observer.disconnect();videos.forEach(video=>video.pause());}};
}
if(typeof document!=='undefined'){const host=document.querySelector('[data-hillyards-animations]');if(host)mountHillyardsAnimations(host);}
