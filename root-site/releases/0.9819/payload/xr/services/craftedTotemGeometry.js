import {craftedSignOutline,craftedTotemSignStyle} from "./craftedTotemSigns.js?v=0.9819";
// Shared craft geometry, independent of DOM, renderer and saved project records.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const PROFILE=[[0,1.42],[.025,1.46],[.065,1.32],[.14,1.08],[.27,.85],[.49,.73],[.76,.66],[.94,.65],[1,.71]];
export function craftedTotemRadius(t){
 t=clamp(t,0,1);let i=1;while(i<PROFILE.length-1&&PROFILE[i][0]<t)i++;
 const [a,ra]=PROFILE[i-1],[b,rb]=PROFILE[i],u=clamp((t-a)/(b-a),0,1),s=u*u*(3-2*u);return ra+(rb-ra)*s;
}
export function craftedTotemPoint(t,angle,style='basic'){
 t=clamp(t,0,1);
 if(style==='botanical'){
  // Six raised stem ribs and a compact root flare, without the turned pedestal.
  const radius=(.48+.52*Math.exp(-t*15))*(1+.13*Math.cos(angle*6+t*.9)*Math.sin(Math.PI*t));
  return [Math.cos(angle)*radius,t*2-1,Math.sin(angle)*radius];
 }
 if(style==='carved'){
  // A hand-carved, lobed lower trunk. Its upper attachment face stays stable.
  const envelope=Math.pow(Math.sin(Math.PI*t),2),twist=.38*Math.sin(t*Math.PI-.6);
  const radius=craftedTotemRadius(t)*(1.12+.14*Math.sin(t*Math.PI*2+.4))*(1+.19*Math.cos(angle*3+t*2.8)*envelope);
  const x=.30*Math.sin(t*Math.PI*2)*Math.max(0,1-t/.66);
  return [x+Math.cos(angle+twist)*radius,t*2-1,Math.sin(angle+twist)*radius];
 }
 const radius=craftedTotemRadius(t);
 return [Math.cos(angle)*radius,t*2-1,Math.sin(angle)*radius];
}
export function craftedCrownPoint(t,a,style='basic'){
 if(style==='botanical'){
  t=clamp(t,0,1);let radius,y;
  if(t<.76){const h=t/.76;radius=Math.max(.001,(.54*(1-h)+.74*Math.sin(h*Math.PI))*(1+.10*Math.cos(a*5)*Math.sin(h*Math.PI)));y=1.015+.43*h;}
  else{const h=(t-.76)/.24;radius=.001;y=1.445-.43*h;}
  return [Math.cos(a)*radius,y,Math.sin(a)*radius];
 }
 if(style==='carved'){
  t=clamp(t,0,1);let radius,y;
  if(t<.60){const h=t/.60;radius=.82+.48*h+.045*Math.cos(a*8);y=1.015+.21*h;}
  else if(t<.82){const h=(t-.60)/.22;radius=1.30-.14*h+.018*Math.sin(h*Math.PI);y=1.225+.018*Math.sin(h*Math.PI);}
  else{const h=(t-.82)/.18;radius=Math.max(.001,1.16*(1-h));y=1.225-.17*h;}
  return [Math.cos(a)*radius,y,Math.sin(a)*radius];
 }
 let radius,y;t=clamp(t,0,1);
 if(t<.68){const h=t/.68,flute=(.023+.025*h)*Math.cos(a*16);radius=.73+.43*h+flute;y=1.015+.35*h;}
 else if(t<.85){const h=(t-.68)/.17;radius=1.16-.14*h+.023*Math.sin(h*Math.PI);y=1.365+.025*Math.sin(h*Math.PI);}
 else{const h=(t-.85)/.15;radius=Math.max(.001,1.02*(1-h));y=1.365-.27*h;}
 return [Math.cos(a)*radius,y,Math.sin(a)*radius];
}
// A closed, bevelled board. Z is its depth, with the text on the +Z face.
export function createCraftedSignGeometry(side='header',style='basic'){
 const outline=craftedSignOutline(side,style),stone=craftedTotemSignStyle(style).material==='stone';
 const rings=[[-1,stone?.89:.95],[-.58,1],[.58,1],[1,stone?.89:.95]],vertices=[];
 const point=(r,i)=>[outline[i][0]*rings[r][1],outline[i][1]*rings[r][1],rings[r][0]];
 function triangle(a,b,c){const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);if(len<1e-10)return;for(const p of [a,b,c])vertices.push(...p,...n.map(x=>x/len));}
 for(let r=0;r<3;r++)for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;triangle(point(r,i),point(r,j),point(r+1,j));triangle(point(r,i),point(r+1,j),point(r+1,i));}
 for(let i=0;i<outline.length;i++){const j=(i+1)%outline.length;triangle([0,0,1],point(3,i),point(3,j));triangle([0,0,-1],point(0,j),point(0,i));}
 return new Float32Array(vertices);
}
