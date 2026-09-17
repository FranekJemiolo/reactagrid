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

describe('Milestone 18: Campaign Seed Data & Resolution Suite', () => {
  it('strictly loads levels.json and verifies the 5 canonical levels', () => {
    expect(levels).toHaveLength(5);
    const ids = levels.map((lvl) => lvl.id);
    expect(ids).toEqual([
      'level_1_phase_shift',
      'level_2_neutralizer',
      'level_3_pressure_vessel',
      'level_4_the_engine',
      'level_5_controlled_demolition',
    ]);
  });

  it('correctly tracks unlock progression from Level 1 onwards', () => {
    const initialProgress: UserProgress = {
      funds: 50,
      totalEarned: 50,
      unlockedStoreItems: ['item_ice_block', 'item_bunsen_burner'],
      discoveredCompounds: ['h2o_ice', 'bunsen_burner'],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: {},
    };

    const manager = new LevelManager(levels, initialProgress);
    expect(manager.isLevelUnlocked('level_1_phase_shift')).toBe(true);
    expect(manager.isLevelUnlocked('level_2_neutralizer')).toBe(false);
    expect(manager.isLevelUnlocked('level_3_pressure_vessel')).toBe(false);
    expect(manager.isLevelUnlocked('level_4_the_engine')).toBe(false);
    expect(manager.isLevelUnlocked('level_5_controlled_demolition')).toBe(false);
  });

  it('programmatically resolves Level 1: Phase Shift via Bunsen Burner thermodynamics', () => {
    const initialProgress: UserProgress = {
      funds: 50,
      totalEarned: 50,
      unlockedStoreItems: ['item_ice_block', 'item_bunsen_burner'],
      discoveredCompounds: ['h2o_ice', 'bunsen_burner'],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: {},
    };

    const manager = new LevelManager(levels, initialProgress);
    const engine = new SimulationEngine(200, 200, testDatabase);

    const level1 = manager.getLevel('level_1_phase_shift')!;
    expect(level1).toBeDefined();

    // Start Level 1 (loads 120 pixels of ice)
    manager.startLevel('level_1_phase_shift', engine);

    // Initial state: 120 pixels of solid h2o_ice, 0 liquid h2o
    expect(checkWinCondition(level1, engine)).toBe(false);

    // Build containment basin and place Bunsen Burners directly beneath the ice block
    // Ice block in level_1_phase_shift is x: 90..109, y: 140..145
    for (let x = 88; x <= 111; x++) {
      engine.setCell(x, 147, 'glass', 298.15); // Basin floor
      engine.setCell(x, 146, 'bunsen_burner', 800.0); // Bunsen burner heating the ice above
    }
    for (let y = 138; y <= 147; y++) {
      engine.setCell(88, y, 'glass', 298.15); // Left wall
      engine.setCell(111, y, 'glass', 298.15); // Right wall
    }

    // Step physics ticks to heat the ice block until it melts completely into liquid water
    for (let step = 0; step < 40; step++) {
      engine.step();
      if (checkWinCondition(level1, engine)) break;
    }

    // Assert that Level 1 win condition is satisfied
    expect(checkWinCondition(level1, engine)).toBe(true);

    // Complete Level 1 and assert Level 2 is unlocked
    const completion = manager.completeLevel('level_1_phase_shift', 12);
    expect(completion.stars).toBe(3);
    expect(completion.nextLevelUnlocked).toBe('level_2_neutralizer');
    expect(manager.isLevelUnlocked('level_2_neutralizer')).toBe(true);
  });

  it('programmatically resolves Level 2: The Neutralizer via Baking Soda + Vinegar reaction', () => {
    const progressWithLevel1Done: UserProgress = {
      funds: 100,
      totalEarned: 100,
      unlockedStoreItems: ['item_baking_soda', 'item_lab_glass'],
      discoveredCompounds: ['h2o', 'ch3cooh', 'nahco3'],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: { level_1_phase_shift: 3 },
    };

    const manager = new LevelManager(levels, progressWithLevel1Done);
    const engine = new SimulationEngine(200, 200, testDatabase);

    const level2 = manager.getLevel('level_2_neutralizer')!;
    expect(level2).toBeDefined();

    // Start Level 2: Loads Pyrex beaker pre-filled with acetic acid (vinegar)
    manager.startLevel('level_2_neutralizer', engine);

    // Verify initial state: contains vinegar (ch3cooh), 0 sodium acetate
    expect(checkWinCondition(level2, engine)).toBe(false);

    // Drop initial Baking Soda (nahco3) into the beaker above vinegar
    for (let y = 146; y <= 155; y++) {
      for (let x = 85; x <= 114; x++) {
        engine.setCell(x, y, 'nahco3', 298.15);
      }
    }

    // Run physics simulation ticks: nahco3 + ch3cooh -> ch3coona + h2o + co2
    for (let step = 0; step < 80; step++) {
      engine.step();
      if (checkWinCondition(level2, engine)) break;
    }

    // If splashed droplets remain, player sprinkles a second pinch from top of beaker
    if (!checkWinCondition(level2, engine)) {
      for (let y = 142; y <= 155; y++) {
        for (let x = 80; x <= 119; x++) {
          const idx = y * engine.width + x;
          if (engine.typeGrid[idx] === 0) {
            engine.setCell(x, y, 'nahco3', 298.15);
          }
        }
      }
      for (let step = 0; step < 120; step++) {
        engine.step();
        if (checkWinCondition(level2, engine)) break;
      }
    }

    // Assert that Level 2 win condition is satisfied
    expect(checkWinCondition(level2, engine)).toBe(true);

    // Complete Level 2 and assert Level 3 is unlocked
    const completion = manager.completeLevel('level_2_neutralizer', 18);
    expect(completion.stars).toBe(3);
    expect(completion.nextLevelUnlocked).toBe('level_3_pressure_vessel');
    expect(manager.isLevelUnlocked('level_3_pressure_vessel')).toBe(true);
  });

  it('evaluates Level 3: Pressure Vessel gas containment & glass integrity', () => {
    const engine = new SimulationEngine(200, 200, testDatabase);
    const level3 = levels.find((l) => l.id === 'level_3_pressure_vessel')!;
    expect(level3).toBeDefined();

    // Initially 0 gas
    expect(checkWinCondition(level3, engine)).toBe(false);

    // Fill 520 gas cells
    const steamSpecies = engine.getSpeciesId('h2o_steam') || engine.getSpeciesId('h2o_gas');
    for (let i = 0; i < 520; i++) {
      engine.typeGrid[i] = steamSpecies;
    }

    // Without shattered glass: passes
    expect(checkWinCondition(level3, engine)).toBe(true);

    // If glass shattered: fails
    engine.shatteredGlassCount = 2;
    expect(checkWinCondition(level3, engine)).toBe(false);
  });

  it('evaluates Level 4: The Engine rotational velocity sustain', () => {
    const engine = new SimulationEngine(200, 200, testDatabase);
    const level4 = levels.find((l) => l.id === 'level_4_the_engine')!;
    expect(level4).toBeDefined();

    // Initially 0 rotational velocity sustain
    expect(checkWinCondition(level4, engine)).toBe(false);

    // Set sustained seconds to 10.5
    engine.stirrerSustainedSeconds = 10.5;
    expect(checkWinCondition(level4, engine)).toBe(true);
  });

  it('evaluates Level 5: Controlled Demolition sodium destruction and glass survival', () => {
    const engine = new SimulationEngine(200, 200, testDatabase);
    const level5 = levels.find((l) => l.id === 'level_5_controlled_demolition')!;
    expect(level5).toBeDefined();

    // Start Level 5: Pre-filled with sodium block inside glass
    const manager = new LevelManager(levels, {
      funds: 100,
      totalEarned: 100,
      unlockedStoreItems: [],
      discoveredCompounds: [],
      discoveredReactions: [],
      totalReactionsTriggered: 0,
      energyGeneratedKj: 0,
      hasCompletedTutorial: true,
      completedLevels: {},
    });
    manager.startLevel('level_5_controlled_demolition', engine);

    // Sodium still present
    expect(checkWinCondition(level5, engine)).toBe(false);

    // Clear sodium block without shattering glass
    const naSpecies = engine.getSpeciesId('na');
    for (let i = 0; i < engine.size; i++) {
      if (engine.typeGrid[i] === naSpecies) {
        engine.typeGrid[i] = 0;
      }
    }

    // Glass survives: passes
    expect(checkWinCondition(level5, engine)).toBe(true);

    // If glass shattered: fails
    engine.shatteredGlassCount = 1;
    expect(checkWinCondition(level5, engine)).toBe(false);
  });
});
