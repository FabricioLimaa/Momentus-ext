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

/**
 * Realiza login com E-mail e Senha no Firebase Auth.
 */
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return userCredential.user;
}

/**
 * Cria nova conta com E-mail e Senha no Firebase Auth.
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  return userCredential.user;
}

/**
 * Realiza login com o Google (Popup na Web / Nativo no Android e iOS).
 */
export async function loginWithGoogle(): Promise<User> {
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  }

  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    throw new Error(
      'O Login nativo com Google requer um Development Build (EAS/APK). No Expo Go, utilize o login com E-mail e Senha.'
    );
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error('Não foi possível obter o token do Google.');
  }

  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
}

/**
 * Realiza login nativo com Apple (iOS).
 */
export async function loginWithApple(): Promise<User> {
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

  const provider = new OAuthProvider('apple.com');
  const credential = provider.credential({
    idToken: identityToken,
  });

  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
}

/**
 * Envia e-mail de redefinição de senha.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
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
