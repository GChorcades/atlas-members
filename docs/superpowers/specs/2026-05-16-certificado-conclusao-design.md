# Certificado de Conclusão de Curso — Design

**Data:** 2026-05-16
**Projeto:** atlas-members

## Objetivo

Permitir que o aluno gere e baixe um **certificado de conclusão** quando concluir
100% de um curso. O download é uma imagem **PNG**, acionado por um botão na
**página do curso**. Não há envio por e-mail/WhatsApp — é só geração e download.

## Escopo

- **Inclui:** detecção de conclusão, geração do PNG, botão na página do curso,
  código de autenticação no rodapé.
- **Não inclui:** envio do certificado, página pública de verificação, tabela
  nova no banco, certificado para trilhas/turmas (só cursos).

## Elegibilidade

Um curso está **concluído** para um aluno quando **todas as aulas publicadas**
desse curso têm registro em `lesson_progress` com `done = true` para aquele
`userId`. Regras:

- Cursos sem nenhuma aula publicada nunca contam como concluídos.
- A **data de conclusão** é a maior (`MAX`) `completedAt` entre as aulas
  publicadas concluídas pelo aluno.
- A **carga horária** vem de `getCourseStats()` (`lib/course-stats.ts`),
  campo `durationLabel`/`totalSeconds`.
- Toda consulta é escopada por `tenant_id` (via `getTenantId()`).

## Geração do PNG

Usa o **`ImageResponse` do `next/og`** — recurso nativo do Next 16, sem
dependência nova. Renderiza JSX como imagem PNG.

- **Rota:** `app/api/courses/[id]/certificate/route.ts`, método `GET`.
- Fluxo da rota:
  1. `auth()` — exige aluno logado; senão 401.
  2. `getTenantId()` — resolve o tenant; o curso precisa pertencer a ele.
  3. Valida elegibilidade (curso concluído 100% pelo aluno). Se não, responde
     **403** com mensagem curta.
  4. Monta os dados (aluno, curso, datas, carga horária, instrutor, marca, código).
  5. Devolve `ImageResponse` (PNG, ~1200×850, proporção paisagem ~1.41:1) com
     header `Content-Disposition: attachment; filename="certificado-<slug>.png"`.
- **Fontes:** `ImageResponse` exige arquivos de fonte embarcados. Incluir 2
  fontes em `public/fonts/`: uma **serifada** (para o nome do aluno e o título
  do curso) e uma **sans-serif** (para rótulos e metadados). Carregadas via
  leitura de arquivo e passadas em `fonts: [...]` do `ImageResponse`.

## Conteúdo e layout do certificado

Layout escolhido: **B — moderno minimalista** (bastante espaço em branco, faixa
fina na cor da marca no topo, sem bordas pesadas).

Elementos:

- Faixa fina superior na cor `brand_color` do tenant.
- Sobrescrita "Certificado de Conclusão".
- "Certificamos que" + **nome do aluno** (serifada, destaque).
- "concluiu o curso" + **título do curso** (serifada).
- Rodapé com dois blocos:
  - Esquerda: **carga horária** · **data de conclusão** · **instrutor**.
  - Direita: **marca** — logo do tenant (`brand_logo`) se existir, senão o
    nome da marca em texto — e, abaixo, o **código** do certificado.

## Código de autenticação

Determinístico, **sem tabela no banco**:

- `code = HMAC_SHA256(AUTH_SECRET, "<tenantId>:<userId>:<courseId>")`.
- Converte os primeiros bytes em base32 (alfabeto sem caracteres ambíguos),
  pega 5 caracteres → ex.: `3F9K2`.
- Prefixo de 3 letras derivado do nome da marca (maiúsculas, só letras; se não
  der 3 letras, completa com `X`). Resultado: `ATL-3F9K2`.
- É estável: o mesmo aluno/curso gera sempre o mesmo código. Aparece só no
  rodapé do certificado — não há página de verificação.

## Botão na página do curso

Em `app/(app)/courses/[id]/page.tsx`:

- **Curso concluído:** botão em destaque "Baixar certificado" — um link `GET`
  para `/api/courses/<id>/certificate` (abre o download).
- **Curso não concluído:** no lugar do botão, um **aviso discreto** —
  "Conclua o curso para liberar o certificado" — para o aluno saber que o
  certificado existe.

## Arquivos

- **Criar** `lib/certificate.ts` — funções puras de domínio:
  - `isCourseComplete(tenantId, userId, courseId)` → `{ complete, completedAt }`.
  - `getCertificateData(tenantId, userId, courseId)` → dados prontos para o PNG.
  - `certificateCode(tenantId, userId, courseId, brandName)` → string do código.
- **Criar** `app/api/courses/[id]/certificate/route.ts` — handler `GET` com o
  JSX do layout B e o `ImageResponse`.
- **Criar** `public/fonts/` — 2 arquivos de fonte (serifada + sans).
- **Modificar** `app/(app)/courses/[id]/page.tsx` — botão / aviso.
- **Modificar** `app/globals.css` — só se um estilo de botão/aviso novo for
  necessário; reutilizar classes existentes do Design System quando possível.

## Tratamento de erro

- Aluno não logado → 401.
- Curso de outro tenant ou inexistente → 404.
- Curso não concluído pelo aluno → 403 com mensagem curta.
- Falha ao carregar logo da marca → cai no nome da marca em texto.

## Testes

Projeto não tem suíte automatizada. Validação manual:

1. Aluno com curso 100% concluído vê o botão e baixa o PNG correto.
2. Aluno com curso parcial vê o aviso, e o acesso direto à rota dá 403.
3. O código no rodapé é o mesmo em downloads repetidos.
4. Tenant com logo mostra a logo; tenant sem logo mostra o nome.
