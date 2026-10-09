import {bindExplorerMoleculeInteraction} from './explorerMoleculeInteraction.js';
import {createExplorerMoleculeRenderer} from './explorerMoleculeRenderer.js';
import {bindPimoSpatialCapabilities,isPimoDeveloperOverride} from './pimoSpatialCapabilities.js';
import * as THREE from '../vendor/three.module.min.js';
import {knowledgeFaceCanvas} from './knowledgeObjectRenderer.js';
import {pimVisibleNodes} from './plantInformationMesh.js';
import {knowledgeExplorer,knowledgeExplorerOptions,KNOWLEDGE_VISUALS} from './knowledgeExplorer.js';
import {createSpatialTotemCards,hitTotemSurface,hitTotemPoint} from './spatialTotemCards.js';
import {drawSpatialTether} from './spatialTetherRenderer.js';
import {currentInfoOpacity,currentGraphicsQuality,getSpatialVisualSettings} from './spatialVisualSettings.js';
import {identityTextLayout,IDENTITY_GLYPH_Y_SCALE} from './demoTextWidgetLayout.js';

const caches=new WeakMap();
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let fontRevision=0;globalThis.document?.fonts?.ready?.then(()=>{fontRevision++;});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export const curiositySurfaceOpacity=value=>Math.max(0,Math.min(1,Number.isFinite(Number(value))?Number(value):1));
// Opacity belongs to the draw uniform, so dragging glass sliders never changes
// the cached artwork. The separate ink layer keeps labels and borders legible.
export function knowledgeSurfaceLayer(surface,body=false){
    return {...surface,opacity:surface.opacity*(body?curiositySurfaceOpacity(surface.card.infoOpacity):1),card:{...surface.card,infoOpacity:1,...(body?{hovered:false}: {})}};
}
const world=(pose,p)=>({x:pose.position.x+pose.right.x*p.x+pose.up.x*p.y+pose.normal.x*p.z,y:pose.position.y+pose.right.y*p.x+pose.up.y*p.y+pose.normal.y*p.z,z:pose.position.z+pose.right.z*p.x+pose.up.z*p.y+pose.normal.z*p.z});
function nodePoint(node,spatial){
    const p=node.layoutGrid || {x:0,y:0},x=p.x*.18,y=-(p.y+p.x*.5)*.208;
    return {x,y,z:0};
}
export function knowledgeSurfaces(record,knowledge,expanded,pose,time=performance.now()){
    if(!pose?.position)return [];
    const state=knowledgeExplorer(record),selected=record.demoSelectedNodeId || record.pimSelectedNodeId || '';
    state.subjectId ||= record.marker?.plantId || record.marker?.id || knowledge.plantId;
    // These anchors can diverge when the existing hold-to-move interaction
    // moves the knowledge surface. Never overwrite the physical subject.
    state.subjectAnchor=record.position || null;state.knowledgeAnchor=pose.position;
    const scale=Math.max(.65,Math.min(1.6,record.pimoScale || 1));
    const key=JSON.stringify([scale,state.revision,state.mode,selected,expanded,record.knowledgeConnectedPath,record.knowledgeFloor,pose.position.y]);
    let cache=caches.get(record);
    if(!cache || cache.key!==key || cache.knowledge!==knowledge){
        const nodes=state.mode==='tag'?[]:pimVisibleNodes(knowledge,expanded,{...knowledgeExplorerOptions(record),layoutWidth:1440,layoutHeight:1080,cellWidthPixels:200,cellHeightPixels:173.2});
        const source=cache?.mode==='explore' && state.mode==='curiosity'?new Map((cache.nodes || []).map(node=>[node.path,{x:0,y:0,z:0}])):cache?.local || new Map(),targets=new Map([['core',{x:0,y:0,z:0}]]);
        nodes.forEach(node=>targets.set(node.path,(()=>{const p=nodePoint(node,false);return {x:p.x*scale,y:p.y*scale,z:p.z*scale};})()));
        const exits=(cache?.nodes || []).filter(node=>!targets.has(node.path));
        cache={key,knowledge,nodes,exits,source,targets,local:new Map(),started:time,mode:state.mode};caches.set(record,cache);
    }
    const progress=motionPreference?.matches?1:smooth((time-cache.started)/KNOWLEDGE_VISUALS.transitionMs);
    const identity=knowledge.identity || knowledge;
    const core={path:'',pimCore:true,label:identity.commonName || knowledge.title || record.name || record.marker?.label || 'Plant',description:identity.scientificName || knowledge.scientificName || knowledge.scientific || ''};
    const all=[core,...cache.nodes,...(progress<1?cache.exits:[])],surfaces=[];
    for(const node of all){
        const id=node.path || 'core',exiting=!cache.targets.has(id),parent=cache.source.get(node.parentPath) || cache.targets.get(node.parentPath) || {x:0,y:0,z:0},target=cache.targets.get(id) || parent,from=cache.source.get(id) || parent;
        const p={x:from.x+(target.x-from.x)*progress,y:from.y+(target.y-from.y)*progress,z:from.z+(target.z-from.z)*progress};cache.local.set(id,p);
        const selectedNode=selected===node.path,role=node.contextual?'context':'active';
        const tag=state.mode==='tag' && id==='core';
        const cellOpacity=curiositySurfaceOpacity(getSpatialVisualSettings().cellOpacity);
        const nativeChild=record.demoNativeChoice==='blue-quandong' && node.depth>0;
        const roles=(identity.roles || knowledge.roles || []).slice(0,3).map(role=>typeof role==='string'?role:role.label || role.title).filter(Boolean);
        surfaces.push({record,node,center:world(pose,p),right:pose.right,up:pose.up,normal:pose.normal,width:(tag ? .52 : node.depth>0?.195:KNOWLEDGE_VISUALS.nodeWidth)*scale,height:(tag ? .34 : node.depth>0?.169:KNOWLEDGE_VISUALS.nodeHeight)*scale,interactive:!exiting && (id==='core' || progress>.55),pressProgress:record.pimPressPath===node.path?Number(record.pimPressProgress)||0:0,
            card:{id,core:id==='core' && !tag,child:node.depth>0,depth:node.depth || 0,title:node.label,scientific:tag?core.description:'',roles:tag?roles.join(' · '):'',subtitle:tag?(identity.identityStatement || knowledge.identityStatement || knowledge.summary || ''):'',identity:tag,branchColour:KNOWLEDGE_VISUALS.branchColours[node.rootDirection] || KNOWLEDGE_VISUALS.border,selected:selectedNode,contextual:role==='context',infoOpacity:tag?Math.max(.85,currentInfoOpacity()):nativeChild?Math.max(.35,cellOpacity):cellOpacity,fontRevision,resolution:tag?1024:currentGraphicsQuality()==='low'?KNOWLEDGE_VISUALS.labelResolution/2:KNOWLEDGE_VISUALS.labelResolution,height:512,fadeDuration:120},opacity:(exiting?1-progress:id==='core' || cache.source.has(id)?1:smooth((progress-.30)/.70))*(role==='context' ? .62 : 1)});
    }
    return surfaces;
}
// Subtract every glass cell footprint from a bond, rather than relying on
// transparent faces to conceal it. This also covers intervening child cells.
function visibleBondSegments(a,b,surfaces){
    let intervals=[[0,1]];const delta={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};
    for(const surface of surfaces){
        const relative={x:a.x-surface.center.x,y:a.y-surface.center.y,z:a.z-surface.center.z},dot=(v,axis)=>v.x*axis.x+v.y*axis.y+v.z*axis.z;
        if(Math.abs(dot(relative,surface.normal))>.03)continue;
        const w=surface.width/2+.003,h=surface.height/2+.003,x=dot(relative,surface.right),y=dot(relative,surface.up),dx=dot(delta,surface.right),dy=dot(delta,surface.up);
        const planes=surface.card.identity?[[1,0,w],[-1,0,w],[0,1,h],[0,-1,h]]:[[0,1,h],[0,-1,h],[1,w/(2*h),w],[1,-w/(2*h),w],[-1,w/(2*h),w],[-1,-w/(2*h),w]];
        let lo=0,hi=1;
        for(const [nx,ny,limit] of planes){const start=nx*x+ny*y,slope=nx*dx+ny*dy;if(Math.abs(slope)<1e-8){if(start>limit){lo=1;hi=0;break;}}else {const t=(limit-start)/slope;if(slope>0)hi=Math.min(hi,t);else lo=Math.max(lo,t);}}
        if(lo>=hi)continue;
        intervals=intervals.flatMap(([start,end])=>hi<=start || lo>=end?[[start,end]]:[[start,Math.max(start,lo)],[Math.min(end,hi),end]].filter(([u,v])=>v-u>.001));
    }
    const point=t=>({x:a.x+delta.x*t,y:a.y+delta.y*t,z:a.z+delta.z*t});return intervals.map(([start,end])=>[point(start),point(end)]);
}
function labelCanvas(card){
    if(card.knowledgeFace)return knowledgeFaceCanvas(card);
    const canvas=document.createElement('canvas');canvas.width=card.resolution;canvas.height=card.resolution;const ctx=canvas.getContext('2d');ctx.scale(canvas.width/512,canvas.height/512);
    ctx.beginPath();
    if(card.identity)ctx.roundRect(18,62,476,388,34);
    else for(let i=0;i<6;i++){const angle=Math.PI/3*i,x=256+246*Math.cos(angle),y=256+284*Math.sin(angle);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();
    if(!card.inkOnly){
    const tint=new THREE.Color(card.identity?'#24596a':card.branchColour),shade=tint.clone().multiplyScalar(card.identity?.42:card.child?.22:.30);ctx.globalAlpha=card.infoOpacity;ctx.fillStyle='#'+shade.getHexString();ctx.fill();
    const gradient=ctx.createLinearGradient(0,0,512,512);gradient.addColorStop(0,`rgba(18,40,34,${card.infoOpacity})`);gradient.addColorStop(1,`rgba(7,21,24,${card.infoOpacity})`);ctx.globalAlpha=.30;ctx.fillStyle=gradient;ctx.fill();ctx.globalAlpha=1;
    }
    if(card.bodyOnly)return canvas;
    ctx.lineJoin='round';ctx.lineWidth=card.selected || card.hovered?12:9;ctx.strokeStyle=card.hovered?'#f0fbf8':card.selected?KNOWLEDGE_VISUALS.selectedBorder:card.branchColour;ctx.stroke();
    // Keep power-of-two artwork for filtered distance viewing, but compensate
    // glyphs for the world card's aspect ratio so the type is not stretched.
    ctx.save();if(!card.identity){ctx.translate(256,256);ctx.scale(1,KNOWLEDGE_VISUALS.nodeWidth/KNOWLEDGE_VISUALS.nodeHeight);ctx.translate(-256,-256);}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ffffff';ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.font=card.identity?'700 39px Manrope, system-ui':`800 ${card.core?76:card.child?68:KNOWLEDGE_VISUALS.labelFont}px Manrope, system-ui`;
    if(card.identity){
        const fonts={title:'750 34px Manrope, system-ui',scientific:'italic 650 20px Manrope, system-ui',roles:'700 20px Manrope, system-ui',body:'650 18px Manrope, system-ui'},measure={};
        for(const [key,font] of Object.entries(fonts))measure[key]=text=>{ctx.font=font;return ctx.measureText(text).width;};
        const layout=identityTextLayout({title:card.title,scientific:card.scientific,roles:card.roles,body:card.subtitle},measure);
        const colours={title:'#ffffff',scientific:'#e0f0ff',roles:'#c4f1e3',body:'#f5fbff'};
        for(const key of Object.keys(layout)){ctx.font=fonts[key];ctx.fillStyle=colours[key];layout[key].lines.forEach((line,index)=>{const baseline=layout[key].baselines[index];ctx.save();ctx.translate(0,baseline);ctx.scale(1,IDENTITY_GLYPH_Y_SCALE);ctx.fillText(line,256,0,layout[key].width);ctx.restore();});}
        ctx.restore();return canvas;
    }
    const words=String(card.title).split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>354 && line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((text,index)=>ctx.fillText(text+(index===2 && lines.length>3?'…':''),256,(index-(Math.min(lines.length,3)-1)/2)*60+256,365));
    ctx.restore();
    return canvas;
}
function hitKnowledgeSurface(ray,surfaces){
    const hits=surfaces.map(surface=>hitTotemSurface(ray,[surface])).filter(Boolean).filter(hit=>hit.card.identity || (Math.abs(hit.localY)/(hit.height/2)<=.96 && Math.abs(hit.localX)/(hit.width/2)+Math.abs(hit.localY)/hit.height<=.96));
    return hits.sort((a,b)=>a.distance-b.distance)[0] || null;
}
export function createKnowledgeSpatialRenderer(gl,{ray=()=>null,tether=null}={}){
    let surfaces=[],recordSurfaces=[],objectInput=null,capabilities=null;
    const objects=createExplorerMoleculeRenderer(gl,{ray});
    const cards=createSpatialTotemCards(gl,{canvas:card=>labelCanvas({...card,inkOnly:true}),ray,surfaces:()=>recordSurfaces.map(surface=>knowledgeSurfaceLayer(surface)),containedFeedback:true,hitSurface:hitKnowledgeSurface});
    const glass=createSpatialTotemCards(gl,{canvas:card=>labelCanvas({...card,bodyOnly:true}),ray:()=>null,surfaces:()=>recordSurfaces.map(surface=>knowledgeSurfaceLayer(surface,true))});
    return {
        begin(){surfaces=[];cards.begin();glass.begin();objects.begin();},
        draw(view,record,knowledge,expanded,pose,time=performance.now()){
            if(knowledgeExplorer(record).mode==='explore'){
                // The seed keeps its physical orientation while people explore.
                if(!record.knowledgeExplorePose){const m=view.transform.matrix || new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert().elements,len=Math.hypot(m[8],m[10]) || 1,right={x:m[10]/len,y:0,z:-m[8]/len},normal={x:m[8]/len,y:0,z:m[10]/len};record.knowledgeExplorePose={position:{x:m[12]-normal.x*.75+right.x*.25,y:Math.max((record.knowledgeFloor || 0)+.65,m[13]-.30),z:m[14]-normal.z*.75+right.z*.25},right,normal,up:{x:0,y:1,z:0}};}
                if(!isPimoDeveloperOverride())pose=record.knowledgeExplorePose;
                const state=knowledgeExplorer(record),progress=motionPreference?.matches?1:smooth((time-(state.exploreEnteredAt || 0))/KNOWLEDGE_VISUALS.transitionMs);
                const folded=[];
                recordSurfaces=objects.draw(view,record,knowledge,pose,progress,time);
                surfaces.push(...recordSurfaces);recordSurfaces=[...recordSurfaces,...folded];
                // Molecular geometry belongs only to Explorer. The Curiosity
                // surfaces and opening transition remain unchanged below.
                if(folded.length){const objectsSurfaces=recordSurfaces;recordSurfaces=folded;glass.draw(view,{id:'knowledge-glass-'+String(record.id || record.marker?.id)},pose.position,folded.map(surface=>surface.card));cards.draw(view,{id:'knowledge-'+String(record.id || record.marker?.id)},pose.position,folded.map(surface=>surface.card));recordSurfaces=objectsSurfaces;}return;
            }
            // Explorer must never build the flat Curiosity tree just to discard it.
            recordSurfaces=knowledgeSurfaces(record,knowledge,expanded,pose,time);
            surfaces.push(...recordSurfaces);
            const state=knowledgeExplorer(record),byId=new Map(recordSurfaces.map(surface=>[surface.node.path || 'core',surface]));
            if(state.connections && tether){
                gl.depthMask(false);
                for(const surface of recordSurfaces){if(surface.node.pimCore)continue;const parent=byId.get(surface.node.parentPath) || byId.get('core');if(!parent)continue;
                    const a=parent.center,b=surface.center,d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
                    const edge=(s,target)=>{
                        const delta={x:target.x-s.center.x,y:target.y-s.center.y,z:target.z-s.center.z};
                        const x=delta.x*s.right.x+delta.y*s.right.y+delta.z*s.right.z,y=delta.x*s.up.x+delta.y*s.up.y+delta.z*s.up.z;
                        const factor=1.04/Math.max(Math.abs(y)/(s.height/2),s.card.identity?Math.abs(x)/(s.width/2):Math.abs(x)/(s.width/2)+Math.abs(y)/s.height,.001);
                        return {x:s.center.x+s.right.x*x*factor+s.up.x*y*factor,y:s.center.y+s.right.y*x*factor+s.up.y*y*factor,z:s.center.z+s.right.z*x*factor+s.up.z*y*factor};
                    };
                    if(d>.03)for(const [start,end] of visibleBondSegments(a,b,recordSurfaces))drawSpatialTether(gl,tether,view,start,end,{segments:4,width:KNOWLEDGE_VISUALS.bondWidth,curve:0,lift:0,color:[...new THREE.Color(surface.card.branchColour).toArray(),(surface.node.contextual ? .28 : .80)*Math.max(surface.opacity,.08)]});
                }gl.depthMask(true);
            }
            glass.draw(view,{id:'knowledge-glass-'+String(record.id || record.marker?.id)},pose.position,recordSurfaces.map(surface=>surface.card));
            cards.draw(view,{id:'knowledge-'+String(record.id || record.marker?.id)},pose.position,recordSurfaces.map(surface=>{surface.card.hovered=record.handHoverPath===surface.node.path;return surface.card;}),record.demoSelectedNodeId || record.pimSelectedNodeId || '');
        },
        end(){cards.end();glass.end();objects.end();},
        bindSession(session,space,{canGrab=()=>true,mode,onActivate}={}){objectInput?.destroy();capabilities?.destroy();capabilities=bindPimoSpatialCapabilities(session,space,{mode,rendererReady:true});objectInput=bindExplorerMoleculeInteraction(session,space,{hit:(_source,inputRay)=>objects.hit(inputRay || ray()),near:point=>objects.near(point),canGrab,onActivate});},
        updateInput(frame){capabilities?.update(frame);objectInput?.update(frame);},
        get grabbing(){return Boolean(objectInput?.active);},
        get grabbedSource(){return objectInput?.active?.source || null;},
        movingAtAim(){const target=objects.hit(ray());return Boolean(objectInput?.active || target?.record.explorerMolecule?.interaction==='move');},
        hit(ray,record=null){
            const flat=hitKnowledgeSurface(ray,surfaces.filter(surface=>(!record || surface.record===record) && surface.record.knowledgeExplorer?.mode!=='explore')),object=objects.hit(ray,record);return [flat,object].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0] || null;
        },
        hitPoint(point){
            const target=[objects.near(point),hitTotemPoint(point,surfaces.filter(s=>s.record.knowledgeExplorer?.mode!=='explore'),{front:.045,back:.025})].filter(Boolean).sort((a,b)=>a.distance-b.distance)[0];
            if(!target || target.interactive===false)return null;
            if(!target.card.identity && !target.card.knowledgeFace && (Math.abs(target.localY)/(target.height/2)>.96 || Math.abs(target.localX)/(target.width/2)+Math.abs(target.localY)/target.height>.96))return null;
            return target;
        },
        surface(record,path){return surfaces.find(surface=>surface.record===record && surface.node.path===path && surface.interactive!==false);},
        clear(record){const cache=caches.get(record);if(cache)cache.key='';},
        destroy(){objectInput?.destroy();capabilities?.destroy();cards.destroy();glass.destroy();objects.destroy();surfaces=[];}
    };
}
