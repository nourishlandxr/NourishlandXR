# Quest demo playback and character repair — V0.9564

## Runtime mismatches repaired

- `showIntroBoard` split authored paragraphs into 180-character text chunks. Saved V13 clips use full paragraphs, so those chunks could miss the bank and fall back to live speech. Removed the arbitrary split. Shortened quick-access display copy now narrates the full authored chapter through its saved bank.
- Tutorial completion previously transferred the tutorial-owned character into the demo before tutorial teardown. Demo now loads an independent instance of the same canonical authored Zinnia GLB. It starts after both normal completion and early exit. Model adoption resets the prior clock, pause state and inner guide visibility.
- Saved audio fetch deadline increased from 8 to 20 seconds for headset asset loading.

## Evidence

Actual authored GLB is driven through the demo perch and native XR renderer in a regression fixture: mouth expression opens, animation age advances, facial morph buffer updates reach the GPU interface and character draw calls execute for both-eye rendering. Also covers adoption with an old clock and hidden guide. This is harness evidence, not a real Quest walkthrough.

V13 recording banks remain unchanged. Release verification: focused tests, full suite, frontend build, diff check and welcome badge. Quest checks: direct demo start, tutorial completion, early tutorial exit, chapter narration, pause/replay and visible facial/body motion.
