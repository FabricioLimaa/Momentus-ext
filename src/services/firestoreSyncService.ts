import { firestore } from "@/config/firebase";
import {
  Achievement,
  Category,
  HabitItem,
  MarketItem,
  RoutineTemplate,
  UserProfile,
} from "@/types";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Unsubscribe,
  writeBatch,
} from "firebase/firestore";

const EVENTS_COLLECTION = "eventos";
const CATEGORIES_COLLECTION = "categories";
const TEMPLATES_COLLECTION = "templates";
const UNLOCKED_ACHIEVEMENTS_COLLECTION = "unlocked_achievements";
const COMPLETED_HABITS_COLLECTION = "completed_habits";

export interface SyncResult {
  uploadedEvents: number;
  downloadedEvents: number;
  uploadedCategories: number;
  downloadedCategories: number;
  uploadedTemplates: number;
  downloadedTemplates: number;
  syncedAchievements: number;
}

/**
 * Executa a sincronização bidirecional completa do Firestore espelhando a lógica de:
 * - SyncWorker.kt
 * - ScheduleRepository.kt (eventos)
 * - CategoryRepository.kt (categories)
 * - TemplateRepository.kt (templates)
 * - GamificationRepository.kt (unlocked_achievements, completed_habits, points & purchased_stickers)
 */
