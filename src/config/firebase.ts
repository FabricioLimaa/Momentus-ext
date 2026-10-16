import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
} from 'firebase/auth';
// @ts-expect-error react-native persistence entrypoint
import { getReactNativePersistence } from '@firebase/auth/dist/rn/index.rn';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Configuração do Firebase espelhando os parâmetros do google-services.json
 * do projeto nativo Momentus (br.com.fabriciolima.momentus).
 */
const firebaseConfig = {
  apiKey: 'AIzaSyC1y2TLkdhYsHCnfcur_t__k_H3BbKrfQM',
  authDomain: 'momentus-b267f.firebaseapp.com',
  projectId: 'momentus-b267f',
  storageBucket: 'momentus-b267f.firebasestorage.app',
  messagingSenderId: '809975381863',
  appId: '1:809975381863:android:4ec3a4f530212cddb9f9c2',
};

// Inicializa a aplicação Firebase garantindo singleton
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializa o Firebase Auth com persistência assíncrona no React Native
export const auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
})();

// Inicializa o Cloud Firestore
export const firestore = getFirestore(firebaseApp);
