"""Clean, rig and animate an image-to-3D enemy mesh (e.g. from TRELLIS) for the game.

Run headless:
  blender -b --python tools/blender/rig_enemy.py -- <in.glb> <out.glb> [--tex 256] [--tris 6000] [--kind biped|winged]

Steps: drop the ground slab and loose debris, decimate, normalize (feet at origin, height 1, facing
-Y in Blender = +Z in glTF), build a simple humanoid armature from the mesh proportions, skin it
with distance-based weights (robust on messy generated meshes, unlike bone-heat), keyframe the
actions the game expects (Idle, Walk, Windup, Attack, Hit, Death) and export a GLB.
"""
import bpy, bmesh, sys, math
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
src, dst = argv[0], argv[1]
opt = {'tex': 256, 'tris': 6000, 'kind': 'biped'}
for i, a in enumerate(argv):
    if a.startswith('--'):
        opt[a[2:]] = argv[i + 1]
TEX, TRIS, KIND = int(opt['tex']), int(opt['tris']), opt['kind']

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
obj = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# clear any parent empties left from import
obj.parent = None
for o in list(bpy.context.scene.objects):
    if o != obj:
        bpy.data.objects.remove(o, do_unlink=True)

# ---------------- cleanup ----------------
bm = bmesh.new()
bm.from_mesh(obj.data)
bm.verts.ensure_lookup_table()
zs = [v.co.z for v in bm.verts]
zmin, zmax = min(zs), max(zs)
H = zmax - zmin
# 1) islands: drop tiny debris and flat slabs
islands, seen = [], set()
for v in bm.verts:
    if v.index in seen:
        continue
    stack, isl = [v], []
    seen.add(v.index)
    while stack:
        a = stack.pop()
        isl.append(a)
        for e in a.link_edges:
            b = e.other_vert(a)
            if b.index not in seen:
                seen.add(b.index)
                stack.append(b)
    islands.append(isl)
biggest = max(len(i) for i in islands)
kill = set()
for isl in islands:
    iz = [v.co.z for v in isl]
    ih = max(iz) - min(iz)
    if len(isl) < biggest * 0.02 or (ih < H * 0.04 and min(iz) < zmin + H * 0.06):
        kill.update(isl)
# 2) a ground slab fused to the feet: flat, upward-facing faces in the bottom 3%
for f in bm.faces:
    if all(v.co.z < zmin + H * 0.03 for v in f.verts) and abs(f.normal.z) > 0.8:
        kill.update(f.verts)
bmesh.ops.delete(bm, geom=list(kill), context='VERTS')
bm.to_mesh(obj.data)
bm.free()

# decimate
tri = sum(len(p.vertices) - 2 for p in obj.data.polygons)
if tri > TRIS:
    mod = obj.modifiers.new('dec', 'DECIMATE')
    mod.ratio = TRIS / tri
    bpy.ops.object.modifier_apply(modifier=mod.name)

# normalize: feet on the ground at the origin, height 1
co = [obj.matrix_world @ v.co for v in obj.data.vertices]
mn = Vector((min(c.x for c in co), min(c.y for c in co), min(c.z for c in co)))
mx = Vector((max(c.x for c in co), max(c.y for c in co), max(c.z for c in co)))
H = mx.z - mn.z
obj.location -= Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
bpy.ops.object.transform_apply(location=True)
obj.scale = (1 / H, 1 / H, 1 / H)
bpy.ops.object.transform_apply(scale=True)
verts = [v.co.copy() for v in obj.data.vertices]

def width_at(z0, z1):
    xs = [abs(v.x) for v in verts if z0 <= v.z <= z1]
    xs.sort()
    return xs[int(len(xs) * 0.95)] if xs else 0.15

# shrink textures (retro game, saves memory)
for img in bpy.data.images:
    if img.size[0] > TEX:
        img.scale(TEX, TEX)
for m in obj.data.materials:
    if m and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                n.inputs['Metallic'].default_value = 0.1
                n.inputs['Roughness'].default_value = 0.75

