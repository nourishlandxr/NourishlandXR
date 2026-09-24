import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPimDocument, pimAddNode } from '../app/services/pimModel.js';
import { pimInfoContent, infoPages, infoPanelPose, facePanelTowardEyes, panelCenterFromGrab, controlPanelControls, spatialPanelControls } from '../app/services/pimInfoPanel.js';

test('Quest Control panel collapses its side regions while keeping Continue reachable', () => {
    const items=controlPanelControls({height:850,utilityActions:[{id:'continue',label:'Continue',primary:true},{id:'close',label:'Close demo'}]});
    const open=spatialPanelControls({height:1050,items});
    const folded=spatialPanelControls({height:1050,items,railCollapsed:true,mediaCollapsed:true});
    assert.ok(open.some(item=>item.kind==='tab'));
    assert.ok(!folded.some(item=>item.kind==='tab'));
    for(const action of ['MovePanel','ToggleMenu','ToggleMedia','Utility:continue'])assert.ok(folded.some(item=>item.action===action));
    assert.equal(folded.some(item=>item.action==='ToggleTools'),false);
    assert.equal(folded.find(item=>item.action==='MovePanel').label,'●');
});
import { hitTotemSurface } from '../app/services/spatialTotemCards.js';
import { createPimHold, bindSpatialPimHold } from '../app/services/pimActivationHold.js';
import { creatorKnowledgeState } from '../app/services/creatorArKnowledge.js';

test('Info panel reads parents and descendants from the canonical document without mutating it', () => {
    let document = createPimDocument('plant');
    document.nodes.find(n=>n.id==='food-forest').body='How this plant fits a food forest';
    document = pimAddNode(document,{id:'local-note',parentId:'food-forest',title:'Observed shade',body:'Shade observed on site',knowledgeScope:'specimen',status:'draft'});
    const before=JSON.stringify(document), root=pimInfoContent(document,'food-forest'), child=pimInfoContent(document,'local-note');
    assert.equal(root.body,'How this plant fits a food forest');
    assert.equal(child.id,'local-note'); assert.equal(child.scope,'specimen'); assert.equal(child.status,'draft');
    assert.match(child.breadcrumb,/Observed shade/); assert.equal(pimInfoContent(document,'missing'),null);
    assert.equal(JSON.stringify(document),before);
    const edit=creatorKnowledgeState(document,{path:root.id,edit:true});
    assert.equal(edit.editorNodeId,root.id); assert.equal(edit.editorMode,'edit');
});

test('long detail is paginated without dropping words, including unbroken text',()=>{
    const text=Array.from({length:170},(_,i)=>'word'+i).join(' ');
    const pages=infoPages(text); assert.ok(pages.length>1);
    assert.equal(pages.flat().join(' '),text);
    assert.equal(infoPages('x'.repeat(300)).flat().join(''),'x'.repeat(300));
    assert.ok(pages.every(p=>p.length<=10 && p.every(line=>line.length<=48)));
});

test('waist companion follows translation and starts below the main view',()=>{
    const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1];
    const first=infoPanelPose(matrix); assert.ok(Math.abs(first.center.y-.88)<1e-10); assert.ok(first.center.x<0);
    assert.ok(Math.hypot(first.center.x,first.center.y-1.6,first.center.z)<1.35);
    const turned=[0,0,1,0,0,1,0,0,-1,0,0,0,2,1.6,3,1];
    const next=infoPanelPose(turned,first.anchorHeading);
    assert.deepEqual(next.anchorHeading,first.anchorHeading); assert.equal(next.center.x-first.center.x,2); assert.equal(next.center.z-first.center.z,3);
});

test('Quest Control panel begins below and beside the welcome board',()=>{
    const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1];
    const pose=infoPanelPose(matrix,null,true);
    assert.ok(pose.center.x<=-1,'panel has a clear left-side offset');
    assert.ok(Math.abs(pose.center.y-1.3)<1e-10,'panel sits below eye height for a natural upward pitch');
    assert.ok(pose.center.z<-.3,'panel remains forward and reachable');
});

test('Android AR Control panel begins within a comfortable left-hand view',()=>{
    const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1];
    const phone=infoPanelPose(matrix,null,true,true);
    const headset=infoPanelPose(matrix,null,true,false);
    assert.ok(phone.center.x<-.5 && phone.center.x>-.7,'phone panel is clearly left of the main view');
    assert.ok(phone.center.z<-.5 && phone.center.z>-.9,'phone panel is within a comfortable reading distance');
    assert.ok(Math.abs(phone.center.y-1.36)<1e-10,'phone panel sits below eye height');
    assert.ok(Math.hypot(phone.center.x,phone.center.z)<Math.hypot(headset.center.x,headset.center.z));
});

