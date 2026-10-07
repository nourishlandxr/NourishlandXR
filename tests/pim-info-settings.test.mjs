import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { controlPanelControls, spatialPanelControls, panelSettingsControls } from '../app/services/pimInfoPanel.js';

test('reading arrows appear for multi-page content and retain fixed positions',()=>{
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
        if(state.pageCount===1){
            assert.deepEqual(pager,[]);
            assert.deepEqual(spatialPanelControls({height:600,items}).filter(item=>item.kind==='pager'),[]);
            continue;
        }
        assert.deepEqual(pager.map(item=>item.action),['Previous','Next']);
        assert.deepEqual(pager.map(item=>item.disabled),[state.page===0,state.page>=state.pageCount-1]);
        const positions=pager.map(({x,y,width,height})=>({x,y,width,height}));
        base ||= positions;
        assert.deepEqual(positions,base);
        const spatial=spatialPanelControls({height:600,items}).filter(item=>item.kind==='pager');
        assert.deepEqual(spatial.map(item=>item.disabled),[state.page===0,state.page>=state.pageCount-1]);
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
    const initial=controlPanelControls({utilityActions:[{id:'back',label:'‹',disabled:true},{id:'forward',label:'›',disabled:true}]});
    assert.deepEqual(initial.filter(item=>item.kind==='history').map(item=>item.action),['Utility:back']);
});

test('General and Graphics settings fit readable non-overlapping Quest hit regions',()=>{
    const desktop=panelSettingsControls({infoOpacity:.5,ambientRain:1.65,ambientRainStyle:'v1',rainQuality:'hq',graphicsQuality:'high',spatialScale:1.1});
    const quest=panelSettingsControls({headset:true,handVisualMode:'outline'});
    const graphics=panelSettingsControls({graphicsOpen:true,rainQuality:'hq',graphicsQuality:'high'});
    const performance=panelSettingsControls({graphicsOpen:true,headset:true,performanceSettings:{actual:120,supported:[72,90,120],showFps:true},demoSound:{music:.5,fx:.5,haptics:true}});
    const actions=['InfoOpacity','TextSize','SpatialScale','FloorOffset','HeroDice','LivingFrame','CellOpacity','GraphicsMenu','SettingsHelp','CloseSettings'];
    assert.deepEqual(desktop.map(item=>item.action),actions);
    assert.deepEqual(quest.map(item=>item.action),[...actions.slice(0,4),'HandMode',...actions.slice(4)]);
    assert.equal(desktop.find(item=>item.action==='InfoOpacity').value,.5);
    assert.equal(desktop.find(item=>item.action==='InfoOpacity').kind,'slider');
    assert.equal(desktop.find(item=>item.action==='InfoOpacity').settingLabel,'Main / Control glass');
    assert.equal(graphics.find(item=>item.action==='RainQuality').label,'HQ');
    assert.equal(graphics.find(item=>item.action==='GraphicsQuality').label,'HIGH');
    assert.deepEqual(graphics.map(item=>item.action),['GraphicsMenu','GraphicsQuality','RainQuality','Insects','OrbModel','SettingsHelp','CloseSettings']);
    assert.ok(performance.find(item=>item.action==='RefreshRate').y<performance.find(item=>item.action==='ShowFps').y);
    assert.equal(quest.find(item=>item.action==='HandMode').label,'Hand tracking');
    assert.equal(desktop.find(item=>item.action==='HeroDice').label,'Floor dice');
    assert.equal(desktop.find(item=>item.action==='HeroDice').selected,true);
    assert.equal(desktop.find(item=>item.action==='LivingFrame').label,'Living Frame');
    assert.equal(desktop.find(item=>item.action==='LivingFrame').selected,true);
    assert.equal(panelSettingsControls({headset:true,handVisualMode:'pointer'}).find(item=>item.action==='HandMode').label,'Pointer');
    for(const items of [desktop,quest,graphics,performance]){
        for(const [index,a] of items.entries()){
            // The Settings surface reserves a separate Graphics status row.
            assert.ok(a.width>=88 && a.height>=42 && a.x>=0 && a.x+a.width<=1000 && a.y>=0 && a.y+a.height<=840);
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
