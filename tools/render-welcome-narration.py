"""Render the fixed tutorial with the same approved voice as project narration.

First export catalog.json with Node from welcomePracticeContent.js. Set
NXR_SPEECH_RUNTIME if edge_tts is installed in a separate directory.
Paragraphs are recorded at natural speed and separated by real silence.
"""
import asyncio, json, pathlib, sys, subprocess, os, hashlib
root = pathlib.Path(__file__).resolve().parents[1]
if os.environ.get('NXR_SPEECH_RUNTIME'):
    sys.path.insert(0, os.environ['NXR_SPEECH_RUNTIME'])
import edge_tts
work = root / '.tmp/welcome-narration'
dest = root / 'app/assets/welcome-practice/voice'
ffmpeg = os.environ.get('NXR_FFMPEG', 'C:/Program Files/Virtual Desktop Streamer/ffmpeg.exe')
clips = json.loads((work / 'catalog.json').read_text(encoding='utf-8-sig'))
gate = asyncio.Semaphore(2)

async def render(clip):
    async with gate:
        fingerprint = hashlib.sha256(clip['spoken'].encode()).hexdigest()
        stamp = work / (clip['id'] + '.sha256')
        target = dest / (clip['id'] + '.mp3')
        if target.exists() and stamp.exists() and stamp.read_text() == fingerprint:
            return
        paragraphs = [p.strip() for p in clip['spoken'].split('\n\n') if p.strip()]
        inputs, filters = [], []
        for i, paragraph in enumerate(paragraphs):
            source = work / (clip['id'] + '-' + str(i) + '.mp3')
            for attempt in range(3):
                try:
                    await edge_tts.Communicate(paragraph, 'en-US-AvaMultilingualNeural', rate='+0%', pitch='+0Hz').save(str(source))
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 + attempt * 3)
            inputs += ['-i', str(source)]
            filters.append(f'[{i}:a]aresample=24000,aformat=channel_layouts=mono,highpass=f=65,deesser=i=0.12:m=0.18:f=0.5,apad=pad_dur={1.3 if i < len(paragraphs)-1 else .3}[p{i}]')
        filters.append(''.join(f'[p{i}]' for i in range(len(paragraphs))) + f'concat=n={len(paragraphs)}:v=0:a=1[out]')
        subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(filters), '-map', '[out]', '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '128k', str(target)], check=True)
        stamp.write_text(fingerprint)
        print('Recorded ' + clip['id'], flush=True)

async def main():
    work.mkdir(parents=True, exist_ok=True)
    dest.mkdir(parents=True, exist_ok=True)
    await asyncio.gather(*(render(c) for c in clips if c.get('spoken')))
    (dest / 'CREDITS.md').write_text('# Zinnia tutorial narration\n\nApproved voice: en-US-AvaMultilingualNeural, matching project narration.\nNatural pitch and rate; 1.3 seconds of silence between paragraphs.\n24 kHz mono MP3, highpass 65 Hz and light de-essing.\nGenerated with tools/render-welcome-narration.py from welcomePracticeContent.js.\n', encoding='utf-8')

asyncio.run(main())
