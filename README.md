\# Nourishland XR Platform



A reusable spatial learning platform for:



\- Botanical Gardens

\- Food Forests

\- Public Parks

\- Universities

\- Museums



\## Principles



\- One engine

\- Many sites

\- One content structure

\- Multiple devices



\## First Demonstration



Hillyards Food Forest



The first demonstration site used to develop and validate the platform.



\## Project Structure



\- app

\- engine

\- content

\- sites

\- templates

\- examples

\- media

\- docs

\- schemas

## Documentation

- [docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)

## Local development

Do not use Live Server for persistence-backed Studio development. The Studio API and frontend are served together by the persistence server.

From the repository root, run:

```text
node tools/persistence-server.mjs
```

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in a browser.

The server reads and writes the canonical `workspace/` hierarchy.

