"""Stage 5: planted cylindrical side and a branching, floor-reaching root crown.

Preserves the approved front-canopy generator/assets. Run visibly with Blender
--python this_file.py; optional -- --seed N --centre-height 1.6 (metres).
"""
import bpy
import importlib.util
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('approved_front',ROOT/'create_diverse_ring.py')
d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
b=d.b
rng=random.Random(d.seed+410)
CENTRE_HEIGHT=1.6
if '--centre-height' in sys.argv:CENTRE_HEIGHT=float(sys.argv[sys.argv.index('--centre-height')+1])
if not 1.3<=CENTRE_HEIGHT<=2.4:raise ValueError('Preview centre height must be between 1.3 and 2.4 m')
FLOOR=-CENTRE_HEIGHT

def ground(point):
    p=d.safe(point);p.z=max(FLOOR+.002,p.z);return p

def checkpoint(label):
    bpy.context.scene.render.engine='CYCLES'
    bpy.context.scene.frame_set(bpy.context.scene.frame_end)
    if not bpy.app.background:
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type=='VIEW_3D':
                    area.spaces.active.shading.type='MATERIAL'
                    view=area.spaces.active.region_3d
                    view.view_distance=3.9;view.view_location=(0,0,-.3)
                    view.view_rotation=(Vector((0,0,-.3))-Vector((-2,-4,1.2))).to_track_quat('-Z','Y')
                    view.view_perspective='ORTHO'
        bpy.ops.wm.redraw_timer(type='DRAW_WIN_SWAP',iterations=1)
    print('WRAP_CHECKPOINT',label,flush=True)

def side_leaf(group,anchor,base,tip,width,kind,radial):
    # Leaf planes follow the cylindrical surface, not the original front plane.
    axis=(tip-base).normalized();across=axis.cross(radial).normalized()
    geometry=b.Mesh();verts=[];uvs=[];faces=[]
    steps=3 if kind in ['rounded','lobed'] else 2
    for i in range(steps+1):
        t=i/steps;profile=math.sin(math.pi*t)**(.45 if kind=='rounded' else .85)
        if kind=='lobed':profile*=.75+.25*math.cos(t*math.tau*2)**2
        for j in range(3):
            p=base+(tip-base)*t+across*(j-1)*(width*profile*.5+.0001)
            p+=radial*.003*math.sin(math.pi*t)*(1-.3*abs(j-1))
            verts.append(p);uvs.append((j/2,t))
    for i in range(steps):
        for j in range(2):k=i*3+j;faces.append((k,k+1,k+4,k+3))
    geometry.add(verts,faces,uvs)
    early=[anchor+(Vector(p)-anchor)*.008 for p in verts]
    middle=[]
    for p in verts:
        rel=Vector(p)-base;along=rel.dot(axis)
        middle.append(base+radial*along*.62+(rel-axis*along)*.08)
    group.add(geometry,early,middle)

