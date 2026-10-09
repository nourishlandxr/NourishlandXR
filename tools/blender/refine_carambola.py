"""Refine the existing Fruit Window carambola in Blender; retain its interaction rig.

blender --background --python refine_carambola.py -- --source DIR --output DIR
The supplied photo references guide shape, foliage, ripeness and hanging habit.
Botanical check: https://ask.ifas.ufl.edu/publication/MG269
"""
import bpy, bmesh, os, json, math, argparse, hashlib, struct
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from math import sin, cos, pi, sqrt

args=argparse.ArgumentParser();args.add_argument('--source',required=True);args.add_argument('--output',required=True)
args=args.parse_args(__import__('sys').argv[__import__('sys').argv.index('--')+1:])
OUT=os.path.abspath(args.output);os.makedirs(OUT,exist_ok=True)
manifest=json.load(open(os.path.join(args.source,'runtime-manifest.json'),encoding='utf-8'))
cfg=manifest['species']['carambola']
bpy.ops.wm.open_mainfile(filepath=os.path.join(args.source,'Fruit_Discovery_Window.blend'))
scene=bpy.context.scene;collection=bpy.data.collections['CARAMBOLA_SPECIES_CONTENT']
root=bpy.data.objects[cfg['species_root']];content=bpy.data.objects[cfg['content_root']];fruit=bpy.data.objects[cfg['fruit_root']]
conversion=Matrix(((1,0,0,0),(0,0,1,0),(0,-1,0,0),(0,0,0,1)))
defaults=manifest['assets']['carambola_scene.glb']['canonical_nodes']
owners=[o for o in bpy.data.objects if o.animation_data]+[s for s in bpy.data.shape_keys if s.animation_data]
for owner in owners:
 owner.animation_data.action=None;owner.animation_data.use_nla=False
 for t in owner.animation_data.nla_tracks:t.mute=True
scene.frame_set(0)
for name,state in defaults.items():
 o=bpy.data.objects.get(name)
 if not o:continue
 q=state['rotation'];matrix=Matrix.LocRotScale(Vector(state['translation']),Quaternion((q[3],q[0],q[1],q[2])),Vector(state['scale']))
 o.matrix_basis=conversion.inverted()@matrix@conversion;o.matrix_parent_inverse=Matrix.Identity(4)
 if o.type=='MESH' and o.data.shape_keys:
  for k,value in zip(list(o.data.shape_keys.key_blocks)[1:],state.get('weights',[])):k.value=value
root.location=(0,0,0)

def image(name,rgb,noncolor=False):
 h,w=rgb.shape[:2];rgba=np.ones((h,w,4),np.float32);rgba[:,:,:3]=np.clip(rgb,0,1)
 im=bpy.data.images.new(name,width=w,height=h)
 if noncolor:im.colorspace_settings.name='Non-Color'
 im.pixels.foreach_set(rgba.ravel());im.filepath_raw=os.path.join(OUT,name+'.png');im.file_format='PNG';im.save();im.pack();return im

def normal_image(name,height,strength):
 gy,gx=np.gradient(height);x=-gx*strength;y=-gy*strength;z=np.ones_like(x);length=np.sqrt(x*x+y*y+z*z)
 return image(name,np.stack((x/length*.5+.5,y/length*.5+.5,z/length*.5+.5),axis=-1),True)

