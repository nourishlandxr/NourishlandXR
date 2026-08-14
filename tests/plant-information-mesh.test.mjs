import assert from 'node:assert/strict';
import test from 'node:test';

import {
    PIM_SPATIAL_CONFIG,
    pimCreateInteractionState,
    pimExpandedNodeIds,
    pimEnsureExpandedPaths,
    pimKnowledgeNodes,
    pimNodeChildren,
    pimNodeAtPath,
    pimNodeHue,
    pimNodeVisualPosition,
    pimRootPosition,
    pimVisibleNodeBounds,
    pimCorrectVisibleNodeBounds,
    pimViewportSafeArea,
    pimSpatialPanel,
    pimSpatialPoseAboveAnchor,
    pimSpatialPoseFromStored,
    pimSpatialPoseFromViewer,
    pimToggleExpandedPaths,
    pimToggleNodeState,
    pimVisibleNodes
} from '../app/services/plantInformationMesh.js';
import { pimHoneycombTargetAtPercent } from '../app/services/plantInformationMeshCanvas.js';
import { plantInformationMeshMarkup } from '../app/services/plantInformationMeshView.js';
import { createHoldToConfirmController } from '../app/services/holdToConfirm.js';
import { PIM_COMPASS } from '../app/services/pimCompass.js';
import { PIGEON_PEA_AR_KNOWLEDGE } from '../app/services/pigeonPeaExample.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { resolvePlantPim } from '../app/services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../app/services/pimModel.js';

function flattenedArNodes(nodes) {
    return (Array.isArray(nodes) ? nodes : []).flatMap(node => [node, ...flattenedArNodes(node.children)]);
}

