/**
 * Position the shared Plant Information Mesh surface inside the part of the
 * visual viewport that is not occupied by mode-specific controls.
 *
 * Demo and Creator own different chrome, but neither owns PIM geometry. Both
 * modes use this wrapper calculation and pass the resulting surface size into
 * the canonical renderer.
 */
export function plantInformationMeshSurfaceLayout(viewportWidth, viewportHeight, markerX, markerY, options = {}) {
    const width = Math.max(240, Number(viewportWidth) || 390);
    const height = Math.max(240, Number(viewportHeight) || 844);
    const edge = Math.max(8, Number(options.edge) || 12);
    const topInset = Math.max(edge, Number(options.topInset) || edge);
    const bottomInset = Math.max(edge, Number(options.bottomInset) || edge);
    const availableHeight = Math.max(240, height - topInset - bottomInset);
    const panelWidth = Math.max(240, Math.min(width - edge * 2, Number(options.maxWidth) || 960));
    const panelHeight = Math.max(240, Math.min(
        Number(options.maxHeight) || 620,
        height * (Number(options.heightRatio) || .62),
        availableHeight
    ));
    const markerClearance = Math.max(16, Number(options.markerClearance) || 24);
    const preferredTop = markerY - markerClearance - panelHeight;
    const preferredBelow = markerY + markerClearance;
    const fitsBelow = preferredBelow + panelHeight <= height - bottomInset;
    const preferAbove = markerY >= height * .42 || !fitsBelow;
    const panelTop = preferAbove
        ? Math.max(topInset, Math.min(height - panelHeight - bottomInset, preferredTop))
        : Math.max(topInset, Math.min(height - panelHeight - bottomInset, preferredBelow));
    const halfWidth = panelWidth / 2;
    const panelX = Math.max(halfWidth + edge, Math.min(width - halfWidth - edge, markerX));
    const profileAbove = panelTop + panelHeight / 2 < markerY;
    return {
        panelWidth,
        panelHeight,
        panelX,
        panelTop,
        panelY: panelTop + panelHeight / 2,
        profileAbove,
        topInset,
        bottomInset
    };
}
