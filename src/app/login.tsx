import React, { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MomentusColors } from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import {
  loginWithGoogle,
  loginWithApple,
  loginWithEmail,
} from '@/services/authService';
import { hasAcceptedTermsCloud } from '@/services/firestoreSyncService';
import { CURRENT_TERMS_VERSION } from '@/constants/legalContent';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, settings, syncCloudAction } = useMomentus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailFields, setShowEmailFields] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordValid = password.length >= 6;

  const navigatePostLogin = async (uid: string) => {
    try {
      const { accepted, version } = await hasAcceptedTermsCloud(uid);
      if (!accepted || version < CURRENT_TERMS_VERSION) {
        router.replace('/legal?mandatory=true' as any);
        return;
      }
    } catch (err) {
      console.warn('Erro ao verificar termos pós login:', err);
    }
    router.replace('/');
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await loginWithGoogle();
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
      Alert.alert('Sucesso! ✨', `Bem-vindo(a), ${user.displayName || 'Usuário'}!`);
      await navigatePostLogin(user.uid);
    } catch (err: any) {
      setLoading(false);
      if (err.message !== 'SIGN_IN_CANCELLED' && err.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(
          'Erro ao entrar com Google',
          err.message || 'Verifique sua conexão ou tente novamente.'
        );
      }
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const user = await loginWithApple();
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
      Alert.alert('Sucesso! 🍏', 'Login realizado com a Apple.');
      await navigatePostLogin(user.uid);
    } catch (err: any) {
      setLoading(false);
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Erro ao entrar com Apple', err.message || 'Não foi possível autenticar.');
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
      const user = await loginWithEmail(email, password);
      login(
        user.email || email,
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
      Alert.alert('Erro no login', err.message || 'E-mail ou senha incorretos.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Glow & Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoGlow, { backgroundColor: primaryColor + '25' }]} />
          <LinearGradient
            colors={[primaryColor, MomentusColors.emeraldDark]}
            style={styles.logoBadge}>
            <Ionicons name="sparkles" size={44} color="#000000" />
          </LinearGradient>
        </View>

        {/* Brand Titles */}
        <Text style={styles.brandTitle}>Momentus</Text>
        <Text style={styles.brandSubtitle}>Organize suas metas, conquiste seu dia.</Text>

        <View style={styles.authActionsContainer}>
          {/* Botão Google com Gradiente */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={styles.googleButtonWrapper}>
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
              style={[styles.emailOutlineButton, { backgroundColor: '#000000', borderColor: '#334155', marginBottom: 12 }]}>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.emailOutlineButtonText, { color: '#FFFFFF' }]}>Continuar com Apple</Text>
            </TouchableOpacity>
          )}

          {/* Botão Alternar E-mail */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowEmailFields((prev) => !prev)}
            style={styles.emailOutlineButton}>
            <Ionicons name="mail-outline" size={20} color={MomentusColors.textPrimary} />
            <Text style={styles.emailOutlineButtonText}>Entrar com E-mail</Text>
          </TouchableOpacity>

          {/* Campos de Login por E-mail (Acordeão) */}
          {showEmailFields && (
            <View style={styles.emailFieldsBox}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail" size={20} color={primaryColor} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor={MomentusColors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color={primaryColor}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor={MomentusColors.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {/* Opções: Lembrar-me e Esqueceu a Senha */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  activeOpacity={0.8}
                  onPress={() => setRememberMe((prev) => !prev)}>
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={rememberMe ? primaryColor : MomentusColors.textSecondary}
                  />
                  <Text style={styles.rememberMeText}>Lembrar-me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/forgot-password')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                      isEmailValid && isPasswordValid ? primaryColor : MomentusColors.navyOutline,
                  },
                ]}>
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
                            : MomentusColors.textSecondary,
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
          <Text style={styles.socialProofSub}>Comece gratuitamente</Text>
          <Text style={styles.socialProofMain}>
            +10.000 pessoas já estão{' '}
            <Text style={[styles.socialProofHighlight, { color: primaryColor }]}>
              transformando
            </Text>
            {'\n'}suas rotinas.
          </Text>
        </View>

        {/* Link Criar Conta */}
        <View style={styles.signUpRow}>
          <Text style={styles.signUpQuestion}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={[styles.signUpLink, { color: primaryColor }]}> Crie uma aqui</Text>
          </TouchableOpacity>
        </View>

        {/* Versão */}
        <Text style={styles.versionText}>Versão: 2.1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
  },
  scrollContent: {
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
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
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MomentusColors.emeraldNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    color: MomentusColors.textSecondary,
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
    borderColor: MomentusColors.navyOutline,
    backgroundColor: MomentusColors.navySurface,
    gap: 12,
  },
  emailOutlineButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
  },
  emailFieldsBox: {
    width: '100%',
    marginTop: 10,
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: MomentusColors.textPrimary,
    fontSize: 15,
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
  },
  rememberMeText: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    fontWeight: '500',
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
    color: MomentusColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  socialProofMain: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
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
    color: MomentusColors.textSecondary,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    opacity: 0.4,
  },
});