test('Demo and Creator consume one canonical PIM renderer, geometry and interaction contract', async () => {
    const [demoSource, creatorSource, viewSource, canvasSource, styles] = await Promise.all([
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/screens/temporaryArDemo.js', import.meta.url), 'utf8')),
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/screens/arMode.js', import.meta.url), 'utf8')),
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/services/plantInformationMeshView.js', import.meta.url), 'utf8')),
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/services/plantInformationMeshCanvas.js', import.meta.url), 'utf8')),
        import('node:fs/promises').then(fs => fs.readFile(new URL('../app/style.css', import.meta.url), 'utf8'))
    ]);
    for (const source of [demoSource, creatorSource]) {
        assert.match(source, /plantInformationMeshMarkup/);
        assert.match(source, /createPlantInformationHoneycombTexture/);
        assert.match(source, /pimCreateInteractionState/);
        assert.match(source, /pimToggleNodeState/);
        assert.doesNotMatch(source, /legacy(?:Creator|Plant)PlantKnowledgeMarkup/);
        assert.doesNotMatch(source, /pimFocusedView\(/);
    }
    assert.match(viewSource, /data-pim-renderer="canonical"/);
    assert.match(viewSource, /data-pim-role="center"/);
    assert.match(viewSource, /data-pim-role="\$\{role\}"/);
    assert.match(canvasSource, /pimVisibleNodes/);
    assert.match(canvasSource, /pimNodeVisualPosition/);
    assert.match(canvasSource, /export function createPlantInformationHoneycombTexture/);
    assert.doesNotMatch(creatorSource, /function createSpatialPimTexture/);
    assert.doesNotMatch(demoSource, /function drawPlantKnowledgeTexture/);
    assert.doesNotMatch(demoSource, /data-demo-plant-tether/);
    assert.doesNotMatch(styles, /plant-knowledge-(?:left|right)/);
    assert.doesNotMatch(styles, /\.tryit-demo \.plant-knowledge-/);
    assert.doesNotMatch(styles, /\.creator-ar-plant-profile \.plant-knowledge-map\s*\{/);
    assert.doesNotMatch(styles, /body\[data-project-theme\] \.creator-ar-plant-profile :is\(\.plant-knowledge-core,\.plant-knowledge-cell\)/);
});

test('canonical AR PIM markup always exposes one center and six primary cells', () => {
    const markup = plantInformationMeshMarkup(PIGEON_PEA_AR_KNOWLEDGE);
    assert.equal((markup.match(/data-pim-role="center"/g) || []).length, 1);
    assert.equal((markup.match(/data-pim-role="primary"/g) || []).length, 6);
    for (const compass of PIM_COMPASS) {
        assert.match(markup, new RegExp(`data-pim-node-id="${compass.id}"`));
    }
    assert.match(markup, /data-pim-role="center"[^>]*>.*Pigeon Pea/s);
});

test('dynamic plants retain the same six empty-visible primary positions', () => {
    const markup = plantInformationMeshMarkup({
        title: 'Tapioca',
        categories: [{ id: 'historical-data', label: 'Historical Data', description: 'A dynamic record' }]
    });
    assert.match(markup, /data-pim-role="center"[^>]*>.*Tapioca/s);
    assert.equal((markup.match(/data-pim-role="primary"/g) || []).length, 6);
    assert.equal((markup.match(/data-pim-node-id="historical-data"/g) || []).length, 1);
    assert.match(markup, /data-pim-node-id="food-forest"[^>]*>.*Food Forest/s);
    assert.match(markup, /data-pim-node-id="cultivation"[^>]*>.*Cultivation/s);
});

test('PIM creates the approved six-cell Pigeon Pea honeycomb in stable directions', () => {
    const roots = pimKnowledgeNodes(PIGEON_PEA_AR_KNOWLEDGE);
    assert.deepEqual(roots.map(node => node.label), [
        'Food Forest',
        'Uses',
        'Propagation',
        'Scientific Information',
        'Historical Data',
        'Cultivation'
    ]);
    assert.deepEqual(roots.map(node => node.direction), [
        'top',
        'upper-left',
        'lower-left',
        'upper-right',
        'lower-right',
        'bottom'
    ]);
    assert.deepEqual(roots.map(node => node.id), [
        'food-forest',
        'uses',
        'propagation',
        'scientific-information',
        'historical-data',
        'cultivation'
    ]);
    const usesChildren = pimNodeChildren(roots.find(node => node.id === 'uses'));
    assert.ok(usesChildren.some(node => node.id === 'medicinal'), 'Medicinal is nested beneath Uses');
    assert.ok(usesChildren.some(node => node.id === 'craft'), 'Craft is nested beneath Uses');
    assert.equal(roots.some(node => ['medicinal', 'craft'].includes(node.id)), false);
    assert.deepEqual(
        roots.map(node => ({ label: node.label, ...pimRootPosition(node).axial })),
        [
            { label: 'Food Forest', q: 0, r: -1 },
            { label: 'Uses', q: -1, r: 0 },
            { label: 'Propagation', q: -1, r: 1 },
            { label: 'Scientific Information', q: 1, r: -1 },
            { label: 'Historical Data', q: 1, r: 0 },
            { label: 'Cultivation', q: 0, r: 1 }
        ]
    );
});

test('PIM preserves sibling primary branches and closes only the selected branch', () => {
    let expanded = pimToggleExpandedPaths([], 'food-forest');
    assert.deepEqual(expanded, ['food-forest']);
    expanded = pimToggleExpandedPaths(expanded, 'uses');
    assert.deepEqual(expanded, ['food-forest', 'uses']);
    expanded = pimToggleExpandedPaths(expanded, 'uses/culinary');
    assert.deepEqual(expanded, ['food-forest', 'uses', 'uses/culinary']);
    expanded = pimToggleExpandedPaths(expanded, 'uses/culinary/dried-pulse');
    assert.deepEqual(expanded, ['food-forest', 'uses', 'uses/culinary', 'uses/culinary/dried-pulse']);
    expanded = pimToggleExpandedPaths(expanded, 'uses');
    assert.deepEqual(expanded, ['food-forest']);
});

test('AR PIM child expansion keeps the complete Pigeon Pea mesh and stable positions', () => {
    const knowledge = PIGEON_PEA_AR_KNOWLEDGE;
    let state = pimCreateInteractionState();
    const visibleIds = () => pimVisibleNodes(knowledge, state.expandedNodeIds, {
        selectedNodeId: state.selectedNodeId
    }).map(node => node.path);
    const positions = () => new Map(pimVisibleNodes(knowledge, state.expandedNodeIds, {
        selectedNodeId: state.selectedNodeId
    }).map(node => [node.path, { ...node.position }]));

    assert.deepEqual(visibleIds(), [
        'food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data', 'cultivation'
    ]);

    state = pimToggleNodeState(knowledge, state, 'historical-data');
    assert.equal(state.selectedNodeId, 'historical-data');
    assert.deepEqual(visibleIds(), [
        'food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data',
        'historical-data/cultural-history', 'historical-data/range-and-movement', 'cultivation'
    ]);
    const afterHistorical = positions();

    state = pimToggleNodeState(knowledge, state, 'historical-data/cultural-history');
    assert.equal(state.selectedNodeId, 'historical-data/cultural-history');
    assert.deepEqual(visibleIds(), [
        'food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data',
        'historical-data/cultural-history',
        'historical-data/cultural-history/attributed-traditional-knowledge',
        'historical-data/range-and-movement', 'cultivation'
    ]);
    for (const [path, position] of afterHistorical) {
        assert.deepEqual(positions().get(path), position, `${path} keeps its position`);
    }

    state = pimToggleNodeState(knowledge, state, 'historical-data/cultural-history');
    assert.deepEqual(visibleIds(), [
        'food-forest', 'uses', 'propagation', 'scientific-information', 'historical-data',
        'historical-data/cultural-history', 'historical-data/range-and-movement', 'cultivation'
    ]);
    assert.equal(pimExpandedNodeIds(state).includes('historical-data/cultural-history'), false);

    const reopenedPositions = new Map();
    for (let attempt = 0; attempt < 3; attempt += 1) {
        state = pimToggleNodeState(knowledge, state, 'historical-data/cultural-history');
        const current = positions();
        const child = current.get('historical-data/cultural-history/attributed-traditional-knowledge');
        if (!reopenedPositions.size) reopenedPositions.set('child', child);
        else assert.deepEqual(child, reopenedPositions.get('child'));
        state = pimToggleNodeState(knowledge, state, 'historical-data/cultural-history');
    }
    assert.equal(new Set(visibleIds()).size, visibleIds().length, 'repeated expansion has no duplicate node IDs');
});

test('PIM cell opening keeps the mesh open and follows the selected submenu path', () => {
    let expanded = pimEnsureExpandedPaths([], 'uses');
    assert.deepEqual(expanded, ['uses']);
    expanded = pimEnsureExpandedPaths(expanded, 'uses/culinary');
    assert.deepEqual(expanded, ['uses', 'uses/culinary']);
    assert.deepEqual(pimEnsureExpandedPaths(expanded, 'uses/culinary'), expanded);
    assert.deepEqual(pimToggleExpandedPaths(expanded, 'uses/culinary'), ['uses']);
});

test('PIM grows child cells outward from the selected category with stable family colour', () => {
    const nodes = pimVisibleNodes(PIGEON_PEA_AR_KNOWLEDGE, ['food-forest']);
    const root = nodes.find(node => node.path === 'food-forest');
    const children = nodes.filter(node => node.parentPath === 'food-forest');
    assert.equal(children.length, 2);
    assert.ok(children.every(node => node.position.y < root.position.y));
    assert.ok(children.every(node => pimNodeHue(node) === pimNodeHue(root)));
    assert.ok(children.every(node => Math.hypot(
        node.position.x - root.position.x,
        node.position.y - root.position.y
    ) > 10));
    assert.equal(pimVisibleNodes(PIGEON_PEA_AR_KNOWLEDGE, []).length, 6);
});

test('PIM spatial bloom and hit-testing share the same parent-relative cell position', () => {
    const nodes = pimVisibleNodes(PIGEON_PEA_AR_KNOWLEDGE, ['food-forest']);
    const parent = nodes.find(node => node.path === 'food-forest');
    const child = nodes.find(node => node.parentPath === 'food-forest');
    const start = pimNodeVisualPosition(child, 0);
    const end = pimNodeVisualPosition(child, 1);
    assert.deepEqual(start, { x: parent.position.x, y: parent.position.y });
    assert.deepEqual(end, { x: child.position.x, y: child.position.y });
    assert.equal(pimHoneycombTargetAtPercent(
        PIGEON_PEA_AR_KNOWLEDGE,
        ['food-forest'],
        end.x,
        end.y,
        { bloomProgress: 1 }
    ).path, child.path);
});

test('PIM treats explicit empty child lists as leaves', () => {
    const uses = pimKnowledgeNodes(PIGEON_PEA_AR_KNOWLEDGE).find(node => node.id === 'uses');
    const animalFodder = pimNodeChildren(uses).find(node => node.id === 'animal-fodder');
    assert.equal(pimNodeChildren(animalFodder).length, 0);
});

test('AR projection preserves every canonical Pigeon Pea node ID and stable path', () => {
    const projectedNodes = flattenedArNodes(PIGEON_PEA_AR_KNOWLEDGE.categories);
    const projectedById = new Map(projectedNodes.map(node => [node.id, node]));
    assert.equal(projectedNodes.length, PIGEON_PEA_PIM.nodes.length);
    PIGEON_PEA_PIM.nodes.forEach(node => {
        assert.equal(projectedById.get(node.id)?.path, node.path, `${node.id} keeps its shared PIM path`);
    });
});

test('legacy category arrays cannot redefine the global AR compass', () => {
    const projected = pimToArKnowledge(resolvePlantPim({
        common_name: 'Compass Test Plant',
        pim_categories: [
            { id: 'cultivation', label: 'Wrong top label', direction: 'top', children: [{ id: 'care', label: 'Care' }] },
            { id: 'uses', label: 'Wrong bottom label', direction: 'bottom', children: [
                { id: 'medicinal', label: 'Medicinal' },
                { id: 'craft', label: 'Craft' }
            ] }
        ]
    }, { plantId: 'compass-test', commonName: 'Compass Test Plant' }));
    const roots = pimKnowledgeNodes(projected);
    assert.deepEqual(roots.map(node => [node.id, node.label, node.direction]), [
        ['food-forest', 'Food Forest', 'top'],
        ['uses', 'Uses', 'upper-left'],
        ['propagation', 'Propagation', 'lower-left'],
        ['scientific-information', 'Scientific Information', 'upper-right'],
        ['historical-data', 'Historical Data', 'lower-right'],
        ['cultivation', 'Cultivation', 'bottom']
    ]);
    assert.deepEqual(pimNodeChildren(roots.find(node => node.id === 'uses')).map(node => node.id), ['medicinal', 'craft']);
});

test('PIM spatial pose is captured once, world-sized and JSON serializable', () => {
    const viewerMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const pose = pimSpatialPoseFromViewer(viewerMatrix, { plantId: 'pigeon-pea', anchorId: 'garden-totem' });
    assert.equal(pose.position.x, 0);
    assert.equal(pose.position.z, -PIM_SPATIAL_CONFIG.placementDistanceMetres);
    assert.ok(pose.position.y < 1.6);
    assert.equal(pose.plantId, 'pigeon-pea');
    assert.equal(pose.anchorId, 'garden-totem');
    const restoredPose = JSON.parse(JSON.stringify(pose));
    assert.equal(restoredPose.position.z, pose.position.z);
    assert.equal(restoredPose.rotation.w, pose.rotation.w);
    assert.equal(restoredPose.plantId, pose.plantId);
    assert.equal(restoredPose.anchorId, pose.anchorId);
    const panel = pimSpatialPanel(pose);
    assert.equal(panel.width, PIM_SPATIAL_CONFIG.expandedSurfaceWidthMetres);
    assert.equal(panel.height, PIM_SPATIAL_CONFIG.expandedSurfaceHeightMetres);
    const repairedPanel = pimSpatialPanel({
        ...pose,
        right: { x: -pose.right.x, y: 0, z: -pose.right.z }
    });
    assert.equal(repairedPanel.right.x, 1, 'render basis stays left-to-right for legacy poses');
    assert.equal(repairedPanel.right.y, 0);
    assert.equal(Math.abs(repairedPanel.right.z), 0);
    assert.equal(PIM_SPATIAL_CONFIG.cellWidthMetres, .24);
    assert.equal(PIM_SPATIAL_CONFIG.colliderScale, 1.2);

    const markerPosition = { x: 2, y: .4, z: -3 };
    const stored = {
        position: { x: -.5, y: 1, z: 1.5 },
        rotation: pose.rotation,
        scale: 1,
        plant_id: 'pigeon-pea',
        anchor_id: 'pigeon-marker',
        coordinate_space: 'marker-local'
    };
    const reopened = pimSpatialPoseFromStored(stored, markerPosition);
    assert.deepEqual(reopened.position, { x: 1.5, y: 1.4, z: -1.5 });
    assert.equal(reopened.plantId, 'pigeon-pea');
    assert.equal(reopened.anchorId, 'pigeon-marker');
});

test('PIM plant pose is lifted above its orb for first-open AR placement', () => {
    const viewerMatrix = new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 1.6, 0, 1
    ]);
    const pose = pimSpatialPoseAboveAnchor(viewerMatrix, { x: 1, y: .2, z: -2 }, { plantId: 'pigeon-pea' });
    assert.equal(pose.position.y, .2 + PIM_SPATIAL_CONFIG.overheadLiftMetres);
    assert.ok(pose.position.z > -2, 'the panel is nudged toward the viewer');
    assert.ok(pose.position.y > .2, 'the panel is overhead relative to the orb');
});

