import type {
  Achievement,
  AppSettings,
  Category,
  HabitItem,
  MarketItem,
  RoutineTemplate,
  UserProfile,
} from "@/types";
import { Platform } from "react-native";
import { getTodayDateString } from "@/constants/initialData";
import { MomentusLog } from "@/util/logger";

export interface MomentusBackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  data: {
    habits: HabitItem[];
    categories: Category[];
    templates: RoutineTemplate[];
    achievements: Achievement[];
    marketItems: MarketItem[];
    userProfile: UserProfile;
    settings: AppSettings;
    focusHistoryMap?: Record<string, number>;
  };
}

/**
 * Valida estrutura e campos essenciais do payload de backup para prevenir
 * corrupção de estado em caso de arquivo adulterado ou incompatível.
 */
export function validateBackupPayload(raw: unknown): MomentusBackupPayload["data"] {
  if (!raw || typeof raw !== "object") {
    throw new Error("Arquivo de backup inválido.");
  }
  const payload = raw as Partial<MomentusBackupPayload>;
  const data = payload.data;
  if (!data || typeof data !== "object" || !Array.isArray(data.habits) || !Array.isArray(data.categories)) {
    throw new Error("Estrutura de dados do backup incompatível.");
  }

  const validHabits = data.habits.filter(
    (h): h is HabitItem =>
      Boolean(h && typeof h === "object" && typeof h.id === "string" && typeof h.title === "string" && typeof h.date === "string")
  );
  const validCategories = data.categories.filter(
    (c): c is Category =>
      Boolean(c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string")
  );
  if (data.habits.length > 0 && validHabits.length === 0) {
    throw new Error("Os hábitos do arquivo de backup estão corrompidos.");
  }
  if (data.categories.length > 0 && validCategories.length === 0) {
    throw new Error("As categorias do arquivo de backup estão corrompidas.");
  }

  const validFocusHistory: Record<string, number> = {};
  if (data.focusHistoryMap && typeof data.focusHistoryMap === "object") {
    Object.entries(data.focusHistoryMap).forEach(([k, v]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k) && typeof v === "number" && Number.isFinite(v) && v >= 0) {
        validFocusHistory[k] = v;
      }
    });
  }

  return {
    ...data,
    habits: validHabits,
    categories: validCategories,
    templates: Array.isArray(data.templates) ? data.templates : [],
    achievements: Array.isArray(data.achievements) ? data.achievements : [],
    marketItems: Array.isArray(data.marketItems) ? data.marketItems : [],
    focusHistoryMap: validFocusHistory,
  };
}

/**
 * Cria um arquivo JSON com todos os dados do Momentus e abre a folha de compartilhamento nativa
 * (Google Drive, iCloud, E-mail, WhatsApp, Arquivos locais, etc.) ou faz download na Web.
 */
export async function exportMomentusBackup(
  backupData: MomentusBackupPayload["data"],
): Promise<boolean> {
  try {
    const payload: MomentusBackupPayload = {
      version: 1,
      appName: "Momentus",
      exportedAt: new Date().toISOString(),
      data: backupData,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateFormatted = getTodayDateString();
    const fileName = `momentus_backup_${dateFormatted}.json`;

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require("expo-file-system") as typeof import("expo-file-system");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require("expo-sharing") as typeof import("expo-sharing");

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw new Error("Compartilhamento não disponível neste dispositivo.");
    }

    // Cria o arquivo temporário no diretório de cache
    const targetFile = new FileSystem.File(FileSystem.Paths.cache, fileName);
    const stream = targetFile.writableStream();
    const writer = stream.getWriter();
    await writer.write(new TextEncoder().encode(jsonString));
    await writer.close();

    // Abre o seletor nativo de compartilhamento
    await Sharing.shareAsync(targetFile.uri, {
      mimeType: "application/json",
      dialogTitle: "Exportar Backup do Momentus",
      UTI: "public.json",
    });

    return true;
  } catch (error) {
    MomentusLog.db.warn("Erro ao exportar backup:", error);
    throw error;
  }
}

/**
 * Abre o seletor nativo de arquivos para o usuário escolher um arquivo .json e restaura os dados.
 */
export async function importMomentusBackup(): Promise<
  MomentusBackupPayload["data"] | null
> {
  try {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      return await new Promise<MomentusBackupPayload["data"] | null>(
        (resolve, reject) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".json,application/json";
          input.onchange = async () => {
            try {
              const file = input.files?.[0];
              if (!file) {
                resolve(null);
                return;
              }
              const text = await file.text();
              const parsed = JSON.parse(text);
              resolve(validateBackupPayload(parsed));
            } catch (err) {
              reject(err);
            }
          };
          input.oncancel = () => resolve(null);
          input.click();
        },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require("expo-file-system") as typeof import("expo-file-system");

    const pickResult = await FileSystem.File.pickFileAsync({
      mimeTypes: ["application/json", "text/plain", "*/*"],
      multipleFiles: false,
    });

    if (pickResult.canceled || !pickResult.result) {
      return null;
    }

    const pickedFile = pickResult.result;
    const jsonContent = await pickedFile.json();
    return validateBackupPayload(jsonContent);
  } catch (error) {
    MomentusLog.db.warn("Erro ao importar backup:", error);
    throw error;
  }
}
