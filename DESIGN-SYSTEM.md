# Design System — Atlas Members

## Introdução

O projeto possui um design system baseado em CSS custom properties (tokens) e classes utilitárias/de componente definidas em `app/globals.css`. Toda UI nova deve usar esses tokens e classes — nunca introduzir cores hex soltas, sombras avulsas, raios ou espaçamentos que não existam no arquivo. Isso garante consistência visual e suporte automático a temas claro e escuro.

---

## Temas

O tema é controlado pelo atributo `data-theme` na tag `<html>`:

```
data-theme="light"   →  tema claro (padrão)
data-theme="dark"    →  tema escuro
```

### Como é aplicado

- **Bootstrap script** (sem flash): em `app/layout.tsx`, um `<script>` inline é injetado no `<head>` antes de qualquer renderização. Ele lê `localStorage.getItem('atlas-theme')` e, se não houver preferência salva, usa `window.matchMedia('(prefers-color-scheme: dark)')`. O script está exportado como `THEME_BOOTSTRAP_SCRIPT` em `components/theme-toggle.tsx`.
- **Persistência**: ao alternar o tema, `ThemeToggle` salva a preferência em `localStorage` com a chave `'atlas-theme'` e atualiza o atributo `data-theme` no `document.documentElement`.
- **Toggle**: o componente `<ThemeToggle />` (um `icon-btn` na Topbar) chama `document.documentElement.setAttribute('data-theme', next)` e persiste em `localStorage`.
- **Logos por tema**: as variantes `.brand-logo-light` e `.brand-logo-dark` são ocultadas via CSS conforme o tema ativo (`[data-theme="dark"] .brand-logo-light { display: none }`).

---

## Tokens de cor

Os tokens são definidos em `:root, [data-theme="light"]` e sobrescritos em `[data-theme="dark"]`. Todos os valores abaixo são extraídos literalmente de `app/globals.css`.

### Fundos e superfícies

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#ececed` | `#09090b` | Fundo base da página, sidebar, topbar |
| `--bg-elevated` | `#ffffff` | `#131316` | Cards, dropdowns, inputs — superfícies elevadas |
| `--bg-muted` | `#e4e4e7` | `#1c1c20` | Cabeçalhos de tabela, chips neutros, campos somente-leitura, blocos de código |
| `--bg-hover` | `rgba(0,0,0,0.035)` | `rgba(255,255,255,0.04)` | Estado de hover de itens de lista e nav |
| `--bg-active` | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.07)` | Estado de pressão/ativo; hover do `.btn-soft` |

### Bordas

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--border` | `rgba(24,24,27,0.08)` | `rgba(255,255,255,0.07)` | Bordas sutis — cards, separadores, nav ativo |
| `--border-strong` | `rgba(24,24,27,0.14)` | `rgba(255,255,255,0.14)` | Bordas de inputs/campos de formulário, kbd |

### Texto

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--text` | `#18181b` | `#fafafa` | Texto principal, botão primário |
| `--text-muted` | `#71717a` | `#a1a1aa` | Texto secundário, labels, placeholders, ícones de nav |
| `--text-faint` | `#a1a1aa` | `#71717a` | Texto terciário, timestamps, eyebrows, handles |

### Accent (cor primária)

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--accent` | `oklch(0.55 0.18 264)` | `oklch(0.7 0.16 264)` | Botão primário, links ativos, heatmap nível 4, badges de nav, progresso |
| `--accent-fg` | `#ffffff` | `#0a0a0f` | Texto sobre fundo `--accent` |
| `--accent-soft` | `oklch(0.96 0.04 264)` | `oklch(0.27 0.08 264)` | Fundo suave do accent — chips accent, aula atual, blocos de destaque |
| `--accent-soft-fg` | `oklch(0.45 0.18 264)` | `oklch(0.85 0.1 264)` | Texto sobre `--accent-soft` |

> O admin pode sobrescrever `--accent` (e variações) via painel de configurações de marca. Quando `brand.color` está definido, `app/layout.tsx` injeta um `<style>` que redefine `--accent`, `--accent-fg`, `--accent-soft` e `--accent-soft-fg` globalmente para ambos os temas.

