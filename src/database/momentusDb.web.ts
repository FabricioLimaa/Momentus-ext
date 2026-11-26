import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DatabaseSecurityInfo } from '@/services/encryptionService';
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

// Fila de serialização para evitar race conditions em read-modify-write concorrentes no Web
let webOpQueue: Promise<unknown> = Promise.resolve();

function enqueueWebDbOp<T>(task: () => Promise<T>, fallbackValue: T): Promise<T> {
  const next = webOpQueue.then(task, task).catch(() => fallbackValue);
  webOpQueue = next.then(() => undefined, () => undefined);
  return next;
}

export async function getDatabase(): Promise<null> {
  return null;
}

export function getDatabaseSecurityInfo(): DatabaseSecurityInfo {
  return {
    mode: 'web-tls',
    cipherVersion: null,
    hardwareKeyProtected: false,
  };
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
  return enqueueWebDbOp(async () => {
    const current = await getAllCategories();
    const idx = current.findIndex((c) => c.id === category.id);
    const next = idx >= 0 ? current.map((c) => (c.id === category.id ? category : c)) : [...current, category];
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(next));
  }, undefined);
}

export async function deleteCategoryDb(id: string): Promise<void> {
  return enqueueWebDbOp(async () => {
    const current = await getAllCategories();
    const next = current.filter((c) => c.id !== id);
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(next));
  }, undefined);
}

export async function setAllCategoriesDb(categories: Category[]): Promise<void> {
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
  }, undefined);
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
  return enqueueWebDbOp(async () => {
    const current = await getAllHabits();
    const idx = current.findIndex((h) => h.id === habit.id);
    const next = idx >= 0 ? current.map((h) => (h.id === habit.id ? habit : h)) : [...current, habit];
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  }, undefined);
}

export async function deleteHabitDb(id: string): Promise<void> {
  return enqueueWebDbOp(async () => {
    const current = await getAllHabits();
    const next = current.filter((h) => h.id !== id);
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  }, undefined);
}

export async function deleteMultipleHabitsDb(ids: string[]): Promise<void> {
  return enqueueWebDbOp(async () => {
    const idSet = new Set(ids);
    const current = await getAllHabits();
    const next = current.filter((h) => !idSet.has(h.id));
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(next));
  }, undefined);
}

export async function setAllHabitsDb(habits: HabitItem[]): Promise<void> {
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(KEY_HABITS, JSON.stringify(habits));
  }, undefined);
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
  return enqueueWebDbOp(async () => {
    const current = await getAllTemplates();
    const idx = current.findIndex((t) => t.id === template.id);
    const next = idx >= 0 ? current.map((t) => (t.id === template.id ? template : t)) : [...current, template];
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(next));
  }, undefined);
}

export async function deleteTemplateDb(id: string): Promise<void> {
  return enqueueWebDbOp(async () => {
    const current = await getAllTemplates();
    const next = current.filter((t) => t.id !== id);
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(next));
  }, undefined);
}

export async function setAllTemplatesDb(templates: RoutineTemplate[]): Promise<void> {
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(KEY_TEMPLATES, JSON.stringify(templates));
  }, undefined);
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
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(KEY_ACHIEVEMENTS, JSON.stringify(achievements));
  }, undefined);
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
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(KEY_MARKET, JSON.stringify(items));
  }, undefined);
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
  return enqueueWebDbOp(async () => {
    await AsyncStorage.setItem(`${PREFIX_KV}${key}`, JSON.stringify(value));
  }, undefined);
}

const PRESERVED_LOGOUT_KEYS = new Set([
  `${PREFIX_KV}auth_remember_me_prefs`,
  '@momentus_remember_me',
  '@momentus:remember_me',
]);

export async function clearEntireDatabase(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const momentusKeys = allKeys.filter(
      (key) =>
        (key.startsWith('@momentus_') || key.startsWith('@momentus:')) &&
        !PRESERVED_LOGOUT_KEYS.has(key)
    );
    const keysToRemove = Array.from(
      new Set([
        ...momentusKeys,
        KEY_CATEGORIES,
        KEY_HABITS,
        KEY_TEMPLATES,
        KEY_ACHIEVEMENTS,
        KEY_MARKET,
        `${PREFIX_KV}user_profile`,
        `${PREFIX_KV}app_settings`,
        `${PREFIX_KV}google_access_token`,
        `${PREFIX_KV}focus_history_map`,
        `${PREFIX_KV}last_focus_date`,
        `${PREFIX_KV}validated_day_dates`,
        `${PREFIX_KV}validated_routine_keys`,
        `${PREFIX_KV}credited_achievement_ids`,
        `${PREFIX_KV}active_focus_timer`,
      ])
    );
    await AsyncStorage.multiRemove(keysToRemove);
  } catch (e) {
    console.warn('Erro ao limpar banco no web:', e);
  }
}
