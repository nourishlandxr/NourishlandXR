# Nourishland XR
# JSON Data Specification

Status: Draft
Version: 0.1 Lite

---

# Purpose

This document defines the JSON structure used throughout Nourishland XR.

Every application must read and write the same format.

The JSON format is the contract between:

- Studio
- Explorer
- Future applications

---

# Project

project.json

{
    "id": "",
    "name": "",
    "description": "",
    "template": "",
    "created": "",
    "modified": ""
}

---

# Site

site.json

{
    "id": "",
    "name": "",
    "description": ""
}

---

# Place

place.json

{
    "id": "",
    "name": "",
    "description": ""
}

---

# Marker

marker.json

{
    "id": "",
    "type": "plant",
    "name": "",
    "description": "",
    "anchor": ""
}

Marker Types

plant

note

---

# Plant Profile

plant_profile.json

{
    "common_name": "",
    "scientific_name": "",
    "overview": "",
    "identification": "",
    "edible": "",
    "propagation": "",
    "growing_conditions": "",
    "notes": ""
}

---

# Anchor

anchor.json

{
    "type": "gps",
    "latitude": "",
    "longitude": "",
    "altitude": ""
}

Supported Types

gps

qr

---

# Future Compatibility

Future versions may extend the JSON format.

Applications must ignore unknown fields.

No Version 1 field should be removed.

Only new fields should be added.

This guarantees backward compatibility.