def material(name,color,rough=.5,albedo=None,normal=None,roughmap=None):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 for im,input_name in [(albedo,'Base Color'),(roughmap,'Roughness')]:
  if im:
   node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;m.node_tree.links.new(node.outputs['Color'],p.inputs[input_name])
 if normal:
  node=m.node_tree.nodes.new('ShaderNodeTexImage');node.image=normal;nm=m.node_tree.nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55
  m.node_tree.links.new(node.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
 p.inputs['Coat Weight'].default_value=.10;p.inputs['Coat Roughness'].default_value=.32
 return m

# Baked PBR maps survive glTF export. Fine pores are subtle; ripe valleys stay
# golden while the thin fin margins carry green/brown variation seen in photos.
N=1024;v,u=np.mgrid[0:1:complex(N),0:1:complex(N)];rng=np.random.default_rng(63019)
fine=rng.normal(0,1,(N,N));macro=(sin(0) + np.sin(u*19+np.sin(v*13))*np.cos(v*21-u*8)+np.sin(u*53+v*47)*.18)*.5
ridge=(.5+.5*np.cos(10*pi*u))**110
streak=np.sin(v*95+np.sin(u*27))*np.sin(u*245+np.sin(v*17))*.012
freckles=np.maximum(0,fine-2.45)*.14
pores=normal_image('CS_Fruit_Fine_Wax_Normal',macro*.10+fine*.011+streak,7.0)
rough=np.clip(.31+macro*.065+fine*.010+ridge*.12,.20,.52)
roughmap=image('CS_Fruit_Wax_Roughness',np.repeat(rough[:,:,None],3,axis=2),True)
skins=[]
spots=np.zeros_like(u);bloom=np.zeros_like(u)
for _ in range(180):
 cx,cy=rng.uniform(0,1,2);size=rng.uniform(.0008,.0027)
 spots+=np.exp(-((u-cx)**2+(v-cy)**2)/(size*size))*rng.uniform(.15,.70)
for _ in range(25):
 cx,cy=rng.uniform(0,1,2);size=rng.uniform(.025,.075)
 bloom+=np.exp(-((u-cx)**2+(v-cy)**2)/(size*size))*rng.uniform(.01,.07)
for name,base,green in [('Golden',(.96,.74,.075),.42),('YellowGreen',(.78,.79,.12),.58),('FreshGreen',(.40,.63,.075),.18)]:
 rgb=np.array(base)[None,None,:]*(1+macro[:,:,None]*.20+fine[:,:,None]*.007)
 edge=np.clip(ridge*(green+.22*v),0,.9)[:,:,None];rgb=rgb*(1-edge)+np.array([.39,.52,.10])[None,None,:]*edge
 rgb-=freckles[:,:,None]*np.array([.38,.33,.11]);rgb+=streak[:,:,None]*.35
 rgb-=spots[:,:,None]*np.array([.45,.39,.08]);rgb+=bloom[:,:,None]*np.array([.18,.26,.22])
 worn=ridge*np.clip(np.sin(v*68+u*23)*.5+.15,0,1)*.18
 rgb=rgb*(1-worn[:,:,None])+np.array([.42,.31,.11])[None,None,:]*worn[:,:,None]
 # Small bloom/colour variations are uneven along the longitudinal wings.
 rgb*=1-.035*np.exp(-((v-.94)/.03)**2)[:,:,None]
 m=material('CS_Photo_'+name,(1,1,1),.31,image('CS_Fruit_'+name+'_Albedo',rgb),pores,roughmap)
 m.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.045;skins.append(m)

# Broad, slightly uneven wings with rounded fin edges and fuller shoulders.
# Polygonal sides, rather than narrow sinusoidal spikes, read as starfruit.
outline=[Vector(((.042 if i%2==0 else .016)*cos(i*pi/5),(.042 if i%2==0 else .016)*sin(i*pi/5))) for i in range(10)]
def polygon_radius(a):
 a=a%(2*pi);sector=int(a/(pi/5))%10;p0=outline[sector];p1=outline[(sector+1)%10];d=Vector((cos(a),sin(a)));edge=p1-p0
 return (p0.x*p1.y-p0.y*p1.x)/(d.x*edge.y-d.y*edge.x)
def section(a,t):
 radius=(polygon_radius(a-.018)+2*polygon_radius(a)+polygon_radius(a+.018))*.25
 body=max(.014,sin(pi*t)**.31)*(1+.075*cos(pi*t)+.025*sin(t*pi*3))
 radius*=body*(1+.036*sin(a*3+1.2)*sin(pi*t)+.018*cos(a*2-t*3))
 return (radius*cos(a)+.0008*sin(t*pi)**2,radius*sin(a)+.0006*sin(t*4)*sin(pi*t),-.115*t)

def mesh(name,vs,fs,parent,mats,uv,indices=None):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);collection.objects.link(o);o.parent=parent
 for m in mats:me.materials.append(m)
 for i,p in enumerate(me.polygons):p.use_smooth=True;p.material_index=indices[i] if indices else 0
 layer=me.uv_layers.new()
 for p in me.polygons:
  for li in p.loop_indices:layer.data[li].uv=uv[me.loops[li].vertex_index]
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return o

