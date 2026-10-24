import * as THREE from "../vendor/three.module.min.js?v=0.9818";
import {createForestSculpture} from "./foodForestSculpture.js?v=0.9818";

export const FOOD_FOREST_LAYERS=Object.freeze([
 {id:'canopy',name:'Canopy',mark:'01',color:'#397e60',height:1.02,form:'sheltering crowns & branching boughs'},
 {id:'small-tree',name:'Small tree',mark:'02',color:'#d98a50',height:.8,form:'jade foliage & pendant harvest'},
 {id:'shrub',name:'Shrub',mark:'03',color:'#8ca94b',height:.48,form:'leaf sprays & berry clusters'},
 {id:'herb',name:'Herbaceous',mark:'04',color:'#d6ad55',height:.44,form:'folded leaves & sculpted flowers'},
 {id:'groundcover',name:'Groundcover',mark:'05',color:'#56a49a',height:.18,form:'rosettes, little carpets & runners'},
 {id:'root',name:'Roots',mark:'06',color:'#bd7961',height:.36,form:'hidden harvest & fresh leaf fans'},
 {id:'climber',name:'Climber',mark:'07',color:'#a17cb5',height:.85,form:'heart leaves, tendrils & blossoms'}
]);
export const FOOD_FOREST_VARIANTS=Object.freeze({
 canopy:['Compact crown','Spreading crown','Upright crown','Open crown'],
 'small-tree':['Round fruit tree','Slender fruit tree','Trained fan','Multi-stem tree'],
 shrub:['Low mound','Round shrub','Upright shrub','Open shrub'],
 herb:['Leaf rosette','Soft tuft','Upright leaves','Flowering stems'],
 groundcover:['Tight mat','Spreading leaves','Low cushions','Creeping strands'],
 root:['Bulb','Taproot','Tuber cluster','Rhizome'],
 climber:['Low arch','Tall spiral','Trained fan','Twining post']
});

