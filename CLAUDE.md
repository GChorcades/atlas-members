@AGENTS.md

# Atlas Members — Estado do projeto

Plataforma de área de membros (LMS + checkout) **multi-tenant** construída com **Next.js 16 App Router**, **Drizzle ORM + Neon Postgres**, **NextAuth v5**, **Tailwind/CSS variables** e **Vercel Blob** para uploads. Integração de pagamento via **Asaas** (PIX, Boleto, Cartão com parcelamento, Assinaturas), email transacional via **Brevo**, WhatsApp via **Z-API**, IA via **OpenAI** (`gpt-4o` / `gpt-4o-mini`), e emissão de **NFS-e** pelo Sistema Nacional de Nota Fiscal (veja a seção **Nota Fiscal**).

Cada tenant é uma área de membros completa e isolada, acessível por subdomínio (`slug.claudemembers.com.br`) ou domínio próprio. Veja a seção **Multi-tenant** abaixo.

**Repositório:** https://github.com/GChorcades/atlas-members (público). Branch principal: `main`. Credencial salva no macOS keychain — `git push` funciona direto sem prompt.

## Diretrizes de trabalho

- **Design = Design System.** A abordagem de design do projeto é o **Design System** documentado em `DESIGN-SYSTEM.md`. Qualquer trabalho de UI deve seguir os tokens (CSS custom properties) e as classes/componentes de lá — **não** introduzir cores, sombras, raios ou espaçamentos avulsos. Ao mexer em estilo, consulte `DESIGN-SYSTEM.md` primeiro.
- **Use subagentes sempre que possível.** Delegue tarefas a subagentes (ver a skill `subagent-driven-development`): um subagente fresco por tarefa, com contexto montado sob medida. Isso isola o trabalho, preserva o contexto da sessão principal e mantém a qualidade. Prefira delegar a executar tudo inline.
- **Idioma:** responder e escrever sempre em português do Brasil (pt-BR).
- **Deploy:** não é automático no push — usar `vercel --prod --yes`. Features grandes vão em branch própria e só entram na `main` depois de testadas.

## Comandos

- `npm run dev` — Next dev em :3001
- `npm run dev:tunnel` — dev + cloudflared (para testar webhook Asaas localmente)
- `npm run test:webhook PAYMENT_RECEIVED email valor` — simula evento Asaas com `x-test-mode: 1`
- `npm run db:push` ou `npx drizzle-kit push --force` — aplica schema no Neon (sempre depois de mexer em `db/schema.ts`)
- `npx tsx db/seed.ts` — popular dados base
- `npx tsx db/seed-vibe-coding.ts` — curso de demonstração ("Vibe Coding 101", idempotente)
- `npx tsx scripts/reset-student-passwords.ts` — reset em massa de senhas de alunos para `123321`
- `npm run db:seed-super-admin -- <email> <senha> "<Nome>"` — cria/atualiza um super admin da plataforma
- Scripts que leem o DB direto: `dotenv` carrega `.env`, mas a conexão está em `.env.local` — rode com `export DATABASE_URL="$(grep ^DATABASE_URL= .env.local | cut -d= -f2-)"` antes
- Deploy: **não é automático** no push. Use `vercel --prod --yes` (CLI já logada)

## Estrutura

