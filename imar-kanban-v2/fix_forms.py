import re, sys

filepath = r'C:\Users\mkocak\Desktop\projects\imar-kanban-v2\frontend\src\pages\forms\FormsPage.tsx'

with open(filepath, 'rb') as f:
    raw = f.read()

# decode ignoring bad bytes
content = raw.decode('utf-8', errors='replace')

# Good replacement function with proper escape sequences
good_func = (
    '// Parse description to extract attachments\n'
    'function parseSubmissionDesc(desc: string) {\n'
    "  const SEP = '\n\n---\n**Ekler:**\n';\n"
    '  const idx = desc.indexOf(SEP);\n'
    "  if (idx === -1) return { text: desc, attachments: [] as Array<{ name: string; url: string; isImage: boolean }> };\n"
    '  const text = desc.substring(0, idx);\n'
    '  const section = desc.substring(idx + SEP.length);\n'
    "  const attachments: Array<{ name: string; url: string; isImage: boolean }> = [];\n"
    "  for (const line of section.split('\n')) {\n"
    "    const img = line.match(/^!\[(.+?)\]\((.+?)\)$/);\n"
    '    if (img) { attachments.push({ name: img[1], url: img[2], isImage: true }); continue; }\n'
    "    const file = line.match(/^\[(.+?)\]\((.+?)\)$/);\n"
    '    if (file) { attachments.push({ name: file[1], url: file[2], isImage: false }); }\n'
    '  }\n'
    '  return { text, attachments };\n'
    '}\n'
)

# Replace broken function (anything between the broken comment and 'type TabKey')
pattern = r'// A[^\n]+\nfunction parseSubmissionDesc[\s\S]+?\}\s*(?=type TabKey)'
new_content = re.sub(pattern, good_func + '\n', content)

changed = new_content != content
print("Changed:", changed)
if changed:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Written OK")
else:
    print("No match found, trying to show area:")
    idx = content.find('parseSubmissionDesc')
    print(repr(content[max(0,idx-50):idx+300]))
