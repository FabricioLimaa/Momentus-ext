import { Platform } from 'react-native';
import type * as SecureStoreTypes from 'expo-secure-store';
import type * as CryptoTypes from 'expo-crypto';
import { MomentusLog } from '@/util/logger';

export const VAULT_KEYCHAIN_SERVICE = 'br.com.fabriciolima.momentus.vault';
const DB_MASTER_KEY_STORAGE_ID = 'momentus_sqlcipher_master_key_v1';
const HEX_256_REGEX = /^[0-9a-f]{64}$/;

export type StorageEncryptionMode =
  | 'sqlcipher-aes256'
  | 'keychain-only-fallback'
  | 'web-tls';

export interface DatabaseSecurityInfo {
  mode: StorageEncryptionMode;
  cipherVersion: string | null;
  hardwareKeyProtected: boolean;
}

let cachedSecureStore: typeof SecureStoreTypes | null | undefined = undefined;
let runtimeSecurityInfo: DatabaseSecurityInfo = {
  mode: Platform.OS === 'web' ? 'web-tls' : 'keychain-only-fallback',
  cipherVersion: null,
  hardwareKeyProtected: false,
};

/**
 * Carrega `expo-secure-store` de forma lazy e segura (retorna `null` na Web).
 */
export function getSecureStoreModule(): typeof SecureStoreTypes | null {
  if (cachedSecureStore !== undefined) {
    return cachedSecureStore;
  }
  if (Platform.OS === 'web') {
    cachedSecureStore = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-secure-store') as typeof SecureStoreTypes;
    cachedSecureStore = mod;
    return mod;
  } catch (err) {
    MomentusLog.warn('APP', '[Security] expo-secure-store indisponível neste ambiente:', err);
    cachedSecureStore = null;
    return null;
  }
}

/**
 * Opções endurecidas de cofre para iOS Keychain e Android KeyStore:
 * - `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`: nunca sincroniza a chave no iCloud/backups
 *   nem permite restauração em outro aparelho, mas permanece acessível após o primeiro desbloqueio
 *   (compatível com widgets e notificações em background).
 */
export function getHardenedSecureStoreOptions(): SecureStoreTypes.SecureStoreOptions {
  const SecureStore = getSecureStoreModule();
  return {
    keychainService: VAULT_KEYCHAIN_SERVICE,
    ...(SecureStore?.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY !== undefined
      ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY }
      : {}),
  };
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Gera 256 bits (32 bytes) de entropia criptográfica via CSPRNG nativo (`expo-crypto`).
 */
async function generateRandom256BitHexKey(): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto') as typeof CryptoTypes;
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return bytesToHex(randomBytes);
}

export function isValid256BitHexKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_256_REGEX.test(value);
}

/**
 * Obtém ou cria a chave mestra AES-256 (64 caracteres hexadecimais) para o banco SQLCipher,
 * armazenada exclusivamente no Keychain (iOS) / KeyStore (Android).
 * Jamais gravada em AsyncStorage, logs ou tráfego de rede.
 */
export async function getOrCreateDatabaseEncryptionKey(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  const SecureStore = getSecureStoreModule();
  if (!SecureStore) {
    return null;
  }

  const options = getHardenedSecureStoreOptions();

  try {
    const existing = await SecureStore.getItemAsync(DB_MASTER_KEY_STORAGE_ID, options);
    if (isValid256BitHexKey(existing)) {
      return existing;
    }

    const freshKey = await generateRandom256BitHexKey();
    if (!isValid256BitHexKey(freshKey)) {
      throw new Error('Falha na validação da chave AES-256 gerada');
    }

    await SecureStore.setItemAsync(DB_MASTER_KEY_STORAGE_ID, freshKey, options);
    MomentusLog.db.info('Chave mestra AES-256 gerada e protegida no cofre de hardware.');
    return freshKey;
  } catch (err) {
    MomentusLog.db.warn('Falha ao acessar chave mestra no SecureStore:', err);
    return null;
  }
}

/**
 * Remove a chave mestra do cofre de hardware (usado apenas em destruição completa / LGPD).
 */
export async function wipeDatabaseEncryptionKey(): Promise<void> {
  if (Platform.OS === 'web') return;
  const SecureStore = getSecureStoreModule();
  if (!SecureStore) return;

  try {
    await SecureStore.deleteItemAsync(
      DB_MASTER_KEY_STORAGE_ID,
      getHardenedSecureStoreOptions()
    );
  } catch (err) {
    MomentusLog.db.warn('Falha ao remover chave mestra do SecureStore:', err);
  }
}

/**
 * Atualiza o status de criptografia observado em tempo de execução após inicialização do SQLite.
 */
export function setRuntimeDatabaseSecurityInfo(info: DatabaseSecurityInfo): void {
  runtimeSecurityInfo = info;
}

/**
 * Retorna o status real de criptografia em repouso ativo nesta sessão.
 */
export function getRuntimeDatabaseSecurityInfo(): DatabaseSecurityInfo {
  return runtimeSecurityInfo;
}
