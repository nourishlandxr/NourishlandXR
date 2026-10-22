# Website experience release · V0.9782

Publishes the website experience committed as `2e1abfbf` using the protected root publisher. The release contains 36 explicitly listed frontend files over the verified V0.9780 baseline. Each replaced file has its previous production SHA-256 recorded; the installer checks every baseline before writing and retains a private rollback backup.

## Included

- Gradual heading, central object and explanation entrances; browser history and reduced motion remain supported.
- Current shared Totem models, receding ancestors, animated ground connections and information balloons.
- Original botanical wheel in Food Forests, larger three-place showcase and discovery die in Collaborate.
- Interactive on-page phone preview for Field Notes and Field Multitool entries.
- Consistent centred typography, colours and layout across the marketing pages.
- Release versions on HTML assets, CSS imports and the module graph, so returning visitors receive the updated components.
- Welcome/build version V0.9782. The build identifies the website implementation commit `2e1abfbf`.

## Known limitations

The retained high-quality hero video and poster predate the food-area crevice repair. This release does **not** repair that baked-in defect. A fresh clean video export from the repaired 3D master is still required; the NL layer remains disabled. No video or world geometry is replaced here.

Uki and Hillyards models remain explicitly illustrative. The phone is a website preview, not the native Android app. Physical phone and headset acceptance are separate from browser viewport checks.

## Validation and publication

The website build, six focused release/boundary tests and existing menu/Creator regression harnesses pass. The exact overlay passes desktop and phone browser checks for Education, connected Totems, the on-page phone, wheel, places, discovery die and the visible site version. Candidate evidence is in `artifacts/website-release-0.9782-candidate.json`.

Publish via `Publish reviewed root website` with version `0.9782`. That workflow validates the scoped payload, installs it with a private backup and requires all public file hashes to match. The same browser check can then run with `node root-site/tests/website-release-browser.mjs 0.9782 --public`.

No routing, WordPress, API or project data changes are included. The legacy root protection stays enabled.
