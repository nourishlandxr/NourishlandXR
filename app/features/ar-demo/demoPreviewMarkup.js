import { PIGEON_PEA_EXAMPLE } from '../../services/pigeonPeaExample.js';
import { escapeSpatialText, totemCardsMarkup } from '../../services/spatialKnowledgePresentation.js';
import { DEMO_CONTENT, PIGEON_PEA_CONTROL_IMAGE } from './demoContent.js';
import { MORINGA_PROFILE_IMAGE } from './demoPlantContent.js';
import { demoOrbStyle, simulatedAnchorStyle } from './demoSimulation.js';
import { demoAreaLinkVisible } from '../../services/demoAreaOwnership.js';

export function virtualTagProfileMarkup(profile = PIGEON_PEA_EXAMPLE) {
    return `<div class="tryit-virtual-tag-shell">
        <header class="tryit-virtual-tag-header">
          <span>WEB MODE · PLANT LIVE TAG</span>
          <strong>FULL PLANT PROFILE</strong>
        </header>
        <main class="tryit-virtual-tag-profile" aria-labelledby="tryitVirtualTagTitle">
          <section class="tryit-virtual-tag-identity">
            <span class="tryit-virtual-tag-orb" aria-hidden="true"></span>
            <div><small>${profile.name} · COMPLETE PLANT FILE</small><h2 id="tryitVirtualTagTitle">${profile.commonName}</h2><p><i>${profile.scientificName}</i> · ${profile.family}</p><p>${profile.plantType}</p></div>
          </section>
          <section class="tryit-virtual-tag-tutorial">
            <small>TUTORIAL · WEB MODE</small>
            <strong>The same Plant Profile can be read outside AR.</strong>
            <p>${profile.shortProfile}</p>
            <p>A Plant Live Tag can open this full, view-only plant file. Close Web Mode to return to the same AR scene and continue with Moringa.</p>
          </section>
          <section class="tryit-virtual-tag-pim" aria-label="Pigeon Pea plant information"><div data-demo-pim-web-mount></div></section>
        </main>
        <button type="button" class="tryit-virtual-tag-close" data-demo-close-web-mode>CLOSE WEB MODE · RETURN TO AR</button>
      </div>`;
}

export function demoContentFor(record) {
    return record?.demoContent || DEMO_CONTENT[record?.demoType || record?.type];
}

export function demoPlantMedia(record) {
    if (record?.demoAmbientNeighbour) {
        const identity=record.demoKnowledgeProfile?.pim?.identity;
        return identity?.image ? {image:identity.image,alt:identity.imageAlt || record.name,caption:identity.imageCaption || record.name} : null;
    }
    return record?.demoPlantPreset === 'moringa'
        ? { image: MORINGA_PROFILE_IMAGE, alt: 'Moringa tree with compound green leaves' }
        : { image: PIGEON_PEA_CONTROL_IMAGE, alt: 'Pigeon Pea flowers, green pods and peas', hint: 'Select the plant to explore it, or grab it to reposition it.' };
}

export function simulatedPlantMarkup(record, index, anchor, offset, { held = false, surface = null, knowledgeMarkup = '' } = {}) {
    const anchorVariables = simulatedAnchorStyle(anchor);
    const orbAppearance = demoOrbStyle(record);
    const orbLabel = record.demoExpanded ? `Hide ${record.name || 'Plant'} profile` : `Open ${record.name || 'Plant'} profile`;
    const ambient = Boolean(record.demoAmbientNeighbour && record.demoInteractive === false);
    const anchoredOrb = `<span class="tryit-sim-marker tryit-sim-marker-plant is-demo-orb is-demo-${record.demoOrbShape || 'orb'} has-plant-profile${record.demoExpanded ? ' has-information' : ''}${held ? ' is-held' : ''}${ambient ? ' is-neighbour-orb' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${anchorVariables};${orbAppearance};--depth-scale:${record.demoDepthScale || 1}" role="${record.demoInteractive === false ? 'img' : 'button'}" tabindex="${record.demoInteractive === false ? '-1' : '0'}" aria-label="${record.demoInteractive === false ? `Nearby ${record.name} Plant Orb` : orbLabel}"><span class="tryit-sim-orb is-plant" style="${orbAppearance}" aria-hidden="true"></span></span>`;
    if (!record.demoExpanded) return anchoredOrb;
    const profileVariables = `${anchorVariables};--panel-x:${offset.x}px;--panel-y:${offset.y}px;width:${surface.panelWidth}px;height:${surface.panelHeight}px`;
    return `${anchoredOrb}<span class="tryit-sim-plant-profile" data-demo-plant-profile="${index}" style="${profileVariables}" role="group" aria-label="${record.name || 'Plant'} information"><button type="button" class="nlxr-desktop-pim-move" data-desktop-pim-move-handle aria-label="Move plant information"><span aria-hidden="true">Move plant information</span></button>${knowledgeMarkup}</span>`;
}

