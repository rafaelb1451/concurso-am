"""Consolida todos os lotes + comentários em um seed único de produção.

    python consolidar-seed.py

Gera backend/src/main/resources/seed-completo.json com todas as questões
já com o comentário anexado (o SeedLoader usa esse arquivo quando existir).

O banco de desenvolvimento continua podendo ser reconstruído pelos lotes; este
arquivo serve para o primeiro boot em produção — sem ele a aplicação subiria
com apenas as 24 questões do seed original.
"""
import json, os, glob

BASE = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso'
LOTES = os.path.join(BASE, 'backend', 'lotes')
SAIDA = os.path.join(BASE, 'backend', 'src', 'main', 'resources', 'seed-completo.json')


def carregar(caminho):
    with open(caminho, encoding='utf-8') as fh:
        return json.load(fh)


def main():
    questoes = []
    vistos = set()

    # 0) seed original (questões de base, escritas à mão)
    base = os.path.join(BASE, 'backend', 'src', 'main', 'resources', 'questoes.json')
    for q in carregar(base):
        chave = (q.get('enunciado') or '').strip().lower()
        if chave in vistos:
            continue
        vistos.add(chave)
        questoes.append(dict(q))

    # 1) lotes de questões (ordem alfabética para ficar reproduzível)
    for caminho in sorted(glob.glob(os.path.join(LOTES, 'lote-*.json'))):
        for q in carregar(caminho):
            chave = (q.get('enunciado') or '').strip().lower()
            if chave in vistos:
                continue
            vistos.add(chave)
            questoes.append(dict(q))

    # 2) comentários, aplicados por hash de enunciado (mesma normalização do Java)
    import re, unicodedata, hashlib

    def hash_de(texto):
        t = unicodedata.normalize('NFD', texto or '')
        t = ''.join(c for c in t if unicodedata.category(c) != 'Mn')
        t = t.lower()
        t = re.sub(r'[^a-z0-9 ]', ' ', t)
        t = re.sub(r'\s+', ' ', t).strip()
        return hashlib.sha256(t.encode('utf-8')).digest()[:16].hex()

    por_hash = {hash_de(q.get('enunciado')): q for q in questoes}

    aplicados = 0
    for caminho in sorted(glob.glob(os.path.join(LOTES, 'explicacoes-*.json'))):
        for item in carregar(caminho):
            alvo = por_hash.get(item.get('hash'))
            if not alvo:
                continue
            alvo['explicacao'] = item.get('explicacao')
            if item.get('fundamento'):
                alvo['fundamento'] = item.get('fundamento')
            if item.get('precedente'):
                alvo['precedente'] = item.get('precedente')
            aplicados += 1

    # 3) sanitiza campos que o seed não conhece
    for q in questoes:
        q.pop('verificadoEm', None) if not q.get('verificadoEm') else None

    with open(SAIDA, 'w', encoding='utf-8') as fh:
        json.dump(questoes, fh, ensure_ascii=False, indent=1)

    tamanho = os.path.getsize(SAIDA) / 1024
    sem_comentario = sum(1 for q in questoes if not q.get('explicacao'))
    print(f'questões consolidadas: {len(questoes)}')
    print(f'comentários aplicados: {aplicados}')
    print(f'sem comentário: {sem_comentario}')
    print(f'arquivo: {SAIDA} ({tamanho:.0f} KB)')


if __name__ == '__main__':
    main()
