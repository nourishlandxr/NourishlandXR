export function creatorPlantProfileLayout(viewportWidth, viewportHeight, markerX, markerY) {
    const panelWidth = Math.min(viewportWidth * .92, 620);
    const desiredHeight = Math.min(340, Math.max(248, panelWidth * .54));
    const edge = 12;
    const markerClearance = 24;
    const panelHeight = Math.min(desiredHeight, Math.max(196, viewportHeight - edge * 2));
    const preferredTop = markerY - markerClearance - panelHeight;
    const panelTop = preferredTop >= edge
        ? preferredTop
        : Math.min(viewportHeight - panelHeight - edge, markerY + markerClearance);
    const halfWidth = panelWidth / 2;
    const panelX = Math.max(halfWidth + edge, Math.min(viewportWidth - halfWidth - edge, markerX));
    const profileAbove = panelTop < markerY;
    return {
        panelWidth,
        panelHeight,
        panelX,
        panelTop,
        panelY: panelTop + panelHeight / 2,
        profileAbove,
        tetherStartY: markerY + (profileAbove ? -24 : 24),
        tetherEndY: profileAbove ? panelTop + panelHeight - 4 : panelTop + 4
    };
}
