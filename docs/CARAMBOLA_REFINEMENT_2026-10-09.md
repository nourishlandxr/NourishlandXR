# Carambola Fruit Window refinement

Version 0.9412. Blender 5.2.2 LTS; photographic references supplied by the user.

The fruit now has broader, rounded five-wing geometry with uneven shoulders, fine freckles, wax variation, green fin margins and subtle edge wear. Two fruiting branches carry four fruits each. Fourteen compound leaves contain 108 separate curved leaflets, with petioles, fine veins and distinct underside material. Ripe and developing fruits vary in scale and orientation.

Embedded albedo, normal and roughness maps survive GLB export. The native Fruit Window renderer opts into normal/roughness shading; Living Map rendering keeps its existing shader. All meshes retain the stage roots, harvest proxy and educational transverse cutaway pivots.

Botanical reference: [UF/IFAS Carambola Growing in the Florida Home Landscape](https://ask.ifas.ufl.edu/publication/MG269). Photos are references; no stock photographs are embedded in the assets.

## Authoring and review

Run tools/blender/refine_carambola.py in Blender with --source pointing to the previous editable Fruit Window folder and --output pointing to a new folder. The source folder requires Fruit_Discovery_Window.blend and runtime-manifest.json. The exported files are carambola_scene.glb, carambola_ripe.glb, Carambola_Refined_Fruit_Window.blend and three rendered PNGs.

The editable source and runtime exports are backed up under C:/FILES/Projects/banyula 2026/Plants images/3d/Carambola - Refined - 2026-10-09. Earlier source files remain in their existing folders. The new source includes the original other species and frame; only the carambola GLBs are updated in the app.

Review tools/preview-carambola-refinement.html for the actual native stereo renderer, Grow/Pick/Open/Return, hover and two-grip checks. Physical Quest performance and headset visual review remain pending. The geometry is more natural but still an authored CG asset, not a photogrammetry scan.
