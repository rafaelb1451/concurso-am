import json, os, sys, urllib.request

BASE = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace'
API = 'http://localhost:8080'
ENTRADAS = [
    BASE + r'\tmp\lotes-exp\saida-A.json',
    BASE + r'\tmp\lotes-exp\saida-B.json',
    BASE + r'\tmp\lotes-exp\saida-C.json',
    BASE + r'\tmp\lotes-exp\saida-D.json',
    BASE + r'\tmp\lotes-exp\saida-E.json',
]

previstas = json.load(open(BASE + r'\tmp\questoes-para-explicar.json', encoding='utf-8'))
hash_para_ordem = {q['hash']: q['ordem'] for q in previstas}
ja_feitas = {q['hash'] for q in previstas if q['ordem'] <= 40}

problemas = []
todos = []
vistos = set()

for caminho in ENTRADAS:
    nome = os.path.basename(caminho)
    if not os.path.exists(caminho):
        problemas.append(f'{nome}: arquivo nao existe')
        continue
    try:
        dados = json.load(open(caminho, encoding='utf-8'))
    except Exception as e:
        problemas.append(f'{nome}: JSON invalido ({e})')
        continue
    if not isinstance(dados, list):
        problemas.append(f'{nome}: nao e uma lista')
        continue
    validos = 0
    for i, item in enumerate(dados):
        if not isinstance(item, dict):
            problemas.append(f'{nome}[{i}]: nao e objeto')
            continue
        h = item.get('hash')
        exp = (item.get('explicacao') or '').strip()
        fund = (item.get('fundamento') or '').strip()
        if h not in hash_para_ordem:
            problemas.append(f'{nome}[{i}]: hash desconhecido {h}')
            continue
        if h in ja_feitas:
            problemas.append(f'{nome}[{i}]: duplicado de um ja feito (ordem {hash_para_ordem[h]})')
            continue
        if h in vistos:
            problemas.append(f'{nome}[{i}]: hash repetido entre lotes (ordem {hash_para_ordem[h]})')
            continue
        if len(exp) < 60:
            problemas.append(f'{nome}[{i}]: explicacao curta demais ({len(exp)} chars)')
            continue
        if not fund:
            problemas.append(f'{nome}[{i}]: fundamento vazio')
        vistos.add(h)
        todos.append({'hash': h, 'explicacao': exp, 'fundamento': fund,
                      'ordem': hash_para_ordem[h], 'arquivo': nome})
        validos += 1
    print(f'{nome}: {validos} validos de {len(dados)}')

print(f'\ntotal a importar: {len(todos)}')
print(f'cobertura: 40 (feitas) + {len(todos)} = {40 + len(todos)} de {len(previstas)}')
faltando = sorted(o for o in range(1, len(previstas) + 1)
                  if o > 40 and o not in {t['ordem'] for t in todos})
if faltando:
    print('ordens faltando:', faltando[:20])

if problemas:
    print(f'\nPROBLEMAS ({len(problemas)}):')
    for p in problemas[:30]:
        print('  -', p)
    sys.exit(1)

# importa
corpo = json.dumps([{k: t[k] for k in ('hash', 'explicacao', 'fundamento')} for t in todos],
                   ensure_ascii=False).encode('utf-8')
req = urllib.request.Request(f'{API}/api/explicacoes', data=corpo,
                             headers={'Content-Type': 'application/json'}, method='POST')
r = json.loads(urllib.request.urlopen(req, timeout=120).read())
print(f"\nimportadas: recebidas {r['recebidas']} | atualizadas {r['atualizadas']} | nao encontradas {len(r['naoEncontradas'])}")

with open(BASE + r'\concurso\backend\lotes\explicacoes-02.json', 'w', encoding='utf-8') as fh:
    json.dump([{k: t[k] for k in ('hash', 'explicacao', 'fundamento')} for t in todos],
              fh, ensure_ascii=False, indent=2)
print('gravado explicacoes-02.json')
