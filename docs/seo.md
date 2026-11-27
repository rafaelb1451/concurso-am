# SEO — páginas públicas indexáveis

Rotas HTML servidas pelo backend (sem JavaScript), adicionadas para o Google
rastrear conteúdo real sem depender da renderização do SPA.

## Rotas

| Rota | Conteúdo | JSON-LD |
|---|---|---|
| `/materiais` | hub de materiais por concurso | `CollectionPage` |
| `/materiais/{slug}` | material completo (lei comentada) | `Article` |
| `/materias` | matérias com contagem de questões | `CollectionPage` |
| `/materias/{slug}` | matéria + 2 questões de amostra **sem gabarito** | `CollectionPage` |
| `/planos` | catálogo de planos e preços | `WebPage` |
| `/faq` | perguntas frequentes visíveis | `FAQPage` |
| `/robots.txt` | regras de rastreamento + sitemap | — |
| `/sitemap.xml` | 53 URLs (5 fixas + 34 materiais + 14 matérias) | — |

Todas têm `<title>` único, meta description, canonical absoluto, Open Graph e
Twitter Card. A landing (`frontend/index.html`) recebeu canonical, OG e JSON-LD
de `EducationalOrganization` + `WebSite`.

## Configuração

`concurso.seo.url` (env `SEO_BASE_URL`) define a origem dos canonical/sitemap.
Padrão: `https://qbconcurso.com.br`.

## Como validar

```bash
curl -sI https://qbconcurso.com.br/materiais/lei-4950a-1966 | head -5   # 200 text/html
curl -s  https://qbconcurso.com.br/robots.txt
curl -s  https://qbconcurso.com.br/sitemap.xml | grep -c "<loc>"        # 53
curl -s  https://qbconcurso.com.br/materiais/lei-4950a-1966 | grep -E "<title>|<h1>|application/ld\\+json"
```

- Rich Results Test: cole a URL de um material (`Article`) e de `/faq` (`FAQPage`).
- Search Console: enviar `https://qbconcurso.com.br/sitemap.xml`.
- Lighthouse mobile: SEO ≥ 95 em `/` e em `/materiais/{slug}`.

## Decisões

- **`/assets/` não está bloqueado no robots.** O prompt pedia bloquear, mas a
  landing é um SPA: sem CSS/JS o Googlebot não renderiza a página. O custo de
  rastrear arquivos com hash é irrelevante.
- **Amostras de questão sem gabarito.** A página de matéria expõe enunciado e
  alternativas (o mesmo que a prática pública já expõe), nunca `correta`,
  `explicacao` ou `fundamento`.
- **JSON-LD inline.** É bloco de dados (`application/ld+json`), não script de
  execução; a CSP `script-src 'self'` não o bloqueia. Validar no Rich Results.

## Pendências

1. **`og:image`** — criar um PNG 1200×630 e referenciar em `index.html` e nas
   páginas de material (hoje não há imagem social).
2. **Landing com texto único** (P1 #7) — o shell do SPA ainda tem pouco conteúdo
   textual; a landing deve ganhar seções "o que é", "como funciona", "para quem".
3. **FAQ visível na landing** — o `FAQPage` hoje está em `/faq`; se quiser o
   rich result na home, o mesmo conteúdo precisa aparecer na página inicial.
4. **Search Console + Bing** — verificar domínio, enviar sitemap, acompanhar
   indexação e consultas.
5. **Conteúdo de cauda longa** — glossário/blog reaproveitando `docs/legislacao/`.
