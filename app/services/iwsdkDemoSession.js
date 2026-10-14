// Scoped ownership for native demo markers; no replacement scene or XR loop.
export function createDemoSDKSession(runtime,{voice,onGrab=()=>{},onRelease=()=>{}}={}){
    const interaction=runtime.createDemoInteractions();
    let audio=null,disposed=false,lastTime=null;
    const held=new Map();
    const ready=runtime.createDemoAudio?.(voice).then(value=>{if(disposed)value?.dispose();else audio=value;})
        .catch(error=>console.warn('IWSDK demo audio:',error.message));
    return {
        interaction,ready,
        update(frame,time,{records=[],inputs=[],enabled=true,viewer,zinnia,bee,muted=false,paused=false}={}){
            if(disposed)return;
            const dt=lastTime===null?0:Math.max(0,Math.min(.06,(time-lastTime)/1000));lastTime=time;
            const targets=records.map(({record,halfSize})=>({id:String(record.id),position:record.position,rotation:{x:0,y:Math.sin((record.rotationY || 0)/2),z:0,w:Math.cos((record.rotationY || 0)/2)},halfSize,visible:enabled}));
            const scopedInputs=inputs.map(input=>({...input,uiBlocked:input.uiBlocked || held.size>0 && !held.has(input.source)}));
            interaction.step(scopedInputs,targets,{rootMatrix:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],dt,time:time/1000,enabled});
            const current=new Map();
            for(const input of inputs){const hold=interaction.held(input.source);if(!hold)continue;
                const record=records.find(entry=>String(entry.record.id)===hold.id)?.record;if(!record)continue;
                current.set(input.source,record);if(held.get(input.source)!==record)onGrab(record,input.source);
                record.position={x:hold.matrix[12],y:hold.matrix[13],z:hold.matrix[14]};
                record.informationPose=null;record.informationPosition=null;
            }
            for(const [source,record]of held)if(current.get(source)!==record)onRelease(record,source);
            held.clear();for(const [source,record]of current)held.set(source,record);
            audio?.update(dt,time/1000,{viewer,zinnia,insect:bee,flying:Boolean(bee),visible:enabled && frame.session.visibilityState==='visible',muted,paused});
        },
        owns:source=>held.has(source),
        reset(){interaction.reset();for(const [source,record]of held)onRelease(record,source);held.clear();audio?.suspend();lastTime=null;},
        snapshot:()=>({interaction:interaction.snapshot(),audio:audio?.snapshot() || null}),
        dispose(){if(disposed)return;disposed=true;interaction.dispose();audio?.dispose();audio=null;held.clear();}
    };
}