### Semânticos

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--success` | `oklch(0.62 0.13 152)` | `oklch(0.7 0.14 152)` | Texto/ícone de sucesso, ícone de aula concluída |
| `--success-soft` | `oklch(0.96 0.03 152)` | `oklch(0.28 0.07 152)` | Fundo do chip de sucesso |
| `--warning` | `oklch(0.74 0.14 70)` | `oklch(0.78 0.13 70)` | Texto/ícone de aviso |
| `--danger` | `oklch(0.58 0.21 25)` | `oklch(0.68 0.2 25)` | Texto/ícone de erro, botão destrutivo, item "Sair" no dropdown |

---

## Tipografia

### Famílias de fonte

As fontes são carregadas via `next/font/google` em `app/layout.tsx` e mapeadas para os tokens de CSS:

| Token | Fonte | Uso |
|---|---|---|
| `--font-sans` | Geist (+ fallbacks `ui-sans-serif, system-ui, -apple-system, sans-serif`) | Fonte padrão de toda a UI — corpo, botões, labels, nav |
| `--font-display` | Instrument Serif (+ fallback `serif`) | Títulos serifados (`h1-serif`), números de estatística (`.stat-num`), números de módulo (`.module-num`), marca da sidebar quando sem logo, glífos de capa de curso |
| `--font-mono` | Geist Mono (+ fallbacks `ui-monospace, monospace`) | Códigos, valores de tokens, teclado `<kbd>`, campos de API Key/Player ID/URLs, classe `.mono` |

O `<body>` usa `font-size: 14px` como base, com `font-feature-settings: 'cv11', 'ss03'` e antialiasing ativado.

### Classes de heading

| Classe | Tamanho | Peso | Outras propriedades | Uso |
|---|---|---|---|---|
| `.h1` | 30px | 600 | `letter-spacing: -0.025em`, `line-height: 1.15` | Títulos de página (fonte sans) |
| `.h1-serif` | 42px | 400 | `font-family: var(--font-display)`, `letter-spacing: -0.02em`, `line-height: 1.05` | Títulos destacados com serifa (ex.: hero de curso) |
| `.h2` | 20px | 600 | `letter-spacing: -0.015em` | Subtítulos de seção, cabeçalhos de página admin |
| `.h3` | 16px | 600 | `letter-spacing: -0.005em` | Subtítulos menores |
| `.eyebrow` | 11px | 600 | `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: var(--text-muted)` | Rótulo de categoria acima de títulos |
| `.muted` | (herda) | (herda) | `color: var(--text-muted)` | Texto secundário em qualquer contexto |
| `.mono` | (herda) | (herda) | `font-family: var(--font-mono)`, `font-variant-numeric: tabular-nums` | Valores monoespaciados inline |

---

## Raio, sombra e espaçamento

### Tokens de raio de borda

| Token | Valor | Uso típico |
|---|---|---|
| `--radius-sm` | `6px` | Chips, itens de dropdown, ícones de aula |
| `--radius` | `10px` | Dropdowns, topbar-search, botões |
| `--radius-md` | `12px` | Cards (`.card`), capas de curso, módulos |
| `--radius-lg` | `16px` | Auth card |
| `--radius-xl` | `20px` | Disponível para elementos maiores |

### Tokens de sombra

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(24,24,27,0.05)` | `0 1px 2px rgba(0,0,0,0.4)` | Nav ativo, admin block na sidebar |
| `--shadow-md` | `0 4px 12px -2px rgba(24,24,27,0.07), 0 2px 4px -1px rgba(24,24,27,0.04)` | `0 4px 14px -2px rgba(0,0,0,0.5)` | Uso geral para elementos flutuantes |
| `--shadow-lg` | `0 12px 32px -8px rgba(24,24,27,0.12), 0 4px 8px -2px rgba(24,24,27,0.06)` | `0 16px 40px -10px rgba(0,0,0,0.6)` | Dropdowns, auth card |

### Classes utilitárias de layout e espaçamento

**Flex:**

| Classe | Estilo |
|---|---|
| `.row` | `display: flex; align-items: center; gap: 12px` |
| `.col` | `display: flex; flex-direction: column` |
| `.grow` | `flex: 1; min-width: 0` |

**Gap:**

`.gap-4`, `.gap-8`, `.gap-10`, `.gap-12`, `.gap-16`, `.gap-20`, `.gap-24` — definem `gap` com o valor correspondente em px.

**Margin-top:**