# ---------------- armature ----------------
sh = width_at(0.72, 0.82)          # shoulder half-width
hip = width_at(0.45, 0.55) * 0.5   # hip half-width
B = {  # name: (head, tail, parent)
    'hips': ((0, 0, 0.50), (0, 0, 0.60), None),
    'spine': ((0, 0, 0.60), (0, 0, 0.76), 'hips'),
    'chest': ((0, 0, 0.76), (0, 0, 0.86), 'spine'),
    'head': ((0, 0, 0.86), (0, 0, 1.0), 'chest'),
    'arm.L': ((sh * 0.75, 0, 0.80), (sh * 0.95, 0, 0.62), 'chest'),
    'fore.L': ((sh * 0.95, 0, 0.62), (sh * 1.0, -0.02, 0.44), 'arm.L'),
    'arm.R': ((-sh * 0.75, 0, 0.80), (-sh * 0.95, 0, 0.62), 'chest'),
    'fore.R': ((-sh * 0.95, 0, 0.62), (-sh * 1.0, -0.02, 0.44), 'arm.R'),
    'thigh.L': ((hip, 0, 0.50), (hip, 0, 0.27), 'hips'),
    'shin.L': ((hip, 0, 0.27), (hip, -0.01, 0.03), 'thigh.L'),
    'thigh.R': ((-hip, 0, 0.50), (-hip, 0, 0.27), 'hips'),
    'shin.R': ((-hip, 0, 0.27), (-hip, -0.01, 0.03), 'thigh.R'),
}
if KIND == 'winged':
    B['wing.L'] = ((sh * 0.4, 0.08, 0.78), (sh * 2.2, 0.15, 0.95), 'chest')
    B['wing.R'] = ((-sh * 0.4, 0.08, 0.78), (-sh * 2.2, 0.15, 0.95), 'chest')

arm_data = bpy.data.armatures.new('rig')
rig = bpy.data.objects.new('rig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, (h, t, p) in B.items():
    eb = arm_data.edit_bones.new(name)
    eb.head, eb.tail = Vector(h), Vector(t)
for name, (h, t, p) in B.items():
    if p:
        arm_data.edit_bones[name].parent = arm_data.edit_bones[p]
        arm_data.edit_bones[name].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')

# distance-based skinning: each vertex follows its nearest bones with a smooth falloff
def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9)))
    return (a + ab * t - p).length

groups = {n: obj.vertex_groups.new(name=n) for n in B}
segs = {n: (Vector(h), Vector(t)) for n, (h, t, p) in B.items()}
for v in obj.data.vertices:
    p = v.co
    ds = sorted(((seg_dist(p, *segs[n]), n) for n in B), key=lambda x: x[0])[:3]
    ws = [(1.0 / max(d, 0.01) ** 4, n) for d, n in ds]
    tot = sum(w for w, _ in ws)
    for w, n in ws:
        groups[n].add([v.index], w / tot, 'REPLACE')
mod = obj.modifiers.new('rig', 'ARMATURE')
mod.object = rig
obj.parent = rig

# ---------------- animations ----------------
# Bones point along their local Y; rotating about local X swings them forward/back.
pb = rig.pose.bones
for b in pb:
    b.rotation_mode = 'XYZ'

def key(action, frames):
    """frames: list of (frame, {bone: (x, y, z) radians}, {'hips_z': offset})"""
    act = bpy.data.actions.new(action)
    rig.animation_data_create()
    rig.animation_data.action = act
    for f, rot, extra in frames:
        for b in pb:
            b.rotation_euler = rot.get(b.name, (0, 0, 0))
            b.keyframe_insert('rotation_euler', frame=f)
        pb['hips'].location = (0, extra.get('z', 0), 0) if extra else (0, 0, 0)
        pb['hips'].keyframe_insert('location', frame=f)
    track = rig.animation_data.nla_tracks.new()
    track.name = action
    track.strips.new(action, int(frames[0][0]), act)
    rig.animation_data.action = None

