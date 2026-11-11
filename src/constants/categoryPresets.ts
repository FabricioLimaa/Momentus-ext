import { Ionicons } from '@expo/vector-icons';

export interface CategoryColorItem {
  id: string;
  color: string;
  name: string;
  isNeon?: boolean;
}

/**
 * Paleta de cores para Categorias:
 * Combina as 11 cores oficiais do Google Calendar com tons Neon modernos e vibrantes
 */
export const EXTENDED_CATEGORY_COLORS: CategoryColorItem[] = [
  // Cores Oficiais Google Calendar
  { id: 'gc-1', color: '#7986CB', name: 'Lavanda' },
  { id: 'gc-2', color: '#33B679', name: 'Sálvia' },
  { id: 'gc-3', color: '#8E24AA', name: 'Uva' },
  { id: 'gc-4', color: '#E67C73', name: 'Flamingo' },
  { id: 'gc-5', color: '#F6BF26', name: 'Banana' },
  { id: 'gc-6', color: '#F4511E', name: 'Tangerina' },
  { id: 'gc-7', color: '#039BE5', name: 'Pavão' },
  { id: 'gc-8', color: '#616161', name: 'Grafite' },
  { id: 'gc-9', color: '#3F51B5', name: 'Mirtilo' },
  { id: 'gc-10', color: '#0B8043', name: 'Manjericão' },
  { id: 'gc-11', color: '#D50000', name: 'Tomate' },

  // Tons Neon Vibrantes de Alto Impacto
  { id: 'neon-1', color: '#10B981', name: 'Esmeralda Neon', isNeon: true },
  { id: 'neon-2', color: '#06B6D4', name: 'Ciano Elétrico', isNeon: true },
  { id: 'neon-3', color: '#8B5CF6', name: 'Violeta Neon', isNeon: true },
  { id: 'neon-4', color: '#F59E0B', name: 'Âmbar Radiante', isNeon: true },
  { id: 'neon-5', color: '#EC4899', name: 'Pink Neon', isNeon: true },
  { id: 'neon-6', color: '#3B82F6', name: 'Azul Real', isNeon: true },
  { id: 'neon-7', color: '#14B8A6', name: 'Menta Fresca', isNeon: true },
  { id: 'neon-8', color: '#F97316', name: 'Laranja Solar', isNeon: true },
];

/**
 * Catálogo Curado de Ícones Universais para Categorias
 * Baseado no conjunto universal Ionicons
 */
export const CATEGORY_ICONS: Array<{
  name: keyof typeof Ionicons.glyphMap;
  label: string;
}> = [
  // Trabalho & Carreira
  { name: 'briefcase', label: 'Trabalho' },
  { name: 'laptop', label: 'Tecnologia' },
  { name: 'code-slash', label: 'Código' },
  { name: 'business', label: 'Negócios' },

  // Estudos & Conhecimento
  { name: 'book', label: 'Leitura' },
  { name: 'school', label: 'Estudos' },
  { name: 'bulb', label: 'Ideias' },
  { name: 'pencil', label: 'Escrita' },

  // Saúde & Corpo
  { name: 'fitness', label: 'Treino' },
  { name: 'barbell', label: 'Musculação' },
  { name: 'bicycle', label: 'Ciclismo' },
  { name: 'walk', label: 'Caminhada' },
  { name: 'heart', label: 'Saúde' },
  { name: 'medkit', label: 'Medicina' },

  // Foco & Produtividade
  { name: 'time', label: 'Tempo' },
  { name: 'timer', label: 'Foco' },
  { name: 'flame', label: 'Hábito' },
  { name: 'checkmark-done', label: 'Tarefas' },

  // Finanças
  { name: 'wallet', label: 'Finanças' },
  { name: 'cash', label: 'Dinheiro' },
  { name: 'trending-up', label: 'Investimentos' },
  { name: 'cart', label: 'Compras' },

  // Vida Pessoal & Casa
  { name: 'home', label: 'Casa' },
  { name: 'bed', label: 'Descanso' },
  { name: 'restaurant', label: 'Alimentação' },
  { name: 'cafe', label: 'Pausa' },

  // Lazer & Criatividade
  { name: 'game-controller', label: 'Jogos' },
  { name: 'musical-notes', label: 'Música' },
  { name: 'headset', label: 'Áudio' },
  { name: 'camera', label: 'Foto' },
  { name: 'film', label: 'Filmes' },
  { name: 'brush', label: 'Arte' },

  // Mente & Espiritualidade
  { name: 'sparkles', label: 'Brilho' },
  { name: 'leaf', label: 'Natureza' },
  { name: 'sunny', label: 'Manhã' },
  { name: 'moon', label: 'Noite' },
  { name: 'flower', label: 'Cuidado' },

  // Social & Reconhecimento
  { name: 'people', label: 'Social' },
  { name: 'chatbubbles', label: 'Diálogo' },
  { name: 'trophy', label: 'Meta' },
  { name: 'star', label: 'Favorito' },
  { name: 'folder', label: 'Geral' },
];
