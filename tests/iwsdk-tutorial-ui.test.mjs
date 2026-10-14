import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as sdk from '../iwsdk/uiSdk.js';
import {createTutorialUIOwner} from '../app/services/iwsdkTutorialUI.js';
import {DOMParser,parseHTML} from '../iwsdk/node_modules/linkedom/esm/index.js';
import {handIndexCanPoke} from '../app/services/handPoke.js';

test('a wrist renderer initialization or target failure restores the native XR GL state',()=>{
    for(const phase of ['initialization','target']){
        const original={framebuffer:{native:true},program:{native:true},vao:{native:true},viewport:[450,0,450,700],scissor:[451,2,448,698]};
        const state={...original},values={FRAMEBUFFER_BINDING:original.framebuffer,CURRENT_PROGRAM:original.program,VERTEX_ARRAY_BINDING:original.vao,VIEWPORT:original.viewport,SCISSOR_BOX:original.scissor,DEPTH_WRITEMASK:true,DEPTH_FUNC:513,BLEND_SRC_RGB:770,BLEND_DST_RGB:771,BLEND_SRC_ALPHA:1,BLEND_DST_ALPHA:771};
        const gl=new Proxy({canvas:{},drawingBufferWidth:900,drawingBufferHeight:700,getParameter:key=>values[key],isEnabled:()=>true,enable(){},disable(){},depthMask(){},depthFunc(){},blendFuncSeparate(){},bindFramebuffer(_key,value){state.framebuffer=value;},useProgram(value){state.program=value;},bindVertexArray(value){state.vao=value;},viewport(...value){state.viewport=value;},scissor(...value){state.scissor=value;}},{get:(target,key)=>key in target?target[key]:String(key)});
        class Renderer{constructor(){state.framebuffer={wrong:true};if(phase==='initialization')throw Error('Initialization failed');this.xr={};this.properties={remove(){}};}resetState(){}setRenderTargetFramebuffer(){state.scissor=[0,0,1,1];throw Error('Target failed');}dispose(){}}
        const panel=new sdk.Group(),element=()=>({setProperties(){},addEventListener(){},removeEventListener(){}});
        panel.requireElementById=element;panel.document={rootElement:{setProperties(){}}};panel.dispose=()=>{};
        class Pointer{toggleSubPointer(){}update(){}dispose(){}}
        const owner=createTutorialUIOwner({input:{xrOrigin:new sdk.XROrigin()}},{...sdk,MultiPointer:Pointer,WebGLRenderer:Renderer,configureUIKitRenderer(){}},panel,{gl});
        try{owner.setContext({width:.2,height:700,items:[]},{center:new sdk.Vector3(),right:new sdk.Vector3(1,0,0),up:new sdk.Vector3(0,1,0),normal:new sdk.Vector3(0,0,1)});
            assert.throws(()=>owner.draw({}),/failed/i);
            assert.deepEqual(state,original,phase+' must restore the native swapchain and second-eye viewport');
        }finally{owner.dispose();}
    }
});

