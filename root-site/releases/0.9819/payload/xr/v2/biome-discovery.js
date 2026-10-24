import * as THREE from "./nlxr/vendor/three.module.min.js?v=0.9819";
import {showcasePose,SHOWCASE_SECONDS} from "./biome-discovery-model.js?v=0.9819";
import {planBiomeWalks} from "./biome-route-surface.js?v=0.9819";

// A visual demonstration of hidden knowledge. No record access, markers,
// reading cards, numbered stops or changes to the visitor's camera.
export function installBiomeDiscovery({scene,camera,stage,plan,height,requestRender,createLivingSphereGeometry,createTotemSculptureGeometry}){
  const root=new THREE.Group();root.name='Nourishland / hidden knowledge showcase';root.userData.role='nl_mapping_layer';scene.add(root);
  const signal=new AbortController(),geometries=new Set(),materials=new Set(),walks=planBiomeWalks({scene,plan,height,landmarks:window.heroInnerBiomes?.report.landmarks||[]}),families=new Map();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),state={visible:true,playing:!reduced.matches,time:0,family:'F',manual:false};
  const order=['F','W','R','C','M'],pickables=[],ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const ownGeometry=g=>(geometries.add(g),g),ownMaterial=m=>(materials.add(m),m);
  const ui=document.createElement('div');ui.className='nl-showcase-controls';ui.innerHTML=`<button type="button" data-play aria-label="Pause knowledge animation" title="Pause knowledge animation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg></button><button type="button" data-replay aria-label="Replay knowledge animation" title="Replay knowledge animation"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 7M5 3v5h5"/></svg></button><span role="status" aria-live="polite"></span>`;
  const css=document.createElement('style');css.textContent='.nl-showcase-controls{position:absolute;left:16px;bottom:var(--showcase-bottom,90px);z-index:24;display:flex;gap:6px}.nl-showcase-controls button{width:44px;height:44px;display:grid;place-items:center;border:1px solid #b9c6b69c;border-radius:50%;background:#f2efe0cf;color:#244b39;cursor:pointer;backdrop-filter:blur(8px)}.nl-showcase-controls button:hover{background:#f2efe0}.nl-showcase-controls button:focus-visible{outline:3px solid #ac794b;outline-offset:3px}.nl-showcase-controls span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}';document.head.append(css);stage.parentElement.append(ui);
  const play=ui.querySelector('[data-play]');
  function syncPlay(){play.setAttribute('aria-label',state.playing?'Pause knowledge animation':'Play knowledge animation');play.title=play.getAttribute('aria-label');play.innerHTML=state.playing?'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg>':'<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';}
  const report={version:'quiet-reveal-01',purpose:'demonstrative animation of hidden information',informationBrowser:false,welcomeAreas:walks.length,stations:[],points:[],route:[],routeRanges:[],growthSeconds:SHOWCASE_SECONDS,styles:['botanical','carved','organic'],orbModel:'actual twelve-cell Living shell',automaticPimo:true};
  function sculpture(style){const data=createTotemSculptureGeometry(12,10,style),g=ownGeometry(new THREE.BufferGeometry()),p=[],n=[];for(let i=0;i<data.vertices.length;i+=8){p.push(...data.vertices.slice(i,i+3));n.push(...data.vertices.slice(i+3,i+6));}g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setIndex(Array.from(data.indices));g.computeBoundingSphere();return g;}
  const totemGeometries=report.styles.map(sculpture);
  const shellData=createLivingSphereGeometry('low'),shell=ownGeometry(new THREE.BufferGeometry()),pos=[],norm=[],axes=[],colors=[];
  for(let i=0;i<shellData.vertices.length;i+=10){pos.push(...shellData.vertices.slice(i,i+3));norm.push(...shellData.vertices.slice(i+3,i+6));axes.push(...shellData.vertices.slice(i+6,i+9));const c=new THREE.Color([0xddd3b7,0xc0cdb7,0xd7c7a6][Math.floor(shellData.vertices[i+9])%3]);colors.push(c.r,c.g,c.b);}
  shell.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));shell.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));shell.setAttribute('aCellAxis',new THREE.Float32BufferAttribute(axes,3));shell.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));shell.setIndex(Array.from(shellData.indices));shell.computeBoundingSphere();shell.boundingSphere.radius*=2.5;
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.5);leafShape.bezierCurveTo(-.48,-.15,-.36,.35,0,.5);leafShape.bezierCurveTo(.36,.35,.48,-.15,0,-.5);const leaf=ownGeometry(new THREE.ShapeGeometry(leafShape,8));
  function pathMesh(points,color){if(points.length<2)return null;const p=[],progress=[],idx=[];
    for(let i=0;i<points.length;i++){const here=new THREE.Vector3(...points[i]),a=new THREE.Vector3(...points[Math.max(0,i-1)]),b=new THREE.Vector3(...points[Math.min(points.length-1,i+1)]),side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(.0023);for(const sign of [-1,1]){const q=here.clone().addScaledVector(side,sign);q.y=height(q.x,q.z,here.y)+.003;p.push(...q.toArray());progress.push(i/(points.length-1));}if(i){const n=i*2;idx.push(n-2,n-1,n,n-1,n+1,n);}}
    const g=ownGeometry(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('aProgress',new THREE.Float32BufferAttribute(progress,1));g.setIndex(idx);g.computeVertexNormals();
    const uniforms={uProgress:{value:0},uAlpha:{value:0},uColor:{value:new THREE.Color(color)}};
    const mat=ownMaterial(new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,vertexShader:'attribute float aProgress;varying float vProgress;void main(){vProgress=aProgress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float uProgress;uniform float uAlpha;uniform vec3 uColor;varying float vProgress;void main(){float alpha=(1.0-smoothstep(uProgress-.025,uProgress,vProgress))*uAlpha*.66;if(alpha<.002)discard;gl_FragColor=vec4(uColor,alpha);}'}));const mesh=new THREE.Mesh(g,mat);mesh.userData.role='nl_showcase_path';return mesh;
  }
  for(const [index,walk]of walks.entries()){
    const group=new THREE.Group();group.name=walk.name+' / animated hidden knowledge';group.visible=false;root.add(group);
    const welcomeMaterial=ownMaterial(new THREE.MeshStandardMaterial({color:0xa99f7d,roughness:.98,emissive:0x6b7753,emissiveIntensity:.06}));
    const welcome=new THREE.Mesh(totemGeometries[index%3],welcomeMaterial);welcome.position.copy(walk.positions[0]);welcome.scale.set(.0045,.026,.0045);welcome.userData.family=walk.id;welcome.name=walk.name+' welcome Totem';root.add(welcome);pickables.push(welcome);
    // Only one biome's two secondary Totems and three small plant orbs appear.
    const secondary=walk.positions.slice(1).map((p,i)=>{const mesh=new THREE.Mesh(totemGeometries[(index+i+1)%3],welcomeMaterial);mesh.position.copy(p);mesh.userData.baseScale=[.0038,.022,.0038];group.add(mesh);return mesh;});
    const paths=walk.segments.map(s=>pathMesh(s,walk.color)).filter(Boolean);paths.forEach(m=>group.add(m));
    const center=walk.positions[1].clone(),orbs=[];
    for(let i=0;i<3;i++){const a=(i-1)*1.05,point=center.clone().add(new THREE.Vector3(Math.cos(a)*.045,0,Math.sin(a)*.045));point.y=height(point.x,point.z,center.y)+.043;
      const opening={value:0},mat=ownMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:0,transparent:true,opacity:0,emissive:0x455a3c,emissiveIntensity:.08}));mat.onBeforeCompile=shader=>{shader.uniforms.uOpen=opening;shader.vertexShader='attribute vec3 aCellAxis;uniform float uOpen;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed+=aCellAxis*uOpen*1.25;');};mat.customProgramCacheKey=()=> 'nl-showcase-shell-01';
      const mesh=new THREE.Mesh(shell,mat);mesh.position.copy(point);mesh.scale.setScalar(.0045);mesh.userData.role='nl_showcase_orb';group.add(mesh);orbs.push({mesh,opening});report.points.push({id:walk.id+'-'+i,family:walk.id,position:point.toArray()});
    }
    const knowledge=new THREE.Group();knowledge.position.copy(orbs[1].mesh.position);knowledge.position.y+=.025;group.add(knowledge);
    const cells=[],linePoints=[];
    for(let i=0;i<5;i++){const a=i/5*Math.PI*2,p=new THREE.Vector3(Math.cos(a)*.027,Math.sin(a)*.021+.015,0),mat=ownMaterial(new THREE.MeshStandardMaterial({color:[0x91ac8c,0xc6b487,0x8bb6b3,0xb1bc8c,0xb8aaa0][i],roughness:.97,side:THREE.DoubleSide,transparent:true,opacity:0,emissive:0x3c543f,emissiveIntensity:.08})),mesh=new THREE.Mesh(leaf,mat);mesh.position.copy(p);mesh.scale.set(.018,.026,1);mesh.rotation.z=a-.7;knowledge.add(mesh);cells.push(mesh);linePoints.push(new THREE.Vector3(0,0,0),p);}
    const links=new THREE.LineSegments(ownGeometry(new THREE.BufferGeometry().setFromPoints(linePoints)),ownMaterial(new THREE.LineBasicMaterial({color:0xb9c49d,transparent:true,opacity:0})));knowledge.add(links);
    report.stations.push({id:walk.id,family:walk.id,name:walk.name,position:walk.positions[0].toArray()});for(const points of walk.segments){report.routeRanges.push({family:walk.id,start:report.route.length,count:points.length});report.route.push(...points);}
    families.set(walk.id,{walk,group,welcome,welcomeMaterial,secondary,paths,orbs,knowledge,cells,links});
  }
  let hoverTimer,lastHovered=null,down=null,disposed=false;
  function choose(family){if(!families.has(family))return;state.family=family;state.time=state.playing?3:21;state.manual=false;apply();requestRender();}
  function hit(event){const rect=stage.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(pickables,false)[0]?.object.userData.family||null;}
  document.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};},{capture:true,signal:signal.signal});
  document.addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<6){const family=hit(e);if(family)choose(family);}down=null;},{capture:true,signal:signal.signal});
  document.addEventListener('pointermove',e=>{if(down||e.pointerType==='touch'||!state.visible)return;const family=hit(e);if(family===lastHovered)return;lastHovered=family;clearTimeout(hoverTimer);stage.dataset.showcaseHover=family||'';if(family)hoverTimer=setTimeout(()=>choose(family),220);},{capture:true,signal:signal.signal});
  stage.addEventListener('pointerleave',()=>{clearTimeout(hoverTimer);lastHovered=null;stage.dataset.showcaseHover='';},{signal:signal.signal});
  function apply(){const pose=showcasePose(state.time);root.visible=state.visible;
    for(const [id,f]of families){const active=id===state.family;f.group.visible=active&&pose.alpha>.001;f.welcomeMaterial.emissiveIntensity=active?pose.welcome:.03;
      if(!active)continue;f.secondary.forEach(m=>m.scale.fromArray(m.userData.baseScale).multiplyScalar(pose.stops));
      f.paths.forEach((m,i)=>{m.material.uniforms.uProgress.value=Math.max(0,Math.min(1,pose.path*2-i));m.material.uniforms.uAlpha.value=pose.alpha;});
      f.orbs.forEach(({mesh,opening},i)=>{mesh.visible=pose.orbs>.001;mesh.material.opacity=pose.orbs;opening.value=i===1?pose.open:0;});
      f.knowledge.visible=pose.open>.01;f.knowledge.quaternion.copy(camera.quaternion);f.knowledge.scale.setScalar(.7+.3*pose.open);f.cells.forEach(m=>m.material.opacity=pose.open*.82);f.links.material.opacity=pose.open*.35;
    }
    const rect=stage.getBoundingClientRect(),bar=document.querySelector('.inspection-controls')?.getBoundingClientRect();ui.style.setProperty('--showcase-bottom',Math.max(84,bar?rect.bottom-bar.top+12:84)+'px');stage.dataset.nlPresentation='animated-showcase';stage.dataset.showcaseFamily=state.family;stage.dataset.showcasePhase=pose.time.toFixed(2);stage.dataset.showcaseOpen=pose.open.toFixed(3);stage.dataset.showcasePlaying=String(state.playing);
  }
  function tick(dt){if(disposed)return false;if(state.playing&&!state.manual){state.time+=Math.min(.1,Math.max(0,dt));if(state.time>=SHOWCASE_SECONDS){state.time%=SHOWCASE_SECONDS;state.family=order[(order.indexOf(state.family)+1)%order.length];}}apply();return state.visible&&state.playing&&!state.manual;}
  play.onclick=()=>{state.playing=!state.playing;state.manual=false;syncPlay();apply();requestRender();};ui.querySelector('[data-replay]').onclick=()=>{state.time=0;state.playing=!reduced.matches;state.manual=false;syncPlay();apply();requestRender();};
  reduced.addEventListener('change',()=>{if(reduced.matches){state.playing=false;state.time=0;syncPlay();apply();requestRender();}},{signal:signal.signal});
  const controller={root,report,tick,choose,get state(){return {...state,pose:showcasePose(state.time)};},get routes(){return walks.map(w=>({id:w.id,complete:w.segments.every(s=>s.length>1),segments:w.segments}));},setVisible(on){state.visible=Boolean(on);apply();requestRender();return Promise.resolve(report);},setPresentation(time,growth=1,alpha=1){state.manual=true;state.time=time;state.visible=alpha>0;apply();requestRender();},setTime(time){this.setPresentation(time);},setFamily(family){choose(family);},dispose(){disposed=true;clearTimeout(hoverTimer);signal.abort();scene.remove(root);ui.remove();css.remove();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());if(window.heroNourishland===controller)delete window.heroNourishland;}};
  window.heroNourishland=controller;syncPlay();apply();requestRender();return controller;
}
