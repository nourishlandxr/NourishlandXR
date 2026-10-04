import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeSpatialRenderer} from './knowledgeSpatialRenderer.js';
import {createSpatialTetherRenderer} from './spatialTetherRenderer.js';
import {ensureKnowledgeObjects,rotateKnowledgeObject} from './knowledgeObjectModel.js';
import {gestureIntent,WHEEL_DRAG_RADIANS_PER_PIXEL,WHEEL_TOUCH_RADIANS_PER_PIXEL} from './wheel-model.js';
import {KNOWLEDGE_OBJECT_INSTRUCTION} from './knowledgeObjectRenderer.js';

export function mountKnowledgeObjectDesktop(container,options){
    const host=document.createElement('section');host.className='knowledge-object-field';host.setAttribute('aria-label','Explore knowledge objects');
    const heading=document.createElement('p');heading.className='knowledge-object-title';host.append(heading);
    const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Knowledge objects: drag to turn, or use the face controls');host.append(canvas);
    const hint=document.createElement('p');hint.className='knowledge-object-hint';hint.textContent=KNOWLEDGE_OBJECT_INSTRUCTION;host.append(hint);container.append(host);
    const abort=new AbortController(),listen=(target,type,handler)=>target.addEventListener(type,handler,{signal:abort.signal});
    const camera=new THREE.PerspectiveCamera(36,1,.01,40),pose={position:{x:0,y:0,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
    let settings=options,painter=null,tether=null,frame=0,gesture=null,disposed=false,framedCount=0,focus=new THREE.Vector3(),focusedObjectId='',settleUntil=0;
    const gl=canvas.getContext('webgl2',{alpha:true,antialias:true}) || canvas.getContext('webgl',{alpha:true,antialias:true});
    try{if(gl){tether=createSpatialTetherRenderer(gl);painter=createKnowledgeSpatialRenderer(gl,{tether});}}catch(error){console.warn('Knowledge objects:',error);}
    if(!painter){canvas.hidden=true;hint.textContent='Choose a face from the Control panel to explore the same knowledge.';}
    function request(continuing=false){if(!continuing)settleUntil=performance.now()+550;if(!frame && !disposed)frame=requestAnimationFrame(draw);}
    function rayAt(event){const box=canvas.getBoundingClientRect(),point=new THREE.Vector3((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2,.5).unproject(camera);return {origin:camera.position,direction:point.sub(camera.position).normalize()};}
    function draw(time){
        frame=0;if(disposed || !host.isConnected)return;
        const {record,knowledge,expanded}=settings,workspace=ensureKnowledgeObjects(record,knowledge),selected=workspace.items.find(item=>item.id===workspace.selectedObjectId) || workspace.items[0];heading.textContent=selected.title;
        if(painter){
            const box=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio || 1,1.5),width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
            if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
            if(framedCount!==workspace.items.length){framedCount=workspace.items.length;focus.set(workspace.items.reduce((sum,item)=>sum+item.position.x,0)/framedCount,workspace.items.reduce((sum,item)=>sum+item.position.y,0)/framedCount,0);}
            if(workspace.focusObjectId && workspace.focusObjectId!==focusedObjectId){focusedObjectId=workspace.focusObjectId;const target=workspace.items.find(item=>item.id===focusedObjectId);if(target)focus.set(target.position.x,target.position.y,target.position.z);}
            camera.aspect=width/height;camera.position.set(focus.x,focus.y,focus.z+Math.max(1.6,1.05/camera.aspect,.85+framedCount*.5));camera.lookAt(focus);camera.updateMatrixWorld();camera.updateProjectionMatrix();
            gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            const view={projectionMatrix:camera.projectionMatrix.elements,transform:{matrix:camera.matrixWorld.elements,inverse:{matrix:camera.matrixWorldInverse.elements}}};
            painter.begin();painter.draw(view,record,knowledge,expanded,pose,time);painter.end();
            canvas.dataset.objects=String(workspace.items.length);canvas.dataset.connectors=String(workspace.connectors.length);canvas.dataset.rotation=JSON.stringify(selected.rotation);canvas.dataset.arrangement=JSON.stringify(workspace.items.map(item=>({id:item.id,position:item.position,rotation:item.rotation})));
            hint.textContent=workspace.interaction==='move'?'Drag an object to move it. Choose Finish moving to return to turning.':KNOWLEDGE_OBJECT_INSTRUCTION;
        }
        if(time-settings.record.knowledgeExplorer.changedAt<700 || time<settleUntil || gesture)request(true);
    }
    listen(canvas,'pointerdown',event=>{
        if(event.button && event.pointerType==='mouse' || gesture)return;event.stopPropagation();event.preventDefault();const hit=painter?.hit(rayAt(event),settings.record);if(!hit)return;
        const workspace=ensureKnowledgeObjects(settings.record,settings.knowledge);workspace.selectedObjectId=hit.object.id;
        gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,intent:'pending',hit,move:workspace.interaction==='move' || event.shiftKey,sensitivity:event.pointerType==='touch'?WHEEL_TOUCH_RADIANS_PER_PIXEL:WHEEL_DRAG_RADIANS_PER_PIXEL,threshold:event.pointerType==='touch'?5:10};canvas.setPointerCapture(event.pointerId);request();
    });
    listen(canvas,'pointermove',event=>{
        if(!gesture || gesture.id!==event.pointerId)return;event.stopPropagation();event.preventDefault();const active=gesture;
        if(active.intent==='pending')active.intent=gestureIntent(event.clientX-active.startX,event.clientY-active.startY,{allowVertical:true,threshold:active.threshold});
        if(active.intent==='rotate'){
            const dx=event.clientX-active.lastX,dy=event.clientY-active.lastY;
            if(active.move){const units=2*camera.position.z*Math.tan(camera.fov*Math.PI/360)/canvas.getBoundingClientRect().height;active.hit.object.position.x+=dx*units;active.hit.object.position.y-=dy*units;active.hit.object.userPositioned=true;}
            else rotateKnowledgeObject(active.hit.object,dx*active.sensitivity,dy*active.sensitivity*.7);
            active.lastX=event.clientX;active.lastY=event.clientY;settings.record.knowledgeExplorer.saved=false;request();
        }
    });
    function finish(event){if(!gesture || gesture.id!==event.pointerId)return;event.stopPropagation();const active=gesture;gesture=null;if(event.type==='pointerup' && active.intent==='pending' && active.hit.node.pimKnowledgeFace)settings.onSelect?.(active.hit.node);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);request();}
    listen(canvas,'pointerup',finish);listen(canvas,'pointercancel',finish);listen(canvas,'lostpointercapture',finish);listen(canvas,'click',event=>event.stopPropagation());
    const observer=new ResizeObserver(()=>request());observer.observe(host);request();
    return {host,update(value){settings=value;request();},destroy(){disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);painter?.destroy();if(tether?.program)gl.deleteProgram(tether.program);if(tether?.buffer)gl.deleteBuffer(tether.buffer);host.remove();}};
}
