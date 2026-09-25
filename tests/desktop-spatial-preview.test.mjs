import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isDesktopSpatialPreviewEnvironment } from '../app/services/desktopSpatialPreview.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('desktop spatial preview requires a large fine-pointer simulated surface', () => {
    assert.equal(isDesktopSpatialPreviewEnvironment({
        simulated:true,
        quest:false,
        width:1440,
        height:900,
        finePointer:true,
        hover:true
    }), true);
    assert.equal(isDesktopSpatialPreviewEnvironment({
        simulated:true,
        quest:false,
        width:430,
        height:932,
        finePointer:false,
        hover:false
    }), false);
    assert.equal(isDesktopSpatialPreviewEnvironment({
        simulated:false,
        quest:false,
        width:1440,
        height:900,
        finePointer:true,
        hover:true
    }), false);
    assert.equal(isDesktopSpatialPreviewEnvironment({
        simulated:true,
        quest:true,
        width:1440,
        height:900,
        finePointer:true,
        hover:true
    }), false);
});

test('desktop presentation is isolated from phone and Quest renderers', () => {
    const service = read('app/services/desktopSpatialPreview.js');
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/style.css');
    const immersive = read('app/screens/arMode.js');
    assert.match(demo, /mountDesktopSpatialPreview\(appRoot,\{simulated,quest:isQuestHeadsetBrowser\(\)\}\)/);
    assert.match(service, /simulated\s*&&\s*!quest\s*&&\s*finePointer\s*&&\s*hover/);
    assert.match(service, /!demo \|\| !stage \|\| !isDesktopSpatialPreviewEnvironment\(\{ simulated, quest \}\)/);
    assert.match(service, /Drag open space to look around/);
    assert.match(service, /Scroll to move closer/);
    assert.match(styles, /@media \(min-width:960px\) and \(min-height:600px\) and \(hover:hover\) and \(pointer:fine\)/);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview \.nlxr-desktop-spatial-frame/);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview \[data-tryit-sim-markers\]/);
    assert.doesNotMatch(service, /requestImmersiveArSession|immersive-ar|immersive-vr/);
    assert.doesNotMatch(immersive, /desktopSpatialPreview/);
});

test('desktop PIM movement has a dedicated bounded handle', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(demo, /data-desktop-pim-move-handle/);
    assert.match(demo, /desktopConsole\.getBoundingClientRect\(\)\.right \+ 16/);
    assert.match(demo, /handles\.forEach\(handle =>/);
    assert.match(demo, /event\.stopPropagation\(\)/);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview \.nlxr-desktop-pim-move/);
    assert.match(styles, /\.nlxr-desktop-pim-move \{ display:none; \}/);
});

test('desktop control panel keeps a stable footprint and internal media drawer', () => {
    const panel = read('app/services/pimInfoPanel.js');
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(panel, /if\(desktopDemo\)\{railCollapsed=false;mediaCollapsed=false;\}/);
    assert.match(panel, /if\(!desktopDemo\)\{const moveButton=/);
    assert.match(panel, /if\(!desktopDemo\)\{tabs\.append\(makePanelToggle/);
    assert.match(panel, /isDesktopDemo\(\)\?items\.filter\(item=>item\.action!=='Recenter'\):items/);
    assert.match(demo, /if\(!desktopDemo\)actions\.push\(\{id:'safety',label:'Safety guidance'\}\)/);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview ~ \.nlxr-info-panel\.is-demo-panel/);
    assert.match(styles, /width:clamp\(440px,31vw,540px\) !important/);
    assert.match(styles, /height:calc\(100dvh - 36px\) !important/);
    assert.match(styles, /nlxr-panel-move,.nlxr-rail-toggle,.nlxr-media-toggle/);
});
