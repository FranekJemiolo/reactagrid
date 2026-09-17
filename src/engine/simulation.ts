import { ChemicalDatabase, Reaction } from '../types/chemistry';

export interface ReactionEvent {
  reactionId: string;
  name: string;
  temperatureDelta: number;
  heatYield: number;
  reward: number;
  discoveredProducts: string[];
  x?: number;
  y?: number;
  pressureRelease?: number;
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
  public isStaticLookup: Uint8Array; // 1 = static solid (glassware/barrier), 0 = dynamic

  // Reactions lookup
  public pairReactions: Map<number, Reaction[]> = new Map();
  public singleReactions: Map<number, Reaction[]> = new Map();

  public tickCount = 0;
  public currentTickId = 1;
  public renderMode: 'natural' | 'thermal' = 'natural';
  public gravityMode: 1 | 0 | -1 = 1;

  public queuedEvents: ReactionEvent[] = [];
  public newlyDiscoveredCompounds: Set<string> = new Set();

  public shatteredGlassCount = 0;
  public stirrerRotationalVelocity = 0;
  public stirrerSustainedSeconds = 0;

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
    this.isStaticLookup = new Uint8Array(this.speciesCount);

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
    this.isStaticLookup[0] = 0;

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
      const isStatic =
        mol.id === 'glass' ||
        mol.id === 'bunsen_burner' ||
        mol.id === 'cooling_plate' ||
        mol.id === 'stirrer';
      this.isStaticLookup[index] = isStatic ? 1 : 0;

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
    this.shatteredGlassCount = 0;
    this.stirrerRotationalVelocity = 0;
    this.stirrerSustainedSeconds = 0;
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
          // Slight randomness on outer perimeter for natural brush placement
          if (
            (dx !== 0 || dy !== 0) &&
            radius > 2 &&
            Math.random() < 0.15 &&
            compoundId !== 'empty'
          ) {
            continue;
          }
          const idx = py * this.width + px;
          this.typeGrid[idx] = speciesId;
          this.tempGrid[idx] = tempK;
        }
      }
    }
  }

  public loadInitialGrid(
    elements: {
      x: number;
      y: number;
      width?: number;
      height?: number;
      compound: string;
      tempK?: number;
    }[],
  ): void {
    for (const elem of elements) {
      const compoundId = this.getSpeciesId(elem.compound);
      if (!compoundId) continue;
      const w = elem.width ?? 1;
      const h = elem.height ?? 1;
      const temp = elem.tempK ?? 298.15;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const px = elem.x + dx;
          const py = elem.y + dy;
          if (px >= 0 && px < this.width && py >= 0 && py < this.height) {
            const idx = py * this.width + px;
            this.typeGrid[idx] = compoundId;
            this.tempGrid[idx] = temp;
          }
        }
      }
    }
    this.renderColorBuffer();
  }

  public getGasCellCount(): number {
    let count = 0;
    const types = this.typeGrid;
    const states = this.stateLookup;
    const len = types.length;
    for (let i = 0; i < len; i++) {
      const t = types[i];
      if (t !== 0 && states[t] === 0) {
        count++;
      }
    }
    return count;
  }

  public getCellInfo(
    x: number,
    y: number,
  ): {
    x: number;
    y: number;
    compoundId: string;
    name: string;
    formula: string;
    state: string;
    density: number;
    tempK: number;
    hazardRating: number;
  } | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    const idx = y * this.width + x;
    const type = this.typeGrid[idx];
    const compoundId = this.getCompoundName(type);
    const stateNum = this.stateLookup[type];
    const stateStr = stateNum === 0 ? 'Gas' : stateNum === 1 ? 'Liquid' : 'Solid';

    return {
      x,
      y,
      compoundId,
      name: compoundId === 'empty' ? 'Vacuum / Air' : compoundId,
      formula: '',
      state: stateStr,
      density: Math.round(this.densityLookup[type] * 1000) / 1000,
      tempK: Math.round(this.tempGrid[idx] * 10) / 10,
      hazardRating: 0,
    };
  }

  public step(): void {
    this.tickCount++;
    this.currentTickId = (this.currentTickId % 254) + 1;

    // 1. Lab Equipment Pass (Bunsen Burners, Cooling Plates, Stirrers, Shatter Stress)
    this.stepEquipment();

    // 2. Gravity & Density Physics Pass
    this.stepPhysics();

    // 3. Thermodynamics Pass (Heat conduction & Phase shifts)
    this.stepThermodynamics();

    // 4. Chemistry Adjacency Pass
    this.stepChemistry();

    // 5. Color Buffer Render
    this.renderColorBuffer();
  }

  private stepEquipment(): void {
    const w = this.width;
    const h = this.height;
    const types = this.typeGrid;
    const temps = this.tempGrid;
    const states = this.stateLookup;

    const burnerId = this.getSpeciesId('bunsen_burner');
    const coolerId = this.getSpeciesId('cooling_plate');
    const stirrerId = this.getSpeciesId('stirrer');
    const glassId = this.getSpeciesId('glass');
    const sio2Id = this.getSpeciesId('sio2');

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const type = types[idx];
        if (type === 0) continue;

        // 1. Bunsen Burner: Continuously adds +50°C heat per tick to the cells directly above it
        if (type === burnerId) {
          temps[idx] = Math.max(temps[idx], 500.0);
          if (y > 0) {
            const aboveIdx = (y - 1) * w + x;
            temps[aboveIdx] += 50.0;
          }
        }
        // 2. Cooling Plate: Continuously drains heat from cells touching it down to -20°C (253.15 K)
        else if (type === coolerId) {
          temps[idx] = 253.15;
          const neighbors = [
            x + 1 < w ? y * w + (x + 1) : -1,
            x - 1 >= 0 ? y * w + (x - 1) : -1,
            y + 1 < h ? (y + 1) * w + x : -1,
            y - 1 >= 0 ? (y - 1) * w + x : -1,
          ];
          for (const nIdx of neighbors) {
            if (nIdx !== -1 && types[nIdx] !== 0) {
              if (temps[nIdx] > 253.15) {
                temps[nIdx] = Math.max(253.15, temps[nIdx] - 25.0);
              }
            }
          }
        }
        // 3. Stirrer: Applies horizontal velocity vectors to adjacent liquid pixels to force mixing
        // Also captures kinetic energy from expanding gases to drive rotational velocity
        else if (type === stirrerId) {
          const adjacent = [
            { nx: x, ny: y - 1, pushX: 1, pushY: 0 },
            { nx: x + 1, ny: y, pushX: 0, pushY: 1 },
            { nx: x, ny: y + 1, pushX: -1, pushY: 0 },
            { nx: x - 1, ny: y, pushX: 0, pushY: -1 },
          ];
          for (const adj of adjacent) {
            if (adj.nx >= 0 && adj.nx < w && adj.ny >= 0 && adj.ny < h) {
              const adjIdx = adj.ny * w + adj.nx;
              const adjType = types[adjIdx];
              // Expanding gases passing stirrer drive angular velocity
              if (states[adjType] === 0) {
                this.stirrerRotationalVelocity = Math.min(
                  15.0,
                  this.stirrerRotationalVelocity + 0.2,
                );
              } else if (states[adjType] === 1) {
                const destX = adj.nx + adj.pushX;
                const destY = adj.ny + adj.pushY;
                if (destX >= 0 && destX < w && destY >= 0 && destY < h) {
                  const destIdx = destY * w + destX;
                  const destType = types[destIdx];
                  if (destType === 0 || states[destType] === 1) {
                    this.swap(adjIdx, destIdx);
                  }
                }
              }
            }
          }
        }
        // 4. Glass Pressure Containment & High-Pressure Shattering
        else if (type === glassId) {
          let hotGasesNearby = 0;
          let maxTemp = 0;
          const neighbors = [
            x + 1 < w ? y * w + (x + 1) : -1,
            x - 1 >= 0 ? y * w + (x - 1) : -1,
            y + 1 < h ? (y + 1) * w + x : -1,
            y - 1 >= 0 ? (y - 1) * w + x : -1,
          ];
          for (const nIdx of neighbors) {
            if (nIdx !== -1) {
              const nType = types[nIdx];
              const nTemp = temps[nIdx];
              if (states[nType] === 0 && nTemp > 500) {
                hotGasesNearby++;
                if (nTemp > maxTemp) maxTemp = nTemp;
              }
            }
          }
          if (hotGasesNearby >= 2 && maxTemp >= 600) {
            types[idx] = sio2Id || 0;
            temps[idx] = maxTemp;
            this.shatteredGlassCount++;
          }
        }
      }
    }

    // Rotational damping & duration sustain evaluation
    this.stirrerRotationalVelocity *= 0.992;
    if (this.stirrerRotationalVelocity >= 5.0) {
      this.stirrerSustainedSeconds += 1.0 / 60.0;
    } else {
      this.stirrerSustainedSeconds = Math.max(0, this.stirrerSustainedSeconds - 0.05);
    }
  }

  private stepPhysics(): void {
    const w = this.width;
    const h = this.height;
    const types = this.typeGrid;
    const flags = this.flagGrid;
    const tick = this.currentTickId;
    const densities = this.densityLookup;
    const states = this.stateLookup;
    const grav = this.gravityMode;

    // Microgravity / Zero-G Mode (grav === 0)
    if (grav === 0) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = y * w + x;
          const type = types[idx];
          if (type === 0 || flags[idx] === tick || this.isStaticLookup[type] === 1) continue;

          // Slow Brownian float / surface tension cohesion
          if (Math.random() < 0.2) {
            const dirX = Math.random() < 0.5 ? 1 : -1;
            const dirY = Math.random() < 0.5 ? 1 : -1;
            const targetX = x + dirX;
            const targetY = y + dirY;

            if (targetX >= 0 && targetX < w && targetY >= 0 && targetY < h) {
              const targetIdx = targetY * w + targetX;
              if (types[targetIdx] === 0) {
                this.swap(idx, targetIdx);
                flags[targetIdx] = tick;
              }
            }
          }
        }
      }
      return;
    }

    // Directional Gravity (1 = normal down, -1 = inverted up)
    const yStart = grav === 1 ? h - 1 : 0;
    const yEnd = grav === 1 ? -1 : h;
    const yStep = grav === 1 ? -1 : 1;
    const gDir = grav; // +1 = down, -1 = up
    for (let y = yStart; y !== yEnd; y += yStep) {
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
        const fallY = y + gDir;
        const riseY = y - gDir;

        if (state === 2) {
          // Static Solid (Pyrex glassware / barrier walls) stays fixed in place
          if (this.isStaticLookup[type] === 1) {
            continue;
          }

          // Dynamic SOLID (Sand, Iron, Baking Soda, etc.)
          if (fallY >= 0 && fallY < h) {
            const belowIdx = fallY * w + x;
            const belowType = types[belowIdx];

            // Falls straight down if below is empty or liquid
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
              const diagIdx = fallY * w + d1;
              const diagType = types[diagIdx];
              if (diagType === 0) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }

            if (d2 >= 0 && d2 < w) {
              const diagIdx = fallY * w + d2;
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
          if (fallY >= 0 && fallY < h) {
            const belowIdx = fallY * w + x;
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
              const diagIdx = fallY * w + d1;
              const diagType = types[diagIdx];
              if (diagType === 0 || (states[diagType] === 1 && densities[diagType] < density)) {
                this.swap(idx, diagIdx);
                flags[diagIdx] = tick;
                continue;
              }
            }

            if (d2 >= 0 && d2 < w) {
              const diagIdx = fallY * w + d2;
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
          // Gases rise buoyant in direction opposite to gravity!
          if (riseY >= 0 && riseY < h) {
            const aboveIdx = riseY * w + x;
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
              const diagIdx = riseY * w + d1;
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
              const diagIdx = riseY * w + d2;
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

    const h2oGasId = this.getSpeciesId('h2o_gas');
    const steamId = h2oGasId !== 0 ? h2oGasId : this.getSpeciesId('h2o_steam');
    const altSteamId = this.getSpeciesId('h2o_steam');
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
        } else if ((type === steamId || type === altSteamId) && t < 370.0) {
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

    // If more products than cell indices (e.g. CO2 gas in effervescence), find adjacent empty cell
    if (products.length > cellIndices.length) {
      for (let pIdx = cellIndices.length; pIdx < products.length; pIdx++) {
        const extraProd = products[pIdx];
        const extraSpecies = this.getSpeciesId(extraProd);
        const refIdx = cellIndices[0];
        const rx = refIdx % this.width;
        const ry = Math.floor(refIdx / this.width);

        let placed = false;
        for (let dy = 1; dy <= 6; dy++) {
          const aboveY = ry - dy;
          if (aboveY >= 0) {
            for (const dx of [0, 1, -1, 2, -2]) {
              const targetX = rx + dx;
              if (targetX >= 0 && targetX < this.width) {
                const targetIdx = aboveY * this.width + targetX;
                if (types[targetIdx] === 0) {
                  types[targetIdx] = extraSpecies;
                  temps[targetIdx] = temps[refIdx];
                  placed = true;
                  break;
                }
              }
            }
            if (placed) break;
          }
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
    const primaryIdx = cellIndices[0] ?? 0;
    this.queuedEvents.push({
      reactionId: rxn.id,
      name: rxn.name,
      temperatureDelta: rxn.temperature_delta_k,
      heatYield: rxn.heat_yield_kj_mol,
      reward: rxn.discovery_reward,
      discoveredProducts: [...products],
      x: primaryIdx % this.width,
      y: Math.floor(primaryIdx / this.width),
      pressureRelease: rxn.pressure_release,
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
    const isThermal = this.renderMode === 'thermal';

    for (let i = 0; i < size; i++) {
      const type = types[i];
      const temp = temps[i];

      if (isThermal) {
        // FLIR Thermal Camera false-color mapping (180 K to 800 K)
        // Normalized 0.0 to 1.0
        const norm = Math.max(0, Math.min(1, (temp - 180) / (800 - 180)));
        let r = 0;
        let g = 0;
        let b = 0;

        if (norm < 0.25) {
          // Blue to Cyan
          const t = norm / 0.25;
          b = Math.floor(255 * (0.4 + 0.6 * t));
          g = Math.floor(200 * t);
          r = Math.floor(30 * (1 - t));
        } else if (norm < 0.5) {
          // Cyan to Green
          const t = (norm - 0.25) / 0.25;
          g = Math.floor(200 + 55 * t);
          b = Math.floor(255 * (1 - t));
        } else if (norm < 0.75) {
          // Green to Yellow/Orange
          const t = (norm - 0.5) / 0.25;
          r = Math.floor(255 * t);
          g = Math.floor(255 * (1 - 0.2 * t));
        } else {
          // Orange to White hot
          const t = (norm - 0.75) / 0.25;
          r = 255;
          g = Math.floor(200 + 55 * t);
          b = Math.floor(255 * t);
        }

        const alpha = type === 0 ? 0x44 : 0xff; // Semi-transparent ambient air
        buffer[i] = (alpha << 24) | (b << 16) | (g << 8) | r;
        continue;
      }

      // Natural Chemical Color Mode
      if (type === 0) {
        buffer[i] = 0x00000000;
        continue;
      }

      let color = colors[type];

      // Thermal glow effect for hot particles (> 373 K)
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

  public getStats(): {
    activeParticles: number;
    avgTemperature: number;
    maxTemperature: number;
    minTemperature: number;
  } {
    let active = 0;
    let totalTemp = 0;
    let maxTemp = 298.15;
    let minTemp = 298.15;
    const size = this.size;
    const types = this.typeGrid;
    const temps = this.tempGrid;

    for (let i = 0; i < size; i++) {
      if (types[i] !== 0) {
        active++;
        const t = temps[i];
        totalTemp += t;
        if (active === 1) {
          maxTemp = t;
          minTemp = t;
        } else {
          if (t > maxTemp) maxTemp = t;
          if (t < minTemp) minTemp = t;
        }
      }
    }

    return {
      activeParticles: active,
      avgTemperature: active > 0 ? totalTemp / active : 298.15,
      maxTemperature: maxTemp,
      minTemperature: minTemp,
    };
  }
}
