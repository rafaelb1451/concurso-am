"""E2E da Fase 2: planos, checkout real no sandbox do Asaas e webhook idempotente."""
import json
import random
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
TOKEN_WEBHOOK = "token-webhook-teste-123"


def chamar(metodo, caminho, corpo=None, token=None, headers=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            texto = r.read().decode()
            return r.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode()
        try:
            return e.code, json.loads(texto)
        except Exception:
            return e.code, texto


def mostrar(rotulo, status, corpo, esperado=None):
    marca = "OK " if (esperado is None or status == esperado) else "FALHOU"
    texto = json.dumps(corpo, ensure_ascii=False)[:110] if corpo is not None else ""
    print(f"  [{marca}] {rotulo:<44} HTTP {status}  {texto}")


print("=== 1. catalogo de planos (publico, sem login) ===")
st, planos = chamar("GET", "/api/planos")
mostrar("GET /api/planos", st, len(planos) if isinstance(planos, list) else planos, 200)
if isinstance(planos, list):
    for p in planos:
        print(f"     {p['codigo']:<12} R$ {p['valorCentavos']/100:>7.2f}  limite={p['limiteDiarioQuestoes']}  ciclo={p['ciclo']}")

print("\n=== 2. conta e plano FREE ===")
email = f"pago{random.randint(1000, 9999)}@exemplo.com"
st, auth = chamar("POST", "/api/cadastro", {
    "nome": "Aluno Pagante", "email": email, "senha": "SenhaForte123",
    "aceitouTermos": True, "aceitouPrivacidade": True})
mostrar("cadastro", st, auth, 201)
token = auth["token"]

st, assinatura = chamar("GET", "/api/assinatura", token=token)
mostrar("GET /api/assinatura (FREE)", st, assinatura, 200)
if isinstance(assinatura, dict):
    print(f"     plano={assinatura['plano']['codigo']} status={assinatura['status']} "
          f"liberaPro={assinatura['liberaPro']} gateway={assinatura['pagamentoConfigurado']}")

print("\n=== 3. checkout real no sandbox do Asaas ===")
st, checkout = chamar("POST", "/api/assinatura/checkout", token=token, corpo={
    "plano": "PRO_MENSAL",
    "cpfCnpj": "24971563792",
    "telefone": "11987654321",
    "cep": "01001000",
    "endereco": "Rua de Teste",
    "numero": "100",
    "bairro": "Centro",
})
mostrar("POST /api/assinatura/checkout", st, checkout, 200)
url_pagamento = checkout.get("url") if isinstance(checkout, dict) else None
if url_pagamento:
    print(f"     URL hospedada: {url_pagamento[:100]}")

st, assinatura = chamar("GET", "/api/assinatura", token=token)
if isinstance(assinatura, dict):
    print(f"     apos checkout: status={assinatura['status']} liberaPro={assinatura['liberaPro']}")

print("\n=== 4. webhook: token invalido ===")
evento = {
    "id": f"evt_teste_{random.randint(1000,9999)}",
    "event": "PAYMENT_CONFIRMED",
    "payment": {
        "id": "pay_teste",
        "externalReference": f"usuario:1:plano:PRO_MENSAL",
        "dueDate": "2026-12-01",
    },
}
st, corpo = chamar("POST", "/api/webhooks/asaas", evento, headers={"asaas-access-token": "errado"})
mostrar("token errado (espera 401)", st, corpo, 401)

st, corpo = chamar("POST", "/api/webhooks/asaas", evento)
mostrar("sem token (espera 401)", st, corpo, 401)

print("\n=== 5. webhook valido + idempotencia ===")
st, corpo = chamar("POST", "/api/webhooks/asaas", evento, headers={"asaas-access-token": TOKEN_WEBHOOK})
mostrar("primeira entrega (espera 200)", st, corpo, 200)

st, corpo = chamar("POST", "/api/webhooks/asaas", evento, headers={"asaas-access-token": TOKEN_WEBHOOK})
mostrar("mesma entrega de novo (DUPLICADO)", st, corpo, 200)
if isinstance(corpo, dict):
    print(f"     resultado: {corpo.get('resultado')}")

st, assinatura = chamar("GET", "/api/assinatura", token=token)
if isinstance(assinatura, dict):
    print(f"     apos webhook: status={assinatura['status']} liberaPro={assinatura['liberaPro']} "
          f"periodoFim={assinatura['periodoFim']}")

print("\n=== 6. limite do plano ===")
st, uso = chamar("GET", "/api/assinatura/uso", token=token)
mostrar("GET /api/assinatura/uso", st, uso, 200)
if isinstance(uso, dict):
    print(f"     plano={uso['plano']['codigo']} limite={uso['limiteDiarioQuestoes']} "
          f"ilimitado={uso['ilimitado']} respondidasHoje={uso['respondidasHoje']}")
