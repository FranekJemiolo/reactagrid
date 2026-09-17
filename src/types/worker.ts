import { ChemicalDatabase } from './chemistry';

export interface PaintCommand {
  x: number;
  y: number;
  radius: number;
  compoundId: string;
  temperature?: number;
}

export type MainToWorkerMessage =
  | { type: 'INIT'; payload: { width: number; height: number; database: ChemicalDatabase } }
  | { type: 'RESIZE'; payload: { width: number; height: number } }
  | { type: 'TICK' }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'CLEAR' }
  | { type: 'PAINT'; payload: PaintCommand }
  | { type: 'SET_RENDER_MODE'; payload: { mode: 'natural' | 'thermal' } }
  | { type: 'LOAD_STATE'; payload: { types: Uint16Array; temps: Float32Array } }
  | { type: 'REQUEST_STATE' };

export type WorkerToMainMessage =
  | { type: 'INITIALIZED'; payload: { width: number; height: number } }
  | {
      type: 'FRAME';
      payload: {
        pixels: Uint32Array;
        fps: number;
        stepCount: number;
        activeParticles: number;
        avgTemperature: number;
      };
    }
  | {
      type: 'REACTION_OCCURRED';
      payload: {
        reactionId: string;
        name: string;
        temperatureDelta: number;
        heatYield: number;
        reward: number;
        discoveredProducts: string[];
      };
    }
  | {
      type: 'COMPOUND_DISCOVERED';
      payload: {
        compoundId: string;
      };
    }
  | {
      type: 'STATE_EXPORTED';
      payload: {
        types: Uint16Array;
        temps: Float32Array;
        width: number;
        height: number;
      };
    };
