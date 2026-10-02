import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { controlPanelControls, spatialPanelControls, panelSettingsControls } from '../app/services/pimInfoPanel.js';

test('reading arrows remain in fixed positions and disable only at their page boundaries',()=>{
    const cases=[
        {tab:'Details',page:0,pageCount:1,previous:true,next:true},
        {tab:'Details',page:0,pageCount:3,previous:true,next:false},
        {tab:'Details',page:1,pageCount:3,previous:false,next:false},
        {tab:'Details',page:2,pageCount:3,previous:false,next:true},
        {tab:'Help',page:0,pageCount:1,previous:true,next:true}
    ];
    let base=null,spatialBase=null;
    for(const state of cases){
        const items=controlPanelControls(state),pager=items.filter(item=>item.kind==='pager');
        assert.deepEqual(pager.map(item=>item.action),['Previous','Next']);
        assert.deepEqual(pager.map(item=>item.disabled),[state.previous,state.next]);
        const positions=pager.map(({x,y,width,height})=>({x,y,width,height}));
        base ||= positions;
        assert.deepEqual(positions,base);
        const spatial=spatialPanelControls({height:600,items}).filter(item=>item.kind==='pager');
        assert.deepEqual(spatial.map(item=>item.disabled),[state.previous,state.next]);
        const spatialPositions=spatial.map(({x,y,width,height})=>({x,y,width,height}));
        spatialBase ||= spatialPositions;
        assert.deepEqual(spatialPositions,spatialBase);
    }
});

test('demo history arrows stay compact, adjacent and ray-selectable even when disabled',()=>{
    const utilityActions=[{id:'back',label:'‹',disabled:true},{id:'forward',label:'›',disabled:false},{id:'close',label:'Close demo'}];
    const items=controlPanelControls({utilityActions});
    const history=items.filter(item=>item.kind==='history');
    assert.deepEqual(history.map(item=>item.action),['Utility:back','Utility:forward']);
    assert.deepEqual(history.map(item=>item.disabled),[true,false]);
    assert.ok(history[0].x+history[0].width<=history[1].x);
    assert.ok(history.every(item=>item.width<=52 && item.height<=44));
    const spatial=spatialPanelControls({items}).filter(item=>item.kind==='history');
    assert.deepEqual(spatial.map(item=>item.action),['Utility:back','Utility:forward']);
    assert.ok(spatial[0].x+spatial[0].width<=spatial[1].x);
    assert.ok(spatial.every(item=>item.width<=44));
});

test('Settings rows keep all existing actions in compact non-overlapping Quest hit regions',()=>{
    const desktop=panelSettingsControls({meshCellOpacity:.5,ambientRain:1.65,ambientRainStyle:'v1',spatialScale:1.1});
    const quest=panelSettingsControls({headset:true,handVisualMode:'outline'});
    const actions=['TextDown','TextUp','ScaleDown','ScaleUp','CellOpacity','RainIntensity','RainStyle','Recenter'];
    assert.deepEqual(desktop.map(item=>item.action),actions);
    assert.deepEqual(quest.map(item=>item.action),['HandMode',...actions]);
    assert.equal(desktop.find(item=>item.action==='CellOpacity').label,'Cells · 50%');
    assert.equal(desktop.find(item=>item.action==='RainIntensity').label,'Heavy');
    assert.equal(desktop.find(item=>item.action==='RainStyle').label,'V1');
    assert.equal(quest.find(item=>item.action==='HandMode').label,'Outline');
    for(const items of [desktop,quest]){
        for(const [index,a] of items.entries()){
            assert.ok(a.width>=88 && a.height>=42 && a.x>=0 && a.x+a.width<=1000 && a.y>=0 && a.y+a.height<=600);
            assert.ok(a.settingGroup && a.ariaLabel);
            for(const b of items.slice(index+1))assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
        }
    }
    const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    const css=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    assert.match(panel,/row\.className='nlxr-setting-row'/);
    assert.match(panel,/tools\.append\(pager\)/);
    assert.match(css,/\.nlxr-tools-dock > \.nlxr-content-pager/);
    assert.match(css,/\.nlxr-content-pager button:disabled/);
});
