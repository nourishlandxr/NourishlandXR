// Analytic surface detail stays sharp on approach without enlarging the GLB.
// Both desktop and shared-context XR use the same patterns and physical bump scale.
export function livingFrameSurfaceKind(name=''){
 if(/petal/i.test(name))return 2;
 if(/moss cushion/i.test(name))return 5;
 if(/soil|organic litter/i.test(name))return 4;
 if(/roots|stems|crawling vines/i.test(name))return 3;
 if(/leav|foliage|herbs|leaf mats/i.test(name))return 1;
 return 0;
}
export const livingFrameSurfaceGLSL=`
float lfHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float lfNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lfHash(i),lfHash(i+vec3(1,0,0)),f.x),mix(lfHash(i+vec3(0,1,0)),lfHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(lfHash(i+vec3(0,0,1)),lfHash(i+vec3(1,0,1)),f.x),mix(lfHash(i+vec3(0,1,1)),lfHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float lfLine(float distance,float width){return 1.-smoothstep(width,width+max(fwidth(distance),.0005),abs(distance));}
vec2 lfVeins(vec2 uv){float mid=lfLine(uv.x-.5,.009);float branch=lfLine(fract(uv.y*8.-abs(uv.x-.5)*3.2)-.5,.024)*(1.-smoothstep(.35,.5,abs(uv.x-.5)));return vec2(mid,branch);}
vec3 lfDetailColour(vec2 uv,vec3 point,float kind){
 if(kind<.5)return vec3(1.);
 if(kind<1.5){vec2 veins=lfVeins(uv);float detailFade=1.-smoothstep(.2,.9,max(length(dFdx(uv*95.)),length(dFdy(uv*95.))));float cells=detailFade>.01?lfNoise(vec3(uv*vec2(65.,95.),0.)):.5;return vec3(1.+veins.x*.20+veins.y*.11+(cells-.5)*.13*detailFade);}
 if(kind<2.5){float ribs=sin(uv.x*100.)*.045*(1.-smoothstep(.3,1.,fwidth(uv.x*100.)));return vec3(.96+ribs+.09*uv.y);}
 float scale=kind<3.5?850.:kind<4.5?650.:1400.;float detailFade=1.-smoothstep(.3,1.4,max(length(dFdx(point*scale)),length(dFdy(point*scale))));float grain=detailFade>.01?lfNoise(point*scale):.5;return vec3(1.+(grain-.5)*.24*detailFade);
}
float lfDetailHeight(vec2 uv,vec3 point,float kind){
 if(kind<.5)return 0.;
 if(kind<1.5){vec2 veins=lfVeins(uv);return veins.x*.00010+veins.y*.000045;}
 if(kind<2.5)return sin(uv.x*100.)*.000035*(1.-smoothstep(.3,1.,fwidth(uv.x*100.)));
 float scale=kind<3.5?850.:kind<4.5?650.:1400.;float detailFade=1.-smoothstep(.3,1.4,max(length(dFdx(point*scale)),length(dFdy(point*scale))));if(detailFade<.01)return 0.;return (lfNoise(point*scale)-.5)*(kind<3.5?.00012:kind<4.5?.00025:.00015)*detailFade;
}
vec3 lfBump(vec3 point,vec3 normal,float height){vec3 dx=dFdx(point),dy=dFdy(point),r1=cross(dy,normal),r2=cross(normal,dx);float det=dot(dx,r1);vec3 grad=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);return abs(det)<1.e-12?normal:normalize(abs(det)*normal-grad);}
`;

export function refineLivingFrameMaterials(scene,renderer){
 const clones=new Map(),owned=[];
 scene.traverse(node=>{if(!node.isMesh)return;const refine=original=>{
  if(clones.has(original))return clones.get(original);
  const material=original.clone(),kind=livingFrameSurfaceKind(material.name);clones.set(original,material);owned.push(material);
  if(renderer)for(const value of Object.values(material))if(value?.isTexture)value.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  if(kind){material.extensions={...material.extensions,derivatives:true};material.onBeforeCompile=shader=>{
   shader.uniforms.lfSurface={value:kind};
   shader.vertexShader='varying vec2 lfUv;varying vec3 lfPoint;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nlfUv=uv;').replace('#include <project_vertex>','#include <project_vertex>\nlfPoint=transformed;');
   shader.fragmentShader='uniform float lfSurface;varying vec2 lfUv;varying vec3 lfPoint;\n'+livingFrameSurfaceGLSL+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=lfDetailColour(lfUv,lfPoint,lfSurface);').replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=lfBump(-vViewPosition,normal,lfDetailHeight(lfUv,lfPoint,lfSurface));');
  };material.customProgramCacheKey=()=>`living-frame-surface-${kind}`;}
  return material;
 };node.material=Array.isArray(node.material)?node.material.map(refine):refine(node.material);});
 return ()=>owned.forEach(material=>material.dispose());
}
