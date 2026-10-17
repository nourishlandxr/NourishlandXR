# Micro-fruit inventory

This is a first-pass inventory of distinct fruits visible in the ten references. Reference 8 duplicates reference 7's 25-fruit illustration sheet. Each row is an individual catalogue entry in `catalog.json`, with stable ID, aliases, reference numbers, and any existing NLXR model candidates.

## Common and familiar

- Apple
- Apricot
- Avocado
- Banana
- Cantaloupe / rockmelon
- Fig
- Kiwifruit
- Peach / nectarine
- Pear
- Persimmon
- Plum
- Pomegranate
- Watermelon

## Citrus

- Grapefruit / pomelo
- Lemon
- Lime
- Mandarin / tangerine
- Orange

## Berries and bunch fruits

- Blueberry
- Blackberry
- Cherry
- Grape
- Raspberry
- Strawberry

## Tropical and less common

- African peach / keystone fruit
- Bayberry / yangmei
- Canistel / eggfruit — species identification needs review
- Carambola / star fruit
- Coconut
- Custard apple / sugar apple / atemoya — species identification needs review
- Dragon fruit / pitaya
- Durian
- Feijoa / pineapple guava
- Guava
- Horned melon / kiwano
- Lychee
- Mamey sapote
- Mango
- Mangosteen — identification needs review
- Papaya / pawpaw
- Passion fruit
- Pineapple
- Rambutan
- Rose apple / wax apple — identification needs review
- Soursop
- Star apple
- Unidentified tropical fruit forms — identify before adding as named fruit records

## Existing NLXR model candidates

The catalogue points to candidate models already under `app/assets/welcome-practice/` or `app/assets/fruit-window/` for apple, African peach, banana, bayberry, carambola, fig, lime, mamey sapote, mango, peach and pomegranate. These are candidates to reuse, not yet approved micro-fruit assets: inspect model scale, style, licensing, file size and runtime behavior before loading them into new projects.

## Asset status

- `existing-model-candidate`: a possible GLB already exists in NLXR and needs review.
- `reference-only`: the fruit appears in a supplied picture, but there is no identified individual NLXR model here yet.
- `species-review-needed`: the picture is ambiguous; confirm the fruit identity before assigning a canonical name.

The ten JPEGs in `references/` remain preserved as source material. The clearly identified fruit cells from `reference-2.jpg` and the blackberry cell from `reference-9.jpg` have been split into 29 individually addressable, transparent PNG icons in `icons/`; `icons-manifest.json` records each source cell, and `catalog.json` links each supported fruit entry to its icon. The split only crops existing illustrations; it does not create new fruit artwork or GLB models. Other sheets remain untouched where their fruit identity, image quality, or cell boundaries are uncertain.

## Zinnia hand icons

Zinnia’s favourite-fruit reveal uses the 29 separate `icons/*.png` entries, plus the existing atlas entry for carambola. Those small hand illustrations are separate from the 3D fruit used on the practice table. Existing recorded Zinnia clips remain limited to apple, banana, carambola, fig, mango, peach and pomegranate; the expanded choices use Zinnia’s normal voice path so no unrelated saved fruit narration is reused.
