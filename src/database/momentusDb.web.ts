import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Category,
  HabitItem,
  RoutineTemplate,
  Achievement,
  MarketItem,
} from '@/types';

/**
 * Implementação Web para o módulo de banco de dados do Momentus.
 * No navegador (Web), persiste os dados de forma confiável via AsyncStorage (localStorage),
 * permitindo que aceite de termos, rotinas, categorias, templates e configurações persistam
 * entre reloads (F5).
 */

const KEY_CATEGORIES = '@momentus_categories';
const KEY_HABITS = '@momentus_habits';
const KEY_TEMPLATES = '@momentus_templates';
const KEY_ACHIEVEMENTS = '@momentus_achievements';
const KEY_MARKET = '@momentus_market_items';
const PREFIX_KV = '@momentus_kv_';

export async function getDatabase(): Promise<null> {
  return null;
}

export async function getAllCategories(): Promise<Category[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_CATEGORIES);
    return raw ? (JSON.parse(raw) as Category[]) : [];
  } catch {
    return [];
  }
}

export async function upsertCategoryDb(category: Category): Promise<void> {
  try {
    const current = await getAllCategories();
    const idx = current.findIndex((c) => c.id === category.id);
    let next: Category[];
    if (idx >= 0) {
      next = current.map((c) => (c.id === category.id ? category : c));
    } else {
      next = [...current, category];
    }
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao salvar categoria no web:', e);
  }
}

export async function deleteCategoryDb(id: string): Promise<void> {
  try {
    const current = await getAllCategories();
    const next = current.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao deletar categoria no web:', e);
  }
}

export async function setAllCategoriesDb(categories: Category[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.warn('Erro ao salvar categorias no web:', e);
  }
}

export async function getAllHabits(): Promise<HabitItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_HABITS);
    return raw ? (JSON.parse(raw) as HabitItem[]) : [];
  } catch {
    return [];
  }
}

export async function upsertHabitDb(habit: HabitItem): Promise<void> {
  try {
    const current = await getAllHabits();
    const idx = current.findIndex((h) => h.id === habit.id);
    let next: HabitItem[];
    if (idx >= 0) {
      next = current.map((h) => (h.id === habit.id ? habit : h));
    } else {
      next = [...current, habit];
    }
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao salvar hábito no web:', e);
  }
}

export async function deleteHabitDb(id: string): Promise<void> {
  try {
    const current = await getAllHabits();
    const next = current.filter((h) => h.id !== id);
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao deletar hábito no web:', e);
  }
}

export async function deleteMultipleHabitsDb(ids: string[]): Promise<void> {
  try {
    const idSet = new Set(ids);
    const current = await getAllHabits();
    const next = current.filter((h) => !idSet.has(h.id));
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao deletar múltiplos hábitos no web:', e);
  }
}

export async function setAllHabitsDb(habits: HabitItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(habits));
  } catch (e) {
    console.warn('Erro ao salvar hábitos no web:', e);
  }
}

export async function getAllTemplates(): Promise<RoutineTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_TEMPLATES);
    return raw ? (JSON.parse(raw) as RoutineTemplate[]) : [];
  } catch {
    return [];
  }
}

export async function upsertTemplateDb(template: RoutineTemplate): Promise<void> {
  try {
    const current = await getAllTemplates();
    const idx = current.findIndex((t) => t.id === template.id);
    let next: RoutineTemplate[];
    if (idx >= 0) {
      next = current.map((t) => (t.id === template.id ? template : t));
    } else {
      next = [...current, template];
    }
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao salvar template no web:', e);
  }
}

export async function deleteTemplateDb(id: string): Promise<void> {
  try {
    const current = await getAllTemplates();
    const next = current.filter((t) => t.id !== id);
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(next));
  } catch (e) {
    console.warn('Erro ao deletar template no web:', e);
  }
}

export async function setAllTemplatesDb(templates: RoutineTemplate[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(templates));
  } catch (e) {
    console.warn('Erro ao salvar templates no web:', e);
  }
}

export async function getAllAchievements(): Promise<Achievement[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_ACHIEVEMENTS);
    return raw ? (JSON.parse(raw) as Achievement[]) : [];
  } catch {
    return [];
  }
}

export async function setAllAchievementsDb(achievements: Achievement[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (e) {
    console.warn('Erro ao salvar conquistas no web:', e);
  }
}

export async function getAllMarketItems(): Promise<MarketItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_MARKET);
    return raw ? (JSON.parse(raw) as MarketItem[]) : [];
  } catch {
    return [];
  }
}

export async function setAllMarketItemsDb(items: MarketItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_MARKET, JSON.stringify(items));
  } catch (e) {
    console.warn('Erro ao salvar itens da loja no web:', e);
  }
}

export async function getAppKv<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX_KV}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setAppKv<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(`${PREFIX_KV}${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao salvar app_kv no web:', e);
  }
}

export async function clearEntireDatabase(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      KEY_CATEGORIES,
      KEY_HABITS,
      KEY_TEMPLATES,
      KEY_ACHIEVEMENTS,
      KEY_MARKET,
      `${PREFIX_KV}user_profile`,
      `${PREFIX_KV}app_settings`,
    ]);
  } catch (e) {
    console.warn('Erro ao limpar banco no web:', e);
  }
}
