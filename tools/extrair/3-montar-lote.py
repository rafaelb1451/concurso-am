import re, json, os

RAW = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso\backend\provas\raw'
OUT = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso\backend\lotes'

# (arquivo, titulo da secao no PDF, materia no app, assunto no app)
SECOES = {
    'aluno_soldado_da_pmnm001_tipo_4.txt': [
        ('Língua Portuguesa', 'Língua Portuguesa', 'Gramática e interpretação'),
        ('Geografia do Amazonas', 'Geografia do Amazonas', 'Geografia do Amazonas'),
        ('História do Amazonas', 'História do Amazonas', 'História do Amazonas'),
        ('Raciocínio Lógico Matemático', 'Raciocínio Lógico-Matemático', 'Raciocínio lógico'),
        ('Noções de Informática', 'Noções de Informática', 'Informática básica'),
        ('Legislação Institucional', 'Legislação Institucional', 'Legislação institucional'),
    ],
    'investigador_de_policia_-_4a_classens100_tipo_1.txt': [
        ('Língua Portuguesa', 'Língua Portuguesa', 'Gramática e interpretação'),
        ('Raciocínio Lógico-Matemático', 'Raciocínio Lógico-Matemático', 'Raciocínio lógico'),
        ('Geografia do Amazonas e', 'História e Geografia do Amazonas', 'Formação territorial e histórica'),
        ('Noções de Informática', 'Noções de Informática', 'Informática básica'),
        ('Noções de Administração', 'Noções de Administração', 'Administração'),
        ('Noções de Contabilidade', 'Noções de Contabilidade', 'Contabilidade'),
        ('Noções de Direito Constitucional', 'Direito Constitucional', 'Direito Constitucional'),
        ('Noções de Direito Penal, Processual', 'Direito Penal e Processual Penal', 'Penal e processual penal'),
        ('Noções de Direito Administrativo', 'Direito Administrativo', 'Direito Administrativo'),
    ],
}

META = {
    'aluno_soldado_da_pmnm001_tipo_4.txt': {
        'json': 'pm-am-soldado-tipo4.json', 'orgao': 'Polícia Militar do Amazonas',
        'cargo': 'Aluno Soldado', 'ano': 2022, 'concurso': 'PM-AM',
    },
    'investigador_de_policia_-_4a_classens100_tipo_1.txt': {
        'json': 'pc-am-investigador-tipo1.json', 'orgao': 'Polícia Civil do Amazonas',
        'cargo': 'Investigador de Polícia - 4ª Classe', 'ano': 2022, 'concurso': 'PC-AM',
    },
}

def mapear_materias(txt_file, secoes):
    """Para cada titulo de secao, acha a linha e o primeiro numero de questao depois dela."""
    lines = open(os.path.join(RAW, txt_file), encoding='utf-8').read().splitlines()
    marcas = []
    for titulo, materia, assunto in secoes:
        for i, line in enumerate(lines):
            if line.strip() == titulo:
                # primeiro numero de questao apos o titulo
                for j in range(i + 1, min(i + 12, len(lines))):
                    s = lines[j].strip()
                    if re.fullmatch(r'\d{1,3}', s):
                        marcas.append((int(s), materia, assunto))
                        break
                break
        else:
            raise SystemExit(f'secao nao encontrada: {titulo} em {txt_file}')
    marcas.sort()
    return marcas

lote = []
resumo = []
for txt_file, meta in META.items():
    marcas = mapear_materias(txt_file, SECOES[txt_file])
    print(f'{meta["concurso"]}: secoes -> {[(n, m) for n, m, _ in marcas]}')

    dados = json.load(open(os.path.join(RAW, meta['json']), encoding='utf-8'))
    for q in dados:
        # materia = ultima secao que comeca antes ou na questao
        materia, assunto = marcas[0][1], marcas[0][2]
        for inicio, mat, ass in marcas:
            if q['numero'] >= inicio:
                materia, assunto = mat, ass
        if q['anulada']:
            continue
        # PC-AM Q15: a tabela dos gols e' imagem no PDF (nao extraivel) -> sem dados, fica fora.
        if meta['concurso'] == 'PC-AM' and q['numero'] == 15:
            continue
        lote.append({
            'materia': materia,
            'assunto': assunto,
            'origem': 'PROVA',
            'banca': 'FGV',
            'ano': meta['ano'],
            'orgao': meta['orgao'],
            'cargo': meta['cargo'],
            'fundamento': None,
            'dificuldade': 2,
            'enunciado': q['enunciado'],
            'alternativas': [q['alternativas'][l] for l in 'ABCDE'],
            'correta': 'ABCDE'.index(q['gabarito']),
            'explicacao': None,
            'concursos': [meta['concurso']],
        })

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, 'lote-02-provas.json'), 'w', encoding='utf-8') as fh:
    json.dump(lote, fh, ensure_ascii=False, indent=2)

from collections import Counter
print(f'\ntotal no lote: {len(lote)}')
for materia, n in Counter(q['materia'] for q in lote).most_common():
    print(f'  {n:>2}  {materia}')
