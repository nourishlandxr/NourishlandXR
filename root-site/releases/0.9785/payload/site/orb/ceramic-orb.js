// The current NL Organic V3 shell: 18 adjoining cells, with a matte mineral finish.
// This presentation adapter does not import Creator, XR, account services or the biome.
export async function createCeramicOrb(canvas,{reduced}){
 const T=await import("./three.mjs?v=0.9785"),{createOrganicOrbGeometry}=await import("./organicOrbGeometry.mjs?v=0.9785");
 const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.1,20);camera.position.set(0,.1,5.1);
 scene.add(new T.HemisphereLight(0xfff6df,0x455e4f,2.2));
 for(const [color,intensity,pos] of [[0xffe6bc,3,[-3,5,5]],[0xc9e0df,1.1,[4,1,2]],[0xfffaf0,1.9,[-1,2,-4]]]){const light=new T.DirectionalLight(color,intensity);light.position.set(...pos);scene.add(light)}
 const source=createOrganicOrbGeometry('medium'),p=[],n=[],uv=[];
 for(let i=0;i<source.vertices.length;i+=10){const v=source.vertices;p.push(v[i],v[i+1],v[i+2]);n.push(v[i+3],v[i+4],v[i+5]);uv.push(.5+Math.atan2(v[i+2],v[i])/(Math.PI*2),.5-Math.asin(T.MathUtils.clamp(v[i+1]/Math.hypot(v[i],v[i+1],v[i+2]),-1,1))/Math.PI)}
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(n,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(new T.BufferAttribute(source.indices,1));
 const grainData=new Uint8Array(128*128*4);let seed=218391;
 for(let i=0;i<grainData.length;i+=4){seed=(1664525*seed+1013904223)>>>0;const value=112+(seed>>>24)*.11;grainData[i]=grainData[i+1]=grainData[i+2]=value;grainData[i+3]=255}
 const grain=new T.DataTexture(grainData,128,128,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(5,4);grain.needsUpdate=true;
 const material=new T.MeshStandardMaterial({color:0xe8dabd,roughness:.8,metalness:0,bumpMap:grain,bumpScale:.025});
 const shell=new T.Mesh(geometry,material),group=new T.Group();group.add(shell);scene.add(group);
 const core=new T.Mesh(new T.SphereGeometry(.91,24,16),new T.MeshStandardMaterial({color:0x6f825a,roughness:.9}));group.add(core);
 let active=false,raf=0,previous=0,opening=0,target=0,time=0,dirty=true,disposed=false,manualRotation=false,yaw=0,pitch=0,manualHeight=0;
 const size=()=>{const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;renderer.setSize(box.width,box.height,false);camera.aspect=box.width/box.height;camera.updateProjectionMatrix();dirty=true;schedule()};
 const resize=new ResizeObserver(size);resize.observe(canvas);
 function schedule(){if(!raf&&!disposed)raf=requestAnimationFrame(draw)}
 function draw(now){raf=0;if(disposed)return;const dt=previous?Math.min(.05,(now-previous)/1000):1/60;previous=now;
  if(active&&!reduced.matches&&!manualRotation){time+=dt;dirty=true}
  const next=reduced.matches?target:opening+(target-opening)*(1-Math.exp(-dt*8));
  if(Math.abs(next-opening)>.00001){opening=next;const v=source.vertices,positions=geometry.attributes.position;for(let i=0;i<positions.count;i++){const j=i*10;positions.setXYZ(i,v[j]+v[j+6]*opening*.24,v[j+1]+v[j+7]*opening*.24,v[j+2]+v[j+8]*opening*.24)}positions.needsUpdate=true;dirty=true}
  group.rotation.set(.17+pitch+(manualRotation?0:Math.sin(time*.22)*.04),yaw+(manualRotation?0:time*.09),.12);group.position.y=reduced.matches?0:manualRotation?manualHeight:Math.sin(time*.7)*.035;
  if(dirty){renderer.render(scene,camera);dirty=false}
  if(active&&!reduced.matches&&!manualRotation||Math.abs(target-opening)>.0001)schedule();else previous=0;
 }
 function motionChanged(){dirty=true;schedule()}
 reduced.addEventListener('change',motionChanged);size();
 return {rotateBy(x,y){if(!manualRotation){yaw+=time*.09;pitch+=Math.sin(time*.22)*.04;manualHeight=reduced.matches?0:Math.sin(time*.7)*.035}manualRotation=true;yaw+=x;pitch=T.MathUtils.clamp(pitch+y,-1.2,1.2);dirty=true;schedule()},setOpen(value){target=value?1:0;dirty=true;schedule()},setActive(value){active=value;if(active){dirty=true;schedule()}else{cancelAnimationFrame(raf);raf=0;previous=0}},dispose(){disposed=true;resize.disconnect();cancelAnimationFrame(raf);reduced.removeEventListener('change',motionChanged);geometry.dispose();material.dispose();core.geometry.dispose();core.material.dispose();grain.dispose();renderer.dispose()}};
}
