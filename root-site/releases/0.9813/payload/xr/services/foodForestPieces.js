import * as THREE from "../vendor/three.module.min.js?v=0.9813";
export const FOOD_FOREST_LAYERS = Object.freeze([
 {id:'canopy',name:'Canopy',mark:'01',color:'#388569',height:.96,form:'sculpted sheltering crowns'},
 {id:'small-tree',name:'Small tree',mark:'02',color:'#d78151',height:.74,form:'orchard crowns & golden fruit'},
 {id:'shrub',name:'Shrub',mark:'03',color:'#8baf52',height:.44,form:'soft clusters & berry tips'},
 {id:'herb',name:'Herbaceous',mark:'04',color:'#deb854',height:.43,form:'leaf fans & flower stems'},
 {id:'groundcover',name:'Groundcover',mark:'05',color:'#52aaa0',height:.2,form:'spreading succulent rosettes'},
 {id:'root',name:'Roots',mark:'06',color:'#c78067',height:.37,form:'cutaway earth & hidden harvest'},
 {id:'climber',name:'Climber',mark:'07',color:'#ac86bf',height:.79,form:'curling vines & petal accents'}
]);
export const FOOD_FOREST_VARIANTS=Object.freeze({canopy:['Compact crown','Spreading crown','Upright crown','Open crown'],'small-tree':['Round fruit tree','Slender fruit tree','Trained fan','Multi-stem tree'],shrub:['Low mound','Round shrub','Upright shrub','Open shrub'],herb:['Leaf rosette','Soft tuft','Upright leaves','Flowering stems'],groundcover:['Tight mat','Spreading leaves','Low cushions','Creeping strands'],root:['Bulb','Taproot','Tuber cluster','Rhizome'],climber:['Low arch','Tall spiral','Trained fan','Twining post']});

