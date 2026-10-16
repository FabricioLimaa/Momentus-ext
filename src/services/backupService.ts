import { Platform } from 'react-native';
import {
  Category,
  HabitItem,
  RoutineTemplate,
  Achievement,
  MarketItem,
  UserProfile,
  AppSettings,
} from '@/types';

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
  };
}

/**
 * Cria um arquivo JSON com todos os dados do Momentus e abre a folha de compartilhamento nativa
 * (Google Drive, iCloud, E-mail, WhatsApp, Arquivos locais, etc.) ou faz download na Web.
 */
export async function exportMomentusBackup(backupData: MomentusBackupPayload['data']): Promise<boolean> {
  try {
    const payload: MomentusBackupPayload = {
      version: 1,
      appName: 'Momentus',
      exportedAt: new Date().toISOString(),
      data: backupData,
    };

    const jsonString = JSON.stringify(payload, null, 2);
    const dateFormatted = new Date().toISOString().slice(0, 10);
    const fileName = `momentus_backup_${dateFormatted}.json`;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as typeof import('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      throw new Error('Compartilhamento não disponível neste dispositivo.');
    }

    // Cria o arquivo temporário no diretório de cache
    const targetFile = new FileSystem.File(FileSystem.Paths.cache, fileName);
    const stream = targetFile.writableStream();
    const writer = stream.getWriter();
    await writer.write(new TextEncoder().encode(jsonString));
    await writer.close();

    // Abre o seletor nativo de compartilhamento
    await Sharing.shareAsync(targetFile.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar Backup do Momentus',
      UTI: 'public.json',
    });

    return true;
  } catch (error) {
    console.warn('Erro ao exportar backup:', error);
    throw error;
  }
}

/**
 * Abre o seletor nativo de arquivos para o usuário escolher um arquivo .json e restaura os dados.
 */
export async function importMomentusBackup(): Promise<MomentusBackupPayload['data'] | null> {
  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      return await new Promise<MomentusBackupPayload['data'] | null>((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
          try {
            const file = input.files?.[0];
            if (!file) {
              resolve(null);
              return;
            }
            const text = await file.text();
            const parsed = JSON.parse(text) as MomentusBackupPayload;
            if (!parsed?.data || !Array.isArray(parsed.data.habits) || !Array.isArray(parsed.data.categories)) {
              reject(new Error('Estrutura de dados do backup incompatível.'));
              return;
            }
            resolve(parsed.data);
          } catch (err) {
            reject(err);
          }
        };
        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as typeof import('expo-file-system');

    const pickResult = await FileSystem.File.pickFileAsync({
      mimeTypes: ['application/json', 'text/plain', '*/*'],
      multipleFiles: false,
    });

    if (pickResult.canceled || !pickResult.result) {
      return null;
    }

    const pickedFile = pickResult.result;
    const jsonContent = await pickedFile.json();

    if (!jsonContent || typeof jsonContent !== 'object') {
      throw new Error('Arquivo de backup inválido.');
    }

    const payload = jsonContent as MomentusBackupPayload;
    if (!payload.data || !Array.isArray(payload.data.habits) || !Array.isArray(payload.data.categories)) {
      throw new Error('Estrutura de dados do backup incompatível.');
    }

    return payload.data;
  } catch (error) {
    console.warn('Erro ao importar backup:', error);
    throw error;
  }
}
