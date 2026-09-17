export interface LevelZone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CompoundCountCondition {
  compound: string;
  minCount?: number;
  maxCount?: number;
}

export interface InitialGridElement {
  x: number;
  y: number;
  width?: number;
  height?: number;
  compound: string;
  tempK?: number;
}

export interface LevelWinCondition {
  type:
    | 'compound_count'
    | 'compound_bounds'
    | 'zone_temperature'
    | 'gas_containment'
    | 'rotational_velocity'
    | 'controlled_demolition';
  targetCompound?: string;
  minCount?: number;
  maxCount?: number;
  conditions?: CompoundCountCondition[];
  minGasCount?: number;
  glassShatterForbidden?: boolean;
  minRotationalVelocity?: number;
  sustainSeconds?: number;
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
  initialGrid?: InitialGridElement[];
  winCondition: LevelWinCondition;
  starRequirements: LevelStarRequirements;
}

export interface LevelCompletionResult {
  stars: number;
  nextLevelUnlocked?: string;
}
