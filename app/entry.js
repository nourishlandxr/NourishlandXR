// Direct workspace routes load only their presentation and shared data services.
const params = new URLSearchParams(location.search);
if (['desktop', 'field', 'spatial'].includes(params.get('workspace')) && params.get('project')) {
    const { renderCreatorWorkspace } = await import('./services/creatorWorkspaceRouting.js');
    await renderCreatorWorkspace(document.getElementById('app'), params.get('project'), {
        mode: params.get('workspace'), siteId: params.get('site') || '', recordKey: params.get('record') || '', view: params.get('view') || 'records'
    });
    window.addEventListener('popstate', () => location.reload());
} else {
    await import('./main.js');
}
