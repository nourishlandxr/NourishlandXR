export const DEMO_RECORD_IDS = Object.freeze({
    pigeonPea: 'demo-plant-pigeon-pea',
    moringa: 'demo-plant-moringa',
    seasonalNote: 'demo-note-seasonal',
    botanicalGarden: 'demo-area-botanical-garden',
    rainforestWalk: 'demo-area-rainforest-walk',
    vetiver: 'demo-rainforest-vetiver',
    acacia: 'demo-rainforest-acacia',
    jackfruit: 'demo-rainforest-jackfruit',
    lychee: 'demo-rainforest-lychee',
    rainforestNote: 'demo-rainforest-note-vetiver-row'
});

export function demoAreaIsHidden(area) {
    return Boolean(area?.demoTotemFaded || area?.demoNarrativeFaded);
}

export function demoAreaRecordVisible(record, records = []) {
    if (!record) return false;
    if (record.demoType === 'zone') return true;
    // The two guided plants are part of the walkthrough, not ambient Area
    // decoration. They remain available while a Totem is being demonstrated.
    if (record.demoType === 'plant' && !record.demoAmbientNeighbour) return true;
    if (!record.demoAreaId) return !record.demoAmbientNeighbour;
    const owner = records.find(candidate => candidate?.demoType === 'zone' && candidate.id === record.demoAreaId);
    return Boolean(owner && !demoAreaIsHidden(owner));
}

export function demoAreaLinkVisible(first, second) {
    return Boolean(first?.demoLinkVisible && second?.demoLinkVisible
        && !demoAreaIsHidden(first) && !demoAreaIsHidden(second));
}

export function demoGroundLinkRoute(first, second, { clearance = .02, endpointTrim = .14 } = {}) {
    if (!demoAreaLinkVisible(first, second)) return null;
    const startPosition = first?.position;
    const endPosition = second?.position;
    if (!startPosition || !endPosition) return null;
    const dx = Number(endPosition.x) - Number(startPosition.x);
    const dz = Number(endPosition.z) - Number(startPosition.z);
    const length = Math.hypot(dx, dz);
    if (!Number.isFinite(length) || length <= endpointTrim * 2) return null;
    const ux = dx / length;
    const uz = dz / length;
    const firstGround = Number(first.groundBaseY ?? Number(startPosition.y || 0));
    const secondGround = Number(second.groundBaseY ?? Number(endPosition.y || 0));
    return {
        start: { x: Number(startPosition.x) + ux * endpointTrim, y: firstGround + clearance, z: Number(startPosition.z) + uz * endpointTrim },
        end: { x: Number(endPosition.x) - ux * endpointTrim, y: secondGround + clearance, z: Number(endPosition.z) - uz * endpointTrim },
        clearance,
        endpointTrim
    };
}
