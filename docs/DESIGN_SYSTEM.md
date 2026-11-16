# 📐 Momentus UI/UX Design System (8pt Grid & Despoluição Zen)

Este documento define as diretrizes visuais e normativas oficiais de engenharia de interface do **Momentus**, aplicadas em 100% dos componentes, telas, modais e fluxos do aplicativo.

---

## 1. Princípios Fundamentais

1. **Previsibilidade Matemática:** Não se inventa espaçamento ou dimensões no olho ou de forma arbitrária. Toda e qualquer decisão espacial deriva da escala dos **múltiplos de 8** (com meio-passo de 4px para microalinhamentos ópticos).
2. **Despoluição Zen:** O design deve respirar. Redundâncias visuais (como barras de busca em listas curtas, pílulas duplicadas de navegação e divisores desnecessários) são eliminadas para dar lugar a foco, clareza e hierarquia limpa.
3. **Proximidade & Gestalt (Proporção 1:3):** Espaçamentos menores dentro do mesmo bloco comunicam relacionamento íntimo (ex: 4–8px entre label e input); espaçamentos médios separam grupos funcionais (16–24px); respiros amplos separam grandes seções (32–48px). A distância física organiza a tela sem depender de linhas e bordas.
4. **Ergonomia Móvel (Polegar & Touch Targets):** Todo elemento interativo deve respeitar a área mínima de toque de **48x48px** recomendada por Apple HIG e Google Material Design (`ComponentHeightTokens.iconButton`).

---

## 2. Tokens de Espaçamento Canônico (`SpacingTokens`)

Importação: `import { SpacingTokens } from '@/constants/theme';`

| Token | Valor (px) | Multiplicador | Uso Recomendado |
|---|---|---|---|
| `xs` | **4px** | 0.5× | Meio-passo óptico: micro-ajustes entre ícone e texto, badges internas. |
| `sm` | **8px** | 1× | Relação íntima: distância entre label e input, título e descrição. |
| `md` | **16px** | 2× | Padrão: distância entre cards irmãos e padding interno padrão. |
| `lg` | **24px** | 3× | Separação entre grupos de campos, padding de modais e hero cards. |
| `xl` | **32px** | 4× | Distância entre blocos maiores e seções de página. |
| `xxl` | **40px** | 5× | Respiro amplo entre grandes conjuntos. |
| `'2xl'` | **48px** | 6× | Separação entre grandes áreas funcionais; touch target de acessibilidade. |
| `'3xl'` | **64px** | 8× | Respiro visual profundo e padding de final de página. |
| `section` | **32px** | 4× | Espaçamento canônico entre seções de conteúdo. |

> ⚠️ **Regra Estrita:** É proibido utilizar números literais arbitrários ("magic numbers" como 5, 7, 9, 11, 13, 15, 17, 19, 21...) em `padding`, `margin` e `gap`.

---

## 3. Alturas Canônicas de Componentes (`ComponentHeightTokens`)

Importação: `import { ComponentHeightTokens } from '@/constants/theme';`

| Token | Altura (px) | Multiplicador | Componentes |
|---|---|---|---|
| `chip` | **32px** | 4× | Chips compactos, tags de categoria, filtros rápidos. |
| `chipLarge` | **40px** | 5× | Chips de seleção proeminentes, presets Pomodoro. |
| `buttonCompact` | **40px** | 5× | Botões secundários compactos, seletores de aba. |
| `iconButton` | **48px** | 6× | Área de toque mínima de botões de ícone (48x48px). |
| `input` | **48px** | 6× | Inputs padrão de formulários e caixas de texto. |
| `buttonModal` | **48px** | 6× | Botões de ação em diálogos e modais. |
| `inputHero` | **56px** | 7× | Inputs de autenticação e destaque (Login / Cadastro). |
| `buttonHero` | **56px** | 7× | Botões Primários / Hero CTA / Social Auth (Google/Apple). |
| `fab` | **56px** | 7× | Botão de Ação Flutuante principal (+ Criar Hábito). |

---

## 4. Raios de Borda Harmônicos (`BorderRadiusTokens`)

Importação: `import { BorderRadiusTokens } from '@/constants/theme';`

| Token | Raio (px) | Elemento |
|---|---|---|
| `xs` | **4px** | Micro-detalhes, pequenas tags, barras de progresso finas. |
| `sm` | **8px** | Badges, pílulas pequenas, tags de categorias. |
| `control` | **12px** | Chips médios, caixas informativas internas. |
| `input` | **16px** | Inputs de texto e campos de formulário. |
| `button` | **16px** | Botões primários, secundários e hero. |
| `card` | **16px** | Cards padrão da interface e listas (`GlassCard`). |
| `cardHero` | **24px** | Cartões de destaque (Streak, Perfil, Estatísticas Hero). |
| `modal` | **24px** | Modais flutuantes, diálogos de confirmação e alertas. |
| `modalLarge` | **32px** | Bottom sheets de tela cheia no tablet e desktop. |
| `pill` | **9999px** | Formato de cápsula / pílula perfeita. |

---

## 5. Larguras e Limites de Layout (`LayoutTokens`)

Importação: `import { LayoutTokens } from '@/constants/theme';`

- `maxContentWidth`: **680px** (Largura máxima padrão de telas de conteúdo no desktop).
- `maxFocusWidth`: **544px** (Largura máxima para leitura e Modo Foco imersivo).
- `maxAuthWidth`: **440px** (Largura máxima para login, cadastro e recuperação de senha).
- `maxDialogWidth`: **416px** (Largura máxima de diálogos flutuantes centrais).
- `pagePaddingHorizontal`: **16px** (Padding horizontal móvel padrão).
- `pagePaddingTop`: **16px** (Padding vertical de topo padrão).

---

## 6. Modais e Diálogos Zen

1. **Padding Interno:** Estritamente **24px** (`SpacingTokens.lg`).
2. **Proporção Vertical:**
   - Ícone ou TopBar para Título: **16px** (`SpacingTokens.md`).
   - Título para Descrição: **8px** (`SpacingTokens.sm`).
   - Descrição para Conteúdo / Form: **24px** (`SpacingTokens.lg`).
   - Conteúdo para Ações: **24px** ou **32px** (`SpacingTokens.lg` / `xl`).
3. **Botões de Ação:** Altura de **48px** (`buttonModal`) ou **56px** (`buttonHero`) com gap de **8px** ou **16px**.

---

## 7. Ferramenta de Auditoria Automatizada

O projeto conta com um script nativo de verificação estática que inspeciona todos os arquivos `.tsx` e `.ts` em busca de números soltos fora do grid:

```bash
# Executa a auditoria em src/app e src/components
npm run lint:design
```

Ou diretamente:
```bash
node scripts/audit-design.js
```
