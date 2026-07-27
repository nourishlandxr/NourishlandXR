/**
 * Shared phone-first movement control for every spatial experience.
 * Its four arms also reserve a simple mapping for future XR controllers.
 */
export function spatialMoveControlMarkup(prefix = 'ar') {
    return `<aside class="spatial-move-control" data-${prefix}-depth-joystick hidden aria-label="Move the held element">
        <p class="spatial-move-instruction">Adjust position <small>Press centre to release</small></p>
        <button class="spatial-move-arm spatial-move-up" type="button" data-${prefix}-move-farther aria-label="Move farther"><b aria-hidden="true">↑</b></button>
        <button class="spatial-move-arm spatial-move-left" type="button" data-${prefix}-rotate-left aria-label="Rotate arrow left"><b aria-hidden="true">↶</b></button>
        <button class="spatial-move-release" type="button" data-${prefix}-move-release aria-label="Release held element"><span aria-hidden="true">●</span></button>
        <button class="spatial-move-arm spatial-move-right" type="button" data-${prefix}-rotate-right aria-label="Rotate arrow right"><b aria-hidden="true">↷</b></button>
        <button class="spatial-move-arm spatial-move-down" type="button" data-${prefix}-move-nearer aria-label="Move nearer"><b aria-hidden="true">↓</b></button>
        <output class="spatial-move-readout" data-${prefix}-depth-readout hidden>1.0 m</output>
    </aside>`;
}
