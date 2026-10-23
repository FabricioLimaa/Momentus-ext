import { Platform } from 'react-native';
import type { AudioPlayer } from 'expo-audio';

type ExpoAudioModule = typeof import('expo-audio');

class SoundManager {
  private successPlayer: AudioPlayer | null = null;
  private achievementPlayer: AudioPlayer | null = null;
  private enabled: boolean = true;
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
}

export const soundManager = new SoundManager();