export async function syncWithFirestore(
  userId: string,
  localHabits: HabitItem[],
  localCategories: Category[],
  localTemplates: RoutineTemplate[] = [],
  localAchievements: Achievement[] = [],
  localMarketItems: MarketItem[] = [],
  localUserProfile?: UserProfile,
): Promise<{
  mergedHabits: HabitItem[];
  mergedCategories: Category[];
  mergedTemplates: RoutineTemplate[];
  mergedAchievements: Achievement[];
  mergedMarketItems: MarketItem[];
  mergedUserProfile?: UserProfile;
  result: SyncResult;
}> {
  const result: SyncResult = {
    uploadedEvents: 0,
    downloadedEvents: 0,
    uploadedCategories: 0,
    downloadedCategories: 0,
    uploadedTemplates: 0,
    downloadedTemplates: 0,
    syncedAchievements: 0,
  };

  const userDocRef = doc(firestore, "users", userId);
  const eventsColRef = collection(userDocRef, EVENTS_COLLECTION);
  const categoriesColRef = collection(userDocRef, CATEGORIES_COLLECTION);
  const templatesColRef = collection(userDocRef, TEMPLATES_COLLECTION);
  const achievementsColRef = collection(
    userDocRef,
    UNLOCKED_ACHIEVEMENTS_COLLECTION,
  );
  const completedHabitsColRef = collection(
    userDocRef,
    COMPLETED_HABITS_COLLECTION,
  );

  // ========================================================
  // 1. Sincronização de Categorias (CategoryRepository.kt)
  // ========================================================
  const categoriesSnapshot = await getDocs(categoriesColRef);
  const cloudCategoriesMap = new Map<string, any>();
  categoriesSnapshot.forEach((d) => cloudCategoriesMap.set(d.id, d.data()));

  const localCategoriesMap = new Map<string, Category>(
    localCategories.map((c) => [c.id, c]),
  );
  const categoriesBatch = writeBatch(firestore);

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

  const mergedCategories: Category[] = [...localCategories];
  cloudCategoriesMap.forEach((cloudCat, id) => {
    if (!localCategoriesMap.has(id)) {
      mergedCategories.push({
        id,
        name: cloudCat.nome || cloudCat.name || "Geral",
        color: cloudCat.cor || cloudCat.color || "#34D399",
        icon: cloudCat.icon || undefined,
        stickerId: cloudCat.stickerId || null,
        metaMinutosSemanal: cloudCat.metaMinutosSemanal || null,
      });
      result.downloadedCategories++;
    }
  });

  // ========================================================
  // 2. Sincronização de Eventos/Hábitos (ScheduleRepository.kt)
  // ========================================================
  const eventsSnapshot = await getDocs(eventsColRef);
  const cloudEventsMap = new Map<string, any>();
  eventsSnapshot.forEach((d) => cloudEventsMap.set(d.id, d.data()));

  const localEventsMap = new Map<string, HabitItem>(
    localHabits.map((h) => [h.id, h]),
  );
  const eventsBatch = writeBatch(firestore);

  localHabits.forEach((habit) => {
    const cloudItem = cloudEventsMap.get(habit.id);
    if (!cloudItem || cloudItem.completed !== habit.completed) {
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
      if (!cloudItem) result.uploadedEvents++;
    }
  });
  await eventsBatch.commit();

  // Registra hábitos concluídos na subcoleção completed_habits em batch isolado
  try {
    const completedBatch = writeBatch(firestore);
    let hasCompleted = false;
    localHabits.forEach((habit) => {
      if (habit.completed) {
        hasCompleted = true;
        const compRef = doc(completedHabitsColRef, habit.id);
        completedBatch.set(compRef, {
          habitId: habit.id,
          title: habit.title,
          completedDate: habit.date,
          lastUpdated: new Date().toISOString(),
        });
      }
    });
    if (hasCompleted) {
      await completedBatch.commit();
    }
  } catch {}

  const mergedHabits: HabitItem[] = [...localHabits];
  cloudEventsMap.forEach((cloudItem, id) => {
    if (!localEventsMap.has(id)) {
      mergedHabits.push({
        id,
        title: cloudItem.titulo || cloudItem.title || "Rotina",
        description: cloudItem.descricao || cloudItem.description || undefined,
        date:
          cloudItem.data ||
          cloudItem.date ||
          new Date().toISOString().slice(0, 10),
        timeStart: cloudItem.horarioInicio || cloudItem.timeStart || "08:00",
        timeEnd: cloudItem.horarioTermino || cloudItem.timeEnd || undefined,
        categoryId: cloudItem.categoryId || mergedCategories[0]?.id || "cat-1",
        completed: !!cloudItem.completed,
        streak: cloudItem.streak || 0,
        googleCalendarEventId: cloudItem.googleCalendarEventId || null,
        saveToGoogle: !!cloudItem.saveToGoogle,
      });
      result.downloadedEvents++;
    }
  });

  // ========================================================
  // 3. Sincronização de Templates (TemplateRepository.kt)
  // ========================================================
  const mergedTemplates: RoutineTemplate[] = [...localTemplates];
  try {
    const templatesSnapshot = await getDocs(templatesColRef);
    const cloudTemplatesMap = new Map<string, any>();
    templatesSnapshot.forEach((d) => cloudTemplatesMap.set(d.id, d.data()));

    const localTemplatesMap = new Map<string, RoutineTemplate>(
      localTemplates.map((t) => [t.id, t]),
    );
    const templatesBatch = writeBatch(firestore);

    localTemplates.forEach((tmpl) => {
      const docRef = doc(templatesColRef, tmpl.id);
      templatesBatch.set(docRef, {
        id: tmpl.id,
        nome: tmpl.title,
        title: tmpl.title,
        descricao: tmpl.description,
        description: tmpl.description,
        icon: tmpl.icon,
        color: tmpl.color,
        items: tmpl.items,
        lastUpdated: new Date().toISOString(),
      });
      if (!cloudTemplatesMap.has(tmpl.id)) {
        result.uploadedTemplates++;
      }
    });
    await templatesBatch.commit();

    cloudTemplatesMap.forEach((cloudTmpl, id) => {
      if (!localTemplatesMap.has(id)) {
        mergedTemplates.push({
          id,
          title: cloudTmpl.title || cloudTmpl.nome || "Modelo de Rotina",
          description:
            cloudTmpl.description ||
            cloudTmpl.descricao ||
            "Rotina sincronizada da nuvem",
          icon: cloudTmpl.icon || "sparkles",
          color: cloudTmpl.color || "#34D399",
          items: Array.isArray(cloudTmpl.items) ? cloudTmpl.items : [],
        });
        result.downloadedTemplates++;
      }
    });
  } catch {}

  // ========================================================
  // 4. Sincronização de Gamificação: Conquistas, XP e Stickers (GamificationRepository.kt)
  // ========================================================
  let mergedAchievements: Achievement[] = [...localAchievements];
  try {
    const achSnapshot = await getDocs(achievementsColRef);
    const cloudUnlockedSet = new Map<string, any>();
    achSnapshot.forEach((d) => cloudUnlockedSet.set(d.id, d.data()));

    const achBatch = writeBatch(firestore);
    localAchievements.forEach((ach) => {
      if (ach.unlocked && !cloudUnlockedSet.has(ach.id)) {
        const achDocRef = doc(achievementsColRef, ach.id);
        achBatch.set(achDocRef, {
          id: ach.id,
          title: ach.title,
          unlockedAt: ach.unlockedAt || new Date().toISOString().slice(0, 10),
        });
        result.syncedAchievements++;
      }
    });
    await achBatch.commit();

    mergedAchievements = localAchievements.map((ach) => {
      if (!ach.unlocked && cloudUnlockedSet.has(ach.id)) {
        const cloudData = cloudUnlockedSet.get(ach.id);
        result.syncedAchievements++;
        return {
          ...ach,
          unlocked: true,
          progress: ach.maxProgress,
          unlockedAt:
            cloudData?.unlockedAt || new Date().toISOString().slice(0, 10),
        };
      }
      return ach;
    });
  } catch {}

  // Sincronização do documento raiz users/{userId} (points e purchased_stickers)
  let mergedMarketItems: MarketItem[] = [...localMarketItems];
  let mergedUserProfile: UserProfile | undefined = localUserProfile
    ? { ...localUserProfile }
    : undefined;

  try {
    const userDocSnap = await getDoc(userDocRef);
    const cloudUserData = userDocSnap.exists() ? userDocSnap.data() : {};

    const localOwnedIds = localMarketItems
      .filter((i) => i.isOwned)
      .map((i) => i.id);
    const cloudOwnedIds: string[] = Array.isArray(
      cloudUserData?.purchased_stickers,
    )
      ? cloudUserData.purchased_stickers
      : [];
    const combinedOwnedSet = new Set<string>([
      ...localOwnedIds,
      ...cloudOwnedIds,
    ]);

    mergedMarketItems = localMarketItems.map((item) => ({
      ...item,
      isOwned: combinedOwnedSet.has(item.id),
    }));

    if (mergedUserProfile) {
      const cloudPoints =
        typeof cloudUserData?.points === "number" ? cloudUserData.points : 0;
      const cloudBestStreak =
        typeof cloudUserData?.bestStreak === "number"
          ? cloudUserData.bestStreak
          : 0;
      const mergedPoints = Math.max(mergedUserProfile.totalPoints, cloudPoints);
      const mergedBestStreak = Math.max(
        mergedUserProfile.bestStreak,
        cloudBestStreak,
      );

      // Prioriza dados da nuvem se existirem e não forem o fallback inicial
      const cloudDisplayName =
        cloudUserData?.display_name || cloudUserData?.displayName || cloudUserData?.name;
      const cloudEmail = cloudUserData?.email;
      const cloudPhoto = cloudUserData?.photo_url || cloudUserData?.photoUrl;

      const mergedName =
        (mergedUserProfile.name && mergedUserProfile.name !== 'Fabrício Lima' && mergedUserProfile.name !== 'Usuário')
          ? mergedUserProfile.name
          : (cloudDisplayName || mergedUserProfile.name);

      const mergedEmail =
        (mergedUserProfile.email && mergedUserProfile.email !== 'fabricio@momentus.app')
          ? mergedUserProfile.email
          : (cloudEmail || mergedUserProfile.email);

      const mergedPhoto = mergedUserProfile.photoUrl || cloudPhoto || null;

      mergedUserProfile = {
        ...mergedUserProfile,
        name: mergedName,
        email: mergedEmail,
        photoUrl: mergedPhoto,
        totalPoints: mergedPoints,
        bestStreak: mergedBestStreak,
      };

      const userProfilePayload: Record<string, any> = {
        points: mergedPoints,
        purchased_stickers: Array.from(combinedOwnedSet),
        currentStreak: mergedUserProfile.currentStreak,
        bestStreak: mergedBestStreak,
        totalCompleted: mergedUserProfile.totalCompleted,
        focusMinutesToday: mergedUserProfile.focusMinutesToday,
        lastSyncAt: new Date().toISOString(),
      };

      if (mergedName) {
        userProfilePayload.display_name = mergedName;
      }
      if (mergedEmail) {
        userProfilePayload.email = mergedEmail;
      }
      if (mergedPhoto) {
        userProfilePayload.photo_url = mergedPhoto;
      }

      await setDoc(userDocRef, userProfilePayload, { merge: true });
    }
  } catch (err) {
    console.warn(
      "Aviso ao sincronizar perfil de gamificação no Firestore:",
      err,
    );
  }

  return {
    mergedHabits,
    mergedCategories,
    mergedTemplates,
    mergedAchievements,
    mergedMarketItems,
    mergedUserProfile,
    result,
  };
}

