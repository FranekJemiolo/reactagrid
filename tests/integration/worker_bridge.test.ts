import { describe, it, expect } from 'vitest';
import { MainToWorkerMessage, WorkerToMainMessage } from '../../src/types/worker';
import { ChemicalDatabase } from '../../src/types/chemistry';
import moleculesJson from '../../src/data/molecules.json';
import reactionsJson from '../../src/data/reactions.json';
import storeItemsJson from '../../src/data/store_items.json';

const database: ChemicalDatabase = {
  molecules: moleculesJson as unknown as ChemicalDatabase['molecules'],
  reactions: reactionsJson as unknown as ChemicalDatabase['reactions'],
  storeItems: storeItemsJson as unknown as ChemicalDatabase['storeItems'],
};

describe('Worker Bridge - Message Protocol & Serialization', () => {
  it('correctly validates and structures MainToWorkerMessage payloads', () => {
    const initMsg: MainToWorkerMessage = {
      type: 'INIT',
      payload: { width: 100, height: 100, database },
    };
    expect(initMsg.type).toBe('INIT');
    expect(initMsg.payload.width).toBe(100);

    const paintMsg: MainToWorkerMessage = {
      type: 'PAINT',
      payload: {
        x: 50,
        y: 50,
        radius: 4,
        compoundId: 'nahco3',
        temperature: 298.15,
      },
    };
    expect(paintMsg.type).toBe('PAINT');
    expect(paintMsg.payload.compoundId).toBe('nahco3');
  });

  it('correctly validates WorkerToMainMessage discriminated unions', () => {
    const frameMsg: WorkerToMainMessage = {
      type: 'FRAME',
      payload: {
        pixels: new Uint32Array(100),
        fps: 60,
        stepCount: 150,
        activeParticles: 42,
        avgTemperature: 298.15,
      },
    };
    expect(frameMsg.type).toBe('FRAME');
    expect(frameMsg.payload.fps).toBe(60);

    const rxnMsg: WorkerToMainMessage = {
      type: 'REACTION_OCCURRED',
      payload: {
        reactionId: 'volcano_effervescence',
        name: 'Baking Soda & Vinegar Volcano',
        temperatureDelta: -4.5,
        heatYield: -15.0,
        reward: 50,
        discoveredProducts: ['ch3coona', 'h2o', 'co2'],
      },
    };
    expect(rxnMsg.type).toBe('REACTION_OCCURRED');
    expect(rxnMsg.payload.reward).toBe(50);
  });
});
