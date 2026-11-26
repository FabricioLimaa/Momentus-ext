import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  AppState,
  AppStateStatus,
  Animated,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import {
  MomentusColors,
  TypographyTokens,
  SpacingTokens,
  BorderRadiusTokens,
  ComponentHeightTokens,
  getContrastTextColor,
} from '@/constants/theme';
import { useMomentus } from '@/context/MomentusContext';

interface BiometricGuardProps {
  children: React.ReactNode;
}

// Estado de sessão no escopo de módulo: impede prompt biométrico duplicado
// em remontagens (React 19/StrictMode/Expo Router) ou transições de AppState do próprio BiometricPrompt.
let sessionUnlocked = false;
let activeAuthPromise: Promise<boolean> | null = null;
let lastPromptFinishedAt = 0;

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children }) => {
  const { settings, theme, userProfile, isLoaded, triggerHaptic } = useMomentus();
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const backgroundTimeRef = useRef<number | null>(null);
  const hasCheckedInitialLockRef = useRef(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Pulse animation on lock screen icon
  useEffect(() => {
    if (isLocked) {
      const useNative = Platform.OS !== 'web';
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1200,
            useNativeDriver: useNative,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 1200,
            useNativeDriver: useNative,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isLocked, pulseAnim]);

  const authenticate = useCallback(async () => {
    if (Platform.OS === 'web') {
      sessionUnlocked = true;
      setIsLocked(false);
      return;
    }

    // Se já houver um BiometricPrompt ativo em andamento, aguarda a mesma promessa em vez de abrir um 2º prompt
    if (activeAuthPromise) {
      setIsAuthenticating(true);
      const ok = await activeAuthPromise;
      setIsAuthenticating(false);
      if (ok) {
        setIsLocked(false);
        setAuthError(null);
      }
      return;
    }

    const runAuth = async (): Promise<boolean> => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
          sessionUnlocked = true;
          return true;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Desbloqueie o Momentus para acessar suas rotinas',
          cancelLabel: 'Cancelar',
          fallbackLabel: 'Usar Senha do Dispositivo',
          disableDeviceFallback: false,
        });

        if (result.success) {
          sessionUnlocked = true;
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        lastPromptFinishedAt = Date.now();
      }
    };

    try {
      setIsAuthenticating(true);
      setAuthError(null);
      activeAuthPromise = runAuth();
      const success = await activeAuthPromise;

      if (success) {
        setIsLocked(false);
        setAuthError(null);
        triggerHaptic('success');
      } else {
        triggerHaptic('impact');
        setAuthError('Autenticação não concluída. Toque para tentar novamente.');
      }
    } finally {
      activeAuthPromise = null;
      setIsAuthenticating(false);
    }
  }, [triggerHaptic]);

  // Initial check on load (executa apenas uma vez por sessão autenticada, inclusive em remontagens)
  useEffect(() => {
    if (!isLoaded) return;
    if (!settings.biometricLock || !userProfile.isLoggedIn || Platform.OS === 'web') {
      hasCheckedInitialLockRef.current = false;
      sessionUnlocked = false;
      setIsLocked(false);
      return;
    }
    if (sessionUnlocked) {
      hasCheckedInitialLockRef.current = true;
      setIsLocked(false);
      return;
    }
    if (hasCheckedInitialLockRef.current) return;
    hasCheckedInitialLockRef.current = true;
    setIsLocked(true);
    authenticate();
  }, [isLoaded, settings.biometricLock, userProfile.isLoggedIn, authenticate]);

  // Handle AppState lifecycle transitions (Background -> Active)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Ignora transições de AppState disparadas pelo próprio BiometricPrompt nativo
      if (activeAuthPromise || Date.now() - lastPromptFinishedAt < 1500) {
        return;
      }

      if (nextAppState === 'background') {
        backgroundTimeRef.current = Date.now();
      } else if (nextAppState === 'active') {
        const lastBg = backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        // Se passou mais de 15 segundos em background e a trava estiver ativada, bloqueia
        if (
          settings.biometricLock &&
          userProfile.isLoggedIn &&
          lastBg &&
          Date.now() - lastBg > 15000
        ) {
          sessionUnlocked = false;
          setIsLocked(true);
          authenticate();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [settings.biometricLock, userProfile.isLoggedIn, authenticate]);

  // Se a trava biométrica estiver ativa e bloqueada, exibe tela de bloqueio com alta segurança
  if (isLocked) {
    const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

    return (
      <View style={[styles.lockContainer, { backgroundColor: theme.background }]}>
        <View style={styles.lockContent}>
          <Animated.View
            style={[
              styles.iconCircle,
              {
                backgroundColor: `${primaryColor}20`,
                borderColor: `${primaryColor}50`,
                transform: [{ scale: pulseAnim }],
              },
            ]}>
            <Ionicons name="finger-print" size={54} color={primaryColor} />
          </Animated.View>

          <Text style={[styles.lockTitle, { color: theme.textPrimary }]}>
            Momentus Protegido
          </Text>

          <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>
            Suas rotinas e anotações estão protegidas por biometria.
          </Text>

          {authError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={MomentusColors.errorRed} />
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: primaryColor }]}
            onPress={authenticate}
            disabled={isAuthenticating}
            activeOpacity={0.85}>
            <Ionicons
              name={isAuthenticating ? 'hourglass-outline' : 'shield-checkmark-outline'}
              size={20}
              color={getContrastTextColor(primaryColor)}
            />
            <Text
              style={[
                styles.unlockButtonText,
                { color: getContrastTextColor(primaryColor) },
              ]}>
              {isAuthenticating ? 'Aguardando Biometria...' : 'Desbloquear Agora'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  lockContent: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  iconCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  lockTitle: {
    fontSize: TypographyTokens.screenTitle.fontSize,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: TypographyTokens.bodyText.fontSize,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
    backgroundColor: `${MomentusColors.errorRed}15`,
    borderColor: `${MomentusColors.errorRed}40`,
    borderWidth: 1,
    borderRadius: BorderRadiusTokens.control,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.sm,
    marginBottom: SpacingTokens.lg,
  },
  errorText: {
    fontSize: 13,
    color: MomentusColors.errorRed,
    fontWeight: '600',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.sm,
    width: '100%',
    height: ComponentHeightTokens.buttonHero,
    borderRadius: BorderRadiusTokens.button,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
