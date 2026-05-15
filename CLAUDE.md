@AGENTS.md

# Atlas Members — Estado do projeto

Plataforma de área de membros (LMS + checkout) construída com **Next.js 16 App Router**, **Drizzle ORM + Neon Postgres**, **NextAuth v5**, **Tailwind/CSS variables** e **Vercel Blob** para uploads. Integração de pagamento via **Asaas** (PIX, Boleto, Cartão com parcelamento, Assinaturas).

**Repositório:** https://github.com/GChorcades/atlas-members (público). Branch principal: `main`. Credencial salva no macOS keychain — `git push` funciona direto sem prompt.

## Comandos

- `npm run dev` — Next dev em :3001
- `npm run dev:tunnel` — dev + cloudflared (para testar webhook Asaas localmente)
- `npm run test:webhook PAYMENT_RECEIVED email valor` — simula evento Asaas com `x-test-mode: 1`
- `npm run db:push` ou `npx drizzle-kit push --force` — aplica schema no Neon (sempre depois de mexer em `db/schema.ts`)
- `npx tsx db/seed.ts` — popular dados base
- `npx tsx db/seed-vibe-coding.ts` — curso de demonstração ("Vibe Coding 101", idempotente)
- `npx tsx scripts/reset-student-passwords.ts` — reset em massa de senhas de alunos para `123321`

## Estrutura

- `app/(app)/` — rotas autenticadas do aluno (dashboard, catalog, courses, profile, progress, trails)
- `app/admin/` — painel admin (cursos, alunos, turmas/cohorts, comentários, configurações, checkouts)
- `app/checkout/[slug]/` — checkout público (sem auth) + página de sucesso com polling
- `app/api/` — endpoints; webhook Asaas em `/api/webhooks/asaas`
- `components/app-shell.tsx` + `sidebar.tsx` + `topbar.tsx` — shell compartilhado (admin + área do aluno)
- `lib/actions.ts` — todas as server actions (admin + aluno + público). Convenção: actions admin começam com `admin*`; públicas com `*Public*`
- `lib/asaas.ts` — client da API Asaas
- `lib/brand.ts` — `getBrand()` (cache) lê settings de identidade
- `lib/course-stats.ts` — `getCourseStats(courseIds)` retorna `{ lessonCount, totalSeconds, durationLabel, studentCount }` real (NÃO use as colunas mocadas `courses.lessonCount/duration/students`)

## Tabelas principais

- `users` — perfil + `plan`, `cpfCnpj`, `asaasCustomerId`, `suspended`, `passwordHash`
- `courses` — `published` controla visibilidade. **`coverImage` (URL Blob) tem prioridade sobre `coverBg` (gradiente)**. `lessonCount/duration/students` são mocados — sempre derive via `getCourseStats`
- `modules`, `lessons` — `lessons.published` controla visibilidade; estudante só vê publicadas
- `lessons.bunnyVideoId | pandaVideoId | videoUrl` — três fontes de vídeo, priorizadas nessa ordem no player
- `enrollments` — `active`, `expiresAt` permitem suspender acesso a curso específico
- `payments`, `subscriptions` — integração Asaas; `payments.courseId` linka a curso para auto-matrícula no webhook
- `checkouts` — config pública por curso (`slug` único, `price`, `allowPix/Boleto/CreditCard`, `maxInstallments`)
- `comments` — `parentId` (auto-ref, sem FK) para threading + `imageUrl` para anexos
- `cohorts`, `cohort_courses`, `cohort_members` — turmas
- `settings` — key/value: chaves usadas hoje: `panda_api_key`, `panda_player_id`, `asaas_api_key`, `asaas_env`, `asaas_webhook_secret`, `brand_name`, `brand_logo`, `brand_favicon`, `brand_color`, `brand_footer`

## Convenções

- **Tema**: `data-theme="dark"|"light"` no `<html>`. Bootstrap inline script no `app/layout.tsx` aplica antes da hidratação a partir de `localStorage('atlas-theme')` ou `prefers-color-scheme`. Toggle no `Topbar`.
- **Brand**: `getBrand()` é chamado em `app/layout.tsx`, `(app)/layout.tsx` e `admin/layout.tsx`. Cor customizada sobrescreve `--accent`, `--accent-fg: #fff`, `--accent-soft` (color-mix). Logo aparece no sidebar; favicon via `generateMetadata`; footer pelo `AppShell`.
- **Senha padrão de alunos**: `123321` (definida em `lib/actions.ts` constante `DEFAULT_STUDENT_PASSWORD` para o checkout público).
- **Upload**: `POST /api/upload` (admin-only) aceita imagens até 5MB e retorna URL do Vercel Blob.
- **Webhook Asaas**: header `asaas-access-token` validado contra `asaas_webhook_secret`. `x-test-mode: 1` só funciona quando `NODE_ENV !== 'production'`. Auto-matricula no curso quando `payment.courseId` está setado e evento é `RECEIVED`/`CONFIRMED`.
- **Polling de pagamento**: `/api/checkout/payment-status?id=` consulta Asaas direto se webhook atrasar — atualiza DB e matricula como fallback.
- **Layouts**: alunos `(app)/layout.tsx` redirecionam pra `/login` se `dbUser.suspended`. Sempre carregam `brand` e passam pro `AppShell`.

## Player de vídeo

- Admin → editor de aula só mostra os players configurados (Bunny via `NEXT_PUBLIC_BUNNY_LIBRARY_ID`; Panda via `panda_api_key` + `panda_player_id`). URL (YouTube/Vimeo) sempre disponível.
- Helper `urlToEmbed` (duplicado em `app/(app)/courses/[id]/lessons/[lessonId]/page.tsx` e no editor admin) converte URLs YouTube/Vimeo para embeds.

## Gotchas que custaram tempo

- **Prev/next de aula**: ordene por `(módulo position, lesson position)` em JS — o `orderBy(lessons.position)` direto interleaves aulas entre módulos.
- **`lessons.duration`** vem em formatos variados (`MM:SS`, `HH:MM:SS`, `Xh Ymin`); use `parseDurationToSeconds` de `lib/course-stats.ts`.
- **Asaas `creditCardHolderInfo`** exige `addressNumber` — usar `'S/N'` se não coletado.
- **Cartão com parcelamento**: payment row inserido é o da primeira parcela; usar `firstId` retornado de `asaasListPaymentsByInstallment` no fluxo do checkout público pra evitar 404 na success page.
- **Hydration mismatch com `<style>` no head**: extensões de browser injetam estilos. `suppressHydrationWarning` no `<html>` e no `<style>` do `app/layout.tsx` está em vigor — não remova.

## Pendências conhecidas

- Senha temporária pós-checkout aparece só no console; falta email de boas-vindas / fluxo de "esqueci minha senha".
- Public checkout permite paste de imagem em comentários mas não há moderação automática.
- `coverImage` no editor admin aceita upload mas a tabela `cohorts`/`trails` ainda não tem imagem.
- Cartão de crédito vai como string no payload da Asaas — pra produção, considerar tokenização (PCI).
