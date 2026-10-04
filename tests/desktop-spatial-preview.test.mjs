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

test('desktop control panel keeps a stable rail and shows media only for the active PIMO', () => {
    const panel = read('app/services/pimInfoPanel.js');
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(panel, /if\(desktopDemo\)railCollapsed=false;/);
    assert.match(panel, /const showMediaWing=plantPreviewAvailable && !mediaCollapsed && !mediaDetached;/);
    assert.match(panel, /const removePanelMove=bindPanelMove\(\)/);
    assert.match(panel, /header\.title='Hold to move the Control panel'/);
    assert.match(panel, /PANEL_GRAB_HOLD_MS = 800/);
    assert.match(styles, /\.nlxr-info-panel:is\(\.is-demo-panel,\.is-creator-panel\)\.is-grabbed/);
    assert.match(panel, /if\(!floating && !isDesktopDemo\(\)\)toolbar\.append\(makePanelToggle\('Media'/);
    assert.match(panel, /if\(mediaToggle && desktopDemo\)mediaToggle\.remove\(\)/);
    assert.match(panel, /isDesktopDemo\(\)\?visible\.filter\(item=>item\.action!=='Recenter'\):visible/);
    assert.match(demo, /if\(!desktopDemo\)actions\.push\(\{id:'safety',label:'Safety guidance'\}\)/);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview ~ \.nlxr-info-panel\.is-demo-panel/);
    assert.match(styles, /width:clamp\(440px,31vw,540px\) !important/);
    assert.match(styles, /height:calc\(100dvh - 36px\) !important/);
    assert.match(styles, /\.nlxr-control-header\.is-move-handle/);
});

test('desktop primary action stays on its rendered surface while phone preview uses the safe footer', () => {
    const demo = read('app/screens/temporaryArDemo.js');
    const styles = read('app/living-objects.css');
    assert.match(demo, /const phoneFooterAction=simulatedMode && !desktopPreview/);
    assert.match(demo, /mainScreen && desktopPreview\)mainScreen\.append\(trigger\)/);
    assert.match(read('app/style.css'), /\.tryit-context-trigger\.is-phone-footer-action/);
    assert.match(demo, /demoLocalizedText\('Continue'\)/);
    assert.doesNotMatch(demo, /Begin with why/i);
    assert.match(styles, /\.tryit-demo\.is-desktop-spatial-preview ~ \.tryit-context-trigger:not\(\[hidden\]\)/);
    assert.match(styles, /bottom:38px/);
});
