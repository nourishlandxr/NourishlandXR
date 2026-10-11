# Tutorial comfort and Zinnia's return

Local implementation: V0.9507. Deployment and physical headset checks remain separate.

## Tutorial

- Uses the existing `createPimInfoPanel` renderer in a dedicated Comfort options presentation.
- Main face stays 0.60 × 0.42 metres throughout the three input layers and when Adjust opens. The visual guide is 0.32 metres wide, on the right.
- Pause/repeat, voice, Skip and a gated Continue remain available. Adjust reveals voice volume, Auto/SD/HD graphics, independent Living Frame detail and separate frame/table heights.
- Tutorial actions are removed from the Living Frame. Real hands can reach Skip and the comfort settings even before the real-hand lesson begins.
- Fruit images appear after pickup; existing photos cover four fruits. Orange, lime and banana use clearly labelled illustrations. The real-hand lessons have a pinch guide.
- Trigger remains selection. Virtual index fingers bend slightly for a click, while a combined trigger and grip can close the hand. The pointer retains its controller direction.

## Exit

Skip releases held objects without a throw, interrupts the current lesson and starts a short acknowledgment. The tutorial remains active while it waits for speech. A 24-second ceiling handles unavailable or stalled speech; muted speech gets a readable hold. The table and Comfort options then fade together over 1.8 seconds.

The Living Frame instance, growth clock and anchor survive. Comfort options stays hidden through the main welcome and Imagine screens; the existing orientation step restores the full Control panel with its introduction fade.

Delayed disposal of the tutorial does not stop the main-demo narration. Session cleanup still disposes the tutorial and return perch.

## Character model integration and Totem clearance

The character itself is being authored separately. This update supplies the pot and mounting groups:

- `welcomePractice.stage.zinniaMount`: origin above the table pot's soil.
- `zinniaFramePerch.characterMount`: origin above the return pot's soil.

At completion, mounted character children move to the return mount before the tutorial scene is disposed. Attach the model to the first mount before finishing the tutorial. The return renderer is prepared after this transfer. The model should be sized for the compact pot; do not include a second pot in the character asset.

`ZINNIA_FRAME_PERCH` places the ledge at frame-local `(-0.73, 0.31, 0.10)`, with a 0.17-metre width and 0.105-metre depth. Its short bracket seats against the inner rim. It occupies the Living Frame silhouette, leaving exterior positions available for Totems. Future character geometry must respect that silhouette and the central text area.

## Local preview

Open `/tools/preview-welcome-comfort.html` on the persistence server. It uses the actual tutorial scene, Living Frame, Comfort options and return perch. The translucent columns indicate future exterior Totem space. It is a silent desktop layout preview; it does not validate headset hand alignment, controller fit or XR frame rate.
