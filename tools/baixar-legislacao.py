"""Baixa de fontes oficiais do portal Legisla.Am (Imprensa Oficial do AM).

Uso:
    python baixar-legislacao.py            # baixa as fontes mapeadas
    python baixar-legislacao.py --mes 12 2014   # lista as normas de um mes

Fontes baixadas para docs/legislacao/. O portal organiza os enderecos assim:

    /diario_am/{categoria}/{ano}/{mes}/{pagina}   texto integral
    /diario_am/{categoria}/{ano}/{mes}            listagem do mes
    /diario_am/{categoria}/{ano}                  listagem do ano (paginada)

Categorias: 10 leyes complementares, 11 leyes delegadas, 12 leis ordinarias,
41533 promulgadas, 41534 decretos legislativos, 41535 decretos numerados.
"""
import ssl, urllib.request, re, os, sys, time

BASE = 'https://legisla.imprensaoficial.am.gov.br'
AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.normpath(os.path.join(AQUI, '..', 'docs', 'legislacao'))
HDR = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'}
CTX = ssl._create_unverified_context()


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=HDR), timeout=90,
                                  context=CTX).read().decode('utf-8', errors='replace')


def texto(html):
    t = re.sub(r'<script.*?</script>', ' ', html, flags=re.S | re.I)
    t = re.sub(r'<style.*?</style>', ' ', t, flags=re.S | re.I)
    t = re.sub(r'<[^>]+>', ' ', t)
    t = re.sub(r'&nbsp;?', ' ', t)
    t = re.sub(r'&[a-z]+;', ' ', t)
    return re.sub(r'[ \t]+', ' ', t)


def link_do_mes(ano, mes, numero):
    """Na listagem do mes, acha o <h5> com o numero e devolve o link 'Texto integral'."""
    html = get(f'{BASE}/diario_am/12/{ano}/{mes}')
    for bloco in re.split(r'<li class="item-li">', html):
        titulo = re.search(r'<h5>(.*?)</h5>', bloco, re.S)
        if not titulo:
            continue
        rotulo = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', titulo.group(1)))
        if re.search(rf'N[^\d]{{0,8}}{re.escape(numero)}\b', rotulo):
            link = re.search(r'href=["\'](/diario_am/[^"\']+)["\']', bloco)
            if link:
                return link.group(1), rotulo.strip()
    return None, None


def salvar(nome_arquivo, url):
    t = texto(get(url))
    os.makedirs(DESTINO, exist_ok=True)
    dest = os.path.join(DESTINO, nome_arquivo)
    open(dest, 'w', encoding='utf-8').write(t)
    arts = len(re.findall(r'Art\.\s*\d+', t))
    print(f'  {nome_arquivo}: {len(t)} chars, ~{arts} artigos -> {dest}')


# fontes com endereco direto
DIRETAS = {
    'lei-3514-2010.txt': '/diario_am/12/2010/6/2823',
    'constituicao-estado-amazonas.txt': '/diario_am/12/1989/10/746',
}

# fontes localizadas por listagem de mes (ano, mes, numero)
BUSCAVEIS = {
    'lei-4-044-2014.txt': (2014, 6, '4.044'),
}


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--mes':
        ano, mes = sys.argv[2], sys.argv[3]
        html = get(f'{BASE}/diario_am/12/{ano}/{mes}')
        for t in re.findall(r'<h5>(.*?)</h5>', html, re.S):
            print(' ', re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', t)).strip())
        return

    for nome, caminho in DIRETAS.items():
        print(f'baixando {nome}')
        salvar(nome, BASE + caminho)
        time.sleep(0.3)

    for nome, (ano, mes, numero) in BUSCAVEIS.items():
        print(f'procurando lei {numero} em {ano}/{mes}')
        href, rotulo = link_do_mes(ano, mes, numero)
        if not href:
            print(f'  nao encontrada em {ano}/{mes}')
            continue
        salvar(nome, BASE + href)
        time.sleep(0.3)


if __name__ == '__main__':
    main()
