// Start immediately from the click gesture: an awaited capability probe or data
// fetch before requestSession can consume WebXR's required user activation.
let launchPromise = null;
export function launchCreatorArFromPage(root, launch) {
    if (launchPromise) return launchPromise;
    const origin = root?.querySelector('.screen') || root;
    let notice = origin?.querySelector('[data-workspace-ar-notice]');
    if (origin && !notice) {
        notice = document.createElement('p');
        notice.className = 'workspace-ar-notice';
        notice.dataset.workspaceArNotice = 'true';
        notice.setAttribute('role', 'status');
        const heading = origin.querySelector('.page-header,.nlxr-db-v2-ar-strip');
        if (heading) heading.after(notice); else origin.append(notice);
    }
    if (notice) { notice.textContent = 'Opening AR… Your browser may ask for camera access.'; notice.hidden = false; }
    const controls = [...(origin?.querySelectorAll('[data-v2-open-ar],.global-ar-action,.nlxr-db-v2-ar-button,[data-ar-safety-continue]') || [])];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; control.setAttribute('aria-busy', 'true'); });
    const showFailure = error => {
        if (notice?.isConnected) notice.textContent = `AR could not open. ${!navigator.xr ? 'Use Meta Quest Browser or a compatible AR browser over HTTPS.' : error?.message || 'Allow camera access and try again.'} Your project stays open here.`;
        return false;
    };
    let started;
    try { started = launch(); } catch (error) { started = Promise.reject(error); }
    launchPromise = Promise.resolve(started).then(result => {
        if (!result) return showFailure(window.__nxrArStartError);
        if (notice) notice.hidden = true;
        return true;
    }).catch(showFailure).finally(() => {
        controls.forEach((control,index) => { control.disabled = disabled[index]; control.removeAttribute('aria-busy'); });
        launchPromise = null;
    });
    return launchPromise;
}
