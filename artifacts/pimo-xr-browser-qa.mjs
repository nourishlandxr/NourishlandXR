import assert from 'node:assert/strict';

export async function checkPimoXR(browser, origin, errors) {
    const page = await browser.newPage({ viewport: { width: 1512, height: 982 } });
    page.on('pageerror', error => errors.push(error.message));
    const doc = () => page.evaluate(() => window.pimoEditor.getDocument());
    const state = () => page.evaluate(() => window.pimoEditor.getXRWorkspace().getState());
    const controls = () => page.evaluate(() => window.pimoEditor.getXRWorkspace().getPreviewControls());
    async function click(id) {
        const control = (await controls()).find(control => control.id === id);
        assert.ok(control && !control.disabled, `World control ${id} is available`);
        assert.ok(control.x > 0 && control.x < 1512 && control.y > 0 && control.y < 982, `World control ${id} is in view`);
        await page.mouse.click(control.x, control.y); await page.waitForTimeout(35);
    }
    // insertText emits no keydown on canvas, so test physical keyboard events explicitly.
    async function type(field, value) { await click(`edit:${field}`); await click('key:clear'); await page.keyboard.type(value); await click('save-edit'); }
    try {
        await page.goto(`${origin}/tools/preview-pimo-xr.html`);
        await page.waitForFunction(() => !!window.pimoEditor?.getXRWorkspace());
        await page.waitForTimeout(350); await page.screenshot({ path: 'artifacts/pimo-xr-workspace.png' });
        assert.equal((await doc()).nodes.length, 7);
        await click('edit:title'); await click('key:clear');
        for (const key of ['b', 'e', 'e']) await click(`key:${key}`);
        await page.keyboard.type(' habitat');
        await page.screenshot({ path: 'artifacts/pimo-xr-keyboard.png' });
        await click('save-edit'); assert.equal((await doc()).nodes[0].title, 'bee habitat');
        await type('body', 'Observed native bees at this place.');
        await click('details'); await type('sourceUrl', 'https://example.org/observations'); await type('attribution', 'Local project team'); await click('type:local_observation'); await click('page:cell');
        await click('shape:square'); await click('color:#648f9b');
        let graph = await doc(), seed = graph.nodes[0].id; assert.equal(graph.nodes[0].body, 'Observed native bees at this place.'); assert.equal(graph.nodes[0].informationType, 'local_observation'); assert.equal(graph.layout.nodes[seed].shape, 'square');
        await click(`grow:${seed}`); assert.equal((await state()).editing, 'title'); await click('key:clear'); await page.keyboard.type('Pollinator visits'); await click('save-edit');
        graph = await doc(); const child = graph.nodes.find(node => node.title === 'Pollinator visits'); assert.ok(graph.edges.some(edge => edge.from === seed && edge.to === child.id));
        await click('copy'); const count = (await doc()).nodes.length; await click('remove'); assert.equal((await doc()).nodes.length, count); await click('remove'); assert.equal((await doc()).nodes.length, count - 1);
        await click('undo'); assert.equal((await doc()).nodes.length, count); await click('redo'); assert.equal((await doc()).nodes.length, count - 1); await click('undo');
        graph = await doc(); const a = graph.nodes[1], b = graph.nodes[2];
        await click('mode:connect'); await click(`cell:${a.id}`); await click(`cell:${b.id}`); assert.equal((await state()).editing, 'label'); await page.keyboard.type('supports'); await click('save-edit');
        assert.ok((await doc()).edges.some(edge => edge.from === a.id && edge.to === b.id && edge.label === 'supports'));
        await click('mode:select');
        await click(`cell:${seed}`); const before = (await doc()).layout.nodes[seed]; const position = (await controls()).find(control => control.id === `cell:${seed}`);
        await page.mouse.move(position.x, position.y); await page.mouse.down(); await page.mouse.move(position.x + 55, position.y + 25, { steps: 8 }); await page.mouse.up();
        const after = (await doc()).layout.nodes[seed]; assert.ok(Math.hypot(before.x - after.x, before.y - after.y) > 25);
        assert.ok((await state()).feedback.grab >= 1); assert.ok((await state()).feedback.place >= 1 || (await state()).feedback.snap >= 1);
        await click('undo'); assert.deepEqual((await doc()).layout.nodes[seed], before);
        const cancelled = (await controls()).find(control => control.id === `cell:${seed}`), initial = structuredClone((await doc()).layout.nodes[seed]);
        await page.mouse.move(cancelled.x, cancelled.y); await page.mouse.down(); await page.mouse.move(cancelled.x + 30, cancelled.y + 40, { steps: 5 });
        assert.ok((await state()).held.includes(seed));
        await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.mouse.up(); assert.deepEqual((await doc()).layout.nodes[seed], initial); assert.equal((await state()).held.length, 0);
        await click('snap'); assert.equal((await state()).snap, false); await click('snap');
        await click('sound'); assert.equal((await state()).sound, false); await click('sound');
        await click('fit');
        for (const node of (await doc()).nodes) await click(`cell:${node.id}`);
        // Selection handles upload lazily on their first visible render.
        // Warm the exact cells being alternated before checking for resource growth.
        for (let i = 0; i < 4; i++) await click(`cell:${(await doc()).nodes[i % 2].id}`);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const memory = await state();
        for (let i = 0; i < 12; i++) await click(`cell:${(await doc()).nodes[i % 2].id}`);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const stable = await state(); assert.ok(stable.geometries <= memory.geometries + 1, `Geometry count ${memory.geometries} → ${stable.geometries}`); assert.ok(stable.textures <= memory.textures + 1, `Texture count ${memory.textures} → ${stable.textures}`);
        await click('edit:mapTitle'); await click('key:clear'); await page.keyboard.type('XR field garden'); await click('save-edit'); const originalId = (await doc()).id;
        await click('page:style');
        const content = (await doc()).nodes;
        for (const design of ['classic', 'notes', 'organic']) { await click(`design:${design}`); assert.equal((await doc()).layout.design, design); assert.deepEqual((await doc()).nodes, content); }
        await click('arrange'); await click('undo');
        await page.screenshot({ path: 'artifacts/pimo-xr-designs.png' });
        for (const template of ['classic', 'utility', 'bio', 'food-forest', 'growing', 'empty']) { await click('page:style'); await click(`template:${template}`); assert.equal((await doc()).metadata.template, template); }
        await click('page:library'); await page.screenshot({ path: 'artifacts/pimo-xr-library.png' });
        await click(`load:${originalId}`); assert.equal((await doc()).identity.title, 'XR field garden');
        await click('menu'); assert.ok(!(await controls()).some(item => item.id === 'page:style')); await click('menu');
        await click('page:help'); await page.screenshot({ path: 'artifacts/pimo-xr-controls.png' }); await click('page:cell');
        await click('sound');
        await page.getByRole('button', { name: 'Close spatial canvas', exact: true }).click();
        assert.equal(await page.locator('[data-pimo-editor]').evaluate(element => element.inert), false);
        assert.equal((await doc()).identity.title, 'XR field garden');
        await page.reload(); await page.waitForFunction(() => !!window.pimoEditor?.getXRWorkspace()); assert.equal((await doc()).identity.title, 'XR field garden');
        await page.goto(`${origin}/app/?editor=pimo&mode=xr`); await page.locator('.pimo-xr-workspace canvas').waitFor();
        console.log('PIMO XR: actual Three.js ray targets, floating keyboard, cell notes/sources, designs, templates, saved maps, connection labels, drag, delete confirmation and shared undo/redo passed.');
    } catch (error) { await page.screenshot({ path: 'artifacts/pimo-xr-error.png' }).catch(() => {}); console.log(JSON.stringify({ xrState: await state().catch(() => null), errors })); throw error; }
    finally { await page.close(); }
}
