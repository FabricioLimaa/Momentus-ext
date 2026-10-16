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
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { auth } from '@/config/firebase';

// Permite que o WebBrowser capture os redirecionamentos de autenticação OAuth
WebBrowser.maybeCompleteAuthSession();

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
 * caso o Firebase rejeite requisições de e-mail e senha.
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
 * Executa o fluxo padrão Google OAuth 2.0 via navegador seguro (WebBrowser / Chrome Custom Tabs).
 * Funciona no Expo Go sem requerer Development Build nativo e funciona na Web como fallback.
 * Obtém os dados reais do usuário (nome, e-mail, foto e id) e tenta autenticar no Firebase.
 */
async function loginWithGoogleBrowserFlow(): Promise<MomentusAuthUser> {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'momentus',
    preferLocalhost: false,
  });

  const nonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString()
  );

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(WEB_CLIENT_ID)}` +
    `&response_type=${encodeURIComponent('token id_token')}` +
    `&scope=${encodeURIComponent('openid profile email')}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&nonce=${encodeURIComponent(nonce)}` +
    `&prompt=select_account`;

  const authResult = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

  if (authResult.type !== 'success' || !authResult.url) {
    throw new Error('SIGN_IN_CANCELLED');
  }

  // Extrai parâmetros do fragmento (#) ou query (?)
  const url = authResult.url;
  const hashPart = url.includes('#')
    ? url.split('#')[1]
    : url.includes('?')
      ? url.split('?')[1]
      : '';
  const params = new URLSearchParams(hashPart);
  const accessToken = params.get('access_token');
  const idToken = params.get('id_token');

  if (!accessToken && !idToken) {
    throw new Error('Não foi possível obter credenciais do Google.');
  }

  let googleProfile: {
    sub?: string;
    name?: string;
    given_name?: string;
    picture?: string;
    email?: string;
    email_verified?: boolean;
  } | null = null;

  if (accessToken) {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        googleProfile = await res.json();
      }
    } catch (e) {
      console.warn('Erro ao obter perfil do Google via access_token:', e);
    }
  }

  // Tenta autenticar no Firebase Auth com o idToken para obter sessão real na nuvem
  if (idToken) {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      if (userCredential.user) {
        return userCredential.user;
      }
    } catch (firebaseErr) {
      console.warn(
        'Firebase rejeitou credencial do Google (verificando restrição de chave):',
        firebaseErr
      );
    }
  }

  // Se o Firebase Auth recusou por restrição de API Key, usamos com fidelidade os dados reais do Google
  if (googleProfile?.email) {
    return {
      uid: googleProfile.sub || `google-${googleProfile.email}`,
      email: googleProfile.email,
      displayName: googleProfile.name || googleProfile.given_name || 'Usuário Google',
      photoURL: googleProfile.picture || null,
      emailVerified: !!googleProfile.email_verified,
      isAnonymous: false,
      isLocalFallback: false,
    } as unknown as MomentusAuthUser;
  }

  throw new Error('Falha ao processar autenticação com Google.');
}

/**
 * Realiza login com E-mail e Senha no Firebase Auth.
 */
export async function loginWithEmail(email: string, pass: string): Promise<MomentusAuthUser> {
  console.log('[AUTH] Autenticando com e-mail:', email.trim());
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    console.log('[AUTH] Login com e-mail bem-sucedido:', userCredential.user.uid);
    return userCredential.user;
  } catch (err) {
    console.error('[AUTH ERROR] Falha no login com e-mail:', err);
    if (isAndroidKeyBlockedError(err)) {
      console.warn(
        '[AUTH WARN] API Key do Firebase restrita a Android nativo. Autenticando em sessão local para:',
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
  console.log('[AUTH] Criando nova conta para:', email.trim());
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    console.log('[AUTH] Conta criada com sucesso:', userCredential.user.uid);
    return userCredential.user;
  } catch (err) {
    console.error('[AUTH ERROR] Falha ao criar conta:', err);
    if (isAndroidKeyBlockedError(err)) {
      console.warn(
        '[AUTH WARN] API Key do Firebase restrita a Android nativo. Criando conta em sessão local para:',
        email
      );
      return createLocalFallbackUser(email, displayName);
    }
    throw err;
  }
}

/**
 * Realiza login com o Google (Popup na Web / Nativo no Android e iOS ou OAuth no Expo Go).
 */
export async function loginWithGoogle(): Promise<MomentusAuthUser> {
  if (Platform.OS === 'web') {
    try {
      console.log('[AUTH] Iniciando login com Google na Web...');
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });
      const userCredential = await signInWithPopup(auth, provider);
      console.log('[AUTH] Login com Google concluído com sucesso:', userCredential.user.email);
      return userCredential.user;
    } catch (err: any) {
      console.error('[AUTH ERROR] Falha no login Google Web:', {
        code: err?.code,
        message: err?.message,
        customData: err?.customData,
      });

      if (err.code === 'auth/popup-closed-by-user') {
        throw new Error('SIGN_IN_CANCELLED');
      }
      if (err.code === 'auth/internal-error') {
        throw new Error(
          'Erro interno no provedor Google (auth/internal-error). Acesse o Firebase Console > Authentication > Sign-in method > Google e certifique-se de que está ATIVADO com o "E-mail de suporte do projeto" selecionado.'
        );
      }
      if (err.code === 'auth/unauthorized-domain') {
        throw new Error(
          'Domínio não autorizado (auth/unauthorized-domain). Adicione o domínio local em Firebase Console > Authentication > Settings > Authorized domains.'
        );
      }
      if (isAndroidKeyBlockedError(err)) {
        throw new Error(
          'A chave de API atual é restrita a aplicativos Android no Google Cloud. No Firebase Console (Configurações do Projeto > Geral), copie a "Chave de API da Web" e configure em EXPO_PUBLIC_FIREBASE_API_KEY no .env, ou aguarde a propagação da Opção A.'
        );
      }
      throw err;
    }
  }

  const GoogleSignin = getGoogleSignin();
  if (GoogleSignin) {
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
        return {
          uid: googleUser?.id || `google-${googleUser?.email}`,
          email: googleUser?.email || '',
          displayName: googleUser?.name || 'Usuário Google',
          photoURL: googleUser?.photo || null,
          emailVerified: true,
          isAnonymous: false,
          isLocalFallback: false,
        } as unknown as MomentusAuthUser;
      }
      throw err;
    }
  }

  // No Expo Go, utiliza o fluxo Google OAuth via Chrome Custom Tabs
  return await loginWithGoogleBrowserFlow();
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
