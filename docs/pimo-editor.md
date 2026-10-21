# PIMO knowledge garden editor

Open `/tools/preview-pimo-editor.html` on the development server, or `/app/?editor=pimo`.
The hosted app route is `/xr/?editor=pimo` after a deployment. This change is local and has not been deployed.

## Starters

- Classic: Food Forest, Uses, Propagation, Scientific Information, Historical Data, Cultivation.
- Utility: Uses only, with optional edible, medicinal, sharing and craft topics.
- Bio: Scientific Information and Historical Data.
- Food Forest: Layers and Relationships.
- Propagation & Cultivation: the two growing families.
- Empty: one editable subject seed, with no required categories.

Choosing a starter creates a separate local map. The map selector restores previous maps.
Every cell can be renamed, removed, moved and connected. There are no required compass roots.
Suggestions are a small contextual starter library, not generated claims or an AI service.

## Design options

The Design row above the canvas changes the whole map independently of its content template:

- Classic flower: regular hexagons packed around the subject seed. The Classic content template starts with this design by default.
- Notes mesh: simple square cards with pale surfaces, dark text and straight/right-angle connectors.
- Organic: the original rounded, irregular cells and curved connectors.

Each map remembers its layout and drawn connector routes separately for each design. Switching back restores that design's arrangement; cell text, IDs, sources and semantic connections remain the same.
The latest explicitly selected design is used for newly created template maps. Existing saved maps keep their own design.
New cells inherit the active design. Individual cell shape overrides and custom drawn outlines remain available. The same cell geometry and surface palette appear in the spatial canvas.

## Authoring

Select a cell to edit its title, text, shape, color, content type, source link and attribution.
Use its plus handle or **Grow a branch** to create a child. Blank canvas plus mode creates an independent cell.
Use the pencil to draw a custom cell outline. The connection tool accepts a freehand path or two cell selections.
Connections can be branches (one parent, no structural cycles) or relationships (cross-links, including loops).
Deleting a cell leaves the other cells in the document; undo restores the removed cell and its links.
Automatic arrangement changes the presentation coordinates and connector routes while preserving content and meaning.

Mouse: drag cells; drag empty space to pan; scroll to zoom; double-click empty space to add.
Touch: drag, tap and pinch to zoom. On a small screen the initial view prioritizes readable cells; Fit shows the whole map.
Keyboard: V select, N add, L connect, D draw; arrows move the selected cell; Delete removes it; Ctrl/Cmd-Z undoes; Shift-Ctrl/Cmd-Z redoes.
The map name above the canvas is editable.
The microphone creates an idea from browser speech recognition when supported and explicitly activated.
Creation sounds are optional and enabled from the speaker icon.

## XR Studio

Open `/tools/preview-pimo-xr.html` locally or `/app/?editor=pimo&mode=xr`.
The **XR editor** button in Desktop Studio opens the same workspace and document.
On a WebXR headset over HTTPS, **Enter XR** starts transparent AR when supported, otherwise VR. A session is requested only from this action.

The world-space inspector, toolbar and keyboard are actual Three.js surfaces with ray/pinch hit targets; immersive authoring does not depend on HTML overlays.
Cell titles, notes, shapes, colors, content types, source URLs and attribution can all be edited in the headset. The floating keyboard has caret movement, shift, symbols, backspace and Apply/Cancel. Optional speech recognition dictates into the current text draft; it is not required for editing.
All six templates, three designs, suggestions, connection labels/types, duplicate/remove, undo/redo, auto-arrange and the local map library are available inside XR.

- Point and hold trigger or grip to grab a cell. Reach near a cell and pinch to grab it directly with tracked hands. Release to place.
- Held cells lift from the map, show a dashed landing outline, and pulse their own silhouette when placed. The alignment control gently snaps to free honeycomb slots or nearby rows; it never creates a knowledge connection.
- The selected cell has a small plus handle to grow a branch. Grow also plants an independent cell in empty space. Draw records a custom outline. Connect accepts two cell selections or a drawn route.
- Hold grip while pointing at empty space to move the workspace. Two grips resize and turn the whole workspace. Panels move with it. Fit brings it back in front of the viewer.
- A fresh right joystick click shows/hides the inspector. A held stick at startup or reconnect cannot open it accidentally.

Each button action has a short haptic pulse. Grab, place, aligned placement, creation and connections have distinct generated soft sounds and vibration patterns, with stronger pulses for creation/connection. The speaker control mutes audio while keeping haptics active. Hands receive the visual/audio cues; vibration requires a controller motor.
Tracking loss, hidden sessions, disconnects and blur cancel incomplete grabs without saving the preview position. A shared lock prevents two hands or inputs from stealing the same cell.
Controller and hand poses are used directly without smoothing. Cell meshes/textures are retained across selection and position changes; outlines use a bounded reusable effect pool, and panel textures update only when their contents/focus change.

Desktop users can review the same 3D tools with a mouse and keyboard. Drag empty space to turn the board; scroll to change viewing distance.
Physical Quest sessions, controller feel, hand tracking, voice availability and vibration intensity still require device acceptance. A desktop browser pass does not verify them.

## Storage and compatibility

The portable schema lives in `app/services/pimoGraph.js`: stable node IDs, typed edges, sources/provenance and a separate layout.
Maps autosave to this browser's local storage. The UI reports when storage fails; JSON export remains available.
Export/import transfers the same map to another browser/device. This prototype does not yet provide account/cloud synchronization or bind a graph to a live project record.
Version 1 PIMO imports preserve IDs, content, sources, media and provenance; parent links become branches.
Existing six-compass readers are not changed. A version 2 graph should only be written to live records after the persistence API and readers gain explicit version 2 support.

## Verification

`node --test tests/pimo-graph.test.mjs` checks template boundaries, free graph structure, relationship loops, ancestry validation, import identity, sources, geometry round trips and removal behavior.
`node artifacts/pimo-editor-browser-qa.mjs` checks desktop/touch editing, drawings, custom connectors, undo/redo, local restore, cross-context JSON import/export and the spatial canvas.
The browser check expects the development server at `http://127.0.0.1:8093`; override with `PIMO_PREVIEW_ORIGIN`.
`$env:PIMO_FILE_FIXTURE='1'; node artifacts/pimo-editor-browser-qa.mjs` serves repository files through Playwright interception for sandboxed offline browser checks; it does not verify the development server.
`tests/pimo-xr-workbench.test.mjs` covers shared document editing, draft ownership, keyboard operations, evidence preservation, semantic validation, library templates and right-stick gating.
`tests/pimo-xr-interaction.test.mjs` covers placement, actual silhouette hits, grab ownership and sound/haptic behavior, including muting and missing/rejected device capabilities.
