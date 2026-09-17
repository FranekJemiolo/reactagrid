import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from './simulation';
import { ChemicalDatabase } from '../types/chemistry';
import moleculesJson from '../data/molecules.json';
import reactionsJson from '../data/reactions.json';
import storeItemsJson from '../data/store_items.json';

const testDatabase: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

describe('SimulationEngine - Core Physics and Chemistry Passes', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine(20, 20, testDatabase);
    engine.clear();
  });

  it('correctly initializes species mapping and properties', () => {
    expect(engine.getSpeciesId('empty')).toBe(0);
    expect(engine.getSpeciesId('h2o')).toBeGreaterThan(0);
    expect(engine.getSpeciesId('sio2')).toBeGreaterThan(0);
    expect(engine.getCompoundName(engine.getSpeciesId('h2o'))).toBe('h2o');
  });

  it('handles gravity: dense solid particles (sand) fall straight down into empty space', () => {
    engine.setCell(5, 5, 'sio2');
    expect(engine.typeGrid[5 * 20 + 5]).toBe(engine.getSpeciesId('sio2'));

    // Step physics
    engine.step();

    // The sand should fall down to y=6
    const sandId = engine.getSpeciesId('sio2');
    expect(engine.typeGrid[6 * 20 + 5]).toBe(sandId);
    expect(engine.typeGrid[5 * 20 + 5]).toBe(0);
  });

  it('handles density sorting: denser liquid sinks below lighter liquid in a test column', () => {
    const waterId = engine.getSpeciesId('h2o'); // density 1.00
    const alcoholId = engine.getSpeciesId('c2h5oh'); // density 0.789 (lighter)

    // Build container column walls at x=9 and x=11
    engine.setCell(9, 18, 'sio2');
    engine.setCell(11, 18, 'sio2');
    engine.setCell(9, 19, 'sio2');
    engine.setCell(11, 19, 'sio2');

    // Place lighter liquid (alcohol) below denser water in the column
    engine.setCell(10, 18, 'h2o');
    engine.setCell(10, 19, 'c2h5oh');

    engine.step();

    // Denser water sinks to bottom (y=19), lighter alcohol floats up to (y=18)
    expect(engine.typeGrid[19 * 20 + 10]).toBe(waterId);
    expect(engine.typeGrid[18 * 20 + 10]).toBe(alcoholId);
  });

  it('handles gas buoyancy: gas (CO2) rises upwards', () => {
    const co2Id = engine.getSpeciesId('co2');
    engine.setCell(10, 15, 'co2');

    engine.step();

    // Gas rises towards top of tank
    expect(engine.typeGrid[14 * 20 + 10]).toBe(co2Id);
    expect(engine.typeGrid[15 * 20 + 10]).toBe(0);
  });

  it('handles heat conduction: hot metal transfers thermal energy to cold metal neighbor', () => {
    // Place iron filings (high thermal conductivity) side by side on bottom floor
    engine.setCell(5, 19, 'fe', 500.0); // 500 K hot
    engine.setCell(6, 19, 'fe', 300.0); // 300 K cold

    // Step simulation
    for (let i = 0; i < 10; i++) {
      engine.step();
    }

    const tempHot = engine.tempGrid[19 * 20 + 5];
    const tempCold = engine.tempGrid[19 * 20 + 6];

    // Energy conducts stably without numerical explosion
    expect(tempHot).toBeLessThan(500.0);
    expect(tempCold).toBeGreaterThan(300.0);
    expect(tempHot).toBeGreaterThan(300.0);
  });

  it('handles phase transitions: water boils to steam when heated above 373.15 K', () => {
    const steamId = engine.getSpeciesId('h2o_steam');
    // Build a small cup so water stays localized
    engine.setCell(9, 19, 'sio2');
    engine.setCell(10, 19, 'h2o', 390.0);
    engine.setCell(11, 19, 'sio2');

    engine.step();

    // Water boils into steam
    expect(Array.from(engine.typeGrid).includes(steamId)).toBe(true);
  });

  it('handles chemical reactions: Baking Soda + Vinegar volcano reaction in a container', () => {
    // Place Baking Soda and Vinegar in a beaker so liquid does not disperse away
    engine.setCell(4, 19, 'sio2');
    engine.setCell(5, 19, 'nahco3', 298.15);
    engine.setCell(6, 19, 'ch3cooh', 298.15);
    engine.setCell(7, 19, 'sio2');

    let reacted = false;
    for (let i = 0; i < 15; i++) {
      engine.step();
      if (engine.queuedEvents.some((e) => e.reactionId === 'volcano_effervescence')) {
        reacted = true;
        break;
      }
    }

    expect(reacted).toBe(true);
    expect(engine.newlyDiscoveredCompounds.has('co2')).toBe(true);
  });

  it('handles toxic hazard reaction: Bleach + Window Cleaner in beaker produces Chloramine Gas', () => {
    // Beaker walls at x=9 and x=12
    engine.setCell(9, 19, 'sio2');
    engine.setCell(10, 19, 'naclo', 298.15);
    engine.setCell(11, 19, 'nh3', 298.15);
    engine.setCell(12, 19, 'sio2');

    let reacted = false;
    for (let i = 0; i < 15; i++) {
      engine.step();
      if (engine.queuedEvents.some((e) => e.reactionId === 'bleach_ammonia_hazard')) {
        reacted = true;
        break;
      }
    }

    expect(reacted).toBe(true);
    expect(engine.newlyDiscoveredCompounds.has('nh2cl')).toBe(true);
  });

  it('handles violent alkali metal reaction: Sodium + Water in a contained cup produces Hydrogen & Lye', () => {
    // Build a small barrier so liquid water cannot flow away before reacting
    engine.setCell(4, 19, 'sio2');
    engine.setCell(5, 19, 'na', 298.15);
    engine.setCell(6, 19, 'h2o', 298.15);
    engine.setCell(7, 19, 'sio2');

    let reacted = false;
    for (let i = 0; i < 15; i++) {
      engine.step();
      if (engine.queuedEvents.some((e) => e.reactionId === 'sodium_water_explosion')) {
        reacted = true;
        break;
      }
    }

    expect(reacted).toBe(true);
    expect(engine.newlyDiscoveredCompounds.has('h2')).toBe(true);
    expect(engine.newlyDiscoveredCompounds.has('naoh')).toBe(true);
  });

  it('handles microgravity (0G) and inverted gravity (-1G)', () => {
    // Inverted gravity test (-1G)
    engine.gravityMode = -1;
    engine.setCell(10, 10, 'sio2');
    engine.step();

    // Sand should fall UP towards ceiling (y=9)
    const sandId = engine.getSpeciesId('sio2');
    expect(engine.typeGrid[9 * 20 + 10]).toBe(sandId);

    // Microgravity test (0G)
    engine.clear();
    engine.gravityMode = 0;
    engine.setCell(10, 10, 'h2o');
    engine.step();

    // Particle does not collapse straight to floor
    expect(engine.typeGrid[19 * 20 + 10]).toBe(0);

    // Cell info query
    const info = engine.getCellInfo(10, 10);
    expect(info).not.toBeNull();
  });

  it('properly paints circular patterns and clears grid', () => {
    engine.paint(10, 10, 3, 'sio2');
    const sandId = engine.getSpeciesId('sio2');
    expect(engine.typeGrid[10 * 20 + 10]).toBe(sandId);

    engine.clear();
    expect(engine.typeGrid[10 * 20 + 10]).toBe(0);
    expect(engine.getStats().activeParticles).toBe(0);
  });
});