// Original ceramic game pieces, symbolic rather than botanical replicas.
// Bake all opaque parts into one vertex-coloured mesh per piece for stereo XR.
export function createFoodForestPiece(layerId,{size=1,variant=0,label='',plantId='',marks=true}={}){
 const definition=FOOD_FOREST_LAYERS.find(l=>l.id===layerId)||FOOD_FOREST_LAYERS[1];
 variant=Math.max(0,Math.min(3,Math.floor(Number(variant)||0)));
 const group=new THREE.Group(),parts=[],geometries=[],materials=[],textures=[];
 group.name=definition.name;group.userData={layer:definition.id,variant,plantId,label,symbol:true};
 const leaf=new THREE.Color(definition.color),light=leaf.clone().offsetHSL(-.015,.02,.055),dark=leaf.clone().multiplyScalar(.78),bark=new THREE.Color('#805238'),sand=new THREE.Color('#ddbd83'),edge=new THREE.Color('#385e54'),fruit=new THREE.Color('#ffd16b');
 function part(geometry,color,x=0,y=0,z=0,sx=1,sy=1,sz=1){const object=new THREE.Object3D();object.position.set(x,y,z);object.scale.set(sx,sy,sz);parts.push({geometry,object,color});return object;}
 function pod(x,y,z,sx,sy,sz,color=leaf){return part(new THREE.SphereGeometry(1,12,8),color,x,y,z,sx,sy,sz);}
 function branch(a,b,r=.025,color=bark){const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),delta=to.clone().sub(from),o=part(new THREE.CylinderGeometry(r*.58,r,delta.length(),7),color,...from.clone().lerp(to,.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
 function stem(h,r=.029,x=0,z=0){branch([x,.065,z],[x,h,z],r);}
 function blade(x,y,z,length,width,angle,tilt=0,color=leaf){const o=pod(x,y,z,width,length,width*.38,color);o.rotation.set(Math.cos(angle)*tilt,angle,-Math.sin(angle)*tilt);return o;}
 function crown(x,y,z,rx,ry,rz){pod(x,y,z,rx,ry,rz);pod(x-rx*.48,y+ry*.25,z+rz*.27,rx*.65,ry*.82,rz*.7,light);pod(x+rx*.4,y-ry*.18,z-rz*.26,rx*.67,ry*.76,rz*.74,dark);}
 part(new THREE.CylinderGeometry(.205,.22,.055,32),edge,0,.0275,0);part(new THREE.CylinderGeometry(.187,.199,.027,32),sand,0,.065,0);
 part(new THREE.TorusGeometry(.196,.006,4,32),light,0,.077,0).rotation.x=Math.PI/2;
 if(definition.id==='canopy'){
  stem([.61,.65,.79,.67][variant],.049);
  if(variant===0){crown(0,.73,0,.29,.22,.26);crown(-.12,.57,.06,.19,.14,.18);}
  if(variant===1)for(const[x,z,y]of[[-.22,.02,.65],[.18,.06,.74],[.02,-.16,.78]]){branch([0,.35,0],[x,y,z],.029);crown(x,y,z,.22,.15,.19);}
  if(variant===2){crown(0,.81,0,.18,.27,.17);crown(.02,.57,0,.23,.17,.2);}
  if(variant===3)for(const[x,z,y]of[[-.24,.03,.65],[.2,.08,.78],[.02,-.22,.87]]){branch([0,.31,0],[x,y,z],.026);crown(x,y,z,.16,.13,.15);}
 }else if(definition.id==='small-tree'){
  stem(variant===1?.6:.42,.036);
  if(variant===0)crown(0,.53,0,.25,.23,.23);
  if(variant===1)crown(0,.65,0,.16,.28,.15);
  if(variant===2)for(let i=-1;i<=1;i++){branch([0,.17,0],[i*.19,.48,0],.017);crown(i*.17,.48,0,.13,.2,.1);}
  if(variant===3)for(const[x,z,y]of[[-.16,.03,.43],[.14,.05,.52],[0,-.14,.65]]){branch([0,.08,0],[x,y,z],.022);crown(x,y,z,.145,.16,.13);}
  for(const[x,y,z]of[[-.12,.49,.19],[.12,.6,.13],[.02,.39,.2],[.04,.72,.08]]){pod(x,y,z,.036,.042,.036,fruit);blade(x+.02,y+.043,z,.027,.012,.6,.3,dark);}
 }else if(definition.id==='shrub'){
  const spread=[.13,.09,.05,.19][variant],height=[.2,.28,.38,.3][variant];
  for(const[x,z,y]of[[-spread,.04,height],[spread,.05,height-.035],[0,-.09,height+.04]]){stem(y,.015,x,z);pod(x,y,z,variant===2?.095:.15,variant===0?.13:height*.65,.14);pod(x-.04,y+.055,z+.045,.09,.095,.085,light);}
  for(let i=0;i<5;i++)pod(Math.sin(i*2.4)*.13,height+.08+(i%2)*.035,Math.cos(i*2.4)*.13,.022,.023,.022,fruit);
 }else if(definition.id==='herb'){
  const n=[7,9,6,5][variant];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,r=variant===0?.1:.065,h=variant===2?.25:.16;blade(Math.sin(a)*r,h,Math.cos(a)*r,variant===0?.12:variant===2?.22:.15,variant===1?.028:.046,a,variant===0?1:.48,i%3?leaf:light);}
  if(variant===3)for(let i=0;i<3;i++){const x=(i-1)*.075,y=.33+i*.045;stem(y,.009,x,0);for(let j=0;j<5;j++)pod(x+Math.sin(j*1.257)*.036,y,Math.cos(j*1.257)*.036,.024,.014,.024,new THREE.Color('#f7dda4'));pod(x,y+.015,0,.017,.017,.017,dark);}
 }else if(definition.id==='groundcover'){
  const count=[8,9,12,14][variant];for(let i=0;i<count;i++){const a=i*2.4,r=variant===3?i*.019:variant===2?(i%3)*.065:.08+(i%2)*.04,o=pod(Math.sin(a)*r,.105+(i%3)*.014,Math.cos(a)*r,variant===1?.052:.06,.025,variant===1?.16:.105,i%3===0?light:leaf);o.rotation.set(.15,a,.12);}pod(0,.13,0,.042,.038,.042,light);
 }else if(definition.id==='root'){
  part(new THREE.CylinderGeometry(.157,.18,.19,20,1,false,0,Math.PI),bark,0,.17,0);part(new THREE.BoxGeometry(.32,.022,.025),sand,0,.27,0);const harvest=new THREE.Color('#f3b573');
  if(variant===0)pod(0,.17,.04,.075,.075,.045,harvest);
  if(variant===1)part(new THREE.ConeGeometry(.05,.19,12),harvest,0,.16,.04).rotation.z=Math.PI;
  if(variant===2)for(const x of[-.085,0,.085])pod(x,.16+(x===0?.025:0),.04,.045,.063,.035,harvest);
  if(variant===3){part(new THREE.CylinderGeometry(.03,.025,.25,10),harvest,0,.17,.04).rotation.z=Math.PI/2;for(const x of[-.08,.04,.09])branch([x,.17,.04],[x+.015,.085,.04],.012,harvest);}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;blade(Math.sin(a)*.046,.3,Math.cos(a)*.03,.09,.029,a,.75,light);}
 }else if(definition.id==='climber'){
  const height=[.61,.88,.66,.73][variant];
  if(variant===0){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.14,.08,0),new THREE.Vector3(-.14,.48,0),new THREE.Vector3(0,height,0),new THREE.Vector3(.14,.48,0),new THREE.Vector3(.14,.08,0)]);part(new THREE.TubeGeometry(curve,20,.016,5,false),bark);}else{stem(height,.018);if(variant===2)for(const x of[-.2,.2])branch([0,.1,0],[x,height-.05,0],.014);}
  const points=Array.from({length:30},(_,i)=>new THREE.Vector3(Math.sin(i*.7)*.065,.09+i*(height-.12)/29,Math.cos(i*.7)*.065));part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),40,.013,5,false),dark);
  for(let i=0;i<7+variant;i++){const a=i*2.4,y=.16+i*(height-.21)/(7+variant);blade(Math.sin(a)*.08,y,Math.cos(a)*.07,.075,.039,a,.8,i%2?leaf:light);if(i%3===0)pod(Math.sin(a)*.12,y+.04,Math.cos(a)*.09,.027,.035,.027,fruit);}
 }
 const positions=[],normals=[],colors=[];
 for(const{geometry:source,object,color}of parts){object.updateMatrix();const geo=(source.index?source.toNonIndexed():source).applyMatrix4(object.matrix);positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);for(let i=0;i<geo.attributes.position.count;i++)colors.push(color.r,color.g,color.b);geo.dispose();if(source!==geo)source.dispose();}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeBoundingSphere();geometries.push(geometry);
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0});materials.push(material);const solid=new THREE.Mesh(geometry,material);solid.castShadow=solid.receiveShadow=true;group.add(solid);
 if(marks&&typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#ddbd83';c.fillRect(0,0,128,128);c.fillStyle='#294f44';c.font='700 44px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(`${definition.mark}.${variant+1}`,64,66);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);const mat=new THREE.MeshBasicMaterial({map:texture});materials.push(mat);const geo=new THREE.PlaneGeometry(.105,.072);geometries.push(geo);const mark=new THREE.Mesh(geo,mat);mark.rotation.x=-Math.PI/2;mark.position.set(0,.08,.128);group.add(mark);
 }
 group.scale.setScalar(size);return{group,definition,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.removeFromParent();}};
}
