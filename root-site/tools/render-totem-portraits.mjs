// Render the shared XR sculptures once, outside the visitor's animation frames.
// Run with the local website preview on port 8010 after changing models/signs.
import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8010/platform/',{waitUntil:'domcontentloaded'});
 const portraits=await page.evaluate(async()=>{
  const [T,{createCraftedTotemStudioModel,createTotemStudioMaterials,disposeTotemStudioModel},{totemBranches}]=await Promise.all([import('/xr/vendor/three.module.min.js'),import('/xr/services/craftedTotemStudio.js'),import('/site/totem-journey.js')]);
  const definitions=[{id:'platform',style:'basic',label:'Platform',titles:['Creator','Explorer','Demos']},...Object.entries(totemBranches).map(([id,branch])=>({id,style:id==='creator'?'botanical':'organic',label:branch.label,titles:branch.items.map(i=>i.label)}))];
  const results={};
  for(const {id,style,label,titles}of definitions){
   const cards=[{id:'home',title:label},...titles.map((title,i)=>({id:String(i),title,boardSide:i===1?'right':'left',navigation:{reliable:true}}))];
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'low-power'});renderer.setSize(640,960,false);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
   const materials=createTotemStudioMaterials();materials.wood.roughness=.84;materials.bronze.roughness=.7;materials.bronze.metalness=.3;
   const model=createCraftedTotemStudioModel({style,cards,materials}),scene=new T.Scene();scene.add(model,new T.HemisphereLight(0xfff6e5,0x76826d,2.5));
   if(style==='botanical')model.traverse(node=>{const image=node.userData.ownMaterial&&node.material?.map?.image;if(!image?.getContext)return;const ctx=image.getContext('2d');ctx.globalCompositeOperation='source-in';ctx.fillStyle='#284c36';ctx.fillRect(0,0,image.width,image.height);ctx.globalCompositeOperation='source-over';node.material.map.needsUpdate=true;});
   for(const [x,y,z,intensity]of [[-2,4,5,3.6],[3,1,3,1.2]]){const light=new T.DirectionalLight(0xfff4dc,intensity);light.position.set(x,y,z);scene.add(light);}
   model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3()),height=Math.max(size.y,size.x/(2/3))*1.08;
   const camera=new T.OrthographicCamera(-height/3,height/3,height/2,-height/2,.01,30);camera.position.set(centre.x,centre.y,5);camera.lookAt(centre.x,centre.y,0);camera.updateMatrixWorld();camera.updateProjectionMatrix();
   const targets={};model.traverse(node=>{if(node.userData.signId===undefined||node.geometry?.type==='PlaneGeometry')return;const b=new T.Box3().setFromObject(node),a=new T.Vector3(b.min.x,b.max.y,b.max.z).project(camera),c=new T.Vector3(b.max.x,b.min.y,b.max.z).project(camera);targets[node.userData.signId]={left:(a.x+1)*50,top:(1-(a.y+c.y)/2)*50,width:(c.x-a.x)*50,height:(a.y-c.y)*50};});
   const base=new T.Vector3(0,box.min.y,0).project(camera);renderer.render(scene,camera);
   results[id]={style,label,titles,src:renderer.domElement.toDataURL('image/webp',.96),targets,groundX:(base.x+1)/2,groundY:(1-base.y)/2};
   disposeTotemStudioModel(model);const textures=new Set();for(const material of Object.values(materials)){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();
  }
  return results;
 });
 fs.mkdirSync('root-site/source/art',{recursive:true});
 for(const [id,portrait]of Object.entries(portraits)){const name=`totem-${id}-09783.webp`;fs.writeFileSync('root-site/source/art/'+name,Buffer.from(portrait.src.split(',')[1],'base64'));portrait.src='/site/art/'+name;console.log(id+' '+fs.statSync('root-site/source/art/'+name).size+' bytes');}
 fs.writeFileSync('root-site/source/totem-portrait-data.mjs','// Generated from the current shared XR sculptures. See render-totem-portraits.mjs.\nexport const TOTEM_PORTRAITS='+JSON.stringify(portraits,null,2)+';\n');
}finally{await browser.close();}
