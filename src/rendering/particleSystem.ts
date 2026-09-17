/**
 * Lightweight Zero-Allocation 2D Visual Particle System for ReactaGrid
 * Emits non-colliding visual sparks, smoke, and shockwaves during explosive chemical reactions.
 * Runs at 60+ FPS on top of the cellular automata grid.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'smoke' | 'shockwave';
  active: boolean;
}

export class ParticleSystem {
  private pool: Particle[];
  private maxParticles: number;
  private activeCount = 0;

  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;
    this.pool = new Array(maxParticles);
    for (let i = 0; i < maxParticles; i++) {
      this.pool[i] = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        color: '#ffaa00',
        alpha: 1.0,
        life: 0,
        maxLife: 1.0,
        type: 'spark',
        active: false,
      };
    }
  }

  private allocateParticle(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].active) {
        this.pool[i].active = true;
        this.activeCount++;
        return this.pool[i];
      }
    }
    return null;
  }

  /**
   * Emits explosive bursts of sparks, smoke, and shockwaves scaled by reaction heat yield
   */
  public emitExplosion(x: number, y: number, sparkCount = 30, heatYield = 200): void {
    const power = Math.max(1.0, Math.min(3.0, Math.abs(heatYield) / 200));
    const sparks = Math.min(60, Math.round(sparkCount * power));

    // 1. High-Velocity Incandescent Sparks
    for (let i = 0; i < sparks; i++) {
      const p = this.allocateParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = (2.0 + Math.random() * 5.0) * power;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 1.5; // Slight initial upward bias
      p.size = 1.0 + Math.random() * 2.0;
      p.color = Math.random() < 0.4 ? '#ffffff' : Math.random() < 0.7 ? '#fbbf24' : '#f97316';
      p.alpha = 1.0;
      p.life = 0;
      p.maxLife = 0.3 + Math.random() * 0.4;
      p.type = 'spark';
    }

    // 2. Billowing Smoke Puffs
    const smokeCount = Math.round(10 * power);
    for (let i = 0; i < smokeCount; i++) {
      const p = this.allocateParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * power;

      p.x = x + (Math.random() * 6 - 3);
      p.y = y + (Math.random() * 6 - 3);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 0.8; // Buoyant upward draft
      p.size = 2.5 + Math.random() * 3.5;
      const shade = Math.floor(80 + Math.random() * 60);
      p.color = `rgb(${shade}, ${shade}, ${shade})`;
      p.alpha = 0.7;
      p.life = 0;
      p.maxLife = 0.6 + Math.random() * 0.6;
      p.type = 'smoke';
    }

    // 3. Shockwave Ring
    const shock = this.allocateParticle();
    if (shock) {
      shock.x = x;
      shock.y = y;
      shock.vx = 0;
      shock.vy = 0;
      shock.size = 3.0;
      shock.color = '#38bdf8';
      shock.alpha = 0.8;
      shock.life = 0;
      shock.maxLife = 0.25;
      shock.type = 'shockwave';
    }
  }

  public emitSparks(x: number, y: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      const p = this.allocateParticle();
      if (!p) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 1.5 + Math.random() * 3.0;

      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 1.2;
      p.color = Math.random() < 0.5 ? '#f59e0b' : '#ef4444';
      p.alpha = 1.0;
      p.life = 0;
      p.maxLife = 0.25 + Math.random() * 0.2;
      p.type = 'spark';
    }
  }

  public emitSmoke(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      const p = this.allocateParticle();
      if (!p) break;

      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 2);
      const speed = 0.5 + Math.random() * 1.5;

      p.x = x + (Math.random() * 4 - 2);
      p.y = y + (Math.random() * 4 - 2);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2.0 + Math.random() * 2.5;
      const shade = Math.floor(100 + Math.random() * 50);
      p.color = `rgb(${shade}, ${shade}, ${shade})`;
      p.alpha = 0.6;
      p.life = 0;
      p.maxLife = 0.5 + Math.random() * 0.4;
      p.type = 'smoke';
    }
  }

  public update(dtSeconds: number): void {
    const gravity = 4.0; // Gravity pulling sparks down
    const airResistance = 0.96;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dtSeconds;
      if (p.life >= p.maxLife) {
        p.active = false;
        this.activeCount = Math.max(0, this.activeCount - 1);
        continue;
      }

      const progress = p.life / p.maxLife;

      if (p.type === 'spark') {
        p.vy += gravity * dtSeconds;
        p.vx *= airResistance;
        p.vy *= airResistance;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = 1.0 - progress;
      } else if (p.type === 'smoke') {
        p.vy -= 0.6 * dtSeconds; // Upward thermal buoyancy
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        p.size += 3.0 * dtSeconds; // Expanding smoke puff
        p.alpha = 0.7 * (1.0 - progress);
      } else if (p.type === 'shockwave') {
        p.size += 45.0 * dtSeconds;
        p.alpha = 0.8 * (1.0 - progress);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.activeCount === 0) return;

    ctx.save();

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active || p.alpha <= 0.01) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      if (p.type === 'spark') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'smoke') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shockwave') {
        ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  public clear(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool[i].active = false;
    }
    this.activeCount = 0;
  }
}
