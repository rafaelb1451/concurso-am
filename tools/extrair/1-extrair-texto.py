import sys, os
sys.path.insert(0, r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\tmp\pylibs')
import fitz

PROVAS = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso\backend\provas'
RAW = os.path.join(PROVAS, 'raw')
os.makedirs(RAW, exist_ok=True)

for f in sorted(os.listdir(PROVAS)):
    if not f.lower().endswith('.pdf'):
        continue
    doc = fitz.open(os.path.join(PROVAS, f))
    parts = []
    for i, page in enumerate(doc):
        parts.append(f'===== PAGINA {i + 1} =====\n' + page.get_text())
    text = '\n'.join(parts)
    out = os.path.join(RAW, f[:-4] + '.txt')
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write(text)
    # resumo ASCII-only
    chars = len(text)
    words = len(text.split())
    first = text.strip().splitlines()[0][:80] if text.strip() else '(vazio)'
    print(f'{f}: {doc.page_count} paginas, {chars} chars, {words} palavras | p1: {first.encode("ascii", "replace").decode()}')
    doc.close()

print('gravado em', RAW)
