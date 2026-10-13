// Direct workspace routes load only their presentation and shared data services.
const params = new URLSearchParams(location.search);
if(params.get('paint')==='v2'){
    const {renderSpatialPaintStudio}=await import('./screens/spatialPaintStudio.js');
    await renderSpatialPaintStudio(document.getElementById('app'),{project:params.get('project') || '',site:params.get('site') || '',area:params.get('area') || ''});
} else if (['desktop', 'field', 'spatial'].includes(params.get('workspace')) && params.get('project')) {
    const { renderCreatorWorkspace } = await import('./services/creatorWorkspaceRouting.js');
    await renderCreatorWorkspace(document.getElementById('app'), params.get('project'), {
        mode: params.get('workspace'), siteId: params.get('site') || '', recordKey: params.get('record') || '', view: params.get('view') || 'overview'
    });
    window.addEventListener('popstate', () => location.reload());
} else {
    await import('./main.js');
}
