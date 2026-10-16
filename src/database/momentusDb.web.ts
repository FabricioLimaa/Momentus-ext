import {
  Category,
  HabitItem,
  RoutineTemplate,
  Achievement,
  MarketItem,
} from '@/types';

/**
 * Implementação Web para o módulo de banco de dados.
 * No navegador (Web), o MomentusContext persiste os dados automaticamente via AsyncStorage (localStorage),
 * evitando o carregamento desnecessário de binários WebAssembly (wa-sqlite.wasm) do expo-sqlite.
 */
export async function getDatabase(): Promise<null> {
  return null;
}

export async function getAllCategories(): Promise<Category[]> {
  return [];
}

export async function upsertCategoryDb(_category: Category): Promise<void> {}

export async function deleteCategoryDb(_id: string): Promise<void> {}

export async function setAllCategoriesDb(_categories: Category[]): Promise<void> {}

export async function getAllHabits(): Promise<HabitItem[]> {
  return [];
}

export async function upsertHabitDb(_habit: HabitItem): Promise<void> {}

export async function deleteHabitDb(_id: string): Promise<void> {}

export async function deleteMultipleHabitsDb(_ids: string[]): Promise<void> {}

export async function setAllHabitsDb(_habits: HabitItem[]): Promise<void> {}

export async function getAllTemplates(): Promise<RoutineTemplate[]> {
  return [];
}

export async function upsertTemplateDb(_template: RoutineTemplate): Promise<void> {}

export async function deleteTemplateDb(_id: string): Promise<void> {}

export async function setAllTemplatesDb(_templates: RoutineTemplate[]): Promise<void> {}

export async function getAllAchievements(): Promise<Achievement[]> {
  return [];
}

export async function setAllAchievementsDb(_achievements: Achievement[]): Promise<void> {}

export async function getAllMarketItems(): Promise<MarketItem[]> {
  return [];
}

export async function setAllMarketItemsDb(_items: MarketItem[]): Promise<void> {}

export async function getAppKv<T>(_key: string): Promise<T | null> {
  return null;
}

export async function setAppKv<T>(_key: string, _value: T): Promise<void> {}

export async function clearEntireDatabase(): Promise<void> {}

