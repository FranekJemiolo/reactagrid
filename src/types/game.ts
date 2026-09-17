export interface LabSaveState {
  id: string;
  name: string;
  timestamp: number;
  width: number;
  height: number;
  typesBase64: string;
  tempsBase64: string;
}

export interface UserProgress {
  funds: number;
  totalEarned: number;
  unlockedStoreItems: string[];
  discoveredReactions: string[];
  discoveredCompounds: string[];
  totalReactionsTriggered: number;
  energyGeneratedKj: number;
  hasCompletedTutorial: boolean;
  completedLevels: Record<string, number>; // levelId -> stars (1-3)
}

export interface JournalEntry {
  compoundId: string;
  discoveredAt: number;
}
