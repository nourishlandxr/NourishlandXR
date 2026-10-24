import assert from 'node:assert/strict';
export async function checkLivingPieces(page,origin){
    const read=()=>page.evaluate(()=>window.forestPieceGallery.getState()),click=id=>page.locator(`[data-action=${id}]`).click();
    await page.goto(`${origin}/tools/preview-food-forest-pieces-v6.html`);await page.waitForFunction(()=>!!window.forestPieceGallery);await page.waitForTimeout(150);assert.equal((await read()).count,4);
    await page.screenshot({path:'artifacts/food-forest-pieces-v5-orchard.png'});
    await page.locator('[data-family=canopy]').click();await page.locator('[data-variant="1"]').click();await page.screenshot({path:'artifacts/food-forest-pieces-v5-canopy.png'});
    await page.locator('[data-family=herb]').click();await page.locator('[data-variant="3"]').click();await page.screenshot({path:'artifacts/food-forest-pieces-v5-flowers.png'});
    await click('replay');await page.waitForTimeout(100);assert.equal((await read()).planted,true);assert.ok((await read()).reveal<1);await page.waitForTimeout(900);assert.equal((await read()).reveal,1);
    await click('roots');assert.equal((await read()).roots,true);await page.locator('[data-family=small-tree]').click();await page.waitForTimeout(100);await page.screenshot({path:'artifacts/food-forest-pieces-v5-roots.png'});
    const spread=page.getByRole('slider',{name:'Gallery root spread'});await spread.focus();await spread.press('End');assert.equal((await read()).rootPlan.rootSpreadM,20);assert.equal((await read()).rootPlan.rootBasis,'user-assumption');const depth=page.getByRole('slider',{name:'Gallery root depth'});await depth.focus();await depth.press('End');assert.equal((await read()).rootPlan.rootDepthM,3);
    await click('roots');await click('planted');await click('collection');assert.equal((await read()).count,28);await page.waitForTimeout(100);assert.ok((await read()).rendering.triangles<180000);await page.screenshot({path:'artifacts/food-forest-pieces-v5-collection.png'});
    await click('collection');await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'artifacts/food-forest-pieces-v5-mobile.png',fullPage:true});await page.setViewportSize({width:1512,height:982});
    console.log('V5 pieces: family/variant previews, closed-to-open reveal, root inspection, full collection rendering and mobile passed.');
}
