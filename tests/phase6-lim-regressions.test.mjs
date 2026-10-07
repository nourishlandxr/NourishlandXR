import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { infoPanelPose, panelPoseOutsideSafeBounds } from '../app/services/pimInfoPanel.js';
import { WELCOME_PANEL_DRAW_OFFSET, welcomeExperienceFrames, welcomeCellAtPoint } from '../app/services/arWelcomeShowcase.js';
import { DEMO_LIM_TEXTURE_INTERVAL_MS, DEMO_TEXT_TEXTURE_INTERVAL_MS } from '../app/features/ar-demo/demoConfig.js';
import { demoBillboardSurfaceSize, demoBillboardTextureLocalPoint } from '../app/features/ar-demo/demoGeometry.js';
import { demoWelcomeSurfaceHit } from '../app/services/demoWelcomeHit.js';

const demoSource = fs.readFileSync(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8');
const panelSource = fs.readFileSync(new URL('../app/services/pimInfoPanel.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../app/style.css', import.meta.url), 'utf8');

test('Phase 6 welcome copy is bounded to the compact note and scrolls only in the DOM copy', () => {
    assert.match(demoSource, /const contentWidth = 880/);
    assert.match(demoSource, /const titleWidth = 960/);
    assert.ok(demoSource.indexOf('const titleWidth = 960') < demoSource.indexOf('if(openingElapsed!==null)'), 'opening copy initializes its title bounds before drawing');
    assert.match(demoSource, /ctx\.fillText\(introBoardTitle, contentCenter, 420,titleWidth\)/);
    assert.match(demoSource, /DEMO_QUICK_ACCESS_COPY\['INTRO 1\.1'\]/);
    assert.doesNotMatch(demoSource, /drawWrappedTextureText\(ctx, introBoardTitle/);
    assert.doesNotMatch(demoSource, /↙ Control panel/);
    assert.match(demoSource, /ctx\.textAlign = 'left'/);
    assert.match(demoSource, /ctx\.font = `600 \$\{bodyLayout\.fontSize\}px/);
    assert.match(demoSource, /ctx\.rect\(contentLeft, bodyTop - 8, contentWidth, bodyBottom - bodyTop \+ 12\)/);
    assert.match(styles, /\.tryit-guided-choice\.is-welcome-board \.tryit-board-text-window[\s\S]*overflow-y:auto/);
});

test('LIM hit targets use cell coordinates while the welcome panel keeps its own inset', () => {
    assert.deepEqual(WELCOME_PANEL_DRAW_OFFSET, { x: 550, y: 510 });
    assert.match(demoSource, /left:\$\{node\.x\/25\}%/);
    assert.match(demoSource, /welcomeCellAtPoint\(welcomeFrames\(\),hit\.pixelX,hit\.pixelY\)/);
    assert.doesNotMatch(demoSource, /hit\.pixelX-WELCOME/);
    const node = welcomeExperienceFrames(64000, true)[0].nodes[0];
    assert.equal(welcomeCellAtPoint(welcomeExperienceFrames(64000, true), node.x, node.y).key, node.key);
});

test('Quest rays select all four LIMO roots and child cells outside the central welcome note', () => {
    const scaleX = 10;
    const scaleY = 21;
    const surface = demoBillboardSurfaceSize(scaleX, scaleY);
    assert.deepEqual(surface, { width: 4, height: 3.36 });
    const panel = {
        center: { x: 0, y: 0, z: 0 },
        right: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        normal: { x: 0, y: 0, z: 1 },
        ...surface
    };
    const pathwayRoots = welcomeExperienceFrames(64000, false)
        .flatMap(frame => frame.nodes)
        .filter(node => node.depth === 0 && node.id !== 'vision');
    assert.equal(pathwayRoots.length, 4);
    const expandedFrames=welcomeExperienceFrames(64000,false,undefined,undefined,{
        cellsActivatedAt:0,
        expandedLimIds:pathwayRoots.map(node=>node.limId),
        expandedAt:Object.fromEntries(pathwayRoots.map(node=>[node.limId,0]))
    });
    const pathwayChildren=expandedFrames.flatMap(frame=>frame.nodes.filter(node=>node.depth===1).slice(0,1));
    assert.equal(pathwayChildren.length,4);
    for (const { x: pixelX, y: pixelY, key } of [...pathwayRoots,...pathwayChildren]) {
        const local = demoBillboardTextureLocalPoint(pixelX, pixelY, 2500, 2100);
        const ray={
            origin: { x: local.x * scaleX, y: local.y * scaleY, z: 1 },
            direction: { x: 0, y: 0, z: -1 }
        };
        const hit = demoWelcomeSurfaceHit(ray,panel);
        assert.ok(hit);
        assert.ok(Math.abs(hit.pixelX - pixelX) < 1e-9);
        assert.ok(Math.abs(hit.pixelY - pixelY) < 1e-9);
        assert.equal(welcomeCellAtPoint(expandedFrames,hit.pixelX,hit.pixelY)?.key,key);
        assert.equal(demoWelcomeSurfaceHit(ray,panel,{panelOnly:true}),null,'central note must not swallow LIMO rays');
    }
    const center=demoBillboardTextureLocalPoint(1250,1060,2500,2100);
    assert.ok(demoWelcomeSurfaceHit({origin:{x:center.x*scaleX,y:center.y*scaleY,z:1},direction:{x:0,y:0,z:-1}},panel,{panelOnly:true}));
    assert.match(demoSource, /demoBillboardSurfaceSize\(scaleX,scaleY\)/);
    assert.match(demoSource, /return demoWelcomeSurfaceHit\(\{origin,direction\}/);
    assert.match(demoSource, /2500,2100,true\)/);
    assert.match(demoSource, /demoBillboardTextureLocalPoint\(targetNode\.x,targetNode\.y,2500,2100\)/);
});

test('spatial panel keeps its pose through head turns and only moves on grab or explicit recenter', () => {
    const matrix = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,1.6,0,1];
    const pose = infoPanelPose(matrix);
    assert.equal(panelPoseOutsideSafeBounds(matrix, pose), false);
    const turned = [0,0,1,0, 0,1,0,0, -1,0,0,0, 0,1.6,0,1];
    assert.equal(panelPoseOutsideSafeBounds(turned, pose), true);
    assert.doesNotMatch(panelSource, /if\(!manuallyPositioned && panelPoseOutsideSafeBounds\(matrix,pose\)\)/);
    assert.doesNotMatch(panelSource, /Object\.assign\(pose,facePanelTowardEyes\(pose\.center/);
    assert.match(panelSource, /else if\(!pose\)\{[\s\S]*pose=next;[\s\S]*if\(headset && firstPlacement\)[\s\S]*firstPlacement=false;[\s\S]*\}/);
    assert.match(panelSource, /const spatialHeight=\(\)=>guided\?Math\.max\(phoneAR\?900:headset\?700:620,height\(\)\):phoneAR\?900:headset\?700:height\(\)/);
});

test('Phase 6 typing coalesces expensive welcome texture uploads', () => {
    assert.equal(DEMO_TEXT_TEXTURE_INTERVAL_MS,48);
    assert.equal(DEMO_LIM_TEXTURE_INTERVAL_MS,64);
    assert.match(demoSource, /const textureInterval=mapAnimating\?250:limActivation\?\.active \|\| textIsTyping \|\| paragraphFadeActive \|\| openingCopyRevealActive \? DEMO_TEXT_TEXTURE_INTERVAL_MS : arWelcomeShowcaseActive \? 120 : DEMO_LIM_TEXTURE_INTERVAL_MS/);
    assert.match(demoSource, /introTextureUploadedAt >= textureInterval/);
    assert.match(demoSource, /if\(label\.width!==width\)label\.width=width/);
    assert.match(demoSource, /if\(label\.height!==height\)label\.height=height/);
    assert.match(demoSource, /limMeshVisible && limRevealIsAnimating\(\)/);
    assert.doesNotMatch(demoSource, /arWelcomeClock\.elapsed<AR_WELCOME_SETTLED_MS/);
});

test('screen and tracked-pointer LIMO requires a deliberate hold while the hidden DOM layer stays idle', () => {
    assert.match(demoSource, /\['screen','tracked-pointer'\]\.includes\(event\.inputSource\?\.targetRayMode\)/);
    assert.match(demoSource, /limActivation\.start\(node\.key,performance\.now\(\),'xr-hold'\)/);
    assert.doesNotMatch(demoSource, /limActivation\.activateNow\(node\.key,performance\.now\(\),'xr-select'\)/);
    const sessionInteractions = demoSource.slice(demoSource.indexOf('function bindLimSessionInteractions'), demoSource.indexOf('function paintWelcomeLayer'));
    assert.match(sessionInteractions, /captureDemoInputEventRay\(event\)/);
    assert.match(sessionInteractions, /limActivation\.end\(heldKey,performance\.now\(\)\)/);
    assert.match(demoSource, /if\(event\.detail===0\)limActivation\.activateNow\(key,performance\.now\(\),'assistive-click'\)/);
    assert.match(demoSource, /if\(simulatedMode && now-last>=50/);
    assert.match(demoSource, /if\(simulatedMode && arWelcomeLayer\)arWelcomeShowcaseFrame=limRequestFrame\(frame\)/);
});

test('Quest main selection pipeline activates the nearest PIMO or LIMO surface', () => {
    const selectAt = demoSource.indexOf("session.addEventListener('select', event =>");
    const immersive = demoSource.slice(selectAt, demoSource.indexOf('pimHold=bindSpatialPimHold', selectAt));
    assert.match(immersive, /event\.inputSource===limInputSource/);
    assert.match(immersive, /cellTarget\?\.kind==='pim-cell' && selectDemoProfileCell\(cellTarget\)/);
    assert.match(immersive, /if\(cellTarget\?\.kind==='lim-cell'\)return/);
    assert.ok(immersive.indexOf("cellTarget?.kind==='pim-cell'") < immersive.indexOf("cellTarget?.kind==='lim-cell'"));
    const selectStartAt = demoSource.indexOf("session.addEventListener('selectstart', event =>", demoSource.indexOf('pimHold=bindSpatialPimHold'));
    const selectStart = demoSource.slice(selectStartAt, demoSource.indexOf("session.addEventListener('selectend', event =>", selectStartAt));
    assert.match(selectStart, /captureDemoInputEventRay\(event\);[\s\S]*resolveDemoCellTarget\(\)/);
    assert.doesNotMatch(selectStart, /beginControllerDemoHold\(\)/);
    const gripStart=demoSource.slice(demoSource.indexOf("session.addEventListener('squeezestart',event=>"),demoSource.indexOf("session.addEventListener('squeezeend',event=>"));
    assert.match(gripStart,/captureDemoInputEventRay\(event\)[\s\S]*beginControllerDemoHold\(\{record:piece/);
});
