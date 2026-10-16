import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import {
  Category,
  HabitItem,
  RoutineTemplate,
  Achievement,
  MarketItem,
} from '@/types';

const DB_NAME = 'momentus.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Obtém ou inicializa a conexão com o banco SQLite (Android / iOS).
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (dbInstance) {
    return dbInstance;
  }
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await initDatabaseSchema(dbInstance);
  return dbInstance;
}

/**
 * Cria a estrutura de tabelas do Momentus garantindo integridade e índices.
 */
async function initDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT,
      stickerId TEXT,
      metaMinutosSemanal INTEGER
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      timeStart TEXT NOT NULL,
      timeEnd TEXT,
      categoryId TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      streak INTEGER NOT NULL DEFAULT 0,
      googleCalendarEventId TEXT,
      saveToGoogle INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_habits_date ON habits(date);
    CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(categoryId);

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      itemsJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      unlocked INTEGER NOT NULL DEFAULT 0,
      unlockedAt TEXT,
      progress INTEGER NOT NULL DEFAULT 0,
      maxProgress INTEGER NOT NULL DEFAULT 1,
      xpReward INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS market_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      rarity TEXT NOT NULL,
      basePrice INTEGER NOT NULL,
      finalPrice INTEGER NOT NULL,
      isOwned INTEGER NOT NULL DEFAULT 0,
      iconName TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_kv (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
}

// ==========================================
// OPERAÇÕES: CATEGORIES
// ==========================================

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    color: string;
    icon: string | null;
    stickerId: string | null;
    metaMinutosSemanal: number | null;
  }>('SELECT * FROM categories ORDER BY name ASC');

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    icon: r.icon ?? undefined,
    stickerId: r.stickerId,
    metaMinutosSemanal: r.metaMinutosSemanal,
  }));
}

export async function upsertCategoryDb(category: Category): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO categories (id, name, color, icon, stickerId, metaMinutosSemanal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.name,
      category.color,
      category.icon ?? null,
      category.stickerId ?? null,
      category.metaMinutosSemanal ?? null,
    ]
  );
}

export async function deleteCategoryDb(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

export async function setAllCategoriesDb(categories: Category[]): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM categories');
    for (const cat of categories) {
      await txn.runAsync(
        `INSERT INTO categories (id, name, color, icon, stickerId, metaMinutosSemanal)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          cat.id,
          cat.name,
          cat.color,
          cat.icon ?? null,
          cat.stickerId ?? null,
          cat.metaMinutosSemanal ?? null,
        ]
      );
    }
  });
}

// ==========================================
// OPERAÇÕES: HABITS
// ==========================================

export async function getAllHabits(): Promise<HabitItem[]> {
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string | null;
    timeStart: string;
    timeEnd: string | null;
    categoryId: string;
    completed: number;
    date: string;
    streak: number;
    googleCalendarEventId: string | null;
    saveToGoogle: number;
  }>('SELECT * FROM habits ORDER BY date DESC, timeStart ASC');

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? undefined,
    timeStart: r.timeStart,
    timeEnd: r.timeEnd ?? undefined,
    categoryId: r.categoryId,
    completed: r.completed === 1,
    date: r.date,
    streak: r.streak,
    googleCalendarEventId: r.googleCalendarEventId,
    saveToGoogle: r.saveToGoogle === 1,
  }));
}

export async function upsertHabitDb(habit: HabitItem): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO habits 
     (id, title, description, timeStart, timeEnd, categoryId, completed, date, streak, googleCalendarEventId, saveToGoogle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      habit.id,
      habit.title,
      habit.description ?? null,
      habit.timeStart,
      habit.timeEnd ?? null,
      habit.categoryId,
      habit.completed ? 1 : 0,
      habit.date,
      habit.streak,
      habit.googleCalendarEventId ?? null,
      habit.saveToGoogle ? 1 : 0,
    ]
  );
}

export async function deleteHabitDb(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

export async function deleteMultipleHabitsDb(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDatabase();
  if (!db) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(`DELETE FROM habits WHERE id IN (${placeholders})`, ids);
}

export async function setAllHabitsDb(habits: HabitItem[]): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM habits');
    for (const habit of habits) {
      await txn.runAsync(
        `INSERT INTO habits 
         (id, title, description, timeStart, timeEnd, categoryId, completed, date, streak, googleCalendarEventId, saveToGoogle)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          habit.id,
          habit.title,
          habit.description ?? null,
          habit.timeStart,
          habit.timeEnd ?? null,
          habit.categoryId,
          habit.completed ? 1 : 0,
          habit.date,
          habit.streak,
          habit.googleCalendarEventId ?? null,
          habit.saveToGoogle ? 1 : 0,
        ]
      );
    }
  });
}

