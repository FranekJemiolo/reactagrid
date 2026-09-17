import { ChemicalDatabase, Reaction } from '../types/chemistry';

export interface ReactionEvent {
  reactionId: string;
  name: string;
  temperatureDelta: number;
  heatYield: number;
  reward: number;
  discoveredProducts: string[];
}

export class SimulationEngine {
  public width: number;
  public height: number;
  public size: number;

  public typeGrid: Uint16Array;
  public tempGrid: Float32Array;
  public flagGrid: Uint8Array;
  public colorBuffer: Uint32Array;

  // Numerical species mapping
  public speciesMap: Map<string, number> = new Map();
  public idToSpecies: string[] = ['empty'];
  public speciesCount = 0;

  // Species properties lookup arrays
  public stateLookup: Uint8Array; // 0 = gas, 1 = liquid, 2 = solid
  public densityLookup: Float32Array;
  public colorLookup: Uint32Array;
  public specificHeatLookup: Float32Array;
  public conductivityLookup: Float32Array;
  public boilingPointLookup: Float32Array;
  public meltingPointLookup: Float32Array;

  // Reactions lookup
  public pairReactions: Map<number, Reaction[]> = new Map();
  public singleReactions: Map<number, Reaction[]> = new Map();

  public tickCount = 0;
  public currentTickId = 1;

  public queuedEvents: ReactionEvent[] = [];
  public newlyDiscoveredCompounds: Set<string> = new Set();

  constructor(width: number, height: number, database: ChemicalDatabase) {
    this.width = width;
    this.height = height;
    this.size = width * height;

    this.typeGrid = new Uint16Array(this.size);
    this.tempGrid = new Float32Array(this.size);
    this.flagGrid = new Uint8Array(this.size);
    this.colorBuffer = new Uint32Array(this.size);

    // Initialize ambient temperature (298.15 K = 25°C)
    this.tempGrid.fill(298.15);

    // Initialize lookups
    const molecules = Object.values(database.molecules);
    this.speciesCount = molecules.length + 1;

    this.stateLookup = new Uint8Array(this.speciesCount);
    this.densityLookup = new Float32Array(this.speciesCount);
    this.colorLookup = new Uint32Array(this.speciesCount);
    this.specificHeatLookup = new Float32Array(this.speciesCount);
    this.conductivityLookup = new Float32Array(this.speciesCount);
    this.boilingPointLookup = new Float32Array(this.speciesCount);
    this.meltingPointLookup = new Float32Array(this.speciesCount);

    this.initDatabase(database);
  }

  private parseHexColor(hex: string): number {
    let clean = hex.replace('#', '');
    if (clean.length === 6) clean += 'ff';
    if (clean.length !== 8) return 0x00000000;

    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const a = parseInt(clean.substring(6, 8), 16);

    return (a << 24) | (b << 16) | (g << 8) | r;
  }

  public initDatabase(database: ChemicalDatabase): void {
    this.speciesMap.clear();
    this.idToSpecies = ['empty'];
    this.speciesMap.set('empty', 0);

    // Empty cell defaults
    this.stateLookup[0] = 0; // gas
    this.densityLookup[0] = 0.0012;
    this.colorLookup[0] = 0x00000000;
    this.specificHeatLookup[0] = 1.0;
    this.conductivityLookup[0] = 0.026;
    this.boilingPointLookup[0] = 0;
    this.meltingPointLookup[0] = 0;

    let index = 1;
    for (const mol of Object.values(database.molecules)) {
      if (mol.id === 'empty') continue;

      this.speciesMap.set(mol.id, index);
      this.idToSpecies[index] = mol.id;

      const stateNum = mol.state === 'gas' ? 0 : mol.state === 'liquid' ? 1 : 2;
      this.stateLookup[index] = stateNum;
      this.densityLookup[index] = mol.density;
      this.colorLookup[index] = this.parseHexColor(mol.color);
      this.specificHeatLookup[index] = mol.specific_heat;
      this.conductivityLookup[index] = mol.thermal_conductivity;
      this.boilingPointLookup[index] = mol.boiling_point_k;
      this.meltingPointLookup[index] = mol.melting_point_k;

      index++;
    }

    // Index Reactions
    this.pairReactions.clear();
    this.singleReactions.clear();

    for (const rxn of database.reactions) {
      if (rxn.reactants.length === 1) {
        const id = this.speciesMap.get(rxn.reactants[0]);
        if (id !== undefined) {
          const list = this.singleReactions.get(id) || [];
          list.push(rxn);
          this.singleReactions.set(id, list);
        }
      } else if (rxn.reactants.length >= 2) {
        const idA = this.speciesMap.get(rxn.reactants[0]);
        const idB = this.speciesMap.get(rxn.reactants[1]);
        if (idA !== undefined && idB !== undefined) {
          const key1 = (idA << 16) | idB;
          const key2 = (idB << 16) | idA;

          const list1 = this.pairReactions.get(key1) || [];
          list1.push(rxn);
          this.pairReactions.set(key1, list1);

          if (key1 !== key2) {
            const list2 = this.pairReactions.get(key2) || [];
            list2.push(rxn);
            this.pairReactions.set(key2, list2);
          }
        }
      }
    }
  }

