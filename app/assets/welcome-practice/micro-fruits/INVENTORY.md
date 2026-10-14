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

The ten JPEGs in `references/` remain combined reference sheets. This inventory separates their fruit identities as records; it has not cut out individual image files or created new GLB models. Use `catalog.json` as the starting point for a future local project-loadable catalogue, after validating its asset paths and records.
