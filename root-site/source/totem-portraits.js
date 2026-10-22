// Project the current shared XR Totem models into the navigation portraits.
// Labels are painted on their real signs; transparent DOM targets follow those signs.
let pending=null;
const cache=new Map();
async function modules(){return pending??=Promise.all([import('/xr/vendor/three.module.min.js'),import('/xr/services/craftedTotemStudio.js')]);}
export async function craftPortrait(actor,style='basic'){
 const sculpture=actor?.querySelector('.journey-sculpture');if(!sculpture)return;
 const buttons=[...sculpture.querySelectorAll('.journey-sign')],label=sculpture.querySelector('.journey-plaque').textContent;
 const cards=[{id:'home',title:label},...buttons.map((button,i)=>({id:String(i),title:button.textContent,boardSide:i===1?'right':'left',navigation:{reliable:true}}))];
 const key=JSON.stringify([style,cards]);actor.dataset.portraitRequest=key;
 try{
  let result=cache.get(key);
  if(!result){
   const [T,{createCraftedTotemStudioModel,createTotemStudioMaterials,disposeTotemStudioModel}]=await modules();
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setSize(640,960,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
   const materials=createTotemStudioMaterials();materials.wood.roughness=.84;materials.bronze.roughness=.7;materials.bronze.metalness=.3;
   const model=createCraftedTotemStudioModel({style,cards,materials}),scene=new T.Scene();scene.add(model,new T.HemisphereLight(0xfff6e5,0x76826d,2.5));
   // Dark inscriptions stay readable on the softly lit sage portrait. This is
   // a presentation-only texture change; the shared XR sign materials stay intact.
   if(style==='botanical')model.traverse(node=>{const image=node.userData.ownMaterial&&node.material?.map?.image;if(!image?.getContext)return;const ctx=image.getContext('2d');ctx.globalCompositeOperation='source-in';ctx.fillStyle='#284c36';ctx.fillRect(0,0,image.width,image.height);ctx.globalCompositeOperation='source-over';node.material.map.needsUpdate=true;});
   for(const [x,y,z,intensity]of [[-2,4,5,3.6],[3,1,3,1.2]]){const light=new T.DirectionalLight(0xfff4dc,intensity);light.position.set(x,y,z);scene.add(light);}
   model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3()),height=Math.max(size.y,size.x/ (2/3))*1.08;
   const camera=new T.OrthographicCamera(-height/3,height/3,height/2,-height/2,.01,30);camera.position.set(centre.x,centre.y,5);camera.lookAt(centre.x,centre.y,0);camera.updateMatrixWorld();camera.updateProjectionMatrix();
   const targets={};model.traverse(node=>{if(node.userData.signId===undefined||node.geometry?.type==='PlaneGeometry')return;const b=new T.Box3().setFromObject(node),a=new T.Vector3(b.min.x,b.max.y,b.max.z).project(camera),c=new T.Vector3(b.max.x,b.min.y,b.max.z).project(camera);targets[node.userData.signId]={left:(a.x+1)*50,top:(1-(a.y+c.y)/2)*50,width:(c.x-a.x)*50,height:(a.y-c.y)*50};});
   const base=new T.Vector3(0,box.min.y,0).project(camera);renderer.render(scene,camera);result={src:renderer.domElement.toDataURL('image/png'),targets,groundX:(base.x+1)/2,groundY:(1-base.y)/2};cache.set(key,result);
   disposeTotemStudioModel(model);const textures=new Set();for(const material of Object.values(materials)){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();
  }
  if(actor.dataset.portraitRequest!==key)return;
  const image=sculpture.querySelector('img');image.src=result.src;image.alt=label+' Totem';sculpture.dataset.groundX=result.groundX;sculpture.dataset.groundY=result.groundY;
  for(const [i,button]of buttons.entries()){const target=result.targets[String(i)];if(!target)continue;button.setAttribute('aria-label',button.textContent);Object.assign(button.style,{left:target.left+'%',top:target.top+'%',width:target.width+'%',height:target.height+'%'});}
  sculpture.dataset.crafted='true';actor.dataset.portraitStyle=style;
 }catch{actor.dataset.portraitStyle='fallback';}
}