- `app/(app)/` — rotas autenticadas do aluno (dashboard, catalog, courses, profile, progress, trails)
- `app/admin/` — painel admin do tenant (cursos, alunos, turmas/cohorts, comentários, checkouts, **nota fiscal**, configurações). A navegação admin **não tem barra própria**: os itens vivem num card na sidebar principal (em `components/sidebar.tsx`, array `ADMIN_ITEMS`), visível para `role === 'admin'`
- `app/admin/fiscal/` — página de Nota Fiscal: config fiscal + certificado + lista de notas emitidas (sub-abas "Configuração" / "Notas emitidas")
- `app/super-admin/` — área da plataforma (acima dos tenants): `login`, `/` (CRUD de tenants), `account` (conta do super admin). Login próprio por cookie HMAC, separado do NextAuth
- `app/checkout/[slug]/` — checkout público (sem auth) + página de sucesso com polling
- `app/login | register | forgot-password | reset-password/[token]` — auth público; cada rota é `page.tsx` (server, busca brand) + `*-form.tsx` (client). Header de marca via `<AuthBrand />`
- `app/terms/` — aceite de termos LGPD obrigatório no primeiro acesso
- `app/api/` — endpoints; webhook Asaas em `/api/webhooks/asaas`
- `components/app-shell.tsx` + `sidebar.tsx` + `topbar.tsx` — shell compartilhado (admin + área do aluno); sidebar vira drawer no mobile
- `components/markdown-editor.tsx` + `markdown-renderer.tsx` + `code-block.tsx` — material didático em markdown (code-block tem botão copiar)
- `components/bunny-player.tsx` — player BunnyNet controlável via Player.js (`seekTo`, `getCurrentTime`)
- `components/skeleton.tsx` — kit de skeletons; `loading.tsx` em `(app)/`, `admin/` e `checkout/[slug]/`
- `components/working-indicator.tsx` — feedback animado para tarefas longas de IA (transcrição, resumo, material, capítulos)
- `components/auth-brand.tsx` — header de marca das telas de auth
- `lib/actions.ts` — todas as server actions (admin + aluno + público). Convenção: actions admin começam com `admin*`; públicas com `*Public*`. Toda query é escopada por `tenant_id` (via `getTenantId()`)
- `lib/tenant.ts` — `resolveTenant()` / `getTenantId()` (cache por request): resolve o tenant pelo `Host` da requisição
- `lib/tenant-email.ts` — `getTenantEmail()`: nome, URL e remetente (`slug@PLATFORM_DOMAIN`) do tenant para os e-mails
- `lib/super-admin.ts` — sessão do super admin (cookie HMAC `sa_session`, TTL 7d); `getSuperAdmin()`, `requireSuperAdmin()`
- `lib/super-admin-actions.ts` — login/logout do super admin, CRUD de tenants, conta do super admin
- `lib/vercel-domains.ts` — `attachDomain()` / `detachDomain()`: registra domínios de tenant no projeto Vercel via API
- `lib/nfse/` — núcleo de emissão de NFS-e (portado do app CODEX): `sign.ts` (assina XML-DSig com o PFX), `xml.ts` + `template.ts` (monta o XML da DPS), `client.ts` (cliente mTLS do Sistema Nacional), `event.ts` (XML de cancelamento), `cert-crypto.ts` (cifra/decifra o certificado, AES-256-GCM), `emit.ts` (`emitInvoiceForPayment`, `fetchAndStoreInvoicePdf`), `cancel.ts` (`cancelInvoiceForPayment`), `types.ts`
- `lib/fiscal-config.ts` — `getFiscalConfigForUI()` (sem segredos), `getFiscalCompany()` (decifrado, para emitir)
- `lib/fiscal-actions.ts` — server actions: salvar config, upload de certificado, emitir/cancelar/reenviar notas
- `lib/asaas.ts` — client da API Asaas
- `lib/brevo.ts` — `sendEmail()` (email transacional Brevo); aceita `from` opcional (remetente por tenant)
- `lib/zapi.ts` — `sendWhatsApp()` (normaliza telefone BR, envia via Z-API)
- `lib/notifications.ts` — orquestra email + WhatsApp em paralelo; templates: `notifyWelcome`, `notifyPasswordReset`, `notifyForgotPassword`, `notifyPaymentConfirmed`. Nome/URL/remetente seguem o tenant
- `lib/reset-token.ts` — tokens HMAC assinados (TTL 1h) para "esqueci minha senha", sem tabela no DB
- `lib/brand.ts` — `getBrand()` (cache) lê settings de identidade, escopado por tenant
- `lib/course-stats.ts` — `getCourseStats(courseIds)` retorna `{ lessonCount, totalSeconds, durationLabel, studentCount }` real (NÃO use as colunas mocadas `courses.lessonCount/duration`)

