import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useColorScheme, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  HabitItem,
  Category,
  RoutineTemplate,
  Achievement,
  MarketItem,
  UserProfile,
  AppSettings,
} from '@/types';
import {
  INITIAL_CATEGORIES,
  INITIAL_HABITS,
  INITIAL_TEMPLATES,
  INITIAL_ACHIEVEMENTS,
  INITIAL_MARKET_ITEMS,
  INITIAL_USER_PROFILE,
  INITIAL_SETTINGS,
  getTodayDateString,
  getFullyCompletedDates,
  calculateStreakFromCompletedDays,
} from '@/constants/initialData';
import { calculateUserLevel, UserLevelInfo } from '@/domain/userLevel';
import { soundManager } from '@/util/soundManager';
import { MomentusColors } from '@/constants/theme';
import { CelebrationModal } from '@/components/momentus/CelebrationModal';
import { ReminderModal } from '@/components/momentus/ReminderModal';
import { WebAlertModal } from '@/components/momentus/WebAlertModal';
import {
  scheduleHabitNotifications,
  cancelHabitNotifications,
  cancelAllNotifications,
  requestNotificationPermissions,
  snoozeHabitNotification,
  subscribeToHabitNotificationResponses,
} from '@/services/notificationService';
import {
  syncHabitToDeviceCalendar,
  deleteHabitFromDeviceCalendar,
  syncAllHabitsToCalendar,
} from '@/services/calendarService';
import {
  getAllCategories,
  setAllCategoriesDb,
  getAllHabits,
  setAllHabitsDb,
  deleteHabitDb,
  deleteMultipleHabitsDb,
  getAllTemplates,
  setAllTemplatesDb,
  deleteTemplateDb,
  getAllAchievements,
  setAllAchievementsDb,
  getAllMarketItems,
  setAllMarketItemsDb,
  getAppKv,
  setAppKv,
  clearEntireDatabase,
} from '@/database/momentusDb';
import {
  exportMomentusBackup,
  importMomentusBackup,
} from '@/services/backupService';
import { auth as firebaseAuth } from '@/config/firebase';
import { logoutUser } from '@/services/authService';
import {
  syncWithFirestore,
  clearCloudData,
  saveCategoryToFirestore,
  deleteCategoryFromFirestore,
  saveTemplateToFirestore,
  deleteTemplateFromFirestore,
  saveTermsAcceptance,
  saveHabitToFirestore,
  deleteHabitFromFirestore,
  saveHabitCompletionToFirestore,
  saveUserProfileToFirestore,
} from '@/services/firestoreSyncService';
import { CURRENT_TERMS_VERSION } from '@/constants/legalContent';
import { onAuthStateChanged } from 'firebase/auth';

export interface AppTheme {
  isDark: boolean;
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  outline: string;
  textPrimary: string;
  textSecondary: string;
  primary: string;
  glassCard: string;
  glassBorder: string;
}

interface MomentusContextData {
  habits: HabitItem[];
  categories: Category[];
  templates: RoutineTemplate[];
  achievements: Achievement[];
  marketItems: MarketItem[];
  userProfile: UserProfile;
  userLevel: UserLevelInfo;
  settings: AppSettings;
  theme: AppTheme;
  isLoaded: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  // Celebration Lottie Actions
  celebration: {
    visible: boolean;
    title: string;
    message: string;
    pointsEarned?: number;
  } | null;
  showCelebration: (title: string, message: string, pointsEarned?: number) => void;
  hideCelebration: () => void;
  // Habits Actions
  toggleHabit: (id: string) => void;
  addHabit: (habit: Omit<HabitItem, 'id' | 'completed' | 'streak'>) => void;
  deleteHabit: (id: string) => void;
  deleteMultipleHabits: (ids: string[]) => void;
  updateHabit: (habit: HabitItem) => void;
  // Templates Actions
  applyTemplateToToday: (templateId: string) => void;
  applyTemplateToDates: (templateId: string, dates: string[], saveToGoogle?: boolean) => void;
  addTemplate: (template: Omit<RoutineTemplate, 'id'>) => void;
  updateTemplate: (template: RoutineTemplate) => void;
  deleteTemplate: (id: string) => void;
  // Categories Actions
  upsertCategory: (
    id: string | null,
    name: string,
    color: string,
    stickerId: string | null,
    metaMinutosSemanal: number | null
  ) => void;
  deleteCategory: (id: string) => void;
  // Market Actions
  buyMarketItem: (itemId: string) => boolean;
  // Focus Actions
  addFocusMinutes: (minutes: number) => void;
  // Haptics Action
  triggerHaptic: (type: 'impact' | 'success') => void;
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  clearAllLocalData: () => void;
  clearCloudDataAction: () => Promise<boolean>;
  syncAllHabitsToCalendarAction: () => Promise<number>;
  exportBackupAction: () => Promise<boolean>;
  importBackupAction: () => Promise<boolean>;
  // Auth Actions
  login: (email: string, name?: string, photoUrl?: string | null) => void;
  logout: () => void;
  syncCloudAction: (targetUid?: string) => Promise<void>;
  // Legal Actions
  acceptTermsAction: () => Promise<void>;
  declineTermsAction: () => Promise<void>;
  isTermsAccepted: () => boolean;
}

const STORAGE_KEY = '@momentus_state_v2';

const MomentusContext = createContext<MomentusContextData>({} as MomentusContextData);

