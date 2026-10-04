import {configureXRFrameRate,safeXRFrameRate} from './webxrSession.js';
import {getSpatialVisualSettings,setSpatialVisualSettings} from './spatialVisualSettings.js';

// Callback cadence is a recovery signal, not a compositor/GPU timing measurement.
export function createXRPerformanceSettings({getSession,publish,configure=configureXRFrameRate}) {
    let tracked=null,started=null,frames=0,fps=null,observedRate=null,pending=false;
    let requestId=0,changedAt=0,lastTick=0,slowWindows=0,message='',desired=null,lastRecoveryAt=-Infinity;
    let cpuTotal=0,cpuFrames=0,cpuMs=null,heaviest='';const phaseCosts=new Map();
    const snapshot=()=>{
        const session=getSession(),prefs=getSpatialVisualSettings();
        return {rate:prefs.refreshRate,showFps:prefs.showFps,pending,message,cpuMs,heaviest,
            supported:typeof session?.updateTargetFrameRate==='function'?Array.from(session.supportedFrameRates || []):[],
            actual:session?.frameRate || null,label:`${fps===null?'Measuring...':fps+' FPS'} / ${session?.frameRate || '?'} Hz`};
    };
    const notify=()=>publish(snapshot());
    async function apply(rate,{recovery=false}={}){
        const session=getSession();if(!session || typeof session.updateTargetFrameRate!=='function')return;
        if(tracked!==session){tracked=session;started=null;frames=0;fps=null;observedRate=null;}
        const id=++requestId;desired=rate;pending=true;slowWindows=0;changedAt=lastTick;
        message=recovery?'Returning to a steadier refresh rate…':`Requesting ${rate} Hz…`;notify();
        try{
            const result=await configure(session,rate);
            if(id!==requestId || getSession()!==session)return;
            if(result.requested!==null){
                desired=result.requested;setSpatialVisualSettings({refreshRate:result.requested});
                message=recovery?`Returned to ${result.requested} Hz for smoother motion.`:`${result.requested} Hz requested. Lower rates remain available.`;
            }else{
                message='The headset did not apply that rate. Choose a lower rate or reopen AR.';
                if(rate>90){pending=false;await apply(safeXRFrameRate(session),{recovery:true});return;}
            }
        }catch{if(id===requestId)message='Refresh request failed. Lower rates remain available.';}
        finally{if(id===requestId){pending=false;notify();}}
    }
    return {
        publish:notify,
        recordCpuCost(phase,milliseconds){phaseCosts.set(phase,(phaseCosts.get(phase)||0)+milliseconds);},
        frameComplete(milliseconds){cpuTotal+=milliseconds;cpuFrames++;},
        tick(time){
            const session=getSession();if(!session)return;
            lastTick=time;
            if(tracked!==session){tracked=session;started=null;frames=0;fps=null;observedRate=null;requestId++;pending=false;slowWindows=0;desired=getSpatialVisualSettings().refreshRate;message='';changedAt=time;lastRecoveryAt=-Infinity;}
            if(observedRate!==session.frameRate){observedRate=session.frameRate;notify();}
            if(session.visibilityState==='hidden' || session.visibilityState==='visible-blurred'){started=null;frames=0;slowWindows=0;changedAt=time;return;}
            if(started===null){started=time;return;}frames++;
            if(time-started<1000)return;
            fps=Math.round(frames*1000/(time-started));started=time;frames=0;
            if(cpuFrames){cpuMs=Math.round(cpuTotal/cpuFrames*10)/10;heaviest=[...phaseCosts].sort((a,b)=>b[1]-a[1])[0]?.[0] || '';}
            cpuTotal=0;cpuFrames=0;phaseCosts.clear();
            const rate=session.frameRate || 0;
            if(!pending && time-changedAt>=3000 && rate>90){
                slowWindows=fps<rate*.78?slowWindows+1:0;
                // Correct a late, superseded headset request that raised the rate.
                if((slowWindows>=2 || (Number.isFinite(desired) && desired<=90)) && time-lastRecoveryAt>=5000){
                    lastRecoveryAt=time;void apply(safeXRFrameRate(session),{recovery:true});
                }
            }
            if(getSpatialVisualSettings().showFps)notify();
        },
        async action(action){
            if(action==='ShowFps'){setSpatialVisualSettings({showFps:!getSpatialVisualSettings().showFps});notify();return;}
            const session=getSession();if(!session)return;
            const rate=action==='RefreshRate'?safeXRFrameRate(session):action.startsWith('RefreshRate:')?Number(action.slice(12)):NaN;
            if(!Number.isFinite(rate) || !Array.from(session.supportedFrameRates || []).includes(rate))return;
            // Recovery supersedes an unresolved high-rate request; never lock the UI.
            if(pending && rate>90)return;
            await apply(rate);
        }
    };
}
