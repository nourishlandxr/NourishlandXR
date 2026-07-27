/**
 * Shared phone-first movement control for every spatial experience.
 * Its four arms also reserve a simple mapping for future XR controllers.
 */
export function spatialMoveControlMarkup(prefix = 'ar') {
    return `<aside class="spatial-move-control" data-${prefix}-depth-joystick hidden aria-label="Move the held element">
        <p class="spatial-move-instruction">Adjust position <small>Press centre to release</small></p>
        <span class="spatial-move-arm spatial-move-up" aria-hidden="true"><b>↑</b></span>
        <span class="spatial-move-arm spatial-move-left" aria-hidden="true"><b>←</b></span>
        <button class="spatial-move-release" type="button" data-${prefix}-move-release aria-label="Release held element"><span aria-hidden="true">●</span></button>
        <span class="spatial-move-arm spatial-move-right" aria-hidden="true"><b>→</b></span>
        <span class="spatial-move-arm spatial-move-down" aria-hidden="true"><b>↓</b></span>
        <output class="spatial-move-readout" data-${prefix}-depth-readout hidden>1.0 m</output>
    </aside>`;
}
