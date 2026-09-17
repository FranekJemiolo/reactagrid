import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { UserProgress, LabSaveState } from '../types/game';

interface ReactaGridDB extends DBSchema {
  progress: {
    key: string;
    value: UserProgress;
  };
  snapshots: {
    key: string;
    value: LabSaveState;
  };
}

const DB_NAME = 'reactagrid_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReactaGridDB>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<ReactaGridDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ReactaGridDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress');
        }
        if (!db.objectStoreNames.contains('snapshots')) {
          db.createObjectStore('snapshots', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export const INITIAL_PROGRESS: UserProgress = {
  funds: 50, // Day 1 starter funds ($50)
  totalEarned: 50,
  unlockedStoreItems: ['item_tap_water', 'item_play_sand', 'item_lab_glass'],
  discoveredReactions: [],
  discoveredCompounds: ['h2o', 'sio2', 'glass'],
  totalReactionsTriggered: 0,
  energyGeneratedKj: 0,
  hasCompletedTutorial: false,
  completedLevels: {},
};

export async function loadProgress(): Promise<UserProgress> {
  try {
    const db = await getDatabase();
    const saved = await db.get('progress', 'user_progress');
    if (saved) {
      return {
        ...INITIAL_PROGRESS,
        ...saved,
      };
    }
  } catch (err) {
    console.warn('Could not load progress from IndexedDB:', err);
  }
  return { ...INITIAL_PROGRESS };
}

export async function saveProgress(progress: UserProgress): Promise<void> {
  try {
    const db = await getDatabase();
    await db.put('progress', progress, 'user_progress');
  } catch (err) {
    console.warn('Could not save progress to IndexedDB:', err);
  }
}

export async function saveSnapshot(snapshot: LabSaveState): Promise<void> {
  try {
    const db = await getDatabase();
    await db.put('snapshots', snapshot);
  } catch (err) {
    console.warn('Could not save snapshot:', err);
  }
}

export async function loadSnapshots(): Promise<LabSaveState[]> {
  try {
    const db = await getDatabase();
    return await db.getAll('snapshots');
  } catch (err) {
    console.warn('Could not load snapshots:', err);
    return [];
  }
}
