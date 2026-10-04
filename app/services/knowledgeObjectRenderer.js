import * as THREE from '../vendor/three.module.min.js';
import {createHeroDiceGeometry,diceFacetRegions} from './heroDiceGeometry.js';
import {ensureKnowledgeObjects,knowledgeObjectIndex,knowledgePoseMatrix,localObjectMatrix,knowledgeConnectorAnchors} from './knowledgeObjectModel.js';
import {drawSpatialTether} from './spatialTetherRenderer.js';

export const KNOWLEDGE_OBJECT_INSTRUCTION='Turn to inspect. Press a face to explore. Move objects to organise connections.';
export function knowledgeFaceCanvas(card){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle='rgba(14,32,29,.97)';ctx.beginPath();ctx.roundRect(4,4,504,248,28);ctx.fill();ctx.strokeStyle=card.hovered?'#f0fbf8':card.selected?'#dceabd':'#adc6bc';ctx.lineWidth=card.selected || card.hovered?8:3;ctx.stroke();
    ctx.fillStyle='#edf3e4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 56px Manrope, system-ui';
    const lines=[];let line='';for(const word of String(card.title).split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width>452 && line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((text,i)=>ctx.fillText(text+(i===2 && lines.length>3?'…':''),256,100+(i-(Math.min(3,lines.length)-1)/2)*60,460));
    ctx.font='500 25px Manrope, system-ui';ctx.fillStyle='#c6dacf';ctx.fillText(card.context?'Return to context':card.role==='information'?'Press to read':card.role==='branch'?'Press to explore':'Read · Explore this',256,211,460);return canvas;
}
export function knowledgeObjectSurfaces(record,knowledge,pose){
    const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),index=knowledgeObjectIndex(knowledge),surfaces=[];
    for(const object of workspace.items){
        const matrix=basis.clone().multiply(localObjectMatrix(object));
        for(const face of object.faces){
            const n=new THREE.Vector3(face.localNormal.x,face.localNormal.y,face.localNormal.z),r=new THREE.Vector3(0,1,0).cross(n);if(r.length()<.01)r.set(1,0,0);r.normalize();const u=n.clone().cross(r).normalize();
            const centre=new THREE.Vector3(face.localAnchor.x,face.localAnchor.y,face.localAnchor.z).applyMatrix4(matrix);n.transformDirection(matrix);r.transformDirection(matrix);u.transformDirection(matrix);
            const node=index.nodes.get(face.conceptId);if(!node)continue;
            surfaces.push({record,object,face,node:{...node,nodeId:node.id,pimKnowledgeFace:true,knowledgeObjectId:object.id,knowledgeFaceId:face.faceId},center:centre,right:r,up:u,normal:n,width:.28,height:.14,interactive:true,card:{id:object.id+'|'+face.faceId,title:face.title,role:face.role,knowledgeFace:true,selected:workspace.selectedObjectId===object.id && workspace.selectedFaceId===face.faceId,resolution:512,height:256,fadeDuration:120}});
        }
    }
    return surfaces;
}
export function hitKnowledgeObject(ray,record,knowledge,pose,geometry){
    if(!ray?.origin || !ray?.direction || !pose)return null;
    const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),position=geometry.attributes.position,index=knowledgeObjectIndex(knowledge);
    let best=null;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),point=new THREE.Vector3(),origin=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),direction=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize();
    for(const object of workspace.items){
        const matrix=basis.clone().multiply(localObjectMatrix(object)),localRay=new THREE.Ray(origin.clone(),direction.clone()).applyMatrix4(matrix.clone().invert()),regions=diceFacetRegions(geometry,Math.max(6,object.faces.length+1));
        for(let i=0;i<position.count;i+=3){
            a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
            if(!localRay.intersectTriangle(a,b,c,true,point))continue;const world=point.clone().applyMatrix4(matrix),distance=world.distanceTo(origin);if(best && distance>=best.distance)continue;
            const face=object.faces[regions[i/3]],node=face?index.nodes.get(face.conceptId):null;
            best={record,object,pose,face,distance,point:world,center:world,node:node?{...node,nodeId:node.id,pimKnowledgeFace:true,knowledgeObjectId:object.id,knowledgeFaceId:face.faceId}:{path:'',pimCore:true,pimKnowledgeContext:true,knowledgeObjectId:object.id}};
        }
    }
    return best;
}
function shader(gl,type,source){const value=gl.createShader(type);gl.shaderSource(value,source);gl.compileShader(value);if(!gl.getShaderParameter(value,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(value);gl.deleteShader(value);throw Error(message);}return value;}
export function createKnowledgeObjectRenderer(gl,{tether=null}={}){
    const geometry=createHeroDiceGeometry(.24),edges=new THREE.EdgesGeometry(geometry,4),buffers=[];
    const vertex=shader(gl,gl.VERTEX_SHADER,'attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 mvp;uniform mat4 model;varying vec3 n;varying vec2 t;void main(){n=normalize(mat3(model)*normal);t=uv;gl_Position=mvp*vec4(position,1.);}');
    const fragment=shader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 n;varying vec2 t;uniform sampler2D atlas;uniform float lineMode;uniform float opacity;void main(){vec3 botanical=texture2D(atlas,t).rgb;float key=max(dot(normalize(n),normalize(vec3(-.4,.7,.8))),0.);vec3 colour=mix(botanical,vec3(.18,.29,.22),.42)*(.55+key*.7);gl_FragColor=vec4(mix(colour,vec3(.15,.23,.17),lineMode),opacity*mix(1.,.35,lineMode));}');
    const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const attrs={};for(const name of ['position','normal','uv'])attrs[name]=gl.getAttribLocation(program,name);
    const uniforms={};for(const name of ['mvp','model','atlas','opacity','lineMode'])uniforms[name]=gl.getUniformLocation(program,name);
    function buffer(data){const value=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,value);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);buffers.push(value);return value;}
    const positions=buffer(geometry.attributes.position.array),normals=buffer(geometry.attributes.normal.array),uvs=buffer(geometry.attributes.uv.array),edgePositions=buffer(edges.attributes.position.array);
    const atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([105,139,112,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    let destroyed=false;const image=new Image();image.onload=()=>{if(destroyed)return;const active=gl.getParameter(gl.ACTIVE_TEXTURE);gl.activeTexture(gl.TEXTURE0);const prior=gl.getParameter(gl.TEXTURE_BINDING_2D);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.bindTexture(gl.TEXTURE_2D,prior);gl.activeTexture(active);};image.src=new URL('../assets/living-knowledge-seed-atlas.png',import.meta.url).href;
    let entries=[];
    function attribute(name,value,size){gl.bindBuffer(gl.ARRAY_BUFFER,value);gl.enableVertexAttribArray(attrs[name]);gl.vertexAttribPointer(attrs[name],size,gl.FLOAT,false,0,0);}
    return {
        begin(){entries=[];},
        draw(view,record,knowledge,pose,opacity=1){
            if(!entries.some(entry=>entry.record===record))entries.push({record,knowledge,pose});
            const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),vp=new THREE.Matrix4().fromArray(view.projectionMatrix).multiply(new THREE.Matrix4().fromArray(view.transform.inverse.matrix));
            const depth=gl.isEnabled(gl.DEPTH_TEST),cull=gl.isEnabled(gl.CULL_FACE),blend=gl.isEnabled(gl.BLEND),mask=gl.getParameter(gl.DEPTH_WRITEMASK);
            gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(true);gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas);gl.uniform1i(uniforms.atlas,0);gl.uniform1f(uniforms.opacity,opacity);
            for(const object of workspace.items){
                const model=basis.clone().multiply(localObjectMatrix(object));gl.uniformMatrix4fv(uniforms.model,false,model.elements);gl.uniformMatrix4fv(uniforms.mvp,false,vp.clone().multiply(model).elements);gl.uniform1f(uniforms.lineMode,0);
                attribute('position',positions,3);attribute('normal',normals,3);attribute('uv',uvs,2);gl.drawArrays(gl.TRIANGLES,0,geometry.attributes.position.count);
                attribute('position',edgePositions,3);gl.disableVertexAttribArray(attrs.normal);gl.vertexAttrib3f(attrs.normal,0,1,0);gl.disableVertexAttribArray(attrs.uv);gl.vertexAttrib2f(attrs.uv,0,0);gl.uniform1f(uniforms.lineMode,1);gl.depthMask(false);gl.drawArrays(gl.LINES,0,edges.attributes.position.count);gl.depthMask(true);
            }
            if(workspace.connectors.length && record.knowledgeExplorer.connections && tether)for(const connector of workspace.connectors){const anchors=knowledgeConnectorAnchors(workspace,connector);if(!anchors)continue;const a=new THREE.Vector3(anchors.start.x,anchors.start.y,anchors.start.z).applyMatrix4(basis),b=new THREE.Vector3(anchors.end.x,anchors.end.y,anchors.end.z).applyMatrix4(basis);gl.depthMask(false);drawSpatialTether(gl,tether,view,a,b,{segments:10,width:.0026,curve:.025,lift:.04,startNormal:new THREE.Vector3(anchors.startNormal.x,anchors.startNormal.y,anchors.startNormal.z).transformDirection(basis),endNormal:new THREE.Vector3(anchors.endNormal.x,anchors.endNormal.y,anchors.endNormal.z).transformDirection(basis),color:[.68,.83,.70,opacity*.72]});}
            gl.depthMask(mask);if(!depth)gl.disable(gl.DEPTH_TEST);if(!cull)gl.disable(gl.CULL_FACE);if(!blend)gl.disable(gl.BLEND);
        },
        hit(ray,record=null){return entries.filter(entry=>!record || entry.record===record).map(entry=>hitKnowledgeObject(ray,entry.record,entry.knowledge,entry.pose,geometry)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0] || null;},
        near(point){
            let nearest=null;const worldPoint=new THREE.Vector3(point.x,point.y,point.z),position=geometry.attributes.position,triangle=new THREE.Triangle(),closest=new THREE.Vector3();
            for(const entry of entries){const workspace=ensureKnowledgeObjects(entry.record,entry.knowledge),basis=knowledgePoseMatrix(entry.pose);
                for(const object of workspace.items){
                    const matrix=basis.clone().multiply(localObjectMatrix(object)),localPoint=worldPoint.clone().applyMatrix4(matrix.clone().invert());
                    if(localPoint.length()>object.radius+.045)continue;
                    let distance=Infinity;
                    for(let i=0;i<position.count;i+=3){triangle.a.fromBufferAttribute(position,i);triangle.b.fromBufferAttribute(position,i+1);triangle.c.fromBufferAttribute(position,i+2);triangle.closestPointToPoint(localPoint,closest);distance=Math.min(distance,closest.distanceTo(localPoint));}
                    if(distance<=.035 && (!nearest || distance<nearest.distance))nearest={...entry,object,distance};
                }
            }return nearest;
        },
        destroy(){destroyed=true;image.onload=null;geometry.dispose();edges.dispose();buffers.forEach(value=>gl.deleteBuffer(value));gl.deleteTexture(atlas);gl.deleteProgram(program);entries=[];}
    };
}
