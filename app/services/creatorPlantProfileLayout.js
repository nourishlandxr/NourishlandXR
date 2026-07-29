export function creatorPlantProfileLayout(viewportWidth, viewportHeight, markerX, markerY) {
    const panelWidth = Math.min(viewportWidth * .92, 520);
    const desiredHeight = Math.min(286, Math.max(238, panelWidth * .54));
    const bottomReserve = 108;
    const orbClearance = 42;
    const panelTop = markerY + orbClearance;
    const availableHeight = Math.max(190, viewportHeight - panelTop - bottomReserve);
    const panelHeight = Math.min(desiredHeight, availableHeight);
    const halfWidth = panelWidth / 2;
    const edge = 8;
    const panelX = Math.max(halfWidth + edge, Math.min(viewportWidth - halfWidth - edge, markerX));
    return {
        panelWidth,
        panelHeight,
        panelX,
        panelTop,
        panelY: panelTop + panelHeight / 2,
        tetherStartY: markerY + 24
    };
}
