import React, { useState, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MomentusColors,
  LayoutTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { registerWithEmail, getFriendlyAuthErrorMessage } from '@/services/authService';
import { SplashScreen } from '@/components/momentus/SplashScreen';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { login, settings, syncCloudAction } = useMomentus();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPostSignUpSyncing, setIsPostSignUpSyncing] = useState(false);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  const isFormValid = useMemo(() => {
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return (
      name.trim().length > 0 &&
      isEmailValid &&
      password.length >= 6 &&
      password === confirmPassword
    );
  }, [name, email, password, confirmPassword]);

  const passwordsMatch = !confirmPassword || password === confirmPassword;

  const handleSignUp = async () => {
    if (!isFormValid) {
      Alert.alert('Atenção', 'Verifique os dados informados antes de prosseguir.');
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(email, password, name.trim());
      setIsPostSignUpSyncing(true);
      login(
        user.email || email,
        user.displayName || name.trim(),
        user.photoURL || undefined
      );
      try {
        await syncCloudAction(user.uid);
      } catch (syncErr) {
        console.warn('Erro ao sincronizar dados na nuvem:', syncErr);
      }
      setLoading(false);
      setIsPostSignUpSyncing(false);
      Alert.alert('Sucesso! 🎉', 'Conta criada com sucesso! Por favor, leia e aceite os termos para começar.', [
        {
          text: 'Continuar',
          onPress: () => router.replace('/legal?mandatory=true' as any),
        },
      ]);
    } catch (err: any) {
      setLoading(false);
      setIsPostSignUpSyncing(false);
      Alert.alert('Erro ao criar conta', getFriendlyAuthErrorMessage(err));
    }
  };

  if (isPostSignUpSyncing) {
    return <SplashScreen syncMessage="Preparando seu espaço..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={MomentusColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Conta</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Mini Logo */}
        <View style={[styles.logoCircle, { borderColor: primaryColor + '30' }]}>
          <Ionicons name="sparkles" size={32} color={primaryColor} />
        </View>

        <Text style={styles.title}>Junte-se ao Momentus</Text>
        <Text style={styles.subtitle}>Comece sua jornada de produtividade hoje.</Text>

        <View style={styles.formContainer}>
          {/* Nome */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Nome Completo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={primaryColor} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor={MomentusColors.textSecondary}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* E-mail */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>E-mail</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={primaryColor} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="seu.email@exemplo.com"
                placeholderTextColor={MomentusColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={primaryColor} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha (mínimo 6 caracteres)"
                placeholderTextColor={MomentusColors.textSecondary}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <Text style={styles.helperText}>Mínimo de 6 caracteres.</Text>
          </View>

          {/* Confirmar Senha */}
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Confirmar Senha</Text>
            <View
              style={[
                styles.inputWrapper,
                !passwordsMatch && { borderColor: MomentusColors.dangerRed },
              ]}>
              <Ionicons name="lock-closed-outline" size={20} color={primaryColor} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirme sua senha"
                placeholderTextColor={MomentusColors.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            {!passwordsMatch && (
              <Text style={styles.errorText}>As senhas não coincidem.</Text>
            )}
          </View>

          {/* Botão Criar Conta */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSignUp}
            disabled={!isFormValid || loading}
            style={[
              styles.submitButton,
              {
                backgroundColor: isFormValid ? primaryColor : MomentusColors.navyOutline,
              },
            ]}>
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  { color: isFormValid ? '#000000' : MomentusColors.textSecondary },
                ]}>
                Criar Conta
              </Text>
            )}
          </TouchableOpacity>

          {/* Link Já tem conta */}
          <TouchableOpacity
            onPress={() => router.push('/login')}
            style={styles.loginLinkButton}>
            <Text style={styles.loginLinkText}>
              Já tem uma conta?{' '}
              <Text style={[styles.loginLinkHighlight, { color: primaryColor }]}>
                Faça login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MomentusColors.navyBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TypographyTokens.screenTitle,
    color: MomentusColors.textPrimary,
  },
  placeholder: {
    width: ComponentHeightTokens.iconButton,
  },
  scrollContent: {
    paddingHorizontal: LayoutTokens.pagePaddingHorizontal,
    paddingTop: LayoutTokens.pagePaddingTop,
    paddingBottom: LayoutTokens.pagePaddingBottom,
    alignItems: 'center',
    width: '100%',
    maxWidth: LayoutTokens.maxAuthWidth,
    alignSelf: 'center',
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: MomentusColors.navySurface,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 28,
  },
  formContainer: {
    width: '100%',
    gap: 16,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: MomentusColors.textPrimary,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: BorderRadiusTokens.input,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingHorizontal: 16,
    height: ComponentHeightTokens.input,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: MomentusColors.textPrimary,
    fontSize: 15,
  },
  helperText: {
    fontSize: 12,
    color: MomentusColors.textSecondary,
    marginLeft: 6,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: MomentusColors.dangerRed,
    marginLeft: 6,
    marginTop: 2,
    fontWeight: '600',
  },
  submitButton: {
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  loginLinkButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: MomentusColors.textSecondary,
  },
  loginLinkHighlight: {
    fontWeight: '800',
  },
});