export function simulatedTotemMarkup(record, index, anchor, { cards = [], held = false, now = performance.now() } = {}) {
    const colour = record.demoTotemColor || record.demoContent?.accent || '#715a46';
    return `<span class="tryit-sim-marker tryit-sim-marker-zone tryit-sim-totem-system nlxr-totem-system is-totem-style-basic${now - record.demoArriveAt < 1800 ? ' is-new-arrival' : ''}${record.demoTotemSignsVisible ? ' is-signs-open' : ''}${record.demoTotemFaded ? ' is-totem-faded' : ''}${record.demoNarrativeFaded ? ' is-narrative-faded' : ''}${held ? ' is-held' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};--demo-totem-color:${colour};--depth-scale:${record.demoDepthScale || 1}" role="group" aria-label="${escapeSpatialText(record.demoZoneName || 'Zone')} Totem information"><span class="tryit-sim-totem-pillar" aria-hidden="true"></span><span class="nlxr-totem-controls" aria-label="Totem controls"><button type="button" data-totem-signs aria-pressed="${Boolean(record.demoTotemSignsVisible && !record.demoTotemFaded)}" aria-label="${record.demoTotemSignsVisible ? 'Store' : 'Show'} attached signs"><span aria-hidden="true">↔</span><small>Signs</small></button><button type="button" data-totem-fade aria-pressed="${Boolean(record.demoTotemFaded)}" aria-label="${record.demoTotemFaded ? 'Restore' : 'Fade'} Totem"><span aria-hidden="true">◐</span><small>${record.demoTotemFaded ? 'Wake' : 'Fade'}</small></button></span>${totemCardsMarkup(cards, record.totemSelectedCard)}</span>`;
}

export function simulatedAreaLinkMarkup(records = []) {
    const linked = records.filter(record => record.demoType === 'zone' && record.demoLinkVisible && record.simulatedAnchor);
    if (linked.length < 2) return '';
    const [first, second] = linked;
    if (!demoAreaLinkVisible(first, second)) return '';
    const start = first.simulatedAnchor;
    const end = second.simulatedAnchor;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const width = Math.max(2, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    return `<span class="tryit-sim-area-link-line" aria-hidden="true" style="left:${start.x}%;top:${start.y}%;width:${width}%;transform:rotate(${angle}deg)"></span><span class="tryit-sim-area-link-label" aria-hidden="true" style="left:${midpoint.x}%;top:${midpoint.y}%">↔ LINKED AREAS</span>`;
}

export function simulatedRecordMarkup({ record, index, anchor, offset, content, lines = [], highlighted = false, held = false }) {
    const collapsible = record.demoExpanded && record.demoInteractive !== false ? ' role="button" tabindex="0" aria-label="Move this information panel. Tap to hide."' : '';
    const compactContent = record.demoType === 'note' && content
        ? `<strong>${content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}`
        : '';
    const orbProjection = record.demoType === 'marker' ? '<span class="tryit-sim-orb" aria-hidden="true"></span>' : '';
    return `<span class="tryit-sim-marker tryit-sim-marker-${record.demoType || record.type}${highlighted ? ' is-sign-target' : ''}${record.demoType === 'note' ? ' nourishland-spatial-note-surface' : ''}${record.demoAmbientNeighbour ? ' is-neighbour-note' : ''}${record.demoNarrativeFaded ? ' is-narrative-faded' : ''}${record.demoOrbColor ? ' is-demo-orb' : ''}${record.demoExpanded ? ' is-expanded' : ''}${held ? ' is-held' : ''}${record.demoInteractive === false ? ' is-arriving' : ''}" data-demo-marker-index="${index}" style="${simulatedAnchorStyle(anchor)};${demoOrbStyle(record)};--panel-x:${offset.x}px;--panel-y:${offset.y}px;--depth-scale:${record.demoDepthScale || 1}"${collapsible}>${orbProjection}${content && record.demoExpanded ? `<strong>${record.revealTitle === false ? '' : content.title}</strong>${lines.map(line => `<small>${line}</small>`).join('')}` : compactContent}</span>`;
}
