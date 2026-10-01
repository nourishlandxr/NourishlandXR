import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { controlPanelControls, optionalPanelControl } from '../app/services/pimInfoPanel.js';

const demo=readFileSync(new URL('../app/screens/temporaryArDemo.js',import.meta.url),'utf8');
const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');

test('Close Demo uses one nonblocking confirmation on screen and in spatial Control panel',()=>{
    assert.doesNotMatch(demo,/window\.confirm/);
    assert.match(demo,/requestDemoClose/);
    assert.match(demo,/close-cancel/);
    assert.match(demo,/close-confirm/);
    assert.match(demo,/infoPanel\?\.showConfirmation/);
    assert.match(panel,/showConfirmation\(value=\{\}\)/);
    assert.match(panel,/confirmationSnapshot/);
});

test('close confirmation can render without the ordinary Hide menu control',()=>{
    const confirmationControls=controlPanelControls({
        utilityActions:[
            {id:'close-cancel',label:'Keep demo open'},
            {id:'close-confirm',label:'Close demo',primary:true}
        ]
    }).filter(item=>item.kind==='utility');
    assert.equal(optionalPanelControl(confirmationControls,'Hide'),null);
    assert.equal(optionalPanelControl(confirmationControls,'Utility:close-confirm')?.label,'Close demo');
    assert.match(panel,/if\(hideControl\)\{const hideButton=makeButton\(hideControl\)/);
    assert.doesNotMatch(panel,/makeButton\(controls\(\)\.find\(item=>item\.action==='Hide'\)\)/);
});

test('close confirmation gates background input and PathClose only closes learning view',()=>{
    assert.match(demo,/demoExitLifecycle\.state!==DEMO_EXIT_STATES\.IDLE/);
    assert.match(demo,/demoExitLifecycle\.state===DEMO_EXIT_STATES\.IDLE && nativeConnectionState/);
    assert.match(demo,/action==='PathClose'\)\{infoPanel\?\.setPathwayContext\(null\);clearLimSelection\(\);return;\}/);
    assert.doesNotMatch(demo,/PathClose'\)returnToWelcome/);
});

test('XR end listener is session-owned and one-shot',()=>{
    assert.match(demo,/const launchedSession=session;/);
    assert.match(demo,/demoExitLifecycle\.handleSessionEnd\(launchedSession\)/);
    assert.match(demo,/\{once:true\}/);
});
