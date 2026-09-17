/// <reference lib="webworker" />

import { SimulationEngine } from '../engine/simulation';
import { MainToWorkerMessage, WorkerToMainMessage } from '../types/worker';
import { CampaignLevel } from '../types/campaign';
import { checkWinCondition } from '../engine/campaign';

let engine: SimulationEngine | null = null;
let isRunning = false;
let loopId: number | null = null;
let lastTime = performance.now();
let frameCount = 0;
let currentFps = 60;
let speedMultiplier = 1;
let subTickAccumulator = 0;
let activeCampaignLevel: CampaignLevel | null = null;
let hasWonCampaignLevel = false;

function tick() {
  if (!engine) return;

  const now = performance.now();
  frameCount++;
  if (now - lastTime >= 1000) {
    currentFps = Math.round((frameCount * 1000) / (now - lastTime));
    frameCount = 0;
    lastTime = now;
  }

  if (speedMultiplier <= 0.5) {
    subTickAccumulator += speedMultiplier;
    if (subTickAccumulator >= 1) {
      engine.step();
      subTickAccumulator -= 1;
    } else {
      engine.renderColorBuffer();
    }
  } else {
    const steps = Math.min(4, Math.round(speedMultiplier));
    for (let s = 0; s < steps; s++) {
      engine.step();
    }
  }

  // Dispatch queued reactions
  while (engine.queuedEvents.length > 0) {
    const rxn = engine.queuedEvents.shift()!;
    const msg: WorkerToMainMessage = {
      type: 'REACTION_OCCURRED',
      payload: rxn,
    };
    self.postMessage(msg);
  }

  // Dispatch newly discovered compounds
  if (engine.newlyDiscoveredCompounds.size > 0) {
    for (const compoundId of engine.newlyDiscoveredCompounds) {
      const msg: WorkerToMainMessage = {
        type: 'COMPOUND_DISCOVERED',
        payload: { compoundId },
      };
      self.postMessage(msg);
    }
    engine.newlyDiscoveredCompounds.clear();
  }

  // Check active campaign win condition
  if (
    activeCampaignLevel &&
    !hasWonCampaignLevel &&
    frameCount % 5 === 0 &&
    checkWinCondition(activeCampaignLevel, engine)
  ) {
    hasWonCampaignLevel = true;
    const winMsg: WorkerToMainMessage = {
      type: 'LEVEL_WON',
      payload: { levelId: activeCampaignLevel.id },
    };
    self.postMessage(winMsg);
  }

  // Export frame buffer
  const stats = engine.getStats();
  const pixelCopy = new Uint32Array(engine.colorBuffer);

  const frameMsg: WorkerToMainMessage = {
    type: 'FRAME',
    payload: {
      pixels: pixelCopy,
      fps: currentFps,
      stepCount: engine.tickCount,
      activeParticles: stats.activeParticles,
      avgTemperature: stats.avgTemperature,
    },
  };

  // Transfer array buffer for maximum performance
  self.postMessage(frameMsg, [pixelCopy.buffer]);

  if (isRunning) {
    // Schedule next tick aiming for 60fps (~16.6ms)
    loopId = self.setTimeout(tick, 1000 / 60) as unknown as number;
  }
}

self.addEventListener('message', (e: MessageEvent<MainToWorkerMessage>) => {
  const msg = e.data;

  switch (msg.type) {
    case 'INIT': {
      const { width, height, database } = msg.payload;
      engine = new SimulationEngine(width, height, database);
      const res: WorkerToMainMessage = {
        type: 'INITIALIZED',
        payload: { width, height },
      };
      self.postMessage(res);
      break;
    }

    case 'RESIZE': {
      if (!engine) return;
      // Re-init with new dimensions
      break;
    }

    case 'START': {
      if (!isRunning) {
        isRunning = true;
        lastTime = performance.now();
        frameCount = 0;
        tick();
      }
      break;
    }

    case 'PAUSE': {
      isRunning = false;
      if (loopId !== null) {
        self.clearTimeout(loopId);
        loopId = null;
      }
      break;
    }

    case 'TICK': {
      if (engine) {
        tick();
      }
      break;
    }

    case 'PAINT': {
      if (engine) {
        const { x, y, radius, compoundId, temperature } = msg.payload;
        engine.paint(x, y, radius, compoundId, temperature);
      }
      break;
    }

    case 'SET_RENDER_MODE': {
      if (engine) {
        engine.renderMode = msg.payload.mode;
        engine.renderColorBuffer();
      }
      break;
    }

    case 'SET_GRAVITY': {
      if (engine) {
        engine.gravityMode = msg.payload.gravity;
      }
      break;
    }

    case 'SET_SPEED': {
      speedMultiplier = msg.payload.multiplier;
      break;
    }

    case 'QUERY_CELL': {
      if (engine) {
        const info = engine.getCellInfo(msg.payload.x, msg.payload.y);
        if (info) {
          const res: WorkerToMainMessage = {
            type: 'CELL_INFO',
            payload: info,
          };
          self.postMessage(res);
        }
      }
      break;
    }

    case 'CLEAR': {
      if (engine) {
        engine.clear();
        tick();
      }
      break;
    }

    case 'LOAD_STATE': {
      if (engine) {
        engine.typeGrid.set(msg.payload.types);
        engine.tempGrid.set(msg.payload.temps);
        tick();
      }
      break;
    }

    case 'SET_CAMPAIGN_LEVEL': {
      activeCampaignLevel = msg.payload.level;
      hasWonCampaignLevel = false;
      if (engine && activeCampaignLevel?.initialGrid) {
        engine.loadInitialGrid(activeCampaignLevel.initialGrid);
      }
      break;
    }

    case 'REQUEST_STATE': {
      if (engine) {
        const types = new Uint16Array(engine.typeGrid);
        const temps = new Float32Array(engine.tempGrid);
        const res: WorkerToMainMessage = {
          type: 'STATE_EXPORTED',
          payload: {
            types,
            temps,
            width: engine.width,
            height: engine.height,
          },
        };
        self.postMessage(res, [types.buffer, temps.buffer]);
      }
      break;
    }
  }
});
