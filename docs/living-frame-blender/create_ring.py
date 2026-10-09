"""Run visibly: blender --factory-startup --python create_ring.py.

Stage-one asset only. Re-run only in a fresh Blender window: this resets its scene.
Blender X/Z is the upright opening; -Y is the viewer-facing side.
glTF export becomes X/Y upright with +Z facing the viewer, in metres.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
INNER_RADIUS = 0.832  # 520 canvas px * 0.0016 m/px
OUTER_RADIUS = 0.912  # proposed 80 mm face width, subject to review
DEPTH = 0.180
SEGMENTS = 160


def material(name, colour):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*colour, 1)
    shader.inputs['Roughness'].default_value = 0.82
    shader.inputs['Metallic'].default_value = 0
    return mat


def aim(obj, point=(0, 0, 0)):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def create():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 1050
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    shade = scene.display.shading
    shade.light = 'STUDIO'
    shade.studiolight_rotate_z = math.radians(25)
    shade.color_type = 'MATERIAL'
    shade.show_shadows = True
    shade.show_cavity = True
    shade.cavity_type = 'BOTH'
    shade.background_type = 'WORLD'
    scene.world.color = (0.035, 0.048, 0.052)

    # Four loops joined into one watertight annular solid, without a filled centre.
    vertices, faces = [], []
    for y, radius in [(-DEPTH / 2, OUTER_RADIUS), (-DEPTH / 2, INNER_RADIUS),
                      (DEPTH / 2, OUTER_RADIUS), (DEPTH / 2, INNER_RADIUS)]:
        for i in range(SEGMENTS):
            angle = 2 * math.pi * i / SEGMENTS
            vertices.append((radius * math.cos(angle), y, radius * math.sin(angle)))
    for i in range(SEGMENTS):
        j = (i + 1) % SEGMENTS
        faces.extend([(i, j, SEGMENTS+j, SEGMENTS+i),
                      (2*SEGMENTS+j, 2*SEGMENTS+i, 3*SEGMENTS+i, 3*SEGMENTS+j),
                      (j, i, 2*SEGMENTS+i, 2*SEGMENTS+j),
                      (SEGMENTS+i, SEGMENTS+j, 3*SEGMENTS+j, 3*SEGMENTS+i)])
    mesh = bpy.data.meshes.new('Plain annulus - four closed surfaces')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    ring = bpy.data.objects.new('Living Frame - plain ring prototype', mesh)
    scene.collection.objects.link(ring)
    ring.data.materials.append(material('Plain warm clay - no soil artwork', (0.34, 0.25, 0.18)))
    for polygon in mesh.polygons:
        polygon.use_smooth = polygon.index % 4 in (2, 3)
    bevel = ring.modifiers.new('Small edge bevel - 6 mm', 'BEVEL')
    bevel.width = 0.006
    bevel.segments = 3
    ring['stage'] = 'Plain form review only - not production or headset verified'
    ring['aperture_diameter_m'] = 2 * INNER_RADIUS
    ring['outer_diameter_m'] = 2 * OUTER_RADIUS
    ring['depth_m'] = DEPTH

    reference = bpy.data.collections.new('REFERENCE ONLY - never exported')
    scene.collection.children.link(reference)
    reference_mat = material('Text clearance reference', (0.075, 0.14, 0.17))
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=0.800, depth=0.008,
                                      location=(0, 0.004, 0), rotation=(math.pi/2, 0, 0))
    disc = bpy.context.object
    disc.name = 'Reference - protected reading radius 500 px'
    for collection in list(disc.users_collection):
        collection.objects.unlink(disc)
    reference.objects.link(disc)
    disc.data.materials.append(reference_mat)
    text_mat = material('Reference lettering', (0.75, 0.88, 0.79))
    for label, z, size in [('TEXT AREA REFERENCE', 0.31, 0.063),
                           ('Take a moment', 0.09, 0.092),
                           ('to look around', -0.055, 0.092),
                           ('Current text remains separate', -0.30, 0.047),
                           ('Not part of exported GLB', -0.40, 0.041)]:
        curve = bpy.data.curves.new(label, 'FONT')
        curve.body = label
        curve.align_x = 'CENTER'
        curve.size = size
        obj = bpy.data.objects.new(label, curve)
        reference.objects.link(obj)
        obj.location = (0, -0.008, z)
        obj.rotation_euler = (math.pi/2, 0, 0)
        obj.data.materials.append(text_mat)

    views = [('Front', (0, -4, 0), 2.65),
             ('Side', (4, -0.25, 0.12), 2.55),
             ('Perspective', (2.5, -3.7, 1.8), 2.75)]
    cameras = []
    for name, location, scale in views:
        data = bpy.data.cameras.new(name + ' review')
        camera = bpy.data.objects.new(name + ' review', data)
        scene.collection.objects.link(camera)
        camera.location = location
        aim(camera)
        data.type = 'ORTHO'
        data.ortho_scale = scale
        cameras.append(camera)
    bpy.ops.object.select_all(action='DESELECT')
    ring.select_set(True)
    bpy.context.view_layer.objects.active = ring
    # References and cameras cannot accidentally become part of the runtime asset.
    bpy.ops.export_scene.gltf(filepath=str(ROOT / 'plain-ring.glb'), export_format='GLB',
                              use_selection=True, export_apply=True, export_animations=False,
                              export_extras=True, export_cameras=False)
    scene.camera = cameras[-1]
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == 'VIEW_3D':
                space = area.spaces.active
                space.shading.type = 'SOLID'
                space.shading.color_type = 'MATERIAL'
                space.shading.show_cavity = True
                space.overlay.show_floor = False
                space.overlay.show_axis_x = False
                space.overlay.show_axis_y = False
                space.region_3d.view_location = (0, 0, 0)
                space.region_3d.view_distance = 3.3
                space.region_3d.view_rotation = cameras[-1].rotation_euler.to_quaternion()
                space.region_3d.view_perspective = 'ORTHO'
    text = bpy.data.texts.new('README - ring review')
    text.write('STAGE 1: Plain ring only.\nNumpad 1: front; Numpad 3: side; middle mouse: orbit.\n'
               'Opening 1.664 m; outside 1.824 m; depth 0.180 m.\n'
               'REFERENCE ONLY collection is excluded from GLB.\n'
               'Ring is in X/Z, front = -Y. glTF: X/Y, front = +Z.\n'
               'Text and all runtime features remain unchanged.\n')
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'plain-ring.blend'))
    metadata = dict(inner_radius_m=INNER_RADIUS, outer_radius_m=OUTER_RADIUS,
                    depth_m=DEPTH, face_width_m=OUTER_RADIUS-INNER_RADIUS,
                    protected_reading_radius_m=0.800, source_pixel_to_m=0.0016,
                    gltf_axes='X right, Y up, Z towards viewer',
                    source_scene_origin_canvas_px=[1250, 1060],
                    text_reference_exported=False, blender=bpy.app.version_string)
    (ROOT / 'dimensions.json').write_text(json.dumps(metadata, indent=2))
    for camera in cameras:
        scene.camera = camera
        scene.render.filepath = str(ROOT / (camera.name.split()[0].lower() + '.png'))
        bpy.ops.render.render(write_still=True)
    scene.camera = cameras[-1]
    print('RING_PROTOTYPE_READY', ROOT, flush=True)
    return None


if __name__ == '__main__':
    # Let the visible window open before generation. Keep it open after finishing.
    if bpy.app.background:
        create()
    else:
        bpy.app.timers.register(create, first_interval=2.0)
