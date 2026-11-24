# Reimporta o banco do zero: lotes de questoes e depois os comentarios.
#
#   .\importar-lotes.ps1
#
# Roda com a aplicacao no ar. Ambos os passos sao idempotentes.

$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $PSScriptRoot
$api = 'http://localhost:8080'

$lotes = Get-ChildItem (Join-Path $base 'backend\lotes') -Filter 'lote-*.json' | Sort-Object Name
if (-not $lotes) { throw "nenhum lote em $base\backend\lotes" }

"== questoes =="
foreach ($lote in $lotes) {
    $corpo = Get-Content $lote.FullName -Raw -Encoding UTF8
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($corpo)
    try {
        $r = Invoke-RestMethod "$api/api/importar" -Method Post -ContentType 'application/json' -Body $bytes
        "{0,-28} recebidas {1,3} | importadas {2,3} | ignoradas {3,3}" -f $lote.Name, $r.recebidas, $r.importadas, $r.ignoradas
        if ($r.erros.Count -gt 0) {
            $r.erros | Select-Object -First 5 | ForEach-Object { "      - $_" }
        }
    } catch {
        "{0,-28} FALHOU: {1}" -f $lote.Name, $_.Exception.Message
    }
}

$explicacoes = Get-ChildItem (Join-Path $base 'backend\lotes') -Filter 'explicacoes-*.json' | Sort-Object Name
if ($explicacoes) {
    "`n== comentarios =="
    foreach ($arq in $explicacoes) {
        $corpo = Get-Content $arq.FullName -Raw -Encoding UTF8
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($corpo)
        try {
            $r = Invoke-RestMethod "$api/api/explicacoes" -Method Post -ContentType 'application/json' -Body $bytes
            "{0,-32} recebidas {1,3} | atualizadas {2,3} | nao encontradas {3,2}" -f $arq.Name, $r.recebidas, $r.atualizadas, $r.naoEncontradas.Count
        } catch {
            "{0,-32} FALHOU: {1}" -f $arq.Name, $_.Exception.Message
        }
    }
}

"`n--- total no banco ---"
(Invoke-RestMethod "$api/api/concursos") | ForEach-Object { "  {0,-6} -> {1}" -f $_.id, $_.total }
