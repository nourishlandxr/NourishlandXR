import test from 'node:test';
import assert from 'node:assert/strict';
import { creatorAccessCapabilities, creatorHubTools, creatorPimoUrl } from '../app/services/creatorHub.js';
import { workspaceUrl } from '../app/services/creatorWorkspaceMode.js';

test('phone capability stays touch-first even with WebXR or a camera API', () => {
    const phone = creatorAccessCapabilities({ userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile', xr:{}, mediaDevices:{getUserMedia(){}} });
    assert.equal(phone.kind, 'phone'); assert.equal(phone.pimoSpatial, false); assert.equal(phone.immersiveEditor, false);
    const quest = creatorAccessCapabilities({ userAgent:'Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser', userAgentData:{mobile:true} });
    assert.equal(quest.kind, 'headset'); assert.equal(quest.pimoSpatial, true);
    assert.equal(creatorAccessCapabilities({userAgent:'XREAL Android XR',userAgentData:{mobile:true}}).kind, 'headset');
    assert.equal(creatorAccessCapabilities({userAgent:'Mozilla/5.0 (Windows NT 10.0)'}).kind, 'desktop');
});
test('all access modes expose the same project tools with device-specific presentation', () => {
    const desktop=creatorHubTools(creatorAccessCapabilities({userAgent:'Windows'}));
    const phone=creatorHubTools(creatorAccessCapabilities({userAgent:'Android Mobile'}));
    const headset=creatorHubTools(creatorAccessCapabilities({userAgent:'Quest'}));
    assert.deepEqual(desktop.map(tool=>tool.id), phone.map(tool=>tool.id));
    assert.deepEqual(desktop.map(tool=>tool.id), headset.map(tool=>tool.id));
    assert.match(phone.find(tool=>tool.id==='content').detail,/touch/);
    assert.match(headset.find(tool=>tool.id==='preview-tools').detail,/WebXR/);
});
test('hub, detailed tools and PIMO return preserve scoped project identity without enabling phone XR', () => {
    const before=globalThis.location;globalThis.location={href:'https://example.test/xr/?stale=1#old'};
    try {
        const url=workspaceUrl('project / one',{mode:'field',siteId:'north',recordKey:'north/bed/orb',view:'paths'});
        assert.equal(url.searchParams.get('project'),'project / one');assert.equal(url.searchParams.get('view'),'paths');assert.equal(url.hash,'');assert.equal(url.searchParams.has('stale'),false);
        assert.equal(workspaceUrl('project',{mode:'field'}).searchParams.has('view'),false);
        const pimo=creatorPimoUrl('project',{mode:'field',siteId:'north',recordKey:'north/bed/orb',spatial:true,capabilities:creatorAccessCapabilities({userAgent:'Android Mobile'})});
        assert.equal(pimo.searchParams.get('editor'),'pimo');assert.equal(pimo.searchParams.get('mode'),null);assert.equal(pimo.searchParams.get('record'),'north/bed/orb');
    } finally { if(before===undefined)delete globalThis.location;else globalThis.location=before; }
});
