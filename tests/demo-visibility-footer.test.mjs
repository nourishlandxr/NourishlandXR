import test from 'node:test';
import assert from 'node:assert/strict';
import {demoVisibilityFooter} from '../app/services/demoVisibilityFooter.js';
import {spatialPanelControls} from '../app/services/pimInfoPanel.js';
import {renderLaunchScreen} from '../app/screens/launch.js';
import {BUILD_INFO} from '../app/services/buildInfo.js';
test('Footer grows with introduced elements and uses state rather than open/close copy',()=>{
    assert.deepEqual(demoVisibilityFooter(new Set()).map(item=>item.label),['CONTROL PANEL']);
    const items=demoVisibilityFooter(new Set(['plant','note','zone']),new Set(['plant']));
    assert.deepEqual(items.map(item=>item.label),['ORB','NOTES','CONTROL PANEL','TOTEMS']);assert.equal(items[0].selected,false);assert.equal(items[1].selected,true);
    const buttons=spatialPanelControls({height:800,items:items.map(item=>({...item,kind:'visibility',action:'Utility:visibility:'+item.id}))});
    assert.equal(buttons.length,4);assert.ok(buttons.every(item=>item.y===736));
});
test('Welcome badge renders the current build version',()=>{const app={innerHTML:''};renderLaunchScreen(app);assert.ok(app.innerHTML.includes('>'+`V${BUILD_INFO.version}`+' · '));});
test('minimized XR panel preserves footer identity and hidden state',()=>{
 const [button]=spatialPanelControls({hidden:true,items:[{action:'Restore',label:'CONTROL PANEL',kind:'visibility',selected:false}]});
 assert.equal(button.label,'CONTROL PANEL');assert.equal(button.kind,'visibility');assert.equal(button.selected,false);
});