// Original collectible miniatures, not species replicas. All solid detail shares
// a single draw call. Display plinths disappear when a piece is planted.
export function createFoodForestPiece(layerId,{size=1,variant=0,label='',plantId='',marks=true,planted=false,support=null,trail=false,patch=null,seed=''}={}){
 const definition=FOOD_FOREST_LAYERS.find(l=>l.id===layerId)||FOOD_FOREST_LAYERS[1];variant=Math.max(0,Math.min(3,Math.floor(Number(variant)||0)));
 const kit=createForestSculpture({seed:seed||layerId+variant}),{part,branch,leaf,leafCell,fruit,blossom}=kit;
 const palette={canopy:['#406951','#78936c','#31533e'],'small-tree':['#5b784e','#94a06b','#405d3c'],shrub:['#7e8f54','#a3af79','#5a703f'],herb:['#769156','#adbc6f','#456c46'],groundcover:['#4c9b88','#84bda0','#2e776e'],root:['#72934b','#aac66b','#426a3e'],climber:['#4e8b6b','#92b18a','#365f4d']}[definition.id],green=palette[0],light=palette[1],dark=palette[2],bark='#86583e',barkLight='#af8052',cream='#e7d39d',amber='#edaa4c',pink='#cc8294',purple='#9261a1';
 const baseY=planted?.008:.083;
 const B=(points,r=.02,color=bark)=>branch(points,r,color);
 function stalk(h,r=.026,x=0,z=0){B([[x,baseY,z],[x-.018,h*.5,z+.008],[x,h,z]],r);}
 function fan(base,count,length,width,rise=.16,start=0){for(let i=0;i<count;i++){const a=start+i/count*Math.PI*2;leaf(base,[base[0]+Math.sin(a)*length,base[1]+rise+(i%2)*.025,base[2]+Math.cos(a)*length],width,i%3===0?light:green);}}
 function quilt(x,y,z,rx,ry,rz,phase=0){
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+phase*.7+(kit.random()-.5)*.33,reach=.65+kit.random()*.35,base=[x+Math.sin(a)*rx*.1,y-ry*(.72+kit.random()*.12),z+Math.cos(a)*rz*.1],tip=[x+Math.sin(a+.12)*rx*reach,y+ry*(.55+kit.random()*.5),z+Math.cos(a+.12)*rz*reach];leafCell(base,tip,rx*(.44+kit.random()*.13),i%3===0?light:i%3===1?green:dark);}
 }
 function harvest(x,y,z,color=amber,shape=0){B([[x,y+.055,z-.009],[x+.008,y+.03,z],[x,y,z]],.007,dark);fruit(x,y,z,.032,.041,.031,color,shape);leaf([x,y+.05,z],[x+.045,y+.068,z+.013],.012,light);}
 if(!planted){
  const profile=[[.13,0],[.185,.003],[.213,.016],[.22,.036],[.213,.055],[.197,.063],[.19,.077],[.14,.08]].map(([x,y])=>new THREE.Vector2(x,y));
  const baseGeometry=new THREE.LatheGeometry(profile,28),bp=baseGeometry.attributes.position;for(let i=0;i<bp.count;i++){const x=bp.getX(i),z=bp.getZ(i),a=Math.atan2(z,x),w=1+.018*Math.sin(a*3+variant)+.009*Math.cos(a*7);bp.setXYZ(i,x*w,bp.getY(i)+.0015*Math.sin(a*4),z*w);}baseGeometry.computeVertexNormals();part(baseGeometry,'#8b7659');
  part(new THREE.CylinderGeometry(.193,.2,.013,28),'#c7b58e',0,.071,0);
  part(new THREE.TorusGeometry(.207,.004,4,32),definition.color,0,.057,0).rotation.x=Math.PI/2;
  for(let i=0;i<4;i++){const a=i*2.4+variant;part(new THREE.SphereGeometry(1,5,3),'#a28e6b',Math.sin(a)*.211,.035,Math.cos(a)*.211,.006,.007,.005);}
 }
 if(definition.id==='canopy'){
  const h=[.73,.75,.85,.8][variant];stalk(h,.045);
  if(variant===0){B([[0,.28,0],[-.09,.44,.02],[-.14,.58,.04]],.025);quilt(0,.74,0,.28,.2,.25,1);quilt(-.14,.56,.04,.17,.12,.16,2);}
  if(variant===1){for(const[x,z,y]of[[-.23,.04,.66],[.19,.07,.73],[.01,-.19,.76]]){B([[0,.27,0],[x*.42,.48,z*.4],[x,y,z]],.029);quilt(x,y,z,.205,.12,.18,x*4);}}
  if(variant===2){quilt(0,.82,0,.13,.19,.13,2);quilt(.015,.64,0,.2,.13,.17,1);quilt(-.01,.49,.015,.235,.1,.2,3);}
  if(variant===3){for(const[x,z,y]of[[-.25,.04,.58],[.22,.08,.73],[.025,-.2,.88]]){B([[0,.22,0],[x*.5,.44,z*.5],[x,y,z]],.027);quilt(x,y,z,.145,.115,.135,y*3);}}
  // Small buttress flares make the miniature feel planted rather than balanced on a pin.
  for(let i=0;i<4;i++){const a=i*Math.PI/2;B([[Math.sin(a)*.07,baseY,Math.cos(a)*.06],[Math.sin(a)*.03,baseY+.055,Math.cos(a)*.03],[0,baseY+.16,0]],.016,barkLight);}
 }else if(definition.id==='small-tree'){
  const branches=variant===0?[[-.12,.02,.5],[.12,.03,.57],[0,-.09,.64]]:variant===1?[[0,0,.71],[-.07,.01,.49]]:variant===2?[[-.21,0,.48],[0,0,.6],[.21,0,.48]]:[[-.14,.05,.43],[.14,.05,.51],[0,-.12,.65]];
  stalk(variant===1?.68:.43,.033);
  for(let i=0;i<branches.length;i++){const[x,z,y]=branches[i];B([[0,variant===3?baseY+.04:.25,0],[x*.45,y*.58,z*.45],[x,y-.02,z]],.019);quilt(x,y,z,variant===1?.115:.145,variant===1?.17:.13,variant===2?.09:.13,i+variant);}
  for(const[x,y,z]of variant===1?[[-.07,.64,.1],[.07,.52,.09],[0,.78,.04]]:[[-.14,.47,.12],[.13,.57,.13],[.02,.39,.1],[.05,.68,.02]])harvest(x,y,z,variant===2?'#d58b54':amber,variant===1?1:0);
 }else if(definition.id==='shrub'){
  const spread=[.17,.13,.07,.22][variant],height=[.23,.34,.46,.31][variant];
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,x=Math.sin(a)*spread,z=Math.cos(a)*spread,y=height-(i%3)*.035;B([[0,baseY,0],[x*.45,y*.55,z*.45],[x,y,z]],.012);fan([x,y-.06,z],4,variant===2?.065:.095,.035,.08,a);}
  for(let i=0;i<3;i++){const a=i*2.4,center=[Math.sin(a)*spread*.65,height-.04,Math.cos(a)*spread*.65];for(let j=0;j<3;j++)fruit(center[0]+(j-1)*.018,center[1]+(j%2)*.02,center[2],.017,.019,.017,i%2?'#d9a66e':'#936f8b');}
 }else if(definition.id==='herb'){
  if(variant===0)fan([0,baseY,0],8,.15,.052,.12,.2);
  if(variant===1)for(let i=0;i<9;i++){const a=i*2.4;leaf([Math.sin(a)*.035,baseY,Math.cos(a)*.035],[Math.sin(a)*.13,.28+(i%3)*.035,Math.cos(a)*.13],.018,i%3?green:light);}
  if(variant===2)for(let i=0;i<6;i++){const a=i/6*Math.PI*2;leaf([Math.sin(a)*.03,baseY,Math.cos(a)*.03],[Math.sin(a)*.085,.36+(i%2)*.05,Math.cos(a)*.085],.033,i%2?green:light);}
  if(variant===3){fan([0,baseY,0],5,.11,.036,.13);for(let i=0;i<3;i++){const x=(i-1)*.075,y=.29+i*.05,z=i%2*.04;B([[x*.5,baseY,0],[x,.19,z],[x,y,z]],.007,green);blossom([x,y,z],.057,i%2?pink:cream,amber);}}
 }else if(definition.id==='groundcover'){
  const width=patch?.width||.38,depth=patch?.depth||.38,low=planted?.012:baseY+.012;
  const count=planted?Math.min(14,Math.max(4,Math.round(width*depth*14))):variant===2?3:variant===3?5:4;
  for(let i=0;i<count;i++){
   const a=i*2.4,r=Math.sqrt((i+.35)/count),x=Math.sin(a)*Math.max(.025,width*.44-.045)*r,z=Math.cos(a)*Math.max(.025,depth*.44-.045)*r;
   if(i){const prev=i-1,b=prev*2.4,q=Math.sqrt((prev+.35)/count);B([[Math.sin(b)*Math.max(.025,width*.44-.045)*q,low,Math.cos(b)*Math.max(.025,depth*.44-.045)*q],[(x+Math.sin(b)*width*.2)/2,low+.003,z*.4],[x,low,z]],.004,dark);}
   if(variant===0)fan([x,low,z],5,.055,.024,.025,a);
   if(variant===1)for(let j=0;j<3;j++){const b=a+j/3*Math.PI*2;leaf([x,low,z],[x+Math.sin(b)*.075,low+.022,z+Math.cos(b)*.075],.034,j%2?light:green,true);}
   if(variant===2){fan([x,low,z],4,.055,.03,.028,a);if(i%3===0)blossom([x,low+.035,z],.027,cream,amber);}
   if(variant===3){for(const side of[-1,1])leaf([x,low,z],[x+side*.055,low+.025,z+.035],.026,i%2?green:light,true);if(i%3===0)fruit(x,low+.025,z,.012,.016,.012,'#c68278');}
  }
 }else if(definition.id==='root'){
  const harvestY=planted?-.09:.18;
  if(!planted){part(new THREE.CylinderGeometry(.16,.178,.17,18,1,false,0,Math.PI),bark,0,.165,0);part(new THREE.BoxGeometry(.31,.014,.018),cream,0,.255,0);}
  if(variant===0){fruit(0,harvestY,.035,.075,.072,.055,'#d2a66e',2);fruit(0,harvestY+.045,.035,.058,.025,.045,'#b98084');}
  if(variant===1){const profile=[[0,-.12],[.018,-.08],[.035,-.015],[.044,.045],[.025,.075],[0,.08]].map(([x,y])=>new THREE.Vector2(x,y));part(new THREE.LatheGeometry(profile,12),'#dc9b58',0,harvestY,.04);}
  if(variant===2)for(const x of[-.065,0,.065])fruit(x,harvestY+(x===0?.015:-.01),.04,.037,.063,.032,'#bf8978',2);
  if(variant===3){for(let i=0;i<4;i++){const x=(i-1.5)*.05;fruit(x,harvestY+(i%2)*.025,.04,.045,.027,.03,'#c5a16c',2);}}
  for(let i=0;i<(variant===2?3:1);i++){const x=variant===2?(i-1)*.06:0;B([[x,harvestY-.04,.04],[x+.009,harvestY-.085,.043],[x+.02,harvestY-.14,.047]],.006,cream);}
  fan([0,planted?.005:.255,0],variant===1?7:5,.105,variant===1?.022:.034,planted?.105:.095,variant*.4);
 }else if(definition.id==='climber'){
  const height=support?.height||[.63,.89,.68,.75][variant];
  if(!support&&!trail){
   if(variant===0){B([[-.145,baseY,0],[-.145,.46,0],[0,height+.01,0],[.145,.46,0],[.145,baseY,0]],.013,barkLight);B([[-.145,.3,0],[0,.34,0],[.145,.3,0]],.008,barkLight);}
   else{stalk(height,.014);if(variant===2)for(const side of[-1,1])B([[0,baseY,0],[side*.1,.35,0],[side*.22,height-.03,0]],.012,barkLight);}
  }
  const at=t=>[(support?.x||0)*t+(trail?t*.62:Math.sin(t*18)*.05),trail?.025+Math.sin(t*4)*.01:baseY+t*(height-baseY),(support?.z||0)*t+Math.cos(t*18)*.05];
  B(Array.from({length:13},(_,i)=>at(i/12)),.012,dark);
  for(let i=0;i<7;i++){const p=at((i+1)/9),a=i*2.4,tip=[p[0]+Math.sin(a)*.09,p[1]+(trail?.025:.055),p[2]+Math.cos(a)*.08];leaf(p,tip,.042,i%2?green:light,true);if(i===2||i===5){const c=[tip[0],tip[1]+.008,tip[2]];blossom(c,.032,variant%2?purple:pink,cream);}if(i%3===0){const points=Array.from({length:8},(_,j)=>[p[0]+.04+j*.003+Math.sin(j*.8)*.013,p[1]+.02+j*.003,p[2]+Math.cos(j*.8)*.016]);B(points,.0028,light);}}
 }
 const piece=kit.finish({planted,size});piece.definition=definition;piece.group.name=definition.name;piece.group.userData={layer:definition.id,variant,plantId,label,symbol:true,planted,craft:'organic-study-v6'};
 if(marks&&!planted&&typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=cream;c.fillRect(0,0,128,128);c.fillStyle=dark;c.font='700 43px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(`${definition.mark}.${variant+1}`,64,66);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;piece.textures.push(texture);const material=new THREE.MeshBasicMaterial({map:texture});piece.materials.push(material);const geo=new THREE.PlaneGeometry(.105,.066);piece.geometries.push(geo);const stamp=new THREE.Mesh(geo,material);stamp.rotation.x=-Math.PI/2;stamp.position.set(0,.079,.135);piece.group.add(stamp);
 }
 return piece;
}
