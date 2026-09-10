import {drawArWelcomePanel} from './arWelcomePanel.js';
import {drawHexagon} from './plantInformationMeshCanvas.js';
// Painted into the existing AR welcome texture, and its simulated preview.
export const AR_WELCOME_SHOWCASE_DURATION = 36000;
export const AR_WELCOME_CLUSTERS = [
 {hue:105,points:[[330,300],[235,180],[140,60]],labels:['Climate','Tropical','Mango'],later:['Climate','Subtropical','Citrus']},
 {hue:42,points:[[1070,300],[1165,180],[1260,60]],labels:['Food forest','Layers','Canopy'],later:['Food forest','Uses','Habitat']},
 {hue:165,points:[[330,760],[235,880],[140,1000]],labels:['Landscape','Food forest','Backyard'],later:['Landscape','Native forest','Orchard']},
 {hue:85,points:[[1070,760],[1165,880],[1260,1000]],labels:['Live Notes','Plant guild','Technique'],later:['Live Notes','Local insights','Observation']}
];
export function createArWelcomeClusters(random = Math.random) {
 return AR_WELCOME_CLUSTERS.map(cluster=>({...cluster,labels:[...(random()<.5?cluster.labels:cluster.later)]}));
}
export const AR_WELCOME_CELL_INTERVAL = 1500;
const ease = (time,delay,duration) => {const t=Math.min(1,Math.max(0,(time-delay)/duration));return t*t*(3-2*t);};
export function drawArWelcomeShowcase(ctx, elapsed, reducedMotion=false, clusters=AR_WELCOME_CLUSTERS) {
 const time=reducedMotion?AR_WELCOME_SHOWCASE_DURATION:Math.min(elapsed,AR_WELCOME_SHOWCASE_DURATION);
 ctx.clearRect(0,0,1400,1080);ctx.save();ctx.globalAlpha=ease(time,0,4000);
 drawArWelcomePanel(ctx);
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.globalAlpha=ease(time,500,4500);ctx.fillStyle='#dcef95';ctx.font='750 30px system-ui';ctx.fillText('A LIVING WORLD OF KNOWLEDGE',700,412);
 ctx.fillStyle='#fff';ctx.font='760 72px system-ui';ctx.fillText('NourishlandXR',700,500);
 ctx.font='500 32px system-ui';ctx.fillText('Explore the wonders of plants and ecosystems',700,577);
 ctx.fillText('in an immersive, interactive way.',700,622);
 ctx.font='24px system-ui';ctx.fillText('Continue to begin the guided demo',700,690);
 clusters.forEach((cluster,c)=>{
  cluster.points.forEach(([x,y],i)=>{
   // Grow from parent to child, one new cell every 1.5 seconds across the four corners.
   const progress=ease(time,4500+(i*4+c)*AR_WELCOME_CELL_INTERVAL,2000);if(!progress)return;
   const [px,py]=i?cluster.points[i-1]:[c%2?1050:350,c<2?345:735];
   const cx=x+(px-x)*.25*(1-progress),cy=y+(py-y)*.25*(1-progress);
   const radius=72*(.65+.35*progress);
   ctx.globalAlpha=progress;
   const dx=cx-px,dy=cy-py,length=Math.hypot(dx,dy)||1;
   const cut=i?62:0;
   ctx.strokeStyle='rgba(220,239,195,.45)';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(px+dx/length*cut,py+dy/length*cut);ctx.lineTo(cx-dx/length*radius*.86,cy-dy/length*radius*.86);ctx.stroke();
   // Use the actual PIM hexagon primitive. Light glass fill retains the AR scene underneath.
   drawHexagon(ctx,cx,cy,radius,`hsla(${cluster.hue},30%,78%,.12)`,`hsla(${cluster.hue},42%,84%,.72)`,2);
   ctx.fillStyle='rgba(255,255,246,.96)';ctx.font=`${i?'500':'650'} 24px system-ui`;
   ctx.globalAlpha=progress*ease(progress, .3, .7);
   const words=cluster.labels[i].split(' ');
   if(words.join(' ').length>10 && words.length>1){ctx.fillText(words[0],cx,cy-14);ctx.fillText(words.slice(1).join(' '),cx,cy+14);}else ctx.fillText(words.join(' '),cx,cy);
  });
 });
 ctx.restore();
}
