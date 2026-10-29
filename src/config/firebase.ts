import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Configuração oficial do Firebase (momentus-b267f).
 * Todas as credenciais sensíveis e identificadores são obtidos via variáveis de ambiente
 * com prefixo EXPO_PUBLIC_ (definidas em .env e configuradas no EAS / Vercel).
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'momentus-b267f.firebaseapp.com',
  projectId:
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'momentus-b267f',
  storageBucket:
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'momentus-b267f.firebasestorage.app',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '809975381863',
  appId:
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    (Platform.OS === 'web'
      ? '1:809975381863:web:c4db0a9428acc6e7b9f9c2'
      : '1:809975381863:android:4ec3a4f530212cddb9f9c2'),
};

if (!firebaseConfig.apiKey && __DEV__) {
  console.warn(
    '[Firebase] EXPO_PUBLIC_FIREBASE_API_KEY não encontrada nas variáveis de ambiente. Verifique o seu arquivo .env local.'
  );
}

// Ativa o token de depuração do App Check na Web apenas em ambiente de desenvolvimento local (__DEV__)
if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined') {
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

// Inicializa a aplicação Firebase garantindo singleton
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Firebase Auth com persistência assíncrona no React Native e fallback seguro para Web
export const auth = (() => {
  try {
    if (Platform.OS === 'web') {
      return firebaseAuth.getAuth(firebaseApp);
    }
    const getRnPersistence = (firebaseAuth as any).getReactNativePersistence;
    if (typeof getRnPersistence === 'function') {
      return firebaseAuth.initializeAuth(firebaseApp, {
        persistence: getRnPersistence(AsyncStorage),
      });
    }
    return firebaseAuth.getAuth(firebaseApp);
  } catch {
    return firebaseAuth.getAuth(firebaseApp);
  }
})();

// Inicializa o Cloud Firestore
export const firestore = getFirestore(firebaseApp);
