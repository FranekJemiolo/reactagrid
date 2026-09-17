/**
 * Procedural Web Audio API Sound Generator for ReactaGrid
 * Re-exports the unified AudioManager and ProceduralAudioEngine with zero external audio dependencies.
 */

import { audioManager, AudioManager, ProceduralAudioEngine } from './audioManager';

export { audioManager, AudioManager, ProceduralAudioEngine };

class SoundEngineBridge {
  public toggleMute(): boolean {
    return audioManager.toggleMute();
  }

  public getIsMuted(): boolean {
    return audioManager.isMuted();
  }

  public playClick(): void {
    audioManager.playClick();
  }

  public playBubbling(): void {
    audioManager.trigger('bubble');
  }

  public playExplosion(heatYield?: number): void {
    audioManager.trigger('explosion', { heatYield });
  }

  public playSizzling(): void {
    audioManager.trigger('sizzle');
  }

  public playBoil(pixelCount?: number): void {
    audioManager.trigger('boil', { intensity: pixelCount });
  }

  public playDiscovery(): void {
    audioManager.playDiscovery();
  }
}

export const sounds = new SoundEngineBridge();
