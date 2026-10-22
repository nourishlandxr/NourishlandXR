# Unity Creator hub

Local source milestone 0.2.27 / Android version code 28. This is a navigation and integration slice, not shared-project write support.

Main menu → Create opens Creator hub directly. Create a project through existing guided setup, continue the most recently opened project, or choose another local project. Guided setup can return to its project hub after identity creation and resume later.

Each project has six tools: Areas & objects; PIMOs & content; Discovery Paths; Preview; Open IMAP; Project details. Existing Area placement, specimen editing, Notes, IMAP and exports keep their original identities and local storage. Project details owns identity, purpose, setup and export.

PIMOs & content opens existing plant-record editing, Note editing, adding packaged plants and spatial knowledge previews. Full PIMO graph/media authoring is explicitly pending. Editing a specimen does not edit its packaged species profile.

Discovery Paths groups the existing portable guided checklist editor and preview. Guides can contain ordered activities and existing specimen references. Hunt/Quiz answer rules and discovery unlocks remain planned; opening this tool does not create a second tour database or change the checklist schema. Cross-device tour integration follows a reviewed shared contract.

Preview offers AR, VR and an existing Guide. These remain local layouts; physical anchors, native shared edits, account sync and publication are not connected by this change. Shared projects remain public reads. The independent WebXR introduction and Developer experiments are preserved.

Validation: run Tools/Run-EditorChecks.ps1 -Suite Menu. The suite exercises selected-project/Area context, Guide editor routing, spatial preview cleanup, empty projects, resumed setup, export, unchanged specimen identities and menu text bounds. Evidence/creator-hub-preview.png and Evidence/creator-paths-preview.png are Editor renders. Quest interaction acceptance remains separate. No install, deployment or commit is implied.
