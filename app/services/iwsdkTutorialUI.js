import {handIndexCanPoke} from './handPoke.js';

const icons={settings:'Settings',repeat:'RotateCcw',controller:'Gamepad2',audio:'Volume2',mute:'VolumeX',lesson:'BookOpen',hand:'Hand',play:'Play',pause:'Pause',close:'X',back:'ChevronLeft',mic:'Mic',check:'Check',brush:'Paintbrush',undo:'Undo2',redo:'Redo2'};
// Actual UIKitML components and SDK touch/ray pointers, not a canvas facsimile.
export function createTutorialUIOwner(runtime,sdk,panel,{gl=null,onAction=()=>{},onValue=()=>{},occupied=()=>false}={}){
    const {Scene,PerspectiveCamera,Matrix4,Vector3,MultiPointer,XROrigin,WebGLRenderer,WebGLRenderTarget}=sdk;
    const scene=new Scene(),camera=new PerspectiveCamera(),origin=new XROrigin();scene.add(origin,panel);
    panel.name='NLXR tutorial wrist';panel.visible=false;camera.matrixAutoUpdate=false;
    const pointers=Object.fromEntries(['left','right'].map(side=>[side,new MultiPointer(side,scene,camera,origin)]));
    for(const pointer of Object.values(pointers))pointer.toggleSubPointer('grab',false);
    scene.grabDescendants=[];scene.rayDescendants=[panel];scene.touchDescendants=[panel];
    const slots=Array.from({length:48},(_,i)=>({button:panel.requireElementById('control-'+i),label:panel.requireElementById('label-'+i),slider:panel.requireElementById('slider-'+i),
        icons:Object.fromEntries(Object.values(icons).map(name=>[name,panel.requireElementById(`icon-${i}-${name}`)])),item:null}));
    const sources=new Map(),hover=new Map(),pressed=new Map(),queued=[],spentTouch=new Set(),blockedRay=new WeakSet(),cleanup=[];
    const transform=new Matrix4(),right=new Vector3(),up=new Vector3(),normal=new Vector3();
    let context=null,pose=null,signature='',lastTime=null,disposed=false,renderer=null,target=null,opacity=1;
    const sourceFor=id=>sources.get(id);
    for(const slot of slots){
        const over=event=>{if(slot.item && !slot.item.disabled){hover.set(event.pointerId,slot);if(!slot.item.text && icons[slot.item.icon])slot.label.setProperties({display:'flex',positionType:'absolute',positionTop:slot.item.height+10,width:600,height:70,pointerEvents:'none',backgroundColor:'#e1ebe6'});}};
        const out=event=>{if(hover.get(event.pointerId)===slot)hover.delete(event.pointerId);if(slot.item && !slot.item.text && icons[slot.item.icon])slot.label.setProperties({display:'none'});};
        const click=event=>{
            const source=sourceFor(event.pointerId),item=slot.item;if(!source || !item || item.disabled || disposed || !context)return;
            const touch=pointers[source.handedness].touch.pointer.id===event.pointerId;
            if(touch && spentTouch.has(source))return;
            if(touch){const tip=tipState(source)?.rawJoints.get('index-finger-tip');
                const distance=tip?(tip.x-pose.center.x)*pose.normal.x+(tip.y-pose.center.y)*pose.normal.y+(tip.z-pose.center.z)*pose.normal.z:Infinity;
                if(distance<=.04)spentTouch.add(source);}
            if(item.kind!=='slider')onAction(item.action,source);
        };
        for(const [type,handler]of [['pointerover',over],['pointerout',out],['click',click]]){
            slot.button.addEventListener(type,handler);cleanup.push(()=>slot.button.removeEventListener(type,handler));
        }
    }
    function reset(){for(const pointer of Object.values(pointers))pointer.update(false,0,0);hover.clear();pressed.clear();queued.length=0;sources.clear();}
    function setContext(value,nextPose){
        context=value;pose=nextPose;panel.visible=Boolean(value && nextPose);
        if(!panel.visible){reset();return;}
        const next=JSON.stringify({height:value.height,items:value.items.map(({action,x,y,width,height,disabled,selected,icon,label,kind})=>({action,x,y,width,height,disabled,selected,icon,label,kind}))});
        if(next!==signature){
            reset();signature=next;
            // Keep the authored 1000-unit layout. Scaling the entire document also
            // scales Horizon's internal slider thumb, labels and control metrics.
            panel.document.rootElement.setProperties({width:1000,height:value.height});
            for(const [i,slot]of slots.entries()){
                const item=value.items[i];slot.item=item || null;slot.button.name=item?.action || 'unused-'+i;
                slot.button.setProperties(item?{display:'flex',positionType:'absolute',positionLeft:item.x,positionTop:item.y,width:item.width,height:item.height,
                    minWidth:0,minHeight:0,padding:0,disabled:Boolean(item.disabled),borderWidth:item.selected?6:3,borderColor:'#466b5c',backgroundColor:item.selected?'#bddcca':'#e1ebe6',hover:{backgroundColor:'#c7dfd3',color:'#172c25'},opacity:item.disabled?.4:1}: {display:'none'});
                const icon=item && !item.text?icons[item.icon]:null;
                slot.label.setProperties({display:item && !icon?'flex':'none',positionType:item?.kind==='slider'?'absolute':'relative',positionTop:item?.kind==='slider'?3:0,width:item?.kind==='slider'?'100%':'auto',text:item?.label || '',color:'#172c25',fontSize:25,textAlign:'center'});
                for(const [name,element]of Object.entries(slot.icons))element.setProperties({display:name===icon?'flex':'none',width:item?Math.min(item.width,item.height)*.58:60,height:item?Math.min(item.width,item.height)*.58:60});
                slot.slider.setProperties({display:item?.kind==='slider'?'flex':'none',positionType:'absolute',positionTop:35,height:item?.kind==='slider'?Math.max(48,item.height-40):48,value:item?.kind==='slider'?(item.value-item.min)/(item.max-item.min):0,
                    onValueChange:value=>{const item=slot.item;if(item?.kind!=='slider' || item.disabled)return;const raw=item.min+value*(item.max-item.min),step=item.step || .01;
                        onValue(item.action,Math.max(item.min,Math.min(item.max,Math.round(raw/step)*step)));}});
            }
        }
        // Values change continuously while dragging: never reset pointer capture
        // merely because the native setting echoed a new slider value.
        for(const [i,slot]of slots.entries()){slot.item=value.items[i] || null;if(slot.item?.kind==='slider')slot.slider.setProperties({value:(slot.item.value-slot.item.min)/(slot.item.max-slot.item.min)});}
        right.copy(nextPose.right);up.copy(nextPose.up);normal.copy(nextPose.normal);
        transform.makeBasis(right,up,normal);panel.quaternion.setFromRotationMatrix(transform);panel.position.copy(nextPose.center);panel.scale.setScalar(value.width/10);
    }
    const tipState=source=>{
        if(source.hand)return runtime.handState(source,[]);
        const state=runtime.controllerState(source);if(!state?.handPose)return null;
        const rawJoints=new Map([...state.handPose].map(([name,joint])=>[name,{matrix:joint.matrix,x:joint.matrix[12],y:joint.matrix[13],z:joint.matrix[14]}]));
        return {tracked:true,pinch:state.trigger,rawJoints};
    };
    function update(frame,time,blocked=false){
        if(disposed || !panel.visible){reset();return;}
        const dt=lastTime===null?1/90:Math.min(.06,Math.max(0,(time-lastTime)/1000));lastTime=time;
        panel.document.rootElement.update?.(dt*1000);scene.updateMatrixWorld(true);
        const all=[...(frame?.session?.inputSources || [])];
        for(const side of ['left','right']){
            const source=all.find(source=>source.handedness===side),pointer=pointers[side];
            const ray=source && runtime.ray(source),state=source && tipState(source),tip=state?.rawJoints.get('index-finger-tip');
            const connected=Boolean(source && ray && opacity>.2 && !blocked && !occupied(source) && frame.session.visibilityState==='visible');
            for(const kind of ['ray','touch']){sources.delete(pointer[kind].pointer.id);if(connected)sources.set(pointer[kind].pointer.id,source);}
            origin.raySpaces[side].matrixAutoUpdate=false;if(source)origin.raySpaces[side].matrix.copy(runtime.input.xrOrigin.raySpaces[side].matrixWorld);
            origin.indexTipSpaces[side].matrixAutoUpdate=false;if(tip)origin.indexTipSpaces[side].matrix.fromArray(tip.matrix);
            const distance=tip?(tip.x-pose.center.x)*pose.normal.x+(tip.y-pose.center.y)*pose.normal.y+(tip.z-pose.center.z)*pose.normal.z:Infinity;
            if(distance>.04 || !connected)spentTouch.delete(source);
            pointer.toggleSubPointer('touch',connected && distance>=-.025 && source.handedness!==context.anchorHand && handIndexCanPoke(state) && !spentTouch.has(source));
            origin.updateMatrixWorld(true);
            const events=queued.filter(event=>event.source===source);const value=Boolean(source && (source.hand?state?.pinch:runtime.controllerState(source)?.trigger));
            if(!connected){if(source && (pressed.get(side) || value))blockedRay.add(source);pointer.update(false,dt,time/1000);pressed.delete(side);continue;}
            if(!value)blockedRay.delete(source);
            pointer.update(true,dt,time/1000);
            const edges=blockedRay.has(source)?[false]:events.length?events.map(event=>event.type==='selectstart'):[Boolean(value)];
            for(const down of edges)if(Boolean(pressed.get(side))!==down){pointer.update(true,0,time/1000,{selectStart:down,selectEnd:!down});pressed.set(side,down);}
        }
        queued.length=0;
    }
    function hit(ray){
        if(!panel.visible || opacity<=.2 || !ray)return null;
        for(const [side,pointer]of Object.entries(pointers)){
            const source=sources.get(pointer.ray.pointer.id);if(!source || ray.handedness && ray.handedness!==side)continue;
            const slot=hover.get(pointer.ray.pointer.id),intersection=pointer.ray.pointer.getIntersection();
            if(slot?.item && intersection && !intersection.object?.isVoidObject)return {kind:'panel',sdkUI:true,card:{id:context.cardId || 'control'},button:slot.item,distance:intersection.distance,worldPoint:intersection.point};
        }return null;
    }
    return {
        backend:'iwsdk-uikitml',panel,scene,pointers,setContext,update,hit,
        setOpacity(value){opacity=Math.max(0,Math.min(1,value));panel.document.rootElement.setProperties({opacity});if(opacity<=.2)reset();},
        get ready(){return !disposed;},
        owns:source=>Boolean(panel.visible && opacity>.2 && source && [...hover.keys()].some(id=>sourceFor(id)===source)),
        handleEvent(event){if(!context || !['selectstart','selectend'].includes(event.type) || !hit(runtime.ray(event.inputSource)))return false;queued.push({type:event.type,source:event.inputSource});return true;},
        draw(view){
            if(disposed || !panel.visible || !gl)return;
            const framebuffer=gl.getParameter(gl.FRAMEBUFFER_BINDING),viewport=gl.getParameter(gl.VIEWPORT),scissor=gl.getParameter(gl.SCISSOR_BOX);
            const flags=[gl.BLEND,gl.DEPTH_TEST,gl.CULL_FACE,gl.SCISSOR_TEST].map(flag=>[flag,gl.isEnabled(flag)]);
            const depthWrite=gl.getParameter(gl.DEPTH_WRITEMASK),depthFunc=gl.getParameter(gl.DEPTH_FUNC),program=gl.getParameter(gl.CURRENT_PROGRAM),vao=gl.getParameter(gl.VERTEX_ARRAY_BINDING);
            const blend=[gl.BLEND_SRC_RGB,gl.BLEND_DST_RGB,gl.BLEND_SRC_ALPHA,gl.BLEND_DST_ALPHA].map(flag=>gl.getParameter(flag));
            try{
            if(!renderer){renderer=new WebGLRenderer({canvas:gl.canvas,context:gl,alpha:true,antialias:false});sdk.configureUIKitRenderer(renderer);}
            renderer.autoClear=false;renderer.xr.enabled=false;
            target ||= new WebGLRenderTarget(gl.drawingBufferWidth,gl.drawingBufferHeight,{depthBuffer:false,stencilBuffer:false});
            renderer.resetState();target.viewport.set(...viewport);target.scissor.set(...viewport);target.scissorTest=true;
            renderer.setRenderTargetFramebuffer(target,framebuffer);renderer.setRenderTarget(target);
            camera.projectionMatrix.fromArray(view.projectionMatrix);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.matrix.fromArray(view.transform.matrix);camera.updateMatrixWorld(true);
            renderer.render(scene,camera);}finally{renderer?.resetState();gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(...viewport);gl.scissor(...scissor);
                for(const [flag,enabled]of flags)enabled?gl.enable(flag):gl.disable(flag);gl.depthMask(depthWrite);gl.depthFunc(depthFunc);gl.blendFuncSeparate(...blend);gl.useProgram(program);gl.bindVertexArray(vao);}
        },
        snapshot:()=>({backend:'iwsdk-uikitml',visible:panel.visible,actions:slots.filter(slot=>slot.item).map(slot=>slot.item.action),hovered:[...hover.values()].map(slot=>slot.item?.action)}),
        dispose(){if(disposed)return;reset();disposed=true;cleanup.forEach(fn=>fn());for(const pointer of Object.values(pointers))pointer.dispose();panel.dispose();panel.removeFromParent();
            // The XR swapchain framebuffer belongs to NLXR, never this adapter.
            if(target && renderer){renderer.properties.remove(target);target=null;}renderer?.dispose();scene.clear();}
    };
}
