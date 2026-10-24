// Original botanical artwork as a slowly turning mineral relief, with authored views.
export const WHEEL_VIEWS=Object.freeze({
 overview:{depth:0,wheelX:.5,wheelY:.5,copyX:.5,copyY:.5,rx:-.08,ry:0},
 story:{depth:1,wheelX:.24,wheelY:.49,copyX:.76,copyY:.48,rx:-.12,ry:.14},
 guide:{depth:1,wheelX:.76,wheelY:.49,copyX:.24,copyY:.48,rx:.10,ry:-.14},
 hillyards:{depth:1,wheelX:.25,wheelY:.46,copyX:.76,copyY:.48,rx:-.07,ry:.09}
});
export async function mountOriginalWheel(host){
 const T=await import("./orb/three.mjs?v=0.9819"),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const orbit=host.closest('[data-forest-orbit]');
 const renderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 const canvas=renderer.domElement;canvas.setAttribute('aria-hidden','true');host.append(canvas);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.1,30),wheel=new T.Group();scene.add(wheel,new T.HemisphereLight(0xfff7e8,0x5c7255,1.7));
 for(const [x,y,z,intensity]of [[-3,5,6,2.4],[4,0,4,.65]]){const light=new T.DirectionalLight(0xffefcf,intensity);light.position.set(x,y,z);scene.add(light);}
 let active=true,disposed=false,raf=0,last=0,angle=0,topic='overview';
 const view={...WHEEL_VIEWS.overview};
 const texture=await new T.TextureLoader().loadAsync('/xr/v2/assets/hero-wheel-v5.png');texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
 const image=document.createElement('canvas');image.width=image.height=160;const context=image.getContext('2d',{willReadFrequently:true});context.drawImage(texture.image,0,0,160,160);const pixels=context.getImageData(0,0,160,160).data;
 const geometry=new T.PlaneGeometry(3.8,3.8,159,159),p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){const a=pixels[i*4+3]/255,l=(pixels[i*4]*.21+pixels[i*4+1]*.72+pixels[i*4+2]*.07)/255;p.setZ(i,a*(.07+l*.16));}geometry.computeVertexNormals();
 // Fit the outline only in the overview. In a close view we travel through
 // the opening instead: the outer rim deliberately continues off screen.
 const edgeIndices=new Set();
 for(let row=0;row<160;row++){const visible=[];for(let col=0;col<160;col++)if(pixels[(row*160+col)*4+3]>8)visible.push(row*160+col);if(visible.length){edgeIndices.add(visible[0]);edgeIndices.add(visible.at(-1));}}
 for(let col=0;col<160;col++){const visible=[];for(let row=0;row<160;row++)if(pixels[(row*160+col)*4+3]>8)visible.push(row*160+col);if(visible.length){edgeIndices.add(visible[0]);edgeIndices.add(visible.at(-1));}}
 const outline=[...edgeIndices].map(i=>new T.Vector3().fromBufferAttribute(p,i)),projected=new T.Vector3();
 const center=new T.Vector3(0,0,0),centerProjection=new T.Vector3(),sample=new T.Vector3();
 let width=1,height=1;
 const grainBytes=new Uint8Array(64*64*4);let seed=21839;for(let i=0;i<grainBytes.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=112+(seed>>>24)*.08;grainBytes[i]=grainBytes[i+1]=grainBytes[i+2]=value;grainBytes[i+3]=255;}
 const grain=new T.DataTexture(grainBytes,64,64,T.RGBAFormat);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(6,6);grain.needsUpdate=true;
 const material=new T.MeshStandardMaterial({map:texture,color:0xeee7d5,transparent:true,alphaTest:.04,roughness:.98,metalness:0,bumpMap:grain,bumpScale:.025,side:T.DoubleSide});wheel.add(new T.Mesh(geometry,material));
 camera.position.set(0,0,6.8);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 function schedule(){if(!raf&&active&&!disposed&&!document.hidden)raf=requestAnimationFrame(draw);}
 function draw(now){
  raf=0;if(!active||disposed||document.hidden)return;const dt=last?Math.min(.25,(now-last)/1000):1/60;last=now;
  if(!reduced.matches)angle+=dt*.035;
  const target=WHEEL_VIEWS[topic],ease=reduced.matches?1:1-Math.exp(-dt*6);let settling=false;
  for(const key of Object.keys(view)){view[key]+=(target[key]-view[key])*ease;if(Math.abs(target[key]-view[key])>.0001)settling=true;}
  wheel.position.set(0,0,0);wheel.rotation.set(view.rx,view.ry,angle);wheel.updateMatrixWorld();
  camera.zoom=1;camera.updateProjectionMatrix();let left=Infinity,right=-Infinity,top=-Infinity,bottom=Infinity;
  for(const point of outline){projected.copy(point).applyMatrix4(wheel.matrixWorld).project(camera);left=Math.min(left,projected.x);right=Math.max(right,projected.x);top=Math.max(top,projected.y);bottom=Math.min(bottom,projected.y);}
  const stage=orbit.getBoundingClientRect(),frame=host.getBoundingClientRect();
  const overviewZoom=Math.min(stage.width*.88/Math.max(.001,(right-left)*width/2),Math.max(1,stage.height-100)*.88/Math.max(.001,(top-bottom)*height/2));
  // The close view behaves like a cinematic poster: the whole enlarged wheel
  // occupies one side and its OUTER rim becomes the boundary beside the copy.
  const outerWidth=Math.max(.001,(right-left)*width/2),outerHeight=Math.max(.001,(top-bottom)*height/2);
  const mobile=width<700,targetDiameter=1.4*Math.min(height*1.12,width*(mobile?.84:.64)),closeZoom=Math.min(targetDiameter/outerWidth,targetDiameter/outerHeight);
  const zoom=overviewZoom*Math.pow(Math.max(1,closeZoom/overviewZoom),view.depth);
  // Interpolate position once. Multiplying the interpolated position by
  // depth again produced a curved hitch at the start of the approach.
  const side=view.wheelX-.5,shift=targetDiameter/width*(1/12+1/14);
  const wheelX=mobile?.5+side*(.44/.26)+side/.26*shift:view.wheelX+side/.26*shift,wheelY=view.wheelY;
  const overviewX=(stage.left+stage.width/2-frame.left)/width-.5,overviewY=.5-(stage.top+(stage.height-100)/2-frame.top)/height;
  const anchor=sample.copy(center).applyMatrix4(wheel.matrixWorld),halfHeight=(6.8-anchor.z)*Math.tan(34*Math.PI/360);
  const aimX=(wheelX-.5+overviewX*(1-view.depth))*2,aimY=(.5-wheelY+overviewY*(1-view.depth))*2;
  wheel.position.set(aimX*halfHeight*camera.aspect/zoom-anchor.x,aimY*halfHeight/zoom-anchor.y,0);wheel.updateMatrixWorld();
  camera.zoom=zoom;camera.updateProjectionMatrix();renderer.render(scene,camera);
  host.dataset.wheelAngle=angle.toFixed(4);host.dataset.wheelZoom=zoom.toFixed(3);host.dataset.wheelDepth=view.depth.toFixed(4);host.dataset.wheelSettled=String(!settling);host.dataset.wheelFill=(.64+view.depth*.36).toFixed(3);host.dataset.wheelView=topic;
  left=Infinity;right=-Infinity;top=-Infinity;bottom=Infinity;
  for(const point of outline){projected.copy(point).applyMatrix4(wheel.matrixWorld).project(camera);left=Math.min(left,projected.x);right=Math.max(right,projected.x);top=Math.max(top,projected.y);bottom=Math.min(bottom,projected.y);}
  centerProjection.copy(center).applyMatrix4(wheel.matrixWorld).project(camera);
  const copyX=mobile?.5+(view.copyX-.5)*(.23/.26):view.copyX,copyY=view.copyY;
  orbit.style.setProperty('--copy-left',`${frame.left+copyX*width-stage.left}px`);orbit.style.setProperty('--copy-top',`${frame.top+copyY*height-stage.top}px`);
  host.dataset.wheelBounds=JSON.stringify({left,right,top,bottom});host.dataset.wheelCenter=JSON.stringify({x:(centerProjection.x+1)*width/2,y:(1-centerProjection.y)*height/2});host.dataset.copyAnchor=JSON.stringify({x:copyX*width,y:copyY*height});
  if(!reduced.matches||settling)schedule();else last=0;
 }
 function resize(){if(!host.clientWidth||!host.clientHeight)return;width=host.clientWidth;height=host.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();schedule();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
 const motion=()=>{last=0;schedule();};reduced.addEventListener('change',motion);
 host.querySelector('img').hidden=true;host.dataset.wheelReady='true';host.dataset.finish='ceramic';resize();
 return {setTopic(key){topic=WHEEL_VIEWS[key]?key:'overview';schedule();},setActive(value){active=value;if(!value){cancelAnimationFrame(raf);raf=0;last=0;}else schedule();},destroy(){disposed=true;observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);cancelAnimationFrame(raf);texture.dispose();grain.dispose();geometry.dispose();material.dispose();renderer.dispose();canvas.remove();}};
}