def replace_fruit(o,t0=0,t1=1,skin=0,cut=False):
 segments=120 if cut or 'Ripe' in o.name else 80;rings=38 if cut or 'Ripe' in o.name else 25
 vs=[];uv=[];fs=[];indices=[]
 for j in range(rings+1):
  t=.00015+.9997*(t0+(t1-t0)*j/rings)
  for k in range(segments+1):a=2*pi*k/segments;vs.append(section(a,t));uv.append((k/segments,t))
 for j in range(rings):
  for k in range(segments):i=j*(segments+1)+k;fs.append((i,i+1,i+segments+2,i+segments+1));indices.append(0)
 for j,t in [(0,t0),(rings,t1)]:
  centre=len(vs);vs.append((.0008*sin(pi*t)**2,.0006*sin(t*4)*sin(pi*t),-.115*t));uv.append((.5,.5))
  for k in range(segments):fs.append((centre,j*(segments+1)+k,j*(segments+1)+k+1));indices.append(1 if cut and 0<t<1 else 0)
 mats=[skins[skin],bpy.data.materials['Carambola solid pale amber cut flesh']] if cut else [skins[skin]]
 temp=mesh(o.name+'_New',vs,fs,None,mats,uv,indices);old=o.data;o.data=temp.data;bpy.data.objects.remove(temp,do_unlink=True)
 if old.users==0:bpy.data.meshes.remove(old)
 if cut:
  layer=o.data.uv_layers.active
  for poly in o.data.polygons:
   if poly.material_index==1:
    poly.use_smooth=False
    for li in poly.loop_indices:
     co=o.data.vertices[o.data.loops[li].vertex_index].co;layer.data[li].uv=(co.x/.09+.5,co.y/.09+.5)
 o['detail_revision']=3

for o in list(root.children_recursive):
 if o.type!='MESH':continue
 if 'Five_Ribs' in o.name:replace_fruit(o,skin=2 if 'Green' in o.name or 'Support_3' in o.name else 0)
 elif o.name=='CS_Cut_Upper_Skin_And_Flesh':replace_fruit(o,0,.5,cut=True)
 elif o.name=='CS_Cut_Lower_Skin_And_Flesh':replace_fruit(o,.5,1,cut=True)

flesh=bpy.data.materials['Carambola solid pale amber cut flesh'];p=flesh.node_tree.nodes.get('Principled BSDF')
rad=np.sqrt((u-.5)**2+(v-.5)**2);ang=np.arctan2(v-.5,u-.5)
fibre=(np.sin(ang*85+rad*88)*.5+.5)*.027
fleshmap=image('CS_Juicy_Cut_Albedo',np.array([.96,.83,.42])[None,None,:]*(1-fibre[:,:,None]+macro[:,:,None]*.015))
node=flesh.node_tree.nodes.new('ShaderNodeTexImage');node.image=fleshmap;flesh.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color']);p.inputs['Roughness'].default_value=.27;p.inputs['Subsurface Weight'].default_value=.10

def tube(name,points,radii,parent,mat,sides=7):
 vs=[];uv=[];fs=[]
 for j,point in enumerate(points):
  tangent=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)]);q=Vector((0,0,1)).rotation_difference(tangent.normalized())
  for k in range(sides):a=k*2*pi/sides;vs.append(tuple(Vector(point)+q@Vector((radii[j]*cos(a),radii[j]*sin(a),0))));uv.append((k/sides,j/max(1,len(points)-1)))
 for j in range(len(points)-1):
  for k in range(sides):i=j*sides+k;n=j*sides+(k+1)%sides;fs.append((i,n,n+sides,i+sides))
 fs.extend([tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+k for k in range(sides))]);return mesh(name,vs,fs,parent,[mat],uv)

veinmat=material('CS_Soft_Petioles',(.20,.32,.08),.74)
bark=bpy.data.materials['Woody branch • baked grain']
branch=[(-.125,.045,.471),(-.036,.075,.427),(.09,.090,.376),(.235,.11,.31)]
tube('CS_Lateral_Fruiting_Branch',branch,[.007,.0058,.0043,.0025],content,bark,12)
newfruit=[((-.025,.045,.421),.90,1),((.045,.061,.386),.74,0),((.13,.068,.356),.96,0),((.209,.079,.319),.68,2)]
supportnames=list(cfg['supporting_fruits'])
for i,(loc,scale,skin) in enumerate(newfruit,4):
 o=bpy.data.objects.new('CS_Supporting_Fruit_'+str(i),None);collection.objects.link(o);o.parent=content;o.location=loc;o.scale=(scale,)*3;o.rotation_euler=(.10*sin(i),.21*cos(i+1),.23*sin(i*2));supportnames.append(o.name)
 body=mesh('CS_Support_'+str(i)+'_Five_Ribs',[],[],o,[skins[skin]],[]);replace_fruit(body,skin=skin)
 tube('CS_Support_'+str(i)+'_Pedicel',[(0,0,0),(.001,.017,.017),(.005,.025,.022)],[.0014,.0017,.002],o,veinmat)

