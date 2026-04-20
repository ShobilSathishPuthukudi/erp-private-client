import os
import re

acronyms = {'HR', 'CEO', 'CRM', 'PDF', 'ERP', 'HUD', 'UID', 'ID'}

def to_sentence_case(text):
    if not text or not text.strip(): return text
    words = text.split()
    if not words: return text
    
    res = []
    for i, w in enumerate(words):
        # Remove punctuation for checking acronyms
        clean_w = re.sub(r'[^a-zA-Z0-9]', '', w)
        if clean_w.upper() in acronyms or clean_w in acronyms:
            # Preserve acronym case exactly
            res.append(w.upper())
        elif i == 0:
            res.append(w.capitalize())
        else:
            res.append(w.lower())
    return " ".join(res)

def replace_page_headers(match):
    prefix = match.group(1) # <PageHeader \n title="
    title = match.group(2)
    suffix = match.group(3) # "
    return f"{prefix}{to_sentence_case(title)}{suffix}"

def replace_h_tags(match):
    prefix = match.group(1) # <h1 ...>
    title = match.group(2)
    suffix = match.group(3) # </h1>
    # Skip if contains {} (react variables) or other tags
    if '{' in title or '<' in title:
        return match.group(0)
    return f"{prefix}{to_sentence_case(title)}{suffix}"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    # Replace <PageHeader title="X">
    new_content = re.sub(r'(<PageHeader[^>]*?title=["\'])([^"\']+)(["\'])', replace_page_headers, new_content)
    # Replace <h1...>X</h1>
    new_content = re.sub(r'(<h1[^>]*>)([^<]+)(</h1>)', replace_h_tags, new_content)
    # Replace <h2...>X</h2> ONLY if it looks like a page title (e.g., text-3xl, text-2xl, font-black)
    new_content = re.sub(r'(<h2[^>]*?(?:text-[234]xl|font-black)[^>]*>)([^<]+)(</h2>)', replace_h_tags, new_content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('./client/src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
