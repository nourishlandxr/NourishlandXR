# V0.9292 — Independent image panel and review copy

- Settings opening changes only the Settings companion visibility. It does not rebuild the main/image DOM, change the media collapse state, or interrupt its loading lifecycle.
- Image completion now triggers a render and increments a media revision. The XR card includes the source and revision so switching equally sized images cannot reuse an earlier cached texture. Failed images can be requested again.
- One opacity slider is labelled Panels opacity. The separate PIMO opacity row is removed; the shared opacity behaviour is retained. Text and outlines are unaffected.
- The 29 sections in data1/demo.docx QUICK ACCESS / EDIT now contain Main screen, Control panel info and HINTS. Original main-screen wording is preserved. Hidden and selection-dependent content is described explicitly. The older detailed narrative is marked as a historical reference. Document edits remain a review workflow and require an application update to publish changed wording.
- Corrected the butterfly archive comparison: the source PNG matches the GLB texture after a vertical flip, with no additional texture resolution.

## Release checks

Frontend build and whitespace checks passed. No local test suite or XR harness was run at the user's request. The existing deployment workflow runs its required checks automatically. Quest 3 interaction validation remains with the user.

The document was saved with repeating table headers and sections kept together. The packaged Word renderer could not run because LibreOffice is unavailable on this Windows host; page layout has not been visually verified.
