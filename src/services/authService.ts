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
} from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { auth } from '@/config/firebase';

// Web Client ID configurado no google-services.json do Momentus
const WEB_CLIENT_ID =
  '809975381863-j908mdo3bdrf1falefo4ttivaqd60lji.apps.googleusercontent.com';

if (Platform.OS !== 'web') {
  try {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
  } catch (e) {
    console.warn('Erro ao configurar GoogleSignin:', e);
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
 * Realiza login nativo com o Google (Android / iOS).
 */
export async function loginWithGoogle(): Promise<User> {
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
    await GoogleSignin.signOut().catch(() => {});
  } catch {}
  await signOut(auth);
}

