const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const spec=(shape,material,colour,ink,roughness,depth=.009,mount='#9c7945')=>Object.freeze({shape,material,colour,ink,roughness,halfDepth:depth,mount,colourRGB:rgb(colour),mountRGB:rgb(mount)});
export const CRAFTED_TOTEM_SIGNS=Object.freeze({
 basic:spec('turned','timber','#d7b17e','#493721',.51),
 carved:spec('carved','timber','#96603b','#f1d6a8',.54,.012),
 botanical:spec('petal','ceramic','#789268','#faf0d9',.57,.009),
 organic:spec('opal','glass','#afc4bc','#244b40',.36,.006,'#9d9679'),
 sun:spec('radiant','ceramic','#d2a161','#5b381c',.48,.010),
 leaf:spec('leaf','ceramic','#59774f','#f3eed6',.61,.008,'#8a7549'),
 rock:spec('slab','stone','#a9afa5','#293c35',.90,.016,'#606962'),
 moon:spec('lunar','ceramic','#d6dcde','#45566a',.41,.009,'#989f9e')
});
export function craftedTotemSignStyle(style='basic'){return CRAFTED_TOTEM_SIGNS[style]||CRAFTED_TOTEM_SIGNS.basic;}
export function craftedSignOutline(side='left',style='basic'){
 if(side==='bracket')return [[-1,-1],[1,-1],[1,1],[-1,1]];
 let p;
 if(side==='header'){
  p=[];for(let i=0;i<4;i++)for(let j=0;j<9;j++){
   const a=i*Math.PI/2+j/8*Math.PI/2,cx=Math.cos(i*Math.PI/2+Math.PI/4)*Math.SQRT2*.72,cy=Math.sin(i*Math.PI/2+Math.PI/4)*Math.SQRT2*.58;
   p.push([cx+Math.cos(a)*.28,cy+Math.sin(a)*.42]);
  }return p;
 }
 switch(craftedTotemSignStyle(style).shape){
  case 'carved':p=[[-1,.04],[-.75,-.77],[-.40,-.92],[.72,-.86],[.98,-.62],[1,.64],[.73,.91],[-.42,.84],[-.76,.70]];break;
  case 'petal':p=[[-1,0],[-.72,-.57],[-.28,-.90],[.32,-.96],[.82,-.70],[1,-.34],[1,.34],[.82,.70],[.32,.96],[-.28,.90],[-.72,.57]];break;
  case 'opal':p=[[-1,0],[-.77,-.57],[-.61,-.81],[.69,-.81],[.91,-.65],[1,-.30],[1,.30],[.91,.65],[.69,.81],[-.61,.81],[-.77,.57]];break;
  case 'radiant':p=[[-1,0],[-.75,-.55],[-.70,-.82],[-.33,-.94],[.72,-.94],[1,-.57],[1,.57],[.72,.94],[-.33,.94],[-.70,.82],[-.75,.55]];break;
  case 'leaf':p=[[-1,0],[-.68,-.44],[-.34,-.76],[.15,-.94],[.59,-.79],[.88,-.44],[1,-.16],[1,.17],[.83,.52],[.47,.84],[.02,.91],[-.45,.61],[-.75,.31]];break;
  case 'slab':p=[[-1,.02],[-.78,-.72],[-.54,-.88],[.67,-1],[1,-.65],[.96,.63],[.64,.96],[-.55,.86],[-.78,.58]];break;
  case 'lunar':p=[[-1,-.04],[-.73,-.57],[-.43,-.79],[.22,-.84],[.75,-.72],[.98,-.41],[1,.22],[.81,.64],[.38,.88],[-.21,.94],[-.65,.65]];break;
  default:p=[[-1,0],[-.82,-.88],[.93,-.88],[1,-.68],[1,.68],[.93,.88],[-.82,.88]];
 }
 return side==='right'?p.map(([x,y])=>[-x,y]).reverse():p;
}

// Foreground only: the real board supplies its own material and shading.
export function paintCraftedTotemSign(ctx,card,{width=1024,height=256}={}){
 const style=card.signStyle||'basic',profile=craftedTotemSignStyle(style),side=card.boardSide||'header',outline=craftedSignOutline(card.timberHeader?'header':side,style);
 ctx.save();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.beginPath();
 outline.forEach(([x,y],i)=>{const px=width*(.5+x*.475),py=height*(.5-y*.475);if(i)ctx.lineTo(px,py);else ctx.moveTo(px,py);});ctx.closePath();ctx.clip();
 ctx.globalAlpha=.25;ctx.strokeStyle=profile.ink;ctx.lineWidth=1.5;
 if(style==='leaf'||style==='botanical'){
  for(const side of [-1,1])for(let i=0;i<7;i++){const x=width*(.16+i*.10);ctx.beginPath();ctx.moveTo(x,height*.5);ctx.quadraticCurveTo(x+width*.04,height*(.5+side*.16),x+width*.08,height*(.5+side*.30));ctx.stroke();}
 }else if(style==='sun'){
  for(let i=0;i<10;i++){const x=width*(.20+i*.065);ctx.beginPath();ctx.moveTo(x,16);ctx.lineTo(x+8,34);ctx.moveTo(x,height-16);ctx.lineTo(x+8,height-34);ctx.stroke();}
 }else if(style==='moon'){
  for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(width*(.26+i*.13),height*.15,2.7,0,Math.PI*2);ctx.stroke();}
 }else if(style==='rock'){
  ctx.beginPath();ctx.moveTo(90,height*.68);ctx.lineTo(width*.3,height*.76);ctx.lineTo(width*.45,height*.65);ctx.lineTo(width*.71,height*.82);ctx.stroke();
 }
 ctx.globalAlpha=1;ctx.shadowColor=profile.material==='stone'?'rgba(255,255,240,.45)':'rgba(255,248,226,.30)';ctx.shadowOffsetY=1;
 ctx.fillStyle=profile.ink;ctx.textAlign='center';ctx.textBaseline='middle';
 const title=String(card.title||'').replace(/^[←→]\s*|\s*[←→]$/g,'');
 const directional=card.directional&&side!=='header';
 const face='Manrope, "Segoe UI", system-ui, sans-serif';let size=card.timberHeader?86:82;
 ctx.font=`650 ${size}px ${face}`;while(size>36&&ctx.measureText(title).width>width*(directional?.67:.84)){size-=2;ctx.font=`650 ${size}px ${face}`;}
 ctx.fillText(title,width*.5,height*.5);
 if(directional){ctx.font=`500 76px ${face}`;ctx.fillText(side==='left'?'←':'→',width*(side==='left'?.12:.88),height*.50);}
 ctx.restore();
}
