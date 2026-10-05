import {bindKnowledgeObjectInteraction} from './knowledgeObjectInteraction.js';
import {bindPimoSpatialCapabilities,isPimoDeveloperOverride} from './pimoSpatialCapabilities.js';
import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeObjectRenderer,knowledgeObjectSurfaces,knowledgeFaceCanvas} from './knowledgeObjectRenderer.js';
import {pimVisibleNodes} from './plantInformationMesh.js';
import {knowledgeExplorer,knowledgeExplorerOptions,KNOWLEDGE_VISUALS} from './knowledgeExplorer.js';
import {createSpatialTotemCards,hitTotemSurface,hitTotemPoint} from './spatialTotemCards.js';
import {drawSpatialTether} from './spatialTetherRenderer.js';
import {currentInfoOpacity,currentGraphicsQuality} from './spatialVisualSettings.js';

const caches=new WeakMap();
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let fontRevision=0;globalThis.document?.fonts?.ready?.then(()=>{fontRevision++;});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
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
    const key=JSON.stringify([state.revision,state.mode,selected,expanded,record.knowledgeConnectedPath,record.knowledgeFloor,pose.position.y]);
    let cache=caches.get(record);
    if(!cache || cache.key!==key || cache.knowledge!==knowledge){
        const nodes=state.mode==='tag'?[]:pimVisibleNodes(knowledge,expanded,{...knowledgeExplorerOptions(record),layoutWidth:1440,layoutHeight:1080,cellWidthPixels:200,cellHeightPixels:173.2});
        const source=cache?.mode==='explore' && state.mode==='curiosity'?new Map((cache.nodes || []).map(node=>[node.path,{x:0,y:0,z:0}])):cache?.local || new Map(),targets=new Map([['core',{x:0,y:0,z:0}]]);
        nodes.forEach(node=>targets.set(node.path,nodePoint(node,false)));
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
        const roles=(identity.roles || knowledge.roles || []).slice(0,3).map(role=>typeof role==='string'?role:role.label || role.title).filter(Boolean);
        surfaces.push({record,node,center:world(pose,p),right:pose.right,up:pose.up,normal:pose.normal,width:tag ? .43 : KNOWLEDGE_VISUALS.nodeWidth,height:tag ? .28 : KNOWLEDGE_VISUALS.nodeHeight,interactive:!exiting && (id==='core' || progress>.55),pressProgress:record.pimPressPath===node.path?Number(record.pimPressProgress)||0:0,
            card:{id,core:id==='core' && !tag,child:node.depth>0,title:node.label,scientific:tag?core.description:'',roles:tag?roles.join(' · '):'',subtitle:tag?(identity.identityStatement || knowledge.identityStatement || knowledge.summary || ''):'',identity:tag,branchColour:KNOWLEDGE_VISUALS.branchColours[node.rootDirection] || KNOWLEDGE_VISUALS.border,selected:selectedNode,contextual:role==='context',infoOpacity:node.depth>0?Math.max(.86,currentInfoOpacity()):currentInfoOpacity(),fontRevision,resolution:currentGraphicsQuality()==='low'?KNOWLEDGE_VISUALS.labelResolution/2:KNOWLEDGE_VISUALS.labelResolution,height:512,fadeDuration:120},opacity:(exiting?1-progress:id==='core' || cache.source.has(id)?1:smooth((progress-.30)/.70))*(role==='context' ? .62 : 1)});
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
    const gradient=ctx.createLinearGradient(0,0,512,512);gradient.addColorStop(0,`rgba(18,40,34,${Math.max(.52,card.infoOpacity)})`);gradient.addColorStop(1,`rgba(7,21,24,${Math.max(.52,card.infoOpacity)})`);ctx.fillStyle=gradient;ctx.fill();
    ctx.lineJoin='round';ctx.lineWidth=card.selected || card.hovered?12:9;ctx.strokeStyle=card.hovered?'#f0fbf8':card.selected?KNOWLEDGE_VISUALS.selectedBorder:card.branchColour;ctx.stroke();
    // Keep power-of-two artwork for filtered distance viewing, but compensate
    // glyphs for the world card's aspect ratio so the type is not stretched.
    ctx.save();ctx.translate(256,256);ctx.scale(1,card.identity ? .43/.28:KNOWLEDGE_VISUALS.nodeWidth/KNOWLEDGE_VISUALS.nodeHeight);ctx.translate(-256,-256);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=KNOWLEDGE_VISUALS.ink;ctx.font=card.identity?'600 46px Manrope, system-ui':`700 ${card.core?76:card.child?68:KNOWLEDGE_VISUALS.labelFont}px Manrope, system-ui`;
    const words=String(card.title).split(/\s+/),lines=[];let line='';for(const word of words){const next=line?line+' '+word:word;if(ctx.measureText(next).width>354 && line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((text,index)=>ctx.fillText(text+(index===2 && lines.length>3?'…':''),256,(card.identity?184:256)+(index-(Math.min(lines.length,3)-1)/2)*(card.identity?40:60),365));
    if(card.identity){ctx.font='italic 500 27px Manrope, system-ui';ctx.fillStyle='#cfdfcf';ctx.fillText(card.scientific || '',256,224,414);ctx.font='600 23px Manrope, system-ui';ctx.fillText(card.roles || '',256,252,414);ctx.font='500 24px Manrope, system-ui';const words=String(card.subtitle || '').split(/\s+/);let text='',rows=[];for(const word of words){if((text+' '+word).length>32){rows.push(text);text=word;}else text+=(text?' ':'')+word;}rows.push(text);rows.slice(0,3).forEach((line,index)=>ctx.fillText(line,256,285+index*26,414));}
    ctx.restore();
    return canvas;
}
function hitKnowledgeSurface(ray,surfaces){
    const hits=surfaces.map(surface=>hitTotemSurface(ray,[surface])).filter(Boolean).filter(hit=>hit.card.identity || (Math.abs(hit.localY)/(hit.height/2)<=.96 && Math.abs(hit.localX)/(hit.width/2)+Math.abs(hit.localY)/hit.height<=.96));
    return hits.sort((a,b)=>a.distance-b.distance)[0] || null;
}
export function createKnowledgeSpatialRenderer(gl,{ray=()=>null,tether=null}={}){
    let surfaces=[],recordSurfaces=[],objectInput=null,capabilities=null;
    const objects=createKnowledgeObjectRenderer(gl,{tether});
    const cards=createSpatialTotemCards(gl,{canvas:labelCanvas,ray,surfaces:()=>recordSurfaces,containedFeedback:true,hitSurface:hitKnowledgeSurface});
    return {
        begin(){surfaces=[];cards.begin();objects.begin();},
        draw(view,record,knowledge,expanded,pose,time=performance.now()){
            recordSurfaces=knowledgeSurfaces(record,knowledge,expanded,pose,time);
            if(knowledgeExplorer(record).mode==='explore'){
                // Start the first die in reach, without moving the flower or plant.
                if(!record.knowledgeExplorePose){const m=view.transform.matrix || new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert().elements,len=Math.hypot(m[8],m[10]) || 1,right={x:m[10]/len,y:0,z:-m[8]/len},normal={x:m[8]/len,y:0,z:m[10]/len};record.knowledgeExplorePose={position:{x:m[12]-normal.x*.55+right.x*.35,y:Math.max((record.knowledgeFloor || 0)+.2,m[13]-.45),z:m[14]-normal.z*.55+right.z*.35},right,normal,up:{x:0,y:1,z:0}};}
                if(!isPimoDeveloperOverride())pose=record.knowledgeExplorePose;
                const state=knowledgeExplorer(record),progress=motionPreference?.matches?1:smooth((time-state.changedAt)/KNOWLEDGE_VISUALS.transitionMs);
                const folded=progress<1?recordSurfaces.map(surface=>({...surface,interactive:false,opacity:1-progress,center:{x:pose.position.x+(surface.center.x-pose.position.x)*(1-progress),y:pose.position.y+(surface.center.y-pose.position.y)*(1-progress),z:pose.position.z+(surface.center.z-pose.position.z)*(1-progress)}})):[];
                objects.draw(view,record,knowledge,pose,progress);
                const camera=new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(view.transform.matrix || new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert().elements));
                recordSurfaces=knowledgeObjectSurfaces(record,knowledge,pose).filter(surface=>surface.normal.dot(camera.clone().sub(surface.center).normalize())>.16).map(surface=>({...surface,opacity:progress}));
                surfaces.push(...recordSurfaces);recordSurfaces=[...recordSurfaces,...folded];
                // Explorer labels belong to the die surface, not floating plaques.
                if(folded.length)cards.draw(view,{id:'knowledge-'+String(record.id || record.marker?.id)},pose.position,folded.map(surface=>surface.card));return;
            }
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
                    if(d>.03)for(const [start,end] of visibleBondSegments(a,b,recordSurfaces))drawSpatialTether(gl,tether,view,start,end,{segments:4,width:KNOWLEDGE_VISUALS.bondWidth,curve:0,lift:0,color:[.68,.83,.70,(surface.node.contextual ? .28 : .62)*Math.max(surface.opacity,.08)]});
                }gl.depthMask(true);
            }
            cards.draw(view,{id:'knowledge-'+String(record.id || record.marker?.id)},pose.position,recordSurfaces.map(surface=>{surface.card.hovered=record.handHoverPath===surface.node.path;return surface.card;}),record.demoSelectedNodeId || record.pimSelectedNodeId || '');
        },
        end(){cards.end();},
        bindSession(session,space,{canGrab=()=>true,mode,onActivate}={}){objectInput?.destroy();capabilities?.destroy();capabilities=bindPimoSpatialCapabilities(session,space,{mode,rendererReady:true});objectInput=bindKnowledgeObjectInteraction(session,space,{hit:(_source,inputRay)=>objects.hit(inputRay || ray()),near:point=>objects.near(point),canGrab,onActivate});},
        updateInput(frame){capabilities?.update(frame);objectInput?.update(frame);},
        get grabbing(){return Boolean(objectInput?.active);},
        get grabbedSource(){return objectInput?.active?.source || null;},
        movingAtAim(){const target=objects.hit(ray());return Boolean(objectInput?.active || target?.record.knowledgeExplorer.objects?.interaction==='move');},
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
        destroy(){objectInput?.destroy();capabilities?.destroy();cards.destroy();objects.destroy();surfaces=[];}
    };
}
