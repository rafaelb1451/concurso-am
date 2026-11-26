"""Testa a pratica gratuita sem conta: uma materia, no maximo 10 questoes."""
import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://localhost:8080"


def chamar(metodo, caminho, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def mostrar(rotulo, ok, detalhe=""):
    print(f"  [{'OK ' if ok else 'FALHOU'}] {rotulo:<48} {detalhe}")


print("=== materias publicas (sem login) ===")
st, materias = chamar("GET", "/api/publico/materias")
mostrar("GET /api/publico/materias", st == 200 and len(materias) > 0, f"HTTP {st} · {len(materias)} materias")
for m in materias[:4]:
    print(f"     {m['materia']}: {m['questoes']}")
nome_materia = materias[0]["materia"]

print("\n=== questoes da pratica (sem login) ===")
st, questoes = chamar("GET", f"/api/publico/questoes?materia={urllib.parse.quote(nome_materia)}")
mostrar("10 questoes por padrao", st == 200 and len(questoes) == 10, f"HTTP {st} · {len(questoes)}")
tem_gabarito = any("correta" in q or "gabarito" in q for q in questoes)
mostrar("listagem NAO expoe gabarito", not tem_gabarito, "ok" if not tem_gabarito else "EXPOSTO!")

st, corpo = chamar("GET", f"/api/publico/questoes?materia={urllib.parse.quote(nome_materia)}&quantidade=11")
mostrar("pedir 11 questoes (espera 400)", st == 400, f"HTTP {st} · {json.dumps(corpo, ensure_ascii=False)[:80]}")

st, corpo = chamar("GET", "/api/publico/questoes?quantidade=10")
mostrar("sem materia (espera 400)", st == 400, f"HTTP {st}")

print("\n=== responder (mostra gabarito e comentario) ===")
q = questoes[0]
st, r = chamar("POST", "/api/publico/responder", {"questaoId": q["id"], "alternativa": 0})
ok = st == 200 and "acertou" in r and "gabarito" in r and "explicacao" in r
mostrar("POST /api/publico/responder", ok, f"HTTP {st} · acertou={r.get('acertou')} gabarito={r.get('gabarito')}")
if r.get("explicacao"):
    print(f"     comentario: {r['explicacao'][:90]}...")

st, r = chamar("POST", "/api/publico/responder", {"questaoId": 999999, "alternativa": 0})
mostrar("questao inexistente (espera 404)", st == 404, f"HTTP {st}")

print("\n=== conteudo privado continua exigindo login ===")
st, _ = chamar("GET", "/api/questoes?quantidade=1")
mostrar("GET /api/questoes sem token (espera 401)", st == 401, f"HTTP {st}")
st, _ = chamar("GET", "/api/planos")
mostrar("GET /api/planos sem token (espera 200)", st == 200, f"HTTP {st}")
