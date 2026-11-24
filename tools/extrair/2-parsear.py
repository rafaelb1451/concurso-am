import re, json, os, html

RAW = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso\backend\provas\raw'
OUT = RAW

# ---------------- gabarito ----------------
def parse_gabarito(txt_path, section_marker):
    lines = open(txt_path, encoding='utf-8').read().splitlines()
    start = None
    for i, line in enumerate(lines):
        if section_marker in line.strip():
            start = i
            break
    if start is None:
        raise SystemExit(f'secao nao encontrada: {section_marker}')
    end = len(lines)
    for i in range(start + 1, len(lines)):
        s = lines[i].strip()
        if s and re.search(r'Tipo\s*\d', s):
            end = i
            break
    numbers, letters = [], []
    for line in lines[start + 1:end]:
        s = line.strip()
        if re.fullmatch(r'\d{1,3}', s):
            numbers.append(int(s))
        elif re.fullmatch(r'[A-E*]', s):
            letters.append(s)
    if len(numbers) != len(letters):
        raise SystemExit(f'GABARITO {section_marker}: numeros {len(numbers)} != letras {len(letters)}')
    return {n: (None if l == '*' else l) for n, l in zip(numbers, letters)}

# ---------------- prova ----------------
ALT = re.compile(r'^\(([A-E])\)\s*(.*)$')
PAGE = re.compile(r'^=+\s*PAGINA\s*\d+\s*=+$')

HEADERS = {
    'Polícia Militar do Estado do Amazonas',
    'Polícial Civil do Estado do Amazonas',
    'POLÍCIA CIVIL DO ESTADO DO AMAZONAS - 2021',
    'FGV',
    'Aluno Soldado da PM',
    'Investigador de Polícia – 4ª Classe',
    'REALIZAÇÃO',
    'GOVERNO DO ESTADO DO AMAZONAS',
}

# Titulos de materia (alguns quebram em duas linhas no PDF).
MATERIAS = {
    'Língua Portuguesa',
    'Geografia do Amazonas',
    'Geografia do Amazonas e',
    'História do Amazonas',
    'Raciocínio Lógico Matemático',
    'Raciocínio Lógico-Matemático',
    'Noções de Informática',
    'Legislação Institucional',
    'Noções de Administração',
    'Noções de Contabilidade',
    'Noções de Direito Constitucional',
    'Noções de Direito Penal, Processual',
    'Penal e Legislação Extravagante',
    'Noções de Direito Administrativo',
}

def clean_lines(raw_lines):
    """Remove marcadores de pagina, cabecalhos/rodapes e titulos de materia."""
    out = []
    for line in raw_lines:
        s = line.strip()
        if not s:
            continue
        if PAGE.match(s):
            continue
        if 'Página' in s or 'PAGINA' in s:
            continue
        if s in HEADERS or s in MATERIAS:
            continue
        if s.startswith('Questão Discursiva') or s.startswith('PROVA DISCURSIVA') or s.startswith('Redação'):
            break
        out.append(s)
    return out

def parse_prova(txt_path, total):
    lines = clean_lines(open(txt_path, encoding='utf-8').read().splitlines())
    questions = {}
    expected = 1
    cur = None
    cur_alt = None
    for s in lines:
        if re.fullmatch(r'\d{1,3}', s) and int(s) == expected:
            if cur is not None:
                questions[cur['n']] = cur
            cur = {'n': expected, 'enunciado': [], 'alternativas': {}}
            cur_alt = None
            expected += 1
            continue
        if cur is None:
            continue
        m = ALT.match(s)
        if m:
            letra, texto = m.group(1), m.group(2)
            cur['alternativas'][letra] = texto
            cur_alt = letra
        else:
            if cur_alt is not None:
                cur['alternativas'][cur_alt] += ' ' + s
            else:
                cur['enunciado'].append(s)
    if cur is not None:
        questions[cur['n']] = cur
    return questions

