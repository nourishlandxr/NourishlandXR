// Direct workspace routes load only their presentation and shared data services.
import {requestedPortalRoute} from './services/portalRoutes.js';
const params = new URLSearchParams(location.search);
if(params.get('editor')==='pimo'){
    const {renderPimoEditor}=await import('./screens/pimoEditor.js');
    renderPimoEditor(document.getElementById('app'), { xr: params.get('mode') === 'xr', projectId:params.get('project') || '', workspace:params.get('workspace') || 'desktop', siteId:params.get('site') || '', recordKey:params.get('record') || '' });
} else if(params.has('tour')&&params.get('project')){
    const {renderTourExplorer}=await import('./screens/tourExplorer.js');
    await renderTourExplorer(document.getElementById('app'),params.get('project'),params.get('tour'));
} else if (['desktop', 'field'].includes(params.get('interface'))) {
    const target = new URL(params.get('interface') === 'field' ? './field/index.html' : './platform.html', location.href);
    target.search = location.search;
    if (params.get('interface') === 'field') target.searchParams.delete('interface');
    location.replace(target.href);
} else if(params.get('paint')==='v2'){
    const {renderSpatialPaintStudio}=await import('./screens/spatialPaintStudio.js');
    await renderSpatialPaintStudio(document.getElementById('app'),{project:params.get('project') || '',site:params.get('site') || '',area:params.get('area') || ''});
} else if (['desktop', 'field', 'spatial'].includes(params.get('workspace')) && params.get('onboarding') === '1') {
    const { renderCreatorProjectTutorial } = await import('./screens/creatorProjectTutorial.js');
    await renderCreatorProjectTutorial(document.getElementById('app'), {
        mode: params.get('workspace'), projectId: params.get('project') || '', step: params.get('step') || ''
    });
    window.addEventListener('popstate', () => location.reload());
} else if (['desktop', 'field', 'spatial'].includes(params.get('workspace')) && params.get('project')) {
    const { renderCreatorWorkspace } = await import('./services/creatorWorkspaceRouting.js');
    await renderCreatorWorkspace(document.getElementById('app'), params.get('project'), {
        mode: params.get('workspace'), siteId: params.get('site') || '', recordKey: params.get('record') || '', view: params.get('view') || 'hub'
    });
    window.addEventListener('popstate', () => location.reload());
} else if(requestedPortalRoute()){
    const {renderAccessPortal}=await import('./screens/accessPortal.js');
    await renderAccessPortal(document.getElementById('app'),requestedPortalRoute());
} else {
    await import('./main.js');
}
