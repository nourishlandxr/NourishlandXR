# Nourishland XR Studio Roadmap

This roadmap outlines the next 12 milestones required to evolve Nourishland XR Studio from a prototype into a production-ready authoring platform. The sequence is intentionally Studio-first and keeps AR out of scope until the Studio can reliably manage Sites, Locations, Assets, Experiences, and Publishing.

## Milestone 1 — Studio shell and navigation foundation
- Goal: Establish a usable Studio application shell with clear navigation and a stable entry point.
- Deliverable: A multi-view Studio interface with navigation between Dashboard, Projects, Sites, Locations, Assets, Experiences, and Publish.
- User Story: As a designer, I want to move between Studio sections without confusion so that I can manage content efficiently.
- Dependencies: Existing app prototype, project documentation, repository structure.
- Estimated complexity: Low

## Milestone 2 — Project and site catalog management
- Goal: Replace hard-coded site references with a real project/site catalog experience.
- Deliverable: A Project list and Site list view that can create, view, edit, and delete entries from structured data.
- User Story: As a designer, I want to create and manage projects and sites so that I can organize my content by location and purpose.
- Dependencies: Milestone 1, data model definitions.
- Estimated complexity: Medium

## Milestone 3 — Formal data model and schema definition
- Goal: Make the content structure explicit and enforceable.
- Deliverable: Completed JSON schemas for Project, Site, Location, Asset/Object, Experience, Content, and Relationships.
- User Story: As a designer, I want the system to validate my data so that I do not create incomplete or inconsistent content.
- Dependencies: Existing folder structure, example content, repository conventions.
- Estimated complexity: Medium

## Milestone 4 — Content persistence layer
- Goal: Introduce a reliable way to save Studio edits.
- Deliverable: A persistence layer that writes and reads structured content from the repository or a local data store in a consistent format.
- User Story: As a designer, I want my changes to be saved automatically so that I can return to them later.
- Dependencies: Milestone 2, Milestone 3.
- Estimated complexity: Medium

## Milestone 5 — Location management workflow
- Goal: Enable designers to manage the spatial structure of a site.
- Deliverable: A location editor that can create, rename, organize, and assign metadata to locations within a site.
- User Story: As a designer, I want to manage locations within a site so that I can structure the visitor experience properly.
- Dependencies: Milestone 2, Milestone 4.
- Estimated complexity: Medium

## Milestone 6 — Asset and object management workflow
- Goal: Support the creation and editing of objects/assets tied to locations.
- Deliverable: An asset/object editor with fields for identity, metadata, relationships, and media references.
- User Story: As a designer, I want to register plants, artworks, buildings, and other assets so that they can be reused across experiences.
- Dependencies: Milestone 5, schema definitions.
- Estimated complexity: Medium

## Milestone 7 — Experience authoring workflow
- Goal: Make it possible to create and structure immersive experiences.
- Deliverable: An experience editor that supports content blocks, ordering, metadata, and association with locations and assets.
- User Story: As a designer, I want to create learning experiences so that visitors can explore the site in a meaningful way.
- Dependencies: Milestone 6, content model definitions.
- Estimated complexity: High

## Milestone 8 — Relationship and content linking system
- Goal: Connect content across the hierarchy in a structured and maintainable way.
- Deliverable: A relationship management system for linking objects, locations, experiences, and content items.
- User Story: As a designer, I want to link related content so that the platform can present coherent journeys and narratives.
- Dependencies: Milestone 6, Milestone 7.
- Estimated complexity: Medium

## Milestone 9 — Media and asset handling
- Goal: Add first-class support for attaching and organizing media assets.
- Deliverable: Media upload/reference handling, storage conventions, and preview support for images and documents.
- User Story: As a designer, I want to attach media to locations and assets so that the experience feels rich and complete.
- Dependencies: Milestone 6, persistence layer.
- Estimated complexity: Medium

## Milestone 10 — Publishing and preview workflow
- Goal: Enable designers to publish and preview a site or experience in a basic form.
- Deliverable: A publish workflow that validates content, packages it for preview, and exposes a simple deployment or preview path.
- User Story: As a designer, I want to publish my work so that I can review it and share it with others.
- Dependencies: Milestones 5–9.
- Estimated complexity: High

## Milestone 11 — Role-based access and collaboration basics
- Goal: Prepare the Studio for multi-user and multi-role usage.
- Deliverable: Basic user roles, editing permissions, and audit-friendly change tracking for content updates.
- User Story: As a team lead, I want to control who can edit content so that collaboration remains organized and safe.
- Dependencies: Milestone 10, persistence layer.
- Estimated complexity: High

## Milestone 12 — Production readiness and quality hardening
- Goal: Make the Studio robust enough for real-world use.
- Deliverable: Error handling, validation, backup/restore confidence, performance baselines, and a documented release process.
- User Story: As a product owner, I want the Studio to be dependable and maintainable so that it can support ongoing content production.
- Dependencies: Milestones 10 and 11.
- Estimated complexity: High
