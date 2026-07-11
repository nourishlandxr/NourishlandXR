# Nourishland XR Platform

## Purpose

Nourishland XR is a platform for creating immersive spatial learning experiences.

It consists of two applications:

- Platform (visitor)
- Studio (designer)

The Studio edits data.

The Platform displays data.

Never mix the two.

---

## Core Hierarchy

Project

↓

Site

↓

Location

↓

Asset

↓

Experience

↓

Content

---

## Rules

- Everything belongs to a Project.
- Projects contain Sites.
- Sites contain Locations.
- Locations contain Assets.
- Assets contain Experiences.
- Experiences contain Content.
- Never hard-code site-specific information into the engine.
- Build reusable components.
- Keep functions small.
- Prefer data-driven architecture.
- Prefer readability over clever code.

---

## Current Goal

Build the Studio first.

Ignore AR for now.

Ignore styling.

Focus on workflow.

Every feature should be usable by a designer.

## Project Documentation

- [docs/PROJECT_SUMMARY.md](docs/PROJECT_SUMMARY.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)