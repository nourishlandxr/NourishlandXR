// One shared silhouette for the AR surface and attached LIM roots.
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
 const glass=ctx.createLinearGradient(250,300,1150,800);
 glass.addColorStop(0,'rgba(22,62,43,.78)');
 glass.addColorStop(.48,'rgba(8,34,23,.74)');
 glass.addColorStop(1,'rgba(3,17,11,.68)');
 outline(ctx);ctx.fillStyle=glass;ctx.fill();
 ctx.strokeStyle='rgba(223,255,155,.72)';ctx.lineWidth=4;ctx.stroke();
 ctx.save();outline(ctx);ctx.clip();
 const light=ctx.createRadialGradient(360,290,20,470,350,420);
 light.addColorStop(0,'rgba(223,255,195,.14)');light.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=light;ctx.fillRect(80,110,1240,880);ctx.restore();
}
