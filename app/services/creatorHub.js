import { workspaceUrl } from './creatorWorkspaceMode.js';

export const CREATOR_HUB_VIEWS = Object.freeze(['hub', 'content', 'paths', 'map-tools', 'preview-tools', 'project-tools']);
export function creatorGroupForView(view) {
    if (['overview', 'records'].includes(view)) return 'records';
    if (['content', 'knowledge'].includes(view)) return 'content';
    if (['paths', 'tours'].includes(view)) return 'paths';
    if (['map-tools', 'map', 'planning-map', 'imap'].includes(view)) return 'map-tools';
    if (['preview-tools', 'placement'].includes(view)) return 'preview-tools';
    if (['project-tools', 'project', 'work', 'scan', 'capture', 'setup', 'settings'].includes(view)) return 'project-tools';
    return '';
}
export function creatorAccessCapabilities(navigatorLike = globalThis.navigator) {
    const ua = navigatorLike?.userAgent || '';
    const headset = /Quest|Oculus|XREAL|Android XR|VisionOS|Vision Pro/i.test(ua);
    const phone = !headset && Boolean(navigatorLike?.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(ua));
    // A camera or navigator.xr alone does not make a phone a spatial authoring device.
    return Object.freeze({ kind: headset ? 'headset' : phone ? 'phone' : 'desktop', pimoSpatial: !phone, fieldCapture: phone, immersiveEditor: headset });
}
export function creatorHubTools(capabilities = creatorAccessCapabilities()) {
    return [
        { id:'records', icon:'plant', title:'Areas & objects', detail:'Add plants, Notes and Totems.' },
        { id:'content', icon:'webhub', title:'PIMOs & content', detail:capabilities.kind === 'phone' ? 'Edit knowledge with touch controls.' : 'Edit knowledge and shape PIMO maps.' },
        { id:'paths', icon:'explore', title:'Discovery Paths', detail:'Connect features into a guided experience.' },
        { id:'map-tools', icon:'area', title:'Map', detail:capabilities.kind === 'phone' ? 'Open the site plan or Interactive Map.' : 'Plan your place and open IMAP.' },
        { id:'preview-tools', icon:'ar', title:'Preview', detail:capabilities.kind === 'headset' ? 'Inspect and place content in WebXR.' : 'Review the visitor experience.' },
        { id:'project-tools', icon:'settings', title:'Project details', detail:'Setup, sharing and project tools.' }
    ];
}
export function creatorPimoUrl(projectId, { mode = 'desktop', siteId = '', recordKey = '', spatial = false, capabilities = creatorAccessCapabilities() } = {}) {
    const url = workspaceUrl(projectId, { mode, siteId, recordKey, view:'content' });
    url.searchParams.set('editor', 'pimo');
    if (spatial && capabilities.pimoSpatial) url.searchParams.set('mode', 'xr');
    return url;
}
