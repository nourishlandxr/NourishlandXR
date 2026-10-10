"""Final art detail: inner-right moss buildup and late micro water droplets.

Creates moss-ring assets without overwriting the approved wrap-ring study.
Run visibly with Blender --python this_file.py; seed/centre-height options carry
through the previous generator. Condensation uses alpha blending, not transmission.
"""
import bpy
import importlib.util
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('approved_wrap',ROOT/'create_wrap_ring.py')
w=importlib.util.module_from_spec(spec);spec.loader.exec_module(w)
b,d=w.b,w.d
rng=random.Random(d.seed+608)

def safe(point):
    p=Vector(point);radius=math.hypot(p.x,p.z)
    if radius<.826:p.x*=.826/radius;p.z*=.826/radius
    return p

def cushion(anchor,normal,tangent,radius,height):
    mesh=b.Mesh();across=normal.cross(tangent).normalized();verts=[];faces=[]
    for ring,(spread,rise) in enumerate([(1,0),(.72,.64)]):
        for j in range(8):
            phi=j*math.tau/8
            verts.append(safe(anchor+(tangent*math.cos(phi)+across*math.sin(phi))*radius*spread+normal*height*rise))
    verts.append(safe(anchor+normal*height))
    for j in range(8):
        k=(j+1)%8;faces.extend([(j,k,k+8,j+8),(j+8,k+8,16)])
    # Tiny low leaf sprays give the soft cushion a moss-like surface.
    for j in range(2):
        base=safe(anchor+normal*height*.82+tangent*rng.uniform(-radius*.3,radius*.3))
        tip=safe(base+normal*rng.uniform(.0012,.0024)+tangent*rng.uniform(-.001,.001))
        side=across*.00035;offset=len(verts)
        verts.extend([base-side,base+side,tip+side*.4,tip-side*.4])
        faces.append((offset,offset+1,offset+2,offset+3))
        centre=(base+tip)*.5;leaf_side=tangent*.0012
        offset=len(verts);verts.extend([base,centre+leaf_side,tip,centre-leaf_side])
        faces.append((offset,offset+1,offset+2,offset+3))
    mesh.add(verts,faces);return mesh

def bead(centre,normal,tangent,radius):
    mesh=b.Mesh();across=normal.cross(tangent).normalized()
    verts=[safe(centre+normal*radius)];faces=[]
    for latitude in range(1,4):
        theta=latitude*math.pi/4
        for longitude in range(8):
            phi=longitude*math.tau/8
            verts.append(safe(centre+normal*math.cos(theta)*radius+(tangent*math.cos(phi)+across*math.sin(phi))*math.sin(theta)*radius))
    verts.append(safe(centre-normal*radius*.72))
    for j in range(8):
        k=(j+1)%8;faces.append((0,1+j,1+k))
        for ring in range(2):
            base=1+ring*8;faces.append((base+j,base+k,base+k+8,base+j+8))
        faces.append((17+j,25,17+k))
    mesh.add(verts,faces);return mesh

