import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { checkPimoXR } from './pimo-xr-browser-qa.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.PIMO_PREVIEW_ORIGIN || 'http://127.0.0.1:8093';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
// Optional sandbox fixture: Chromium receives repository files through Playwright,
// without a localhost listener or any outbound network access.
if (process.env.PIMO_FILE_FIXTURE === '1') {
    const root = path.resolve('.'), mimes = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async options => {
        const context = await newContext({ ...options, serviceWorkers: 'block' });
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== origin) return route.fulfill({ status: 204, body: '' });
            let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
            if (!file.startsWith(root + path.sep)) return route.fulfill({ status: 403, body: '' });
            if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
            if (!fs.existsSync(file)) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
            return route.fulfill({ path: file, contentType: mimes[path.extname(file)] || 'application/octet-stream' });
        });
        return context;
    };
    browser.newPage = async options => { const context = await browser.newContext(options); return context.newPage(); };
}
let page;
async function checkDesignOptions() {
    const designPage = await browser.newPage({ viewport: { width: 1512, height: 982 } }); designPage.on('pageerror', error => errors.push(error.message));
    await designPage.goto(`${origin}/tools/preview-pimo-editor.html`); await designPage.locator('[data-cell]').first().waitFor();
    assert.equal(await designPage.locator('button[data-design]').count(), 3);
    await designPage.locator('[data-template=classic]').click();
    const read = () => designPage.evaluate(() => window.pimoEditor.getDocument());
    const content = await read(); assert.equal(content.layout.design, 'classic');
    for (const design of ['classic', 'notes', 'organic']) {
        await designPage.locator(`button[data-design=${design}]`).click();
        assert.equal(await designPage.locator(`button[data-design=${design}]`).getAttribute('aria-pressed'), 'true');
        const graph = await read(); assert.deepEqual(graph.nodes, content.nodes); assert.deepEqual(graph.sources, content.sources);
        assert.deepEqual(graph.edges.map(({ waypoints, ...edge }) => edge), content.edges.map(({ waypoints, ...edge }) => edge));
        assert.ok(Object.values(graph.layout.nodes).every(layout => layout.shape === ({ classic: 'hexagon', notes: 'square', organic: 'organic' })[design]));
        await designPage.waitForTimeout(200); await designPage.screenshot({ path: `artifacts/pimo-design-${design}.png` });
    }
    await designPage.locator('button[data-design=notes]').click();
    await designPage.locator('[data-action=undo]').click(); assert.equal((await read()).layout.design, 'organic');
    await designPage.locator('[data-action=redo]').click(); assert.equal((await read()).layout.design, 'notes');
    await designPage.reload(); await designPage.locator('[data-cell]').first().waitFor(); assert.equal((await read()).layout.design, 'notes');
    await designPage.locator('[data-action=grow]').click(); assert.equal(Object.values((await read()).layout.nodes).at(-1).shape, 'square');
    await designPage.locator('[data-action=spatial]').click(); await designPage.locator('.pimo-spatial canvas').waitFor();
    await designPage.waitForTimeout(300); await designPage.screenshot({ path: 'artifacts/pimo-design-notes-spatial.png' });
    await designPage.getByRole('button', { name: 'Close spatial canvas', exact: true }).click();
    await designPage.locator('[data-template=bio]').click(); assert.equal((await read()).layout.design, 'notes');
    assert.equal((await read()).nodes.some(node => node.title === 'Cultivation'), false);
    await designPage.close();
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(`${origin}/tools/preview-pimo-editor.html`); await mobile.locator('[data-cell]').first().waitFor();
    for (const design of ['classic', 'notes', 'organic']) { await mobile.locator(`button[data-design=${design}]`).tap(); assert.equal(await mobile.locator(`button[data-design=${design}]`).getAttribute('aria-pressed'), 'true'); }
    const sizes = await mobile.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, buttons: [...document.querySelectorAll('button[data-design]')].map(button => { const b = button.getBoundingClientRect(); return { x: b.x, right: b.right, height: b.height }; }) }));
    assert.ok(sizes.width <= sizes.viewport + 1); assert.ok(sizes.buttons.every(button => button.x >= 0 && button.right <= sizes.viewport && button.height >= 44));
    await mobile.screenshot({ path: 'artifacts/pimo-design-mobile.png' }); await mobile.close();
}
try {
    await checkPimoXR(browser, origin, errors);
    if (process.env.PIMO_XR_ONLY === '1') {
        page = await browser.newPage({ viewport: { width: 1440, height: 960 } }); page.on('pageerror', error => errors.push(error.message));
        await page.goto(`${origin}/app/`); await page.locator('.welcome-version-badge').first().waitFor({ timeout: 60000 });
        const expectedVersion = fs.readFileSync('app/services/buildInfo.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];
        assert.ok((await page.locator('.welcome-version-badge').first().textContent()).includes(expectedVersion));
        await page.screenshot({ path: 'artifacts/pimo-xr-welcome-version.png' }); assert.deepEqual(errors, []);
        console.log(JSON.stringify({ version: expectedVersion, xrControls: 'passed', grabPlaceAndCancel: 'passed', geometryAndTextureReuse: 'passed', welcomeVersion: 'visible', fixture: process.env.PIMO_FILE_FIXTURE === '1', errors }, null, 2));
    } else {
    await checkDesignOptions();
    page = await browser.newPage({ viewport: { width: 1512, height: 982 } }); page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/tools/preview-pimo-editor.html`);
    await page.locator('[data-cell]').first().waitFor();
    assert.equal(await page.locator('[data-template]').count(), 6);
    assert.equal(await page.locator('[data-cell]').count(), 7);
    assert.equal(await page.locator('[data-action=mode-select]').getAttribute('aria-pressed'), 'true');
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-action=mode-select]')).backgroundColor === 'rgb(39, 77, 62)');
    assert.equal(await page.locator('[data-action=mode-select]').evaluate(button => getComputedStyle(button).backgroundColor), 'rgb(39, 77, 62)');
    await page.screenshot({ path: 'artifacts/pimo-editor-desktop.png' });
    const doc = () => page.evaluate(() => window.pimoEditor.getDocument());
    await page.locator('[data-action=grow]').click();
    await page.locator('[data-field=title]').fill('Pollinator patch'); await page.locator('[data-field=title]').press('Tab');
    await page.locator('[data-field=body]').fill('A place for our local observations.'); await page.locator('[data-field=body]').press('Tab');
    await page.locator('[data-shape=hexagon]').click(); await page.locator('[data-color="#648f9b"]').click();
    let graph = await doc(), added = graph.nodes.find(node => node.title === 'Pollinator patch'); assert.ok(added); assert.equal(added.body, 'A place for our local observations.');
    assert.equal(graph.layout.nodes[added.id].shape, 'hexagon');
    const cell = page.locator(`[data-cell="${added.id}"]`); const box = await cell.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 45, { steps: 10 }); await page.mouse.up();
    assert.notEqual((await doc()).layout.nodes[added.id].x, graph.layout.nodes[added.id].x);
    await page.locator('[data-action=undo]').click(); assert.equal((await doc()).layout.nodes[added.id].x, graph.layout.nodes[added.id].x);
    await page.locator('[data-action=redo]').click();
    await page.reload(); await page.locator('[data-cell]').first().waitFor(); assert.ok((await doc()).nodes.some(node => node.title === 'Pollinator patch'));
    await page.locator('[data-template=empty]').click();
    await page.locator('[data-action=mode-draw]').click();
    const canvas = await page.locator('[data-canvas]').boundingBox(), cx = canvas.x + canvas.width * .75, cy = canvas.y + canvas.height * .38;
    await page.mouse.move(cx + 60, cy); await page.mouse.down();
    for (let i = 1; i <= 36; i++) { const a = i / 36 * Math.PI * 2; await page.mouse.move(cx + Math.cos(a) * (60 + Math.sin(a * 3) * 5), cy + Math.sin(a) * 50); }
    await page.mouse.up(); await page.locator('[data-field=title]').fill('Wildlife refuge'); await page.locator('[data-field=title]').press('Tab');
    graph = await doc(); added = graph.nodes.find(node => node.title === 'Wildlife refuge'); assert.ok(graph.layout.nodes[added.id].outline.length > 10);
    await page.locator('[data-action=mode-connect]').click();
    const from = await page.locator(`[data-cell="${graph.nodes[0].id}"]`).boundingBox(), to = await page.locator(`[data-cell="${added.id}"]`).boundingBox();
    const p1 = { x: from.x + from.width / 2, y: from.y + from.height / 2 }, p2 = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    await page.mouse.move(p1.x, p1.y); await page.mouse.down();
    for (let i = 1; i <= 24; i++) { const t = i / 24; await page.mouse.move(p1.x + (p2.x - p1.x) * t, p1.y + (p2.y - p1.y) * t + Math.sin(t * Math.PI) * 70); }
    await page.mouse.up(); assert.equal((await doc()).edges.length, 1); assert.ok((await doc()).edges[0].waypoints.length > 3);
    await page.locator('[data-edge-field=label]').fill('Provides habitat'); await page.locator('[data-edge-field=label]').press('Tab');
    assert.equal((await doc()).edges[0].label, 'Provides habitat');
    await page.screenshot({ path: 'artifacts/pimo-editor-drawing.png' });
    const portable = await doc();
    const downloadEvent = page.waitForEvent('download'); await page.locator('[data-action=export]').click(); const download = await downloadEvent;
    assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(), 'utf8')), portable);
    await page.locator('[data-template=food-forest]').click();
    await page.locator('[data-action=spatial]').click(); await page.locator('.pimo-spatial canvas').waitFor();
    await page.waitForTimeout(500); await page.screenshot({ path: 'artifacts/pimo-editor-spatial.png' });
    const beforeGrow = (await doc()).nodes.length;
    await page.locator('.pimo-spatial [data-spatial=grow]').click();
    const spatialBox = await page.locator('.pimo-spatial canvas').boundingBox(); await page.mouse.click(spatialBox.width * .5, spatialBox.height * .5);
    assert.equal((await doc()).nodes.length, beforeGrow + 1);
    await page.locator('.pimo-spatial [data-spatial=undo]').click(); assert.equal((await doc()).nodes.length, beforeGrow);
    await page.getByRole('button', { name: 'Close spatial canvas', exact: true }).click(); await page.locator('.pimo-spatial').waitFor({ state: 'detached' });
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobile = await mobileContext.newPage(); mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(`${origin}/tools/preview-pimo-editor.html`); await mobile.locator('[data-cell]').first().waitFor();
    await mobile.locator('[data-import]').setInputFiles({ name: 'portable.pimo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(portable)) });
    assert.equal(await mobile.locator('[data-cell]').count(), portable.nodes.length);
    await mobile.locator('[data-action=library]').tap(); await mobile.locator('[data-template=food-forest]').tap();
    assert.equal(await mobile.locator('[data-cell]').count(), 8);
    const dimensions = await mobile.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth })); assert.ok(dimensions.width <= dimensions.viewport + 1);
    await mobile.screenshot({ path: 'artifacts/pimo-editor-mobile.png' });
    const beforePinch = await mobile.locator('[data-canvas]').getAttribute('viewBox');
    const cdp = await mobileContext.newCDPSession(mobile);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 600, id: 1 }, { x: 260, y: 600, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 80, y: 600, id: 1 }, { x: 300, y: 600, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.notEqual(await mobile.locator('[data-canvas]').getAttribute('viewBox'), beforePinch);
    await mobile.locator('[data-action=fit]').tap();
    await mobile.locator('[data-cell]').filter({ hasText: 'Wildlife' }).tap(); await mobile.locator('[data-field=title]').fill('Local wildlife'); await mobile.locator('[data-field=title]').blur();
    await mobile.screenshot({ path: 'artifacts/pimo-editor-mobile-details.png' });
    assert.equal((await mobile.evaluate(() => window.pimoEditor.getDocument())).nodes.some(node => node.title === 'Local wildlife'), true);
    await page.goto(`${origin}/app/?editor=pimo`); await page.locator('[data-pimo-editor]').waitFor();
    await page.goto(`${origin}/app/`); await page.locator('.welcome-version-badge').first().waitFor({ timeout: 60000 });
    const expectedVersion = fs.readFileSync('app/services/buildInfo.js', 'utf8').match(/const VERSION = '([^']+)'/)[1];
    assert.ok((await page.locator('.welcome-version-badge').first().textContent()).includes(expectedVersion));
    await page.screenshot({ path: 'artifacts/pimo-editor-welcome-version.png' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ version: expectedVersion, designs: 'Classic flower, Notes mesh, Organic; desktop/mobile switching, history, saved preference and spatial rendering passed', templates: 6, editableContent: 'passed', dragUndoRedo: 'passed', localResume: 'passed', freehandCellsAndConnectors: 'passed', portableImportExport: 'passed across browser contexts', spatialCanvas: 'WebGL rendered; create and undo passed', mobile: 'template, touch selection, editing, pinch zoom and viewport passed', appRoute: 'passed', welcomeVersion: 'visible', errors }, null, 2));
    }
} catch (error) { if (page) await page.screenshot({ path: 'artifacts/pimo-editor-error.png' }).catch(() => {}); console.log(JSON.stringify({ errors, body: await page?.locator('body').innerText().catch(() => '') }, null, 2)); throw error; }
finally { await browser.close(); }
