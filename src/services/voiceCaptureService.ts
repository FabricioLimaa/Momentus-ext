import { Platform } from 'react-native';

export interface VoiceCaptureCallbacks {
  onStart?: () => void;
  onPartialResult?: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (code: string, message: string) => void;
}

export interface VoiceCaptureSession {
  stop: () => void;
  abort: () => void;
}

export interface VoiceStartOutcome {
  started: boolean;
  requiresFallback?: boolean;
  errorMessage?: string;
  session?: VoiceCaptureSession;
}

interface SpeechRecognitionWebInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error?: string; message?: string }) => void) | null;
  onresult: ((ev: {
    results: ArrayLike<{
      isFinal: boolean;
      [index: number]: { transcript: string };
    }>;
  }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getWebSpeechCtor(): (new () => SpeechRecognitionWebInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionWebInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionWebInstance;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function getNativeSpeechModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // Carregamento dinâmico seguro: evita crash no Expo Go quando o módulo nativo não está compilado
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('expo-speech-recognition');
    const mod = pkg?.ExpoSpeechRecognitionModule;
    if (mod && typeof mod.start === 'function' && typeof mod.requestPermissionsAsync === 'function') {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}

export function isVoiceCaptureSupported(): boolean {
  if (Platform.OS === 'web') {
    return getWebSpeechCtor() !== null;
  }
  const mod = getNativeSpeechModule();
  if (!mod) return false;
  try {
    return typeof mod.isRecognitionAvailable === 'function'
      ? Boolean(mod.isRecognitionAvailable())
      : true;
  } catch {
    return false;
  }
}

/**
 * Inicia uma sessão única de captura de voz em Português (pt-BR).
 * Suporta Web Speech API (navegadores compatíveis) e expo-speech-recognition (iOS/Android dev/prod builds).
 * Quando o ambiente não possui reconhecimento nativo (ex.: Expo Go ou Firefox), retorna `requiresFallback: true`.
 */
export async function startVoiceCapture(
  callbacks: VoiceCaptureCallbacks,
  contextualStrings: string[] = []
): Promise<VoiceStartOutcome> {
  // 1. Fluxo Web (Chrome, Edge, Safari, Android Chrome)
  if (Platform.OS === 'web') {
    const SpeechCtor = getWebSpeechCtor();
    if (!SpeechCtor) {
      return {
        started: false,
        requiresFallback: true,
        errorMessage: 'Reconhecimento de voz não suportado neste navegador.',
      };
    }

    try {
      const recognition = new SpeechCtor();
      recognition.lang = 'pt-BR';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      let lastTranscript = '';
      let deliveredFinal = false;

      recognition.onstart = () => {
        callbacks.onStart?.();
      };

      recognition.onresult = (event) => {
        const parts: string[] = [];
        let hasFinal = false;
        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          if (item && item[0]?.transcript) {
            parts.push(item[0].transcript);
            if (item.isFinal) hasFinal = true;
          }
        }
        const combined = parts.join(' ').trim();
        if (!combined) return;
        lastTranscript = combined;

        if (hasFinal) {
          deliveredFinal = true;
          callbacks.onFinalResult(combined);
        } else {
          callbacks.onPartialResult?.(combined);
        }
      };

      recognition.onerror = (ev) => {
        const code = ev?.error || 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          callbacks.onError?.(code, 'Permissão de microfone negada no navegador.');
        } else if (code === 'no-speech') {
          callbacks.onError?.(code, 'Nenhuma fala detectada. Tente novamente.');
        } else if (code !== 'aborted') {
          callbacks.onError?.(code, 'Não foi possível capturar a voz agora.');
        }
      };

      recognition.onend = () => {
        if (!deliveredFinal && lastTranscript) {
          deliveredFinal = true;
          callbacks.onFinalResult(lastTranscript);
        }
        callbacks.onEnd?.();
      };

      recognition.start();

      return {
        started: true,
        session: {
          stop: () => {
            try {
              recognition.stop();
            } catch {}
          },
          abort: () => {
            try {
              recognition.abort();
            } catch {}
          },
        },
      };
    } catch {
      return {
        started: false,
        requiresFallback: true,
        errorMessage: 'Não foi possível iniciar o microfone neste navegador.',
      };
    }
  }

  // 2. Fluxo Nativo iOS & Android (expo-speech-recognition)
  const nativeMod = getNativeSpeechModule();
  if (!nativeMod) {
    return {
      started: false,
      requiresFallback: true,
      errorMessage: 'Captura nativa disponível no app instalado. Use o comando inteligente abaixo.',
    };
  }

  try {
    if (typeof nativeMod.isRecognitionAvailable === 'function' && !nativeMod.isRecognitionAvailable()) {
      return {
        started: false,
        requiresFallback: true,
        errorMessage: 'Serviço de voz indisponível neste dispositivo.',
      };
    }

    const perm = await nativeMod.requestPermissionsAsync();
    if (!perm?.granted) {
      return {
        started: false,
        errorMessage: 'Permita o acesso ao microfone e reconhecimento de voz nas configurações do aparelho.',
      };
    }

    let lastTranscript = '';
    let deliveredFinal = false;
    const subs: Array<{ remove?: () => void }> = [];

    const cleanup = () => {
      subs.forEach((s) => {
        try {
          s?.remove?.();
        } catch {}
      });
      subs.length = 0;
    };

    subs.push(
      nativeMod.addListener('start', () => {
        callbacks.onStart?.();
      })
    );

    subs.push(
      nativeMod.addListener('result', (event: { isFinal?: boolean; results?: Array<{ transcript?: string }> }) => {
        const text = event?.results?.[0]?.transcript?.trim() || '';
        if (!text) return;
        lastTranscript = text;
        if (event.isFinal) {
          deliveredFinal = true;
          callbacks.onFinalResult(text);
        } else {
          callbacks.onPartialResult?.(text);
        }
      })
    );

    subs.push(
      nativeMod.addListener('error', (event: { error?: string; message?: string }) => {
        const code = event?.error || 'unknown';
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          callbacks.onError?.(code, 'Permissão de microfone ou reconhecimento de voz negada.');
        } else if (code === 'no-speech' || code === 'speech-timeout') {
          callbacks.onError?.(code, 'Nenhuma fala detectada. Toque no microfone e tente novamente.');
        } else if (code !== 'aborted') {
          callbacks.onError?.(code, 'Erro ao reconhecer fala. Tente novamente.');
        }
      })
    );

    subs.push(
      nativeMod.addListener('end', () => {
        if (!deliveredFinal && lastTranscript) {
          deliveredFinal = true;
          callbacks.onFinalResult(lastTranscript);
        }
        cleanup();
        callbacks.onEnd?.();
      })
    );

    try {
      nativeMod.start({
        lang: 'pt-BR',
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
        contextualStrings: contextualStrings.slice(0, 15),
      });
    } catch (startErr) {
      cleanup();
      throw startErr;
    }

    return {
      started: true,
      session: {
        stop: () => {
          try {
            nativeMod.stop();
          } catch {}
        },
        abort: () => {
          try {
            nativeMod.abort();
          } catch {}
          cleanup();
        },
      },
    };
  } catch {
    return {
      started: false,
      requiresFallback: true,
      errorMessage: 'Reconhecimento nativo indisponível neste ambiente. Use o comando rápido abaixo.',
    };
  }
}
