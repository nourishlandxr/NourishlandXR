import assert from 'node:assert/strict';
export async function checkForestV4(page,origin){
    const read=()=>page.evaluate(()=>window.foodForestTable.getState());
    const targets=()=>page.evaluate(()=>window.foodForestTable.getPreviewTargets());
    const target=async id=>{const point=(await targets()).find(p=>p.id===id);assert.ok(point,`target ${id}`);return point;};
    const click=id=>page.locator(`[data-v4="${id}"]`).first().click();
    async function drag(id,to){const from=await target(id);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:10});await page.mouse.up();}
    async function range(field,key){const input=page.locator(`[data-v4-range=${field}]`);await input.focus();await input.press(key);}
    await page.goto(`${origin}/tools/preview-food-forest-kit.html`);await page.waitForFunction(()=>!!window.foodForestTable);
    await page.evaluate(()=>{localStorage.removeItem('nourishland.food-forest-table.v1');localStorage.removeItem('nourishland.food-forest.comparisons.v3');});await page.reload();await page.waitForFunction(()=>!!window.foodForestTable);
    assert.equal((await read()).pieces.length,0);assert.equal((await read()).learning.step,0);assert.equal((await targets()).filter(t=>t.id.startsWith('bay:')).length,1);assert.equal(await page.locator('.ff-tabs').isVisible(),false);
    await page.waitForTimeout(300);await page.screenshot({path:'artifacts/food-forest-v4-start.png'});
    await page.locator('[data-action=sound]').click();const center=await target('board:center');await drag('bay:0',center);
    assert.equal((await read()).pieces.length,1);assert.equal((await read()).learning.step,1);assert.equal((await read()).growth,0);
    await page.locator('[data-action=undo]').click();assert.equal((await read()).pieces.length,0);assert.equal((await read()).learning.step,0);await drag('bay:0',center);assert.equal((await read()).learning.step,1);
    await range('growth','End');assert.equal((await read()).growth,2);await page.waitForTimeout(850);await page.screenshot({path:'artifacts/food-forest-v4-first-tree.png'});await click('grown');assert.equal((await read()).learning.step,2);await click('choose:groundcover');await drag('bay:0',{x:center.x+55,y:center.y+28});
    const patch=(await read()).pieces.find(p=>p.layer==='groundcover');assert.ok(patch);assert.equal((await read()).learning.step,3);assert.equal(patch.canopyDiameterM,0);
    await click('page:grow');const spot=await target(patch.id);await page.mouse.click(spot.x,spot.y);assert.equal((await read()).selected,patch.id);await range('groundWidthM','End');await range('groundDepthM','End');assert.equal((await read()).pieces.find(p=>p.id===patch.id).groundWidthM,8);
    await click('page:learn');await click('plant');assert.equal((await read()).learning.step,4);const vine=(await read()).pieces.find(p=>p.layer==='climber'),tree=(await read()).pieces.find(p=>p.layer==='small-tree');assert.ok(vine);
    await click('page:grow');await page.locator('[data-v4-support]').selectOption('plant:'+tree.id);assert.equal((await read()).pieces.find(p=>p.id===vine.id).supportId,tree.id);await page.waitForTimeout(850);await page.screenshot({path:'artifacts/food-forest-v4-layered.png'});
    const linked=await read(),treeSpot=await target(tree.id);await drag(tree.id,{x:treeSpot.x+35,y:treeSpot.y-12});const moved=await read(),dx=moved.pieces.find(p=>p.id===tree.id).x-linked.pieces.find(p=>p.id===tree.id).x;assert.ok(Math.abs(dx)>.01);assert.ok(Math.abs(moved.pieces.find(p=>p.id===vine.id).x-linked.pieces.find(p=>p.id===vine.id).x-dx)<.00001);await page.locator('[data-action=undo]').click();await page.locator('[data-v4-select]').selectOption(vine.id);
    await page.locator('[data-v4-support]').selectOption('trail');assert.equal((await read()).pieces.find(p=>p.id===vine.id).supportKind,'trail');await page.locator('[data-action=undo]').click();assert.equal((await read()).pieces.find(p=>p.id===vine.id).supportKind,'plant');
    await page.locator('[data-v4-select]').selectOption(vine.id);const rootBefore=(await read()).pieces.find(p=>p.id===vine.id).rootSpreadM;
    await range('rootSpreadM','End');assert.equal((await read()).rootPlanning.selected.spreadM,20);assert.equal((await read()).pieces.find(p=>p.id===vine.id).rootBasis,'user-assumption');assert.ok((await read()).rootPlanning.overlappingPairs>0);
    await page.locator('[data-action=undo]').click();assert.equal((await read()).pieces.find(p=>p.id===vine.id).rootSpreadM,rootBefore);await page.locator('[data-v4-select]').selectOption(vine.id);
    await range('rootDepthM','End');assert.equal((await read()).rootPlanning.selected.depthM,3);await page.locator('[data-action=undo]').click();await page.locator('[data-v4-select]').selectOption(vine.id);
    await click('page:learn');await click('wind');assert.equal((await read()).learning.step,5);await click('finish');assert.equal((await read()).learning.active,false);assert.equal((await read()).experience.page,'pieces');
    await click('page:more');await page.locator('[data-action=spatial-panel]').click();await click('page:grow');const control=await target('control:v4:growth:1');await page.mouse.click(control.x,control.y);assert.equal((await read()).growth,1);await page.screenshot({path:'artifacts/food-forest-v4-spatial.png'});
    const rootPage=await target('control:v4:page:roots');await page.mouse.click(rootPage.x,rootPage.y);const spreadPlus=await target('control:v4:root:spread:plus');const rootState=await read(),priorRoot=rootState.pieces.find(p=>p.id===rootState.selected).rootSpreadM;await page.mouse.click(spreadPlus.x,spreadPlus.y);const changed=await read();assert.equal(changed.pieces.find(p=>p.id===changed.selected).rootSpreadM,priorRoot+.5);assert.ok(Math.abs(changed.rootPlanning.selected.spreadM-(priorRoot+.5)*.58)<1e-8);const savedRoots=(await read()).pieces.map(p=>p.rootSpreadM);
    await page.reload();await page.waitForFunction(()=>!!window.foodForestTable);assert.equal((await read()).learning.active,false);assert.equal((await read()).pieces.length,3);assert.deepEqual((await read()).pieces.map(p=>p.rootSpreadM),savedRoots);await page.getByRole('button',{name:'Continue building',exact:true}).waitFor();
    await page.setViewportSize({width:390,height:844});await click('page:pieces');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'artifacts/food-forest-v4-mobile.png',fullPage:true});await page.setViewportSize({width:1512,height:982});
    await click('page:learn');await click('new-lesson');assert.equal((await read()).pieces.length,0);assert.equal((await read()).learning.step,0);await page.locator('[data-action=undo]').click();assert.equal((await read()).pieces.length,3);await click('restore-forest');assert.equal((await read()).pieces.length,3);
    // Leave the historical interaction suite its explicit seven-piece fixture.
    await page.evaluate(()=>localStorage.removeItem('nourishland.food-forest-table.v1'));
    console.log('V4: empty-board start, actual drag, lesson undo/progression, growth, layered patches, vine support/trailing, simple XR controls, resume and mobile passed.');
}