## Tabelas principais

- **`tenant_id`**: TODAS as tabelas de dados (23) têm a coluna `tenant_id` (default `tnt_default`, FK → `tenants`). Toda query lê/escreve escopada por tenant.
- `tenants` — `id`, `name`, `slug` (subdomínio, único), `customDomain` (único), `active`, `createdAt`
- `platform_admins` — super admins da plataforma (login próprio, fora dos tenants): `id`, `name`, `email` (único), `passwordHash`
- `users` — perfil + `plan`, `cpfCnpj`, `asaasCustomerId`, `suspended`, `passwordHash`, `termsAcceptedAt` (null = ainda não aceitou os termos LGPD). E-mail é único **por tenant** (`unique(tenant_id, email)`), não global
- `courses` — `published` controla visibilidade. **`coverImage` (URL Blob) tem prioridade sobre `coverBg` (gradiente)**. `lessonCount/duration` são mocados — derive via `getCourseStats`. **`students` é um número definido manualmente pelo admin** (editor do curso) e exibido como tal — NÃO é derivado
- `modules`, `lessons` — `lessons.published` controla visibilidade; estudante só vê publicadas
- `lessons.content` — material didático em markdown (aba "Material"); `lessons.transcript` (fonte interna p/ IA, NÃO aparece para o aluno); `lessons.aiSummary`; `lessons.chapters` (JSON `[{time,title}]`)
- `lessons.bunnyVideoId | pandaVideoId | videoUrl` — três fontes de vídeo, priorizadas nessa ordem no player
- `materials` — arquivos anexos por aula (PDF/ZIP/DOC/XLS/imagem), upload em Vercel Blob
- `enrollments` — `active`, `expiresAt` permitem suspender acesso a curso específico
- `payments`, `subscriptions` — integração Asaas; `payments.courseId` linka a curso para auto-matrícula no webhook
- `checkouts` — config pública por curso (`slug` único, `price`, `allowPix/Boleto/CreditCard`, `maxInstallments`, `socialProof`)
- `checkout_offers` — ofertas/preços alternativos de um checkout, cada uma com `slug` próprio (link `/checkout/[slug-da-oferta]`). Em Admin → Checkouts, os links das ofertas aparecem direto no card (sem expandir o editor), prontos para copiar
- `coupons` — cupons por checkout: `code`, `discountType` (`percent`/`fixed`), `discountValue`, `expiresAt` (calculado na criação a partir de validade em dias)
- `comments` — `parentId` (auto-ref, sem FK) para threading + `imageUrl` para anexos
- `cohorts`, `cohort_courses`, `cohort_members` — turmas
- `notes` — `notes.timestamp` guarda o tempo do vídeo em segundos (string); clicável p/ pular no player BunnyNet
- `fiscal_config` — uma linha por tenant: dados fiscais do emitente (CNPJ, IM, endereço, regime tributário, códigos de tributação, série) + `enabled`, `tpAmb` (`2` homologação / `1` produção) + certificado (`pfxData`/`pfxPassword` cifrados, `certSubject`, `certValidoAte`)
- `invoices` — notas emitidas: `paymentId`, `userId`, `status` (`pendente`/`autorizada`/`erro`/`cancelada`), `chaveAcesso`, `dpsXml`/`nfseXml`, `pdfUrl` (Blob), `notifiedAt` (e-mail/WhatsApp já enviados)
- `users` tem endereço estruturado (`addrLogradouro`, `addrNumero`, `addrComplemento`, `addrBairro`, `addrCidade`, `addrUf`, `addrCep`) — obrigatório no checkout, usado como tomador na NFS-e
- `settings` — key/value, **PK composta `(tenant_id, key)`**: `panda_api_key`, `panda_player_id`, `asaas_api_key`, `asaas_env`, `asaas_webhook_secret`, `brand_name`, `brand_logo`, `brand_logo_dark` (logo para tema escuro), `brand_favicon`, `brand_color`, `brand_footer`, `brand_logo_only` (`'1'` = só logo, sem nome), `lgpd_terms` (texto LGPD editável)

