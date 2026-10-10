// Authored real-time motion on the original artwork; no remote video or AI MP4.
import {createPropertyPeekWorld} from './propertyPainting.js';

export const MOTION_LOOP_SECONDS=120;
const fragmentDeclarations=`
uniform float nlMoment;
uniform float nlMotion;
float nlDisk(vec2 p, vec2 centre, vec2 radius) {
 return 1.0-smoothstep(0.72,1.0,length((p-centre)/radius));
}
`;
const animatedMap=`
#ifdef USE_MAP
 vec2 p=vMapUv;
 vec4 base=texture2D(map,p);
 float phase=nlMoment*0.05235987756;
 // Soft, colour-gated regions protect buildings, banks and tree silhouettes.
 float green=smoothstep(0.003,0.045,base.g-max(base.r*1.09,base.b*1.10));
 float house=smoothstep(0.21,0.24,p.x)*(1.0-smoothstep(0.35,0.38,p.x))
            *smoothstep(0.55,0.59,p.y)*(1.0-smoothstep(0.69,0.73,p.y));
 float sky=smoothstep(0.75,0.86,p.y)*smoothstep(0.16,0.29,p.x)
           *(1.0-smoothstep(0.82,0.94,p.x))*(1.0-green);
 float canopy=max(nlDisk(p,vec2(0.11,0.43),vec2(0.18,0.40)),
                  nlDisk(p,vec2(0.89,0.42),vec2(0.15,0.40)));
 canopy=max(canopy,nlDisk(p,vec2(0.53,0.07),vec2(0.42,0.15)));
 canopy=max(canopy,nlDisk(p,vec2(0.66,0.53),vec2(0.22,0.12)));
 float leaves=canopy*green*(1.0-house);
 float neutral=1.0-smoothstep(0.028,0.10,max(base.r,max(base.g,base.b))-min(base.r,min(base.g,base.b)));
 float water=nlDisk(p,vec2(0.56,0.26),vec2(0.145,0.105))*neutral*(1.0-green);
 vec2 drift=vec2(0.006*sin(phase),0.0012*sin(2.0*phase))*sky;
 float breeze=sin(7.0*phase+p.x*28.0+p.y*13.0)+0.30*sin(19.0*phase+p.y*31.0);
 drift+=vec2(0.00085*breeze,0.00030*sin(11.0*phase+p.x*35.0))*leaves;
 drift+=vec2(0.00030*sin(p.y*105.0+23.0*phase),
             0.00125*sin(p.x*95.0+31.0*phase))*water;
 vec4 sampledDiffuseColor=texture2D(map,clamp(p+drift*nlMotion,vec2(0.002),vec2(0.998)));
 // Light travels softly across the slope; no large exposure swing or camera pan.
 float light=0.035*sin(phase+p.x*3.0-p.y*2.0)*(1.0-sky)*nlMotion;
 float shimmer=0.025*sin(p.y*190.0+p.x*14.0+23.0*phase)*water*nlMotion;
 sampledDiffuseColor.rgb*=1.0+light+shimmer;
 diffuseColor*=sampledDiffuseColor;
#endif
`;

export function createAnimatedPropertyPeekWorld(texture,{reducedMotion=false}={}){
 const study=createPropertyPeekWorld(texture),material=study.world.children[0].material;
 const uniforms={nlMoment:{value:0},nlMotion:{value:.65}};
 let moment=0,strength=.65,playing=!reducedMotion;
 material.name='Living painting: masked wind, cloud drift, pond shimmer';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=fragmentDeclarations+shader.fragmentShader.replace('#include <map_fragment>',animatedMap);
 };
 material.customProgramCacheKey=()=> 'nourishland-painted-motion-v1';
 function sync(){uniforms.nlMoment.value=moment;uniforms.nlMotion.value=strength;}
 // The paused frame retains its appearance; amount=0 exactly restores the art.
 Object.assign(study,{
  advanceAnimation(delta){if(playing&&study.enabled&&!study.disposed&&Number.isFinite(delta)&&delta>0){moment=(moment+Math.min(delta,.1))%MOTION_LOOP_SECONDS;sync();}},
  setPlaying(value){playing=Boolean(value);},
  setMotionStrength(value){if(Number.isFinite(value)){strength=Math.max(0,Math.min(1,value));sync();}},
  setMoment(seconds){if(Number.isFinite(seconds)){moment=((seconds%MOTION_LOOP_SECONDS)+MOTION_LOOP_SECONDS)%MOTION_LOOP_SECONDS;sync();}},
  animationUniforms:uniforms
 });
 return Object.defineProperties(study,{playing:{get:()=>playing},motionStrength:{get:()=>strength},moment:{get:()=>moment}});
}
