import io,json,struct
from pathlib import Path
from PIL import Image
snapshot=json.loads(Path('artifacts/xr-audit/source-and-asset-snapshot.json').read_text(encoding='utf-8'))
rows=[]
for item in snapshot['assets']:
    data=Path(item['file']).read_bytes();length=struct.unpack_from('<I',data,12)[0];model=json.loads(data[20:20+length]);binary=data[28+length:];images=[]
    for image in model.get('images',[]):
        if 'bufferView' not in image:continue
        view=model['bufferViews'][image['bufferView']];start=view.get('byteOffset',0)
        with Image.open(io.BytesIO(binary[start:start+view['byteLength']])) as opened:
            images.append({'width':opened.width,'height':opened.height,'encodedBytes':view['byteLength'],'rgbaBytes':opened.width*opened.height*4})
    rows.append({'file':item['file'],'images':images,'rgbaBytes':sum(i['rgbaBytes'] for i in images)})
print(json.dumps({'note':'RGBA8-equivalent decoded image size; not measured GPU residency. No mips, driver copies, compressed GPU formats or scene clones included.','assets':rows},indent=2))
