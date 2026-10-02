// One shared silhouette for the AR welcome surface.
export const WELCOME_SHAPE = Object.freeze({cx:700,cy:550,radius:520,sides:16});
export function welcomeBoundary(angle) {
 const {cx,cy,radius}=WELCOME_SHAPE;
 return {x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle)};
}
export const WELCOME_SHAPE_POINTS=Object.freeze(Array.from({length:WELCOME_SHAPE.sides},(_,i)=>Object.freeze(welcomeBoundary(-Math.PI/2+i*Math.PI*2/WELCOME_SHAPE.sides))));
function outline(ctx) {
 ctx.beginPath();
 ctx.arc(WELCOME_SHAPE.cx,WELCOME_SHAPE.cy,WELCOME_SHAPE.radius,0,Math.PI*2);
 ctx.closePath();
}
export const WELCOME_RIM_MOTION = Object.freeze({revolutionMs:1200000,refreshMs:1000});
export function drawArWelcomePanel(ctx,{elapsed=0,reducedMotion=false}={}) {
 ctx.save();
 const glass=ctx.createLinearGradient(190,110,1210,990);
 glass.addColorStop(0,'rgba(15,29,34,.35)');
 glass.addColorStop(.46,'rgba(9,23,29,.45)');
 glass.addColorStop(1,'rgba(6,17,23,.40)');
 outline(ctx);ctx.fillStyle=glass;ctx.fill();
 // The inner circle stays exact; bark texture lives on the outer rim only.
 ctx.strokeStyle='rgba(139,117,81,.9)';ctx.lineWidth=6;ctx.stroke();
 const {cx,cy,radius}=WELCOME_SHAPE;
 ctx.save();ctx.lineCap='round';
 for(let i=0;i<96;i++){
  const angle=i*Math.PI*2/96+(reducedMotion?0:(elapsed%WELCOME_RIM_MOTION.revolutionMs)/WELCOME_RIM_MOTION.revolutionMs*Math.PI*2),grain=Math.sin(i*127.1+23.7)*43758.5453;
  const noise=grain-Math.floor(grain),r=radius+4+noise*4;
  ctx.strokeStyle=i%3?'rgba(82,72,49,.72)':'rgba(192,163,112,.64)';
  ctx.lineWidth=1.3+noise*2;ctx.beginPath();
  ctx.arc(cx,cy,r,angle,angle+.018+noise*.025);ctx.stroke();
 }
 ctx.restore();
 outline(ctx);ctx.clip();
 const light=ctx.createRadialGradient(400,210,18,490,370,670);
 light.addColorStop(0,'rgba(239,251,246,.14)');
 light.addColorStop(.42,'rgba(216,239,235,.035)');
 light.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=light;ctx.fillRect(80,70,1240,990);
 const readingWash=ctx.createRadialGradient(700,555,150,700,555,570);
 readingWash.addColorStop(0,'rgba(2,10,14,.18)');
 readingWash.addColorStop(.7,'rgba(2,10,14,.05)');
 readingWash.addColorStop(1,'rgba(2,10,14,0)');
 ctx.fillStyle=readingWash;ctx.fillRect(160,70,1080,1000);
 ctx.restore();
}
