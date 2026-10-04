import {getSpatialVisualSettings,setSpatialVisualSettings,resolveGraphicsQuality} from './spatialVisualSettings.js';
import {prepareArAssets,prepareNearFutureArAssets} from './arAssetPreparation.js';
export function arPreparationControlsMarkup(){
 const choice=getSpatialVisualSettings().graphicsQuality,suggested=resolveGraphicsQuality().toUpperCase().replace('MEDIUM','MED');
 return `<section class="panel ar-preload-controls" data-ar-preload><h2>Prepare your experience</h2>
 <p>Suggested starting graphics: <strong>${suggested}</strong>. Choose HIGH for richer detail, then lower it if movement feels less smooth.</p>
 <label>Graphics <select data-ar-graphics aria-label="Starting graphics quality">${[['auto','Auto · '+suggested],['low','LOW'],['medium','MED'],['high','HIGH']].map(([value,label])=>`<option value="${value}" ${choice===value?'selected':''}>${label}</option>`).join('')}</select></label>
 <p class="meta">Your choice is saved on this device. Rain follows the preset and can be changed in AR Settings.</p>
 <progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1" style="width:100%"></progress>
 <p role="status" data-ar-preload-status>Preparing Nourishland…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></section>`;
}
export function bindArPreparationControls(root,enterButton,{nearFuture=false}={}){
 const section=root?.querySelector('[data-ar-preload]');if(!section || !enterButton)return;
 section.querySelector('[data-ar-graphics]')?.addEventListener('change',event=>{setSpatialVisualSettings({graphicsQuality:event.target.value});begin();});
 const bar=section.querySelector('progress'),status=section.querySelector('[data-ar-preload-status]'),retry=section.querySelector('[data-ar-preload-retry]');
 let preparationToken=0;
 function begin(isRetry=false){
  const token=++preparationToken;
  enterButton.disabled=true;retry.hidden=true;section.setAttribute('aria-busy','true');const start=performance.now();
  prepareArAssets({retry:isRetry,experience:nearFuture?'demo':'creator',onProgress:value=>{if(!section.isConnected || token!==preparationToken)return;bar.max=value.total||1;bar.value=value.loaded;status.textContent=`Preparing Nourishland · ${value.loaded} / ${value.total}`;}}).then(result=>{
   if(!section.isConnected || token!==preparationToken)return;
   const failed=result.failures.some(item=>item.critical);section.setAttribute('aria-busy','false');enterButton.disabled=failed;retry.hidden=!failed;
   status.textContent=failed?'Preparation could not finish. Check your connection and retry.':'Ready to enter. More information loads as you explore.';
   // Local diagnostic evidence only, readable in preparation studies. Never transmitted.
   section.dataset.preparedMs=String(Math.round(performance.now()-start));section.dataset.preparedAssets=String(result.loaded);section.dataset.ready=String(!failed);
   if(!failed && nearFuture)prepareNearFutureArAssets();
  });
 }
 retry.addEventListener('click',()=>begin(true));begin();
}