## Convenções

- **Tema**: `data-theme="dark"|"light"` no `<html>`. Bootstrap inline script no `app/layout.tsx` aplica antes da hidratação a partir de `localStorage('atlas-theme')` ou `prefers-color-scheme`. Toggle no `Topbar`.
- **Brand**: `getBrand()` é chamado em `app/layout.tsx`, `(app)/layout.tsx` e `admin/layout.tsx`. Cor customizada sobrescreve `--accent`, `--accent-fg: #fff`, `--accent-soft` (color-mix). Logo aparece no sidebar; favicon via `generateMetadata`; footer pelo `AppShell`. Logo tem variante para tema escuro (`brand_logo_dark`): sidebar e telas de auth renderizam as duas e o CSS mostra a certa via classes `.brand-logo-light`/`.brand-logo-dark` + `[data-theme]`.
- **Multi-tenant**: o tenant é resolvido pelo `Host` (`lib/tenant.ts`). Toda query é escopada por `tenant_id`. `auth.ts` usa `trustHost: true` (sem `NEXTAUTH_URL` fixo) e autentica por `(tenant, email)`; a sessão carrega `tenantId`. `proxy.ts` deixa `/super-admin` passar (tem auth própria).
- **Senha padrão de alunos**: `123321` (definida em `lib/actions.ts` constante `DEFAULT_STUDENT_PASSWORD` para o checkout público).
- **Upload**: `POST /api/upload` (admin-only) aceita imagens até 5MB e retorna URL do Vercel Blob.
- **Webhook Asaas**: header `asaas-access-token` validado contra `asaas_webhook_secret`. `x-test-mode: 1` só funciona quando `NODE_ENV !== 'production'`. Auto-matricula no curso quando `payment.courseId` está setado e evento é `RECEIVED`/`CONFIRMED`.
- **Polling de pagamento**: `/api/checkout/payment-status?id=` consulta Asaas direto se webhook atrasar — atualiza DB e matricula como fallback.
- **Layouts**: alunos `(app)/layout.tsx` e `admin/layout.tsx` redirecionam pra `/login` se `dbUser.suspended`, e pra `/terms` se `termsAcceptedAt` for null. Sempre carregam `brand` e passam pro `AppShell`.
- **Notificações**: sempre disparadas com `await` (não fire-and-forget) — a Vercel mata a function antes do fetch terminar, causando `SocketError: other side closed`. Falhas são logadas mas não quebram o fluxo principal.
- **Senha**: troca self-service em `/api/profile/password` (exige senha atual); reset pelo admin em `/api/admin/students/[id]/password`; "esqueci minha senha" em `/forgot-password` → token HMAC → `/reset-password/[token]`. Mínimo 6 caracteres.
- **Material didático**: parser markdown próprio (negrito, itálico, código, blocos, listas, headings, imagens, links) — `markdown-renderer.tsx` renderiza como React elements puros (XSS-safe por construção do React, sem injeção de HTML cru). Imagens inline via `/api/admin/upload-inline` (botão ou Ctrl+V). "Gerar com IA" via `/api/ai/material`.
- **Cupons/ofertas**: o slug em `/checkout/[slug]` resolve oferta OU checkout (`resolveCheckoutSlug` em `actions.ts`, escopado por tenant). Desconto de cupom é SEMPRE re-validado no servidor em `createPublicCheckoutCharge` — nunca confie no preço do cliente.
- **Checkout — bandeiras de cartão**: ícones via `react-svg-credit-card-payment-icons` (`<PaymentIcon type="Visa" format="flatRounded" />`). Há um aviso fixo de que a cobrança aparece como "Asaas" na fatura.
- **Responsivo (≤ 760px)**: sidebar vira drawer (hamburger no topbar); menu admin vira faixa horizontal rolável; checkout empilha em 1 coluna; lesson page esconde breadcrumbs e reduz título.

