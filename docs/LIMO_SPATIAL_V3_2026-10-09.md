# LIMO spatial update · 0.9411

LIMO now starts with six questions about a Project and its real Areas. Each question has five focused branches. Opening a question does not count as a field observation or a completed activity.

| Question | Branches |
| --- | --- |
| Read this place | Sun and shade; water and drainage; soil and cover; seasons and extremes; access and constraints |
| Meet the life here | Plants and layers; wildlife visitors; damage and beneficial life; flowering and fruiting; unrecorded information |
| See how it works | Guilds and neighbours; support; water and organic matter cycles; pollination and habitat; local techniques |
| Imagine what comes next | Purpose and care; starting condition; plant suitability; two alternative plans; phases |
| Try something useful | Small first planting; existing Area care; a technique trial; harvest and sharing; a question or observation |
| See what changed | Repeat an observation; compare Areas and dates; results and effort; unexpected outcomes; the next step |

## Spatial entry and appearance

Creator AR exposes **Learn in this Project** in its companion actions and in PIMO Controls. The spatial introduction uses the same canonical question IDs, presented as six stable roots with only one family of five branches expanded at a time. Legacy learning IDs still resolve; existing PIMO source records and Curiosity remain intact.

The native LIMO reading and action surfaces have a restrained dark botanical palette, cream text, question-specific accents, shorter wrapped labels, scope and coverage summaries, and explicit FIND / NOTE / TRY / DRAFT / RETURN cues. Draft actions also have a different outline shape. Targets stay in place during pointing.

**Desktop book and dashboard screens were not redesigned or edited.** The browser review is a native XR event/frame harness, not a new desktop product experience.

## Practical Project behaviour

- The context adapter loads every returned Site and its Areas, with bounded parallel loading. Failed Areas or profiles remain visible as coverage gaps.
- Queries use scoped marker IDs and plant-profile layer fields. Proposed plants and templates are excluded from recorded plant counts; unclassified plants remain available. “Recorded” describes inventory data, not a verified current field observation.
- Selecting a result opens its canonical PIMO or Note. A plant already present in the active AR Area expands in the scene. Area focus uses the existing saved Area transition. Another Site's records can be inspected, but entering that Site's spatial session still requires the existing Project navigation.
- Guided observations record the question, Area or exact marker, answer, date and a return date. They can be reopened with their earlier answer history.
- Trials remain draft until explicitly marked tried. Two-option comparisons have editable alternatives, purpose, care commitment and return date; they never alter the inventory.
- Pause/resume and personal records persist in a Project-scoped notebook on this device. Refresh reloads Project records. Returning from PIMO restores the LIMO context.
- Creator AR can explicitly save a personal record as a **draft Project Note**, through the existing persistence API. This is a saved snapshot; later personal return observations do not silently overwrite that Project Note. The illustrative demo has no Project-write action.

The first version uses guided answer choices rather than free text inside the headset. Detailed text or photos can be added using existing Project Note tools. New question copy currently falls back to English when no translation exists. Wildlife presence, climate, pest causes and relationships are not inferred from missing data; suitability decisions still require evidence.

## Validation

- Full Node suite: 688 tests passed.
- Frontend build: 0.9411; whitespace checks passed.
- Native two-eye WebGL review: no graphics errors.
- Controller event/frame harness: root selection → branch → exact plant record → dated observation → save → return observation → save passed, using the shared native panel renderer and select event handlers.
- Physical Quest walkthrough and live authenticated Project capture remain separate validation steps. No physical device success is claimed.

Review: `tools/preview-limo-spatial.html`. Main implementation: `limoProjectLearning.js`, `limoProjectContext.js`, `limoSpatialExperience.js`, `limoSpatialPresentation.js`, with Creator AR and spatial-demo integration.

## Where Astra could add value

An independent architecture review of evidence, proposed relationships, Project permissions and future guild/scenario records would be a useful Astra task. A later ecological content review can compare sources against local observation claims. A Quest performance investigation can assess rendering traces when real device evidence is available. Routine copy, styling and scoped implementation do not require switching models.
