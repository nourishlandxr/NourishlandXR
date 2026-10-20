const menuButton=document.querySelector('.menu-button'),menu=document.querySelector('#menu');
function setMenu(open){menu.hidden=!open;menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close menu':'Open menu');menuButton.textContent=open?'×':'☰'}
menuButton.onclick=()=>setMenu(menu.hidden);addEventListener('keydown',e=>{if(e.key==='Escape')setMenu(false)});
// The first image and menu work before the rendering engine is downloaded.
const reduced=matchMedia('(prefers-reduced-motion:reduce)'),portrait=innerWidth/innerHeight<=1,id=portrait?'phone':'desktop';
let progress=0,target=0,hover=0,paused=document.hidden,drawn=0,then=0;
const markers=[...document.querySelectorAll('.marker')];
function scrollState(){target=Math.max(0,Math.min(1,scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));document.documentElement.style.setProperty('--progress',target);document.body.dataset.progress=target>.18?'exploring':'landing';document.querySelector('h1').style.opacity=String(Math.max(0,1-target*5));document.querySelector('.gesture').style.opacity=String(Math.max(0,1-target*5))}
addEventListener('scroll',scrollState,{passive:true});scrollState();
addEventListener('pointermove',e=>{if(e.pointerType==='mouse')hover=(e.clientX/innerWidth-.5)*2},{passive:true});
addEventListener('visibilitychange',()=>{paused=document.hidden;then=0});
try{
 const [THREE,meta,bytes]=await Promise.all([import('./three.mjs'),fetch(id+'.json').then(r=>r.json()),fetch(id+'-depth.dat').then(r=>r.arrayBuffer())]);
 if(!('DecompressionStream'in window))throw Error('Depth decompression unavailable');
 const buffer=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer(),data=new DataView(buffer);
 const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),alpha:true,antialias:false,powerPreference:'low-power'});
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setPixelRatio(Math.min(devicePixelRatio,portrait?1.25:1.5));renderer.setClearColor(0,0);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(meta.landing.fov,innerWidth/innerHeight,meta.landing.near,meta.landing.far);
 camera.position.fromArray(meta.landing.position);camera.quaternion.fromArray(meta.landing.quaternion);camera.zoom=meta.landing.zoom;camera.updateProjectionMatrix();
 const inverse=new THREE.Matrix4().fromArray(meta.projectionInverse),world=new THREE.Matrix4().fromArray(meta.world),positions=[],uvs=[],waters=[],depths=[],indices=[];
 const point=new THREE.Vector3();
 for(let y=0;y<meta.rows;y++)for(let x=0;x<meta.cols;x++){
  const i=y*meta.cols+x,d=data.getUint16(i*4,true)/65535*10;depths.push(d);point.set(x/(meta.cols-1)*2-1,1-y/(meta.rows-1)*2,.5).applyMatrix4(inverse);point.multiplyScalar((d||10)/-point.z).applyMatrix4(world);positions.push(...point.toArray());uvs.push(x/(meta.cols-1),1-y/(meta.rows-1));waters.push(data.getUint8(i*4+2)/255);
 }
 for(let y=0;y<meta.rows-1;y++)for(let x=0;x<meta.cols-1;x++){
  const a=y*meta.cols+x,b=a+1,c=a+meta.cols,d=c+1;
  for(const tri of [[a,c,b],[b,c,d]]){const ds=tri.map(i=>depths[i]);if(ds.every(d=>d>0)&&Math.max(...ds)-Math.min(...ds)<.22)indices.push(...tri)}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('water',new THREE.Float32BufferAttribute(waters,1));geometry.setIndex(indices);
 const image=document.querySelector('.poster img');await image.decode();const texture=new THREE.Texture(image);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
 const uniforms={map:{value:texture},time:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:true,
 vertexShader:'attribute float water;varying vec2 vUv;varying float vWater;void main(){vUv=uv;vWater=water;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform sampler2D map;uniform float time;varying vec2 vUv;varying float vWater;void main(){vec2 uv=vUv;float flow=sin(uv.y*180.+time*1.4)*sin(uv.x*140.-time*.7);uv+=vec2(flow*.00035,sin(uv.x*210.+time)*.00025)*vWater;vec4 c=texture2D(map,uv);c.rgb+=vec3(.005,.008,.008)*flow*vWater;gl_FragColor=c;#include <colorspace_fragment>}'.replace('#include','\n#include')});
 const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;scene.add(mesh);
 const base=new THREE.Vector3().fromArray(meta.landing.position),rotation=new THREE.Quaternion().fromArray(meta.landing.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(rotation),up=new THREE.Vector3(0,1,0).applyQuaternion(rotation),forward=new THREE.Vector3(0,0,-1).applyQuaternion(rotation);
 const anchors=[[.28,.64],[.67,.34]].map(([x,y])=>new THREE.Vector3().fromArray(positions,(Math.round(y*(meta.rows-1))*meta.cols+Math.round(x*(meta.cols-1)))*3));
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;
  // Retain the master's off-axis portal centring as well as its field of view.
  camera.projectionMatrix.copy(inverse).invert();const captureAspect=meta.width/meta.height,ratio=meta.landing.zoom/meta.captureZoom,sx=ratio*Math.max(1,captureAspect/camera.aspect),sy=ratio*Math.max(1,camera.aspect/captureAspect);
  for(let c=0;c<4;c++){camera.projectionMatrix.elements[c*4]*=sx;camera.projectionMatrix.elements[c*4+1]*=sy}camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();scrollState()}
 addEventListener('resize',resize);resize();document.querySelector('.world').style.background=meta.background;
 let lastProgress=-1;
 function render(now){requestAnimationFrame(render);if(paused||now-then<33)return;then=now;
  progress+=(target-progress)*.09;if(Math.abs(target-progress)<.0001)progress=target;
  const move=reduced.matches?0:Math.sin(progress*Math.PI),slide=reduced.matches?0:Math.sin(progress*Math.PI*2);
  camera.position.copy(base).addScaledVector(right,slide*.025+(reduced.matches?0:hover*.003)).addScaledVector(up,-move*.005).addScaledVector(forward,move*.085);camera.quaternion.copy(rotation);camera.updateMatrixWorld();uniforms.time.value=reduced.matches?0:now/1000;
  markers.forEach((m,i)=>{const p=anchors[i].clone().project(camera),visible=progress>(i?.46:.20)&&progress<(i?1:.78);m.setAttribute('aria-hidden',String(!visible));m.tabIndex=visible?0:-1;m.style.opacity=visible?'1':'0';m.style.left=Math.max(18,Math.min(innerWidth-175,(p.x*.5+.5)*innerWidth))+'px';m.style.top=Math.max(120,Math.min(innerHeight-160,(-p.y*.5+.5)*innerHeight))+'px'});
  if(reduced.matches&&lastProgress===progress&&drawn>0)return;renderer.render(scene,camera);lastProgress=progress;drawn++;document.body.dataset.ready='true';
 }
 requestAnimationFrame(render);
 window.heroMobileStudy={get metrics(){return {representation:'bounded depth mesh',triangles:indices.length/3,calls:renderer.info.render.calls,geometryCount:renderer.info.memory.geometries,textures:renderer.info.memory.textures,dpr:renderer.getPixelRatio(),drawn,progress,assetBytes:meta.depthBytes+meta.colourBytes,fullWorldRequested:performance.getEntriesByType('resource').some(r=>r.name.includes('Nourishland-Hero-Living'))}},setProgress(value){scrollTo({top:Math.max(0,Math.min(1,value))*(document.documentElement.scrollHeight-innerHeight),behavior:'instant'})}};
}catch(error){console.warn('Hero image remains available:',error);document.body.dataset.ready='image';}
