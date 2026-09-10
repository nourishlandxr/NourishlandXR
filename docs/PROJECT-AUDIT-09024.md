# Focused creator project audit — 0.9024

Scope: dashboard layout, dashboard data loading, creator PIM saves and Live Note editing. This is a focused source/UX review, not a complete security or hardware audit. Only the requested navigation formatting was changed.

## Applied: four main project controls

The original stylesheet defines three columns for four controls. The V2 override switches this to flex while its generic font:inherit rule overrides the smaller nav font. Added a dashboard-scoped four-column grid with explicit 14px typography, 48px minimum targets and flexible heights. At 520px and below, use two columns so Knowledge remains readable. Existing actions and active-state behavior are preserved. Files: app/product-v2.css and app/services/buildInfo.js.

## Recommended follow-up, in priority order

1. **Placement failures look like missing placement.** app/services/projectDashboardV2Model.js:77–81 catches every anchor-read error and returns null, then calculates placed totals from that result. A transient server failure can therefore underreport mapped progress without an anchor-specific warning. Distinguish absent anchors from failed reads, show incomplete totals and offer retry. Test one failed anchor against otherwise valid data.

2. **Project-wide label, single-site data.** app/services/projectDashboardV2Model.js:67 selects main_food_forest or the first site. The dashboard then presents its counts as project information. Multi-site projects can hide the remaining sites. Add an explicit site selector and scope label, or aggregate across sites. Verify a two-site project with distinct areas and counts.

3. **Large-project request burst.** app/services/projectDashboardV2Model.js:71–79 loads areas in parallel, then requests one anchor per marker without a concurrency limit. Hundreds of markers create hundreds of requests before the overview completes. Prefer a batch placement endpoint or bounded concurrency, and defer detailed map data until Map opens. Measure request count and time to usable overview on a populated project.

4. **Concurrent creator saves still have a race.** app/services/creatorArKnowledge.js:33–43 compares a fresh read with a baseline, then writes separately. Two creators can pass the comparison before either writes. Add server-enforced revision/ETag checks and a conflict-resolution path. Test two simultaneous saves against one revision.

5. **Live Note editing can silently truncate/reassign topics.** app/services/liveNotes.js:3–7 caps lines at 12 and reuses IDs by row index. Removing/reordering a line can attach an old identity to different content; imported notes with more than 12 topics can lose excess topics on save. Validate limits visibly and edit stable topic objects instead of reconstructing identity from row position. Test deleting the first topic and saving a note with more than 12 topics.

Suggested next job: placement-read accuracy plus explicit site scope first; then batch loading. Those changes improve creators' trust in the dashboard before another visual redesign.

6. **Other mobile cards still wrap poorly.** Browser inspection at 320px confirmed that the Open AR card and statistics labels split into narrow fragments, even with the navigation fixed. Reflow the AR card text and use a two-column statistics layout below 520px. Keep this separate from the requested tab change.

Verification of this update: browser inspected the real 281-plant QA dashboard at 320×740 and 1280×800; all four labels fit, Map navigation updates aria-current correctly, and welcome displays 0.9024. No new tests were added for this CSS-only change. Hosted build generated locally; no deployment or production data writes.
