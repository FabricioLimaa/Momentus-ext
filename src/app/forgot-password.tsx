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
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MomentusColors,
  LayoutTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  TypographyTokens,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';
import { sendPasswordReset, getFriendlyAuthErrorMessage } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ email?: string }>();
  const { settings } = useMomentus();

  const [email, setEmail] = useState(params.email || '');
  const [loading, setLoading] = useState(false);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleSendResetLink = async () => {
    if (!isEmailValid) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setLoading(false);
      Alert.alert(
        'E-mail Enviado! 📬',
        'Enviamos as instruções de redefinição para a sua caixa de entrada.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Erro', getFriendlyAuthErrorMessage(err));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Voltar">
          <Ionicons name="arrow-back" size={24} color={MomentusColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar Senha</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + SpacingTokens.lg },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Ícone de Destaque */}
        <View style={[styles.iconCircle, { borderColor: primaryColor + '30', backgroundColor: primaryColor + '15' }]}>
          <Ionicons name="mail" size={44} color={primaryColor} />
        </View>

        <Text style={styles.title}>Esqueceu sua senha?</Text>
        <Text style={styles.description}>
          Insira seu e-mail abaixo e enviaremos um link para você redefinir sua senha com segurança.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputBlock}>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={primaryColor} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail cadastrado"
                placeholderTextColor={MomentusColors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => {
                  if (isEmailValid && !loading) {
                    handleSendResetLink();
                  }
                }}
                value={email}
                onChangeText={setEmail}
              />
              {email.length > 0 && (
                <TouchableOpacity
                  onPress={() => setEmail('')}
                  style={styles.clearIconButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar e-mail">
                  <Ionicons name="close-circle" size={18} color={`${MomentusColors.textSecondary}80`} />
                </TouchableOpacity>
              )}
            </View>
            {email.length > 0 && !isEmailValid && (
              <Text style={styles.inputErrorHint}>Informe um formato de e-mail válido.</Text>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleSendResetLink}
            disabled={!isEmailValid || loading}
            style={[
              styles.submitButton,
              {
                backgroundColor: isEmailValid ? primaryColor : MomentusColors.navyOutline,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Enviar link de recuperação">
            {loading ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  { color: isEmailValid ? '#000000' : MomentusColors.textSecondary },
                ]}>
                Enviar Link
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: MomentusColors.navyBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.md,
    paddingBottom: SpacingTokens.sm,
  },
  backButton: {
    width: ComponentHeightTokens.iconButton,
    height: ComponentHeightTokens.iconButton,
    borderRadius: ComponentHeightTokens.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SpacingTokens.xl,
    marginBottom: SpacingTokens.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: MomentusColors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: MomentusColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SpacingTokens.sm,
    marginBottom: SpacingTokens.xl,
  },
  formContainer: {
    width: '100%',
    gap: SpacingTokens.md,
  },
  inputBlock: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MomentusColors.navySurface,
    borderRadius: BorderRadiusTokens.input,
    borderWidth: 1,
    borderColor: MomentusColors.navyOutline,
    paddingHorizontal: SpacingTokens.md,
    height: ComponentHeightTokens.inputHero,
  },
  inputIcon: {
    marginRight: SpacingTokens.md,
  },
  input: {
    flex: 1,
    color: MomentusColors.textPrimary,
    fontSize: 15,
  },
  clearIconButton: {
    width: ComponentHeightTokens.buttonCompact,
    height: ComponentHeightTokens.buttonCompact,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  inputErrorHint: {
    color: MomentusColors.errorRed,
    fontSize: 12,
    marginTop: SpacingTokens.xs,
    marginLeft: SpacingTokens.sm,
    fontWeight: '500',
  },
  submitButton: {
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SpacingTokens.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

