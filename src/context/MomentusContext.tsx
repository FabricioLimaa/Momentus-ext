import React, { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useColorScheme, Alert, Platform } from 'react-native';
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
    mode?: 'merge' | 'incremental'
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
    metaMinutosSemanal: number | null
  ) => void;
  deleteCategory: (id: string) => void;
  // Market Actions
  buyMarketItem: (itemId: string) => boolean;
  // Focus Actions
  addFocusMinutes: (minutes: number) => void;
  // Haptics Action
  triggerHaptic: (type: 'impact' | 'success' | 'selection') => void;
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
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

  // Estado de controle para impedir corte brusco da SplashScreen no pós-login
  const [isPostLoginActive, setIsPostLoginActive] = useState<boolean>(false);

  // Registro das datas cujos pontos de dia completo já foram validados (Anti-Abuse)
  const [validatedDayDates, setValidatedDayDates] = useState<string[]>([]);
  const validatedDayDatesRef = useRef<string[]>([]);
  useEffect(() => {
    validatedDayDatesRef.current = validatedDayDates;
  }, [validatedDayDates]);

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
  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

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
        const filteredHab = rawHab
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

        setHabits(initialHab);

        // Recalcula estritamente os hábitos concluídos, dias 100% concluídos e streak real
        const initialCompletedDays = getFullyCompletedDates(initialHab);
        const realTotalHabitsCompleted = initialHab.filter((h: HabitItem) => h.completed).length;
        const realStreak = calculateStreakFromCompletedDays(initialCompletedDays, getTodayDateString());

        // Carrega datas já validadas de bônus diário para evitar pontos duplicados
        const savedValidatedDays = await getAppKv<string[]>('validated_day_dates');
        if (Array.isArray(savedValidatedDays)) {
          setValidatedDayDates(savedValidatedDays);
        } else if (initialCompletedDays.length > 0) {
          setValidatedDayDates(initialCompletedDays);
          await setAppKv('validated_day_dates', initialCompletedDays).catch(() => {});
        }

        const cleanAchievements =
          dbAchievements.length > 0
            ? dbAchievements
            : (legacyParsed?.achievements || INITIAL_ACHIEVEMENTS);

        // Garante que conquistas já desbloqueadas tenham seus pontos somados ao saldo do usuário
        const savedCreditedAchs = await getAppKv<string[]>('credited_achievement_ids');
        const creditedSet = new Set<string>(Array.isArray(savedCreditedAchs) ? savedCreditedAchs : []);
        creditedAchievementIdsRef.current = creditedSet;

        let bonusAchievementPoints = 0;
        cleanAchievements.forEach((ach: Achievement) => {
          if (ach.unlocked && !creditedSet.has(ach.id)) {
            bonusAchievementPoints += (ach.xpReward || 0);
            creditedSet.add(ach.id);
          }
        });

        if (bonusAchievementPoints > 0) {
          await setAppKv('credited_achievement_ids', Array.from(creditedSet)).catch(() => {});
        }

        setUserProfile((p) => ({
          ...p,
          totalPoints: p.totalPoints + bonusAchievementPoints,
          totalCompleted: realTotalHabitsCompleted,
          currentStreak: realStreak,
          bestStreak: Math.max(p.bestStreak, realStreak),
        }));

        const cleanTemplates = (dbTemplates.length > 0 ? dbTemplates : (legacyParsed?.templates || [])).filter(
          (t: RoutineTemplate) => !LEGACY_MOCK_TMPL_IDS.has(t.id)
        );
        setTemplates(cleanTemplates);
        setAchievements(cleanAchievements);

        const cleanMarketItems =
          dbMarketItems.length > 0
            ? dbMarketItems
            : (legacyParsed?.marketItems || INITIAL_MARKET_ITEMS);
        setMarketItems(cleanMarketItems);
      } catch (e) {
        MomentusLog.db.warn('Erro ao carregar dados do banco:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadState();
    // Solicita permissões de notificação e configura os canais no início
    requestNotificationPermissions().catch(() => {});

    // Observa mudanças de autenticação do Firebase e sincroniza automaticamente
    const unsubAuth = onAuthStateChanged(firebaseAuth, async (user) => {
      if (unsubFirestoreRef.current) {
        unsubFirestoreRef.current();
        unsubFirestoreRef.current = null;
      }

      if (isLoggingOutRef.current) {
        setUserProfile(INITIAL_USER_PROFILE);
        return;
      }

      if (!user) {
        const secureSession = await getSecureSession();
        if (!secureSession || isLoggingOutRef.current) {
          setUserProfile(INITIAL_USER_PROFILE);
        } else {
          MomentusLog.auth.debug('Firebase Auth reportou user nulo provisório, preservando sessão local.');
        }
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
  }, []);

  // Persistência contínua: grava no SQLite e mantém AsyncStorage sincronizado
  useEffect(() => {
    if (!isLoaded || isLoggingOutRef.current) return;
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
        MomentusLog.db.warn('Erro ao persistir dados do Momentus:', e);
      }
    }
    saveState();
  }, [habits, categories, templates, achievements, marketItems, userProfile, settings, isLoaded]);

  const userLevel = calculateUserLevel(userProfile.totalPoints);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const scale = settings.fontSizeMultiplier || 1.0;
      if (document.body) {
        (document.body.style as any).zoom = String(scale);
      }
    }
  }, [settings.fontSizeMultiplier]);

  const triggerHaptic = (type: 'impact' | 'success' | 'selection') => {
    if (!settings.hapticsEnabled) return;
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(type === 'selection' ? 8 : type === 'impact' ? 20 : [30, 40, 30]);
        }
        return;
      }
      if (type === 'selection') {
        Haptics.selectionAsync().catch(() => {});
      } else if (type === 'impact') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
        }

        if (shouldUnlock) {
          newlyUnlocked = true;
          addPoints(ach.xpReward);

          // Registra a conquista como creditada
          creditedAchievementIdsRef.current.add(ach.id);
          setAppKv('credited_achievement_ids', Array.from(creditedAchievementIdsRef.current)).catch(() => {});

          // Salva no Firestore instantaneamente (idêntico ao GamificationRepository.kt do Kotlin)
          const currentUserId = firebaseAuth.currentUser?.uid;
          if (currentUserId) {
            saveAchievementUnlockedToFirestore(currentUserId, ach.id, ach.xpReward).catch(() => {});
          }

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
    let isDayFullyComplete = false;
    let isFirstTimeDayValidated = false;
    let nextTotalHabitsCompleted = 0;
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
            streak: nextCompleted ? 1 : 0,
          };
        }
        return habit;
      });

      // 1. Total de Hábitos Concluídos (reflete estritamente a quantidade real de hábitos marcados)
      nextTotalHabitsCompleted = updated.filter((h) => h.completed).length;

      // 2. Dias 100% Concluídos e Sequência (Streak de dias seguidos)
      const fullyCompletedDates = getFullyCompletedDates(updated);
      nextStreak = calculateStreakFromCompletedDays(fullyCompletedDates, getTodayDateString());

      // 3. Verificação de Dia Completo e Anti-Abuse de XP
      if (nextCompleted && targetDate) {
        const dayHabits = updated.filter((h) => h.date === targetDate);
        if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
          isDayFullyComplete = true;
          const currentValidated = validatedDayDatesRef.current;
          if (!currentValidated.includes(targetDate)) {
            isFirstTimeDayValidated = true;
            const nextValidated = [...currentValidated, targetDate];
            setValidatedDayDates(nextValidated);
            setAppKv('validated_day_dates', nextValidated).catch(() => {});
          }
        }
      }

      setUserProfile((p) => {
        const habitDeltaPoints = nextCompleted ? 15 : -15;
        const dayBonusPoints = isFirstTimeDayValidated ? 25 : 0;
        const nextPoints = Math.max(0, p.totalPoints + habitDeltaPoints + dayBonusPoints);
        const nextBestStreak = Math.max(p.bestStreak, nextStreak);
        const nextProfile: UserProfile = {
          ...p,
          totalPoints: nextPoints,
          totalCompleted: nextTotalHabitsCompleted,
          currentStreak: nextStreak,
          bestStreak: nextBestStreak,
        };

        const currentUserId = firebaseAuth.currentUser?.uid;
        if (currentUserId) {
          saveUserProfileToFirestore(currentUserId, {
            totalPoints: nextPoints,
            totalCompleted: nextTotalHabitsCompleted,
            currentStreak: nextStreak,
            bestStreak: nextBestStreak,
          }).catch(() => {});
        }

        return nextProfile;
      });

      return updated;
    });

    if (isDayFullyComplete) {
      if (isFirstTimeDayValidated) {
        showCelebration(
          'Dia Conquistado! 🌟',
          'Parabéns! Você concluiu 100% das suas tarefas planejadas.',
          25
        );
      } else {
        showCelebration(
          'Dia Conquistado! 🌟',
          'Parabéns! Suas tarefas do dia estão 100% concluídas.',
          0
        );
      }
    }

    checkAndUnlockAchievements(nextStreak, nextTotalHabitsCompleted, templates.length);

    const currentHabit = habits.find((h) => h.id === id);
    if (currentHabit) {
      upsertHabitDb({
        ...currentHabit,
        completed: nextCompleted,
        streak: nextCompleted ? 1 : 0,
      }).catch(() => {});
    }

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      saveHabitCompletionToFirestore(
        currentUserId,
        id,
        targetDate || getTodayDateString(),
        nextCompleted
      ).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar conclusão no Firestore:', err)
      );
      if (currentHabit) {
        saveHabitToFirestore(currentUserId, {
          ...currentHabit,
          completed: nextCompleted,
          streak: nextCompleted ? 1 : 0,
        }).catch((err) =>
          MomentusLog.sync.warn('Erro ao salvar hábito alterado no Firestore:', err)
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
    const shouldSyncCalendar = newHabit.saveToGoogle ?? settings.googleCalendarSyncEnabled;
    if (shouldSyncCalendar) {
      const category = categories.find((c) => c.id === newHabit.categoryId);
      syncHabitToDeviceCalendar(newHabit, category)
        .then((eventId) => {
          if (eventId) {
            const syncedHabit = {
              ...newHabit,
              googleCalendarEventId: eventId,
              saveToGoogle: true,
            };
            setHabits((prev) => {
              // Previne duplicata caso uma importação paralela do Google Agenda tenha gerado google_${eventId}
              const cleaned = prev.filter((h) => h.id !== `google_${eventId}`);
              const updated = cleaned.map((h) => (h.id === newHabit.id ? syncedHabit : h));
              const { cleanHabits, removedIds } = deduplicateHabits(updated);
              if (removedIds.length > 0) {
                removedIds.forEach((rid) => {
                  deleteHabitDb(rid).catch(() => {});
                  if (currentUserId) {
                    deleteHabitFromFirestore(currentUserId, rid).catch(() => {});
                  }
                });
              }
              return cleanHabits;
            });
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
    const habitToDelete = habits.find((h) => h.id === id);
    if (habitToDelete) {
      cancelHabitNotifications(id).catch(() => {});
      if (habitToDelete.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(habitToDelete.googleCalendarEventId).catch(() => {});
      }
    }

    setHabits((prev) => {
      const remaining = prev.filter((h) => h.id !== id);
      const remainingCompleted = remaining.filter((h) => h.completed).length;
      const completedDays = getFullyCompletedDates(remaining);
      const remainingStreak = calculateStreakFromCompletedDays(completedDays, getTodayDateString());

      setUserProfile((p) => {
        const nextProfile: UserProfile = {
          ...p,
          totalCompleted: remainingCompleted,
          currentStreak: remainingStreak,
        };
        const currentUserId = firebaseAuth.currentUser?.uid;
        if (currentUserId) {
          saveUserProfileToFirestore(currentUserId, {
            totalCompleted: remainingCompleted,
            currentStreak: remainingStreak,
          }).catch(() => {});
        }
        return nextProfile;
      });

      return remaining;
    });

    deleteHabitDb(id).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      deleteHabitFromFirestore(currentUserId, id).catch((err) =>
        MomentusLog.sync.warn('Erro ao excluir hábito no Firestore:', err)
      );
    }
  };

  const deleteMultipleHabits = (ids: string[]) => {
    ids.forEach((id) => deletedHabitIdsRef.current.add(id));
    const idSet = new Set(ids);
    const toDelete = habits.filter((h) => idSet.has(h.id));
    toDelete.forEach((h) => {
      cancelHabitNotifications(h.id).catch(() => {});
      if (h.googleCalendarEventId) {
        deleteHabitFromDeviceCalendar(h.googleCalendarEventId).catch(() => {});
      }
    });

    setHabits((prev) => {
      const remaining = prev.filter((h) => !idSet.has(h.id));
      const remainingCompleted = remaining.filter((h) => h.completed).length;
      const completedDays = getFullyCompletedDates(remaining);
      const remainingStreak = calculateStreakFromCompletedDays(completedDays, getTodayDateString());

      setUserProfile((p) => {
        const nextProfile: UserProfile = {
          ...p,
          totalCompleted: remainingCompleted,
          currentStreak: remainingStreak,
        };
        const currentUserId = firebaseAuth.currentUser?.uid;
        if (currentUserId) {
          saveUserProfileToFirestore(currentUserId, {
            totalCompleted: remainingCompleted,
            currentStreak: remainingStreak,
          }).catch(() => {});
        }
        return nextProfile;
      });

      return remaining;
    });

    deleteMultipleHabitsDb(ids).catch(() => {});
    triggerHaptic('impact');

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (currentUserId) {
      deleteMultipleHabitsFromFirestore(currentUserId, ids).catch((err) =>
        MomentusLog.sync.warn('Erro ao excluir múltiplos hábitos no Firestore:', err)
      );
    }
  };

  const updateHabit = (updated: HabitItem) => {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
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
      const category = categories.find((c) => c.id === updated.categoryId);
      syncHabitToDeviceCalendar(updated, category)
        .then((eventId) => {
          if (eventId && eventId !== updated.googleCalendarEventId) {
            const synced = { ...updated, googleCalendarEventId: eventId, saveToGoogle: true };
            setHabits((prev) => {
              const cleaned = prev.filter((h) => h.id !== `google_${eventId}`);
              const mapped = cleaned.map((h) => (h.id === updated.id ? synced : h));
              const { cleanHabits, removedIds } = deduplicateHabits(mapped);
              if (removedIds.length > 0) {
                removedIds.forEach((rid) => {
                  deleteHabitDb(rid).catch(() => {});
                  if (currentUserId) {
                    deleteHabitFromFirestore(currentUserId, rid).catch(() => {});
                  }
                });
              }
              return cleanHabits;
            });
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
    mode: 'merge' | 'incremental' = 'merge'
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

    const nowTimestamp = Date.now();

    dates.forEach((targetDate, dateIdx) => {
      uniqueTemplateItems.forEach((item, itemIdx) => {
        const itemIdStr = item.id || `item_${itemIdx}`;
        const deterministicId =
          mode === 'incremental'
            ? `applied_${itemIdStr}_${targetDate}_${nowTimestamp}_${dateIdx}_${itemIdx}`
            : `applied_${itemIdStr}_${targetDate}`;

        // Remove do cache de IDs deletados para permitir re-aplicar o template no mesmo dia
        deletedHabitIdsRef.current.delete(deterministicId);
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
          templateSourceId: template.id,
        });
      });
    });

    setHabits((prev) => {
      if (mode === 'incremental') {
        // No modo incremental, simplesmente anexa sem sobrescrever nenhum hábito existente
        return [...newHabits, ...prev];
      }

      const prevMap = new Map(prev.map((p) => [p.id, p]));
      // Preserva o status de conclusão se o hábito já tinha sido concluído anteriormente
      const adjustedNewHabits = newHabits.map((nh) => {
        // 1. Procura por ID exato
        let existing = prevMap.get(nh.id);

        // 2. Se não encontrou por ID exato, procura por correspondência na mesma data por templateSourceId ou mesmo título
        if (!existing) {
          existing = prev.find(
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

      const newHabitsMap = new Map(adjustedNewHabits.map((h) => [h.id, h]));
      const filteredPrev = prev.filter((p) => !newHabitsMap.has(p.id));
      return [...adjustedNewHabits, ...filteredPrev];
    });

    soundManager.playSuccessSound();
    triggerHaptic('success');
    checkAndUnlockAchievements(userProfile.currentStreak, userProfile.totalCompleted, templates.length);

    const currentUserId = firebaseAuth.currentUser?.uid;
    if (newHabits.length > 0) {
      newHabits.forEach((h) => upsertHabitDb(h).catch(() => {}));
    }
    if (currentUserId && newHabits.length > 0) {
      Promise.all(newHabits.map((h) => saveHabitToFirestore(currentUserId, h))).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar hábitos do template no Firestore:', err)
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
              const syncedItem = { ...h, googleCalendarEventId: eventId, saveToGoogle: true };
              setHabits((prev) =>
                prev.map((item) => (item.id === h.id ? syncedItem : item))
              );
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
    // 1. Protege a categoria padrao do sistema ('Outros') contra exclusao
    const catToDelete = categories.find((c) => c.id === id);
    if (
      catToDelete &&
      (catToDelete.id === 'cat-outros' || catToDelete.name.trim().toLowerCase() === 'outros')
    ) {
      return;
    }

    // 2. Identifica a categoria canonica de fallback (Outros)
    const outrosCat =
      categories.find((c) => c.name.trim().toLowerCase() === 'outros') ||
      INITIAL_CATEGORIES[0];
    const fallbackCatId = outrosCat ? outrosCat.id : 'cat-outros';

    // 3. Atualiza estado e banco de categorias
    setCategories((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      const finalCats = remaining.length > 0 ? remaining : INITIAL_CATEGORIES;
      setAllCategoriesDb(finalCats).catch(() => {});
      return finalCats;
    });

    // 4. Reatribui com seguranca todos os habitos vinculados para a categoria de fallback
    setHabits((prev) => {
      let hasChanges = false;
      const currentUid = firebaseAuth.currentUser?.uid;
      const updatedHabits = prev.map((h) => {
        if (h.categoryId === id) {
          hasChanges = true;
          const reassigned = { ...h, categoryId: fallbackCatId };
          upsertHabitDb(reassigned).catch(() => {});
          if (currentUid) {
            saveHabitToFirestore(currentUid, reassigned).catch(() => {});
          }
          return reassigned;
        }
        return h;
      });
      return hasChanges ? updatedHabits : prev;
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

    const newPoints = Math.max(0, userProfile.totalPoints - item.finalPrice);
    const _newLevelInfo = calculateUserLevel(newPoints);

    setUserProfile((prev) => {
      const updated: UserProfile = {
        ...prev,
        totalPoints: newPoints,
      };
      setAppKv('user_profile', updated).catch(() => {});
      return updated;
    });

    setMarketItems((prev) => {
      const updated = prev.map((i) => (i.id === itemId ? { ...i, isOwned: true } : i));
      setAllMarketItemsDb(updated).catch(() => {});
      return updated;
    });

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

    let updatedPoints = 0;
    let updatedFocusMinutes = 0;
    const todayDateStr = getTodayDateString();

    setUserProfile((prev) => {
      updatedPoints = prev.totalPoints + totalGained;
      updatedFocusMinutes = prev.focusMinutesToday + minutes;
      const updated: UserProfile = {
        ...prev,
        focusMinutesToday: updatedFocusMinutes,
        totalPoints: updatedPoints,
      };
      setAppKv('user_profile', updated).catch((err) =>
        MomentusLog.db.warn('Erro ao salvar user_profile após foco no SQLite:', err)
      );
      setAppKv('last_focus_date', todayDateStr).catch(() => {});
      return updated;
    });

    // Registra no histórico diário permanente para consolidação nas Estatísticas
    setFocusHistoryMap((prev) => {
      const nextTotal = (prev[todayDateStr] || 0) + minutes;
      const nextMap = { ...prev, [todayDateStr]: nextTotal };
      setAppKv('focus_history_map', nextMap).catch((err) =>
        MomentusLog.db.warn('Erro ao salvar focus_history_map no SQLite:', err)
      );
      return nextMap;
    });

    const uid = firebaseAuth.currentUser?.uid;
    if (uid) {
      saveUserProfileToFirestore(uid, {
        totalPoints: updatedPoints || (userProfile.totalPoints + totalGained),
      }).catch((err) =>
        MomentusLog.sync.warn('Erro ao salvar pontos de foco no Firestore:', err)
      );
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
    setUserProfile((prev) => ({
      ...INITIAL_USER_PROFILE,
      name: prev.name,
      email: prev.email,
      photoUrl: prev.photoUrl,
      isLoggedIn: prev.isLoggedIn,
      totalPoints: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalCompleted: 0,
      focusMinutesToday: 0,
    }));
    setSettings(INITIAL_SETTINGS);
    setFocusHistoryMap({});
    setAppKv('focus_history_map', {}).catch(() => {});
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    clearEntireDatabase().catch(() => {});
    // 8. Grava a base inicial limpa no banco local SQLite
    setAllCategoriesDb(INITIAL_CATEGORIES).catch(() => {});
    setAllTemplatesDb([]).catch(() => {});
    setAllMarketItemsDb(resetMarket).catch(() => {});
    setAllAchievementsDb(resetAchievements).catch(() => {});
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

  const syncGoogleCalendarToHabitsAction = useCallback(async (targetDate?: string): Promise<number> => {
    // Evita execuções simultâneas ou reentrâncias
    if (isSyncingGoogleCalendarRef.current) {
      return 0;
    }
    isSyncingGoogleCalendarRef.current = true;

    try {
      const gEvents = await fetchGoogleCalendarEvents(targetDate);
      if (!gEvents || gEvents.length === 0) return 0;

      let convertedTotal = 0;

      setHabits((prev) => {
        // Usa o estado MAIS RECENTE 'prev' para converter, garantindo que toggles de conclusão nunca sejam sobrescritos
        const converted = convertGoogleEventsToHabits(gEvents, categoriesRef.current, prev);
        if (converted.length === 0) return prev;
        convertedTotal = converted.length;

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
        const remaining = prev.filter((p) => {
          if (convertedIds.has(p.id)) return false;
          if (p.googleCalendarEventId && convertedEventIds.has(p.googleCalendarEventId)) return false;
          const pSig = `${p.date}_${p.timeStart}_${(p.title || '').trim().toLowerCase()}`;
          if (convertedSignatures.has(pSig)) return false;
          return true;
        });

        const next = [...converted, ...remaining];
        const { cleanHabits, removedIds } = deduplicateHabits(next);
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
        return cleanHabits;
      });

      return convertedTotal;
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
    if (unsubFirestoreRef.current) {
      unsubFirestoreRef.current();
      unsubFirestoreRef.current = null;
    }
    lastLoadedUid.current = null;
    setUserProfile(INITIAL_USER_PROFILE);
    await clearSecureSession().catch(() => {});
    await logoutUser().catch(() => {});
    await clearEntireDatabase().catch(() => {});
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    setHabits([]);
    setCategories(INITIAL_CATEGORIES);
    setTemplates([]);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMarketItems(INITIAL_MARKET_ITEMS);
    triggerHaptic('impact');
    setUserProfile(INITIAL_USER_PROFILE);
    isLoggingOutRef.current = false;
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
        MomentusLog.sync.warn('Erro ao salvar aceite de termos no Firestore:', err);
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
    if (inFlightSyncPromiseRef.current) {
      MomentusLog.sync.debug('Sincronização com o Firestore já em andamento. Aguardando promessa ativa...');
      return inFlightSyncPromiseRef.current;
    }

    const syncTask = (async () => {
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

      const activeHabitsToSync = habits.filter(
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
        categories,
        templates,
        achievements,
        marketItems,
        currentProfileWithAuth
      );

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

      // Garante crédito de XP para cada conquista desbloqueada que ainda não foi contabilizada no saldo
      const unlockedAchievements = mergedAchievements.filter((a) => a.unlocked);
      const creditedSet = creditedAchievementIdsRef.current;
      let missingAchievementPoints = 0;

      unlockedAchievements.forEach((ach) => {
        if (!creditedSet.has(ach.id)) {
          missingAchievementPoints += (ach.xpReward || 0);
          creditedSet.add(ach.id);
        }
      });

      if (missingAchievementPoints > 0) {
        effectiveProfile = {
          ...effectiveProfile,
          totalPoints: effectiveProfile.totalPoints + missingAchievementPoints,
        };
        saveUserProfileToFirestore(uid, {
          totalPoints: effectiveProfile.totalPoints,
        } as any).catch(() => {});
        await setAppKv('credited_achievement_ids', Array.from(creditedSet)).catch(() => {});
      }

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