export const MomentusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [habits, setHabits] = useState<HabitItem[]>(INITIAL_HABITS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [templates, setTemplates] = useState<RoutineTemplate[]>(INITIAL_TEMPLATES);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [marketItems, setMarketItems] = useState<MarketItem[]>(INITIAL_MARKET_ITEMS);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Dynamic Theme (Light, Dark, System)
  const systemColorScheme = useColorScheme();
  const isDark = useMemo(() => {
    const mode = (settings.themeMode || 'dark').toLowerCase();
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return systemColorScheme !== 'light';
  }, [settings.themeMode, systemColorScheme]);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  const theme: AppTheme = useMemo(
    () => ({
      isDark,
      background: isDark ? MomentusColors.navyBackground : '#F8FAFC',
      surface: isDark ? MomentusColors.navySurface : '#FFFFFF',
      surfaceElevated: isDark ? MomentusColors.navyCardElevated : '#F1F5F9',
      card: isDark ? MomentusColors.navyCard : '#FFFFFF',
      outline: isDark ? MomentusColors.navyOutline : '#E2E8F0',
      textPrimary: isDark ? MomentusColors.textPrimary : '#0F172A',
      textSecondary: isDark ? MomentusColors.textSecondary : '#64748B',
      primary: primaryColor,
      glassCard: isDark ? 'rgba(30, 41, 59, 0.75)' : 'rgba(255, 255, 255, 0.90)',
      glassBorder: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    }),
    [isDark, primaryColor]
  );

  // Celebration state
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    title: string;
    message: string;
    pointsEarned?: number;
  } | null>(null);

  // Reminder Modal state (equivalente ao ReminderActivity.kt)
  const [reminderPrompt, setReminderPrompt] = useState<{
    visible: boolean;
    habitId: string;
    habitTitle: string;
  } | null>(null);

  // Ref para permitir chamada segura de syncCloudAction a partir de callbacks externos
  const syncCloudActionRef = useRef<(targetUid?: string) => Promise<void>>(async () => {});
  const lastLoadedUid = useRef<string | null>(null);

  const showCelebration = (title: string, message: string, pointsEarned?: number) => {
    setCelebration({ visible: true, title, message, pointsEarned });
  };

  const hideCelebration = () => {
    setCelebration(null);
  };

  const formatBackupTimestamp = (): string => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `Hoje às ${hours}:${mins}`;
  };

  // Sync sound settings with SoundManager
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load state: SQLite first, with seamless migration from legacy AsyncStorage
  useEffect(() => {
    async function loadState() {
      try {
        // 1. Aguarda a restauração completa da sessão de autenticação do Firebase (evita deslogar ao recarregar F5)
        if (typeof (firebaseAuth as any).authStateReady === 'function') {
          await (firebaseAuth as any).authStateReady().catch(() => {});
        }

        // 2. Tenta carregar dados das tabelas locais (SQLite ou AsyncStorage no Web)
        const dbCategories = await getAllCategories();
        const dbHabits = await getAllHabits();
        const dbTemplates = await getAllTemplates();
        const dbAchievements = await getAllAchievements();
        const dbMarketItems = await getAllMarketItems();
        const dbUserProfile = await getAppKv<UserProfile>('user_profile');
        const dbSettings = await getAppKv<AppSettings>('app_settings');

        // Carrega também estado prévio do AsyncStorage para migração suave
        const savedAsync = await AsyncStorage.getItem(STORAGE_KEY);
        const legacyParsed = savedAsync ? JSON.parse(savedAsync) : null;

        // Configurações e aceite dos termos: prioriza o que está persistido localmente e nunca reseta
        const effectiveSettings: AppSettings = dbSettings || legacyParsed?.settings || INITIAL_SETTINGS;
        setSettings(effectiveSettings);
        await setAppKv('app_settings', effectiveSettings).catch(() => {});

        // Perfil do usuário: restaura nome, foto e status
        const effectiveProfile: UserProfile = dbUserProfile || legacyParsed?.userProfile || INITIAL_USER_PROFILE;
        const currentAuth = firebaseAuth.currentUser;
        if (currentAuth?.uid) {
          lastLoadedUid.current = currentAuth.uid;
        }
        const enrichedProfile: UserProfile = {
          ...effectiveProfile,
          ...(currentAuth
            ? {
                name: currentAuth.displayName || effectiveProfile.name,
                email: currentAuth.email || effectiveProfile.email,
                photoUrl: currentAuth.photoURL ?? effectiveProfile.photoUrl,
                isLoggedIn: true,
              }
            : effectiveProfile.isLoggedIn
            ? { isLoggedIn: true }
            : {}),
        };
        setUserProfile(enrichedProfile);
        await setAppKv('user_profile', enrichedProfile).catch(() => {});

        const LEGACY_MOCK_CAT_IDS = new Set([
          'cat-saude',
          'cat-trabalho',
          'cat-estudos',
          'cat-fitness',
          'cat-pessoal',
        ]);
        const LEGACY_MOCK_TMPL_IDS = new Set([
          'tmpl-matinal',
          'tmpl-foco',
          'tmpl-noturno',
        ]);

        let cleanCats = dbCategories.filter((c) => !LEGACY_MOCK_CAT_IDS.has(c.id));
        if (cleanCats.length === 0 && legacyParsed?.categories) {
          cleanCats = (legacyParsed.categories as Category[]).filter((c) => !LEGACY_MOCK_CAT_IDS.has(c.id));
        }
        if (cleanCats.length === 0) {
          cleanCats = INITIAL_CATEGORIES;
        }

        // Deduplica Outros se existirem múltiplos (ex: vindo do nativo com UUID e do multi com cat-outros)
        const outrosCats = cleanCats.filter((c) => c.name.trim().toLowerCase() === 'outros');
        let canonicalOutrosId = 'cat-outros';
        const duplicateOutrosIds = new Set<string>();
        if (outrosCats.length > 0) {
          const preferredOutros = outrosCats.find((c) => c.id !== 'cat-outros') || outrosCats[0];
          canonicalOutrosId = preferredOutros.id;
          outrosCats.forEach((c) => {
            if (c.id !== canonicalOutrosId) {
              duplicateOutrosIds.add(c.id);
            }
          });
          cleanCats = cleanCats.filter((c) => !duplicateOutrosIds.has(c.id));
        }

        setCategories(cleanCats);
        await setAllCategoriesDb(cleanCats).catch(() => {});

        const LEGACY_MOCK_HABIT_IDS = new Set(['h-1', 'h-2', 'h-3', 'h-4']);
        const LEGACY_MOCK_HABIT_TITLES = new Set([
          'beber 2l de água',
          'beber 2l de agua',
          'leitura 20 minutos',
          'treino ou caminhada',
          'meditação mindfulness',
          'meditacao mindfulness',
        ]);

        const rawHab: HabitItem[] = dbHabits.length > 0 ? dbHabits : (legacyParsed?.habits || []);
        const initialHab = rawHab
          .filter(
            (h: HabitItem) =>
              !LEGACY_MOCK_HABIT_IDS.has(h.id) &&
              !LEGACY_MOCK_HABIT_TITLES.has(h.title.trim().toLowerCase())
          )
          .map((h: HabitItem) =>
            duplicateOutrosIds.has(h.categoryId)
              ? { ...h, categoryId: canonicalOutrosId }
              : h
          );

        setHabits(initialHab);

        // Recalcula estritamente os dias 100% concluídos e o streak real a partir do histórico
        const initialCompletedDays = getFullyCompletedDates(initialHab);
        const realTotalCompleted = initialCompletedDays.length;
        const realStreak = calculateStreakFromCompletedDays(initialCompletedDays, getTodayDateString());

        setUserProfile((p) => ({
          ...p,
          totalCompleted: realTotalCompleted,
          currentStreak: realStreak,
          bestStreak: Math.max(p.bestStreak, realStreak),
        }));

        const cleanTemplates = (dbTemplates.length > 0 ? dbTemplates : (legacyParsed?.templates || [])).filter(
          (t: RoutineTemplate) => !LEGACY_MOCK_TMPL_IDS.has(t.id)
        );
        setTemplates(cleanTemplates);

        const cleanAchievements =
          dbAchievements.length > 0
            ? dbAchievements
            : (legacyParsed?.achievements || INITIAL_ACHIEVEMENTS);
        setAchievements(cleanAchievements);

        const cleanMarketItems =
          dbMarketItems.length > 0
            ? dbMarketItems
            : (legacyParsed?.marketItems || INITIAL_MARKET_ITEMS);
        setMarketItems(cleanMarketItems);
      } catch (e) {
        console.warn('Erro ao carregar dados do banco:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadState();
    // Solicita permissões de notificação e configura os canais no início
    requestNotificationPermissions().catch(() => {});

    // Observa mudanças de autenticação do Firebase e sincroniza automaticamente
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setUserProfile((prev) => ({
          ...prev,
          isLoggedIn: false,
        }));
        return;
      }

      // Se havia um usuário logado e houve troca para outra conta, limpa cache local da anterior
      if (lastLoadedUid.current && lastLoadedUid.current !== user.uid) {
        await clearEntireDatabase().catch(() => {});
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        setHabits([]);
        setCategories(INITIAL_CATEGORIES);
        setTemplates([]);
        setAchievements(INITIAL_ACHIEVEMENTS);
        setMarketItems(INITIAL_MARKET_ITEMS);
      }
      lastLoadedUid.current = user.uid;

      const activeName =
        user.displayName?.trim() ||
        (user.email ? user.email.split('@')[0] : 'Usuário');
      const activeEmail = user.email || '';
      const activePhoto = user.photoURL || null;

      setUserProfile((prev) => {
        const nextProfile: UserProfile = {
          ...prev,
          email: activeEmail || prev.email,
          name: activeName !== 'Usuário' ? activeName : (prev.name !== 'Usuário' ? prev.name : 'Usuário'),
          photoUrl: activePhoto ?? prev.photoUrl,
          isLoggedIn: true,
        };
        setAppKv('user_profile', nextProfile).catch(() => {});
        return nextProfile;
      });

      try {
        // Sincroniza dados da nuvem (Firestore) do usuário recém-autenticado
        await syncCloudActionRef.current(user.uid);
      } catch (syncErr) {
        console.warn('[AUTH] Aviso ao sincronizar nuvem no onAuthStateChanged:', syncErr);
      }
    });

    // Sincronização periódica a cada 60 segundos com a nuvem (equivalente ao SyncWorker.kt)
    const periodicSyncTimer = setInterval(() => {
      const activeUid = firebaseAuth.currentUser?.uid;
      if (activeUid) {
        syncCloudActionRef.current(activeUid).catch(() => {});
      }
    }, 60000);

    return () => {
      unsubAuth();
      clearInterval(periodicSyncTimer);
    };
  }, []);

  // Persistência contínua: grava no SQLite e mantém AsyncStorage sincronizado
  useEffect(() => {
    if (!isLoaded) return;
    async function saveState() {
      try {
        // Grava no SQLite
        await setAllCategoriesDb(categories);
        await setAllHabitsDb(habits);
        await setAllTemplatesDb(templates);
        await setAllAchievementsDb(achievements);
        await setAllMarketItemsDb(marketItems);
        await setAppKv('user_profile', userProfile);
        await setAppKv('app_settings', settings);

        // Mantém backup de contingência no AsyncStorage
        const data = {
          habits,
          categories,
          templates,
          achievements,
          marketItems,
          userProfile,
          settings,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Erro ao persistir dados do Momentus:', e);
      }
    }
    saveState();
  }, [habits, categories, templates, achievements, marketItems, userProfile, settings, isLoaded]);

  const userLevel = calculateUserLevel(userProfile.totalPoints);

  const triggerHaptic = (type: 'impact' | 'success') => {
    if (!settings.hapticsEnabled) return;
    try {
      if (type === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {}
  };

  const addPoints = (points: number) => {
    setUserProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints + points,
    }));
  };

  /**
   * Implementação exata das regras de CheckAndUnlockAchievementsUseCase.kt
   */
  const checkAndUnlockAchievements = (
    streakCount: number,
    totalCompleted: number,
    totalTemplates: number
  ) => {
    setAchievements((prev) => {
      let newlyUnlocked = false;
      const updated = prev.map((ach) => {
        if (ach.unlocked) return ach;

        let shouldUnlock = false;
        let progress = ach.progress;

        switch (ach.id) {
          case 'FIRST_HABIT':
            progress = totalCompleted;
            if (totalCompleted >= 1) shouldUnlock = true;
            break;
          case 'COMPLETED_10':
            progress = totalCompleted;
            if (totalCompleted >= 10) shouldUnlock = true;
            break;
          case 'COMPLETED_50':
            progress = totalCompleted;
            if (totalCompleted >= 50) shouldUnlock = true;
            break;
          case 'COMPLETED_100':
            progress = totalCompleted;
            if (totalCompleted >= 100) shouldUnlock = true;
            break;
          case 'STREAK_3':
            progress = streakCount;
            if (streakCount >= 3) shouldUnlock = true;
            break;
          case 'STREAK_7':
            progress = streakCount;
            if (streakCount >= 7) shouldUnlock = true;
            break;
          case 'STREAK_30':
            progress = streakCount;
            if (streakCount >= 30) shouldUnlock = true;
            break;
          case 'FIRST_TEMPLATE':
            progress = totalTemplates;
            if (totalTemplates >= 1) shouldUnlock = true;
            break;
        }

        if (shouldUnlock) {
          newlyUnlocked = true;
          addPoints(ach.xpReward);
          showCelebration(
            'Conquista Desbloqueada! 🏆',
            `Você desbloqueou a medalha: "${ach.title}"`,
            ach.xpReward
          );
          return {
            ...ach,
            progress: ach.maxProgress,
            unlocked: true,
            unlockedAt: getTodayDateString(),
          };
        }

        return {
          ...ach,
          progress: Math.min(ach.maxProgress, progress),
        };
      });

      if (newlyUnlocked) {
        soundManager.playAchievementSound();
        triggerHaptic('success');
      }

      return updated;
    });
  };

  const toggleHabit = (id: string) => {
    let nextCompleted = false;
    let targetDate = '';
    let shouldCelebrateDay = false;
    let nextTotalCompleted = userProfile.totalCompleted;
    let nextStreak = userProfile.currentStreak;

    setHabits((prev) => {
      const targetHabit = prev.find((h) => h.id === id);
      if (!targetHabit) return prev;
      nextCompleted = !targetHabit.completed;
      targetDate = targetHabit.date;

      const updated = prev.map((habit) => {
        if (habit.id === id) {
          if (nextCompleted) {
            soundManager.playSuccessSound();
            triggerHaptic('success');
            cancelHabitNotifications(habit.id).catch(() => {});
          } else {
            triggerHaptic('impact');
            scheduleHabitNotifications({ ...habit, completed: false }).catch(() => {});
          }
          return {
            ...habit,
            completed: nextCompleted,
            streak: nextCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1),
          };
        }
        return habit;
      });

      // Um dia concluído só é computado se 100% das rotinas planejadas daquele dia foram finalizadas
      const fullyCompletedDates = getFullyCompletedDates(updated);
      nextTotalCompleted = fullyCompletedDates.length;
      nextStreak = calculateStreakFromCompletedDays(fullyCompletedDates, getTodayDateString());

      if (nextCompleted && targetDate) {
        const dayHabits = updated.filter((h) => h.date === targetDate);
        if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
          shouldCelebrateDay = true;
        }
      }

      setUserProfile((p) => {
        const deltaPoints = (nextCompleted ? 15 : -15) + (shouldCelebrateDay ? 25 : 0);
        const nextPoints = Math.max(0, p.totalPoints + deltaPoints);
        const nextBestStreak = Math.max(p.bestStreak, nextStreak);
        const nextProfile: UserProfile = {
          ...p,
          totalPoints: nextPoints,
          totalCompleted: nextTotalCompleted,
          currentStreak: nextStreak,
          bestStreak: nextBestStreak,
        };

        const currentUserId = firebaseAuth.currentUser?.uid;
        if (currentUserId) {
          saveUserProfileToFirestore(currentUserId, {
            totalPoints: nextPoints,
            totalCompleted: nextTotalCompleted,
            currentStreak: nextStreak,
            bestStreak: nextBestStreak,
          }).catch(() => {});
        }

        return nextProfile;
      });

      return updated;
    });

    if (shouldCelebrateDay) {
      showCelebration(
        'Dia Conquistado! 🌟',
        'Parabéns! Você concluiu 100% das suas tarefas planejadas.',
        25
      );
    }

    checkAndUnlockAchievements(nextStreak, nextTotalCompleted, templates.length);

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitCompletionToFirestore(
        currentUserId,
        id,
        targetDate || getTodayDateString(),
        nextCompleted
      ).catch((err) =>
        console.warn('Erro ao salvar conclusão no Firestore:', err)
      );
      const currentHabit = habits.find((h) => h.id === id);
      if (currentHabit) {
        saveHabitToFirestore(currentUserId, {
          ...currentHabit,
          completed: nextCompleted,
          streak: nextCompleted ? currentHabit.streak + 1 : Math.max(0, currentHabit.streak - 1),
        }).catch((err) =>
          console.warn('Erro ao salvar hábito alterado no Firestore:', err)
        );
      }
    }
  };

  const addHabit = (habitData: Omit<HabitItem, 'id' | 'completed' | 'streak'>) => {
    const newHabit: HabitItem = {
      ...habitData,
      id: `h-${Date.now()}`,
      completed: false,
      streak: 0,
    };

    setHabits((prev) => [newHabit, ...prev]);
    triggerHaptic('success');

    // 1. Grava no Firestore atomicamente
    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitToFirestore(currentUserId, newHabit).catch((err) =>
        console.warn('Erro ao salvar hábito criado no Firestore:', err)
      );
    }

    // 2. Agendar notificações locais (início e término)
    scheduleHabitNotifications(newHabit).catch(() => {});

    // 3. Sincronizar com calendário nativo se solicitado
    const shouldSyncCalendar = newHabit.saveToGoogle ?? settings.googleCalendarSyncEnabled;
    if (shouldSyncCalendar) {
      const category = categories.find((c) => c.id === newHabit.categoryId);
      syncHabitToDeviceCalendar(newHabit, category)
        .then((eventId) => {
          if (eventId) {
            setHabits((prev) =>
              prev.map((h) => (h.id === newHabit.id ? { ...h, googleCalendarEventId: eventId, saveToGoogle: true } : h))
            );
          }
        })
        .catch(() => {});
    }
  };

  const deleteHabit = (id: string) => {
    const habitToDelete = habits.find((h) => h.id === id);
    if (habitToDelete) {
      cancelHabitNotifications(id).catch(() => {});
      if (habitToDelete.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(habitToDelete.googleCalendarEventId).catch(() => {});
      }
    }
    setHabits((prev) => prev.filter((h) => h.id !== id));
    deleteHabitDb(id).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      deleteHabitFromFirestore(currentUserId, id).catch((err) =>
        console.warn('Erro ao excluir hábito no Firestore:', err)
      );
    }
  };

  const deleteMultipleHabits = (ids: string[]) => {
    const idSet = new Set(ids);
    const toDelete = habits.filter((h) => idSet.has(h.id));
    toDelete.forEach((h) => {
      cancelHabitNotifications(h.id).catch(() => {});
      if (h.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(h.googleCalendarEventId).catch(() => {});
      }
    });
    setHabits((prev) => prev.filter((h) => !idSet.has(h.id)));
    deleteMultipleHabitsDb(ids).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      ids.forEach((id) => {
        deleteHabitFromFirestore(currentUserId, id).catch((err) =>
          console.warn('Erro ao excluir múltiplos hábitos no Firestore:', err)
        );
      });
    }
  };

  const updateHabit = (updated: HabitItem) => {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitToFirestore(currentUserId, updated).catch((err) =>
        console.warn('Erro ao atualizar hábito no Firestore:', err)
      );
    }

    // Atualiza notificações agendadas
    cancelHabitNotifications(updated.id)
      .then(() => {
        if (!updated.completed) {
          return scheduleHabitNotifications(updated);
        }
      })
      .catch(() => {});

    // Atualiza evento no calendário se aplicável
    if (updated.saveToGoogle || updated.googleCalendarEventId) {
      const category = categories.find((c) => c.id === updated.categoryId);
      syncHabitToDeviceCalendar(updated, category)
        .then((eventId) => {
          if (eventId && eventId !== updated.googleCalendarEventId) {
            setHabits((prev) =>
              prev.map((h) => (h.id === updated.id ? { ...h, googleCalendarEventId: eventId } : h))
            );
          }
        })
        .catch(() => {});
    }
  };

  const applyTemplateToToday = (templateId: string) => {
    applyTemplateToDates(templateId, [getTodayDateString()]);
  };

  const applyTemplateToDates = (templateId: string, dates: string[], saveToGoogle?: boolean) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || dates.length === 0) return;

    const willSaveToCalendar = saveToGoogle ?? settings.googleCalendarSyncEnabled ?? false;
    const newHabits: HabitItem[] = [];

    // Filtra eventos duplicados no template (conforme TemplateViewModel.kt)
    const uniqueTemplateItems = template.items.filter(
      (item, idx, self) =>
        idx === self.findIndex((t) => `${t.title}-${t.timeStart}-${t.categoryId}` === `${item.title}-${item.timeStart}-${item.categoryId}`)
    );

    dates.forEach((targetDate) => {
      uniqueTemplateItems.forEach((item) => {
        const deterministicId = `applied_${item.id}_${targetDate}`;
        newHabits.push({
          id: deterministicId,
          title: item.title,
          description: item.description || undefined,
          timeStart: item.timeStart || '08:00',
          timeEnd: item.timeEnd,
          categoryId: item.categoryId,
          completed: false,
          date: targetDate,
          streak: 0,
          saveToGoogle: willSaveToCalendar,
        });
      });
    });

    setHabits((prev) => {
      const prevMap = new Map(prev.map((p) => [p.id, p]));
      // Preserva o status de conclusão se o hábito já tinha sido concluído anteriormente
      const adjustedNewHabits = newHabits.map((nh) => {
        const existing = prevMap.get(nh.id);
        if (existing && existing.completed) {
          return {
            ...nh,
            completed: true,
          };
        }
        return nh;
      });

      const newHabitsMap = new Map(adjustedNewHabits.map((h) => [h.id, h]));
      const filteredPrev = prev.filter((p) => !newHabitsMap.has(p.id));
      return [...adjustedNewHabits, ...filteredPrev];
    });

    addPoints(20 * dates.length);
    soundManager.playSuccessSound();
    triggerHaptic('success');
    checkAndUnlockAchievements(userProfile.currentStreak, userProfile.totalCompleted, templates.length);

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId && newHabits.length > 0) {
      Promise.all(newHabits.map((h) => saveHabitToFirestore(currentUserId, h))).catch((err) =>
        console.warn('Erro ao salvar hábitos do template no Firestore:', err)
      );
    }

    // Agenda notificações para os novos hábitos
    newHabits.forEach((h) => {
      scheduleHabitNotifications(h).catch(() => {});
      if (willSaveToCalendar) {
        const cat = categories.find((c) => c.id === h.categoryId);
        syncHabitToDeviceCalendar(h, cat)
          .then((eventId) => {
            if (eventId) {
              setHabits((prev) =>
                prev.map((item) => (item.id === h.id ? { ...item, googleCalendarEventId: eventId } : item))
              );
            }
          })
          .catch(() => {});
      }
    });
  };

  const addTemplate = (templateData: Omit<RoutineTemplate, 'id'>) => {
    const newTemplate: RoutineTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
      lastUpdated: new Date().toISOString(),
    };
    const nextTemplates = [...templates, newTemplate];
    setTemplates(nextTemplates);
    triggerHaptic('success');
    checkAndUnlockAchievements(userProfile.currentStreak, userProfile.totalCompleted, nextTemplates.length);

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveTemplateToFirestore(currentUserId, newTemplate).catch((err) =>
        console.warn('Erro ao salvar template criado no Firestore:', err)
      );
    }
  };

  const updateTemplate = (updatedTemplate: RoutineTemplate) => {
    const enriched = {
      ...updatedTemplate,
      lastUpdated: new Date().toISOString(),
    };
    setTemplates((prev) => prev.map((t) => (t.id === enriched.id ? enriched : t)));
    triggerHaptic('success');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveTemplateToFirestore(currentUserId, enriched).catch((err) =>
        console.warn('Erro ao atualizar template no Firestore:', err)
      );
    }
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    deleteTemplateDb(id).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      deleteTemplateFromFirestore(currentUserId, id).catch((err) =>
        console.warn('Erro ao excluir template do Firestore:', err)
      );
    }
  };

  const upsertCategory = (
    id: string | null,
    name: string,
    color: string,
    stickerId: string | null,
    metaMinutosSemanal: number | null
  ) => {
    let targetCat: Category;
    if (id) {
      targetCat = {
        id,
        name,
        color,
        stickerId,
        metaMinutosSemanal,
      };
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? targetCat : c))
      );
    } else {
      targetCat = {
        id: `cat-${Date.now()}`,
        name,
        color,
        stickerId,
        metaMinutosSemanal,
      };
      setCategories((prev) => [...prev, targetCat]);
    }

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      saveCategoryToFirestore(currentUid, targetCat).catch(() => {});
    }

    triggerHaptic('success');
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      return remaining.length > 0 ? remaining : INITIAL_CATEGORIES;
    });

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      deleteCategoryFromFirestore(currentUid, id).catch(() => {});
    }

    triggerHaptic('impact');
  };

  const buyMarketItem = (itemId: string): boolean => {
    const item = marketItems.find((i) => i.id === itemId);
    if (!item || item.isOwned || userProfile.totalPoints < item.finalPrice) {
      return false;
    }

    setUserProfile((prev) => ({
      ...prev,
      totalPoints: prev.totalPoints - item.finalPrice,
    }));

    setMarketItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, isOwned: true } : i))
    );

    soundManager.playAchievementSound();
    triggerHaptic('success');
    return true;
  };

  const addFocusMinutes = (minutes: number) => {
    // 10 XP base por sessão concluída + 1 XP a cada 2 minutos de foco
    const sessionBonus = 10;
    const timeBonus = Math.floor(minutes / 2);
    const totalGained = sessionBonus + timeBonus;

    setUserProfile((prev) => {
      const updated = {
        ...prev,
        focusMinutesToday: prev.focusMinutesToday + minutes,
        totalPoints: prev.totalPoints + totalGained,
      };
      setAppKv('user_profile', updated).catch(() => {});
      return updated;
    });

    const uid = firebaseAuth.currentUser?.uid;
    if (uid) {
      saveUserProfileToFirestore(uid, {
        totalPoints: userProfile.totalPoints + totalGained,
      } as any).catch(() => {});
    }

    soundManager.playAchievementSound();
    triggerHaptic('success');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...newSettings };
      setAppKv('app_settings', next).catch(() => {});
      return next;
    });
  };

  const clearAllLocalData = () => {
    // Cancela todas as notificações locais agendadas
    cancelAllNotifications().catch(() => {});
    setHabits([]);
    setCategories(INITIAL_CATEGORIES);
    setTemplates(INITIAL_TEMPLATES);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMarketItems(INITIAL_MARKET_ITEMS);
    setUserProfile(INITIAL_USER_PROFILE);
    setSettings(INITIAL_SETTINGS);
    AsyncStorage.removeItem(STORAGE_KEY);
    clearEntireDatabase().catch(() => {});
    triggerHaptic('impact');
  };

  const clearCloudDataAction = async (): Promise<boolean> => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser?.uid) {
      return false;
    }
    const ok = await clearCloudData(currentUser.uid);
    if (ok) {
      triggerHaptic('impact');
    }
    return ok;
  };

  const exportBackupAction = async (): Promise<boolean> => {
    const backupTimestamp = formatBackupTimestamp();
    const updatedSettings = { ...settings, lastBackupAt: backupTimestamp };
    setSettings(updatedSettings);
    return exportMomentusBackup({
      habits,
      categories,
      templates,
      achievements,
      marketItems,
      userProfile,
      settings: updatedSettings,
    });
  };

  const importBackupAction = async (): Promise<boolean> => {
    const data = await importMomentusBackup();
    if (!data) return false;

    const backupTimestamp = formatBackupTimestamp();
    const nextSettings: AppSettings = {
      ...(data.settings || INITIAL_SETTINGS),
      lastBackupAt: backupTimestamp,
    };

    setHabits(data.habits || []);
    setCategories(data.categories || INITIAL_CATEGORIES);
    setTemplates(data.templates || INITIAL_TEMPLATES);
    setAchievements(data.achievements || INITIAL_ACHIEVEMENTS);
    setMarketItems(data.marketItems || INITIAL_MARKET_ITEMS);
    setUserProfile(data.userProfile || INITIAL_USER_PROFILE);
    setSettings(nextSettings);

    // Persiste imediatamente no SQLite e AsyncStorage
    await setAllCategoriesDb(data.categories || INITIAL_CATEGORIES);
    await setAllHabitsDb(data.habits || []);
    await setAllTemplatesDb(data.templates || INITIAL_TEMPLATES);
    await setAllAchievementsDb(data.achievements || INITIAL_ACHIEVEMENTS);
    await setAllMarketItemsDb(data.marketItems || INITIAL_MARKET_ITEMS);
    await setAppKv('user_profile', data.userProfile || INITIAL_USER_PROFILE);
    await setAppKv('app_settings', nextSettings);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, settings: nextSettings }));

    // Reagenda notificações para os novos hábitos importados
    cancelAllNotifications()
      .then(() => {
        (data.habits || []).forEach((h) => {
          if (!h.completed) {
            scheduleHabitNotifications(h).catch(() => {});
          }
        });
      })
      .catch(() => {});

    soundManager.playAchievementSound();
    triggerHaptic('success');
    return true;
  };

  const syncAllHabitsToCalendarAction = async (): Promise<number> => {
    const { syncedCount, updatedHabits } = await syncAllHabitsToCalendar(habits, categories);
    if (syncedCount > 0) {
      setHabits(updatedHabits);
    }
    return syncedCount;
  };

  const login = (email: string, name?: string, photoUrl?: string | null) => {
    setUserProfile((prev) => ({
      ...prev,
      email,
      name: name || email.split('@')[0],
      photoUrl: photoUrl !== undefined ? photoUrl : prev.photoUrl,
      isLoggedIn: true,
    }));
    triggerHaptic('success');
  };

  const logout = () => {
    lastLoadedUid.current = null;
    logoutUser().catch(() => {});
    clearEntireDatabase().catch(() => {});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setHabits([]);
    setCategories(INITIAL_CATEGORIES);
    setTemplates([]);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMarketItems(INITIAL_MARKET_ITEMS);
    setUserProfile(INITIAL_USER_PROFILE);
    triggerHaptic('impact');
  };

  const acceptTermsAction = async (): Promise<void> => {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;

    const nextSettings: AppSettings = {
      ...settings,
      termsAccepted: true,
      termsAcceptedVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: formattedDate,
    };

    setSettings(nextSettings);
    await setAppKv('app_settings', nextSettings);

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      try {
        await saveTermsAcceptance(currentUid, CURRENT_TERMS_VERSION);
      } catch (err) {
        console.warn('Erro ao salvar aceite de termos no Firestore:', err);
      }
    }

    soundManager.playSuccessSound();
    triggerHaptic('success');
  };

  const declineTermsAction = async (): Promise<void> => {
    logout();
  };

  const isTermsAccepted = (): boolean => {
    return (
      !!settings.termsAccepted &&
      (settings.termsAcceptedVersion ?? 0) >= CURRENT_TERMS_VERSION
    );
  };

  const syncCloudAction = async (targetUid?: string): Promise<void> => {
    const authUser = firebaseAuth.currentUser;
    const uid = targetUid || authUser?.uid;
    if (!uid) {
      if (userProfile.isLoggedIn) {
        const backupTimestamp = formatBackupTimestamp();
        const updatedSettings: AppSettings = {
          ...settings,
          lastBackupAt: backupTimestamp,
        };
        setSettings(updatedSettings);
        await setAppKv('app_settings', updatedSettings);
        return;
      }
      throw new Error('Faça login com sua conta Momentus para sincronizar os dados na nuvem.');
    }

    const currentProfileWithAuth: UserProfile = {
      ...userProfile,
      name:
        authUser?.displayName?.trim() ||
        (userProfile.name !== 'Usuário' ? userProfile.name : (authUser?.email ? authUser.email.split('@')[0] : 'Usuário')),
      email: authUser?.email || userProfile.email,
      photoUrl: authUser?.photoURL ?? userProfile.photoUrl,
      isLoggedIn: true,
    };

    const {
      mergedHabits,
      mergedCategories,
      mergedTemplates,
      mergedAchievements,
      mergedMarketItems,
      mergedUserProfile,
      cloudTermsAccepted,
      cloudTermsVersion,
    } = await syncWithFirestore(
      uid,
      habits,
      categories,
      templates,
      achievements,
      marketItems,
      currentProfileWithAuth
    );

    const backupTimestamp = formatBackupTimestamp();
    const termsAcceptedCombined = settings.termsAccepted || cloudTermsAccepted;
    const termsVersionCombined = Math.max(
      settings.termsAcceptedVersion ?? 0,
      cloudTermsVersion ?? 0
    );

    const updatedSettings: AppSettings = {
      ...settings,
      lastBackupAt: backupTimestamp,
      termsAccepted: termsAcceptedCombined,
      termsAcceptedVersion: termsVersionCombined,
    };

    let effectiveProfile = mergedUserProfile || currentProfileWithAuth;

    // Retro-crédito de XP de conquistas para usuários legados/migrados do app nativo
    const unlockedAchievements = mergedAchievements.filter((a) => a.unlocked);
    const expectedAchievementXp = unlockedAchievements.reduce(
      (acc, a) => acc + (a.xpReward || 0),
      0
    );

    const backfilledKey = `@momentus_achievements_xp_backfilled_${uid}`;
    const alreadyBackfilled = await AsyncStorage.getItem(backfilledKey);

    if (!alreadyBackfilled && expectedAchievementXp > 0) {
      if ((effectiveProfile.totalPoints || 0) < expectedAchievementXp) {
        const bonusPoints = expectedAchievementXp - (effectiveProfile.totalPoints || 0);
        effectiveProfile = {
          ...effectiveProfile,
          totalPoints: effectiveProfile.totalPoints + bonusPoints,
        };
        saveUserProfileToFirestore(uid, {
          totalPoints: effectiveProfile.totalPoints,
        } as any).catch(() => {});
      }
      await AsyncStorage.setItem(backfilledKey, 'true');
    }

    setHabits(mergedHabits);
    setCategories(mergedCategories);
    setTemplates(mergedTemplates);
    setAchievements(mergedAchievements);
    setMarketItems(mergedMarketItems);
    setUserProfile(effectiveProfile);
    setSettings(updatedSettings);

    await setAllHabitsDb(mergedHabits);
    await setAllCategoriesDb(mergedCategories);
    await setAllTemplatesDb(mergedTemplates);
    await setAllAchievementsDb(mergedAchievements);
    await setAllMarketItemsDb(mergedMarketItems);
    await setAppKv('user_profile', effectiveProfile);
    await setAppKv('app_settings', updatedSettings);
  };

  const toggleHabitRef = useRef(toggleHabit);
  useEffect(() => {
    toggleHabitRef.current = toggleHabit;
    syncCloudActionRef.current = syncCloudAction;
  });

  // Escuta interações com notificações (botões "Concluir" e "Adiar 15 min" ou toque para abrir ReminderModal)
  useEffect(() => {
    return subscribeToHabitNotificationResponses({
      onMarkCompleted: (habitId) => {
        const target = habits.find((h) => h.id === habitId);
        if (target && !target.completed) {
          toggleHabitRef.current(habitId);
        }
      },
      onSnooze15: (habitId, habitTitle) => {
        snoozeHabitNotification(habitId, habitTitle, 15).catch(() => {});
      },
      onDefaultTap: (habitId, habitTitle) => {
        setReminderPrompt({
          visible: true,
          habitId,
          habitTitle,
        });
      },
    });
  }, [habits]);

  return (
    <MomentusContext.Provider
      value={{
        habits,
        categories,
        templates,
        achievements,
        marketItems,
        userProfile,
        userLevel,
        settings,
        theme,
        isLoaded,
        selectedDate,
        setSelectedDate,
        celebration,
        showCelebration,
        hideCelebration,
        toggleHabit,
        addHabit,
        deleteHabit,
        deleteMultipleHabits,
        updateHabit,
        applyTemplateToToday,
        applyTemplateToDates,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        upsertCategory,
        deleteCategory,
        buyMarketItem,
        addFocusMinutes,
        triggerHaptic,
        updateSettings,
        clearAllLocalData,
        clearCloudDataAction,
        syncAllHabitsToCalendarAction,
        exportBackupAction,
        importBackupAction,
        login,
        logout,
        syncCloudAction,
        acceptTermsAction,
        declineTermsAction,
        isTermsAccepted,
      }}>
      {children}
      <WebAlertModal
        isDark={theme.isDark}
        primaryColor={settings.primaryColorHex || MomentusColors.emeraldNeon}
      />
      {celebration?.visible && (
        <CelebrationModal
          visible={celebration.visible}
          title={celebration.title}
          message={celebration.message}
          pointsEarned={celebration.pointsEarned}
          isDark={theme.isDark}
          primaryColor={settings.primaryColorHex || MomentusColors.emeraldNeon}
          onClose={hideCelebration}
        />
      )}
      {reminderPrompt?.visible && (
        <ReminderModal
          visible={reminderPrompt.visible}
          habitTitle={reminderPrompt.habitTitle}
          theme={theme}
          onComplete={() => {
            const target = habits.find((h) => h.id === reminderPrompt.habitId);
            if (target && !target.completed) {
              toggleHabit(reminderPrompt.habitId);
            }
            setReminderPrompt(null);
          }}
          onSnooze={() => {
            snoozeHabitNotification(reminderPrompt.habitId, reminderPrompt.habitTitle, 15).catch(
              () => {}
            );
            setReminderPrompt(null);
            Alert.alert('Lembrete Adiado ⏰', `"${reminderPrompt.habitTitle}" foi adiado em 15 minutos.`);
          }}
          onDismiss={() => setReminderPrompt(null)}
        />
      )}
    </MomentusContext.Provider>
  );
};

export const useMomentus = () => {
  const context = useContext(MomentusContext);
  if (!context) {
    throw new Error('useMomentus must be used within a MomentusProvider');
  }
  return context;
};