`.mt-4`, `.mt-8`, `.mt-12`, `.mt-16`, `.mt-24`, `.mt-32` — definem `margin-top` com o valor correspondente em px.

**Margin-bottom:**

`.mb-4`, `.mb-8`, `.mb-12`, `.mb-16`, `.mb-24` — definem `margin-bottom` com o valor correspondente em px.

**Separador:**

`.divider` — linha horizontal de 1px com `background: var(--border)` e `margin: 20px 0`.

**Dot:**

`.dot` — ponto inline de 3×3px com `background: currentColor` e `opacity: 0.4`.

---

## Componentes / classes

### Layout da aplicação

#### `.app`

Grid de 2 colunas: `240px 1fr` (sidebar + conteúdo principal). Com `.sidebar-collapsed`, a primeira coluna vira `64px`. Em mobile (≤ 760px), a sidebar vira um drawer off-canvas e o grid passa para `1fr`.

```jsx
<div className={`app${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
  {/* sidebar + main */}
</div>
```

#### `.main` / `.content` / `.content-wide`

`.main` é o wrapper da área principal (flex coluna). `.content` aplica `padding: 36px` e `max-width: 1280px`. `.content-wide` estende para `max-width: 1440px`.

---

### Sidebar

| Classe | Descrição |
|---|---|
| `.sidebar` | Container sticky da sidebar — `background: var(--bg)`, `border-right: 1px solid var(--border)` |
| `.sidebar-brand` | Área do logo/nome da marca no topo |
| `.sidebar-brand-mark` | Quadrado 28×28px com o inicial da marca (fundo `--text`, texto `--bg`, fonte display) |
| `.sidebar-brand-logo-full` | Imagem de logo em largura total quando a opção "apenas logo" está ativa |
| `.sidebar-section` | Rótulo de grupo (11px, maiúsculas, `--text-faint`) |
| `.sidebar-admin-block` | Bloco destacado para itens admin — `background: var(--bg-muted)`, borda, `border-radius: 10px` |
| `.sidebar-user` | Área do usuário no rodapé da sidebar |
| `.sidebar-user-meta` | Wrapper do nome e handle do usuário |
| `.sidebar-user-name` | Nome do usuário (13px, weight 600, com ellipsis) |
| `.sidebar-user-handle` | Handle/nível do usuário (11.5px, `--text-faint`, com ellipsis) |
| `.sidebar-collapse-arrow` | Botão de recolher a sidebar |
| `.brand-logo-light` / `.brand-logo-dark` | Variantes do logo por tema — o CSS oculta a versão não-ativa automaticamente |

---

### Navegação

#### `.nav-item`

Item de navegação (link ou botão) da sidebar. Usa `--text-muted` por padrão; hover aplica `--bg-hover` + `--text`; estado ativo (`data-active="true"`) aplica `--bg-elevated`, borda e `--shadow-sm`.

```jsx
<Link href="/dashboard" className="nav-item" data-active={pathname === '/dashboard'}>
  <Icon name="home" size={18} />
  <span>Início</span>
</Link>
```

#### `.nav-item-badge`

Badge numérico no canto direito de um `.nav-item` — fundo `--accent`, texto `--accent-fg`.

---

### Topbar

#### `.topbar`

Header fixo de 60px — `background: var(--bg)`, `border-bottom: 1px solid var(--border)`, `z-index: 10`.

#### `.topbar-search`

Campo de busca — `background: var(--bg-muted)`, `border-radius: 9px`. O `<input>` interno herda a cor do pai.

#### `.topbar-actions`

Container flex com `margin-left: auto` para alinhar ações à direita.

#### `.icon-btn`

Botão ícone quadrado de 36×36px — fundo transparente, borda zero, `border-radius: 8px`. Hover aplica `--bg-hover`.

#### `.icon-btn-dot`

Indicador/ponto sobre o `.icon-btn` — círculo de 7px com `background: var(--accent)` e borda `2px solid var(--bg)`.

#### `.mobile-menu-btn`

Botão hambúrguer visível apenas em mobile (≤ 760px).

---

### Avatar

#### `.avatar`

Círculo de 32×32px com `background: var(--accent)` e `color: var(--accent-fg)`. Exibe as iniciais do usuário.

| Modificador | Tamanho |
|---|---|
| `.avatar` (base) | 32×32px, `font-size: 13px` |
| `.avatar-lg` | 56×56px, `font-size: 22px` |
| `.avatar-xl` | 88×88px, `font-size: 32px` |

```jsx
<div className="avatar">{initials}</div>
```

---

### Botões

#### `.btn` (base)

Botão padrão — `background: var(--text)`, `color: var(--bg)`, `border-radius: 9px`, `padding: 9px 14px`, `font-size: 13.5px`, `font-weight: 500`. O estado `:disabled` aplica `opacity: 0.4`.

| Variante | Aparência |
|---|---|
| `.btn-accent` | Fundo `--accent`, texto `--accent-fg` |
| `.btn-soft` | Fundo `--bg-muted`, texto `--text`; hover usa `--bg-active` |
| `.btn-ghost` | Fundo transparente, texto `--text-muted`, borda `--border`; hover usa `--bg-hover` + `--text` |
| `.btn-danger` | Fundo `--danger`, texto branco |
| `.btn-lg` | `padding: 12px 20px`, `font-size: 14.5px` |
| `.btn-sm` | `padding: 6px 10px`, `font-size: 12.5px`, `gap: 6px` |

```jsx
<button className="btn btn-accent">Salvar</button>
<button className="btn btn-ghost btn-sm">Cancelar</button>
<button className="btn btn-danger" disabled>Excluir</button>
```

---

### Cards

| Classe | Descrição |
|---|---|
| `.card` | Card padrão — `background: var(--bg-elevated)`, borda `--border`, `border-radius: var(--radius-md)`, `padding: 20px` |
| `.card-flat` | Igual ao `.card`, mas sem padding (para layouts com cabeçalho separado) |
| `.card-muted` | Card com fundo `--bg-muted` (sem borda), `padding: 16px` — para blocos secundários |

```jsx
<div className="card">
  <h2 className="h2">Título</h2>
  <p className="muted mt-4">Subtítulo</p>
</div>
```

---

### Formulários

#### `.input-field`

Campo de formulário padrão — `width: 100%`, `padding: 10px 12px`, `border: 1px solid var(--border-strong)`, `border-radius: 8px`, `background: var(--bg-elevated)`. No focus: `border-color: var(--accent)` + box-shadow com `color-mix`.

Funciona para `<input>`, `<select>` (com `cursor: pointer`) e `<textarea>` (com `resize: vertical; min-height: 80px`).

```jsx
<input className="input-field" placeholder="Digite aqui..." />
<select className="input-field">...</select>
<textarea className="input-field" rows={4} />
```

#### `.field-label`

Label de campo — `display: block`, `font-size: 12px`, `font-weight: 600`, `color: var(--text-muted)`, `margin-bottom: 6px`.

```jsx
<label className="field-label">Nome da plataforma</label>
```

#### `.field-group`

Container de campo — `display: flex; flex-direction: column; gap: 6px`. Agrupa `.field-label` + `.input-field` + mensagem de ajuda.

```jsx
<div className="field-group">
  <label className="field-label">E-mail</label>
  <input className="input-field" type="email" />
  <p className="muted" style={{ fontSize: 11.5 }}>Será usado para login.</p>
</div>
```

---

### Tabs

#### `.tabs` / `.tab`

`.tabs` é um container flex com `border-bottom: 1px solid var(--border)`. Cada `.tab` é um botão transparente que, quando `data-active="true"`, exibe `border-bottom: 2px solid var(--text)` na cor do texto principal.

```jsx
<div className="tabs">
  <button className="tab" data-active={tab === 'info'} onClick={() => setTab('info')}>Informações</button>
  <button className="tab" data-active={tab === 'config'} onClick={() => setTab('config')}>Configurações</button>
</div>
```

---

### Chip / Tag

#### `.chip`

Tag inline — `background: var(--bg-muted)`, `color: var(--text-muted)`, `border-radius: 999px`, `padding: 3px 9px`, `font-size: 11.5px`.

| Variante | Aparência |
|---|---|
| `.chip-accent` | Fundo `--accent-soft`, texto `--accent-soft-fg` |
| `.chip-success` | Fundo `--success-soft`, texto `--success` |

`.chip-dot` é um elemento inline dentro do chip (círculo de 6px com `background: currentColor`).

```jsx
<span className="chip chip-success">
  <span className="chip-dot" /> Ativo
</span>
<span className="chip chip-accent">Admin</span>
```

---

### Tabela admin

#### `.admin-table`

Tabela de largura total, sem bordas de colapso, `font-size: 13.5px`. Os `<th>` têm `font-size: 11px`, maiúsculas, `color: var(--text-muted)`, `background: var(--bg-muted)`. As células têm `padding: 12px 16px` e `border-bottom: 1px solid var(--border)`. A última linha não tem borda inferior.

```jsx
<table className="admin-table">
  <thead>
    <tr>
      <th>Nome</th>
      <th>E-mail</th>
      <th>Nível</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Maria Silva</td>
      <td>maria@exemplo.com</td>
      <td>5</td>
    </tr>
  </tbody>
</table>
```

---

### Dropdown

#### `.dropdown`

Menu flutuante — `background: var(--bg-elevated)`, `border: 1px solid var(--border)`, `border-radius: 10px`, `box-shadow: var(--shadow-lg)`, `padding: 6px`, animado com `fadeUp`.

#### `.dropdown-item`

Item do dropdown — flex, `padding: 8px 10px`, `border-radius: 6px`. Hover: `background: var(--bg-hover)`. Variante `.danger` usa `color: var(--danger)`.

#### `.dropdown-divider`

Separador horizontal de 1px com `background: var(--border)`.

#### `.dropdown-header`

Cabeçalho de grupo dentro do dropdown — 11px, maiúsculas, `color: var(--text-faint)`.

---

### Autenticação

#### `.auth-page`

Wrapper de página de login — `min-height: 100vh`, grid centralizado, `background: var(--bg)`, `padding: 24px`.

#### `.auth-card`

Card de login — `background: var(--bg-elevated)`, `border-radius: var(--radius-lg)`, `padding: 40px`, `max-width: 400px`, `box-shadow: var(--shadow-lg)`.

#### `.auth-error`

Bloco de erro no formulário de auth — fundo `oklch(0.96 0.03 25)` (tom rosado claro), `color: var(--danger)`, borda `1px solid oklch(0.9 0.05 25)`.

---

### Estatísticas

#### `.stat-num`

Número grande de estatística — `font-family: var(--font-display)`, `font-size: 36px`, `font-weight: 400`, `letter-spacing: -0.02em`, `line-height: 1`.

#### `.stat-label`

Rótulo abaixo do número — `font-size: 12px`, `color: var(--text-muted)`, `margin-top: 6px`, minúsculas.

```jsx
<div>
  <div className="stat-num">142</div>
  <div className="stat-label">alunos ativos</div>
</div>
```

---

### Progresso

#### `.progress` / `.progress-fill`

Barra de progresso — container com `height: 6px`, `background: var(--bg-muted)`, `border-radius: 999px`. O `.progress-fill` usa `background: var(--text)` por padrão.

| Modificador | Descrição |
|---|---|
| `.progress-accent` | `.progress-fill` usa `background: var(--accent)` |
| `.progress-thin` | Altura 3px |
| `.progress-thick` | Altura 10px |

```jsx
<div className="progress progress-accent">
  <div className="progress-fill" style={{ width: '65%' }} />
</div>
```

---

### Skeleton (loading)

A classe `.skel` cria um bloco shimmer animado — `background: var(--bg-muted)` com gradiente linear animado via `skel-shimmer`. O componente `<Skel>` em `components/skeleton.tsx` encapsula essa classe.

```jsx
import { Skel, SkelText, SkelCard, SkelCardGrid } from '@/components/skeleton';

// Bloco genérico
<Skel w={200} h={20} radius={6} />

// Linhas de texto
<SkelText lines={3} />

// Card completo
<SkelCard height={200} />
```

---

### Capa de curso

#### `.cover` / `.cover-glyph`

`.cover` é um container com `border-radius: var(--radius-md)`, `overflow: hidden`, `isolation: isolate`. O pseudo-elemento `::after` aplica um gradiente radial e linhas diagonais decorativas. `.cover-glyph` exibe um caractere em fonte display (`clamp(36px, 7vw, 80px)`).

---

### Aulas / Módulos

#### `.lesson-row`

Linha de aula na lista — flex, `padding: 14px 16px`, `border-bottom: 1px solid var(--border)`. Hover: `--bg-hover`. Estado atual (`data-current="true"`): `--accent-soft`.

#### `.lesson-icon`

Ícone circular de 30px. Com `data-done="true"`: fundo `--success`, texto branco. Com `data-current="true"`: fundo `--accent`, texto `--accent-fg`.

#### `.module`

Container do módulo accordion — `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `background: var(--bg-elevated)`, `margin-bottom: 12px`.

#### `.module-head`

Cabeçalho clicável do módulo. Hover: `--bg-hover`.

#### `.module-num`

Número do módulo — `font-family: var(--font-display)`, `font-size: 22px`, `color: var(--text-faint)`.

---

### Heatmap

`.heatmap` usa `grid-template-columns: repeat(12, 1fr)` (12 colunas mensais). Cada `.heatmap-cell` com `data-level` de 1 a 4 recebe intensidade crescente do accent via `color-mix`:

| `data-level` | Cor |
|---|---|
| 0 (sem atributo) | `var(--bg-muted)` |
| 1 | `color-mix(in oklab, var(--accent) 18%, var(--bg-muted))` |
| 2 | `color-mix(in oklab, var(--accent) 40%, var(--bg-muted))` |
| 3 | `color-mix(in oklab, var(--accent) 65%, var(--bg-muted))` |
| 4 | `var(--accent)` |

---

### Indicadores de carregamento

#### `.working-spinner`

Spinner circular de 15px animado com `working-spin` (0.7s linear infinito).

#### `.working-track` / `.working-bar`

Barra de progresso indeterminada — track com `background: color-mix(in oklab, var(--accent) 14%, transparent)`, bar animada com `working-slide` (1.3s).

---

### Animações disponíveis

| Animação | Uso |
|---|---|
| `fadeUp` | Dropdowns (160ms), elementos com `.fade-up` (280ms) |
| `fadeIn` | Backdrop mobile (180ms) |
| `skel-shimmer` | Blocos skeleton (1.4s) |
| `brandReveal` | Logo da sidebar ao alternar (300ms) |
| `working-spin` | Spinner de tarefa em andamento (0.7s) |
| `working-slide` | Barra de progresso indeterminada (1.3s) |
| `celebrate-burst` / `celebrate-badge` | Celebração de aula concluída |

---

### Prosa (Markdown)

#### `.prose-content`

Container de conteúdo renderizado em markdown. Define estilos para `p`, `h1–h3`, `strong`, `em`, `ul`, `ol`, `li`, `code`, `pre`, `img` e `a` (que recebe `color: var(--accent)`). Blocos de código usam `.prose-content pre.code-block` com o botão `.code-copy-btn`.

---

## Regras de uso

1. **Use sempre os tokens — nunca cores hex soltas.** Toda cor deve vir de uma variável CSS (`var(--accent)`, `var(--text-muted)`, etc.). Cores avulsas quebram o suporte a temas.

2. **Reutilize classes existentes antes de criar estilos novos.** Se `.card`, `.btn-soft`, `.chip-success`, `.admin-table` atendem a necessidade, use-os. Crie uma classe nova apenas se não houver equivalente.

3. **Inputs sempre com `--border-strong`.** Campos de formulário usam `border: 1px solid var(--border-strong)` — não `--border` (que é muito sutil).

4. **Respeite claro e escuro.** Não hardcode valores de sombra, cor de fundo ou texto — use os tokens que já se adaptam automaticamente.

5. **Tipografia: sans para UI, display para destaque, mono para código.** Não aplique `font-family` inline; use as classes `.mono` ou `.h1-serif` quando necessário.

6. **Tamanhos de fonte sem classes de heading: use `style={{ fontSize: ... }}`** em px — os tamanhos comuns no projeto são 11px, 11.5px, 12px, 12.5px, 13px, 13.5px, 14px, 14.5px.

7. **Botões destrutivos: use `.btn-danger`.** Não invente cores vermelhas; o token `--danger` já está calibrado para ambos os temas.

8. **Evite `margin` ou `padding` avulsos quando há utilitários.** Use `.mt-*`, `.mb-*`, `.gap-*`, `.row`, `.col` e `.grow` antes de escrever `style={{ marginTop: ... }}`.

9. **Logos por tema: use `.brand-logo-light` / `.brand-logo-dark`.** O CSS cuida de ocultar a variante errada — não duplique essa lógica.

10. **Componentes skeleton: importe de `components/skeleton.tsx`.** Não crie skeletons com cores hardcoded; o `.skel` já usa `--bg-muted` e funciona em ambos os temas.
