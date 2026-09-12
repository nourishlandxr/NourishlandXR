import test from 'node:test';
import assert from 'node:assert/strict';
import { createPimDocument, pimAddNode } from '../app/services/pimModel.js';
import { pimInfoContent, infoPages, infoPanelPose, facePanelTowardEyes } from '../app/services/pimInfoPanel.js';
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

test('waist companion follows translation but remains reachable when looking left',()=>{
    const matrix=[1,0,0,0,0,1,0,0,0,0,1,0,0,1.6,0,1];
    const first=infoPanelPose(matrix); assert.equal(first.center.y,1.1); assert.ok(first.center.x<0);
    const turned=[0,0,1,0,0,1,0,0,-1,0,0,0,2,1.6,3,1];
    const next=infoPanelPose(turned,first.anchorHeading);
    assert.deepEqual(next.anchorHeading,first.anchorHeading); assert.equal(next.center.x-first.center.x,2); assert.equal(next.center.z-first.center.z,3);
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
