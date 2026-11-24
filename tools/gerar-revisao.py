"""Gera um HTML de revisão a partir de um ou mais lotes no formato de importação.

    python gerar-revisao.py lote-03-portugues.json [...]
    python gerar-revisao.py            # usa todos os lote-*.json da pasta

A alternativa correta aparece em verde; questões anuladas (gabarito nulo) em vermelho.
"""
import json, os, sys, html

BASE = r'C:\Users\SERENS\Documents\deepseek-harness\default-workspace\concurso'
LOTES = os.path.join(BASE, 'backend', 'lotes')
SAIDA = os.path.join(BASE, 'revisao-lotes.html')

def esc(t):
    return html.escape(t or '')

arquivos = sys.argv[1:]
if not arquivos:
    arquivos = [os.path.join(LOTES, f) for f in sorted(os.listdir(LOTES))
                if f.startswith('lote-') and f.endswith('.json')]

blocos = []
total = 0
for caminho in arquivos:
    if not os.path.exists(caminho):
        print('nao existe:', caminho)
        continue
    dados = json.load(open(caminho, encoding='utf-8'))
    nome = os.path.basename(caminho)
    secao = [f'<h2 style="margin-top:32px;font-size:17px;">{esc(nome)} — {len(dados)} questões</h2>']
    for i, q in enumerate(dados, 1):
        alts = q.get('alternativas') or []
        correta = q.get('correta')
        itens = []
        for idx, texto in enumerate(alts):
            letra = 'ABCDE'[idx]
            marcar = (idx == correta)
            estilo = 'font-weight:700;color:#16a34a' if marcar else ''
            itens.append(f'<li style="{estilo}"><b>{letra})</b> {esc(texto)}</li>')
        fund = q.get('fundamento')
        fund_html = f'<p style="margin:6px 0 0;font-size:12px;color:#475569;"><b>Fundamento:</b> {esc(fund)}</p>' if fund else ''
        exp = q.get('explicacao')
        exp_html = f'<p style="margin:6px 0 0;font-size:12px;color:#334155;"><b>Comentário:</b> {esc(exp)}</p>' if exp else ''
        blocos.append(f'''
<article style="border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;margin:0 0 14px;">
  <h3 style="margin:0 0 6px;font-size:14px;">{i}. {esc(q.get('materia'))} · {esc(q.get('assunto'))}
    <span style="color:#64748b;font-weight:400;">({esc(q.get('origem'))})</span></h3>
  <p style="white-space:pre-line;margin:0 0 8px;">{esc(q.get('enunciado'))}</p>
  <ol style="list-style:none;padding:0;margin:0;">{''.join(itens)}</ol>
  {fund_html}{exp_html}
</article>''')
        total += 1
    blocos.append(''.join(secao))

doc = f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Revisão de lotes</title>
<style>body{{font-family:system-ui,Segoe UI,Arial;max-width:880px;margin:24px auto;padding:0 16px;color:#0f172a}}
li{{margin:2px 0}}</style></head>
<body><h1 style="font-size:20px;">Revisão de lotes — {total} questões</h1>
<p style="color:#475569;">Alternativa correta em verde.</p>
{''.join(blocos)}
</body></html>'''

open(SAIDA, 'w', encoding='utf-8').write(doc)
print(f'{total} questões em {SAIDA}')
