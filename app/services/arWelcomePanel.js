// One shared silhouette for the AR surface and attached LIM roots.
export const WELCOME_SHAPE = Object.freeze({cx:700,cy:550,rx:590,ry:410,sides:64});
export function welcomeBoundary(angle) {
 const {cx,cy,rx,ry}=WELCOME_SHAPE;
 const organic=1+.018*Math.sin(3*angle+.4)+.012*Math.cos(5*angle-.7);
 return {x:cx+rx*organic*Math.cos(angle),y:cy+ry*organic*Math.sin(angle)};
}
export const WELCOME_SHAPE_POINTS=Object.freeze(Array.from({length:64},(_,i)=>Object.freeze(welcomeBoundary(i*Math.PI/32))));
function outline(ctx) {
 ctx.beginPath();
 WELCOME_SHAPE_POINTS.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
 ctx.closePath();
}
export function drawArWelcomePanel(ctx) {
 const glass=ctx.createLinearGradient(250,300,1150,800);
 glass.addColorStop(0,'rgba(74,122,91,.64)');
 glass.addColorStop(.48,'rgba(24,70,48,.54)');
 glass.addColorStop(1,'rgba(8,32,21,.42)');
 outline(ctx);ctx.fillStyle=glass;ctx.fill();
 ctx.strokeStyle='rgba(239,255,229,.82)';ctx.lineWidth=5;ctx.stroke();
 ctx.save();outline(ctx);ctx.clip();
 const light=ctx.createRadialGradient(360,290,20,470,350,420);
 light.addColorStop(0,'rgba(255,255,255,.2)');light.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=light;ctx.fillRect(80,110,1240,880);ctx.restore();
}
