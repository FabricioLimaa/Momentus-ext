export interface MomentusWidgetTask {
  id: string;
  title: string;
  timeStart: string;
  timeEnd: string;
  categoryName: string;
  categoryColor: string;
  completed: boolean;
  isOngoing: boolean;
}

export interface MomentusWidgetSnapshot {
  date: string;
  dateLabel: string;
  updatedAt: string;
  currentStreak: number;
  completedCount: number;
  totalCount: number;
  progress: number;
  primaryColor: string;
  isDark: boolean;
  tasks: MomentusWidgetTask[];
  /**
   * IDs de hábitos marcados/desmarcados diretamente pelo widget enquanto o app
   * estava fechado ou em segundo plano, para reconciliação automática ao abrir o app.
   */
  toggledHabitIds: string[];
}

export const MOMENTUS_WIDGET_NAME = 'MomentusWidget';

export const WIDGET_STORAGE_KEYS = {
  SNAPSHOT: '@momentus:widget_snapshot_v1',
  PENDING_TOGGLES: '@momentus:widget_pending_toggles_v1',
} as const;
