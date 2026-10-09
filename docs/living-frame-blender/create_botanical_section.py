"""Visible Blender phase 2: one planted arc, saved separately from the plain ring.

Run in a new window: blender --factory-startup --python create_botanical_section.py
All textures and growth are exported into GLB; runtime text stays independent.
"""
import bpy
import math
import json
import random
from pathlib import Path
from mathutils import Vector
import numpy as np

ROOT = Path(__file__).resolve().parent
TEXTURES = ROOT / 'textures'
TEXTURES.mkdir(exist_ok=True)
RNG = random.Random(48721)
A0, A1 = math.radians(100), math.radians(205)
GROWTH_SECONDS = 36
assets = []


def image(name, pixels):
    height, width = pixels.shape[:2]
    rgba = np.ones((height, width, 4), dtype=np.float32)
    rgba[:, :, :3] = np.clip(pixels, 0, 1)
    result = bpy.data.images.new(name, width=width, height=height, alpha=False)
    result.pixels.foreach_set(rgba.ravel())
    result.filepath_raw = str(TEXTURES / (name + '.png'))
    result.file_format = 'PNG'
    result.save()
    result.pack()
    return result


def textures():
    grid = np.linspace(0, 1, 512, endpoint=False)
    u, v = np.meshgrid(grid, grid)
    gen = np.random.default_rng(8291)
    grain = gen.normal(0, .09, u.shape)
    lumps = np.sin(u*math.tau*9+.8*np.sin(v*math.tau*7))*np.cos(v*math.tau*11)
    relief = .55*lumps + .22*np.sin(u*math.tau*29+v*math.tau*21)+grain
    pores = np.maximum(0, gen.random(u.shape)-.96)*8
    lower = np.stack([.30+.075*relief-pores*.10, .20+.055*relief-pores*.07,
                      .125+.037*relief-pores*.045], axis=-1)
    top = np.stack([.105+.033*relief-pores*.05, .087+.028*relief-pores*.04,
                    .061+.021*relief-pores*.03], axis=-1)
    # Texture-space normal detail for granules, independent of Blender procedural nodes.
    dy, dx = np.gradient(relief)
    norm = np.stack([-dx*1.8, -dy*1.8, np.ones_like(dx)], axis=-1)
    norm /= np.linalg.norm(norm, axis=-1, keepdims=True)
    soil_normal = image('soil-normal', norm*.5+.5)
    lower_image, top_image = image('lower-soil-color', lower), image('dark-topsoil-color', top)
    grid = np.linspace(0, 1, 256)
    u, v = np.meshgrid(grid, grid)
    midrib = np.exp(-((u-.5)/.018)**2)
    side_veins = np.exp(-(np.sin((v-abs(u-.5)*.48)*math.tau*8)/.14)**2)
    shine = np.maximum(0, 1-abs(u-.5)*1.7)
    leaf = np.stack([.25+.07*shine+.13*midrib+.035*side_veins,
                     .53+.12*shine+.09*midrib+.028*side_veins,
                     .16+.05*shine+.055*midrib+.018*side_veins], axis=-1)
    return lower_image, top_image, soil_normal, image('leaf-vein-color', leaf)


def material(name, colour, rough=.8, colour_image=None, normal_image=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*colour, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*colour, 1)
    bsdf.inputs['Roughness'].default_value = rough
    if colour_image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = colour_image
        mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if normal_image:
        tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = normal_image
        tex.image.colorspace_settings.name = 'Non-Color'
        normal = mat.node_tree.nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = .36
        mat.node_tree.links.new(tex.outputs['Color'], normal.inputs['Color'])
        mat.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


class Mesh:
    def __init__(self):
        self.vertices, self.faces, self.uvs = [], [], []

    def add(self, vertices, faces, uvs=None):
        offset = len(self.vertices)
        self.vertices.extend(tuple(p) for p in vertices)
        self.faces.extend(tuple(offset+i for i in face) for face in faces)
        self.uvs.extend(uvs or [(0, 0)]*len(vertices))

    def object(self, name, mat, origin=(0,0,0), smooth=True):
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(self.vertices, [], self.faces);mesh.update()
        layer = mesh.uv_layers.new(name='UVMap')
        for polygon in mesh.polygons:
            polygon.use_smooth = smooth
            for loop in polygon.loop_indices:
                layer.data[loop].uv = self.uvs[mesh.loops[loop].vertex_index]
        obj = bpy.data.objects.new(name, mesh)
        botanical.objects.link(obj);obj.location = origin
        obj.data.materials.append(mat);assets.append(obj)
        return obj


def polar(angle, radius, y):
    return Vector((math.cos(angle)*radius, y, math.sin(angle)*radius))


