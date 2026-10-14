# Welcome refinement verification — 14 October 2026

Scope: opening presentation, outside table handle, plate/basket behaviour, settings pointer feedback and specific application-side performance repairs. The candidate wrist icons are an opt-in comparison page, not an installed replacement.

## Implemented

- Authored captions remain stable rather than being replaced by approximate narration pages. Welcome paragraphs accumulate without dropping earlier paragraphs. Headings keep five seconds of reading time; audio loading does not consume that time. Both native and preview text use measured wrapping with reserved heading space, so hiding a heading does not shift the paragraph upward.
- The personal greeting precedes controller instruction. The repeated conversation bridge is skipped in automatic progression. Preview cameras retain the reading surface in view.
- The table has a curved tubular pull on its outer edge facing the user. Ray and near-grab targets follow the new geometry. The plate is left of Zinnia, outside her pot footprint.
- Lifting a fruit no longer ejects packed neighbours into free-fall. Existing rim-contact release and fresh-grip requirements remain; all actual fruit lift checks pass.
- Wrist button hit targets include a small invisible margin. Settings contact rings are redrawn after the panel with depth testing temporarily disabled, then restored. General scene contact remains depth-tested.
- A retained native renderer is reused for visibility/material/transform updates when it already covers the eligible scene meshes. Newly added meshes/material replacements still require preparation. `welcomePracticeXR.performance` includes renderer rebuild and retained revision counters.
- Base textures now use the native texture-size policy and upload during progressive preparation instead of waiting for first draw. This bounds the requested size, not driver memory copies or single-upload duration.
- Detailed Zinnia mesh pointer tests run during her laser lessons rather than every ordinary tutorial pointer query.
- Fruit model work is limited to two concurrent fruit tasks and yields between tasks. A single glTF parse can still block; this is a bounded-load repair, not a worker implementation.
- Existing narration clips are reused only when catalog text matches the requested speech exactly. Personal/free-form replies remain dynamic. Current and next lesson requests are prefetched. Provider latency remains outside the application's direct control.

## Evidence and limits

The automated checks exercise real scene/assets, cold fruit presentation, table interaction, mesh conversion, shader uploads, text layout, ownership and XR event paths. A visibility-only renderer probe requires zero new geometry uploads. A queue test checks the two-task bound. An overlay test checks disabled depth during contact drawing and restored depth afterward.

Local browser review confirms paragraph separation, the version badge, plate separation and the icon comparison. Screenshots and logs are under `artifacts/xr-audit/`.

No Quest GPU timing, sustained FPS or motion-to-photon result is claimed. Current asset accessor min/max warnings were observed during loading and remain an asset-validation follow-up; no load failure was observed in this preview pass. The tutorial still converts new content and uses several native rendering paths. The repair reduces known unnecessary work without establishing that every reported stall is eliminated.

## Next Quest measurement checklist

- [ ] Record exact version, Browser/OS, accepted session refresh rate and quality/resolution.
- [ ] Warm up 30 seconds, then repeat three 90-second runs and a 10-minute thermal run.
- [ ] Compare before/after on the same headset, including close/far Zinnia, first Orb reveal, fruit loading, basket picking, apple variants and painting.
- [ ] Record whole-frame cadence separately from `updateCpuMs`; include p50/p95/p99, missed intervals, renderer rebuild counters and upload bytes. Do not interpret callback cadence as GPU time.
- [ ] If stalls remain, isolate model parsing, morph deformation, raycasts and close-up fill/overdraw separately. Profile before adding dependencies or changing the renderer.
- [ ] Validate both hands/controllers, table reach, basket contact and settings ring legibility. Never use an average FPS number alone as acceptance.

Icon proposal: `app/features/ar-demo/wrist-icons-preview.html`. Current on the left; proposed larger rounded-stroke set on the right. Review recognition and aim-state readability at actual wrist scale before replacing the shared canvas icon renderer.
