import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { MomentusColors } from '@/constants/theme';
import { MomentusProvider, useMomentus } from '@/context/MomentusContext';

function TabsNavigator() {
  const { theme, settings } = useMomentus();
  const primaryColor = settings.primaryColorHex || MomentusColors.emeraldNeon;

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
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
          name="index"
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
