import { ChemicalDatabase } from '../types/chemistry';
import { MainToWorkerMessage, WorkerToMainMessage, PaintCommand } from '../types/worker';

export interface WorkerBridgeCallbacks {
  onFrame?: (data: {
    pixels: Uint32Array;
    fps: number;
    stepCount: number;
    activeParticles: number;
    avgTemperature: number;
  }) => void;
  onReaction?: (reaction: {
    reactionId: string;
    name: string;
    temperatureDelta: number;
    heatYield: number;
    reward: number;
    discoveredProducts: string[];
  }) => void;
  onCompoundDiscovered?: (compoundId: string) => void;
  onStateExported?: (state: {
    types: Uint16Array;
    temps: Float32Array;
    width: number;
    height: number;
  }) => void;
}

export class SimulationWorkerBridge {
  private worker: Worker | null = null;
  private isInitialized = false;
  private callbacks: WorkerBridgeCallbacks = {};

  constructor(callbacks: WorkerBridgeCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public init(width: number, height: number, database: ChemicalDatabase): Promise<void> {
    return new Promise((resolve) => {
      this.worker = new Worker(new URL('../workers/simulation.worker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent<WorkerToMainMessage>) => {
        const msg = e.data;

        switch (msg.type) {
          case 'INITIALIZED':
            this.isInitialized = true;
            resolve();
            break;

          case 'FRAME':
            this.callbacks.onFrame?.(msg.payload);
            break;

          case 'REACTION_OCCURRED':
            this.callbacks.onReaction?.(msg.payload);
            break;

          case 'COMPOUND_DISCOVERED':
            this.callbacks.onCompoundDiscovered?.(msg.payload.compoundId);
            break;

          case 'STATE_EXPORTED':
            this.callbacks.onStateExported?.(msg.payload);
            break;
        }
      };

      const initMsg: MainToWorkerMessage = {
        type: 'INIT',
        payload: { width, height, database },
      };
      this.worker.postMessage(initMsg);
    });
  }

  public setCallbacks(callbacks: WorkerBridgeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public start(): void {
    this.send({ type: 'START' });
  }

  public pause(): void {
    this.send({ type: 'PAUSE' });
  }

  public step(): void {
    this.send({ type: 'TICK' });
  }

  public clear(): void {
    this.send({ type: 'CLEAR' });
  }

  public paint(cmd: PaintCommand): void {
    this.send({ type: 'PAINT', payload: cmd });
  }

  public requestState(): void {
    this.send({ type: 'REQUEST_STATE' });
  }

  public loadState(types: Uint16Array, temps: Float32Array): void {
    this.send({ type: 'LOAD_STATE', payload: { types, temps } });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }

  private send(msg: MainToWorkerMessage): void {
    if (this.worker && this.isInitialized) {
      this.worker.postMessage(msg);
    }
  }
}
