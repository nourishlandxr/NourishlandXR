import {configureXRFrameRate} from './webxrSession.js';
import {getSpatialVisualSettings,setSpatialVisualSettings,currentShowFps} from './spatialVisualSettings.js';

// Count XR callbacks once per session frame, never once per eye. This is a
// cadence indicator; compositor drops and GPU timings need headset tools.
export function createXRPerformanceSettings({getSession,publish}) {
    let tracked=null,started=0,frames=0,fps=null,observedRate=null,pending=false;
    const snapshot=()=>{
        const session=getSession(),prefs=getSpatialVisualSettings();
        return {rate:prefs.refreshRate,showFps:prefs.showFps,pending,
            supported:typeof session?.updateTargetFrameRate==='function'?Array.from(session.supportedFrameRates || []):[],
            actual:session?.frameRate || null,label:`${fps===null?'Measuring...':fps+' FPS'} / ${session?.frameRate || '?'} Hz`};
    };
    const notify=()=>publish(snapshot());
    return {
        publish:notify,
        tick(time){
            const session=getSession();if(!session)return;
            if(tracked!==session){tracked=session;started=0;frames=0;fps=null;observedRate=null;}
            if(observedRate!==session.frameRate){observedRate=session.frameRate;notify();}
            if(!currentShowFps())return;
            if(!started)started=time;else frames++;
            if(time-started>=1000){fps=Math.round(frames*1000/(time-started));started=time;frames=0;notify();}
        },
        async action(action){
            if(action==='ShowFps'){setSpatialVisualSettings({showFps:!getSpatialVisualSettings().showFps});started=0;frames=0;fps=null;notify();return;}
            const session=getSession();if(action!=='RefreshRate' || !session || pending)return;
            const supported=Array.from(session.supportedFrameRates || []).filter(rate=>[72,90,120].includes(rate)).sort((a,b)=>a-b);
            if(!supported.length || typeof session.updateTargetFrameRate!=='function')return;
            const choices=['auto',...supported],current=getSpatialVisualSettings().refreshRate;
            const next=choices[(choices.indexOf(current)+1)%choices.length];
            pending=true;notify();
            try{const result=await configureXRFrameRate(session,next);if(getSession()===session && result.requested!==null)setSpatialVisualSettings({refreshRate:next==='auto'?next:result.requested});}
            finally{pending=false;notify();}
        }
    };
}
