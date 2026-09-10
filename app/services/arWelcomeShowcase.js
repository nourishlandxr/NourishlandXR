// Painted into the existing AR welcome texture, and its simulated preview.
export const AR_WELCOME_SHOWCASE_DURATION = 36000;
export const AR_WELCOME_CLUSTERS = [
 {hue:105,points:[[330,300],[235,180],[140,60]],labels:['Climate','Tropical','Mango'],later:['Climate','Subtropical','Citrus']},
 {hue:42,points:[[1070,300],[1165,180],[1260,60]],labels:['Food forest','Layers','Canopy'],later:['Food forest','Uses','Habitat']},
 {hue:165,points:[[330,760],[235,880],[140,1000]],labels:['Landscape','Food forest','Backyard'],later:['Landscape','Native forest','Orchard']},
 {hue:85,points:[[1070,760],[1165,880],[1260,1000]],labels:['Live Notes','Plant guild','Technique'],later:['Live Notes','Local insights','Observation']}
];
const ease = (time,delay,duration) => {const t=Math.min(1,Math.max(0,(time-delay)/duration));return t*t*(3-2*t);};
export function drawArWelcomeShowcase(ctx, elapsed, reducedMotion=false) {
 const time=reducedMotion?AR_WELCOME_SHOWCASE_DURATION:Math.min(elapsed,AR_WELCOME_SHOWCASE_DURATION);
 ctx.clearRect(0,0,1400,1080);ctx.save();
 ctx.globalAlpha=ease(time,0,5500);
 ctx.fillStyle='rgba(238,242,224,.94)';ctx.strokeStyle='rgba(151,176,143,.9)';ctx.lineWidth=3;
 ctx.beginPath();ctx.roundRect(350,345,700,390,28);ctx.fill();ctx.stroke();
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#355443';
 ctx.globalAlpha=ease(time,700,6000);ctx.font='24px system-ui';ctx.fillText('A LIVING WORLD OF KNOWLEDGE',700,412);
 ctx.font='58px Georgia,serif';ctx.fillText('NourishlandXR',700,500);
 ctx.font='28px system-ui';ctx.fillText('Explore the wonders of plants and ecosystems',700,577);
 ctx.fillText('in an immersive, interactive way.',700,622);
 ctx.font='21px system-ui';ctx.fillText('Continue to begin the guided demo',700,690);
 AR_WELCOME_CLUSTERS.forEach((cluster,c)=>{
  cluster.points.forEach(([x,y],i)=>{
   const opacity=ease(time,6500+c*800+i*2800,4200);if(!opacity)return;
   ctx.globalAlpha=opacity;
   const [px,py]=i?cluster.points[i-1]:[c%2?1050:350,c<2?345:735];
   ctx.strokeStyle='#94ad89';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(x,y);ctx.stroke();
   ctx.fillStyle=`hsl(${cluster.hue} 28% ${i?86:78}%)`;ctx.beginPath();
   for(let k=0;k<6;k++){const a=k*Math.PI/3;const hx=x+72*Math.cos(a),hy=y+62*Math.sin(a);k?ctx.lineTo(hx,hy):ctx.moveTo(hx,hy);}ctx.closePath();ctx.fill();ctx.stroke();
   const swap=ease(time,24000+c*1000,2500);ctx.fillStyle='#304e3c';ctx.font=`${i?'500':'650'} 24px system-ui`;
   const words=(swap>.5?cluster.later[i]:cluster.labels[i]).split(' ');
   ctx.globalAlpha=opacity*(swap>0 && swap<1?Math.abs(swap-.5)*2:1);
   if(words.join(' ').length>10 && words.length>1){ctx.fillText(words[0],x,y-14);ctx.fillText(words.slice(1).join(' '),x,y+14);}else ctx.fillText(words.join(' '),x,y);
  });
 });
 ctx.restore();
}
