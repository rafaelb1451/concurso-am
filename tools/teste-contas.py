"""Teste de ponta a ponta do modulo de contas do QB Concurso (backend local)."""
import json
import random
import urllib.request
import urllib.error

BASE = "http://localhost:8080"


def chamar(metodo, caminho, corpo=None, token=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def mostrar(rotulo, status, corpo, esperado):
    ok = "OK " if status == esperado else "FALHOU"
    resumo = json.dumps(corpo, ensure_ascii=False)[:110] if corpo is not None else ""
    print(f"  [{ok}] {rotulo:<40} HTTP {status}  {resumo}")


email = f"rafael.qb{random.randint(1000, 9999)}@exemplo.com"
senha = "senhaForte123"

print("=== fluxo de contas ===")
st, corpo = chamar("POST", "/api/cadastro", {
    "nome": "Rafael Teste", "email": email, "senha": senha,
    "aceitouTermos": True, "aceitouPrivacidade": True})
mostrar("cadastro (espera 201)", st, corpo, 201)
token = corpo.get("token") if isinstance(corpo, dict) else None

st, corpo = chamar("POST", "/api/cadastro", {
    "nome": "Outro", "email": email, "senha": senha,
    "aceitouTermos": True, "aceitouPrivacidade": True})
mostrar("cadastro duplicado (espera 400)", st, corpo, 400)

st, corpo = chamar("POST", "/api/login", {"email": email, "senha": senha})
mostrar("login", st, corpo, 200)
token_login = corpo.get("token") if isinstance(corpo, dict) else None

st, corpo = chamar("POST", "/api/login", {"email": email, "senha": "errada12345"})
mostrar("login com senha errada (espera 401)", st, corpo, 401)

st, corpo = chamar("GET", "/api/usuario", token=token_login)
mostrar("GET /api/usuario autenticado", st, corpo, 200)

st, corpo = chamar("GET", "/api/usuario")
mostrar("GET /api/usuario sem token (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/logout", token=token_login)
mostrar("logout", st, corpo, 200)

st, corpo = chamar("GET", "/api/usuario", token=token_login)
mostrar("token apos logout (espera 401)", st, corpo, 401)

print("\n=== validacao de entrada ===")
st, corpo = chamar("POST", "/api/cadastro", {
    "nome": "X", "email": "nao-e-email", "senha": "curta",
    "aceitouTermos": True, "aceitouPrivacidade": True})
mostrar("cadastro invalido (espera 400)", st, corpo, 400)

st, corpo = chamar("POST", "/api/cadastro", {
    "nome": "Sem Termos", "email": f"semtermos{random.randint(1,999)}@exemplo.com",
    "senha": senha, "aceitouPrivacidade": True})
mostrar("sem aceite de termos (espera 400)", st, corpo, 400)

print("\n=== conteudo exige login (por design) ===")
for caminho in ["/api/concursos", "/api/topicos", "/api/questoes?quantidade=2"]:
    st, corpo = chamar("GET", caminho)
    mostrar(f"sem token: {caminho}", st, corpo if isinstance(corpo, dict) else "lista", 401)

st, corpo_login = chamar("POST", "/api/login", {"email": email, "senha": senha})
token_ok = corpo_login.get("token") if isinstance(corpo_login, dict) else None
for caminho in ["/api/concursos", "/api/topicos", "/api/questoes?quantidade=2"]:
    st, corpo = chamar("GET", caminho, token=token_ok)
    resumo = f"{len(corpo)} itens" if isinstance(corpo, list) else "?"
    mostrar(f"com token: {caminho}", st, resumo, 200)

print("\n=== sessao do cadastro continua valida? ===")
st, corpo = chamar("GET", "/api/usuario", token=token)
mostrar("token do cadastro (nao deslogado)", st, corpo, 200)
