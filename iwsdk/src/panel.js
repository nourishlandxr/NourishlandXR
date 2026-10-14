/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { createSystem, VisibilityState } from '@iwsdk/core';
import PIGEON_PEA_PIM from './pigeonPeaPim.data.json';

const cellsById = new Map(PIGEON_PEA_PIM.nodes.map((cell) => [cell.id, cell]));
const roots = PIGEON_PEA_PIM.nodes.filter((cell) => cell.parentId === null);

export class PanelSystem extends createSystem({}) {
    init() {
        const panel = this.world.getSceneObject('welcome-panel');
        const xrButton = panel?.getElementById('xr-button');
        const exitButton = panel?.getElementById('exit-button');
        const rootGrid = panel?.getElementById('root-grid');
        const detail = panel?.getElementById('cell-detail');
        const title = panel?.getElementById('cell-title');
        const preview = panel?.getElementById('cell-preview');
        const body = panel?.getElementById('cell-body');
        const evidence = panel?.getElementById('cell-evidence');
        const source = panel?.getElementById('cell-source');
        const notes = panel?.getElementById('cell-notes');
        const backButton = panel?.getElementById('cell-back');
        const childButton = panel?.getElementById('cell-child');
        const childLabel = panel?.getElementById('cell-child-label');
        const nextButton = panel?.getElementById('cell-next');
        if (xrButton == null || exitButton == null) {
            return;
        }
        const cleanup = [];
        if (this.world.xrEnabled) {
            const launchXR = () => this.world.launchXR();
            const exitXR = () => this.world.exitXR();
            xrButton.addEventListener('click', launchXR);
            exitButton.addEventListener('click', exitXR);
            cleanup.push(
                () => xrButton.removeEventListener('click', launchXR),
                () => exitButton.removeEventListener('click', exitXR),
                this.world.visibilityState.subscribe((visibilityState) => {
            const is2D = visibilityState === VisibilityState.NonImmersive;
            xrButton.setProperties({ display: is2D ? 'flex' : 'none' });
            exitButton.setProperties({ display: is2D ? 'none' : 'flex' });
                })
            );
        } else {
            xrButton.setProperties({ display: 'none' });
            exitButton.setProperties({ display: 'none' });
        }

        if (rootGrid && detail && title && preview && body && evidence && source && notes && backButton && childButton && childLabel && nextButton) {
            let activeCell = null;
            const displayValue = (value) => String(value ?? '').replace(/\s+/gu, ' ').trim();
            const showCell = (cell) => {
                if (!cell) return;
                activeCell = cell;
                rootGrid.setProperties({ display: 'none' });
                detail.setProperties({ display: 'flex' });
                title.setProperties({ text: displayValue(cell.title) });
                preview.setProperties({ text: displayValue(cell.preview) });
                body.setProperties({ text: displayValue(cell.body) || 'This is a category cell. Open a related subcell to explore the topic.' });
                evidence.setProperties({ text: `Type: ${displayValue(cell.informationType)} | Evidence: ${displayValue(cell.evidenceStatus)}` });
                const sourceTitles = (cell.sourceIds || [])
                    .map((id) => PIGEON_PEA_PIM.sources.find((item) => item.id === id)?.title)
                    .filter(Boolean);
                source.setProperties({ text: sourceTitles.length ? `Sources: ${sourceTitles.join('; ')}` : 'Reference profile. Check the plant, season and conditions at the real place.' });
                const contextNotes = [cell.attribution, cell.safetyNote].map(displayValue).filter(Boolean);
                notes.setProperties({
                    display: contextNotes.length ? 'flex' : 'none',
                    text: contextNotes.join(' ')
                });
                const children = PIGEON_PEA_PIM.nodes.filter((candidate) => candidate.parentId === cell.id);
                childButton.setProperties({
                    display: children.length ? 'flex' : 'none',
                });
                childLabel.setProperties({ text: children.length ? `Open first subcell (${children.length})` : '' });
                const siblings = cell.parentId === null ? [] : PIGEON_PEA_PIM.nodes.filter((candidate) => candidate.parentId === cell.parentId);
                nextButton.setProperties({ display: siblings.length > 1 ? 'flex' : 'none' });
            };
            const showRoots = () => {
                activeCell = null;
                detail.setProperties({ display: 'none' });
                rootGrid.setProperties({ display: 'flex' });
            };
            const onBack = () => {
                if (!activeCell) return;
                const parent = activeCell.parentId ? cellsById.get(activeCell.parentId) : null;
                if (parent) showCell(parent);
                else showRoots();
            };
            const onOpenChild = () => {
                if (!activeCell) return;
                const child = PIGEON_PEA_PIM.nodes.find((candidate) => candidate.parentId === activeCell.id);
                if (child) showCell(child);
            };
            const onNextSibling = () => {
                if (!activeCell || activeCell.parentId === null) return;
                const siblings = PIGEON_PEA_PIM.nodes.filter((candidate) => candidate.parentId === activeCell.parentId);
                const index = siblings.findIndex((candidate) => candidate.id === activeCell.id);
                if (index >= 0 && siblings.length > 1) showCell(siblings[(index + 1) % siblings.length]);
            };
            const listeners = [];
            for (const root of roots) {
                const button = panel.getElementById(`root-${root.id}`);
                if (!button) continue;
                const onRoot = () => showCell(root);
                button.addEventListener('click', onRoot);
                listeners.push(() => button.removeEventListener('click', onRoot));
            }
            backButton.addEventListener('click', onBack);
            childButton.addEventListener('click', onOpenChild);
            nextButton.addEventListener('click', onNextSibling);
            listeners.push(
                () => backButton.removeEventListener('click', onBack),
                () => childButton.removeEventListener('click', onOpenChild),
                () => nextButton.removeEventListener('click', onNextSibling)
            );
            cleanup.push(...listeners);
        }
        this.cleanupFuncs.push(...cleanup);
    }
}
