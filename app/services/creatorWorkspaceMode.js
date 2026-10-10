export const CREATOR_WORKSPACES = Object.freeze({
    desktop: { label: 'Desktop Studio', description: 'Build and edit your project database.' },
    field: { label: 'Android Field', description: 'Scan, tag and document your project on site.' },
    spatial: { label: 'XR Spatial', description: 'Place and inspect elements in real space.' }
});

export function suggestedCreatorWorkspace() {
    const ua = globalThis.navigator?.userAgent || '';
    if (/Quest|Oculus|XREAL|VisionOS/i.test(ua)) return 'spatial';
    if (globalThis.navigator?.userAgentData?.mobile || /Android|iPhone|iPad|Mobile/i.test(ua)) return 'field';
    return 'desktop';
}

export function workspaceUrl(projectId, { mode = 'desktop', siteId = '', recordKey = '', view = 'records' } = {}) {
    const url = new URL(globalThis.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('workspace', mode);
    url.searchParams.set('project', projectId);
    if (siteId) url.searchParams.set('site', siteId);
    if (recordKey) url.searchParams.set('record', recordKey);
    if (mode === 'desktop' && view !== 'records') url.searchParams.set('view', view);
    return url;
}

export const recordKey = entry => [entry.siteId, entry.place.id, entry.marker.id].map(encodeURIComponent).join('/');
export const physicalTagSignature = marker => JSON.stringify(marker?.physicalAnchor || null);
export function fieldCheckState(marker) {
    const events = marker?.field_work?.checks || [];
    const latest = [...events].reverse().find(event => event.kind === 'tag-association' && event.signature === physicalTagSignature(marker));
    return !marker?.physicalAnchor?.enabled ? 'Needs a tag' : latest ? 'Tag checked' : 'Needs tag check';
}
