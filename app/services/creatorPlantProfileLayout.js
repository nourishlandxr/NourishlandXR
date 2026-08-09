export function creatorPlantProfileLayout(viewportWidth, viewportHeight, markerX, markerY) {
    const edge = 12;
    const panelWidth = Math.min(viewportWidth - edge * 2, 960);
    const desiredHeight = Math.min(680, viewportHeight * .74);
    const markerClearance = 24;
    const panelHeight = Math.min(desiredHeight, Math.max(240, viewportHeight - edge * 2));
    const preferredTop = markerY - markerClearance - panelHeight;
    const preferredBelow = markerY + markerClearance;
    const fitsBelow = preferredBelow + panelHeight <= viewportHeight - edge;
    const preferAbove = markerY >= viewportHeight * .42 || !fitsBelow;
    // Keep the PIM above the plant even when the full panel cannot fit in the
    // remaining space. Clamping its top edge is clearer than moving it below.
    const panelTop = preferAbove
        ? Math.max(edge, Math.min(viewportHeight - panelHeight - edge, preferredTop))
        : Math.max(edge, Math.min(viewportHeight - panelHeight - edge, preferredBelow));
    const halfWidth = panelWidth / 2;
    const panelX = Math.max(halfWidth + edge, Math.min(viewportWidth - halfWidth - edge, markerX));
    const profileAbove = panelTop + panelHeight / 2 < markerY;
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