// ==========================================
// OPERAÇÕES: TEMPLATES
// ==========================================

export async function getAllTemplates(): Promise<RoutineTemplate[]> {
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    itemsJson: string;
  }>('SELECT * FROM templates');

  return rows.map((r) => {
    let items = [];
    try {
      items = JSON.parse(r.itemsJson);
    } catch {}
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      icon: r.icon,
      color: r.color,
      items,
    };
  });
}

export async function upsertTemplateDb(template: RoutineTemplate): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync(
    `INSERT OR REPLACE INTO templates (id, title, description, icon, color, itemsJson)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      template.id,
      template.title,
      template.description,
      template.icon,
      template.color,
      JSON.stringify(template.items),
    ]
  );
}

export async function deleteTemplateDb(id: string): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
}

export async function setAllTemplatesDb(templates: RoutineTemplate[]): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM templates');
    for (const t of templates) {
      await txn.runAsync(
        `INSERT INTO templates (id, title, description, icon, color, itemsJson)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [t.id, t.title, t.description, t.icon, t.color, JSON.stringify(t.items)]
      );
    }
  });
}

// ==========================================
// OPERAÇÕES: ACHIEVEMENTS & MARKET
// ==========================================

export async function getAllAchievements(): Promise<Achievement[]> {
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlocked: number;
    unlockedAt: string | null;
    progress: number;
    maxProgress: number;
    xpReward: number;
  }>('SELECT * FROM achievements');

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    icon: r.icon,
    unlocked: r.unlocked === 1,
    unlockedAt: r.unlockedAt ?? undefined,
    progress: r.progress,
    maxProgress: r.maxProgress,
    xpReward: r.xpReward,
  }));
}

export async function setAllAchievementsDb(achievements: Achievement[]): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM achievements');
    for (const a of achievements) {
      await txn.runAsync(
        `INSERT INTO achievements (id, title, description, icon, unlocked, unlockedAt, progress, maxProgress, xpReward)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.title,
          a.description,
          a.icon,
          a.unlocked ? 1 : 0,
          a.unlockedAt ?? null,
          a.progress,
          a.maxProgress,
          a.xpReward,
        ]
      );
    }
  });
}

export async function getAllMarketItems(): Promise<MarketItem[]> {
  const db = await getDatabase();
  if (!db) return [];
  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    description: string;
    type: string;
    rarity: string;
    basePrice: number;
    finalPrice: number;
    isOwned: number;
    iconName: string;
  }>('SELECT * FROM market_items');

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type as any,
    rarity: r.rarity as any,
    basePrice: r.basePrice,
    finalPrice: r.finalPrice,
    isOwned: r.isOwned === 1,
    iconName: r.iconName,
  }));
}

export async function setAllMarketItemsDb(items: MarketItem[]): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM market_items');
    for (const item of items) {
      await txn.runAsync(
        `INSERT INTO market_items (id, name, description, type, rarity, basePrice, finalPrice, isOwned, iconName)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.description,
          item.type,
          item.rarity,
          item.basePrice,
          item.finalPrice,
          item.isOwned ? 1 : 0,
          item.iconName,
        ]
      );
    }
  });
}

// ==========================================
// OPERAÇÕES: KEY-VALUE (PROFILE & SETTINGS)
// ==========================================

export async function getAppKv<T>(key: string): Promise<T | null> {
  const db = await getDatabase();
  if (!db) return null;
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_kv WHERE key = ?',
    [key]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return null;
  }
}

export async function setAppKv<T>(key: string, value: T): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.runAsync(
    'INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)]
  );
}

// ==========================================
// RESET GERAL
// ==========================================

export async function clearEntireDatabase(): Promise<void> {
  const db = await getDatabase();
  if (!db) return;
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync('DELETE FROM habits');
    await txn.runAsync('DELETE FROM categories');
    await txn.runAsync('DELETE FROM templates');
    await txn.runAsync('DELETE FROM achievements');
    await txn.runAsync('DELETE FROM market_items');
    await txn.runAsync('DELETE FROM app_kv');
  });
}
