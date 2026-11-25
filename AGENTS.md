This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Informações Oficiais do Projeto & Marca (Institucional)

Em todas as telas, documentações, modais, termos, layouts e metadados do projeto, utilize estritamente as informações oficiais:

- **Nome do App:** Momentus
- **Desenvolvido por:** Fabricio Lima
- **E-mail Oficial:** contato@momentus.app.br
- **Site Oficial:** https://www.momentus.app.br/
- **Acesso Web:** https://app.momentus.app.br/
- **Domínios Oficiais:**
  - Principal / Landing: `www.momentus.app.br` / `momentus.app.br`
  - Aplicação Web / SPA: `app.momentus.app.br`
- **Single Source of Truth no Código:** `src/constants/appInfo.ts` (`APP_INFO`)

## Arquitetura Multi-Repositório & Hospedagem (Vercel & DNS)

O ecossistema web do Momentus é estruturado em **2 repositórios independentes na Vercel**:

1. **Repositório 1: Site de Apresentação (Landing Page Institucional)**
   - **Domínios no projeto Vercel:** `momentus.app.br` e `www.momentus.app.br`
   - **Objetivo:** Vitrine de apresentação, conversão, marketing e links institucionais.
   - **Integração:** Botão de login / "Acessar App" direciona para `https://app.momentus.app.br/`.
   - **Contato:** Exibe `contato@momentus.app.br`.

2. **Repositório 2: App Web / SPA (Este Repositório `Momentus-ext`)**
   - **Domínio no projeto Vercel:** `app.momentus.app.br` (exclusivo para este projeto).
   - **Objetivo:** Aplicação completa em React Native / Expo Web, rotas autenticadas, dados sincronizados com Firebase e modo offline.
   - **Integração:** Rodapés, termos e créditos referenciam o site institucional `https://www.momentus.app.br/` via `APP_INFO.website`.

3. **Infraestrutura de DNS & E-mail:**
   - **Provedor de Domínio:** Registro.br (delegado para servidores Vercel: `ns1.vercel-dns.com` e `ns2.vercel-dns.com`).
   - **E-mails Profissionais:** Zoho Mail (registros MX, TXT/SPF e DMARC configurados diretamente na zona DNS global da conta Vercel).
   - **Autenticação:** Firebase Auth possui `momentus.app.br` e `app.momentus.app.br` na lista de Authorized Domains.

## UI/UX Design System & Grade de 8 Pontos (Obrigatório)

O Momentus utiliza estritamente o sistema **8pt Grid** e princípios de **Despoluição Zen** em 100% de suas telas e componentes. Ao criar ou refatorar qualquer interface:

1. **Espaçamento Canônico:** Utilize apenas os tokens `Space` / `SpacingTokens` e `LayoutTokens` de `@/constants/theme` (escala 4, 8, 12, 16, 24, 32, 40, 48, 64). É estritamente proibido o uso de números literais soltos ("magic numbers") em `padding`, `margin` e `gap`.
2. **Proximidade & Gestalt (Proporção 1:3):** Espaçamentos menores dentro do mesmo bloco/grupo (4–8px entre label e input, título e descrição), espaçamentos médios entre grupos funcionais (16–24px) e respiros amplos entre seções (32–48px). A distância visual deve comunicar agrupamento sem depender de divisores arbitrários.
3. **Superfícies & Containers:** Utilize `GlassCard` com variantes canônicas (`compact`: 16px, `default`: 24px, `spacious`: 32px) ou `BorderRadiusTokens.card` (16px) e `cardHero` (24px).
4. **Ergonomia & Alturas de Ação:**
   - Chips / Pílulas: 32px / 40px (`ComponentHeightTokens.chip` / `chipLarge`).
   - Ações secundárias / botões compactos: 40px (`ComponentHeightTokens.buttonCompact`).
   - Inputs e Ações padrão: 48px (`ComponentHeightTokens.input` / `buttonModal`).
   - Destaque Hero / Login / FAB: 56px (`ComponentHeightTokens.buttonHero` / `inputHero` / `fab`).
   - Área de toque mínima: todo elemento interativo deve ter no mínimo 48x48px (`ComponentHeightTokens.iconButton` ou `HitSlop.toTarget(visualSize)`).
5. **Modais e Diálogos:** Utilize preferencialmente `ModalShell` (padding 24px, título↔descrição 8px, form↔ações 24/32px, botões 48px/56px).
6. **Tipografia, Ícones & Raios:** Utilize estritamente `TypographyTokens`, `IconSize` (12, 16, 20, 24, 32, 48) e `BorderRadiusTokens`. Tamanhos de fonte inferiores a 11px são proibidos para garantir acessibilidade visual.
7. **Auditoria Contínua:** Execute sempre `npm run lint:design` antes de concluir tarefas de interface.

## Atualização Contínua da Tela de Novidades (`src/app/updates.tsx`) (Obrigatório)

Sempre que implementar uma nova funcionalidade, melhoria visual/UX, recurso de segurança ou correção relevante visível ao usuário:

1. **Atualize `CHANGELOG_DATA`** na versão atual (`isCurrent: true`) em `src/app/updates.tsx`, adicionando ou refinando o `UpdateItem` correspondente com `id` único, `icon` (Ionicons), `tag` adequada (`NOVO` | `MELHORIA` | `DESIGN` | `SEGURANCA` | `CORRECAO`), `title`, `description` concisa e `actionRoute` / `actionLabel` quando aplicável.
2. **Mantenha `highlights` e `handleShareUpdates`** coerentes com os principais destaques atuais da versão.
3. **Preserve o estilo Zen:** descrições diretas e claras, sem inflar a tela com entradas técnicas internas (refatorações puras de código, lint ou ajustes de CI não entram na tela de novidades).

## Fluxo Git: Commit Descritivo & Push Automático (Obrigatório)

Ao concluir qualquer tarefa que modifique código, configuração ou assets do projeto:

1. **Validação prévia obrigatória:** Execute sempre `npx tsc --noEmit`, `npx expo lint` (e `npm run lint:design` quando houver mudanças de UI) antes de commitar.
2. **Commit descritivo:** Faça `git add` apenas dos arquivos relacionados à entrega e crie um commit em estilo Conventional Commits com **título objetivo + corpo detalhado em tópicos** resumindo todas as modificações feitas por módulo/arquivo.
3. **Push automático:** Logo após o commit bem-sucedido, execute `git push origin main` (ou na branch ativa) sem aguardar solicitação extra, informando o hash do commit publicado na resposta final.
4. **Exceção de segurança:** Nunca faça push se houver falha de build/typecheck/lint, conflito de merge ou arquivos sensíveis (`.env`, chaves privadas) no stage.


