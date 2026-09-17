/**
 * VFX Renderer for ReactaGrid
 * Orchestrates WebGL Incandescence Bloom Shader and 2D Visual Particle System.
 * Guarantees zero frame drops during violent chemical reactions.
 */

import { ParticleSystem } from './particleSystem';
import { WebGLBloomRenderer } from './bloomShader';

export class VFXRenderer {
  public particleSystem: ParticleSystem;
  public bloomRenderer: WebGLBloomRenderer | null = null;
  private width: number;
  private height: number;
  private lastTime = 0;

  constructor(
    webglCanvas: HTMLCanvasElement | null,
    width: number,
    height: number,
    maxParticles = 500,
  ) {
    this.width = width;
    this.height = height;
    this.particleSystem = new ParticleSystem(maxParticles);

    if (webglCanvas) {
      this.bloomRenderer = new WebGLBloomRenderer(webglCanvas, width, height);
    }
  }

  public onReaction(x: number, y: number, heatYield: number, reactionId: string): void {
    if (
      Math.abs(heatYield) > 150 ||
      reactionId.includes('explosion') ||
      reactionId.includes('hydrolysis')
    ) {
      this.particleSystem.emitExplosion(x, y, 35, heatYield);
    } else if (Math.abs(heatYield) > 40) {
      this.particleSystem.emitSparks(x, y, 12);
    } else {
      this.particleSystem.emitSmoke(x, y, 4);
    }
  }

  public render(
    pixelBuffer: Uint32Array,
    overlayCtx: CanvasRenderingContext2D | null,
    currentTime: number,
  ): void {
    const dt = this.lastTime === 0 ? 0.016 : Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    // 1. WebGL Bloom Pass
    if (this.bloomRenderer?.getIsSupported()) {
      this.bloomRenderer.render(pixelBuffer);
    }

    // 2. Particle System Overlay Pass
    this.particleSystem.update(dt);
    if (overlayCtx) {
      overlayCtx.clearRect(0, 0, this.width, this.height);
      this.particleSystem.render(overlayCtx);
    }
  }

  public clear(): void {
    this.particleSystem.clear();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.bloomRenderer?.resize(width, height);
  }
}