test('Control panel keeps navigation separate from experience actions',()=>{
    for(const tab of ['Details','Modules','Help','Settings']){
        const buttons=controlPanelControls({tab});
        assert.equal(buttons.filter(b=>b.kind==='tab' && b.selected).length,1);
        for(const [i,a] of buttons.entries())for(const b of buttons.slice(i+1))assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
    }
    assert.equal(controlPanelControls({tab:'Details',selected:true}).some(b=>b.action==='Edit'),false);
    assert.equal(controlPanelControls({hidden:true})[0].action,'Restore');
    assert.equal(controlPanelControls({contentKind:'lim'}).find(b=>b.action==='Details').label,'Selected topic');
    assert.equal(controlPanelControls({contentKind:'pim'}).find(b=>b.action==='Details').label,'Plant');
    assert.equal(controlPanelControls({contentKind:'lim'}).find(b=>b.action==='Modules').label,'Guides');
    const menu=controlPanelControls({height:760,utilityActions:[{id:'lim-visibility',label:'Hide learning cells'},{id:'close',label:'Close demo'}]});
    assert.deepEqual(menu.filter(button=>button.kind==='menu').map(button=>button.action),['Utility:lim-visibility','Utility:close']);
    assert.equal(menu.some(button=>button.kind==='utility' && ['Utility:lim-visibility','Utility:close'].includes(button.action)),false);
    const utilities=controlPanelControls({tab:'Details',height:760,utilityActions:[{id:'continue',label:'Continue'},{id:'recenter',label:'Recenter panel'}]});
    assert.deepEqual(utilities.filter(button=>button.kind==='utility').map(button=>button.action),['Utility:recenter','Utility:continue']);
    for(const [i,a] of utilities.entries())for(const b of utilities.slice(i+1))assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
    const modules=controlPanelControls({tab:'Modules',height:760,moduleActions:[{id:'food-forest',label:'Create a food forest'},{id:'native-forest',label:'Identify a native forest'}]});
    assert.deepEqual(modules.filter(button=>button.kind==='module').map(button=>button.action),['Module:food-forest','Module:native-forest']);
    for(const [i,a] of modules.entries())for(const b of modules.slice(i+1))assert.ok(a.x+a.width<=b.x || b.x+b.width<=a.x || a.y+a.height<=b.y || b.y+b.height<=a.y);
});

test('Side panel faces elevated and moving eyes; pitched controls use the rendered axes',()=>{
    const center={x:-.62,y:1.1,z:-.85};
    const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
    for(const eyes of [{x:0,y:1.6,z:0},{x:.3,y:1.85,z:.15},{x:-.5,y:.9,z:-.2}]){
        const axes=facePanelTowardEyes(center,eyes),toward={x:eyes.x-center.x,y:eyes.y-center.y,z:eyes.z-center.z};
        assert.ok(Math.abs(dot(axes.normal,toward)/Math.hypot(...Object.values(toward))-1)<1e-10);
        for(const axis of Object.values(axes))assert.ok(Math.abs(dot(axis,axis)-1)<1e-10);
        assert.ok(Math.abs(dot(axes.right,axes.up))<1e-10);
        const point={};for(const key of ['x','y','z'])point[key]=center[key]+axes.right[key]*.2-axes.up[key]*.25;
        const ray={origin:eyes,direction:{x:point.x-eyes.x,y:point.y-eyes.y,z:point.z-eyes.z}};
        const hit=hitTotemSurface(ray,[{center,...axes,width:.66,height:.66}]);
        assert.ok(hit);assert.ok(Math.abs(hit.localX-.2)<1e-10);assert.ok(Math.abs(hit.localY+.25)<1e-10);
    }
});

