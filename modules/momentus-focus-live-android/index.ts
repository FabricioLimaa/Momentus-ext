import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

export type FocusLiveNativeAction = 'PAUSE' | 'RESUME' | 'SKIP';

export interface AndroidFocusLivePayload {
  modeLabel: string;
  habitTitle: string;
  remainingFormatted: string;
  endTimeFormatted: string;
  remainingSeconds: number;
  progress: number;
  isRunning: boolean;
  isOled: boolean;
  accentColor: string;
}

interface MomentusFocusLiveAndroidNativeModule {
  isSupported(): boolean;
  present(payload: AndroidFocusLivePayload): Promise<boolean>;
  dismiss(): Promise<void>;
  addListener?: (
    eventName: 'onFocusLiveAction',
    listener: (event: { action: FocusLiveNativeAction }) => void
  ) => { remove: () => void };
}

let cachedModule: MomentusFocusLiveAndroidNativeModule | null | undefined;

function getNativeModule(): MomentusFocusLiveAndroidNativeModule | null {
  if (Platform.OS !== 'android') return null;
  if (cachedModule !== undefined) return cachedModule;
  try {
    cachedModule = requireOptionalNativeModule<MomentusFocusLiveAndroidNativeModule>(
      'MomentusFocusLiveAndroid'
    );
  } catch {
    cachedModule = null;
  }
  return cachedModule ?? null;
}

export function isAndroidNativeFocusLiveAvailable(): boolean {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return mod.isSupported() === true;
  } catch {
    return false;
  }
}

export async function presentAndroidNativeFocusLive(
  payload: AndroidFocusLivePayload
): Promise<boolean> {
  const mod = getNativeModule();
  if (!mod) return false;
  try {
    return await mod.present(payload);
  } catch {
    return false;
  }
}

export async function dismissAndroidNativeFocusLive(): Promise<void> {
  const mod = getNativeModule();
  if (!mod) return;
  try {
    await mod.dismiss();
  } catch {}
}

export function subscribeToAndroidNativeFocusLiveActions(handlers: {
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
}): () => void {
  const mod = getNativeModule();
  if (!mod?.addListener) return () => {};

  try {
    const subscription = mod.addListener('onFocusLiveAction', (event) => {
      if (event?.action === 'PAUSE') {
        handlers.onPause();
      } else if (event?.action === 'RESUME') {
        handlers.onResume();
      } else if (event?.action === 'SKIP') {
        handlers.onSkip();
      }
    });
    return () => {
      try {
        subscription.remove();
      } catch {}
    };
  } catch {
    return () => {};
  }
}
