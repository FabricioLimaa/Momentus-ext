import React, { useEffect } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { MomentusColors } from '@/constants/theme';
import { MomentusProvider, useMomentus } from '@/context/MomentusContext';
import { CURRENT_TERMS_VERSION } from '@/constants/legalContent';

function TabsNavigator() {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, settings, userProfile, isLoaded, isPostLoginActive } = useMomentus();
  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  useEffect(() => {
    if (!isLoaded) return;

    const isUserLoggedIn = !!userProfile.isLoggedIn;
    const isTermsOk =
      !!settings.termsAccepted &&
      (settings.termsAcceptedVersion ?? 0) >= CURRENT_TERMS_VERSION;

    const isExemptRoute =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/forgot-password' ||
      pathname === '/legal' ||
      pathname === '/onboarding';

    // Se o usuário não estiver autenticado e tentar acessar uma rota interna, direciona para o login na raiz /
    if (!isUserLoggedIn && !isExemptRoute) {
      router.replace('/');
      return;
    }

    // Se o usuário já estiver autenticado e tentar acessar / ou /login, direciona para /home (a menos que a SplashScreen pós-login esteja ativa)
    if (isUserLoggedIn && (pathname === '/' || pathname === '/login') && !isPostLoginActive) {
      router.replace('/home');
      return;
    }

    if (isUserLoggedIn && !isTermsOk && !isExemptRoute) {
      router.replace('/legal?mandatory=true' as any);
    }
  }, [
    isLoaded,
    settings.termsAccepted,
    settings.termsAcceptedVersion,
    userProfile.isLoggedIn,
    isPostLoginActive,
    pathname,
    router,
  ]);

  const isAuthScreen =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/onboarding' ||
    (pathname === '/legal' && (!settings.termsAccepted || (settings.termsAcceptedVersion ?? 0) < CURRENT_TERMS_VERSION));

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.background,
          },
          tabBarStyle: isAuthScreen
            ? { display: 'none' }
            : {
                backgroundColor: theme.surface,
                borderTopColor: theme.outline,
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 88 : Platform.OS === 'web' ? 76 : 68,
                paddingBottom: Platform.OS === 'ios' ? 28 : Platform.OS === 'web' ? 12 : 10,
                paddingTop: 8,
              },
          tabBarItemStyle: {
            paddingHorizontal: 2,
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            lineHeight: 14,
            textAlign: 'center',
          },
        }}>
        {/* Telas Principais da Barra Inferior */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Hoje',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="today" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Agenda',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="focus"
          options={{
            title: 'Foco',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="timer" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Estatísticas',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Mais',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu" size={size} color={color} />
            ),
          }}
        />

        {/* Telas Secundárias e Modais de Fluxo */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="templates"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="achievements"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="updates"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="legal"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="onboarding"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="login"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="signup"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="forgot-password"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tabs.Screen
          name="categories"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </>
  );
}

export default function RootLayout() {
  return (
    <MomentusProvider>
      <TabsNavigator />
    </MomentusProvider>
  );
}
