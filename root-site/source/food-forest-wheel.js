// Retain the original botanical artwork as a touch-turnable ceramic relief.
// This small scene does not load the full biome model or any XR controllers.
export async function mountOriginalWheel(host){
 const T=await import('./orb/three.mjs'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 const canvas=renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('role','group');canvas.setAttribute('aria-label','Original Nourishland food forest wheel. Drag sideways or use arrow keys to spin.');host.append(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,30),wheel=new T.Group();scene.add(wheel,new T.HemisphereLight(0xfff7e8,0x5c7255,1.7));
 for(const [x,y,z,intensity]of [[-3,5,6,2.4],[4,0,4,.65]]){const light=new T.DirectionalLight(0xffefcf,intensity);light.position.set(x,y,z);scene.add(light);}
 let active=true,disposed=false,raf=0,last=0,angle=0,target=0,velocity=0,drag=null;
 const texture=await new T.TextureLoader().loadAsync('/xr/v2/assets/hero-wheel.png');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const image=document.createElement('canvas');image.width=image.height=160;const context=image.getContext('2d',{willReadFrequently:true});context.drawImage(texture.image,0,0,160,160);const pixels=context.getImageData(0,0,160,160).data;
 const geometry=new T.PlaneGeometry(3.8,3.8,159,159),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const a=pixels[i*4+3]/255,l=(pixels[i*4]*.21+pixels[i*4+1]*.72+pixels[i*4+2]*.07)/255;p.setZ(i,a*(.07+l*.16));}geometry.computeVertexNormals();
 const grainBytes=new Uint8Array(64*64*4);let seed=21839;for(let i=0;i<grainBytes.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=112+(seed>>>24)*.08;grainBytes[i]=grainBytes[i+1]=grainBytes[i+2]=value;grainBytes[i+3]=255;}
 const grain=new T.DataTexture(grainBytes,64,64,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(6,6);grain.needsUpdate=true;
 const material=new T.MeshStandardMaterial({map:texture,color:0xe6dec7,transparent:true,alphaTest:.04,roughness:.98,metalness:0,bumpMap:grain,bumpScale:.025,side:T.DoubleSide});wheel.add(new T.Mesh(geometry,material));wheel.rotation.x=-.08;
 function schedule(){if(!raf&&active&&!disposed&&!document.hidden)raf=requestAnimationFrame(draw);}
 function draw(now){raf=0;if(!active||disposed||document.hidden)return;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;if(!drag&&!reduced.matches){target+=velocity*dt;velocity*=Math.exp(-dt*3.4);}angle+=(target-angle)*(reduced.matches?1:1-Math.exp(-dt*14));wheel.rotation.z=angle;renderer.render(scene,camera);host.dataset.wheelAngle=angle.toFixed(4);if(drag||Math.abs(target-angle)>.0001||Math.abs(velocity)>.001)schedule();else last=0;}
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.position.set(0,0,Math.max(6.8,6.8/Math.min(1,camera.aspect)));camera.updateProjectionMatrix();schedule();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 const abort=new AbortController(),on=(type,fn)=>canvas.addEventListener(type,fn,{signal:abort.signal});canvas.style.touchAction='pan-y';
 on('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,time:performance.now()};velocity=0;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
 on('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const now=performance.now(),delta=(e.clientX-drag.x)*.009;target+=delta;velocity=reduced.matches?0:Math.max(-2,Math.min(2,delta/Math.max(.016,(now-drag.time)/1000)));drag={id:e.pointerId,x:e.clientX,time:now};schedule();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])on(event,e=>{if(drag&&e.pointerId===drag.id){if(e.type==='pointercancel')velocity=0;drag=null;schedule();}});
 on('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();target+=e.key==='ArrowLeft'?-.25:.25;velocity=0;schedule();});
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();};document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',()=>{velocity=0;schedule();});
 host.querySelector('img').hidden=true;host.dataset.wheelReady='true';host.dataset.finish='ceramic';resize();
 return {setActive(value){active=value;if(!value){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();},destroy(){disposed=true;abort.abort();observer.disconnect();document.removeEventListener('visibilitychange',visibility);cancelAnimationFrame(raf);texture.dispose();grain.dispose();geometry.dispose();material.dispose();renderer.dispose();canvas.remove();}};
}
