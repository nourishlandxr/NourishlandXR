// One shared silhouette for the AR welcome surface.
export const WELCOME_SHAPE = Object.freeze({cx:700,cy:550,radius:520,sides:16});
export function welcomeBoundary(angle) {
 const {cx,cy,radius}=WELCOME_SHAPE;
 return {x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle)};
}
export const WELCOME_SHAPE_POINTS=Object.freeze(Array.from({length:WELCOME_SHAPE.sides},(_,i)=>Object.freeze(welcomeBoundary(-Math.PI/2+i*Math.PI*2/WELCOME_SHAPE.sides))));
function outline(ctx) {
 ctx.beginPath();
 WELCOME_SHAPE_POINTS.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
 ctx.closePath();
}
export function drawArWelcomePanel(ctx) {
 ctx.save();
 const glass=ctx.createLinearGradient(190,110,1210,990);
 glass.addColorStop(0,'rgba(15,29,34,.35)');
 glass.addColorStop(.46,'rgba(9,23,29,.45)');
 glass.addColorStop(1,'rgba(6,17,23,.40)');
 outline(ctx);ctx.fillStyle=glass;ctx.fill();
 ctx.strokeStyle='rgba(222,242,239,.62)';ctx.lineWidth=1.8;ctx.stroke();
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
