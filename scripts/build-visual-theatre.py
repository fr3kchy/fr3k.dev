#!/usr/bin/env python3
import subprocess, json, shutil, os
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'blackwave/social/media/visuals'
OUT.mkdir(parents=True,exist_ok=True)
ASSET_SOURCE=os.environ.get('BLACKWAVE_ASSET_DIR')
if not ASSET_SOURCE:
    raise SystemExit('Set BLACKWAVE_ASSET_DIR to the authorised private image-source directory.')
ASSET_DIR=Path(ASSET_SOURCE)
IMAGES=sorted(ASSET_DIR.glob('*.png'))
assert len(IMAGES)>=10

def run(cmd):
    subprocess.run(cmd,check=True)

def make(name, source, caption, width, height, duration, count):
    dest=OUT/name
    selected=[IMAGES[i%len(IMAGES)] for i in range(count)]
    seg=duration/count
    inputs=[]
    for image in selected:
        inputs += ['-loop','1','-t',str(seg),'-i',str(image)]
    filters=[]
    labels=[]
    for i in range(count):
        label=f'v{i}'
        filters.append(f'[{i}:v]scale={width}:{height}:force_original_aspect_ratio=increase,crop={width}:{height},format=yuv420p,setsar=1[{label}]')
        labels.append(f'[{label}]')
    filters.append(''.join(labels)+f'concat=n={count}:v=1:a=0[vout]')
    run(['ffmpeg','-y','-hide_banner','-loglevel','error',*inputs,'-i',str(source),'-filter_complex',';'.join(filters),'-map','[vout]','-map',f'{count}:a:0?','-t',str(duration),'-c:v','libx264','-profile:v','baseline','-level','4.0','-pix_fmt','yuv420p','-preset','veryfast','-crf','22','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',str(dest)])
    return dest

make('BW-FLAGSHIP-90s-visual.mp4',ROOT/'assets/campaign/blackwave/BW-FLAGSHIP-90s.mp4',ROOT/'blackwave/social/captions/BW-FLAGSHIP-90s.srt',1920,1080,90,11)
make('BW-TRAILER-30s-visual.mp4',ROOT/'assets/campaign/blackwave/BW-TRAILER-30s.mp4',ROOT/'blackwave/social/captions/BW-TRAILER-30s.srt',1920,1080,30,6)
shorts=sorted((ROOT/'blackwave/social/media/shorts').glob('*.mp4'))
for n,src in enumerate(shorts):
    make(src.stem+'-visual.mp4',src,ROOT/'blackwave/social/captions'/(src.stem+'.srt'),1080,1920,20,5)
print(json.dumps({'visual_flagship':1,'visual_trailer':1,'visual_shorts':len(shorts)}))
