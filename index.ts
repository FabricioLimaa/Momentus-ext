import 'expo-router/entry';
import { Platform } from 'react-native';

// Registra o handler headless do Widget Nativo de Tela Inicial no Android (dev/prod builds)
if (Platform.OS === 'android') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { momentusWidgetTaskHandler } = require('./src/widgets/androidWidgetTaskHandler') as typeof import('./src/widgets/androidWidgetTaskHandler');
    registerWidgetTaskHandler(momentusWidgetTaskHandler);
  } catch {
    // Ignorado com segurança no Expo Go e ambientes sem o módulo nativo compilado
  }
}
