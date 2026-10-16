# IMAP shared-project direction

**Status: adopted architecture and next-scope direction.** This document establishes the web/Field contract direction; it does not claim the new IMAP experience or navigation controls are implemented.

The V2 disc-model audit is in [imap-v2-audit-2026-10-16.md](imap-v2-audit-2026-10-16.md). IMAP is the circular 3D Interactive Map from Demo Utility 1.1. The Creator dashboard's flat Project Map is a separate planning tool.

IMAP means **Interactive Map**. Expand the name on first introduction, then use “IMAP” consistently in Creator/Field menus, spatial access, and tutorials. The compact spatial control uses the accessible name **Open IMAP**. Preserve project context when opening it and provide an obvious route back to the originating Creator, Explorer, or PIMO view.

## Generated content and identity

The default IMAP is a projection of the canonical project hierarchy and relationships: project → Site → Area → records, including supported relationships between records and spatial references. Use the existing stable project, Site, Area, and record identities. Creating, editing, moving, publishing, or deleting canonical content must update the generated map on refresh; do not create a separately maintained map-content database or duplicate project records.

Keep authored presentation preferences in keyed overrides layered over generated content. An override can preserve intentional layout/presentation choices for an existing canonical identity; new content receives deterministic sensible defaults. Regeneration must retain valid overrides and discard or safely ignore overrides whose canonical target has been removed. Overrides never become a second source of project identity or publication truth.

Keep conceptual layout coordinates separate from physical XR anchors and localisation. A map may show project relationships before anything has a verified physical anchor. Spatial placement is optional, uncertainty remains explicit, and map layout must not imply survey accuracy.

## Access, ownership, and navigation

The public Explorer IMAP is derived only from the existing visitor-filtered shared-project response. Creator views may include the current user's permitted drafts according to the established Creator authorization boundary. Never infer permission from a map override or a cached view; revocation/removal must be reflected on refresh. Do not broaden the shared read contract or add map writes as part of a rendering-only change.

- **Web Creator workspace:** coordinate the compact Open IMAP affordance with existing project/Area navigation and current project context. The circular spatial disc is for orientation and navigation. The flat Project Map and detailed planning controls stay in Creator; optional disc customization belongs there when implemented.
- **Android Field:** map/Area/record handoffs preserve project and selected identity, and return to the prior Field context. Field public exploration follows the visitor projection; Creator-only draft or customization surfaces require the existing Creator authorization path.
- **Explorer and PIMO spatial access:** Open IMAP opens the relevant project context and a clear return route without replacing local object information or the current lesson/task state.
- **First-time Creator guidance:** explain that the IMAP grows automatically as the project gains Sites, Areas, and records. Make customization optional and do not block the first creation or initial map view.

Customization must be described as planned until the corresponding editor and persistence path exist. Generated content and navigation can ship before customization; do not expose a nonfunctional customization control.

## Implementation sequence and acceptance

1. Extend the shared-project projection/adapter with only the relationships or spatial references required by IMAP, preserving current IDs, revision behavior, and public filtering. Reuse the current contract where possible; add a versioned field only when the existing projection cannot express a required relation.
2. Implement a deterministic generated map model from that validated projection. Add keyed presentation overrides as a separate, optional layer with clear handling for deleted targets. Keep conceptual positions independent of anchors.
3. Add Web Creator/Explorer Open IMAP entry and return routing, then coordinate Android Field project → Area → record/map handoffs. Do not compete with native Unity ownership; share the contract and fixture with the native department for its own integration.
4. Add concise first-time Creator guidance and an optional customization path only when that path is real.

Acceptance requires: project changes appear without manual map-data maintenance; repeated generation yields stable identity and sensible positions; existing valid overrides survive regeneration; new records appear with defaults; deleting a record removes its generated node and makes stale overrides inert; public Explorer omits unpublished/private ancestry and content; Creator drafts remain behind Creator authorization; an unanchored conceptual map remains usable; Field and spatial entry/return retain project and selection context; keyboard/focus/aim labels expose “Open IMAP”.

## Current implementation boundary

The shared read contract in [shared-project-contract.md](shared-project-contract.md) already supplies stable project/Site/Area/record identities, a content revision, and visitor-filtered publication boundaries. The demo disc is currently authored lesson content, while the V2 disc model can project canonical project data into the same circular form. Renderer wiring, cross-access navigation and publication validation are still separate work. Do not present the authored demo placements as a real project's map.

Related ownership and route guidance: [platform foundation](platform-foundation.md), [Creator workspace navigation](CREATOR_WORKSPACE_AUDIT.md), and [Android Field](field-app.md).