def add_outer_skin(metadata,mats):
    columns=96;depth_rows=[-.089,-.030,.029,.088]
    leaf_materials=[bpy.data.materials.get(name) for name in ['Dark small oval leaves','Muted rounded creeping leaves','Dark fine paired foliage','Deep lobed vine leaves']]
    kinds=['oval','rounded','sage','lobed']
    leaves={(kind,wave):d.StagedMesh() for kind in range(4) for wave in range(3)}
    stems=[d.StagedMesh() for _ in range(3)];roots=[d.StagedMesh() for _ in range(3)]
    origins=[]
    for row,y in enumerate(depth_rows):
        for column in range(columns):
            a=(column+.5*(row%2))*math.tau/columns+rng.uniform(-.008,.008)
            radial=Vector((math.cos(a),0,math.sin(a)));tangent=Vector((-math.sin(a),0,math.cos(a)))
            depth_axis=Vector((0,1,0))
            anchor=b.polar(a,rng.uniform(.933,.937),y+rng.uniform(-.004,.004))
            wave=rng.randrange(3);kind=rng.choices(range(4),weights=[4,4,2,3])[0]
            origins.append([anchor.x,anchor.z,-anchor.y])
            metadata['plant_root_origins_gltf'].append(origins[-1])
            # Three low runners spread across both circumference and rim depth.
            for branch in range(3):
                reach=rng.uniform(.031,.046);direction=rng.choice([-1,1])
                end=anchor+tangent*direction*reach+depth_axis*rng.uniform(-.020,.020)+radial*.006
                d.add_stem(stems[wave],anchor,[anchor,end],.00065,3)
                for node in [.30,.55,.78,.98]:
                    base=anchor+(end-anchor)*node
                    tip=base+tangent*rng.uniform(-.012,.012)+depth_axis*rng.choice([-1,1])*rng.uniform(.021,.033)+radial*.002
                    width=rng.uniform(.023,.036) if kind!=2 else rng.uniform(.013,.022)
                    side_leaf(leaves[kind,wave],anchor,base,tip,width,kinds[kind],radial)
            # Side pockets retain their own short lateral roots inside the bed.
            depth=rng.uniform(.020,.054)
            metadata['root_depths_m'].append(depth)
            metadata['root_fingerprints'].append([round(a,4),'outer-side',2,round(depth,4)])
            for sign in [-1,1]:
                end=anchor-radial*depth+tangent*sign*rng.uniform(.022,.057)+depth_axis*rng.uniform(-.012,.012)
                points=[anchor,anchor+(end-anchor)*.32+depth_axis*.003,anchor+(end-anchor)*.69,end]
                d.add_growing_path(roots[wave],points,.0007,3)
                branch_base=points[2]
                fork=[branch_base,branch_base+tangent*sign*.012-radial*.004,branch_base+tangent*sign*.022-radial*.007]
                d.add_growing_path(roots[wave],fork,.0003,3,seed_anchor=anchor)
    for (kind,wave),group in leaves.items():
        group.object(f'Outer side groundcover {kinds[kind]} wave {wave}',leaf_materials[kind],3+wave*5,16,10+wave*5,14)
    for wave in range(3):
        stems[wave].object(f'Outer side supporting stems wave {wave}',mats['stem'],2+wave*5,16,7+wave*5,12)
        roots[wave].object(f'Plant attached roots outer side wave {wave}',mats['root'],wave*5,13,8+wave*5,14)
    metadata.update(outer_side_clusters=len(origins),outer_side_columns=columns,outer_side_depth_rows_m=depth_rows,
                    outer_side_origins_gltf=origins,outer_side_arc_degrees=[0,360],side_leaf_planes='circumference and depth tangent to cylindrical rim')
    metadata['plant_clusters']+=len(origins);metadata['shoot_count']+=len(origins);metadata['root_systems']+=len(origins)
    checkpoint('full-depth cylindrical planting')

