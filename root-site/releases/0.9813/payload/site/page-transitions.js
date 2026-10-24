let revision=0,active=null;
export function transitionPage(update,from,to,entered=()=>{}){
 const token=++revision,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 document.documentElement.dataset.routeMotion=from==='home'||to==='home'?'landscape':from==='education'?'forward':'back';
 active?.skipTransition?.();active?.cancel?.();
 const finish=()=>{if(token===revision)entered();};
 if(!from||from===to||reduced){update();finish();return;}
 if(document.startViewTransition){active=document.startViewTransition(update);active.finished.catch(()=>{}).then(finish);}
 else{
  const main=document.querySelector('main');active=main?.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.975)'}],{duration:240,easing:'ease-in',fill:'forwards'});
  Promise.resolve(active?.finished).catch(()=>{}).then(()=>{if(token!==revision)return;active?.cancel();update();finish();});
 }
}
