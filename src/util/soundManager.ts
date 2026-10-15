import { Audio } from 'expo-av';

class SoundManager {
  private successSound: Audio.Sound | null = null;
  private achievementSound: Audio.Sound | null = null;
  private enabled: boolean = true;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch (_) {}
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
      if (this.successSound) {
        await this.successSound.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/inicio_som.mp3')
        );
        this.successSound = sound;
        await sound.playAsync();
      }
    } catch (_err) {
      // Falha silenciosa para não quebrar a experiência do usuário
    }
  }

  /**
   * Toca o som de celebração ao desbloquear uma conquista ou finalizar bloco de foco (termino_som.mp3)
   */
  public async playAchievementSound() {
    if (!this.enabled) return;
    try {
      if (this.achievementSound) {
        await this.achievementSound.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/termino_som.mp3')
        );
        this.achievementSound = sound;
        await sound.playAsync();
      }
    } catch (_err) {
      // Falha silenciosa
    }
  }
}

export const soundManager = new SoundManager();

