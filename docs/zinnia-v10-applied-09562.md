# Refined OpenAI V10 applied — V0.9562

The earlier V10 candidate was preview only. Production tutorial and demo loaded the earlier Coral banks until this release.

This release records all current scripts using OpenAI Coral with delivery `v10-refined-1`: 59 tutorial clips and 54 main-demo paragraph clips. The recovered Ava V10 serves as a delivery reference; it is not a cloned voice. Refinement asks for natural American delivery, normal speaking speed, smooth clause joins and gently released word endings. Voice recordings stay separate from background music and the existing configurable 3% echo.

Tutorial and demo bank manifests include the exact shared synthesis instructions and delivery ID. Recorders reject hosted responses without the expected delivery header, and bank hashes change with the profile. Live replies use the same hosted profile. No key is copied into the frontend or repository. The hosted route was syntax checked, backed up and restarted.

The demo now preserves complete recorded paragraphs instead of shortening an exact bank match into live fragments. Existing recordings remain recoverable in their previous folders.

Acceptance: all 113 MP3 files must decode; profile consistency, full demo-paragraph playback, test suite, frontend V0.9562 build, deployment workflow and live manifest/badge checks must pass. Subjective listening and Quest playback remain device/user checks.
