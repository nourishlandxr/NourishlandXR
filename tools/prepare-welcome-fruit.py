"""Run with Blender --background --python this-file. Originals stay in Downloads.
Decimate the scan, limit texture resolution, and export ordinary uncompressed
glTF geometry compatible with the app's existing loader.
"""
import bpy, pathlib, tempfile
ROOT=pathlib.Path(__file__).resolve().parent.parent
OUT=ROOT/'app/assets/welcome-practice'
OUT.mkdir(parents=True,exist_ok=True)
WORK=ROOT/'.tmp/welcome-fruit'
WORK.mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(WORK)
for name,output,target in [('cara_cara_orange','orange',1500),('lime_game_ready__2k_pbr','lime',2176),('banana_3d_scan','banana',10000)]:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(pathlib.Path.home()/'Downloads'/(name+'.glb')))
    total_triangles=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH')
    for obj in list(bpy.data.objects):
        if obj.type!='MESH': continue
        triangles=sum(len(p.vertices)-2 for p in obj.data.polygons)
        if total_triangles>target:
            bpy.context.view_layer.objects.active=obj
            modifier=obj.modifiers.new('XR tabletop budget','DECIMATE')
            modifier.ratio=target/total_triangles
            modifier.use_collapse_triangulate=True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    for image in bpy.data.images:
        if image.type!='IMAGE' or not image.size[0]: continue
        if max(image.size)>1024:
            ratio=1024/max(image.size)
            image.scale(max(1,round(image.size[0]*ratio)),max(1,round(image.size[1]*ratio)))
    bpy.ops.export_scene.gltf(filepath=str(OUT/(output+'.glb')),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=85,export_extras=True,export_cameras=False,export_lights=False)
    print('WELCOME_ASSET',output,'triangles',sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