# Replace repeated rigid fans with individual curved blades on drooping rachises.
for o in list(content.children_recursive):
 if o.type=='MESH' and o.name.startswith('CS_Compound_'):bpy.data.objects.remove(o,do_unlink=True)
L=1024;lv,lu=np.mgrid[0:1:complex(L),0:1:complex(L)];lf=rng.normal(0,1,(L,L));side=np.abs(lu-.5)*2
phase=lv*8.8-side*.8-side**2*.60
secondary=np.exp(-(np.abs((phase+.5)%1-.5)/.047)**2)*(1-side*.40);mid=np.exp(-((lu-.5)/.008)**2)
tertiary=np.exp(-(np.abs(((lv+side*.04)*34+np.sin(lu*45)*.1)%1-.5)/.033)**2)*.16
leafmacro=np.sin(lu*13+lv*9)*np.sin(lv*16)*.038
upper=np.array([.235,.43,.14])[None,None,:]*(1+leafmacro[:,:,None]+lf[:,:,None]*.008)
upper+=(mid*.17+secondary*.065+tertiary*.03)[:,:,None]*np.array([.55,.62,.25])
lower=upper*.86+np.array([.075,.085,.055])[None,None,:]
leafnormal=normal_image('CS_Leaf_Fine_Veins_Normal',mid*.32+secondary*.12+tertiary*.05+lf*.006,1.3)
leafmats=[material('CS_Photo_Leaf_Upper',(1,1,1),.62,image('CS_Leaf_Natural_Upper',upper),leafnormal),material('CS_Photo_Leaf_Underside',(1,1,1),.84,image('CS_Leaf_Natural_Underside',lower),leafnormal)]
for m in leafmats:
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Subsurface Weight'].default_value=.065;p.inputs['Coat Weight'].default_value=.02

def blade(name,base,direction,length,width,roll):
 d=Vector(direction).normalized();side=d.cross(Vector((0,-1,.18))).normalized();normal=side.cross(d).normalized();side=Quaternion(d,roll)@side;normal=Quaternion(d,roll)@normal
 rows=16;cols=6;vs=[];uv=[];fs=[];mi=[]
 def point(t,a,layer):
  profile=sin(pi*t)**.73*(1.19-.37*t)*(1+.08*a*sin(pi*t))
  curve=length*(.055*sin(pi*t)-.11*t*t)+width*(-.12*a*a+.035*a*sin(t*7+roll))
  return Vector(base)+d*(length*t)+side*(width*.5*profile*a)+normal*(curve+(1 if layer==0 else -1)*.000085)
 for layer in range(2):
  for j in range(rows+1):
   t=.0003+.9994*j/rows
   for k in range(cols+1):a=-1+2*k/cols;vs.append(tuple(point(t,a,layer)));uv.append((k/cols,t))
 total=(rows+1)*(cols+1)
 for layer in range(2):
  for j in range(rows):
   for k in range(cols):i=layer*total+j*(cols+1)+k;face=(i,i+1,i+cols+2,i+cols+1);fs.append(face if layer==0 else face[::-1]);mi.append(layer)
 boundary=[j*(cols+1) for j in range(rows+1)]+[rows*(cols+1)+k for k in range(1,cols+1)]+[j*(cols+1)+cols for j in range(rows-1,-1,-1)]+list(range(cols-1,0,-1))
 for i,a in enumerate(boundary):b=boundary[(i+1)%len(boundary)];fs.append((a,b,b+total,a+total));mi.append(1)
 o=mesh(name,vs,fs,content,leafmats,uv,mi);o['individual_leaflet']=True;return o

def merge(name,objects):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=objects[0];o.name=name;return o

