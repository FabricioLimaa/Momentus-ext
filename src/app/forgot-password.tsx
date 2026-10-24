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
import { sendPasswordReset } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { settings } = useMomentus();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendResetLink = async () => {
    if (!isEmailValid) {
      Alert.alert('Erro', 'Por favor, insira um e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordReset(email);
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
      Alert.alert('Erro', err.message || 'Não foi possível enviar o e-mail de redefinição.');
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
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={MomentusColors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recuperar Senha</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
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
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={primaryColor} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail cadastrado"
              placeholderTextColor={MomentusColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
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
            ]}>
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
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
    marginBottom: 28,
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
    marginTop: 12,
    marginBottom: 36,
  },
  formContainer: {
    width: '100%',
    gap: 20,
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
  submitButton: {
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

