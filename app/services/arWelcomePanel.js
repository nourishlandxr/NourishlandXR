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
 glass.addColorStop(0,'rgba(75,126,88,.34)');
 glass.addColorStop(.46,'rgba(33,82,59,.43)');
 glass.addColorStop(1,'rgba(15,49,40,.49)');
 outline(ctx);ctx.fillStyle=glass;ctx.fill();
 ctx.strokeStyle='rgba(231,250,229,.56)';ctx.lineWidth=1.7;ctx.stroke();
 outline(ctx);ctx.clip();
 const light=ctx.createRadialGradient(400,210,18,490,370,670);
 light.addColorStop(0,'rgba(244,255,234,.15)');
 light.addColorStop(.42,'rgba(218,239,209,.035)');
 light.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=light;ctx.fillRect(80,70,1240,990);
 const readingWash=ctx.createRadialGradient(700,555,150,700,555,570);
 readingWash.addColorStop(0,'rgba(5,30,25,.18)');
 readingWash.addColorStop(.7,'rgba(5,30,25,.06)');
 readingWash.addColorStop(1,'rgba(5,30,25,0)');
 ctx.fillStyle=readingWash;ctx.fillRect(160,70,1080,1000);
 ctx.restore();
}