## Player de vídeo

- Admin → editor de aula só mostra os players configurados (Bunny via `NEXT_PUBLIC_BUNNY_LIBRARY_ID`; Panda via `panda_api_key` + `panda_player_id`). URL (YouTube/Vimeo) sempre disponível.
- Helper `urlToEmbed` (duplicado em `app/(app)/courses/[id]/lessons/[lessonId]/page.tsx` e no editor admin) converte URLs YouTube/Vimeo para embeds.
- **Seek (capítulos + notas com timestamp): só BunnyNet.** O `BunnyPlayer` usa Player.js (carregado da CDN do Bunny) para `seekTo`/`getCurrentTime`. YouTube/Panda usam `<iframe>` simples, sem controle.
- **Transcrição:** `/api/admin/lessons/[id]/transcribe` extrai o áudio do vídeo Bunny com `ffmpeg` (mono/16kHz/Opus, evita o limite de 25 MB da OpenAI) e transcreve com `gpt-4o-transcribe`. Exige "MP4 Fallback" ativado na biblioteca BunnyNet.
- **Capítulos:** `/api/ai/chapters` gera `[{time,title}]` da transcrição; editável na aba "Capítulos"; clicáveis na aula (só Bunny).

## Gotchas que custaram tempo

- **Prev/next de aula**: ordene por `(módulo position, lesson position)` em JS — o `orderBy(lessons.position)` direto interleaves aulas entre módulos.
- **`lessons.duration`** vem em formatos variados (`MM:SS`, `HH:MM:SS`, `Xh Ymin`); use `parseDurationToSeconds` de `lib/course-stats.ts`.
- **Asaas `creditCardHolderInfo`** exige `addressNumber` — usar `'S/N'` se não coletado.
- **Cartão com parcelamento**: payment row inserido é o da primeira parcela; usar `firstId` retornado de `asaasListPaymentsByInstallment` no fluxo do checkout público pra evitar 404 na success page.
- **Hydration mismatch com `<style>` no head**: extensões de browser injetam estilos. `suppressHydrationWarning` no `<html>` e no `<style>` do `app/layout.tsx` está em vigor — não remova.
- **`outputFileTracingIncludes` (next.config.ts)**: a chave é um glob — NÃO use `[lessonId]` (colchetes viram classe de caractere). Use `/api/**`. É o que empacota o binário do `ffmpeg-static` na função de transcrição.
- **Favicon**: NÃO criar `app/favicon.ico` — o Next serve esse arquivo automaticamente e ele sobrepõe o favicon da marca (`generateMetadata` → `icons`).
- **Notificações com `await`**: nunca fire-and-forget — a Vercel encerra a function e o fetch é cortado (`SocketError: other side closed`).
- **DANFSE (PDF da NFS-e)**: o endpoint do governo demora a disponibilizar o PDF — logo após autorizar, baixar quase sempre falha. Não é bug; o PDF é re-tentável (espere ~1h). A nota fica `autorizada` mesmo sem PDF (o XML é o documento legal).
- **Vercel Blob `put`**: precisa de `allowOverwrite: true` ao re-gravar um arquivo no mesmo caminho, senão lança "blob already exists" (quebrava o retry do PDF).

## Integrações externas (env vars)

