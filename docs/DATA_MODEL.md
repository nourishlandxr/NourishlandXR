# Nourishland XR
# Data Model

**Status:** Draft  
**Version:** 0.1 Lite

---

# Purpose

This document defines the core objects used throughout Nourishland XR.

The data model is independent of technology.

Whether a project is viewed on a desktop, phone, Quest headset or future AR glasses, these concepts remain the same.

---

# Design Philosophy

Nourishland XR is built around real places.

Knowledge is attached to those places.

The platform stores knowledge once.

Different devices simply present that knowledge in different ways.

---

# Hierarchy

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

This hierarchy defines every Version 1 project.

---

# Workspace

Definition

A Workspace is the highest level container.

It groups together related Projects.

Examples

Nourishland

Daleys

University Research

Botanical Gardens

Responsibilities

- Organise Projects
- Store shared settings
- Store templates

A Workspace contains one or more Projects.

---

# Project

Definition

A Project represents a real-world initiative.

Examples

Hillyards Food Forest

Frankendael Park

Daleys Fruit Tree Nursery

Banyula

Responsibilities

- Organise Sites
- Define project identity
- Hold project settings

A Project contains one or more Sites.

---

# Site

Definition

A Site represents a physical property or operational area.

Examples

Main Food Forest

Retail Nursery

Demonstration Garden

Arboretum

Responsibilities

- Divide a Project into manageable locations.
- Contain Places.

A Site contains one or more Places.

---

# Place

Definition

A Place is a meaningful location inside a Site.

A Place may represent:

- Row
- Garden Bed
- Terrace
- Orchard Block
- Glasshouse
- Collection
- Pond
- Trail Stop
- Viewing Area

Examples

1R1

Terrace 2

Oak Collection

Glasshouse A

North Orchard

Responsibilities

- Organise Markers
- Represent a real location

A Place contains one or more Markers.

---

# Marker

Definition

A Marker represents knowledge attached to a Place.

Markers are the primary objects created by users.

Version 1 supports two Marker Types.

---

## Plant Marker

Represents a real plant.

Contains

- Common Name
- Scientific Name
- Description
- Plant Profile
- Anchor

Examples

Lemon Drop Garcinia

English Oak

Davidson Plum

---

## Note Marker

Represents information attached to space.

Contains

- Title
- Text
- Anchor

Examples

Food Forest Layers

Historical Note

Observation

Management Note

Curiosity

---

# Plant Profile

Definition

The Plant Profile stores detailed information about a plant.

Every Plant Marker references one Plant Profile.

Sections

- Overview
- Identification
- Edible Uses
- Propagation
- Growing Conditions
- Notes
- References

The profile remains independent of presentation.

---

# Anchor

Definition

An Anchor connects a Marker to the real world.

Version 1

- GPS
- QR Code

Future

- Image Recognition
- Spatial Anchors
- Persistent Cloud Anchors

Anchors should remain platform independent.

---

# Relationships

Version 1

Relationships are intentionally excluded.

Future versions may introduce relationships between:

- Plants
- Places
- Notes
- Ecological systems

---

# Templates

Templates provide starting structures.

Templates never modify the engine.

Version 1 templates include

Food Forest

Orchard

Nursery

Botanical Garden

National Park

---

# Project Portability

Every Project should remain portable.

A Project must be movable between computers without modification.

No database should be required.

Projects are stored as folders containing JSON files.

---

# Platform Independence

The data model is independent of presentation.

The same Project should be viewable through

- Desktop
- Phone
- Tablet
- Quest Browser
- Future AR Glasses

Only the interface changes.

The knowledge remains identical.

---

# Version 1 Boundary

Version 1 intentionally focuses on creating and exploring spatial knowledge.

The following concepts are outside the Version 1 data model.

- Artificial Intelligence
- Audio
- Video
- Animations
- Ecological Networks
- Quizzes
- Publishing
- Collaboration
- Cloud Synchronisation
- Analytics

These belong to future versions.

---

# Design Rule

Every new feature introduced into Nourishland XR must answer one question.

"Which core object does this belong to?"

If the answer is unclear, the feature should not be implemented until the data model is updated.

The data model is the foundation of the platform.

The implementation must always follow the data model—not the other way around.