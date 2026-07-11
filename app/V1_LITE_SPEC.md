# Nourishland XR
# Version 1 Lite Specification

**Status:** Draft  
**Version:** 0.1 Lite  
**Author:** Andre Madeira  
**Purpose:** Freeze the scope of Version 1 before further development.

> **We are not building an AR application.**
>
> We are building the smallest possible platform that allows people to create, organise and explore knowledge attached to real landscapes.

---

# 1. Vision

Nourishland XR is a Spatial Knowledge Platform for food production and ecological landscapes.

It enables designers, growers, educators and land managers to build digital representations of real places that can be explored on phones, tablets, desktop browsers and future AR devices.

Version 1 focuses on functionality rather than presentation.

Version 1 is designed as a digital field notebook.

The goal is not to build an AR application.

The goal is to allow a person standing in a real landscape to create, organise and explore spatial knowledge without writing code.

---

# 2. Scope

Version 1 Lite delivers the smallest complete system capable of creating and exploring real places.

Supported environments include:

- Food Forests
- Orchards
- Nurseries
- Botanical Gardens
- Arboretums
- National Parks
- Demonstration Sites
- Regeneration Projects

Version 1 is intentionally focused on this domain.

It is not intended to become a generic spatial platform.

---

# 3. Design Principles

- Content first.
- Simple over clever.
- Everything editable.
- Everything portable.
- No unnecessary graphics.
- No unnecessary animations.
- No unnecessary complexity.
- Information before decoration.
- One source of truth.
- Build for longevity.

---

# 4. Fundamental Principle

Knowledge exists independently of presentation.

The same information must be reusable across:

- Desktop
- Phone
- Tablet
- Quest Browser
- Future AR Glasses

The platform stores knowledge once.

Each device simply presents that knowledge differently.

---

# 5. Core Objects

Version 1 contains only seven core objects.

Workspace

↓

Project

↓

Site

↓

Place

↓

Marker

↓

Plant Profile

↓

Anchor

Everything else belongs to future versions.

---

# 6. Marker Types

Version 1 supports only two marker types.

## Plant

Represents a real plant.

Contains:

- Common Name
- Scientific Name
- Description
- Plant Profile
- Anchor

---

## Note

Represents knowledge attached to a location.

Contains:

- Title
- Text
- Anchor

---

# 7. Plant Profile

Every plant shares the same profile structure.

Sections:

- Overview
- Identification
- Edible Uses
- Propagation
- Growing Conditions
- Notes
- References

Future versions may extend this profile.

---

# 8. Anchors

Version 1 supports:

- GPS
- QR Code (placeholder)

Future versions may support:

- Image Recognition
- OpenXR Spatial Anchors
- Persistent Cloud Anchors

The Anchor system must remain independent of the rendering platform.

---

# 9. Studio

The Studio is an authoring environment.

Required capabilities:

- Create Project
- Create Place
- Create Plant Marker
- Create Spatial Note
- Edit Marker
- Edit Plant Profile
- Assign Anchor
- Save Project

The Studio exists to build knowledge.

It is not responsible for displaying immersive experiences.

---

# 10. Explorer

The Explorer is a viewing environment.

Required capabilities:

- Open Project
- View Places
- View Plant Markers
- View Spatial Notes
- Open Plant Profile

The Explorer should work on:

- Desktop
- Phone
- Tablet
- Quest Browser

---

# 11. Project Structure

Projects remain portable.

Example structure:

workspace/

    Project/

        site.json

        places/

            place.json

            markers/

                marker.json

                plant_profile.json

                anchors.json

No database is required.

Projects should remain simple folders containing JSON files.

---

# 12. Templates

Templates provide a starting structure.

Templates never change the underlying engine.

Version 1 templates include:

- Food Forest
- Nursery
- Orchard
- Botanical Garden
- National Park

Templates simply organise content.

---

# 13. Target Platforms

Version 1 must remain compatible with:

- Desktop
- Phone
- Tablet
- Quest Browser
- Future AR Glasses

The same project should load without modification.

---

# 14. Version 1 Demonstrations

Version 1 must support multiple real-world demonstrations without changing the software.

Reference demonstrations include:

## Hillyards Food Forest

Purpose:

Educational exploration.

---

## Frankendael Park

Purpose:

Botanical interpretation.

---

## Daleys Fruit Tree Nursery

Purpose:

Operational nursery workflows.

Examples:

- Locate rows
- Locate plants
- QR assisted workflows
- Plant collection
- Stock movement
- Stocktake
- Future AR navigation

---

## Banyula

Purpose:

Landscape planning and ecological restoration.

---

Each demonstration uses:

- the same Studio
- the same Explorer
- the same data model
- the same project structure

Only the content changes.

---

# 15. Out of Scope

Version 1 intentionally excludes:

- Artificial Intelligence
- Relationships
- Ecological Networks
- Quizzes
- Audio
- Video
- Animations
- Publishing
- Accounts
- Cloud Sync
- Analytics
- Collaboration
- Multi-user editing

These belong to Version 2 or later.

---

# 16. Acceptance Test

Version 1 is complete when the following workflow succeeds.

Create Project

↓

Create Place

↓

Create Plant Marker

↓

Create Spatial Note

↓

Assign Anchor

↓

Save Project

↓

Open Explorer

↓

Locate Marker

↓

Open Plant Profile

↓

Read Spatial Note

No programming should be required.

---

# 17. Success Criteria

Version 1 succeeds when two independent users can create completely different projects using the same Studio.

Example:

Andre

↓

Hillyards Food Forest

Australia

Brother

↓

Frankendael Park

Netherlands

Both projects function without changing the software.

Additional demonstrations such as Daleys Fruit Tree Nursery and Banyula should also use the same platform.

---

# 18. Version 2

Version 2 may introduce:

- Spatial diagrams
- Ecological relationships
- Media
- Audio
- Video
- AI assistance
- Persistent AR Anchors
- Advanced navigation
- Immersive learning
- Ecological networks
- Collaboration
- Publishing

Version 1 intentionally stops before these features.

The objective is to deliver a stable, portable and practical Spatial Knowledge Platform that can immediately be tested in real-world environments.