def add_moss(metadata):
    colours=[(.052,.125,.045),(.075,.16,.055),(.09,.175,.065)]
    materials=[b.material(f'Quiet moss cushion tone {i}',colour,.96) for i,colour in enumerate(colours)]
    patches=[d.StagedMesh() for _ in range(3)];records=[]
    for index in range(280):
        angle=math.radians(rng.uniform(5,17))
        tangent=Vector((-math.sin(angle),0,math.cos(angle)))
        radial=Vector((math.cos(angle),0,math.sin(angle)))
        wave=rng.choices([0,1,2],weights=[4,3,2])[0]
        wall=index%5!=0
        if wall:
            anchor=b.polar(angle,.8317,rng.uniform(-.089,-.025));normal=-radial
            radius=rng.uniform(.0027,.0048);height=rng.uniform(.0015,.0028)
        else:
            # Irregular lip coverage with a few soft gaps under neighbouring leaves.
            radius=rng.uniform(.003,.006)
            r=.838+rng.random()*.025*(.72+.28*math.sin(angle*13))
            anchor=b.polar(angle,r,rng.uniform(-.125,-.116));normal=Vector((0,-1,0))
            height=rng.uniform(.003,.006)
        geometry=cushion(anchor,normal,tangent,radius,height)
        early=[safe(anchor+(Vector(p)-anchor)*.008) for p in geometry.vertices]
        middle=[safe(anchor+(Vector(p)-anchor)*.55) for p in geometry.vertices]
        patches[wave].add(geometry,early,middle)
        records.append((anchor,normal,tangent,height,wave,wall))
    for wave,group in enumerate(patches):
        group.object(f'Inner right moss buildup wave {wave}',materials[wave],27+wave*4,15,37+wave*4,13)

    water=b.material('Water microdroplets',(.72,.86,.84),.10)
    bsdf=water.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Alpha'].default_value=.42;bsdf.inputs['IOR'].default_value=1.333
    # No transmission pass or animated sparkle: just small translucent beads.
    bsdf.inputs['Transmission Weight'].default_value=0
    water.surface_render_method='DITHERED'
    sheen=b.material('Quiet dew highlights',(.86,.95,.91),.12)
    droplets=[d.StagedMesh() for _ in range(2)];glints=d.StagedMesh();origins=[];sizes=[]
    candidates=[record for record in records if record[5]]
    for index,record in enumerate(rng.sample(candidates,24)):
        anchor,normal,tangent,height,_,wall=record
        radius=rng.uniform(.00065,.0016)
        centre=safe(anchor+normal*(height*.90+radius*.50))
        geometry=bead(centre,normal,tangent,radius)
        droplets[index%2].add(geometry,[safe(centre+(Vector(p)-centre)*.008) for p in geometry.vertices],[safe(centre+(Vector(p)-centre)*.40) for p in geometry.vertices])
        across=normal.cross(tangent).normalized()
        highlight=centre+(normal*.90-tangent*.28+across*.22).normalized()*radius
        glint=b.Mesh();dx=tangent*radius*.17;dy=across*radius*.28
        points=list(map(safe,[highlight-dx-dy,highlight+dx-dy,highlight+dx+dy,highlight-dx+dy]))
        glint.add(points,[(0,1,2,3)])
        glints.add(glint,[centre+(p-centre)*.008 for p in points],[centre+(p-centre)*.40 for p in points])
        origins.append([centre.x,centre.z,-centre.y]);sizes.append(round(radius*2,5))
    for wave,group in enumerate(droplets):
        group.object(f'Late water microdroplets wave {wave}',water,50+wave*3,4,54+wave*2,4)
    glints.object('Quiet condensation highlights',sheen,51,5,55,4)
    target=b.polar(math.radians(10),.839,-.128)
    metadata.update(study_stage=6,moss_tufts=280,moss_inner_wall_tufts=224,moss_arc_degrees=[5,17],
                    moss_growth_seconds=[27,58],microdroplets=24,microdroplet_diameters_m=sizes,
                    microdroplet_origins_gltf=origins,dew_growth_seconds=[50,60],dew_transmission=False,
                    moss_detail_target_blender=list(target),moss_detail_target_gltf=[target.x,target.z,-target.y])
    w.checkpoint('inner-right moss and late condensation')

def planting(mats):
    metadata=w.planting(mats);add_moss(metadata)
    metadata['sequence']+='; inner-right moss buildup and a quiet condensation finish'
    return metadata

def create():
    window=bpy.context.window_manager.windows[0]
    area=next(a for a in window.screen.areas if a.type=='VIEW_3D')
    region=next(r for r in area.regions if r.type=='WINDOW')
    with bpy.context.temp_override(window=window,area=area,region=region):
        return b.build(full_ring=True,planting=planting,seconds=60,draft_name='moss-ring')

if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'plain-ring.blend'))
    if bpy.app.background:create()
    else:bpy.app.timers.register(create,first_interval=2)
