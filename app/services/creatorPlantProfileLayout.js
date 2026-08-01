export function creatorPlantProfileLayout(viewportWidth, viewportHeight, markerX, markerY) {
    const panelWidth = Math.min(viewportWidth * .92, 520);
    const desiredHeight = Math.min(264, Math.max(220, panelWidth * .5));
    const edge = 12;
    const markerClearance = 34;
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