- **Multi-tenant / domínios**: `PLATFORM_DOMAIN=claudemembers.com.br` (domínio guarda-chuva); `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` (registro automático de domínios de tenant na Vercel).
- **Brevo** (email): `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` (fallback). O domínio `claudemembers.com.br` está **autenticado no Brevo** (DKIM + brevo-code) — qualquer endereço `@claudemembers.com.br` pode enviar; cada tenant envia de `slug@claudemembers.com.br`.
- **Z-API** (WhatsApp): `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN` (header `Client-Token`).
- **OpenAI**: `OPENAI_API_KEY` — `/api/ai/chat`, `/api/ai/summary`, `/api/ai/material`, `/api/ai/chapters` (`gpt-4o`); `/api/social-proof` (`gpt-4o-mini`); `/api/admin/lessons/[id]/transcribe` (`gpt-4o-transcribe`).
- **ffmpeg-static**: dependência npm — binário do ffmpeg para extrair áudio na transcrição. `serverExternalPackages` + `outputFileTracingIncludes` no `next.config.ts` garantem o empacotamento.
- **ViaCEP**: API pública gratuita (sem chave) — busca de endereço por CEP no checkout.
- **Mensagens admin**: aba "Mensagens" nas Configurações mostra status Brevo/Z-API + envio de teste; `/api/admin/zapi-status` testa a conexão do WhatsApp; modal de mensagem no detalhe do aluno (`adminSendMessage`).
- Env vars são adicionadas na Vercel via CLI; o ambiente **Preview** exige `--value` + branch e às vezes não pega pela CLI — conferir no dashboard.

## IA / notificações

- Email + WhatsApp disparam em: cadastro (boas-vindas), reset de senha pelo admin, "esqueci minha senha", pagamento confirmado (webhook Asaas).
- `/api/social-proof` gera 25 nomes/cidades BR fictícios via IA, com cache em memória de 1h e fallback hardcoded. Toaster só aparece se `checkouts.socialProof` estiver ativo.

## Multi-tenant

Arquitetura: **banco compartilhado + `tenant_id`**. Cada tenant é uma área de membros completa e isolada. Fases 1–4 concluídas e em produção.

- **Resolução**: `lib/tenant.ts` resolve o tenant pelo `Host` — subdomínio de `PLATFORM_DOMAIN` (`slug.claudemembers.com.br`), domínio próprio (`tenants.customDomain`), ou fallback para o tenant padrão (`tnt_default`, "Claude Members"). `localhost`/`*.vercel.app`/apex caem no padrão.
- **Auth**: `auth.ts` autentica por `(tenant_id, email)`; `trustHost: true` (sem `NEXTAUTH_URL` fixo, senão a auth redireciona para o host errado entre tenants). JWT/sessão carregam `tenantId`.
- **Queries**: tudo escopado por `tenant_id` (~39 arquivos). Inserts setam `tenant_id`. `settings` tem PK composta; `users.email` é único por tenant.
- **Super Admin** (`/super-admin`): área da plataforma, login próprio (cookie HMAC, tabela `platform_admins`). CRUD de tenants — ao criar um tenant, cria junto a 1ª conta de admin dele. `/super-admin/account` edita a conta do super admin. Criar o primeiro super admin: `npm run db:seed-super-admin`.
- **Domínios** (`lib/vercel-domains.ts`): ao criar/editar um tenant, o subdomínio e o domínio próprio são registrados no projeto Vercel via API automaticamente. DNS: subdomínios cobertos por um wildcard `CNAME *` no Cloudflare; domínio próprio precisa de `CNAME → cname.vercel-dns.com` (subdomínio) ou `A → 76.76.21.21` (apex) no DNS daquele domínio.
- **E-mail por tenant**: cada tenant envia de `slug@claudemembers.com.br` com nome/URL próprios (`lib/tenant-email.ts`). O domínio guarda-chuva foi autenticado uma vez no Brevo e cobre todos. O webhook do Asaas (sem host) recebe o tenant explicitamente.

### Infra de e-mail do domínio `claudemembers.com.br`
- DNS no **Cloudflare**. **Receber**: Cloudflare Email Routing (MX) → catch-all encaminha para um Gmail. **Enviar**: Brevo (DKIM/brevo-code autenticados). São funções separadas; só pode haver **um** registro SPF.
- Plano Vercel: **Hobby** (grátis) — sem wildcard *domain* na Vercel; cada subdomínio de tenant é registrado individualmente via API.