test('grabbing the off-centre move dot keeps that exact point under the controller ray',()=>{
    const center={x:-.7,y:1.5,z:-1.2};
    const axes={right:{x:1,y:0,z:0},up:{x:0,y:1,z:0}};
    const localX=.21,localY=.29;
    const ray={origin:{x:0,y:1.5,z:0},direction:{x:(center.x+localX)/1.2,y:localY/1.2,z:-1}};
    const grab={distance:1.2,localX,localY};
    const initial=panelCenterFromGrab(ray,grab,axes);
    for(const key of ['x','y','z'])assert.ok(Math.abs(initial[key]-center[key])<1e-10);
    const movedRay={origin:{...ray.origin},direction:{x:ray.direction.x+.1,y:ray.direction.y+.05,z:-1}};
    const moved=panelCenterFromGrab(movedRay,grab,axes);
    assert.ok(Math.abs(moved.x-center.x-.12)<1e-10);
    assert.ok(Math.abs(moved.y-center.y-.06)<1e-10);
    const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    assert.match(panel,/distance:target\.distance,localX:target\.localX,localY:target\.localY/);
    assert.match(panel,/xrFrame\.getPose\(spatialMove\.source\.targetRaySpace,spatialMove\.referenceSpace\)/);
    assert.match(panel,/card\.largeText\?'500 43px':'500 38px'/);
    const styles=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    assert.match(styles,/\.nlxr-info-panel:is\(\.is-demo-panel,\.is-creator-panel\) \.nlxr-info-trail \{ font-size:15px/);
});

test('hold requires dwell on the same cell, activates once, and clears fill on cancellation',()=>{
    const events=[], fills=[], target={record:{id:'plant'},target:{path:'food-forest'}};
    const hold=createPimHold({activate:t=>events.push(t),progress:(t,p)=>fills.push(p)});
    hold.start(target,0); hold.tick(target,250); assert.equal(events.length,0); assert.equal(fills.at(-1),.5);
    hold.tick(target,500); hold.tick(target,900); assert.equal(events.length,1); assert.equal(fills.at(-1),0);
    hold.cancel(); hold.start(target,1000); hold.tick({record:target.record,target:{path:'uses'}},1300); hold.tick(target,1600);
    assert.equal(events.length,1); assert.equal(hold.active,false); assert.equal(fills.at(-1),0);
});

test('XR cell holds consume their select event without blocking later object selections',()=>{
    const session=new EventTarget(), source={targetRayMode:'tracked-pointer'};
    let target={record:{id:'plant'},target:{path:'uses'}}, activated=0, ordinary=0;
    const binding=bindSpatialPimHold({session,getTarget:()=>target,enabled:()=>true,activate:()=>activated++,progress:()=>{}});
    session.addEventListener('select',()=>ordinary++);
    const send=type=>{const event=new Event(type);event.inputSource=source;session.dispatchEvent(event);};
    send('selectstart');binding.tick(performance.now()+600);send('select');send('selectend');
    assert.equal(activated,1);assert.equal(ordinary,0);
    target=null;send('selectstart');send('select');send('selectend');assert.equal(ordinary,1);
    binding.destroy();
});

test('compact panel grows with content and keeps settings controls inside its surface',async()=>{const {controlPanelHeight}=await import('../app/services/pimInfoPanel.js');assert.ok(controlPanelHeight(2)<controlPanelHeight(7));assert.ok(controlPanelHeight(7,true)>controlPanelHeight(7));for(const large of [false,true]){const height=controlPanelHeight(7,large);for(const button of controlPanelControls({tab:'Settings',height,largeText:large})){assert.ok(button.y+button.height<=height);assert.ok(button.x+button.width<=1000);}}});

test('side dots reveal mounted wings without rebuilding or resizing the panel',()=>{
    const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    const styles=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    assert.match(panel,/onClick\(\);syncPanelWings\(\)/);
    assert.doesNotMatch(panel,/onClick\(\);render\(\)/);
    assert.match(panel,/if\(showPlantPreview\(\)\)\{const figure=/);
    assert.match(styles,/\.is-media-collapsed :is\(\.nlxr-plant-preview,\.nlxr-media-empty\) \{ display:none; \}/);
    assert.match(styles,/:not\(\.is-media-collapsed\) \.nlxr-media-wing \{ position:absolute/);
    assert.doesNotMatch(styles,/\.has-media:not\(\.is-media-collapsed\) \{ grid-template-columns:96px/);
});

test('cell selection patches the existing reading surface without remounting the panel',()=>{
    const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    const styles=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    const update=panel.slice(panel.indexOf('function updateReading()'),panel.indexOf('function updatePathway()'));
    assert.match(update,/content\.querySelector\('\.nlxr-info-body'\)\.textContent=/);
    assert.match(update,/if\(image\.getAttribute\('src'\)!==preview\.image\)image\.src=preview\.image/);
    assert.doesNotMatch(update,/replaceChildren\(\)/);
    assert.match(panel,/tab='Details';hidden=false;page=0;if\(wasDetails\)updateReading\(\);else render\(\)/);
    assert.match(panel,/suspend\(value\).*updateReading\(\);updatePathway\(\)/);
    assert.doesNotMatch(styles,/\.is-opening-compact \{ height:/);
});

test('ordinary control actions retain the panel shell and device treatment',()=>{
    const panel=readFileSync(new URL('../app/services/pimInfoPanel.js',import.meta.url),'utf8');
    const styles=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    assert.match(panel,/if\(!force && !hidden && !needsMediaWing && element\.querySelector\('\.nlxr-control-header'\)\)/);
    assert.match(panel,/nav\.replaceChildren\(\.\.\.controls\(\)\.filter/);
    assert.match(panel,/tabs\.scrollTop=railScroll/);
    assert.match(styles,/A persistent instrument beside the experience/);
    assert.match(styles,/"Cascadia Code","Segoe UI Variable",ui-monospace,monospace/);
});

test('hidden demo Control panel collapses to a compact restore button',()=>{
    const styles=readFileSync(new URL('../app/living-objects.css',import.meta.url),'utf8');
    assert.match(styles,/\.nlxr-info-panel:is\(\.is-demo-panel,\.is-creator-panel\)\.is-hidden \{[\s\S]*?width:fit-content !important;[\s\S]*?height:fit-content !important;[\s\S]*?container-type:normal;[\s\S]*?transform:none !important;/);
});
