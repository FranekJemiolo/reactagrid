export interface LevelZone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface LevelWinCondition {
  type: 'compound_count' | 'zone_temperature';
  targetCompound?: string;
  minCount?: number;
  minTempK?: number;
  zone?: LevelZone;
  description: string;
}

export interface LevelStarRequirements {
  threeStarsMaxSeconds: number;
  twoStarsMaxSeconds: number;
}

export interface CampaignLevel {
  id: string;
  title: string;
  category: string;
  description: string;
  availableStoreItems: string[];
  initialFunds: number;
  winCondition: LevelWinCondition;
  starRequirements: LevelStarRequirements;
}
