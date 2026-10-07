import * as THREE from '../vendor/three.module.min.js';
import {translateNxrText,localizedCanvasContext} from './i18n.js';
import {createExplorerFacetGeometry} from './explorerFacetGeometry.js';
import {createSpatialTotemCards,hitTotemSurface} from './spatialTotemCards.js';
import {knowledgePoseMatrix,localObjectMatrix} from './knowledgeObjectModel.js';
import {explorerMoleculeView,explorerPuzzleFit,explorerChildFrame,explorerFacetSurfaceDistance,EXPLORER_BOND_RADIUS,EXPLORER_CONNECTOR_COLOUR} from './explorerMoleculeModel.js';

const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
const vec=p=>new THREE.Vector3(p.x,p.y,p.z);
const facePlanes=[...['x','y','z'].flatMap(axis=>[-1,1].map(sign=>({normal:new THREE.Vector3(axis==='x'?sign:0,axis==='y'?sign:0,axis==='z'?sign:0),limit:1}))),...[-1,1].flatMap(x=>[-1,1].flatMap(y=>[-1,1].map(z=>({normal:new THREE.Vector3(x,y,z).normalize(),limit:Math.sqrt(3)/2}))))];
export function hitExplorerFacet(ray,node){
    const inverse=(node.worldRotation || new THREE.Quaternion()).clone().invert(),origin=vec(ray.origin).sub(node.world).applyQuaternion(inverse),direction=vec(ray.direction).normalize().applyQuaternion(inverse);
    let enter=0,leave=Infinity;
    for(const {normal,limit} of facePlanes){
        const gap=limit*node.worldRadius-origin.dot(normal),speed=direction.dot(normal);
        if(Math.abs(speed)<1e-8){if(gap<0)return null;continue;}
        const t=gap/speed;if(speed<0)enter=Math.max(enter,t);else leave=Math.min(leave,t);
        if(enter>leave)return null;
    }
    if(leave<0)return null;
    return vec(ray.origin).addScaledVector(vec(ray.direction).normalize(),enter>0?enter:leave);
}
function labelCanvas(card){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=localizedCanvasContext(canvas.getContext('2d'));
    if(card.nameBadge){ctx.fillStyle='rgba(22,39,35,.35)';ctx.beginPath();ctx.roundRect(8,20,496,200,30);ctx.fill();}
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f0f4eb';ctx.shadowBlur=0;ctx.font=`550 ${card.attachment?48:60}px Manrope,system-ui`;
    const lines=[];let line='';for(const word of String(translateNxrText(card.title)).split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width>460&&line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((text,i)=>{const y=105+(i-(Math.min(3,lines.length)-1)/2)*52;ctx.fillText(text,256,y,470);});
    if(card.status){ctx.font='500 28px Manrope,system-ui';ctx.fillText(card.status,256,230,470);}return canvas;
}
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error(log);}return s;}
// Closed solids, shared by every element. Labels are a separate reading layer.
export function createExplorerMoleculeGeometry(){
    const node=createExplorerFacetGeometry();
    const profile=[[0,-.5],[.78,-.5],[1,-.46],[1,-.40],[.68,-.34],[.68,.34],[1,.40],[1,.46],[.78,.5],[0,.5]].map(([x,y])=>new THREE.Vector2(x,y));
    return {node,bond:new THREE.LatheGeometry(profile,8)};
}
export function hitExplorerConnector(ray,node,{padding=0}={}){
    const inverse=node.worldRotation.clone().invert(),o=vec(ray.origin).sub(node.world).applyQuaternion(inverse),d=vec(ray.direction).normalize().applyQuaternion(inverse),radius=node.worldRadius+padding,half=node.worldLength/2,candidates=[];
    const a=d.x*d.x+d.z*d.z,b=2*(o.x*d.x+o.z*d.z),c=o.x*o.x+o.z*o.z-radius*radius,discriminant=b*b-4*a*c;
    if(a>1e-8 && discriminant>=0){for(const t of [(-b-Math.sqrt(discriminant))/(2*a),(-b+Math.sqrt(discriminant))/(2*a)])if(t>=0 && Math.abs(o.y+t*d.y)<=half)candidates.push(t);}
    if(Math.abs(d.y)>1e-8){for(const y of [-half,half]){const t=(y-o.y)/d.y;if(t>=0 && (o.x+t*d.x)**2+(o.z+t*d.z)**2<=radius*radius)candidates.push(t);}}
    return candidates.length?vec(ray.origin).addScaledVector(vec(ray.direction).normalize(),Math.min(...candidates)):null;
}
export function hitExplorerMolecule(ray,entries,record=null){
    if(!ray?.origin || !ray.direction)return null;
    const origin=vec(ray.origin),direction=vec(ray.direction).normalize(),r=new THREE.Ray(origin,direction);let nearest=null;
    for(const entry of entries){
        if(record&&entry.record!==record || entry.record.knowledgeExplorer?.mode!=='explore' || entry.state&&entry.record.explorerMolecule!==entry.state)continue;
        for(const node of entry.nodes){
            if(node.interactive===false || node.progress<.55 || node.pending&&!pieceObject(entry,node))continue;const p=node.connector?hitExplorerConnector(ray,node,{padding:node.pending?.016:0}):node.attachment?r.intersectSphere(new THREE.Sphere(node.world,node.worldRadius),new THREE.Vector3()):hitExplorerFacet(ray,node);if(!p)continue;const distance=p.distanceTo(origin);
            if(!nearest || distance<nearest.distance)nearest=target(entry,node,p,distance);
        }
        for(const port of entry.outputs || []){
            const p=r.intersectSphere(new THREE.Sphere(port.world,port.radius),new THREE.Vector3());if(!p)continue;
            const distance=p.distanceTo(origin);if(!nearest || distance<nearest.distance)nearest=target(entry,{...port.node,outputTarget:port.output.id,outputIndex:port.index},p,distance);
        }
        for(const surface of entry.surfaces){if(surface.moleculeNode.pending&&!pieceObject(entry,surface.moleculeNode))continue;const hit=hitTotemSurface(ray,[surface]);if(hit&&(!nearest||hit.distance<nearest.distance))nearest={...target(entry,surface.moleculeNode,vec(hit.center),hit.distance),...hit,object:pieceObject(entry,surface.moleculeNode),pose:objectPose(entry,surface.moleculeNode)};}
    }return nearest;
}
function pieceObject(entry,node){if(node.attachment || node.connector&&!node.pending)return null;return node.pending?(node.connector?entry.state.pendingConnector:entry.state.pending):node.depth===1&&entry.state.wingObjects?.[node.domainId] || entry.state.nodeObjects?.[node.id] || entry.state.root;}
function objectPose(entry,node){
    if(node.depth>1 && entry.state.nodeObjects?.[node.id]){
        if(!entry.tokenPose && !entry.pose)return entry.pose;
        const matrix=(entry.tokenPose?knowledgePoseMatrix(entry.tokenPose):knowledgePoseMatrix(entry.pose).multiply(localObjectMatrix(entry.state.root))).multiply(explorerChildFrame(entry.state,entry.index,node.id));
        return {position:new THREE.Vector3().setFromMatrixPosition(matrix),right:new THREE.Vector3().setFromMatrixColumn(matrix,0),up:new THREE.Vector3().setFromMatrixColumn(matrix,1),normal:new THREE.Vector3().setFromMatrixColumn(matrix,2)};
    }
    return node.pending || node.depth===1&&entry.state.wingObjects?.[node.domainId]?entry.tokenPose:entry.pose;
}
function target(entry,node,p,distance){
    const normal=p.clone().sub(node.world).normalize();
    return {record:entry.record,knowledge:entry.knowledge,object:pieceObject(entry,node),pose:objectPose(entry,node),face:{faceId:node.id+(node.outputTarget?':'+node.outputIndex:'')},distance,point:p,center:node.world,normal,interactive:true,card:{id:node.id,knowledgeFace:true},node:{...node,path:node.path || '',pimKnowledgeFace:node.id!=='core',pimKnowledgeContext:node.id==='core',explorerNodeId:node.id,explorerOutput:node.outputTarget,explorerAttachment:Boolean(node.attachment)}};
}
export function createExplorerMoleculeRenderer(gl,{ray=()=>null}={}){
    let entries=[],labelSurfaces=[];
    const frameFields=new WeakMap(),scratchMvp=new THREE.Matrix4(),scratchNormal=new THREE.Matrix3();
    const labels=createSpatialTotemCards(gl,{canvas:labelCanvas,ray,surfaces:()=>labelSurfaces,containedFeedback:true});
    const vertex=shader(gl,gl.VERTEX_SHADER,'attribute vec3 position,normal;uniform mat4 model,mvp;uniform mat3 normalMatrix;varying vec3 n,world;varying float along;void main(){along=position.y+.5;n=normalMatrix*normal;world=(model*vec4(position,1.)).xyz;gl_Position=mvp*vec4(position,1.);}');
    const fragment=shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 n,world;varying float along;uniform vec3 colour,camera;uniform float opacity,emphasis,pulse;void main(){vec3 normal=normalize(n),key=normalize(vec3(-.45,.7,1.)),eye=normalize(camera-world);float diffuse=max(0.,dot(normal,key));float fill=max(0.,dot(normal,normalize(vec3(.65,-.2,-.7))));float light=.30+.62*diffuse+.13*fill;float highlight=pow(max(0.,dot(normal,normalize(key+eye))),24.)*.14;float ripple=step(0.,pulse)*(1.-smoothstep(0.,.12,abs(along-pulse)))*.14;gl_FragColor=vec4(colour*light+vec3(highlight+emphasis+ripple),opacity);}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const attributes=Object.fromEntries(['position','normal'].map(n=>[n,gl.getAttribLocation(program,n)])),uniforms=Object.fromEntries(['model','mvp','normalMatrix','camera','colour','opacity','emphasis','pulse'].map(n=>[n,gl.getUniformLocation(program,n)]));
    const buffers=[];
    function geometry(source){const g=source.index?source.toNonIndexed():source;const result={count:g.attributes.position.count};for(const name of ['position','normal']){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,g.attributes[name].array,gl.STATIC_DRAW);result[name]=b;}g.dispose();if(g!==source)source.dispose();return result;}
    const solids=createExplorerMoleculeGeometry(),sphere=geometry(solids.node),cylinder=geometry(solids.bond),socket=geometry(new THREE.TorusGeometry(.72,.12,4,8));
    function paint(shape,model,projection,colour,opacity,emphasis=0,pulse=-1){
        for(const name of ['position','normal']){gl.bindBuffer(gl.ARRAY_BUFFER,shape[name]);gl.enableVertexAttribArray(attributes[name]);gl.vertexAttribPointer(attributes[name],3,gl.FLOAT,false,0,0);}
        gl.uniformMatrix4fv(uniforms.model,false,model.elements);gl.uniformMatrix4fv(uniforms.mvp,false,scratchMvp.copy(projection).multiply(model).elements);gl.uniformMatrix3fv(uniforms.normalMatrix,false,scratchNormal.getNormalMatrix(model).elements);gl.uniform3fv(uniforms.colour,colour);gl.uniform1f(uniforms.opacity,opacity);gl.uniform1f(uniforms.emphasis,emphasis);gl.uniform1f(uniforms.pulse,pulse);gl.drawArrays(gl.TRIANGLES,0,shape.count);
    }
    return {
        begin(){entries=[];labelSurfaces=[];labels.begin();},
        draw(view,record,knowledge,pose,opacity=1,time=performance.now()){
            const cameraMatrix=new THREE.Matrix4().fromArray(view.transform.matrix || new THREE.Matrix4().fromArray(view.transform.inverse.matrix).invert().elements),camera=new THREE.Vector3().setFromMatrixPosition(cameraMatrix);
            const base=knowledgePoseMatrix(pose),state=record.explorerMolecule,rootMatrix=base.clone().multiply(state?localObjectMatrix(state.root):new THREE.Matrix4()),rootPosition=new THREE.Vector3().setFromMatrixPosition(rootMatrix);
            // Share model traversal across stereo eyes; projection remains eye-specific.
            let cached=frameFields.get(record);
            if(!cached || cached.time!==time || cached.knowledge!==knowledge || cached.state!==record.explorerMolecule){cached={time,knowledge,field:explorerMoleculeView(record,knowledge,camera.distanceTo(rootPosition),time,motion?.matches),state:record.explorerMolecule};frameFields.set(record,cached);}
            const field=cached.field,matrix=base.clone().multiply(localObjectMatrix(field.state.root)),projection=new THREE.Matrix4().fromArray(view.projectionMatrix).multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix));
            const right=new THREE.Vector3().setFromMatrixColumn(cameraMatrix,0).normalize(),up=new THREE.Vector3().setFromMatrixColumn(cameraMatrix,1).normalize(),normal=new THREE.Vector3().setFromMatrixColumn(cameraMatrix,2).normalize(),scale=field.state.root.scale;
            const rootRotation=new THREE.Quaternion().setFromRotationMatrix(matrix.clone().scale(new THREE.Vector3(1/scale,1/scale,1/scale)));
            const nodes=field.nodes.map(n=>({...n,world:vec(n.position).applyMatrix4(matrix),worldRadius:n.radius*scale,worldLength:(n.length || 0)*scale,worldRotation:rootRotation.clone().multiply(n.rotation?new THREE.Quaternion(n.rotation.x,n.rotation.y,n.rotation.z,n.rotation.w):new THREE.Quaternion())})),byId=new Map(nodes.map(n=>[n.id,n]));
            field.state.renderedCount=nodes.filter(n=>!n.attachment&&!n.connector).length;field.state.renderedBonds=field.bonds.length;
            const depth=gl.isEnabled(gl.DEPTH_TEST),cull=gl.isEnabled(gl.CULL_FACE),blend=gl.isEnabled(gl.BLEND),mask=gl.getParameter(gl.DEPTH_WRITEMASK);
            gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(opacity>.99);gl.useProgram(program);gl.uniform3fv(uniforms.camera,camera.toArray());
            for(const bond of field.bonds){
                const a=byId.get(bond.from),b=byId.get(bond.to);if(!a||!b)continue;
                // The completed arm uses the same endpoints as its assembly
                // socket, avoiding a change of axis when the topic locks in.
                const axis=b.world.clone().sub(a.world).normalize();
                const start=a.world.clone().addScaledVector(axis,explorerFacetSurfaceDistance(axis,a.worldRadius,a.worldRotation)),end=b.world.clone().addScaledVector(axis,-explorerFacetSurfaceDistance(axis,b.worldRadius,b.worldRotation)),direction=end.clone().sub(start).normalize(),length=start.distanceTo(end);if(length<.005)continue;
                const model=new THREE.Matrix4().compose(start.clone().lerp(end,.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction),new THREE.Vector3(EXPLORER_BOND_RADIUS*scale,length,EXPLORER_BOND_RADIUS*scale));
                const elapsed=time-field.state.births[b.id],pulse=b.contribution&&!motion?.matches&&elapsed>650&&elapsed<1100?(elapsed-650)/450:-1;
                gl.depthMask(false);paint(cylinder,model,projection,new THREE.Color(EXPLORER_CONNECTOR_COLOUR).toArray(),opacity*b.progress,0,pulse);
                gl.depthMask(opacity>.99);
            }
            const hover=hitExplorerMolecule(ray(),[{record,...field,nodes,surfaces:[],pose}],record)?.node?.explorerNodeId;
            for(const node of nodes){
                const discovered=node.id==='core'||field.state.discovered.includes(node.id),selected=field.state.selectedId===node.id,colour=new THREE.Color(node.colour).lerp(new THREE.Color('#b1b7a1'),discovered?.06:.12);
                const axis=new THREE.Vector3(0,1,0).applyQuaternion(node.worldRotation),orientation=node.attachment?new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axis):node.worldRotation;
                const dimensions=node.connector?new THREE.Vector3(node.worldRadius,node.worldLength,node.worldRadius):new THREE.Vector3().setScalar(node.worldRadius);
                const model=new THREE.Matrix4().compose(node.world,orientation,dimensions);
                const pressed=record.pimObjectPressId===pieceObject({state:field.state},node)?.id+'|'+node.id?record.pimObjectPressProgress || 0:0;
                paint(node.connector?cylinder:node.attachment?socket:sphere,model,projection,colour.toArray(),opacity,pressed*.12+(node.attachment&&explorerPuzzleFit(record,knowledge).valid?.13:selected?.055:hover===node.id?.035:0));
            }
            const outputs=[];
            for(const node of nodes.filter(node=>node.id===field.state.selectedId && node.depth>=1 && !field.state.puzzle && !node.pending && !node.attachment && !node.connector && node.progress>.55)){
                for(const [index,output] of (node.outputs || []).entries()){
                    const axis=[new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0)][index].applyQuaternion(node.worldRotation),world=node.world.clone().addScaledVector(axis,node.worldRadius*1.015),radius=node.worldRadius*.27;
                    const model=new THREE.Matrix4().compose(world,new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),axis),new THREE.Vector3().setScalar(radius));
                    gl.depthMask(false);paint(socket,model,projection,new THREE.Color(EXPLORER_CONNECTOR_COLOUR).toArray(),opacity*.72);outputs.push({node,output,index,world,radius});
                }
            }
            gl.depthMask(mask);if(!depth)gl.disable(gl.DEPTH_TEST);if(!cull)gl.disable(gl.CULL_FACE);if(!blend)gl.disable(gl.BLEND);
            labelSurfaces=nodes.filter(n=>n.progress>.55&&(field.lod!=='far'||n.depth<2||field.state.promoted.includes(n.id))&&(n.depth<3||field.lod==='close'||field.state.promoted.includes(n.id))).flatMap(node=>{
                const toward=camera.clone().sub(node.world).normalize(),title=node.label,status=node.pending?(explorerPuzzleFit(record,knowledge).valid?'Release to attach':node.connector?'Move arm to matching socket':'Fit topic onto arm'):node.attachment?'Matching socket':field.state.promoted.includes(node.id)?'Hub · '+node.count+(field.state.sampleCounts[node.id]?' sample entries':' entries'):node.depth>1&&node.count>3?node.count+' topics':'';
                let faceNormal=toward,faceDistance=node.worldRadius;
                if(!node.attachment && !node.connector){
                    const normals=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])normals.push(new THREE.Vector3(x,y,z).normalize().applyQuaternion(node.worldRotation));
                    faceNormal=normals.sort((a,b)=>b.dot(toward)-a.dot(toward))[0];faceDistance=node.worldRadius*Math.sqrt(3)/2;
                }
                let labelRight=up.clone().cross(faceNormal);if(labelRight.lengthSq()<1e-6)labelRight=right.clone();labelRight.normalize();const labelUp=faceNormal.clone().cross(labelRight).normalize();
                const labelWidth=node.connector?.18:node.worldRadius*1.1,labelHeight=labelWidth*.65;
                const surface={record,node:{...node,explorerNodeId:node.id,pimKnowledgeFace:node.id!=='core',pimKnowledgeContext:node.id==='core'},moleculeNode:node,center:node.world.clone().addScaledVector(faceNormal,faceDistance+.002),right:labelRight,up:labelUp,normal:faceNormal,width:labelWidth,height:labelHeight,opacity,interactive:opacity>.55,card:{id:node.id,title,status,core:node.id==='core',attachment:node.attachment,knowledgeFace:true,resolution:512,height:256,fadeDuration:0}};
                if(node.attachment || node.connector){surface.center=node.world.clone().addScaledVector(up,node.connector?.075:.05);surface.right=right;surface.up=up;surface.normal=toward;surface.interactive=false;return [surface];}
                if(field.lod==='far')return [surface];
                // Fixed semantic faces, not a billboard that changes identity as it turns.
                const normals=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])normals.push(new THREE.Vector3(x,y,z).normalize().applyQuaternion(node.worldRotation));
                const faces=normals.slice(0,1+(node.outputs || []).length).flatMap((normal,i)=>{
                    if(normal.dot(toward)<.15)return [];
                    const output=i?(node.outputs || [])[i-1]:null,r=up.clone().cross(normal);if(r.lengthSq()<1e-6)r.copy(right);r.normalize();
                    return [{...surface,normal,right:r,up:normal.clone().cross(r).normalize(),center:node.world.clone().addScaledVector(normal,node.worldRadius*Math.sqrt(3)/2+.002),moleculeNode:output?{...node,outputTarget:output.id,outputIndex:i-1}:node,card:{...surface.card,id:node.id+':face:'+i,title:output?.label || title,status:output?'Open · attach an arm':status}}];
                });
                const name={...surface,center:node.world.clone().addScaledVector(up,node.worldRadius*1.35).addScaledVector(toward,.004),right,up,normal:toward,width:node.worldRadius*2.4,height:node.worldRadius*.8,interactive:false,card:{...surface.card,id:node.id+':name',title,status:'',nameBadge:true}};
                return [name,...faces];
            });
            labels.draw(view,{id:'explorer-labels-'+String(record.id || record.marker?.id)},pose.position,labelSurfaces.map(s=>s.card));
            const tokenPose={position:new THREE.Vector3().setFromMatrixPosition(matrix),right:new THREE.Vector3().setFromMatrixColumn(matrix,0),up:new THREE.Vector3().setFromMatrixColumn(matrix,1),normal:new THREE.Vector3().setFromMatrixColumn(matrix,2)};
            if(opacity>.55)entries.push({record,knowledge,...field,nodes,outputs,surfaces:[...labelSurfaces],pose,tokenPose});
            record.knowledgeObjectPose=pose;return labelSurfaces;
        },
        end(){labels.end();},
        hit(ray,record=null){return hitExplorerMolecule(ray,entries,record);},
        near(point){
            if(!point)return null;const p=vec(point);let best=null;
            for(const entry of entries){if(entry.record.knowledgeExplorer?.mode!=='explore'||entry.record.explorerMolecule!==entry.state)continue;for(const node of entry.nodes){if(node.interactive===false||node.progress<.55||node.pending&&!pieceObject(entry,node))continue;let signedDistance=p.distanceTo(node.world)-node.worldRadius;if(node.connector){const local=p.clone().sub(node.world).applyQuaternion(node.worldRotation.clone().invert()),half=node.worldLength/2;const radial=Math.hypot(local.x,local.z)-node.worldRadius,axial=Math.abs(local.y)-half;signedDistance=Math.hypot(Math.max(0,radial),Math.max(0,axial))+Math.min(0,Math.max(radial,axial));}const distance=Math.abs(signedDistance);if(distance>.045 || best&&distance>=best.distance)continue;best={...target(entry,node,p,distance),signedDistance};}}return best;
        },
        destroy(){labels.destroy();buffers.forEach(b=>gl.deleteBuffer(b));gl.deleteProgram(program);entries=[];}
    };
}
