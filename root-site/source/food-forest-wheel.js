// Original botanical artwork as a slowly turning mineral relief, with authored views.
export const WHEEL_VIEWS=Object.freeze({
 overview:{zoom:1,x:0,y:0,rx:-.08,ry:0,rz:0},
 story:{zoom:1.06,x:0,y:0,rx:-.16,ry:.12,rz:-.12},
 guide:{zoom:1.08,x:0,y:0,rx:.14,ry:-.16,rz:.18},
 hillyards:{zoom:1.06,x:0,y:0,rx:-.12,ry:.2,rz:-.2},
 layers:{zoom:1.85,x:-.35,y:.95,rx:-.24,ry:.22,rz:-.25},
 relationships:{zoom:2.05,x:.25,y:-1.05,rx:.24,ry:-.22,rz:.3},
 seasons:{zoom:2.1,x:1,y:-.35,rx:-.14,ry:-.28,rz:-.48}
});
export async function mountOriginalWheel(host){
 const T=await import('./orb/three.mjs'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,30),wheel=new T.Group();scene.add(wheel,new T.HemisphereLight(0xfff7e8,0x5c7255,1.7));
 for(const [x,y,z,intensity]of [[-3,5,6,2.4],[4,0,4,.65]]){const light=new T.DirectionalLight(0xffefcf,intensity);light.position.set(x,y,z);scene.add(light);}
 let active=true,disposed=false,raf=0,last=0,angle=0,topic='overview',distance=6.8;
 const view={...WHEEL_VIEWS.overview};
 const texture=await new T.TextureLoader().loadAsync('/xr/v2/assets/hero-wheel.png');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const image=document.createElement('canvas');image.width=image.height=160;const context=image.getContext('2d',{willReadFrequently:true});context.drawImage(texture.image,0,0,160,160);const pixels=context.getImageData(0,0,160,160).data;
 const geometry=new T.PlaneGeometry(3.8,3.8,159,159),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const a=pixels[i*4+3]/255,l=(pixels[i*4]*.21+pixels[i*4+1]*.72+pixels[i*4+2]*.07)/255;p.setZ(i,a*(.07+l*.16));}geometry.computeVertexNormals();
 const grainBytes=new Uint8Array(64*64*4);let seed=21839;for(let i=0;i<grainBytes.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=112+(seed>>>24)*.08;grainBytes[i]=grainBytes[i+1]=grainBytes[i+2]=value;grainBytes[i+3]=255;}
 const grain=new T.DataTexture(grainBytes,64,64,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(6,6);grain.needsUpdate=true;
 const material=new T.MeshStandardMaterial({map:texture,color:0xeee7d5,transparent:true,alphaTest:.04,roughness:.98,metalness:0,bumpMap:grain,bumpScale:.025,side:T.DoubleSide});wheel.add(new T.Mesh(geometry,material));
 const focus=new T.Vector3();
 function schedule(){if(!raf&&active&&!disposed&&!document.hidden)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(!active||disposed||document.hidden)return;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  if(!reduced.matches)angle+=dt*(topic==='overview'?.045:.008);
  const target=WHEEL_VIEWS[topic],ease=reduced.matches?1:1-Math.exp(-dt*4.4);let settling=false;
  for(const key of Object.keys(view)){view[key]+=(target[key]-view[key])*ease;if(Math.abs(target[key]-view[key])>.0001)settling=true;}
  wheel.rotation.set(view.rx,view.ry,angle+view.rz);wheel.updateMatrixWorld();focus.set(view.x,view.y,0).applyMatrix4(wheel.matrixWorld);
  // Bound the view by the original artwork's circular footprint. Close views
  // change the angle and approach gently, without losing the wheel's edge.
  const zoom=Math.min(view.zoom,1.08),safeDistance=Math.max(distance,6.5*zoom/Math.min(1,camera.aspect));
  camera.position.set(focus.x,focus.y,safeDistance);camera.lookAt(focus.x,focus.y,0);camera.zoom=zoom;camera.updateProjectionMatrix();renderer.render(scene,camera);
  host.dataset.wheelAngle=angle.toFixed(4);host.dataset.wheelZoom=view.zoom.toFixed(3);host.dataset.wheelView=topic;
  if(!reduced.matches||settling)schedule();else last=0;
 }
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;distance=Math.max(6.8,6.8/Math.min(1,camera.aspect));camera.updateProjectionMatrix();schedule();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
 const motion=()=>{last=0;schedule();};reduced.addEventListener('change',motion);
 host.querySelector('img').hidden=true;host.dataset.wheelReady='true';host.dataset.finish='ceramic';resize();
 return {setTopic(key){topic=WHEEL_VIEWS[key]?key:'overview';schedule();},setActive(value){active=value;if(!value){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();},destroy(){disposed=true;observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);cancelAnimationFrame(raf);texture.dispose();grain.dispose();geometry.dispose();material.dispose();renderer.dispose();canvas.remove();}};
}
