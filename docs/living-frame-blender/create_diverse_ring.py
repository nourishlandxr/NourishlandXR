"""Visible Blender study: diverse germination, winding vines and a blooming finish.

Launch in a fresh window with --python this_file.py. Optional: -- --seed 94039.
Older full-ring / section assets are preserved. No live application integration.
"""
import bpy
import importlib.util
import sys
import math
import random
import numpy as np
from pathlib import Path
from mathutils import Vector

sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('frame_geometry',ROOT/'create_botanical_section.py')
b=importlib.util.module_from_spec(spec);spec.loader.exec_module(b)
seed=94039
if '--seed' in sys.argv:seed=int(sys.argv[sys.argv.index('--seed')+1])
rng=random.Random(seed)
SECONDS=60
HABITS=['small oval carpet','rounded creeping cover','fine paired cover','small leaf mats','lobed runners','muted small-leaf herb']

def safe(point):
    p=Vector(point);radius=math.hypot(p.x,p.z)
    if radius<.845:p.x*=.845/radius;p.z*=.845/radius
    return p

class StagedMesh:
    """Two additive morphs: extension first, then leaf opening / final growth.

    Every plant grows from its OWN anchor, even when many are batched together.
    Scaling a joined mesh around one shared origin would move it into the text.
    """
    def __init__(self):self.mesh=b.Mesh();self.extended=[];self.opened=[]
    def add(self,geometry,early,middle):
        self.mesh.add(early,geometry.faces,geometry.uvs)
        self.extended.extend(tuple(p) for p in middle)
        self.opened.extend(tuple(p) for p in geometry.vertices)
    def object(self,name,mat,delay,duration=16,open_delay=None,open_duration=12):
        if not self.mesh.vertices:return None
        obj=self.mesh.object(name,mat)
        obj.shape_key_add(name='Seedling basis')
        extension=obj.shape_key_add(name='Stem extension')
        opening=obj.shape_key_add(name='Leaf or petal opening')
        for i,(early,middle,final) in enumerate(zip(self.mesh.vertices,self.extended,self.opened)):
            extension.data[i].co=middle
            opening.data[i].co=Vector(early)+Vector(final)-Vector(middle)
        for key,start,length in [(extension,delay,duration),(opening,open_delay if open_delay is not None else delay+5,open_duration)]:
            for second,value in [(0,0),(start,0),(start+length,1),(SECONDS,1)]:
                key.value=value;key.keyframe_insert(data_path='value',frame=round(second*24)+1)
        obj['growth_anchor_count']='batched individual anchors'
        return obj

def blade(base,tip,width,kind='oval',curl=.006):
    mesh=b.Mesh();base,tip=safe(base),safe(tip);axis=(tip-base).normalized()
    side=axis.cross(Vector((0,1,0)))
    if side.length<.01:side=Vector((1,0,0))
    side.normalize();verts=[];faces=[];uvs=[]
    steps=6 if kind in ['lobed','rounded'] else 4
    for i in range(steps+1):
        t=i/steps
        profile=math.sin(math.pi*t)**(.40 if kind=='rounded' else 1.35 if kind=='sage' else .8)
        if kind=='lobed':profile*=.65+.35*math.cos(t*math.tau*3)**2
        if kind=='grass':profile=(1-t)**.6
        for j in range(3):
            across=j-1
            p=base+(tip-base)*t+side*across*(width*profile*.5+.00012)
            p+=Vector((0,-curl*math.sin(math.pi*t)*(1-.35*abs(across)),0))
            verts.append(safe(p));uvs.append((j/2,t))
    for i in range(steps):
        for j in range(2):k=i*3+j;faces.append((k,k+1,k+4,k+3))
    mesh.add(verts,faces,uvs);return mesh

def add_leaf(group,anchor,base,tip,width,kind='oval',curl=.006):
    geometry=blade(base,tip,width,kind,curl)
    anchor,base,tip=map(Vector,[anchor,base,tip]);axis=(tip-base).normalized()
    outward=Vector((anchor.x,0,anchor.z)).normalized()
    folded=(outward*.45+Vector((0,-.65,0))).normalized()
    early=[safe(anchor+(Vector(p)-anchor)*.008) for p in geometry.vertices]
    middle=[]
    for p in geometry.vertices:
        rel=Vector(p)-base;along=rel.dot(axis)
        middle.append(safe(base+folded*along*.65+(rel-axis*along)*.08))
    group.add(geometry,early,middle)

