import { CampaignLevel } from '../types/campaign';
import { UserProgress } from '../types/game';
import { SimulationEngine } from './simulation';

export function checkWinCondition(level: CampaignLevel, engine: SimulationEngine): boolean {
  const { winCondition } = level;

  if (winCondition.type === 'compound_count') {
    const target = winCondition.targetCompound || '';
    const targetId = engine.getSpeciesId(target);
    const altTargetId =
      target === 'h2o_steam'
        ? engine.getSpeciesId('h2o_gas')
        : target === 'h2o_gas'
          ? engine.getSpeciesId('h2o_steam')
          : target === 'h2'
            ? engine.getSpeciesId('h2_gas')
            : target === 'h2_gas'
              ? engine.getSpeciesId('h2')
              : 0;

    let count = 0;
    const types = engine.typeGrid;
    const len = types.length;
    for (let i = 0; i < len; i++) {
      const t = types[i];
      if (t !== 0 && (t === targetId || (altTargetId !== 0 && t === altTargetId))) {
        count++;
      }
    }

    return count >= (winCondition.minCount ?? 1);
  }

  if (winCondition.type === 'zone_temperature') {
    const { zone, minTempK = 500 } = winCondition;
    if (!zone) return false;

    const w = engine.width;
    const h = engine.height;
    const xMin = Math.max(0, zone.xMin);
    const xMax = Math.min(w - 1, zone.xMax);
    const yMin = Math.max(0, zone.yMin);
    const yMax = Math.min(h - 1, zone.yMax);

    const types = engine.typeGrid;
    const temps = engine.tempGrid;

    for (let y = yMin; y <= yMax; y++) {
      for (let x = xMin; x <= xMax; x++) {
        const idx = y * w + x;
        // Check if any cell in target zone reached the required temperature
        if (types[idx] !== 0 && temps[idx] >= minTempK) {
          return true;
        }
      }
    }

    return false;
  }

  return false;
}

export function calculateStars(level: CampaignLevel, elapsedSeconds: number): number {
  if (elapsedSeconds <= level.starRequirements.threeStarsMaxSeconds) {
    return 3;
  }
  if (elapsedSeconds <= level.starRequirements.twoStarsMaxSeconds) {
    return 2;
  }
  return 1;
}

export class LevelManager {
  private levels: CampaignLevel[];
  private progress: UserProgress;

  constructor(levels: CampaignLevel[], progress: UserProgress) {
    this.levels = levels;
    this.progress = progress;
  }

  public getLevels(): CampaignLevel[] {
    return this.levels;
  }

  public getLevel(levelId: string): CampaignLevel | undefined {
    return this.levels.find((lvl) => lvl.id === levelId);
  }

  public isLevelUnlocked(levelId: string): boolean {
    const index = this.levels.findIndex((lvl) => lvl.id === levelId);
    if (index === -1) return false;
    if (index === 0) return true; // Level 1 is always unlocked

    const prevLevel = this.levels[index - 1];
    const prevStars = this.progress.completedLevels?.[prevLevel.id] ?? 0;
    return prevStars > 0;
  }

  public completeLevel(
    levelId: string,
    elapsedSeconds: number,
  ): { stars: number; nextLevelUnlocked?: string; updatedProgress: UserProgress } {
    const level = this.getLevel(levelId);
    if (!level) {
      throw new Error(`Level with id '${levelId}' not found.`);
    }

    const stars = calculateStars(level, elapsedSeconds);
    const currentStars = this.progress.completedLevels?.[levelId] ?? 0;
    const bestStars = Math.max(currentStars, stars);

    const completedLevels = {
      ...(this.progress.completedLevels || {}),
      [levelId]: bestStars,
    };

    const updatedProgress: UserProgress = {
      ...this.progress,
      completedLevels,
    };
    this.progress = updatedProgress;

    // Determine if next level became unlocked
    const currentIndex = this.levels.findIndex((lvl) => lvl.id === levelId);
    let nextLevelUnlocked: string | undefined;
    if (currentIndex >= 0 && currentIndex + 1 < this.levels.length) {
      nextLevelUnlocked = this.levels[currentIndex + 1].id;
    }

    return {
      stars,
      nextLevelUnlocked,
      updatedProgress,
    };
  }

  public getProgress(): UserProgress {
    return this.progress;
  }
}
