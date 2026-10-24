// Saved sample from app/assets/imap-v2/border-ranges-mock.json. Schematic, not surveyed.
export const DEMO_BORDER_RANGES_SEED = {
  "schema": "nourishland.imap-sketch",
  "schemaVersion": 1,
  "shape": "circular",
  "sizeScale": 1,
  "verified": false,
  "unit": "illustrative-sculpt",
  "mapInfo": {
    "title": "Border Ranges National Park",
    "sourceDate": "25-Oct-2021",
    "source": "https://www.nationalparks.nsw.gov.au/-/media/npws/maps/pdfs/parks/border-ranges-national-park/border-ranges-national-park-map.pdf",
    "reference": "https://www.nationalparks.nsw.gov.au/visit-a-park/parks/border-ranges-national-park",
    "method": "Names and feature classes taken from the NPWS map and park pages; positions and relief are schematic, not georeferenced.",
    "areas": [
      {
        "id": "brindle-creek",
        "name": "Brindle Creek",
        "boundaryId": "br-area-brindle",
        "totemId": "br-totem-brindle"
      },
      {
        "id": "bar-mountain",
        "name": "Bar Mountain",
        "boundaryId": "br-area-bar",
        "totemId": "br-totem-bar"
      },
      {
        "id": "sheepstation-creek",
        "name": "Sheepstation Creek",
        "boundaryId": "br-area-sheep",
        "totemId": "br-totem-sheep"
      },
      {
        "id": "border-loop",
        "name": "Border Loop",
        "boundaryId": "br-area-loop",
        "totemId": "br-totem-loop"
      }
    ]
  },
  "terrainEdits": [
    {
      "id": "br-terrain-ridge",
      "kind": "bank",
      "points": [
        {
          "x": -4.8,
          "z": 1.6
        },
        {
          "x": -3.4,
          "z": 3.3
        },
        {
          "x": -1.1,
          "z": 4.4
        },
        {
          "x": 1.6,
          "z": 4.1
        },
        {
          "x": 4.3,
          "z": 2.6
        }
      ],
      "width": 1.05,
      "strength": 0.85,
      "side": "left"
    },
    {
      "id": "br-terrain-ridge-fold",
      "kind": "bank",
      "points": [
        {
          "x": -4.3,
          "z": 1.1
        },
        {
          "x": -2.8,
          "z": 2.6
        },
        {
          "x": -0.8,
          "z": 3.4
        },
        {
          "x": 1.8,
          "z": 3.1
        },
        {
          "x": 3.9,
          "z": 1.8
        }
      ],
      "width": 0.56,
      "strength": 0.44,
      "side": "right"
    },
    {
      "id": "br-water-brindle",
      "kind": "channel",
      "points": [
        {
          "x": -2.7,
          "z": 3.4
        },
        {
          "x": -2.2,
          "z": 2.5
        },
        {
          "x": -1.8,
          "z": 1.5
        },
        {
          "x": -1.1,
          "z": 0.7
        }
      ],
      "width": 0.48,
      "strength": 0.72
    },
    {
      "id": "br-water-sheepstation",
      "kind": "channel",
      "points": [
        {
          "x": 0.9,
          "z": 0.4
        },
        {
          "x": 0.2,
          "z": -0.7
        },
        {
          "x": -0.6,
          "z": -1.8
        },
        {
          "x": -1.4,
          "z": -3.4
        }
      ],
      "width": 0.52,
      "strength": 0.66
    },
    {
      "id": "br-water-loop",
      "kind": "channel",
      "points": [
        {
          "x": 3.9,
          "z": 0.5
        },
        {
          "x": 3.1,
          "z": -0.7
        },
        {
          "x": 3.1,
          "z": -1.7
        },
        {
          "x": 3.7,
          "z": -2.8
        }
      ],
      "width": 0.42,
      "strength": 0.58
    }
  ],
  "elements": [
    {
      "id": "br-track-scenic",
      "type": "path",
      "name": "Tweed Range Scenic Drive",
      "points": [
        {
          "x": -5.2,
          "z": -2.5
        },
        {
          "x": -3.4,
          "z": -1.7
        },
        {
          "x": -2.2,
          "z": -0.4
        },
        {
          "x": -1.5,
          "z": 1.5
        },
        {
          "x": 0.1,
          "z": 2.4
        },
        {
          "x": 2.2,
          "z": 2.1
        },
        {
          "x": 4.5,
          "z": 0.6
        },
        {
          "x": 4.6,
          "z": -1.1
        },
        {
          "x": 3.6,
          "z": -2.2
        },
        {
          "x": 1.3,
          "z": -3.3
        }
      ],
      "size": 1.45
    },
    {
      "id": "br-track-brindle",
      "type": "path",
      "name": "Brindle Creek walking track",
      "points": [
        {
          "x": -3.8,
          "z": 2.5
        },
        {
          "x": -3.1,
          "z": 2
        },
        {
          "x": -2.3,
          "z": 1.5
        },
        {
          "x": -1.5,
          "z": 1.1
        }
      ],
      "size": 0.8
    },
    {
      "id": "br-track-bar",
      "type": "path",
      "name": "Bar Mountain circuit",
      "points": [
        {
          "x": 0.1,
          "z": 3.2
        },
        {
          "x": 0.8,
          "z": 3
        },
        {
          "x": 1.1,
          "z": 2.5
        },
        {
          "x": 0.5,
          "z": 2.1
        },
        {
          "x": -0.1,
          "z": 2.5
        },
        {
          "x": 0.1,
          "z": 3.2
        }
      ],
      "size": 0.84
    },
    {
      "id": "br-track-pinnacle",
      "type": "path",
      "name": "Pinnacle walk",
      "points": [
        {
          "x": -0.1,
          "z": 2.6
        },
        {
          "x": 0.1,
          "z": 3.3
        },
        {
          "x": 0.3,
          "z": 4.2
        }
      ],
      "size": 0.78
    },
    {
      "id": "br-track-falcorostrum",
      "type": "path",
      "name": "Falcorostrum loop",
      "points": [
        {
          "x": 1.1,
          "z": 2.7
        },
        {
          "x": 1.8,
          "z": 2.9
        },
        {
          "x": 2.25,
          "z": 2.5
        },
        {
          "x": 1.7,
          "z": 2.1
        },
        {
          "x": 1.1,
          "z": 2.7
        }
      ],
      "size": 0.76
    },
    {
      "id": "br-track-palm",
      "type": "path",
      "name": "Palm Forest walking track",
      "points": [
        {
          "x": -3.2,
          "z": -2.9
        },
        {
          "x": -2.8,
          "z": -3.5
        },
        {
          "x": -2.3,
          "z": -4.1
        }
      ],
      "size": 0.8
    },
    {
      "id": "br-track-rosewood",
      "type": "path",
      "name": "Rosewood loop",
      "points": [
        {
          "x": -2.9,
          "z": -3.4
        },
        {
          "x": -1.4,
          "z": -3.8
        },
        {
          "x": -0.6,
          "z": -4.8
        },
        {
          "x": -2.2,
          "z": -5.2
        },
        {
          "x": -3.2,
          "z": -4.3
        },
        {
          "x": -2.9,
          "z": -3.4
        }
      ],
      "size": 0.8
    },
    {
      "id": "br-track-booyong",
      "type": "path",
      "name": "Booyong walking track",
      "points": [
        {
          "x": -1.1,
          "z": -4.6
        },
        {
          "x": 0.2,
          "z": -4.1
        },
        {
          "x": 1.6,
          "z": -3.6
        },
        {
          "x": 2.6,
          "z": -2.9
        }
      ],
      "size": 0.8
    },
    {
      "id": "br-track-red-cedar",
      "type": "path",
      "name": "Red Cedar loop",
      "points": [
        {
          "x": -2.7,
          "z": 1.8
        },
        {
          "x": -1.8,
          "z": 2.2
        },
        {
          "x": -1.15,
          "z": 1.6
        },
        {
          "x": -1.7,
          "z": 0.9
        },
        {
          "x": -2.7,
          "z": 1.8
        }
      ],
      "size": 0.76
    },
    {
      "id": "br-track-border-loop",
      "type": "path",
      "name": "Border Loop walk",
      "points": [
        {
          "x": 3.1,
          "z": -2.2
        },
        {
          "x": 4.1,
          "z": -2.6
        },
        {
          "x": 4.5,
          "z": -3.6
        },
        {
          "x": 3.4,
          "z": -4.1
        },
        {
          "x": 2.8,
          "z": -3.3
        },
        {
          "x": 3.1,
          "z": -2.2
        }
      ],
      "size": 0.84
    },
    {
      "id": "br-area-brindle",
      "type": "area-boundary",
      "name": "Brindle Creek Area",
      "points": [
        {
          "x": -4.7,
          "z": 3.6
        },
        {
          "x": -1.7,
          "z": 4.7
        },
        {
          "x": 0.3,
          "z": 3.3
        },
        {
          "x": -0.5,
          "z": 0.5
        },
        {
          "x": -3.8,
          "z": 0.7
        },
        {
          "x": -4.7,
          "z": 3.6
        }
      ],
      "size": 1.25
    },
    {
      "id": "br-area-bar",
      "type": "area-boundary",
      "name": "Bar Mountain Area",
      "points": [
        {
          "x": -0.4,
          "z": 4.5
        },
        {
          "x": 3.6,
          "z": 3.4
        },
        {
          "x": 4.7,
          "z": 1.2
        },
        {
          "x": 2.4,
          "z": 0.1
        },
        {
          "x": 0.2,
          "z": 1.3
        },
        {
          "x": -0.4,
          "z": 4.5
        }
      ],
      "size": 1.25
    },
    {
      "id": "br-area-sheep",
      "type": "area-boundary",
      "name": "Sheepstation Creek Area",
      "points": [
        {
          "x": -4.3,
          "z": -2.6
        },
        {
          "x": -1.7,
          "z": -2.7
        },
        {
          "x": 0.9,
          "z": -3.1
        },
        {
          "x": 1.2,
          "z": -5
        },
        {
          "x": -2.6,
          "z": -5.7
        },
        {
          "x": -4.3,
          "z": -2.6
        }
      ],
      "size": 1.25
    },
    {
      "id": "br-area-loop",
      "type": "area-boundary",
      "name": "Border Loop Area",
      "points": [
        {
          "x": 2.4,
          "z": -1.8
        },
        {
          "x": 5.2,
          "z": -2.1
        },
        {
          "x": 5.5,
          "z": -4.5
        },
        {
          "x": 2.4,
          "z": -4.7
        },
        {
          "x": 2.4,
          "z": -1.8
        }
      ],
      "size": 1.25
    },
    {
      "id": "br-checkpoint-border",
      "type": "intro-checkpoint",
      "name": "Border Loop lookout",
      "x": 4,
      "z": -3.1,
      "size": 0.86
    },
    {
      "id": "br-checkpoint-blackbutt",
      "type": "sub-checkpoint",
      "name": "Blackbutt lookout",
      "x": 1.8,
      "z": 1.65,
      "size": 0.82
    },
    {
      "id": "br-checkpoint-brushbox",
      "type": "sub-checkpoint",
      "name": "Brushbox Falls lookout",
      "x": -2.1,
      "z": -3.5,
      "size": 0.82
    },
    {
      "id": "br-checkpoint-antarctic",
      "type": "sub-checkpoint",
      "name": "Antarctic Beech picnic area",
      "x": -2.9,
      "z": 2.9,
      "size": 0.82
    },
    {
      "id": "br-totem-brindle",
      "type": "totem",
      "name": "Brindle Creek",
      "x": -3.5,
      "z": 1.05,
      "size": 0.9
    },
    {
      "id": "br-totem-bar",
      "type": "totem",
      "name": "Bar Mountain",
      "x": 2.8,
      "z": 2.55,
      "size": 0.9
    },
    {
      "id": "br-totem-sheep",
      "type": "totem",
      "name": "Sheepstation Creek",
      "x": -2.3,
      "z": -4.7,
      "size": 0.9
    },
    {
      "id": "br-totem-loop",
      "type": "totem",
      "name": "Border Loop",
      "x": 4.75,
      "z": -3.8,
      "size": 0.9
    }
  ],
  "buildSequence": [
    {
      "id": "terrain",
      "title": "1 · Sculpt the terrain",
      "description": "Lay in a broad ridge and three lower creek channels. The shape is a visual reading of the park map, not measured elevation.",
      "terrainEditIds": [
        "br-terrain-ridge",
        "br-terrain-ridge-fold",
        "br-water-brindle",
        "br-water-sheepstation",
        "br-water-loop"
      ],
      "elementIds": []
    },
    {
      "id": "tracks",
      "title": "2 · Add the tracks",
      "description": "Draw the scenic-drive spine first, then connect the named short walks, loops and lookout routes.",
      "terrainEditIds": [
        "br-terrain-ridge",
        "br-terrain-ridge-fold",
        "br-water-brindle",
        "br-water-sheepstation",
        "br-water-loop"
      ],
      "elementIds": [
        "br-track-scenic",
        "br-track-brindle",
        "br-track-bar",
        "br-track-pinnacle",
        "br-track-falcorostrum",
        "br-track-palm",
        "br-track-rosewood",
        "br-track-booyong",
        "br-track-red-cedar",
        "br-track-border-loop"
      ]
    },
    {
      "id": "areas",
      "title": "3 · Mark the main areas",
      "description": "Group the map into the named NPWS areas and place one Area Totem in each.",
      "terrainEditIds": [
        "br-terrain-ridge",
        "br-terrain-ridge-fold",
        "br-water-brindle",
        "br-water-sheepstation",
        "br-water-loop"
      ],
      "elementIds": [
        "br-track-scenic",
        "br-track-brindle",
        "br-track-bar",
        "br-track-pinnacle",
        "br-track-falcorostrum",
        "br-track-palm",
        "br-track-rosewood",
        "br-track-booyong",
        "br-track-red-cedar",
        "br-track-border-loop",
        "br-area-brindle",
        "br-area-bar",
        "br-area-sheep",
        "br-area-loop",
        "br-totem-brindle",
        "br-totem-bar",
        "br-totem-sheep",
        "br-totem-loop"
      ]
    },
    {
      "id": "checkpoints",
      "title": "4 · Place checkpoints",
      "description": "Finish with recognizable lookout and picnic stops so the map has clear destinations.",
      "terrainEditIds": [
        "br-terrain-ridge",
        "br-terrain-ridge-fold",
        "br-water-brindle",
        "br-water-sheepstation",
        "br-water-loop"
      ],
      "elementIds": [
        "br-track-scenic",
        "br-track-brindle",
        "br-track-bar",
        "br-track-pinnacle",
        "br-track-falcorostrum",
        "br-track-palm",
        "br-track-rosewood",
        "br-track-booyong",
        "br-track-red-cedar",
        "br-track-border-loop",
        "br-area-brindle",
        "br-area-bar",
        "br-area-sheep",
        "br-area-loop",
        "br-totem-brindle",
        "br-totem-bar",
        "br-totem-sheep",
        "br-totem-loop",
        "br-checkpoint-border",
        "br-checkpoint-blackbutt",
        "br-checkpoint-brushbox",
        "br-checkpoint-antarctic"
      ]
    }
  ]
};
