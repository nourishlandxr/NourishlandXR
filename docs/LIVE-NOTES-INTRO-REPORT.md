# Living introduction and Live Notes — 0.9022

Local implementation; no deployment, framework change or data migration.

The AR demo now opens with a slow NourishlandXR title and invitation, followed by pastel corner cells for Climate, Food forest and Landscape. Climate and Food forest automatically unfold a second level once; interaction cancels that progression. Continue is immediately available and starts the original demo. Close restores the previous screen. Reduced motion disables entrance animations and automatic progression. The introduction runs before the immersive session request, so Continue remains the user gesture that enters AR.

Mobile uses theme buttons and one cluster at a time. Desktop shows three clusters around the title. Root and branch cells share the same component as creator Live Notes. Climate examples contain direct extension-source links, with local suitability qualifications. These are presentation examples, not imported or published PIM records.

Creator notes have an optional Live Note setting in AR quick edit. Creators enter up to 12 topic cells, one title | information pair per line. Data is additive under appearance.live_note. Original note content, IDs and placement remain intact. View/neutral selection opens the note's cells; Inspect retains editing. Quest uses the existing spatial dashboard mirror. This initial editor supports one topic level; the shared renderer supports deeper trees for the introduction. Turning the option off retains the topic content.

Files changed for this feature: app/services/liveNotes.js (new), app/screens/temporaryArDemo.js, app/screens/arMode.js, app/product-v2.css, app/services/buildInfo.js, tests/live-notes.test.mjs (new), this report. Earlier AR/PIM changes remain in the working tree.

Verification: 228 automated tests; desktop 1440×900 and narrow mobile 320×740 browser inspection; climate navigation; automatic second-level reveal; Continue into original welcome sequence. Local isolated API create/reload and disabling/reload preserved note content and topic IDs. A clearly named draft QA note remains in the isolated test workspace with Live Notes disabled. No production records were used for writes.

Limits: physical phone/headset passthrough, hand/controller selection and headset text readability need device testing. Reduced motion is implemented in CSS and timer gating; an OS-level reduced-motion browser test has not been performed. Creator quick-edit interaction itself needs physical AR validation. No claim of hardware verification is made.

Follow-up regression: demo PIM observation saved using keyboard, returned to AR, reopened and found the saved topic with its specimen context retained. This exposed a pre-existing stacking issue: the demo scene was above the reader. The reader now has a demo-specific z-index above the scene. Final layering still merits a complete fresh-session pointer check on device.