def tube(mesh, points, width, sides=5):
    points = list(map(Vector, points)); verts=[];uvs=[];faces=[]
    for i,p in enumerate(points):
        tangent=(points[min(i+1,len(points)-1)]-points[max(0,i-1)]).normalized()
        normal=tangent.cross(Vector((0,1,0)))
        if normal.length < .01:normal=tangent.cross(Vector((1,0,0)))
        normal.normalize();other=tangent.cross(normal).normalized()
        radius=width*(1-.75*i/(len(points)-1))
        for j in range(sides):
            a=j*math.tau/sides
            verts.append(p+radius*(normal*math.cos(a)+other*math.sin(a)))
            uvs.append((j/sides,i/(len(points)-1)))
    for i in range(len(points)-1):
        for j in range(sides):
            k=(j+1)%sides;faces.append((i*sides+j,i*sides+k,(i+1)*sides+k,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    mesh.add(verts,faces,uvs)


def leaf(mesh, base, tip, width, curl=.006):
    base,tip=Vector(base),Vector(tip);axis=(tip-base).normalized()
    side=axis.cross(Vector((0,1,0))).normalized()
    if side.length<.01:side=Vector((1,0,0))
    verts=[];uvs=[];faces=[]
    for i in range(9):
        t=i/8;centre=base+(tip-base)*t
        w=width*(math.sin(math.pi*t)**.8)*.5+.0002
        for j in range(3):
            across=j-1
            point=centre+side*w*across+Vector((0,-curl*math.sin(math.pi*t)*(1-.35*abs(across)),0))
            verts.append(point);uvs.append((j/2,t))
    for i in range(8):
        for j in range(2):
            k=i*3+j;faces.append((k,k+1,k+4,k+3))
    mesh.add(verts,faces,uvs)


def growth(obj, delay, established=.55, duration=12):
    for second,scale in [(0,established),(delay,established),(delay+duration,1)]:
        obj.scale=(scale,)*3;obj.keyframe_insert(data_path='scale',frame=round(second*24)+1)


def build():
    global botanical
    scene=bpy.context.scene
    scene.render.fps=24;scene.frame_start=1;scene.frame_end=GROWTH_SECONDS*24+1
    botanical=bpy.data.collections.new('BOTANICAL DRAFT - one 105 degree section')
    scene.collection.children.link(botanical)
    lower_img,top_img,soil_normal,leaf_img=textures()
    lower=material('Brown lower soil',(.30,.20,.125),colour_image=lower_img,normal_image=soil_normal)
    top=material('Dark organic topsoil',(.105,.087,.061),colour_image=top_img,normal_image=soil_normal)
    rootmat=material('Fine warm roots',(.46,.32,.16),.95)
    stemmat=material('Living stems',(.17,.26,.058),.70)
    broadmat=material('Glossy oval groundcover',(.25,.58,.12),.37,colour_image=leaf_img)
    # Shared vein atlas; node tint is provided as glTF material base factor below.
    fine=material('Fine creeping foliage',(.21,.37,.10),.68)
    silver=material('Soft sage foliage',(.39,.47,.26),.72)
    blossom=material('Small pale pink blossoms',(.88,.70,.77),.66)
    centre=material('Warm flower centres',(.83,.54,.11),.70)
    litter=material('Organic litter',(.28,.18,.085),.95)

    # A real extruded, uneven cross-section: brown mineral bed beneath dark organic layer.
    for name,mat,r0,r1 in [('Brown soil section',lower,.834,.891),('Dark topsoil section',top,.891,.924)]:
        mesh=Mesh();n=90;rows=6;verts=[];uvs=[];faces=[]
        for yside in range(2):
            for i in range(n+1):
                a=A0+(A1-A0)*i/n
                for j in range(rows+1):
                    fraction=j/rows
                    noise=(math.sin(a*43+j*1.7)+.4*math.cos(a*79-j*3))*.002
                    radius=r0+(r1-r0)*fraction+noise*math.sin(math.pi*fraction)
                    if j==rows and r1>.92:radius+=.003*math.sin(a*71)
                    y=(-.102-.004*math.sin(a*37+j*2)) if yside==0 else .093
                    verts.append(polar(a,radius,y));uvs.append((i/n*5,fraction*.65+yside*.7))
        stride=rows+1;half=(n+1)*stride
        for s in range(2):
            for i in range(n):
                for j in range(rows):
                    k=s*half+i*stride+j
                    face=(k,k+stride,k+stride+1,k+1)
                    faces.append(face if s==0 else tuple(reversed(face)))
        for i in range(n):
            for j in [0,rows]:
                k=i*stride+j;faces.append((k,k+half,k+stride+half,k+stride))
        for i in [0,n]:
            for j in range(rows):
                k=i*stride+j;faces.append((k,k+1,k+1+half,k+half))
        mesh.add(verts,faces,uvs);mesh.object(name,mat,smooth=False)

    roots=Mesh();grit=Mesh();dead=Mesh()
    for plant in range(18):
        angle=A0+.07+(A1-A0-.14)*plant/17
        for branch in range(3):
            end_angle=angle+RNG.uniform(-.022,.022)
            points=[]
            for i in range(14):
                t=i/13;a=angle+(end_angle-angle)*t+.005*math.sin(t*7+branch)
                points.append(polar(a,.908-.066*t,-.109-.002*math.sin(t*9)))
            tube(roots,points,RNG.uniform(.0007,.0013))
            for t0 in [.35,.62]:
                start=points[round(t0*13)]
                twig=[start+Vector((math.cos(angle)*(-.011*t),-.001,math.sin(angle)*(-.011*t)))+Vector((math.sin(angle)*.009*t,0,-math.cos(angle)*.009*t)) for t in np.linspace(0,1,5)]
                tube(roots,twig,.00043,4)
    roots.object('Established root network at planted section',rootmat)
    # Low-poly aggregates break the flat silhouette; litter follows the outer bed.
    for i in range(125):
        a=RNG.uniform(A0,A1);r=RNG.uniform(.851,.923);p=polar(a,r,-.111)
        size=RNG.uniform(.0008,.0036)
        verts=[p+Vector((math.cos(k*math.tau/5)*size,0,math.sin(k*math.tau/5)*size)) for k in range(5)]+[p+Vector((0,-size*.65,0))]
        grit.add(verts,[(k,(k+1)%5,5) for k in range(5)])
    grit.object('Scattered soil aggregates',lower,smooth=False)
    for i in range(26):
        a=RNG.uniform(A0,A1);base=polar(a,RNG.uniform(.902,.923),-.112)
        leaf(dead,base,base+Vector((RNG.uniform(-.012,.012),-.003,RNG.uniform(-.012,.012))),RNG.uniform(.002,.005),.001)
    dead.object('Quiet litter at groundcover base',litter)

    # Eighteen uneven clusters. Most leaves already exist; only three new shoots emerge.
    for i in range(18):
        a=A0+.04+(A1-A0-.08)*i/17+RNG.uniform(-.017,.017)
        anchor=polar(a,RNG.uniform(.918,.925),RNG.uniform(-.075,-.045))
        radial=Vector((math.cos(a),0,math.sin(a)));tangent=Vector((-math.sin(a),0,math.cos(a)))
        leaves=Mesh();stems=Mesh();kind=i%3
        if kind==0:
            count=14;mat=broadmat
            for j in range(count):
                rotation=j*2.39996;length=RNG.uniform(.026,.056)
                base=radial*RNG.uniform(0,.013)+Vector((0,-RNG.uniform(0,.03),0))
                direction=radial*.55+tangent*math.sin(rotation)*.7+Vector((0,-.75-.2*math.cos(rotation),0))
                tip=base+direction.normalized()*length
                tube(stems,[Vector((0,0,0)),base,tip*.92],.00075,4)
                leaf(leaves,base,tip,RNG.uniform(.012,.024),.007)
        elif kind==1:
            mat=fine
            for branch in range(5):
                direction=radial*.60+tangent*RNG.uniform(-.8,.8)+Vector((0,-.9,0))
                reach=RNG.uniform(.048,.095)
                tip=direction.normalized()*reach
                tube(stems,[Vector((0,0,0)),tip*.5,tip],.00065,4)
                for k in range(1,7):
                    base=tip*k/7
                    for sign in [-1,1]:
                        leaf(leaves,base,base+tangent*sign*.014+radial*.008+Vector((0,-.009,0)),.004,.002)
        else:
            mat=silver
            for j in range(22):
                angle=j*2.39996;length=RNG.uniform(.019,.036)
                base=radial*RNG.uniform(0,.013)
                tip=base+radial*.015+tangent*math.sin(angle)*length+Vector((0,-length*(.6+.4*math.cos(angle)),0))
                leaf(leaves,base,tip,RNG.uniform(.004,.008),.003)
                tube(stems,[Vector((0,0,0)),base,tip*.80],.0004,4)
        leaf_obj=leaves.object(f'Groundcover {i+1:02d} - '+['oval','creeping','sage'][kind],mat,anchor)
        stem_obj=stems.object(f'Stems {i+1:02d}',stemmat,anchor)
        for obj in [leaf_obj,stem_obj]:growth(obj,3+i*.8,.66 if kind==0 else .74,12)
        # New shoots are deliberate, sparse events; roots share the shoot's anchor.
        if i in [2,9,15]:
            shoot=Mesh();tip=radial*.052+Vector((0,-.034,0));leaf(shoot,tip*.25,tip,.018,.005)
            obj=shoot.object(f'New shoot {i:02d}',broadmat,anchor)
            growth(obj,8+i*.7,.025,10)
            feeder=Mesh();target=polar(a,.854,-.113)-anchor
            tube(feeder,[Vector((0,0,0)),target*.4,target*.75,target],.0009,5)
            obj=feeder.object(f'Developing root {i:02d}',rootmat,anchor)
            growth(obj,6+i*.7,.025,13)

    # Two short trailing stems extend outwards, never into the protected text disc.
    trails=Mesh();trail_leaves=Mesh()
    for offset in [0,.15]:
        a=A1-.12-offset;start=polar(a,.936,-.06)
        points=[start+Vector((-.03*math.sin(t*3),-.016*math.sin(t*2),-.13*t)) for t in np.linspace(0,1,16)]
        tube(trails,points,.00085,5)
        for i,p in enumerate(points[2::2]):
            for sign in [-1,1]:leaf(trail_leaves,p,p+Vector((sign*.014,-.004,-.007)),.006,.002)
    trails.object('Trailing stems',stemmat);trail_leaves.object('Trailing paired leaves',fine)
    petals=Mesh();centres=Mesh()
    for i in range(7):
        a=A0+.12+(A1-A0-.24)*i/6
        base=polar(a,.948,-.133)
        for j in range(5):
            phi=j*math.tau/5;tip=base+Vector((math.cos(phi)*.008,-.002,math.sin(phi)*.008))
            leaf(petals,base,tip,.0045,.001)
        p=base+Vector((0,-.0025,0));size=.0018
        centres.add([p+Vector((math.cos(j*math.tau/8)*size,0,math.sin(j*math.tau/8)*size)) for j in range(8)],[tuple(range(8))])
    petals.object('Seven small flowers',blossom);centres.object('Flower centres',centre)

    # Runtime selection excludes text, cameras and references, retaining the plain scaffold.
    ring=bpy.data.objects.get('Living Frame - plain ring prototype');assets.append(ring)
    scene.frame_set(scene.frame_end)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in assets:obj.select_set(True)
    bpy.context.view_layer.objects.active=ring
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'botanical-section.glb'),export_format='GLB',
                              use_selection=True,export_apply=True,export_animations=True,
                              export_animation_mode='SCENE',export_extras=True,export_cameras=False)
    scene.render.engine='CYCLES';scene.cycles.samples=24
    scene.cycles.use_denoising=True
    scene.render.resolution_x=1300;scene.render.resolution_y=1000
    scene.world.use_nodes=True
    scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.09,.12,.14,1)
    scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.45
    def light(name,location,power,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
        obj.rotation_euler=(Vector((-.6,0,.3))-obj.location).to_track_quat('-Z','Y').to_euler()
    light('Soft daylight',(-2,-3,4),420,3)
    light('Front fill',(2,-2,1),180,3)
    light('Leaf edge light',(-1,1,3),260,2)
    def camera(name,location,target,scale):
        data=bpy.data.cameras.new(name);data.type='ORTHO';data.ortho_scale=scale
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
        obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
        return obj
    wide=camera('Botanical perspective',(-2.0,-3.8,1.6),(0,0,0),2.9)
    close=camera('Botanical detail',(-1.5,-1.8,.78),(-.79,-.04,.36),.76)
    scene.camera=wide
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active;space.shading.type='MATERIAL'
                space.region_3d.view_location=(0,0,0);space.region_3d.view_distance=3.2
                space.region_3d.view_rotation=wide.rotation_euler.to_quaternion()
                space.region_3d.view_perspective='ORTHO'
    source=bpy.data.texts.new('create_botanical_section.py');source.write(Path(__file__).read_text())
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'botanical-section.blend'))
    (ROOT/'botanical-dimensions.json').write_text(json.dumps(dict(stage=2,arc_degrees=[100,205],
       growth_seconds=GROWTH_SECONDS,texture_count=4,groundcover_clusters=18,new_shoots=3,
       base_opening_diameter_m=1.664,protected_reading_radius_m=.8,
       minimum_soil_radius_m=.834,glb_contains_text=False),indent=2))
    for cam,name in [(wide,'botanical-perspective.png'),(close,'botanical-detail.png')]:
        scene.camera=cam;scene.render.filepath=str(ROOT/name);bpy.ops.render.render(write_still=True)
    scene.camera=wide
    print('BOTANICAL_SECTION_READY',ROOT,flush=True)
    return None


def create():
    window=bpy.context.window_manager.windows[0]
    area=next(area for area in window.screen.areas if area.type=='VIEW_3D')
    region=next(region for region in area.regions if region.type=='WINDOW')
    with bpy.context.temp_override(window=window,area=area,region=region):
        return build()


if __name__=='__main__':
    # Opening a file invalidates the caller's context; obtain a fresh viewport
    # context in the deferred callback rather than exporting from the old one.
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'plain-ring.blend'))
    if bpy.app.background:create()
    else:bpy.app.timers.register(create,first_interval=2)
