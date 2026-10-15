// Shared DOM/XR presentation of actual microphone input, never narration volume.
export function demoVoiceDetectionState(state={}){
 const listening=Boolean(state.listening),processing=Boolean(state.processing),error=Boolean(state.voiceError);
 const level=listening?Math.max(0,Math.min(1,(Number(state.voiceLevel)||0)*12.5)):0;
 const label=error?'Microphone unavailable':processing?'Processing speech':listening?'Microphone active':'Microphone ready';
 return {listening,processing,error,level,label,percent:Math.round(level*100)};
}
export function drawDemoVoiceDetectionBar(ctx,state,{x=420,y=1004,width=560}={}){
 const bar=demoVoiceDetectionState(state);ctx.save();ctx.fillStyle='#16372b';ctx.beginPath();ctx.roundRect(x,y,width,18,6);ctx.fill();ctx.strokeStyle='#b6d5c5';ctx.lineWidth=2;ctx.stroke();
 if(bar.level>0){ctx.fillStyle='#b9f2d3';ctx.beginPath();ctx.roundRect(x+3,y+3,Math.max(2,(width-6)*bar.level),12,3);ctx.fill();}
 if(bar.error){ctx.fillStyle='#e2f2e9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 22px Manrope, sans-serif';ctx.fillText('Microphone unavailable · select the microphone to retry',x+width/2,y+48,width+220);}ctx.restore();return bar;
}
export function mountDemoVoiceDetectionBar(root){
 const box=document.createElement('div'),label=document.createElement('span'),meter=document.createElement('div'),fill=document.createElement('div');
 box.dataset.voiceDetection='';box.style.cssText='display:grid;gap:8px;padding:12px;border:1px solid #88ac99;border-radius:8px';label.setAttribute('role','status');label.setAttribute('aria-live','polite');meter.setAttribute('role','meter');meter.setAttribute('aria-label','Microphone input level');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.style.cssText='height:12px;border:1px solid #b6d5c5;border-radius:4px;overflow:hidden;background:#16372b';fill.style.cssText='height:100%;width:0;background:#b9f2d3;transition:width 50ms linear';meter.append(fill);box.append(label,meter);root.append(box);
 return {render(state){const bar=demoVoiceDetectionState(state);label.hidden=!bar.error;if(label.textContent!==(bar.error?'Microphone unavailable · select the microphone to retry':''))label.textContent=bar.error?'Microphone unavailable · select the microphone to retry':'';meter.setAttribute('aria-valuenow',String(bar.percent));meter.setAttribute('aria-valuetext',bar.label);fill.style.width=bar.percent+'%';box.dataset.voiceState=bar.error?'error':bar.processing?'processing':bar.listening?'listening':'ready';},destroy(){box.remove();}};
}
