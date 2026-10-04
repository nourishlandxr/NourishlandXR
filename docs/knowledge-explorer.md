# Knowledge Explorer — V0.9305

## Architecture and audit

The existing plant knowledge document (`pimModel.js`) already provides stable
node IDs, parent relationships, source references and an AR projection. The
existing activation code already owns short release, dwell and XR event
deduplication. Those remain the source of truth.

The previous six-direction layout exposed too many neighbouring children, and
the flat DOM view reduced child cells to 70% of the parent size. Fitting a whole
deep branch into a small surface then reduced the labels further. Expanded XR
knowledge was painted into one large texture, rather than independent local
surfaces. These were code-level causes of clutter and awkward growth.

The new presentation layer uses that same document and activation path:

- `knowledgeExplorer.js`: mode, attention/connection budgets, stable local
  positions, navigation history, local Save/Resume.
- `knowledgeSpatialRenderer.js`: individual cached label surfaces, local bonds,
  stable world positions, reversible transitions and matching hexagonal hits.
- `knowledgeDesktopView.js`: readable scrollable Curiosity field. Desktop has
  only Tag and Curiosity; spatial Explore is reserved for immersive AR.
- `pimInfoPanel.js`: shared slim Explorer companion in Demo and Creator AR.
- `temporaryArDemo.js` and `arMode.js`: existing scene/selection/reading hosts.

No plant records, source documents, routes or physical anchors are replaced.
Explorer state belongs to a placed record; display coordinates are separate
from the canonical knowledge graph. Public labels use plant knowledge, learning
pathways, Tag, Curiosity and Explore.

## Experience

Tag presents identity, scientific name, a few roles and a short overview.
Curiosity reveals three immediate relationships and at most two neighbouring
children per group. Explore unfolds the same opened structure into XYZ shells,
with depth based on concept depth and direction based on its authored branch.
The selected path and explicitly connected tutorial source remain available.

The rectangular Explorer companion has the Control panel's width and a slim
height. It uses the approved Settings typography, glass, colours and hover
language. It opens from the main rail, independently of Settings and media.
Its controls are modes, Connections, Context, More, Save and Resume. These are
view controls, not persistent experience settings.

In XR, hold a blank part/header of Explorer to reposition it; the right stick
adjusts distance while held. Recenter restores its dock below the Control panel.
Desktop supports header hold/drag. Desktop/phone Curiosity scrolls rather than
shrinking labels; selecting a new topic reveals its local neighbourhood.

Desktop has no depth renderer, camera orbit or spatial Explore control. Opening
a saved Explore discovery there restores its topic/branches in flat Curiosity.
Desktop AR also uses opaque 2D surfaces and basic text settings. Its simulated
demo does not load Bee or Butterfly models, paint rain, grow the living frame,
or apply decorative CSS animations, glass blur or a simulated depth camera.
The demo's content stages and working plant/learning interactions remain.

Mode changes preserve selected IDs, open branches and reading context. Existing
nodes remain in place during local growth. Entering Explore changes geometry,
not the source graph. Label planes turn toward the reader; their world centres
do not follow the headset. Reduced-motion preference removes the transition.
No bloom, particles, full-scene repaint or idle graph oscillation is added.

## Tuning

`KNOWLEDGE_VISUALS` in `knowledgeExplorer.js` centralises:

| Setting | Default | Purpose |
| --- | --- | --- |
| `primaryBonds` / `secondaryBonds` | 3 / 2 | Visible relationship budget |
| `curiosityAttention` / `exploreAttention` | 9 / 18 | Local attention budget |
| `groupGap` | 1.65 | Molecular group separation |
| `transitionMs` | 620 | Growth and mode transition time |
| `nodeWidth` / `nodeHeight` | .24 / .208 m | XR cell targets |
| `planarPitch` | .20 m | Cell-unit spacing in Curiosity |
| `shellRadius` / `shellStep` | .40 / .24 m | Explore depth shells |
| `bondWidth` | .0026 m | Connection visibility |
| `labelResolution` / `labelFont` | 512 / 64 | Cached XR label quality |
| `branchColours`, `border`, `ink` | restrained greens/pastels | Colour language |

LOW uses 256 px labels; MED/HIGH use 512 px, with filtered mipmaps. Existing
panel opacity affects the backing, not text or outlines.

## Save and scope

Save stores up to 100 discoveries in this browser's local storage: subject ID,
selected node, open branches, mode, neighbourhood pages, local positions,
reading page and visited path. Resume restores that context in the same host.
It does not save XR world coordinates, duplicate plant content, sync accounts,
or transfer discoveries to another device. Clearing browser storage removes
these bookmarks. Future place/experience graph integration can consume the
subject/node IDs without changing this graph.

Explore currently uses bounded candidate placement and forward projection
separation at the established anchor. It does not sense real foliage or room
obstacles, solve arbitrary graph crossings globally, or relocate itself as the
head moves. Floor calibration constrains native node centres. Walking around
can change projected overlap; that requires Quest/field evaluation before
adding automatic environment-aware layout.

## Validation and Quest handoff

Local production-module preview: `tools/preview-knowledge-explorer.html`.
Verified flat Tag → Curiosity → Tag, opened descendants, preserved topic
and branches, and Save/Resume. Native Explore WebGL shader compilation was
checked in the earlier renderer study; desktop depth was subsequently removed
at the user's request. Physical XR transitions still require on-device checks.
Source syntax checks, whitespace checks and the frontend build form the release
checks. Welcome version must display V0.9305. Physical Quest validation is pending.

On Quest 3:

1. Open a Plant Orb, choose Curiosity, select a parent then a child once. Confirm
   one activation, readable labels, edge-ending bonds and stable neighbouring cells.
2. Switch Explore → Curiosity → Tag rapidly. Confirm the topic, reading page and
   open branches survive, with no duplicate or stuck surfaces.
3. Open Settings and media independently; move Explorer with hold/right stick.
   Confirm all targets follow their visible panels and Recenter restores docking.
4. Save a child topic, change mode, then Resume. Confirm the saved reading context.
5. Move your head and walk around Explore. Check stability, depth, floor clearance,
   bright/dark passthrough readability and FPS at the safe 90 Hz baseline.
6. Complete the existing plant-to-learning connection lesson and Creator AR
   open/close/return flow. Confirm the connected source remains selectable.

Deployment approval is handled by the user; a push is not proof of deployment
or headset validation.
