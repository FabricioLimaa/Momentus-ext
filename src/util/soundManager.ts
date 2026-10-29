import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

type ExpoAudioModule = typeof import('expo-audio');

export type SoundscapeType = 'none' | 'brown_noise' | 'rain' | 'waves' | 'white_noise';

export interface SoundscapeOption {
  id: SoundscapeType;
  label: string;
  sublabel: string;
  icon: string;
}

export const SOUNDSCAPE_OPTIONS: SoundscapeOption[] = [
  {
    id: 'none',
    label: 'Sem som de fundo',
    sublabel: 'Apenas silêncio ou tique-taque',
    icon: 'volume-mute-outline',
  },
  {
    id: 'brown_noise',
    label: 'Ruído Marrom',
    sublabel: 'Grave suave para foco profundo',
    icon: 'disc-outline',
  },
  {
    id: 'rain',
    label: 'Chuva Suave',
    sublabel: 'Pingos relaxantes de chuva contínua',
    icon: 'rainy-outline',
  },
  {
    id: 'waves',
    label: 'Ondas do Mar',
    sublabel: 'Fluxo e refluxo ritmado da praia',
    icon: 'water-outline',
  },
  {
    id: 'white_noise',
    label: 'Ruído Branco',
    sublabel: 'Isolamento acústico contra distrações',
    icon: 'radio-outline',
  },
];

const SOUNDSCAPE_ASSETS: Record<Exclude<SoundscapeType, 'none'>, any> = {
  brown_noise: require('@/assets/sounds/brown_noise.mp3'),
  rain: require('@/assets/sounds/rain.mp3'),
  waves: require('@/assets/sounds/waves.m4a'),
  white_noise: require('@/assets/sounds/white_noise.mp3'),
};

class SoundManager {
  private successPlayer: AudioPlayer | null = null;
  private achievementPlayer: AudioPlayer | null = null;
  private soundscapePlayer: AudioPlayer | null = null;
  private soundscapeWebAudio: any = null;
  private currentSoundscape: SoundscapeType = 'none';
  private soundscapeVolume: number = 0.5;
  private enabled: boolean = true;
  // Recurso de paisagens sonoras ativo com áudios de alta fidelidade
  private soundscapesFeatureEnabled: boolean = true;
  private audioModule: ExpoAudioModule | null | undefined = undefined;
  private modeConfigured: boolean = false;

