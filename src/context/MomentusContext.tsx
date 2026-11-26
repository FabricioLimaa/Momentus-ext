import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useColorScheme, Alert, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as SystemUI from 'expo-system-ui';
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
import { MomentusLog } from '@/util/logger';
import {
  getSecureSession,
  saveSecureSession,
  clearSecureSession,
  setupSilentTokenRefresh,
} from '@/services/sessionService';
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
  syncHomeScreenWidgets,
  subscribeToWidgetInteractions,
  reconcilePendingWidgetToggles,
} from '@/services/widgetService';
import {
  syncHabitToDeviceCalendar,
  deleteHabitFromDeviceCalendar,
  syncAllHabitsToCalendar,
  fetchGoogleCalendarEvents,
  convertGoogleEventsToHabits,
  deduplicateHabits,
  GoogleCalendarEventItem,
} from '@/services/calendarService';
import {
  getAllCategories,
  upsertCategoryDb,
  setAllCategoriesDb,
  getAllHabits,
  upsertHabitDb,
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
  deleteMultipleHabitsFromFirestore,
  purchaseMarketItemInFirestore,
  saveHabitCompletionToFirestore,
  saveUserProfileToFirestore,
  saveAchievementUnlockedToFirestore,
  listenToFirestoreSync,
} from '@/services/firestoreSyncService';
import { CURRENT_TERMS_VERSION } from '@/constants/legalContent';
import { onAuthStateChanged } from 'firebase/auth';

export interface AppTheme {
  isDark: boolean;
  isOled: boolean;
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
  focusHistoryMap: Record<string, number>;
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
  applyTemplateToDates: (
    templateId: string,
    dates: string[],
    saveToGoogle?: boolean,
    mode?: 'merge' | 'incremental',
    timeShiftStart?: string
  ) => void;
  addTemplate: (template: Omit<RoutineTemplate, 'id'>) => void;
  updateTemplate: (template: RoutineTemplate) => void;
  deleteTemplate: (id: string) => void;
  // Categories Actions
  upsertCategory: (
    id: string | null,
    name: string,
    color: string,
    stickerId: string | null,
    metaMinutosSemanal: number | null,
    icon?: string | null
  ) => void;
  deleteCategory: (id: string) => void;
  // Market Actions
  buyMarketItem: (itemId: string) => boolean;
  // Focus Actions
  addFocusMinutes: (minutes: number) => void;
  // Haptics Action
  triggerHaptic: (type: 'light' | 'impact' | 'success' | 'selection') => void;
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateUserProfile: (profileUpdates: Partial<UserProfile>) => void;
  clearAllLocalData: () => void;
  clearCloudDataAction: () => Promise<boolean>;
  resetAllDataAndLogout: () => Promise<boolean>;
  syncAllHabitsToCalendarAction: () => Promise<number>;
  syncGoogleCalendarToHabitsAction: (targetDate?: string) => Promise<number>;
  fetchGoogleEventsAction: (targetDate?: string) => Promise<GoogleCalendarEventItem[]>;
  exportBackupAction: () => Promise<boolean>;
  importBackupAction: () => Promise<boolean>;
  // Auth Actions
  login: (email: string, name?: string, photoUrl?: string | null) => void;
  logout: () => Promise<void>;
  syncCloudAction: (targetUid?: string) => Promise<void>;
  isPostLoginActive: boolean;
  setIsPostLoginActive: (active: boolean) => void;
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
  const [focusHistoryMap, setFocusHistoryMap] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Dynamic Theme (Light, Deep Navy Dark, Midnight OLED, System)
  const systemColorScheme = useColorScheme();
  const isOled = useMemo(() => {
    return (settings.themeMode || 'dark').toLowerCase() === 'oled';
  }, [settings.themeMode]);

  const isDark = useMemo(() => {
    const mode = (settings.themeMode || 'dark').toLowerCase();
    if (mode === 'dark' || mode === 'oled') return true;
    if (mode === 'light') return false;
    return systemColorScheme !== 'light';
  }, [settings.themeMode, systemColorScheme]);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  const theme: AppTheme = useMemo(() => {
    if (isOled) {
      return {
        isDark: true,
        isOled: true,
        background: MomentusColors.oledBackground,
        surface: MomentusColors.oledSurface,
        surfaceElevated: MomentusColors.oledCardElevated,
        card: MomentusColors.oledCard,
        outline: MomentusColors.oledOutline,
        textPrimary: MomentusColors.oledTextPrimary,
        textSecondary: MomentusColors.oledTextSecondary,
        primary: primaryColor,
        glassCard: MomentusColors.oledGlassCard,
        glassBorder: MomentusColors.oledGlassBorder,
      };
    }

    return {
      isDark,
      isOled: false,
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
    };
  }, [isDark, isOled, primaryColor]);

