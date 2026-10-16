import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Configuração do Firebase espelhando os parâmetros do google-services.json
 * do projeto Momentus (momentus-b267f).
 *
 * Nota sobre a API Key:
 * A chave padrão do google-services.json possui restrição de aplicativo Android no Google Cloud Console.
 * Para uso irrestrito no Firebase JS SDK (Web / Expo Go), defina EXPO_PUBLIC_FIREBASE_API_KEY
 * com uma chave Web ou remova a restrição "Apps para Android" dessa chave no Google Cloud Console.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey:
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyC1y2TLkdhYsHCnfcur_t__k_H3BbKrfQM',
  authDomain: 'momentus-b267f.firebaseapp.com',
  projectId: 'momentus-b267f',
  storageBucket: 'momentus-b267f.firebasestorage.app',
  messagingSenderId: '809975381863',
  ...(process.env.EXPO_PUBLIC_FIREBASE_APP_ID
    ? { appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID }
    : Platform.OS !== 'web'
      ? { appId: '1:809975381863:android:4ec3a4f530212cddb9f9c2' }
      : {}),
};

// Inicializa a aplicação Firebase garantindo singleton
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Firebase Auth com persistência assíncrona no React Native e fallback seguro para Web
export const auth = (() => {
  try {
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
