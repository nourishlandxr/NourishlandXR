# V0.9795 — More room for the public website

The public website now uses a round home emblem in the upper left and the square menu in the upper right. The wordmark, tagline, duplicate Education/Platform links and reserved header band have been removed from the shared public shell, giving the page composition the full viewport.

Headings, body copy and destination links are larger, with more deliberate spacing. Hillyards uses a large landscape beside the explanation and actions on desktop, and a stacked layout on phones. Its actions are now Field Notes, Join the pilot and Explore places, preserving their existing destinations and phone preview behavior.

The same shell applies to all 12 public routes. Existing menus, animations, internal story readers, Creator and XR runtime behavior are preserved. The complete story remains available; it has not been shortened to force a screen fit.

## Validation

- Production website build completed; welcome screen verified as V0.9795.
- All 12 public routes checked at 1886×850, 1440×900, 390×844 and 375×667: no checked content outside the viewport, action links at least 17px and 44px high, visible images decoded successfully.
- Menu checks passed at five portrait/landscape sizes, including keyboard focus, Escape, outside press, link navigation, contrast and touch targets.
- All seven story chapters checked across seven layouts: full text reachable, original image proportions and no overlap.
- Canonical entry checks and Hillyards/PIMO browser checks passed, including automatic scene playback, pause on menu/route changes, honeycomb preview and linked-plant save/conflict recovery.
- Release boundary, canonical routes and access-navigation checks passed.

Browser phone emulation was used. Physical phone and headset acceptance have not been performed for this release. No backend or routing changes are included.