/**
 * Limpa todos os dados do usuário na nuvem (Firestore), espelhando fielmente o ClearCloudDataUseCase.kt.
 */
export async function clearCloudData(userId: string): Promise<boolean> {
  if (!userId || userId === "local_user") {
    return false;
  }

  let clearedAny = false;
  const userDocRef = doc(firestore, "users", userId);
  const collectionsToClear = [
    EVENTS_COLLECTION,
    CATEGORIES_COLLECTION,
    COMPLETED_HABITS_COLLECTION,
    UNLOCKED_ACHIEVEMENTS_COLLECTION,
    TEMPLATES_COLLECTION,
  ];

  for (const collectionName of collectionsToClear) {
    try {
      const colRef = collection(userDocRef, collectionName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const batch = writeBatch(firestore);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
      clearedAny = true;
    } catch {
      // Subcoleção pode não estar liberada nas Security Rules do Firestore para este usuário
    }
  }

  try {
    await setDoc(
      userDocRef,
      {
        points: 0,
        purchased_stickers: [],
        currentStreak: 0,
        bestStreak: 0,
        totalCompleted: 0,
        focusMinutesToday: 0,
        clearedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    clearedAny = true;
  } catch {}

  return clearedAny;
}

/**
 * Escuta atualizações em tempo real no Firestore para um usuário logado.
 */
export function listenToFirestoreSync(
  userId: string,
  onRemoteChange: () => void,
): Unsubscribe {
  const eventsColRef = collection(
    firestore,
    "users",
    userId,
    EVENTS_COLLECTION,
  );
  return onSnapshot(
    eventsColRef,
    () => {
      onRemoteChange();
    },
    (err) => {
      console.warn("Erro no SnapshotListener do Firestore:", err);
    },
  );
}