### Gotchas multi-tenant
- **SSL de domínio de tenant pode travar**: se `https://...` não subir após o DNS propagar, force com `vercel certs issue <domínio>`.
- **`db:push` é interativo** e pode pedir confirmação destrutiva — para mudanças de constraint, aplicar o DDL direto via `psql` é mais seguro.

## Nota Fiscal (NFS-e)

Emissão de NFS-e direto pelo **Sistema Nacional de NFS-e** (SEFIN Nacional / ADN gov.br) — núcleo portado do app CODEX da usuária. NÃO usa a Asaas para nota fiscal.

- **Como funciona**: monta o XML da DPS (`lib/nfse/xml.ts`) → assina com o certificado digital (XML-DSig, `lib/nfse/sign.ts`) → envia via **mTLS** ao governo (`lib/nfse/client.ts`, o certificado é a identidade TLS) → recebe a `chaveAcesso`. Cancelamento é um evento XML (tipo 101101).
- **Config por tenant** (`fiscal_config`): cada tenant emite com o próprio CNPJ + certificado. O certificado `.pfx` + senha são guardados **cifrados** no banco (AES-256-GCM com chave derivada do `AUTH_SECRET` — `lib/nfse/cert-crypto.ts`); nunca vão ao navegador. Upload via `POST /api/admin/fiscal/certificate`.
- **Ambiente**: `tpAmb` `2` = homologação (produção restrita), `1` = produção. Padrão homologação até o contador validar os códigos de tributação.
- **Emissão**: automática no pagamento confirmado (webhook Asaas + checkout) e manual (botão no detalhe do aluno). `emitInvoiceForPayment` é idempotente e nunca lança — falha vira `invoice` status `erro`.
- **PDF (DANFSE)**: baixado do endpoint do governo (`baixarDanfse`) e guardado no Blob. O governo demora a gerar o DANFSE — na emissão quase nunca está pronto; o painel tem retry.
- **Envio ao comprador**: **manual** — a emissão NÃO dispara e-mail/WhatsApp. No painel (`/admin/fiscal` → Notas emitidas) há "Enviar notas pendentes" (dispara as não-notificadas que já têm PDF) e "Reenviar selecionadas" (checkbox por nota, força reenvio). `notifiedAt` marca as já enviadas.
- **Telas**: `/admin/fiscal` (config + lista com filtros de período e nome/CPF); notas também aparecem no detalhe do aluno.
- **Setup atual**: a empresa **3S Contabilidade** já está configurada nos dois tenants (CNPJ, certificado válido até 03/2027), mas com `enabled = false` — emissão desligada até a usuária ativar no painel.

## Pendências conhecidas

- Public checkout permite paste de imagem em comentários mas não há moderação automática.
- `coverImage` no editor admin aceita upload mas a tabela `cohorts`/`trails` ainda não tem imagem.
- Cartão de crédito vai como string no payload da Asaas — pra produção, considerar tokenização (PCI).
- Texto dos termos LGPD é editável em Configurações → LGPD (`settings.lgpd_terms`); o padrão está em `lib/lgpd-default.ts` — revisar com jurídico antes de produção.
- Transcrição: vídeos muito longos podem estourar 25 MB mesmo só com áudio — particionamento automático não implementado.
- NFS-e: o envio do e-mail/WhatsApp da nota é manual (botão no painel) — não há agendador automático. Os códigos de tributação da `fiscal_config` precisam de validação contábil antes de virar o ambiente para produção.
- Multi-tenant: emissão de SSL de domínio de tenant não é automatizada (rodar `vercel certs issue` se travar). Brevo/Z-API são globais — envio do domínio próprio de cada tenant exigiria autenticar o domínio do tenant no Brevo.