test('actual UIKitML wrist asset lays out controls and accepts one SDK ray click',async()=>{
    const savedDocument=globalThis.document,savedParser=globalThis.DOMParser,savedTextureLoad=sdk.TextureLoader.prototype.loadAsync;
    // This fixture proves layout/input, not font rasterisation or GPU drawing.
    sdk.TextureLoader.prototype.loadAsync=async()=>new sdk.DataTexture(new Uint8Array([255,255,255,255]),1,1);
    const context=new Proxy({createRadialGradient:()=>({addColorStop(){}})},{get:(target,key)=>target[key] || (()=>{})});
    const {document}=parseHTML('<html><body></body></html>'),create=document.createElement.bind(document);
    document.createElement=name=>name==='canvas'?{getContext:()=>context}:create(name);
    Object.defineProperty(document,'baseURI',{value:'http://localhost/'});globalThis.document=document;globalThis.DOMParser=DOMParser;
    let owner,panel;
    try{
        const source=await readFile(new URL('../iwsdk/public/ui/tutorial-wrist.uikitml',import.meta.url),'utf8');
        const id='test-tutorial-wrist';sdk.AssetManager.registerManifest({[id]:{type:sdk.AssetType.UIKitML,url:'data:text/plain;charset=utf-8,'+encodeURIComponent(source)}});
        panel=await sdk.loadUIKitMLAsset(id,{kit:'horizon'});
        const origin=new sdk.XROrigin(),right={handedness:'right',gamepad:{buttons:[{value:0,pressed:false},{value:0,pressed:false}]}};
        origin.raySpaces.right.position.set(0,1,.2);origin.updateMatrixWorld(true);
        const frame={session:{inputSources:[right],visibilityState:'visible'}};
        const ray={handedness:'right',origin:{x:0,y:1,z:.2},direction:{x:0,y:0,z:-1}};
        let joints=null;
        const runtime={input:{xrOrigin:origin},ray:input=>input===right?ray:null,controllerState:input=>{assert.ok(input,'controller lookup requires a current source');return input===right?{trigger:right.gamepad.buttons[0].pressed,handPose:joints}:null;},handState:()=>({tracked:true,pinch:false,rawJoints:new Map([...(joints || [])].map(([name,joint])=>[name,{matrix:joint.matrix,x:joint.matrix[12],y:joint.matrix[13],z:joint.matrix[14]}]))})};
        const activated=[],values=[];owner=createTutorialUIOwner(runtime,sdk,panel,{onAction:action=>activated.push(action),onValue:(action,value)=>values.push({action,value})});
        owner.setContext({width:.2,height:1000,anchorHand:'left',items:[{action:'Comfort:toggle',label:'Wrist menu',icon:'settings',x:375,y:375,width:250,height:250}]},
            {center:{x:0,y:1,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}});
        for(let i=0;i<12;i++)owner.update(frame,i*20);
        assert.ok(panel.document.computedSize?.width>0,'real UIKit layout resolves');
        assert.equal(panel.requireElementById('control-0').size.value[0],250,'button respects authored width, not kit minimum');
        assert.equal(panel.requireElementById('control-0').size.value[1],250,'button respects authored height, not kit minimum');
        assert.ok(owner.hit(ray)?.button.action==='Comfort:toggle','SDK ray contacts actual rendered control');
        right.gamepad.buttons[0].pressed=true;owner.update(frame,260);
        right.gamepad.buttons[0].pressed=false;owner.update(frame,280);
        assert.deepEqual(activated,['Comfort:toggle']);
        // A pointing virtual hand uses SDK TouchPointer with no trigger press.
        const point=z=>{
            const positions={'wrist':[0,1,z+.16],'index-finger-phalanx-proximal':[0,1,z+.12],
                'index-finger-phalanx-intermediate':[0,1,z+.08],'index-finger-tip':[0,1,z]};
            for(const finger of ['middle','ring','pinky']){positions[finger+'-finger-phalanx-proximal']=[.02,1,z+.12];positions[finger+'-finger-tip']=[.02,1,z+.15];}
            joints=new Map(Object.entries(positions).map(([name,p])=>[name,{matrix:new sdk.Matrix4().makeTranslation(...p).elements}]));
        };
        const touchProbe=[];
        for(const [i,z]of [.06,.045,.03,.02,.01,0,-.008].entries()){point(z);owner.update(frame,320+i*20);const p=owner.pointers.right,hit=p.touch.pointer.getIntersection();
            touchProbe.push({z,pointing:handIndexCanPoke({tracked:true,pinch:false,rawJoints:new Map([...joints].map(([name,joint])=>[name,{x:joint.matrix[12],y:joint.matrix[13],z:joint.matrix[14]}]))}),registered:p.touch.registered,active:p.getActivePointer()===p.touch.pointer,distance:hit?.distance,object:hit?.object?.name});}
        for(let i=0;i<4;i++)owner.update(frame,480+i*20);
        assert.equal(activated.length,1,'held contact cannot repeat or bypass release');
        point(.08);owner.update(frame,580);
        assert.deepEqual(activated,['Comfort:toggle','Comfort:toggle'],'fingertip press/release activates once without trigger: '+JSON.stringify(touchProbe));
        point(.03);owner.update(frame,600);point(0);owner.update(frame,620);point(.08);owner.update(frame,640);
        assert.equal(activated.length,3,'retreat permits another deliberate poke');
        right.hand={};point(.08);owner.update(frame,650);point(.03);owner.update(frame,660);point(0);owner.update(frame,670);point(.08);owner.update(frame,680);
        assert.equal(activated.length,4,'real tracked joint input also completes one SDK contact press');delete right.hand;
        joints=null;
        const sliderContext={width:.2,height:1000,anchorHand:'left',items:[{action:'Comfort:volume',label:'Voice volume',kind:'slider',text:true,min:0,max:2,step:.05,value:1,x:100,y:400,width:800,height:200}]};
        const sliderPose={center:{x:0,y:1,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}};
        owner.setContext(sliderContext,sliderPose);
        for(let i=0;i<8;i++)owner.update(frame,700+i*20);
        origin.raySpaces.right.position.x=.05;origin.updateMatrixWorld(true);ray.origin.x=.05;
        right.gamepad.buttons[0].pressed=true;owner.update(frame,900);
        const changed=values.length;assert.ok(changed>0,'slider captures the press');
        owner.setContext({...sliderContext,items:[{...sliderContext.items[0],value:values.at(-1).value}]},sliderPose);
        origin.raySpaces.right.position.x=-.04;origin.updateMatrixWorld(true);ray.origin.x=-.04;owner.update(frame,910);
        assert.ok(values.length>changed,'native value echo must preserve SDK drag capture');
        right.gamepad.buttons[0].pressed=false;owner.update(frame,920);
        assert.ok(values.some(item=>item.action==='Comfort:volume' && item.value>1),'actual SDK slider changes the authored numeric setting');
        const layout={width:.2,height:1000,anchorHand:'left',items:[
            {action:'left',icon:'settings',label:'Left',x:100,y:100,width:100,height:100},
            {action:'right',icon:'audio',label:'Right',x:800,y:100,width:100,height:100}]};
        owner.setContext(layout,{center:{x:0,y:1,z:0},right:{x:1,y:0,z:0},up:{x:0,y:1,z:0},normal:{x:0,y:0,z:1}});
        const aim=(x,y,time)=>{origin.raySpaces.right.position.set(x,y,.2);origin.updateMatrixWorld(true);Object.assign(ray.origin,{x,y});for(let i=0;i<4;i++)owner.update(frame,time+i*10);};
        aim(-.07,1.07,1000);assert.equal(owner.hit(ray)?.button.action,'left','rendered left cell matches authored spatial centre');
        aim(.07,1.07,1050);assert.equal(owner.hit(ray)?.button.action,'right','rendered right cell matches authored spatial centre');
        aim(0,1.07,1100);assert.equal(owner.hit(ray),null,'space between controls is not an oversized invisible target');
        frame.session.inputSources=[];owner.update(frame,940);assert.equal(owner.hit(ray),null,'source loss cannot leave a stale menu ray');
        owner.setContext(null,null);assert.equal(owner.hit(ray),null);assert.equal(owner.owns(right),false);
        owner.dispose();owner.dispose();assert.ok(panel.document.disposed);
    }finally{owner?.dispose();if(!owner)panel?.dispose();await new Promise(resolve=>setTimeout(resolve,100));sdk.TextureLoader.prototype.loadAsync=savedTextureLoad;globalThis.document=savedDocument;globalThis.DOMParser=savedParser;}
});
