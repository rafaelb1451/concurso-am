"""Valida a aplicacao rodando contra PostgreSQL (queries nativas, agregacoes e fluxos)."""
import json
import random
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://localhost:8080"


def chamar(metodo, caminho, corpo=None, token=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def check(rotulo, ok, detalhe=""):
    marca = "OK " if ok else "FALHOU"
    print(f"  [{marca}] {rotulo:<52} {detalhe}")
    return ok


falhas = []


def validar(rotulo, ok, detalhe=""):
    check(rotulo, ok, detalhe)
    if not ok:
        falhas.append(rotulo)


print("=== catalogo e planos (leitura simples) ===")
st, planos = chamar("GET", "/api/planos")
validar("GET /api/planos", st == 200 and len(planos) == 3, f"HTTP {st} · {len(planos) if isinstance(planos, list) else '?'} planos")

st, materias = chamar("GET", "/api/publico/materias")
validar("GET /api/publico/materias (COUNT/GROUP BY)", st == 200 and len(materias) > 0, f"HTTP {st} · {len(materias) if isinstance(materias, list) else '?'} materias")

st, pub = chamar("GET", "/api/publico/questoes?materia=" + urllib.parse.quote(materias[0]["materia"]))
validar("pratica gratis (10 questoes)", st == 200 and len(pub) == 10, f"HTTP {st} · {len(pub) if isinstance(pub, list) else '?'}")

print("\n=== conta ===")
email = f"pg{random.randint(1000, 9999)}@exemplo.com"
st, auth = chamar("POST", "/api/cadastro", {
    "nome": "Aluno Postgres", "email": email, "senha": "SenhaForte123",
    "aceitouTermos": True, "aceitouPrivacidade": True})
validar("POST /api/cadastro", st == 201 and "token" in auth, f"HTTP {st}")
token = auth.get("token") if isinstance(auth, dict) else None
usuario_id = auth["usuario"]["id"] if isinstance(auth, dict) else 0

print("\n=== queries nativas (o risco do dialeto) ===")
st, concursos = chamar("GET", "/api/concursos", token=token)
validar("GET /api/concursos (COUNT DISTINCT + EXISTS)", st == 200 and len(concursos) >= 2, f"HTTP {st} · {len(concursos) if isinstance(concursos, list) else '?'}")

st, topicos = chamar("GET", "/api/topicos", token=token)
validar("GET /api/topicos (parametro nulo no SQL)", st == 200 and len(topicos) > 0, f"HTTP {st} · {len(topicos) if isinstance(topicos, list) else '?'} assuntos")

st, topicos_pm = chamar("GET", "/api/topicos?concurso=PM-AM", token=token)
validar("GET /api/topicos?concurso=PM-AM", st == 200 and len(topicos_pm) > 0, f"HTTP {st} · {len(topicos_pm) if isinstance(topicos_pm, list) else '?'}")

print("\n=== questoes e respostas ===")
st, questoes = chamar("GET", "/api/questoes?quantidade=5", token=token)
validar("GET /api/questoes", st == 200 and len(questoes) == 5, f"HTTP {st} · {len(questoes) if isinstance(questoes, list) else '?'}")
qid = questoes[0]["id"] if questoes else 0

st, resp = chamar("POST", f"/api/questoes/{qid}/responder", {"alternativa": 0}, token=token)
validar("POST /api/questoes/{id}/responder", st == 200 and "gabarito" in resp, f"HTTP {st}")

st, desp = chamar("GET", "/api/desempenho", token=token)
validar("GET /api/desempenho (SUM CASE WHEN + GROUP BY)", st == 200, f"HTTP {st} · {json.dumps(desp)[:60] if desp else ''}")

st, desp2 = chamar("GET", f"/api/desempenho?concurso=PC-AM", token=token)
validar("GET /api/desempenho?concurso=PC-AM", st == 200, f"HTTP {st}")

print("\n=== simulados ===")
st, sim = chamar("GET", "/api/simulado?concurso=PC-AM", token=token)
ok_sim = st == 200 and len(sim.get("questoes", [])) == 80 if isinstance(sim, dict) else False
validar("GET /api/simulado?concurso=PC-AM (80)", ok_sim, f"HTTP {st} · {len(sim.get('questoes', [])) if isinstance(sim, dict) else '?'}")

print("\n=== evolucao (CAST data + agregacao por dia) ===")
st, evo = chamar("GET", "/api/evolucao?concurso=TODOS", token=token)
validar("GET /api/evolucao (CAST(criada_em AS DATE))", st == 200, f"HTTP {st} · {json.dumps(evo)[:80] if evo else ''}")

print("\n=== assinatura e limite ===")
st, uso = chamar("GET", "/api/assinatura/uso", token=token)
validar("GET /api/assinatura/uso", st == 200 and uso["plano"]["codigo"] == "FREE", f"HTTP {st}")

st, assin = chamar("GET", "/api/assinatura", token=token)
validar("GET /api/assinatura", st == 200 and assin["plano"]["codigo"] == "FREE", f"HTTP {st}")

print("\n=== LGPD e conta ===")
st, dados = chamar("GET", "/api/usuario/dados", token=token)
validar("GET /api/usuario/dados", st == 200, f"HTTP {st}")

st, logout = chamar("POST", "/api/logout", token=token)
validar("POST /api/logout", st == 200, f"HTTP {st}")

print()
if falhas:
    print(f"RESULTADO: {len(falhas)} falha(s) -> {', '.join(falhas)}")
else:
    print("RESULTADO: todas as consultas funcionaram no PostgreSQL")
