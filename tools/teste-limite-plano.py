"""Testa o limite diario do plano FREE no endpoint de responder."""
import json
import random
import urllib.error
import urllib.request

BASE = "http://localhost:8080"
LIMITE_ESPERADO = 20


def chamar(metodo, caminho, corpo=None, token=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    req = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
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


email = f"limite{random.randint(1000, 9999)}@exemplo.com"
st, auth = chamar("POST", "/api/cadastro", {
    "nome": "Aluno FREE", "email": email, "senha": "SenhaForte123",
    "aceitouTermos": True, "aceitouPrivacidade": True})
token = auth["token"]
print(f"cadastro: HTTP {st}")

st, questoes = chamar("GET", "/api/questoes?quantidade=1", token=token)
qid = questoes[0]["id"]
print(f"questao de teste: {qid}")

st, uso = chamar("GET", "/api/assinatura/uso", token=token)
print(f"plano: {uso['plano']['codigo']} limite={uso['limiteDiarioQuestoes']} usadas={uso['respondidasHoje']}")

print(f"\nrespondendo {LIMITE_ESPERADO} questoes...")
codigos = []
for i in range(LIMITE_ESPERADO):
    st, _ = chamar("POST", f"/api/questoes/{qid}/responder", {"alternativa": 0}, token=token)
    codigos.append(st)

ok = sum(1 for c in codigos if c == 200)
print(f"  sucesso nas {LIMITE_ESPERADO} primeiras: {ok}/{LIMITE_ESPERADO}")

st, corpo = chamar("POST", f"/api/questoes/{qid}/responder", {"alternativa": 0}, token=token)
marca = "OK " if st == 429 else "FALHOU"
print(f"\n  [{marca}] 21a resposta (espera 429)  HTTP {st}")
if corpo:
    print(f"     mensagem: {json.dumps(corpo, ensure_ascii=False)[:160]}")

st, uso = chamar("GET", "/api/assinatura/uso", token=token)
marca = "OK " if uso["respondidasHoje"] == LIMITE_ESPERADO else "FALHOU"
print(f"  [{marca}] uso agora: {uso['respondidasHoje']}/{uso['limiteDiarioQuestoes']}")

# fluxo real: o checkout cria a assinatura PENDENTE; depois o webhook a ativa
st, checkout = chamar("POST", "/api/assinatura/checkout", {
    "plano": "PRO_MENSAL",
    "cpfCnpj": "24971563792",
    "telefone": "11987654321",
    "cep": "01001000",
    "endereco": "Rua de Teste",
    "numero": "100",
    "bairro": "Centro",
}, token=token)
print(f"\n  checkout -> HTTP {st} " + (checkout.get("url", "")[:60] if isinstance(checkout, dict) else ""))

evento = {
    "id": f"evt_limite_{random.randint(1000, 9999)}",
    "event": "PAYMENT_CONFIRMED",
    "payment": {"id": "pay_x", "externalReference": f"usuario:{auth['usuario']['id']}:plano:PRO_MENSAL"},
}
req = urllib.request.Request(BASE + "/api/webhooks/asaas", data=json.dumps(evento).encode(), method="POST")
req.add_header("Content-Type", "application/json")
req.add_header("asaas-access-token", "token-webhook-teste-123")
try:
    with urllib.request.urlopen(req, timeout=20) as r:
        resultado = json.loads(r.read().decode())
except urllib.error.HTTPError as e:
    resultado = {"erro": e.read().decode()}
print(f"  webhook -> {json.dumps(resultado, ensure_ascii=False)}")

st, uso = chamar("GET", "/api/assinatura/uso", token=token)
marca = "OK " if uso["plano"]["codigo"] == "PRO_MENSAL" else "FALHOU"
print(f"\n  [{marca}] apos webhook de pagamento: plano={uso['plano']['codigo']} ilimitado={uso['ilimitado']}")

st, corpo = chamar("POST", f"/api/questoes/{qid}/responder", {"alternativa": 0}, token=token)
marca = "OK " if st == 200 else "FALHOU"
print(f"  [{marca}] resposta apos virar PRO (espera 200)  HTTP {st}")
