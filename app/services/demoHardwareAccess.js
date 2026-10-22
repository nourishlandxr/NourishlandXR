// Capability checks are authoritative; a camera or a mobile user agent is not.
export async function demoHardwareAccess({secure=globalThis.isSecureContext,xr=globalThis.navigator?.xr}={}){
    if(!secure || typeof xr?.isSessionSupported!=='function')return false;
    for(const mode of ['immersive-ar','immersive-vr']){
        try{if(await xr.isSessionSupported(mode))return true;}catch{/* Some devices reject probing one mode. */}
    }
    return false;
}

export function showDemoHardwareRequired(app,{failedSession=false}={}){
    app.innerHTML=`<section class="screen"><header class="page-header"><p class="welcome-label">Nourishland / Immersive demo</p><h1>${failedSession?'XR could not start.':'Compatible XR hardware required.'}</h1><p class="subtitle">${failedSession?'Allow XR access and try again on your compatible phone or headset.':'Open this demo in a WebXR browser on a supported AR phone or XR headset. A camera alone is not enough.'}</p></header><a href="${new URL('../demos/',import.meta.url).href}">Back to demos</a></section>`;
}
