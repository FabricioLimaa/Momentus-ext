import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth as firebaseAuth } from '@/config/firebase';
import { MomentusLog } from '@/util/logger';

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

type SecureStoreModule = typeof import('expo-secure-store');
let cachedSecureStore: SecureStoreModule | null | undefined = undefined;

function getSecureStore(): SecureStoreModule | null {
  if (cachedSecureStore !== undefined) {
    return cachedSecureStore;
  }
  if (Platform.OS === 'web') {
    cachedSecureStore = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-secure-store') as SecureStoreModule;
    cachedSecureStore = mod;
    return mod;
  } catch (err) {
    MomentusLog.auth.warn('expo-secure-store não disponível no ambiente atual, usando fallback:', err);
    cachedSecureStore = null;
    return null;
  }
}

/**
 * Salva a sessão do usuário de forma criptografada (SecureStore no Mobile / localStorage estrito no Web).
 */
export async function saveSecureSession(data: SavedSessionData): Promise<void> {
  const payload = JSON.stringify({
    ...data,
    lastActive: Date.now(),
  });

  try {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      if (data.token) {
        await SecureStore.setItemAsync(SECURE_KEY_TOKEN, data.token).catch(() => {});
      }
      await SecureStore.setItemAsync(SECURE_KEY_USER, payload).catch(() => {});
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      if (data.token) {
        window.localStorage.setItem(SECURE_KEY_TOKEN, data.token);
      }
      window.localStorage.setItem(SECURE_KEY_USER, payload);
    }
    // Fallback de contingência no AsyncStorage
    await AsyncStorage.setItem(SECURE_KEY_USER, payload).catch(() => {});
    MomentusLog.auth.info('Sessão segura persistida com sucesso para:', data.email || data.uid);
  } catch (err) {
    MomentusLog.auth.warn('Falha ao gravar sessão segura:', err);
  }
}

/**
 * Recupera a sessão persistida no primeiro milissegundo de inicialização
 * para hidratação síncrona/instantânea de perfil (prevenindo telas em branco ou logout provisório).
 */
export async function getSecureSession(): Promise<SavedSessionData | null> {
  try {
    const SecureStore = getSecureStore();
    let rawUser: string | null = null;
    let rawToken: string | null = null;

    if (SecureStore) {
      rawUser = await SecureStore.getItemAsync(SECURE_KEY_USER).catch(() => null);
      rawToken = await SecureStore.getItemAsync(SECURE_KEY_TOKEN).catch(() => null);
    } else if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      rawUser = window.localStorage.getItem(SECURE_KEY_USER);
      rawToken = window.localStorage.getItem(SECURE_KEY_TOKEN);
    }

    if (!rawUser) {
      rawUser = await AsyncStorage.getItem(SECURE_KEY_USER).catch(() => null);
    }

    if (rawUser) {
      const parsed = JSON.parse(rawUser) as SavedSessionData;
      if (rawToken && !parsed.token) {
        parsed.token = rawToken;
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
 * Remove completamente as credenciais salvas no logout explícito do usuário.
 */
export async function clearSecureSession(): Promise<void> {
  try {
    const SecureStore = getSecureStore();
    if (SecureStore) {
      await SecureStore.deleteItemAsync(SECURE_KEY_TOKEN).catch(() => {});
      await SecureStore.deleteItemAsync(SECURE_KEY_USER).catch(() => {});
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
  // 45 minutos em milissegundos
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
