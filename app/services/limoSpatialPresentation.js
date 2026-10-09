// These exact controls are drawn and hit-tested by the native XR panel.
const cues={question:'?',filter:'FIND',observation:'NOTE',action:'TRY',scenario:'DRAFT',review:'RETURN',navigation:'BACK',connection:'CONNECT'};
export function limoSpatialControls(limo){
 return [{action:'Limo:close',label:'Close LIMO',role:'navigation',x:802,y:16,width:176,height:48},...(limo?.actions || []).map((item,index)=>({...item,action:'Limo:'+item.id,kind:'limo',x:24+(index%2)*486,y:156+Math.floor(index/2)*106,width:462,height:94}))];
}
function wrap(ctx,text,width){
 const words=String(text || '').split(/\s+/),lines=[];let line='';
 for(const word of words){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;}
 if(line)lines.push(line);return lines;
}
export function drawLimoSpatialControls(ctx,card){
 const {limo}=card;
 ctx.fillStyle='rgba(9,24,25,.96)';ctx.beginPath();ctx.roundRect(4,4,992,card.height-8,26);ctx.fill();
 ctx.strokeStyle='rgba(215,231,213,.45)';ctx.lineWidth=2;ctx.stroke();
 ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle='#f4f0df';ctx.font='700 30px system-ui';ctx.fillText('LIMO · '+(limo.cue || 'LEARN'),24,20,740);
 ctx.font='500 21px system-ui';ctx.fillStyle='#c9d8cf';ctx.fillText(limo.scope,24,65,936);ctx.fillText(limo.coverage,24,96,936);
 for(const button of card.controls){
  const aimed=card.hoverAction===button.action&&!button.disabled,accent=button.accent || '#b8ceba';
  ctx.globalAlpha=button.disabled?.4:1;
  ctx.fillStyle=aimed?'#294842':button.primary?'#244638':'#152d2b';ctx.strokeStyle=aimed?'#f4eed9':button.selected?accent:'#566e64';ctx.lineWidth=aimed?4:2;ctx.beginPath();ctx.roundRect(button.x,button.y,button.width,button.height,button.role==='scenario'?5:16);ctx.fill();ctx.stroke();
  if(button.role==='scenario'){ctx.setLineDash([6,5]);ctx.strokeStyle=accent;ctx.stroke();ctx.setLineDash([]);}
  if(button.height<80){ctx.fillStyle='#f4f0df';ctx.font='650 24px system-ui';ctx.fillText(button.label,button.x+12,button.y+12,button.width-24);continue;}
  ctx.fillStyle=accent;ctx.font='750 18px system-ui';ctx.fillText(button.cue || cues[button.role] || 'OPEN',button.x+16,button.y+8,button.width-32);
  ctx.fillStyle='#f4f0df';ctx.font='650 29px system-ui';
  const lines=wrap(ctx,button.label,button.width-32);lines.slice(0,2).forEach((line,index)=>ctx.fillText(line,button.x+16,button.y+31+index*27));
 }
 ctx.globalAlpha=1;
}
export function drawLimoSpatialReading(ctx,card){
 const left=card.railCollapsed?80:190,width=1000-left-30;
 ctx.textBaseline='top';ctx.textAlign='left';ctx.fillStyle='rgba(10,25,23,.92)';ctx.beginPath();ctx.roundRect(left-10,8,width+20,card.height-16,20);ctx.fill();
 ctx.fillStyle=card.accent || '#a9ce8c';ctx.fillRect(left+10,26,4,68);
 ctx.fillStyle='#d2dccd';ctx.font='650 19px system-ui';ctx.fillText('LIMO / '+(cues[card.limo.role] || 'QUESTION'),left+30,25,width-50);
 ctx.font='500 19px system-ui';ctx.fillText(card.limo.project+' · '+card.limo.scope,left+30,53,width-50);
 ctx.fillStyle='#f4f0df';ctx.font='700 38px system-ui';const titles=wrap(ctx,card.title,width-20);titles.slice(0,2).forEach((line,index)=>ctx.fillText(line,left+10,96+index*44,width-20));
 const summaryY=100+Math.min(2,titles.length)*44;ctx.fillStyle='#b9cfbb';ctx.font='500 26px system-ui';const summaries=wrap(ctx,card.limo.summary,width-20);summaries.slice(0,2).forEach((line,index)=>ctx.fillText(line,left+10,summaryY+index*32,width-20));
 ctx.strokeStyle='rgba(208,228,203,.27)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left+10,183);ctx.lineTo(left+width-10,183);ctx.stroke();
 const bottom=Math.min(...card.controls.filter(item=>item.kind==='utility').map(item=>item.y),card.height-70);
 const bodyY=Math.max(207,summaryY+Math.min(2,summaries.length)*32+22);
 ctx.save();ctx.beginPath();ctx.rect(left+10,bodyY,width-20,Math.max(20,bottom-bodyY-12));ctx.clip();
 ctx.font=(card.largeText?'600 36':'500 32')+'px system-ui';ctx.fillStyle='#f4f0df';let y=bodyY;
 for(const line of card.lines){for(const wrapped of wrap(ctx,line,width-20)){ctx.fillText(wrapped,left+10,y);y+=card.largeText?44:40;}}
 ctx.restore();
 ctx.fillStyle='#b8cbbb';ctx.font='500 17px system-ui';ctx.fillText(card.limo.coverage,left+10,card.height-30,width-20);
}
