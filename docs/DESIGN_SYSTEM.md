# 📐 Momentus UI/UX Design System (8pt Grid & Despoluição Zen)

Este documento define as diretrizes visuais e normativas oficiais de engenharia de interface do **Momentus**, aplicadas em 100% dos componentes, telas, modais e fluxos do aplicativo.

---

## 1. Princípios Fundamentais

1. **Previsibilidade Matemática:** Não se inventa espaçamento ou dimensões no olho ou de forma arbitrária. Toda e qualquer decisão espacial deriva da escala dos **múltiplos de 8** (`Space`: 4, 8, 12, 16, 24, 32, 40, 48, 64px).
2. **Despoluição Zen:** O design deve respirar. Redundâncias visuais (como barras de busca em listas curtas, pílulas duplicadas de navegação e divisores desnecessários) são eliminadas para dar lugar a foco, clareza e hierarquia limpa.
3. **Proximidade & Gestalt (Proporção 1:3):** Espaçamentos menores dentro do mesmo bloco comunicam relacionamento íntimo (ex: 4–8px entre label e input); espaçamentos médios separam grupos funcionais (16–24px); respiros amplos separam grandes seções (32–48px). A distância física organiza a tela sem depender de linhas e bordas.
4. **Ergonomia Móvel (Polegar & Touch Targets):** Todo elemento interativo deve respeitar a área mínima de toque de **48x48px** recomendada por Apple HIG e Google Material Design (`ComponentHeightTokens.iconButton` ou `HitSlop.toTarget(visualSize)`).
5. **Legibilidade Acessível:** Tamanhos de fonte inferiores a 11px são terminantemente proibidos no aplicativo.

---

## 2. Escala Linear (`Space`) & Tokens de Espaçamento (`SpacingTokens`)

Importação: `import { Space, SpacingTokens } from '@/constants/theme';`

```ts
export const Space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 64,
} as const;
```

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

## 3. Tokens Semânticos e Responsivos (`Layout` & `useLayoutTokens`)

Importação: `import { Layout, useLayoutTokens } from '@/constants/theme';`

```ts
export const Layout = {
  page:     { phone: Space[4], tablet: Space[5] }, // 16px → 24px
  cardGap:  { phone: Space[4], tablet: Space[5] }, // 16px → 24px
  section:  { phone: Space[6], tablet: Space[8] }, // 32px → 48px
  field:    Space[2], // label ↔ input = 8px
  fieldGroup: Space[5], // entre campos = 24px
  inline:   Space[2], // ícone ↔ texto / botão ↔ botão = 8px
} as const;
```

---

## 4. Alturas Canônicas de Componentes (`ComponentHeightTokens`)

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

## 5. Tamanhos Canônicos de Ícones (`IconSize`)

Importação: `import { IconSize } from '@/constants/theme';`

| Token | Tamanho (px) | Uso |
|---|---|---|
| `xs` | **12px** | Micro-indicadores e setas internas de badges. |
| `sm` | **16px** | Ícones de suporte em inputs e legendas. |
| `md` | **20px** | Padrão da interface (botões, listas, cards). |
| `lg` | **24px** | Ações de destaque e navegação principal. |
| `xl` | **32px** | Cabeçalhos e seções de configurações. |
| `hero` | **48px** | Ícones de destaque hero em modais e cards vazios. |
| `illustration`| **64px** | Ilustrações principais de onboarding e celebração. |

---

## 6. Helper de Área de Toque (`HitSlop`)

Importação: `import { HitSlop } from '@/constants/theme';`

Garante que botões com altura visual inferior a 48px atinjam os 48x48px táteis recomendados por Apple e Google:

```tsx
<TouchableOpacity
  style={{ width: 32, height: 32 }}
  hitSlop={HitSlop.toTarget(32)}>
  <Ionicons name="close" size={IconSize.md} />
</TouchableOpacity>
```

---

## 7. Variantes de Card (`GlassCard`)

Importação: `import { GlassCard } from '@/components/momentus/GlassCard';`

| Variante | Padding | Onde Usar |
|---|---|---|
| `compact` | **16px** (`SpacingTokens.md`) | Cards densos de lista, itens de hábitos, KPIs do `stats`. |
| `default` | **24px** (`SpacingTokens.lg`) | Cards padrão, acordeões do `settings`, cards do `templates`. |
| `spacious` | **32px** (`SpacingTokens.xl`) | Card Hero de streak, hero de perfil do `more`, cards de celebração. |
| `none` | **0px** | Quando o conteúdo interno comanda seus próprios paddings customizados. |

Exemplo:
```tsx
<GlassCard variant="compact">
  <Text>KPI Compacto</Text>
</GlassCard>
```

---

## 8. Casca Padrão de Modais (`ModalShell`)

Importação: `import { ModalShell } from '@/components/momentus/ModalShell';`

Aplica automaticamente as relações espaciais de modais Zen:
- Padding do modal: **24px**
- Título ↔ Descrição: **8px**
- Cabeçalho ↔ Conteúdo: **24px**
- Conteúdo ↔ Ações: **32px**
- Botões de Ação: **48px / 56px** com gap de **8px / 16px**

```tsx
<ModalShell
  visible={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título do Diálogo"
  description="Subtítulo informativo"
  icon="sparkles"
  actions={
    <TouchableOpacity style={styles.confirmBtn}>
      <Text>Confirmar</Text>
    </TouchableOpacity>
  }>
  <Text>Conteúdo interno...</Text>
</ModalShell>
```

---

## 9. Ferramenta de Auditoria Automatizada

O projeto conta com um script nativo de verificação estática que inspeciona todos os arquivos `.tsx` e `.ts` em busca de números soltos fora do grid:

```bash
# Executa a auditoria em src/app e src/components
npm run lint:design
```

Ou diretamente:
```bash
node scripts/audit-design.js
```
