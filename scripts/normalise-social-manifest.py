from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'blackwave/social/data/campaign-media.json'
data = json.loads(p.read_text())
for asset in data['assets']:
    asset['output'] = asset['output'].replace('assets/approved/shorts/', 'media/shorts/')
    asset['output'] = asset['output'].replace('assets/approved/flagship/', 'media/flagship/')
    asset['output'] = asset['output'].replace('assets/approved/trailer/', 'media/trailer/')
    asset['caption'] = asset['caption'].replace('assets/captions/', 'captions/')
p.write_text(json.dumps(data, indent=2) + '\n')
print({'assets': len(data['assets']), 'normalised': True})