  /**
   * Carrega o módulo 'expo-audio' sob demanda (lazy) dentro de try/catch
   * para nunca falhar durante a avaliação inicial do bundle no Expo Go ou Web.
   */
  private getAudioModule(): ExpoAudioModule | null {
    if (this.audioModule !== undefined) {
      return this.audioModule;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('expo-audio') as ExpoAudioModule;
      this.audioModule = mod;
      if (!this.modeConfigured && mod.setAudioModeAsync) {
        this.modeConfigured = true;
        mod
          .setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: false,
          })
          .catch(() => {});
      }
      return this.audioModule;
    } catch {
      this.audioModule = null;
      return null;
    }
  }

  public setEnabled(value: boolean) {
    this.enabled = value;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Toca o som de início/sucesso ao concluir uma rotina ou hábito (inicio_som.mp3)
   */
  public async playSuccessSound() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        try {
          const audioAsset = require('@/assets/sounds/inicio_som.mp3');
          const audioUrl = typeof audioAsset === 'string' ? audioAsset : audioAsset?.default || audioAsset;
          const htmlAudio = new (window as any).Audio(audioUrl);
          htmlAudio.play().catch(() => {});
          return;
        } catch {}
      }

      const Audio = this.getAudioModule();
      if (!Audio?.createAudioPlayer) return;

      if (!this.successPlayer) {
        this.successPlayer = Audio.createAudioPlayer(
          require('@/assets/sounds/inicio_som.mp3')
        );
      } else {
        await this.successPlayer.seekTo(0).catch(() => {});
      }
      this.successPlayer.play();
    } catch {
      // Falha silenciosa para não interromper a experiência do usuário
    }
  }

  /**
   * Toca o som de celebração ao desbloquear uma conquista ou finalizar bloco de foco (termino_som.mp3)
   */
  public async playAchievementSound() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        try {
          const audioAsset = require('@/assets/sounds/termino_som.mp3');
          const audioUrl = typeof audioAsset === 'string' ? audioAsset : audioAsset?.default || audioAsset;
          const htmlAudio = new (window as any).Audio(audioUrl);
          htmlAudio.play().catch(() => {});
          return;
        } catch {}
      }

      const Audio = this.getAudioModule();
      if (!Audio?.createAudioPlayer) return;

      if (!this.achievementPlayer) {
        this.achievementPlayer = Audio.createAudioPlayer(
          require('@/assets/sounds/termino_som.mp3')
        );
      } else {
        await this.achievementPlayer.seekTo(0).catch(() => {});
      }
      this.achievementPlayer.play();
    } catch {
      // Falha silenciosa
    }
  }

  private webAudioCtx: any = null;

  /**
   * Toca um tique-taque sintetizado ultra-suave para concentração (sem dependência de arquivos externos).
   */
  public playTickSound() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!this.webAudioCtx) {
          this.webAudioCtx = new AudioCtx();
        }
        if (this.webAudioCtx.state === 'suspended') {
          this.webAudioCtx.resume().catch(() => {});
        }
        const ctx = this.webAudioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.025);
        gain.gain.setValueAtTime(0.035, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.025);
      }
    } catch {}
  }

  /**
   * Define o som de ambiente (soundscape) para concentração contínua.
   */
  public async setSoundscape(type: SoundscapeType, shouldPlay: boolean = true) {
    this.currentSoundscape = type;

    // Para o som de ambiente atual
    if (this.soundscapeWebAudio) {
      try {
        this.soundscapeWebAudio.pause();
      } catch {}
      this.soundscapeWebAudio = null;
    }
    if (this.soundscapePlayer) {
      try {
        this.soundscapePlayer.pause();
      } catch {}
      this.soundscapePlayer = null;
    }

    if (!this.soundscapesFeatureEnabled || type === 'none' || !this.enabled) {
      return;
    }

    try {
      const asset = SOUNDSCAPE_ASSETS[type];
      if (!asset) return;

      // Execução Web
      if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).Audio) {
        try {
          const audioUrl = typeof asset === 'string' ? asset : asset?.default || asset;
          const htmlAudio = new (window as any).Audio(audioUrl);
          htmlAudio.loop = true;
          htmlAudio.volume = this.soundscapeVolume;
          // Fallback de garantia de loop infinito mesmo com tamanhos de áudio variados
          htmlAudio.onended = () => {
            try {
              htmlAudio.currentTime = 0;
              htmlAudio.play().catch(() => {});
            } catch {}
          };
          this.soundscapeWebAudio = htmlAudio;
          if (shouldPlay) {
            htmlAudio.play().catch(() => {});
          }
          return;
        } catch {}
      }

      // Execução Mobile (Expo Audio)
      const Audio = this.getAudioModule();
      if (!Audio?.createAudioPlayer) return;

      this.soundscapePlayer = Audio.createAudioPlayer(asset);
      this.soundscapePlayer.loop = true;
      this.soundscapePlayer.volume = this.soundscapeVolume;

      // Garantia de loop contínuo independente do tamanho ou duração de cada faixa de áudio
      if (typeof this.soundscapePlayer.addListener === 'function') {
        this.soundscapePlayer.addListener('playbackStatusUpdate', (status: any) => {
          if (
            status &&
            (status.didJustFinish ||
              (status.isLoaded &&
                typeof status.duration === 'number' &&
                status.duration > 0 &&
                status.currentTime >= status.duration))
          ) {
            try {
              if (typeof this.soundscapePlayer?.seekTo === 'function') {
                this.soundscapePlayer.seekTo(0);
              }
              this.soundscapePlayer?.play();
            } catch {}
          }
        });
      }

      if (shouldPlay) {
        this.soundscapePlayer.play();
      }
    } catch {}
  }

  public pauseSoundscape() {
    try {
      if (this.soundscapeWebAudio) {
        this.soundscapeWebAudio.pause();
      }
      if (this.soundscapePlayer) {
        this.soundscapePlayer.pause();
      }
    } catch {}
  }

  public resumeSoundscape() {
    if (!this.soundscapesFeatureEnabled || this.currentSoundscape === 'none' || !this.enabled) return;
    try {
      if (this.soundscapeWebAudio) {
        this.soundscapeWebAudio.play().catch(() => {});
      } else if (this.soundscapePlayer) {
        this.soundscapePlayer.play();
      } else {
        this.setSoundscape(this.currentSoundscape, true);
      }
    } catch {}
  }

  public stopSoundscape() {
    this.pauseSoundscape();
    this.currentSoundscape = 'none';
  }

  public setSoundscapeVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.soundscapeVolume = clamped;
    try {
      if (this.soundscapeWebAudio) {
        this.soundscapeWebAudio.volume = clamped;
      }
      if (this.soundscapePlayer) {
        this.soundscapePlayer.volume = clamped;
      }
    } catch {}
  }

  public getSoundscapeVolume(): number {
    return this.soundscapeVolume;
  }

  public getCurrentSoundscape(): SoundscapeType {
    return this.currentSoundscape;
  }
}

export const soundManager = new SoundManager();