def add_lower_roots(metadata,mats):
    # Replace only freshly generated aerial meshes in this new draft. The approved
    # front model and any open user Blender scenes are never modified.
    for obj in list(b.assets):
        if obj.name.startswith('Hanging aerial roots'):
            b.assets.remove(obj);bpy.data.objects.remove(obj,do_unlink=True)
    mat=bpy.data.materials.get('Warm hanging aerial roots')
    primary=[d.StagedMesh() for _ in range(3)];secondary=[d.StagedMesh() for _ in range(3)];fine=[d.StagedMesh() for _ in range(3)]
    lengths=[];branch_count=0;fine_count=0
    for index in range(28):
        a=math.radians(213+(index%14)*114/13)+rng.uniform(-.026,.026)
        start=b.polar(a,rng.uniform(.933,.957),rng.uniform(-.14,.094))
        length=rng.uniform(.23,.49);drift=rng.uniform(-.13,.13);sway=rng.uniform(.015,.040)
        points=[ground(start+Vector((drift*t+sway*math.sin(t*5+index)*t,.026*math.sin(t*4+index)*t,-length*t))) for t in [j/16 for j in range(17)]]
        lengths.append(round(length,3));width=rng.uniform(.003,.006)
        d.add_growing_path(primary[index%3],points,width,5)
        for split in range(rng.randrange(3,6)):
            node=rng.randrange(4,15);base=points[node];sign=rng.choice([-1,1]);reach=rng.uniform(.030,.095);drop=rng.uniform(.050,.12)
            forks=[ground(base+Vector((sign*reach*math.sin(t*math.pi/2),rng.uniform(-.012,.012)*t,-drop*t))) for t in [j/6 for j in range(7)]]
            d.add_growing_path(secondary[index%3],forks,width*rng.uniform(.22,.40),4,seed_anchor=start);branch_count+=1
            for twig in [2,4]:
                twig_base=forks[twig];direction=rng.choice([-1,1]);run=rng.uniform(.014,.037)
                tips=[ground(twig_base+Vector((direction*run*t,.005*math.sin(t*3),-run*.7*t))) for t in [0,.5,1]]
                d.add_growing_path(fine[index%3],tips,.00045,3,seed_anchor=start);fine_count+=1
    for wave in range(3):
        primary[wave].object(f'Hanging aerial roots wave {wave}',mat,16+wave*3,15,25+wave*3,15)
        secondary[wave].object(f'Aerial root secondary branches wave {wave}',mat,26+wave*3,13,33+wave*3,12)
        fine[wave].object(f'Aerial root fine branching wave {wave}',mat,36+wave*3,11,40+wave*3,10)

    crown=d.StagedMesh();tap=d.StagedMesh();forks=d.StagedMesh();feeders=d.StagedMesh()
    anchor=Vector((0,-.055,-.946))
    # Buttress roots follow the lower rim into the shared central root crown.
    for angle in [232,249,291,308]:
        start=b.polar(math.radians(angle),.942,rng.uniform(-.10,.06))
        points=[ground(start+(anchor-start)*t+Vector((0,-.018*math.sin(math.pi*t),-.050*math.sin(math.pi*t)))) for t in [j/14 for j in range(15)]]
        d.add_growing_path(crown,points,rng.uniform(.010,.015),7)
    tap_points=[ground(anchor+Vector((.025*math.sin(t*4)*t,.07*t+.016*math.sin(t*6),-(CENTRE_HEIGHT-.946)*t))) for t in [j/24 for j in range(25)]]
    d.add_growing_path(tap,tap_points,.023,8)
    tap_branch_count=0
    for index,node in enumerate([5,8,11,14,17,20,22]):
        base=tap_points[node];sign=-1 if index%2 else 1;reach=rng.uniform(.12,.28);drop=rng.uniform(.09,.23)
        points=[ground(base+Vector((sign*reach*math.sin(t*math.pi/2),.030*math.sin(t*3+index)*t,-drop*t))) for t in [j/10 for j in range(11)]]
        d.add_growing_path(forks,points,rng.uniform(.0045,.009),6,seed_anchor=anchor);tap_branch_count+=1
        for twig in [3,6,8]:
            origin=points[twig];run=rng.uniform(.045,.10);direction=rng.choice([-1,1])
            tips=[ground(origin+Vector((direction*run*t,.025*t,-run*.65*t))) for t in [0,.33,.66,1]]
            d.add_growing_path(feeders,tips,.0012,4,seed_anchor=anchor)
    # Two final forks turn sideways along the floor instead of piercing it.
    foot=tap_points[-1]
    for sign in [-1,1]:
        points=[ground(foot+Vector((sign*.17*t,.040*math.sin(t*2),0))) for t in [j/8 for j in range(9)]]
        d.add_growing_path(forks,points,.005,5,seed_anchor=anchor);tap_branch_count+=1
    crown.object('Central root crown connections',mat,12,16,22,13)
    tap.object('Central taproot to preview floor',mat,22,19,32,14)
    forks.object('Taproot splitting lateral branches',mat,32,15,40,13)
    feeders.object('Taproot fine feeder branches',mats['root'],40,12,45,12)
    metadata.update(aerial_roots=28,aerial_root_lengths_m=lengths,aerial_secondary_branches=branch_count,
                    aerial_fine_branches=fine_count,central_taproot=True,taproot_lateral_branches=tap_branch_count,
                    taproot_origin_gltf=[anchor.x,anchor.z,-anchor.y],taproot_tip_gltf=[foot.x,foot.z,-foot.y],
                    preview_centre_height_m=CENTRE_HEIGHT,preview_floor_y_m=FLOOR,root_branch_staging='primary, lateral split, fine feeders')
    checkpoint('branching root crown and floor-reaching taproot')

def planting(mats):
    metadata=d.planting(mats)
    add_outer_skin(metadata,mats);add_lower_roots(metadata,mats)
    metadata['study_stage']=5
    metadata['sequence']='front and side groundcover, worms and soil, branching roots to the floor, mostly late flowers'
    return metadata

def create():
    window=bpy.context.window_manager.windows[0]
    area=next(a for a in window.screen.areas if a.type=='VIEW_3D')
    region=next(r for r in area.regions if r.type=='WINDOW')
    with bpy.context.temp_override(window=window,area=area,region=region):
        return b.build(full_ring=True,planting=planting,seconds=60,draft_name='wrap-ring')

if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'plain-ring.blend'))
    if bpy.app.background:create()
    else:bpy.app.timers.register(create,first_interval=2)
