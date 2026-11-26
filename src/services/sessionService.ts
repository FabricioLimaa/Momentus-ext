import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth as firebaseAuth } from '@/config/firebase';
import { MomentusLog } from '@/util/logger';
import {
  getSecureStoreModule,
  getHardenedSecureStoreOptions,
} from '@/services/encryptionService';

export interface SavedSessionData {
  uid: string;
  email: string;
  name: string;
  photoUrl: string | null;
  token?: string | null;
  lastActive: number;
}

const SECURE_KEY_TOKEN = 'momentus_session_token';
const SECURE_KEY_USER = 'momentus_session_user';

/**
 * Salva a sessão do usuário de forma estritamente protegida:
 * - Mobile (iOS Keychain / Android KeyStore): usa `expo-secure-store` com serviço isolado e
 *   `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, separando o JWT do perfil e NUNCA gravando credenciais
 *   em texto claro no `AsyncStorage`.
 * - Web: armazena isoladamente no `localStorage` do domínio HTTPS.
 */
export async function saveSecureSession(data: SavedSessionData): Promise<void> {
  const { token, ...userWithoutToken } = data;
  const userPayload = JSON.stringify({
    ...userWithoutToken,
    lastActive: Date.now(),
  });

  try {
    const SecureStore = getSecureStoreModule();
    if (SecureStore) {
      const options = getHardenedSecureStoreOptions();
      if (token) {
        await SecureStore.setItemAsync(SECURE_KEY_TOKEN, token, options).catch(() => {});
      }
      await SecureStore.setItemAsync(SECURE_KEY_USER, userPayload, options).catch(() => {});
      // Garante remoção de qualquer resquício legado em texto claro no AsyncStorage
      await AsyncStorage.removeItem(SECURE_KEY_USER).catch(() => {});
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      // Na Web nunca duplica o JWT cru no localStorage (o Firebase Auth Web gerencia credenciais no IndexedDB)
      window.localStorage.removeItem(SECURE_KEY_TOKEN);
      window.localStorage.setItem(SECURE_KEY_USER, userPayload);
    } else {
      // Fallback extremo apenas se o ambiente nativo não possuir SecureStore
      await AsyncStorage.setItem(SECURE_KEY_USER, userPayload).catch(() => {});
    }
    MomentusLog.auth.info('Sessão segura persistida no cofre protegido para:', data.email || data.uid);
  } catch (err) {
    MomentusLog.auth.warn('Falha ao gravar sessão segura:', err);
  }
}

/**
 * Recupera a sessão persistida no cofre de hardware no primeiro milissegundo de inicialização.
 * Inclui migração transparente única caso existam credenciais de versões anteriores fora do cofre endurecido.
 */