  public getSpeciesId(compound: string): number {
    return this.speciesMap.get(compound) ?? 0;
  }

  public getCompoundName(speciesId: number): string {
    return this.idToSpecies[speciesId] ?? 'empty';
  }

  public clear(): void {
    this.typeGrid.fill(0);
    this.tempGrid.fill(298.15);
    this.flagGrid.fill(0);
    this.colorBuffer.fill(0);
  }

  public setCell(x: number, y: number, compoundId: string, tempK = 298.15): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = y * this.width + x;
    const speciesId = this.getSpeciesId(compoundId);
    this.typeGrid[idx] = speciesId;
    this.tempGrid[idx] = tempK;
  }

  public paint(x: number, y: number, radius: number, compoundId: string, tempK = 298.15): void {
    const speciesId = this.getSpeciesId(compoundId);
    const r2 = radius * radius;

    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(y + radius));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - x;
        const dy = py - y;
        if (dx * dx + dy * dy <= r2) {
          // Slight randomness for natural brush placement
          if (radius > 1 && Math.random() < 0.15 && compoundId !== 'empty') {
            continue;
          }
          const idx = py * this.width + px;
          this.typeGrid[idx] = speciesId;
          this.tempGrid[idx] = tempK;
        }
      }
    }
  }

  public step(): void {
    this.tickCount++;
    this.currentTickId = (this.currentTickId % 254) + 1;

    // 1. Gravity & Density Physics Pass
    this.stepPhysics();

    // 2. Thermodynamics Pass (Heat conduction & Phase shifts)
    this.stepThermodynamics();

    // 3. Chemistry Adjacency Pass
    this.stepChemistry();

    // 4. Color Buffer Render
    this.renderColorBuffer();
  }

  private stepPhysics(): void {
    const w = this.width;
    const h = this.height;
    const types = this.typeGrid;
    const flags = this.flagGrid;
    const tick = this.currentTickId;
    const densities = this.densityLookup;
    const states = this.stateLookup;

    // Scan bottom-up for falling solids/liquids
    for (let y = h - 1; y >= 0; y--) {
      // Alternate left-right scanning to avoid directional bias
      const leftToRight = (y + this.tickCount) % 2 === 0;
      const startX = leftToRight ? 0 : w - 1;
      const endX = leftToRight ? w : -1;
      const stepX = leftToRight ? 1 : -1;

      for (let x = startX; x !== endX; x += stepX) {
        const idx = y * w + x;
        const type = types[idx];
        if (type === 0 || flags[idx] === tick) continue;

        const state = states[type];
        const density = densities[type];

        if (state === 2) {
          // SOLID (Sand, Iron, Baking Soda, etc.)
          if (y + 1 < h) {
            const belowIdx = (y + 1) * w + x;
            const belowType = types[belowIdx];

            // Falls straight down if below is empty or liquid (solids denser than liquids)
            if (belowType === 0 || states[belowType] === 1) {
              this.swap(idx, belowIdx);
              flags[belowIdx] = tick;
              continue;
            }

            // Roll down diagonally if blocked below into empty space
            const dir = Math.random() < 0.5 ? 1 : -1;
            const d1 = x + dir;
            const d2 = x - dir;

            if (d1 >= 0 && d1 < w) {
              const diagIdx = (y + 1) * w + d1;
              const diagType = types[diagIdx];
              if (diagType === 0) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }

            if (d2 >= 0 && d2 < w) {
              const diagIdx = (y + 1) * w + d2;
              const diagType = types[diagIdx];
              if (diagType === 0) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }
          }
        } else if (state === 1) {
          // LIQUID (Water, Vinegar, Bleach, Ammonia, Acid, Alcohol)
          if (y + 1 < h) {
            const belowIdx = (y + 1) * w + x;
            const belowType = types[belowIdx];

            // Falls down into empty space or swaps with lower-density liquid
            if (belowType === 0 || (states[belowType] === 1 && densities[belowType] < density)) {
              this.swap(idx, belowIdx);
              flags[belowIdx] = tick;
              continue;
            }

            // Diagonal downward flow
            const dir = Math.random() < 0.5 ? 1 : -1;
            const d1 = x + dir;
            const d2 = x - dir;

            if (d1 >= 0 && d1 < w) {
              const diagIdx = (y + 1) * w + d1;
              const diagType = types[diagIdx];
              if (diagType === 0 || (states[diagType] === 1 && densities[diagType] < density)) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }

            if (d2 >= 0 && d2 < w) {
              const diagIdx = (y + 1) * w + d2;
              const diagType = types[diagIdx];
              if (diagType === 0 || (states[diagType] === 1 && densities[diagType] < density)) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }
          }

          // Lateral sideways dispersion
          const sideDir = Math.random() < 0.5 ? 1 : -1;
          const s1 = x + sideDir;
          const s2 = x - sideDir;

          if (s1 >= 0 && s1 < w) {
            const sideIdx = y * w + s1;
            const sideType = types[sideIdx];
            if (sideType === 0 || (states[sideType] === 1 && densities[sideType] < density)) {
              this.swap(idx, sideIdx);
              flags[sideIdx] = tick;
              continue;
            }
          }

          if (s2 >= 0 && s2 < w) {
            const sideIdx = y * w + s2;
            const sideType = types[sideIdx];
            if (sideType === 0 || (states[sideType] === 1 && densities[sideType] < density)) {
              this.swap(idx, sideIdx);
              flags[sideIdx] = tick;
              continue;
            }
          }
        } else if (state === 0) {
          // GAS (Steam, CO2, Chloramine, Hydrogen, Oxygen, Methane)
          // Gases rise upward!
          if (y - 1 >= 0) {
            const aboveIdx = (y - 1) * w + x;
            const aboveType = types[aboveIdx];

            // Buoyancy: rises through vacuum, heavier gas, or liquid
            if (
              aboveType === 0 ||
              states[aboveType] === 1 ||
              (states[aboveType] === 0 && densities[aboveType] > density)
            ) {
              this.swap(idx, aboveIdx);
              flags[aboveIdx] = tick;
              continue;
            }

            // Upward diagonal drift
            const dir = Math.random() < 0.5 ? 1 : -1;
            const d1 = x + dir;
            const d2 = x - dir;

            if (d1 >= 0 && d1 < w) {
              const diagIdx = (y - 1) * w + d1;
              const diagType = types[diagIdx];
              if (
                diagType === 0 ||
                states[diagType] === 1 ||
                (states[diagType] === 0 && densities[diagType] > density)
              ) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }

            if (d2 >= 0 && d2 < w) {
              const diagIdx = (y - 1) * w + d2;
              const diagType = types[diagIdx];
              if (
                diagType === 0 ||
                states[diagType] === 1 ||
                (states[diagType] === 0 && densities[diagType] > density)
              ) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }
          }

          // Lateral gas dispersion
          const sideDir = Math.random() < 0.5 ? 1 : -1;
          const s1 = x + sideDir;
          if (s1 >= 0 && s1 < w) {
            const sideIdx = y * w + s1;
            if (types[sideIdx] === 0) {
              this.swap(idx, sideIdx);
              flags[sideIdx] = tick;
            }
          }
        }
      }
    }
  }

  private stepThermodynamics(): void {
    const w = this.width;
    const h = this.height;
    const types = this.typeGrid;
    const temps = this.tempGrid;
    const conductivities = this.conductivityLookup;
    const specificHeats = this.specificHeatLookup;
    const boilingPoints = this.boilingPointLookup;
    const meltingPoints = this.meltingPointLookup;

    const steamId = this.getSpeciesId('h2o_steam');
    const waterId = this.getSpeciesId('h2o');
    const iceId = this.getSpeciesId('h2o_ice');

    // Thermal conduction pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const type = types[idx];
        if (type === 0) continue;

        // 1. Phase Transitions
        const t = temps[idx];
        if (type === waterId) {
          if (t >= boilingPoints[waterId] && boilingPoints[waterId] > 0) {
            types[idx] = steamId;
          } else if (t <= meltingPoints[waterId] && meltingPoints[waterId] > 0) {
            types[idx] = iceId;
          }
        } else if (type === steamId && t < 370.0) {
          types[idx] = waterId;
        } else if (type === iceId && t > 273.15) {
          types[idx] = waterId;
        }

        // 2. Exchange heat with orthogonal non-empty neighbors
        const currentType = types[idx];
        if (currentType === 0) continue;
        const currentT = temps[idx];
        const k = conductivities[currentType];
        const cp = specificHeats[currentType] || 1.0;

        const neighbors = [
          x + 1 < w ? y * w + (x + 1) : -1,
          x - 1 >= 0 ? y * w + (x - 1) : -1,
          y + 1 < h ? (y + 1) * w + x : -1,
          y - 1 >= 0 ? (y - 1) * w + x : -1,
        ];

        for (const nIdx of neighbors) {
          if (nIdx === -1) continue;
          const nType = types[nIdx];
          if (nType === 0) continue; // Vacuum does not conduct heat (insulator)

          const nTemp = temps[nIdx];
          const diff = nTemp - currentT;

          if (Math.abs(diff) > 0.05) {
            const nk = conductivities[nType];
            const rate = Math.min(0.15, (Math.min(k, nk) / (cp * 50)) * 0.1);
            const deltaT = diff * rate;
            temps[idx] += deltaT;
          }
        }
      }
    }
  }

  private stepChemistry(): void {
    const w = this.width;
    const h = this.height;
    const types = this.typeGrid;
    const temps = this.tempGrid;

    // Iterate over cells to test adjacency reaction pairs
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const typeA = types[idx];
        if (typeA === 0) continue;

        // Check single decomposition / phase transitions
        const singleList = this.singleReactions.get(typeA);
        if (singleList) {
          for (const rxn of singleList) {
            if (rxn.id === 'steam_condensation' && temps[idx] >= 373.15) {
              continue;
            }
            if (rxn.id === 'water_freezing' && temps[idx] > 273.15) {
              continue;
            }
            if (temps[idx] >= rxn.activation_energy_k && Math.random() < rxn.probability) {
              this.applyReaction(rxn, [idx], rxn.products);
              break;
            }
          }
        }

        // Check 4-neighbor pairs
        const neighbors = [
          x + 1 < w ? y * w + (x + 1) : -1,
          x - 1 >= 0 ? y * w + (x - 1) : -1,
          y + 1 < h ? (y + 1) * w + x : -1,
          y - 1 >= 0 ? (y - 1) * w + x : -1,
        ];

        for (const nIdx of neighbors) {
          if (nIdx === -1) continue;
          const typeB = types[nIdx];
          if (typeB === 0 || typeB === typeA) continue;

          const key = (typeA << 16) | typeB;
          const rxnList = this.pairReactions.get(key);
          if (!rxnList) continue;

          for (const rxn of rxnList) {
            const avgTemp = (temps[idx] + temps[nIdx]) / 2;
            if (avgTemp >= rxn.activation_energy_k && Math.random() < rxn.probability) {
              this.applyReaction(rxn, [idx, nIdx], rxn.products);
              break;
            }
          }
        }
      }
    }
  }

  private applyReaction(rxn: Reaction, cellIndices: number[], products: string[]): void {
    const types = this.typeGrid;
    const temps = this.tempGrid;

    // Mark all products as discovered
    for (const prod of products) {
      this.newlyDiscoveredCompounds.add(prod);
    }

    // Apply primary product conversions
    for (let i = 0; i < cellIndices.length; i++) {
      const cellIdx = cellIndices[i];
      const prodName = products[i % products.length];
      const prodSpecies = this.getSpeciesId(prodName);
      types[cellIdx] = prodSpecies;
      temps[cellIdx] += rxn.temperature_delta_k;
    }

    // If more products than cell indices (e.g. CO2 gas in effervescence), find adjacent empty cell or push upward
    if (products.length > cellIndices.length) {
      for (let pIdx = cellIndices.length; pIdx < products.length; pIdx++) {
        const extraProd = products[pIdx];
        const extraSpecies = this.getSpeciesId(extraProd);
        const refIdx = cellIndices[0];
        const rx = refIdx % this.width;
        const ry = Math.floor(refIdx / this.width);

        // Find neighbor or cell above
        const aboveY = ry - 1;
        if (aboveY >= 0) {
          const targetIdx = aboveY * this.width + rx;
          types[targetIdx] = extraSpecies;
          temps[targetIdx] = temps[refIdx];
        }
      }
    }

    // Handle gas pressure eruptions (push particles above)
    if (rxn.pressure_release > 0) {
      for (const cellIdx of cellIndices) {
        const cx = cellIdx % this.width;
        const cy = Math.floor(cellIdx / this.width);

        for (let dy = 1; dy <= Math.ceil(rxn.pressure_release); dy++) {
          const py = cy - dy;
          if (py >= 0) {
            const targetIdx = py * this.width + cx;
            if (types[targetIdx] !== 0 && this.stateLookup[types[targetIdx]] !== 2) {
              const driftX = (cx + (Math.random() < 0.5 ? 1 : -1) + this.width) % this.width;
              const pushIdx = py * this.width + driftX;
              this.swap(targetIdx, pushIdx);
            }
          }
        }
      }
    }

    // Queue reaction event for main thread
    this.queuedEvents.push({
      reactionId: rxn.id,
      name: rxn.name,
      temperatureDelta: rxn.temperature_delta_k,
      heatYield: rxn.heat_yield_kj_mol,
      reward: rxn.discovery_reward,
      discoveredProducts: [...products],
    });
  }

  private swap(idxA: number, idxB: number): void {
    const tempType = this.typeGrid[idxA];
    this.typeGrid[idxA] = this.typeGrid[idxB];
    this.typeGrid[idxB] = tempType;

    const tempT = this.tempGrid[idxA];
    this.tempGrid[idxA] = this.tempGrid[idxB];
    this.tempGrid[idxB] = tempT;
  }

  public renderColorBuffer(): void {
    const size = this.size;
    const types = this.typeGrid;
    const temps = this.tempGrid;
    const colors = this.colorLookup;
    const buffer = this.colorBuffer;

    for (let i = 0; i < size; i++) {
      const type = types[i];
      if (type === 0) {
        buffer[i] = 0x00000000;
        continue;
      }

      let color = colors[type];
      const temp = temps[i];

      // Thermal glow effect for high temperatures (> 373 K)
      if (temp > 373.15) {
        const heatShift = Math.min(60, Math.floor((temp - 373.15) / 10));
        const r = Math.min(255, (color & 0xff) + heatShift);
        const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(heatShift / 2));
        const b = (color >> 16) & 0xff;
        const a = (color >> 24) & 0xff;
        color = (a << 24) | (b << 16) | (g << 8) | r;
      }

      buffer[i] = color;
    }
  }

  public getStats(): { activeParticles: number; avgTemperature: number } {
    let active = 0;
    let totalTemp = 0;
    const size = this.size;
    const types = this.typeGrid;
    const temps = this.tempGrid;

    for (let i = 0; i < size; i++) {
      if (types[i] !== 0) {
        active++;
        totalTemp += temps[i];
      }
    }

    return {
      activeParticles: active,
      avgTemperature: active > 0 ? totalTemp / active : 298.15,
    };
  }
}
