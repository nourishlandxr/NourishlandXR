import * as THREE from './nlxr/vendor/three.module.min.js';
import {BIOME_WALKS,createDiscoveryState,findGroundRoute} from './biome-discovery-model.js';

export function installBiomeDiscovery({scene,camera,stage,plan,height,requestRender,focusBiome}){
  const state=createDiscoveryState(),group=new THREE.Group();group.name='Nourishland / quiet discovery';scene.add(group);
  const life=new AbortController(),signal=life.signal,walks=new Map(),targets=[],projected=new THREE.Vector3(),terrain=[];
  const ui=document.createElement('div');ui.className='nl-discovery';ui.innerHTML=`
    <button class="nd-map nd-icon" aria-label="Choose a biome walk" title="Choose a biome walk" aria-expanded="false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z M9 3v16 M15 5v16"/></svg></button>
    <nav class="nd-picker" aria-label="Biome walks" hidden>${BIOME_WALKS.map(w=>`<button type="button" data-choose="${w.id}">${w.name}<span aria-hidden="true">↗</span></button>`).join('')}</nav>
    <div class="nd-markers"></div><aside class="nd-card" aria-label="Biome discovery" hidden></aside>
    <p class="nd-announcement" role="status" aria-live="polite"></p>`;
  stage.parentElement.append(ui);
  const css=document.createElement('style');css.textContent=`
    .nl-discovery{position:absolute;inset:0;z-index:25;pointer-events:none;color:#1a392d;font:14px/1.5 system-ui,sans-serif}
    .nl-discovery [hidden]{display:none!important}.nl-discovery button{font:inherit;cursor:pointer;pointer-events:auto;border:1px solid #c4cebf;background:#f5f3e9;color:#1a392d;min-height:44px;border-radius:8px}
    .nl-discovery button:focus-visible{outline:3px solid #a87042;outline-offset:4px}.nd-icon{width:44px;height:44px;display:inline-grid;place-items:center;font-size:22px!important;flex-shrink:0}
    .nd-map{position:absolute;left:18px;bottom:92px;box-shadow:0 3px 18px #10291b26}.nd-picker{position:absolute;left:18px;bottom:144px;width:220px;padding:8px;background:#f5f3e9f5;border:1px solid #c4cebf;border-radius:12px;pointer-events:auto;box-shadow:0 8px 25px #10291b25}
    .nd-picker button{display:flex;justify-content:space-between;align-items:center;width:100%;padding:8px 12px;border:0}.nd-picker button:hover{background:#e2e8dc}
    .nd-marker{position:absolute;left:0;top:0;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%!important;display:grid;place-items:center;transition:background .15s,opacity .15s;box-shadow:0 2px 12px #10291b26;background:#f5f3e9e8!important;font-size:16px!important}
    .nd-marker[data-kind=orb]{width:36px;min-height:44px;height:44px;border:0;background:transparent!important;box-shadow:none;font-size:0!important}.nd-marker[data-kind=orb]::before{content:'';width:15px;height:15px;border-radius:50%;background:var(--orb-color,#e6c38b);box-shadow:inset -3px -3px 5px #2a493e45,inset 2px 2px 4px #ffffffae,0 1px 8px #10291b44}
    .nd-marker[aria-pressed=true]{border:2px solid #365b49;background:#dce7d2!important}.nd-marker:hover::after,.nd-marker:focus-visible::after{content:attr(data-label);position:absolute;bottom:48px;left:50%;transform:translateX(-50%);width:max-content;max-width:180px;padding:5px 9px;background:#f5f3e9;border-radius:5px;font:12px/1.4 system-ui;box-shadow:0 2px 10px #10291b22;pointer-events:none}
    .nd-marker:not([data-kind=orb]){background:radial-gradient(circle,#f1eee0e8 0 15px,transparent 16px)!important;border:0;box-shadow:none;font-size:14px!important}.nd-marker:not([data-kind=orb])[aria-pressed=true]{background:radial-gradient(circle,#234a39 0 15px,transparent 16px)!important;color:#fff;font-weight:700}
    .nd-card{position:absolute;left:18px;bottom:148px;width:min(330px,calc(100% - 36px));padding:18px;background:#f6f4eaf2;border:1px solid #c4cebf;border-radius:12px;pointer-events:auto;box-shadow:0 8px 30px #122d2329;backdrop-filter:blur(12px)}
    .nd-card .nd-eyebrow{font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 7px;color:#526457}.nd-card h2{font:600 22px/1.2 system-ui;margin:0 40px 10px 0;letter-spacing:-.025em}.nd-card p{margin:0 0 12px}.nd-card .nd-close{position:absolute;right:9px;top:9px;border:0;background:transparent}.nd-actions{display:flex;align-items:center;gap:8px}.nd-actions [data-enter]{padding:9px 14px;background:#224a39;color:#fff}.nd-actions .nd-count{margin-left:auto;font-size:12px;color:#526457}.nd-hint{font-size:12px;color:#526457}.nd-announcement{position:absolute;width:1px;height:1px;clip-path:inset(50%);overflow:hidden}
    @media(max-width:700px){.nd-card{bottom:140px;max-height:45dvh;overflow:auto}.nd-map{bottom:84px;left:12px}.nd-picker{bottom:136px;left:12px}.nd-marker{width:40px}.nd-card h2{font-size:20px}}
    .nd-map{bottom:var(--nd-bottom,92px)}.nd-card,.nd-picker{bottom:calc(var(--nd-bottom,92px) + 56px)}
    @media(prefers-reduced-motion:reduce){.nd-marker{transition:none}}
  `;document.head.append(css);
  const markers=ui.querySelector('.nd-markers'),card=ui.querySelector('.nd-card'),picker=ui.querySelector('.nd-picker'),map=ui.querySelector('.nd-map');
  const announce=text=>ui.querySelector('[role=status]').textContent=text;
  // Sample actual water triangles, rather than treating a pond's rectangular
  // bounds as water. This preserves paths along irregular banks.
  const waterBins=new Map(),waterCell=.12;
  scene.updateMatrixWorld(true);
  scene.traverse(mesh=>{
    if(mesh.isMesh&&['terrain','green_inner_wall','green_rim_collar'].includes(mesh.userData.role))terrain.push(mesh);
    if(!mesh.isMesh||mesh.isInstancedMesh||!mesh.visible||mesh.userData.role!=='water')return;
    const g=mesh.geometry,p=g?.attributes.position,idx=g?.index;if(!p)return;
    const count=idx?.count??p.count;
    for(let i=0;i<count;i+=3){const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,idx?idx.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
      const den=(v[1].z-v[2].z)*(v[0].x-v[2].x)+(v[2].x-v[1].x)*(v[0].z-v[2].z);if(Math.abs(den)<1e-12)continue;
      const t={v,den};for(let x=Math.floor(Math.min(...v.map(p=>p.x))/waterCell);x<=Math.floor(Math.max(...v.map(p=>p.x))/waterCell);x++)for(let z=Math.floor(Math.min(...v.map(p=>p.z))/waterCell);z<=Math.floor(Math.max(...v.map(p=>p.z))/waterCell);z++){const key=x+','+z,list=waterBins.get(key)||[];list.push(t);waterBins.set(key,list);}
    }
  });
  function dryHeight(x,z){const h=height(x,z,NaN);if(!Number.isFinite(h))return NaN;
    for(const {v:[a,b,c],den}of waterBins.get(Math.floor(x/waterCell)+','+Math.floor(z/waterCell))||[]){const u=((b.z-c.z)*(x-c.x)+(c.x-b.x)*(z-c.z))/den,w=((c.z-a.z)*(x-c.x)+(a.x-c.x)*(z-c.z))/den;if(u>=0&&w>=0&&u+w<=1&&u*a.y+w*b.y+(1-u-w)*c.y>h+.001)return NaN;}
    return h;
  }
  const pieces=plan.pieces.map(p=>({...p,p:new THREE.Vector3(...p.label_position)}));
  const familyAt=(x,z)=>pieces.reduce((a,b)=>Math.hypot(x-a.p.x,z-a.p.z)<Math.hypot(x-b.p.x,z-b.p.z)?a:b).family_id;
  const neutral=new THREE.MeshStandardMaterial({color:0xded7be,roughness:.95,metalness:0}),wood=new THREE.MeshStandardMaterial({color:0x526750,roughness:1});
  const geometries={post:new THREE.CylinderGeometry(.006,.009,.085,7),head:new THREE.TorusGeometry(.015,.0035,5,12),orb:new THREE.SphereGeometry(.010,10,7)};
  function anchor(piece,id){const candidates=[piece.p,...(piece.label_candidates||[]).map(p=>new THREE.Vector3(...p))];
    for(let r=0;r<=.22;r+=.035)for(let a=0;a<8;a++)candidates.push(new THREE.Vector3(piece.p.x+Math.cos(a*Math.PI/4)*r,0,piece.p.z+Math.sin(a*Math.PI/4)*r));
    return candidates.find(p=>Number.isFinite(dryHeight(p.x,p.z))&&familyAt(p.x,p.z)===id)?.clone();
  }
  function totem(p,color,welcome){const node=new THREE.Group();node.position.copy(p);const stem=new THREE.Mesh(geometries.post,wood);stem.position.y=.042;node.add(stem);const halo=new THREE.Mesh(geometries.head,neutral);halo.position.y=.09;node.add(halo);
    const seed=new THREE.Mesh(geometries.orb,new THREE.MeshStandardMaterial({color,roughness:.9}));seed.scale.set(.6,1,.45);seed.rotation.z=-.45;seed.position.y=.09;node.add(seed);if(welcome){const foot=new THREE.Mesh(new THREE.CylinderGeometry(.032,.036,.004,20),neutral);foot.position.y=.002;node.add(foot);}group.add(node);return node;
  }
  function target(kind,p,label,walk,index,orb){const button=document.createElement('button');button.type='button';button.className='nd-marker';button.dataset.kind=kind;button.dataset.label=label;button.setAttribute('aria-label',label);button.textContent=kind==='welcome'?'⌂':kind==='stop'?String(index+1):'';button.dataset.walk=walk.id;if(index!==undefined)button.dataset.stop=index;if(orb!==undefined)button.dataset.orb=orb;
    button.addEventListener('click',()=>{if(kind==='welcome')activate(walk.id);else if(kind==='stop')chooseStop(index);else chooseOrb(orb);},{signal});
    if(kind==='welcome'){button.addEventListener('pointerenter',()=>preview(walk.id),{signal});button.addEventListener('focus',()=>preview(walk.id),{signal});button.addEventListener('pointerleave',()=>scheduleLeave(),{signal});button.addEventListener('blur',()=>scheduleLeave(),{signal});}
    markers.append(button);const value={kind,p,walk:walk.id,index,orb,button,shown:false};targets.push(value);return value;
  }
  function ribbon(points,color){if(points.length<2)return null;const pos=[],idx=[];
    for(let i=0;i<points.length;i++){const p=new THREE.Vector3(...points[i]),a=new THREE.Vector3(...points[Math.max(0,i-1)]),b=new THREE.Vector3(...points[Math.min(points.length-1,i+1)]),side=new THREE.Vector3(-(b.z-a.z),0,b.x-a.x).normalize().multiplyScalar(.0035);
      for(const sign of [-1,1]){const q=p.clone().addScaledVector(side,sign);q.y=height(q.x,q.z,p.y)+.0028;pos.push(...q.toArray());}if(i){const n=i*2;idx.push(n-2,n-1,n,n-1,n+1,n);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.56,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));mesh.userData.role='discovery-path';mesh.visible=false;group.add(mesh);return mesh;
  }
  for(const walk of BIOME_WALKS){const positions=walk.pieces.map(id=>anchor(pieces.find(p=>p.id===id),walk.id));if(positions.some(p=>!p))continue;positions.forEach(p=>p.y=dryHeight(p.x,p.z));
    const planned=[];
    const connect=(a,b)=>findGroundRoute(a.toArray(),b.toArray(),{height:dryHeight,allowed:(x,z)=>familyAt(x,z)===walk.id});
    for(let i=1;i<positions.length;i++){
      let points=connect(positions[i-1],positions[i]);
      if(!points.length){
        // Wetland stops can share a connected bank rather than insisting on
        // visiting an isolated island. Keep them meaningfully separated.
        const origin=positions[i-1],candidates=[];
        for(const radius of [.14,.21,.28,.35])for(let j=0;j<16;j++){const p=new THREE.Vector3(origin.x+Math.cos(j*Math.PI/8)*radius,0,origin.z+Math.sin(j*Math.PI/8)*radius);p.y=dryHeight(p.x,p.z);if(Number.isFinite(p.y)&&familyAt(p.x,p.z)===walk.id&&positions.slice(0,i).every(q=>q.distanceTo(p)>.10))candidates.push(p);}
        candidates.sort((a,b)=>a.distanceTo(positions[i])-b.distanceTo(positions[i]));
        for(const p of candidates){const route=connect(origin,p);if(route.length>=5){positions[i]=p;points=route;break;}}
      }
      planned.push(points);
    }
    const welcome=totem(positions[0],walk.color,true);target('welcome',positions[0].clone().add(new THREE.Vector3(0,.11,0)),walk.name+' · welcome',walk);
    const stops=positions.map((p,i)=>{const node=i?totem(p,walk.color,false):null;if(node)node.visible=false;const marker=i?target('stop',p.clone().add(new THREE.Vector3(0,.11,0)),walk.stops[i].name,walk,i):null;return {node,marker,orbs:[]};});
    for(let i=0;i<positions.length;i++)for(let j=0;j<3;j++){const base=positions[i],angle=(j-1)*.8+Math.atan2(base.z+.2417,base.x-.125),q=base.clone().add(new THREE.Vector3(Math.cos(angle)*.052,0,Math.sin(angle)*.052));const h=dryHeight(q.x,q.z);if(!Number.isFinite(h)||familyAt(q.x,q.z)!==walk.id)continue;q.y=h+.02;const mat=new THREE.MeshStandardMaterial({color:[0xd9bd8b,0xadc7bf,0xc4b89d][j],roughness:.93}),node=new THREE.Mesh(geometries.orb,mat);node.position.copy(q);node.visible=false;group.add(node);const marker=target('orb',q.clone(),walk.stops[i].orbs[j],walk,i,j);marker.button.style.setProperty('--orb-color',['#d9bd8b','#adc7bf','#c4b89d'][j]);stops[i].orbs.push({node,marker});}
    const routes=planned.map(points=>({mesh:ribbon(points,walk.color),points}));
    walks.set(walk.id,{...walk,content:walk.stops,positions,welcome,stops,routes});
  }
  let leaveTimer,hoverTimer,lastKey='',lastOcclusion=-Infinity,occlusionDirty=true;const occlusion=new THREE.Raycaster();
  function preview(id){clearTimeout(leaveTimer);clearTimeout(hoverTimer);if(state.value.active)return;hoverTimer=setTimeout(()=>{state.preview(id);sync();},160);}
  function scheduleLeave(){clearTimeout(hoverTimer);clearTimeout(leaveTimer);leaveTimer=setTimeout(()=>{state.preview(null);sync();},220);}
  card.addEventListener('pointerenter',()=>clearTimeout(leaveTimer),{signal});card.addEventListener('pointerleave',scheduleLeave,{signal});
  function activate(id){if(!walks.has(id))return;clearTimeout(hoverTimer);clearTimeout(leaveTimer);state.activate(id);picker.hidden=true;map.setAttribute('aria-expanded','false');sync();announce(walks.get(id).name+' walk open. Choose a stop or a plant orb.');}
  function chooseStop(i){if(!state.value.active)return;state.selectStop(i);sync();announce('Stop '+(state.value.stop+1)+': '+walks.get(state.value.active).content[state.value.stop].name);}
  function chooseOrb(i){state.selectOrb(i);sync();}
  function close(){clearTimeout(hoverTimer);clearTimeout(leaveTimer);state.close();sync();announce('Walk closed. Choose another welcome area.');}
  function sync(){const value=state.value;
    for(const [id,w]of walks){const active=id===value.active;w.welcome.visible=true;for(const r of w.routes)if(r.mesh)r.mesh.visible=id===value.visible;for(let i=0;i<w.stops.length;i++){const stop=w.stops[i];if(stop.node)stop.node.visible=active;for(const orb of stop.orbs)orb.node.visible=active&&value.stop===i;}}
    stage.dataset.discoveryState=value.active?'active':value.preview?'preview':'quiet';stage.dataset.discoveryBiome=value.visible||'';
    lastKey='';updateCard();tick(performance.now());requestRender();
  }
  function updateCard(){const value=state.value,w=walks.get(value.visible);if(!w){card.hidden=true;return;}card.hidden=false;
    const active=Boolean(value.active),stop=w.content[value.stop],orb=value.orb===null?null:stop.orbs[value.orb];
    const unavailable=w.routes.some(r=>!r.mesh);
    card.innerHTML=`<button class="nd-icon nd-close" data-close aria-label="Close biome walk" title="Close">×</button><p class="nd-eyebrow">${active?'Discovery walk · '+w.name:'Welcome · '+w.name}</p><h2>${active?orb||stop.name:w.name}</h2><p>${active?orb?'Look closely: what can you observe about '+orb.toLowerCase()+' here?':stop.question:'Follow three stops through this biome.'}</p><p class="nd-hint">${unavailable?'Some ground connections are not yet walkable in this model. Use the stop controls.':active?'Select a nearby orb to explore a topic.':'Preview route · select to keep it open.'}${active?' Concept walk · learning content in development.':''}</p><div class="nd-actions">${active?`<button class="nd-icon" data-prev aria-label="Previous stop" title="Previous stop" ${value.stop===0?'disabled':''}>←</button><button class="nd-icon" data-next aria-label="Next stop" title="Next stop" ${value.stop===2?'disabled':''}>→</button><button class="nd-icon" data-focus aria-label="View current stop" title="View current stop">⌖</button><span class="nd-count">${value.stop+1} / 3</span>`:'<button data-enter>Explore this biome ↗</button>'}</div>`;
    card.querySelector('[data-close]').onclick=close;card.querySelector('[data-enter]')?.addEventListener('click',()=>activate(w.id));
    card.querySelector('[data-prev]')?.addEventListener('click',()=>chooseStop(value.stop-1));card.querySelector('[data-next]')?.addEventListener('click',()=>chooseStop(value.stop+1));card.querySelector('[data-focus]')?.addEventListener('click',()=>focusBiome(w.positions[value.stop],.55));
  }
  map.onclick=()=>{picker.hidden=!picker.hidden;map.setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden)picker.querySelector('button')?.focus();};
  picker.querySelectorAll('[data-choose]').forEach(button=>{button.onclick=()=>{activate(button.dataset.choose);const w=walks.get(button.dataset.choose);if(w)focusBiome(w.positions[0],.75);};});
  ui.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!picker.hidden){picker.hidden=true;map.setAttribute('aria-expanded','false');map.focus();}else{close();map.focus();}event.stopPropagation();}},{signal});
  window.addEventListener('nl-presentation-change',event=>{if(event.detail?.mode==='central')close();},{signal});
  function tick(time=0){const value=state.value;camera.updateMatrixWorld(true);const rect=stage.getBoundingClientRect(),controls=document.querySelector('.inspection-controls')?.getBoundingClientRect();ui.style.setProperty('--nd-bottom',Math.max(84,controls?rect.bottom-controls.top+12:84)+'px');const key=camera.matrixWorld.elements.join(',')+'|'+camera.projectionMatrix.elements.join(',')+'|'+rect.width+'|'+rect.height+'|'+controls?.height+'|'+JSON.stringify(value);if(key!==lastKey)occlusionDirty=true;if(key===lastKey&&!occlusionDirty)return;lastKey=key;
    const testOcclusion=time-lastOcclusion>250;if(testOcclusion){lastOcclusion=time;occlusionDirty=false;}
    for(const t of targets){let visible=t.kind==='welcome'||value.active===t.walk&&(t.kind==='stop'||value.stop===t.index);projected.copy(t.p).project(camera);visible=visible&&projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.96&&Math.abs(projected.y)<.91;
      if(visible&&testOcclusion){const dir=t.p.clone().sub(camera.position),distance=dir.length();occlusion.set(camera.position,dir.normalize());occlusion.far=distance-.012;t.occluded=Boolean(occlusion.intersectObjects(terrain,false)[0]);}visible=visible&&!t.occluded;
      t.button.hidden=!visible;t.button.style.left=(projected.x*.5+.5)*rect.width+'px';t.button.style.top=(-projected.y*.5+.5)*rect.height+'px';t.button.setAttribute('aria-pressed',String(t.kind==='welcome'?value.active===t.walk:t.kind==='stop'?value.stop===t.index:value.orb===t.orb));
    }
  }
  sync();
  const api={get state(){return state.value;},get routes(){return [...walks].map(([id,w])=>({id,stops:w.positions.map(p=>p.toArray()),segments:w.routes.map(r=>r.points),complete:w.routes.every(r=>r.mesh)}));},preview(id){state.preview(id);sync();},activate,selectStop:chooseStop,close,tick,aim(id){preview(id);},selectAimed(id){activate(id);},destroy(){clearTimeout(leaveTimer);clearTimeout(hoverTimer);life.abort();ui.remove();css.remove();scene.remove(group);const gs=new Set(),ms=new Set();group.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
  return api;
}
