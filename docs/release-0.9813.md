# Release V0.9813

Contains the tested V0.9812 website and Food Forest workbench V3 update, plus
the deployment-boundary repairs discovered during installation. The frontend
installer now accepts the three specific embedded database files. The API
installer accepts the bundled `data1/daleys_plant_catalog.json` used by the
existing catalogue service. Project data, secrets, and other paths stay excluded.

Both V0.9812 deployment attempts stopped at validation before replacing live
files. V0.9813 was built from the committed V0.9812 snapshot in an isolated
checkout, without the separate ongoing V4 workbench edits.

Validation: V0.9812 passed the full 1,253-test suite, browser candidate checks,
and isolated API checks. V0.9813 passed its frontend build and 15 focused
workbench/release-boundary tests. Workflow execution repeats the required
frontend checks and the full API suite before installing each component.
