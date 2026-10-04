import {getSpatialVisualSettings,setSpatialVisualSettings,resolveGraphicsQuality} from './spatialVisualSettings.js';
import {prepareArAssets,prepareNearFutureArAssets} from './arAssetPreparation.js';
export function arPreparationControlsMarkup({simpleDesktop=false}={}){
 if(simpleDesktop)return `<section class="panel ar-preload-controls" data-ar-preload><h2>Prepare the introduction</h2><p>Desktop uses a simple 2D demo: information, plant knowledge and learning pathways. Immersive graphics and insects are available in AR.</p><progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1" style="width:100%"></progress><p role="status" data-ar-preload-status>Preparing the introduction…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></section>`;
 const eyeHeight=getSpatialVisualSettings().eyeHeight;
 const choice=getSpatialVisualSettings().graphicsQuality,suggested=resolveGraphicsQuality().toUpperCase().replace('MEDIUM','MED');
 return `<section class="panel ar-preload-controls" data-ar-preload><h2>Prepare your experience</h2>
 <p>Suggested starting graphics: <strong>${suggested}</strong>. Choose HIGH for richer detail, then lower it if movement feels less smooth.</p>
 <label>Graphics <select data-ar-graphics aria-label="Starting graphics quality">${[['auto','Auto · '+suggested],['low','LOW'],['medium','MED'],['high','HIGH']].map(([value,label])=>`<option value="${value}" ${choice===value?'selected':''}>${label}</option>`).join('')}</select></label>
 <p class="meta">Your choice is saved on this device. Rain follows the preset and can be changed in AR Settings.</p>
 <details class="ar-floor-preparation"><summary>Floor and natural scale</summary><p>Totems stand two metres tall in the demo. Your headset supplies the floor when available. Check your headset floor boundary before entering AR.</p>
 <label>Eye height above the floor · fallback only <input type="range" data-ar-eye-height aria-label="Eye height above the floor" min="0.8" max="2.2" step="0.01" value="${eyeHeight}"><output data-ar-eye-value>${eyeHeight.toFixed(2)} m</output></label><p class="meta">Set this for your seated or standing position if floor detection is unavailable. In AR, use Settings → Floor height adjustment if the Totem base still needs correction.</p></details>
 <progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1" style="width:100%"></progress>
 <p role="status" data-ar-preload-status>Preparing Nourishland…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></section>`;
}
export function bindArPreparationControls(root,enterButton,{nearFuture=false,simpleDesktop=false}={}){
 const section=root?.querySelector('[data-ar-preload]');if(!section || !enterButton)return;
 section.querySelector('[data-ar-graphics]')?.addEventListener('change',event=>{setSpatialVisualSettings({graphicsQuality:event.target.value});begin();});
 section.querySelector('[data-ar-eye-height]')?.addEventListener('input',event=>{const eyeHeight=Number(event.target.value);setSpatialVisualSettings({eyeHeight});section.querySelector('[data-ar-eye-value]').textContent=eyeHeight.toFixed(2)+' m';});
 const bar=section.querySelector('progress'),status=section.querySelector('[data-ar-preload-status]'),retry=section.querySelector('[data-ar-preload-retry]');
 let preparationToken=0;
 function begin(isRetry=false){
  const token=++preparationToken;
  enterButton.disabled=true;retry.hidden=true;section.setAttribute('aria-busy','true');const start=performance.now();
  prepareArAssets({retry:isRetry,experience:simpleDesktop?'desktop':nearFuture?'demo':'creator',onProgress:value=>{if(!section.isConnected || token!==preparationToken)return;bar.max=value.total||1;bar.value=value.loaded;status.textContent=`Preparing Nourishland · ${value.loaded} / ${value.total}`;}}).then(result=>{
   if(!section.isConnected || token!==preparationToken)return;
   const failed=result.failures.some(item=>item.critical);section.setAttribute('aria-busy','false');enterButton.disabled=failed;retry.hidden=!failed;
   status.textContent=failed?'Preparation could not finish. Check your connection and retry.':'Ready to enter. More information loads as you explore.';
   // Local diagnostic evidence only, readable in preparation studies. Never transmitted.
   section.dataset.preparedMs=String(Math.round(performance.now()-start));section.dataset.preparedAssets=String(result.loaded);section.dataset.ready=String(!failed);
   if(!failed && nearFuture && !simpleDesktop)prepareNearFutureArAssets();
  });
 }
 retry.addEventListener('click',()=>begin(true));begin();
}
