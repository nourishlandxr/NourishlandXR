import * as THREE from 'nl-three';

export function livingEffects({scene,renderer,stage,sun,fill,requestRender}){
 const skyFrames=[
 [0,'#b9def3','#e2edf0',1.85,2.05,'#fff7df'],
 [.25,'#267fc5','#acd9ed',1.85,2.10,'#fff4d6'],
 [.50,'#4b91c7','#eac9a0',1.35,1.55,'#ffe0ae'],
 [.65,'#886a9b','#f3a05c',.95,1.10,'#ffc181'],
 [.76,'#51436e','#d46a72',.65,.72,'#f6a4a0'],
 [.87,'#152d55','#514064',.42,.40,'#b9c9ec'],
 [1,'#02040b','#080d1d',.22,.18,'#9ab6dc']];
 function skyAt(t){let i=1;while(i<skyFrames.length-1&&t>skyFrames[i][0])i++;const a=skyFrames[i-1],b=skyFrames[i],u=THREE.MathUtils.smoothstep(t,a[0],b[0]);return {top:new THREE.Color(a[1]).lerp(new THREE.Color(b[1]),u),horizon:new THREE.Color(a[2]).lerp(new THREE.Color(b[2]),u),ambient:THREE.MathUtils.lerp(a[3],b[3],u),direct:THREE.MathUtils.lerp(a[4],b[4],u),sun:new THREE.Color(a[5]).lerp(new THREE.Color(b[5]),u)}}
 const waterTime={value:0},waterMeshes=[],sky=scene.children.find(o=>o.isHemisphereLight),slider=document.querySelector('[data-daylight]'),mount=document.querySelector('.nl-biome-mount');let time=0,day=0,waterMaterials=0;
 function daylight(value,shadow=true){
  day=THREE.MathUtils.clamp(Number(value),0,2);const mycelium=THREE.MathUtils.smoothstep(day,1.08,2),cycle=Math.min(day,1),night=THREE.MathUtils.smoothstep(cycle,.65,1),palette=skyAt(cycle),bg=palette.top.clone().lerp(new THREE.Color('#010207'),mycelium),horizon=palette.horizon.clone().lerp(new THREE.Color('#010207'),mycelium);
  mount.style.background='linear-gradient(to bottom,#'+bg.getHexString()+' 0%,#'+horizon.getHexString()+' 88%)';document.body.style.background='#'+bg.getHexString();document.body.dataset.night=cycle>.8?'true':'false';
  document.documentElement.style.setProperty('--ink',cycle>.76?'#e1eaf4':'#263c40');document.documentElement.style.setProperty('--nl-time-ink',cycle>.76?'#d1dce9':'#4a626d');
  sky.intensity=THREE.MathUtils.lerp(palette.ambient,.022,mycelium);sky.color.copy(palette.top).lerp(new THREE.Color('#d3e5ee'),.55);sky.groundColor.copy(palette.horizon).multiplyScalar(.46);
  sun.intensity=THREE.MathUtils.lerp(palette.direct,.018,mycelium);sun.color.copy(palette.sun);sun.position.set(-3-cycle*1.2,6-cycle*4.2,4-cycle*1.4);
  fill.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(.5,.12,night),.025,mycelium);fill.color.copy(palette.top).lerp(new THREE.Color('#dce8ed'),.45);renderer.toneMappingExposure=THREE.MathUtils.lerp(THREE.MathUtils.lerp(1.08,.92,night),.76,mycelium);
  const grade=(window.heroGrade?.enabled??(new URLSearchParams(location.search).get('grade')!=='off'))?1:0;
  const daylightGrade=grade*(1-night)*(1-mycelium);
  sky.intensity*=1-.22*daylightGrade;sun.intensity*=1+.09*daylightGrade;fill.intensity*=1-.16*daylightGrade;
  // The fixed ambient and rear rim formerly stayed bright even at night.
  const ambient=scene.children.find(o=>o.isAmbientLight),rim=scene.children.find(o=>o.isDirectionalLight&&o!==sun&&o!==fill);
  if(ambient)ambient.intensity=THREE.MathUtils.lerp(.24*(1-.25*daylightGrade),.008,Math.max(night,mycelium));
  if(rim)rim.intensity=THREE.MathUtils.lerp(.48,.018,Math.max(night,mycelium));
  if(shadow)renderer.shadowMap.needsUpdate=true;
  const mode=day>1.35?'mycelium':day>.73?'night':'day';for(const mesh of waterMeshes){const fall=mesh.userData.role==='waterfall';mesh.visible=mycelium<.999;mesh.material.transparent=true;mesh.material.opacity=(mesh.material.userData.waterBaseOpacity??=.95)*(1-mycelium);mesh.material.emissive.set(fall?0x075aa8:0x03465c);mesh.material.emissiveIntensity=mode==='night'?(fall?.25:.04):(fall?.12:.025)}if(slider){slider.value=String(day);slider.setAttribute('aria-valuetext',mode==='mycelium'?'Mycelium map':day<.22?'Early day':day<.55?'Day':day<.83?'Evening':'Night')}
  stage.dataset.daylight=String(day);stage.dataset.lightingMode=mode;stage.dataset.sky=bg.getHexString();window.dispatchEvent(new CustomEvent('nl-lighting-change',{detail:{mode,value:day}}));requestRender();
 }
 function water(mesh){
  const fall=mesh.userData.role==='waterfall';if(!fall&&mesh.userData.role!=='water')return;
  const family=String(mesh.userData.piece_id||''),wetland=/^W/.test(family),rainforest=/^R/.test(family);const mat=mesh.material;mat.vertexColors=false;mat.color.set(fall?0x1479d1:0x438b91);mat.roughness=fall?.31:.28;mat.metalness=.04;mat.emissive.set(fall?0x021326:0x01080f);mat.userData.nlWater=true;
  mat.onBeforeCompile=shader=>{
   shader.uniforms.uLivingWaterTime=waterTime;shader.vertexShader='uniform float uLivingWaterTime; varying vec3 vLivingWater;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvLivingWater = position;\n${fall?'transformed.x += sin(position.y*180.0+uLivingWaterTime*4.0)*0.00025;':'transformed.y += sin(position.x*110.0+position.z*63.0-uLivingWaterTime*1.4)*0.00015;'}`);
   shader.fragmentShader='uniform float uLivingWaterTime; varying vec3 vLivingWater;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float t=uLivingWaterTime;
    vec2 p=vLivingWater.xz;
    float broad=sin(p.x*33.0+sin(p.y*21.0-t*.24)*1.7-t*.32)*sin(p.y*47.0+p.x*15.0+t*.21);
    float fine=sin(p.x*217.0+sin(p.y*91.0)*2.0-t*1.1)*sin(p.y*173.0-t*.7);
    vec3 deep=vec3(0.035,0.19,0.205),shallow=vec3(0.19,0.39,0.39);
    diffuseColor.rgb=mix(deep,shallow,clamp(.48+broad*.19+fine*.045,0.0,1.0));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.34,0.49,0.46),pow(max(0.0,fine),12.0)*.17);
    ${wetland?'float growth=smoothstep(.37,.78,sin(p.x*24.0+sin(p.y*31.0))*sin(p.y*28.0-p.x*9.0));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.105,.23,.105),growth*.55);':rainforest?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.06,.24,.19),.22);':''}
   `);
   if(new URLSearchParams(location.search).has('hero'))for(const key of ['vertexShader','fragmentShader'])shader[key]=shader[key].replace(/uLivingWaterTime\*([0-9.]+)/g,(_,rate)=>'uLivingWaterTime*'+(Math.round(Number(rate)*24/(2*Math.PI))*2*Math.PI/24).toFixed(8));
  };
  mat.customProgramCacheKey=()=>fall?'nourishland-v14-falling-water':'nourishland-v17-surface-water-'+(wetland?'wetland':rainforest?'rainforest':'other');mat.needsUpdate=true;waterMeshes.push(mesh);waterMaterials++;stage.dataset.movingWaterMaterials=String(waterMaterials);daylight(day,false);
 }
 slider?.addEventListener('input',()=>daylight(slider.value,false));slider?.addEventListener('change',()=>daylight(slider.value,true));
 daylight(0,false);
 return {registerWater:water,tick(t){time=t;waterTime.value=t;stage.dataset.waterTime=t.toFixed(3)},setDaylight:daylight,get state(){return {time,day,waterMaterials,sky:stage.dataset.sky}}};
}
