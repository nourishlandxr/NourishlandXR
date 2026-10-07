import * as THREE from '../vendor/three.module.min.js';
import {createKnowledgeSpatialRenderer} from './knowledgeSpatialRenderer.js';
import {createSpatialTetherRenderer} from './spatialTetherRenderer.js';
import {rotateKnowledgeObject} from './knowledgeObjectModel.js';
import {ensureExplorerMolecule,explorerMoleculeIndex,commitExplorerPuzzle,magnetExplorerPuzzle} from './explorerMoleculeModel.js';
import {gestureIntent,WHEEL_DRAG_RADIANS_PER_PIXEL,WHEEL_TOUCH_RADIANS_PER_PIXEL} from './wheel-model.js';
const KNOWLEDGE_OBJECT_INSTRUCTION='Open a topic face to build its branch. Drag the loose arm into the matching socket, release to attach, then fit the topic onto its free end. Drag the dice to turn it; Shift-drag a branch to move it. Alt-drag an arm to turn it.';

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
        const {record,knowledge,expanded}=settings,workspace=ensureExplorerMolecule(record,knowledge),selected=workspace.root;heading.textContent=explorerMoleculeIndex(knowledge,record).title;
        if(painter){
            const box=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio || 1,1.5),width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
            if(canvas.width!==width || canvas.height!==height){canvas.width=width;canvas.height=height;}
            const distance=settings.viewDistance || 1.5,angle=settings.viewAngle || 0;
            const radius=Math.max(.35,(workspace.root.radius || .52)*workspace.root.scale);
            camera.fov=Math.max(32,Math.min(82,2*Math.atan(radius*1.15/distance)*180/Math.PI));camera.aspect=width/height;camera.position.set(Math.sin(angle)*distance,focus.y,Math.cos(angle)*distance);camera.lookAt(focus);camera.updateMatrixWorld();camera.updateProjectionMatrix();
            gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
            const view={projectionMatrix:camera.projectionMatrix.elements,transform:{matrix:camera.matrixWorld.elements,inverse:{matrix:camera.matrixWorldInverse.elements}}};
            painter.begin();painter.draw(view,record,knowledge,expanded,pose,time);painter.end();
            canvas.dataset.objects=String(workspace.renderedCount ?? 1);canvas.dataset.connectors=String(workspace.renderedBonds ?? 0);canvas.dataset.lod=workspace.lod;canvas.dataset.rotation=JSON.stringify(selected.rotation);canvas.dataset.arrangement=JSON.stringify(workspace.positions);canvas.dataset.wings=JSON.stringify(workspace.wings);
            hint.textContent=workspace.puzzle?.phase==='connector'?'Drag the loose arm into its matching socket. Release when the socket confirms the fit.':workspace.puzzle?.phase==='piece'?'Arm attached. Drag the topic onto its free end and release to build the branch.':workspace.interaction==='move'?'Drag an object to move it. Choose Finish moving to return to turning.':KNOWLEDGE_OBJECT_INSTRUCTION;
        }
        if(time-settings.record.knowledgeExplorer.changedAt<1000 || time<settleUntil || gesture)request(true);
    }
    listen(canvas,'pointerdown',event=>{
        if(event.button && event.pointerType==='mouse' || gesture)return;event.stopPropagation();event.preventDefault();const hit=painter?.hit(rayAt(event),settings.record);if(!hit)return;
        const workspace=ensureExplorerMolecule(settings.record,settings.knowledge);
        gesture={id:event.pointerId,startX:event.clientX,startY:event.clientY,lastX:event.clientX,lastY:event.clientY,intent:'pending',hit,move:!event.altKey&&(hit.node.pending || workspace.interaction==='move' || event.shiftKey),sensitivity:event.pointerType==='touch'?WHEEL_TOUCH_RADIANS_PER_PIXEL:WHEEL_DRAG_RADIANS_PER_PIXEL,threshold:event.pointerType==='touch'?5:10};canvas.setPointerCapture(event.pointerId);request();
    });
    listen(canvas,'pointermove',event=>{
        if(!gesture || gesture.id!==event.pointerId)return;event.stopPropagation();event.preventDefault();const active=gesture;
        if(active.intent==='pending')active.intent=gestureIntent(event.clientX-active.startX,event.clientY-active.startY,{allowVertical:true,threshold:active.threshold});
        if(active.intent==='rotate'){
            const dx=event.clientX-active.lastX,dy=event.clientY-active.lastY;
            if(active.move){const depth=Math.max(.05,-active.hit.center.clone().applyMatrix4(camera.matrixWorldInverse).z),units=2*depth*Math.tan(camera.fov*Math.PI/360)/canvas.getBoundingClientRect().height,delta=new THREE.Vector3(dx*units,-dy*units,0).applyQuaternion(camera.quaternion),root=settings.record.explorerMolecule.root,rootRotation=new THREE.Quaternion(root.rotation.x,root.rotation.y,root.rotation.z,root.rotation.w);if(active.hit.object!==root)delta.applyQuaternion(rootRotation.invert()).divideScalar(root.scale);active.hit.object.position.x+=delta.x;active.hit.object.position.y+=delta.y;active.hit.object.position.z+=delta.z;active.hit.object.userPositioned=true;}
            else rotateKnowledgeObject(active.hit.object,dx*active.sensitivity,dy*active.sensitivity*.7);
            magnetExplorerPuzzle(settings.record,settings.knowledge,active.hit.object);active.lastX=event.clientX;active.lastY=event.clientY;settings.record.knowledgeExplorer.saved=false;request();
        }
    });
    function finish(event){if(!gesture || gesture.id!==event.pointerId)return;event.stopPropagation();const active=gesture;gesture=null;if(event.type==='pointerup'){if(active.hit.node.pending){if(commitExplorerPuzzle(settings.record,settings.knowledge))settings.onSelect?.({explorerNodeId:settings.record.explorerMolecule.selectedId});}else if(active.intent==='pending')settings.onSelect?.(active.hit.node);}if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);request();}
    listen(canvas,'pointerup',finish);listen(canvas,'pointercancel',finish);listen(canvas,'lostpointercapture',finish);listen(canvas,'click',event=>event.stopPropagation());
    const observer=new ResizeObserver(()=>request());observer.observe(host);request();
    return {host,update(value){settings=value;request();},destroy(){disposed=true;abort.abort();observer.disconnect();cancelAnimationFrame(frame);painter?.destroy();if(tether?.program)gl.deleteProgram(tether.program);if(tether?.buffer)gl.deleteBuffer(tether.buffer);host.remove();}};
}
