"""True-3D property blockout from the user's single reference image.

Approximate forms/dimensions only. No flat landscape plane or panorama in GLB.
Run visibly with Blender --python this_file.py. Original art/ring assets preserved.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
rng=random.Random(61010)

def material(name,colour,rough=.9):
    m=bpy.data.materials.new(name);m.diffuse_color=(*colour,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*colour,1);bs.inputs['Roughness'].default_value=rough
    return m

def height(x,distance):
    h=-1.6-.24*distance-1.2*math.exp(-((distance-18)/9)**2)
    h+=.70*math.sin(x*.18+distance*.10)+.20*math.sin(distance*.75)
    # A foreground descent rather than a raised lip hiding the lower dam.
    h-=2.8*math.exp(-((distance-7)/4)**2)
    # Soft terraced bands along the descent, with a mostly level pond hollow.
    h+=.23*math.sin(distance*1.0)*math.exp(-((distance-12)/15)**2)
    # The house sits on the higher left bench beyond the foreground dam.
    h+=4.0*math.exp(-((x+6)/8)**2-((distance-20)/10)**2)
    r=math.hypot((x-2)/5.3,(distance-11)/4.2)
    blend=max(0,min(1,(1.35-r)/.35));blend=blend*blend*(3-2*blend)
    return h*(1-blend)+(-8.0)*blend

def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.materials.append(mat)
    obj=bpy.data.objects.new(name,data);bpy.context.scene.collection.objects.link(obj);return obj

def cube(name,location,scale,mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.view_layer.objects.active;o.name=name;o.scale=scale;o.data.materials.append(mat);return o

def tree(x,y,size,mats,conifer=False):
    base=height(x,y)
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=size*.045,radius2=size*.025,depth=size*.70,location=(x,y,base+size*.35))
    trunk=bpy.context.view_layer.objects.active;trunk.name='Tree trunk';trunk.data.materials.append(mats['wood'])
    if conifer:
        for i in range(5):
            bpy.ops.mesh.primitive_cone_add(vertices=12,radius1=size*(.21-i*.024),radius2=size*.04,depth=size*.33,location=(x,y,base+size*(.35+i*.13)))
            o=bpy.context.view_layer.objects.active;o.name='Conifer branching tier';o.data.materials.append(mats['leaves'][i%3])
    else:
        for j in range(3):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=(x+rng.uniform(-.6,.6),y+rng.uniform(-.6,.6),base+size*(.60+j*.10)))
            o=bpy.context.view_layer.objects.active;o.name='Tree crown volume';o.scale=(size*.30,size*.28,size*.27);o.data.materials.append(mats['leaves'][rng.randrange(3)])
            for face in o.data.polygons:face.use_smooth=True

def create():
    scene=bpy.context.scene
    mats={'grass':material('Terraced grass',(.19,.31,.13)), 'dry':material('Dry mulch and paths',(.48,.39,.24)),
          'wall':material('House pale weatherboards',(.63,.57,.43)), 'roof':material('Pale metal roof',(.64,.68,.65),.55),
          'wood':material('Veranda timber',(.22,.12,.06)), 'glass':material('Window blue grey',(.13,.23,.25),.38),
          'water':material('Pond water',(.23,.32,.30),.20),
          'leaves':[material('Canopy tone '+str(i),c) for i,c in enumerate([(.08,.18,.075),(.12,.25,.10),(.18,.29,.12)])]}
    cols,rows=48,60;verts=[];faces=[]
    for row in range(rows+1):
        y=.12+row/rows*56
        for col in range(cols+1):
            x=-28+col/cols*56;verts.append((x,y,height(x,y)))
    for row in range(rows):
        for col in range(cols):
            a=row*(cols+1)+col;faces.append((a,a+1,a+cols+2,a+cols+1))
    terrain=mesh('Descending terraced terrain',verts,faces,mats['grass'])
    colours=terrain.data.color_attributes.new(name='Terrain colour',type='FLOAT_COLOR',domain='POINT')
    for index,(x,y,z) in enumerate(verts):
        dry=.20+.24*(.5+.5*math.sin(y*.8+x*.20));g=(.19,.31,.13);s=(.46,.38,.22)
        colours.data[index].color=tuple(g[i]*(1-dry)+s[i]*dry for i in range(3))+(1,)
    bs=mats['grass'].node_tree.nodes.get('Principled BSDF');attribute=mats['grass'].node_tree.nodes.new('ShaderNodeVertexColor');attribute.layer_name='Terrain colour';mats['grass'].node_tree.links.new(attribute.outputs['Color'],bs.inputs['Base Color'])
    for p in terrain.data.polygons:p.use_smooth=True
    # Reflective pond surface is flat, visibly below the hilltop, with an irregular bank.
    outline=[]
    for i in range(64):
        a=i*math.tau/64;r=1+.06*math.sin(a*3)+.035*math.cos(a*5)
        outline.append((2+5.0*math.cos(a)*r,11+3.8*math.sin(a)*r,-7.96))
    mesh('Lower pond surface',outline,[tuple(range(64))],mats['water'])
    bank=[];bankfaces=[]
    for i,(x,y,z) in enumerate(outline):
        bank.extend([(x,y,-7.97),(2+(x-2)*1.08,11+(y-11)*1.08,-7.91)])
    for i in range(64):bankfaces.append((i*2,(i*2+2)%128,(i*2+3)%128,i*2+1))
    mesh('Pond bank',bank,bankfaces,mats['dry'])
    # Track descends past house, planting bands and pond; follows the actual mesh height.
    path=[];pf=[]
    for i in range(65):
        y=1+i*.55;x=6+1.3*math.sin(y*.11)
        path.extend([(x-.4,y,height(x-.4,y)+.025),(x+.4,y,height(x+.4,y)+.025)])
        if i:pf.append((i*2-2,i*2-1,i*2+1,i*2))
    mesh('Descending track',path,pf,mats['dry'])
    hx,hy=-6.0,20.0;hz=height(hx,hy)+.3
    cube('Veranda house', (hx,hy,hz+1.2),(5.0,3.4,2.4),mats['wall'])
    roof=cube('Low pale roof',(hx,hy-.15,hz+2.48),(5.65,4.4,.14),mats['roof']);roof.rotation_euler.x=.045
    cube('Veranda deck',(hx,hy-2.45,hz+.12),(5.7,1.8,.16),mats['wood'])
    cover=cube('Veranda roof',(hx,hy-2.42,hz+2.38),(5.8,1.9,.10),mats['roof']);cover.rotation_euler.x=.055
    for dx in [-2.65,-1.4,0,1.4,2.65]:
        cube('Veranda post',(hx+dx,hy-3.14,hz+1.25),(.085,.085,2.5),mats['wood'])
        cube('House supporting stilt',(hx+dx,hy-2.95,hz-.55),(.12,.12,1.3),mats['wood'])
    for z in [.68,1.10]:cube('Veranda rail',(hx,hy-3.15,hz+z),(5.5,.065,.065),mats['wood'])
    for dx in [-1.62,1.62]:cube('Front window',(hx+dx,hy-1.714,hz+1.35),(.75,.035,.84),mats['glass'])
    cube('Front door',(hx,hy-1.72,hz+1.01),(.7,.035,1.9),mats['wood'])
    tree(hx,hy+4.3,8.6,mats,True)
    for band in [5,14,18,24,28,40,48]:
        for x in [-20,-15,-10,-5,0,5,10,15,20]:
            tx=x+rng.uniform(-1,1);ty=band+rng.uniform(-1.4,1.4)
            if -9.5<tx<-2.5 and 16<ty<23:continue
            if math.hypot((tx-2)/7,(ty-11)/6)<1.1:continue
            tree(tx,ty,rng.uniform(2.3,5.5) if abs(tx)<12 else rng.uniform(4.5,7.5),mats)
    # User-described climate zones, expressed as volumes at this blockout stage.
    # Temperate orchard below the dam: foreground crowns with an open sightline.
    for x,y,size in [(-7,4,3.7),(-4,3,2.4),(7,3,2.5),(12,5,4.2),(-13,6,4.8)]:
        tree(x,y,size,mats)
    # Low mixed food-forest canopy flanking both sides of the veranda house.
    for x in [-14,-11,-1,2,5,9]:
        for y in [16,20,25]:
            tree(x+rng.uniform(-.5,.5),y+rng.uniform(-.6,.6),rng.uniform(1.6,3.0),mats)
    # Visible contour terraces beside the house, with planting rather than tall spikes.
    for distance in [16,20,25]:
        for start,end in [(-19,-10),(-1,15)]:
            bandverts=[];bandfaces=[]
            for i in range(25):
                x=start+(end-start)*i/24
                bandverts.extend([(x,distance,height(x,distance)+.035),(x,distance+.55,height(x,distance+.55)+.035)])
                if i:bandfaces.append((2*i-2,2*i-1,2*i+1,2*i))
            mesh('Food forest contour terrace',bandverts,bandfaces,mats['dry'])
    # Native editable geometry remains in the .blend; only mesh copies are batched for GLB.
    original=[o for o in scene.objects if o.type=='MESH']
    scene.world=bpy.data.worlds.new('Overcast property sky');scene.world.color=(.45,.53,.57)
    bpy.ops.object.camera_add(location=(0,-1.8,0));camera=bpy.context.view_layer.objects.active;camera.name='Hilltop viewer';camera.rotation_euler=(Vector((0,18,-6))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=31;scene.camera=camera
    bpy.ops.object.light_add(type='AREA',location=(-8,-8,18));bpy.context.view_layer.objects.active.data.energy=1800;bpy.context.view_layer.objects.active.data.size=14
    bpy.ops.object.light_add(type='SUN');bpy.context.view_layer.objects.active.rotation_euler=(.3,-.3,-.4);bpy.context.view_layer.objects.active.data.energy=1.5
    for filename,x,name in [('property-reference-v2.png',-40,'User property photograph'),('property-painting-v1.png',-66,'Painterly style reference')]:
        image=bpy.data.images.load(str(ROOT/filename));image.pack()
        ref=bpy.data.objects.new(name+' - not exported',None);scene.collection.objects.link(ref);ref.empty_display_type='IMAGE';ref.data=image;ref.empty_display_size=24;ref.location=(x,12,10);ref.rotation_euler=(math.pi/2,0,0);ref.hide_render=True
    source=bpy.data.texts.new('create_hilltop.py');source.write(Path(__file__).read_text())
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type=='VIEW_3D':
                space=area.spaces.active;space.shading.type='SOLID';space.shading.color_type='MATERIAL';space.region_3d.view_perspective='CAMERA';space.region_3d.view_camera_zoom=0
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'hilltop-property-v1.blend'))
    batches={}
    for o in original:
        key=o.data.materials[0].name;batches.setdefault(key,[]).append(o)
    temporary=[]
    for key,objects in batches.items():
        bpy.ops.object.select_all(action='DESELECT');copies=[]
        for o in objects:
            c=o.copy();c.data=o.data.copy();scene.collection.objects.link(c);c.select_set(True);copies.append(c)
        bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.view_layer.objects.active;joined.name='Runtime '+key;temporary.append(joined)
    bpy.ops.object.select_all(action='DESELECT')
    for o in temporary:o.select_set(True)
    bpy.context.view_layer.objects.active=temporary[0]
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'hilltop-property-v1.glb'),export_format='GLB',use_selection=True,export_cameras=False,export_animations=False,export_extras=True)
    for o in temporary:bpy.data.objects.remove(o,do_unlink=True)
    scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.color_type='MATERIAL';scene.display.shading.light='STUDIO';scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True
    scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.filepath=str(ROOT/'hilltop-blender-blockout.png');bpy.ops.render.render(write_still=True)
    (ROOT/'hilltop-property-v1.json').write_text(json.dumps({'stage':'true 3D blockout','approximate_dimensions':True,'viewer_ground_y':-1.6,'pond_y':-7.96,'pond_below_viewer_ground_m':6.36,'pond_gltf':[2,-7.96,-11],'house_gltf':[hx,hz,-hy],'zones':{'below_dam':'temperate trees','beside_house':'subtropical/tropical food forest terraces'},'source_photo_single_view':True,'reference_image_exported':False,'separate_from_living_frame':True},indent=2))
    print('HILLTOP_3D_READY',ROOT,flush=True)
    return None

if __name__=='__main__':
    bpy.ops.wm.read_factory_settings(use_empty=True)
    if bpy.app.background:create()
    else:
        def visible_checkpoint():
            # Timers do not inherit a window context. Blender's mesh/export
            # operators need the selected window's active scene and objects.
            window=bpy.context.window_manager.windows[0]
            area=next(a for a in window.screen.areas if a.type=='VIEW_3D')
            region=next(r for r in area.regions if r.type=='WINDOW')
            with bpy.context.temp_override(window=window,area=area,region=region):
                return create()
        bpy.app.timers.register(visible_checkpoint,first_interval=2)
