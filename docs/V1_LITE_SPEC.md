# V1 Lite Persistence Specification

## Goal

The Studio must create and edit real project folders on disk using JSON files only.

## Workspace layout

Each project is stored under the repository workspace folder.

```text
workspace/
  Hillyards/
    site.json
    places/
      <place-id>/
        place.json
        markers/
          <marker-id>/
            marker.json
            plant_profile.json
            anchors.json
  Frankendael/
  Daleys/
  Banyula/
```

## File conventions

- site.json contains the site metadata.
- Each place directory contains place.json and a markers folder.
- Each marker directory contains marker.json, and optionally plant_profile.json and anchors.json.
- Marker type is inferred from the marker category when possible.

## Supported authoring actions

- Opening a site loads its data from the filesystem.
- Creating a place writes a place.json file and its directory structure.
- Creating an asset writes a marker folder with marker.json and any required companion files.
- Editing and deleting places and assets update or remove their corresponding files.

## Constraints

- No database
- No cloud storage
- No persistence abstraction beyond JSON files and folders
