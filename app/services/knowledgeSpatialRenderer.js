import {pimVisibleNodes} from './plantInformationMesh.js';
import {knowledgeExplorer,knowledgeExplorerOptions,KNOWLEDGE_VISUALS} from './knowledgeExplorer.js';
import {createSpatialTotemCards,hitTotemSurface} from './spatialTotemCards.js';
import {drawSpatialTether} from './spatialTetherRenderer.js';
import {currentInfoOpacity,currentGraphicsQuality} from './spatialVisualSettings.js';

const caches=new WeakMap();
const motionPreference=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
let fontRevision=0;globalThis.document?.fonts?.ready?.then(()=>{fontRevision++;});
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const world=(pose,p)=>({x:pose.position.x+pose.right.x*p.x+pose.up.x*p.y+pose.normal.x*p.z,y:pose.position.y+pose.right.y*p.x+pose.up.y*p.y+pose.normal.y*p.z,z:pose.position.z+pose.right.z*p.x+pose.up.z*p.y+pose.normal.z*p.z});
function nodePoint(node,spatial){
    const p=node.knowledgeLocal || {x:0,y:0},x=p.x*KNOWLEDGE_VISUALS.planarPitch,y=-p.y*KNOWLEDGE_VISUALS.planarPitch;
    if(!spatial)return {x,y,z:0};
    // Semantic radial shells: specific knowledge expands out and away from
    // the subject plane. This is stable XYZ geometry, not random Z jitter.
    const depth=node.depth || 0,radius=KNOWLEDGE_VISUALS.shellRadius+Math.min(depth,8)*KNOWLEDGE_VISUALS.shellStep,angle=Math.atan2(y,x),elevation=Math.max(-.82,Math.min(.82,Math.sin(angle)*.75));
    const lateral=Math.sqrt(1-elevation*elevation)*radius;
    return {x:Math.cos(angle)*lateral*(1+depth*.08),y:elevation*radius,z:-radius*(.28+depth*.12)};
}
export function knowledgeSurfaces(record,knowledge,expanded,pose,time=performance.now()){
    if(!pose?.position)return [];
    const state=knowledgeExplorer(record),selected=record.demoSelectedNodeId || record.pimSelectedNodeId || '';
    state.subjectId=record.marker?.id || knowledge.plantId || state.subjectId;
    // These anchors can diverge when the existing hold-to-move interaction
    // moves the knowledge surface. Never overwrite the physical subject.
    state.subjectAnchor=record.position || null;state.knowledgeAnchor=pose.position;
    const key=JSON.stringify([state.revision,state.mode,selected,expanded,record.knowledgeConnectedPath,record.knowledgeFloor,pose.position.y]);
    let cache=caches.get(record);
    if(!cache || cache.key!==key || cache.knowledge!==knowledge){
        const nodes=pimVisibleNodes(knowledge,expanded,{...knowledgeExplorerOptions(record),layoutWidth:1440,layoutHeight:1080,cellWidthPixels:200,cellHeightPixels:173.2});
        const source=cache?.local || new Map(),targets=new Map([['core',{x:0,y:0,z:0}]]);
        const remembered=cache?.mode===state.mode?cache.targets:null;
        const occupied=[{x:0,y:0,z:0,path:'core'},...nodes.filter(node=>remembered?.has(node.path)).map(node=>({...remembered.get(node.path),path:node.path}))];
        nodes.forEach(node=>{
            const point=remembered?.has(node.path)?{...remembered.get(node.path)}:nodePoint(node,state.mode==='explore');
            const previous=occupied.findIndex(other=>other.path===node.path);if(previous>=0)occupied.splice(previous,1);
            const floor=()=>{if(Number.isFinite(record.knowledgeFloor))point.y=Math.max(point.y,(record.knowledgeFloor+.13-pose.position.y-pose.normal.y*point.z-pose.right.y*point.x)/Math.max(.5,pose.up.y));};
            floor();
            // Resolve projected bounds from the established anchor's forward
            // field once per graph change, never chase a moving headset.
            let attempt=0;
            while(occupied.some(other=>Math.abs(other.x-point.x)<.265 && Math.abs(other.y-point.y)<.225) && attempt<20){
                const angle=Math.atan2(point.y,point.x),step=.055;
                point.x+=(Math.abs(Math.cos(angle))<.2?(node._pimOrder%2?1:-1):Math.cos(angle))*step;point.y+=Math.sin(angle)*step;floor();attempt++;
            }
            occupied.push({...point,path:node.path});targets.set(node.path,point);
        });
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
            card:{id,title:node.label,scientific:tag?core.description:'',roles:tag?roles.join(' · '):'',subtitle:tag?(identity.identityStatement || knowledge.identityStatement || knowledge.summary || ''):'',identity:tag,branchColour:KNOWLEDGE_VISUALS.branchColours[node.rootDirection] || KNOWLEDGE_VISUALS.border,selected:selectedNode,contextual:role==='context',infoOpacity:currentInfoOpacity(),fontRevision,resolution:currentGraphicsQuality()==='low'?KNOWLEDGE_VISUALS.labelResolution/2:KNOWLEDGE_VISUALS.labelResolution,height:512,fadeDuration:120},opacity:(exiting?1-progress:id==='core' || cache.source.has(id)?1:smooth((progress-.30)/.70))*(role==='context' ? .62 : 1)});
    }
    return surfaces;
}
function labelCanvas(card){
    const canvas=document.createElement('canvas');canvas.width=card.resolution;canvas.height=card.resolution;const ctx=canvas.getContext('2d');ctx.scale(canvas.width/512,canvas.height/512);
    ctx.beginPath();
    if(card.identity)ctx.roundRect(18,62,476,388,34);
    else for(let i=0;i<6;i++){const angle=Math.PI/3*i,x=256+246*Math.cos(angle),y=256+284*Math.sin(angle);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();
    const gradient=ctx.createLinearGradient(0,0,512,512);gradient.addColorStop(0,`rgba(18,40,34,${card.infoOpacity})`);gradient.addColorStop(1,`rgba(7,21,24,${card.infoOpacity})`);ctx.fillStyle=gradient;ctx.fill();
    ctx.lineJoin='round';ctx.lineWidth=card.selected?10:6;ctx.strokeStyle=card.selected?KNOWLEDGE_VISUALS.selectedBorder:card.branchColour;ctx.stroke();
    // Keep power-of-two artwork for filtered distance viewing, but compensate
    // glyphs for the world card's aspect ratio so the type is not stretched.
    ctx.save();ctx.translate(256,256);ctx.scale(1,card.identity ? .43/.28:KNOWLEDGE_VISUALS.nodeWidth/KNOWLEDGE_VISUALS.nodeHeight);ctx.translate(-256,-256);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=KNOWLEDGE_VISUALS.ink;ctx.font=card.identity?'600 46px Manrope, system-ui':`600 ${KNOWLEDGE_VISUALS.labelFont}px Manrope, system-ui`;
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
function readableFacing(surface,view){
    const m=view.transform.inverse.matrix,transform=view.transform.matrix;
    const camera=transform?{x:transform[12],y:transform[13],z:transform[14]}:{x:-(m[0]*m[12]+m[1]*m[13]+m[2]*m[14]),y:-(m[4]*m[12]+m[5]*m[13]+m[6]*m[14]),z:-(m[8]*m[12]+m[9]*m[13]+m[10]*m[14])};
    const n={x:camera.x-surface.center.x,y:camera.y-surface.center.y,z:camera.z-surface.center.z},length=Math.hypot(n.x,n.y,n.z) || 1;
    for(const axis of ['x','y','z'])n[axis]/=length;
    const horizontal=Math.hypot(n.x,n.z);if(horizontal<.01)return;
    const right={x:n.z/horizontal,y:0,z:-n.x/horizontal};
    surface.normal=n;surface.right=right;surface.up={x:-n.y*right.z,y:n.z*right.x-n.x*right.z,z:-n.y*right.x};
}
export function createKnowledgeSpatialRenderer(gl,{ray=()=>null,tether=null}={}){
    let surfaces=[],recordSurfaces=[];
    const cards=createSpatialTotemCards(gl,{canvas:labelCanvas,ray,surfaces:()=>recordSurfaces,containedFeedback:true,hitSurface:hitKnowledgeSurface});
    return {
        begin(){surfaces=[];cards.begin();},
        draw(view,record,knowledge,expanded,pose,time=performance.now()){
            recordSurfaces=knowledgeSurfaces(record,knowledge,expanded,pose,time);
            // Label planes face the reader. Their world positions and bonds
            // remain anchored, so walking around never relocates the graph.
            if(knowledgeExplorer(record).mode==='explore')recordSurfaces.forEach(surface=>readableFacing(surface,view));
            surfaces.push(...recordSurfaces);
            const state=knowledgeExplorer(record),byId=new Map(recordSurfaces.map(surface=>[surface.node.path || 'core',surface]));
            if(state.connections && tether){
                gl.depthMask(false);
                for(const surface of recordSurfaces){if(surface.node.pimCore)continue;const parent=byId.get(surface.node.parentPath) || byId.get('core');if(!parent)continue;
                    const a=parent.center,b=surface.center,d=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
                    const edge=(s,target)=>{
                        const delta={x:target.x-s.center.x,y:target.y-s.center.y,z:target.z-s.center.z};
                        const x=delta.x*s.right.x+delta.y*s.right.y+delta.z*s.right.z,y=delta.x*s.up.x+delta.y*s.up.y+delta.z*s.up.z;
                        const factor=.96/Math.max(Math.abs(y)/(s.height/2),s.card.identity?Math.abs(x)/(s.width/2):Math.abs(x)/(s.width/2)+Math.abs(y)/s.height,.001);
                        return {x:s.center.x+s.right.x*x*factor+s.up.x*y*factor,y:s.center.y+s.right.y*x*factor+s.up.y*y*factor,z:s.center.z+s.right.z*x*factor+s.up.z*y*factor};
                    };
                    if(d>.03)drawSpatialTether(gl,tether,view,edge(parent,b),edge(surface,a),{segments:4,width:KNOWLEDGE_VISUALS.bondWidth,curve:0,lift:0,color:[.68,.83,.70,(surface.node.contextual ? .28 : .62)*Math.max(surface.opacity,.08)]});
                }gl.depthMask(true);
            }
            cards.draw(view,{id:'knowledge-'+String(record.id || record.marker?.id)},pose.position,recordSurfaces.map(surface=>surface.card),record.demoSelectedNodeId || record.pimSelectedNodeId || '');
        },
        end(){cards.end();},
        hit(ray,record=null){
            return hitKnowledgeSurface(ray,record?surfaces.filter(surface=>surface.record===record):surfaces);
        },
        surface(record,path){return surfaces.find(surface=>surface.record===record && surface.node.path===path && surface.interactive!==false);},
        clear(record){const cache=caches.get(record);if(cache)cache.key='';},
        destroy(){cards.destroy();surfaces=[];}
    };
}
