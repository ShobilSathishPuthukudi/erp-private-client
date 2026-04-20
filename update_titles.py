import os

replacements = {
    'title="Institutional Feedback"': 'title="Institutional feedback"',
    'title="Workforce Planning"': 'title="Workforce planning"',
    'title="Employee Communications"': 'title="Employee communications"',
    'title="Personnel Directory"': 'title="Personnel directory"',
    'title="Institutional Presence"': 'title="Institutional presence"',
    'title="Holiday Synchronization"': 'title="Holiday synchronization"',
    'title="Global Task Control"': 'title="Global task control"',
    'title="Global Announcements"': 'title="Global announcements"',
    'title="Performance Metrics"': 'title="Performance metrics"',
    'title="Employee Remap"': 'title="Employee remap"',
    'title="Employee Identity Hub"': 'title="Employee identity hub"',
    'title="Leave Approvals"': 'title="Leave approvals"',
    'title="Administrators List"': 'title="Administrators list"',
    'title="Daily Admission Intelligence"': 'title="Daily admission intelligence"',
    'title="Student Payment Pipelines"': 'title="Student payment pipelines"',
    'title="Contact HR"': 'title="Contact HR"',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        if old != new:
            new_content = new_content.replace(old, new)
            
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('./client/src/pages'):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))
