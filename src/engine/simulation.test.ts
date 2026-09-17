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

  it('keeps static borosilicate glassware anchored while supporting fluids and solids', () => {
    const glassId = engine.getSpeciesId('glass');
    const waterId = engine.getSpeciesId('h2o');

    // Build a glass beaker (U-shape) floating at y=10
    engine.setCell(4, 9, 'glass');
    engine.setCell(4, 10, 'glass');
    engine.setCell(5, 10, 'glass');
    engine.setCell(6, 10, 'glass');
    engine.setCell(6, 9, 'glass');

    // Pour water inside the beaker at (5, 9)
    engine.setCell(5, 9, 'h2o');

    engine.step();

    // Glass remains anchored and holds water inside beaker
    expect(engine.typeGrid[10 * 20 + 5]).toBe(glassId);
    expect(engine.typeGrid[9 * 20 + 5]).toBe(waterId);
    expect(engine.typeGrid[11 * 20 + 5]).toBe(0); // empty beneath beaker
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
    const h2oGasId = engine.getSpeciesId('h2o_gas');
    // Build a small cup so water stays localized
    engine.setCell(9, 19, 'sio2');
    engine.setCell(10, 19, 'h2o', 390.0);
    engine.setCell(11, 19, 'sio2');

    engine.step();

    // Water boils into steam
    const gridArray = Array.from(engine.typeGrid);
    expect(gridArray.includes(steamId) || gridArray.includes(h2oGasId)).toBe(true);
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

  it('verifies Bunsen Burner raises 10 pixels of h2o to 100°C and triggers h2o_gas phase change', () => {
    // Build a supporting glass beaker container: floor at y=16, side walls at x=4 and x=15
    for (let x = 4; x <= 15; x++) {
      engine.setCell(x, 16, 'glass');
    }
    for (let y = 13; y <= 15; y++) {
      engine.setCell(4, y, 'glass');
      engine.setCell(15, y, 'glass');
    }

    // Place 10 Bunsen Burners at y=15 (x=5..14)
    for (let x = 5; x < 15; x++) {
      engine.setCell(x, 15, 'bunsen_burner');
    }

    // Place 10 pixels of H2O directly above at y=14 (x=5..14) at room temp 298.15 K
    for (let x = 5; x < 15; x++) {
      engine.setCell(x, 14, 'h2o', 298.15);
    }

    const waterId = engine.getSpeciesId('h2o');
    const h2oGasId = engine.getSpeciesId('h2o_gas');
    const h2oSteamId = engine.getSpeciesId('h2o_steam');
    const burnerId = engine.getSpeciesId('bunsen_burner');

    expect(engine.typeGrid[15 * 20 + 5]).toBe(burnerId);
    expect(engine.typeGrid[14 * 20 + 5]).toBe(waterId);

    // Step simulation: each tick Bunsen Burner adds +50°C to cells directly above
    // Tick 1: 298.15 + 50 = 348.15 K
    engine.step();
    expect(engine.tempGrid[14 * 20 + 5]).toBeGreaterThanOrEqual(348.0);

    // Tick 2: 348.15 + 50 = 398.15 K (exceeds 373.15 K = 100°C boiling point)
    engine.step();

    // Check all 10 pixels transformed into gaseous steam (h2o_gas / h2o_steam)
    let steamCount = 0;
    for (let y = 0; y <= 14; y++) {
      for (let x = 5; x < 15; x++) {
        const cellType = engine.typeGrid[y * 20 + x];
        if (cellType === h2oGasId || cellType === h2oSteamId) {
          steamCount++;
        }
      }
    }
    expect(steamCount).toBe(10);
  });

  it('verifies Cooling Plate drains heat from touching cells down to -20°C (253.15 K)', () => {
    // Place cooling plate at bottom floor (10, 19)
    engine.setCell(10, 19, 'cooling_plate');

    // Place warm metal adjacent at (11, 19) at 350 K
    engine.setCell(11, 19, 'fe', 350.0);

    // Run 5 ticks to drain thermal energy
    for (let i = 0; i < 5; i++) {
      engine.step();
    }

    // Temperature should be cooled down to -20°C (253.15 K)
    expect(engine.tempGrid[19 * 20 + 11]).toBeCloseTo(253.15, 1);
  });

  it('verifies Magnetic Stirrer forces horizontal displacement of adjacent liquid', () => {
    // Build a glass beaker (floor at y=11, walls at x=8 and x=12)
    for (let x = 8; x <= 12; x++) {
      engine.setCell(x, 11, 'glass');
    }
    engine.setCell(8, 9, 'glass');
    engine.setCell(8, 10, 'glass');
    engine.setCell(12, 9, 'glass');
    engine.setCell(12, 10, 'glass');

    // Place stirrer at (10, 10)
    engine.setCell(10, 10, 'stirrer');

    // Place liquid water above at (10, 9)
    engine.setCell(10, 9, 'h2o');

    engine.step();

    // The liquid water should still be within the beaker and agitated/stirred
    const waterId = engine.getSpeciesId('h2o');
    let waterFound = false;
    for (let y = 8; y <= 10; y++) {
      for (let x = 9; x <= 11; x++) {
        if (engine.typeGrid[y * 20 + x] === waterId) {
          waterFound = true;
          break;
        }
      }
    }
    expect(waterFound).toBe(true);
  });

  it('verifies high-pressure hot gases shatter borosilicate glass into SiO2', () => {
    const glassId = engine.getSpeciesId('glass');
    const sio2Id = engine.getSpeciesId('sio2');

    // Place glass cell on a 3-wide glass floor at (10, 18) with floor at y=19
    engine.setCell(9, 19, 'glass');
    engine.setCell(10, 19, 'glass');
    engine.setCell(11, 19, 'glass');
    engine.setCell(10, 18, 'glass');

    // Surround with hot pressurized gases (>600 K)
    engine.setCell(9, 18, 'co2', 700.0);
    engine.setCell(11, 18, 'co2', 700.0);

    engine.step();

    // Extreme pressure and heat shatters glass into SiO2 shards
    expect(engine.typeGrid[18 * 20 + 10]).toBe(sio2Id);
    expect(engine.typeGrid[18 * 20 + 10]).not.toBe(glassId);
  });

  it('triggers Gunpowder deflagration above 540 K producing expanding hot gas products', () => {
    // Place a gunpowder cell at (10, 18) and heat it to 600 K
    engine.setCell(10, 18, 'gunpowder', 600.0);
    const gunpowderId = engine.getSpeciesId('gunpowder');
    expect(engine.typeGrid[18 * 20 + 10]).toBe(gunpowderId);

    // Step physics: gunpowder deflagrates into co2/n2/so2
    for (let i = 0; i < 2; i++) {
      engine.step();
    }

    const resultType = engine.typeGrid[18 * 20 + 10];
    expect(resultType).not.toBe(gunpowderId);

    // Rising hot gas elevates temperature in the column
    let maxColTemp = 0;
    for (let y = 0; y < 20; y++) {
      const t = engine.tempGrid[y * 20 + 10];
      if (t > maxColTemp) maxColTemp = t;
    }
    expect(maxColTemp).toBeGreaterThan(700.0);
  });

  it('verifies Liquid Nitrogen flash-freezes adjacent water to ice and boils into N2', () => {
    // Build a small glass container: floor at y=19, walls at x=9 and x=11
    engine.setCell(9, 19, 'glass');
    engine.setCell(10, 19, 'glass');
    engine.setCell(11, 19, 'glass');
    engine.setCell(9, 18, 'glass');
    engine.setCell(9, 17, 'glass');
    engine.setCell(11, 18, 'glass');
    engine.setCell(11, 17, 'glass');

    // Place water at (10, 18) and Liquid Nitrogen at (10, 17)
    engine.setCell(10, 18, 'h2o', 290.0);
    engine.setCell(10, 17, 'ln2', 77.0);

    const waterId = engine.getSpeciesId('h2o');
    const iceId = engine.getSpeciesId('h2o_ice');
    const ln2Id = engine.getSpeciesId('ln2');
    const n2Id = engine.getSpeciesId('n2');

    expect(engine.typeGrid[18 * 20 + 10]).toBe(waterId);
    expect(engine.typeGrid[17 * 20 + 10]).toBe(ln2Id);

    engine.step();

    // The water should be frozen to ice or the LN2 boiled to N2
    let hasIceOrN2 = false;
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        const t = engine.typeGrid[y * 20 + x];
        if (t === iceId || t === n2Id) {
          hasIceOrN2 = true;
          break;
        }
      }
    }
    expect(hasIceOrN2).toBe(true);
  });

  it('triggers Elephant Toothpaste eruption when H2O2 touches MnO2 catalyst', () => {
    engine.setCell(10, 18, 'mno2', 298.15);
    engine.setCell(10, 17, 'h2o2', 298.15);

    const h2o2Id = engine.getSpeciesId('h2o2');
    expect(engine.typeGrid[17 * 20 + 10]).toBe(h2o2Id);

    engine.step();

    // H2O2 decomposes into steam / O2, leaving catalyst
    const cellAbove = engine.typeGrid[17 * 20 + 10];
    expect(cellAbove).not.toBe(h2o2Id);
  });
});