r = math.radians
W = KIND == 'winged'
wing = lambda a: {'wing.L': (0, 0, r(a)), 'wing.R': (0, 0, r(-a))} if W else {}
key('Idle', [
    (1, {'chest': (r(2), 0, 0), 'head': (r(-2), 0, 0), **wing(0)}, {}),
    (21, {'chest': (r(-3), 0, 0), 'head': (r(3), 0, 0), 'arm.L': (0, 0, r(-4)), 'arm.R': (0, 0, r(4)), **wing(-20)}, {}),
    (41, {'chest': (r(2), 0, 0), 'head': (r(-2), 0, 0), **wing(0)}, {}),
])
step = lambda s: {
    'thigh.L': (r(30 * s), 0, 0), 'shin.L': (r(-25 * max(0, -s) - 5), 0, 0),
    'thigh.R': (r(-30 * s), 0, 0), 'shin.R': (r(-25 * max(0, s) - 5), 0, 0),
    'arm.L': (r(-25 * s), 0, 0), 'arm.R': (r(25 * s), 0, 0), 'spine': (r(8), 0, r(4 * s)), **wing(25 * s),
}
key('Walk', [(1, step(1), {'z': 0}), (7, step(0), {'z': 0.025}), (13, step(-1), {'z': 0}), (19, step(0), {'z': 0.025}), (25, step(1), {'z': 0})])
key('Windup', [
    (1, {}, {}),
    (12, {'arm.L': (r(-150), 0, r(-20)), 'arm.R': (r(-150), 0, r(20)), 'fore.L': (r(-30), 0, 0), 'fore.R': (r(-30), 0, 0), 'spine': (r(-15), 0, 0), 'head': (r(-10), 0, 0), **wing(60)}, {}),
    (20, {'arm.L': (r(-160), 0, r(-20)), 'arm.R': (r(-160), 0, r(20)), 'fore.L': (r(-35), 0, 0), 'fore.R': (r(-35), 0, 0), 'spine': (r(-18), 0, 0), 'head': (r(-12), 0, 0), **wing(70)}, {}),
])
key('Attack', [
    (1, {'arm.L': (r(-160), 0, r(-20)), 'arm.R': (r(-160), 0, r(20)), 'spine': (r(-18), 0, 0), **wing(70)}, {}),
    (5, {'arm.L': (r(40), 0, r(10)), 'arm.R': (r(40), 0, r(-10)), 'fore.L': (r(-10), 0, 0), 'fore.R': (r(-10), 0, 0), 'spine': (r(30), 0, 0), 'head': (r(15), 0, 0), **wing(-40)}, {}),
    (16, {'arm.L': (r(20), 0, 0), 'arm.R': (r(20), 0, 0), 'spine': (r(15), 0, 0), **wing(-10)}, {}),
])
key('Hit', [
    (1, {}, {}),
    (4, {'spine': (r(-22), 0, r(8)), 'head': (r(-25), 0, 0), 'arm.L': (r(-30), 0, r(-25)), 'arm.R': (r(-20), 0, r(30)), **wing(40)}, {}),
    (14, {}, {}),
])
key('Death', [
    (1, {}, {'z': 0}),
    (10, {'spine': (r(-35), 0, r(10)), 'head': (r(-30), 0, 0), 'thigh.L': (r(40), 0, 0), 'thigh.R': (r(30), 0, 0), 'shin.L': (r(-70), 0, 0), 'shin.R': (r(-80), 0, 0), 'arm.L': (r(-60), 0, r(-40)), 'arm.R': (r(-50), 0, r(40)), **wing(-30)}, {'z': -0.22}),
    (24, {'spine': (r(-70), 0, r(15)), 'head': (r(-30), 0, r(20)), 'thigh.L': (r(80), 0, 0), 'thigh.R': (r(70), 0, 0), 'shin.L': (r(-100), 0, 0), 'shin.R': (r(-110), 0, 0), 'arm.L': (r(-100), 0, r(-60)), 'arm.R': (r(-90), 0, r(70)), **wing(-60)}, {'z': -0.42}),
])

bpy.context.scene.render.fps = 30
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', use_selection=True, export_animation_mode='NLA_TRACKS',
                          export_image_format='JPEG', export_image_quality=85)
print('EXPORTED', dst, 'tris', sum(len(p.vertices) - 2 for p in obj.data.polygons), 'verts', len(obj.data.vertices))
