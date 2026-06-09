import re

with open('maquette.html', 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
if match:
    css = match.group(1)
    with open('frontend/src/App.css', 'w', encoding='utf-8') as f:
        f.write(css)
    print("CSS Extracted successfully.")
else:
    print("No style tag found.")
