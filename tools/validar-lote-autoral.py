import json, os, re, sys, unicodedata, hashlib

BASE = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso'
LOTES = os.path.join(BASE, 'backend', 'lotes')

MATERIAS = {
    'Língua Portuguesa', 'Raciocínio Lógico-Matemático', 'Noções de Informática',
    'História do Amazonas', 'Geografia do Amazonas', 'História e Geografia do Amazonas',
    'Legislação Institucional', 'Noções de Administração', 'Noções de Contabilidade',
    'Direito Constitucional', 'Direito Penal e Processual Penal', 'Direito Administrativo',
    'Noções de Direito',
}

def hash_de(enunciado):
    t = unicodedata.normalize('NFD', enunciado or '')
    t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
    t = t.lower()
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return hashlib.sha256(t.encode('utf-8')).digest()[:16].hex()

def carregar(caminho):
    with open(caminho, encoding='utf-8') as fh:
        return json.load(fh)

# hashes ja existentes (seed + lotes de questao)
existentes = {}
for nome in ['questoes.json']:
    p = os.path.join(BASE, 'backend', 'src', 'main', 'resources', nome)
    for q in carregar(p):
        existentes[hash_de(q['enunciado'])] = nome
for nome in ['lote-01.json', 'lote-02-provas.json']:
    p = os.path.join(LOTES, nome)
    if os.path.exists(p):
        for q in carregar(p):
            existentes[hash_de(q['enunciado'])] = nome

arquivos = sys.argv[1:]
if not arquivos:
    arquivos = [os.path.join(LOTES, f) for f in sorted(os.listdir(LOTES))
                if f.startswith('lote-0') and ('portugues' in f or 'rlm' in f or 'informatica' in f
                                               or 'constitucional' in f or 'penal' in f)]

problemas = []
total = 0
vistos = dict(existentes)

for caminho in arquivos:
    nome = os.path.basename(caminho)
    if not os.path.exists(caminho):
        problemas.append(f'{nome}: arquivo nao existe')
        continue
    try:
        dados = carregar(caminho)
    except Exception as e:
        problemas.append(f'{nome}: JSON invalido ({e})')
        continue
    if not isinstance(dados, list):
        problemas.append(f'{nome}: nao e lista')
        continue
    validos = 0
    for i, q in enumerate(dados):
        rotulo = f'{nome}[{i}]'
        if not isinstance(q, dict):
            problemas.append(f'{rotulo}: nao e objeto'); continue
        erros = []
        if q.get('materia') not in MATERIAS:
            erros.append(f"materia invalida '{q.get('materia')}'")
        if not (q.get('enunciado') or '').strip():
            erros.append('enunciado vazio')
        elif len(q['enunciado'].strip()) < 30:
            erros.append(f"enunciado curto ({len(q['enunciado'])} chars)")
        alts = q.get('alternativas') or []
        if len(alts) != 5:
            erros.append(f'{len(alts)} alternativas (esperado 5)')
        if any(not (a or '').strip() for a in alts):
            erros.append('alternativa vazia')
        if not isinstance(q.get('correta'), int) or not (0 <= q['correta'] <= 4):
            erros.append(f"correta invalida ({q.get('correta')})")
        if len((q.get('explicacao') or '').strip()) < 40:
            erros.append('explicacao curta/ausente')
        if not (q.get('fundamento') or '').strip():
            erros.append('fundamento vazio')
        conc = q.get('concursos') or []
        if not conc or any(c not in ('PM-AM', 'PC-AM') for c in conc):
            erros.append(f'concursos invalidos {conc}')
        h = hash_de(q.get('enunciado'))
        if h in vistos:
            erros.append(f'duplicada de {vistos[h]}')
        if erros:
            problemas.append(f'{rotulo}: ' + '; '.join(erros))
            continue
        vistos[h] = nome
        validos += 1
    total += validos
    print(f'{nome}: {validos} validos de {len(dados)}')

print(f'\ntotal valido nos lotes novos: {total}')
if problemas:
    print(f'\nPROBLEMAS ({len(problemas)}):')
    for p in problemas[:40]:
        print('  -', p)
    sys.exit(1)
print('sem problemas estruturais')
