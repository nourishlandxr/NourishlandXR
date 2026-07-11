# Nourishland XR
# Studio Workflow

Status: Draft
Version: 0.1 Lite

---

# Purpose

This document defines the workflow of the Nourishland XR Studio.

The Studio exists to allow users to build digital representations of real landscapes without writing code.

The workflow must remain consistent regardless of the project type.

---

# Primary Workflow

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

Anchor

Every project follows this sequence.

---

# Workspace

Purpose

Organise Projects.

Actions

- Create Workspace
- Open Workspace
- Rename Workspace

---

# Project

Purpose

Represents a real-world project.

Examples

- Hillyards Food Forest
- Frankendael Park
- Daleys Fruit Tree Nursery
- Banyula

Actions

- Create
- Open
- Edit
- Delete

---

# Site

Purpose

Represents a physical property or operational area.

Examples

Main Nursery

Main Food Forest

Retail Area

Arboretum

Actions

- Create
- Open
- Edit
- Delete

---

# Place

Purpose

Represents a meaningful location.

Examples

1R1

Glasshouse A

Oak Collection

Terrace 2

Actions

- Create
- Open
- Edit
- Delete

---

# Marker

Purpose

Represents knowledge attached to a Place.

Marker Types

Plant

Note

Actions

- Create
- Open
- Edit
- Delete

---

# Plant Marker Workflow

Create Plant

↓

Enter Common Name

↓

Enter Scientific Name

↓

Create Plant Profile

↓

Assign Anchor

↓

Save

---

# Note Workflow

Create Note

↓

Enter Title

↓

Enter Text

↓

Assign Anchor

↓

Save

---

# Anchor Workflow

Supported

GPS

QR Code

Future versions may support additional anchor types.

---

# Save

Saving updates the Project.

The Explorer immediately reads the updated Project.

The Studio does not contain Explorer functionality.

---

# Workflow Rules

Every object belongs to exactly one parent.

Workspace

contains Projects.

Project

contains Sites.

Site

contains Places.

Place

contains Markers.

Markers contain knowledge.

Anchors connect Markers to the real world.

---

# Design Rule

The Studio should never expose implementation details.

Users should think about landscapes.

Not files.

Not JSON.

Not folders.

The Studio manages the project structure automatically.

---

# Version 1 Goal

A user with no programming knowledge must be capable of creating a complete project using only the Studio.

No manual editing of files should be required.