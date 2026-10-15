import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
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
} from '@/constants/initialData';
import { calculateUserLevel, UserLevelInfo } from '@/domain/userLevel';
import { soundManager } from '@/util/soundManager';
import { MomentusColors } from '@/constants/theme';
import { CelebrationModal } from '@/components/momentus/CelebrationModal';

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
  // Settings Actions
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  clearAllLocalData: () => void;
  // Auth Actions
  login: (email: string, name?: string) => void;
  logout: () => void;
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

  const showCelebration = (title: string, message: string, pointsEarned?: number) => {
    setCelebration({ visible: true, title, message, pointsEarned });
  };

  const hideCelebration = () => {
    setCelebration(null);
  };

  // Sync sound settings with SoundManager
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
  }, [settings.soundEnabled]);

  // Load from AsyncStorage
  useEffect(() => {
    async function loadState() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.habits) setHabits(parsed.habits);
          if (parsed.categories) setCategories(parsed.categories);
          if (parsed.templates) setTemplates(parsed.templates);
          if (parsed.achievements) setAchievements(parsed.achievements);
          if (parsed.marketItems) setMarketItems(parsed.marketItems);
          if (parsed.userProfile) setUserProfile(parsed.userProfile);
          if (parsed.settings) setSettings(parsed.settings);
        }
      } catch (e) {
        console.warn('Erro ao carregar dados do Momentus:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadState();
  }, []);

  // Save to AsyncStorage
  useEffect(() => {
    if (!isLoaded) return;
    async function saveState() {
      try {
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
        console.warn('Erro ao salvar dados do Momentus:', e);
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

  const toggleHabit = (id: string) => {
    let nextCompleted = false;
    let nextTotalCompleted = userProfile.totalCompleted;
    let nextStreak = userProfile.currentStreak;
    let targetDate = '';

    setHabits((prev) => {
      const updated = prev.map((habit) => {
        if (habit.id === id) {
          nextCompleted = !habit.completed;
          targetDate = habit.date;
          if (nextCompleted) {
            soundManager.playSuccessSound();
            triggerHaptic('success');
            addPoints(15);
            nextTotalCompleted += 1;
            nextStreak = Math.max(nextStreak, habit.streak + 1);
            setUserProfile((p) => ({
              ...p,
              totalCompleted: p.totalCompleted + 1,
              currentStreak: nextStreak,
              bestStreak: Math.max(p.bestStreak, nextStreak),
            }));
          } else {
            triggerHaptic('impact');
          }
          return {
            ...habit,
            completed: nextCompleted,
            streak: nextCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1),
          };
        }
        return habit;
      });

      if (nextCompleted && targetDate) {
        const dayHabits = updated.filter((h) => h.date === targetDate);
        if (dayHabits.length > 0 && dayHabits.every((h) => h.completed)) {
          showCelebration(
            'Dia Conquistado! 🌟',
            'Parabéns! Você concluiu 100% das suas tarefas planejadas.',
            25
          );
        }
      }

      return updated;
    });

    checkAndUnlockAchievements(nextStreak, nextTotalCompleted, templates.length);
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
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    triggerHaptic('impact');
  };

  const deleteMultipleHabits = (ids: string[]) => {
    const idSet = new Set(ids);
    setHabits((prev) => prev.filter((h) => !idSet.has(h.id)));
    triggerHaptic('impact');
  };

  const updateHabit = (updated: HabitItem) => {
    setHabits((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    triggerHaptic('impact');
  };

  const applyTemplateToToday = (templateId: string) => {
    applyTemplateToDates(templateId, [getTodayDateString()]);
  };

  const applyTemplateToDates = (templateId: string, dates: string[], saveToGoogle?: boolean) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template || dates.length === 0) return;

    const newHabits: HabitItem[] = [];
    dates.forEach((targetDate) => {
      template.items.forEach((item, index) => {
        newHabits.push({
          id: `h-tmpl-${Date.now()}-${targetDate}-${index}`,
          title: item.title,
          description: `Importado de "${template.title}"`,
          timeStart: item.timeStart || '08:00',
          timeEnd: item.timeEnd,
          categoryId: item.categoryId,
          completed: false,
          date: targetDate,
          streak: 0,
          saveToGoogle: !!saveToGoogle,
        });
      });
    });

    setHabits((prev) => [...newHabits, ...prev]);
    addPoints(20 * dates.length);
    soundManager.playSuccessSound();
    triggerHaptic('success');
    checkAndUnlockAchievements(userProfile.currentStreak, userProfile.totalCompleted, templates.length);
  };


  const addTemplate = (templateData: Omit<RoutineTemplate, 'id'>) => {
    const newTemplate: RoutineTemplate = {
      ...templateData,
      id: `tmpl-${Date.now()}`,
    };
    const nextTemplates = [...templates, newTemplate];
    setTemplates(nextTemplates);
    triggerHaptic('success');
    checkAndUnlockAchievements(userProfile.currentStreak, userProfile.totalCompleted, nextTemplates.length);
  };

  const upsertCategory = (
    id: string | null,
    name: string,
    color: string,
    stickerId: string | null,
    metaMinutosSemanal: number | null
  ) => {
    if (id) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, name, color, stickerId, metaMinutosSemanal } : c
        )
      );
    } else {
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name,
        color,
        stickerId,
        metaMinutosSemanal,
      };
      setCategories((prev) => [...prev, newCat]);
    }
    triggerHaptic('success');
  };

  const deleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
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
    setUserProfile((prev) => ({
      ...prev,
      focusMinutesToday: prev.focusMinutesToday + minutes,
      totalPoints: prev.totalPoints + minutes * 2,
    }));
    soundManager.playAchievementSound();
    triggerHaptic('success');
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const clearAllLocalData = () => {
    setHabits([]);
    setCategories(INITIAL_CATEGORIES);
    setTemplates(INITIAL_TEMPLATES);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMarketItems(INITIAL_MARKET_ITEMS);
    setUserProfile(INITIAL_USER_PROFILE);
    setSettings(INITIAL_SETTINGS);
    AsyncStorage.removeItem(STORAGE_KEY);
    triggerHaptic('impact');
  };

  const login = (email: string, name?: string) => {
    setUserProfile((prev) => ({
      ...prev,
      email,
      name: name || email.split('@')[0],
      isLoggedIn: true,
    }));
    triggerHaptic('success');
  };

  const logout = () => {
    setUserProfile((prev) => ({
      ...prev,
      isLoggedIn: false,
    }));
    triggerHaptic('impact');
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
        upsertCategory,
        deleteCategory,
        buyMarketItem,
        addFocusMinutes,
        updateSettings,
        clearAllLocalData,
        login,
        logout,
      }}>
      {children}
      {celebration?.visible && (
        <CelebrationModal
          visible={celebration.visible}
          title={celebration.title}
          message={celebration.message}
          pointsEarned={celebration.pointsEarned}
          onClose={hideCelebration}
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