export async function getSecureSession(): Promise<SavedSessionData | null> {
  try {
    const SecureStore = getSecureStoreModule();
    let rawUser: string | null = null;
    let rawToken: string | null = null;
    let needsHardenedMigration = false;

    if (SecureStore) {
      const options = getHardenedSecureStoreOptions();
      rawUser = await SecureStore.getItemAsync(SECURE_KEY_USER, options).catch(() => null);
      rawToken = await SecureStore.getItemAsync(SECURE_KEY_TOKEN, options).catch(() => null);

      // Migração transparente de instalações anteriores (sem keychainService customizado ou legado AsyncStorage)
      if (!rawUser) {
        const legacySecureUser = await SecureStore.getItemAsync(SECURE_KEY_USER).catch(() => null);
        const legacySecureToken = await SecureStore.getItemAsync(SECURE_KEY_TOKEN).catch(() => null);
        if (legacySecureUser) {
          rawUser = legacySecureUser;
          rawToken = rawToken || legacySecureToken;
          needsHardenedMigration = true;
        }
      }
      if (!rawUser) {
        const legacyPlainUser = await AsyncStorage.getItem(SECURE_KEY_USER).catch(() => null);
        if (legacyPlainUser) {
          rawUser = legacyPlainUser;
          needsHardenedMigration = true;
        }
      }
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      rawUser = window.localStorage.getItem(SECURE_KEY_USER);
      rawToken = window.localStorage.getItem(SECURE_KEY_TOKEN);
    } else {
      rawUser = await AsyncStorage.getItem(SECURE_KEY_USER).catch(() => null);
    }

    if (rawUser) {
      const parsed = JSON.parse(rawUser) as SavedSessionData;
      if (rawToken && !parsed.token) {
        parsed.token = rawToken;
      }

      if (needsHardenedMigration && SecureStore) {
        await saveSecureSession(parsed);
        await SecureStore.deleteItemAsync(SECURE_KEY_USER).catch(() => {});
        await SecureStore.deleteItemAsync(SECURE_KEY_TOKEN).catch(() => {});
        await AsyncStorage.removeItem(SECURE_KEY_USER).catch(() => {});
        MomentusLog.auth.info('Sessão legada migrada para cofre protegido de hardware.');
      }

      return parsed;
    }
    return null;
  } catch (err) {
    MomentusLog.auth.warn('Falha ao ler sessão segura persistida:', err);
    return null;
  }
}

/**
 * Remove completamente as credenciais salvas no logout explícito do usuário (cofre atual e legados).
 */
export async function clearSecureSession(): Promise<void> {
  try {
    const SecureStore = getSecureStoreModule();
    if (SecureStore) {
      const options = getHardenedSecureStoreOptions();
      await Promise.all([
        SecureStore.deleteItemAsync(SECURE_KEY_TOKEN, options).catch(() => {}),
        SecureStore.deleteItemAsync(SECURE_KEY_USER, options).catch(() => {}),
        SecureStore.deleteItemAsync(SECURE_KEY_TOKEN).catch(() => {}),
        SecureStore.deleteItemAsync(SECURE_KEY_USER).catch(() => {}),
      ]);
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(SECURE_KEY_TOKEN);
      window.localStorage.removeItem(SECURE_KEY_USER);
    }
    await AsyncStorage.removeItem(SECURE_KEY_USER).catch(() => {});
    MomentusLog.auth.info('Sessão segura removida completamente.');
  } catch (err) {
    MomentusLog.auth.warn('Erro ao limpar sessão segura:', err);
  }
}

/**
 * Renova silenciosamente o token de autenticação via getIdToken(true) antes de expirar.
 */
export async function refreshUserSessionToken(forceRefresh = true): Promise<string | null> {
  try {
    const user = firebaseAuth.currentUser;
    if (!user) {
      MomentusLog.auth.debug('Nenhum usuário ativo para renovar token.');
      return null;
    }

    const token = await user.getIdToken(forceRefresh);
    if (token) {
      const currentSession = await getSecureSession();
      if (currentSession) {
        await saveSecureSession({
          ...currentSession,
          token,
          lastActive: Date.now(),
        });
      }
      MomentusLog.auth.info('Token de sessão renovado silenciosamente com sucesso.');
      return token;
    }
    return null;
  } catch (err) {
    MomentusLog.auth.warn('Falha ao renovar token de sessão silencioso:', err);
    return null;
  }
}

/**
 * Agenda a renovação periódica silenciosa do token JWT a cada 45 minutos (tokens Firebase expiram em 60 minutos).
 */
export function setupSilentTokenRefresh(
  onTokenRefreshed?: (newToken: string) => void
): () => void {
  const REFRESH_INTERVAL_MS = 45 * 60 * 1000;

  const timer = setInterval(async () => {
    if (firebaseAuth.currentUser) {
      const refreshed = await refreshUserSessionToken(true);
      if (refreshed && onTokenRefreshed) {
        onTokenRefreshed(refreshed);
      }
    }
  }, REFRESH_INTERVAL_MS);

  return () => {
    clearInterval(timer);
  };
}
