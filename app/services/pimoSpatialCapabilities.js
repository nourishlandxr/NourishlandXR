// Explorer is a capability of an active spatial experience, not a device name.
let active=null,developerOverride=false;
const listeners=new Set();
const finitePose=pose=>pose?.emulatedPosition===false && pose.transform?.matrix?.length===16
    && Array.from(pose.transform.matrix).every(Number.isFinite);
export function supportsSpatialPIMO(){return developerOverride || Boolean(active?.qualified);}
export function isPimoDeveloperOverride(){return developerOverride;}
export function availablePimoModes(){return supportsSpatialPIMO()?['tag','curiosity','explore']:['tag','curiosity'];}
export function subscribePimoCapabilities(listener){listeners.add(listener);return ()=>listeners.delete(listener);}
function notify(previous){if(previous!==supportsSpatialPIMO())for(const listener of listeners)listener(supportsSpatialPIMO());}

// The override is accessible only to the local tools harness, never a consumer
// preference. It does not pretend to validate actual headset input.
export function setPimoDeveloperOverride(enabled){
    const location=globalThis.location;
    if(enabled && (!['localhost','127.0.0.1','[::1]'].includes(location?.hostname) || !location?.pathname?.startsWith('/tools/')))return false;
    const previous=supportsSpatialPIMO();developerOverride=Boolean(enabled);notify(previous);return true;
}
export function bindPimoSpatialCapabilities(session,space,{mode,rendererReady=false}={}){
    const previous=supportsSpatialPIMO();
    const context={session,space,qualified:false};active=context;notify(previous);
    const end=()=>{if(active!==context)return;const before=supportsSpatialPIMO();active=null;notify(before);};
    session.addEventListener('end',end);
    return {
        update(frame){
            if(active!==context || context.qualified || frame.session!==session || !space || !rendererReady || !['immersive-ar','immersive-vr'].includes(mode))return;
            try{
                if(!finitePose(frame.getViewerPose(space)))return;
                for(const source of session.inputSources || []){
                    if(source.targetRayMode!=='tracked-pointer' || !source.targetRaySpace || !finitePose(frame.getPose(source.targetRaySpace,space)))continue;
                    const manipulation=source.hand
                        ? finitePose(frame.getJointPose(source.hand.get('wrist'),space)) && finitePose(frame.getJointPose(source.hand.get('index-finger-tip'),space))
                        : source.gripSpace && finitePose(frame.getPose(source.gripSpace,space));
                    if(!manipulation)continue;
                    const before=supportsSpatialPIMO();context.qualified=true;notify(before);break;
                }
            }catch{}
            // Qualification is retained for this session. Temporary occlusion
            // cancels gestures in the input layer instead of changing modes.
        },
        destroy(){session.removeEventListener('end',end);end();}
    };
}