def limpar(t):
    """Remove caracteres de uso privado do PDF (bullets do Symbol), espacos especiais
    e normaliza espacos — sem isso sobra lixo invisivel no texto."""
    if not t:
        return ''
    t = t.replace('\uf0b7', ' ')
    t = ''.join(ch for ch in t if not (0xE000 <= ord(ch) <= 0xF8FF))
    t = t.replace('\u200b', '').replace('\u00a0', ' ').replace('\u00ad', '')
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# ---------------- execucao ----------------
jobs = [
    ('aluno_soldado_da_pmnm001_tipo_4.txt', 'pm-am-soldado-tipo4', 'Aluno Soldado PM – Tipo 4', 60, 'ABCDE',
     'pmam2021_gabarito_definitivo_retificado_26.04.2022.txt'),
    ('investigador_de_policia_-_4a_classens100_tipo_1.txt', 'pc-am-investigador-tipo1',
     'Investigador de Polícia - 4ª Classe – Tipo 1', 80, 'ABCDE',
     'pcam2021e02_gabarito_definitivo.txt'),
]

todas = []
for prova_file, out_name, marker, total, letras, gab_file in jobs:
    gabarito = parse_gabarito(os.path.join(RAW, gab_file), marker)
    qs = parse_prova(os.path.join(RAW, prova_file), total)

    resultado = []
    problemas = []
    anuladas = []
    for n in range(1, total + 1):
        q = qs.get(n)
        if q is None:
            problemas.append(f'questao {n} nao encontrada')
            continue
        alt = q['alternativas']
        falta = [l for l in letras if l not in alt]
        if falta:
            problemas.append(f'questao {n}: faltam alternativas {falta}')
        g = gabarito.get(n, '?')
        if g is None:
            anuladas.append(n)
        resultado.append({
            'numero': n,
            'materia': None,
            'enunciado': limpar(' '.join(q['enunciado'])),
            'alternativas': {l: limpar(alt.get(l, '')) for l in letras},
            'gabarito': g,
            'anulada': g is None,
        })

    with open(os.path.join(OUT, out_name + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(resultado, fh, ensure_ascii=False, indent=2)

    validas = [r for r in resultado if not r['anulada']]
    sujas = [r for r in resultado if any(k in str(r['alternativas']) for k in
             ('Página', 'PAGINA', 'FGV', 'Discursiva', 'REALIZAÇÃO', 'Língua Portuguesa',
              'Noções de', 'Raciocínio', 'Legislação', 'História do Amazonas', 'Geografia do Amazonas'))]
    print(f'{out_name}: {len(resultado)}/{total} | anuladas: {anuladas} | validas: {len(validas)} | problemas: {len(problemas)} | sujas: {[r["numero"] for r in sujas]}')
    for p in problemas[:10]:
        print('   !', p)
    todas.append((out_name, resultado))

# ---------------- revisao HTML ----------------
def esc(t): return html.escape(t or '')

rows = []
for nome, resultado in todas:
    for r in resultado:
        alts = ''.join(
            f'<li style="{"font-weight:700;color:#16a34a" if l == r["gabarito"] else ""}">'
            f'<b>{l})</b> {esc(r["alternativas"].get(l, ""))}</li>'
            for l in 'ABCDE'
        )
        badge = 'ANULADA' if r['anulada'] else (f"GABARITO {r['gabarito']}")
        color = '#dc2626' if r['anulada'] else '#0f172a'
        rows.append(f'''
<article style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin:0 0 14px;">
  <h3 style="margin:0 0 6px;font-size:15px;">{nome} — Q{r['numero']} <span style="color:{color};font-weight:700;">{badge}</span></h3>
  <p style="white-space:pre-line;margin:0 0 8px;">{esc(r['enunciado'])}</p>
  <ol style="list-style:none;padding:0;margin:0;">{alts}</ol>
</article>''')

html_doc = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Revisão das provas</title>
<style>body{{font-family:system-ui,Segoe UI,Arial;max-width:860px;margin:24px auto;padding:0 16px;color:#0f172a}}
h1{{font-size:20px}} li{{margin:2px 0}}</style></head>
<body><h1>Revisão das provas — PM-AM Soldado e PC-AM Investigador</h1>
<p>Alternativa correta em verde. Questões anuladas em vermelho.</p>
{''.join(rows)}</body></html>'''

with open(os.path.join(OUT, 'revisao.html'), 'w', encoding='utf-8') as fh:
    fh.write(html_doc)
print('revisao.html gerado com', len(rows), 'questoes')
