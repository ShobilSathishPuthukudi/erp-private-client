import os
import re
import json

titles = set()

for root, dirs, files in os.walk('./client/src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                # Match title="Something"
                matches_attr = re.findall(r'title="([a-zA-Z\s&]+)"', content)
                for m in matches_attr:
                    titles.add(m)
                
                # Match <h1...>Something</h1>
                matches_h1 = re.findall(r'<h1[^>]*>([a-zA-Z\s&]+)</h1>', content)
                for m in matches_h1:
                    titles.add(m)

print(sorted(list(titles)))
