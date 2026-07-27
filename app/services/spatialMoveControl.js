/**
 * Shared phone-first movement control for every spatial experience.
 * Its four arms also reserve a simple mapping for future XR controllers.
 */
export function spatialMoveControlMarkup(prefix = 'ar') {
    return `<aside class="spatial-move-control" data-${prefix}-depth-joystick hidden aria-label="Move the held element">
        <strong class="spatial-move-name" data-${prefix}-depth-name>Held element</strong>
        <span class="spatial-move-arm spatial-move-up" aria-hidden="true"><b>↑</b><small>Push</small></span>
        <span class="spatial-move-arm spatial-move-left" aria-hidden="true"><b>←</b></span>
        <button class="spatial-move-release" type="button" data-${prefix}-move-release aria-label="Release held element"><span aria-hidden="true">✋</span><small>Release</small></button>
        <span class="spatial-move-arm spatial-move-right" aria-hidden="true"><b>→</b></span>
        <span class="spatial-move-arm spatial-move-down" aria-hidden="true"><b>↓</b><small>Pull</small></span>
        <output class="spatial-move-readout" data-${prefix}-depth-readout>1.0 m</output>
    </aside>`;
}
