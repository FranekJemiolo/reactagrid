import { SimulationEngine } from '../src/engine/simulation';
import moleculesJson from '../src/data/molecules.json';
import reactionsJson from '../src/data/reactions.json';
import storeItemsJson from '../src/data/store_items.json';
import { ChemicalDatabase } from '../src/types/chemistry';

const database: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

export function runStressTest(size = 500, activeRows = 100, steps = 30): boolean {
  console.log('='.repeat(70));
  console.log(`ReactaGrid Milestone 12 Performance Stress Test`);
  console.log(`Grid Dimensions: ${size}x${size} (${size * size} total cells)`);
  console.log(`Initializing SimulationEngine backed by contiguous TypedArrays...`);
  console.log('='.repeat(70));

  const engine = new SimulationEngine(size, size, database);

  // Fill bottom rows with alternating pixels of Baking Soda (nahco3) and Vinegar (ch3cooh)
  let reactiveParticleCount = 0;
  for (let y = size - activeRows; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const comp = (x + y) % 2 === 0 ? 'nahco3' : 'ch3cooh';
      engine.setCell(x, y, comp, 298.15);
      reactiveParticleCount++;
    }
  }

  console.log(
    `Seeded ${reactiveParticleCount.toLocaleString()} alternating reactive particles (Baking Soda + Vinegar).`,
  );
  console.log(
    `Executing ${steps} consecutive simulation steps with massive simultaneous gas expansion...`,
  );

  const stepTimes: number[] = [];
  const startTotal = performance.now();

  for (let i = 0; i < steps; i++) {
    const stepStart = performance.now();
    engine.step();
    const stepEnd = performance.now();
    stepTimes.push(stepEnd - stepStart);
  }

  const durationTotal = performance.now() - startTotal;
  const avgMsPerStep = durationTotal / steps;
  const avgFps = 1000 / avgMsPerStep;
  const minMs = Math.min(...stepTimes);
  const maxMs = Math.max(...stepTimes);

  console.log('-'.repeat(70));
  console.log(`Total Execution Time: ${durationTotal.toFixed(2)} ms for ${steps} steps`);
  console.log(`Average Step Time:    ${avgMsPerStep.toFixed(2)} ms/step`);
  console.log(`Fastest Step:         ${minMs.toFixed(2)} ms`);
  console.log(`Slowest Step:         ${maxMs.toFixed(2)} ms`);
  console.log(`Effective Frame Rate: ~${Math.round(avgFps)} FPS (Requirement: >= 30 FPS)`);
  console.log(`Queued Reaction Events Triggered: ${engine.queuedEvents.length.toLocaleString()}`);
  console.log('-'.repeat(70));

  if (avgFps >= 30) {
    console.log(
      `✅ PASSED: Engine comfortably exceeded the 30 FPS threshold (~${Math.round(avgFps)} FPS)!`,
    );
    return true;
  } else {
    console.error(`❌ FAILED: Engine averaged below 30 FPS (~${Math.round(avgFps)} FPS).`);
    return false;
  }
}

const success = runStressTest();
if (!success) {
  process.exit(1);
}
