export interface CommunityTemplateItem {
  id: string;
  title: string;
  description?: string;
  timeStart: string;
  timeEnd: string;
  durationMinutes: number;
  categoryHint: string;
}

export interface CommunityTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  trackId: string;
  trackTitle: string;
  tags: string[];
  items: CommunityTemplateItem[];
}

export interface CommunityTrack {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badgeColor: string;
  templates: CommunityTemplate[];
}

export const COMMUNITY_TRACKS: CommunityTrack[] = [
  {
    id: 'morning_performance',
    title: 'Rotinas Matinais de Alta Performance',
    subtitle: 'Comece o dia com clareza, movimento e energia inabalável',
    icon: 'sunny-outline',
    badgeColor: '#F59E0B',
    templates: [
      {
        id: 'comm-morning-miracle',
        title: 'Manhã Produtiva & Equilíbrio',
        description: 'Sequência clássica inspirada nos maiores realizadores para despertar corpo e mente.',
        icon: 'cafe-outline',
        color: '#F59E0B',
        badge: 'Mais Popular 🔥',
        trackId: 'morning_performance',
        trackTitle: 'Rotinas Matinais de Alta Performance',
        tags: ['Manhã', 'Equilíbrio', 'Energia'],
        items: [
          {
            id: 'cmm-1',
            title: 'Alongamento & Despertar Corporal',
            description: 'Alongamento suave e 500ml de água morna com limão',
            timeStart: '06:30',
            timeEnd: '06:45',
            durationMinutes: 15,
            categoryHint: 'Saúde',
          },
          {
            id: 'cmm-2',
            title: 'Respiração & Atenção Plena',
            description: 'Meditação guiada ou respiração consciente de 10 min',
            timeStart: '06:45',
            timeEnd: '06:55',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'cmm-3',
            title: 'Leitura Focada de Livro',
            description: '10 a 15 páginas de um livro de desenvolvimento ou técnico',
            timeStart: '07:00',
            timeEnd: '07:25',
            durationMinutes: 25,
            categoryHint: 'Estudos',
          },
          {
            id: 'cmm-4',
            title: 'Planejamento das 3 Prioridades do Dia',
            description: 'Definir as 3 metas inegociáveis no Momentus antes de abrir e-mails',
            timeStart: '07:30',
            timeEnd: '07:45',
            durationMinutes: 15,
            categoryHint: 'Trabalho',
          },
        ],
      },
      {
        id: 'comm-morning-express',
        title: 'Despertar Energético Express',
        description: 'Rotina compacta de 30 minutos para dias corridos sem perder o ritmo.',
        icon: 'flash-outline',
        color: '#10B981',
        badge: 'Rápido ⚡',
        trackId: 'morning_performance',
        trackTitle: 'Rotinas Matinais de Alta Performance',
        tags: ['Manhã', 'Rápido', 'Energia'],
        items: [
          {
            id: 'cme-1',
            title: 'Hidratação Imediata & Alongamento',
            description: 'Copo cheio de água e ativação da coluna',
            timeStart: '07:00',
            timeEnd: '07:10',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'cme-2',
            title: 'Exercício Rápido de 7 Minutos',
            description: 'Polichinelos, flexões e agachamentos para oxigenar o cérebro',
            timeStart: '07:10',
            timeEnd: '07:20',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'cme-3',
            title: 'Café & Revisão da Agenda',
            description: 'Verificar compromissos e priorizar a primeira tarefa',
            timeStart: '07:20',
            timeEnd: '07:30',
            durationMinutes: 10,
            categoryHint: 'Trabalho',
          },
        ],
      },
    ],
  },
  {
    id: 'deep_work_study',
    title: 'Estudos & Concursos (Deep Work)',
    subtitle: 'Maximização da retenção com blocos Pomodoro e revisão ativa',
    icon: 'school-outline',
    badgeColor: '#3B82F6',
    templates: [
      {
        id: 'comm-study-pomodoro',
        title: 'Ciclo de Estudo Intenso (50/10)',
        description: 'Dois blocos de foco profundo com descanso ativo para memorização de longo prazo.',
        icon: 'book-outline',
        color: '#3B82F6',
        badge: 'Recomendado ⭐',
        trackId: 'deep_work_study',
        trackTitle: 'Estudos & Concursos (Deep Work)',
        tags: ['Estudos', 'Foco', 'Concursos'],
        items: [
          {
            id: 'csp-1',
            title: 'Bloco 1: Teoria & Leitura Ativa',
            description: '50 minutos de concentração plena com celular em outro cômodo',
            timeStart: '09:00',
            timeEnd: '09:50',
            durationMinutes: 50,
            categoryHint: 'Estudos',
          },
          {
            id: 'csp-2',
            title: 'Pausa Ativa: Água & Movimento',
            description: 'Caminhar, olhar para longe e descansar os olhos sem telas',
            timeStart: '09:50',
            timeEnd: '10:00',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'csp-3',
            title: 'Bloco 2: Resolução de Questões',
            description: 'Aplicação prática e anotação dos pontos de dúvida',
            timeStart: '10:00',
            timeEnd: '10:50',
            durationMinutes: 50,
            categoryHint: 'Estudos',
          },
          {
            id: 'csp-4',
            title: 'Revisão Espaçada (Flashcards)',
            description: 'Revisão rápida dos conceitos errados nas questões',
            timeStart: '11:00',
            timeEnd: '11:20',
            durationMinutes: 20,
            categoryHint: 'Estudos',
          },
        ],
      },
      {
        id: 'comm-exam-sprint',
        title: 'Sprint de Resolução & Simulado',
        description: 'Treino de velocidade e assertividade para provas e exames.',
        icon: 'trophy-outline',
        color: '#6366F1',
        badge: 'Desafio 🎯',
        trackId: 'deep_work_study',
        trackTitle: 'Estudos & Concursos (Deep Work)',
        tags: ['Estudos', 'Simulado', 'Concursos'],
        items: [
          {
            id: 'ces-1',
            title: 'Preparação do Ambiente & Cronômetro',
            description: 'Separação do caderno de questões e eliminação de ruídos',
            timeStart: '14:00',
            timeEnd: '14:15',
            durationMinutes: 15,
            categoryHint: 'Estudos',
          },
          {
            id: 'ces-2',
            title: 'Bateria de 30 Questões Ininterruptas',
            description: 'Simulação real com tempo controlado sem consultas',
            timeStart: '14:15',
            timeEnd: '15:15',
            durationMinutes: 60,
            categoryHint: 'Estudos',
          },
          {
            id: 'ces-3',
            title: 'Gabarito Comentado & Caderno de Erros',
            description: 'Entender a razão de cada erro para blindar o conhecimento',
            timeStart: '15:20',
            timeEnd: '15:50',
            durationMinutes: 30,
            categoryHint: 'Estudos',
          },
        ],
      },
    ],
  },
  {
    id: 'health_wellness',
    title: 'Saúde, Movimento & Bem-Estar',
    subtitle: 'Consistência física diária para disposição, postura e longevidade',
    icon: 'fitness-outline',
    badgeColor: '#10B981',
    templates: [
      {
        id: 'comm-daily-fitness',
        title: 'Vitalidade & Força Diária',
        description: 'Rotina de treino e recuperação para manter a saúde e postura em dia.',
        icon: 'barbell-outline',
        color: '#10B981',
        badge: 'Essencial 💪',
        trackId: 'health_wellness',
        trackTitle: 'Saúde, Movimento & Bem-Estar',
        tags: ['Saúde', 'Treino', 'Corpo'],
        items: [
          {
            id: 'cdf-1',
            title: 'Aquecimento Articular & Mobilidade',
            description: 'Mobilidade de ombros, quadril e tornozelos',
            timeStart: '18:00',
            timeEnd: '18:10',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'cdf-2',
            title: 'Sessão de Treino Funcional / Musculação',
            description: 'Exercícios compostos com intensidade controlada',
            timeStart: '18:10',
            timeEnd: '18:50',
            durationMinutes: 40,
            categoryHint: 'Saúde',
          },
          {
            id: 'cdf-3',
            title: 'Desaquecimento & Caminhada Leve',
            description: 'Normalização dos batimentos e relaxamento muscular',
            timeStart: '18:50',
            timeEnd: '19:05',
            durationMinutes: 15,
            categoryHint: 'Saúde',
          },
          {
            id: 'cdf-4',
            title: 'Refeição Pós-Treino & Hidratação',
            description: 'Nutrientes de qualidade para reconstrução muscular',
            timeStart: '19:15',
            timeEnd: '19:40',
            durationMinutes: 25,
            categoryHint: 'Saúde',
          },
        ],
      },
      {
        id: 'comm-posture-break',
        title: 'Pausa Ativa no Trabalho',
        description: 'Combate o sedentarismo e dores nas costas com pequenas pausas ergonômicas.',
        icon: 'walk-outline',
        color: '#06B6D4',
        badge: 'Ergonomia 🧘',
        trackId: 'health_wellness',
        trackTitle: 'Saúde, Movimento & Bem-Estar',
        tags: ['Saúde', 'Trabalho', 'Postura'],
        items: [
          {
            id: 'cpb-1',
            title: 'Alongamento de Pescoço & Coluna',
            description: 'Descompressão cervical e rotação torácica',
            timeStart: '15:00',
            timeEnd: '15:08',
            durationMinutes: 8,
            categoryHint: 'Saúde',
          },
          {
            id: 'cpb-2',
            title: 'Caminhada & 500ml de Água',
            description: 'Levantar da cadeira e movimentar as pernas',
            timeStart: '15:08',
            timeEnd: '15:15',
            durationMinutes: 7,
            categoryHint: 'Saúde',
          },
        ],
      },
    ],
  },
  {
    id: 'evening_sleep',
    title: 'Higiene do Sono & Desaceleração',
    subtitle: 'Prepare seu corpo e mente para um sono reparador de alta qualidade',
    icon: 'moon-outline',
    badgeColor: '#8B5CF6',
    templates: [
      {
        id: 'comm-sleep-hygiene',
        title: 'Desconexão Noturna & Relaxamento',
        description: 'Redução progressiva de estímulos visuais e mentais para induzir o sono profundo.',
        icon: 'bed-outline',
        color: '#8B5CF6',
        badge: 'Sono Reparador 🌙',
        trackId: 'evening_sleep',
        trackTitle: 'Higiene do Sono & Desaceleração',
        tags: ['Noite', 'Sono', 'Desaceleração'],
        items: [
          {
            id: 'csh-1',
            title: 'Desligar Telas & Luzes Fortes',
            description: 'Colocar o celular no modo não perturbe e reduzir iluminação',
            timeStart: '21:30',
            timeEnd: '21:40',
            durationMinutes: 10,
            categoryHint: 'Saúde',
          },
          {
            id: 'csh-2',
            title: 'Chá Relaxante & Respiração',
            description: 'Camomila, melissa ou erva-doce sem cafeína',
            timeStart: '21:40',
            timeEnd: '21:55',
            durationMinutes: 15,
            categoryHint: 'Saúde',
          },
          {
            id: 'csh-3',
            title: 'Leitura Acolhedora na Cama',
            description: 'Ficção ou literatura relaxante com luz âmbar',
            timeStart: '22:00',
            timeEnd: '22:25',
            durationMinutes: 25,
            categoryHint: 'Outros',
          },
          {
            id: 'csh-4',
            title: 'Reflexão de Gratidão & Apagar Luzes',
            description: 'Reconhecer 3 coisas boas do dia e deitar para dormir',
            timeStart: '22:25',
            timeEnd: '22:30',
            durationMinutes: 5,
            categoryHint: 'Outros',
          },
        ],
      },
      {
        id: 'comm-tomorrow-prep',
        title: 'Organização do Amanhã',
        description: 'Elimine a ansiedade noturna deixando o dia seguinte pronto com antecedência.',
        icon: 'checkbox-outline',
        color: '#64748B',
        badge: 'Anti-Ansiedade 🛡️',
        trackId: 'evening_sleep',
        trackTitle: 'Higiene do Sono & Desaceleração',
        tags: ['Noite', 'Organização', 'Planejamento'],
        items: [
          {
            id: 'ctp-1',
            title: 'Organizar Roupas & Mochila do Dia Seguinte',
            description: 'Deixar tudo visível para não perder tempo ao acordar',
            timeStart: '21:00',
            timeEnd: '21:15',
            durationMinutes: 15,
            categoryHint: 'Outros',
          },
          {
            id: 'ctp-2',
            title: 'Revisão Rápida da Agenda & Pendências',
            description: 'Garantir que os horários do dia seguinte estão ajustados no Momentus',
            timeStart: '21:15',
            timeEnd: '21:25',
            durationMinutes: 10,
            categoryHint: 'Trabalho',
          },
        ],
      },
    ],
  },
  {
    id: 'work_productivity',
    title: 'Produtividade & Trabalho Ágil',
    subtitle: 'Estruture seu dia de trabalho com foco, prioridades claras e sem sobrecarga',
    icon: 'briefcase-outline',
    badgeColor: '#06B6D4',
    templates: [
      {
        id: 'comm-work-ritual',
        title: 'Início Imbatível de Expediente',
        description: 'Vença a procrastinação iniciando pelas tarefas mais valiosas do seu dia.',
        icon: 'rocket-outline',
        color: '#06B6D4',
        badge: 'Alto Impacto 🚀',
        trackId: 'work_productivity',
        trackTitle: 'Produtividade & Trabalho Ágil',
        tags: ['Trabalho', 'Produtividade', 'Foco'],
        items: [
          {
            id: 'cwr-1',
            title: 'Inbox Zero & Triagem Rápida',
            description: 'Limpeza de mensagens e respostas que tomam menos de 2 minutos',
            timeStart: '08:30',
            timeEnd: '08:50',
            durationMinutes: 20,
            categoryHint: 'Trabalho',
          },
          {
            id: 'cwr-2',
            title: 'Definição da Meta Master do Dia',
            description: 'A única coisa que fará o dia valer a pena se for concluída',
            timeStart: '08:50',
            timeEnd: '09:00',
            durationMinutes: 10,
            categoryHint: 'Trabalho',
          },
          {
            id: 'cwr-3',
            title: 'Bloco de Ouro: Foco Ininterrupto',
            description: '45 minutos de execução pura na tarefa mais importante',
            timeStart: '09:00',
            timeEnd: '09:45',
            durationMinutes: 45,
            categoryHint: 'Trabalho',
          },
        ],
      },
    ],
  },
];
