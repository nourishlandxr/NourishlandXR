// Use portraits prepared from the real XR sculptures outside the visitor's UI.
// Creating a WebGL renderer during a selection blocked the transition's frames.
import {TOTEM_PORTRAITS} from './totem-portrait-data.mjs';
const decoded=new Map();
function prepare(portrait){
 if(!decoded.has(portrait.src)){
  const image=new Image();image.src=portrait.src;
  const ready=image.decode().catch(error=>{decoded.delete(portrait.src);throw error;});decoded.set(portrait.src,ready);
 }
 return decoded.get(portrait.src);
}
export function warmPortraits(){for(const portrait of Object.values(TOTEM_PORTRAITS))prepare(portrait).catch(()=>{});}
export async function craftPortrait(actor,style='basic'){
 const sculpture=actor?.querySelector('.journey-sculpture');if(!sculpture)return;
 const portrait=Object.values(TOTEM_PORTRAITS).find(p=>p.style===style);if(!portrait)return;
 const request=Symbol();actor.portraitRequest=request;
 try{
  await prepare(portrait);if(actor.portraitRequest!==request)return;
  const image=sculpture.querySelector('img');image.src=portrait.src;image.alt=portrait.label+' Totem';
  sculpture.dataset.groundX=portrait.groundX;sculpture.dataset.groundY=portrait.groundY;
  for(const [i,button]of [...sculpture.querySelectorAll('.journey-sign')].entries()){
   const target=portrait.targets[String(i)];if(!target)continue;button.setAttribute('aria-label',button.textContent);
   Object.assign(button.style,{left:target.left+'%',top:target.top+'%',width:target.width+'%',height:target.height+'%'});
  }
  sculpture.dataset.crafted='true';actor.dataset.portraitStyle=style;
 }catch{actor.dataset.portraitStyle='fallback';}
}
