import { describe, it, expect } from 'vitest';
import { SimulationEngine } from './simulation';
import { ChemicalDatabase } from '../types/chemistry';
import moleculesJson from '../data/molecules.json';
import reactionsJson from '../data/reactions.json';
import storeItemsJson from '../data/store_items.json';

const database: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

describe('Performance Stress Test & Benchmark', () => {
  it('handles massive reaction and simultaneous gas expansion on a 200x200 grid at high speed', () => {
    const size = 200;
    const engine = new SimulationEngine(size, size, database);

    // Fill bottom 40 rows with alternating pixels of Baking Soda and Vinegar (Milestone 12 stress test)
    for (let y = size - 40; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const comp = (x + y) % 2 === 0 ? 'nahco3' : 'ch3cooh';
        engine.setCell(x, y, comp, 298.15);
      }
    }

    const start = performance.now();
    const STEPS = 30;

    for (let i = 0; i < STEPS; i++) {
      engine.step();
    }

    const duration = performance.now() - start;
    const msPerStep = duration / STEPS;
    const estimatedFps = 1000 / msPerStep;

    console.log(
      `Benchmark: 200x200 Grid (${size * size} cells, 8000 active reactive particles) took ${duration.toFixed(1)}ms for ${STEPS} steps (${msPerStep.toFixed(2)}ms/step, ~${Math.round(estimatedFps)} FPS)`,
    );

    // Each step must comfortably run within real-time budget (< 33ms for 30 FPS, ideally < 16ms for 60 FPS)
    expect(msPerStep).toBeLessThan(33.0);
    expect(engine.queuedEvents.length).toBeGreaterThan(0);
  });

  it('handles massive reaction and simultaneous gas expansion on a 500x500 grid (Milestone 12)', () => {
    const size = 500;
    const engine = new SimulationEngine(size, size, database);

    // Fill bottom 60 rows with alternating pixels of Baking Soda and Vinegar (30,000 active reactive particles)
    for (let y = size - 60; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const comp = (x + y) % 2 === 0 ? 'nahco3' : 'ch3cooh';
        engine.setCell(x, y, comp, 298.15);
      }
    }

    const start = performance.now();
    const STEPS = 20;

    for (let i = 0; i < STEPS; i++) {
      engine.step();
    }

    const duration = performance.now() - start;
    const msPerStep = duration / STEPS;
    const estimatedFps = 1000 / msPerStep;

    console.log(
      `Benchmark: 500x500 Grid (${size * size} cells, 30,000 active reactive particles) took ${duration.toFixed(1)}ms for ${STEPS} steps (${msPerStep.toFixed(2)}ms/step, ~${Math.round(estimatedFps)} FPS)`,
    );

    // Milestone 12 Requirement: Must not drop below 30 FPS (< 33.3ms/step)
    expect(msPerStep).toBeLessThan(33.3);
    expect(estimatedFps).toBeGreaterThanOrEqual(30.0);
    expect(engine.queuedEvents.length).toBeGreaterThan(0);
  });
});
