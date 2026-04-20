import os
import re
import json

results = []

def get_files(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                yield os.path.join(root, file)

for filepath in get_files('./client/src/pages'):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            matches = re.finditer(r'<PageHeader[^>]*title=["\']([^"\']+)["\']', content)
            for match in matches:
                results.append({
                    "file": filepath,
                    "original": match.group(1)
                })
    except Exception as e:
        pass

print(json.dumps(results, indent=2))
