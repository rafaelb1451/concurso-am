"""Relatório de qualidade do banco de questões (lê a API, não o arquivo).

    python relatorio-qualidade.py [url]

Mostra: volume por matéria, procedência, cobertura de fundamento/comentário,
distribuição de gabaritos e assuntos mais/menos cobertos.
"""
import sys, json, urllib.request
from collections import Counter, defaultdict

API = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080'


def get(caminho):
    with urllib.request.urlopen(API + caminho, timeout=30) as r:
        return json.loads(r.read())


def main():
    concursos = get('/api/concursos')
    total = next((c['total'] for c in concursos if c['id'] == 'TODOS'), 0)

    # coleta todas as questões (a API limita 50 por consulta e embaralha)
    vistas = {}
    topicos = get('/api/topicos')
    materias = sorted({t['materia'] for t in topicos})
    from urllib.parse import quote
    for m in materias:
        for _ in range(6):  # varias amostras para cobrir materias grandes
            for q in get(f'/api/questoes?materia={quote(m)}&quantidade=50'):
                vistas[q['id']] = q
    questoes = list(vistas.values())

    print(f'BANCO: {total} questões (coletadas {len(questoes)} para análise)\n')

    por_materia = Counter(q['materia'] for q in questoes)
    origem = Counter(q['origem'] for q in questoes)
    sem_fundamento = [q for q in questoes if not q.get('precedente') and not q.get('temExplicacao')]
    sem_comentario = [q for q in questoes if not q.get('temExplicacao')]
    sem_materia_alta = [q for q in questoes if not q.get('fundamento')] if questoes and 'fundamento' in questoes[0] else []

    print('POR MATÉRIA')
    for m, n in por_materia.most_common():
        barra = '#' * max(1, round(n / 2))
        print(f'  {n:>4}  {m:<34} {barra}')

    print('\nPROCEDÊNCIA')
    for o, n in origem.most_common():
        print(f'  {n:>4}  {o}')

    print('\nCOBERTURA')
    print(f'  sem comentário cadastrado: {len(sem_comentario)}')
    assuntos = Counter((q['materia'], q['assunto']) for q in questoes)
    print(f'  assuntos distintos: {len(assuntos)}')
    print('\n  assuntos com mais questões:')
    for (mat, ass), n in assuntos.most_common(8):
        print(f'    {n:>3}  {mat} · {ass}')

    print(f'\nMETA 1.000: faltam {max(0, 1000 - total)}')


if __name__ == '__main__':
    main()
