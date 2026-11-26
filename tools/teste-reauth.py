"""Testa confirmacao de identidade para trocar e-mail e excluir conta."""
import json
import random
import urllib.error
import urllib.request

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
    marca = "OK " if status == esperado else "FALHOU"
    resumo = json.dumps(corpo, ensure_ascii=False)[:95] if corpo is not None else ""
    print(f"  [{marca}] {rotulo:<52} HTTP {status}  {resumo}")


email = f"senha{random.randint(1000, 9999)}@exemplo.com"
senha = "SenhaForte123"

st, corpo = chamar("POST", "/api/cadastro", {
    "nome": "Conta Com Senha", "email": email, "senha": senha,
    "aceitouTermos": True, "aceitouPrivacidade": True})
mostrar("cadastro", st, corpo, 201)
token = corpo["token"]
usuario = corpo["usuario"]

print("\n=== /api/usuario expõe temSenha? ===")
mostrar("cadastro devolve temSenha=true", 200 if usuario.get("temSenha") is True else 0,
        {"temSenha": usuario.get("temSenha")}, 200)

print("\n=== trocar e-mail ===")
st, corpo = chamar("POST", "/api/usuario/alterar-email",
                   {"novoEmail": "outro@exemplo.com"}, token=token)
mostrar("sem senha (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/usuario/alterar-email",
                   {"senha": "senhaErrada123", "novoEmail": "outro@exemplo.com"}, token=token)
mostrar("senha errada (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/usuario/alterar-email",
                   {"senha": senha, "novoEmail": f"trocado{random.randint(1,999)}@exemplo.com"},
                   token=token)
mostrar("senha correta (espera 200)", st, corpo, 200)

print("\n=== excluir conta ===")
st, corpo = chamar("POST", "/api/usuario/excluir", {}, token=token)
mostrar("sem senha (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/usuario/excluir", {"credential": "token-google-invalido"}, token=token)
mostrar("conta COM senha + credential (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/usuario/excluir", {"senha": senha}, token=token)
mostrar("senha correta (espera 200)", st, corpo, 200)

st, corpo = chamar("GET", "/api/usuario", token=token)
mostrar("sessao morreu junto (espera 401)", st, corpo, 401)