test('PIM shared hit testing exposes large cells without a floating recenter control', () => {
    const foodForest = pimKnowledgeNodes(PIGEON_PEA_AR_KNOWLEDGE)[0];
    const point = pimRootPosition(foodForest);
    assert.equal(pimHoneycombTargetAtPercent(
        PIGEON_PEA_AR_KNOWLEDGE,
        [],
        point.x,
        point.y
    ).path, 'food-forest');
    assert.equal(pimHoneycombTargetAtPercent(PIGEON_PEA_AR_KNOWLEDGE, [], 50, 94), null);
    assert.equal(pimHoneycombTargetAtPercent(PIGEON_PEA_AR_KNOWLEDGE, [], 2, 2), null);
});

test('expanded PIM bounds are corrected as one mesh without early cell clamping', () => {
    const nodes = pimVisibleNodes(PIGEON_PEA_AR_KNOWLEDGE, [
        'cultivation',
        'cultivation/climate',
        'food-forest',
        'food-forest/ecological-functions'
    ]);
    const bounds = pimVisibleNodeBounds(nodes);
    assert.ok(bounds.left >= 6 && bounds.right <= 94, JSON.stringify(bounds));
    assert.ok(bounds.top >= 6 && bounds.bottom <= 94, JSON.stringify(bounds));
    assert.ok(nodes.every(node => node.layoutScale >= .72 && node.layoutScale <= 1));
    assert.ok(nodes.some(node => node.layoutScale < 1), 'deep branches use a modest uniform fallback scale');
    const rawDeepChild = pimNodeAtPath(PIGEON_PEA_AR_KNOWLEDGE, 'cultivation/climate/warm-growing-conditions');
    assert.ok(rawDeepChild, 'the third-level test node exists');
    assert.ok(rawDeepChild.path.includes('/'));
});

