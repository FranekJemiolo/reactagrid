export type MatterState = 'solid' | 'liquid' | 'gas';

export interface Molecule {
  id: string;
  name: string;
  formula: string;
  state: MatterState;
  density: number; // g/cm³
  color: string; // hex #rrggbbaa
  melting_point_k: number;
  boiling_point_k: number;
  specific_heat: number; // J/(g·K)
  thermal_conductivity: number; // W/(m·K)
  flammable: boolean;
  hazard_rating: number; // 0-4
  hazard_description: string;
  description: string;
}

export interface Reaction {
  id: string;
  name: string;
  reactants: string[];
  products: string[];
  heat_yield_kj_mol: number;
  temperature_delta_k: number;
  activation_energy_k: number;
  probability: number;
  pressure_release: number;
  category: string;
  discovery_reward: number;
  description: string;
}

export interface StoreItem {
  id: string;
  name: string;
  category: string;
  cost: number;
  description: string;
  unlocked_by_default: boolean;
  composition: Array<{
    compound: string;
    percentage: number;
  }>;
  primary_compound: string;
  icon: string;
}

export interface ChemicalDatabase {
  molecules: Record<string, Molecule>;
  reactions: Reaction[];
  storeItems: StoreItem[];
}
