import {
  collection,
  doc,
  getDocs,
  writeBatch,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/config/firebase';
import { HabitItem, Category } from '@/types';

const EVENTS_COLLECTION = 'eventos';
const CATEGORIES_COLLECTION = 'categories';

export interface SyncResult {
  uploadedEvents: number;
  downloadedEvents: number;
  uploadedCategories: number;
  downloadedCategories: number;
}

/**
 * Executa a sincronização bidirecional do Firestore espelhando a lógica de SyncWorker.kt e ScheduleRepository.kt.
 */
export async function syncWithFirestore(
  userId: string,
  localHabits: HabitItem[],
  localCategories: Category[]
): Promise<{
  mergedHabits: HabitItem[];
  mergedCategories: Category[];
  result: SyncResult;
}> {
  const result: SyncResult = {
    uploadedEvents: 0,
    downloadedEvents: 0,
    uploadedCategories: 0,
    downloadedCategories: 0,
  };

  const userDocRef = doc(firestore, 'users', userId);
  const eventsColRef = collection(userDocRef, EVENTS_COLLECTION);
  const categoriesColRef = collection(userDocRef, CATEGORIES_COLLECTION);

  // 1. Sincronização de Categorias
  const categoriesSnapshot = await getDocs(categoriesColRef);
  const cloudCategoriesMap = new Map<string, any>();
  categoriesSnapshot.forEach((d) => cloudCategoriesMap.set(d.id, d.data()));

  const localCategoriesMap = new Map<string, Category>(localCategories.map((c) => [c.id, c]));
  const categoriesBatch = writeBatch(firestore);

  // Upload de categorias novas locais para nuvem
  localCategories.forEach((cat) => {
    if (!cloudCategoriesMap.has(cat.id)) {
      const docRef = doc(categoriesColRef, cat.id);
      categoriesBatch.set(docRef, {
        id: cat.id,
        nome: cat.name,
        cor: cat.color,
        icon: cat.icon || null,
        stickerId: cat.stickerId || null,
        metaMinutosSemanal: cat.metaMinutosSemanal || null,
        lastUpdated: new Date().toISOString(),
      });
      result.uploadedCategories++;
    }
  });
  await categoriesBatch.commit();

  // Merge de categorias da nuvem para o local
  const mergedCategories: Category[] = [...localCategories];
  cloudCategoriesMap.forEach((cloudCat, id) => {
    if (!localCategoriesMap.has(id)) {
      mergedCategories.push({
        id,
        name: cloudCat.nome || cloudCat.name || 'Geral',
        color: cloudCat.cor || cloudCat.color || '#34D399',
        icon: cloudCat.icon || undefined,
        stickerId: cloudCat.stickerId || null,
        metaMinutosSemanal: cloudCat.metaMinutosSemanal || null,
      });
      result.downloadedCategories++;
    }
  });

  // 2. Sincronização de Eventos/Hábitos
  const eventsSnapshot = await getDocs(eventsColRef);
  const cloudEventsMap = new Map<string, any>();
  eventsSnapshot.forEach((d) => cloudEventsMap.set(d.id, d.data()));

  const localEventsMap = new Map<string, HabitItem>(localHabits.map((h) => [h.id, h]));
  const eventsBatch = writeBatch(firestore);

  // Upload de hábitos locais para a nuvem
  localHabits.forEach((habit) => {
    const cloudItem = cloudEventsMap.get(habit.id);
    if (!cloudItem) {
      const docRef = doc(eventsColRef, habit.id);
      eventsBatch.set(docRef, {
        id: habit.id,
        titulo: habit.title,
        descricao: habit.description || null,
        data: habit.date,
        horarioInicio: habit.timeStart,
        horarioTermino: habit.timeEnd || habit.timeStart,
        categoryId: habit.categoryId,
        completed: habit.completed,
        streak: habit.streak,
        googleCalendarEventId: habit.googleCalendarEventId || null,
        saveToGoogle: habit.saveToGoogle || false,
        lastUpdated: new Date().toISOString(),
      });
      result.uploadedEvents++;
    }
  });
  await eventsBatch.commit();

  // Merge de hábitos da nuvem para o local
  const mergedHabits: HabitItem[] = [...localHabits];
  cloudEventsMap.forEach((cloudItem, id) => {
    if (!localEventsMap.has(id)) {
      mergedHabits.push({
        id,
        title: cloudItem.titulo || cloudItem.title || 'Rotina',
        description: cloudItem.descricao || cloudItem.description || undefined,
        date: cloudItem.data || cloudItem.date || new Date().toISOString().slice(0, 10),
        timeStart: cloudItem.horarioInicio || cloudItem.timeStart || '08:00',
        timeEnd: cloudItem.horarioTermino || cloudItem.timeEnd || undefined,
        categoryId: cloudItem.categoryId || mergedCategories[0]?.id || 'cat-1',
        completed: !!cloudItem.completed,
        streak: cloudItem.streak || 0,
        googleCalendarEventId: cloudItem.googleCalendarEventId || null,
        saveToGoogle: !!cloudItem.saveToGoogle,
      });
      result.downloadedEvents++;
    }
  });

  return { mergedHabits, mergedCategories, result };
}

/**
 * Escuta atualizações em tempo real no Firestore para um usuário logado.
 */
export function listenToFirestoreSync(
  userId: string,
  onRemoteChange: () => void
): Unsubscribe {
  const eventsColRef = collection(firestore, 'users', userId, EVENTS_COLLECTION);
  return onSnapshot(
    eventsColRef,
    () => {
      onRemoteChange();
    },
    (err) => {
      console.warn('Erro no SnapshotListener do Firestore:', err);
    }
  );
}
