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
  deleteDoc,
  deleteField,
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
const INVENTORY_COLLECTION = "inventory";

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
 * Converte data em formato 'YYYY-MM-DD' para epoch timestamp em milissegundos (Long no Kotlin).
 */
function dateToMillis(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  if (typeof dateStr === "number") return dateStr;
  const parts = String(dateStr).split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0).getTime();
  }
  const parsed = new Date(dateStr).getTime();
  return isNaN(parsed) ? null : parsed;
}

/**
 * Converte epoch timestamp ou Timestamp do Firestore de volta para string 'YYYY-MM-DD'.
 */
function millisToDateString(val?: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string" && val.includes("-") && val.length === 10) {
    return val;
  }
  if (typeof val === "number") {
    const d = new Date(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (val && typeof val.toDate === "function") {
    const d = val.toDate();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formata o horário no padrão ISO_LOCAL_TIME esperado pelo Kotlin ('HH:mm:ss').
 */
function formatTimeToIsoLocal(timeStr?: string, fallback = "08:00:00"): string {
  if (!timeStr) return fallback;
  if (timeStr.length === 5) return `${timeStr}:00`;
  if (timeStr.length === 8) return timeStr;
  return fallback;
}

/**
 * Extrai 'HH:mm' a partir de strings como '08:00:00' ou '08:00'.
 */
function parseTimeString(val?: any, fallback = "08:00"): string {
  if (!val || typeof val !== "string") return fallback;
  if (val.length >= 5) {
    return val.slice(0, 5);
  }
  return fallback;
}

/**
 * Executa a sincronização bidirecional do Firestore respeitando ESTRITAMENTE o schema do app nativo:
 * - users/{userId}: UserData.kt (display_name, email, points, streak, terms_accepted, terms_accepted_version)
 * - eventos: ItemCronograma.kt (data como Long, horarioInicioString/horarioTerminoString como ISO_LOCAL_TIME)
 * - completed_habits: HabitoConcluido.kt (itemCronogramaId, dataConclusao)
 * - inventory: MarketRepository.kt (subcoleção com documentos por itemId)
 * - unlocked_achievements: UnlockedAchievement.kt (achievementId, dateUnlocked)
 * - categories: Category.kt (nome, cor, stickerId, duracaoPadraoMinutos)
 * - templates: Template.kt (nome, descricao)
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
  const inventoryColRef = collection(userDocRef, INVENTORY_COLLECTION);
  const metasColRef = collection(userDocRef, "metas");

  // ========================================================
  // 1. Sincronização de Categorias (Category.kt) e Metas (Meta.kt)
  // ========================================================
  const LEGACY_MOCK_CAT_IDS = new Set([
    "cat-saude",
    "cat-trabalho",
    "cat-estudos",
    "cat-fitness",
    "cat-pessoal",
  ]);

  const categoriesSnapshot = await getDocs(categoriesColRef);
  const cloudCategoriesMap = new Map<string, any>();
  categoriesSnapshot.forEach((d) => cloudCategoriesMap.set(d.id, d.data()));

  const metasSnapshot = await getDocs(metasColRef);
  const cloudMetasMap = new Map<string, any>();
  metasSnapshot.forEach((d) => cloudMetasMap.set(d.id, d.data()));

  // Filtra categorias locais ignorando mocks legados de teste
  const cleanLocalCategories = localCategories.filter(
    (c) => !LEGACY_MOCK_CAT_IDS.has(c.id),
  );

  const localCategoriesMap = new Map<string, Category>(
    cleanLocalCategories.map((c) => [c.id, c]),
  );
  const categoriesBatch = writeBatch(firestore);

  cleanLocalCategories.forEach((cat) => {
    if (!cloudCategoriesMap.has(cat.id)) {
      const docRef = doc(categoriesColRef, cat.id);
      categoriesBatch.set(docRef, {
        id: cat.id,
        nome: cat.name,
        descricao: null,
        duracaoPadraoMinutos: 60,
        cor: cat.color || "#616161",
        tag: null,
        stickerId: cat.stickerId || null,
        lastUpdated: new Date(),
      });
      result.uploadedCategories++;
    }

    // Sincroniza meta na subcoleção 'metas' do Firestore conforme Meta.kt
    const metaDocRef = doc(metasColRef, cat.id);
    if (cat.metaMinutosSemanal != null && cat.metaMinutosSemanal > 0) {
      categoriesBatch.set(metaDocRef, {
        categoryId: cat.id,
        metaMinutosSemanal: cat.metaMinutosSemanal,
      });
    } else if (cloudMetasMap.has(cat.id)) {
      categoriesBatch.delete(metaDocRef);
    }
  });
  await categoriesBatch.commit();

  let mergedCategories: Category[] = [...cleanLocalCategories];
  cloudCategoriesMap.forEach((cloudCat, id) => {
    if (!localCategoriesMap.has(id) && !LEGACY_MOCK_CAT_IDS.has(id)) {
      const metaVal =
        cloudMetasMap.get(id)?.metaMinutosSemanal ??
        cloudCat.metaMinutosSemanal ??
        null;
      mergedCategories.push({
        id,
        name: cloudCat.nome || cloudCat.name || "Outros",
        color: cloudCat.cor || cloudCat.color || "#616161",
        icon: cloudCat.icon || undefined,
        stickerId: cloudCat.stickerId || null,
        metaMinutosSemanal: metaVal,
      });
      result.downloadedCategories++;
    }
  });

  // Se o usuário não tiver nenhuma categoria na nuvem nem localmente, garante a categoria padrão "Outros"
  if (mergedCategories.length === 0) {
    const defaultOutros: Category = {
      id: "cat-outros",
      name: "Outros",
      color: "#616161",
      stickerId: null,
      metaMinutosSemanal: null,
    };
    mergedCategories.push(defaultOutros);
    try {
      const defaultDocRef = doc(categoriesColRef, defaultOutros.id);
      await setDoc(defaultDocRef, {
        id: defaultOutros.id,
        nome: defaultOutros.name,
        descricao: null,
        duracaoPadraoMinutos: 60,
        cor: defaultOutros.color,
        tag: null,
        stickerId: null,
        lastUpdated: new Date(),
      });
    } catch {}
  }

  // ========================================================
  // 2. Sincronização de Hábitos Concluídos (HabitoConcluido.kt)
  // ========================================================
  const completedHabitsSnapshot = await getDocs(completedHabitsColRef);
  const cloudCompletedHabitsSet = new Set<string>();
  completedHabitsSnapshot.forEach((d) => {
    const data = d.data();
    const habitId = data.itemCronogramaId || d.id;
    cloudCompletedHabitsSet.add(habitId);
  });

  try {
    const completedBatch = writeBatch(firestore);
    let completedChanges = 0;

    localHabits.forEach((habit) => {
      const compRef = doc(completedHabitsColRef, habit.id);
      if (habit.completed && !cloudCompletedHabitsSet.has(habit.id)) {
        completedBatch.set(compRef, {
          itemCronogramaId: habit.id,
          dataConclusao: dateToMillis(habit.date) || Date.now(),
        });
        cloudCompletedHabitsSet.add(habit.id);
        completedChanges++;
      } else if (!habit.completed && cloudCompletedHabitsSet.has(habit.id)) {
        completedBatch.delete(compRef);
        cloudCompletedHabitsSet.delete(habit.id);
        completedChanges++;
      }
    });

    if (completedChanges > 0) {
      await completedBatch.commit();
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar completed_habits no Firestore:", err);
  }

  // ========================================================
  // 3. Sincronização de Eventos (ItemCronograma.kt)
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
    if (!cloudItem) {
      const docRef = doc(eventsColRef, habit.id);
      // Salva ESTRITAMENTE os campos esperados pelo ItemCronograma nativo
      eventsBatch.set(docRef, {
        id: habit.id,
        titulo: habit.title,
        descricao: habit.description || null,
        data: dateToMillis(habit.date),
        diaDaSemana: null,
        horarioInicioString: formatTimeToIsoLocal(habit.timeStart),
        horarioTerminoString: formatTimeToIsoLocal(habit.timeEnd || habit.timeStart),
        ordem: 0,
        categoryId: habit.categoryId,
        templateId: null,
        googleCalendarEventId: habit.googleCalendarEventId || null,
        isDeleted: false,
        lastUpdated: new Date(),
      });
      result.uploadedEvents++;
    }
  });
  await eventsBatch.commit();

  const mergedHabits: HabitItem[] = [...localHabits];
  cloudEventsMap.forEach((cloudItem, id) => {
    if (!localEventsMap.has(id)) {
      const isCompleted = cloudCompletedHabitsSet.has(id);
      mergedHabits.push({
        id,
        title: cloudItem.titulo || cloudItem.title || "Rotina",
        description: cloudItem.descricao || cloudItem.description || undefined,
        date: millisToDateString(cloudItem.data || cloudItem.date),
        timeStart: parseTimeString(
          cloudItem.horarioInicioString || cloudItem.horarioInicio,
          "08:00",
        ),
        timeEnd: parseTimeString(
          cloudItem.horarioTerminoString || cloudItem.horarioTermino,
          "09:00",
        ),
        categoryId: cloudItem.categoryId || mergedCategories[0]?.id || "cat-outros",
        completed: isCompleted,
        streak: 0,
        googleCalendarEventId: cloudItem.googleCalendarEventId || null,
        saveToGoogle: false,
      });
      result.downloadedEvents++;
    }
  });

  // ========================================================
  // 4. Sincronização de Templates (Template.kt)
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
        descricao: tmpl.description || null,
        lastUpdated: new Date(),
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
          title: cloudTmpl.nome || cloudTmpl.title || "Modelo de Rotina",
          description:
            cloudTmpl.descricao ||
            cloudTmpl.description ||
            "Rotina sincronizada da nuvem",
          icon: "sparkles",
          color: "#34D399",
          items: [],
        });
        result.downloadedTemplates++;
      }
    });
  } catch (err) {
    console.warn("Aviso ao sincronizar templates no Firestore:", err);
  }

  // ========================================================
  // 5. Sincronização de Conquistas (UnlockedAchievement.kt)
  // ========================================================
  let mergedAchievements: Achievement[] = [...localAchievements];
  try {
    const achSnapshot = await getDocs(achievementsColRef);
    const cloudUnlockedSet = new Map<string, any>();
    achSnapshot.forEach((d) => {
      const data = d.data();
      const achId = data.achievementId || d.id;
      cloudUnlockedSet.set(achId, data);
    });

    const achBatch = writeBatch(firestore);
    localAchievements.forEach((ach) => {
      if (ach.unlocked && !cloudUnlockedSet.has(ach.id)) {
        const achDocRef = doc(achievementsColRef, ach.id);
        achBatch.set(achDocRef, {
          achievementId: ach.id,
          dateUnlocked: new Date(),
        });
        result.syncedAchievements++;
      }
    });
    await achBatch.commit();

    mergedAchievements = localAchievements.map((ach) => {
      if (!ach.unlocked && cloudUnlockedSet.has(ach.id)) {
        result.syncedAchievements++;
        return {
          ...ach,
          unlocked: true,
          progress: ach.maxProgress,
          unlockedAt: new Date().toISOString().slice(0, 10),
        };
      }
      return ach;
    });
  } catch (err) {
    console.warn("Aviso ao sincronizar conquistas no Firestore:", err);
  }

  // ========================================================
  // 6. Sincronização do Inventário de Mercado (MarketRepository.kt)
  // ========================================================
  let mergedMarketItems: MarketItem[] = [...localMarketItems];
  try {
    const inventorySnapshot = await getDocs(inventoryColRef);
    const cloudInventorySet = new Set<string>();
    inventorySnapshot.forEach((d) => cloudInventorySet.add(d.id));

    const inventoryBatch = writeBatch(firestore);
    let newItems = 0;
    localMarketItems.forEach((item) => {
      if (item.isOwned && !cloudInventorySet.has(item.id)) {
        const itemDocRef = doc(inventoryColRef, item.id);
        inventoryBatch.set(itemDocRef, {
          purchasedAt: Date.now(),
        });
        cloudInventorySet.add(item.id);
        newItems++;
      }
    });
    if (newItems > 0) {
      await inventoryBatch.commit();
    }

    mergedMarketItems = localMarketItems.map((item) => ({
      ...item,
      isOwned: item.isOwned || cloudInventorySet.has(item.id),
    }));
  } catch (err) {
    console.warn("Aviso ao sincronizar inventário no Firestore:", err);
  }

  // ========================================================
  // 7. Sincronização do Documento Raiz do Usuário (UserData.kt)
  // ========================================================
  let mergedUserProfile: UserProfile | undefined = localUserProfile
    ? { ...localUserProfile }
    : undefined;

  try {
    const userDocSnap = await getDoc(userDocRef);
    const cloudUserData = userDocSnap.exists() ? userDocSnap.data() : {};

    if (mergedUserProfile) {
      const cloudPoints =
        typeof cloudUserData?.points === "number" ? cloudUserData.points : 0;
      const cloudStreak =
        typeof cloudUserData?.streak === "number" ? cloudUserData.streak : 0;
      const mergedPoints = Math.max(mergedUserProfile.totalPoints, cloudPoints);
      const mergedStreak = Math.max(mergedUserProfile.currentStreak, cloudStreak);

      const cloudDisplayName = cloudUserData?.display_name;
      const cloudEmail = cloudUserData?.email;

      const mergedName =
        mergedUserProfile.name &&
        mergedUserProfile.name !== "Fabrício Lima" &&
        mergedUserProfile.name !== "Usuário"
          ? mergedUserProfile.name
          : cloudDisplayName || mergedUserProfile.name;

      const mergedEmail =
        mergedUserProfile.email &&
        mergedUserProfile.email !== "fabricio@momentus.app" &&
        mergedUserProfile.email !== "contato@momentusapp.com.br"
          ? mergedUserProfile.email
          : cloudEmail || mergedUserProfile.email;

      mergedUserProfile = {
        ...mergedUserProfile,
        name: mergedName,
        email: mergedEmail,
        totalPoints: mergedPoints,
        currentStreak: mergedStreak,
      };

      // MANTÉM RIGOROSAMENTE APENAS OS CAMPOS DE UserData.kt:
      // display_name, email, points, streak, terms_accepted, terms_accepted_version
      const userProfilePayload: Record<string, any> = {
        display_name: mergedName || null,
        email: mergedEmail || null,
        points: mergedPoints,
        streak: mergedStreak,
        terms_accepted: true,
        terms_accepted_version: 1,
      };

      // Limpa os campos extras legados que causam crash no app nativo Kotlin:
      const nonNativeFields = [
        "bestStreak",
        "currentStreak",
        "focusMinutesToday",
        "lastSyncAt",
        "totalCompleted",
        "purchased_stickers",
        "photo_url",
        "clearedAt",
      ];

      for (const field of nonNativeFields) {
        if (field in cloudUserData) {
          userProfilePayload[field] = deleteField();
        }
      }

      await setDoc(userDocRef, userProfilePayload, { merge: true });
    }
  } catch (err) {
    console.warn("Aviso ao sincronizar perfil do usuário no Firestore:", err);
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
    INVENTORY_COLLECTION,
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
      // Subcoleção pode não conter documentos
    }
  }

  try {
    const userDocSnap = await getDoc(userDocRef);
    const cloudData = userDocSnap.exists() ? userDocSnap.data() : {};

    const resetPayload: Record<string, any> = {
      display_name: null,
      email: null,
      points: 0,
      streak: 0,
      terms_accepted: true,
      terms_accepted_version: 1,
    };

    const extraFields = [
      "bestStreak",
      "currentStreak",
      "focusMinutesToday",
      "lastSyncAt",
      "totalCompleted",
      "purchased_stickers",
      "photo_url",
      "clearedAt",
    ];

    for (const f of extraFields) {
      if (f in cloudData) {
        resetPayload[f] = deleteField();
      }
    }

    await setDoc(userDocRef, resetPayload, { merge: true });
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

/**
 * Salva ou atualiza uma categoria e sua meta no Firestore do usuário.
 */
export async function saveCategoryToFirestore(
  userId: string,
  category: Category,
): Promise<void> {
  try {
    const userDocRef = doc(firestore, "users", userId);
    const catDocRef = doc(collection(userDocRef, CATEGORIES_COLLECTION), category.id);
    await setDoc(catDocRef, {
      id: category.id,
      nome: category.name,
      descricao: null,
      duracaoPadraoMinutos: 60,
      cor: category.color || "#616161",
      tag: null,
      stickerId: category.stickerId || null,
      lastUpdated: new Date(),
    });

    const metaDocRef = doc(collection(userDocRef, "metas"), category.id);
    if (category.metaMinutosSemanal != null && category.metaMinutosSemanal > 0) {
      await setDoc(metaDocRef, {
        categoryId: category.id,
        metaMinutosSemanal: category.metaMinutosSemanal,
      });
    } else {
      try {
        await deleteDoc(metaDocRef);
      } catch {}
    }
  } catch (err) {
    console.warn("Erro ao salvar categoria no Firestore:", err);
  }
}

/**
 * Remove uma categoria e sua respectiva meta do Firestore.
 */
export async function deleteCategoryFromFirestore(
  userId: string,
  categoryId: string,
): Promise<void> {
  try {
    const userDocRef = doc(firestore, "users", userId);
    const catDocRef = doc(collection(userDocRef, CATEGORIES_COLLECTION), categoryId);
    const metaDocRef = doc(collection(userDocRef, "metas"), categoryId);
    await deleteDoc(catDocRef);
    try {
      await deleteDoc(metaDocRef);
    } catch {}
  } catch (err) {
    console.warn("Erro ao excluir categoria do Firestore:", err);
  }
}