shoots=[((-.27,.07,.410),(-.38,.08,-.80),.145),((-.205,.095,.435),(-.30,.25,.75),.14),((-.16,.082,.461),(.15,.35,-1),.20),((-.08,.10,.495),(-.62,.15,.56),.185),((.008,.087,.53),(.2,.25,.90),.14),((.095,.10,.571),(-.25,.25,.95),.13),((.17,.09,.609),(.51,.13,.58),.14),((.25,.10,.65),(.05,.30,-1),.18),((-.02,.123,.427),(-.8,.1,-.7),.15),((.07,.14,.386),(-.05,.25,-1),.14),((.15,.135,.35),(.7,.2,-.7),.15),((.235,.14,.315),(-.35,.2,-1),.15),((-.265,.12,.414),(.5,.3,-1),.18),((.14,.15,.58),(.85,.12,-.35),.15)]
leaflets=0
for i,(base,direction,length) in enumerate(shoots):
 d=Vector(direction).normalized();side=Vector((d.z,.20,-d.x)).normalized()
 def rachis(t):return Vector(base)+d*length*t+Vector((0,.010*t*t,-.035*t*t))
 parts=[tube('CS_Leaf_'+str(i)+'_Rachis',[tuple(rachis(t)) for t in [0,.2,.4,.6,.8,1]],[.00085,.00075,.00063,.00050,.00036,.00018],content,veinmat)]
 pairs=4 if i%3==0 else 3
 for pair in range(pairs):
  t=.16+pair*(.66/(pairs-1))
  for sign in [-1,1]:
   node=rachis(t+(sign*.009));out=side*sign*.83+d*.43+Vector((0,.04,-.12))
   tip=node+out.normalized()*.006
   parts.append(tube('CS_Leaf_'+str(i)+'_Leaflet_Petiole',[tuple(node),tuple(tip)],[.00045,.00022],content,veinmat,5))
   parts.append(blade('CS_Leaf_'+str(i)+'_Leaflet',tip,out,.048-pair*.004+(i%4)*.001,.025-pair*.002,.24*sin(i*2+pair*1.8+sign)))
   leaflets+=1
 parts.append(blade('CS_Leaf_'+str(i)+'_Terminal',rachis(1),d,.046,.022,.18*cos(i)));leaflets+=1
 merged=merge('CS_Compound_Leaf_'+str(i)+'_Natural_Leaflets',parts);merged['leaflet_count']=pairs*2+1

cfg.update(supporting_fruits=supportnames,fruit_count=8,detail_revision=3,leaflet_count=leaflets,fruiting_branches=2,fruits_per_branch=[4,4])
root['detail_revision']=3;root['leaflet_count']=leaflets;root['reference_guided_shape']='Broad five wings; rounded fins; uneven shoulders; curved individual compound leaflets'
rest={o:(o.location.copy(),o.rotation_euler.copy(),o.scale.copy()) for o in [root]+list(root.children_recursive)}
morphrest={o.data.shape_keys:[k.value for k in o.data.shape_keys.key_blocks] for o in root.children_recursive if o.type=='MESH' and o.data.shape_keys}
def restore():
 for owner in owners:
  owner.animation_data.action=None;owner.animation_data.use_nla=False
  for track in owner.animation_data.nla_tracks:track.mute=True
 scene.frame_set(0)
 for o,(loc,rot,scale) in rest.items():o.location=loc;o.rotation_euler=rot;o.scale=scale
 for sk,values in morphrest.items():
  for k,value in zip(sk.key_blocks,values):k.value=value
 bpy.context.view_layer.update()

def export(name,roots,clips):
 restore();bpy.ops.object.select_all(action='DESELECT');selected=[]
 for r in roots:
  for o in [r]+list(r.children_recursive):o.select_set(True);selected.append(o)
 for owner in owners:
  owner.animation_data.use_nla=True
  for track in owner.animation_data.nla_tracks:track.mute=track.name not in clips
 canonical={}
 for o in selected:
  loc,q,scale=(conversion@o.matrix_basis@conversion.inverted()).decompose();canonical[o.name]={'translation':list(loc),'rotation':[q.x,q.y,q.z,q.w],'scale':list(scale)}
  if o.type=='MESH' and o.data.shape_keys:canonical[o.name]['weights']=morphrest[o.data.shape_keys][1:]
 path=os.path.join(OUT,name)
 bpy.ops.export_scene.gltf(filepath=path,use_selection=True,export_format='GLB',export_extras=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_merge_animation='NLA_TRACK',export_frame_range=False,export_force_sampling=True,export_morph=True,export_morph_animation=True)
 # Blender 5.2 may export muted NLA tracks. Expose only the requested API clips.
 data=open(path,'rb').read();length=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+length]);gltf['animations']=[a for a in gltf.get('animations',[]) if a['name'] in clips]
 encoded=json.dumps(gltf,separators=(',',':')).encode();encoded+=b' ' * (-len(encoded)%4);tail=data[20+length:]
 with open(path,'wb') as f:f.write(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail)
 manifest['assets'][name]={'bytes':os.path.getsize(path),'sha256':hashlib.sha256(open(path,'rb').read()).hexdigest(),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in selected if o.type=='MESH'),'mesh_objects':sum(o.type=='MESH' for o in selected),'clips':clips,'canonical_nodes':canonical}

