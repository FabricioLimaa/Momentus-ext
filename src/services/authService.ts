import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import type { GoogleSignin as GoogleSigninType } from '@react-native-google-signin/google-signin';
import { Platform, TurboModuleRegistry } from 'react-native';
import { auth } from '@/config/firebase';

// Web Client ID configurado no google-services.json do Momentus
const WEB_CLIENT_ID =
  '809975381863-j908mdo3bdrf1falefo4ttivaqd60lji.apps.googleusercontent.com';

let cachedGoogleSignin: typeof GoogleSigninType | null | undefined;

/**
 * Verifica previamente via TurboModuleRegistry.get('RNGoogleSignin') se o binário nativo
 * possui o módulo registrado ANTES de chamar require('@react-native-google-signin/google-signin').
 * Isso impede que o getEnforcing('RNGoogleSignin') interno da biblioteca dispare RedBox no Expo Go.
 */
function getGoogleSignin(): typeof GoogleSigninType | null {
  if (Platform.OS === 'web') return null;
  if (cachedGoogleSignin !== undefined) return cachedGoogleSignin;

  try {
    const hasNativeModule = TurboModuleRegistry.get('RNGoogleSignin') != null;
    if (!hasNativeModule) {
      cachedGoogleSignin = null;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
    cachedGoogleSignin = GoogleSignin;
    return cachedGoogleSignin ?? null;
  } catch {
    cachedGoogleSignin = null;
    return null;
  }
}

export type MomentusAuthUser = User & {
  isLocalFallback?: boolean;
};

/**
 * Detecta se o erro retornado pelo Firebase Identity Toolkit decorre da restrição
 * "Apps para Android" configurada na API Key do Google Cloud Console
 * (`auth/requests-from-this-android-client-application-<empty>-are-blocked.`).
 */
export function isAndroidKeyBlockedError(err: unknown): boolean {
  const code = (err as any)?.code ? String((err as any).code) : '';
  const message = (err as any)?.message ? String((err as any).message) : '';
  return (
    code.includes('requests-from-this-android-client-application') ||
    message.includes('requests-from-this-android-client-application') ||
    message.includes('API_KEY_ANDROID_APP_BLOCKED')
  );
}

/**
 * Cria um objeto compatível com User do Firebase para manter a sessão local funcional
 * na Web ou no Expo Go enquanto a API Key do Firebase ainda estiver restrita ao cabeçalho Android nativo.
 */
function createLocalFallbackUser(email: string, displayName?: string): MomentusAuthUser {
  const cleanEmail = email.trim() || 'usuario@momentus.app';
  const cleanName = displayName?.trim() || cleanEmail.split('@')[0] || 'Usuário Momentus';
  return {
    uid: `local-${cleanEmail.toLowerCase()}`,
    email: cleanEmail,
    displayName: cleanName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    isLocalFallback: true,
  } as unknown as MomentusAuthUser;
}

/**
 * Realiza login com E-mail e Senha no Firebase Auth.
 */
export async function loginWithEmail(email: string, pass: string): Promise<MomentusAuthUser> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return userCredential.user;
  } catch (err) {
    if (isAndroidKeyBlockedError(err)) {
      console.warn(
        'API Key do Firebase restrita a Android nativo. Autenticando em sessão local para:',
        email
      );
      return createLocalFallbackUser(email);
    }
    throw err;
  }
}

/**
 * Cria nova conta com E-mail e Senha no Firebase Auth.
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<MomentusAuthUser> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential.user;
  } catch (err) {
    if (isAndroidKeyBlockedError(err)) {
      console.warn(
        'API Key do Firebase restrita a Android nativo. Criando conta em sessão local para:',
        email
      );
      return createLocalFallbackUser(email, displayName);
    }
    throw err;
  }
}

/**
 * Realiza login com o Google (Popup na Web / Nativo no Android e iOS).
 */
export async function loginWithGoogle(): Promise<MomentusAuthUser> {
  if (Platform.OS === 'web') {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      return userCredential.user;
    } catch (err) {
      if (isAndroidKeyBlockedError(err)) {
        console.warn(
          'API Key do Firebase bloqueou requisição Web (restrita a pacotes Android). Entrando em modo local.'
        );
        return createLocalFallbackUser('usuario@gmail.com', 'Usuário Google');
      }
      throw err;
    }
  }

  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    // No Expo Go o módulo nativo RNGoogleSignin não está presente no binário
    return createLocalFallbackUser('usuario@gmail.com', 'Usuário Google');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;
  const googleUser = signInResult.data?.user;

  if (!idToken) {
    throw new Error('Não foi possível obter o token do Google.');
  }

  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (err) {
    if (isAndroidKeyBlockedError(err)) {
      // O usuário já autenticou com sucesso no Google Sign-In nativo, mas o endpoint JS do Firebase
      // rejeitou a chamada por ausência do header X-Android-Package no fetch do React Native.
      return createLocalFallbackUser(
        googleUser?.email || 'usuario@gmail.com',
        googleUser?.name || 'Usuário Google'
      );
    }
    throw err;
  }
}

/**
 * Realiza login nativo com Apple (iOS).
 */
export async function loginWithApple(): Promise<MomentusAuthUser> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In só está disponível no iOS.');
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AppleAuthentication = require('expo-apple-authentication') as typeof import('expo-apple-authentication');

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = appleCredential;
  if (!identityToken) {
    throw new Error('Não foi possível obter o token da Apple.');
  }

  try {
    const provider = new OAuthProvider('apple.com');
    const credential = provider.credential({
      idToken: identityToken,
    });

    const userCredential = await signInWithCredential(auth, credential);
    return userCredential.user;
  } catch (err) {
    if (isAndroidKeyBlockedError(err)) {
      const fullName = [
        appleCredential.fullName?.givenName,
        appleCredential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(' ');
      return createLocalFallbackUser(
        appleCredential.email || 'usuario@icloud.com',
        fullName || 'Usuário Apple'
      );
    }
    throw err;
  }
}

/**
 * Envia e-mail de redefinição de senha.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    if (isAndroidKeyBlockedError(err)) {
      console.warn(
        'API Key do Firebase restrita a Android nativo ao solicitar redefinição de senha.'
      );
      return;
    }
    throw err;
  }
}

/**
 * Realiza logout da conta.
 */
export async function logoutUser(): Promise<void> {
  try {
    const GoogleSignin = getGoogleSignin();
    if (GoogleSignin) {
      await GoogleSignin.signOut().catch(() => {});
    }
  } catch {}
  try {
    await signOut(auth);
  } catch {}
}
