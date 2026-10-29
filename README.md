# Momentus Mobile (React Native / Expo) 🚀

Versão multiplataforma oficial do **Momentus** desenvolvida em **React Native com Expo (TypeScript)**, compatível nativamente com **iOS**, **Android** e **Web**.

---

## 📱 Telas Implementadas

1. **🏠 Hoje (`/index`):**
   * Cabeçalho com perfil, avatar, nível do usuário e barra de progresso de XP em tempo real.
   * Cartão de Ofensiva (Streak) com ícone de fogo 🔥, dias consecutivos, frases motivacionais e indicador percentual do dia.
   * Filtros dinâmicos por categoria (Saúde, Trabalho, Estudos, Fitness, Pessoal).
   * Lista interativa de hábitos e rotinas do dia com feedback tátil (`expo-haptics`) e checkbox animado.
   * Botão Flutuante (FAB) e modal para criação rápida de novos hábitos.

2. **📅 Agenda & Calendário (`/calendar`):**
   * Seletor de datas em régua horizontal interativa (Dias da semana e do mês).
   * Visualização dos blocos e eventos agendados para a data selecionada.
   * Indicador de conclusão de tarefas da data.

3. **⏱️ Modo Foco (`/focus`):**
   * Temporizador circular Pomodoro para blocos de foco profundo (15m, 25m, 45m, 60m).
   * Controles de Play/Pause, Reset e progresso percentual.
   * Conclusão de sessão automática com atribuição de XP, moedas e acúmulo no histórico diário.

4. **📑 Templates de Rotina (`/templates`):**
   * Modelos de rotinas completas (*Rotina Matinal Blindada*, *Bloco de Foco Profundo*, *Ritual Noturno Reparador*).
   * Expansão detalhada de cada atividade com tempos e categorias.
   * **Aplicar para Hoje:** Com 1 toque, todas as atividades do modelo são adicionadas à lista do dia.

5. **🏆 Você / Conquistas & Loja (`/achievements`):**
   * Resumo geral do usuário (Nível, XP, Saldo de Moedas 🪙, Melhor Sequência e Total Concluído).
   * Aba de **Conquistas Desbloqueáveis** com barras de progresso (*Primeiro Passo*, *Chama Acesa*, *Semana de Ouro*, *Mente Focada*).
   * Aba de **Loja de Recompensas** (*Market*) para resgate de temas e títulos usando as moedas acumuladas.

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Expo SDK 57](https://expo.dev) + React Native 0.86
* **Linguagem:** 100% TypeScript
* **Roteamento:** Expo Router (File-based navigation com Bottom Tabs nativas)
* **Design & Estilo:** Paleta oficial Momentus (*Deep Navy* `#0F172A`, *Surface* `#1E293B`, *Emerald Neon* `#34D399`)
* **Persistência:** `@react-native-async-storage/async-storage` (Salva hábitos, nível, XP, moedas e conquistas automaticamente no dispositivo)
* **Sensações Táteis:** `expo-haptics`
* **Ícones:** `@expo/vector-icons` (Ionicons)

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos
* Node.js instalado na máquina.
* Smartphone com o app **Expo Go** instalado ([App Store para iOS](https://apps.apple.com/app/expo-go/id982107779) ou [Google Play para Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

### Passos

1. No terminal, acesse a pasta do projeto:
   ```bash
   cd momentus-ext
   ```

2. Inicie o servidor Expo:
   ```bash
   npm start
   ```

3. **Testar no iOS (iPhone / iPad):**
   * Abra o aplicativo da **Câmera** do iPhone e aponte para o QR Code exibido no terminal.
   * Toque no banner amarelo para abrir diretamente no **Expo Go**.

4. **Testar no Android:**
   * Abra o aplicativo **Expo Go** e escaneie o QR Code.

5. **Testar no Navegador Web:**
   * Pressione `w` no terminal para abrir no navegador.
