import type * as SQLite from 'expo-sqlite';
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
let dbInitPromise: Promise<SQLite.SQLiteDatabase | null> | null = null;
let operationQueue: Promise<unknown> = Promise.resolve();

/**
 * Enfileira operações no SQLite sequencialmente para evitar 'database is locked'
 * em chamadas concorrentes (ex: múltiplos useEffects ou Promise.all).
 */
function enqueueDbOperation<T>(
  task: (db: SQLite.SQLiteDatabase) => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (Platform.OS === 'web') {
    return Promise.resolve(fallbackValue);
  }

  const nextOp = operationQueue.then(async () => {
    const db = await getDatabase();
    if (!db) return fallbackValue;
    try {
      return await task(db);
    } catch (err) {
      console.warn('Erro em operação SQLite:', err);
      return fallbackValue;
    }
  });

  // Mantém a fila viva mesmo se alguma operação falhar
  operationQueue = nextOp.then(
    () => undefined,
    () => undefined
  );

  return nextOp;
}

/**
 * Obtém ou inicializa a conexão única com o banco SQLite (Android / iOS).
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const SQLiteModule = require('expo-sqlite') as typeof SQLite;
      const db = await SQLiteModule.openDatabaseAsync(DB_NAME);
      await initDatabaseSchema(db);
      dbInstance = db;
      return db;
    } catch (err) {
      console.warn('Falha ao inicializar SQLite nativo, usando fallback em memória/AsyncStorage:', err);
      dbInitPromise = null;
      return null;
    }
  })();

  return dbInitPromise;
}

/**
 * Cria a estrutura de tabelas do Momentus garantindo integridade, WAL mode e busy_timeout.
 */
async function initDatabaseSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
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
      saveToGoogle INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_habits_date ON habits(date);
    CREATE INDEX IF NOT EXISTS idx_habits_categoryId ON habits(categoryId);

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
      xpReward INTEGER NOT NULL DEFAULT 50
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
  return enqueueDbOperation(async (db) => {
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
  }, []);
}

export async function upsertCategoryDb(category: Category): Promise<void> {
  return enqueueDbOperation(async (db) => {
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
  }, undefined);
}

export async function deleteCategoryDb(id: string): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }, undefined);
}

export async function setAllCategoriesDb(categories: Category[]): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM categories');
      for (const cat of categories) {
        await db.runAsync(
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
  }, undefined);
}

// ==========================================
// OPERAÇÕES: HABITS
// ==========================================

export async function getAllHabits(): Promise<HabitItem[]> {
  return enqueueDbOperation(async (db) => {
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
  }, []);
}

export async function upsertHabitDb(habit: HabitItem): Promise<void> {
  return enqueueDbOperation(async (db) => {
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
  }, undefined);
}

export async function deleteHabitDb(id: string): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
  }, undefined);
}

export async function deleteMultipleHabitsDb(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  return enqueueDbOperation(async (db) => {
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(`DELETE FROM habits WHERE id IN (${placeholders})`, ids);
  }, undefined);
}

export async function setAllHabitsDb(habits: HabitItem[]): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM habits');
      for (const habit of habits) {
        await db.runAsync(
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
  }, undefined);
}

// ==========================================
// OPERAÇÕES: TEMPLATES
// ==========================================

export async function getAllTemplates(): Promise<RoutineTemplate[]> {
  return enqueueDbOperation(async (db) => {
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
  }, []);
}

export async function upsertTemplateDb(template: RoutineTemplate): Promise<void> {
  return enqueueDbOperation(async (db) => {
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
  }, undefined);
}

export async function deleteTemplateDb(id: string): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.runAsync('DELETE FROM templates WHERE id = ?', [id]);
  }, undefined);
}

export async function setAllTemplatesDb(templates: RoutineTemplate[]): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM templates');
      for (const t of templates) {
        await db.runAsync(
          `INSERT INTO templates (id, title, description, icon, color, itemsJson)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [t.id, t.title, t.description, t.icon, t.color, JSON.stringify(t.items)]
        );
      }
    });
  }, undefined);
}

// ==========================================
// OPERAÇÕES: ACHIEVEMENTS & MARKET
// ==========================================

export async function getAllAchievements(): Promise<Achievement[]> {
  return enqueueDbOperation(async (db) => {
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
  }, []);
}

export async function setAllAchievementsDb(achievements: Achievement[]): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM achievements');
      for (const a of achievements) {
        await db.runAsync(
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
  }, undefined);
}

export async function getAllMarketItems(): Promise<MarketItem[]> {
  return enqueueDbOperation(async (db) => {
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
  }, []);
}

export async function setAllMarketItemsDb(items: MarketItem[]): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM market_items');
      for (const item of items) {
        await db.runAsync(
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
  }, undefined);
}

// ==========================================
// OPERAÇÕES: KEY-VALUE (PROFILE & SETTINGS)
// ==========================================

export async function getAppKv<T>(key: string): Promise<T | null> {
  return enqueueDbOperation(async (db) => {
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
  }, null);
}

export async function setAppKv<T>(key: string, value: T): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_kv (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    );
  }, undefined);
}

// ==========================================
// RESET GERAL
// ==========================================

export async function clearEntireDatabase(): Promise<void> {
  return enqueueDbOperation(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM habits');
      await db.runAsync('DELETE FROM categories');
      await db.runAsync('DELETE FROM templates');
      await db.runAsync('DELETE FROM achievements');
      await db.runAsync('DELETE FROM market_items');
      await db.runAsync('DELETE FROM app_kv');
    });
  }, undefined);
}
