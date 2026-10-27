import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  UIManager,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import {
  MomentusColors,
  LayoutTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import {
  loginWithGoogle,
  loginWithApple,
  loginWithEmail,
  getFriendlyAuthErrorMessage,
} from '@/services/authService';
import { hasAcceptedTermsCloud } from '@/services/firestoreSyncService';
import { CURRENT_TERMS_VERSION } from '@/constants/legalContent';
import { SplashScreen } from '@/components/momentus/SplashScreen';
import { getAppKv, setAppKv } from '@/database/momentusDb';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function IndexScreen() {
  const insets = useSafeAreaInsets();
  const { login, settings, syncCloudAction, userProfile, isLoaded, theme } = useMomentus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailFields, setShowEmailFields] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPostLoginSyncing, setIsPostLoginSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('Sincronizando suas rotinas...');

  const passwordInputRef = useRef<TextInput>(null);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;
  const appVersion = Constants.expoConfig?.version || '1.6.6';

  const isUserLoggedIn = !!userProfile.isLoggedIn;

  // Carrega e-mail e preferência de Lembrar-me salvos localmente
  useEffect(() => {
    async function loadSavedRememberMe() {
      try {
        const prefs = await getAppKv<{ email: string; rememberMe: boolean }>(
          'auth_remember_me_prefs'
        );
        if (prefs?.rememberMe && prefs.email) {
          setEmail(prefs.email);
          setRememberMe(true);
          setShowEmailFields(true);
        }
      } catch (err) {
        console.warn('Erro ao carregar credenciais salvas:', err);
      }
    }
    loadSavedRememberMe();
  }, []);

  // Se o usuário já estiver autenticado ao acessar a raiz /, redireciona imediatamente para /home
  useEffect(() => {
    if (isLoaded && isUserLoggedIn) {
      router.replace('/home');
    }
  }, [isLoaded, isUserLoggedIn]);

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;

  const toggleEmailFields = () => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setShowEmailFields((prev) => !prev);
  };

  const navigatePostLogin = async (uid: string) => {
    try {
      const { accepted, version } = await hasAcceptedTermsCloud(uid);
      if (!accepted || version < CURRENT_TERMS_VERSION) {
        setIsPostLoginSyncing(false);
        router.replace('/legal?mandatory=true' as any);
        return;
      }
    } catch (err) {
      console.warn('Erro ao verificar termos pós login:', err);
    }
    setIsPostLoginSyncing(false);
    router.replace('/home');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      setIsPostLoginSyncing(true);
      setSyncMessage('Carregando suas rotinas...');
      login(
        user.email || 'usuario@gmail.com',
        user.displayName || undefined,
        user.photoURL || undefined
      );
      try {
        await syncCloudAction(user.uid);
      } catch (syncErr) {
        console.warn('Erro ao sincronizar dados do Firestore após login:', syncErr);
      }
      setLoading(false);
      await navigatePostLogin(user.uid);
    } catch (err: any) {
      setLoading(false);
      setIsPostLoginSyncing(false);
      if (err.message !== 'SIGN_IN_CANCELLED' && err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(
          'Erro ao entrar com Google',
          getFriendlyAuthErrorMessage(err)
        );
      }
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const user = await loginWithApple();
      setIsPostLoginSyncing(true);
      setSyncMessage('Carregando suas rotinas...');
      login(
        user.email || 'usuario@apple.com',
        user.displayName || undefined,
        user.photoURL || undefined
      );
      try {
        await syncCloudAction(user.uid);
      } catch (syncErr) {
        console.warn('Erro ao sincronizar dados do Firestore após login Apple:', syncErr);
      }
      setLoading(false);
      await navigatePostLogin(user.uid);
    } catch (err: any) {
      setLoading(false);
      setIsPostLoginSyncing(false);
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Erro ao entrar com Apple', getFriendlyAuthErrorMessage(err));
      }
    }
  };

  const handleEmailSignIn = async () => {
    if (!isEmailValid) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }
    if (!isPasswordValid) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // Persiste preferência de Lembrar-me
      try {
        if (rememberMe) {
          await setAppKv('auth_remember_me_prefs', {
            email: email.trim(),
            rememberMe: true,
          });
        } else {
          await setAppKv('auth_remember_me_prefs', {
            email: '',
            rememberMe: false,
          });
        }
      } catch (prefErr) {
        console.warn('Erro ao salvar preferência de lembrar-me:', prefErr);
      }

      const user = await loginWithEmail(email.trim(), password);
      setIsPostLoginSyncing(true);
      setSyncMessage('Carregando suas rotinas...');
      login(
        user.email || email.trim(),
        user.displayName || undefined,
        user.photoURL || undefined
      );
      try {
        await syncCloudAction(user.uid);
      } catch (syncErr) {
        console.warn('Erro ao sincronizar dados na nuvem:', syncErr);
      }
      setLoading(false);
      await navigatePostLogin(user.uid);
    } catch (err: any) {
      setLoading(false);
      setIsPostLoginSyncing(false);
      Alert.alert('Erro no login', getFriendlyAuthErrorMessage(err));
    }
  };

  if (!isLoaded || (isLoaded && isUserLoggedIn) || isPostLoginSyncing) {
    return <SplashScreen syncMessage={isPostLoginSyncing ? syncMessage : 'Carregando...'} />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Glow & Logo Oficial da Marca */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoGlow,
              { backgroundColor: primaryColor + (theme.isDark ? '25' : '15') },
            ]}
          />
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: theme.isDark ? '#001A40' : '#FFFFFF',
                borderColor: `${primaryColor}40`,
                borderWidth: 1.5,
              },
            ]}>
            <Image
              source={require('@/../assets/images/brand/symbol-transparent.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Brand Titles com suporte a modo claro/escuro */}
        <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>Momentus</Text>
        <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
          Organize suas metas, conquiste seu dia.
        </Text>

        <View style={styles.authActionsContainer}>
          {/* Botão Google com Gradiente */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={styles.googleButtonWrapper}
            accessibilityRole="button"
            accessibilityLabel="Entrar com o Google">
            <LinearGradient
              colors={[primaryColor, '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.googleGradient}>
              {loading && !showEmailFields ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#000000" />
                  <Text style={styles.googleButtonText}>Entrar com Google</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Botão Apple no iOS */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAppleSignIn}
              disabled={loading}
              style={[
                styles.emailOutlineButton,
                {
                  backgroundColor: theme.isDark ? '#000000' : '#0F172A',
                  borderColor: theme.outline,
                  marginBottom: 12,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continuar com a Apple">
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.emailOutlineButtonText, { color: '#FFFFFF' }]}>Continuar com Apple</Text>
            </TouchableOpacity>
          )}

          {/* Aviso informativo de login no navegador iOS (iPhone/iPad) */}
          {Platform.OS === 'web' && typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && (
            <View style={[styles.iosWebNoticeBox, { borderColor: theme.outline }]}>
              <Ionicons name="information-circle-outline" size={16} color={primaryColor} />
              <Text style={[styles.iosWebNoticeText, { color: theme.textSecondary }]}>
                Acesso via navegador no iPhone / iPad:{' '}
                <Text style={{ color: primaryColor, fontWeight: '700' }}>Em desenvolvimento</Text>. Para melhor experiência, utilize o login por e-mail ou o aplicativo móvel.
              </Text>
            </View>
          )}

          {/* Botão Alternar E-mail */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleEmailFields}
            disabled={loading}
            style={[
              styles.emailOutlineButton,
              { backgroundColor: theme.surface, borderColor: theme.outline },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Entrar com e-mail">
            <Ionicons name="mail-outline" size={20} color={theme.textPrimary} />
            <Text style={[styles.emailOutlineButtonText, { color: theme.textPrimary }]}>Entrar com E-mail</Text>
          </TouchableOpacity>

          {/* Campos de Login por E-mail (Acordeão) */}
          {showEmailFields && (
            <View style={styles.emailFieldsBox}>
              <View style={styles.inputBlock}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}>
                  <Ionicons name="mail" size={20} color={primaryColor} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="E-mail"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    value={email}
                    onChangeText={setEmail}
                  />
                  {email.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEmail('')}
                      style={styles.fieldActionBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Limpar e-mail">
                      <Ionicons name="close-circle" size={18} color={`${theme.textSecondary}80`} />
                    </TouchableOpacity>
                  )}
                </View>
                {email.length > 0 && !isEmailValid && (
                  <Text style={styles.inputErrorHint}>Informe um formato de e-mail válido.</Text>
                )}
              </View>

              <View style={styles.inputBlock}>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.surface, borderColor: theme.outline },
                  ]}>
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={primaryColor}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordInputRef}
                    style={[styles.input, { color: theme.textPrimary }]}
                    placeholder="Senha"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={() => {
                      if (isEmailValid && isPasswordValid && !loading) {
                        handleEmailSignIn();
                      }
                    }}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.fieldActionBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {password.length > 0 && !isPasswordValid && (
                  <Text style={styles.inputErrorHint}>A senha deve ter pelo menos 6 caracteres.</Text>
                )}
              </View>

              {/* Opções: Lembrar-me e Esqueceu a Senha */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.8}
                  onPress={() => setRememberMe((prev) => !prev)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}>
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={rememberMe ? primaryColor : theme.textSecondary}
                  />
                  <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>Lembrar-me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/forgot-password',
                      params: email.trim() ? { email: email.trim() } : {},
                    } as any)
                  }
                  style={styles.forgotPasswordBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Esqueceu a senha?">
                  <Text style={[styles.forgotPasswordText, { color: primaryColor }]}>
                    Esqueceu a senha?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Botão Entrar com E-mail */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleEmailSignIn}
                disabled={loading || !isEmailValid || !isPasswordValid}
                style={[
                  styles.submitButton,
                  {
                    backgroundColor:
                      isEmailValid && isPasswordValid ? primaryColor : (theme.isDark ? MomentusColors.navyOutline : '#CBD5E1'),
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Entrar">
                {loading ? (
                  <ActivityIndicator color="#000000" />
                ) : (
                  <Text
                    style={[
                      styles.submitButtonText,
                      {
                        color:
                          isEmailValid && isPasswordValid
                            ? '#000000'
                            : theme.textSecondary,
                      },
                    ]}>
                    Entrar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Social Proof */}
        <View style={styles.socialProofContainer}>
          <Text style={[styles.socialProofSub, { color: theme.textSecondary }]}>Comece gratuitamente</Text>
          <Text style={[styles.socialProofMain, { color: theme.textSecondary }]}>
            +10.000 pessoas já estão{' '}
            <Text style={[styles.socialProofHighlight, { color: primaryColor }]}>
              transformando
            </Text>
            {'\n'}suas rotinas.
          </Text>
        </View>

        {/* Link Criar Conta */}
        <View style={styles.signUpRow}>
          <Text style={[styles.signUpQuestion, { color: theme.textSecondary }]}>Não tem uma conta?</Text>
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            style={styles.signUpLinkBtn}
            accessibilityRole="button"
            accessibilityLabel="Criar uma conta">
            <Text style={[styles.signUpLink, { color: primaryColor }]}> Crie uma aqui</Text>
          </TouchableOpacity>
        </View>

        {/* Versão Dinâmica */}
        <Text style={[styles.versionText, { color: theme.textSecondary }]}>Versão: {appVersion}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    paddingBottom: LayoutTokens.pagePaddingBottom,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    width: '100%',
    maxWidth: LayoutTokens.maxAuthWidth,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 58,
    height: 58,
  },
  brandTitle: {
    ...TypographyTokens.heroTitle,
  },
  brandSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 44,
  },
  authActionsContainer: {
    width: '100%',
    gap: 14,
  },
  googleButtonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  googleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  emailOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  emailOutlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  iosWebNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    width: '100%',
  },
  iosWebNoticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  emailFieldsBox: {
    width: '100%',
    marginTop: 10,
    gap: 14,
  },
  inputBlock: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  fieldActionBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  inputErrorHint: {
    color: MomentusColors.errorRed,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 6,
    fontWeight: '500',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginVertical: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  rememberMeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordBtn: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  socialProofContainer: {
    alignItems: 'center',
    marginTop: 44,
    marginBottom: 24,
  },
  socialProofSub: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  socialProofMain: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  socialProofHighlight: {
    fontWeight: '800',
  },
  signUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  signUpQuestion: {
    fontSize: 14,
  },
  signUpLinkBtn: {
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 12,
    opacity: 0.4,
  },
});
