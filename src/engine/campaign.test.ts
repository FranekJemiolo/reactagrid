import { describe, it, expect } from 'vitest';
import { LevelManager, checkWinCondition } from './campaign';
import { SimulationEngine } from './simulation';
import { ChemicalDatabase } from '../types/chemistry';
import { UserProgress } from '../types/game';
import { CampaignLevel } from '../types/campaign';
import levelsJson from '../data/levels.json';
import moleculesJson from '../data/molecules.json';
import reactionsJson from '../data/reactions.json';
import storeItemsJson from '../data/store_items.json';

const testDatabase: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

const levels = levelsJson as unknown as CampaignLevel[];

describe('LevelManager & Campaign Mode Progression', () => {
  it('correctly reports Level 1 unlocked and subsequent levels locked initially', () => {
    const initialProgress: UserProgress = {
      funds: 50,
      totalEarned: 50,
      unlockedStoreItems: ['item_tap_water', 'item_lab_glass'],
      discoveredCompounds: ['h2o', 'glass'],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: {},
    };

    const manager = new LevelManager(levels, initialProgress);

    expect(manager.isLevelUnlocked('level_1_steam')).toBe(true);
    expect(manager.isLevelUnlocked('level_2_volcano')).toBe(false);
    expect(manager.isLevelUnlocked('level_3_crucible')).toBe(false);
  });

  it('evaluates grid win condition and unlocks Level 2 upon completing Level 1', () => {
    const initialProgress: UserProgress = {
      funds: 50,
      totalEarned: 50,
      unlockedStoreItems: ['item_tap_water', 'item_lab_glass'],
      discoveredCompounds: ['h2o', 'glass'],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: {},
    };

    const manager = new LevelManager(levels, initialProgress);
    const engine = new SimulationEngine(20, 20, testDatabase);

    const level1 = manager.getLevel('level_1_steam')!;
    expect(level1).toBeDefined();

    // Initially condition is not met (0 steam pixels)
    expect(checkWinCondition(level1, engine)).toBe(false);

    // Mock grid state meeting Level 1's win condition (>= 40 steam pixels)
    const steamSpecies = engine.getSpeciesId('h2o_steam') || engine.getSpeciesId('h2o_gas');
    for (let i = 0; i < 45; i++) {
      engine.typeGrid[i] = steamSpecies;
    }

    // Assert win condition evaluates to true
    expect(checkWinCondition(level1, engine)).toBe(true);

    // Complete Level 1 with fast time (10 seconds -> 3 stars)
    const result = manager.completeLevel('level_1_steam', 10);
    expect(result.stars).toBe(3);
    expect(result.nextLevelUnlocked).toBe('level_2_volcano');

    // Assert that Level 2 is now unlocked in save state
    expect(manager.isLevelUnlocked('level_2_volcano')).toBe(true);
    expect(result.updatedProgress.completedLevels['level_1_steam']).toBe(3);
  });

  it('evaluates zone temperature win condition for crucible missions', () => {
    const engine = new SimulationEngine(200, 200, testDatabase);
    const level3 = levels.find((l) => l.id === 'level_3_crucible')!;
    expect(level3).toBeDefined();

    // Initially ambient temperature
    expect(checkWinCondition(level3, engine)).toBe(false);

    // Heat a cell inside zone { xMin: 80, xMax: 120, yMin: 90, yMax: 110 } to 520 K
    engine.setCell(100, 100, 'fe', 520.0);

    expect(checkWinCondition(level3, engine)).toBe(true);
  });
});