  // Sincroniza cor de fundo raiz do sistema (evita bordas/flashes navy no modo Midnight OLED #000000)
  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') {
        if (document.documentElement) {
          document.documentElement.style.backgroundColor = theme.background;
        }
        if (document.body) {
          document.body.style.backgroundColor = theme.background;
        }
      }
      return;
    }
    SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme.background]);

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

  // Estado de controle para impedir corte brusco da SplashScreen no pós-login
  const [isPostLoginActive, setIsPostLoginActive] = useState<boolean>(false);

  // Registro das datas cujos pontos de dia completo já foram validados (Anti-Abuse)
  const [validatedDayDates, setValidatedDayDates] = useState<string[]>([]);
  const validatedDayDatesRef = useRef<string[]>([]);
  useEffect(() => {
    validatedDayDatesRef.current = validatedDayDates;
  }, [validatedDayDates]);

  // Registro das rotinas cujos pontos de conclusão já foram validados (Anti-Abuse)
  const [validatedRoutineKeys, setValidatedRoutineKeys] = useState<string[]>([]);
  const validatedRoutineKeysRef = useRef<string[]>([]);
  useEffect(() => {
    validatedRoutineKeysRef.current = validatedRoutineKeys;
  }, [validatedRoutineKeys]);

  // Ref para permitir chamada segura de syncCloudAction a partir de callbacks externos
  const syncCloudActionRef = useRef<(targetUid?: string) => Promise<void>>(async () => {});
  // Trava para evitar execuções duplicadas e concorrentes de sincronização com o Firestore
  const inFlightSyncPromiseRef = useRef<Promise<void> | null>(null);
  const lastLoadedUid = useRef<string | null>(null);
  // Rastreador de hábitos deletados na sessão para prevenir ressuscitação em corridas de sincronização
  const deletedHabitIdsRef = useRef<Set<string>>(new Set());
  // Rastreador de conquistas cujos pontos de XP já foram creditados ao saldo
  const creditedAchievementIdsRef = useRef<Set<string>>(new Set());
  // Trava para evitar execuções concorrentes de sincronização com o Google Agenda
  const isSyncingGoogleCalendarRef = useRef<boolean>(false);
  // Trava para evitar sincronizações ou ressuscitação de sessão durante logout/limpeza
  const isLoggingOutRef = useRef<boolean>(false);
  const unsubFirestoreRef = useRef<(() => void) | null>(null);
  const loadStatePromiseRef = useRef<Promise<void>>(Promise.resolve());

  // Refs sincronizados para garantir pureza de setState (React 19 / React Compiler) e evitar stale closures em sync
  const habitsRef = useRef<HabitItem[]>(habits);
  const categoriesRef = useRef<Category[]>(categories);
  const templatesRef = useRef<RoutineTemplate[]>(templates);
  const achievementsRef = useRef<Achievement[]>(achievements);
  const marketItemsRef = useRef<MarketItem[]>(marketItems);
  const userProfileRef = useRef<UserProfile>(userProfile);
  const settingsRef = useRef<AppSettings>(settings);
  const focusHistoryMapRef = useRef<Record<string, number>>(focusHistoryMap);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);
  useEffect(() => {
    templatesRef.current = templates;
  }, [templates]);
  useEffect(() => {
    achievementsRef.current = achievements;
  }, [achievements]);
  useEffect(() => {
    marketItemsRef.current = marketItems;
  }, [marketItems]);
  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    focusHistoryMapRef.current = focusHistoryMap;
  }, [focusHistoryMap]);

  const resetLocalAccountState = useCallback(() => {
    habitsRef.current = [];
    categoriesRef.current = INITIAL_CATEGORIES;
    templatesRef.current = [];
    achievementsRef.current = INITIAL_ACHIEVEMENTS;
    marketItemsRef.current = INITIAL_MARKET_ITEMS;
    userProfileRef.current = INITIAL_USER_PROFILE;
    settingsRef.current = INITIAL_SETTINGS;
    focusHistoryMapRef.current = {};
    validatedDayDatesRef.current = [];
    validatedRoutineKeysRef.current = [];
    deletedHabitIdsRef.current = new Set();
    creditedAchievementIdsRef.current = new Set();

    setHabits([]);
    setCategories(INITIAL_CATEGORIES);
    setTemplates([]);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMarketItems(INITIAL_MARKET_ITEMS);
    setUserProfile(INITIAL_USER_PROFILE);
    setSettings(INITIAL_SETTINGS);
    setFocusHistoryMap({});
    setValidatedDayDates([]);
    setValidatedRoutineKeys([]);
  }, []);

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
        // 0. Hidratação Instantânea de Perfil (Zero-flicker no F5 / Reabertura via SecureStore / localStorage)
        const cachedSession = await getSecureSession();
        if (cachedSession) {
          lastLoadedUid.current = cachedSession.uid;
          setUserProfile((prev) => ({
            ...prev,
            email: cachedSession.email || prev.email,
            name: cachedSession.name || prev.name,
            photoUrl: cachedSession.photoUrl ?? prev.photoUrl,
            isLoggedIn: true,
          }));
          MomentusLog.auth.info('Perfil hidratado instantaneamente da sessão segura:', cachedSession.email || cachedSession.uid);
        }

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
        settingsRef.current = effectiveSettings;
        setSettings(effectiveSettings);
        await setAppKv('app_settings', effectiveSettings).catch(() => {});

        // Perfil do usuário: restaura nome, foto e status
        const effectiveProfile: UserProfile = dbUserProfile || legacyParsed?.userProfile || INITIAL_USER_PROFILE;
        const currentAuth = firebaseAuth.currentUser;
        if (currentAuth?.uid) {
          lastLoadedUid.current = currentAuth.uid;
        }

        // Reseta focusMinutesToday se for um novo dia calendário
        const todayDateStr = getTodayDateString();
        const lastFocusDate = await getAppKv<string>('last_focus_date');
        let initialFocusMinutes = effectiveProfile.focusMinutesToday || 0;
        if (lastFocusDate && lastFocusDate !== todayDateStr) {
          initialFocusMinutes = 0;
          await setAppKv('last_focus_date', todayDateStr).catch(() => {});
        }

        // Carrega o histórico diário acumulado de foco do SQLite
        const savedFocusHistory = await getAppKv<Record<string, number>>('focus_history_map');
        const initialFocusHistory: Record<string, number> = savedFocusHistory || {};
        if (initialFocusMinutes > 0 && !initialFocusHistory[todayDateStr]) {
          initialFocusHistory[todayDateStr] = initialFocusMinutes;
          await setAppKv('focus_history_map', initialFocusHistory).catch(() => {});
        }
        focusHistoryMapRef.current = initialFocusHistory;
        setFocusHistoryMap(initialFocusHistory);

        const enrichedProfile: UserProfile = {
          ...effectiveProfile,
          focusMinutesToday: initialFocusMinutes,
          ...(currentAuth
            ? {
                name: currentAuth.displayName || effectiveProfile.name,
                email: currentAuth.email || effectiveProfile.email,
                photoUrl: currentAuth.photoURL ?? effectiveProfile.photoUrl,
                isLoggedIn: true,
              }
            : cachedSession
            ? {
                name: cachedSession.name || effectiveProfile.name,
                email: cachedSession.email || effectiveProfile.email,
                photoUrl: cachedSession.photoUrl ?? effectiveProfile.photoUrl,
                isLoggedIn: true,
              }
            : effectiveProfile.isLoggedIn
            ? { isLoggedIn: true }
            : {}),
        };
        userProfileRef.current = enrichedProfile;
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

        categoriesRef.current = cleanCats;
        setCategories(cleanCats);
        await setAllCategoriesDb(cleanCats).catch(() => {});

        const LEGACY_MOCK_HABIT_IDS = new Set(['h-1', 'h-2', 'h-3', 'h-4']);

        const rawHab: HabitItem[] = dbHabits.length > 0 ? dbHabits : (legacyParsed?.habits || []);
        const filteredHab = rawHab
          .filter((h: HabitItem) => !LEGACY_MOCK_HABIT_IDS.has(h.id))
          .map((h: HabitItem) =>
            duplicateOutrosIds.has(h.categoryId)
              ? { ...h, categoryId: canonicalOutrosId }
              : h
          );

        // Deduplica e unifica instâncias duplicadas pré-existentes na base local e nuvem
        const { cleanHabits: initialHab, removedIds: loadRemovedIds } = deduplicateHabits(filteredHab);
        if (loadRemovedIds.length > 0) {
          loadRemovedIds.forEach((rid) => {
            deleteHabitDb(rid).catch(() => {});
            if (currentAuth?.uid) {
              deleteHabitFromFirestore(currentAuth.uid, rid).catch(() => {});
            }
          });
        }

        habitsRef.current = initialHab;
        setHabits(initialHab);

        // Recalcula estritamente os hábitos concluídos, dias 100% concluídos e streak real
        const initialCompletedDays = getFullyCompletedDates(initialHab);
        const realTotalHabitsCompleted = initialHab.filter((h: HabitItem) => h.completed).length;
        const realStreak = calculateStreakFromCompletedDays(initialCompletedDays, getTodayDateString());

        // Carrega datas já validadas de bônus diário para evitar pontos duplicados
        const savedValidatedDays = await getAppKv<string[]>('validated_day_dates');
        if (Array.isArray(savedValidatedDays)) {
          validatedDayDatesRef.current = savedValidatedDays;
          setValidatedDayDates(savedValidatedDays);
        } else if (initialCompletedDays.length > 0) {
          validatedDayDatesRef.current = initialCompletedDays;
          setValidatedDayDates(initialCompletedDays);
          await setAppKv('validated_day_dates', initialCompletedDays).catch(() => {});
        }

        // Carrega rotinas já validadas de bônus para evitar pontos duplicados
        const savedValidatedRoutines = await getAppKv<string[]>('validated_routine_keys');
        if (Array.isArray(savedValidatedRoutines)) {
          validatedRoutineKeysRef.current = savedValidatedRoutines;
          setValidatedRoutineKeys(savedValidatedRoutines);
        }

        const rawDbAchievements =
          dbAchievements.length > 0
            ? dbAchievements
            : (legacyParsed?.achievements || []);
        const existingAchsMap = new Map<string, Achievement>(
          rawDbAchievements.map((a: Achievement) => [a.id, a])
        );
        const cleanAchievements: Achievement[] = INITIAL_ACHIEVEMENTS.map((initAch) => {
          const existing = existingAchsMap.get(initAch.id);
          if (existing) {
            return {
              ...initAch,
              unlocked: existing.unlocked,
              unlockedAt: existing.unlockedAt,
              progress: Math.max(initAch.progress, existing.progress || 0),
            };
          }
          return initAch;
        });

        // Registra conquistas já desbloqueadas como creditadas sem re-inflar o saldo de XP
        const savedCreditedAchs = await getAppKv<string[]>('credited_achievement_ids');
        const creditedSet = new Set<string>(Array.isArray(savedCreditedAchs) ? savedCreditedAchs : []);
        let creditedSetChanged = false;
        cleanAchievements.forEach((ach: Achievement) => {
          if (ach.unlocked && !creditedSet.has(ach.id)) {
            creditedSet.add(ach.id);
            creditedSetChanged = true;
          }
        });
        creditedAchievementIdsRef.current = creditedSet;
        if (creditedSetChanged) {
          await setAppKv('credited_achievement_ids', Array.from(creditedSet)).catch(() => {});
        }

        const hydratedProfile: UserProfile = {
          ...enrichedProfile,
          totalCompleted: realTotalHabitsCompleted,
          currentStreak: realStreak,
          bestStreak: Math.max(enrichedProfile.bestStreak, realStreak),
        };
        userProfileRef.current = hydratedProfile;
        setUserProfile(hydratedProfile);

        const cleanTemplates = (dbTemplates.length > 0 ? dbTemplates : (legacyParsed?.templates || [])).filter(
          (t: RoutineTemplate) => !LEGACY_MOCK_TMPL_IDS.has(t.id)
        );
        templatesRef.current = cleanTemplates;
        setTemplates(cleanTemplates);
        achievementsRef.current = cleanAchievements;
        setAchievements(cleanAchievements);

        const cleanMarketItems =
          dbMarketItems.length > 0
            ? dbMarketItems
            : (legacyParsed?.marketItems || INITIAL_MARKET_ITEMS);
        marketItemsRef.current = cleanMarketItems;
        setMarketItems(cleanMarketItems);
      } catch (e) {
        MomentusLog.db.warn('Erro ao carregar dados do banco:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    const loadPromise = loadState();
    loadStatePromiseRef.current = loadPromise;
    // Solicita permissões de notificação e configura os canais no início
    requestNotificationPermissions().catch(() => {});

    // Observa mudanças de autenticação do Firebase e sincroniza automaticamente
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      // Aguarda a hidratação local inicial para impedir race condition entre loadState e sync da nuvem
      await loadPromise;

      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }

      if (isLoggingOutRef.current) {
        userProfileRef.current = INITIAL_USER_PROFILE;
        setUserProfile(INITIAL_USER_PROFILE);
        return;
      }

      if (!user) {
        const secureSession = await getSecureSession();
        if (!secureSession || isLoggingOutRef.current) {
          userProfileRef.current = INITIAL_USER_PROFILE;
          setUserProfile(INITIAL_USER_PROFILE);
        } else {
          MomentusLog.auth.debug('Firebase Auth reportou user nulo provisório, preservando sessão local.');
        }
        return;
      }

      // Se havia um usuário logado e houve troca para outra conta, isola 100% os dados/configurações da conta anterior
      if (lastLoadedUid.current && lastLoadedUid.current !== user.uid) {
        await cancelAllNotifications().catch(() => {});
        await clearEntireDatabase().catch(() => {});
        await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
        resetLocalAccountState();
      }
      lastLoadedUid.current = user.uid;

      const activeName =
        user.displayName?.trim() ||
        (user.email ? user.email.split('@')[0] : 'Usuário');
      const activeEmail = user.email || '';
      const activePhoto = user.photoURL || null;

      // Persiste na sessão segura (SecureStore no mobile / localStorage no web) com token JWT
      const token = await user.getIdToken().catch(() => null);
      saveSecureSession({
        uid: user.uid,
        email: activeEmail,
        name: activeName,
        photoUrl: activePhoto,
        token,
        lastActive: Date.now(),
      }).catch(() => {});

      const prevProfile = userProfileRef.current;
      const nextProfile: UserProfile = {
        ...prevProfile,
        email: activeEmail || prevProfile.email,
        name: activeName !== 'Usuário' ? activeName : (prevProfile.name !== 'Usuário' ? prevProfile.name : 'Usuário'),
        photoUrl: activePhoto ?? prevProfile.photoUrl,
        isLoggedIn: true,
      };
      userProfileRef.current = nextProfile;
      setUserProfile(nextProfile);
      setAppKv('user_profile', nextProfile).catch(() => {});

      try {
        // Sincroniza dados da nuvem (Firestore) do usuário recém-autenticado
        await syncCloudActionRef.current(user.uid);
      } catch (syncErr) {
        MomentusLog.auth.warn('Aviso ao sincronizar nuvem no onAuthStateChanged:', syncErr);
      }

      // Registra listener em tempo real para sincronizar mudanças feitas no nativo (eventos e conclusões)
      try {
        unsubFirestoreRef.current = listenToFirestoreSync(user.uid, () => {
          if (isLoggingOutRef.current) return;
          syncCloudActionRef.current(user.uid).catch(() => {});
        });
      } catch (err) {
        MomentusLog.sync.warn('Falha ao registrar listener em tempo real:', err);
      }
    });

    // Sincronização periódica a cada 60 segundos com a nuvem (equivalente ao SyncWorker.kt)
    const periodicSyncTimer = setInterval(() => {
      if (isLoggingOutRef.current) return;
      const activeUid = firebaseAuth.currentUser?.uid;
      if (activeUid) {
        syncCloudActionRef.current(activeUid).catch(() => {});
      }
    }, 60000);

    // Renovação periódica silenciosa do token JWT a cada 45 minutos
    const cleanupSilentRefresh = setupSilentTokenRefresh();

    return () => {
      unsubAuth();
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }
      clearInterval(periodicSyncTimer);
      cleanupSilentRefresh();
    };
  }, [resetLocalAccountState]);

  // Persistência contínua com debounce (400ms): evita write amplification em mudanças rápidas
  useEffect(() => {
    if (!isLoaded || isLoggingOutRef.current) return;
    const timer = setTimeout(async () => {
      if (isLoggingOutRef.current) return;
      try {
        await Promise.all([
          setAllCategoriesDb(categories),
          setAllHabitsDb(habits),
          setAllTemplatesDb(templates),
          setAllAchievementsDb(achievements),
          setAllMarketItemsDb(marketItems),
          setAppKv('user_profile', userProfile),
          setAppKv('app_settings', settings),
        ]);

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
        MomentusLog.db.warn('Erro ao persistir dados do Momentus:', e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [habits, categories, templates, achievements, marketItems, userProfile, settings, isLoaded]);

  const userLevel = useMemo(
    () => calculateUserLevel(userProfile.totalPoints),
    [userProfile.totalPoints]
  );

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const scale = settings.fontSizeMultiplier || 1.0;
      if (document.body) {
        (document.body.style as any).zoom = String(scale);
      }
    }
  }, [settings.fontSizeMultiplier]);

  const triggerHaptic = useCallback((type: 'light' | 'impact' | 'success' | 'selection') => {
    if (!settingsRef.current.hapticsEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          const pattern =
            type === 'selection'
              ? 6
              : type === 'light'
                ? 12
                : type === 'impact'
                  ? 20
                  : [25, 35, 25];
          navigator.vibrate(pattern);
        }
        return;
      }
      if (type === 'selection') {
        Haptics.selectionAsync().catch(() => {});
      } else if (type === 'light') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } else if (type === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {}
  }, []);

  const addPoints = (points: number) => {
    const prev = userProfileRef.current;
    const next: UserProfile = {
      ...prev,
      totalPoints: Math.max(0, prev.totalPoints + points),
    };
    userProfileRef.current = next;
    setUserProfile(next);
  };

  /**
   * Implementação exata das regras de CheckAndUnlockAchievementsUseCase.kt (setStates 100% puros)
   */
  const checkAndUnlockAchievements = (
    streakCount: number,
    totalCompleted: number,
    totalTemplates: number,
    totalFocusMinutes: number = 0,
    hasCompletedEarlyHabit: boolean = false,
    hasPerfectDay: boolean = false,
    hasCompletedCategoryGoal: boolean = false
  ) => {
    const prevAchievements = achievementsRef.current;
    const newlyUnlockedItems: Achievement[] = [];

    const updated = prevAchievements.map((ach) => {
      if (ach.unlocked) return ach;

      let shouldUnlock = false;
      let progress = ach.progress;

      switch (ach.id) {
        case 'FIRST_HABIT':
          progress = Math.max(ach.progress, totalCompleted);
          if (progress >= 1) shouldUnlock = true;
          break;
        case 'COMPLETED_10':
          progress = Math.max(ach.progress, totalCompleted);
          if (progress >= 10) shouldUnlock = true;
          break;
        case 'COMPLETED_50':
          progress = Math.max(ach.progress, totalCompleted);
          if (progress >= 50) shouldUnlock = true;
          break;
        case 'COMPLETED_100':
          progress = Math.max(ach.progress, totalCompleted);
          if (progress >= 100) shouldUnlock = true;
          break;
        case 'STREAK_3':
          progress = Math.max(ach.progress, streakCount);
          if (progress >= 3) shouldUnlock = true;
          break;
        case 'STREAK_7':
          progress = Math.max(ach.progress, streakCount);
          if (progress >= 7) shouldUnlock = true;
          break;
        case 'STREAK_30':
          progress = Math.max(ach.progress, streakCount);
          if (progress >= 30) shouldUnlock = true;
          break;
        case 'FIRST_TEMPLATE':
          progress = Math.max(ach.progress, totalTemplates);
          if (progress >= 1) shouldUnlock = true;
          break;
        case 'FOCUS_FIRST':
          progress = totalFocusMinutes >= 1 ? 1 : ach.progress;
          if (progress >= 1) shouldUnlock = true;
          break;
        case 'FOCUS_10H':
          progress = Math.max(ach.progress, Math.min(600, totalFocusMinutes));
          if (progress >= 600) shouldUnlock = true;
          break;
        case 'FOCUS_50H':
          progress = Math.max(ach.progress, Math.min(3000, totalFocusMinutes));
          if (progress >= 3000) shouldUnlock = true;
          break;
        case 'EARLY_BIRD':
          if (hasCompletedEarlyHabit) {
            progress = 1;
            shouldUnlock = true;
          }
          break;
        case 'PERFECT_DAY':
          if (hasPerfectDay) {
            progress = 1;
            shouldUnlock = true;
          }
          break;
        case 'GOAL_MASTER':
          if (hasCompletedCategoryGoal) {
            progress = 1;
            shouldUnlock = true;
          }
          break;
      }

      if (shouldUnlock) {
        const unlockedAch: Achievement = {
          ...ach,
          progress: ach.maxProgress,
          unlocked: true,
          unlockedAt: getTodayDateString(),
        };
        newlyUnlockedItems.push(unlockedAch);
        return unlockedAch;
      }

      return {
        ...ach,
        progress: Math.min(ach.maxProgress, progress),
      };
    });

    achievementsRef.current = updated;
    setAchievements(updated);

    if (newlyUnlockedItems.length > 0) {
      let totalReward = 0;
      const currentUserId = firebaseAuth.currentUser?.uid;

      newlyUnlockedItems.forEach((ach) => {
        totalReward += ach.xpReward;
        creditedAchievementIdsRef.current.add(ach.id);
        if (currentUserId) {
          saveAchievementUnlockedToFirestore(currentUserId, ach.id, ach.xpReward).catch(() => {});
        }
        showCelebration(
          'Conquista Desbloqueada! 🏆',
          `Você desbloqueou a medalha: "${ach.title}"`,
          ach.xpReward
        );
      });

      if (totalReward > 0) {
        addPoints(totalReward);
      }
      setAppKv('credited_achievement_ids', Array.from(creditedAchievementIdsRef.current)).catch(() => {});
      soundManager.playAchievementSound();
      triggerHaptic('success');
    }
  };

  const toggleHabit = (id: string) => {
    const prevHabits = habitsRef.current;
    const targetHabit = prevHabits.find((h) => h.id === id);
    if (!targetHabit) return;

    const nextCompleted = !targetHabit.completed;
    const targetDate = targetHabit.date;
    let isDayFullyComplete = false;
    let isFirstTimeDayValidated = false;
    let isRoutineFullyComplete = false;
    let isFirstTimeRoutineValidated = false;
    let completedRoutineTitle = '';

    const updated = prevHabits.map((habit) =>
      habit.id === id
        ? {
            ...habit,
            completed: nextCompleted,
            streak: nextCompleted ? 1 : 0,
          }
        : habit
    );

    const updatedTargetHabit: HabitItem = {
      ...targetHabit,
      completed: nextCompleted,
      streak: nextCompleted ? 1 : 0,
    };

    // 1. Total de Hábitos Concluídos e Sequência (Streak)
    const nextTotalHabitsCompleted = updated.filter((h) => h.completed).length;
    const fullyCompletedDates = getFullyCompletedDates(updated);
    const nextStreak = calculateStreakFromCompletedDays(fullyCompletedDates, getTodayDateString());

    // 2. Verificação de Dia Completo e Anti-Abuse de XP (fora do updater!)
    if (nextCompleted && targetDate) {
      const dayHabits = updated.filter((h) => h.date === targetDate);
      if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
        isDayFullyComplete = true;
        const currentValidated = validatedDayDatesRef.current;
        if (!currentValidated.includes(targetDate)) {
          isFirstTimeDayValidated = true;
          const nextValidated = [...currentValidated, targetDate];
          validatedDayDatesRef.current = nextValidated;
          setValidatedDayDates(nextValidated);
          setAppKv('validated_day_dates', nextValidated).catch(() => {});
        }
      }

      // 2.1 Verificação de Rotina Concluída (Template de múltiplos hábitos)
      if (targetHabit.templateSourceId) {
        const routineHabits = updated.filter(
          (h) => h.date === targetDate && h.templateSourceId === targetHabit.templateSourceId
        );
        if (routineHabits.length > 1 && routineHabits.every((h) => h.completed)) {
          isRoutineFullyComplete = true;
          const routineKey = `${targetDate}_${targetHabit.templateSourceId}`;
          const currentValidatedRoutines = validatedRoutineKeysRef.current;
          if (!currentValidatedRoutines.includes(routineKey)) {
            isFirstTimeRoutineValidated = true;
            const nextValidatedRoutines = [...currentValidatedRoutines, routineKey];
            validatedRoutineKeysRef.current = nextValidatedRoutines;
            setValidatedRoutineKeys(nextValidatedRoutines);
            setAppKv('validated_routine_keys', nextValidatedRoutines).catch(() => {});

            const foundTmpl = templatesRef.current.find((t) => t.id === targetHabit.templateSourceId);
            completedRoutineTitle = foundTmpl?.title || 'Rotina';
          }
        }
      }
    }

    // 3. Atualiza estados puros
    habitsRef.current = updated;
    setHabits(updated);

    const prevProfile = userProfileRef.current;
    const habitDeltaPoints = nextCompleted ? 15 : -15;
    const dayBonusPoints = isFirstTimeDayValidated ? 25 : 0;
    const routineBonusPoints = isFirstTimeRoutineValidated ? 20 : 0;
    const nextPoints = Math.max(0, prevProfile.totalPoints + habitDeltaPoints + dayBonusPoints + routineBonusPoints);
    const nextBestStreak = Math.max(prevProfile.bestStreak, nextStreak);
    const nextProfile: UserProfile = {
      ...prevProfile,
      totalPoints: nextPoints,
      totalCompleted: nextTotalHabitsCompleted,
      currentStreak: nextStreak,
      bestStreak: nextBestStreak,
    };
    userProfileRef.current = nextProfile;
    setUserProfile(nextProfile);

    // 4. Efeitos colaterais seguros fora de updaters
    if (nextCompleted) {
      soundManager.playSuccessSound();
      triggerHaptic('light');
      cancelHabitNotifications(targetHabit.id).catch(() => {});
    } else {
      triggerHaptic('selection');
      scheduleHabitNotifications({ ...targetHabit, completed: false }).catch(() => {});
    }

    if (isDayFullyComplete) {
      setTimeout(() => triggerHaptic('success'), 140);
      const combinedPoints = (isFirstTimeDayValidated ? 25 : 0) + (isFirstTimeRoutineValidated ? 20 : 0);
      if (isFirstTimeDayValidated) {
        showCelebration(
          'Dia Conquistado! 🌟',
          isFirstTimeRoutineValidated
            ? `Incrível! Você concluiu a rotina "${completedRoutineTitle}" e 100% de todas as suas tarefas do dia!`
            : 'Parabéns! Você concluiu 100% das suas tarefas planejadas.',
          combinedPoints
        );
      } else {
        showCelebration(
          'Dia Conquistado! 🌟',
          'Parabéns! Suas tarefas do dia estão 100% concluídas.',
          0
        );
      }
    } else if (isRoutineFullyComplete && isFirstTimeRoutineValidated) {
      showCelebration(
        'Rotina Concluída! 📋✨',
        `Parabéns! Você completou todas as atividades da rotina "${completedRoutineTitle}".`,
        20
      );
    }

    const isEarly = !!(targetHabit.timeStart && parseInt(targetHabit.timeStart.split(':')[0] || '12', 10) < 8);
    const allTimeFocus = Object.values(focusHistoryMapRef.current).reduce((a, b) => a + b, 0);

    // Avalia se alguma categoria com meta semanal (metaMinutosSemanal) foi atingida nos últimos 7 dias (GOAL_MASTER)
    let hasCompletedCategoryGoal = false;
    if (nextCompleted) {
      const targetCat = categoriesRef.current.find((c) => c.id === targetHabit.categoryId);
      if (targetCat?.metaMinutosSemanal && targetCat.metaMinutosSemanal > 0) {
        const nowDate = new Date();
        const weekAgo = new Date(nowDate);
        weekAgo.setDate(nowDate.getDate() - 6);
        weekAgo.setHours(0, 0, 0, 0);
        let weeklyCatMins = 0;
        updated.forEach((h) => {
          if (!h.completed || h.categoryId !== targetCat.id || !h.date) return;
          const [y, m, d] = h.date.split('-').map(Number);
          const hd = new Date(y, m - 1, d);
          if (hd >= weekAgo && hd <= nowDate) {
            let dur = 30;
            if (h.timeStart && h.timeEnd) {
              const [sH, sM] = h.timeStart.split(':').map((v) => parseInt(v, 10) || 0);
              const [eH, eM] = h.timeEnd.split(':').map((v) => parseInt(v, 10) || 0);
              const diff = eH * 60 + eM - (sH * 60 + sM);
              if (diff > 0) dur = diff;
            }
            weeklyCatMins += dur;
          }
        });
        if (weeklyCatMins >= targetCat.metaMinutosSemanal) {
          hasCompletedCategoryGoal = true;
        }
      }
    }

    checkAndUnlockAchievements(
      nextStreak,
      nextTotalHabitsCompleted,
      templatesRef.current.length,
      allTimeFocus,
      isEarly && nextCompleted,
      isDayFullyComplete,
      hasCompletedCategoryGoal
    );

    upsertHabitDb(updatedTargetHabit).catch(() => {});

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveUserProfileToFirestore(currentUserId, {
        totalPoints: nextPoints,
        totalCompleted: nextTotalHabitsCompleted,
        currentStreak: nextStreak,
        bestStreak: nextBestStreak,
      }).catch(() => {});
      saveHabitCompletionToFirestore(
        currentUserId,
        id,
        targetDate || getTodayDateString(),
        nextCompleted
      ).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar conclusão no Firestore:', err)
      );
      saveHabitToFirestore(currentUserId, updatedTargetHabit).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar hábito alterado no Firestore:', err)
      );
    }
  };

  const addHabit = (habitData: Omit<HabitItem, 'id' | 'completed' | 'streak'>) => {
    const newHabit: HabitItem = {
      ...habitData,
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      completed: false,
      streak: 0,
    };

    const nextHabits = [newHabit, ...habitsRef.current];
    habitsRef.current = nextHabits;
    setHabits(nextHabits);
    upsertHabitDb(newHabit).catch(() => {});
    triggerHaptic('success');

    // 1. Grava no Firestore atomicamente
    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitToFirestore(currentUserId, newHabit).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar hábito criado no Firestore:', err)
      );
    }

    // 2. Agendar notificações locais (início e término)
    scheduleHabitNotifications(newHabit).catch(() => {});

    // 3. Sincronizar com calendário nativo se solicitado
    const shouldSyncCalendar = newHabit.saveToGoogle ?? settingsRef.current.googleCalendarSyncEnabled;
    if (shouldSyncCalendar) {
      const category = categoriesRef.current.find((c) => c.id === newHabit.categoryId);
      syncHabitToDeviceCalendar(newHabit, category)
        .then((eventId) => {
          if (eventId) {
            const syncedHabit = {
              ...newHabit,
              googleCalendarEventId: eventId,
              saveToGoogle: true,
            };
            const cleaned = habitsRef.current.filter((h) => h.id !== `google_${eventId}`);
            const updatedList = cleaned.map((h) => (h.id === newHabit.id ? syncedHabit : h));
            const { cleanHabits, removedIds } = deduplicateHabits(updatedList);
            habitsRef.current = cleanHabits;
            setHabits(cleanHabits);

            if (removedIds.length > 0) {
              removedIds.forEach((rid) => {
                deleteHabitDb(rid).catch(() => {});
                if (currentUserId) {
                  deleteHabitFromFirestore(currentUserId, rid).catch(() => {});
                }
              });
            }
            upsertHabitDb(syncedHabit).catch(() => {});
            if (currentUserId) {
              saveHabitToFirestore(currentUserId, syncedHabit).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  };

  const deleteHabit = (id: string) => {
    deletedHabitIdsRef.current.add(id);
    const prevHabits = habitsRef.current;
    const habitToDelete = prevHabits.find((h) => h.id === id);
    if (habitToDelete) {
      cancelHabitNotifications(id).catch(() => {});
      if (habitToDelete.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(habitToDelete.googleCalendarEventId).catch(() => {});
      }
    }

    const remaining = prevHabits.filter((h) => h.id !== id);
    const remainingCompleted = remaining.filter((h) => h.completed).length;
    const completedDays = getFullyCompletedDates(remaining);
    const remainingStreak = calculateStreakFromCompletedDays(completedDays, getTodayDateString());

    habitsRef.current = remaining;
    setHabits(remaining);

    const nextProfile: UserProfile = {
      ...userProfileRef.current,
      totalCompleted: remainingCompleted,
      currentStreak: remainingStreak,
    };
    userProfileRef.current = nextProfile;
    setUserProfile(nextProfile);

    deleteHabitDb(id).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveUserProfileToFirestore(currentUserId, {
        totalCompleted: remainingCompleted,
        currentStreak: remainingStreak,
      }).catch(() => {});
      deleteHabitFromFirestore(currentUserId, id).catch((err) =>
        MomentusLog.sync.warn('Erro ao excluir hábito no Firestore:', err)
      );
    }
  };

  const deleteMultipleHabits = (ids: string[]) => {
    ids.forEach((id) => deletedHabitIdsRef.current.add(id));
    const idSet = new Set(ids);
    const prevHabits = habitsRef.current;
    const toDelete = prevHabits.filter((h) => idSet.has(h.id));
    toDelete.forEach((h) => {
      cancelHabitNotifications(h.id).catch(() => {});
      if (h.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(h.googleCalendarEventId).catch(() => {});
      }
    });

    const remaining = prevHabits.filter((h) => !idSet.has(h.id));
    const remainingCompleted = remaining.filter((h) => h.completed).length;
    const completedDays = getFullyCompletedDates(remaining);
    const remainingStreak = calculateStreakFromCompletedDays(completedDays, getTodayDateString());

    habitsRef.current = remaining;
    setHabits(remaining);

    const nextProfile: UserProfile = {
      ...userProfileRef.current,
      totalCompleted: remainingCompleted,
      currentStreak: remainingStreak,
    };
    userProfileRef.current = nextProfile;
    setUserProfile(nextProfile);

    deleteMultipleHabitsDb(ids).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveUserProfileToFirestore(currentUserId, {
        totalCompleted: remainingCompleted,
        currentStreak: remainingStreak,
      }).catch(() => {});
      deleteMultipleHabitsFromFirestore(currentUserId, ids).catch((err) =>
        MomentusLog.sync.warn('Erro ao excluir múltiplos hábitos no Firestore:', err)
      );
    }
  };

  const updateHabit = (updated: HabitItem) => {
    const nextHabits = habitsRef.current.map((h) => (h.id === updated.id ? updated : h));
    habitsRef.current = nextHabits;
    setHabits(nextHabits);
    upsertHabitDb(updated).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitToFirestore(currentUserId, updated).catch((err) =>
        MomentusLog.sync.warn('Erro ao atualizar hábito no Firestore:', err)
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
      const category = categoriesRef.current.find((c) => c.id === updated.categoryId);
      syncHabitToDeviceCalendar(updated, category)
        .then((eventId) => {
          if (eventId && eventId !== updated.googleCalendarEventId) {
            const synced = { ...updated, googleCalendarEventId: eventId, saveToGoogle: true };
            const cleaned = habitsRef.current.filter((h) => h.id !== `google_${eventId}`);
            const mapped = cleaned.map((h) => (h.id === updated.id ? synced : h));
            const { cleanHabits, removedIds } = deduplicateHabits(mapped);
            habitsRef.current = cleanHabits;
            setHabits(cleanHabits);

            if (removedIds.length > 0) {
              removedIds.forEach((rid) => {
                deleteHabitDb(rid).catch(() => {});
                if (currentUserId) {
                  deleteHabitFromFirestore(currentUserId, rid).catch(() => {});
                }
              });
            }
            upsertHabitDb(synced).catch(() => {});
            if (currentUserId) {
              saveHabitToFirestore(currentUserId, synced).catch(() => {});
            }
          }
        })
        .catch(() => {});
    }
  };

  const applyTemplateToToday = (templateId: string) => {
    applyTemplateToDates(templateId, [getTodayDateString()]);
  };

  const applyTemplateToDates = (
    templateId: string,
    dates: string[],
    saveToGoogle?: boolean,
    mode: 'merge' | 'incremental' = 'merge',
    timeShiftStart?: string
  ) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || dates.length === 0) return;

    const willSaveToCalendar = saveToGoogle ?? settings.googleCalendarSyncEnabled ?? false;
    const newHabits: HabitItem[] = [];

    // Filtra eventos duplicados no template (conforme TemplateViewModel.kt)
    const uniqueTemplateItems = template.items.filter(
      (item, idx, self) =>
        idx === self.findIndex((t) => `${t.title}-${t.timeStart}-${t.categoryId}` === `${item.title}-${item.timeStart}-${item.categoryId}`)
    );

    const parseMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const formatMin = (mins: number) => {
      const norm = ((mins % 1440) + 1440) % 1440;
      const h = String(Math.floor(norm / 60)).padStart(2, '0');
      const m = String(norm % 60).padStart(2, '0');
      return `${h}:${m}`;
    };

    let shiftDeltaMinutes = 0;
    if (timeShiftStart && uniqueTemplateItems.length > 0) {
      const firstStart = parseMin(uniqueTemplateItems[0].timeStart || '08:00');
      const targetStart = parseMin(timeShiftStart);
      shiftDeltaMinutes = targetStart - firstStart;
    }

    const nowTimestamp = Date.now();

    dates.forEach((targetDate, dateIdx) => {
      uniqueTemplateItems.forEach((item, itemIdx) => {
        const itemIdStr = item.id || `item_${itemIdx}`;
        const deterministicId =
          mode === 'incremental'
            ? `applied_${itemIdStr}_${targetDate}_${nowTimestamp}_${dateIdx}_${itemIdx}`
            : `applied_${itemIdStr}_${targetDate}`;

        let finalTimeStart = item.timeStart || '08:00';
        let finalTimeEnd = item.timeEnd;
        if (shiftDeltaMinutes !== 0) {
          finalTimeStart = formatMin(parseMin(finalTimeStart) + shiftDeltaMinutes);
          if (finalTimeEnd) {
            finalTimeEnd = formatMin(parseMin(finalTimeEnd) + shiftDeltaMinutes);
          }
        }

        // Remove do cache de IDs deletados para permitir re-aplicar o template no mesmo dia
        deletedHabitIdsRef.current.delete(deterministicId);
        newHabits.push({
          id: deterministicId,
          title: item.title,
          description: item.description || undefined,
          timeStart: finalTimeStart,
          timeEnd: finalTimeEnd,
          categoryId: item.categoryId,
          completed: false,
          date: targetDate,
          streak: 0,
          saveToGoogle: willSaveToCalendar,
          templateSourceId: template.id,
        });
      });
    });

    const prevHabits = habitsRef.current;
    let persistedHabits: HabitItem[] = newHabits;
    let nextHabitsList: HabitItem[];

    if (mode === 'incremental') {
      nextHabitsList = [...newHabits, ...prevHabits];
    } else {
      const prevMap = new Map(prevHabits.map((p) => [p.id, p]));
      // Preserva o status de conclusão se o hábito já tinha sido concluído anteriormente
      const adjustedNewHabits = newHabits.map((nh) => {
        let existing = prevMap.get(nh.id);
        if (!existing) {
          existing = prevHabits.find(
            (p) =>
              p.date === nh.date &&
              (p.templateSourceId === template.id || p.id.startsWith('applied_')) &&
              p.title.trim().toLowerCase() === nh.title.trim().toLowerCase()
          );
        }

        if (existing && existing.completed) {
          return {
            ...nh,
            completed: true,
            streak: existing.streak ?? 0,
            googleCalendarEventId: existing.googleCalendarEventId || nh.googleCalendarEventId,
          };
        }
        return nh;
      });

      persistedHabits = adjustedNewHabits;
      const newHabitsMap = new Map(adjustedNewHabits.map((h) => [h.id, h]));
      const filteredPrev = prevHabits.filter((p) => !newHabitsMap.has(p.id));
      nextHabitsList = [...adjustedNewHabits, ...filteredPrev];
    }

    habitsRef.current = nextHabitsList;
    setHabits(nextHabitsList);

    soundManager.playSuccessSound();
    triggerHaptic('success');
    checkAndUnlockAchievements(
      userProfileRef.current.currentStreak,
      userProfileRef.current.totalCompleted,
      templatesRef.current.length
    );

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (persistedHabits.length > 0) {
      persistedHabits.forEach((h) => upsertHabitDb(h).catch(() => {}));
    }
    if (currentUserId && persistedHabits.length > 0) {
      Promise.all(persistedHabits.map((h) => saveHabitToFirestore(currentUserId, h))).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar hábitos do template no Firestore:', err)
      );
    }

    // Agenda notificações para os novos hábitos
    persistedHabits.forEach((h) => {
      if (!h.completed) {
        scheduleHabitNotifications(h).catch(() => {});
      }
      if (willSaveToCalendar) {
        const cat = categoriesRef.current.find((c) => c.id === h.categoryId);
        syncHabitToDeviceCalendar(h, cat)
          .then((eventId) => {
            if (eventId) {
              const syncedItem = { ...h, googleCalendarEventId: eventId, saveToGoogle: true };
              const updatedList = habitsRef.current.map((item) =>
                item.id === h.id ? syncedItem : item
              );
              habitsRef.current = updatedList;
              setHabits(updatedList);
              upsertHabitDb(syncedItem).catch(() => {});
              if (currentUserId) {
                saveHabitToFirestore(currentUserId, syncedItem).catch(() => {});
              }
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
        MomentusLog.sync.warn('Erro ao salvar template criado no Firestore:', err)
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
        MomentusLog.sync.warn('Erro ao atualizar template no Firestore:', err)
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
        MomentusLog.sync.warn('Erro ao excluir template do Firestore:', err)
      );
    }
  };

  const upsertCategory = (
    id: string | null,
    name: string,
    color: string,
    stickerId: string | null,
    metaMinutosSemanal: number | null,
    icon?: string | null
  ) => {
    let targetCat: Category;
    if (id) {
      const existing = categories.find((c) => c.id === id);
      targetCat = {
        id,
        name,
        color,
        stickerId,
        metaMinutosSemanal,
        icon: icon !== undefined ? (icon || undefined) : existing?.icon,
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
        icon: icon || undefined,
      };
      setCategories((prev) => [...prev, targetCat]);
    }

    upsertCategoryDb(targetCat).catch((err) => {
      MomentusLog.sync.warn('Erro ao salvar categoria no banco local:', err);
    });

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      saveCategoryToFirestore(currentUid, targetCat).catch(() => {});
    }

    triggerHaptic('success');
  };

  const deleteCategory = (id: string) => {
    const currentCats = categoriesRef.current;
    // 1. Protege a categoria padrao do sistema ('Outros') contra exclusao
    const catToDelete = currentCats.find((c) => c.id === id);
    if (
      catToDelete &&
      (catToDelete.id === 'cat-outros' || catToDelete.name.trim().toLowerCase() === 'outros')
    ) {
      return;
    }

    // 2. Identifica a categoria canonica de fallback (Outros)
    const outrosCat =
      currentCats.find((c) => c.name.trim().toLowerCase() === 'outros') ||
      INITIAL_CATEGORIES[0];
    const fallbackCatId = outrosCat ? outrosCat.id : 'cat-outros';

    // 3. Atualiza estado e banco de categorias (fora de updater)
    const remaining = currentCats.filter((c) => c.id !== id);
    const finalCats = remaining.length > 0 ? remaining : INITIAL_CATEGORIES;
    categoriesRef.current = finalCats;
    setCategories(finalCats);
    setAllCategoriesDb(finalCats).catch(() => {});

    // 4. Reatribui com seguranca todos os habitos vinculados para a categoria de fallback
    const currentUid = firebaseAuth.currentUser?.uid;
    const reassignedHabits: HabitItem[] = [];
    const updatedHabits = habitsRef.current.map((h) => {
      if (h.categoryId === id) {
        const reassigned = { ...h, categoryId: fallbackCatId };
        reassignedHabits.push(reassigned);
        return reassigned;
      }
      return h;
    });

    if (reassignedHabits.length > 0) {
      habitsRef.current = updatedHabits;
      setHabits(updatedHabits);
      reassignedHabits.forEach((reassigned) => {
        upsertHabitDb(reassigned).catch(() => {});
        if (currentUid) {
          saveHabitToFirestore(currentUid, reassigned).catch(() => {});
        }
      });
    }

    if (currentUid) {
      deleteCategoryFromFirestore(currentUid, id).catch(() => {});
    }

    triggerHaptic('impact');
  };

  const buyMarketItem = (itemId: string): boolean => {
    const currentMarket = marketItemsRef.current;
    const currentProfile = userProfileRef.current;
    const item = currentMarket.find((i) => i.id === itemId);
    if (!item || item.isOwned || currentProfile.totalPoints < item.finalPrice) {
      return false;
    }

    const newPoints = Math.max(0, currentProfile.totalPoints - item.finalPrice);
    const updatedProfile: UserProfile = {
      ...currentProfile,
      totalPoints: newPoints,
    };
    const updatedMarket = currentMarket.map((i) => (i.id === itemId ? { ...i, isOwned: true } : i));

    userProfileRef.current = updatedProfile;
    marketItemsRef.current = updatedMarket;
    setUserProfile(updatedProfile);
    setMarketItems(updatedMarket);

    setAppKv('user_profile', updatedProfile).catch(() => {});
    setAllMarketItemsDb(updatedMarket).catch(() => {});

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      purchaseMarketItemInFirestore(currentUid, itemId, newPoints).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar compra de item no Firestore:', err)
      );
    }

    soundManager.playAchievementSound();
    triggerHaptic('success');
    return true;
  };

  const addFocusMinutes = (minutes: number) => {
    // 10 XP base por sessão concluída + 1 XP a cada 2 minutos de foco
    const sessionBonus = 10;
    const timeBonus = Math.floor(minutes / 2);
    const totalGained = sessionBonus + timeBonus;
    const todayDateStr = getTodayDateString();

    const prevProfile = userProfileRef.current;
    const updatedPoints = prevProfile.totalPoints + totalGained;
    const updatedFocusMinutes = prevProfile.focusMinutesToday + minutes;
    const updatedProfile: UserProfile = {
      ...prevProfile,
      focusMinutesToday: updatedFocusMinutes,
      totalPoints: updatedPoints,
    };
    userProfileRef.current = updatedProfile;
    setUserProfile(updatedProfile);

    const prevMap = focusHistoryMapRef.current;
    const nextFocusMap: Record<string, number> = {
      ...prevMap,
      [todayDateStr]: (prevMap[todayDateStr] || 0) + minutes,
    };
    focusHistoryMapRef.current = nextFocusMap;
    setFocusHistoryMap(nextFocusMap);

    // Efeitos colaterais seguros fora de updaters
    setAppKv('user_profile', updatedProfile).catch((err) =>
      MomentusLog.db.warn('Erro ao salvar user_profile após foco no SQLite:', err)
    );
    setAppKv('last_focus_date', todayDateStr).catch(() => {});
    setAppKv('focus_history_map', nextFocusMap).catch((err) =>
      MomentusLog.db.warn('Erro ao salvar focus_history_map no SQLite:', err)
    );

    const totalAllTimeFocus = Object.values(nextFocusMap).reduce((a, b) => a + b, 0);
    checkAndUnlockAchievements(
      updatedProfile.currentStreak,
      updatedProfile.totalCompleted,
      templatesRef.current.length,
      totalAllTimeFocus
    );

    const uid = firebaseAuth.currentUser?.uid;
    if (uid) {
      saveUserProfileToFirestore(uid, {
        totalPoints: updatedPoints,
      }).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar pontos de foco no Firestore:', err)
      );
    }

    soundManager.playAchievementSound();
    triggerHaptic('success');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const next: AppSettings = { ...settingsRef.current, ...newSettings };
    settingsRef.current = next;
    setSettings(next);
    setAppKv('app_settings', next).catch(() => {});
  };

  const updateUserProfile = (profileUpdates: Partial<UserProfile>) => {
    const next: UserProfile = { ...userProfileRef.current, ...profileUpdates };
    userProfileRef.current = next;
    setUserProfile(next);
    setAppKv('user_profile', next).catch(() => {});

    const uid = firebaseAuth.currentUser?.uid;
    if (uid) {
      saveUserProfileToFirestore(uid, profileUpdates as any).catch((err) =>
        MomentusLog.sync.warn('Erro ao atualizar perfil no Firestore:', err)
      );
    }
  };

  const clearAllLocalData = () => {
    // 1. Cancela todas as notificações locais agendadas
    cancelAllNotifications().catch(() => {});
    // 2. Limpa hábitos
    setHabits([]);
    // 3. Mantém exclusivamente a categoria padrão 'Outros'
    setCategories(INITIAL_CATEGORIES);
    // 4. Exclui todos os templates por completo (sem recolocar mocks)
    setTemplates([]);
    // 5. Reseta conquistas
    const resetAchievements = INITIAL_ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: false,
      progress: 0,
      unlockedAt: undefined,
    }));
    setAchievements(resetAchievements);
    // 6. Reseta completamente o inventário de itens da loja (nenhum possuído)
    const resetMarket = INITIAL_MARKET_ITEMS.map((item) => ({
      ...item,
      isOwned: false,
    }));
    setMarketItems(resetMarket);
    // 7. Zera pontuação e estatísticas preservando a sessão de autenticação se houver
    const resetProfile: UserProfile = {
      ...INITIAL_USER_PROFILE,
      name: userProfileRef.current.name,
      email: userProfileRef.current.email,
      photoUrl: userProfileRef.current.photoUrl,
      isLoggedIn: userProfileRef.current.isLoggedIn,
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalCompleted: 0,
      focusMinutesToday: 0,
    };
    habitsRef.current = [];
    categoriesRef.current = INITIAL_CATEGORIES;
    templatesRef.current = [];
    achievementsRef.current = resetAchievements;
    marketItemsRef.current = resetMarket;
    userProfileRef.current = resetProfile;
    settingsRef.current = INITIAL_SETTINGS;
    focusHistoryMapRef.current = {};

    setUserProfile(resetProfile);
    setSettings(INITIAL_SETTINGS);
    setFocusHistoryMap({});
    // 8. Aguarda limpeza total antes de gravar a base inicial limpa no banco local (evita race condition)
    AsyncStorage.removeItem(STORAGE_KEY)
      .catch(() => {})
      .then(() => clearEntireDatabase())
      .then(() =>
        Promise.all([
          setAppKv('focus_history_map', {}),
          setAppKv('user_profile', resetProfile),
          setAppKv('app_settings', INITIAL_SETTINGS),
          setAllCategoriesDb(INITIAL_CATEGORIES),
          setAllTemplatesDb([]),
          setAllMarketItemsDb(resetMarket),
          setAllAchievementsDb(resetAchievements),
        ])
      )
      .catch(() => {});
    triggerHaptic('impact');
  };

  const clearCloudDataAction = async (): Promise<boolean> => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser?.uid) {
      return false;
    }
    const ok = await clearCloudData(currentUser.uid);
    if (ok) {
      // Garante que a nuvem fique alinhada com a categoria padrão 'Outros'
      await saveCategoryToFirestore(currentUser.uid, INITIAL_CATEGORIES[0]).catch(() => {});
      triggerHaptic('impact');
    }
    return ok;
  };

  const resetAllDataAndLogout = async (): Promise<boolean> => {
    try {
      isLoggingOutRef.current = true;

      // 1. Desinscreve o listener em tempo real do Firestore imediatamente
      // para não receber eventos de deleção e não disparar syncCloudAction
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }

      // 2. Cancela todas as notificações locais agendadas
      await cancelAllNotifications().catch(() => {});

      // 3. Apaga da nuvem se o usuário estiver autenticado
      const currentUser = firebaseAuth.currentUser;
      if (currentUser?.uid) {
        await clearCloudData(currentUser.uid).catch(() => false);
      }

      // 4. Executa o logout e a limpeza completa local (SQLite, SecureStore, AsyncStorage, FirebaseAuth)
      await logout();

      isLoggingOutRef.current = false;
      return true;
    } catch (err) {
      isLoggingOutRef.current = false;
      MomentusLog.auth.error('Erro ao executar resetAllDataAndLogout:', err);
      return false;
    }
  };

  const exportBackupAction = async (): Promise<boolean> => {
    const backupTimestamp = formatBackupTimestamp();
    const candidateSettings = { ...settingsRef.current, lastBackupAt: backupTimestamp };
    const exported = await exportMomentusBackup({
      habits: habitsRef.current,
      categories: categoriesRef.current,
      templates: templatesRef.current,
      achievements: achievementsRef.current,
      marketItems: marketItemsRef.current,
      userProfile: userProfileRef.current,
      settings: candidateSettings,
      focusHistoryMap: focusHistoryMapRef.current,
    });
    if (exported) {
      settingsRef.current = candidateSettings;
      setSettings(candidateSettings);
      await setAppKv('app_settings', candidateSettings).catch(() => {});
    }
    return exported;
  };

  const importBackupAction = async (): Promise<boolean> => {
    const data = await importMomentusBackup();
    if (!data) return false;

    const backupTimestamp = formatBackupTimestamp();
    const nextSettings: AppSettings = {
      ...(data.settings || INITIAL_SETTINGS),
      lastBackupAt: backupTimestamp,
    };
    const nextFocusHistory = data.focusHistoryMap || {};

    habitsRef.current = data.habits || [];
    categoriesRef.current = data.categories || INITIAL_CATEGORIES;
    templatesRef.current = data.templates || INITIAL_TEMPLATES;
    achievementsRef.current = data.achievements || INITIAL_ACHIEVEMENTS;
    marketItemsRef.current = data.marketItems || INITIAL_MARKET_ITEMS;
    userProfileRef.current = data.userProfile || INITIAL_USER_PROFILE;
    settingsRef.current = nextSettings;
    focusHistoryMapRef.current = nextFocusHistory;

    setHabits(habitsRef.current);
    setCategories(categoriesRef.current);
    setTemplates(templatesRef.current);
    setAchievements(achievementsRef.current);
    setMarketItems(marketItemsRef.current);
    setUserProfile(userProfileRef.current);
    setSettings(nextSettings);
    setFocusHistoryMap(nextFocusHistory);

    // Persiste imediatamente no SQLite e AsyncStorage
    await setAllCategoriesDb(categoriesRef.current);
    await setAllHabitsDb(habitsRef.current);
    await setAllTemplatesDb(templatesRef.current);
    await setAllAchievementsDb(achievementsRef.current);
    await setAllMarketItemsDb(marketItemsRef.current);
    await setAppKv('user_profile', userProfileRef.current);
    await setAppKv('app_settings', nextSettings);
    await setAppKv('focus_history_map', nextFocusHistory);
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

  const syncGoogleCalendarToHabitsAction = useCallback(async (targetDate?: string): Promise<number> => {
    // Evita execuções simultâneas ou reentrâncias
    if (isSyncingGoogleCalendarRef.current) {
      return 0;
    }
    isSyncingGoogleCalendarRef.current = true;

    try {
      const gEvents = await fetchGoogleCalendarEvents(targetDate);
      if (!gEvents || gEvents.length === 0) return 0;

      const prevHabits = habitsRef.current;
      const converted = convertGoogleEventsToHabits(gEvents, categoriesRef.current, prevHabits);
      if (converted.length === 0) return 0;

      const convertedIds = new Set<string>();
      const convertedEventIds = new Set<string>();
      const convertedSignatures = new Set<string>();

      converted.forEach((h) => {
        convertedIds.add(h.id);
        if (h.googleCalendarEventId) {
          convertedEventIds.add(h.googleCalendarEventId);
        }
        const normTitle = (h.title || '').trim().toLowerCase();
        convertedSignatures.add(`${h.date}_${h.timeStart}_${normTitle}`);
      });

      // Remove duplicatas locais caso o evento já tenha sido integrado ou compartilhe a mesma data/horário/título
      const remaining = prevHabits.filter((p) => {
        if (convertedIds.has(p.id)) return false;
        if (p.googleCalendarEventId && convertedEventIds.has(p.googleCalendarEventId)) return false;
        const pSig = `${p.date}_${p.timeStart}_${(p.title || '').trim().toLowerCase()}`;
        if (convertedSignatures.has(pSig)) return false;
        return true;
      });

      const next = [...converted, ...remaining];
      const { cleanHabits, removedIds } = deduplicateHabits(next);

      habitsRef.current = cleanHabits;
      setHabits(cleanHabits);

      if (removedIds.length > 0) {
        const currentUserId = firebaseAuth.currentUser?.uid;
        removedIds.forEach((rid) => {
          deleteHabitDb(rid).catch(() => {});
          if (currentUserId) {
            deleteHabitFromFirestore(currentUserId, rid).catch(() => {});
          }
        });
      }
      setAllHabitsDb(cleanHabits).catch(() => {});

      return converted.length;
    } catch (err) {
      MomentusLog.calendar.warn('Erro ao sincronizar rotinas com o Google Agenda:', err);
      return 0;
    } finally {
      isSyncingGoogleCalendarRef.current = false;
    }
  }, []);

  const fetchGoogleEventsAction = async (targetDate?: string): Promise<GoogleCalendarEventItem[]> => {
    return await fetchGoogleCalendarEvents(targetDate);
  };

  const login = (email: string, name?: string, photoUrl?: string | null) => {
    const activeName = name || email.split('@')[0];
    const activePhoto = photoUrl !== undefined ? photoUrl : null;
    const activeUid = firebaseAuth.currentUser?.uid || `local-${Date.now()}`;

    saveSecureSession({
      uid: activeUid,
      email,
      name: activeName,
      photoUrl: activePhoto,
      lastActive: Date.now(),
    }).catch(() => {});

    setUserProfile((prev) => ({
      ...prev,
      email,
      name: activeName,
      photoUrl: activePhoto,
      isLoggedIn: true,
    }));
    triggerHaptic('success');
  };

  const logout = async (): Promise<void> => {
    isLoggingOutRef.current = true;
    try {
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }
      lastLoadedUid.current = null;
      await cancelAllNotifications().catch(() => {});
      await clearSecureSession().catch(() => {});
      await logoutUser().catch(() => {});
      await clearEntireDatabase().catch(() => {});
      await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
      resetLocalAccountState();
      triggerHaptic('impact');
    } finally {
      isLoggingOutRef.current = false;
    }
  };

  const acceptTermsAction = async (): Promise<void> => {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()}`;

    const nextSettings: AppSettings = {
      ...settingsRef.current,
      termsAccepted: true,
      termsAcceptedVersion: CURRENT_TERMS_VERSION,
      termsAcceptedAt: formattedDate,
    };

    settingsRef.current = nextSettings;
    setSettings(nextSettings);
    await setAppKv('app_settings', nextSettings);

    const currentUid = firebaseAuth.currentUser?.uid;
    if (currentUid) {
      try {
        await saveTermsAcceptance(currentUid, CURRENT_TERMS_VERSION);
      } catch (err) {
        MomentusLog.sync.warn('Erro ao salvar aceite de termos no Firestore:', err);
      }
    }

    soundManager.playSuccessSound();
    triggerHaptic('success');
  };

  const declineTermsAction = async (): Promise<void> => {
    await logout();
  };

  const isTermsAccepted = (): boolean => {
    return (
      !!settings.termsAccepted &&
      (settings.termsAcceptedVersion ?? 0) >= CURRENT_TERMS_VERSION
    );
  };

  const syncCloudAction = async (targetUid?: string): Promise<void> => {
    // Aguarda hidratação inicial antes de sincronizar para evitar race condition com loadState
    await loadStatePromiseRef.current;

    if (inFlightSyncPromiseRef.current) {
      MomentusLog.sync.debug('Sincronização com o Firestore já em andamento. Aguardando promessa ativa...');
      return inFlightSyncPromiseRef.current;
    }

    const syncTask = (async () => {
      const authUser = firebaseAuth.currentUser;
      const uid = targetUid || authUser?.uid;
      const latestProfile = userProfileRef.current;
      const latestSettings = settingsRef.current;

      if (!uid) {
        if (latestProfile.isLoggedIn) {
          const backupTimestamp = formatBackupTimestamp();
          const updatedSettings: AppSettings = {
            ...latestSettings,
            lastBackupAt: backupTimestamp,
          };
          settingsRef.current = updatedSettings;
          setSettings(updatedSettings);
          await setAppKv('app_settings', updatedSettings);
          return;
        }
        throw new Error('Faça login com sua conta Momentus para sincronizar os dados na nuvem.');
      }

      const currentProfileWithAuth: UserProfile = {
        ...latestProfile,
        name:
          authUser?.displayName?.trim() ||
          (latestProfile.name !== 'Usuário' ? latestProfile.name : (authUser?.email ? authUser.email.split('@')[0] : 'Usuário')),
        email: authUser?.email || latestProfile.email,
        photoUrl: authUser?.photoURL ?? latestProfile.photoUrl,
        isLoggedIn: true,
      };

      const activeHabitsToSync = habitsRef.current.filter(
        (h) => !deletedHabitIdsRef.current.has(h.id)
      );

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
        activeHabitsToSync,
        categoriesRef.current,
        templatesRef.current,
        achievementsRef.current,
        marketItemsRef.current,
        currentProfileWithAuth
      );

      if (isLoggingOutRef.current) return;

      const finalMergedHabits = mergedHabits.filter(
        (h) => !deletedHabitIdsRef.current.has(h.id)
      );
      const { cleanHabits: cleanMergedHabits, removedIds: cloudRemovedIds } = deduplicateHabits(finalMergedHabits);
      if (cloudRemovedIds.length > 0) {
        cloudRemovedIds.forEach((rid) => {
          deleteHabitDb(rid).catch(() => {});
          if (uid) deleteHabitFromFirestore(uid, rid).catch(() => {});
        });
      }

      const currentSettingsNow = settingsRef.current;
      const backupTimestamp = formatBackupTimestamp();
      const termsAcceptedCombined = currentSettingsNow.termsAccepted || cloudTermsAccepted;
      const termsVersionCombined = Math.max(
        currentSettingsNow.termsAcceptedVersion ?? 0,
        cloudTermsVersion ?? 0
      );

      const updatedSettings: AppSettings = {
        ...currentSettingsNow,
        lastBackupAt: backupTimestamp,
        termsAccepted: termsAcceptedCombined,
        termsAcceptedVersion: termsVersionCombined,
      };

      const effectiveProfile = mergedUserProfile || currentProfileWithAuth;

      // Apenas registra conquistas já desbloqueadas vindas da nuvem no conjunto creditado,
      // sem re-somar XP ao saldo (o totalPoints da nuvem já contabiliza as conquistas desbloqueadas).
      const unlockedAchievements = mergedAchievements.filter((a) => a.unlocked);
      const creditedSet = creditedAchievementIdsRef.current;
      let creditedChanged = false;
      unlockedAchievements.forEach((ach) => {
        if (!creditedSet.has(ach.id)) {
          creditedSet.add(ach.id);
          creditedChanged = true;
        }
      });
      if (creditedChanged) {
        await setAppKv('credited_achievement_ids', Array.from(creditedSet)).catch(() => {});
      }

      habitsRef.current = cleanMergedHabits;
      categoriesRef.current = mergedCategories;
      templatesRef.current = mergedTemplates;
      achievementsRef.current = mergedAchievements;
      marketItemsRef.current = mergedMarketItems;
      userProfileRef.current = effectiveProfile;
      settingsRef.current = updatedSettings;

      setHabits(cleanMergedHabits);
      setCategories(mergedCategories);
      setTemplates(mergedTemplates);
      setAchievements(mergedAchievements);
      setMarketItems(mergedMarketItems);
      setUserProfile(effectiveProfile);
      setSettings(updatedSettings);

      await Promise.all([
        setAllHabitsDb(cleanMergedHabits),
        setAllCategoriesDb(mergedCategories),
        setAllTemplatesDb(mergedTemplates),
        setAllAchievementsDb(mergedAchievements),
        setAllMarketItemsDb(mergedMarketItems),
        setAppKv('user_profile', effectiveProfile),
        setAppKv('app_settings', updatedSettings),
      ]).catch(() => {});
    })();

    inFlightSyncPromiseRef.current = syncTask;
    try {
      await syncTask;
    } finally {
      inFlightSyncPromiseRef.current = null;
    }
  };

  const toggleHabitRef = useRef(toggleHabit);
  useEffect(() => {
    toggleHabitRef.current = toggleHabit;
    syncCloudActionRef.current = syncCloudAction;
  });

  // Escuta interações com notificações (registrado uma única vez usando habitsRef para evitar re-inscrições)
  useEffect(() => {
    return subscribeToHabitNotificationResponses({
      onMarkCompleted: (habitId) => {
        const target = habitsRef.current.find((h) => h.id === habitId);
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
  }, []);

  // Sincroniza estado diário (próximas rotinas, streak e progresso) com Widgets Nativos (Android & iOS)
  useEffect(() => {
    if (!isLoaded || Platform.OS === 'web') return;
    const timer = setTimeout(() => {
      syncHomeScreenWidgets(
        habits,
        categories,
        userProfile.currentStreak,
        theme.primary,
        theme.isDark,
        theme.isOled
      ).catch(() => {});
    }, 300);

    return () => clearTimeout(timer);
  }, [
    isLoaded,
    habits,
    categories,
    userProfile.currentStreak,
    theme.primary,
    theme.isDark,
    theme.isOled,
  ]);

  // Escuta interações ao vivo do WidgetKit iOS e reconcilia check-offs feitos offline (Android & iOS)
  useEffect(() => {
    if (!isLoaded || Platform.OS === 'web') return;

    reconcilePendingWidgetToggles((habitId) => {
      toggleHabitRef.current(habitId);
    }).catch(() => {});

    const unsubscribeWidget = subscribeToWidgetInteractions((habitId) => {
      toggleHabitRef.current(habitId);
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        reconcilePendingWidgetToggles((habitId) => {
          toggleHabitRef.current(habitId);
        }).catch(() => {});
      }
    });

    return () => {
      unsubscribeWidget();
      appStateSub.remove();
    };
  }, [isLoaded]);

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
        focusHistoryMap,
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
        updateUserProfile,
        clearAllLocalData,
        clearCloudDataAction,
        resetAllDataAndLogout,
        syncAllHabitsToCalendarAction,
        syncGoogleCalendarToHabitsAction,
        fetchGoogleEventsAction,
        exportBackupAction,
        importBackupAction,
        login,
        logout,
        syncCloudAction,
        isPostLoginActive,
        setIsPostLoginActive,
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

