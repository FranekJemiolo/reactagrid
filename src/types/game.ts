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
}

export interface JournalEntry {
  compoundId: string;
  discoveredAt: number;
}
