"""Phase 3: generate a complete rim in a NEW visible Blender window.

Preserves plain-ring and botanical-section review files. Uses the shared botanical
geometry helpers, batching established meshes while keeping three shoots animated.
"""
import bpy
import importlib.util
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('living_frame_botanical',ROOT/'create_botanical_section.py')
botanical = importlib.util.module_from_spec(spec)
spec.loader.exec_module(botanical)

def create():
    window=bpy.context.window_manager.windows[0]
    area=next(area for area in window.screen.areas if area.type=='VIEW_3D')
    region=next(region for region in area.regions if region.type=='WINDOW')
    with bpy.context.temp_override(window=window,area=area,region=region):
        return botanical.build(full_ring=True)

if __name__=='__main__':
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'plain-ring.blend'))
    if bpy.app.background:create()
    else:bpy.app.timers.register(create,first_interval=2)
