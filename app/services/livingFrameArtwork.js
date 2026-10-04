import {GRAPHICS_PRESETS,currentGraphicsQuality} from './spatialVisualSettings.js';

// HIGH uses one reusable procedural atlas, prepared before entering AR.
// No external artwork download, per-leaf texture, animation loop or bloom.
export const LIVING_LEAF_COLOURS=Object.freeze(['#345638','#426344','#607a43','#839655','#647e46','#96a18b','#7e9281']);
let prepared=null;
function colourMix(hex,target,amount){const a=hex.match(/\w\w/g).map(v=>parseInt(v,16)),b=target.match(/\w\w/g).map(v=>parseInt(v,16));return `rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*amount)).join(',')})`;}
function leafPath(ctx,bend=0){
 ctx.beginPath();ctx.moveTo(0,0);
 ctx.bezierCurveTo(.29,-.40+bend,.76,-.43,1,0);
 ctx.bezierCurveTo(.72,.31-bend,.26,.35,0,0);ctx.closePath();
}
export function createLivingLeafAtlas(makeCanvas=()=>document.createElement('canvas'),pixels=256){
 const columns=4,variants=2,rows=Math.ceil(LIVING_LEAF_COLOURS.length*variants/columns),canvas=makeCanvas();
 canvas.width=columns*pixels;canvas.height=rows*pixels;const ctx=canvas.getContext('2d');
 if(!ctx)return null;
 const tiles=new Map();
 for(const [colourIndex,colour] of LIVING_LEAF_COLOURS.entries())for(let variant=0;variant<variants;variant++){
  const index=colourIndex*variants+variant,x=index%columns*pixels,y=Math.floor(index/columns)*pixels;
  ctx.save();ctx.translate(x+pixels*.09,y+pixels*.53);ctx.scale(pixels*.80,pixels*.80);
  const bend=variant?.045:-.025;
  leafPath(ctx,bend);
  const body=ctx.createLinearGradient(.38,-.42,.50,.35);
  body.addColorStop(0,colourMix(colour,'#c0ce96',.17));body.addColorStop(.38,colourMix(colour,'#d4dfac',.22));
  body.addColorStop(.51,colour);body.addColorStop(.56,colourMix(colour,'#183424',.16));body.addColorStop(1,colourMix(colour,'#10251b',.34));
  ctx.fillStyle=body;ctx.fill();
  ctx.save();leafPath(ctx,bend);ctx.clip();
  // A broad, quiet light falloff gives lamina depth; no hard pale outline.
  const light=ctx.createRadialGradient(.38,-.14,.02,.42,-.04,.46);
  light.addColorStop(0,'rgba(224,232,188,.14)');light.addColorStop(.6,'rgba(183,210,151,.04)');light.addColorStop(1,'rgba(17,42,27,0)');
  ctx.fillStyle=light;ctx.fillRect(0,-.55,1.1,1);
  // Paired secondary veins curve towards the margin instead of straight stripes.
  ctx.lineCap='round';
  for(let n=0;n<7;n++){
   const t=.16+n*.095,reach=Math.sin(t*Math.PI)*.23;
   for(const side of [-1,1]){
    ctx.strokeStyle=side<0?'rgba(223,227,183,.16)':'rgba(17,42,24,.17)';ctx.lineWidth=.0034;
    ctx.beginPath();ctx.moveTo(t,-.012*Math.sin(t*Math.PI));ctx.bezierCurveTo(t+.04,side*reach*.32,t+.09,side*reach*.82,t+.14,side*reach);ctx.stroke();
    ctx.lineWidth=.0017;ctx.strokeStyle='rgba(199,214,171,.10)';ctx.beginPath();ctx.moveTo(t+.05,side*reach*.46);ctx.quadraticCurveTo(t+.08,side*reach*.53,t+.11,side*reach*.63);ctx.stroke();
   }
  }
  const rib=ctx.createLinearGradient(0,-.006,0,.011);rib.addColorStop(0,'rgba(200,211,153,.38)');rib.addColorStop(1,'rgba(21,46,24,.20)');
  ctx.strokeStyle=rib;ctx.lineWidth=.008;ctx.beginPath();ctx.moveTo(.025,0);ctx.quadraticCurveTo(.46,-.022,.96,-.004);ctx.stroke();
  // Subtle cuticle folds follow the blade's form, not random pixel speckles.
  ctx.strokeStyle='rgba(220,226,188,.045)';ctx.lineWidth=.003;
  for(let n=0;n<5;n++){const t=.25+n*.12;ctx.beginPath();ctx.moveTo(t,-.018);ctx.quadraticCurveTo(t+.1,-.12,t+.18,-.19*Math.sin(t*Math.PI));ctx.stroke();}
  ctx.restore();ctx.restore();
  tiles.set(colour+':'+variant,{x,y,pixels});
 }
 return {canvas,tiles,pixels,variants,leafCount:tiles.size,bytes:canvas.width*canvas.height*4};
}
export function prepareLivingFrameArtwork(quality=currentGraphicsQuality()){
 const budget=GRAPHICS_PRESETS[quality];if(!budget?.frameLeafPixels || typeof document==='undefined')return null;
 if(!prepared)prepared=createLivingLeafAtlas(undefined,budget.frameLeafPixels);
 return prepared;
}
export function drawLivingLeafArtwork(ctx,x,y,angle,size,colour){
 if(size<=.01 || typeof ctx.drawImage!=='function')return false;
 const atlas=prepareLivingFrameArtwork('high');if(!atlas)return false;
 const variant=Math.floor(Math.abs(x*.37+y*.19+angle)*11)%atlas.variants,tile=atlas.tiles.get(colour+':'+variant);if(!tile)return false;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 // Match the original blade bounds and origin exactly, including the petiole.
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(atlas.canvas,tile.x,tile.y,tile.pixels,tile.pixels,-size*.1125,-size*.6625,size*1.25,size*1.25);
 ctx.restore();return true;
}
