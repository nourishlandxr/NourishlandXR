import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../assets/fruit-window/vendor/GLTFLoader.js';
import {createOpening} from './peekOpening.js';
export function createTreePeekStudy(){
 const world=new THREE.Group(),plane=new THREE.Plane(new THREE.Vector3(0,0,-1),0),ownedGeometry=new Set(),ownedMaterials=new Set(),textures=new Set();
 const portal=createOpening({world,plane,ownedGeometry,ownedMaterials,allowEntry:true,radius:.89});
 const ready=Promise.all([new GLTFLoader().loadAsync(new URL('../assets/peek-test/tree-gn.glb',import.meta.url).href),new FontFace('PeekSourdough',`url("${new URL('../assets/peek-test/Magnificent Sourdough.otf',import.meta.url).href}")`).load()]).then(async ([asset,font])=>{
  const repairs=[];asset.scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){const index=asset.parser.associations.get(m)?.materials,source=asset.parser.json.materials?.[index]?.extensions?.KHR_materials_pbrSpecularGlossiness;if(source?.diffuseTexture)repairs.push(asset.parser.getDependency('texture',source.diffuseTexture.index).then(map=>{map.colorSpace=THREE.SRGBColorSpace;m.map=map;m.color.set(0xffffff);m.emissive?.set(0x555555);m.emissiveMap=map;m.emissiveIntensity=.7;m.alphaTest=.35;m.side=THREE.DoubleSide;m.needsUpdate=true;}));}});await Promise.all(repairs);
  document.fonts.add(font);const tree=asset.scene,box=new THREE.Box3().setFromObject(tree),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=3/size.y;
  tree.scale.setScalar(scale);tree.position.set(-center.x*scale,-1.6-box.min.y*scale,-4-center.z*scale);world.add(tree);
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;const ctx=canvas.getContext('2d');ctx.font='210px PeekSourdough';const textWidth=ctx.measureText('Nourishland XR').width;if(textWidth>1900)ctx.font=Math.floor(210*1900/textWidth)+'px PeekSourdough';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#20362b';ctx.lineWidth=5;ctx.strokeText('Nourishland XR',1024,256);ctx.fillStyle='#fff2ce';ctx.fillText('Nourishland XR',1024,256);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;textures.add(map);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(4.5,1.125),new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.03,side:THREE.DoubleSide}));label.position.set(0,1.65,-4.3);world.add(label);
  world.traverse(o=>{if(!o.isMesh)return;ownedGeometry.add(o.geometry);o.renderOrder=1;for(const m of Array.isArray(o.material)?o.material:[o.material]){ownedMaterials.add(m);m.stencilWrite=true;m.stencilRef=1;m.stencilFunc=THREE.EqualStencilFunc;m.stencilWriteMask=0;m.clippingPlanes=[plane];for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key])textures.add(m[key]);}});
 });
 const dispose=portal.dispose;portal.dispose=()=>{dispose();textures.forEach(t=>t.dispose());};portal.ready=ready;portal.advanceAnimation=()=>{};return portal;
}