test('viewport safe area recalculates on a resized visual viewport', () => {
    const phone = pimViewportSafeArea(320, 568, { topInset: 24, bottomInset: 96 });
    const widePhone = pimViewportSafeArea(430, 932, { topInset: 24, bottomInset: 96 });
    assert.ok(phone.left > widePhone.left, 'the same pixel edge inset occupies more narrow-screen space');
    assert.ok(phone.bottom < widePhone.bottom, 'the same bottom controls reserve the correct resized percentage');
    const corrected = pimCorrectVisibleNodeBounds(pimVisibleNodes(PIGEON_PEA_AR_KNOWLEDGE, ['cultivation']), {
        safeArea: phone,
        minimumScale: .72
    });
    assert.ok(pimVisibleNodeBounds(corrected).bottom <= phone.bottom);
});

test('hold-to-confirm completes once, cancels early, and resets progress', () => {
    let completed = 0;
    const progress = [];
    const hold = createHoldToConfirmController({
        duration: 2000,
        onProgress: value => progress.push(value),
        onComplete: () => { completed += 1; }
    });
    hold.start(100);
    assert.equal(hold.tick(2099), false);
    assert.equal(completed, 0);
    hold.cancel();
    assert.equal(hold.progress, 0);
    hold.start(3000);
    assert.equal(hold.tick(4999), false);
    assert.equal(hold.tick(5000), true);
    assert.equal(hold.tick(6000), true);
    assert.equal(completed, 1);
    assert.equal(progress.at(-1), 1);
});
