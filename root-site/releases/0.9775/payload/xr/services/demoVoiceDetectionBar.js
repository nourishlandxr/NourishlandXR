// Shared DOM/XR presentation of actual microphone input, never narration volume.
export function demoVoiceDetectionState(state={}){
 const listening=Boolean(state.listening),processing=Boolean(state.processing),error=Boolean(state.voiceError);
 const level=listening && !processing && !error?Math.max(0,Math.min(1,(Number(state.voiceLevel)||0)*12.5)):0;
 const label=error?'Microphone unavailable':processing?'Processing speech':listening?'Microphone active':'Microphone ready';
 return {listening,processing,error,level,label,percent:Math.round(level*100)};
}
export function voiceWaveformPoints(state,{count=96,time=0}={}){
 const bar=demoVoiceDetectionState(state),points=[];
 for(let i=0;i<count;i++){
  const position=i/(count-1),edge=Math.sin(position*Math.PI)**.45;
  const wave=Math.sin(position*83-time*.014)*.6+Math.sin(position*149+time*.009)*.28+Math.sin(position*43-time*.007)*.12;
  points.push({x:position,y:wave*bar.level*edge});
 }
 return points;
}
// Logical Living Frame footer: centred on x=700, clear of instruction text.
export function drawDemoVoiceDetectionBar(ctx,state,{x=390,y=972,width=620,height=64,time=globalThis.performance?.now?.() || 0}={}){
 const bar=demoVoiceDetectionState(state),points=voiceWaveformPoints(state,{time});ctx.save();
 const gradient=ctx.createLinearGradient(x,y,x+width,y);gradient.addColorStop(0,'#ff9a32');gradient.addColorStop(.25,'#ffd344');gradient.addColorStop(.52,'#e5e75a');gradient.addColorStop(.77,'#9adc68');gradient.addColorStop(1,'#4cddb0');
 ctx.strokeStyle=gradient;ctx.lineWidth=2.8;ctx.lineCap='round';ctx.lineJoin='round';ctx.globalAlpha*=bar.listening?.98:.48;ctx.beginPath();
 points.forEach((point,i)=>{const px=x+point.x*width,py=y+height/2+point.y*(height/2-5);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.stroke();ctx.restore();
 if(bar.error){ctx.save();ctx.fillStyle='#e2f2e9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 20px Manrope, sans-serif';ctx.fillText('Microphone unavailable · select the microphone to retry',x+width/2,y+height+18,width+160);ctx.restore();}return bar;
}
export function mountDemoVoiceDetectionBar(root){
 const box=document.createElement('div'),label=document.createElement('span'),meter=document.createElement('canvas');meter.width=720;meter.height=90;
 box.dataset.voiceDetection='';box.style.cssText='display:grid;justify-items:center;gap:6px;margin-top:auto;padding:12px 0 0;order:10';label.hidden=true;label.setAttribute('role','status');label.setAttribute('aria-live','polite');meter.setAttribute('role','meter');meter.setAttribute('aria-label','Microphone input level');meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax','100');meter.style.cssText='display:block;width:100%;max-width:620px;height:64px';box.append(meter,label);root.append(box);
 return {render(state){const bar=demoVoiceDetectionState(state);label.hidden=!bar.error;if(label.textContent!==(bar.error?'Microphone unavailable · select the microphone to retry':''))label.textContent=bar.error?'Microphone unavailable · select the microphone to retry':'';meter.setAttribute('aria-valuenow',String(bar.percent));meter.setAttribute('aria-valuetext',bar.label);const ctx=meter.getContext('2d');ctx.clearRect(0,0,720,90);drawDemoVoiceDetectionBar(ctx,{...state,voiceError:null,listening:bar.listening && !bar.error},{x:10,y:10,width:700,height:70});box.dataset.voiceState=bar.error?'error':bar.processing?'processing':bar.listening?'listening':'ready';},destroy(){box.remove();}};
}
