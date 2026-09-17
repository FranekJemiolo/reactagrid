import { ChemicalDatabase } from './chemistry';
import { CampaignLevel } from './campaign';

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
  | { type: 'SET_GRAVITY'; payload: { gravity: 1 | 0 | -1 } }
  | { type: 'SET_SPEED'; payload: { multiplier: number } }
  | { type: 'QUERY_CELL'; payload: { x: number; y: number } }
  | { type: 'LOAD_STATE'; payload: { types: Uint16Array; temps: Float32Array } }
  | { type: 'REQUEST_STATE' }
  | { type: 'SET_CAMPAIGN_LEVEL'; payload: { level: CampaignLevel | null } }
  | { type: 'SET_FLOOR_DRAIN'; payload: { enabled: boolean } }
  | { type: 'FLUSH_FLOOR'; payload?: { rows?: number } };

export type WorkerToMainMessage =
  | { type: 'INITIALIZED'; payload: { width: number; height: number } }
  | { type: 'LEVEL_WON'; payload: { levelId: string } }
  | {
      type: 'FRAME';
      payload: {
        pixels: Uint32Array;
        fps: number;
        stepCount: number;
        activeParticles: number;
        avgTemperature: number;
        maxTemperature?: number;
        minTemperature?: number;
        drainedCount?: number;
      };
    }
  | {
      type: 'CELL_INFO';
      payload: {
        x: number;
        y: number;
        compoundId: string;
        name: string;
        formula: string;
        state: string;
        density: number;
        tempK: number;
        hazardRating: number;
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
        x?: number;
        y?: number;
        pressureRelease?: number;
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