def add_stem(group,anchor,points,width=.001,sides=4):
    geometry=b.Mesh();b.tube(geometry,points,width,sides)
    early=[safe(Vector(anchor)+(Vector(p)-Vector(anchor))*.015) for p in geometry.vertices]
    group.add(geometry,early,geometry.vertices)

def add_growing_path(group,points,width,sides=4,seed_anchor=None):
    final=b.Mesh();middle=b.Mesh()
    b.tube(final,points,width,sides)
    halfway=len(points)//2
    b.tube(middle,[p if i<=halfway else points[halfway]+(p-points[halfway])*.012 for i,p in enumerate(points)],width,sides)
    start=Vector(seed_anchor) if seed_anchor is not None else points[0]
    early=[safe(start+(Vector(p)-start)*.012) for p in final.vertices]
    group.add(final,early,middle.vertices)

def planting(mats):
    # Materials express different leaf surfaces, rather than one recoloured shape.
    # Quiet greens and barely visible veins, without the original bright gradient.
    u,v=np.meshgrid(np.linspace(0,1,256),np.linspace(0,1,256))
    veins=.003*np.exp(-((u-.5)/.016)**2)+.001*np.cos(v*math.tau*8)
    leaf_image=b.image('muted-leaf-vein-color',np.stack([.065+veins,.145+veins,.079+veins],axis=-1))
    mats['oval']=b.material('Dark small oval leaves',(.065,.145,.079),.63,colour_image=leaf_image)
    succulent=b.material('Muted rounded creeping leaves',(.095,.185,.125),.56)
    frond=b.material('Dark fine paired foliage',(.068,.155,.080),.72)
    small=b.material('Quiet small leaf mats',(.100,.180,.095),.76)
    ivy=b.material('Deep lobed vine leaves',(.048,.125,.067),.57)
    mats['sage']=b.material('Subdued grey-green herbs',(.135,.185,.143),.77)
    materials=[mats['oval'],succulent,frond,small,ivy,mats['sage']]
    groups={(kind,wave):StagedMesh() for kind in range(6) for wave in range(4)}
    stems=[StagedMesh() for _ in range(4)]
    counts=[0]*6
    # Uneven neighbourhoods alternate busy and quiet areas; species and timing
    # are sampled independently. The seed makes each authored variation repeatable.
    cluster_angles=[]
    centres=[.18,.75,1.40,2.06,2.65,3.18,5.98]
    for i in range(90):
        a=(rng.choice(centres)+rng.gauss(0,.18))%math.tau
        if math.radians(210)<a<math.radians(330):a=(3.30 if a<math.pi*1.5 else 5.98)+rng.uniform(-.07,.07)
        if i<4:a=rng.choice([math.radians(214),math.radians(326)])+rng.uniform(-.02,.02)
        cluster_angles.append(a)
        kind=rng.choices(range(6),weights=[4,3,3,2,3,3])[0];counts[kind]+=1
        wave=rng.randrange(4)
        anchor=b.polar(a,rng.uniform(.916,.934),rng.uniform(-.126,-.045))
        radial=Vector((math.cos(a),0,math.sin(a)));tangent=Vector((-math.sin(a),0,math.cos(a)))
        scale=rng.uniform(.65,1.18)*(.55 if i<4 else 1);leaf_group=groups[kind,wave];stem_group=stems[wave]
        if kind==0:
            # Low lateral runners with small opposite leaves.
            for branch in range(rng.randrange(3,6)):
                end=anchor+(radial*.014+tangent*rng.uniform(-.068,.068)+Vector((0,-.026,0)))*scale
                add_stem(stem_group,anchor,[anchor,anchor+(end-anchor)*.48,end],.0012)
                for node in [.32,.57,.80]:
                    base=anchor+(end-anchor)*node
                    for sign in [-1,1]:
                        tip=base+tangent*sign*rng.uniform(.009,.018)*scale+radial*.009+Vector((0,-.008,0))
                        add_leaf(leaf_group,anchor,base,tip,rng.uniform(.006,.012)*scale,'oval',.003)
        elif kind==1:
            for j in range(rng.randrange(10,16)):
                theta=j*2.39996+rng.uniform(-.24,.24)
                base=anchor+tangent*math.sin(theta)*.020*scale
                tip=base+radial*rng.uniform(.007,.018)*scale+tangent*math.cos(theta)*.024*scale+Vector((0,-.016*scale,0))
                add_leaf(leaf_group,anchor,base,tip,rng.uniform(.010,.020)*scale,'rounded',.006)
        elif kind==2:
            for j in range(rng.randrange(3,5)):
                end=anchor+(radial*.018+tangent*rng.uniform(-.080,.080)+Vector((0,-.027,0)))*scale
                add_stem(stem_group,anchor,[anchor,(anchor+end)*.5,end],.0009)
                for k in range(1,8):
                    base=anchor+(end-anchor)*k/8;length=(1-k/9)*.020*scale
                    for sign in [-1,1]:add_leaf(leaf_group,anchor,base,base+tangent*sign*length+radial*.008+Vector((0,-.005,0)),.006*scale,'sage',.002)
        elif kind==3:
            for j in range(rng.randrange(15,24)):
                base=anchor+tangent*rng.uniform(-.045,.045)*scale+radial*rng.uniform(0,.013)
                end=base+radial*.009+tangent*rng.uniform(-.012,.012)+Vector((0,-.012,0))
                add_leaf(leaf_group,anchor,base,end,rng.uniform(.005,.010)*scale,'rounded',.002)
        elif kind==4:
            for branch in range(rng.randrange(3,5)):
                end=anchor+(radial*.014+tangent*rng.uniform(-.100,.100)+Vector((0,-.030,0)))*scale
                add_stem(stem_group,anchor,[anchor,(anchor+end)*.5,end],.001)
                for k in [.3,.6,.9]:
                    base=anchor+(end-anchor)*k
                    tip=base+radial*rng.uniform(.008,.016)*scale+tangent*rng.uniform(-.018,.018)+Vector((0,-.010,0))
                    add_leaf(leaf_group,anchor,base,tip,.016*scale,'lobed',.004)
        else:
            for j in range(rng.randrange(11,18)):
                theta=j*2.39996
                base=anchor+radial*rng.uniform(.004,.012)*scale
                end=base+radial*.014*scale+tangent*math.sin(theta)*.026*scale+Vector((0,-.016*scale,0))
                add_stem(stem_group,anchor,[anchor,base,end*.95+anchor*.05],.0006)
                add_leaf(leaf_group,anchor,base,end,.007*scale,'sage',.003)
    for (kind,wave),group in groups.items():
        group.object(f'Groundcover growth - {HABITS[kind]} wave {wave}',materials[kind],wave*5+rng.uniform(0,2),rng.uniform(13,17),wave*5+6+rng.uniform(0,2),rng.uniform(11,15))
    for wave,group in enumerate(stems):group.object(f'Branching shoots wave {wave}',mats['stem'],wave*5,15,wave*5+5,10)

    # Larger foreground leaves restore the size hierarchy of the original rim.
    # Small grass blades, medium groundcover and these broad leaves coexist.
    hero_groups=[StagedMesh() for _ in range(3)]
    hero_stems=StagedMesh()
    for index,a in enumerate([.34,1.24,2.58,3.10,6.02]):
        anchor=b.polar(a,.931,-.145)
        radial=Vector((math.cos(a),0,math.sin(a)));tangent=Vector((-math.sin(a),0,math.cos(a)))
        for j in range(rng.randrange(4,7)):
            base=anchor+radial*rng.uniform(.003,.012)
            end=base+radial*.016+tangent*rng.choice([-1,1])*rng.uniform(.035,.070)+Vector((0,-.023,0))
            add_stem(hero_stems,anchor,[anchor,base,end*.83+base*.17],.0016,5)
            add_leaf(hero_groups[index%3],anchor,base,end,rng.uniform(.021,.034),'lobed' if index%3==2 else 'rounded' if index%3==1 else 'oval',.007)
    for index,group in enumerate(hero_groups):group.object(f'Large foreground leaf accents {index}',[mats['oval'],succulent,ivy][index],6+index*4,17,14+index*4,13)
    hero_stems.object('Large leaf supporting stems',mats['stem'],5,19,12,12)

    # Root architecture varies between tap roots, spreading fans and fibrous mats.
    root_groups=[StagedMesh() for _ in range(3)]
    root_fingerprints=[]
    for index in range(18):
        a=rng.choice(cluster_angles)+rng.uniform(-.09,.09)
        start=b.polar(a,rng.uniform(.906,.926),-.111)
        architecture=index%3
        branches=rng.randrange(2,4) if architecture==0 else rng.randrange(4,7) if architecture==1 else rng.randrange(8,13)
        span=rng.uniform(.012,.035) if architecture==0 else rng.uniform(.09,.16) if architecture==1 else rng.uniform(.035,.075)
        root_fingerprints.append([round(a,4),architecture,branches,round(span,4)])
        for branch in range(branches):
            delta=rng.uniform(-span,span)
            depth=rng.uniform(.062,.075) if architecture==0 else rng.uniform(.025,.046) if architecture==1 else rng.uniform(.035,.066)
            frequency=rng.uniform(3,9);phase=rng.uniform(0,math.tau)
            points=[]
            for k in range(10):
                t=k/9
                angle=a+delta*t+.007*math.sin(t*frequency+phase)*math.sin(math.pi*t)
                points.append(b.polar(angle,max(.845,.918-depth*t),-.111-.004*math.sin(t*4+phase)))
            width=rng.uniform(.0012,.0020) if architecture==0 else rng.uniform(.0008,.0013) if architecture==1 else rng.uniform(.00035,.00065)
            add_growing_path(root_groups[index%3],points,width)
            for fork in range(rng.randrange(2,5) if architecture==2 else rng.randrange(1,3)):
                node=rng.randrange(3,8);base=points[node];direction=rng.choice([-1,1])
                twigs=[base]+[b.polar(a+delta*node/9+direction*span*.18*t,max(.845,math.hypot(base.x,base.z)-.012*t),base.y-.001) for t in [.3,.65,1]]
                add_growing_path(root_groups[index%3],twigs,.00045,3,seed_anchor=start)
    for index,group in enumerate(root_groups):group.object(f'Unique roots - architecture {index}',mats['root'],index*3,14,index*3+12,14)

    # Fig-like aerial roots belong beneath the lower arc, as in the original.
    # Different lengths, depths, bends and forks give a hanging spatial silhouette.
    aerial=[StagedMesh() for _ in range(3)];aerial_lengths=[]
    aerial_mat=b.material('Warm hanging aerial roots',(.34,.245,.135),.86)
    for index in range(11):
        a=math.radians(222+index*8.8)+rng.uniform(-.025,.025)
        start=b.polar(a,rng.uniform(.932,.955),rng.uniform(-.147,-.025))
        length=rng.uniform(.18,.40);drift=rng.uniform(-.045,.045);bend=rng.uniform(-.018,.018)
        aerial_lengths.append(round(length,3))
        points=[safe(start+Vector((drift*t+bend*math.sin(t*math.pi),-.014*math.sin(t*3+index)*t,-length*t))) for t in [j/22 for j in range(23)]]
        add_growing_path(aerial[index%3],points,rng.uniform(.0021,.0042),6)
        for branch in range(rng.randrange(2,6)):
            node=rng.randrange(5,21);base=points[node];side=rng.choice([-1,1]);reach=rng.uniform(.018,.045)
            fork_depth=rng.uniform(.004,.012);fork_drop=rng.uniform(.025,.060)
            forks=[safe(base+Vector((side*reach*t,-fork_depth*t,-fork_drop*t))) for t in [0,.25,.5,.75,1]]
            add_growing_path(aerial[index%3],forks,rng.uniform(.00065,.0011),4,seed_anchor=start)
    for index,group in enumerate(aerial):group.object(f'Hanging aerial roots wave {index}',aerial_mat,18+index*4,13,30+index*4,13)

    # Long climbing vines follow the rim, while lower vines cascade freely.
    vines=[StagedMesh() for _ in range(3)];vine_leaves=[StagedMesh() for _ in range(3)]
    lengths=[]
    for index in range(9):
        start_a=[.23,.86,1.60,2.23,2.93,3.35,6.02,5.96,.10][index]+rng.uniform(-.06,.06)
        direction=rng.choice([-1,1]);arc=rng.uniform(.34,.72);front=rng.uniform(-.165,-.130)
        if start_a>5.7:direction=1
        points=[];trailing=index in [5,6]
        drift=rng.uniform(-.02,.02);drop=rng.uniform(.16,.24)
        for k in range(25):
            t=k/24
            if trailing:
                start=b.polar(start_a,.966,front)
                p=start+Vector((drift*t+.032*math.sin(t*5),-.023*math.sin(t*4),-drop*t))
            else:p=b.polar(start_a+direction*arc*t,.95+.027*math.sin(t*8+index)+.010*t,front-.025*math.sin(t*6))
            points.append(safe(p))
        lengths.append(round(sum((points[k+1]-points[k]).length for k in range(24)),3))
        add_growing_path(vines[index%3],points,.0018,5)
        anchor=points[0]
        for node in range(3,24,3):
            base=points[node];a=math.atan2(base.z,base.x)
            radial=Vector((math.cos(a),0,math.sin(a)));tangent=Vector((-math.sin(a),0,math.cos(a)))
            for sign in [-1,1]:
                tip=safe(base+tangent*sign*rng.uniform(.025,.043)+radial*.018+Vector((0,-.012,0)))
                add_leaf(vine_leaves[index%3],anchor,base,tip,.014,'lobed',.004)
        # Coiled tendrils are distinct from leaf-bearing stems.
        coil=[points[18]+Vector((math.cos(t*math.tau*2)*.009*t,-.010*t,math.sin(t*math.tau*2)*.009*t)) for t in [k/16 for k in range(17)]]
        add_growing_path(vines[index%3],list(map(safe,coil)),.00065,4,seed_anchor=anchor)
    vine_mat=b.material('Muted green crawling vines',(.095,.18,.078),.76)
    for index in range(3):
        vines[index].object(f'Winding and cascading vines {index}',vine_mat,8+index*4,17,22+index*4,14)
        vine_leaves[index].object(f'Vine leaves opening {index}',ivy,9+index*4,17,24+index*4,13)

    # A clearly visible finale: closed buds develop, then substantial flowers open.
    petal_mats=[b.material('Ivory daisy petals',(.98,.87,.61),.55),b.material('Lavender blossom petals',(.64,.31,.83),.51),b.material('Coral pink flower petals',(.96,.40,.49),.51)]
    pollen=b.material('Bright golden pollen',(.98,.57,.055),.69)
    flowers={(colour,wave):StagedMesh() for colour in range(3) for wave in range(4)}
    flower_stems=StagedMesh();calyx=StagedMesh();centres=StagedMesh()
    bloom_starts=[];early_heads=[]
    for index in range(27):
        a=(rng.choice(centres_for_flowers())+rng.uniform(-.13,.13))%math.tau
        anchor=b.polar(a,.922,-.120);radial=Vector((math.cos(a),0,math.sin(a)))
        head=anchor+radial*rng.uniform(.024,.043)+Vector((0,-rng.uniform(.025,.040),0))
        add_stem(flower_stems,anchor,[anchor,anchor+(head-anchor)*.6,head],.0015,5)
        colour=index%3;wave=3 if index in [0,7,14,21] else rng.randrange(3)
        if wave==3:early_heads.append([head.x,head.z,-head.y])
        size=rng.uniform(.010,.017);petals=8 if colour==0 else 5 if colour==1 else 6
        group=flowers[colour,wave]
        for j in range(petals):
            phi=j*math.tau/petals+rng.uniform(-.04,.04)
            tip=head+Vector((math.cos(phi)*size,-.003,math.sin(phi)*size))
            geometry=blade(head,tip,size*[.38,.60,.75][colour],['sage','oval','rounded'][colour],.004)
            early=[safe(anchor+(Vector(p)-anchor)*.008) for p in geometry.vertices]
            middle=[]
            for p in geometry.vertices:
                rel=Vector(p)-head;distance=math.hypot(rel.x,rel.z)
                middle.append(head+Vector((rel.x*.10,-distance*.82,rel.z*.10)))
            group.add(geometry,early,middle)
        for j in range(5):
            phi=j*math.tau/5
            add_leaf(calyx,anchor,head,head+Vector((math.cos(phi)*.010,.008,math.sin(phi)*.010)),.006,'sage',.001)
        disc=b.Mesh();radius=.006 if colour==0 else .004
        verts=[head+Vector((math.cos(j*math.tau/10)*radius,-.004,math.sin(j*math.tau/10)*radius)) for j in range(10)]
        disc.add(verts,[tuple(range(10))])
        centres.add(disc,[anchor+(Vector(p)-anchor)*.008 for p in verts],[head+(Vector(p)-head)*.05 for p in verts])
    for (colour,wave),group in flowers.items():
        start=24+rng.uniform(0,2) if wave==3 else 42+wave*3+rng.uniform(0,1);bloom_starts.append(round(start,2))
        group.object(f'Blooming flowers colour {colour} wave {wave}',petal_mats[colour],8 if wave==3 else 14+wave*3,14 if wave==3 else 20,start,8 if wave==3 else 9)
    flower_stems.object('Flower stalks before the bloom',mats['stem'],13,22,19,12)
    calyx.object('Green flower buds and calyx',ivy,16,23,21,14)
    centres.object('Flower centres revealed at the finish',pollen,18,21,44,12)

    grit=b.Mesh();litter=b.Mesh()
    for i in range(190):
        a=rng.uniform(0,math.tau);p=b.polar(a,rng.uniform(.850,.919),-.112);s=rng.uniform(.001,.0035)
        grit.add([p+Vector((math.cos(j*math.tau/5)*s,0,math.sin(j*math.tau/5)*s)) for j in range(5)]+[p+Vector((0,-s*.7,0))],[(j,(j+1)%5,5) for j in range(5)])
    grit.object('Irregular aggregates in exposed soil',mats['lower'],smooth=False)
    for i in range(45):
        a=rng.uniform(0,math.tau);p=b.polar(a,rng.uniform(.894,.925),-.113)
        b.leaf(litter,p,p+Vector((rng.uniform(-.011,.011),-.002,rng.uniform(-.011,.011))),.004,.001)
    litter.object('Natural litter between plants',mats['litter'])
    return dict(seed=seed,plant_clusters=95,shoot_count=95,plant_habits=HABITS,habit_counts=counts,
                large_leaf_clusters=5,leaf_size_range_m=[.005,.078],reserved_lower_arc_degrees=[210,330],lower_arc_small_accents=4,
                aerial_roots=11,aerial_root_lengths_m=aerial_lengths,
                root_architectures=3,root_systems=18,root_fingerprints=root_fingerprints,
                vines=9,vine_lengths_m=lengths,flowers=27,early_flowers=4,late_flowers=23,early_flower_heads_gltf=early_heads,bloom_starts_seconds=bloom_starts,
                sequence='soil and roots, staggered shoots, distinct foliage, winding vines, buds, flowers opening at the finish',
                growth_method='individual-anchor morph extension and unfolding, with independently staggered groups')

def centres_for_flowers():return [.37,1.12,1.88,2.55,3.25,6.03]

def create():
    window=bpy.context.window_manager.windows[0]
    area=next(a for a in window.screen.areas if a.type=='VIEW_3D')
    region=next(r for r in area.regions if r.type=='WINDOW')
    with bpy.context.temp_override(window=window,area=area,region=region):
        return b.build(full_ring=True,planting=planting,seconds=SECONDS,draft_name='diverse-ring')

if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'plain-ring.blend'))
    if bpy.app.background:create()
    else:bpy.app.timers.register(create,first_interval=2)
