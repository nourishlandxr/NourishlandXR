# Readable, quieter website navigation · V0.9792

The hero menu inherited white text inside a large pale panel. The replacement uses a compact forest-green surface with explicit cream and sage text, leaving most of the landscape visible. Education and Platform are the two primary choices. Four secondary destinations and Contact sit below; category headings, duplicate Home, direct demo/full-world entries and the obsolete landscape control are removed. Demos remain accessible through Platform; the full-world route and existing bookmarks remain available.

The menu is shared across the current website. Narrow phones centre it within the viewport. Portrait layouts show all links without scrolling; short landscape screens retain a scrollable menu. Links have at least 44px targets, a visible focus outline and underlined current-page state. Escape, outside press and link selection close it; keyboard focus remains contained while the underlying page is inert.

Verified against the exact release in Chrome at 1440×900, 390×844, 375×667, 320×568 and 667×375: all links fit or remain reachable, minimum text contrast exceeds 10:1, keyboard dismissal/focus restore work, and no page errors occur. Fifteen focused website/routing/release tests and the existing menu/Creator component checks pass. Frontend and twelve-page website build complete; the actual app welcome screen shows V0.9792. These are emulated phone checks, not physical-device acceptance.

The 39-file frontend release preserves the canonical redirects, account/API data, project records, hero media and XR scene. The packager excludes unchanged entry bridges, recognizes the previously verified missing-file bridge, and leaves routing unchanged by default. Existing immutable published releases are retained.
