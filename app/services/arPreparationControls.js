import {prepareArAssets,prepareNearFutureArAssets} from './arAssetPreparation.js';
export function arPreparationControlsMarkup({simpleDesktop=false,rememberPreparation=false,compactSettings=false}={}){
 if(simpleDesktop)return compactSettings?`<div class="ar-preload-controls ar-preload-controls-compact" data-ar-preload><p class="ar-preparation-desktop-note">The desktop introduction uses 2D plant information and learning pathways.</p><progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1"></progress><p role="status" data-ar-preload-status>Preparing the introduction…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></div>`:`<section class="panel ar-preload-controls" data-ar-preload><h2>Getting ready</h2><p class="meta">The desktop introduction uses 2D plant information and learning pathways.</p><progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1"></progress><p role="status" data-ar-preload-status>Preparing the introduction…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></section>`;
 const graphicsLabel='';
 const remember=rememberPreparation?'<label class="ar-preparation-skip-toggle ar-introduction-remember"><input type="checkbox" data-ar-introduction-remember /> <span>Don’t show this preparation next time</span></label>':'';
 if(compactSettings)return `<div class="ar-preload-controls ar-preload-controls-compact" data-ar-preload>
 <div class="ar-preparation-settings-row"><details class="ar-device-support"><summary>Device support</summary><p>Use a compatible Android phone or spatial device. On desktop, we recommend the plain NLXR introduction; the plain desktop introduction needs no camera. iPhone and iPad cannot currently launch this WebXR AR mode.</p><p class="meta">Spatial device examples: XREAL Aura, VITURE Luma Ultra, Meta Quest 3 and Steam Frame. Browser and WebXR support varies; these are examples, not confirmed compatible devices.</p></details>${graphicsLabel}</div>
 ${remember}<progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1"></progress>
 <p role="status" data-ar-preload-status>Preparing Nourishland…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></div>`;
 return `<section class="panel ar-preload-controls" data-ar-preload><h2>Getting ready</h2>
 ${graphicsLabel}
 ${remember}
 <progress data-ar-preload-progress aria-label="Preparing Nourishland" value="0" max="1"></progress>
 <p role="status" data-ar-preload-status>Preparing Nourishland…</p><button type="button" data-ar-preload-retry hidden>Retry preparation</button></section>`;
}
export function bindArPreparationControls(root,enterButton,{nearFuture=false,simpleDesktop=false}={}){
 const section=root?.querySelector('[data-ar-preload]');if(!section || !enterButton)return;
 const bar=section.querySelector('progress'),status=section.querySelector('[data-ar-preload-status]'),retry=section.querySelector('[data-ar-preload-retry]');
 let preparationToken=0;const readyLabel=enterButton.textContent;
 function failedPreparation(){
  section.setAttribute('aria-busy','false');section.dataset.ready='false';enterButton.disabled=true;enterButton.textContent=readyLabel;retry.hidden=false;
  status.textContent='Preparation could not finish. Check your connection and retry.';
 }
 function begin(isRetry=false){
  const token=++preparationToken;
  enterButton.disabled=true;enterButton.textContent='Preparing…';retry.hidden=true;section.setAttribute('aria-busy','true');const start=performance.now();
  prepareArAssets({retry:isRetry,experience:simpleDesktop?'desktop':nearFuture?'demo':'creator',onProgress:value=>{if(!section.isConnected || token!==preparationToken)return;bar.max=value.total||1;bar.value=value.loaded;status.textContent=`Preparing Nourishland · ${value.loaded} / ${value.total}`;}}).then(result=>{
   if(!section.isConnected || token!==preparationToken)return;
   const failed=result.failures.some(item=>item.critical);section.setAttribute('aria-busy','false');enterButton.disabled=failed;enterButton.textContent=readyLabel;retry.hidden=!failed;
   status.textContent=failed?'Preparation could not finish. Check your connection and retry.':simpleDesktop?'Ready to begin.':'Ready to start AR.';
   // Local diagnostic evidence only, readable in preparation studies. Never transmitted.
   section.dataset.preparedMs=String(Math.round(performance.now()-start));section.dataset.preparedAssets=String(result.loaded);section.dataset.ready=String(!failed);
   if(!failed && nearFuture && !simpleDesktop)prepareNearFutureArAssets();
  }).catch(()=>{if(section.isConnected && token===preparationToken)failedPreparation();});
 }
 retry.addEventListener('click',()=>begin(true));begin();
}
