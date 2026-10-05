import * as THREE from '../vendor/three.module.min.js';
import {diceFacetRegions} from './heroDiceGeometry.js';
import {createKnowledgeArchitectureRenderer} from './knowledgeArchitectureRenderer.js';
import {ensureKnowledgeObjects,knowledgeObjectIndex,knowledgePoseMatrix,localObjectMatrix,setKnowledgeArchitectureGeometry,visibleKnowledgeObjects} from './knowledgeObjectModel.js';

export const KNOWLEDGE_OBJECT_INSTRUCTION='Hold a domain face to unfold its wing. Explore the inset panels. Grab the structure to turn or move it.';
export function knowledgeFaceCanvas(card){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
    ctx.fillStyle='rgba(14,32,29,.16)';ctx.beginPath();ctx.roundRect(4,4,504,248,28);ctx.fill();ctx.strokeStyle=card.hovered?'#f0fbf8':card.selected?'#dceabd':'#adc6bc';ctx.lineWidth=card.selected || card.hovered?8:3;ctx.stroke();
    ctx.fillStyle='#edf3e4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 56px Manrope, system-ui';
    const lines=[];let line='';for(const word of String(card.title).split(/\s+/)){const next=(line?line+' ':'')+word;if(ctx.measureText(next).width>452 && line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.slice(0,3).forEach((text,i)=>ctx.fillText(text+(i===2 && lines.length>3?'…':''),256,100+(i-(Math.min(3,lines.length)-1)/2)*60,460));
    ctx.font='500 25px Manrope, system-ui';ctx.fillStyle='#c6dacf';ctx.fillText(card.context?'Return to context':card.role==='information'?'Press to read':card.role==='branch'?'Press to explore':'Read · Explore this',256,211,460);return canvas;
}
export function knowledgeObjectSurfaces(record,knowledge,pose){
    const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),index=knowledgeObjectIndex(knowledge),surfaces=[];
    for(const object of visibleKnowledgeObjects(workspace)){
        const matrix=basis.clone().multiply(localObjectMatrix(object));
        for(const face of [...object.faces,object.contextFace].filter(face=>face?.localAnchor && face?.localNormal)){
            const n=new THREE.Vector3(face.localNormal.x,face.localNormal.y,face.localNormal.z),r=new THREE.Vector3(0,1,0).cross(n);if(r.length()<.01)r.set(1,0,0);r.normalize();const u=n.clone().cross(r).normalize();
            const centre=new THREE.Vector3(face.localAnchor.x,face.localAnchor.y,face.localAnchor.z).applyMatrix4(matrix);n.transformDirection(matrix);r.transformDirection(matrix);u.transformDirection(matrix);
            const context=face.role==='contextual',node=index.nodes.get(face.conceptId);if(!node && !context)continue;
            const id=object.id+'|'+face.faceId;
            surfaces.push({record,object,face,node:{...node,path:node?.path || '',nodeId:node?.id,pimKnowledgeFace:!context,pimKnowledgeContext:context,knowledgeObjectId:object.id,knowledgeFaceId:face.faceId},center:centre,right:r,up:u,normal:n,width:(face.faceWidth || face.faceRadius*1.5)*object.scale,height:(face.faceHeight || face.faceRadius*1.5)*object.scale,interactive:true,pressProgress:record.pimObjectPressId===id?record.pimObjectPressProgress:0,card:{id,title:context?object.title:face.title,role:face.role,context,knowledgeFace:true,selected:workspace.selectedFaceId===face.faceId,resolution:512,height:256,fadeDuration:120}});
        }
    }
    return surfaces;
}
export function hitKnowledgeObject(ray,record,knowledge,pose,geometry){
    if(!ray?.origin || !ray?.direction || !pose)return null;
    const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),position=geometry.attributes.position,index=knowledgeObjectIndex(knowledge);
    let best=null;const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),point=new THREE.Vector3(),origin=new THREE.Vector3(ray.origin.x,ray.origin.y,ray.origin.z),direction=new THREE.Vector3(ray.direction.x,ray.direction.y,ray.direction.z).normalize();
    for(const object of visibleKnowledgeObjects(workspace)){
        const matrix=basis.clone().multiply(localObjectMatrix(object)),localRay=new THREE.Ray(origin.clone(),direction.clone()).applyMatrix4(matrix.clone().invert()),regions=diceFacetRegions(geometry,7);
        for(let i=0;i<position.count;i+=3){
            a.fromBufferAttribute(position,i);b.fromBufferAttribute(position,i+1);c.fromBufferAttribute(position,i+2);
            if(!localRay.intersectTriangle(a,b,c,true,point))continue;const world=point.clone().applyMatrix4(matrix),distance=world.distanceTo(origin);if(best && distance>=best.distance)continue;
            const face=regions[i/3]===24?object.contextFace:object.faces[regions[i/3]],node=face?.role!=='contextual'?index.nodes.get(face?.conceptId):null;
            best={record,object,pose,face,distance,point:world,center:world,node:node?{...node,nodeId:node.id,pimKnowledgeFace:true,knowledgeObjectId:object.id,knowledgeFaceId:face.faceId}:{path:'',pimCore:true,pimKnowledgeContext:true,knowledgeObjectId:object.id}};
        }
    }
    return best;
}
export function createKnowledgeObjectRenderer(gl,{tether=null}={}){
    let architecture=null,entries=[];
    return {
        begin(){entries=[];},
        draw(view,record,knowledge,pose,opacity=1,time=performance.now()){
            architecture ||= createKnowledgeArchitectureRenderer(gl);
            record.knowledgeObjectPose=pose;
            const workspace=ensureKnowledgeObjects(record,knowledge),basis=knowledgePoseMatrix(pose),visible=visibleKnowledgeObjects(workspace);
            for(const object of visible){
                object.pressFaceIndex=object.faces.findIndex(face=>face && object.id+'|'+face.faceId===record.pimObjectPressId);object.pressProgress=record.pimObjectPressProgress || 0;
                const geometry=architecture.draw(view,basis.clone().multiply(localObjectMatrix(object)),object,opacity,time);
                setKnowledgeArchitectureGeometry(object,geometry);
                if(opacity>.55 && !entries.some(entry=>entry.record===record))entries.push({record,knowledge,pose,geometry});
            }
        },
        hit(ray,record=null){return entries.filter(e=>!record || e.record===record).map(e=>hitKnowledgeObject(ray,e.record,e.knowledge,e.pose,e.geometry)).filter(Boolean).sort((a,b)=>a.distance-b.distance)[0] || null;},
        near(point){
            if(!point)return null;let nearest=null;const worldPoint=new THREE.Vector3(point.x,point.y,point.z),triangle=new THREE.Triangle(),closest=new THREE.Vector3();
            for(const entry of entries){const w=ensureKnowledgeObjects(entry.record,entry.knowledge),basis=knowledgePoseMatrix(entry.pose),index=knowledgeObjectIndex(entry.knowledge),positions=entry.geometry.attributes.position,regions=diceFacetRegions(entry.geometry,7);
                for(const object of visibleKnowledgeObjects(w)){
                    const matrix=basis.clone().multiply(localObjectMatrix(object)),localPoint=worldPoint.clone().applyMatrix4(matrix.clone().invert());if(localPoint.length()>object.radius+.045/object.scale)continue;
                    for(let i=0;i<positions.count;i+=3){
                        triangle.a.fromBufferAttribute(positions,i);triangle.b.fromBufferAttribute(positions,i+1);triangle.c.fromBufferAttribute(positions,i+2);triangle.closestPointToPoint(localPoint,closest);
                        const distance=closest.distanceTo(localPoint)*object.scale;if(distance>.045 || nearest && distance>=nearest.distance)continue;
                        const normal=triangle.getNormal(new THREE.Vector3()),signedDistance=localPoint.clone().sub(closest).dot(normal)*object.scale,face=regions[i/3]===24?object.contextFace:object.faces[regions[i/3]],concept=face?.role!=='contextual'?index.nodes.get(face?.conceptId):null;
                        const node=concept?{...concept,nodeId:concept.id,pimKnowledgeFace:true,knowledgeObjectId:object.id,knowledgeFaceId:face.faceId}:{path:'',pimCore:true,pimKnowledgeContext:true,knowledgeObjectId:object.id};
                        nearest={...entry,object,face,node,distance,signedDistance,center:closest.clone().applyMatrix4(matrix),normal:normal.transformDirection(matrix),card:{id:object.id+'|'+(face?.faceId || 'context'),knowledgeFace:true},interactive:true};
                    }
                }
            }return nearest;
        },
        destroy(){architecture?.destroy();entries=[];}
    };
}
