import assert from 'node:assert/strict';
import test from 'node:test';

import {
    PIM_SPATIAL_CONFIG,
    pimEnsureExpandedPaths,
    pimFocusedView,
    pimKnowledgeNodes,
    pimNodeChildren,
    pimNodeHue,
    pimRootPosition,
    pimSpatialPanel,
    pimSpatialPoseAboveAnchor,
    pimSpatialPoseFromStored,
    pimSpatialPoseFromViewer,
    pimToggleExpandedPaths,
    pimVisibleNodes
} from '../app/services/plantInformationMesh.js';
import { pimHoneycombTargetAtPercent } from '../app/services/plantInformationMeshCanvas.js';
import { PIGEON_PEA_AR_KNOWLEDGE } from '../app/services/pigeonPeaExample.js';
import { PIGEON_PEA_PIM } from '../app/services/pigeonPeaPim.js';
import { resolvePlantPim } from '../app/services/pimLegacyAdapter.js';
import { pimToArKnowledge } from '../app/services/pimModel.js';

function flattenedArNodes(nodes) {
    return (Array.isArray(nodes) ? nodes : []).flatMap(node => [node, ...flattenedArNodes(node.children)]);
}

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

test('PIM keeps one main category open at a time and closes it on a second press', () => {
    let expanded = pimToggleExpandedPaths([], 'food-forest');
    assert.deepEqual(expanded, ['food-forest']);
    expanded = pimToggleExpandedPaths(expanded, 'uses');
    assert.deepEqual(expanded, ['uses']);
    expanded = pimToggleExpandedPaths(expanded, 'uses/culinary');
    assert.deepEqual(expanded, ['uses', 'uses/culinary']);
    expanded = pimToggleExpandedPaths(expanded, 'uses/culinary/dried-pulse');
    assert.deepEqual(expanded, ['uses', 'uses/culinary', 'uses/culinary/dried-pulse']);
    expanded = pimToggleExpandedPaths(expanded, 'uses');
    assert.deepEqual(expanded, []);
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

test('PIM treats explicit empty child lists as leaves', () => {
    const uses = pimKnowledgeNodes(PIGEON_PEA_AR_KNOWLEDGE).find(node => node.id === 'uses');
    const animalFodder = pimNodeChildren(uses).find(node => node.id === 'animal-fodder');
    assert.equal(pimNodeChildren(animalFodder).length, 0);
});

test('PIM recentres each deeper generation as a clean recursive honeycomb', () => {
    const focus = pimFocusedView(PIGEON_PEA_AR_KNOWLEDGE, ['uses', 'uses/culinary']);
    assert.equal(focus.focusNode.label, 'Culinary');
    assert.deepEqual(focus.nodes.map(node => node.label), ['Dried pulse', 'Fresh peas', 'Young pods']);
    assert.ok(focus.nodes.every(node => node.parentPosition.x === 50 && node.parentPosition.y === 50));
    assert.ok(focus.nodes.every(node => pimNodeHue(node) === pimNodeHue(focus.focusNode)));
    assert.deepEqual(focus.trail.map(node => node.label), ['Uses', 'Culinary']);
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