export('carambola_scene.glb',[root],['Development','Open','Close','Pick_Demo','Return_Demo'])
restore();parent=fruit.parent;fruit.parent=None;rest[fruit]=(Vector((0,0,0)),rest[fruit][1],rest[fruit][2]);hidden=[]
for stage,value in cfg['stages'].items():
 if stage!='RIPE':o=bpy.data.objects[value['root']];hidden.append(o);o.parent=None
export('carambola_ripe.glb',[fruit],['Open','Close'])
for o in hidden:o.parent=fruit
fruit.parent=parent;loc=cfg['attachment_glTF']['translation'];rest[fruit]=(Vector((loc[0],-loc[2],loc[1])),rest[fruit][1],rest[fruit][2]);restore()
manifest['validation'].update(blender_version=bpy.app.version_string,glb_export='passed',textures='embedded',detail_revision=3)
with open(os.path.join(OUT,'runtime-manifest.json'),'w',encoding='utf-8') as f:json.dump(manifest,f,indent=2)

# Keep the reviewed frame and the other species in the source; render only CS.
for o in bpy.data.objects:
 if o.name.startswith('CB_') or o.name.startswith('FRAME_ROOT_CB') or 'PICK_PROXY' in o.name:o.hide_render=True
for o in root.children_recursive:
 if 'PICK_PROXY' not in o.name:o.hide_render=False
frame=bpy.data.objects['FRAME_ROOT'];frame.location.x=0
for o in frame.children_recursive:o.hide_render=False
cam=scene.camera;cam.data.type='ORTHO';scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True;scene.render.threads_mode='FIXED';scene.render.threads=12
scene.render.resolution_x=1100;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(.08,.13,.08,1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=.32
for o in bpy.data.objects:
 if o.type=='LIGHT':
  if 'Key' in o.name:o.data.energy=26;o.data.size=.45
  elif 'Fill' in o.name:o.data.energy=9
  elif 'Rim' in o.name:o.data.energy=32;o.data.size=.35
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'Carambola_Refined_Fruit_Window.blend'))
def render(name,centre,location,scale):
 cam.location=location;cam.rotation_euler=(Vector(centre)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;bpy.context.view_layer.update();scene.render.filepath=os.path.join(OUT,name+'.png');bpy.ops.render.render(write_still=True)
render('carambola_refined_branch',(0,0,.40),(.10,-1.35,.52),.78)
render('carambola_refined_skin',tuple(fruit.location+Vector((0,0,-.060))),tuple(fruit.location+Vector((.19,-.30,.09))),.175)
fruit.location.y-=.30
for sign,name in zip([-1,1],cfg['pivots']):
 o=bpy.data.objects[name];o.location.x=sign*cfg['opening_distance_m'];o.rotation_euler.x=sign*math.radians(72)
bpy.data.objects[cfg['closed_exterior']].scale=(.00001,)*3;bpy.data.objects[cfg['cutaway_assembly']].scale=(1,)*3
centre=fruit.location+Vector((0,0,-cfg['fruit_center_depth_m']))
render('carambola_refined_cutaway',tuple(centre),tuple(centre+Vector((.025,-.40,.055))),.24)
restore()
with open(os.path.join(OUT,'refinement-report.json'),'w') as f:json.dump({'species':'Averrhoa carambola','blender':bpy.app.version_string,'fruits':8,'fruits_per_branch':[4,4],'individual_leaflets':leaflets,'embedded_albedo_normal_roughness':True,'assets':{n:{k:v for k,v in a.items() if k!='canonical_nodes'} for n,a in manifest['assets'].items() if n.startswith('carambola')},'device_validation':'Physical Quest review pending'},f,indent=2)
print('CARAMBOLA_REFINED',leaflets,'leaflets; 8 fruits; interaction nodes and NLA retained')
